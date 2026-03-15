#!/usr/bin/env python3
"""
state-reconcile.py — Oligodendrocyte layer: state consistency reconciliation.

Named for oligodendrocytes — glial cells that produce myelin sheaths around
axons, ensuring signals propagate reliably without degradation. This script
ensures state.db columns that represent the same information remain aligned,
preventing silent drift that accumulates across sessions.

Detects and repairs six classes of state inconsistency:
  1. processed ↔ task_state alignment
  2. Epistemic flag resolution on terminal messages
  3. Orphaned gate detection
  4. ACK tracking (implicit ACK from in_response_to)
  5. Memory staleness ↔ status alignment
  6. MANIFEST.json ↔ state.db file existence

Runs alongside consolidation-pass.sh during idle cycles or cron.
Read-repair pattern: detect drift, fix what can fix safely, report the rest.

Usage:
    python3 scripts/state-reconcile.py              # detect + repair
    python3 scripts/state-reconcile.py --dry-run    # detect only, no writes
    python3 scripts/state-reconcile.py --summary    # one-line counts
"""

import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
LOCAL_DB_PATH = PROJECT_ROOT / "state.local.db"
TRANSPORT_DIR = PROJECT_ROOT / "transport" / "sessions"

DRY_RUN = "--dry-run" in sys.argv
SUMMARY_ONLY = "--summary" in sys.argv


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


# ── Check 1: processed ↔ task_state alignment ──────────────────────────────
def check_processed_task_state(conn: sqlite3.Connection) -> dict:
    """Detect processed=TRUE messages stuck in task_state='pending'."""
    drifted = conn.execute(
        "SELECT id, session_name, filename FROM transport_messages "
        "WHERE processed = 1 AND task_state = 'pending'"
    ).fetchall()

    if drifted and not DRY_RUN:
        conn.execute(
            "UPDATE transport_messages SET task_state = 'completed' "
            "WHERE processed = 1 AND task_state = 'pending'"
        )
        conn.commit()

    # Reverse check: task_state='completed' but processed=0
    reverse = conn.execute(
        "SELECT id, session_name, filename FROM transport_messages "
        "WHERE task_state = 'completed' AND processed = 0"
    ).fetchall()

    if reverse and not DRY_RUN:
        conn.execute(
            "UPDATE transport_messages SET processed = 1, "
            "processed_at = ? "
            "WHERE task_state = 'completed' AND processed = 0",
            (now_iso(),),
        )
        conn.commit()

    return {
        "name": "processed ↔ task_state",
        "forward_drift": len(drifted),
        "reverse_drift": len(reverse),
        "repaired": not DRY_RUN,
    }


# ── Check 2: Epistemic flags on terminal messages ──────────────────────────
def check_epistemic_flags_terminal(conn: sqlite3.Connection) -> dict:
    """Resolve flags whose source messages reached terminal state."""
    terminal_states = ("completed", "failed", "canceled", "rejected")
    placeholders = ",".join("?" for _ in terminal_states)

    unresolved = conn.execute(
        f"SELECT COUNT(*) FROM epistemic_flags ef "
        f"WHERE ef.resolved = 0 "
        f"AND ef.source IN ("
        f"  SELECT filename FROM transport_messages "
        f"  WHERE task_state IN ({placeholders})"
        f")",
        terminal_states,
    ).fetchone()[0]

    if unresolved and not DRY_RUN:
        conn.execute(
            f"UPDATE epistemic_flags SET resolved = 1, resolved_at = ? "
            f"WHERE resolved = 0 AND source IN ("
            f"  SELECT filename FROM transport_messages "
            f"  WHERE task_state IN ({placeholders})"
            f")",
            (now_iso(), *terminal_states),
        )
        conn.commit()

    return {
        "name": "epistemic flags on terminal messages",
        "stale_flags": unresolved,
        "repaired": not DRY_RUN,
    }


# ── Check 3: Orphaned gates ────────────────────────────────────────────────
def check_orphaned_gates(conn: sqlite3.Connection) -> dict:
    """Detect active_gates referencing nonexistent messages or agents."""
    # Check if active_gates table exists
    table_exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='active_gates'"
    ).fetchone()

    if not table_exists:
        return {"name": "orphaned gates", "orphaned": 0, "note": "table absent"}

    orphaned = conn.execute(
        "SELECT ag.gate_id, ag.session_name FROM active_gates ag "
        "WHERE ag.status = 'waiting' "
        "AND NOT EXISTS ("
        "  SELECT 1 FROM transport_messages tm "
        "  WHERE tm.session_name = ag.session_name"
        ")"
    ).fetchall()

    # Also check for expired gates (timeout_at in the past)
    expired = conn.execute(
        "SELECT gate_id, session_name FROM active_gates "
        "WHERE status = 'waiting' "
        "AND timeout_at IS NOT NULL "
        "AND timeout_at < ?",
        (now_iso(),),
    ).fetchall()

    if expired and not DRY_RUN:
        conn.execute(
            "UPDATE active_gates SET status = 'resolved', resolved_at = ?, "
            "resolved_by = 'timeout-reconciled' "
            "WHERE status = 'waiting' AND timeout_at IS NOT NULL AND timeout_at < ?",
            (now_iso(), now_iso()),
        )
        conn.commit()

    return {
        "name": "orphaned gates",
        "orphaned": len(orphaned),
        "expired": len(expired),
        "repaired": not DRY_RUN and len(expired) > 0,
    }


# ── Check 4: Implicit ACK tracking ────────────────────────────────────────
def check_implicit_acks(conn: sqlite3.Connection) -> dict:
    """Detect messages with ack_required=1 that received implicit ACKs."""
    # Find messages where ack_required=1 AND ack_received=0
    # but a response exists (another message with in_response_to referencing it)
    unacked = conn.execute(
        "SELECT tm.id, tm.session_name, tm.filename "
        "FROM transport_messages tm "
        "WHERE tm.ack_required = 1 AND tm.ack_received = 0"
    ).fetchall()

    implicitly_acked = []
    for msg_id, session_name, filename in unacked:
        # Check if any message in the same session references this one
        response = conn.execute(
            "SELECT 1 FROM transport_messages "
            "WHERE session_name = ? AND filename != ? "
            "AND id > ?",  # later message in same session = likely response
            (session_name, filename, msg_id),
        ).fetchone()
        if response:
            implicitly_acked.append(msg_id)

    if implicitly_acked and not DRY_RUN:
        placeholders = ",".join("?" for _ in implicitly_acked)
        conn.execute(
            f"UPDATE transport_messages SET ack_received = 1 "
            f"WHERE id IN ({placeholders})",
            implicitly_acked,
        )
        conn.commit()

    return {
        "name": "implicit ACK tracking",
        "unacked_required": len(unacked),
        "implicitly_resolved": len(implicitly_acked),
        "still_waiting": len(unacked) - len(implicitly_acked),
        "repaired": not DRY_RUN and len(implicitly_acked) > 0,
    }


# ── Check 5: Memory staleness ↔ status alignment ──────────────────────────
def check_memory_staleness(conn: sqlite3.Connection) -> dict:
    """Detect memory entries where status contradicts last_confirmed age."""
    # Entries marked fresh (✓) but last_confirmed > 30 days ago
    stale_but_fresh = conn.execute(
        "SELECT id, topic, entry_key, last_confirmed FROM memory_entries "
        "WHERE status = '✓' "
        "AND last_confirmed IS NOT NULL "
        "AND julianday('now') - julianday(last_confirmed) > 30"
    ).fetchall()

    # Entries with NULL last_confirmed but status = ✓
    unconfirmed_fresh = conn.execute(
        "SELECT id, topic, entry_key FROM memory_entries "
        "WHERE status = '✓' AND last_confirmed IS NULL"
    ).fetchall()

    if stale_but_fresh and not DRY_RUN:
        ids = [r[0] for r in stale_but_fresh]
        placeholders = ",".join("?" for _ in ids)
        conn.execute(
            f"UPDATE memory_entries SET status = '⚑' "
            f"WHERE id IN ({placeholders})",
            ids,
        )
        conn.commit()

    return {
        "name": "memory staleness ↔ status",
        "stale_but_fresh": len(stale_but_fresh),
        "unconfirmed_fresh": len(unconfirmed_fresh),
        "repaired": not DRY_RUN and len(stale_but_fresh) > 0,
    }


# ── Check 6: MANIFEST ↔ state.db file existence ───────────────────────────
def check_manifest_drift(conn: sqlite3.Connection) -> dict:
    """Detect transport files on disk not indexed in state.db, and vice versa."""
    if not TRANSPORT_DIR.exists():
        return {"name": "MANIFEST ↔ state.db", "unindexed": 0, "orphaned_rows": 0}

    # Collect all transport JSON files on disk
    disk_files = set()
    for session_dir in TRANSPORT_DIR.iterdir():
        if not session_dir.is_dir():
            continue
        for f in session_dir.glob("*.json"):
            if f.name in ("MANIFEST.json",):
                continue
            disk_files.add(f.name)

    # Collect all indexed filenames from state.db
    db_files = set()
    rows = conn.execute("SELECT filename FROM transport_messages").fetchall()
    for (filename,) in rows:
        db_files.add(filename)

    unindexed = disk_files - db_files
    orphaned_rows = db_files - disk_files

    return {
        "name": "MANIFEST ↔ state.db",
        "on_disk": len(disk_files),
        "in_db": len(db_files),
        "unindexed": len(unindexed),
        "orphaned_rows": len(orphaned_rows),
        "unindexed_samples": sorted(unindexed)[:5] if unindexed else [],
        "orphaned_samples": sorted(orphaned_rows)[:5] if orphaned_rows else [],
    }


# ── Check 7: Expired messages ─────────────────────────────────────────────
def check_expired_messages(conn: sqlite3.Connection) -> dict:
    """Transition expired messages to canceled state."""
    expired = conn.execute(
        "SELECT id, session_name, filename FROM transport_messages "
        "WHERE expires_at IS NOT NULL "
        "AND expires_at < ? "
        "AND task_state NOT IN ('completed', 'canceled', 'rejected', 'failed')",
        (now_iso(),),
    ).fetchall()

    if expired and not DRY_RUN:
        ids = [r[0] for r in expired]
        placeholders = ",".join("?" for _ in ids)
        conn.execute(
            f"UPDATE transport_messages SET task_state = 'canceled' "
            f"WHERE id IN ({placeholders})",
            ids,
        )
        conn.commit()

    return {
        "name": "expired messages",
        "expired_active": len(expired),
        "repaired": not DRY_RUN and len(expired) > 0,
    }


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    if not DB_PATH.exists():
        print("No state.db — nothing to reconcile")
        return

    conn = sqlite3.connect(str(DB_PATH))

    checks = [
        check_processed_task_state,
        check_epistemic_flags_terminal,
        check_orphaned_gates,
        check_implicit_acks,
        check_memory_staleness,
        check_manifest_drift,
        check_expired_messages,
    ]

    results = []
    total_repairs = 0
    total_drift = 0

    for check_fn in checks:
        result = check_fn(conn)
        results.append(result)

    conn.close()

    # Count totals
    for r in results:
        repaired = r.get("repaired", False)
        # Sum all numeric values that indicate drift
        for k, v in r.items():
            if k in ("name", "repaired", "note", "on_disk", "in_db",
                      "unindexed_samples", "orphaned_samples"):
                continue
            if isinstance(v, int) and v > 0:
                total_drift += v
                if repaired:
                    total_repairs += v

    if SUMMARY_ONLY:
        mode = "dry-run" if DRY_RUN else "live"
        print(f"State reconciliation ({mode}): {total_drift} drift items, "
              f"{total_repairs} repaired")
        return

    # Detailed output
    mode = "DRY RUN" if DRY_RUN else "LIVE"
    print(f"State Reconciliation Report ({mode})")
    print(f"{'=' * 50}")
    print()

    for r in results:
        name = r.pop("name")
        repaired = r.pop("repaired", False)
        note = r.pop("note", None)
        symbol = "✓" if repaired else ("○" if DRY_RUN else "—")

        # Filter to non-zero findings
        findings = {k: v for k, v in r.items()
                    if isinstance(v, int) and v > 0
                    or isinstance(v, list) and len(v) > 0}

        if not findings and not note:
            print(f"  {symbol} {name}: clean")
        else:
            print(f"  {symbol} {name}:")
            for k, v in findings.items():
                if isinstance(v, list):
                    print(f"      {k}: {', '.join(v[:5])}")
                else:
                    print(f"      {k}: {v}")
            if note:
                print(f"      note: {note}")
        print()

    print(f"Total: {total_drift} drift items, {total_repairs} repaired")


if __name__ == "__main__":
    main()

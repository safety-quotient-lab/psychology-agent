#!/usr/bin/env python3
"""pre_sync_check.py — Detect incomplete work before running /sync.

Surfaces orphaned gates, unanswered requests, and unindexed transport
files so the /sync orientation payload includes them.

Usage:
    python3 scripts/pre_sync_check.py              # JSON output
    python3 scripts/pre_sync_check.py --human      # human-readable summary
    python3 scripts/pre_sync_check.py --count-only  # just the count (for shell)

Exit codes:
    0 — no incomplete work found
    1 — incomplete work detected (count printed to stdout with --count-only)
"""

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

def _find_project_root():
    """Resolve project root, safe for symlinked shared scripts."""
    env = __import__("os").environ.get("PROJECT_ROOT")
    if env:
        return Path(env)
    # Walk up from the invoking script's apparent location (not resolved)
    candidate = Path(__file__).absolute().parent
    for _ in range(5):
        if (candidate / "state.db").exists() or (candidate / ".agent-identity.json").exists():
            return candidate
        candidate = candidate.parent
    # Last resort: resolved path (works when invoked directly from shared/)
    return Path(__file__).resolve().parent.parent

PROJECT_ROOT = _find_project_root()
DB_PATH = PROJECT_ROOT / "state.db"


def _check_orphaned_gates(conn: sqlite3.Connection) -> list[dict]:
    """Find gates that timed out without resolution."""
    rows = conn.execute(
        "SELECT gate_id, sending_agent, receiving_agent, session_name, "
        "       timeout_at, fallback_action "
        "FROM active_gates "
        "WHERE resolved_at IS NULL "
        "  AND timeout_at < datetime('now')"
    ).fetchall()
    return [
        {
            "type": "orphaned-gate",
            "gate_id": r["gate_id"],
            "session": r["session_name"],
            "sending_agent": r["sending_agent"],
            "receiving_agent": r["receiving_agent"],
            "timed_out_at": r["timeout_at"],
            "fallback_action": r["fallback_action"],
        }
        for r in rows
    ]


def _check_unanswered_requests(conn: sqlite3.Connection) -> list[dict]:
    """Find peer requests with no subsequent psychology-agent response."""
    rows = conn.execute(
        "SELECT tm.session_name, tm.filename, tm.turn, tm.subject, "
        "       tm.from_agent, tm.timestamp "
        "FROM transport_messages tm "
        "WHERE tm.message_type = 'request' "
        "  AND tm.from_agent != 'psychology-agent' "
        "  AND tm.processed = TRUE "
        "  AND NOT EXISTS ( "
        "    SELECT 1 FROM transport_messages tm2 "
        "    WHERE tm2.session_name = tm.session_name "
        "      AND tm2.from_agent = 'psychology-agent' "
        "      AND tm2.turn > tm.turn "
        "  )"
    ).fetchall()
    return [
        {
            "type": "unanswered-request",
            "session": r["session_name"],
            "filename": r["filename"],
            "turn": r["turn"],
            "subject": r["subject"],
            "from_agent": r["from_agent"],
            "timestamp": r["timestamp"],
        }
        for r in rows
    ]


def _check_unverified_deliverables(conn: sqlite3.Connection) -> list[dict]:
    """Find claims linked to requests that remain unverified."""
    rows = conn.execute(
        "SELECT c.claim_text, c.confidence, c.verified, "
        "       tm.session_name, tm.filename AS source_msg "
        "FROM claims c "
        "JOIN transport_messages tm ON c.transport_msg = tm.id "
        "WHERE tm.message_type = 'request' "
        "  AND c.verified = 0"
    ).fetchall()
    return [
        {
            "type": "unverified-deliverable",
            "session": r["session_name"],
            "source_message": r["source_msg"],
            "claim": r["claim_text"],
            "confidence": r["confidence"],
        }
        for r in rows
    ]


def _check_unindexed_files(conn: sqlite3.Connection) -> list[dict]:
    """Find transport files on disk not yet indexed in state.db."""
    results = []
    transport_dir = PROJECT_ROOT / "transport" / "sessions"
    if not transport_dir.exists():
        return results

    indexed = set()
    for r in conn.execute("SELECT filename FROM transport_messages").fetchall():
        indexed.add(r["filename"])

    for session_dir in transport_dir.iterdir():
        if not session_dir.is_dir():
            continue
        for f in session_dir.glob("*.json"):
            if f.name == "MANIFEST.json":
                continue
            if f.name not in indexed:
                results.append({
                    "type": "unindexed-file",
                    "session": session_dir.name,
                    "filename": f.name,
                })
    return results


def main():
    parser = argparse.ArgumentParser(description="Detect incomplete work before /sync")
    parser.add_argument("--human", action="store_true", help="Human-readable output")
    parser.add_argument("--count-only", action="store_true", help="Print count only")
    args = parser.parse_args()

    if not DB_PATH.exists():
        if args.count_only:
            print("0")
        elif args.human:
            print("No state.db — skipping incomplete work check")
        else:
            print("[]")
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    items = []
    items.extend(_check_orphaned_gates(conn))
    items.extend(_check_unanswered_requests(conn))
    items.extend(_check_unverified_deliverables(conn))
    items.extend(_check_unindexed_files(conn))

    conn.close()

    if args.count_only:
        print(str(len(items)))
        sys.exit(1 if items else 0)

    if args.human:
        if not items:
            print("Incomplete work detected: none")
            return
        print(f"Incomplete work detected: {len(items)} items")
        for item in items:
            item_type = item["type"]
            if item_type == "orphaned-gate":
                print(f"  - {item['session']}: orphaned gate {item['gate_id']} "
                      f"(timed out {item['timed_out_at']})")
            elif item_type == "unanswered-request":
                print(f"  - {item['session']}: unanswered request from "
                      f"{item['from_agent']} (turn {item['turn']}): {item['subject']}")
            elif item_type == "unverified-deliverable":
                print(f"  - {item['session']}: unverified: {item['claim'][:60]}")
            elif item_type == "unindexed-file":
                print(f"  - {item['session']}: unindexed file {item['filename']}")
        sys.exit(1 if items else 0)

    print(json.dumps(items, indent=2))
    sys.exit(1 if items else 0)


if __name__ == "__main__":
    main()

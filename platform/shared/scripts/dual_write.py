#!/usr/bin/env python3
"""
dual_write.py — Incremental SQLite state layer writes.

Called by /sync and /cycle after writing markdown (Phase 1 contract:
markdown = source of truth, DB = queryable index).

Usage:
    python scripts/dual_write.py transport-message --session SESSION --filename FILE \
        --turn N --type TYPE --from-agent FROM --to-agent TO --timestamp TS \
        [--subject SUBJ] [--claims-count N] [--setl F] [--urgency URG] \
        [--thread-id TID] [--parent-thread-id PTID] [--message-cid CID] \
        [--problem-type error|warning|info]

    python scripts/dual_write.py mark-processed --session SESSION --filename FILE

    python scripts/dual_write.py memory-entry --topic TOPIC --key KEY --value VAL \
        [--status S] [--session-id N]

    python scripts/dual_write.py session-entry --id N --timestamp TS --summary TEXT \
        [--artifacts TEXT] [--flags TEXT]

    python scripts/dual_write.py decision --key KEY --text TEXT --date DATE \
        [--source SRC] [--confidence F]

    python scripts/dual_write.py trigger-fired --trigger-id TID

    python scripts/dual_write.py lesson --title TITLE --date DATE \
        [--pattern-type TYPE] [--domain DOM] [--severity SEV] \
        [--recurrence N] [--trigger-relevant TID] \
        [--promotion-status STATUS] [--lesson-text TEXT]

    python scripts/dual_write.py gate-open --gate-id GID \
        --sending-agent FROM --receiving-agent TO \
        --session SESSION --filename FILE \
        [--blocks-until response|ack|specific-turn] \
        [--timeout-minutes N] [--fallback-action ACTION]

    python scripts/dual_write.py gate-resolve --gate-id GID --resolved-by FILE

    python scripts/dual_write.py gate-timeout --gate-id GID

    python scripts/dual_write.py gate-status [--agent-id AID]

    python scripts/dual_write.py next-turn --session SESSION

    python scripts/dual_write.py engineering-incident --incident-type TYPE \
        --description TEXT [--session-id N] [--severity low|moderate|high|critical] \
        [--tool-name NAME] [--tool-context CTX] [--detection-tier 1|2]

    python scripts/dual_write.py facet --entity-type TABLE --entity-id N \
        --facet-type TYPE --facet-value VALUE

    python scripts/dual_write.py facet-query --facet-type TYPE --facet-value VALUE

Requires: Python 3.10+ (stdlib only)
"""
import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
SCHEMA_PATH = PROJECT_ROOT / "scripts" / "schema.sql"


def _compute_cid_from_file(session_name: str, filename: str) -> str | None:
    """Compute SHA-256 content-addressable ID from a transport JSON file.

    Returns the hex digest, or None if the file cannot be read.
    Canonical form: sorted-keys JSON with no trailing whitespace.
    """
    filepath = PROJECT_ROOT / "transport" / "sessions" / session_name / filename
    if not filepath.exists():
        return None
    try:
        raw = json.loads(filepath.read_text())
        canonical = json.dumps(raw, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    except (json.JSONDecodeError, OSError):
        return None


def get_connection() -> sqlite3.Connection:
    """Connect to state.db, creating from schema if missing."""
    if not DB_PATH.exists():
        if not SCHEMA_PATH.exists():
            print("ERROR: state.db missing and schema.sql not found", file=sys.stderr)
            sys.exit(1)
        print(f"state.db not found — creating from {SCHEMA_PATH}", file=sys.stderr)
        conn = sqlite3.connect(DB_PATH)
        conn.executescript(SCHEMA_PATH.read_text())
        conn.commit()
        return conn
    return sqlite3.connect(DB_PATH)


# ── transport-message ────────────────────────────────────────────────────

def cmd_transport_message(args: argparse.Namespace) -> None:
    conn = get_connection()
    # Ensure v18+ columns exist (migration safety for existing DBs)
    for col, col_type, default in [
        ("issue_url", "TEXT", "NULL"),
        ("issue_number", "INTEGER", "NULL"),
        ("issue_pending", "INTEGER", "0"),
        ("thread_id", "TEXT", "NULL"),
        ("parent_thread_id", "TEXT", "NULL"),
        ("message_cid", "TEXT", "NULL"),
        ("problem_type", "TEXT", "NULL"),
        ("task_state", "TEXT", "'pending'"),
        ("expires_at", "TEXT", "NULL"),
    ]:
        try:
            conn.execute(
                f"ALTER TABLE transport_messages ADD COLUMN {col} {col_type} DEFAULT {default}"
            )
        except sqlite3.OperationalError:
            pass  # column already exists

    # Compute content-addressable ID from the source JSON file if available
    message_cid = getattr(args, "message_cid", None)
    if not message_cid:
        message_cid = _compute_cid_from_file(args.session, args.filename)

    # Default thread_id to session_name (backward compatible)
    thread_id = getattr(args, "thread_id", None) or args.session
    parent_thread_id = getattr(args, "parent_thread_id", None)
    problem_type = getattr(args, "problem_type", None)

    # Task state: outbound messages start completed; inbound start pending
    task_state = getattr(args, "task_state", None) or "pending"
    expires_at = getattr(args, "expires_at", None)

    conn.execute("""
        INSERT OR REPLACE INTO transport_messages
            (session_name, filename, turn, message_type, from_agent, to_agent,
             timestamp, subject, claims_count, setl, urgency, processed, processed_at,
             issue_url, issue_number, issue_pending,
             thread_id, parent_thread_id, message_cid, problem_type,
             task_state, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NULL, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?)
    """, (
        args.session, args.filename, args.turn, args.type,
        args.from_agent, args.to_agent, args.timestamp,
        args.subject or "", args.claims_count or 0,
        args.setl, args.urgency or "normal",
        getattr(args, "issue_url", None),
        getattr(args, "issue_number", None),
        1 if getattr(args, "issue_pending", False) else 0,
        thread_id, parent_thread_id, message_cid, problem_type,
        task_state, expires_at,
    ))
    conn.commit()
    conn.close()
    print(f"indexed: transport_messages/{args.filename}"
          + (f" [cid:{message_cid[:12]}]" if message_cid else ""))


# ── mark-processed ───────────────────────────────────────────────────────

def cmd_mark_processed(args: argparse.Namespace) -> None:
    conn = get_connection()
    if args.session:
        cursor = conn.execute("""
            UPDATE transport_messages
            SET processed = TRUE,
                processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
                task_state = 'completed'
            WHERE session_name = ? AND filename = ?
        """, (args.session, args.filename))
    else:
        cursor = conn.execute("""
            UPDATE transport_messages
            SET processed = TRUE,
                processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
                task_state = 'completed'
            WHERE filename = ?
        """, (args.filename,))
    conn.commit()
    if cursor.rowcount == 0:
        print(f"warning: no row found for filename={args.filename}", file=sys.stderr)
    else:
        print(f"marked processed: {args.filename}")
    conn.close()


# ── memory-entry ─────────────────────────────────────────────────────────

def cmd_memory_entry(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute("""
        INSERT INTO memory_entries (topic, entry_key, value, status, last_confirmed, session_id)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'), ?)
        ON CONFLICT(topic, entry_key) DO UPDATE SET
            value = excluded.value,
            status = excluded.status,
            last_confirmed = excluded.last_confirmed,
            session_id = COALESCE(excluded.session_id, session_id)
    """, (args.topic, args.key, args.value, args.status, args.session_id))
    conn.commit()
    conn.close()
    print(f"upserted: memory_entries/{args.topic}/{args.key}")


# ── session-entry ────────────────────────────────────────────────────────

def cmd_session_entry(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute("""
        INSERT OR REPLACE INTO session_log (id, timestamp, summary, artifacts, epistemic_flags)
        VALUES (?, ?, ?, ?, ?)
    """, (args.id, args.timestamp, args.summary, args.artifacts, args.flags))
    conn.commit()
    conn.close()
    print(f"upserted: session_log/{args.id}")


# ── decision ─────────────────────────────────────────────────────────────

def cmd_decision(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute("""
        INSERT INTO decision_chain (decision_key, decision_text, evidence_source, decided_date, confidence)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(decision_key) DO UPDATE SET
            decision_text = excluded.decision_text,
            evidence_source = COALESCE(excluded.evidence_source, evidence_source),
            decided_date = excluded.decided_date,
            confidence = COALESCE(excluded.confidence, confidence)
    """, (args.key, args.text, args.source, args.date, args.confidence))
    conn.commit()
    conn.close()
    print(f"upserted: decision_chain/{args.key}")


# ── trigger-fired ────────────────────────────────────────────────────────

def cmd_trigger_fired(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute("""
        UPDATE trigger_state
        SET last_fired = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            fire_count = fire_count + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE trigger_id = ?
    """, (args.trigger_id,))
    conn.commit()
    conn.close()
    print(f"fired: trigger_state/{args.trigger_id}")


# ── lesson ──────────────────────────────────────────────────────────────

def cmd_lesson(args: argparse.Namespace) -> None:
    conn = get_connection()
    # Ensure table exists (schema v7 migration-safe)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS lessons (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            title            TEXT NOT NULL UNIQUE,
            lesson_date      TEXT NOT NULL,
            pattern_type     TEXT,
            domain           TEXT,
            severity         TEXT,
            recurrence       INTEGER DEFAULT 1,
            first_seen       TEXT,
            last_seen        TEXT,
            trigger_relevant TEXT,
            promotion_status TEXT,
            graduated_to     TEXT,
            graduated_date   TEXT,
            lesson_text      TEXT,
            created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
        )
    """)
    conn.execute("""
        INSERT INTO lessons
            (title, lesson_date, pattern_type, domain, severity, recurrence,
             first_seen, last_seen, trigger_relevant, promotion_status, lesson_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(title) DO UPDATE SET
            pattern_type = COALESCE(excluded.pattern_type, pattern_type),
            domain = COALESCE(excluded.domain, domain),
            severity = COALESCE(excluded.severity, severity),
            recurrence = COALESCE(excluded.recurrence, recurrence),
            last_seen = COALESCE(excluded.last_seen, last_seen),
            trigger_relevant = COALESCE(excluded.trigger_relevant, trigger_relevant),
            promotion_status = COALESCE(excluded.promotion_status, promotion_status),
            lesson_text = COALESCE(excluded.lesson_text, lesson_text)
    """, (
        args.title, args.date, args.pattern_type, args.domain,
        args.severity, args.recurrence or 1,
        args.date, args.date,  # first_seen = last_seen on initial insert
        args.trigger_relevant, args.promotion_status, args.lesson_text
    ))
    conn.commit()
    conn.close()
    print(f"upserted: lessons/{args.title}")


# ── gate-open ─────────────────────────────────────────────────────────────

def cmd_gate_open(args: argparse.Namespace) -> None:
    conn = get_connection()
    # Ensure table exists (schema v10 migration-safe)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS active_gates (
            gate_id             TEXT PRIMARY KEY,
            sending_agent       TEXT NOT NULL,
            receiving_agent     TEXT NOT NULL,
            session_name        TEXT NOT NULL,
            outbound_filename   TEXT NOT NULL,
            blocks_until        TEXT NOT NULL DEFAULT 'response',
            timeout_minutes     INTEGER NOT NULL DEFAULT 60,
            fallback_action     TEXT NOT NULL DEFAULT 'continue-without-response',
            status              TEXT NOT NULL DEFAULT 'waiting',
            created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
            resolved_at         TEXT,
            resolved_by         TEXT,
            timeout_at          TEXT NOT NULL
        )
    """)
    timeout_minutes = min(args.timeout_minutes or 60, 1440)  # cap at 24h
    conn.execute("""
        INSERT OR REPLACE INTO active_gates
            (gate_id, sending_agent, receiving_agent, session_name,
             outbound_filename, blocks_until, timeout_minutes,
             fallback_action, status, timeout_at)
        VALUES (?, ?, ?, ?, ?, ?, ?,
                ?, 'waiting',
                strftime('%Y-%m-%dT%H:%M:%S',
                         datetime('now', 'localtime', '+' || ? || ' minutes')))
    """, (
        args.gate_id, args.sending_agent, args.receiving_agent,
        args.session, args.filename, args.blocks_until or "response",
        timeout_minutes, args.fallback_action or "continue-without-response",
        str(timeout_minutes),
    ))
    conn.commit()
    conn.close()
    print(f"gate opened: {args.gate_id} "
          f"({args.sending_agent} → {args.receiving_agent}, "
          f"timeout {timeout_minutes}min)")


# ── gate-resolve ──────────────────────────────────────────────────────────

def cmd_gate_resolve(args: argparse.Namespace) -> None:
    conn = get_connection()
    cursor = conn.execute("""
        UPDATE active_gates
        SET status = 'resolved',
            resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            resolved_by = ?
        WHERE gate_id = ? AND status = 'waiting'
    """, (args.resolved_by, args.gate_id))
    conn.commit()
    if cursor.rowcount == 0:
        print(f"warning: no waiting gate found for gate_id={args.gate_id}",
              file=sys.stderr)
    else:
        print(f"gate resolved: {args.gate_id} by {args.resolved_by}")
    conn.close()


# ── gate-timeout ──────────────────────────────────────────────────────────

def cmd_gate_timeout(args: argparse.Namespace) -> None:
    conn = get_connection()
    cursor = conn.execute("""
        UPDATE active_gates
        SET status = 'timed-out',
            resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE gate_id = ? AND status = 'waiting'
    """, (args.gate_id,))
    conn.commit()
    if cursor.rowcount == 0:
        print(f"warning: no waiting gate found for gate_id={args.gate_id}",
              file=sys.stderr)
    else:
        print(f"gate timed out: {args.gate_id}")
    conn.close()


# ── gate-status ───────────────────────────────────────────────────────────

def cmd_gate_status(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    # Check table exists
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='active_gates'"
    ).fetchall()]
    if "active_gates" not in tables:
        print(json.dumps({"active_gates": 0, "gates": []}))
        conn.close()
        return

    query = """
        SELECT gate_id, sending_agent, receiving_agent, session_name,
               outbound_filename, blocks_until, timeout_minutes,
               fallback_action, status, created_at, timeout_at,
               resolved_at, resolved_by
        FROM active_gates
        WHERE status = 'waiting'
    """
    params: tuple = ()
    if args.agent_id:
        query += " AND (sending_agent = ? OR receiving_agent = ?)"
        params = (args.agent_id, args.agent_id)
    query += " ORDER BY created_at"

    rows = conn.execute(query, params).fetchall()
    gates = [dict(r) for r in rows]
    result = {"active_gates": len(gates), "gates": gates}
    print(json.dumps(result, indent=2))
    conn.close()


# ── next-turn ────────────────────────────────────────────────────────────

def cmd_next_turn(args: argparse.Namespace) -> None:
    """Print the next available turn number for a session.

    Computes MAX(turn) + 1 from transport_messages for the given session,
    across ALL agents (turns are session-scoped, not agent-scoped, even
    though two agents may have historically shared turn numbers). All
    transport-writing skills should use this instead of parsing filenames
    or directory listings.
    """
    conn = get_connection()
    row = conn.execute(
        "SELECT MAX(turn) FROM transport_messages WHERE session_name = ?",
        (args.session,)
    ).fetchone()
    max_turn = row[0] if row and row[0] is not None else 0
    next_turn = max_turn + 1
    print(next_turn)
    conn.close()


# ── engineering-incident ──────────────────────────────────────────────────

def cmd_engineering_incident(args: argparse.Namespace) -> None:
    """Record an engineering incident, incrementing recurrence on duplicate type."""
    conn = get_connection()
    # Check if same incident_type already exists (for recurrence increment)
    row = conn.execute(
        "SELECT id, recurrence FROM engineering_incidents "
        "WHERE incident_type = ? AND graduated = 0 "
        "ORDER BY created_at DESC LIMIT 1",
        (args.incident_type,)
    ).fetchone()
    if row:
        conn.execute(
            "UPDATE engineering_incidents SET recurrence = ?, "
            "description = ?, tool_name = ?, tool_context = ?, "
            "session_id = ?, severity = ? "
            "WHERE id = ?",
            (row[1] + 1, args.description, args.tool_name,
             args.tool_context, args.session_id, args.severity or "moderate",
             row[0])
        )
        print(f"incremented: engineering_incidents/{args.incident_type} "
              f"(recurrence={row[1] + 1})")
    else:
        conn.execute(
            "INSERT INTO engineering_incidents "
            "(session_id, incident_type, detection_tier, severity, "
            "description, tool_name, tool_context) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (args.session_id, args.incident_type,
             args.detection_tier or 1, args.severity or "moderate",
             args.description, args.tool_name, args.tool_context)
        )
        print(f"recorded: engineering_incidents/{args.incident_type}")
    conn.commit()
    conn.close()


def cmd_facet(args: argparse.Namespace) -> None:
    """Add a universal facet to any entity."""
    conn = get_connection()
    conn.execute(
        "INSERT OR IGNORE INTO universal_facets "
        "(entity_type, entity_id, facet_type, facet_value) "
        "VALUES (?, ?, ?, ?)",
        (args.entity_type, args.entity_id, args.facet_type, args.facet_value),
    )
    conn.commit()
    conn.close()
    print(f"facet: {args.entity_type}/{args.entity_id} "
          f"+{args.facet_type}={args.facet_value}")


def cmd_facet_query(args: argparse.Namespace) -> None:
    """Query entities by facet type and value. Returns JSON."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT entity_type, entity_id, facet_type, facet_value "
        "FROM universal_facets WHERE facet_type = ? AND facet_value = ? "
        "ORDER BY entity_type, entity_id",
        (args.facet_type, args.facet_value),
    ).fetchall()
    conn.close()
    results = [
        {"entity_type": r[0], "entity_id": r[1],
         "facet_type": r[2], "facet_value": r[3]}
        for r in rows
    ]
    print(json.dumps(results, indent=2))


# ── main ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Incremental dual-write to state.db")
    sub = parser.add_subparsers(dest="command", required=True)

    # transport-message
    tp = sub.add_parser("transport-message", help="Index a transport message")
    tp.add_argument("--session", required=True)
    tp.add_argument("--filename", required=True)
    tp.add_argument("--turn", required=True, type=int)
    tp.add_argument("--type", required=True)
    tp.add_argument("--from-agent", required=True)
    tp.add_argument("--to-agent", required=True)
    tp.add_argument("--timestamp", required=True)
    tp.add_argument("--subject")
    tp.add_argument("--claims-count", type=int)
    tp.add_argument("--setl", type=float)
    tp.add_argument("--urgency")
    tp.add_argument("--issue-url", help="GitHub issue URL (triple-write cross-ref)")
    tp.add_argument("--issue-number", type=int, help="GitHub issue number")
    tp.add_argument("--issue-pending", action="store_true",
                    help="Flag for backfill sweep if issue creation failed")
    tp.add_argument("--thread-id", help="Thread ID (defaults to session name)")
    tp.add_argument("--parent-thread-id", help="Parent thread ID for nested threads")
    tp.add_argument("--message-cid", help="Content-addressable ID (auto-computed if omitted)")
    tp.add_argument("--problem-type", choices=["error", "warning", "info"],
                    help="Problem report type (DIDComm-inspired)")
    tp.add_argument("--task-state",
                    choices=["pending", "working", "input-required",
                             "completed", "failed", "canceled", "rejected"],
                    help="Task lifecycle state (A2A-inspired)")
    tp.add_argument("--expires-at", help="ISO 8601 expiration timestamp")

    # mark-processed
    mp = sub.add_parser("mark-processed", help="Mark a transport message as processed")
    mp.add_argument("--session", help="Session name (recommended — disambiguates duplicate filenames)")
    mp.add_argument("--filename", required=True)

    # memory-entry
    me = sub.add_parser("memory-entry", help="Upsert a memory entry")
    me.add_argument("--topic", required=True)
    me.add_argument("--key", required=True)
    me.add_argument("--value", required=True)
    me.add_argument("--status")
    me.add_argument("--session-id", type=int)

    # session-entry
    se = sub.add_parser("session-entry", help="Upsert a session log entry")
    se.add_argument("--id", required=True, type=int)
    se.add_argument("--timestamp", required=True)
    se.add_argument("--summary", required=True)
    se.add_argument("--artifacts")
    se.add_argument("--flags")

    # decision
    dc = sub.add_parser("decision", help="Upsert a design decision")
    dc.add_argument("--key", required=True)
    dc.add_argument("--text", required=True)
    dc.add_argument("--date", required=True)
    dc.add_argument("--source")
    dc.add_argument("--confidence", type=float)

    # trigger-fired
    tf = sub.add_parser("trigger-fired", help="Record a trigger firing")
    tf.add_argument("--trigger-id", required=True)

    # lesson
    ls = sub.add_parser("lesson", help="Upsert a lesson entry")
    ls.add_argument("--title", required=True)
    ls.add_argument("--date", required=True)
    ls.add_argument("--pattern-type")
    ls.add_argument("--domain")
    ls.add_argument("--severity")
    ls.add_argument("--recurrence", type=int)
    ls.add_argument("--trigger-relevant")
    ls.add_argument("--promotion-status")
    ls.add_argument("--lesson-text")

    # gate-open
    go = sub.add_parser("gate-open", help="Open a gated chain")
    go.add_argument("--gate-id", required=True)
    go.add_argument("--sending-agent", required=True)
    go.add_argument("--receiving-agent", required=True)
    go.add_argument("--session", required=True)
    go.add_argument("--filename", required=True)
    go.add_argument("--blocks-until", default="response",
                    choices=["response", "ack", "specific-turn"])
    go.add_argument("--timeout-minutes", type=int, default=60)
    go.add_argument("--fallback-action", default="continue-without-response",
                    choices=["continue-without-response", "retry-once",
                             "halt-and-escalate"])

    # gate-resolve
    gr = sub.add_parser("gate-resolve", help="Resolve a waiting gate")
    gr.add_argument("--gate-id", required=True)
    gr.add_argument("--resolved-by", required=True)

    # gate-timeout
    gt = sub.add_parser("gate-timeout", help="Mark a gate as timed out")
    gt.add_argument("--gate-id", required=True)

    # gate-status
    gs = sub.add_parser("gate-status", help="Show active gates (JSON)")
    gs.add_argument("--agent-id")

    # next-turn
    nt = sub.add_parser("next-turn",
                        help="Print the next available turn number for a session")
    nt.add_argument("--session", required=True)

    # engineering-incident
    ei = sub.add_parser("engineering-incident",
                        help="Record an engineering anti-pattern incident")
    ei.add_argument("--incident-type", required=True,
                    help="Category: credential-exposure, dns-churn, error-loop, "
                         "premature-execution, stale-process")
    ei.add_argument("--description", required=True,
                    help="What happened (fair witness: facts only)")
    ei.add_argument("--session-id", type=int)
    ei.add_argument("--severity", default="moderate",
                    choices=["low", "moderate", "high", "critical"])
    ei.add_argument("--tool-name",
                    help="Tool that triggered detection (e.g., Bash)")
    ei.add_argument("--tool-context",
                    help="Command or context that triggered detection")
    ei.add_argument("--detection-tier", type=int, default=1,
                    choices=[1, 2],
                    help="1=mechanical (hook), 2=cognitive (T17)")

    # facet
    fa = sub.add_parser("facet", help="Add a universal facet to any entity")
    fa.add_argument("--entity-type", required=True,
                    help="Table name (e.g., transport_messages, decision_chain)")
    fa.add_argument("--entity-id", required=True, type=int,
                    help="Row id in the source table")
    fa.add_argument("--facet-type", required=True,
                    help="Facet type (e.g., pje_domain, domain, agent)")
    fa.add_argument("--facet-value", required=True,
                    help="Facet value (e.g., psychology, jurisprudence)")

    # facet-query
    fq = sub.add_parser("facet-query",
                        help="Query entities by facet type and value (JSON)")
    fq.add_argument("--facet-type", required=True)
    fq.add_argument("--facet-value", required=True)

    args = parser.parse_args()

    dispatch = {
        "transport-message": cmd_transport_message,
        "mark-processed": cmd_mark_processed,
        "memory-entry": cmd_memory_entry,
        "session-entry": cmd_session_entry,
        "decision": cmd_decision,
        "trigger-fired": cmd_trigger_fired,
        "lesson": cmd_lesson,
        "gate-open": cmd_gate_open,
        "gate-resolve": cmd_gate_resolve,
        "gate-timeout": cmd_gate_timeout,
        "gate-status": cmd_gate_status,
        "next-turn": cmd_next_turn,
        "engineering-incident": cmd_engineering_incident,
        "facet": cmd_facet,
        "facet-query": cmd_facet_query,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()

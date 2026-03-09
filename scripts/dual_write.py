#!/usr/bin/env python3
"""
dual_write.py — Incremental SQLite state layer writes.

Called by /sync and /cycle after writing markdown (Phase 1 contract:
markdown = source of truth, DB = queryable index).

Usage:
    python scripts/dual_write.py transport-message --session SESSION --filename FILE \
        --turn N --type TYPE --from-agent FROM --to-agent TO --timestamp TS \
        [--subject SUBJ] [--claims-count N] [--setl F] [--urgency URG]

    python scripts/dual_write.py mark-processed --filename FILE

    python scripts/dual_write.py memory-entry --topic TOPIC --key KEY --value VAL \
        [--status S] [--session-id N]

    python scripts/dual_write.py session-entry --id N --timestamp TS --summary TEXT \
        [--artifacts TEXT] [--flags TEXT]

    python scripts/dual_write.py decision --key KEY --text TEXT --date DATE \
        [--source SRC] [--confidence F]

    python scripts/dual_write.py trigger-fired --trigger-id TID

Requires: Python 3.10+ (stdlib only)
"""
import argparse
import json
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
SCHEMA_PATH = PROJECT_ROOT / "scripts" / "schema.sql"


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
    conn.execute("""
        INSERT OR REPLACE INTO transport_messages
            (session_name, filename, turn, message_type, from_agent, to_agent,
             timestamp, subject, claims_count, setl, urgency, processed, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NULL)
    """, (
        args.session, args.filename, args.turn, args.type,
        args.from_agent, args.to_agent, args.timestamp,
        args.subject or "", args.claims_count or 0,
        args.setl, args.urgency or "normal"
    ))
    conn.commit()
    conn.close()
    print(f"indexed: transport_messages/{args.filename}")


# ── mark-processed ───────────────────────────────────────────────────────

def cmd_mark_processed(args: argparse.Namespace) -> None:
    conn = get_connection()
    cursor = conn.execute("""
        UPDATE transport_messages
        SET processed = TRUE, processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
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

    # mark-processed
    mp = sub.add_parser("mark-processed", help="Mark a transport message as processed")
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

    args = parser.parse_args()

    dispatch = {
        "transport-message": cmd_transport_message,
        "mark-processed": cmd_mark_processed,
        "memory-entry": cmd_memory_entry,
        "session-entry": cmd_session_entry,
        "decision": cmd_decision,
        "trigger-fired": cmd_trigger_fired,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
efference-copy.py — Predict responses to outbound messages, compare against actual.

Named for the motor system's efference copy: when you send a motor command,
the brain simultaneously generates a prediction of the sensory feedback that
command should produce. When actual feedback diverges from prediction, the
system detects the mismatch and adjusts.

This script:
1. Records predictions for outbound transport messages (what response do we expect?)
2. Compares predictions against actual inbound responses
3. Logs mismatches to the prediction_ledger for /retrospect analysis

Integration: called by /sync after sending outbound messages and after
processing inbound responses.

Usage:
    python3 scripts/efference-copy.py predict \\
        --session <session> --outbound <filename> \\
        --expected-type <ack|response|review> \\
        --expected-agent <agent-id> \\
        --prediction "expected response summary"

    python3 scripts/efference-copy.py compare \\
        --session <session> --outbound <filename> \\
        --inbound <filename> --actual "what actually arrived"

    python3 scripts/efference-copy.py report    # show prediction vs actual
"""

import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"


def ensure_table(conn: sqlite3.Connection) -> None:
    """Create efference_copies table if absent."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS efference_copies (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_name    TEXT NOT NULL,
            outbound_file   TEXT NOT NULL,
            expected_type   TEXT,
            expected_agent  TEXT,
            prediction      TEXT NOT NULL,
            inbound_file    TEXT,
            actual          TEXT,
            match_result    TEXT,
            delta           TEXT,
            predicted_at    TEXT DEFAULT (datetime('now')),
            compared_at     TEXT,
            UNIQUE(session_name, outbound_file)
        )
    """)
    conn.commit()


def cmd_predict(conn: sqlite3.Connection, args: list[str]) -> None:
    """Record a prediction for an outbound message."""
    parsed = parse_args(args, ["--session", "--outbound", "--expected-type",
                                "--expected-agent", "--prediction"])
    conn.execute(
        "INSERT OR REPLACE INTO efference_copies "
        "(session_name, outbound_file, expected_type, expected_agent, prediction) "
        "VALUES (?, ?, ?, ?, ?)",
        (parsed["--session"], parsed["--outbound"],
         parsed.get("--expected-type", "response"),
         parsed.get("--expected-agent", "unknown"),
         parsed["--prediction"]),
    )
    conn.commit()
    print(f"Predicted: {parsed['--session']}/{parsed['--outbound']} → "
          f"expect {parsed.get('--expected-type', 'response')} from "
          f"{parsed.get('--expected-agent', 'unknown')}")


def cmd_compare(conn: sqlite3.Connection, args: list[str]) -> None:
    """Compare actual response against prediction."""
    parsed = parse_args(args, ["--session", "--outbound", "--inbound", "--actual"])

    row = conn.execute(
        "SELECT prediction, expected_type, expected_agent FROM efference_copies "
        "WHERE session_name = ? AND outbound_file = ?",
        (parsed["--session"], parsed["--outbound"]),
    ).fetchone()

    if not row:
        print(f"No prediction found for {parsed['--session']}/{parsed['--outbound']}")
        return

    prediction, expected_type, expected_agent = row
    actual = parsed["--actual"]

    # Match classification (uses prediction_ledger-compatible outcomes)
    actual_lower = actual.lower()
    if any(actual_lower.startswith(p) for p in ("ack", "accept", "confirmed")):
        match_result = "confirmed"
    elif any(actual_lower.startswith(p) for p in ("reject", "refuse", "decline")):
        match_result = "refuted"
    elif any(actual_lower.startswith(p) for p in ("partial", "with revision", "accept with")):
        match_result = "partially-confirmed"
    else:
        match_result = "untested"  # requires manual review

    delta = f"Predicted: {prediction[:80]}... | Actual: {actual[:80]}..."

    conn.execute(
        "UPDATE efference_copies SET inbound_file = ?, actual = ?, "
        "match_result = ?, delta = ?, compared_at = datetime('now') "
        "WHERE session_name = ? AND outbound_file = ?",
        (parsed["--inbound"], actual, match_result, delta,
         parsed["--session"], parsed["--outbound"]),
    )
    conn.commit()

    # Also log to prediction_ledger for /retrospect integration
    conn.execute(
        "INSERT INTO prediction_ledger "
        "(session_id, prediction, domain, source_doc, outcome, outcome_detail) "
        "VALUES (?, ?, 'transport', 'efference-copy', ?, ?)",
        (0, f"Response to {parsed['--outbound']}: {prediction[:100]}",
         match_result, delta[:200]),
    )
    conn.commit()

    symbol = {"confirmed": "✓", "partially-confirmed": "~", "refuted": "✗",
              "unexpected-positive": "?+", "requires-review": "?"}
    print(f"{symbol.get(match_result, '?')} {parsed['--session']}/{parsed['--outbound']}: "
          f"{match_result}")
    print(f"  Predicted: {prediction[:60]}")
    print(f"  Actual:    {actual[:60]}")


def cmd_report(conn: sqlite3.Connection) -> None:
    """Report all predictions and their outcomes."""
    rows = conn.execute(
        "SELECT session_name, outbound_file, prediction, actual, match_result, "
        "expected_agent, predicted_at, compared_at "
        "FROM efference_copies ORDER BY predicted_at DESC"
    ).fetchall()

    if not rows:
        print("No efference copies recorded yet.")
        return

    total = len(rows)
    compared = sum(1 for r in rows if r[4])
    confirmed = sum(1 for r in rows if r[4] == "confirmed")
    refuted = sum(1 for r in rows if r[4] == "refuted")
    pending = sum(1 for r in rows if not r[4])

    print(f"Efference Copy Report — {total} predictions")
    print(f"  Compared: {compared} | Confirmed: {confirmed} | Refuted: {refuted} | Pending: {pending}")
    print()

    for r in rows:
        status = r[4] or "pending"
        symbol = {"confirmed": "✓", "partially-confirmed": "~", "refuted": "✗",
                  "pending": "○"}.get(status, "?")
        print(f"  {symbol} {r[0]}/{r[1]} → {r[5] or '?'}")
        print(f"    Predicted: {(r[2] or '')[:60]}")
        if r[3]:
            print(f"    Actual:    {r[3][:60]}")


def parse_args(args: list[str], expected: list[str]) -> dict:
    """Simple key-value argument parser."""
    result = {}
    for i, arg in enumerate(args):
        if arg in expected and i + 1 < len(args):
            result[arg] = args[i + 1]
    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: efference-copy.py <predict|compare|report> [args]")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    ensure_table(conn)

    command = sys.argv[1]
    if command == "predict":
        cmd_predict(conn, sys.argv[2:])
    elif command == "compare":
        cmd_compare(conn, sys.argv[2:])
    elif command == "report":
        cmd_report(conn)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

    conn.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""auto_process_trivial.py — Auto-process transport messages that need no LLM review.

Marks as processed any unprocessed message where:
  - ack_required = FALSE (or absent), AND
  - message_type IN ('ack', 'notification', 'state-update')

These messages carry no substance decision — they inform but don't request.
Messages requiring LLM review (requests, proposals, gated responses) survive
for claude /sync to handle.

Usage:
    python3 scripts/auto_process_trivial.py          # process and report
    python3 scripts/auto_process_trivial.py --dry-run # report without processing
"""

import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"

# Message types safe to auto-process without LLM review
TRIVIAL_TYPES = ('ack', 'notification', 'state-update')


def main():
    parser = argparse.ArgumentParser(description="Auto-process trivial transport messages")
    parser.add_argument("--dry-run", action="store_true", help="Report without processing")
    args = parser.parse_args()

    if not DB_PATH.exists():
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # Find trivial unprocessed messages
    placeholders = ",".join("?" for _ in TRIVIAL_TYPES)
    rows = conn.execute(
        f"SELECT filename, message_type, from_agent, session_name "
        f"FROM transport_messages "
        f"WHERE processed = FALSE "
        f"AND (ack_required = 0 OR ack_required IS NULL) "
        f"AND message_type IN ({placeholders})",
        TRIVIAL_TYPES
    ).fetchall()

    if not rows:
        conn.close()
        return

    if args.dry_run:
        for r in rows:
            print(f"would process: {r['filename']} ({r['message_type']} from {r['from_agent']})")
        conn.close()
        return

    # Mark as processed
    for r in rows:
        conn.execute(
            "UPDATE transport_messages SET processed = TRUE, "
            "processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') "
            "WHERE filename = ?",
            (r["filename"],)
        )

    conn.commit()
    conn.close()

    count = len(rows)
    types = ", ".join(sorted(set(r["message_type"] for r in rows)))
    print(f"{count} trivial ({types})")


if __name__ == "__main__":
    main()

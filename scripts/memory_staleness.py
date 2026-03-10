#!/usr/bin/env python3
"""Memory staleness heatmap — automated T9 freshness enforcement via SQL.

Queries memory_entries for stale entries based on last_confirmed date.
T9 thresholds: 5 sessions → flag for review, 10 sessions → default removal.
This script uses calendar days as a proxy (sessions lack fixed cadence).

Usage:
  python scripts/memory_staleness.py              # full heatmap
  python scripts/memory_staleness.py --summary    # one-line summary for /hunt
  python scripts/memory_staleness.py --stale N    # entries older than N days
  python scripts/memory_staleness.py --by-topic   # staleness grouped by topic
"""

import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"

# T9 thresholds in days (proxy for session count)
FLAG_THRESHOLD_DAYS = 14    # ~5 sessions at 2-3 day cadence
REMOVE_THRESHOLD_DAYS = 30  # ~10 sessions


def get_connection():
    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found. Run bootstrap_state_db.py first.",
              file=sys.stderr)
        sys.exit(1)
    return sqlite3.connect(str(DB_PATH))


def all_entries_with_staleness(conn):
    """All memory entries with days since last confirmation."""
    cursor = conn.execute("""
        SELECT topic, entry_key, status, last_confirmed,
               ROUND(julianday('now') - julianday(last_confirmed), 1) as days_stale,
               CASE
                   WHEN last_confirmed IS NULL THEN 'UNKNOWN'
                   WHEN julianday('now') - julianday(last_confirmed) > ? THEN 'REMOVE'
                   WHEN julianday('now') - julianday(last_confirmed) > ? THEN 'FLAG'
                   ELSE 'FRESH'
               END as staleness_tier
        FROM memory_entries
        ORDER BY days_stale DESC NULLS FIRST
    """, (REMOVE_THRESHOLD_DAYS, FLAG_THRESHOLD_DAYS))
    return cursor.fetchall()


def stale_entries(conn, days_threshold=None):
    """Entries exceeding a staleness threshold."""
    threshold = days_threshold or FLAG_THRESHOLD_DAYS
    cursor = conn.execute("""
        SELECT topic, entry_key, status, last_confirmed,
               ROUND(julianday('now') - julianday(last_confirmed), 1) as days_stale
        FROM memory_entries
        WHERE last_confirmed IS NOT NULL
          AND julianday('now') - julianday(last_confirmed) > ?
        ORDER BY days_stale DESC
    """, (threshold,))
    return cursor.fetchall()


def entries_without_date(conn):
    """Entries missing last_confirmed entirely."""
    cursor = conn.execute("""
        SELECT topic, entry_key, status
        FROM memory_entries
        WHERE last_confirmed IS NULL
        ORDER BY topic, entry_key
    """)
    return cursor.fetchall()


def staleness_by_topic(conn):
    """Aggregate staleness per topic."""
    cursor = conn.execute("""
        SELECT topic,
               COUNT(*) as total,
               SUM(CASE WHEN last_confirmed IS NULL THEN 1 ELSE 0 END) as no_date,
               SUM(CASE WHEN julianday('now') - julianday(last_confirmed) > ? THEN 1 ELSE 0 END) as stale_remove,
               SUM(CASE WHEN julianday('now') - julianday(last_confirmed) > ?
                        AND julianday('now') - julianday(last_confirmed) <= ? THEN 1 ELSE 0 END) as stale_flag,
               SUM(CASE WHEN julianday('now') - julianday(last_confirmed) <= ? THEN 1 ELSE 0 END) as fresh,
               ROUND(AVG(CASE WHEN last_confirmed IS NOT NULL
                         THEN julianday('now') - julianday(last_confirmed) END), 1) as avg_days
        FROM memory_entries
        GROUP BY topic
        ORDER BY avg_days DESC NULLS FIRST
    """, (REMOVE_THRESHOLD_DAYS, FLAG_THRESHOLD_DAYS, REMOVE_THRESHOLD_DAYS, FLAG_THRESHOLD_DAYS))
    return cursor.fetchall()


def summary_counts(conn):
    """Counts per staleness tier."""
    cursor = conn.execute("SELECT COUNT(*) FROM memory_entries")
    total = cursor.fetchone()[0]

    cursor = conn.execute("""
        SELECT COUNT(*) FROM memory_entries
        WHERE last_confirmed IS NULL
    """)
    no_date = cursor.fetchone()[0]

    cursor = conn.execute("""
        SELECT COUNT(*) FROM memory_entries
        WHERE julianday('now') - julianday(last_confirmed) > ?
    """, (REMOVE_THRESHOLD_DAYS,))
    remove = cursor.fetchone()[0]

    cursor = conn.execute("""
        SELECT COUNT(*) FROM memory_entries
        WHERE julianday('now') - julianday(last_confirmed) > ?
          AND julianday('now') - julianday(last_confirmed) <= ?
    """, (FLAG_THRESHOLD_DAYS, REMOVE_THRESHOLD_DAYS))
    flag = cursor.fetchone()[0]

    fresh = total - no_date - remove - flag
    return total, fresh, flag, remove, no_date


def format_summary(conn):
    total, fresh, flag, remove, no_date = summary_counts(conn)
    return (f"Memory staleness: {total} entries — "
            f"{fresh} fresh, {flag} flagged (>{FLAG_THRESHOLD_DAYS}d), "
            f"{remove} stale (>{REMOVE_THRESHOLD_DAYS}d), "
            f"{no_date} undated")


def format_full(conn):
    lines = []
    total, fresh, flag, remove, no_date = summary_counts(conn)
    lines.append("Memory Staleness Heatmap")
    lines.append("=" * 45)
    lines.append(f"Total entries: {total}")
    lines.append(f"  FRESH  (<={FLAG_THRESHOLD_DAYS}d):  {fresh}")
    lines.append(f"  FLAG   (>{FLAG_THRESHOLD_DAYS}d):   {flag}")
    lines.append(f"  REMOVE (>{REMOVE_THRESHOLD_DAYS}d):  {remove}")
    lines.append(f"  UNDATED:         {no_date}")
    lines.append(f"  Thresholds: flag={FLAG_THRESHOLD_DAYS}d, remove={REMOVE_THRESHOLD_DAYS}d (T9 proxy)")
    lines.append("")

    # Full entry list
    entries = all_entries_with_staleness(conn)
    if entries:
        lines.append(f"{'Topic':<18} {'Key':<28} {'Status':>6} {'Confirmed':<12} {'Days':>6} {'Tier':<7}")
        lines.append(f"{'-'*18} {'-'*28} {'-'*6} {'-'*12} {'-'*6} {'-'*7}")
        for topic, key, status, confirmed, days, tier in entries:
            confirmed_str = confirmed[:10] if confirmed else "—"
            days_str = f"{days:.0f}" if days is not None else "—"
            status_str = status or "—"
            lines.append(
                f"{topic:<18} {key:<28} {status_str:>6} "
                f"{confirmed_str:<12} {days_str:>6} {tier:<7}")

    # Undated entries
    undated = entries_without_date(conn)
    if undated:
        lines.append(f"\nEntries without last_confirmed date:")
        for topic, key, status in undated:
            lines.append(f"  {topic}/{key} (status: {status or '—'})")

    return "\n".join(lines)


def format_by_topic(conn):
    lines = []
    lines.append("Staleness by Topic:")
    lines.append(f"  {'Topic':<18} {'Total':>5} {'Fresh':>5} {'Flag':>5} {'Remove':>6} {'No Date':>7} {'Avg Days':>8}")
    lines.append(f"  {'-'*18} {'-'*5} {'-'*5} {'-'*5} {'-'*6} {'-'*7} {'-'*8}")
    for topic, total, no_date, remove, flag, fresh, avg_days in staleness_by_topic(conn):
        avg_str = f"{avg_days:.1f}" if avg_days is not None else "—"
        lines.append(
            f"  {topic:<18} {total:>5} {fresh:>5} {flag:>5} "
            f"{remove:>6} {no_date:>7} {avg_str:>8}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Memory staleness heatmap")
    parser.add_argument("--summary", action="store_true",
                        help="One-line summary")
    parser.add_argument("--stale", type=int, metavar="N",
                        help="Show entries older than N days")
    parser.add_argument("--by-topic", action="store_true",
                        help="Staleness grouped by topic")
    args = parser.parse_args()

    conn = get_connection()

    if args.summary:
        print(format_summary(conn))
    elif args.stale is not None:
        entries = stale_entries(conn, args.stale)
        if not entries:
            print(f"No entries older than {args.stale} days.")
        else:
            print(f"Entries older than {args.stale} days:")
            for topic, key, status, confirmed, days in entries:
                print(f"  {topic}/{key}: {days:.0f}d (confirmed {confirmed[:10]})")
    elif args.by_topic:
        print(format_by_topic(conn))
    else:
        print(format_full(conn))

    conn.close()


if __name__ == "__main__":
    main()

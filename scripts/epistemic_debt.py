#!/usr/bin/env python3
"""Epistemic debt dashboard — query unresolved uncertainty across the project.

Two sources of epistemic flags:
  1. Transport messages (state.db epistemic_flags table) — uncertainty flagged
     in interagent communication, indexed by source file
  2. Lab-notebook session entries (⚑ EPISTEMIC FLAGS blocks) — uncertainty
     flagged during /cycle, indexed by session number

Usage:
  python scripts/epistemic_debt.py              # full dashboard
  python scripts/epistemic_debt.py --summary    # one-line summary for /hunt
  python scripts/epistemic_debt.py --by-source  # transport flags by source
  python scripts/epistemic_debt.py --by-session # transport flags by session dir
  python scripts/epistemic_debt.py --stale N    # flags older than N days
"""

import argparse
import os
import re
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
LAB_NOTEBOOK = PROJECT_ROOT / "lab-notebook.md"


def get_connection():
    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found. Run bootstrap_state_db.py first.",
              file=sys.stderr)
        sys.exit(1)
    return sqlite3.connect(str(DB_PATH))


def transport_flags(conn):
    """Query unresolved epistemic flags from transport messages."""
    cursor = conn.execute(
        "SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE")
    total = cursor.fetchone()[0]

    cursor = conn.execute(
        "SELECT COUNT(*) FROM epistemic_flags WHERE resolved = TRUE")
    resolved = cursor.fetchone()[0]

    return total, resolved


def transport_by_source(conn, limit=15):
    """Group unresolved flags by source file."""
    cursor = conn.execute("""
        SELECT source, COUNT(*) as flags
        FROM epistemic_flags WHERE resolved = FALSE
        GROUP BY source ORDER BY flags DESC LIMIT ?
    """, (limit,))
    return cursor.fetchall()


def transport_by_session_dir(conn, limit=15):
    """Derive transport session from source path via transport_messages."""
    cursor = conn.execute("""
        SELECT tm.session_name, COUNT(*) as flags
        FROM epistemic_flags ef
        JOIN transport_messages tm ON ef.source = tm.filename
        WHERE ef.resolved = FALSE
        GROUP BY tm.session_name ORDER BY flags DESC LIMIT ?
    """, (limit,))
    return cursor.fetchall()


def transport_by_agent(conn):
    """Group unresolved flags by originating agent."""
    cursor = conn.execute("""
        SELECT
            CASE
                WHEN source LIKE 'from-psq%' THEN 'safety-quotient-agent'
                WHEN source LIKE 'from-unratified%' THEN 'unratified-agent'
                WHEN source LIKE 'from-psychology%' THEN 'psychology-agent'
                WHEN source LIKE 'to-%' THEN 'psychology-agent (outbound)'
                ELSE 'psychology-agent (legacy naming)'
            END as agent,
            COUNT(*) as flags
        FROM epistemic_flags WHERE resolved = FALSE
        GROUP BY agent ORDER BY flags DESC
    """)
    return cursor.fetchall()


def stale_flags(conn, days=7):
    """Find flags older than N days."""
    cursor = conn.execute("""
        SELECT source, flag_text, created_at
        FROM epistemic_flags
        WHERE resolved = FALSE
          AND julianday('now') - julianday(created_at) > ?
        ORDER BY created_at ASC LIMIT 20
    """, (days,))
    return cursor.fetchall()


def notebook_flag_summary():
    """Parse lab-notebook for ⚑ EPISTEMIC FLAGS blocks."""
    if not LAB_NOTEBOOK.exists():
        return 0, 0, []

    content = LAB_NOTEBOOK.read_text()
    blocks = re.findall(
        r'## .*?Session (\d+).*?\n.*?⚑ EPISTEMIC FLAGS\n(.*?)(?=\n\n|\n##|\Z)',
        content, re.DOTALL)

    total_sessions = len(blocks)
    sessions_with_flags = 0
    flagged_sessions = []

    for session_num, block in blocks:
        stripped = block.strip()
        if stripped and "none identified" not in stripped.lower():
            sessions_with_flags += 1
            flag_count = stripped.count("\n- ") + (1 if stripped.startswith("- ") else 0)
            flagged_sessions.append((int(session_num), flag_count))

    flagged_sessions.sort(key=lambda x: x[1], reverse=True)
    return total_sessions, sessions_with_flags, flagged_sessions


def print_dashboard(conn, args):
    """Full dashboard output."""
    unresolved, resolved = transport_flags(conn)
    total = unresolved + resolved
    resolution_rate = (resolved / total * 100) if total > 0 else 0

    print("=" * 60)
    print("  Epistemic Debt Dashboard")
    print("=" * 60)
    print()

    # Transport flags overview
    print(f"Transport message flags: {unresolved} unresolved / {total} total "
          f"({resolution_rate:.0f}% resolved)")
    print()

    # By agent
    by_agent = transport_by_agent(conn)
    if by_agent:
        print("By originating agent:")
        for agent, count in by_agent:
            bar = "█" * min(count // 2, 30)
            print(f"  {agent:<30} {count:>4}  {bar}")
        print()

    # By session directory
    by_session = transport_by_session_dir(conn, limit=10)
    if by_session:
        print("By transport session (top 10):")
        for session, count in by_session:
            print(f"  {session:<40} {count:>4}")
        print()

    # Lab-notebook flags
    total_sessions, flagged_count, flagged_sessions = notebook_flag_summary()
    print(f"Lab-notebook session flags: {flagged_count}/{total_sessions} "
          f"sessions flagged uncertainty")
    if flagged_sessions:
        print("Sessions with most flags:")
        for session_num, count in flagged_sessions[:10]:
            bar = "█" * min(count, 20)
            print(f"  Session {session_num:<4} {count:>3} flags  {bar}")
    print()

    # Staleness
    stale = stale_flags(conn, days=3)
    if stale:
        print(f"Stale flags (>3 days old, showing up to 20):")
        for source, text, created in stale:
            short_text = (text[:70] + "...") if len(text) > 70 else text
            print(f"  [{created[:10]}] {source}: {short_text}")
    else:
        print("No flags older than 3 days.")
    print()

    print("=" * 60)


def print_summary(conn):
    """One-line summary suitable for /hunt or /cycle."""
    unresolved, resolved = transport_flags(conn)
    total_sessions, flagged_count, _ = notebook_flag_summary()
    print(f"Epistemic debt: {unresolved} transport flags unresolved, "
          f"{flagged_count}/{total_sessions} notebook sessions flagged")


def print_by_source(conn):
    """Flag counts by source file."""
    rows = transport_by_source(conn, limit=30)
    print(f"{'Source':<50} {'Flags':>5}")
    print("-" * 56)
    for source, count in rows:
        print(f"{source:<50} {count:>5}")


def print_by_session(conn):
    """Flag counts by transport session directory."""
    rows = transport_by_session_dir(conn, limit=30)
    if not rows:
        print("No session attribution available (flags lack transport_messages join).")
        return
    print(f"{'Session':<45} {'Flags':>5}")
    print("-" * 51)
    for session, count in rows:
        print(f"{session:<45} {count:>5}")


def main():
    parser = argparse.ArgumentParser(description="Epistemic debt dashboard")
    parser.add_argument("--summary", action="store_true",
                        help="One-line summary for /hunt or /cycle")
    parser.add_argument("--by-source", action="store_true",
                        help="Transport flags grouped by source file")
    parser.add_argument("--by-session", action="store_true",
                        help="Transport flags grouped by session directory")
    parser.add_argument("--stale", type=int, metavar="DAYS",
                        help="Show flags older than N days")
    args = parser.parse_args()

    conn = get_connection()

    if args.summary:
        print_summary(conn)
    elif args.by_source:
        print_by_source(conn)
    elif args.by_session:
        print_by_session(conn)
    elif args.stale is not None:
        rows = stale_flags(conn, days=args.stale)
        if rows:
            for source, text, created in rows:
                short = (text[:80] + "...") if len(text) > 80 else text
                print(f"[{created[:10]}] {source}: {short}")
        else:
            print(f"No unresolved flags older than {args.stale} days.")
    else:
        print_dashboard(conn, args)

    conn.close()


if __name__ == "__main__":
    main()

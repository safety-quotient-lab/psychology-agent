#!/usr/bin/env python3
"""Agent communication asymmetry — detect conversation imbalances across the mesh.

Reports which agent dominates communication, whether uncertainty (SETL) differs
by direction, and whether some agent pairs have gone quiet.

Usage:
  python scripts/agent_communication.py              # full report
  python scripts/agent_communication.py --summary    # one-line summary for /hunt
  python scripts/agent_communication.py --pairs      # per-pair breakdown
"""

import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"


def get_connection():
    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found. Run bootstrap_state_db.py first.",
              file=sys.stderr)
        sys.exit(1)
    return sqlite3.connect(str(DB_PATH))


def agent_volumes(conn):
    """Message count and mean SETL per agent (as sender)."""
    cursor = conn.execute("""
        SELECT from_agent,
               COUNT(*) as sent,
               ROUND(AVG(setl), 4) as mean_setl,
               ROUND(MAX(setl), 4) as max_setl
        FROM transport_messages
        GROUP BY from_agent
        ORDER BY sent DESC
    """)
    return cursor.fetchall()


def pair_breakdown(conn):
    """Per-pair message counts and mean SETL."""
    cursor = conn.execute("""
        SELECT from_agent, to_agent,
               COUNT(*) as messages,
               ROUND(AVG(setl), 4) as mean_setl,
               MIN(timestamp) as first_message,
               MAX(timestamp) as last_message
        FROM transport_messages
        GROUP BY from_agent, to_agent
        ORDER BY messages DESC
    """)
    return cursor.fetchall()


def quiet_pairs(conn, days_threshold=14):
    """Agent pairs whose last message exceeds the staleness threshold."""
    cursor = conn.execute("""
        SELECT from_agent, to_agent,
               MAX(timestamp) as last_message,
               ROUND(julianday('now') - julianday(MAX(timestamp)), 1) as days_silent,
               COUNT(*) as total_messages
        FROM transport_messages
        GROUP BY from_agent, to_agent
        HAVING days_silent > ?
        ORDER BY days_silent DESC
    """, (days_threshold,))
    return cursor.fetchall()


def direction_asymmetry(conn):
    """Detect asymmetric communication — one direction dominates."""
    cursor = conn.execute("""
        SELECT
            CASE WHEN from_agent < to_agent
                 THEN from_agent ELSE to_agent END as agent_a,
            CASE WHEN from_agent < to_agent
                 THEN to_agent ELSE from_agent END as agent_b,
            SUM(CASE WHEN from_agent < to_agent THEN 1 ELSE 0 END) as a_to_b,
            SUM(CASE WHEN from_agent >= to_agent THEN 1 ELSE 0 END) as b_to_a,
            COUNT(*) as total
        FROM transport_messages
        GROUP BY agent_a, agent_b
        HAVING total > 1
        ORDER BY total DESC
    """)
    return cursor.fetchall()


def total_messages(conn):
    cursor = conn.execute("SELECT COUNT(*) FROM transport_messages")
    return cursor.fetchone()[0]


def format_summary(conn):
    total = total_messages(conn)
    volumes = agent_volumes(conn)
    if not volumes:
        return f"Agent communication: {total} messages, no agent data"

    top_sender = volumes[0]
    top_pct = round(100 * top_sender[1] / total, 1) if total else 0
    quiet = quiet_pairs(conn)
    quiet_note = f", {len(quiet)} quiet pairs (>14d)" if quiet else ""

    return (f"Agent communication: {total} messages, "
            f"{top_sender[0]} dominates ({top_sender[1]}/{total}, {top_pct}%), "
            f"mean SETL {top_sender[2]}{quiet_note}")


def format_full(conn):
    lines = []
    total = total_messages(conn)
    lines.append(f"Agent Communication Asymmetry Report")
    lines.append(f"{'=' * 45}")
    lines.append(f"Total messages: {total}\n")

    # Per-agent volumes
    lines.append("Agent Volumes (as sender):")
    lines.append(f"  {'Agent':<25} {'Sent':>5} {'%':>6} {'Mean SETL':>10} {'Max SETL':>10}")
    lines.append(f"  {'-'*25} {'-'*5} {'-'*6} {'-'*10} {'-'*10}")
    for agent, sent, mean_setl, max_setl in agent_volumes(conn):
        pct = round(100 * sent / total, 1) if total else 0
        lines.append(f"  {agent:<25} {sent:>5} {pct:>5.1f}% {mean_setl or 0:>10.4f} {max_setl or 0:>10.4f}")

    # Direction asymmetry
    lines.append(f"\nDirection Asymmetry:")
    lines.append(f"  {'Agent A':<20} {'Agent B':<20} {'A→B':>5} {'B→A':>5} {'Ratio':>7}")
    lines.append(f"  {'-'*20} {'-'*20} {'-'*5} {'-'*5} {'-'*7}")
    for agent_a, agent_b, a_to_b, b_to_a, total_pair in direction_asymmetry(conn):
        ratio = round(a_to_b / b_to_a, 2) if b_to_a else "∞"
        lines.append(f"  {agent_a:<20} {agent_b:<20} {a_to_b:>5} {b_to_a:>5} {ratio!s:>7}")

    # Quiet pairs
    quiet = quiet_pairs(conn)
    if quiet:
        lines.append(f"\nQuiet Pairs (>14 days silent):")
        lines.append(f"  {'From':<20} {'To':<20} {'Days':>6} {'Last Message':<20}")
        lines.append(f"  {'-'*20} {'-'*20} {'-'*6} {'-'*20}")
        for from_a, to_a, last_msg, days, count in quiet:
            lines.append(f"  {from_a:<20} {to_a:<20} {days:>6.1f} {last_msg[:19]:<20}")
    else:
        lines.append(f"\nNo quiet pairs (all pairs active within 14 days).")

    return "\n".join(lines)


def format_pairs(conn):
    lines = []
    lines.append(f"Per-Pair Breakdown:")
    lines.append(f"  {'From':<20} {'To':<20} {'Msgs':>5} {'SETL':>7} {'First':<12} {'Last':<12}")
    lines.append(f"  {'-'*20} {'-'*20} {'-'*5} {'-'*7} {'-'*12} {'-'*12}")
    for from_a, to_a, msgs, mean_setl, first, last in pair_breakdown(conn):
        lines.append(
            f"  {from_a:<20} {to_a:<20} {msgs:>5} "
            f"{mean_setl or 0:>7.4f} {first[:10]:<12} {last[:10]:<12}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Agent communication asymmetry")
    parser.add_argument("--summary", action="store_true",
                        help="One-line summary")
    parser.add_argument("--pairs", action="store_true",
                        help="Per-pair breakdown")
    args = parser.parse_args()

    conn = get_connection()

    if args.summary:
        print(format_summary(conn))
    elif args.pairs:
        print(format_pairs(conn))
    else:
        print(format_full(conn))

    conn.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
cross-agent-rpg.py — Cross-agent retrospective pattern generator.

Extends /retrospect to scan peer agent transport for mesh-level patterns
that individual agents cannot detect from their own perspective.

Patterns detected:
1. Systematic under-reporting: do all agents under-report the same category?
2. Response latency distribution: which sessions stall? which flow?
3. Claim confidence clustering: do agents converge on similar confidence levels?
4. Epistemic flag distribution: which domains accumulate the most uncertainty?
5. Message type imbalance: too many ACKs, too few substantive exchanges?

Usage:
    python3 scripts/cross-agent-rpg.py                # full scan
    python3 scripts/cross-agent-rpg.py --summary      # one-line per pattern
"""

import os
import sqlite3
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def scan_message_type_balance(conn: sqlite3.Connection) -> dict:
    """Check whether message types distribute healthily across the mesh."""
    rows = conn.execute("""
        SELECT message_type, COUNT(*) as cnt
        FROM transport_messages
        WHERE message_type IS NOT NULL
        GROUP BY message_type
        ORDER BY cnt DESC
    """).fetchall()

    total = sum(r["cnt"] for r in rows)
    distribution = {r["message_type"]: r["cnt"] for r in rows}
    ack_ratio = distribution.get("ack", 0) / total if total else 0

    finding = None
    if ack_ratio > 0.5:
        finding = f"ACK-heavy mesh ({ack_ratio:.0%} ACKs) — substantive exchanges may lack depth"
    elif ack_ratio < 0.1 and total > 50:
        finding = f"Low ACK rate ({ack_ratio:.0%}) — messages may go unacknowledged"

    return {
        "pattern": "message-type-balance",
        "distribution": distribution,
        "total": total,
        "ack_ratio": ack_ratio,
        "finding": finding,
    }


def scan_response_latency(conn: sqlite3.Connection) -> dict:
    """Check for stalled sessions (long gaps between exchanges)."""
    rows = conn.execute("""
        SELECT session_name,
               MIN(timestamp) as first_msg,
               MAX(timestamp) as last_msg,
               COUNT(*) as msg_count,
               COUNT(DISTINCT from_agent) as agent_count
        FROM transport_messages
        WHERE session_name NOT IN ('local-coordination')
        GROUP BY session_name
        HAVING msg_count >= 2
        ORDER BY last_msg DESC
    """).fetchall()

    stalled = []
    active = []
    for r in rows:
        try:
            last = datetime.fromisoformat(r["last_msg"].replace("Z", "+00:00"))
            age_days = (datetime.now(last.tzinfo) - last).days if last.tzinfo else 0
        except (ValueError, TypeError):
            age_days = 999

        session_info = {
            "session": r["session_name"],
            "messages": r["msg_count"],
            "agents": r["agent_count"],
            "age_days": age_days,
        }

        if age_days > 7 and r["msg_count"] < 5:
            stalled.append(session_info)
        else:
            active.append(session_info)

    return {
        "pattern": "response-latency",
        "active_sessions": len(active),
        "stalled_sessions": len(stalled),
        "stalled": stalled[:5],
        "finding": f"{len(stalled)} stalled sessions (>7 days, <5 messages)" if stalled else None,
    }


def scan_agent_participation(conn: sqlite3.Connection) -> dict:
    """Check for participation imbalances across agents."""
    rows = conn.execute("""
        SELECT from_agent, COUNT(*) as cnt,
               COUNT(DISTINCT session_name) as sessions
        FROM transport_messages
        GROUP BY from_agent
        ORDER BY cnt DESC
    """).fetchall()

    agents = {r["from_agent"]: {"messages": r["cnt"], "sessions": r["sessions"]} for r in rows}
    total = sum(a["messages"] for a in agents.values())

    # Check for dominant agent
    if agents:
        top_agent = max(agents.items(), key=lambda x: x[1]["messages"])
        dominance = top_agent[1]["messages"] / total if total else 0
        finding = None
        if dominance > 0.6:
            finding = f"{top_agent[0]} dominates mesh ({dominance:.0%} of messages) — other agents may under-participate"
    else:
        finding = None

    return {
        "pattern": "agent-participation",
        "agents": agents,
        "total": total,
        "finding": finding,
    }


def scan_claim_confidence(conn: sqlite3.Connection) -> dict:
    """Check claim confidence distribution for clustering."""
    rows = conn.execute("""
        SELECT confidence, COUNT(*) as cnt
        FROM claims
        WHERE confidence IS NOT NULL
        GROUP BY ROUND(confidence, 1)
        ORDER BY confidence
    """).fetchall()

    if not rows:
        return {"pattern": "claim-confidence", "finding": None, "data": []}

    bands = {"high (>=0.9)": 0, "medium (0.7-0.9)": 0, "low (<0.7)": 0}
    total = 0
    for r in rows:
        total += r["cnt"]
        if r["confidence"] >= 0.9:
            bands["high (>=0.9)"] += r["cnt"]
        elif r["confidence"] >= 0.7:
            bands["medium (0.7-0.9)"] += r["cnt"]
        else:
            bands["low (<0.7)"] += r["cnt"]

    high_ratio = bands["high (>=0.9)"] / total if total else 0
    finding = None
    if high_ratio > 0.7:
        finding = f"Confidence clustering at high end ({high_ratio:.0%} >= 0.9) — may indicate overconfidence or calibration gap"
    elif high_ratio < 0.2:
        finding = f"Low confidence prevalence ({high_ratio:.0%} >= 0.9) — may indicate under-confidence"

    return {
        "pattern": "claim-confidence",
        "bands": bands,
        "total": total,
        "finding": finding,
    }


def scan_epistemic_flag_domains(conn: sqlite3.Connection) -> dict:
    """Check which domains accumulate the most epistemic flags."""
    rows = conn.execute("""
        SELECT uf.facet_value as domain, COUNT(*) as cnt
        FROM universal_facets uf
        WHERE uf.entity_type = 'epistemic_flags'
          AND uf.facet_type = 'psh'
        GROUP BY uf.facet_value
        ORDER BY cnt DESC
        LIMIT 10
    """).fetchall()

    domains = {r["domain"]: r["cnt"] for r in rows}
    finding = None
    if domains:
        top = list(domains.items())[0]
        if top[1] > 100:
            finding = f"'{top[0]}' carries {top[1]} epistemic flags — highest uncertainty concentration"

    return {
        "pattern": "epistemic-flag-domains",
        "domains": domains,
        "finding": finding,
    }


def main():
    conn = get_conn()
    summary_only = "--summary" in sys.argv

    scans = [
        scan_message_type_balance(conn),
        scan_response_latency(conn),
        scan_agent_participation(conn),
        scan_claim_confidence(conn),
        scan_epistemic_flag_domains(conn),
    ]

    if summary_only:
        print("Cross-Agent RPG — Pattern Summary")
        for s in scans:
            finding = s.get("finding") or "No anomaly detected"
            print(f"  [{s['pattern']}] {finding}")
        return

    print("Cross-Agent Retrospective Pattern Generator")
    print("=" * 60)

    for s in scans:
        print(f"\n## {s['pattern']}")
        finding = s.get("finding")
        if finding:
            print(f"  ⚑ FINDING: {finding}")
        else:
            print("  ✓ No anomaly detected")

        # Print detail
        for k, v in s.items():
            if k in ("pattern", "finding"):
                continue
            if isinstance(v, dict):
                for sk, sv in v.items():
                    print(f"    {sk}: {sv}")
            elif isinstance(v, list) and v:
                for item in v[:5]:
                    if isinstance(item, dict):
                        print(f"    {item}")
                    else:
                        print(f"    {item}")
            else:
                print(f"    {k}: {v}")

    conn.close()


if __name__ == "__main__":
    main()

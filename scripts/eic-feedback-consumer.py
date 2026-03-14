#!/usr/bin/env python3
"""
eic-feedback-consumer.py — Closes the EIC disclosure → trigger adjustment loop.

Reads agent_disclosures from state.local.db and adjusts trigger sensitivity
in trigger_state (state.db) based on disclosed uncertainties and limitations.

The Equal Information Channel (Wilson, 1975; docs/equal-information-channel-spec.md)
provides a governance-cost-free pathway for self-reporting. This script converts
those disclosures into actionable trigger adjustments — completing the feedback
loop that makes disclosures *useful*, not just recorded.

Mechanism: when an agent discloses uncertainty about a domain, triggers that
operate in that domain receive a relevance_score boost (more likely to fire
their ADVISORY checks). When an agent discloses a blind-spot, the relevant
trigger's decay_rate slows (the trigger stays sensitive longer).

Usage:
    python3 scripts/eic-feedback-consumer.py                # apply adjustments
    python3 scripts/eic-feedback-consumer.py --dry-run      # preview without writing
    python3 scripts/eic-feedback-consumer.py --summary       # show current disclosure→trigger map
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
LOCAL_DB_PATH = PROJECT_ROOT / "state.local.db"

# Domain → trigger mapping: which triggers should respond to disclosures in each domain
DOMAIN_TRIGGER_MAP = {
    "psychometrics": ["T15", "T3"],      # PSQ output checks, recommendation discipline
    "governance": ["T3", "T14", "T17"],   # recommendation, structural checkpoint, conflict
    "methodology": ["T3", "T2"],          # recommendation, before-response evidence checks
    "cogarch": ["T11", "T3", "T17"],      # architecture audit, recommendation, conflict
    "transport": ["T16", "T5"],           # external action, phase boundary
    "philosophy": ["T2", "T3"],           # before-response, recommendation
    "operations": ["T16", "T5"],          # external action, phase boundary
    "content": ["T4", "T13"],             # before writing, external content
    "evaluation": ["T3", "T6"],           # recommendation, pushback
}

# Category → adjustment type
CATEGORY_ADJUSTMENTS = {
    "uncertainty": {"relevance_boost": 0.2, "decay_slowdown": 0.0},
    "limitation": {"relevance_boost": 0.15, "decay_slowdown": 0.1},
    "blind-spot": {"relevance_boost": 0.3, "decay_slowdown": 0.2},
    "dissent": {"relevance_boost": 0.1, "decay_slowdown": 0.0},
    "observation": {"relevance_boost": 0.0, "decay_slowdown": 0.0},
    "correction": {"relevance_boost": 0.1, "decay_slowdown": 0.05},
}


def get_recent_disclosures(local_conn: sqlite3.Connection, days: int = 7) -> list[dict]:
    """Fetch disclosures from the last N days."""
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    rows = local_conn.execute(
        "SELECT category, content, created_at FROM agent_disclosures "
        "WHERE created_at > ? ORDER BY created_at DESC",
        (cutoff,),
    ).fetchall()
    return [{"category": r[0], "content": r[1], "created_at": r[2]} for r in rows]


def classify_domain(content: str) -> str:
    """Classify disclosure content into a domain using keyword matching."""
    content_lower = content.lower() if content else ""
    domain_keywords = {
        "psychometrics": ["psq", "scoring", "calibration", "dimension", "bifactor", "model"],
        "governance": ["invariant", "trust budget", "governance", "ef-1", "amendment"],
        "methodology": ["methodology", "measurement", "validity", "reliability", "study"],
        "cogarch": ["trigger", "hook", "cogarch", "cognitive architecture", "skill"],
        "transport": ["transport", "message", "session", "manifest", "sync"],
        "philosophy": ["monism", "process", "ontolog", "e-prime", "invariant"],
        "operations": ["deploy", "infrastructure", "meshd", "cron", "autonomous"],
        "content": ["blog", "publication", "content", "writing", "editorial"],
        "evaluation": ["evaluat", "audit", "review", "assess", "check"],
    }
    for domain, keywords in domain_keywords.items():
        if any(kw in content_lower for kw in keywords):
            return domain
    return "operations"  # default


def compute_adjustments(disclosures: list[dict]) -> dict:
    """Compute trigger adjustments from disclosures."""
    adjustments = {}  # trigger_id → {relevance_boost, decay_slowdown, sources}

    for d in disclosures:
        category = d["category"]
        domain = classify_domain(d["content"])
        adj = CATEGORY_ADJUSTMENTS.get(category, {"relevance_boost": 0.0, "decay_slowdown": 0.0})

        triggers = DOMAIN_TRIGGER_MAP.get(domain, ["T3"])
        for tid in triggers:
            if tid not in adjustments:
                adjustments[tid] = {
                    "relevance_boost": 0.0,
                    "decay_slowdown": 0.0,
                    "sources": [],
                }
            adjustments[tid]["relevance_boost"] += adj["relevance_boost"]
            adjustments[tid]["decay_slowdown"] += adj["decay_slowdown"]
            adjustments[tid]["sources"].append(
                f"{category}:{domain} ({d['created_at'][:10]})"
            )

    # Cap adjustments
    for tid in adjustments:
        adjustments[tid]["relevance_boost"] = min(adjustments[tid]["relevance_boost"], 1.0)
        adjustments[tid]["decay_slowdown"] = min(adjustments[tid]["decay_slowdown"], 0.5)

    return adjustments


def apply_adjustments(conn: sqlite3.Connection, adjustments: dict, dry_run: bool = False) -> None:
    """Apply trigger adjustments to trigger_state."""
    for tid, adj in adjustments.items():
        if adj["relevance_boost"] == 0.0 and adj["decay_slowdown"] == 0.0:
            continue

        current = conn.execute(
            "SELECT relevance_score, decay_rate FROM trigger_state WHERE trigger_id = ?",
            (tid,),
        ).fetchone()

        if not current:
            print(f"  SKIP {tid}: not in trigger_state")
            continue

        new_relevance = min(current[0] + adj["relevance_boost"], 2.0)
        new_decay = max(current[1] - adj["decay_slowdown"], 0.0)

        sources_str = "; ".join(adj["sources"][:3])
        if len(adj["sources"]) > 3:
            sources_str += f" (+{len(adj['sources']) - 3} more)"

        if dry_run:
            print(f"  {tid}: relevance {current[0]:.2f}→{new_relevance:.2f}, "
                  f"decay {current[1]:.2f}→{new_decay:.2f} "
                  f"[{sources_str}]")
        else:
            conn.execute(
                "UPDATE trigger_state SET relevance_score = ?, decay_rate = ?, "
                "updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') "
                "WHERE trigger_id = ?",
                (new_relevance, new_decay, tid),
            )
            print(f"  {tid}: relevance→{new_relevance:.2f}, decay→{new_decay:.2f} [{sources_str}]")

    if not dry_run:
        conn.commit()


def main():
    dry_run = "--dry-run" in sys.argv
    summary_only = "--summary" in sys.argv

    if not LOCAL_DB_PATH.exists():
        print("No state.local.db — no disclosures to process")
        return

    local_conn = sqlite3.connect(str(LOCAL_DB_PATH))
    disclosures = get_recent_disclosures(local_conn, days=7)
    local_conn.close()

    if not disclosures:
        print("No disclosures in the last 7 days — no adjustments needed")
        return

    print(f"EIC Feedback Consumer — {len(disclosures)} disclosures (last 7 days)")

    adjustments = compute_adjustments(disclosures)

    if summary_only:
        print(f"\nDomain classification:")
        domains = {}
        for d in disclosures:
            dom = classify_domain(d["content"])
            domains[dom] = domains.get(dom, 0) + 1
        for dom, count in sorted(domains.items(), key=lambda x: -x[1]):
            print(f"  {dom}: {count}")
        print(f"\nTrigger adjustments (preview):")
        for tid, adj in sorted(adjustments.items()):
            if adj["relevance_boost"] > 0 or adj["decay_slowdown"] > 0:
                print(f"  {tid}: +{adj['relevance_boost']:.2f} relevance, "
                      f"-{adj['decay_slowdown']:.2f} decay "
                      f"({len(adj['sources'])} sources)")
        return

    conn = sqlite3.connect(str(DB_PATH))
    print(f"Applying adjustments ({'DRY RUN' if dry_run else 'LIVE'}):")
    apply_adjustments(conn, adjustments, dry_run)
    conn.close()


if __name__ == "__main__":
    main()

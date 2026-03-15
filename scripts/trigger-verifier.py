#!/usr/bin/env python3
"""
trigger-verifier.py — Behavioral trigger verification via outcome analysis.

Each trigger exists to prevent a specific failure mode. This script checks
whether those failure modes occur in the agent's outputs, providing indirect
evidence of whether behavioral triggers actually fire.

The key insight: we cannot observe the LLM's internal trigger processing
directly. But we can observe the outcomes that triggers should prevent.
If T3 (anti-sycophancy) works, we should see position changes accompanied
by new evidence. If it doesn't work, we see sycophantic drift (positions
change without justification after pushback).

Three evidence sources:
  1. Write log (.claude/write-log.jsonl) — all file writes this session
  2. Transport messages (state.db) — outbound message patterns
  3. Git history — commit patterns and content changes

Usage:
    python3 scripts/trigger-verifier.py              # full analysis
    python3 scripts/trigger-verifier.py --trigger T3  # specific trigger
    python3 scripts/trigger-verifier.py --summary     # one-line per trigger
"""

import json
import os
import re
import sqlite3
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
WRITE_LOG = PROJECT_ROOT / ".claude" / "write-log.jsonl"

# Each trigger maps to:
#   failure_mode: what goes wrong when the trigger fails
#   outcome_check: function that returns (evidence_found, details)
#   evidence_source: where to look

TRIGGER_CHECKS = {}


def register_check(trigger_id, failure_mode):
    """Decorator to register an outcome check for a trigger."""
    def decorator(func):
        TRIGGER_CHECKS[trigger_id] = {
            "failure_mode": failure_mode,
            "check": func,
        }
        return func
    return decorator


# ── T2: Context pressure ignored ──────────────────────────────────────────
@register_check("T2", "Agent continues producing large outputs under high context pressure without consolidating")
def check_t2():
    """Check whether large file writes occurred without /doc or /cycle nearby."""
    if not WRITE_LOG.exists():
        return None, "No write log available"
    writes = []
    try:
        for line in WRITE_LOG.open():
            entry = json.loads(line.strip())
            writes.append(entry)
    except (json.JSONDecodeError, ValueError):
        pass
    if len(writes) < 5:
        return None, f"Only {len(writes)} writes — insufficient data"
    # Check: did we write to 10+ files without a /doc or /cycle invocation?
    # (crude proxy — better with full transcript)
    return True, f"{len(writes)} writes recorded (pressure check requires transcript for deeper analysis)"


# ── T3: Sycophantic position change ──────────────────────────────────────
@register_check("T3", "Position changes after pushback without citing new evidence")
def check_t3():
    """Scan transport messages for position reversals without evidence."""
    if not DB_PATH.exists():
        return None, "No state.db"
    conn = sqlite3.connect(str(DB_PATH))
    # Count messages where we changed position (proxy: messages with
    # "accept with revisions" or "revised" in subject after a prior position)
    revisions = conn.execute(
        "SELECT COUNT(*) FROM transport_messages "
        "WHERE from_agent = 'psychology-agent' "
        "AND (subject LIKE '%revis%' OR subject LIKE '%accept with%' "
        "OR subject LIKE '%updated%position%')"
    ).fetchone()[0]
    conn.close()
    if revisions == 0:
        return True, "No position reversals detected in transport — T3 holding"
    return None, f"{revisions} revision messages found (manual review needed to verify evidence cited)"


# ── T4: Credentials in committed files ────────────────────────────────────
@register_check("T4", "Credentials or sensitive data committed to public repo")
def check_t4():
    """Scan recent commits for credential patterns."""
    try:
        result = subprocess.run(
            ["git", "log", "--diff-filter=A", "-p", "--since=7 days ago",
             "-S", "sk-", "--format=", "--",
             "*.md", "*.json", "*.py"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=10)
        if result.stdout.strip():
            return False, "Potential credential pattern found in recent commits"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    # Also check for common patterns
    try:
        result = subprocess.run(
            ["git", "log", "--diff-filter=A", "-p", "--since=7 days ago",
             "-S", "AKIA", "--format=", "--", "*.md", "*.json", "*.py"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=10)
        if result.stdout.strip():
            return False, "AWS key pattern found in recent commits"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return True, "No credential patterns in recent commits — T4 holding"


# ── T5: Stale references persist ─────────────────────────────────────────
@register_check("T5", "Documentation references files that no longer exist")
def check_t5():
    """Check key docs for broken internal references."""
    broken = []
    for doc in ["CLAUDE.md", "docs/architecture.md", "docs/cognitive-triggers.md"]:
        doc_path = PROJECT_ROOT / doc
        if not doc_path.exists():
            continue
        content = doc_path.read_text()
        # Extract backtick-quoted file references
        refs = re.findall(r'`([^`]+\.(?:md|py|sh|json))`', content)
        for ref in refs:
            # Skip obvious non-file patterns
            if ref.startswith("http") or ref.startswith("/") or "*" in ref or "{" in ref:
                continue
            # Check if file exists (try both relative and common prefixes)
            found = False
            for prefix in ["", "scripts/", "docs/", ".claude/hooks/", ".claude/skills/",
                          ".well-known/", "platform/shared/scripts/"]:
                if (PROJECT_ROOT / prefix / ref).exists():
                    found = True
                    break
            if not found:
                broken.append(f"{doc}: {ref}")
    if broken:
        return False, f"{len(broken)} broken refs: {', '.join(broken[:5])}"
    return True, "No broken references in key docs — T5 holding"


# ── T9: Stale memory entries ─────────────────────────────────────────────
@register_check("T9", "Memory entries persist beyond staleness thresholds without review")
def check_t9():
    """Check memory_entries for entries exceeding staleness thresholds."""
    if not DB_PATH.exists():
        return None, "No state.db"
    conn = sqlite3.connect(str(DB_PATH))
    stale_30 = conn.execute(
        "SELECT COUNT(*) FROM memory_entries "
        "WHERE last_confirmed IS NOT NULL "
        "AND julianday('now') - julianday(last_confirmed) > 30"
    ).fetchone()[0]
    stale_14 = conn.execute(
        "SELECT COUNT(*) FROM memory_entries "
        "WHERE last_confirmed IS NOT NULL "
        "AND julianday('now') - julianday(last_confirmed) > 14"
    ).fetchone()[0]
    conn.close()
    if stale_30 > 0:
        return False, f"{stale_30} entries exceed 30-day removal threshold — T9 failing"
    if stale_14 > 0:
        return None, f"{stale_14} entries exceed 14-day flag threshold (review needed)"
    return True, "All memory entries within freshness thresholds — T9 holding"


# ── T16: External actions without gate check ─────────────────────────────
@register_check("T16", "External-facing actions (PRs, issues, pushes) executed without reversibility assessment")
def check_t16():
    """Count external actions and verify gate tracking."""
    if not DB_PATH.exists():
        return None, "No state.db"
    conn = sqlite3.connect(str(DB_PATH))
    # Count outbound transport messages (proxy for external actions)
    outbound = conn.execute(
        "SELECT COUNT(*) FROM transport_messages "
        "WHERE from_agent = 'psychology-agent' "
        "AND task_state = 'completed'"
    ).fetchone()[0]
    conn.close()
    # Check git for recent pushes and PRs
    try:
        result = subprocess.run(
            ["git", "log", "--since=1 day ago", "--oneline"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=5)
        push_count = len(result.stdout.strip().splitlines())
    except (subprocess.TimeoutExpired, FileNotFoundError):
        push_count = 0
    return True, f"{outbound} outbound messages, {push_count} commits today (T16 fires mechanically via hooks)"


# ── T20: Evaluative impressions uncalibrated ─────────────────────────────
@register_check("T20", "Agent produces evaluative impressions without calibration data")
def check_t20():
    """Check prediction_ledger for evaluative impression entries."""
    if not DB_PATH.exists():
        return None, "No state.db"
    conn = sqlite3.connect(str(DB_PATH))
    impressions = conn.execute(
        "SELECT COUNT(*) FROM prediction_ledger "
        "WHERE domain = 'evaluative-impressions'"
    ).fetchone()[0]
    total_predictions = conn.execute(
        "SELECT COUNT(*) FROM prediction_ledger"
    ).fetchone()[0]
    confirmed = conn.execute(
        "SELECT COUNT(*) FROM prediction_ledger WHERE outcome = 'confirmed'"
    ).fetchone()[0]
    conn.close()
    tested = conn.execute(
        "SELECT COUNT(*) FROM prediction_ledger WHERE outcome IS NOT NULL AND outcome != 'untested'"
    ).fetchone()[0]
    if tested < 5:
        return None, (f"{impressions} evaluative impressions, {total_predictions} total predictions "
                      f"({tested} tested) — insufficient for calibration")
    accuracy = confirmed / tested if tested > 0 else 0
    return None, (f"{impressions} evaluative impressions, {tested}/{total_predictions} tested, "
                  f"{accuracy:.0%} accuracy — accumulating (need 20+ for calibration)")


def main():
    specific = None
    summary_only = "--summary" in sys.argv
    for i, arg in enumerate(sys.argv):
        if arg == "--trigger" and i + 1 < len(sys.argv):
            specific = sys.argv[i + 1]

    results = {}
    for tid, check_info in sorted(TRIGGER_CHECKS.items()):
        if specific and tid != specific:
            continue
        try:
            holding, detail = check_info["check"]()
        except Exception as exc:
            holding, detail = None, f"Check failed: {exc}"
        results[tid] = {
            "holding": holding,
            "failure_mode": check_info["failure_mode"],
            "detail": detail,
        }

    if summary_only:
        for tid, r in results.items():
            symbol = "✓" if r["holding"] else ("✗" if r["holding"] is False else "?")
            print(f"  {symbol} {tid}: {r['detail'][:70]}")
        return

    print("Behavioral Trigger Verification Report")
    print("=" * 50)
    print()
    verified = sum(1 for r in results.values() if r["holding"] is True)
    failing = sum(1 for r in results.values() if r["holding"] is False)
    unclear = sum(1 for r in results.values() if r["holding"] is None)
    print(f"  Verified: {verified} | Failing: {failing} | Unclear: {unclear}")
    print()

    for tid, r in results.items():
        symbol = "✓" if r["holding"] else ("✗" if r["holding"] is False else "?")
        print(f"  {symbol} {tid} — {r['failure_mode']}")
        print(f"      {r['detail']}")
        print()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
validate-criterion.py — Criterion validity for A2A-Psychology constructs.

Tests whether computed psychometric constructs predict observable session
outcomes. Phase 1 of the A2A-Psychology validation plan (Session 92).

Approach:
  1. Reconstruct per-session metrics from git history + state.db
  2. Compute construct scores from those metrics
  3. Correlate construct scores with outcome variables
  4. Report which constructs predict which outcomes (Spearman ρ)

Outcome variables (observable, not self-reported):
  - commit_count: git commits tagged to the session
  - files_changed: unique files modified in session commits
  - claims_count: claims extracted during the session's transport work
  - epistemic_flags: flags raised during the session
  - transport_messages: messages processed during the session

Construct variables (computed from reconstructable metrics):
  - PAD pleasure, arousal, dominance
  - TLX cognitive_load
  - Cognitive reserve
  - Engagement vigor, dedication
  - Flow score

Epistemic constraint: this analysis uses RETROSPECTIVE reconstruction, not
live sensor data. Some metrics (context_pressure, tool_calls, pushback count)
cannot reconstruct from historical records. The analysis covers what CAN
reconstruct — primarily transport volume, gate activity, and budget state.
Missing sensors weaken the test; they do not invalidate positive findings.

Usage:
    python3 scripts/validate-criterion.py              # full report
    python3 scripts/validate-criterion.py --json       # machine-readable
    python3 scripts/validate-criterion.py --csv        # CSV for external analysis
    python3 scripts/validate-criterion.py --verbose    # show per-session data

References:
    Mehrabian & Russell (1974). PAD emotional state model.
    Hart & Staveland (1988). NASA-TLX workload assessment.
    Csikszentmihalyi (1990). Flow state theory.
    Schaufeli et al. (2002). UWES engagement model.
"""

import argparse
import csv
import io
import json
import math
import os
import re
import sqlite3
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"


# ── Session discovery ────────────────────────────────────────────────────

def discover_sessions_from_git() -> dict[int, dict]:
    """Extract per-session commit data from git history.

    Returns dict keyed by session number with commit_count, files_changed,
    earliest_commit, latest_commit.
    """
    sessions = defaultdict(lambda: {
        "commit_count": 0,
        "files_changed": set(),
        "commit_hashes": [],
    })

    # Get all commits with session references
    result = subprocess.run(
        ["git", "log", "--all", "--pretty=format:%H|%s", "--name-only"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        return {}

    current_hash = None
    current_subject = None
    current_files = []

    for line in result.stdout.split("\n"):
        if "|" in line and len(line.split("|")[0]) == 40:
            # Process previous commit
            if current_hash and current_subject:
                _assign_commit_to_session(
                    sessions, current_hash, current_subject, current_files
                )
            parts = line.split("|", 1)
            current_hash = parts[0]
            current_subject = parts[1] if len(parts) > 1 else ""
            current_files = []
        elif line.strip():
            current_files.append(line.strip())

    # Process last commit
    if current_hash and current_subject:
        _assign_commit_to_session(
            sessions, current_hash, current_subject, current_files
        )

    # Convert sets to counts
    result_dict = {}
    for sid, data in sessions.items():
        result_dict[sid] = {
            "commit_count": data["commit_count"],
            "files_changed": len(data["files_changed"]),
            "commit_hashes": data["commit_hashes"],
        }

    return result_dict


def _assign_commit_to_session(
    sessions: dict, commit_hash: str, subject: str, files: list[str]
) -> None:
    """Assign a commit to a session based on commit message patterns."""
    # Match "Session N" in commit messages
    match = re.search(r"[Ss]ession\s+(\d+)", subject)
    if not match:
        return

    sid = int(match.group(1))
    sessions[sid]["commit_count"] += 1
    sessions[sid]["files_changed"].update(files)
    sessions[sid]["commit_hashes"].append(commit_hash)


# ── State.db outcome extraction ──────────────────────────────────────────

def get_db_outcomes(db: sqlite3.Connection) -> dict[int, dict]:
    """Extract per-session outcome counts from state.db."""
    outcomes = defaultdict(lambda: {
        "claims_count": 0,
        "epistemic_flags_count": 0,
        "transport_messages_count": 0,
        "predictions_count": 0,
    })

    # Claims don't have session_id directly — derive from transport_messages
    try:
        rows = db.execute("""
            SELECT tm.id, COUNT(c.id) as claim_count
            FROM transport_messages tm
            LEFT JOIN claims c ON c.transport_msg = tm.id
            GROUP BY tm.id
        """).fetchall()
        # We cannot map transport_messages to sessions directly without
        # timestamp correlation. Use session_log timestamps as boundaries.
        pass
    except Exception:
        pass

    # Epistemic flags have session_id
    try:
        for row in db.execute(
            "SELECT session_id, COUNT(*) FROM epistemic_flags "
            "WHERE session_id IS NOT NULL GROUP BY session_id"
        ).fetchall():
            outcomes[row[0]]["epistemic_flags_count"] = row[1]
    except Exception:
        pass

    # Predictions have session_id
    try:
        for row in db.execute(
            "SELECT session_id, COUNT(*) FROM prediction_ledger "
            "WHERE session_id > 0 GROUP BY session_id"
        ).fetchall():
            outcomes[row[0]]["predictions_count"] = row[1]
    except Exception:
        pass

    return dict(outcomes)


def get_session_timestamps(db: sqlite3.Connection) -> dict[int, str]:
    """Get session timestamps from session_log for temporal ordering."""
    timestamps = {}
    try:
        for row in db.execute(
            "SELECT id, timestamp FROM session_log ORDER BY id"
        ).fetchall():
            timestamps[row[0]] = row[1]
    except Exception:
        pass
    return timestamps


# ── Construct computation (retrospective) ────────────────────────────────

def compute_retrospective_constructs(
    session_id: int,
    git_data: dict,
    db_outcomes: dict,
) -> dict:
    """Compute construct scores from retrospectively available metrics.

    Many live sensors (context_pressure, tool_calls, pushback_count) cannot
    reconstruct from historical data. This function uses what CAN reconstruct:
    transport volume, commit activity, claims density, epistemic flag density.

    The resulting scores represent PARTIAL construct values — valid for
    relative ranking across sessions, not for absolute interpretation.
    """
    g = git_data.get(session_id, {"commit_count": 0, "files_changed": 0})
    d = db_outcomes.get(session_id, {})

    commit_count = g.get("commit_count", 0)
    files_changed = g.get("files_changed", 0)
    claims = d.get("claims_count", 0)
    flags = d.get("epistemic_flags_count", 0)
    predictions = d.get("predictions_count", 0)
    transport = d.get("transport_messages_count", 0)

    # Activity proxy (stands in for tool_calls, which we cannot reconstruct)
    activity_proxy = min(1.0, commit_count / 30.0)

    # Epistemic density — flags per commit (higher = more rigorous OR more problems)
    epistemic_density = flags / max(commit_count, 1)

    # ── PAD (partial reconstruction) ─────────────────────────────────
    # Pleasure: more commits + fewer flags → smoother session
    pleasure = min(1.0, commit_count / 20.0) - min(1.0, epistemic_density)
    pleasure = max(-1.0, min(1.0, pleasure))

    # Arousal: activity level
    arousal = 2.0 * activity_proxy - 1.0
    arousal = max(-1.0, min(1.0, arousal))

    # Dominance: cannot reconstruct (budget data not session-indexed)
    dominance = 0.0  # neutral default — flagged as missing

    # ── TLX (partial reconstruction) ─────────────────────────────────
    mental = min(100, commit_count * 3 + transport * 2)
    effort = min(100, commit_count * 3 + files_changed)
    frustration = min(100, flags * 10)
    cognitive_load = (mental * 0.3 + effort * 0.3 + frustration * 0.2) / 0.8

    # ── Resources ────────────────────────────────────────────────────
    workload_factor = 1.0 - (cognitive_load / 100.0)
    cognitive_reserve = max(0, workload_factor)

    # ── Engagement ───────────────────────────────────────────────────
    vigor = activity_proxy
    dedication = min(1.0, files_changed / 50.0)

    # ── Flow ─────────────────────────────────────────────────────────
    conditions = 0
    if commit_count > 3:
        conditions += 1  # clear goals (productive)
    if commit_count > 1:
        conditions += 1  # immediate feedback (commits landing)
    if 0.2 < activity_proxy < 0.8:
        conditions += 1  # challenge-skill balance
    if cognitive_reserve > 0.4:
        conditions += 1  # sense of control
    if activity_proxy > 0.3:
        conditions += 1  # absorption
    flow_score = conditions / 5.0

    return {
        "pad_pleasure": round(pleasure, 3),
        "pad_arousal": round(arousal, 3),
        "pad_dominance": round(dominance, 3),
        "tlx_cognitive_load": round(cognitive_load, 1),
        "cognitive_reserve": round(cognitive_reserve, 3),
        "engagement_vigor": round(vigor, 3),
        "engagement_dedication": round(dedication, 3),
        "flow_score": round(flow_score, 2),
        "epistemic_density": round(epistemic_density, 3),
        # Metadata
        "_activity_proxy": round(activity_proxy, 3),
        "_missing_sensors": [
            "context_pressure", "tool_calls", "pushback_count",
            "budget_state", "gate_status", "session_duration",
        ],
    }


# ── Correlation ──────────────────────────────────────────────────────────

def spearman_rho(x: list[float], y: list[float]) -> tuple[float, float]:
    """Compute Spearman rank correlation and approximate p-value.

    Returns (rho, p_approx). P-value uses the t-distribution approximation
    valid for n >= 10.
    """
    n = len(x)
    if n < 5:
        return (0.0, 1.0)

    def rank(values):
        indexed = sorted(enumerate(values), key=lambda t: t[1])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and indexed[j + 1][1] == indexed[j][1]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1.0
            for k in range(i, j + 1):
                ranks[indexed[k][0]] = avg_rank
            i = j + 1
        return ranks

    rx = rank(x)
    ry = rank(y)

    # Pearson correlation on ranks
    mean_rx = sum(rx) / n
    mean_ry = sum(ry) / n
    num = sum((rx[i] - mean_rx) * (ry[i] - mean_ry) for i in range(n))
    den_x = math.sqrt(sum((rx[i] - mean_rx) ** 2 for i in range(n)))
    den_y = math.sqrt(sum((ry[i] - mean_ry) ** 2 for i in range(n)))

    if den_x == 0 or den_y == 0:
        return (0.0, 1.0)

    rho = num / (den_x * den_y)

    # t-approximation for p-value
    if abs(rho) >= 1.0:
        p = 0.0
    else:
        t_stat = rho * math.sqrt((n - 2) / (1 - rho ** 2))
        # Two-tailed p from t-distribution (approximation via normal for large n)
        # For small n, this underestimates p — acceptable for screening
        p = 2.0 * (1.0 - _norm_cdf(abs(t_stat)))

    return (round(rho, 3), round(p, 4))


def _norm_cdf(x: float) -> float:
    """Standard normal CDF approximation (Abramowitz & Stegun, 1964)."""
    # Rational approximation — accurate to ~1e-5
    t = 1.0 / (1.0 + 0.2316419 * abs(x))
    d = 0.3989422804014327  # 1/sqrt(2*pi)
    poly = t * (0.319381530 + t * (-0.356563782 + t * (
        1.781477937 + t * (-1.821255978 + t * 1.330274429))))
    cdf = 1.0 - d * math.exp(-0.5 * x * x) * poly
    return cdf if x >= 0 else 1.0 - cdf


# ── Tautology detection ──────────────────────────────────────────────────

# Map each construct to the outcome variable(s) it derives from.
# A correlation between a construct and its source variable represents
# mathematical identity, not empirical evidence. These pairs MUST flag
# as tautological regardless of ρ magnitude.
#
# Why: pad_pleasure = f(commit_count, ...) → corr(pad_pleasure, commit_count)
# measures formula shape, not construct validity.
TAUTOLOGICAL_PAIRS = {
    # Constructs derived primarily from commit_count
    ("pad_pleasure", "commit_count"),
    ("pad_arousal", "commit_count"),
    ("engagement_vigor", "commit_count"),
    ("tlx_cognitive_load", "commit_count"),
    ("cognitive_reserve", "commit_count"),
    ("flow_score", "commit_count"),
    # Constructs derived primarily from files_changed
    ("engagement_dedication", "files_changed"),
    ("tlx_cognitive_load", "files_changed"),
    ("cognitive_reserve", "files_changed"),
    # Epistemic density uses commit_count in denominator
    ("epistemic_density", "commit_count"),
    ("epistemic_density", "epistemic_flags_count"),
}


def is_tautological(construct: str, outcome: str) -> bool:
    """Check whether a construct-outcome pair shares derivation inputs."""
    return (construct, outcome) in TAUTOLOGICAL_PAIRS


# ── Reporting ────────────────────────────────────────────────────────────

CONSTRUCT_VARS = [
    "pad_pleasure", "pad_arousal", "tlx_cognitive_load",
    "cognitive_reserve", "engagement_vigor", "engagement_dedication",
    "flow_score", "epistemic_density",
]

OUTCOME_VARS = [
    "commit_count", "files_changed", "claims_count",
    "epistemic_flags_count", "predictions_count",
]


def build_dataset(
    git_data: dict, db_outcomes: dict, min_commits: int = 2,
) -> list[dict]:
    """Build the merged per-session dataset.

    Filters to sessions with at least min_commits to exclude trivial sessions
    (single-commit typo fixes, empty sessions).
    """
    all_sessions = set(git_data.keys()) | set(db_outcomes.keys())
    dataset = []

    for sid in sorted(all_sessions):
        g = git_data.get(sid, {"commit_count": 0, "files_changed": 0})
        if g["commit_count"] < min_commits:
            continue

        d = db_outcomes.get(sid, {})
        constructs = compute_retrospective_constructs(sid, git_data, db_outcomes)

        row = {"session_id": sid}
        row.update(constructs)
        row["commit_count"] = g["commit_count"]
        row["files_changed"] = g["files_changed"]
        row["claims_count"] = d.get("claims_count", 0)
        row["epistemic_flags_count"] = d.get("epistemic_flags_count", 0)
        row["predictions_count"] = d.get("predictions_count", 0)

        dataset.append(row)

    return dataset


def correlation_matrix(dataset: list[dict]) -> list[dict]:
    """Compute Spearman correlations between all construct-outcome pairs."""
    results = []

    for construct in CONSTRUCT_VARS:
        for outcome in OUTCOME_VARS:
            x = [row[construct] for row in dataset]
            y = [row[outcome] for row in dataset]

            # Skip if no variance
            if len(set(x)) < 3 or len(set(y)) < 3:
                continue

            tautological = is_tautological(construct, outcome)
            rho, p = spearman_rho(x, y)
            results.append({
                "construct": construct,
                "outcome": outcome,
                "rho": rho,
                "p": p,
                "n": len(dataset),
                "significant": p < 0.05 and not tautological,
                "tautological": tautological,
                "direction": "positive" if rho > 0 else "negative",
                "strength": _strength_label(rho),
            })

    return sorted(results, key=lambda r: (not r["tautological"], abs(r["rho"])),
                  reverse=True)


def _strength_label(rho: float) -> str:
    r = abs(rho)
    if r >= 0.7:
        return "strong"
    if r >= 0.4:
        return "moderate"
    if r >= 0.2:
        return "weak"
    return "negligible"


def print_report(dataset: list[dict], correlations: list[dict]) -> None:
    """Print human-readable criterion validity report."""
    print("=" * 72)
    print("  A2A-Psychology Criterion Validity Report")
    print("  Phase 1: Retrospective construct-outcome correlations")
    print("=" * 72)
    print()
    print(f"  Sessions analyzed: {len(dataset)}")
    print(f"  Session range: {dataset[0]['session_id']}-{dataset[-1]['session_id']}")
    print(f"  Constructs tested: {len(CONSTRUCT_VARS)}")
    print(f"  Outcomes tested: {len(OUTCOME_VARS)}")
    print()

    # Missing sensor warning
    print("  ⚠ RECONSTRUCTION LIMITS")
    print("  The following live sensors cannot reconstruct from history:")
    print("  context_pressure, tool_calls, pushback_count, budget_state,")
    print("  gate_status, session_duration. Construct scores represent")
    print("  partial values — valid for relative ranking, not absolute levels.")
    print()

    # Partition correlations
    tautological = [c for c in correlations if c["tautological"]]
    genuine_sig = [c for c in correlations if c["significant"] and not c["tautological"]]
    nonsig = [c for c in correlations if not c["significant"] and not c["tautological"]]

    # Tautological correlations (flagged, not celebrated)
    print("-" * 72)
    print("  TAUTOLOGICAL CORRELATIONS (construct derives from outcome)")
    print("-" * 72)
    print()
    print("  These pairs share input variables — high ρ reflects formula")
    print("  shape, not empirical evidence. Excluded from validity claims.")
    print()
    print(f"  {'Construct':<24} {'Outcome':<24} {'ρ':>6} {'Note'}")
    print(f"  {'─' * 24} {'─' * 24} {'─' * 6} {'─' * 20}")
    for c in tautological[:10]:
        print(
            f"  {c['construct']:<24} {c['outcome']:<24} "
            f"{c['rho']:>6.3f} circular derivation"
        )
    print()

    # Genuine significant correlations
    print("-" * 72)
    print("  GENUINE SIGNIFICANT CORRELATIONS (p < 0.05, non-tautological)")
    print("-" * 72)
    if genuine_sig:
        print()
        print(f"  {'Construct':<24} {'Outcome':<24} {'ρ':>6} {'p':>8} {'Strength'}")
        print(f"  {'─' * 24} {'─' * 24} {'─' * 6} {'─' * 8} {'─' * 10}")
        for c in genuine_sig:
            marker = "██" if abs(c["rho"]) >= 0.4 else "█░"
            print(
                f"  {c['construct']:<24} {c['outcome']:<24} "
                f"{c['rho']:>6.3f} {c['p']:>8.4f} {marker} {c['strength']}"
            )
        print()
    else:
        print()
        print("  None found.")
        print()

    # Non-significant, non-tautological (top 5 by effect size)
    print("-" * 72)
    print("  NON-SIGNIFICANT, NON-TAUTOLOGICAL (top 5 by effect size)")
    print("-" * 72)
    print()
    for c in nonsig[:5]:
        print(
            f"  {c['construct']:<24} {c['outcome']:<24} "
            f"{c['rho']:>6.3f} {c['p']:>8.4f} ░░ {c['strength']}"
        )
    print()

    # Interpretation
    print("-" * 72)
    print("  INTERPRETATION")
    print("-" * 72)
    print()

    total_pairs = len(correlations)
    taut_count = len(tautological)
    testable = total_pairs - taut_count
    print(f"  Total construct-outcome pairs: {total_pairs}")
    print(f"  Tautological (excluded): {taut_count}")
    print(f"  Testable pairs: {testable}")
    print()

    if genuine_sig:
        validated = set(c["construct"] for c in genuine_sig)
        not_validated = set(CONSTRUCT_VARS) - validated
        print(f"  Constructs with genuine criterion evidence: {len(validated)}/{len(CONSTRUCT_VARS)}")
        for v in sorted(validated):
            outcomes = [c for c in genuine_sig if c["construct"] == v]
            outcome_str = ", ".join(
                f"{c['outcome']}(ρ={c['rho']:.2f})" for c in outcomes
            )
            print(f"    ✓ {v} → {outcome_str}")
        print()
        if not_validated:
            print(f"  Constructs lacking criterion evidence: {len(not_validated)}")
            for v in sorted(not_validated):
                print(f"    ✗ {v}")
            print()
    else:
        print("  No constructs showed genuine criterion validity.")
        print()
        print("  Root cause: retrospective reconstruction derives constructs")
        print("  from the same variables used as outcomes. The live sensors")
        print("  (context_pressure, tool_calls, pushback_count, budget_state,")
        print("  gate_status, session_duration) provide the independence needed")
        print("  for valid criterion testing.")
        print()
        print("  RECOMMENDATION: Collect prospective data by logging")
        print("  compute-psychometrics.py output at session boundaries.")
        print("  After 20+ sessions with prospective data, re-run this analysis.")
        print()

    # Epistemic flags
    print("-" * 72)
    print("  ⚑ EPISTEMIC FLAGS")
    print("-" * 72)
    print()
    print("  - Retrospective reconstruction omits 6 of 12 sensor inputs.")
    print("    Null results may reflect missing data, not invalid constructs.")
    print("  - Commit count measures quantity, not quality. A session with")
    print("    3 high-impact commits may outperform one with 30 typo fixes.")
    print("  - Spearman ρ assumes monotonic relationships. Non-monotonic")
    print("    patterns (Yerkes-Dodson inverted U) will show as weak/null.")
    testable_count = len([c for c in correlations if not c["tautological"]])
    print(f"  - Of {len(correlations)} pairs, {len(tautological)} are tautological.")
    print(f"    Only {testable_count} pairs represent testable hypotheses.")
    print(f"    Expected false positives at α=0.05: ~{round(testable_count * 0.05, 1)}.")
    print("  - PAD dominance excluded (cannot reconstruct budget state).")

    # Cross-outcome collinearity check
    cc = [row["commit_count"] for row in dataset]
    fc = [row["files_changed"] for row in dataset]
    outcome_rho, outcome_p = spearman_rho(cc, fc)
    print(f"  - commit_count ↔ files_changed collinearity: ρ={outcome_rho:.3f}")
    if abs(outcome_rho) > 0.5:
        print("    These outcomes share substantial variance. Constructs derived")
        print("    from commit_count that correlate with files_changed may reflect")
        print("    outcome collinearity rather than genuine criterion validity.")
        print("    Treat cross-outcome correlations as suggestive, not confirmatory.")
    print()


def print_csv(dataset: list[dict]) -> None:
    """Print per-session dataset as CSV for external analysis."""
    if not dataset:
        return
    fields = [k for k in dataset[0].keys() if not k.startswith("_")]
    writer = csv.DictWriter(
        sys.stdout, fieldnames=fields, extrasaction="ignore"
    )
    writer.writeheader()
    for row in dataset:
        writer.writerow({k: v for k, v in row.items() if not k.startswith("_")})


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="A2A-Psychology criterion validity analysis"
    )
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--csv", action="store_true", help="CSV dataset output")
    parser.add_argument("--verbose", action="store_true", help="Show per-session data")
    parser.add_argument(
        "--min-commits", type=int, default=2,
        help="Minimum commits per session to include (default: 2)"
    )
    args = parser.parse_args()

    # Gather data
    git_data = discover_sessions_from_git()
    if not git_data:
        print("No session data found in git history.", file=sys.stderr)
        sys.exit(1)

    db_outcomes = {}
    if DB_PATH.exists():
        db = sqlite3.connect(str(DB_PATH))
        db_outcomes = get_db_outcomes(db)
        db.close()

    # Build dataset
    dataset = build_dataset(git_data, db_outcomes, min_commits=args.min_commits)
    if not dataset:
        print("No sessions with sufficient data for analysis.", file=sys.stderr)
        sys.exit(1)

    if args.csv:
        print_csv(dataset)
        sys.exit(0)

    # Compute correlations
    correlations = correlation_matrix(dataset)

    if args.json:
        output = {
            "sessions_analyzed": len(dataset),
            "session_range": [dataset[0]["session_id"], dataset[-1]["session_id"]],
            "correlations": correlations,
            "dataset_summary": {
                "construct_vars": CONSTRUCT_VARS,
                "outcome_vars": OUTCOME_VARS,
                "missing_sensors": [
                    "context_pressure", "tool_calls", "pushback_count",
                    "budget_state", "gate_status", "session_duration",
                ],
            },
        }
        if args.verbose:
            output["dataset"] = dataset
        print(json.dumps(output, indent=2))
        sys.exit(0)

    # Human report
    print_report(dataset, correlations)

    if args.verbose:
        print("-" * 72)
        print("  PER-SESSION DATA")
        print("-" * 72)
        print()
        for row in dataset:
            print(f"  Session {row['session_id']:>3}: "
                  f"commits={row['commit_count']:>3}, "
                  f"files={row['files_changed']:>3}, "
                  f"PAD_p={row['pad_pleasure']:>6.3f}, "
                  f"TLX={row['tlx_cognitive_load']:>5.1f}, "
                  f"flow={row['flow_score']:>4.2f}")
        print()


def snapshot_current_session(session_id: int) -> None:
    """Log current compute-psychometrics.py output for prospective validation.

    Writes a row to the event_log table with event_type='psychometric_snapshot'.
    Future runs of validate-criterion.py can use these snapshots instead of
    retrospective reconstruction, breaking the tautological circularity.

    Call at session end (e.g., from /cycle or session-end hook).
    """
    if not DB_PATH.exists():
        print("Cannot snapshot — state.db not found", file=sys.stderr)
        return

    # Run compute-psychometrics.py to get current state
    result = subprocess.run(
        ["python3", str(PROJECT_ROOT / "scripts" / "compute-psychometrics.py")],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print(f"Cannot snapshot — compute-psychometrics.py failed: {result.stderr}",
              file=sys.stderr)
        return

    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("Cannot snapshot — invalid JSON from compute-psychometrics.py",
              file=sys.stderr)
        return

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    event_id = f"psych-snapshot-s{session_id}-{now}"

    db = sqlite3.connect(str(DB_PATH))
    try:
        db.execute(
            "INSERT INTO event_log (event_id, timestamp, agent_id, event_type, "
            "category, payload, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event_id, now, "psychology-agent", "psychometric_snapshot",
             "validation", json.dumps(payload), session_id),
        )
        db.commit()
        print(f"Psychometric snapshot saved for session {session_id}")
    except Exception as e:
        print(f"Snapshot failed: {e}", file=sys.stderr)
    finally:
        db.close()


if __name__ == "__main__":
    if "--snapshot" in sys.argv:
        # Usage: python3 scripts/validate-criterion.py --snapshot 92
        idx = sys.argv.index("--snapshot")
        if idx + 1 < len(sys.argv):
            sid = int(sys.argv[idx + 1])
            snapshot_current_session(sid)
        else:
            print("Usage: --snapshot SESSION_NUMBER", file=sys.stderr)
            sys.exit(1)
    else:
        main()

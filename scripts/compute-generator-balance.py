#!/usr/bin/env python3
"""compute-generator-balance.py — Adaptive generator balance from git log.

Scans commit messages for keyword patterns mapping to generators G1-G9 (§11.10).
Computes conservation law ratios: creative-evaluative (G2/G3) and
crystallization-dissolution (G6/G7).

**Adaptive targeting (Session 91):** Replaces the fixed ~2:1 target with a
difficulty-based adaptive ratio (Snell et al. 2024). Session difficulty
derives from commit message keyword analysis — architectural/theoretical
work scores higher difficulty than routine operations. The target ratio
shifts: easy sessions tolerate higher creative skew (up to 4:1); hard
sessions demand more evaluation (down to 1.5:1).

⚑ Targets grounded via three sources (Session 90, extended Session 91):

Empirical (this project): 5,972 commits → creative/evaluative 1.89:1,
crystallization/dissolution 1.36:1. Baseline informs the adaptive midpoint.

Literature (Paulus & Nijstad 2003, Scrum Guide 2020, Snell et al. 2024):
  - Brainstorming protocols: 3:1-4:1 generation/evaluation (convention)
  - Scrum ceremonies: 5:1-7:1 development/ceremony
  - RL exploration/exploitation: 1:5-1:10 (inverted — favors exploitation)
  - LLM test-time compute: ratio adapts to difficulty (easy 16:1, hard 2:1-4:1)
  - Kauffman NK model (K=2): order dominates; small novelty fraction optimal
  - Computational creativity (Colton 2012): structural 1:1 balanced

Adaptive function: target_ratio = 4.0 - (2.5 * difficulty), clamped [1.5, 4.0]
  - difficulty 0.0 (routine) → target 4.0:1
  - difficulty 0.5 (mixed)   → target 2.75:1
  - difficulty 0.8 (hard)    → target 2.0:1
  - difficulty 1.0 (max)     → target 1.5:1

Usage: python3 scripts/compute-generator-balance.py --session-id 86
"""
import argparse, json, os, re, sqlite3, subprocess
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"

GENERATORS = {
    "G1": (r"adversar|threat|exploit|attack|injection|security", "Adversarial/entropic"),
    "G2": (r"add|create|implement|introduce|write|draft|propose|new\b|feat:", "Creative"),
    "G3": (r"review|audit|evaluat|validat|refut|diagnos|assess|verify|resolve:", "Evaluative"),
    "G4": (r"question|counter|falsif|skeptic|apophatic|limit|caveat", "Apophatic/skeptical"),
    "G5": (r"fix[:!]|error|bug|detect|integrity|stale|violation|repair|resolve|reconcil", "Microglial/immune"),
    "G6": (r"convention|hook|invariant|crystalliz|formalize|codif|standard", "Crystallization"),
    "G7": (r"retire|remove|delete|dissolve|deprecat|drop|prune", "Dissolution"),
    "G8": (r"stale|drift|rot|decay|divergen|outdated|obsolet", "Entropic decay"),
    "G9": (r"tempo|cadence|frequency|accelerat|decelerat|throttl", "Tempo"),
}
COUPLING = {"G2": "G3", "G3": "G2", "G6": "G7", "G7": "G6"}

# Difficulty markers — keywords signaling architectural/theoretical vs routine work
DIFFICULTY_MARKERS = {
    "high": (
        r"architect|theor|deriv|formal|invariant|governance|ontolog|epistem|"
        r"consciousness|monism|refactor|redesign|adjudicat|knock-on|"
        r"convergence|psychometric|bifactor|calibrat|conservation law"
    ),
    "moderate": (
        r"spec|protocol|schema|migration|evaluation|analysis|integration|"
        r"mapping|grounding|literature|model|taxonomy|framework"
    ),
    "low": (
        r"ACK|ack|sync|commit|push|merge|transport|heartbeat|status|"
        r"rename|typo|fix:|cleanup|format|lint|update:|bump"
    ),
}


def estimate_session_difficulty(messages: list[str]) -> float:
    """Estimate session difficulty from commit message keywords.

    Returns 0.0 (routine) to 1.0 (maximally complex).
    Averages per-commit difficulty scores weighted by marker category.
    """
    if not messages:
        return 0.5  # default to midpoint when no data

    high_pat = re.compile(DIFFICULTY_MARKERS["high"], re.IGNORECASE)
    mod_pat = re.compile(DIFFICULTY_MARKERS["moderate"], re.IGNORECASE)
    low_pat = re.compile(DIFFICULTY_MARKERS["low"], re.IGNORECASE)

    scores = []
    for msg in messages:
        high_hits = len(high_pat.findall(msg))
        mod_hits = len(mod_pat.findall(msg))
        low_hits = len(low_pat.findall(msg))
        total = high_hits + mod_hits + low_hits
        if total == 0:
            scores.append(0.5)
            continue
        weighted = (high_hits * 1.0 + mod_hits * 0.5 + low_hits * 0.0) / total
        scores.append(weighted)

    return round(sum(scores) / len(scores), 3)


def adaptive_target_ratio(difficulty: float) -> float:
    """Compute adaptive creative/evaluative target ratio from difficulty.

    Linear interpolation: difficulty 0 → 4.0:1, difficulty 1 → 1.5:1.
    Grounding: Snell et al. (2024) LLM test-time compute shows adaptive
    allocation — easy problems need less verification overhead, hard problems
    need proportionally more. The slope (2.5) and bounds (1.5–4.0) derive
    from the literature survey endpoints: brainstorming 3:1-4:1 (easy),
    RL exploitation 1:1-1:5 (hard), project empirical baseline 1.89:1
    (mixed difficulty).
    """
    return round(max(1.5, min(4.0, 4.0 - 2.5 * difficulty)), 2)


def get_session_commits(session_id: int) -> list[str]:
    """Retrieve commit messages for a session.

    Two strategies (union of results):
    1. Grep for 'Session N' in commit messages (original)
    2. Date-range scan using session_log timestamps from state.db
    Strategy 2 catches commits with non-standard prefixes (feat:, fix:, etc.).
    """
    messages = set()

    # Strategy 1: grep by session number
    try:
        result = subprocess.run(
            ["git", "log", "--all", f"--grep=[Ss]ession {session_id}", "--format=%s"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        messages.update(l for l in result.stdout.strip().splitlines() if l)
    except FileNotFoundError:
        pass

    # Strategy 2: date-range from session_log
    if DB_PATH.exists():
        try:
            db = sqlite3.connect(str(DB_PATH))
            row = db.execute(
                "SELECT timestamp FROM session_log WHERE id = ?",
                (session_id,),
            ).fetchone()
            if row and row[0]:
                # Get commits from session start date onward (same day)
                session_date = row[0][:10]  # YYYY-MM-DD
                result = subprocess.run(
                    ["git", "log", "--all", f"--after={session_date}T00:00:00",
                     f"--before={session_date}T23:59:59", "--format=%s",
                     "--no-merges"],
                    capture_output=True, text=True, cwd=str(PROJECT_ROOT))
                messages.update(l for l in result.stdout.strip().splitlines() if l
                                if "autonomous: pre-sync" not in l)  # skip cron noise
            db.close()
        except Exception:
            pass

    return list(messages)


def count_generators(messages: list[str]) -> dict[str, int]:
    counts = {gid: 0 for gid in GENERATORS}
    for msg in messages:
        for gid, (pat, _) in GENERATORS.items():
            counts[gid] += 1 if re.search(pat, msg, re.IGNORECASE) else 0
    return counts

def safe_ratio(a: int, b: int) -> float | None:
    return round(a / b, 2) if b > 0 else None


def compute_balance(counts: dict[str, int], difficulty: float) -> dict:
    target = adaptive_target_ratio(difficulty)
    actual = safe_ratio(counts["G2"], counts["G3"])
    deviation = round(actual - target, 2) if actual is not None else None
    return {
        "creative_evaluative": actual,
        "creative_evaluative_target": target,
        "creative_evaluative_deviation": deviation,
        "session_difficulty": difficulty,
        "difficulty_label": (
            "routine" if difficulty < 0.3
            else "moderate" if difficulty < 0.6
            else "challenging" if difficulty < 0.8
            else "hard"
        ),
        "crystallization_dissolution": safe_ratio(counts["G6"], counts["G7"]),
        "crystallization_dissolution_target": "~1.4:1 (empirical baseline)",
    }


def write_to_db(session_id: int, counts: dict[str, int]):
    if not DB_PATH.exists():
        print(f"Warning: {DB_PATH} not found — skipping DB write.", flush=True)
        return
    db = sqlite3.connect(str(DB_PATH))
    for gid, count in counts.items():
        _, name = GENERATORS[gid]
        partner = COUPLING.get(gid)
        ratio = safe_ratio(count, counts.get(partner, 0)) if partner else None
        db.execute(
            "INSERT INTO generator_state (session_id, generator_id, generator_name,"
            " output_count, coupling_partner, balance_ratio) VALUES (?,?,?,?,?,?)",
            (session_id, gid, name, count, partner, ratio))
    db.commit()
    db.close()


def main():
    parser = argparse.ArgumentParser(description="Compute generator balance")
    parser.add_argument("--session-id", type=int, required=True)
    args = parser.parse_args()

    messages = get_session_commits(args.session_id)
    counts = count_generators(messages)
    difficulty = estimate_session_difficulty(messages)
    balance = compute_balance(counts, difficulty)

    result = {
        "session_id": args.session_id,
        "commit_count": len(messages),
        "generator_counts": {
            gid: {"name": GENERATORS[gid][1], "count": c}
            for gid, c in counts.items()
        },
        "conservation_laws": balance,
    }
    print(json.dumps(result, indent=2))
    write_to_db(args.session_id, counts)


if __name__ == "__main__":
    main()

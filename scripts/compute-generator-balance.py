#!/usr/bin/env python3
"""compute-generator-balance.py — Heuristic generator balance from git log.

Scans commit messages for keyword patterns mapping to generators G1-G9 (§11.10).
Computes conservation law ratios: creative-evaluative (G2/G3, target 3:1-5:1)
and crystallization-dissolution (G6/G7, target ~1:1).

Usage: python3 scripts/compute-generator-balance.py --session-id 86
"""
import argparse, json, os, re, sqlite3, subprocess
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"

GENERATORS = {
    "G1": (r"adversar|threat|exploit|attack|injection|security", "Adversarial/entropic"),
    "G2": (r"add|create|implement|introduce|write|draft|propose|new\b", "Creative"),
    "G3": (r"review|audit|evaluat|validat|refut|diagnos|assess|verify", "Evaluative"),
    "G4": (r"question|counter|falsif|skeptic|apophatic|limit|caveat", "Apophatic/skeptical"),
    "G5": (r"fix|error|bug|detect|integrity|stale|violation|repair", "Microglial/immune"),
    "G6": (r"convention|hook|invariant|crystalliz|formalize|codif|standard", "Crystallization"),
    "G7": (r"retire|remove|delete|dissolve|deprecat|drop|prune", "Dissolution"),
    "G8": (r"stale|drift|rot|decay|divergen|outdated|obsolet", "Entropic decay"),
    "G9": (r"tempo|cadence|frequency|accelerat|decelerat|throttl", "Tempo"),
}
COUPLING = {"G2": "G3", "G3": "G2", "G6": "G7", "G7": "G6"}


def get_session_commits(session_id: int) -> list[str]:
    """Retrieve commit messages mentioning the session number."""
    try:
        result = subprocess.run(
            ["git", "log", "--all", f"--grep=[Ss]ession {session_id}", "--format=%s"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return [l for l in result.stdout.strip().splitlines() if l]
    except FileNotFoundError:
        return []


def count_generators(messages: list[str]) -> dict[str, int]:
    counts = {gid: 0 for gid in GENERATORS}
    for msg in messages:
        for gid, (pat, _) in GENERATORS.items():
            counts[gid] += 1 if re.search(pat, msg, re.IGNORECASE) else 0
    return counts

def safe_ratio(a: int, b: int) -> float | None:
    return round(a / b, 2) if b > 0 else None


def compute_balance(counts: dict[str, int]) -> dict:
    return {
        "creative_evaluative": safe_ratio(counts["G2"], counts["G3"]),
        "creative_evaluative_target": "3:1 to 5:1",
        "crystallization_dissolution": safe_ratio(counts["G6"], counts["G7"]),
        "crystallization_dissolution_target": "~1:1",
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
    balance = compute_balance(counts)

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

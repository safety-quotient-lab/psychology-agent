#!/usr/bin/env python3
"""
restart-detector.py — Scan session transcripts for self-correction restarts.

Detects "let me do it properly" and related phrases where the agent announces
a restart mid-task. Distinguishes genuine self-correction (approach actually
changes) from performative restart (same approach, new announcement).

Behavioral signal: the agent recognized its current approach as inadequate.
Two competing interpretations:
  1. Genuine self-correction — quality drift detected, course corrected
  2. Performative restart — announcement substitutes for actual improvement

Usage:
    python3 scripts/restart-detector.py                     # scan all transcripts
    python3 scripts/restart-detector.py --report            # frequency per session
    python3 scripts/restart-detector.py --context           # show before/after tool calls
    python3 scripts/restart-detector.py --classify          # genuine vs performative analysis
    python3 scripts/restart-detector.py --drift             # frequency drift over session length
    python3 scripts/restart-detector.py --json              # machine-readable output
"""

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))

# ── Pattern families ────────────────────────────────────────────────
#
# Narrow restart: implies prior attempt failed, agent announces redo
# Planning restart: agent pauses to think/design before proceeding
# Broad restart: catch-all for "properly" announcements

PATTERNS = {
    "narrow_restart": [
        r"\blet me (fix|rewrite|redo|restart|rework|rebuild|reimplement|undo) (it|this|that) properly\b",
        r"\blet me (do|try|handle|approach) (it|this|that) properly\b",
        r"\blet me start (over|fresh|again) properly\b",
    ],
    "planning_restart": [
        r"\blet me (think|work|reason|step back|reconsider|rethink) .{0,30}properly\b",
        r"\blet me (scope|frame|structure|design|plan|decompose|lay out) .{0,30}properly\b",
    ],
    "broad_restart": [
        r"\blet me .{1,40}properly\b",
    ],
}

COMPILED = {}
for category, pats in PATTERNS.items():
    COMPILED[category] = [re.compile(p, re.IGNORECASE) for p in pats]


def classify_match(text: str, match_start: int, match_end: int) -> str:
    """Classify a match into the most specific category.

    Checks narrow first, then planning, then broad.
    Returns the first matching category.
    """
    snippet = text[match_start:match_end]
    for category in ["narrow_restart", "planning_restart"]:
        for pattern in COMPILED[category]:
            if pattern.search(snippet):
                return category
    return "broad_restart"


def extract_context_window(
    messages: list[dict],
    target_line: int,
    window: int = 5,
) -> dict:
    """Extract tool calls before and after the restart phrase.

    Returns a dict with 'before' and 'after' tool call summaries,
    enabling classification of whether the approach actually changed.
    """
    before_tools = []
    after_tools = []
    found_target = False

    for msg in messages:
        line = msg.get("_line", 0)
        role = msg.get("role", "")
        tools = msg.get("tools", [])

        if line == target_line:
            found_target = True
            continue

        if not found_target:
            for tool in tools[-window:]:
                before_tools.append(tool)
        else:
            for tool in tools[:window]:
                after_tools.append(tool)
            if len(after_tools) >= window:
                break

    return {
        "before": before_tools[-window:],
        "after": after_tools[:window],
    }


def extract_tool_names(content) -> list[str]:
    """Extract tool_use names from message content."""
    tools = []
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "tool_use":
                    tools.append(part.get("name", "unknown"))
    return tools


def scan_jsonl(filepath: Path) -> list[dict]:
    """Scan a JSONL transcript file for restart patterns in assistant messages."""
    results = []
    messages_index = []

    try:
        with open(filepath) as f:
            for line_num, line in enumerate(f, 1):
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                msg = entry.get("message", {})
                role = msg.get("role", "")
                content = msg.get("content", "")

                # Index all messages for context extraction
                tools = extract_tool_names(content)
                messages_index.append({
                    "_line": line_num,
                    "role": role,
                    "tools": tools,
                })

                # Only scan assistant messages for restart phrases
                if role != "assistant":
                    continue

                # Extract text content
                if isinstance(content, list):
                    text_parts = []
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            text_parts.append(part.get("text", ""))
                        elif isinstance(part, str):
                            text_parts.append(part)
                    text = " ".join(text_parts)
                else:
                    text = str(content)

                if not text:
                    continue

                # Scan with broad pattern first (catches everything),
                # then classify into specific category
                for pattern in COMPILED["broad_restart"]:
                    for match in pattern.finditer(text):
                        category = classify_match(
                            text, match.start(), match.end()
                        )

                        # Surrounding context (±80 chars)
                        ctx_start = max(0, match.start() - 80)
                        ctx_end = min(len(text), match.end() + 80)
                        context = text[ctx_start:ctx_end].replace("\n", " ").strip()

                        results.append({
                            "file": str(filepath),
                            "file_name": filepath.name,
                            "line": line_num,
                            "category": category,
                            "match": match.group(),
                            "context": context,
                            "position_in_file": line_num,
                        })

    except (FileNotFoundError, PermissionError):
        pass

    # Attach tool context to each finding
    for result in results:
        ctx = extract_context_window(messages_index, result["line"])
        result["tools_before"] = ctx["before"]
        result["tools_after"] = ctx["after"]

    return results


def find_transcripts() -> list[Path]:
    """Find all JSONL transcript files for this project."""
    home = Path.home()
    project_dir = home / ".claude" / "projects" / "-Users-kashif-Projects-psychology-agent"
    candidates = []

    if project_dir.exists():
        for jsonl in project_dir.glob("*.jsonl"):
            candidates.append(jsonl)

    return sorted(
        candidates,
        key=lambda p: p.stat().st_mtime if p.exists() else 0,
        reverse=True,
    )


def frequency_report(all_results: list[dict]) -> dict:
    """Frequency report grouped by session file and category."""
    category_counts = Counter()
    phrase_counts = Counter()
    per_session = defaultdict(int)

    for result in all_results:
        category_counts[result["category"]] += 1
        phrase_counts[result["match"].lower()] += 1
        per_session[result["file_name"]] += 1

    session_counts = sorted(per_session.values())
    total_sessions = len(per_session)

    return {
        "total_findings": len(all_results),
        "sessions_with_restarts": total_sessions,
        "per_session_mean": round(len(all_results) / max(total_sessions, 1), 2),
        "per_session_max": max(session_counts) if session_counts else 0,
        "by_category": dict(category_counts.most_common()),
        "top_phrases": dict(phrase_counts.most_common(15)),
        "per_session_distribution": dict(
            Counter(per_session.values()).most_common()
        ),
    }


def tool_sequence_changed(before: list[str], after: list[str]) -> bool:
    """Heuristic: did the tool sequence change after the restart phrase?

    Compares the tool types used before vs after. A genuine restart
    typically involves different tools or a different ordering.
    """
    if not before or not after:
        return False  # insufficient data — cannot classify

    before_set = set(before)
    after_set = set(after)

    # New tools appeared that did not appear before
    new_tools = after_set - before_set
    # Tools dropped
    dropped_tools = before_set - after_set

    # If tool composition changed, the approach likely changed
    return len(new_tools) > 0 or len(dropped_tools) > 0


def classify_restarts(all_results: list[dict]) -> dict:
    """Classify each restart as genuine (approach changed) or performative."""
    genuine = 0
    performative = 0
    insufficient_data = 0

    classified = []

    for result in all_results:
        before = result.get("tools_before", [])
        after = result.get("tools_after", [])

        if not before or not after:
            classification = "insufficient_data"
            insufficient_data += 1
        elif tool_sequence_changed(before, after):
            classification = "genuine"
            genuine += 1
        else:
            classification = "performative"
            performative += 1

        classified.append({
            **result,
            "classification": classification,
        })

    total = genuine + performative
    return {
        "genuine": genuine,
        "performative": performative,
        "insufficient_data": insufficient_data,
        "genuine_rate": round(genuine / max(total, 1), 3),
        "performative_rate": round(performative / max(total, 1), 3),
        "findings": classified,
    }


def drift_analysis(all_results: list[dict]) -> dict:
    """Analyze whether restart frequency increases over session length.

    Uses line position in the JSONL as a proxy for session progression.
    """
    early = 0    # first third (lines < 1000)
    middle = 0   # middle third (lines 1000-3000)
    late = 0     # last third (lines > 3000)

    for result in all_results:
        line = result["position_in_file"]
        if line < 1000:
            early += 1
        elif line < 3000:
            middle += 1
        else:
            late += 1

    total = early + middle + late
    if total == 0:
        return {"drift_detected": False, "note": "No findings to analyze"}

    drift_ratio = round(late / max(early, 1), 2)

    return {
        "early_session": early,
        "mid_session": middle,
        "late_session": late,
        "drift_ratio": drift_ratio,
        "drift_detected": late > early * 1.5 and early > 0,
        "interpretation": (
            f"Restart drift detected — late-session frequency exceeds "
            f"early-session by {drift_ratio}×. May indicate fatigue-driven "
            f"quality degradation requiring more course corrections."
            if late > early * 1.5 and early > 0
            else "No significant drift — restart frequency stable across session length"
        ),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Scan transcripts for self-correction restart patterns"
    )
    parser.add_argument(
        "--report", action="store_true",
        help="Frequency report per session and category",
    )
    parser.add_argument(
        "--context", action="store_true",
        help="Show tool calls before/after each restart",
    )
    parser.add_argument(
        "--classify", action="store_true",
        help="Classify restarts as genuine vs performative",
    )
    parser.add_argument(
        "--drift", action="store_true",
        help="Analyze restart frequency drift over session length",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Machine-readable JSON output",
    )
    parser.add_argument(
        "--file", type=str,
        help="Scan a specific JSONL file",
    )
    args = parser.parse_args()

    # Collect transcripts
    if args.file:
        transcripts = [Path(args.file)]
    else:
        transcripts = find_transcripts()

    if not transcripts:
        print("No transcript files found.")
        sys.exit(0)

    # Scan all transcripts
    all_results = []
    for transcript in transcripts:
        results = scan_jsonl(transcript)
        all_results.extend(results)

    # ── Report mode ─────────────────────────────────────────────────
    if args.report:
        report = frequency_report(all_results)
        if args.json:
            print(json.dumps(report, indent=2))
        else:
            print("Restart Detector — Frequency Report")
            print(f"Transcripts scanned: {len(transcripts)}")
            print(f"Total restart phrases: {report['total_findings']}")
            print(f"Sessions with restarts: {report['sessions_with_restarts']}")
            print(f"Per-session mean: {report['per_session_mean']}")
            print(f"Per-session max: {report['per_session_max']}")
            print(f"\nBy category:")
            for cat, count in report["by_category"].items():
                print(f"  {cat}: {count}")
            print(f"\nTop phrases:")
            for phrase, count in report["top_phrases"].items():
                print(f'  "{phrase}": {count}')
            print(f"\nPer-session distribution (count: sessions):")
            for count, sessions in sorted(
                report["per_session_distribution"].items()
            ):
                print(f"  {count} restart(s): {sessions} session(s)")
        sys.exit(0)

    # ── Classify mode ───────────────────────────────────────────────
    if args.classify:
        classification = classify_restarts(all_results)
        if args.json:
            # Omit full findings list for cleaner summary
            summary = {k: v for k, v in classification.items() if k != "findings"}
            print(json.dumps(summary, indent=2))
        else:
            print("Restart Detector — Classification Analysis")
            print(f"Total restarts analyzed: {len(all_results)}")
            print(f"Genuine (approach changed): {classification['genuine']} "
                  f"({classification['genuine_rate']:.1%})")
            print(f"Performative (same approach): {classification['performative']} "
                  f"({classification['performative_rate']:.1%})")
            print(f"Insufficient data: {classification['insufficient_data']}")
            print(f"\nInterpretation:")
            genuine_rate = classification["genuine_rate"]
            if genuine_rate > 0.7:
                print("  HIGH genuine rate — restarts correlate with actual approach changes.")
                print("  The phrase signals effective self-monitoring.")
            elif genuine_rate > 0.4:
                print("  MIXED — some restarts change approach, others announce without changing.")
                print("  The phrase carries partial signal.")
            else:
                print("  LOW genuine rate — most restarts repeat the same approach.")
                print("  The phrase functions as performative rigor, not actual correction.")
        sys.exit(0)

    # ── Context mode ────────────────────────────────────────────────
    if args.context:
        if args.json:
            print(json.dumps(all_results[:30], indent=2))
        else:
            print("Restart Detector — Context Analysis")
            print(f"Showing tool context for {min(len(all_results), 30)} restart(s)\n")
            for result in all_results[:30]:
                cat_label = {
                    "narrow_restart": "██ NARROW",
                    "planning_restart": "█░ PLANNING",
                    "broad_restart": "░░ BROAD",
                }.get(result["category"], "?? UNKNOWN")

                print(f"  {cat_label}  \"{result['match']}\"")
                print(f"    Context: ...{result['context']}...")
                before = result.get("tools_before", [])
                after = result.get("tools_after", [])
                if before:
                    print(f"    Tools before: {' → '.join(before)}")
                if after:
                    print(f"    Tools after:  {' → '.join(after)}")
                changed = tool_sequence_changed(before, after)
                print(f"    Approach changed: {'yes' if changed else 'no'}")
                print()
            if len(all_results) > 30:
                print(f"  ... {len(all_results) - 30} more (use --json for full output)")
        sys.exit(0)

    # ── Drift mode ──────────────────────────────────────────────────
    if args.drift:
        drift = drift_analysis(all_results)
        if args.json:
            print(json.dumps(drift, indent=2))
        else:
            print("Restart Detector — Drift Analysis")
            print(f"Early session: {drift['early_session']}")
            print(f"Mid session: {drift['mid_session']}")
            print(f"Late session: {drift['late_session']}")
            print(f"Drift ratio: {drift['drift_ratio']}×")
            print(f"Result: {drift['interpretation']}")
        sys.exit(0)

    # ── Default: show findings ──────────────────────────────────────
    if not all_results:
        print("No restart patterns detected.")
        sys.exit(0)

    print(f"Restart Detector: {len(all_results)} finding(s) "
          f"across {len(set(r['file_name'] for r in all_results))} session(s)\n")

    for result in all_results[:25]:
        cat_label = {
            "narrow_restart": "██",
            "planning_restart": "█░",
            "broad_restart": "░░",
        }.get(result["category"], "??")

        print(f"  {cat_label} [{result['category']}] \"{result['match']}\"")
        print(f"     ...{result['context']}...")
        print()

    if len(all_results) > 25:
        print(f"  ... and {len(all_results) - 25} more (use --report for summary)")


if __name__ == "__main__":
    main()

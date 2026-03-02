#!/usr/bin/env python3
"""
reconstruct.py — Git Reconstruction via JSONL Replay

Replays Write/Edit tool calls from Claude Code JSONL chat history to produce
a git history with one commit per session. Mechanical baseline component of
the Git Reconstruction via Replay-Agent system.

Usage (same machine):
  python3 reconstruct.py \
    --jsonl     /path/to/session.jsonl \
    --reference /path/to/current/psychology/ \
    --target    /path/to/new/psychology-reconstructed/ \
    [--threshold 1.0] [--dry-run] [--session 1]

Usage (cross-machine — Mac or Windows):
  python3 reconstruct.py \
    --jsonl      /path/to/session.jsonl \
    --source-root /home/kashif/projects/psychology \
    --reference  /Users/me/psychology-reference/ \
    --target     /Users/me/psychology-reconstructed/ \
    [--threshold 1.0] [--dry-run]

Exit codes:
  0  all sessions reconstructed, drift within threshold
  1  error (parse failure, file system error)
  2  drift threshold exceeded, reconstruction halted; see divergence-report.md

Requirements:
  Python 3.9+   (uses PEP 585 built-in generics: list[dict], tuple[...])
  git in PATH   (Linux: usually pre-installed; macOS: Xcode CLT or Homebrew)

Platform notes:
  Tested on Linux (Debian/Ubuntu) and macOS (M1/Apple Silicon).
  Uses pathlib throughout — no hardcoded /home/ or /Users/ paths.
  All subprocess calls use git only — no GNU-specific tools.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Session boundary constants — derived from lab-notebook, not JSONL discovery
# ---------------------------------------------------------------------------

SESSION_BOUNDARIES = [
    # (session_number, start_utc, end_utc, summary)
    (1, "2026-03-01T20:43:00Z", "2026-03-01T22:49:00Z", "Architecture design, skill creation"),
    (2, "2026-03-01T23:19:00Z", "2026-03-02T01:30:00Z", "Cognitive infrastructure"),
    (3, "2026-03-02T01:40:00Z", "2026-03-02T03:13:00Z", "/hunt, /cycle, /capacity; conventions"),
]

JSONL_SOURCE_ID = "10f3b81d"   # used in commit messages

# ---------------------------------------------------------------------------
# Drift scoring weights
# ---------------------------------------------------------------------------

WEIGHT_MAP = {
    "CLAUDE.md":                          3,
    "docs/architecture.md":               3,
    "memory/cognitive-triggers.md":       3,
    "lab-notebook.md":                    2,
    "BOOTSTRAP.md":                       2,
    ".claude/skills/cycle/SKILL.md":      2,
    ".claude/skills/hunt/SKILL.md":       2,
}
DEFAULT_WEIGHT = 1

# Defaults (overridable via CLI)
WARNING_THRESHOLD = 0.3
TERM_THRESHOLD    = 1.0

# Gitignore exclusion patterns for project root
GITIGNORE_PATTERNS = [
    re.compile(r"^lessons\.md$"),
    re.compile(r"^safety-quotient/"),
    re.compile(r"^pje-framework/"),
]

GITIGNORE_CONTENT = """lessons.md
safety-quotient/
pje-framework/
"""


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def parse_ts(ts_str: str) -> datetime:
    """Parse ISO-8601 timestamp to timezone-aware datetime."""
    ts_str = ts_str.replace("Z", "+00:00")
    return datetime.fromisoformat(ts_str)


def is_excluded(relative_path: str) -> bool:
    """Return True if relative_path matches a gitignore exclusion pattern."""
    for pattern in GITIGNORE_PATTERNS:
        if pattern.match(relative_path):
            return True
    return False


def weight_for(relative_path: str) -> int:
    return WEIGHT_MAP.get(relative_path, DEFAULT_WEIGHT)


def line_diff_fraction(a_text: str, b_text: str) -> float:
    """Fraction of lines that differ between a and b (0.0–1.0)."""
    a_lines = a_text.splitlines()
    b_lines = b_text.splitlines()
    total = max(len(a_lines), len(b_lines), 1)
    # Simple symmetric line diff count
    a_set = set(enumerate(a_lines))
    b_set = set(enumerate(b_lines))
    differing = len(a_set.symmetric_difference(b_set))
    return min(differing / total, 1.0)


# ---------------------------------------------------------------------------
# JSONL parsing
# ---------------------------------------------------------------------------

def extract_operations(jsonl_path: str, source_root: str) -> list[dict]:
    """
    Parse JSONL and extract Write/Edit tool calls under source_root.

    source_root is the project path as it appeared on the ORIGINATING machine
    (e.g. /home/kashif/projects/psychology on Linux).  This may differ from
    the --reference path on the current machine (Mac/Windows cross-machine use).

    Returns list of dicts: {session, ts, tool, rel_path, params}
    rel_path is always forward-slash separated regardless of host OS.
    """
    user_home = str(Path.home())
    # Resolve source_root — on a different OS than origin, Unix paths resolve
    # to the current drive root on Windows (e.g. C:\home\kashif\...) which is
    # consistent as long as source_root and JSONL paths use the same convention.
    source_root_path = Path(source_root).expanduser().resolve()

    # Pre-parse session boundary timestamps once rather than re-parsing per message
    session_windows = [
        (session_num, parse_ts(start_str), parse_ts(end_str), summary)
        for session_num, start_str, end_str, summary in SESSION_BOUNDARIES
    ]

    operations = []

    try:
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line_number, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    msg = json.loads(line)
                except json.JSONDecodeError as exc:
                    print(f"  [WARN] JSONL parse error at line {line_number}: {exc}", file=sys.stderr)
                    continue

                # Only assistant messages carry tool calls in Claude Code JSONL
                if msg.get("type") != "assistant":
                    continue

                # Timestamp — try common field names
                raw_timestamp = (msg.get("timestamp") or msg.get("ts") or
                                 msg.get("created_at") or msg.get("time"))
                if not raw_timestamp:
                    continue
                try:
                    message_timestamp = parse_ts(str(raw_timestamp))
                except ValueError:
                    continue

                # Tool calls — Claude Code JSONL nests them inside msg["message"]["content"]
                tool_calls = []
                api_response = msg.get("message", {})
                content_blocks = api_response.get("content") if isinstance(api_response, dict) else None
                # Fallback: top-level content (older formats)
                if content_blocks is None:
                    content_blocks = msg.get("content")
                if isinstance(content_blocks, list):
                    for content_block in content_blocks:
                        if isinstance(content_block, dict) and content_block.get("type") == "tool_use":
                            tool_calls.append(content_block)

                for tool_call in tool_calls:
                    tool_name = (tool_call.get("name") or
                                 tool_call.get("function", {}).get("name", ""))
                    if tool_name not in ("Write", "Edit"):
                        continue

                    tool_input = (tool_call.get("input") or
                                  tool_call.get("function", {}).get("arguments") or {})
                    if isinstance(tool_input, str):
                        try:
                            tool_input = json.loads(tool_input)
                        except json.JSONDecodeError:
                            continue

                    file_path = tool_input.get("file_path", "")
                    # Normalize ~ to home
                    file_path = file_path.replace("~", user_home)
                    resolved_file_path = Path(file_path).resolve()

                    # Only include files under source project root.
                    # is_relative_to() is path-aware (not string startswith),
                    # works correctly across OS boundaries.
                    if not resolved_file_path.is_relative_to(source_root_path):
                        continue

                    # Compute relative path; normalize to forward slashes so
                    # WEIGHT_MAP, is_excluded(), and all downstream comparisons
                    # work identically on Linux, macOS, and Windows.
                    relative_path = resolved_file_path.relative_to(source_root_path)
                    relative_path = str(relative_path).replace(os.sep, "/")
                    if is_excluded(relative_path):
                        continue

                    # Assign session by timestamp
                    assigned_session = None
                    for session_num, session_start, session_end, _ in session_windows:
                        if session_start <= message_timestamp <= session_end:
                            assigned_session = session_num
                            break
                    if assigned_session is None:
                        continue   # outside declared session windows

                    operation = {
                        "session":  assigned_session,
                        "ts":       message_timestamp,
                        "tool":     tool_name,
                        "abs_path": file_path,
                        "rel_path": relative_path,
                        "params":   tool_input,
                    }
                    operations.append(operation)

    except FileNotFoundError:
        print(f"ERROR: JSONL file not found: {jsonl_path}", file=sys.stderr)
        sys.exit(1)
    except OSError as exc:
        print(f"ERROR reading JSONL: {exc}", file=sys.stderr)
        sys.exit(1)

    operations.sort(key=lambda o: o["ts"])
    return operations


# ---------------------------------------------------------------------------
# File replay
# ---------------------------------------------------------------------------

def apply_write(target_root: str, relative_path: str, content: str, dry_run: bool) -> None:
    abs_path = Path(target_root) / relative_path
    if dry_run:
        print(f"    [DRY-RUN] Write {relative_path} ({len(content.splitlines())} lines)")
        return
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_text(content, encoding="utf-8")


def apply_edit(target_root: str, relative_path: str, old_string: str, new_string: str,
               replace_all: bool, dry_run: bool) -> None:
    abs_path = Path(target_root) / relative_path
    if dry_run:
        print(f"    [DRY-RUN] Edit {relative_path} (replace_all={replace_all})")
        return
    if not abs_path.exists():
        print(f"  [WARN] Edit target does not exist (skipped): {relative_path}", file=sys.stderr)
        return
    text = abs_path.read_text(encoding="utf-8")
    if replace_all:
        new_text = text.replace(old_string, new_string)
    else:
        if old_string not in text:
            print(f"  [WARN] old_string not found in {relative_path} (skipped)", file=sys.stderr)
            return
        new_text = text.replace(old_string, new_string, 1)
    abs_path.write_text(new_text, encoding="utf-8")


# ---------------------------------------------------------------------------
# Drift scoring
# ---------------------------------------------------------------------------

def compute_drift(target_root: str, reference_root: str,
                  intersection_only: bool) -> tuple[float, list[dict]]:
    """
    Compute weighted drift score between target and reference.

    intersection_only=True  (content_drift / score_A, circuit breaker):
        Intersection-only metric. Excludes both ADDITIVE (files only in target)
        and SUBTRACTIVE (files only in reference). Measures content fidelity on
        files present in both — structurally clean; not inflated by files from
        future sessions not yet written into the reconstruction.

    intersection_only=False (full_tree_drift / score_B, diagnostic):
        Full-tree metric. Includes SUBTRACTIVE. Shows complete divergence picture
        after /cycle has run; delta = full_tree_drift − content_drift reveals what
        /cycle adds or closes. Session 3 full_tree_drift SUBTRACTIVE residue =
        genuine reconstruction gap.

    Returns (drift_score, divergences). Divergences include all types regardless of
    intersection_only — SUBTRACTIVE is always classified and reported, just excluded
    from the circuit-breaker score when intersection_only=True.
    """
    reference_root_path = Path(reference_root)
    target_root_path = Path(target_root)

    # Collect reference files (excluding gitignored paths).
    # Normalize separators to "/" so keys match WEIGHT_MAP and is_excluded().
    reference_files = {}
    for p in reference_root_path.rglob("*"):
        if p.is_file():
            relative_path = str(p.relative_to(reference_root_path)).replace(os.sep, "/")
            if not is_excluded(relative_path) and ".git" not in relative_path.split("/"):
                reference_files[relative_path] = p.read_text(encoding="utf-8", errors="replace")

    # Collect target files
    target_files = {}
    for p in target_root_path.rglob("*"):
        if p.is_file():
            relative_path = str(p.relative_to(target_root_path)).replace(os.sep, "/")
            if ".git" not in relative_path.split("/"):
                target_files[relative_path] = p.read_text(encoding="utf-8", errors="replace")

    divergences = []
    drift_score = 0.0

    all_relative_paths = set(reference_files.keys()) | set(target_files.keys())
    for relative_path in sorted(all_relative_paths):
        in_reference = relative_path in reference_files
        in_target = relative_path in target_files
        file_weight = weight_for(relative_path)

        if in_reference and not in_target:
            divergences.append({"type": "SUBTRACTIVE", "file": relative_path,
                                 "weight": file_weight,
                                 "description": "file in reference, missing from reconstruction"})
            if not intersection_only:
                # full_tree_drift only: SUBTRACTIVE contributes to diagnostic score.
                # Excluded from content_drift (intersection_only=True) — future-session
                # files not yet written are structurally absent, not content errors.
                # Including them in the circuit-breaker score would inflate Session 1
                # content_drift with every file written in Sessions 2–4, making the
                # threshold meaningless as a content-fidelity signal.
                drift_score += file_weight * 1.0
        elif in_target and not in_reference:
            divergences.append({"type": "ADDITIVE", "file": relative_path,
                                 "weight": file_weight,
                                 "description": "file in reconstruction, not in reference"})
            if not intersection_only:
                # Additive files are informational — partial score
                drift_score += file_weight * 0.5
        else:
            content_divergence_fraction = line_diff_fraction(
                reference_files[relative_path], target_files[relative_path]
            )
            if content_divergence_fraction > 0:
                divergences.append({"type": "SUBSTITUTIVE", "file": relative_path,
                                     "weight": file_weight,
                                     "description": f"content differs ({content_divergence_fraction:.1%} of lines)"})
                drift_score += file_weight * content_divergence_fraction

    return drift_score, divergences


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def git_run(args: list[str], cwd: str, dry_run: bool, capture: bool = False):
    if dry_run:
        print(f"    [DRY-RUN] git {' '.join(args)}")
        return ""
    result = subprocess.run(["git"] + args, cwd=cwd, capture_output=capture, text=True)
    if result.returncode != 0 and not capture:
        print(f"  [WARN] git {' '.join(args)} exited {result.returncode}", file=sys.stderr)
    return result.stdout.strip() if capture else ""


def git_commit_session(target_root: str, session_num: int, session_files: set[str],
                       session_end_ts: datetime, summary: str, dry_run: bool) -> None:
    # Stage only files changed in this session
    for relative_path in session_files:
        git_run(["add", relative_path], cwd=target_root, dry_run=dry_run)

    commit_date = session_end_ts.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    commit_message = (f"[RECONSTRUCTED from JSONL {JSONL_SOURCE_ID} session {session_num}] "
                      f"Session {session_num}: {summary}")
    git_run(["commit", f"--date={commit_date}",
             "--author=Reconstruction Script <reconstruct@psychology.local>",
             "-m", commit_message],
            cwd=target_root, dry_run=dry_run)


# ---------------------------------------------------------------------------
# Divergence report
# ---------------------------------------------------------------------------

def write_divergence_report(report_path: str, session_num: int,
                             content_drift: float, term_threshold: float,
                             divergences: list[dict],
                             template_path: Optional[str] = None) -> None:
    lines = [
        "# Divergence Report — Reconstruction Halted",
        "",
        f"**Session:** {session_num}  ",
        f"**score_A (content_drift):** {content_drift:.4f}  ",
        f"**Threshold:** {term_threshold:.4f}  ",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        "",
        "---",
        "",
        "## Per-File Divergences",
        "",
        "| Type | File | Weight | Description |",
        "|------|------|--------|-------------|",
    ]
    for divergence in divergences:
        lines.append(
            f"| {divergence['type']} | `{divergence['file']}` "
            f"| {divergence['weight']} | {divergence['description']} |"
        )

    lines += [
        "",
        "---",
        "",
        "## Decision Point",
        "",
        "```",
        f"RECONSTRUCTION HALTED — Session {session_num}, "
        f"score_A = {content_drift:.4f} (threshold: {term_threshold:.4f})",
        "",
        "Options:",
        "  A) Accept and continue — annotate commits [DRIFT-ACCEPTED]",
        f"  B) Resolve divergences manually and resume from Session {session_num}",
        f"  C) Abort — keep Sessions 1..{session_num - 1}, discard partial",
        "  D) Escalate — route SUBSTITUTIVE divergences to adversarial evaluator",
        "```",
        "",
        "## Recommendation",
        "",
        "Review SUBSTITUTIVE divergences first — these represent genuine content",
        "differences and are the primary input to the adversarial evaluator.",
        "ADDITIVE divergences are usually artifacts of /cycle or reconstruction metadata.",
        "SUBTRACTIVE divergences indicate missing content and warrant manual review.",
    ]

    Path(report_path).parent.mkdir(parents=True, exist_ok=True)
    Path(report_path).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  Divergence report written: {report_path}")


# ---------------------------------------------------------------------------
# Main reconstruction loop
# ---------------------------------------------------------------------------

def reconstruct(args: argparse.Namespace) -> int:
    jsonl_path       = args.jsonl
    reference_root   = str(Path(args.reference).expanduser().resolve())
    target_root      = str(Path(args.target).expanduser().resolve())
    # source_root: project path as it appeared in the JSONL (originating machine).
    # Defaults to --reference for same-machine runs; specify explicitly for
    # cross-machine use (Mac, Windows) where originating paths differ.
    source_root      = args.source_root or args.reference
    dry_run          = args.dry_run
    filter_session   = args.session
    warning_threshold = args.warning_threshold
    term_threshold   = args.threshold

    print(f"=== reconstruct.py ===")
    print(f"  JSONL:       {jsonl_path}")
    print(f"  Source root: {source_root}  (JSONL path prefix)")
    print(f"  Reference:   {reference_root}  (drift comparison)")
    print(f"  Target:      {target_root}")
    print(f"  Dry-run:     {dry_run}")
    print(f"  Session:     {filter_session or 'all'}")
    print()

    # Parse JSONL
    print("Parsing JSONL...")
    operations = extract_operations(jsonl_path, source_root)
    print(f"  {len(operations)} Write/Edit operations extracted across all sessions")
    for session_num, _, _, summary in SESSION_BOUNDARIES:
        count = sum(1 for op in operations if op["session"] == session_num)
        print(f"  Session {session_num}: {count} operations  ({summary})")
    print()

    if dry_run:
        # In dry-run mode: show operations only, no git, no writes
        for session_num, _, _, summary in SESSION_BOUNDARIES:
            if filter_session and session_num != filter_session:
                continue
            session_ops = [op for op in operations if op["session"] == session_num]
            print(f"--- Session {session_num}: {summary} ({len(session_ops)} ops) ---")
            for operation in session_ops:
                print(f"  {operation['tool']:5s}  {operation['rel_path']}")
        return 0

    # Initialize target directory
    target_path = Path(target_root)
    if target_path.exists():
        non_git_contents = [p for p in target_path.iterdir() if p.name != ".git"]
        if non_git_contents:
            print(f"ERROR: target directory has non-git content: {target_root}", file=sys.stderr)
            print("  Delete or choose a new path.", file=sys.stderr)
            return 1
    target_path.mkdir(parents=True, exist_ok=True)

    # git init
    git_run(["init"], cwd=target_root, dry_run=False)
    git_run(["config", "user.email", "reconstruct@psychology.local"],
            cwd=target_root, dry_run=False)
    git_run(["config", "user.name", "Reconstruction Script"],
            cwd=target_root, dry_run=False)

    # Write .gitignore
    gitignore_path = target_path / ".gitignore"
    gitignore_path.write_text(GITIGNORE_CONTENT, encoding="utf-8")
    git_run(["add", ".gitignore"], cwd=target_root, dry_run=False)
    git_run(["commit", "-m", "chore: add .gitignore",
             "--author=Reconstruction Script <reconstruct@psychology.local>"],
            cwd=target_root, dry_run=False)

    # Session 1 empirical calibration state
    session1_content_drift = None
    adjusted_term_threshold = term_threshold

    for session_num, _, session_end_str, session_summary in SESSION_BOUNDARIES:
        if filter_session and session_num != filter_session:
            continue

        session_end_ts = parse_ts(session_end_str)
        session_ops = [op for op in operations if op["session"] == session_num]
        session_files: set[str] = set()

        print(f"--- Session {session_num}: {session_summary} ({len(session_ops)} ops) ---")

        # Replay operations
        for operation in session_ops:
            relative_path = operation["rel_path"]
            tool_name     = operation["tool"]
            params        = operation["params"]
            session_files.add(relative_path)

            if tool_name == "Write":
                apply_write(target_root, relative_path,
                            params.get("content", ""), dry_run=False)
                print(f"  Write  {relative_path}")
            elif tool_name == "Edit":
                apply_edit(target_root, relative_path,
                           params.get("old_string", ""),
                           params.get("new_string", ""),
                           params.get("replace_all", False),
                           dry_run=False)
                print(f"  Edit   {relative_path}")

        # content_drift — intersection-only, circuit breaker
        print(f"  Computing content_drift (intersection-only)...")
        content_drift, content_divergences = compute_drift(
            target_root, reference_root, intersection_only=True
        )
        print(f"  content_drift = {content_drift:.4f}"
              f"  (warn={warning_threshold:.2f}, term={adjusted_term_threshold:.2f})")

        # Session 1 empirical threshold calibration
        if session_num == 1:
            session1_content_drift = content_drift
            if content_drift >= warning_threshold:
                adjusted_term_threshold = max(1.0, 2.0 * content_drift)
                print(f"  [CALIBRATION] Session 1 content_drift={content_drift:.4f}"
                      f" >= warn={warning_threshold:.2f}")
                print(f"  [CALIBRATION] Adjusting term_threshold:"
                      f" {term_threshold:.2f} → {adjusted_term_threshold:.2f}")
                print(f"  [CALIBRATION] Override: pass --threshold {term_threshold:.2f}"
                      f" to keep original")

        # Warning
        if content_drift > warning_threshold:
            print(f"  ⚠ WARNING: content_drift ({content_drift:.4f})"
                  f" exceeds warning threshold ({warning_threshold:.2f})")
            print(f"    Review divergences before continuing.")

        # Termination
        if content_drift > adjusted_term_threshold:
            report_path = str(Path(reference_root) / "reconstruction" / "divergence-report.md")
            print(f"\n  ██ TERMINATION: content_drift ({content_drift:.4f})"
                  f" > threshold ({adjusted_term_threshold:.2f})")
            write_divergence_report(report_path, session_num, content_drift,
                                    adjusted_term_threshold, content_divergences)
            return 2

        # full_tree_drift — includes SUBTRACTIVE, diagnostic only
        full_tree_drift, _ = compute_drift(
            target_root, reference_root, intersection_only=False
        )
        delta = full_tree_drift - content_drift
        print(f"  full_tree_drift = {full_tree_drift:.4f}  delta = {delta:+.4f}")

        # Commit
        if session_files:
            git_commit_session(target_root, session_num, session_files,
                               session_end_ts, session_summary, dry_run=False)
            print(f"  Committed session {session_num}")
        else:
            print(f"  No files to commit for session {session_num}")
        print()

    print("=== Reconstruction complete ===")
    return 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    if sys.version_info < (3, 9):
        print("ERROR: Python 3.9+ required. "
              f"Current: {sys.version_info.major}.{sys.version_info.minor}",
              file=sys.stderr)
        sys.exit(1)

    parser = argparse.ArgumentParser(
        description="Reconstruct psychology project git history from JSONL replay.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--jsonl",       required=True,
                        help="Path to JSONL chat history file")
    parser.add_argument("--reference",   required=True,
                        help="Path to reference project copy on THIS machine (for drift comparison)")
    parser.add_argument("--target",      required=True,
                        help="Path to output reconstruction directory (must not exist or be empty)")
    parser.add_argument("--source-root", default=None,
                        help="Project root as recorded in JSONL (originating machine path). "
                             "Required for cross-machine runs (Mac/Windows). "
                             "Example: --source-root /home/kashif/projects/psychology  "
                             "Defaults to --reference when omitted (same-machine runs).")
    parser.add_argument("--threshold", type=float, default=TERM_THRESHOLD,
                        help=f"Termination drift threshold (default: {TERM_THRESHOLD})")
    parser.add_argument("--warning-threshold", type=float, default=WARNING_THRESHOLD,
                        help=f"Warning drift threshold (default: {WARNING_THRESHOLD})")
    parser.add_argument("--dry-run",   action="store_true",
                        help="Report operations without writing files or committing")
    parser.add_argument("--session",   type=int, choices=[1, 2, 3], default=None,
                        help="Reconstruct only session N (for debugging)")

    args = parser.parse_args()
    sys.exit(reconstruct(args))


if __name__ == "__main__":
    main()

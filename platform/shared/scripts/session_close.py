#!/usr/bin/env python3
"""session_close.py — Auto-close transport sessions when all expected responses arrive.

Scans open sessions for gate_condition "all-agents-respond", checks whether all
targeted agents have responded, and marks the MANIFEST status as "closed" when
the condition has been met.

Usage:
    # Check all open sessions and close any that meet their gate condition
    python3 scripts/session_close.py

    # Check a specific session
    python3 scripts/session_close.py --session self-readiness-audit

    # Dry run — show what would close without writing
    python3 scripts/session_close.py --dry-run

Environment:
    PROJECT_ROOT — agent repo root (required for symlinked scripts)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


def _find_project_root() -> Path:
    """Resolve project root, safe for symlinked shared scripts."""
    env = os.environ.get("PROJECT_ROOT")
    if env:
        return Path(env)
    candidate = Path(__file__).absolute().parent
    for _ in range(5):
        if (candidate / "state.db").exists() or (candidate / ".agent-identity.json").exists():
            return candidate
        candidate = candidate.parent
    return Path(__file__).resolve().parent.parent


PROJECT_ROOT = _find_project_root()
TRANSPORT_DIR = PROJECT_ROOT / "transport" / "sessions"


def _get_open_sessions(target_session: str | None = None) -> list[Path]:
    """Find session directories with open MANIFESTs."""
    sessions = []
    if target_session:
        session_dir = TRANSPORT_DIR / target_session
        if session_dir.exists():
            sessions.append(session_dir)
    else:
        if not TRANSPORT_DIR.exists():
            return []
        for session_dir in sorted(TRANSPORT_DIR.iterdir()):
            if not session_dir.is_dir():
                continue
            manifest_path = session_dir / "MANIFEST.json"
            if manifest_path.exists():
                sessions.append(session_dir)
    return sessions


def _extract_targets_from_manifest(manifest: dict) -> list[str]:
    """Extract target agents from the MANIFEST participants list."""
    participants = manifest.get("participants", [])
    # Exclude 'human' — they don't respond autonomously
    return [p for p in participants if p != "human"]


def _find_broadcast_messages(session_dir: Path) -> list[dict]:
    """Find broadcast/consensus-request messages (the ones expecting responses)."""
    broadcasts = []
    for f in sorted(session_dir.glob("from-human-*.json")):
        try:
            with open(f) as fh:
                msg = json.load(fh)
            gate = msg.get("action_gate", {})
            if gate.get("gate_condition") == "all-agents-respond":
                broadcasts.append(msg)
        except (json.JSONDecodeError, OSError):
            continue
    return broadcasts


def _find_responses(session_dir: Path, targets: list[str]) -> dict[str, bool]:
    """Check which target agents have responded in this session."""
    responded = {agent: False for agent in targets}

    for f in sorted(session_dir.glob("from-*-*.json")):
        match = re.match(r"from-(.+?)-\d+\.json", f.name)
        if not match:
            continue
        sender = match.group(1)
        if sender in responded:
            # Verify it contains substantive content (not just an ACK)
            try:
                with open(f) as fh:
                    msg = json.load(fh)
                msg_type = msg.get("message_type", "")
                if msg_type != "ack":
                    responded[sender] = True
            except (json.JSONDecodeError, OSError):
                continue

    return responded


def check_session(session_dir: Path, dry_run: bool = False) -> bool:
    """Check a single session. Returns True if closed."""
    manifest_path = session_dir / "MANIFEST.json"
    if not manifest_path.exists():
        return False

    with open(manifest_path) as f:
        manifest = json.load(f)

    if manifest.get("status") != "open":
        return False

    session_name = manifest.get("session_id", session_dir.name)

    # Find broadcast messages with all-agents-respond gate
    broadcasts = _find_broadcast_messages(session_dir)
    if not broadcasts:
        return False

    targets = _extract_targets_from_manifest(manifest)
    if not targets:
        return False

    # Check responses
    responded = _find_responses(session_dir, targets)
    all_responded = all(responded.values())

    if not all_responded:
        waiting = [a for a, r in responded.items() if not r]
        print(f"  {session_name}: waiting for {', '.join(waiting)}")
        return False

    # All agents responded — close the session
    if dry_run:
        print(f"  {session_name}: [dry-run] would close (all {len(targets)} agents responded)")
        return False

    manifest["status"] = "closed"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    print(f"  {session_name}: CLOSED (all {len(targets)} agents responded)")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Auto-close transport sessions when gate conditions met"
    )
    parser.add_argument("--session",
                        help="Check a specific session (default: all open)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would close without writing")

    args = parser.parse_args()

    sessions = _get_open_sessions(args.session)
    if not sessions:
        print("No open sessions found")
        return

    closed_count = 0
    for session_dir in sessions:
        if check_session(session_dir, args.dry_run):
            closed_count += 1

    if closed_count > 0:
        print(f"\nClosed {closed_count} session(s)")
    elif not args.session:
        print(f"\nChecked {len(sessions)} session(s), none ready to close")


if __name__ == "__main__":
    main()

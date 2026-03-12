#!/usr/bin/env python3
"""send_broadcast.py — Send a broadcast message to all mesh agents.

Automates the full send workflow:
  1. Generate broadcast JSON + per-agent Convention B addressed copies
  2. Update MANIFEST.json
  3. Index in local state.db (unprocessed)
  4. Commit + push
  5. SSH to chromabook: pull, materialize on peers, index as unprocessed

The only manual step: writing the message content (subject + body).

Usage:
    # Interactive — prompts for subject and body
    python3 scripts/send_broadcast.py --session self-readiness-audit

    # Non-interactive — subject and body from args
    python3 scripts/send_broadcast.py --session self-readiness-audit \
        --subject "Round 2 — re-evaluate" \
        --body "Please re-run your self-readiness audit."

    # From file
    python3 scripts/send_broadcast.py --session self-readiness-audit \
        --subject "Round 2" --body-file /tmp/body.txt

    # Target specific agents instead of broadcast
    python3 scripts/send_broadcast.py --session psq-scoring \
        --to psq-agent --subject "Calibration request"

    # Skip deploy (commit+push only, no SSH materialize)
    python3 scripts/send_broadcast.py --session test --subject "Test" \
        --body "Hello" --no-deploy

    # Dry run — show what would happen without writing anything
    python3 scripts/send_broadcast.py --session test --subject "Test" \
        --body "Hello" --dry-run

Environment:
    PROJECT_ROOT — agent repo root (default: git rev-parse --show-toplevel)
    DEPLOY_HOST  — SSH host for chromabook (default: chromabook)
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _find_project_root() -> Path:
    """Resolve project root."""
    env = os.environ.get("PROJECT_ROOT")
    if env:
        return Path(env)
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        return Path(result.stdout.strip())
    return Path(__file__).resolve().parent.parent


PROJECT_ROOT = _find_project_root()
DB_PATH = PROJECT_ROOT / "state.db"
TRANSPORT_DIR = PROJECT_ROOT / "transport" / "sessions"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"


def _load_registry() -> dict:
    """Load agent registry and return the agents dict."""
    with open(REGISTRY_PATH) as f:
        return json.load(f).get("agents", {})


def _get_my_agent_id() -> str:
    """Read local agent identity."""
    identity_path = PROJECT_ROOT / ".agent-identity.json"
    if identity_path.exists():
        with open(identity_path) as f:
            return json.load(f).get("agent_id", "human")
    return "human"


def _get_next_turn(session: str) -> int:
    """Get next turn number from state.db or file count."""
    if DB_PATH.exists():
        result = subprocess.run(
            [sys.executable, str(PROJECT_ROOT / "scripts" / "dual_write.py"),
             "next-turn", "--session", session],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            try:
                return int(result.stdout.strip())
            except ValueError:
                pass
    # Fallback: count files in session dir
    session_dir = TRANSPORT_DIR / session
    if session_dir.exists():
        return len(list(session_dir.glob("*.json")))
    return 1


def _get_next_sequence(session: str, prefix: str) -> int:
    """Get next sequence number for a filename prefix in a session."""
    session_dir = TRANSPORT_DIR / session
    if not session_dir.exists():
        return 1
    existing = []
    for f in session_dir.glob(f"{prefix}*.json"):
        seq_part = f.stem[len(prefix):]
        try:
            existing.append(int(seq_part))
        except ValueError:
            continue
    return max(existing, default=0) + 1


def _resolve_targets(args, registry: dict) -> list[str]:
    """Determine target agent IDs."""
    if args.to:
        return args.to
    # Broadcast: all agents except human and claude-control
    return [
        agent_id for agent_id, config in registry.items()
        if config.get("autonomous", False) and agent_id != _get_my_agent_id()
    ]


def _build_message(args, turn: int, targets: list[str]) -> dict:
    """Build the broadcast message JSON."""
    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    my_id = _get_my_agent_id()

    body = args.body or ""
    if args.body_file:
        body = Path(args.body_file).read_text().strip()

    msg = {
        "schema": "interagent/v1",
        "session_id": args.session,
        "turn": turn,
        "timestamp": timestamp,
        "message_type": args.message_type,
        "from": {
            "agent_id": my_id,
            "role": "operator"
        },
        "to": {
            "agent_id": "all-agents" if len(targets) > 1 else targets[0],
            "role": "broadcast" if len(targets) > 1 else "addressed"
        },
        "content": {
            "subject": args.subject,
            "body": body
        },
        "action_gate": {
            "gate_condition": "all-agents-respond" if args.ack else "none",
            "gate_status": "open"
        },
        "ack_required": args.ack,
        "urgency": args.urgency,
        "setl": 0.03,
        "epistemic_flags": []
    }
    return msg


def _write_files(session: str, msg: dict, targets: list[str],
                 turn: int, dry_run: bool = False) -> list[str]:
    """Write broadcast + addressed copies. Returns list of filenames created."""
    session_dir = TRANSPORT_DIR / session
    session_dir.mkdir(parents=True, exist_ok=True)

    my_id = msg["from"]["agent_id"]
    seq = _get_next_sequence(session, f"from-{my_id}-")
    broadcast_filename = f"from-{my_id}-{seq:03d}.json"
    filenames = [broadcast_filename]

    if dry_run:
        print(f"  [dry-run] Would write: {session}/{broadcast_filename}")
    else:
        with open(session_dir / broadcast_filename, "w") as f:
            json.dump(msg, f, indent=2)
            f.write("\n")
        print(f"  wrote: {session}/{broadcast_filename}")

    # Per-agent addressed copies (Convention B)
    for agent_id in targets:
        copy = json.loads(json.dumps(msg))  # deep copy
        copy["to"] = {"agent_id": agent_id, "role": "addressed-copy"}
        copy["content"]["subject"] = msg["content"]["subject"] + " (addressed copy)"

        agent_seq = _get_next_sequence(session, f"to-{agent_id}-")
        copy_filename = f"to-{agent_id}-{agent_seq:03d}.json"
        filenames.append(copy_filename)

        if dry_run:
            print(f"  [dry-run] Would write: {session}/{copy_filename}")
        else:
            with open(session_dir / copy_filename, "w") as f:
                json.dump(copy, f, indent=2)
                f.write("\n")
            print(f"  wrote: {session}/{copy_filename}")

    return filenames


def _update_manifest(session: str, filenames: list[str], msg: dict,
                     targets: list[str], dry_run: bool = False):
    """Update MANIFEST.json with new message entries."""
    manifest_path = TRANSPORT_DIR / session / "MANIFEST.json"

    if manifest_path.exists():
        with open(manifest_path) as f:
            manifest = json.load(f)
    else:
        manifest = {
            "session_id": session,
            "created": msg["timestamp"],
            "purpose": msg["content"]["subject"],
            "participants": [msg["from"]["agent_id"]] + targets,
            "messages": [],
            "status": "open"
        }

    for filename in filenames:
        entry = {
            "filename": filename,
            "turn": msg["turn"],
            "from": msg["from"]["agent_id"],
            "subject": msg["content"]["subject"]
        }
        # Add "to" for addressed copies
        if filename.startswith("to-"):
            agent_id = filename.split("-", 1)[1].rsplit("-", 1)[0]
            entry["to"] = agent_id
        manifest["messages"].append(entry)

    # Ensure status is open
    manifest["status"] = "open"

    if dry_run:
        print(f"  [dry-run] Would update MANIFEST.json ({len(filenames)} entries)")
    else:
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
            f.write("\n")
        print(f"  updated: {session}/MANIFEST.json")


def _index_in_db(session: str, filenames: list[str], msg: dict,
                 dry_run: bool = False):
    """Index messages in local state.db as unprocessed."""
    if not DB_PATH.exists():
        print("  skip: state.db not found")
        return

    dual_write = PROJECT_ROOT / "scripts" / "dual_write.py"
    if not dual_write.exists():
        dual_write = PROJECT_ROOT / "platform" / "shared" / "scripts" / "dual_write.py"

    from_agent = msg["from"]["agent_id"]
    to_agent = msg["to"]["agent_id"]
    content = msg.get("content", msg.get("payload", {}))

    for filename in filenames:
        # Determine to_agent for addressed copies
        file_to = to_agent
        if filename.startswith("to-"):
            file_to = filename.split("-", 1)[1].rsplit("-", 1)[0]

        if dry_run:
            print(f"  [dry-run] Would index: {filename}")
            continue

        subprocess.run([
            sys.executable, str(dual_write), "transport-message",
            "--session", session,
            "--filename", filename,
            "--turn", str(msg["turn"]),
            "--type", msg.get("message_type", "unknown"),
            "--from-agent", from_agent,
            "--to-agent", file_to,
            "--timestamp", msg["timestamp"],
            "--subject", content.get("subject", ""),
        ], capture_output=True, text=True)

    # Mark all as unprocessed (dual_write defaults to processed=FALSE already)
    print(f"  indexed: {len(filenames)} messages in state.db")


def _git_commit_push(session: str, filenames: list[str], subject: str,
                     dry_run: bool = False):
    """Commit and push the new messages."""
    if dry_run:
        print(f"  [dry-run] Would commit + push {len(filenames)} files")
        return

    # Stage files
    session_dir = f"transport/sessions/{session}/"
    subprocess.run(["git", "add", session_dir], capture_output=True, text=True,
                   cwd=str(PROJECT_ROOT))

    # Commit
    commit_msg = f"transport: {session} — {subject}\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
    result = subprocess.run(
        ["git", "commit", "-m", commit_msg],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT)
    )
    if result.returncode != 0:
        print(f"  commit failed: {result.stderr[:200]}", file=sys.stderr)
        return

    # Push (with rebase retry)
    push = subprocess.run(
        ["git", "push"], capture_output=True, text=True, cwd=str(PROJECT_ROOT)
    )
    if push.returncode != 0:
        subprocess.run(
            ["git", "pull", "--rebase"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT)
        )
        push = subprocess.run(
            ["git", "push"], capture_output=True, text=True, cwd=str(PROJECT_ROOT)
        )
    if push.returncode == 0:
        print("  committed + pushed")
    else:
        print(f"  push failed: {push.stderr[:200]}", file=sys.stderr)


def _deploy_to_peers(session: str, registry: dict, targets: list[str],
                     dry_run: bool = False):
    """SSH to chromabook: pull, materialize, index as unprocessed."""
    deploy_host = os.environ.get("DEPLOY_HOST", "chromabook")

    if dry_run:
        print(f"  [dry-run] Would deploy to {deploy_host}")
        return

    # Map agent_id to project directory on chromabook
    agent_projects = {
        "psychology-agent": "psychology",
        "psq-agent": "psychology/safety-quotient",
        "unratified-agent": "unratified",
        "observatory-agent": "observatory",
    }

    # Pull on psychology (source repo)
    print(f"  deploying to {deploy_host}...")
    subprocess.run(
        ["ssh", deploy_host,
         "cd ~/projects/psychology && git pull --quiet"],
        capture_output=True, text=True, timeout=30
    )

    # Materialize on each target peer
    for agent_id in targets:
        proj = agent_projects.get(agent_id)
        if not proj:
            print(f"    skip {agent_id}: no project mapping")
            continue

        # Force cross-repo-fetch to materialize
        result = subprocess.run(
            ["ssh", deploy_host,
             f"cd ~/projects/{proj} && "
             f"PROJECT_ROOT=~/projects/{proj} "
             f"python3 scripts/cross_repo_fetch.py "
             f"--materialize --force --agent psychology-agent 2>&1 "
             f"| grep -i '{session}' | head -5"],
            capture_output=True, text=True, timeout=60
        )
        if result.stdout.strip():
            for line in result.stdout.strip().split("\n"):
                print(f"    {agent_id}: {line.strip()}")

        # Index the materialized message as unprocessed
        # Find the materialized filename (Convention B: to-{agent}-NNN or from-human-NNN)
        index_result = subprocess.run(
            ["ssh", deploy_host,
             f"cd ~/projects/{proj} && "
             f"ls transport/sessions/{session}/to-{agent_id}-*.json "
             f"   transport/sessions/{session}/from-human-*.json 2>/dev/null "
             f"| sort | tail -1"],
            capture_output=True, text=True, timeout=10
        )
        latest_file = index_result.stdout.strip()
        if latest_file:
            basename = Path(latest_file).name
            subprocess.run(
                ["ssh", deploy_host,
                 f"cd ~/projects/{proj} && sqlite3 state.db \""
                 f"INSERT OR IGNORE INTO transport_messages "
                 f"(session_name, filename, turn, message_type, from_agent, to_agent, "
                 f"timestamp, subject, processed) "
                 f"VALUES ('{session}', '{basename}', "
                 f"(SELECT COALESCE(MAX(turn),0)+1 FROM transport_messages "
                 f" WHERE session_name='{session}'), "
                 f"'consensus-request', 'human', '{agent_id}', "
                 f"datetime('now','localtime'), 'broadcast', 0);\""],
                capture_output=True, text=True, timeout=10
            )
            print(f"    {agent_id}: indexed {basename} (unprocessed)")
        else:
            print(f"    {agent_id}: no materialized file found")


def main():
    parser = argparse.ArgumentParser(
        description="Send a broadcast message to mesh agents"
    )
    parser.add_argument("--session", required=True,
                        help="Transport session name")
    parser.add_argument("--subject", required=True,
                        help="Message subject line")
    parser.add_argument("--body", default="",
                        help="Message body text")
    parser.add_argument("--body-file",
                        help="Read body from file instead of --body")
    parser.add_argument("--to", nargs="+",
                        help="Target agent(s). Omit for broadcast to all.")
    parser.add_argument("--message-type", default="consensus-request",
                        help="Message type (default: consensus-request)")
    parser.add_argument("--urgency", default="normal",
                        choices=["immediate", "high", "normal", "low"])
    parser.add_argument("--ack", action="store_true",
                        help="Require ACK from recipients")
    parser.add_argument("--no-deploy", action="store_true",
                        help="Skip SSH deploy to chromabook peers")
    parser.add_argument("--no-commit", action="store_true",
                        help="Skip git commit+push (write files only)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without writing")

    args = parser.parse_args()

    if not args.body and not args.body_file:
        print("ERROR: provide --body or --body-file", file=sys.stderr)
        sys.exit(1)

    registry = _load_registry()
    targets = _resolve_targets(args, registry)
    turn = _get_next_turn(args.session)

    print(f"\nBroadcast: {args.session} (turn {turn})")
    print(f"  subject: {args.subject}")
    print(f"  targets: {', '.join(targets)}")
    print(f"  urgency: {args.urgency}")
    print()

    # Step 1: Build message
    msg = _build_message(args, turn, targets)

    # Step 2: Write files
    print("Step 1: Write transport files")
    filenames = _write_files(args.session, msg, targets, turn, args.dry_run)

    # Step 3: Update MANIFEST
    print("\nStep 2: Update MANIFEST")
    _update_manifest(args.session, filenames, msg, targets, args.dry_run)

    # Step 4: Index in state.db
    print("\nStep 3: Index in state.db")
    _index_in_db(args.session, filenames, msg, args.dry_run)

    # Step 5: Commit + push
    if not args.no_commit:
        print("\nStep 4: Commit + push")
        _git_commit_push(args.session, filenames, args.subject, args.dry_run)

    # Step 6: Deploy to peers
    if not args.no_deploy and not args.no_commit:
        print("\nStep 5: Deploy to peers")
        _deploy_to_peers(args.session, registry, targets, args.dry_run)

    print(f"\nDone. {len(filenames)} files written, "
          f"{len(targets)} agents targeted.")


if __name__ == "__main__":
    main()

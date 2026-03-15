#!/usr/bin/env python3
"""
draft-transport.py — Generate interagent/v1 transport message from minimal input.

Eliminates 40-70 lines of manual JSON construction per message.
Reads agent identity, computes next turn number, fills all required
fields from conventions.

Usage:
    python3 scripts/draft-transport.py \
      --to operations-agent \
      --session cognitive-tempo-model \
      --type proposal \
      --subject "Self-oscillation spec for meshd" \
      --urgency high

    python3 scripts/draft-transport.py \
      --to unratified-agent \
      --session deferred-followups \
      --type ack \
      --subject "AR rubric path confirmed" \
      --in-response-to from-unratified-agent-001.json

    # Pipe body from stdin:
    echo '{"summary": "..."}' | python3 scripts/draft-transport.py \
      --to operations-agent --session self-oscillation --type proposal \
      --subject "..." --body-stdin
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"
SESSIONS_DIR = PROJECT_ROOT / "transport" / "sessions"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"


def load_identity() -> dict:
    if IDENTITY_PATH.exists():
        return json.loads(IDENTITY_PATH.read_text())
    return {"agent_id": "psychology-agent"}


def load_registry() -> dict:
    if REGISTRY_PATH.exists():
        return json.loads(REGISTRY_PATH.read_text())
    return {"agents": {}}


def get_discovery_url(agent_id: str, registry: dict) -> str | None:
    agent = registry.get("agents", {}).get(agent_id, {})
    return agent.get("discovery_url")


def compute_next_turn(session_dir: Path, from_prefix: str) -> int:
    """Compute next turn number from existing files in session directory."""
    if not session_dir.exists():
        return 1

    max_turn = 0
    for f in session_dir.glob("*.json"):
        if f.name == "MANIFEST.json":
            continue
        try:
            msg = json.loads(f.read_text())
            turn = msg.get("turn", 0)
            if isinstance(turn, int) and turn > max_turn:
                max_turn = turn
        except (json.JSONDecodeError, OSError):
            continue

    return max_turn + 1


def compute_filename(session_dir: Path, agent_id: str) -> str:
    """Compute next filename: from-{agent_id}-{NNN}.json"""
    prefix = f"from-{agent_id}-"
    existing = sorted(session_dir.glob(f"{prefix}*.json")) if session_dir.exists() else []

    max_seq = 0
    for f in existing:
        stem = f.stem.replace(prefix, "")
        try:
            seq = int(stem)
            if seq > max_seq:
                max_seq = seq
        except ValueError:
            continue

    return f"{prefix}{max_seq + 1:03d}.json"


def main():
    parser = argparse.ArgumentParser(description="Draft interagent/v1 transport message")
    parser.add_argument("--to", required=True, help="Target agent_id")
    parser.add_argument("--session", required=True, help="Session ID")
    parser.add_argument("--type", required=True, help="Message type (ack, request, proposal, notification, response, directive)")
    parser.add_argument("--subject", required=True, help="Subject line")
    parser.add_argument("--urgency", default="normal", choices=["immediate", "high", "normal", "low"])
    parser.add_argument("--setl", type=float, default=0.05, help="Epistemic transparency score")
    parser.add_argument("--in-response-to", default=None, help="Filename this responds to")
    parser.add_argument("--ack-required", action="store_true", help="Require ACK from receiver")
    parser.add_argument("--gate", default=None, help="Gate condition (sets gate_status to open)")
    parser.add_argument("--body-stdin", action="store_true", help="Read body JSON from stdin")
    parser.add_argument("--body", default=None, help="Body as JSON string")
    parser.add_argument("--dry-run", action="store_true", help="Print to stdout instead of writing file")
    args = parser.parse_args()

    identity = load_identity()
    registry = load_registry()
    agent_id = identity.get("agent_id", "psychology-agent")

    # For transport, use the canonical agent name (not the session identity)
    # psy-session writes as psychology-agent in transport
    from_agent_id = "psychology-agent" if agent_id.startswith("psy-") else agent_id

    session_dir = SESSIONS_DIR / args.session
    turn = compute_next_turn(session_dir, f"from-{from_agent_id}-")
    filename = compute_filename(session_dir, from_agent_id)

    # Build body
    body = {}
    if args.body_stdin:
        body = json.load(sys.stdin)
    elif args.body:
        body = json.loads(args.body)

    # Build message
    message = {
        "schema": "interagent/v1",
        "session_id": args.session,
        "turn": turn,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "message_type": args.type,
    }

    if args.in_response_to:
        message["in_response_to"] = args.in_response_to

    message["from"] = {
        "agent_id": from_agent_id,
        "role": "psychology-agent",
        "instance": "Claude Code (Opus 4.6), macOS arm64",
        "schemas_supported": ["interagent/v1"],
        "discovery_url": "https://psychology-agent.safety-quotient.dev/.well-known/agent-card.json",
    }

    message["to"] = {
        "agent_id": args.to,
        "discovery_url": get_discovery_url(args.to, registry),
    }

    message["subject"] = args.subject
    message["urgency"] = args.urgency
    message["setl"] = args.setl

    if body:
        message["body"] = body

    message["action_gate"] = {
        "gate_condition": args.gate or "none",
        "gate_status": "open",
    }

    message["ack_required"] = args.ack_required
    message["epistemic_flags"] = []

    # Output
    output = json.dumps(message, indent=2, ensure_ascii=False) + "\n"

    if args.dry_run:
        print(output)
        print(f"\n# Would write to: {session_dir / filename}", file=sys.stderr)
    else:
        session_dir.mkdir(parents=True, exist_ok=True)
        filepath = session_dir / filename
        filepath.write_text(output)
        print(f"Wrote: {filepath}")
        print(f"Turn: {turn}, File: {filename}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""cross_repo_fetch.py — Read transport state from a cross-repo-fetch peer.

Fetches the remote, reads MANIFEST.json (if present) and session directories
via `git show`, and reports new/unprocessed messages compared to local state.db.

Usage:
    python3 scripts/cross_repo_fetch.py                    # all cross-repo-fetch agents
    python3 scripts/cross_repo_fetch.py --agent psq-agent  # single agent
    python3 scripts/cross_repo_fetch.py --index             # also index new messages in state.db
    python3 scripts/cross_repo_fetch.py --json              # JSON output (for orientation payload)
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"
REGISTRY_LOCAL_PATH = PROJECT_ROOT / "transport" / "agent-registry.local.json"
DB_PATH = PROJECT_ROOT / "state.db"

# Adaptive sync frequency — peers classified by recency of last exchange.
# Active: unprocessed messages or exchange within WARM_THRESHOLD → always fetch.
# Warm: exchange within COLD_THRESHOLD → fetch (default cron handles this).
# Cold: no exchange beyond COLD_THRESHOLD → skip fetch unless --force.
WARM_THRESHOLD_HOURS = 1
COLD_THRESHOLD_HOURS = 24


def run_git(*args: str) -> tuple[int, str]:
    """Run a git command and return (returncode, stdout)."""
    result = subprocess.run(
        ["git", *args],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout.strip()


def fetch_remote(remote_name: str) -> bool:
    """Fetch the remote. Returns True on success."""
    code, output = run_git("fetch", remote_name, "main")
    if code != 0:
        print(f"  WARNING: git fetch {remote_name} failed", file=sys.stderr)
        return False
    return True


def read_remote_file(remote_name: str, path: str) -> str | None:
    """Read a file from the remote via git show."""
    code, content = run_git("show", f"{remote_name}/main:{path}")
    if code != 0:
        return None
    return content


def list_remote_dir(remote_name: str, path: str) -> list[str]:
    """List files in a remote directory via git show."""
    code, output = run_git("show", f"{remote_name}/main:{path}/")
    if code != 0:
        return []
    # git show on a tree prints "tree {ref}:{path}\n\nfile1\nfile2\n..."
    lines = output.split("\n")
    # Skip the "tree ..." header line
    files = [line.strip() for line in lines if line.strip() and not line.startswith("tree ")]
    return files


def get_indexed_filenames(db_path: Path, session_name: str) -> set[str]:
    """Get filenames already indexed in state.db for a session."""
    if not db_path.exists():
        return set()
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.execute(
            "SELECT filename FROM transport_messages WHERE session_name = ?",
            (session_name,),
        )
        filenames = {row[0] for row in cursor.fetchall()}
        conn.close()
        return filenames
    except sqlite3.OperationalError:
        return set()


def classify_peer_activity(agent_id: str, agent_config: dict) -> str:
    """Classify a peer as 'active', 'warm', or 'cold' based on state.db.

    Active: unprocessed inbound messages exist, or active gates involve this agent.
    Warm: last exchange within COLD_THRESHOLD_HOURS.
    Cold: no exchange beyond COLD_THRESHOLD_HOURS (or no exchange at all).
    """
    if not DB_PATH.exists():
        return "active"  # No DB = can't classify, assume active

    # Build list of agent ID patterns to match (agent may appear as
    # psq-agent, psq-sub-agent, etc. in from_agent/to_agent columns)
    agent_patterns = [agent_id]
    message_prefix = agent_config.get("message_prefix", "")
    # Extract the agent name from message_prefix (strip leading "from-" and trailing "-")
    if message_prefix.startswith("from-"):
        extracted = message_prefix[5:].rstrip("-")
        if extracted and extracted != agent_id:
            agent_patterns.append(extracted)

    try:
        conn = sqlite3.connect(str(DB_PATH))

        # Check for unprocessed messages from this agent
        for pattern in agent_patterns:
            unprocessed = conn.execute(
                "SELECT COUNT(*) FROM transport_messages "
                "WHERE from_agent = ? AND processed = FALSE",
                (pattern,)
            ).fetchone()[0]
            if unprocessed > 0:
                conn.close()
                return "active"

        # Check for active gates involving this agent
        try:
            for pattern in agent_patterns:
                active_gates = conn.execute(
                    "SELECT COUNT(*) FROM active_gates "
                    "WHERE status = 'waiting' "
                    "AND (sending_agent = ? OR receiving_agent = ?)",
                    (pattern, pattern)
                ).fetchone()[0]
                if active_gates > 0:
                    conn.close()
                    return "active"
        except sqlite3.OperationalError:
            pass  # active_gates table may not exist

        # Check recency of last exchange — match any agent pattern
        placeholders = " OR ".join(
            ["from_agent = ? OR to_agent = ?"] * len(agent_patterns)
        )
        params = []
        for p in agent_patterns:
            params.extend([p, p])
        row = conn.execute(
            f"SELECT MAX(timestamp) FROM transport_messages WHERE {placeholders}",
            params
        ).fetchone()
        conn.close()

        if row[0] is None:
            return "cold"

        # Parse the timestamp — handle various ISO 8601 formats
        last_ts = row[0]
        try:
            # Try with timezone offset (e.g., 2026-03-10T10:52:35-05:00)
            last_dt = datetime.fromisoformat(last_ts)
            now = datetime.now(last_dt.tzinfo) if last_dt.tzinfo else datetime.now()
        except (ValueError, TypeError):
            return "warm"  # Can't parse = assume warm (don't skip)

        elapsed = now - last_dt
        if elapsed < timedelta(hours=COLD_THRESHOLD_HOURS):
            return "warm"
        return "cold"

    except sqlite3.OperationalError:
        return "active"  # DB error = can't classify, assume active


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base (override wins on conflicts)."""
    merged = base.copy()
    for key, value in override.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_registry() -> dict:
    """Load agent registry, merging local overrides if present."""
    with open(REGISTRY_PATH) as f:
        registry = json.load(f)
    if REGISTRY_LOCAL_PATH.exists():
        try:
            with open(REGISTRY_LOCAL_PATH) as f:
                local = json.load(f)
            registry = _deep_merge(registry, local)
        except (json.JSONDecodeError, OSError):
            pass
    return registry


def scan_agent(agent_id: str, agent_config: dict, index: bool = False,
               force: bool = False) -> dict:
    """Scan a cross-repo-fetch agent for new messages.

    Returns a dict with scan results. Skips cold peers unless force=True.
    """
    remote_name = agent_config.get("remote_name")
    if not remote_name:
        return {"agent_id": agent_id, "error": "no remote_name configured"}

    message_prefix = agent_config.get("message_prefix", "")

    # Adaptive sync: classify peer activity and skip cold peers
    activity_tier = classify_peer_activity(agent_id, agent_config)

    result = {
        "agent_id": agent_id,
        "remote_name": remote_name,
        "activity_tier": activity_tier,
        "fetch_ok": False,
        "manifest_found": False,
        "sessions_scanned": [],
        "new_messages": [],
        "errors": [],
    }

    if activity_tier == "cold" and not force:
        result["skipped"] = True
        result["skip_reason"] = (
            f"cold peer — no exchange within {COLD_THRESHOLD_HOURS}h, "
            "no unprocessed messages, no active gates"
        )
        return result

    # Fetch the remote
    if not fetch_remote(remote_name):
        result["errors"].append(f"git fetch {remote_name} failed")
        return result
    result["fetch_ok"] = True

    # Try reading MANIFEST.json
    manifest_path = agent_config.get("manifest_path", "transport/MANIFEST.json")
    manifest_content = read_remote_file(remote_name, manifest_path)
    if manifest_content:
        result["manifest_found"] = True
        try:
            result["manifest"] = json.loads(manifest_content)
        except json.JSONDecodeError:
            result["errors"].append("MANIFEST.json parse error")

    # Scan active sessions
    sessions_path = agent_config.get("sessions_path", "transport/sessions/")
    message_prefix = agent_config.get("message_prefix", "")
    active_sessions = agent_config.get("active_sessions", [])

    # Also discover sessions from the remote directory
    remote_sessions = list_remote_dir(remote_name, sessions_path.rstrip("/"))
    all_sessions = set(active_sessions) | set(remote_sessions)

    for session_name in sorted(all_sessions):
        session_path = f"{sessions_path.rstrip('/')}/{session_name}"
        files = list_remote_dir(remote_name, session_path)
        if not files:
            continue

        # Filter to messages from this agent (using message_prefix)
        inbound_files = [f for f in files if f.startswith(message_prefix)]

        # Compare against indexed filenames
        indexed = get_indexed_filenames(DB_PATH, session_name)

        new_files = [f for f in inbound_files if f not in indexed]

        session_result = {
            "session_name": session_name,
            "total_files": len(files),
            "inbound_files": len(inbound_files),
            "new_files": len(new_files),
            "new_filenames": new_files,
        }
        result["sessions_scanned"].append(session_result)

        # Read new message contents
        for filename in new_files:
            file_path = f"{session_path}/{filename}"
            content = read_remote_file(remote_name, file_path)
            if content:
                try:
                    msg = json.loads(content)
                    msg_summary = {
                        "filename": filename,
                        "session": session_name,
                        "turn": msg.get("turn"),
                        "message_type": msg.get("message_type"),
                        "timestamp": msg.get("timestamp"),
                        "subject": (msg.get("payload", msg.get("content", {})) or {}).get("subject", ""),
                    }
                    result["new_messages"].append(msg_summary)

                    # Index in state.db if requested
                    if index and DB_PATH.exists():
                        _index_message(msg, filename, session_name)

                except json.JSONDecodeError:
                    result["errors"].append(f"parse error: {filename}")

    return result


def _index_message(msg: dict, filename: str, session_name: str) -> None:
    """Index a transport message in state.db via dual_write.py."""
    from_block = msg.get("from", {})
    from_agent = (from_block.get("agent_id", "unknown")
                  if isinstance(from_block, dict) else str(from_block))
    to_block = msg.get("to", {})
    if isinstance(to_block, list):
        to_agent = to_block[0].get("agent_id", "unknown") if to_block else "unknown"
    elif isinstance(to_block, dict):
        to_agent = to_block.get("agent_id", "unknown")
    else:
        to_agent = str(to_block)
    timestamp = msg.get("timestamp", datetime.now().isoformat())
    payload = msg.get("payload", msg.get("content", {}))
    subject = (payload.get("subject", "")
               if isinstance(payload, dict) else "")
    message_type = msg.get("message_type", "unknown")
    turn = msg.get("turn", 0)
    claims_count = len(msg.get("claims", []))
    setl = msg.get("setl", 0.0)
    urgency = msg.get("urgency", "normal")

    dual_write = PROJECT_ROOT / "scripts" / "dual_write.py"
    if dual_write.exists():
        subprocess.run(
            [
                sys.executable, str(dual_write), "transport-message",
                "--session", session_name,
                "--filename", filename,
                "--turn", str(turn),
                "--type", message_type,
                "--from-agent", from_agent,
                "--to-agent", to_agent,
                "--timestamp", timestamp,
                "--subject", subject,
                "--claims-count", str(claims_count),
                "--setl", str(setl),
                "--urgency", urgency,
            ],
            cwd=PROJECT_ROOT,
            capture_output=True,
        )


def main():
    parser = argparse.ArgumentParser(description="Cross-repo transport fetch")
    parser.add_argument("--agent", help="Scan a specific agent only")
    parser.add_argument("--index", action="store_true",
                        help="Index new messages in state.db")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")
    parser.add_argument("--force", action="store_true",
                        help="Fetch all peers regardless of activity tier")
    args = parser.parse_args()

    registry = load_registry()
    agents = registry.get("agents", {})

    results = []
    for agent_id, config in agents.items():
        if config.get("transport") != "cross-repo-fetch":
            continue
        if args.agent and agent_id != args.agent:
            continue
        result = scan_agent(agent_id, config, index=args.index,
                            force=args.force)
        results.append(result)

    if args.json:
        print(json.dumps(results, indent=2))
        return

    # Human-readable output
    for r in results:
        print(f"\n{'─' * 60}")
        tier = r.get('activity_tier', '?')
        tier_label = {"active": "ACTIVE", "warm": "warm", "cold": "cold"}.get(tier, tier)
        print(f"Agent: {r['agent_id']} (remote: {r.get('remote_name', '?')}) [{tier_label}]")

        if r.get("skipped"):
            print(f"  SKIPPED: {r.get('skip_reason', 'cold peer')}")
            continue

        print(f"  Fetch: {'✓' if r.get('fetch_ok') else '✗'}")
        print(f"  MANIFEST: {'✓ found' if r.get('manifest_found') else '✗ not found'}")

        for s in r.get("sessions_scanned", []):
            new = s["new_files"]
            marker = f" ← {new} NEW" if new > 0 else ""
            print(f"  Session {s['session_name']}: "
                  f"{s['total_files']} files, "
                  f"{s['inbound_files']} inbound{marker}")

        for msg in r.get("new_messages", []):
            print(f"    NEW: {msg['filename']} "
                  f"(turn {msg.get('turn')}, {msg.get('message_type')})"
                  f" — {msg.get('subject', '(no subject)')}")

        if r.get("errors"):
            for err in r["errors"]:
                print(f"  ERROR: {err}")

    if not results:
        print("No cross-repo-fetch agents found in registry.")


if __name__ == "__main__":
    main()

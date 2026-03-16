#!/usr/bin/env python3
"""cross_repo_fetch.py — Read transport state from a cross-repo-fetch peer.

Fetches the remote, reads MANIFEST.json (if present) and session directories
via `git show`, and reports new/unprocessed messages compared to local state.db.

When --materialize is passed (or implied by --index), inbound messages from
peer repos are copied into the local transport/sessions/ directory with
deterministic filenames (from-{sender}-{NNN}.json). This ensures the local
repo has a complete record of every session exchange, not just the messages
this agent authored. Without materialization, peer responses remain invisible
to filesystem-based checks (MANIFEST audits, grounding reviews, /sync Phase 1).

Usage:
    python3 scripts/cross_repo_fetch.py                    # all cross-repo-fetch agents
    python3 scripts/cross_repo_fetch.py --agent psq-agent  # single agent
    python3 scripts/cross_repo_fetch.py --index             # index + materialize new messages
    python3 scripts/cross_repo_fetch.py --materialize       # materialize without indexing
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

_SCRIPTS_DIR = str(Path(__file__).parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from state.connection import PROJECT_ROOT, DB_PATH
from state.transport import get_indexed_filenames as _get_indexed_db

REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"
REGISTRY_LOCAL_PATH = PROJECT_ROOT / "transport" / "agent-registry.local.json"

# Adaptive sync frequency — peers classified by recency of last exchange.
# Active: unprocessed messages or exchange within WARM_THRESHOLD → always fetch.
# Warm: exchange within COLD_THRESHOLD → fetch (default cron handles this).
# Cold: no exchange beyond COLD_THRESHOLD → skip fetch unless --force.
WARM_THRESHOLD_HOURS = 1
COLD_THRESHOLD_HOURS = 24


def _get_my_agent_id() -> str:
    """Read this agent's ID from .agent-identity.json, fallback to default."""
    identity_file = PROJECT_ROOT / ".agent-identity.json"
    if identity_file.exists():
        try:
            with open(identity_file) as f:
                return json.load(f).get("agent_id", "psychology-agent")
        except (json.JSONDecodeError, OSError):
            pass
    return "psychology-agent"


def _get_repo_agent_id() -> str:
    """Derive the canonical agent ID for this repo from agent-card or repo name.

    The workstation .agent-identity.json may identify the operator (e.g., 'human'),
    not the repo's agent. The agent-card provides the repo's canonical identity.
    Falls back to parsing the repo directory name.
    """
    agent_card = PROJECT_ROOT / ".well-known" / "agent-card.json"
    if agent_card.exists():
        try:
            with open(agent_card) as f:
                return json.load(f).get("agent_id", "psychology-agent")
        except (json.JSONDecodeError, OSError):
            pass
    # Fallback: derive from directory name
    dirname = PROJECT_ROOT.name
    # Common pattern: "psychology-agent" repo name
    return dirname if dirname.endswith("-agent") else "psychology-agent"


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
    files = [line.strip().rstrip("/") for line in lines if line.strip() and not line.startswith("tree ")]
    return files


def get_indexed_filenames(db_path: Path, session_name: str) -> set[str]:
    """Get filenames already indexed in state.db for a session.

    Delegates to state.transport for the actual query.
    """
    return _get_indexed_db(session_name)


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

        # Check for pending handoffs involving this agent
        try:
            for pattern in agent_patterns:
                handoff_count = conn.execute(
                    "SELECT COUNT(*) FROM pending_handoffs "
                    "WHERE status = 'waiting' "
                    "AND (sending_agent = ? OR receiving_agent = ?)",
                    (pattern, pattern)
                ).fetchone()[0]
                if handoff_count > 0:
                    conn.close()
                    return "active"
        except sqlite3.OperationalError:
            pass  # pending_handoffs table may not exist

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
               materialize: bool = False, force: bool = False) -> dict:
    """Scan a cross-repo-fetch agent for new messages.

    Returns a dict with scan results. Skips cold peers unless force=True.
    When materialize=True, copies inbound messages to local session dirs.
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
        # Before skipping a cold peer, do a lightweight git-fetch and check
        # for new messages addressed TO us or FROM the peer. A cold peer may
        # have responded to a consensus request or sent a new proposal.
        # Use git show on the already-fetched ref — no network cost.
        #
        # Check strategy: scan each session's remote directory for files
        # matching our inbound filter (to-{my_id}-*) or FROM the peer
        # (from-{agent_id}-*) that we don't have locally.
        try:
            fetch_result = subprocess.run(
                ["git", "fetch", remote_name, "--quiet"],
                capture_output=True, text=True, timeout=30,
                cwd=str(PROJECT_ROOT)
            )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        my_id = _get_my_agent_id()
        has_new_messages = False

        # Quick scan: list transport session dirs on the remote
        try:
            ls_result = subprocess.run(
                ["git", "ls-tree", "--name-only",
                 f"{remote_name}/main", "transport/sessions/"],
                capture_output=True, text=True, timeout=10,
                cwd=str(PROJECT_ROOT)
            )
            for session_path in ls_result.stdout.strip().split("\n"):
                if not session_path:
                    continue
                session_name = session_path.rstrip("/").split("/")[-1]
                # List files in this session on the remote
                files_result = subprocess.run(
                    ["git", "ls-tree", "--name-only",
                     f"{remote_name}/main", f"{session_path}/"],
                    capture_output=True, text=True, timeout=10,
                    cwd=str(PROJECT_ROOT)
                )
                remote_files = set(
                    f.split("/")[-1] for f in files_result.stdout.strip().split("\n")
                    if f.strip()
                )
                # Check for inbound files we don't have locally
                local_dir = PROJECT_ROOT / "transport" / "sessions" / session_name
                local_files = set(
                    f.name for f in local_dir.glob("*.json")
                ) if local_dir.exists() else set()

                inbound_prefix = f"to-{my_id}-"
                from_prefix = f"from-{agent_id}-"
                for rf in remote_files:
                    if rf in local_files or rf == "MANIFEST.json":
                        continue
                    if rf.startswith(inbound_prefix) or rf.startswith(from_prefix):
                        has_new_messages = True
                        break
                if has_new_messages:
                    break
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        if has_new_messages:
            # Promote to warm — there are new messages for us
            activity_tier = "warm"
            result["activity_tier"] = "warm"
            result["promoted_from_cold"] = True
        else:
            result["skipped"] = True
            result["skip_reason"] = (
                f"cold peer — no exchange within {COLD_THRESHOLD_HOURS}h, "
                "no unprocessed messages, no active gates, "
                "no new inbound files on remote"
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

        # Filter to inbound messages — two naming conventions:
        #   Convention A (psq-agent): files named from-{sender}-NNN.json
        #   Convention B (unratified/observatory): files named to-{recipient}-NNN.json
        # On the remote, "from-{peer}-*" = messages the peer authored (Convention A).
        # On the remote, "to-{us}-*" = messages addressed to us (Convention B).
        #
        # The workstation .agent-identity.json may say "human" (operator identity)
        # while the repo represents "psychology-agent". Check both identities
        # to catch all inbound messages regardless of which name the sender used.
        our_agent_id = _get_my_agent_id()
        repo_agent_id = _get_repo_agent_id()
        inbound_prefixes = {f"to-{our_agent_id}-"}
        if repo_agent_id != our_agent_id:
            inbound_prefixes.add(f"to-{repo_agent_id}-")
        # Also match from-{agent_id}- (peer's own authored messages).
        # message_prefix covers custom naming (e.g., from-psq-sub-agent-),
        # but the agent may also author files as from-{agent_id}- directly.
        inbound_prefixes.add(f"from-{agent_id}-")
        inbound_files = [
            f for f in files
            if f.startswith(message_prefix)
            or any(f.startswith(p) for p in inbound_prefixes)
        ]

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

                    # Materialize: copy inbound message to local session dir
                    if materialize or index:
                        local_name = _materialize_message(
                            msg, content, filename, session_name
                        )
                        if local_name:
                            msg_summary["materialized_as"] = local_name

                    result["new_messages"].append(msg_summary)

                    # Index in state.db if requested — use local filename
                    # if materialized, original filename otherwise
                    if index and DB_PATH.exists():
                        idx_filename = msg_summary.get(
                            "materialized_as", filename
                        )
                        _index_message(msg, idx_filename, session_name)

                except json.JSONDecodeError:
                    result["errors"].append(f"parse error: {filename}")

        # Ensure MANIFEST exists for sessions where we materialized files
        if materialize or index:
            manifest_path = (
                PROJECT_ROOT / "transport" / "sessions" / session_name
                / "MANIFEST.json"
            )
            session_dir = manifest_path.parent
            if session_dir.exists() and not manifest_path.exists():
                # Bootstrap MANIFEST from existing files
                _update_manifest(session_name, "__bootstrap__", {
                    "from": {"agent_id": "__bootstrap__"},
                    "turn": -1,
                })
                # Remove the bootstrap sentinel entry
                try:
                    with open(manifest_path) as f:
                        manifest = json.load(f)
                    manifest["messages"] = [
                        m for m in manifest.get("messages", [])
                        if m.get("filename") != "__bootstrap__"
                    ]
                    manifest["participants"] = [
                        p for p in manifest.get("participants", [])
                        if p != "__bootstrap__"
                    ]
                    with open(manifest_path, "w") as f:
                        json.dump(manifest, f, indent=2)
                        f.write("\n")
                except (json.JSONDecodeError, OSError):
                    pass

    return result


def _materialize_message(
    msg: dict,
    raw_content: str,
    remote_filename: str,
    session_name: str,
) -> str | None:
    """Copy an inbound message into the local transport/sessions/ directory.

    Convention B files (to-{agent}-NNN.json, from-{agent}-NNN.json) preserve
    their original filename — the naming convention carries semantic meaning
    (who it's addressed to, who sent it). Only files with non-standard names
    get renamed to from-{sender}-NNN.json.

    Returns the local filename if materialized, None if skipped (already exists).
    """
    session_dir = PROJECT_ROOT / "transport" / "sessions" / session_name
    session_dir.mkdir(parents=True, exist_ok=True)

    # Check if this exact file already exists by name
    local_path = session_dir / remote_filename
    if local_path.exists():
        return None  # Already materialized with same name

    # Also check by content match (turn + sender) to catch renamed copies
    from_block = msg.get("from", {})
    sender = (from_block.get("agent_id", "unknown")
              if isinstance(from_block, dict) else str(from_block))
    turn = msg.get("turn", 0)
    for existing in session_dir.glob("*.json"):
        if existing.name == "MANIFEST.json":
            continue
        try:
            with open(existing) as f:
                existing_msg = json.load(f)
            if not isinstance(existing_msg, dict):
                continue
            existing_from = existing_msg.get("from", {})
            existing_sender = (existing_from.get("agent_id", "")
                               if isinstance(existing_from, dict) else "")
            if existing_msg.get("turn") == turn and existing_sender == sender:
                return None  # Already materialized under a different name
        except (json.JSONDecodeError, OSError):
            continue

    # Determine local filename — preserve Convention B names, rename others
    import re
    convention_b = re.match(r'^(to|from)-[\w-]+-\d+\.json$', remote_filename)
    if convention_b:
        # Convention B: preserve the original filename
        local_filename = remote_filename
    else:
        # Non-standard name: use from-{sender}-NNN.json
        prefix = f"from-{sender}-"
        existing_seqs = []
        for existing in session_dir.glob(f"{prefix}*.json"):
            stem = existing.stem
            seq_part = stem[len(f"from-{sender}-"):]
            try:
                existing_seqs.append(int(seq_part))
            except ValueError:
                continue
        next_seq = max(existing_seqs, default=0) + 1
        local_filename = f"{prefix}{next_seq:03d}.json"

    # Write the file
    out_path = session_dir / local_filename
    with open(out_path, "w") as f:
        f.write(raw_content)

    # Update MANIFEST.json
    _update_manifest(session_name, local_filename, msg)

    return local_filename


def _update_manifest(session_name: str, filename: str, msg: dict) -> None:
    """Add a message entry to the local session MANIFEST.json."""
    manifest_path = (
        PROJECT_ROOT / "transport" / "sessions" / session_name / "MANIFEST.json"
    )

    if manifest_path.exists():
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
        except (json.JSONDecodeError, OSError):
            manifest = {}
    else:
        # Bootstrap MANIFEST from existing files in the session directory
        manifest = {
            "session_id": session_name,
            "created": datetime.now().isoformat(),
            "participants": [],
            "messages": [],
            "status": "open",
        }
        session_dir = manifest_path.parent
        for existing_file in sorted(session_dir.glob("*.json")):
            if existing_file.name == "MANIFEST.json":
                continue
            try:
                with open(existing_file) as f:
                    existing_msg = json.load(f)
                if not isinstance(existing_msg, dict):
                    continue
                efrom = existing_msg.get("from", {})
                esender = (efrom.get("agent_id", "unknown")
                           if isinstance(efrom, dict) else str(efrom))
                epayload = existing_msg.get("payload", existing_msg.get("content", {}))
                esubject = (epayload.get("subject", "")
                            if isinstance(epayload, dict) else "")
                manifest["messages"].append({
                    "filename": existing_file.name,
                    "turn": existing_msg.get("turn", 0),
                    "from": esender,
                    "subject": esubject,
                })
                manifest["participants"].append(esender)
            except (json.JSONDecodeError, OSError):
                continue
        manifest["participants"] = sorted(set(manifest["participants"]))

    messages = manifest.get("messages", [])

    # Avoid duplicate entries
    if any(m.get("filename") == filename for m in messages):
        return

    from_block = msg.get("from", {})
    sender = (from_block.get("agent_id", "unknown")
              if isinstance(from_block, dict) else str(from_block))
    payload = msg.get("payload", msg.get("content", {}))
    subject = (payload.get("subject", "")
               if isinstance(payload, dict) else "")

    # Extract vote if consensus message
    vote = (payload.get("vote", "")
            if isinstance(payload, dict) else "")
    display_subject = subject
    if not display_subject and vote:
        display_subject = f"Consensus vote: {vote}"
    if not display_subject:
        msg_type = msg.get("message_type", "")
        display_subject = f"{msg_type} from {sender}" if msg_type else f"Message from {sender}"

    messages.append({
        "filename": filename,
        "turn": msg.get("turn", 0),
        "from": sender,
        "subject": display_subject,
    })

    # Sort by turn
    messages.sort(key=lambda m: m.get("turn", 0))
    manifest["messages"] = messages

    # Update participants
    participants = set(manifest.get("participants", []))
    participants.add(sender)
    manifest["participants"] = sorted(participants)

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


def _index_message(msg: dict, filename: str, session_name: str) -> None:
    """Index a transport message in state.db via state.transport domain module."""
    from state.transport import index_message

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

    index_message(
        session=session_name,
        filename=filename,
        turn=turn,
        message_type=message_type,
        from_agent=from_agent,
        to_agent=to_agent,
        timestamp=timestamp,
        subject=subject,
        claims_count=claims_count,
        setl=setl,
        urgency=urgency,
    )


def main():
    parser = argparse.ArgumentParser(description="Cross-repo transport fetch")
    parser.add_argument("--agent", help="Scan a specific agent only")
    parser.add_argument("--index", action="store_true",
                        help="Index new messages in state.db (implies --materialize)")
    parser.add_argument("--materialize", action="store_true",
                        help="Copy inbound messages to local session directories")
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
                            materialize=args.materialize,
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
            materialized = msg.get("materialized_as")
            mat_label = f" → {materialized}" if materialized else ""
            print(f"    NEW: {msg['filename']} "
                  f"(turn {msg.get('turn')}, {msg.get('message_type')})"
                  f" — {msg.get('subject', '(no subject)')}{mat_label}")

        if r.get("errors"):
            for err in r["errors"]:
                print(f"  ERROR: {err}")

    if not results:
        print("No cross-repo-fetch agents found in registry.")


if __name__ == "__main__":
    main()

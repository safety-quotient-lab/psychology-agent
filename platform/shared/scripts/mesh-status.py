#!/usr/bin/env python3
"""mesh-status.py — Real-time autonomous mesh status dashboard.

Serves a single HTML page with SSE (Server-Sent Events) live updates, showing
the current state of the agent mesh: autonomy budget, peer activity, transport
queue, active gates, recent actions, and sync health. Updates push to the
browser only when underlying data changes — no polling or periodic refresh.

Usage:
    python3 scripts/mesh-status.py              # serve on :8077
    python3 scripts/mesh-status.py --port 9000  # custom port
    python3 scripts/mesh-status.py --json       # dump status as JSON (no server)

Requires: Python 3.10+ (stdlib only — http.server, sqlite3, json)
"""

import argparse
import json
import re
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

PROJECT_ROOT = Path(__file__).parent.parent
REPLAYS_DIR = PROJECT_ROOT / "docs" / "replays"
DB_PATH = PROJECT_ROOT / "state.db"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"
REGISTRY_LOCAL_PATH = PROJECT_ROOT / "transport" / "agent-registry.local.json"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"
AGENT_CARD_PATH = PROJECT_ROOT / ".well-known" / "agent-card.json"

COLD_THRESHOLD_HOURS = 24

# SSE generation tracking — increments when collected_at changes
_sse_generation = 0
_sse_last_collected_at = None

ALLOWED_ORIGINS = {
    "https://interagent.safety-quotient.dev",
    "https://psychology-agent.safety-quotient.dev",
    "https://psq-agent.safety-quotient.dev",
    "https://api.safety-quotient.dev",
    "http://localhost:8077",
    "http://localhost:8078",
    "http://localhost:9000",
}


def _cors_origin(request_origin: str | None) -> str:
    """Return the CORS origin header value. Allowlist-based, not wildcard."""
    if request_origin and request_origin in ALLOWED_ORIGINS:
        return request_origin
    return ""


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base (override wins on conflicts)."""
    merged = base.copy()
    for key, value in override.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _load_registry() -> dict:
    """Load agent registry, merging local overrides if present."""
    if not REGISTRY_PATH.exists():
        return {}
    try:
        reg = json.loads(REGISTRY_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return {}
    if REGISTRY_LOCAL_PATH.exists():
        try:
            local = json.loads(REGISTRY_LOCAL_PATH.read_text())
            reg = _deep_merge(reg, local)
        except (json.JSONDecodeError, OSError):
            pass
    return reg


def get_agent_id() -> str:
    """Read agent ID from identity file or default."""
    if IDENTITY_PATH.exists():
        try:
            return json.loads(IDENTITY_PATH.read_text())["agent_id"]
        except (json.JSONDecodeError, KeyError):
            pass
    return "psychology-agent"


def query_db(sql: str, params: tuple = ()) -> list[dict]:
    """Run a query and return list of dicts."""
    if not DB_PATH.exists():
        return []
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(sql, params).fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result
    except sqlite3.OperationalError:
        return []


def scalar(sql: str, params: tuple = (), default=0):
    """Run a query and return a single scalar value."""
    if not DB_PATH.exists():
        return default
    try:
        conn = sqlite3.connect(str(DB_PATH))
        row = conn.execute(sql, params).fetchone()
        conn.close()
        return row[0] if row and row[0] is not None else default
    except sqlite3.OperationalError:
        return default


def _parse_todo() -> dict:
    """Parse TODO.md for open/complete counts by section."""
    todo_path = PROJECT_ROOT / "TODO.md"
    if not todo_path.exists():
        return {"sections": [], "total_open": 0, "total_complete": 0}

    sections = []
    current_section = None
    open_count = 0
    complete_count = 0

    for line in todo_path.read_text().splitlines():
        # Section headers: ## Name
        if line.startswith("## "):
            if current_section:
                sections.append(current_section)
            current_section = {
                "name": line.lstrip("# ").strip(),
                "open": 0,
                "complete": 0,
                "items": [],
            }
        elif current_section:
            stripped = line.strip()
            if stripped.startswith("- [ ] "):
                current_section["open"] += 1
                open_count += 1
                # Extract bold item name
                m = re.match(r"- \[ \] \*\*(.+?)\*\*", stripped)
                label = m.group(1) if m else stripped[6:60]
                current_section["items"].append({"label": label, "done": False})
            elif stripped.startswith("- [x] "):
                current_section["complete"] += 1
                complete_count += 1

    if current_section:
        sections.append(current_section)

    # Filter to sections with open items
    active_sections = [s for s in sections if s["open"] > 0]

    return {
        "sections": active_sections,
        "total_open": open_count,
        "total_complete": complete_count,
    }


def _parse_active_thread() -> dict:
    """Extract active thread from MEMORY.md."""
    # Check both committed snapshot and auto-memory location
    memory_path = PROJECT_ROOT / "MEMORY.md"
    if not memory_path.exists():
        # Auto-memory path (Claude Code stores outside repo)
        auto_memory = Path.home() / ".claude" / "projects" / (
            "-" + str(PROJECT_ROOT).replace("/", "-").lstrip("-")
        ) / "memory" / "MEMORY.md"
        if auto_memory.exists():
            memory_path = auto_memory
        else:
            return {"last_session": "", "next": "", "status_lines": []}

    text = memory_path.read_text()
    result = {"last_session": "", "next": "", "status_lines": []}

    # Find Active Thread section
    in_thread = False
    in_status = False
    for line in text.splitlines():
        if "## Active Thread" in line:
            in_thread = True
            continue
        if in_thread and line.startswith("## "):
            break
        if not in_thread:
            continue

        stripped = line.strip()
        if "Where we stopped" in stripped or "where we stopped" in stripped:
            # Extract after the colon, strip markdown bold markers
            colon_idx = stripped.find(":")
            if colon_idx >= 0:
                val = stripped[colon_idx + 1:].strip().strip("*").strip()
                result["last_session"] = val
        elif stripped.startswith("**Next:**") or stripped.startswith("**Next:"):
            result["next"] = stripped.replace("**Next:**", "").replace("**Next:", "").strip().rstrip("*")
        elif stripped.startswith("- ") and ":" in stripped:
            result["status_lines"].append(stripped[2:])

    return result


def _collect_peer_sync_recency(registry_agents: dict, remote_states: list) -> list:
    """Build peer sync recency from remote state snapshots and registry."""
    peers = []

    for state in remote_states:
        agent_id = state.get("agent_id", "")
        if not agent_id:
            continue

        snapshot_at = state.get("snapshot_at", "")
        schedule = state.get("schedule", {})
        budget = state.get("autonomy_budget", {})

        last_ran = snapshot_at
        next_due = schedule.get("next_expected", "")

        # Compute relative time
        age_str = "unknown"
        if last_ran:
            try:
                dt = datetime.fromisoformat(last_ran.replace("Z", "+00:00"))
                now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
                delta = now - dt
                mins = delta.total_seconds() / 60
                if mins < 1:
                    age_str = "just now"
                elif mins < 60:
                    age_str = f"{int(mins)}m ago"
                elif mins < 1440:
                    age_str = f"{mins / 60:.1f}h ago"
                else:
                    age_str = f"{mins / 1440:.1f}d ago"
            except (ValueError, TypeError):
                age_str = last_ran

        peers.append({
            "agent_id": agent_id,
            "last_ran": age_str,
            "last_ran_raw": last_ran,
            "next_due": next_due,
            "budget_spent": budget.get("budget_spent", "?"),
            "budget_cutoff": budget.get("budget_cutoff", "?"),
        })

    return peers


def _collect_state_of_play(remote_states: list, registry_agents: dict) -> dict:
    """Collect all data for the State of Play tab."""
    return {
        "active_thread": _parse_active_thread(),
        "todo": _parse_todo(),
        "peer_sync": _collect_peer_sync_recency(registry_agents, remote_states),
    }


def _collect_schedule(agent_id: str) -> dict:
    """Collect sync schedule from cron, log file, and state.db."""
    import re
    import subprocess

    schedule = {
        "autonomous": False,
        "cron_entry": None,
        "cron_interval_min": None,
        "last_sync": None,
        "next_expected": None,
        "min_action_interval_sec": None,
        "lock_file": None,
        "lock_active": False,
    }

    # Parse cron for autonomous-sync entries
    try:
        result = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if "autonomous-sync" in line and not line.startswith("#"):
                    schedule["autonomous"] = True
                    schedule["cron_entry"] = line.strip()
                    # Extract interval from cron minute field
                    minute_field = line.strip().split()[0]
                    m = re.match(r"\*/(\d+)", minute_field)
                    if m:
                        schedule["cron_interval_min"] = int(m.group(1))
                    elif "," in minute_field:
                        # Comma-separated: compute interval from first two values
                        parts = [int(x) for x in minute_field.split(",")[:2]]
                        if len(parts) >= 2:
                            schedule["cron_interval_min"] = parts[1] - parts[0]
                    elif minute_field == "0":
                        schedule["cron_interval_min"] = 60
                    break
    except (subprocess.TimeoutExpired, OSError):
        pass

    # min_action_interval from autonomy_budget
    row = query_db(
        "SELECT min_action_interval FROM autonomy_budget WHERE agent_id = ?",
        (agent_id,)
    )
    if row:
        schedule["min_action_interval_sec"] = row[0].get("min_action_interval")

    # Last autonomous action timestamp
    last = query_db(
        "SELECT MAX(created_at) as last_action FROM autonomous_actions"
    )
    if last and last[0].get("last_action"):
        schedule["last_sync"] = last[0]["last_action"]

    # Last sync from log file (most recent line with timestamp)
    log_path = Path("/tmp") / f"autonomous-sync-{agent_id}.log"
    if log_path.exists():
        try:
            # Read last 20 lines for recency
            lines = log_path.read_text().splitlines()[-20:]
            for line in reversed(lines):
                m = re.match(r"\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})", line)
                if m:
                    schedule["last_sync"] = m.group(1)
                    break
        except OSError:
            pass

    # Compute next expected from last_sync + cron interval
    if schedule["last_sync"] and schedule["cron_interval_min"]:
        try:
            last_dt = datetime.fromisoformat(schedule["last_sync"])
            next_dt = last_dt + timedelta(minutes=schedule["cron_interval_min"])
            schedule["next_expected"] = next_dt.strftime("%Y-%m-%dT%H:%M:%S")
        except (ValueError, TypeError):
            pass

    # Check lock file
    lock_path = Path("/tmp") / f"autonomous-sync-{agent_id}.lock"
    schedule["lock_file"] = str(lock_path)
    if lock_path.exists():
        try:
            pid = int(lock_path.read_text().strip())
            # Check if PID is alive
            import os
            try:
                os.kill(pid, 0)
                schedule["lock_active"] = True
                schedule["lock_pid"] = pid
            except OSError:
                schedule["lock_active"] = False
                schedule["lock_pid"] = pid
                schedule["lock_stale"] = True
        except (ValueError, OSError):
            pass

    return schedule


def _collect_remote_states(registry_agents: dict) -> list[dict]:
    """Read mesh-state JSON snapshots from remote repos via git show."""
    import subprocess

    results = []

    # Also check local-coordination for local mesh-state files
    local_dir = PROJECT_ROOT / "transport" / "sessions" / "local-coordination"
    if local_dir.exists():
        for f in local_dir.glob("mesh-state-*.json"):
            try:
                data = json.loads(f.read_text())
                data["_source"] = f"local ({f.name})"
                results.append(data)
            except (json.JSONDecodeError, OSError):
                pass

    # Read from registered remotes with cross-repo-fetch transport
    reg = _load_registry()
    if not reg:
        return results

    for agent_id, cfg in reg.get("agents", {}).items():
        if cfg.get("transport") != "cross-repo-fetch":
            continue
        remote_name = cfg.get("remote_name")
        if not remote_name:
            continue

        # Try git show for the mesh-state file on the remote
        mesh_path = f"transport/sessions/local-coordination/mesh-state-{agent_id}.json"
        try:
            result = subprocess.run(
                ["git", "-C", str(PROJECT_ROOT), "show",
                 f"{remote_name}/main:{mesh_path}"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                data = json.loads(result.stdout)
                data["_source"] = f"git show {remote_name}/main"
                results.append(data)
        except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError):
            pass

    return results


def _collect_replays() -> list[dict]:
    """Collect replay HTML files from docs/replays/ with metadata."""
    replays = []
    if not REPLAYS_DIR.exists():
        return replays

    for f in sorted(REPLAYS_DIR.glob("session-*.html"), reverse=True):
        name = f.stem
        size_kb = f.stat().st_size // 1024
        mtime = datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M")

        # Extract session number from filename (session-35.html → 35)
        match = re.match(r"session-(\d+)", name)
        session_num = int(match.group(1)) if match else None

        replays.append({
            "filename": f.name,
            "session": session_num,
            "size_kb": size_kb,
            "modified": mtime,
        })

    return replays


def _collect_remote_replays(registry_agents: dict) -> list[dict]:
    """List replay files available on remote peers via git ls-tree."""
    results = []
    reg = _load_registry()
    if not reg:
        return results

    for agent_id, cfg in reg.get("agents", {}).items():
        if cfg.get("transport") != "cross-repo-fetch":
            continue
        remote_name = cfg.get("remote_name")
        if not remote_name:
            continue

        try:
            result = subprocess.run(
                ["git", "-C", str(PROJECT_ROOT), "ls-tree",
                 "--name-only", f"{remote_name}/main", "docs/replays/"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                for line in result.stdout.strip().splitlines():
                    fname = Path(line).name
                    if fname.endswith(".html"):
                        results.append({
                            "agent_id": agent_id,
                            "filename": fname,
                            "remote": remote_name,
                        })
        except (subprocess.TimeoutExpired, OSError):
            pass

    return results


def collect_status() -> dict:
    """Collect all mesh status data from state.db."""
    agent_id = get_agent_id()
    now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    # Autonomy budget
    budget = query_db(
        "SELECT * FROM autonomy_budget WHERE agent_id = ?", (agent_id,)
    )
    budget_row = budget[0] if budget else {}

    # Pending handoffs (formerly active_gates)
    gates = query_db(
        "SELECT * FROM pending_handoffs WHERE status = 'waiting' ORDER BY created_at"
    )

    # Unprocessed messages
    unprocessed = query_db(
        "SELECT session_name, filename, turn, from_agent, message_type, "
        "timestamp, subject FROM transport_messages "
        "WHERE processed = FALSE ORDER BY timestamp DESC"
    )

    # Recent messages (last 20)
    recent = query_db(
        "SELECT session_name, filename, turn, from_agent, to_agent, "
        "message_type, timestamp, processed, subject "
        "FROM transport_messages ORDER BY timestamp DESC LIMIT 20"
    )

    # Recent autonomous actions (last 10)
    actions = query_db(
        "SELECT action_type, action_class, evaluator_tier, evaluator_result, "
        "description, budget_before, budget_after, created_at "
        "FROM autonomous_actions ORDER BY created_at DESC LIMIT 10"
    )

    # Peer activity summary
    peers = query_db(
        "SELECT from_agent, MAX(timestamp) as last_seen, COUNT(*) as total_messages "
        "FROM transport_messages WHERE from_agent != ? "
        "GROUP BY from_agent ORDER BY last_seen DESC",
        (agent_id,)
    )

    # Message counts by agent
    msg_counts = query_db(
        "SELECT from_agent, COUNT(*) as sent, "
        "SUM(CASE WHEN processed = FALSE THEN 1 ELSE 0 END) as pending "
        "FROM transport_messages GROUP BY from_agent ORDER BY sent DESC"
    )

    # Epistemic debt
    total_flags = scalar(
        "SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE"
    )

    # Schema version
    schema_ver = scalar("SELECT MAX(version) FROM schema_version")

    # Transport totals
    total_messages = scalar("SELECT COUNT(*) FROM transport_messages")
    total_sessions = scalar("SELECT COUNT(DISTINCT session_name) FROM transport_messages")

    # Heartbeat (check for recent heartbeat file)
    heartbeat_path = PROJECT_ROOT / "transport" / "heartbeat.json"
    heartbeat_info = {}
    if heartbeat_path.exists():
        try:
            heartbeat_info = json.loads(heartbeat_path.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    # Registry info
    registry_agents = {}
    reg = _load_registry()
    for aid, cfg in reg.get("agents", {}).items():
        registry_agents[aid] = {
            "role": cfg.get("role"),
            "transport": cfg.get("transport"),
            "autonomous": cfg.get("autonomous", False),
            "always_consider": cfg.get("always_consider", False),
        }

    # Sync schedule — cron entry + last/next sync times
    schedule = _collect_schedule(agent_id)

    # Facet vocabulary (semiotics tab)
    facet_vocab = query_db(
        "SELECT facet_type, facet_value, code, source, description, "
        "entity_scope, active, keyword_count FROM facet_vocabulary "
        "ORDER BY facet_type, active DESC, facet_value"
    )

    # Facet distribution: entity counts per PSH category
    psh_dist = query_db(
        "SELECT facet_value, COUNT(*) as entity_count, "
        "ROUND(AVG(confidence), 3) as avg_confidence, "
        "MIN(confidence) as min_confidence, "
        "MAX(confidence) as max_confidence "
        "FROM universal_facets WHERE facet_type = 'psh' "
        "GROUP BY facet_value ORDER BY entity_count DESC"
    )

    # Schema.org type distribution
    schema_dist = query_db(
        "SELECT facet_value, COUNT(*) as entity_count "
        "FROM universal_facets WHERE facet_type = 'schema_type' "
        "GROUP BY facet_value ORDER BY entity_count DESC"
    )

    # Keyword set version info
    version_dist = query_db(
        "SELECT keyword_set_version, COUNT(*) as facet_count, "
        "MIN(computed_at) as oldest, MAX(computed_at) as newest "
        "FROM universal_facets WHERE facet_type = 'psh' "
        "GROUP BY keyword_set_version ORDER BY keyword_set_version"
    )

    # Low confidence facets (potential misclassifications)
    low_conf_count = scalar(
        "SELECT COUNT(*) FROM universal_facets "
        "WHERE facet_type = 'psh' AND confidence < 0.05 "
        "AND facet_value != 'unclassified'"
    )

    # Remote peer state (via git show on mesh-state exports)
    remote_states = _collect_remote_states(registry_agents)

    # Session-level message summaries (for Messages tab)
    session_summaries = query_db(
        "SELECT session_name, "
        "COUNT(*) as total_messages, "
        "GROUP_CONCAT(DISTINCT from_agent) as participants, "
        "MIN(timestamp) as started, "
        "MAX(timestamp) as latest, "
        "MAX(turn) as last_turn, "
        "SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as unprocessed "
        "FROM transport_messages "
        "GROUP BY session_name "
        "ORDER BY latest DESC"
    )

    # Per-session message details (for expandable threads)
    session_messages = {}
    all_msgs = query_db(
        "SELECT session_name, filename, turn, from_agent, to_agent, "
        "message_type, timestamp, processed, subject "
        "FROM transport_messages ORDER BY session_name, turn"
    )
    for msg in all_msgs:
        sn = msg.get("session_name", "")
        if sn not in session_messages:
            session_messages[sn] = []
        session_messages[sn].append(msg)

    # Crystallization metrics (triage dispositions)
    triage_stats = query_db(
        "SELECT triage_disposition, COUNT(*) as cnt "
        "FROM transport_messages "
        "WHERE triage_disposition IS NOT NULL "
        "GROUP BY triage_disposition"
    )
    total_triaged = sum(r.get("cnt", 0) for r in triage_stats)
    crystallized_count = sum(
        r.get("cnt", 0) for r in triage_stats
        if r.get("triage_disposition") in ("auto-skip", "auto-ack", "auto-record")
    )
    crystallization_rate = (
        round(crystallized_count / total_triaged * 100, 1)
        if total_triaged > 0 else 0.0
    )

    # State of Play
    state_of_play = _collect_state_of_play(remote_states, registry_agents)

    # Session replays
    local_replays = _collect_replays()
    remote_replays = _collect_remote_replays(registry_agents)

    return {
        "agent_id": agent_id,
        "collected_at": now_iso,
        "db_path": str(DB_PATH),
        "db_exists": DB_PATH.exists(),
        "schema_version": schema_ver,
        "autonomy_budget": budget_row,
        "pending_handoffs": gates,
        "unprocessed_messages": unprocessed,
        "recent_messages": recent,
        "recent_actions": actions,
        "peers": peers,
        "message_counts": msg_counts,
        "registry_agents": registry_agents,
        "remote_states": remote_states,
        "totals": {
            "messages": total_messages,
            "sessions": total_sessions,
            "unprocessed": len(unprocessed),
            "pending_handoffs": len(gates),
            "epistemic_flags_unresolved": total_flags,
        },
        "crystallization": {
            "dispositions": {r["triage_disposition"]: r["cnt"] for r in triage_stats},
            "total_triaged": total_triaged,
            "crystallized_count": crystallized_count,
            "rate_percent": crystallization_rate,
        },
        "heartbeat": heartbeat_info,
        "schedule": schedule,
        "semiotics": {
            "vocabulary": facet_vocab,
            "psh_distribution": psh_dist,
            "schema_distribution": schema_dist,
            "version_distribution": version_dist,
            "low_confidence_count": low_conf_count,
        },
        "session_summaries": session_summaries,
        "session_messages": session_messages,
        "state_of_play": state_of_play,
        "replays": {
            "local": local_replays,
            "remote": remote_replays,
        },
    }


# ── JSON-LD Structured Data ──────────────────────────────────────────────

def _build_jsonld(status: dict) -> dict:
    """Build Schema.org JSON-LD from mesh status data.

    Embeds agent identity, capabilities, mesh topology, and live operational
    state as machine-readable structured data. Enables client-side mesh
    composition at interagent.safety-quotient.dev without a backend.
    """
    agent_id = status.get("agent_id", "unknown")
    totals = status.get("totals", {})
    budget = status.get("autonomy_budget", {})
    heartbeat = status.get("heartbeat", {})
    registry = status.get("registry_agents", {})
    collected_at = status.get("collected_at", "")
    crystal = status.get("crystallization", {})

    # Peer agents as related applications
    peers = []
    for peer_id, peer_cfg in registry.items():
        if peer_id == agent_id:
            continue
        peer_entry = {
            "@type": "SoftwareApplication",
            "name": peer_id,
            "applicationCategory": peer_cfg.get("role", "agent"),
            "additionalProperty": [
                {
                    "@type": "PropertyValue",
                    "name": "transport",
                    "value": peer_cfg.get("transport", "unknown"),
                },
                {
                    "@type": "PropertyValue",
                    "name": "autonomous",
                    "value": peer_cfg.get("autonomous", False),
                },
            ],
        }
        peers.append(peer_entry)

    # Active gates as pending actions
    gate_actions = []
    for gate in status.get("pending_handoffs", []):
        gate_actions.append({
            "@type": "Action",
            "name": f"gate:{gate.get('gate_id', '?')}",
            "actionStatus": "PotentialActionStatus",
            "agent": {"@type": "SoftwareApplication", "name": gate.get("sending_agent", "?")},
            "target": {"@type": "SoftwareApplication", "name": gate.get("receiving_agent", "?")},
            "startTime": gate.get("created_at", ""),
        })

    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": f"https://{agent_id}.safety-quotient.dev",
        "name": agent_id,
        "description": f"Autonomous mesh agent — {agent_id}",
        "applicationCategory": "Agent",
        "operatingSystem": "Linux/macOS",
        "url": f"https://{agent_id}.safety-quotient.dev",
        "provider": {
            "@type": "Organization",
            "name": "Safety Quotient Lab",
            "url": "https://github.com/safety-quotient-lab",
        },
        "isPartOf": {
            "@type": "SoftwareApplication",
            "name": "safety-quotient-mesh",
            "url": "https://interagent.safety-quotient.dev",
            "description": "Federated inter-agent mesh for psychoemotional safety research",
        },
        "potentialAction": gate_actions if gate_actions else [],
        "additionalProperty": [
            {"@type": "PropertyValue", "name": "schema_version", "value": status.get("schema_version", "?")},
            {"@type": "PropertyValue", "name": "total_messages", "value": totals.get("messages", 0)},
            {"@type": "PropertyValue", "name": "total_sessions", "value": totals.get("sessions", 0)},
            {"@type": "PropertyValue", "name": "unprocessed_messages", "value": totals.get("unprocessed", 0)},
            {"@type": "PropertyValue", "name": "pending_handoffs", "value": totals.get("pending_handoffs", 0)},
            {"@type": "PropertyValue", "name": "epistemic_flags_unresolved", "value": totals.get("epistemic_flags_unresolved", 0)},
            {"@type": "PropertyValue", "name": "autonomy_budget_spent", "value": budget.get("budget_spent", "?")},
            {"@type": "PropertyValue", "name": "autonomy_budget_cutoff", "value": budget.get("budget_cutoff", "?")},
            {"@type": "PropertyValue", "name": "collected_at", "value": collected_at},
            {"@type": "PropertyValue", "name": "crystallization_rate", "value": crystal.get("rate_percent", 0)},
            {"@type": "PropertyValue", "name": "crystallized_count", "value": crystal.get("crystallized_count", 0)},
        ],
        "relatedLink": [
            f"https://{agent_id}.safety-quotient.dev/api/status",
        ],
        "hasPart": peers,
    }


# ── State of Play Renderer ────────────────────────────────────────────────

def _render_state_of_play(status: dict) -> str:
    """Render the State of Play tab content."""
    sop = status.get("state_of_play", {})
    thread = sop.get("active_thread", {})
    todo = sop.get("todo", {})
    peer_sync = sop.get("peer_sync", [])
    gates = status.get("pending_handoffs", [])

    # Active Thread section
    last_session = thread.get("last_session", "unknown")
    next_work = thread.get("next", "none specified")
    status_lines = thread.get("status_lines", [])

    status_html = ""
    for line in status_lines:
        # Parse status markers: ✓ = green, ⚑ = yellow, other = gray
        if line.strip().startswith("✓") or "✓" in line[:30]:
            dot_class = "dot-green"
        elif "⚑" in line[:30]:
            dot_class = "dot-yellow"
        else:
            dot_class = "dot-gray"
        status_html += f'<div class="status-line"><span class="dot {dot_class}"></span> {line}</div>\n'

    # Gates section — enriched with response tracking
    gates_html = ""
    if gates:
        for gate in gates:
            gate_id = gate.get("gate_id", "?")
            receiving = gate.get("receiving_agent", "?")
            session = gate.get("session_name", "?")
            timeout_at = gate.get("timeout_at", "?")
            fallback = gate.get("fallback_action", "?")

            # Compute time remaining
            time_remaining = ""
            try:
                timeout_dt = datetime.fromisoformat(timeout_at)
                now = datetime.now(timeout_dt.tzinfo) if timeout_dt.tzinfo else datetime.now()
                remaining = timeout_dt - now
                hours_left = remaining.total_seconds() / 3600
                if hours_left > 0:
                    if hours_left >= 1:
                        time_remaining = f"{hours_left:.1f}h left"
                    else:
                        time_remaining = f"{int(remaining.total_seconds() / 60)}m left"
                else:
                    time_remaining = "EXPIRED"
            except (ValueError, TypeError):
                time_remaining = "?"

            timeout_class = "alert" if time_remaining == "EXPIRED" else ""

            gates_html += f"""
            <tr>
                <td><strong>{gate_id}</strong></td>
                <td>{receiving}</td>
                <td>{session}</td>
                <td class="{timeout_class}">{time_remaining}</td>
                <td>{fallback}</td>
            </tr>"""
    else:
        gates_html = '<tr><td colspan="5" class="empty">No active gates</td></tr>'

    # TODO backlog section
    todo_sections_html = ""
    active_sections = todo.get("sections", [])
    for section in active_sections:
        items_html = ""
        for item in section.get("items", []):
            if not item["done"]:
                items_html += f'<div class="todo-item">&#x2610; {item["label"]}</div>\n'
        todo_sections_html += f"""
        <div class="todo-section">
            <div class="todo-section-header">
                <span class="todo-section-name">{section['name']}</span>
                <span class="todo-count">{section['open']} open</span>
            </div>
            {items_html}
        </div>"""

    total_open = todo.get("total_open", 0)
    total_complete = todo.get("total_complete", 0)

    # Peer sync recency
    peer_rows_html = ""
    if peer_sync:
        for peer in peer_sync:
            budget_str = f"{peer.get('budget_spent', '?')}/{peer.get('budget_cutoff', '?')} spent"
            peer_rows_html += f"""
            <tr>
                <td>{peer['agent_id']}</td>
                <td>{peer['last_ran']}</td>
                <td>{budget_str}</td>
            </tr>"""
    else:
        peer_rows_html = '<tr><td colspan="3" class="empty">No peer state snapshots available</td></tr>'

    return f"""
    <div class="sop-thread">
        <h2>Active Thread</h2>
        <div class="card" style="margin-bottom:16px">
            <div class="sop-label">Where we stopped</div>
            <div class="sop-value">{last_session}</div>
            <div class="sop-label" style="margin-top:12px">Next</div>
            <div class="sop-value">{next_work}</div>
        </div>
        {"<h3>Status by tier</h3><div class='card' style='margin-bottom:16px'>" + status_html + "</div>" if status_html else ""}
    </div>

    <h2>Gated Exchanges</h2>
    <table>
        <tr><th>Gate</th><th>Waiting on</th><th>Session</th><th>Time left</th><th>Fallback</th></tr>
        {gates_html}
    </table>

    <h2>TODO Backlog <span class="todo-summary">{total_open} open / {total_complete} complete</span></h2>
    <div class="todo-grid">
        {todo_sections_html or '<div class="empty">No open TODO items</div>'}
    </div>

    <h2>Peer Sync Recency</h2>
    <table>
        <tr><th>Agent</th><th>Last snapshot</th><th>Budget</th></tr>
        {peer_rows_html}
    </table>
    """


# ── Messages Tab Renderer ─────────────────────────────────────────────────

def _render_messages_tab(status: dict) -> str:
    """Render session-threaded message view."""
    summaries = status.get("session_summaries", [])
    session_msgs = status.get("session_messages", {})
    gates = status.get("pending_handoffs", [])
    gate_sessions = {g.get("session_name") for g in gates}

    if not summaries:
        return '<div class="empty">No transport messages</div>'

    # Summary cards
    total_msgs = sum(s.get("total_messages", 0) for s in summaries)
    total_unproc = sum(s.get("unprocessed", 0) for s in summaries)
    active_sessions = sum(1 for s in summaries if s.get("unprocessed", 0) > 0
                          or s.get("session_name") in gate_sessions)

    cards_html = f"""
    <div class="grid">
        <div class="card">
            <div class="card-label">Total Messages</div>
            <div class="card-value">{total_msgs}</div>
            <div class="card-detail">across {len(summaries)} sessions</div>
        </div>
        <div class="card">
            <div class="card-label">Unprocessed</div>
            <div class="card-value{' alert' if total_unproc > 0 else ''}">{total_unproc}</div>
            <div class="card-detail">awaiting processing</div>
        </div>
        <div class="card">
            <div class="card-label">Active Sessions</div>
            <div class="card-value{' alert' if active_sessions > 0 else ''}">{active_sessions}</div>
            <div class="card-detail">with pending work or gates</div>
        </div>
    </div>
    """

    # Session threads
    sessions_html = ""
    for idx, summary in enumerate(summaries):
        sn = summary.get("session_name", "?")
        total = summary.get("total_messages", 0)
        unproc = summary.get("unprocessed", 0)
        participants = summary.get("participants", "").split(",")
        started = summary.get("started", "?")
        latest = summary.get("latest", "?")
        last_turn = summary.get("last_turn", 0)
        has_gate = sn in gate_sessions

        # Session status
        if unproc > 0:
            status_class = "session-active"
            status_icon = "&#x25CF;"  # filled circle
            status_label = f"{unproc} unprocessed"
        elif has_gate:
            status_class = "session-gated"
            status_icon = "&#x29D6;"  # hourglass
            status_label = "gated"
        else:
            status_class = "session-complete"
            status_icon = "&#x2713;"  # checkmark
            status_label = "complete"

        # Participant badges
        badges = " ".join(
            f'<span class="participant-badge">{p.strip()}</span>'
            for p in participants if p.strip()
        )

        # Message thread within session
        msgs = session_msgs.get(sn, [])
        thread_html = ""
        for msg in msgs:
            turn = msg.get("turn", "?")
            from_agent = msg.get("from_agent", "?")
            msg_type = msg.get("message_type", "?")
            subject = msg.get("subject", "") or ""
            processed = msg.get("processed")
            timestamp = msg.get("timestamp", "")

            proc_class = "msg-processed" if processed else "msg-pending"
            type_class = f"type-{msg_type}" if msg_type in (
                "request", "response", "review", "ack", "notification",
                "consensus-proposal", "session-close", "advisory",
                "gate-resolution"
            ) else "type-default"

            # Truncate subject for display
            display_subject = subject[:80] + ("..." if len(subject) > 80 else "")

            thread_html += f"""
            <div class="msg-row {proc_class}">
                <div class="msg-turn">T{turn}</div>
                <div class="msg-type {type_class}">{msg_type}</div>
                <div class="msg-from">{from_agent}</div>
                <div class="msg-subject">{display_subject}</div>
            </div>"""

        sid = f"session-thread-{idx}"
        sessions_html += f"""
        <div class="session-card {status_class}">
            <div class="session-header" onclick="toggleSession('{sid}')">
                <div class="session-title">
                    <span class="session-status-icon">{status_icon}</span>
                    <span class="session-name">{sn}</span>
                    <span class="session-status-label">{status_label}</span>
                </div>
                <div class="session-meta">
                    {badges}
                    <span class="session-count">{total} msgs · T{last_turn}</span>
                </div>
            </div>
            <div id="{sid}" class="session-thread" style="display:none">
                {thread_html}
            </div>
        </div>
        """

    return cards_html + "<h2>Sessions</h2>" + sessions_html


# ── Replays Tab Renderer ─────────────────────────────────────────────────

def _render_replays_tab(status: dict) -> str:
    """Render replays organized by agent with preview context."""
    local_replays = status.get("replays", {}).get("local", [])
    remote_replays = status.get("replays", {}).get("remote", [])

    total = len(local_replays) + len(remote_replays)
    if total == 0:
        return '<div class="empty">No session replays available</div>'

    cards_html = f"""
    <div class="grid">
        <div class="card">
            <div class="card-label">Local Replays</div>
            <div class="card-value">{len(local_replays)}</div>
            <div class="card-detail">from this agent</div>
        </div>
        <div class="card">
            <div class="card-label">Peer Replays</div>
            <div class="card-value">{len(remote_replays)}</div>
            <div class="card-detail">from remote agents</div>
        </div>
    </div>
    """

    # Local replays — grouped as cards with direct links
    local_html = ""
    if local_replays:
        sorted_replays = sorted(local_replays, key=lambda r: r.get("session", 0) or 0, reverse=True)
        for replay in sorted_replays:
            fname = replay.get("filename", "")
            session = replay.get("session")
            size_kb = replay.get("size_kb", 0)
            modified = replay.get("modified", "")
            session_label = f"Session {session}" if session else fname

            local_html += f"""
            <a href="/replays/{fname}" class="replay-card" target="_blank">
                <div class="replay-session">{session_label}</div>
                <div class="replay-meta">{size_kb} KB · {modified}</div>
            </a>"""
    else:
        local_html = '<div class="empty">No local replays</div>'

    # Remote replays — grouped by agent
    remote_html = ""
    if remote_replays:
        by_agent = {}
        for r in remote_replays:
            aid = r.get("agent_id", "unknown")
            if aid not in by_agent:
                by_agent[aid] = []
            by_agent[aid].append(r)

        for agent_id, replays in by_agent.items():
            agent_cards = ""
            for replay in sorted(replays, key=lambda r: r.get("filename", "")):
                fname = replay.get("filename", "")
                remote = replay.get("remote", "")
                # Extract session number
                m = re.match(r"session-(\d+)", fname)
                session_label = f"Session {m.group(1)}" if m else fname

                agent_cards += f"""
                <a href="/replays/remote/{remote}/{fname}" class="replay-card" target="_blank">
                    <div class="replay-session">{session_label}</div>
                    <div class="replay-meta">{agent_id}</div>
                </a>"""

            remote_html += f"""
            <h3>{agent_id}</h3>
            <div class="replay-grid">{agent_cards}</div>
            """
    else:
        remote_html = '<div class="empty">No peer replays available</div>'

    gen_hint = """
    <div style="margin-top:16px; padding:12px; background:#161b22; border:1px solid #21262d; border-radius:6px; font-size:0.85em; color:#8b949e">
        <strong>Generate:</strong>
        <code style="color:#c9d1d9">scripts/generate-replays.sh</code>
    </div>
    """

    return (
        cards_html
        + "<h2>This Agent</h2><div class='replay-grid'>"
        + local_html + "</div>"
        + "<h2>Peer Agents</h2>" + remote_html
        + gen_hint
    )


# ── HTML Template ────────────────────────────────────────────────────────

def render_html(status: dict) -> str:
    """Render status data as an HTML dashboard."""
    budget = status.get("autonomy_budget", {})
    totals = status.get("totals", {})
    schedule = status.get("schedule", {})

    budget_spent = budget.get("budget_spent", "?")
    budget_cutoff = budget.get("budget_cutoff", "?")
    last_action = budget.get("last_action", "never")
    consecutive_blocks = budget.get("consecutive_blocks", 0)
    shadow_mode = budget.get("shadow_mode", 0)
    crystal = status.get("crystallization", {})

    # Budget bar
    if isinstance(budget_spent, (int, float)) and isinstance(budget_cutoff, (int, float)) and budget_cutoff > 0:
        budget_ratio = 1.0 - (budget_spent / budget_cutoff)
        budget_pct = int(budget_ratio * 100)
        if budget_pct > 60:
            budget_color = "#4caf50"
        elif budget_pct > 30:
            budget_color = "#ff9800"
        else:
            budget_color = "#f44336"
    elif isinstance(budget_cutoff, (int, float)) and budget_cutoff == 0:
        # Unlimited
        budget_pct = 100
        budget_color = "#4caf50"
    else:
        budget_pct = 0
        budget_color = "#666"

    # Peers HTML
    peers_html = ""
    for peer in status.get("peers", []):
        last_seen = peer.get("last_seen", "unknown")
        try:
            dt = datetime.fromisoformat(last_seen)
            elapsed = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
            delta = elapsed - dt
            hours = delta.total_seconds() / 3600
            if hours < 1:
                tier_class = "tier-active"
                tier_label = "ACTIVE"
            elif hours < COLD_THRESHOLD_HOURS:
                tier_class = "tier-warm"
                tier_label = "warm"
            else:
                tier_class = "tier-cold"
                tier_label = "cold"
            age = f"{hours:.1f}h ago"
        except (ValueError, TypeError):
            tier_class = "tier-cold"
            tier_label = "?"
            age = last_seen

        reg = status.get("registry_agents", {}).get(peer["from_agent"], {})
        role = reg.get("role", "")
        autonomous = "🤖" if reg.get("autonomous") else ""

        peers_html += f"""
        <tr>
            <td>{peer['from_agent']} {autonomous}</td>
            <td>{role}</td>
            <td><span class="{tier_class}">{tier_label}</span></td>
            <td>{age}</td>
            <td>{peer['total_messages']}</td>
        </tr>"""

    # Active gates HTML
    gates_html = ""
    for gate in status.get("pending_handoffs", []):
        gates_html += f"""
        <tr>
            <td>{gate.get('gate_id', '?')}</td>
            <td>{gate.get('receiving_agent', '?')}</td>
            <td>{gate.get('session_name', '?')}</td>
            <td>{gate.get('timeout_at', '?')}</td>
            <td>{gate.get('fallback_action', '?')}</td>
        </tr>"""

    if not gates_html:
        gates_html = '<tr><td colspan="5" class="empty">No active gates</td></tr>'

    # Recent actions HTML — accordion with full details
    actions_html = ""
    for idx, action in enumerate(status.get("recent_actions", [])):
        aid = f"action-{idx}"
        result = action.get("evaluator_result", "?")
        result_class = "result-approved" if result == "approved" else "result-blocked"
        cost = action.get("budget_before", 0) - action.get("budget_after", 0)
        description = action.get('description', '') or ''
        actions_html += f"""
        <tr class="accordion-header" onclick="toggleRow('{aid}')">
            <td>▸</td>
            <td>{action.get('action_type', '?')}</td>
            <td><span class="{result_class}">{result}</span></td>
            <td>T{action.get('evaluator_tier', '?')}</td>
            <td>{cost}</td>
            <td>{action.get('created_at', '?')}</td>
        </tr>
        <tr id="{aid}" class="accordion-detail" style="display:none">
            <td colspan="6">
                <div class="detail-grid">
                    <div><span class="detail-label">Description:</span> {description}</div>
                    <div><span class="detail-label">Action type:</span> {action.get('action_type', '?')}</div>
                    <div><span class="detail-label">Action class:</span> {action.get('action_class', '?')}</div>
                    <div><span class="detail-label">Evaluator tier:</span> T{action.get('evaluator_tier', '?')}</div>
                    <div><span class="detail-label">Result:</span> {result}</div>
                    <div><span class="detail-label">Budget before:</span> {action.get('budget_before', '?')}</div>
                    <div><span class="detail-label">Budget after:</span> {action.get('budget_after', '?')}</div>
                    <div><span class="detail-label">Cost:</span> {cost}</div>
                    <div><span class="detail-label">Time:</span> {action.get('created_at', '?')}</div>
                </div>
            </td>
        </tr>"""

    if not actions_html:
        actions_html = '<tr><td colspan="6" class="empty">No autonomous actions recorded</td></tr>'

    # ── Remote peer states ─────────────────────────────────────────────
    remote_html = ""
    for rs in status.get("remote_states", []):
        agent = rs.get("agent_id", "unknown")
        ts = rs.get("timestamp", "?")
        source = rs.get("_source", "?")
        trust = rs.get("autonomy_budget", {})
        transport = rs.get("transport", {})
        budget_str = f"{trust.get('budget_spent', '?')}/{trust.get('budget_cutoff', '?')} spent" if trust else "—"
        unprocessed = transport.get("unprocessed", 0)
        pending_handoffs = transport.get("pending_handoffs", 0)
        total_msgs = transport.get("total_messages", 0)
        schema_ver = rs.get("schema_version", "?")
        epi_flags = rs.get("epistemic_flags_unresolved", 0)

        # PSH summary
        psh = rs.get("psh_facets", {})
        psh_str = ", ".join(f"{k}: {v}" for k, v in list(psh.items())[:5]) if psh else "—"

        remote_html += f"""
        <tr>
            <td>{agent}</td>
            <td>{budget_str}</td>
            <td>{unprocessed}</td>
            <td>{pending_handoffs}</td>
            <td>{total_msgs}</td>
            <td>{epi_flags}</td>
            <td>v{schema_ver}</td>
            <td>{ts}</td>
        </tr>
        <tr><td colspan="8" style="font-size:0.8em; color:#8b949e; padding:2px 12px 8px">
            Source: {source} · PSH: {psh_str}
        </td></tr>"""

    if not remote_html:
        remote_html = '<tr><td colspan="8" class="empty">No remote state snapshots available</td></tr>'

    # ── Semiotics tab ──────────────────────────────────────────────────
    semiotics = status.get("semiotics", {})
    psh_dist = semiotics.get("psh_distribution", [])
    schema_dist = semiotics.get("schema_distribution", [])
    vocab = semiotics.get("vocabulary", [])
    version_dist = semiotics.get("version_distribution", [])
    low_conf = semiotics.get("low_confidence_count", 0)

    # Max entity count for bar scaling
    max_psh_count = max((d.get("entity_count", 0) for d in psh_dist), default=1)

    # PSH distribution with bars
    psh_rows = ""
    for d in psh_dist:
        cat = d.get("facet_value", "?")
        count = d.get("entity_count", 0)
        avg_conf = d.get("avg_confidence", 0) or 0
        bar_pct = int((count / max_psh_count) * 100) if max_psh_count else 0

        # Confidence color
        if avg_conf < 0.05:
            conf_class = "conf-low"
        elif avg_conf < 0.12:
            conf_class = "conf-mid"
        else:
            conf_class = "conf-high"

        # Find code from vocab
        code = ""
        for v in vocab:
            if v.get("facet_value") == cat and v.get("facet_type") == "psh":
                code = v.get("code", "")
                break

        psh_rows += f"""
        <tr>
            <td>{cat}</td>
            <td style="color:#6e7681">{code}</td>
            <td style="text-align:right">{count}</td>
            <td class="{conf_class}" style="text-align:right">{avg_conf:.3f}</td>
            <td style="width:30%"><div class="psh-bar"><div class="psh-fill" style="width:{bar_pct}%;background:#58a6ff"></div></div></td>
        </tr>"""

    # Schema.org distribution
    schema_rows = ""
    for d in schema_dist:
        schema_rows += f"""
        <tr>
            <td>{d.get('facet_value', '?')}</td>
            <td style="text-align:right">{d.get('entity_count', 0)}</td>
        </tr>"""

    # Vocabulary registry — active then inactive
    active_vocab = [v for v in vocab if v.get("active")]
    inactive_vocab = [v for v in vocab if not v.get("active") and v.get("facet_type") == "psh"]

    active_rows = ""
    for v in active_vocab:
        ft = v.get("facet_type", "?")
        fv = v.get("facet_value", "?")
        code = v.get("code", "—")
        source = v.get("source", "?")
        desc = v.get("description", "")
        scope = v.get("entity_scope", "")
        src_class = "source-psh" if source == "PSH" else "source-local" if source == "project-local" else "source-schema"
        active_rows += f"""
        <tr>
            <td>{fv}</td>
            <td>{ft}</td>
            <td style="color:#6e7681">{code}</td>
            <td class="{src_class}">{source}</td>
            <td style="color:#6e7681;font-size:0.85em">{desc[:60]}</td>
        </tr>"""

    inactive_rows = ""
    for v in inactive_vocab:
        fv = v.get("facet_value", "?")
        code = v.get("code", "—")
        desc = v.get("description", "")
        inactive_rows += f"""
        <tr style="color:#484f58">
            <td>{fv}</td>
            <td style="color:#6e7681">{code}</td>
            <td>{desc}</td>
        </tr>"""

    # Version distribution
    version_rows = ""
    for v in version_dist:
        ver = v.get("keyword_set_version", "?")
        version_rows += f"""
        <tr>
            <td>v{ver if ver else 'legacy'}</td>
            <td style="text-align:right">{v.get('facet_count', 0)}</td>
            <td style="color:#6e7681">{v.get('oldest', '—')}</td>
            <td style="color:#6e7681">{v.get('newest', '—')}</td>
        </tr>"""

    total_facets = sum(d.get("entity_count", 0) for d in psh_dist) + sum(d.get("entity_count", 0) for d in schema_dist)
    active_categories = len([d for d in psh_dist if d.get("facet_value") != "unclassified"])

    # ── Replays tab ──────────────────────────────────────────────────────
    # Build JSON-LD structured data
    jsonld = _build_jsonld(status)
    jsonld_block = f'<script type="application/ld+json">\n{json.dumps(jsonld, indent=2)}\n    </script>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <!-- SSE replaces meta refresh — updates only when data changes -->
    <title>Mesh Status — {status['agent_id']}</title>
    {jsonld_block}
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            background: #0d1117; color: #c9d1d9;
            padding: 0; line-height: 1.5;
            padding-top: 100px;
        }}
        .nav-header {{
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: #161b22;
            border-bottom: 1px solid #21262d;
            padding: 0;
        }}
        .nav-top {{
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 24px 0 24px;
        }}
        .nav-title {{
            color: #58a6ff; font-size: 1.2em; font-weight: bold;
            display: flex; align-items: center; gap: 8px;
        }}
        .nav-status {{
            display: flex; gap: 16px; align-items: center;
            font-size: 0.8em; color: #8b949e;
        }}
        .nav-status .indicator {{
            display: flex; align-items: center; gap: 4px;
        }}
        .nav-status .dot {{
            width: 8px; height: 8px; border-radius: 50%;
            display: inline-block;
        }}
        .dot-green {{ background: #3fb950; }}
        .dot-yellow {{ background: #d29922; }}
        .dot-red {{ background: #f85149; }}
        .dot-gray {{ background: #484f58; }}
        .nav-tabs {{
            display: flex; gap: 0; padding: 0 24px;
            margin-top: 8px;
        }}
        .nav-tabs .tab {{
            padding: 8px 20px; cursor: pointer;
            color: #8b949e; font-size: 0.9em;
            border-bottom: 2px solid transparent;
            transition: color 0.15s, border-color 0.15s;
        }}
        .nav-tabs .tab:hover {{ color: #c9d1d9; }}
        .nav-tabs .tab.active {{
            color: #58a6ff; border-bottom-color: #58a6ff;
            font-weight: bold;
        }}
        .main-content {{ padding: 20px 24px; }}
        h1 {{ color: #58a6ff; font-size: 1.4em; margin-bottom: 4px; }}
        h2 {{
            color: #8b949e; font-size: 1.0em; margin: 24px 0 8px 0;
            border-bottom: 1px solid #21262d; padding-bottom: 4px;
        }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }}
        .card {{
            background: #161b22; border: 1px solid #21262d;
            border-radius: 6px; padding: 12px;
        }}
        .card-label {{ color: #8b949e; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; }}
        .card-value {{ color: #f0f6fc; font-size: 1.6em; font-weight: bold; margin-top: 2px; }}
        .card-detail {{ color: #8b949e; font-size: 0.8em; margin-top: 4px; }}
        .budget-bar {{
            width: 100%; height: 8px; background: #21262d;
            border-radius: 4px; margin-top: 6px; overflow: hidden;
        }}
        .budget-fill {{
            height: 100%; border-radius: 4px;
            transition: width 0.5s ease;
        }}
        table {{
            width: 100%; border-collapse: collapse;
            background: #161b22; border: 1px solid #21262d;
            border-radius: 6px; overflow: hidden;
            font-size: 0.85em; margin-bottom: 16px;
        }}
        th {{
            text-align: left; padding: 8px 10px;
            background: #1c2128; color: #8b949e;
            font-weight: normal; font-size: 0.8em;
            text-transform: uppercase; letter-spacing: 0.05em;
        }}
        td {{ padding: 6px 10px; border-top: 1px solid #21262d; }}
        tr.pending td {{ color: #f0f6fc; }}
        tr.processed td {{ color: #6e7681; }}
        .empty {{ color: #484f58; text-align: center; font-style: italic; padding: 16px; }}
        .tier-active {{ color: #3fb950; font-weight: bold; }}
        .tier-warm {{ color: #d29922; }}
        .tier-cold {{ color: #484f58; }}
        .result-approved {{ color: #3fb950; }}
        .result-blocked {{ color: #f85149; }}
        .alert {{ color: #f85149; font-weight: bold; }}
        .ok {{ color: #3fb950; }}
        .accordion-header {{ cursor: pointer; }}
        .accordion-header:hover td {{ background: #1c2128; }}
        .accordion-detail td {{ background: #0d1117 !important; padding: 12px 16px; }}
        .detail-grid {{
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 6px 24px; font-size: 0.9em;
        }}
        .detail-label {{ color: #8b949e; }}
        .schedule-row {{ display: flex; gap: 24px; flex-wrap: wrap; }}
        .schedule-item {{ flex: 1; min-width: 180px; }}
        .schedule-label {{ color: #8b949e; font-size: 0.75em; text-transform: uppercase; }}
        .schedule-value {{ color: #c9d1d9; font-size: 0.95em; margin-top: 2px; }}
        .lock-active {{ color: #d29922; }}
        .lock-stale {{ color: #f85149; }}
        footer {{
            margin-top: 32px; padding-top: 12px;
            border-top: 1px solid #21262d;
            color: #484f58; font-size: 0.75em;
        }}
        .tab-content {{ display: none; }}
        .tab-content.active {{ display: block; }}
        .psh-bar {{
            height: 16px; border-radius: 3px;
            background: #21262d; overflow: hidden;
            margin-top: 2px;
        }}
        .psh-fill {{
            height: 100%; border-radius: 3px;
        }}
        .source-psh {{ color: #58a6ff; }}
        .source-local {{ color: #d29922; }}
        .source-schema {{ color: #a371f7; }}
        .active-badge {{ color: #3fb950; font-size: 0.8em; }}
        .inactive-badge {{ color: #484f58; font-size: 0.8em; }}
        .conf-low {{ color: #f85149; }}
        .conf-mid {{ color: #d29922; }}
        .conf-high {{ color: #3fb950; }}
        /* State of Play tab */
        .sop-label {{ color: #8b949e; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }}
        .sop-value {{ color: #e6edf3; font-size: 0.95em; line-height: 1.5; }}
        .status-line {{ padding: 4px 0; font-size: 0.9em; color: #c9d1d9; display: flex; align-items: center; gap: 8px; }}
        .todo-grid {{ display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }}
        .todo-section {{ background: #161b22; border: 1px solid #21262d; border-radius: 6px; padding: 12px; min-width: 250px; flex: 1; }}
        .todo-section-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #21262d; padding-bottom: 6px; }}
        .todo-section-name {{ font-weight: 600; color: #e6edf3; font-size: 0.9em; }}
        .todo-count {{ color: #8b949e; font-size: 0.8em; }}
        .todo-item {{ padding: 3px 0; font-size: 0.85em; color: #c9d1d9; }}
        .todo-summary {{ color: #8b949e; font-size: 0.6em; font-weight: normal; margin-left: 8px; }}
        /* Messages tab — session threads */
        .session-card {{ background: #161b22; border: 1px solid #21262d; border-radius: 6px; margin-bottom: 8px; overflow: hidden; }}
        .session-card.session-active {{ border-left: 3px solid #f85149; }}
        .session-card.session-gated {{ border-left: 3px solid #d29922; }}
        .session-card.session-complete {{ border-left: 3px solid #21262d; }}
        .session-header {{ display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; }}
        .session-header:hover {{ background: #1c2128; }}
        .session-title {{ display: flex; align-items: center; gap: 8px; }}
        .session-name {{ font-weight: 600; color: #e6edf3; }}
        .session-status-icon {{ font-size: 0.9em; }}
        .session-active .session-status-icon {{ color: #f85149; }}
        .session-gated .session-status-icon {{ color: #d29922; }}
        .session-complete .session-status-icon {{ color: #3fb950; }}
        .session-status-label {{ font-size: 0.75em; color: #8b949e; }}
        .session-meta {{ display: flex; align-items: center; gap: 8px; }}
        .session-count {{ font-size: 0.8em; color: #8b949e; }}
        .participant-badge {{ font-size: 0.7em; padding: 2px 6px; background: #21262d; border-radius: 10px; color: #8b949e; }}
        .session-thread {{ border-top: 1px solid #21262d; padding: 8px 0; }}
        .msg-row {{ display: grid; grid-template-columns: 40px 120px 140px 1fr; gap: 8px; padding: 4px 14px; font-size: 0.85em; align-items: center; }}
        .msg-row.msg-pending {{ color: #e6edf3; }}
        .msg-row.msg-processed {{ color: #6e7681; }}
        .msg-turn {{ color: #8b949e; font-family: monospace; font-size: 0.85em; }}
        .msg-type {{ font-size: 0.8em; padding: 1px 6px; border-radius: 3px; background: #21262d; text-align: center; }}
        .type-request {{ background: #1f3a5f; color: #58a6ff; }}
        .type-response {{ background: #1a3d2e; color: #3fb950; }}
        .type-review {{ background: #3d2b1a; color: #d29922; }}
        .type-ack {{ background: #21262d; color: #8b949e; }}
        .type-notification {{ background: #2d1f3d; color: #a371f7; }}
        .type-consensus-proposal {{ background: #3d1a2b; color: #f778ba; }}
        .type-session-close {{ background: #21262d; color: #484f58; }}
        .type-advisory {{ background: #3d2b1a; color: #d29922; }}
        .type-gate-resolution {{ background: #1a3d2e; color: #3fb950; }}
        .type-default {{ background: #21262d; color: #8b949e; }}
        .msg-from {{ color: #8b949e; font-size: 0.85em; }}
        .msg-subject {{ color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
        /* Replays tab */
        .replay-grid {{ display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }}
        .replay-card {{ display: block; background: #161b22; border: 1px solid #21262d; border-radius: 6px; padding: 12px 16px; min-width: 160px; text-decoration: none; transition: border-color 0.2s; }}
        .replay-card:hover {{ border-color: #58a6ff; }}
        .replay-session {{ color: #58a6ff; font-weight: 600; font-size: 0.95em; }}
        .replay-meta {{ color: #8b949e; font-size: 0.8em; margin-top: 4px; }}
    </style>
</head>
<body>
    <nav class="nav-header">
        <div class="nav-top">
            <div class="nav-title">⬡ {status['agent_id']}</div>
            <div class="nav-status">
                <div class="indicator">
                    <span class="dot {'dot-green' if budget_pct > 60 else 'dot-yellow' if budget_pct > 30 else 'dot-red'}"></span>
                    budget {budget_spent}/{budget_cutoff} spent
                </div>
                <div class="indicator">
                    <span class="dot {'dot-red' if totals.get('unprocessed', 0) > 0 else 'dot-green'}"></span>
                    {totals.get('unprocessed', 0)} queued
                </div>
                <div class="indicator">
                    <span class="dot {'dot-yellow' if totals.get('pending_handoffs', 0) > 0 else 'dot-gray'}"></span>
                    {totals.get('pending_handoffs', 0)} handoffs
                </div>
                <div class="indicator">
                    <span class="dot dot-{'green' if crystal.get('rate_percent', 0) > 40 else 'yellow' if crystal.get('total_triaged', 0) > 0 else 'gray'}"></span>
                    {crystal.get('rate_percent', 0)}% crystallized
                </div>
                <div style="color:#484f58">v{status['schema_version']} · {status['collected_at']}</div>
            </div>
        </div>
        <div class="nav-tabs">
            <div class="tab" onclick="switchTab('state-of-play')">State of Play</div>
            <div class="tab active" onclick="switchTab('mesh')">Mesh</div>
            <div class="tab" onclick="switchTab('messages')">Messages</div>
            <div class="tab" onclick="switchTab('semiotics')">Semiotics</div>
            <div class="tab" onclick="switchTab('replays')">Replays</div>
        </div>
    </nav>

    <div class="main-content">

    <div id="tab-state-of-play" class="tab-content">
    {_render_state_of_play(status)}
    </div><!-- end tab-state-of-play -->

    <div id="tab-mesh" class="tab-content active">

    <div class="grid">
        <div class="card">
            <div class="card-label">Autonomy Budget</div>
            <div class="card-value" style="color: {budget_color}">{budget_spent} / {budget_cutoff} spent</div>
            <div class="budget-bar"><div class="budget-fill" style="width: {budget_pct}%; background: {budget_color}"></div></div>
            <div class="card-detail">Last action: {last_action or 'never'}</div>
        </div>
        <div class="card">
            <div class="card-label">Unprocessed</div>
            <div class="card-value{' alert' if totals.get('unprocessed', 0) > 0 else ''}">{totals.get('unprocessed', 0)}</div>
            <div class="card-detail">messages awaiting processing</div>
        </div>
        <div class="card">
            <div class="card-label">Pending Handoffs</div>
            <div class="card-value{' alert' if totals.get('pending_handoffs', 0) > 0 else ''}">{totals.get('pending_handoffs', 0)}</div>
            <div class="card-detail">blocking exchanges</div>
        </div>
        <div class="card">
            <div class="card-label">Total Messages</div>
            <div class="card-value">{totals.get('messages', 0)}</div>
            <div class="card-detail">across {totals.get('sessions', 0)} sessions</div>
        </div>
        <div class="card">
            <div class="card-label">Epistemic Debt</div>
            <div class="card-value">{totals.get('epistemic_flags_unresolved', 0)}</div>
            <div class="card-detail">unresolved flags</div>
        </div>
        <div class="card">
            <div class="card-label">Consecutive Errors</div>
            <div class="card-value{' alert' if consecutive_blocks and consecutive_blocks > 0 else ' ok'}">{consecutive_blocks}</div>
            <div class="card-detail">{'shadow mode ON' if shadow_mode else 'live mode'}</div>
        </div>
        <div class="card">
            <div class="card-label">Crystallization</div>
            <div class="card-value{' ok' if crystal.get('rate_percent', 0) > 40 else ''}">{crystal.get('rate_percent', 0)}%</div>
            <div class="card-detail">{crystal.get('crystallized_count', 0)}/{crystal.get('total_triaged', 0)} deterministic</div>
        </div>
    </div>

    <h2>Sync Schedule</h2>
    <div class="card" style="margin-bottom: 16px">
        <div class="schedule-row">
            <div class="schedule-item">
                <div class="schedule-label">Cron interval</div>
                <div class="schedule-value">{f"{schedule.get('cron_interval_min')} min" if schedule.get('cron_interval_min') else 'not configured'}</div>
            </div>
            <div class="schedule-item">
                <div class="schedule-label">Min action interval</div>
                <div class="schedule-value">{f"{schedule.get('min_action_interval_sec')}s" if schedule.get('min_action_interval_sec') else '?'}</div>
            </div>
            <div class="schedule-item">
                <div class="schedule-label">Last sync</div>
                <div class="schedule-value">{schedule.get('last_sync') or 'never'}</div>
            </div>
            <div class="schedule-item">
                <div class="schedule-label">Next expected</div>
                <div class="schedule-value">{schedule.get('next_expected') or '—'}</div>
            </div>
            <div class="schedule-item">
                <div class="schedule-label">Lock</div>
                <div class="schedule-value {'lock-active' if schedule.get('lock_active') else 'lock-stale' if schedule.get('lock_stale') else ''}">{
                    f"PID {schedule.get('lock_pid')} (running)" if schedule.get('lock_active')
                    else f"PID {schedule.get('lock_pid')} (stale)" if schedule.get('lock_stale')
                    else 'none'
                }</div>
            </div>
        </div>
        {f'<div style="margin-top:8px; font-size:0.8em; color:#6e7681">{schedule.get("cron_entry", "")}</div>' if schedule.get('cron_entry') else ''}
    </div>

    <h2>Peers</h2>
    <table>
        <tr><th>Agent</th><th>Role</th><th>Tier</th><th>Last Exchange</th><th>Messages</th></tr>
        {peers_html or '<tr><td colspan="5" class="empty">No peer activity recorded</td></tr>'}
    </table>

    <h2>Active Gates</h2>
    <table>
        <tr><th>Gate ID</th><th>Receiving Agent</th><th>Session</th><th>Timeout At</th><th>Fallback</th></tr>
        {gates_html}
    </table>

    <h2>Autonomous Actions</h2>
    <table>
        <tr><th></th><th>Type</th><th>Result</th><th>Tier</th><th>Cost</th><th>Time</th></tr>
        {actions_html}
    </table>

    <h2>Remote Peer State</h2>
    <table>
        <tr><th>Agent</th><th>Budget</th><th>Unprocessed</th><th>Gates</th><th>Messages</th><th>Epi Flags</th><th>Schema</th><th>Snapshot</th></tr>
        {remote_html}
    </table>

    </div><!-- end tab-mesh -->

    <div id="tab-messages" class="tab-content">
    {_render_messages_tab(status)}
    </div><!-- end tab-messages -->

    <div id="tab-semiotics" class="tab-content">

    <div class="grid">
        <div class="card">
            <div class="card-label">Total Facets</div>
            <div class="card-value">{total_facets}</div>
            <div class="card-detail">PSH + schema.org</div>
        </div>
        <div class="card">
            <div class="card-label">Active PSH Categories</div>
            <div class="card-value">{active_categories}</div>
            <div class="card-detail">of 44 PSH + project-local</div>
        </div>
        <div class="card">
            <div class="card-label">Inactive PSH Available</div>
            <div class="card-value">{len(inactive_vocab)}</div>
            <div class="card-detail">awaiting literary warrant</div>
        </div>
        <div class="card">
            <div class="card-label">Low Confidence</div>
            <div class="card-value{' alert' if low_conf > 50 else ''}">{low_conf}</div>
            <div class="card-detail">facets with conf &lt; 0.05</div>
        </div>
    </div>

    <h2>PSH Subject Distribution</h2>
    <table>
        <tr><th>Category</th><th>Code</th><th style="text-align:right">Entities</th><th style="text-align:right">Avg Conf</th><th>Distribution</th></tr>
        {psh_rows or '<tr><td colspan="5" class="empty">No PSH facets found</td></tr>'}
    </table>

    <h2>Schema.org Type Distribution</h2>
    <table>
        <tr><th>Type</th><th style="text-align:right">Entities</th></tr>
        {schema_rows or '<tr><td colspan="2" class="empty">No schema.org facets found</td></tr>'}
    </table>

    <h2>Active Vocabulary Registry</h2>
    <table>
        <tr><th>Value</th><th>Type</th><th>Code</th><th>Source</th><th>Description</th></tr>
        {active_rows or '<tr><td colspan="5" class="empty">No vocabulary entries</td></tr>'}
    </table>

    <h2>Inactive PSH Categories (Available for Activation)</h2>
    <table>
        <tr><th>Category</th><th>Code</th><th>Description</th></tr>
        {inactive_rows or '<tr><td colspan="3" class="empty">All categories active</td></tr>'}
    </table>

    <h2>Keyword Set Versions</h2>
    <table>
        <tr><th>Version</th><th style="text-align:right">Facets</th><th>Oldest</th><th>Newest</th></tr>
        {version_rows or '<tr><td colspan="4" class="empty">No version data</td></tr>'}
    </table>

    </div><!-- end tab-semiotics -->

    <div id="tab-replays" class="tab-content">
    {_render_replays_tab(status)}
    </div><!-- end tab-replays -->

    <script>
    function switchTab(tabName) {{
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-tabs .tab').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + tabName).classList.add('active');
        document.querySelector('.nav-tabs .tab[onclick*="' + tabName + '"]').classList.add('active');
        window.location.hash = tabName;
    }}
    (function() {{
        const hash = window.location.hash.replace('#', '');
        if (hash && document.getElementById('tab-' + hash)) {{
            switchTab(hash);
        }}
    }})();
    function toggleRow(id) {{
        const row = document.getElementById(id);
        const header = row.previousElementSibling;
        const arrow = header.querySelector('td:first-child');
        if (row.style.display === 'none') {{
            row.style.display = 'table-row';
            arrow.textContent = '▾';
        }} else {{
            row.style.display = 'none';
            arrow.textContent = '▸';
        }}
    }}
    function toggleSession(id) {{
        const thread = document.getElementById(id);
        thread.style.display = thread.style.display === 'none' ? 'block' : 'none';
    }}
    </script>

    </div><!-- end main-content -->

    <footer>
        {status['db_path']} · {'db exists' if status['db_exists'] else 'DB MISSING'}
    </footer>

    <script>
    // SSE live updates — reload page only when server data changes.
    // Replaces setInterval polling with server-push via EventSource.
    (function() {{
        if (typeof EventSource === 'undefined') return;

        var evtSource = new EventSource('/events');
        var currentGen = null;

        evtSource.addEventListener('connected', function(e) {{
            try {{
                var data = JSON.parse(e.data);
                currentGen = data.generation;
            }} catch (_) {{}}
        }});

        evtSource.addEventListener('refresh', function(e) {{
            try {{
                var data = JSON.parse(e.data);
                if (currentGen !== null && data.generation !== currentGen) {{
                    currentGen = data.generation;
                    location.reload();
                }}
            }} catch (_) {{}}
        }});

        evtSource.onerror = function() {{
            // SSE disconnected — fall back to periodic refresh after 60s
            evtSource.close();
            setTimeout(function() {{ location.reload(); }}, 60000);
        }};
    }})();
    </script>
</body>
</html>"""


# ── HTTP Server ──────────────────────────────────────────────────────────

class StatusHandler(BaseHTTPRequestHandler):
    """Serve the mesh status dashboard."""

    def do_GET(self):
        path = unquote(self.path).split("?")[0]

        # Serve local replay files
        if path.startswith("/replays/") and not path.startswith("/replays/remote/"):
            filename = Path(path).name
            # Sanitize: only allow .html files, no path traversal
            if not filename.endswith(".html") or "/" in filename or ".." in filename:
                self.send_error(404)
                return
            replay_path = REPLAYS_DIR / filename
            if not replay_path.exists():
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(replay_path.read_bytes())
            return

        # Serve remote replay files via git show
        if path.startswith("/replays/remote/"):
            # /replays/remote/{remote_name}/{filename}
            parts = path.split("/")
            if len(parts) != 5 or not parts[4].endswith(".html"):
                self.send_error(404)
                return
            remote_name = parts[3]
            filename = parts[4]
            # Sanitize
            if ".." in remote_name or "/" in filename or ".." in filename:
                self.send_error(404)
                return
            try:
                result = subprocess.run(
                    ["git", "-C", str(PROJECT_ROOT), "show",
                     f"{remote_name}/main:docs/replays/{filename}"],
                    capture_output=True, timeout=15
                )
                if result.returncode == 0 and result.stdout:
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(result.stdout)
                    return
            except (subprocess.TimeoutExpired, OSError):
                pass
            self.send_error(404)
            return

        origin = self.headers.get("Origin", "")
        cors = _cors_origin(origin)

        # /.well-known/agent-card.json — agent discovery
        if path == "/.well-known/agent-card.json":
            if AGENT_CARD_PATH.exists():
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Cache-Control", "public, max-age=3600")
                if cors:
                    self.send_header("Access-Control-Allow-Origin", cors)
                self.end_headers()
                self.wfile.write(AGENT_CARD_PATH.read_bytes())
            else:
                self.send_error(404)
            return

        # SSE endpoint — push refresh events when data changes
        if path == "/events":
            global _sse_generation, _sse_last_collected_at
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Accel-Buffering", "no")
            if cors:
                self.send_header("Access-Control-Allow-Origin", cors)
            self.end_headers()

            # Send initial generation
            status = collect_status()
            collected_at = status.get("collected_at", "")
            if collected_at != _sse_last_collected_at:
                _sse_generation += 1
                _sse_last_collected_at = collected_at
            self.wfile.write(
                f"event: connected\ndata: {{\"generation\":{_sse_generation}}}\n\n".encode()
            )
            self.wfile.flush()

            # Poll for changes, push SSE events
            try:
                while True:
                    time.sleep(10)
                    status = collect_status()
                    collected_at = status.get("collected_at", "")
                    if collected_at != _sse_last_collected_at:
                        _sse_generation += 1
                        _sse_last_collected_at = collected_at
                        self.wfile.write(
                            f"event: refresh\ndata: {{\"generation\":{_sse_generation}}}\n\n".encode()
                        )
                    else:
                        self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                return
            return

        if path == "/api/status":
            status = collect_status()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            if cors:
                self.send_header("Access-Control-Allow-Origin", cors)
            self.end_headers()
            self.wfile.write(json.dumps(status, indent=2).encode())
        else:
            status = collect_status()
            html = render_html(status)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            if cors:
                self.send_header("Access-Control-Allow-Origin", cors)
            self.end_headers()
            self.wfile.write(html.encode())

    def do_HEAD(self):
        """Handle HEAD requests (Cloudflare tunnel health checks)."""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()

    def log_message(self, format, *args):
        """Suppress default request logging."""
        pass


def main():
    parser = argparse.ArgumentParser(description="Mesh status dashboard")
    parser.add_argument("--port", type=int, default=8077,
                        help="HTTP port (default: 8077)")
    parser.add_argument("--json", action="store_true",
                        help="Dump status as JSON and exit (no server)")
    args = parser.parse_args()

    if args.json:
        print(json.dumps(collect_status(), indent=2))
        return

    server = ThreadingHTTPServer(("0.0.0.0", args.port), StatusHandler)
    server.daemon_threads = True
    print(f"Mesh status dashboard: http://localhost:{args.port}")
    print(f"JSON API: http://localhost:{args.port}/api/status")
    print(f"Reading from: {DB_PATH}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()

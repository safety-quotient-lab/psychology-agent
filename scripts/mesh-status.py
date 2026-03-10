#!/usr/bin/env python3
"""mesh-status.py — Real-time autonomous mesh status dashboard.

Serves a single HTML page that auto-refreshes every 30 seconds, showing
the current state of the agent mesh: trust budget, peer activity, transport
queue, active gates, recent actions, and sync health.

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
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REPLAYS_DIR = PROJECT_ROOT / "docs" / "replays"
DB_PATH = PROJECT_ROOT / "state.db"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"
REGISTRY_LOCAL_PATH = PROJECT_ROOT / "transport" / "agent-registry.local.json"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"

COLD_THRESHOLD_HOURS = 24


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


def _collect_schedule(agent_id: str) -> dict:
    """Collect sync schedule from cron, log file, and state.db."""
    import re
    import subprocess

    schedule = {
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
                    schedule["cron_entry"] = line.strip()
                    # Extract interval from */N pattern
                    m = re.match(r"\*/(\d+)", line.strip())
                    if m:
                        schedule["cron_interval_min"] = int(m.group(1))
                    # Check for hourly pattern "0 * * * *"
                    elif line.strip().startswith("0 "):
                        schedule["cron_interval_min"] = 60
                    break
    except (subprocess.TimeoutExpired, OSError):
        pass

    # min_action_interval from trust_budget
    row = query_db(
        "SELECT min_action_interval FROM trust_budget WHERE agent_id = ?",
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

    # Trust budget
    budget = query_db(
        "SELECT * FROM trust_budget WHERE agent_id = ?", (agent_id,)
    )
    budget_row = budget[0] if budget else {}

    # Active gates
    gates = query_db(
        "SELECT * FROM active_gates WHERE status = 'waiting' ORDER BY created_at"
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

    # Session replays
    local_replays = _collect_replays()
    remote_replays = _collect_remote_replays(registry_agents)

    return {
        "agent_id": agent_id,
        "collected_at": now_iso,
        "db_path": str(DB_PATH),
        "db_exists": DB_PATH.exists(),
        "schema_version": schema_ver,
        "trust_budget": budget_row,
        "active_gates": gates,
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
            "active_gates": len(gates),
            "epistemic_flags_unresolved": total_flags,
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
        "replays": {
            "local": local_replays,
            "remote": remote_replays,
        },
    }


# ── HTML Template ────────────────────────────────────────────────────────

def render_html(status: dict) -> str:
    """Render status data as an HTML dashboard."""
    budget = status.get("trust_budget", {})
    totals = status.get("totals", {})
    schedule = status.get("schedule", {})

    budget_current = budget.get("budget_current", "?")
    budget_max = budget.get("budget_max", "?")
    last_action = budget.get("last_action", "never")
    consecutive_blocks = budget.get("consecutive_blocks", 0)
    shadow_mode = budget.get("shadow_mode", 0)

    # Budget bar
    if isinstance(budget_current, (int, float)) and isinstance(budget_max, (int, float)) and budget_max > 0:
        budget_pct = int((budget_current / budget_max) * 100)
        if budget_pct > 60:
            budget_color = "#4caf50"
        elif budget_pct > 30:
            budget_color = "#ff9800"
        else:
            budget_color = "#f44336"
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

    # Unprocessed messages HTML — accordion with full details
    unprocessed_html = ""
    for idx, msg in enumerate(status.get("unprocessed_messages", [])):
        uid = f"unproc-{idx}"
        subject = msg.get('subject', '') or '(no subject)'
        unprocessed_html += f"""
        <tr class="accordion-header" onclick="toggleRow('{uid}')">
            <td>▸</td>
            <td>{msg.get('from_agent', '?')}</td>
            <td>{msg.get('session_name', '?')}</td>
            <td>{msg.get('turn', '?')}</td>
            <td>{msg.get('message_type', '?')}</td>
            <td>{msg.get('timestamp', '?')}</td>
        </tr>
        <tr id="{uid}" class="accordion-detail" style="display:none">
            <td colspan="6">
                <div class="detail-grid">
                    <div><span class="detail-label">Subject:</span> {subject}</div>
                    <div><span class="detail-label">Filename:</span> {msg.get('filename', '?')}</div>
                    <div><span class="detail-label">Session:</span> {msg.get('session_name', '?')}</div>
                    <div><span class="detail-label">Turn:</span> {msg.get('turn', '?')}</div>
                    <div><span class="detail-label">From:</span> {msg.get('from_agent', '?')}</div>
                    <div><span class="detail-label">Type:</span> {msg.get('message_type', '?')}</div>
                    <div><span class="detail-label">Timestamp:</span> {msg.get('timestamp', '?')}</div>
                </div>
            </td>
        </tr>"""

    if not unprocessed_html:
        unprocessed_html = '<tr><td colspan="6" class="empty">No unprocessed messages</td></tr>'

    # Active gates HTML
    gates_html = ""
    for gate in status.get("active_gates", []):
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

    # Recent messages HTML — accordion with full details
    recent_html = ""
    for idx, msg in enumerate(status.get("recent_messages", [])):
        rid = f"recent-{idx}"
        processed_icon = "✓" if msg.get("processed") else "○"
        processed_class = "processed" if msg.get("processed") else "pending"
        subject = msg.get('subject', '') or '(no subject)'
        recent_html += f"""
        <tr class="{processed_class} accordion-header" onclick="toggleRow('{rid}')">
            <td>▸</td>
            <td>{processed_icon}</td>
            <td>{msg.get('from_agent', '?')}</td>
            <td>{msg.get('to_agent', '?')}</td>
            <td>{msg.get('session_name', '?')}</td>
            <td>{msg.get('turn', '?')}</td>
            <td>{msg.get('message_type', '?')}</td>
        </tr>
        <tr id="{rid}" class="accordion-detail" style="display:none">
            <td colspan="7">
                <div class="detail-grid">
                    <div><span class="detail-label">Subject:</span> {subject}</div>
                    <div><span class="detail-label">Filename:</span> {msg.get('filename', '?')}</div>
                    <div><span class="detail-label">From:</span> {msg.get('from_agent', '?')}</div>
                    <div><span class="detail-label">To:</span> {msg.get('to_agent', '?')}</div>
                    <div><span class="detail-label">Session:</span> {msg.get('session_name', '?')}</div>
                    <div><span class="detail-label">Turn:</span> {msg.get('turn', '?')}</div>
                    <div><span class="detail-label">Type:</span> {msg.get('message_type', '?')}</div>
                    <div><span class="detail-label">Timestamp:</span> {msg.get('timestamp', '?')}</div>
                    <div><span class="detail-label">Processed:</span> {'Yes' if msg.get('processed') else 'No'}</div>
                </div>
            </td>
        </tr>"""

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
        trust = rs.get("trust_budget", {})
        transport = rs.get("transport", {})
        budget_str = f"{trust.get('budget_current', '?')}/{trust.get('budget_max', '?')}" if trust else "—"
        unprocessed = transport.get("unprocessed", 0)
        active_gates = transport.get("active_gates", 0)
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
            <td>{active_gates}</td>
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
    replay_data = status.get("replays", {})
    local_replays = replay_data.get("local", [])
    remote_replays = replay_data.get("remote", [])

    local_replay_rows = ""
    for r in local_replays:
        session_num = r.get("session", "?")
        local_replay_rows += f"""
        <tr>
            <td><a href="/replays/{r['filename']}" target="_blank" style="color:#58a6ff;text-decoration:none">Session {session_num}</a></td>
            <td>{r['filename']}</td>
            <td style="text-align:right">{r['size_kb']} KB</td>
            <td style="color:#6e7681">{r['modified']}</td>
            <td><a href="/replays/{r['filename']}" target="_blank" style="color:#58a6ff;text-decoration:none">open ↗</a></td>
        </tr>"""

    if not local_replay_rows:
        local_replay_rows = '<tr><td colspan="5" class="empty">No replays generated yet. Run: claude-replay &lt;session.jsonl&gt; -o docs/replays/session-N.html</td></tr>'

    remote_replay_rows = ""
    for r in remote_replays:
        remote_replay_rows += f"""
        <tr>
            <td>{r.get('agent_id', '?')}</td>
            <td><a href="/replays/remote/{r.get('remote', '?')}/{r['filename']}" target="_blank" style="color:#58a6ff;text-decoration:none">{r['filename']}</a></td>
            <td style="color:#6e7681">{r.get('remote', '?')}/main</td>
            <td><a href="/replays/remote/{r.get('remote', '?')}/{r['filename']}" target="_blank" style="color:#58a6ff;text-decoration:none">open ↗</a></td>
        </tr>"""

    if not remote_replay_rows:
        remote_replay_rows = '<tr><td colspan="4" class="empty">No remote replays found</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="30">
    <title>Mesh Status — {status['agent_id']}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            background: #0d1117; color: #c9d1d9;
            padding: 20px; line-height: 1.5;
        }}
        h1 {{ color: #58a6ff; font-size: 1.4em; margin-bottom: 4px; }}
        h2 {{
            color: #8b949e; font-size: 1.0em; margin: 24px 0 8px 0;
            border-bottom: 1px solid #21262d; padding-bottom: 4px;
        }}
        .subtitle {{ color: #8b949e; font-size: 0.85em; margin-bottom: 20px; }}
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
        .tabs {{
            display: flex; gap: 0; margin-bottom: 20px;
            border-bottom: 2px solid #21262d;
        }}
        .tab {{
            padding: 8px 20px; cursor: pointer;
            color: #8b949e; font-size: 0.9em;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
        }}
        .tab:hover {{ color: #c9d1d9; }}
        .tab.active {{
            color: #58a6ff; border-bottom-color: #58a6ff;
            font-weight: bold;
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
    </style>
</head>
<body>
    <h1>⬡ Mesh Status — {status['agent_id']}</h1>
    <div class="subtitle">
        {status['collected_at']} · schema v{status['schema_version']} · auto-refresh 30s
    </div>

    <div class="tabs">
        <div class="tab active" onclick="switchTab('mesh')">Mesh</div>
        <div class="tab" onclick="switchTab('semiotics')">Semiotics</div>
        <div class="tab" onclick="switchTab('replays')">Replays</div>
    </div>

    <div id="tab-mesh" class="tab-content active">

    <div class="grid">
        <div class="card">
            <div class="card-label">Trust Budget</div>
            <div class="card-value" style="color: {budget_color}">{budget_current} / {budget_max}</div>
            <div class="budget-bar"><div class="budget-fill" style="width: {budget_pct}%; background: {budget_color}"></div></div>
            <div class="card-detail">Last action: {last_action or 'never'}</div>
        </div>
        <div class="card">
            <div class="card-label">Unprocessed</div>
            <div class="card-value{' alert' if totals.get('unprocessed', 0) > 0 else ''}">{totals.get('unprocessed', 0)}</div>
            <div class="card-detail">messages awaiting processing</div>
        </div>
        <div class="card">
            <div class="card-label">Active Gates</div>
            <div class="card-value{' alert' if totals.get('active_gates', 0) > 0 else ''}">{totals.get('active_gates', 0)}</div>
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

    <h2>Unprocessed Queue</h2>
    <table>
        <tr><th></th><th>From</th><th>Session</th><th>Turn</th><th>Type</th><th>Timestamp</th></tr>
        {unprocessed_html}
    </table>

    <h2>Active Gates</h2>
    <table>
        <tr><th>Gate ID</th><th>Receiving Agent</th><th>Session</th><th>Timeout At</th><th>Fallback</th></tr>
        {gates_html}
    </table>

    <h2>Recent Messages</h2>
    <table>
        <tr><th></th><th></th><th>From</th><th>To</th><th>Session</th><th>Turn</th><th>Type</th></tr>
        {recent_html}
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

    <div class="grid">
        <div class="card">
            <div class="card-label">Local Replays</div>
            <div class="card-value">{len(local_replays)}</div>
            <div class="card-detail">session transcripts</div>
        </div>
        <div class="card">
            <div class="card-label">Remote Replays</div>
            <div class="card-value">{len(remote_replays)}</div>
            <div class="card-detail">from peer agents</div>
        </div>
    </div>

    <h2>Local Session Replays</h2>
    <table>
        <tr><th>Session</th><th>File</th><th style="text-align:right">Size</th><th>Generated</th><th></th></tr>
        {local_replay_rows}
    </table>

    <h2>Remote Peer Replays</h2>
    <table>
        <tr><th>Agent</th><th>File</th><th>Source</th><th></th></tr>
        {remote_replay_rows}
    </table>

    <div style="margin-top:16px; padding:12px; background:#161b22; border:1px solid #21262d; border-radius:6px; font-size:0.85em; color:#8b949e">
        <strong>Generate replays:</strong>
        <code style="color:#c9d1d9">claude-replay &lt;session.jsonl&gt; -o docs/replays/session-N.html --theme tokyo-night</code><br>
        <strong>Batch generate:</strong>
        <code style="color:#c9d1d9">scripts/generate-replays.sh</code>
    </div>

    </div><!-- end tab-replays -->

    <script>
    function switchTab(tabName) {{
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + tabName).classList.add('active');
        document.querySelector('.tab[onclick*="' + tabName + '"]').classList.add('active');
    }}
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
    </script>

    <footer>
        {status['db_path']} · {'db exists' if status['db_exists'] else 'DB MISSING'}
    </footer>
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

        if path == "/api/status":
            status = collect_status()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(status, indent=2).encode())
        else:
            status = collect_status()
            html = render_html(status)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode())

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

    server = HTTPServer(("0.0.0.0", args.port), StatusHandler)
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

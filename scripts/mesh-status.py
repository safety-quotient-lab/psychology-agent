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
import sqlite3
import sys
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"

COLD_THRESHOLD_HOURS = 24


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

    # Recent messages (last 15)
    recent = query_db(
        "SELECT session_name, filename, turn, from_agent, to_agent, "
        "message_type, timestamp, processed, subject "
        "FROM transport_messages ORDER BY timestamp DESC LIMIT 15"
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
    if REGISTRY_PATH.exists():
        try:
            reg = json.loads(REGISTRY_PATH.read_text())
            for aid, cfg in reg.get("agents", {}).items():
                registry_agents[aid] = {
                    "role": cfg.get("role"),
                    "transport": cfg.get("transport"),
                    "autonomous": cfg.get("autonomous", False),
                    "always_consider": cfg.get("always_consider", False),
                }
        except (json.JSONDecodeError, OSError):
            pass

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
        "totals": {
            "messages": total_messages,
            "sessions": total_sessions,
            "unprocessed": len(unprocessed),
            "active_gates": len(gates),
            "epistemic_flags_unresolved": total_flags,
        },
        "heartbeat": heartbeat_info,
    }


# ── HTML Template ────────────────────────────────────────────────────────

def render_html(status: dict) -> str:
    """Render status data as an HTML dashboard."""
    budget = status.get("trust_budget", {})
    totals = status.get("totals", {})

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

    # Unprocessed messages HTML
    unprocessed_html = ""
    for msg in status.get("unprocessed_messages", []):
        unprocessed_html += f"""
        <tr>
            <td>{msg.get('from_agent', '?')}</td>
            <td>{msg.get('session_name', '?')}</td>
            <td>{msg.get('turn', '?')}</td>
            <td>{msg.get('message_type', '?')}</td>
            <td title="{msg.get('subject', '')}">{(msg.get('subject', '') or '')[:50]}</td>
            <td>{msg.get('timestamp', '?')}</td>
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

    # Recent messages HTML
    recent_html = ""
    for msg in status.get("recent_messages", []):
        processed_icon = "✓" if msg.get("processed") else "○"
        processed_class = "processed" if msg.get("processed") else "pending"
        recent_html += f"""
        <tr class="{processed_class}">
            <td>{processed_icon}</td>
            <td>{msg.get('from_agent', '?')}</td>
            <td>{msg.get('to_agent', '?')}</td>
            <td>{msg.get('session_name', '?')}</td>
            <td>{msg.get('turn', '?')}</td>
            <td>{msg.get('message_type', '?')}</td>
            <td>{msg.get('timestamp', '?')}</td>
        </tr>"""

    # Recent actions HTML
    actions_html = ""
    for action in status.get("recent_actions", []):
        result = action.get("evaluator_result", "?")
        result_class = "result-approved" if result == "approved" else "result-blocked"
        cost = action.get("budget_before", 0) - action.get("budget_after", 0)
        actions_html += f"""
        <tr>
            <td>{action.get('action_type', '?')}</td>
            <td><span class="{result_class}">{result}</span></td>
            <td>T{action.get('evaluator_tier', '?')}</td>
            <td>{cost}</td>
            <td title="{action.get('description', '')}">{(action.get('description', '') or '')[:60]}</td>
            <td>{action.get('created_at', '?')}</td>
        </tr>"""

    if not actions_html:
        actions_html = '<tr><td colspan="6" class="empty">No autonomous actions recorded</td></tr>'

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
        footer {{
            margin-top: 32px; padding-top: 12px;
            border-top: 1px solid #21262d;
            color: #484f58; font-size: 0.75em;
        }}
    </style>
</head>
<body>
    <h1>⬡ Mesh Status — {status['agent_id']}</h1>
    <div class="subtitle">
        {status['collected_at']} · schema v{status['schema_version']} · auto-refresh 30s
    </div>

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

    <h2>Peers</h2>
    <table>
        <tr><th>Agent</th><th>Role</th><th>Tier</th><th>Last Exchange</th><th>Messages</th></tr>
        {peers_html or '<tr><td colspan="5" class="empty">No peer activity recorded</td></tr>'}
    </table>

    <h2>Unprocessed Queue</h2>
    <table>
        <tr><th>From</th><th>Session</th><th>Turn</th><th>Type</th><th>Subject</th><th>Timestamp</th></tr>
        {unprocessed_html}
    </table>

    <h2>Active Gates</h2>
    <table>
        <tr><th>Gate ID</th><th>Receiving Agent</th><th>Session</th><th>Timeout At</th><th>Fallback</th></tr>
        {gates_html}
    </table>

    <h2>Recent Messages</h2>
    <table>
        <tr><th></th><th>From</th><th>To</th><th>Session</th><th>Turn</th><th>Type</th><th>Timestamp</th></tr>
        {recent_html}
    </table>

    <h2>Autonomous Actions</h2>
    <table>
        <tr><th>Type</th><th>Result</th><th>Tier</th><th>Cost</th><th>Description</th><th>Time</th></tr>
        {actions_html}
    </table>

    <footer>
        {status['db_path']} · {'db exists' if status['db_exists'] else 'DB MISSING'}
    </footer>
</body>
</html>"""


# ── HTTP Server ──────────────────────────────────────────────────────────

class StatusHandler(BaseHTTPRequestHandler):
    """Serve the mesh status dashboard."""

    def do_GET(self):
        status = collect_status()

        if self.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(status, indent=2).encode())
        else:
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

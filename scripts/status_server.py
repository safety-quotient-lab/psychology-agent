#!/usr/bin/env python3
"""status_server.py — Lightweight /api/status server for mesh agents.

Reads state.db and .agent-identity.json, serves /api/status as JSON.
Designed for peer agents (unratified, observatory) that need a dynamic
status endpoint without the full mesh-status.py dashboard.

Usage:
    python3 scripts/status_server.py                # default port 8078
    python3 scripts/status_server.py --port 8079
    python3 scripts/status_server.py --json         # dump status JSON to stdout
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"

CORS_ORIGINS = [
    "https://interagent.safety-quotient.dev",
    "https://psychology-agent.safety-quotient.dev",
    "https://psq-agent.safety-quotient.dev",
]


def _load_agent_id() -> str:
    if IDENTITY_PATH.exists():
        try:
            with open(IDENTITY_PATH) as f:
                return json.load(f).get("agent_id", "unknown-agent")
        except (json.JSONDecodeError, OSError):
            pass
    return "unknown-agent"


def _query(db: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict]:
    cursor = db.execute(sql, params)
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _scalar(db: sqlite3.Connection, sql: str, params: tuple = ()):
    row = db.execute(sql, params).fetchone()
    return row[0] if row else 0


def _next_cron_run(minute_spec: str) -> str | None:
    """Compute the next cron run time from a minute spec like '*/5' or '1,6,11,...'.

    Returns ISO 8601 timestamp of the next matching minute, or None on parse failure.
    """
    try:
        now = datetime.now().astimezone()
        current_minute = now.minute

        # Parse minute spec into a sorted list of valid minutes
        if minute_spec.startswith("*/"):
            interval = int(minute_spec[2:])
            minutes = list(range(0, 60, interval))
        elif "," in minute_spec:
            minutes = sorted(int(m) for m in minute_spec.split(","))
        elif minute_spec == "*":
            # Every minute — next run is the next minute
            next_dt = now.replace(second=0, microsecond=0)
            from datetime import timedelta
            next_dt += timedelta(minutes=1)
            return next_dt.isoformat()
        else:
            minutes = [int(minute_spec)]

        # Find the next minute >= current_minute in this hour
        from datetime import timedelta
        for m in minutes:
            if m > current_minute:
                next_dt = now.replace(minute=m, second=0, microsecond=0)
                return next_dt.isoformat()

        # Wrap to next hour, first minute in the list
        next_dt = now.replace(minute=minutes[0], second=0, microsecond=0)
        next_dt += timedelta(hours=1)
        return next_dt.isoformat()
    except (ValueError, IndexError):
        return None


def _collect_schedule(agent_id: str, last_action_ts: str | None) -> dict:
    """Collect autonomous-sync schedule from cron, lock file, and last action."""
    schedule = {"autonomous": False}

    # Check cron for autonomous-sync entry matching THIS repo
    project_dir = str(PROJECT_ROOT)
    try:
        cron_output = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=5)
        if cron_output.returncode == 0:
            for line in cron_output.stdout.splitlines():
                if "autonomous-sync" in line \
                        and not line.strip().startswith("#") \
                        and project_dir in line:
                    schedule["autonomous"] = True
                    schedule["cron_entry"] = line.strip()
                    # Extract interval and compute next run
                    parts = line.strip().split()
                    if parts:
                        minute_spec = parts[0]
                        if minute_spec.startswith("*/"):
                            try:
                                schedule["cron_interval_min"] = int(
                                    minute_spec.replace("*/", ""))
                            except ValueError:
                                pass
                        # Compute next run from minute spec
                        schedule["next_run"] = _next_cron_run(minute_spec)
                    break
    except (subprocess.TimeoutExpired, OSError):
        pass

    # Check lock file
    lock_file = Path(f"/tmp/autonomous-sync-{agent_id}.lock")
    if lock_file.exists():
        try:
            pid_str = lock_file.read_text().strip()
            pid = int(pid_str)
            os.kill(pid, 0)  # check if process alive
            schedule["lock_active"] = True
            schedule["lock_pid"] = pid
        except (ValueError, ProcessLookupError, PermissionError):
            schedule["lock_active"] = False
            schedule["lock_stale"] = True
    else:
        schedule["lock_active"] = False

    # Last sync from autonomous_actions
    if last_action_ts and last_action_ts != 0:
        schedule["last_sync"] = last_action_ts

    return schedule


def collect_status() -> dict:
    agent_id = _load_agent_id()
    now_iso = datetime.now().astimezone().isoformat()

    if not DB_PATH.exists():
        return {
            "agent_id": agent_id,
            "collected_at": now_iso,
            "schema_version": 0,
            "autonomy_budget": {"budget_current": 20, "budget_max": 20},
            "active_gates": [],
            "totals": {"sessions": 0, "messages": 0, "unprocessed": 0,
                        "epistemic_flags_unresolved": 0},
            "peers": [],
            "recent_messages": [],
            "heartbeat": {"timestamp": now_iso},
            "schedule": {},
        }

    db = sqlite3.connect(str(DB_PATH))

    # Schema version
    try:
        schema_ver = _scalar(db, "SELECT MAX(version) FROM schema_version")
    except sqlite3.OperationalError:
        schema_ver = 0

    # Autonomy budget
    try:
        rows = _query(db, "SELECT * FROM autonomy_budget WHERE agent_id = ?",
                       (agent_id,))
        budget = rows[0] if rows else {"budget_current": 20, "budget_max": 20}
    except sqlite3.OperationalError:
        budget = {"budget_current": 20, "budget_max": 20}

    # Active gates
    try:
        gates = _query(db, "SELECT * FROM active_gates WHERE status = 'waiting'")
    except sqlite3.OperationalError:
        gates = []

    # Unprocessed messages
    try:
        unprocessed_count = _scalar(
            db, "SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE")
    except sqlite3.OperationalError:
        unprocessed_count = 0

    # Totals
    try:
        total_messages = _scalar(db, "SELECT COUNT(*) FROM transport_messages")
        total_sessions = _scalar(
            db, "SELECT COUNT(DISTINCT session_name) FROM transport_messages")
    except sqlite3.OperationalError:
        total_messages = 0
        total_sessions = 0

    # Epistemic flags
    try:
        total_flags = _scalar(
            db, "SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE")
    except sqlite3.OperationalError:
        total_flags = 0

    # Peers (distinct agents we've exchanged messages with)
    try:
        peer_rows = _query(db,
            "SELECT from_agent, MAX(timestamp) as last_seen, "
            "COUNT(*) as total_messages "
            "FROM transport_messages "
            "WHERE from_agent != ? "
            "GROUP BY from_agent",
            (agent_id,))
    except sqlite3.OperationalError:
        peer_rows = []

    # Recent messages (last 30 for merged timeline)
    try:
        recent = _query(db,
            "SELECT session_name, filename, turn, from_agent, to_agent, "
            "message_type, timestamp, processed, subject, "
            "claims_count, setl, urgency "
            "FROM transport_messages "
            "ORDER BY timestamp DESC LIMIT 30")
    except sqlite3.OperationalError:
        recent = []

    # Last autonomous action timestamp
    try:
        last_action_ts = _scalar(
            db, "SELECT MAX(created_at) FROM autonomous_actions "
                "WHERE agent_id = ?", (agent_id,))
    except sqlite3.OperationalError:
        last_action_ts = None

    db.close()

    schedule = _collect_schedule(agent_id, last_action_ts)

    return {
        "agent_id": agent_id,
        "collected_at": now_iso,
        "schema_version": schema_ver,
        "autonomy_budget": budget,
        "active_gates": gates,
        "totals": {
            "sessions": total_sessions,
            "messages": total_messages,
            "unprocessed": unprocessed_count,
            "epistemic_flags_unresolved": total_flags,
        },
        "peers": [{"from_agent": p["from_agent"],
                    "last_seen": p["last_seen"],
                    "total_messages": p["total_messages"]}
                   for p in peer_rows],
        "recent_messages": recent,
        "heartbeat": {"timestamp": now_iso},
        "schedule": schedule,
    }


class StatusHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/status":
            status = collect_status()
            body = json.dumps(status, indent=2, default=str).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "public, max-age=30")
            origin = self.headers.get("Origin", "")
            if origin in CORS_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
            else:
                self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.write(body)
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def write(self, data: bytes):
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass  # suppress request logging


def main():
    parser = argparse.ArgumentParser(description="Lightweight /api/status server")
    parser.add_argument("--port", type=int, default=8078,
                        help="Port to listen on (default: 8078)")
    parser.add_argument("--json", action="store_true",
                        help="Dump status JSON to stdout and exit")
    args = parser.parse_args()

    if args.json:
        print(json.dumps(collect_status(), indent=2, default=str))
        return

    server = HTTPServer(("0.0.0.0", args.port), StatusHandler)
    agent_id = _load_agent_id()
    print(f"{agent_id} status server listening on :{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

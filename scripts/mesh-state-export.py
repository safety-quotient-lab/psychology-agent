#!/usr/bin/env python3
"""mesh-state-export.py — Export operational state for cross-machine visibility.

Dumps a lean JSON snapshot of trust budget, recent autonomous actions,
facet distribution, and transport health. Committed by autonomous-sync.sh
alongside heartbeat — peers read it via `git show remote/main:path`.

The export replaces nothing — it provides a queryable view of operational
state without requiring SSH access or real-time connectivity.

Usage:
    python3 scripts/mesh-state-export.py                    # write to transport/
    python3 scripts/mesh-state-export.py --stdout           # print to stdout
    python3 scripts/mesh-state-export.py --path /custom/dir # custom output dir
"""

import argparse
import json
import re
import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "transport" / "sessions" / "local-coordination"


def get_agent_id() -> str:
    """Read agent ID from identity file or default."""
    if IDENTITY_PATH.exists():
        try:
            return json.loads(IDENTITY_PATH.read_text())["agent_id"]
        except (json.JSONDecodeError, KeyError):
            pass
    return "unknown-agent"


def query(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict]:
    """Run a query and return list of dicts."""
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def scalar(conn: sqlite3.Connection, sql: str, params: tuple = (), default=0):
    """Run a query and return a single scalar."""
    row = conn.execute(sql, params).fetchone()
    return row[0] if row else default


def _collect_schedule(agent_id: str) -> dict:
    """Collect sync schedule from cron and log files."""
    schedule = {
        "autonomous": False,
        "cron_interval_min": None,
        "last_sync": None,
        "next_expected": None,
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
                    m = re.match(r"\*/(\d+)", line.strip())
                    if m:
                        schedule["cron_interval_min"] = int(m.group(1))
                    elif line.strip().startswith("0 "):
                        schedule["cron_interval_min"] = 60
                    break
    except (subprocess.TimeoutExpired, OSError):
        pass

    # Last sync from log file
    log_path = Path("/tmp") / f"autonomous-sync-{agent_id}.log"
    if log_path.exists():
        try:
            lines = log_path.read_text().splitlines()[-20:]
            for line in reversed(lines):
                m = re.match(r"\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})", line)
                if m:
                    schedule["last_sync"] = m.group(1)
                    break
        except OSError:
            pass

    # Compute next expected
    if schedule["last_sync"] and schedule["cron_interval_min"]:
        try:
            last_dt = datetime.fromisoformat(schedule["last_sync"])
            next_dt = last_dt + timedelta(minutes=schedule["cron_interval_min"])
            schedule["next_expected"] = next_dt.strftime("%Y-%m-%dT%H:%M:%S")
        except (ValueError, TypeError):
            pass

    return schedule


def export_state(conn: sqlite3.Connection, agent_id: str) -> dict:
    """Build the operational state snapshot."""
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    # Trust budget
    budget_rows = query(
        conn,
        "SELECT agent_id, budget_max, budget_current, shadow_mode, "
        "consecutive_blocks, last_action, min_action_interval "
        "FROM trust_budget WHERE agent_id = ?",
        (agent_id,)
    )
    budget = budget_rows[0] if budget_rows else {}

    # Recent autonomous actions (last 10)
    actions = query(
        conn,
        "SELECT action_type, evaluator_result, evaluator_tier, "
        "budget_before, budget_after, created_at "
        "FROM autonomous_actions ORDER BY created_at DESC LIMIT 10"
    )

    # Transport summary
    total_messages = scalar(conn, "SELECT COUNT(*) FROM transport_messages")
    unprocessed = scalar(
        conn, "SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE"
    )
    active_gates = scalar(
        conn, "SELECT COUNT(*) FROM active_gates WHERE status = 'waiting'"
    )

    # PSH facet summary (if universal_facets exists)
    psh_summary = {}
    try:
        for row in query(
            conn,
            "SELECT facet_value, COUNT(*) as count "
            "FROM universal_facets WHERE facet_type = 'psh' "
            "GROUP BY facet_value ORDER BY count DESC"
        ):
            psh_summary[row["facet_value"]] = row["count"]
    except sqlite3.OperationalError:
        pass

    # Schema version
    schema_ver = scalar(conn, "SELECT MAX(version) FROM schema_version")

    # Epistemic debt
    epistemic_flags = scalar(
        conn, "SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE"
    )

    # Schedule info (cron interval, last sync, next expected)
    schedule = _collect_schedule(agent_id)

    return {
        "schema": "mesh-state/v1",
        "timestamp": now,
        "agent_id": agent_id,
        "trust_budget": budget,
        "recent_actions": actions,
        "transport": {
            "total_messages": total_messages,
            "unprocessed": unprocessed,
            "active_gates": active_gates,
        },
        "schedule": schedule,
        "psh_facets": psh_summary,
        "schema_version": schema_ver,
        "epistemic_flags_unresolved": epistemic_flags,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Export operational state for cross-machine mesh visibility"
    )
    parser.add_argument("--stdout", action="store_true",
                        help="Print to stdout instead of writing file")
    parser.add_argument("--path", type=str,
                        help="Custom output directory")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"state.db not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode = WAL")
    agent_id = get_agent_id()
    state = export_state(conn, agent_id)
    conn.close()

    output = json.dumps(state, indent=2, default=str)

    if args.stdout:
        print(output)
        return

    output_dir = Path(args.path) if args.path else DEFAULT_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"mesh-state-{agent_id}.json"
    output_file.write_text(output + "\n")
    print(f"exported: {output_file}")


if __name__ == "__main__":
    main()

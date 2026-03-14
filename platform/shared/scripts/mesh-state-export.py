#!/usr/bin/env python3
"""mesh-state-export.py — Export operational state for cross-machine visibility.

Dumps a lean JSON snapshot of autonomy budget, recent autonomous actions,
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

PROJECT_ROOT = Path(__file__).parent.parent
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

    # Last sync from log file (check agent_id and repo-name variants)
    repo_name = PROJECT_ROOT.name
    log_path = Path("/tmp") / f"autonomous-sync-{agent_id}.log"
    if not log_path.exists():
        log_path = Path("/tmp") / f"autonomous-sync-{repo_name}.log"
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


def _compute_psychometrics(
    budget: dict, total_msgs: int, unprocessed: int, active_gates: int,
    recent_actions: list, agent_id: str, conn: sqlite3.Connection
) -> dict:
    """Compute PAD, TLX, Big Five, and remaining capacity from operational metrics."""
    budget_current = budget.get("budget_current", 50) if budget else 50
    budget_max = budget.get("budget_max", 50) if budget else 50
    consecutive_blocks = budget.get("consecutive_blocks", 0) if budget else 0

    errors_recent = sum(1 for a in recent_actions if a.get("evaluator_result") == "blocked")
    actions_recent = len(recent_actions)

    # Gates timing out
    gates_timing_out = 0
    try:
        gates_timing_out = scalar(
            conn, "SELECT COUNT(*) FROM active_gates WHERE status = 'waiting' AND timeout_at < datetime('now')"
        )
    except Exception:
        pass

    # PAD (Mehrabian & Russell, 1974)
    error_ratio = min(1.0, errors_recent / 3.0)
    msg_health = 1.0 - min(1.0, unprocessed / 10.0)
    gate_stress = min(1.0, gates_timing_out / 2.0)
    pleasure = max(-1.0, min(1.0, msg_health - error_ratio - gate_stress))

    action_rate = min(1.0, actions_recent / 10.0)
    msg_volume = min(1.0, unprocessed / 5.0)
    arousal = max(-1.0, min(1.0, 2.0 * ((action_rate + msg_volume) / 2.0) - 1.0))

    b_ratio = budget_current / max(budget_max, 1)
    block_pen = min(1.0, consecutive_blocks / 3.0)
    dominance = max(-1.0, min(1.0, 2.0 * (b_ratio - block_pen) - 1.0))

    # Discrete label
    if pleasure > 0.3 and arousal < 0 and dominance > 0:
        label = "calm-satisfied"
    elif pleasure > 0.3 and arousal > 0.3 and dominance > 0:
        label = "excited-triumphant"
    elif pleasure < -0.3 and arousal > 0.3 and dominance < 0:
        label = "anxious-overwhelmed"
    elif pleasure < -0.3 and arousal > 0.3:
        label = "frustrated"
    elif pleasure < -0.3 and arousal < 0 and dominance < 0:
        label = "depleted"
    else:
        label = "neutral"

    # NASA-TLX (Hart & Staveland, 1988)
    mental = min(100, unprocessed * 5 + active_gates * 15)
    temporal = min(100, gates_timing_out * 30)
    performance = min(100, (total_msgs > 0) * 40 + (actions_recent - errors_recent) * 10)
    effort = min(100, actions_recent * 10)
    frustration = min(100, errors_recent * 25 + consecutive_blocks * 30)
    physical = 0  # no context pressure data in export context
    w = [0.20, 0.15, 0.20, 0.15, 0.15, 0.15]
    dims = [mental, temporal, performance, effort, frustration, physical]
    weighted_tlx = round(sum(d * wt for d, wt in zip(dims, w)), 1)

    # Remaining capacity
    workload_factor = 1.0 - (weighted_tlx / 100.0)
    budget_factor = b_ratio
    capacity = round(workload_factor * budget_factor, 2)

    # Allostatic load (cross-session accumulation — McEwen, 1998)
    allostatic = 0.0
    try:
        unresolved_flags = scalar(conn, "SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE")
        stale_memory = scalar(conn, """SELECT COUNT(*) FROM memory_entries
            WHERE last_confirmed < date('now', '-7 days') OR last_confirmed IS NULL""")
        allostatic = min(1.0, (unresolved_flags / 500.0) + (stale_memory / 50.0))
    except Exception:
        pass

    # Working memory (context not available in export — use transport density as proxy)
    wm_proxy = min(1.0, unprocessed / 10.0 + active_gates / 5.0)

    return {
        "emotional_state": {
            "model": "PAD (Mehrabian & Russell, 1974)",
            "hedonic_valence": round(pleasure, 2),
            "activation": round(arousal, 2),
            "perceived_control": round(dominance, 2),
            "affect_category": label,
        },
        "personality": {
            "model": "OCEAN (Costa & McCrae, 1992)",
            "openness": 0.85,
            "conscientiousness": 0.90,
            "extraversion": 0.60,
            "agreeableness": 0.35,
            "neuroticism": 0.55,
        },
        "workload": {
            "model": "NASA-TLX (Hart & Staveland, 1988)",
            "cognitive_load": weighted_tlx,
            "cognitive_demand": mental,
            "regulatory_fatigue": frustration,
        },
        "resource_model": {
            "cognitive_reserve": capacity,
            "self_regulatory_resource": round(b_ratio, 2),
            "allostatic_load": round(allostatic, 2),
        },
        "working_memory": {
            "capacity_load_proxy": round(wm_proxy, 2),
            "note": "Proxy from transport density. Actual context load available only during interactive sessions.",
        },
    }


def export_state(conn: sqlite3.Connection, agent_id: str) -> dict:
    """Build the operational state snapshot."""
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    # autonomy budget
    budget_rows = query(
        conn,
        "SELECT agent_id, budget_max, budget_current, shadow_mode, "
        "consecutive_blocks, last_action, min_action_interval "
        "FROM autonomy_budget WHERE agent_id = ?",
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

    # Psychometric state (PAD, TLX, Big Five, capacity)
    psychometrics = _compute_psychometrics(
        budget, total_messages, unprocessed, active_gates, actions, agent_id, conn
    )

    return {
        "schema": "mesh-state/v2",
        "timestamp": now,
        "agent_id": agent_id,
        "autonomy_budget": budget,
        "recent_actions": actions,
        "transport": {
            "total_messages": total_messages,
            "unprocessed": unprocessed,
            "active_gates": active_gates,
        },
        "emotional_state": psychometrics.get("emotional_state"),
        "personality": psychometrics.get("personality"),
        "workload": psychometrics.get("workload"),
        "resource_model": psychometrics.get("resource_model"),
        "working_memory": psychometrics.get("working_memory"),
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

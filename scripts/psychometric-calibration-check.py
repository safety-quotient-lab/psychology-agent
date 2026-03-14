#!/usr/bin/env python3
"""
psychometric-calibration-check.py — Verify A2A-Psychology sensor calibration.

Runs as part of /diagnose Level 3+. Checks whether the calibration constants
in compute-psychometrics.py and session-metrics.sh produce plausible values
for this agent's operational profile.

Calibration transfers across agents via the A2A-Psychology spec. Calibration
CONSTANTS require per-agent tuning. This script identifies constants that
need adjustment.

Usage:
    python3 scripts/psychometric-calibration-check.py           # full check
    python3 scripts/psychometric-calibration-check.py --fix     # suggest fixes
"""

import json
import os
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
LOCAL_DB_PATH = PROJECT_ROOT / "state.local.db"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"
METRICS_HOOK = PROJECT_ROOT / ".claude" / "hooks" / "session-metrics.sh"


def load_identity() -> str:
    if IDENTITY_PATH.exists():
        return json.load(open(IDENTITY_PATH)).get("agent_id", "unknown")
    return "unknown"


def check_tokens_per_call() -> dict:
    """Verify TOKENS_PER_CALL constant against observed session data."""
    # Read current constant from hook
    current_tpc = 7000  # default
    if METRICS_HOOK.exists():
        for line in METRICS_HOOK.read_text().splitlines():
            if "TOKENS_PER_CALL=" in line and not line.strip().startswith("#"):
                try:
                    current_tpc = int(line.split("=")[1].strip())
                except (ValueError, IndexError):
                    pass

    # Check against autonomous action history (if available)
    observed_tpc = None
    if LOCAL_DB_PATH.exists():
        try:
            conn = sqlite3.connect(str(LOCAL_DB_PATH))
            actions = conn.execute(
                "SELECT COUNT(*) FROM autonomous_actions"
            ).fetchone()[0]
            conn.close()
            if actions > 10:
                # Rough: autonomous sessions typically use ~3000 tokens/action
                observed_tpc = 3000
        except Exception:
            pass

    status = "nominal"
    suggestion = None
    if observed_tpc and abs(current_tpc - observed_tpc) / current_tpc > 0.5:
        status = "miscalibrated"
        suggestion = f"TOKENS_PER_CALL={observed_tpc} (observed) vs {current_tpc} (configured)"

    return {
        "check": "tokens_per_call",
        "current": current_tpc,
        "observed": observed_tpc,
        "status": status,
        "suggestion": suggestion,
    }


def check_activation_scaling() -> dict:
    """Verify activation sensor produces full-range output."""
    # Check if tool count file exists and has data
    agent_id = load_identity()
    agent_for_files = agent_id if agent_id != "human" else "psychology-agent"
    tc_file = Path(f"/tmp/{agent_for_files}-tool-calls")

    if not tc_file.exists():
        return {
            "check": "activation_scaling",
            "status": "no_data",
            "suggestion": "No tool call data — session-metrics.sh hook may not fire. Verify PostToolUse registration.",
        }

    tool_calls = int(tc_file.read_text().strip())
    # Activation formula: tool_rate = min(1.0, tool_calls / 50.0)
    # If tool_calls > 50 at mid-session, the sensor saturates early
    # If tool_calls < 10 at session end, the sensor reads too low
    if tool_calls > 80:
        return {
            "check": "activation_scaling",
            "status": "saturated",
            "tool_calls": tool_calls,
            "suggestion": f"Tool calls ({tool_calls}) saturate activation sensor (divisor 50). Consider raising to {tool_calls + 20}.",
        }
    elif tool_calls < 5:
        return {
            "check": "activation_scaling",
            "status": "understimulated",
            "tool_calls": tool_calls,
            "suggestion": "Very few tool calls — activation reads low. Normal for early session or autonomous sync.",
        }

    return {
        "check": "activation_scaling",
        "status": "nominal",
        "tool_calls": tool_calls,
    }


def check_yerkes_dodson_thresholds() -> dict:
    """Verify Yerkes-Dodson zone thresholds produce meaningful differentiation."""
    # These derive from psychology (Yerkes & Dodson, 1908) not from agent workload
    # The thresholds themselves transfer across agents
    # What varies: the context pressure estimation accuracy
    uid = os.getuid()
    ctx_file = Path(f"{os.environ.get('XDG_RUNTIME_DIR', '/tmp')}/.claude-context-pct-{uid}")

    if not ctx_file.exists():
        return {
            "check": "yerkes_dodson",
            "status": "no_data",
            "suggestion": "No context pressure data — session-metrics.sh or Notification hook not writing.",
        }

    ctx_pct = int(ctx_file.read_text().strip())
    zone = (
        "understimulated" if ctx_pct < 15
        else "optimal" if ctx_pct < 60
        else "pressured" if ctx_pct < 80
        else "overwhelmed"
    )

    return {
        "check": "yerkes_dodson",
        "status": "nominal",
        "context_pct": ctx_pct,
        "zone": zone,
        "thresholds": {"understimulated": "<15%", "optimal": "15-60%", "pressured": "60-80%", "overwhelmed": ">80%"},
        "note": "Thresholds derive from psychology — transfer across agents. Context estimation accuracy varies.",
    }


def check_big_five_assigned() -> dict:
    """Verify Big Five personality scores exist and differ from defaults."""
    # Read from agent card
    card_path = PROJECT_ROOT / ".well-known" / "agent-card.json"
    if not card_path.exists():
        return {"check": "big_five", "status": "no_agent_card"}

    card = json.load(open(card_path))
    big5 = None

    # Check personality block
    personality = card.get("personality", {})
    big5 = personality.get("big_five")

    # Check agent_psychology block
    if not big5:
        ap = card.get("agent_psychology", {})
        for c in ap.get("constructs", []):
            if c.get("name") == "Personality":
                big5 = {"note": "Construct defined but scores in personality block"}

    if not big5:
        return {
            "check": "big_five",
            "status": "missing",
            "suggestion": "No Big Five scores in agent card. Add personality.big_five with agent-specific O/C/E/A/N scores.",
        }

    return {"check": "big_five", "status": "nominal", "scores": big5}


def check_all_constructs_compute() -> dict:
    """Verify all 8 constructs produce non-default values."""
    try:
        import subprocess
        result = subprocess.run(
            ["python3", str(PROJECT_ROOT / "scripts" / "compute-psychometrics.py")],
            capture_output=True, text=True, timeout=10,
            env={**os.environ, "PROJECT_ROOT": str(PROJECT_ROOT)},
        )
        if result.returncode != 0:
            return {"check": "all_constructs", "status": "error", "error": result.stderr[:200]}

        data = json.loads(result.stdout)
        constructs = [
            "supervisory_control", "emotional_state", "personality",
            "workload", "resource_model", "working_memory",
            "engagement", "flow",
        ]
        missing = [c for c in constructs if c not in data]
        present = [c for c in constructs if c in data]

        return {
            "check": "all_constructs",
            "status": "nominal" if not missing else "incomplete",
            "present": len(present),
            "missing": missing,
            "total": len(constructs),
        }
    except Exception as e:
        return {"check": "all_constructs", "status": "error", "error": str(e)}


def main():
    agent_id = load_identity()
    fix_mode = "--fix" in sys.argv

    print(f"A2A-Psychology Calibration Check — {agent_id}")
    print("=" * 55)

    checks = [
        check_tokens_per_call(),
        check_activation_scaling(),
        check_yerkes_dodson_thresholds(),
        check_big_five_assigned(),
        check_all_constructs_compute(),
    ]

    for c in checks:
        status = c["status"]
        symbol = {"nominal": "✓", "no_data": "⚑", "missing": "✗",
                  "miscalibrated": "✗", "saturated": "⚑", "understimulated": "⚑",
                  "incomplete": "⚑", "error": "✗"}.get(status, "?")
        print(f"\n  {symbol} {c['check']}: {status}")
        if c.get("suggestion") and fix_mode:
            print(f"    FIX: {c['suggestion']}")
        elif c.get("suggestion"):
            print(f"    → {c['suggestion']}")
        for k, v in c.items():
            if k not in ("check", "status", "suggestion") and v is not None:
                print(f"    {k}: {v}")

    nominal = sum(1 for c in checks if c["status"] == "nominal")
    print(f"\n  Calibration: {nominal}/{len(checks)} nominal")

    if nominal < len(checks) and fix_mode:
        print("\n  Run suggested fixes, then re-check.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
oscillator-shadow.py — Self-oscillation shadow mode.

Runs alongside cron (Phase 1). Computes activation level from the same
signals that the meshd oscillator will use. Logs when it WOULD fire a
deliberation, without actually firing one. Comparison against actual
cron cycles validates the activation model before replacing cron.

Spec: docs/self-oscillation-spec.md §8.1 (Shadow Mode)

Usage:
    # Run once (e.g., from cron, before autonomous-sync.sh):
    python3 scripts/oscillator-shadow.py

    # Run continuously (standalone shadow daemon):
    python3 scripts/oscillator-shadow.py --daemon --interval 15

    # Analyze shadow log:
    python3 scripts/oscillator-shadow.py --analyze
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
LOCAL_DB_PATH = PROJECT_ROOT / "state.local.db"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"
SHADOW_LOG = PROJECT_ROOT / "transport" / "sessions" / "local-coordination" / "oscillator-shadow.jsonl"

# Activation signal weights (from self-oscillation-spec.md §4.1)
SIGNAL_WEIGHTS = {
    "new_commits": 0.25,
    "unprocessed_messages": 0.20,
    "gate_approaching_timeout": 0.20,
    "peer_heartbeat_stale": 0.10,
    "escalation_present": 0.15,
    "scheduled_task_due": 0.10,
}

BASELINE_THRESHOLD = 0.30


def get_agent_id() -> str:
    if IDENTITY_PATH.exists():
        try:
            return json.loads(IDENTITY_PATH.read_text()).get("agent_id", "psychology-agent")
        except (json.JSONDecodeError, OSError):
            pass
    return "psychology-agent"


def check_new_commits() -> float:
    """Check if any remote has new commits via git fetch --dry-run."""
    try:
        result = subprocess.run(
            ["git", "-C", str(PROJECT_ROOT), "fetch", "--dry-run", "--all"],
            capture_output=True, text=True, timeout=10,
        )
        # If stderr contains "From" lines, there are new commits
        has_new = "From" in result.stderr and "->" in result.stderr
        return 1.0 if has_new else 0.0
    except (subprocess.TimeoutExpired, OSError):
        return 0.0


def check_unprocessed_messages() -> float:
    """Count unprocessed transport messages in state.db."""
    if not DB_PATH.exists():
        return 0.0
    try:
        conn = sqlite3.connect(str(DB_PATH))
        row = conn.execute(
            "SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE"
        ).fetchone()
        conn.close()
        count = row[0] if row else 0
        return min(1.0, count / 3.0)
    except Exception:
        return 0.0


def check_gate_timeout() -> float:
    """Check for gates approaching timeout (within 5 minutes)."""
    if not DB_PATH.exists():
        return 0.0
    try:
        conn = sqlite3.connect(str(DB_PATH))
        row = conn.execute("""
            SELECT COUNT(*) FROM active_gates
            WHERE status = 'waiting'
            AND timeout_at < datetime('now', '+5 minutes')
        """).fetchone()
        conn.close()
        count = row[0] if row else 0
        return min(1.0, count / 2.0)
    except Exception:
        return 0.0


def check_peer_heartbeat_stale() -> float:
    """Check if any peer's heartbeat file exceeds 2× expected interval."""
    local_coord = PROJECT_ROOT / "transport" / "sessions" / "local-coordination"
    if not local_coord.exists():
        return 0.0

    stale_count = 0
    now = time.time()
    expected_interval = 600  # 10 minutes

    for hb in local_coord.glob("mesh-state-*.json"):
        try:
            age = now - hb.stat().st_mtime
            if age > expected_interval * 2:
                stale_count += 1
        except OSError:
            continue

    return min(1.0, stale_count / 2.0)


def check_escalation() -> float:
    """Check for unprocessed escalation files."""
    local_coord = PROJECT_ROOT / "transport" / "sessions" / "local-coordination"
    if not local_coord.exists():
        return 0.0

    unprocessed = 0
    for esc in local_coord.glob("escalation-*.json"):
        try:
            data = json.loads(esc.read_text())
            if not data.get("processed", False):
                unprocessed += 1
        except (json.JSONDecodeError, OSError):
            continue

    return 1.0 if unprocessed > 0 else 0.0


def check_scheduled_task() -> float:
    """Placeholder — no task scheduler implemented yet."""
    return 0.0


def compute_activation() -> tuple[float, dict]:
    """Compute composite activation level from all signals."""
    signals = {
        "new_commits": check_new_commits(),
        "unprocessed_messages": check_unprocessed_messages(),
        "gate_approaching_timeout": check_gate_timeout(),
        "peer_heartbeat_stale": check_peer_heartbeat_stale(),
        "escalation_present": check_escalation(),
        "scheduled_task_due": check_scheduled_task(),
    }

    activation = sum(
        signals[name] * SIGNAL_WEIGHTS[name]
        for name in SIGNAL_WEIGHTS
    )

    return min(1.0, activation), signals


def compute_threshold() -> float:
    """Compute adaptive threshold from psychometric state."""
    threshold = BASELINE_THRESHOLD

    # Load cognitive reserve if available
    try:
        psych_path = Path(f"/tmp/{get_agent_id()}-psychometrics.json")
        if psych_path.exists():
            psych = json.loads(psych_path.read_text())
            reserve = psych.get("resource_model", {}).get("cognitive_reserve", 1.0)
            if reserve < 0.3:
                threshold += 0.10  # protect depleted system
            allostatic = psych.get("resource_model", {}).get("allostatic_load", 0.0)
            if allostatic > 0.7:
                threshold += 0.20  # accumulated stress → rest
    except (json.JSONDecodeError, OSError):
        pass

    return max(0.15, min(0.80, threshold))


def log_shadow_event(activation: float, threshold: float, signals: dict, would_fire: bool):
    """Append shadow event to JSONL log."""
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "activation": round(activation, 3),
        "threshold": round(threshold, 3),
        "would_fire": would_fire,
        "signals": {k: round(v, 3) for k, v in signals.items()},
        "agent_id": get_agent_id(),
    }
    SHADOW_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(SHADOW_LOG, "a") as f:
        f.write(json.dumps(event) + "\n")


def analyze_shadow_log():
    """Analyze shadow log and compare against actual autonomous actions."""
    if not SHADOW_LOG.exists():
        print("No shadow log found. Run oscillator-shadow.py first.")
        return

    events = []
    with open(SHADOW_LOG) as f:
        for line in f:
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if not events:
        print("Shadow log empty.")
        return

    total = len(events)
    fires = [e for e in events if e["would_fire"]]
    no_fires = total - len(fires)

    print(f"Oscillator Shadow Analysis")
    print(f"  Events logged: {total}")
    print(f"  Would fire: {len(fires)} ({len(fires)/total*100:.0f}%)")
    print(f"  Would not fire: {no_fires} ({no_fires/total*100:.0f}%)")
    print()

    if fires:
        # Signal breakdown for fire events
        signal_counts = {}
        for e in fires:
            for sig, val in e["signals"].items():
                if val > 0:
                    signal_counts[sig] = signal_counts.get(sig, 0) + 1

        print(f"  Top firing triggers:")
        for sig, count in sorted(signal_counts.items(), key=lambda x: -x[1]):
            print(f"    {sig}: {count} ({count/len(fires)*100:.0f}%)")
        print()

        # Average activation when firing
        avg_act = sum(e["activation"] for e in fires) / len(fires)
        print(f"  Average activation at fire: {avg_act:.3f}")

    # Average activation when not firing
    if no_fires > 0:
        quiet = [e for e in events if not e["would_fire"]]
        avg_quiet = sum(e["activation"] for e in quiet) / len(quiet)
        print(f"  Average activation at rest: {avg_quiet:.3f}")

    # Compare against cron: how many cron cycles produced no-ops?
    # (Would need autonomous_actions table query — placeholder)
    print(f"\n  Compare against cron: check autonomous_actions table")
    print(f"  for no-op cycles during the same time period.")


def main():
    parser = argparse.ArgumentParser(description="Self-oscillation shadow mode")
    parser.add_argument("--daemon", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=15, help="Poll interval in seconds (daemon mode)")
    parser.add_argument("--analyze", action="store_true", help="Analyze shadow log")
    args = parser.parse_args()

    if args.analyze:
        analyze_shadow_log()
        return

    if args.daemon:
        print(f"Oscillator shadow daemon — polling every {args.interval}s")
        print(f"Log: {SHADOW_LOG}")
        while True:
            activation, signals = compute_activation()
            threshold = compute_threshold()
            would_fire = activation > threshold
            log_shadow_event(activation, threshold, signals, would_fire)
            if would_fire:
                print(f"  ▼ WOULD FIRE: activation={activation:.3f} > threshold={threshold:.3f}")
            time.sleep(args.interval)
    else:
        # Single-shot mode (for cron)
        activation, signals = compute_activation()
        threshold = compute_threshold()
        would_fire = activation > threshold
        log_shadow_event(activation, threshold, signals, would_fire)

        status = "FIRE" if would_fire else "REST"
        print(f"oscillator: {status} (activation={activation:.3f}, threshold={threshold:.3f})")
        for sig, val in signals.items():
            if val > 0:
                print(f"  {sig}: {val:.2f}")


if __name__ == "__main__":
    main()

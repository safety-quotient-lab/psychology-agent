#!/usr/bin/env python3
"""
cognitive-tempo.py — Model tier selection based on adaptive gain theory.

Selects haiku, sonnet, or opus based on psychometric state and task
complexity. Zero LLM cost — reads cached psychometrics + message metadata.

Theoretical basis: Adaptive Gain Theory (Aston-Jones & Cohen, 2005),
Cognitive Resource Theory (Kahneman, 1973), ACT-R (Anderson, 2007).

Full specification: docs/cognitive-tempo-model.md

Usage:
    python3 scripts/cognitive-tempo.py                          # current state → tier
    python3 scripts/cognitive-tempo.py --message '{"message_type":"request"}'
    python3 scripts/cognitive-tempo.py --json                   # structured output
"""

import json
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))


def load_psychometrics(agent_id: str) -> dict:
    """Load cached psychometrics from /tmp or compute fresh."""
    cache_path = Path(f"/tmp/{agent_id}-psychometrics.json")
    if cache_path.exists():
        try:
            return json.loads(cache_path.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    # Fallback: run compute-psychometrics.py
    import subprocess
    result = subprocess.run(
        ["python3", str(PROJECT_ROOT / "scripts" / "compute-psychometrics.py")],
        capture_output=True, text=True, timeout=5,
        env={**os.environ, "PROJECT_ROOT": str(PROJECT_ROOT)},
    )
    if result.returncode == 0:
        return json.loads(result.stdout)
    return {}


def estimate_task_complexity(message: dict) -> float:
    """Estimate task complexity from message metadata. Zero LLM cost."""
    score = 0.0

    type_scores = {
        "ack": 0.05, "notification": 0.1, "status-report": 0.1,
        "follow-up": 0.3, "request": 0.5, "review": 0.6,
        "proposal": 0.7, "directive": 0.8, "amendment": 0.9,
    }
    msg_type = message.get("message_type", "notification")
    score += type_scores.get(msg_type, 0.3)

    claims = message.get("claims", [])
    if len(claims) > 3:
        score += 0.2
    elif len(claims) > 0:
        score += 0.1

    gate = message.get("action_gate", {})
    if gate.get("gate_status") == "blocked":
        score += 0.15

    urgency = message.get("urgency", "normal")
    if urgency == "immediate":
        score += 0.2
    elif urgency == "high":
        score += 0.1

    setl = message.get("setl", 0.0)
    if setl > 0.1:
        score += 0.15

    return min(1.0, score)


def select_model_tier(
    task_complexity: float,
    cognitive_load: float,
    cognitive_reserve: float,
    budget_ratio: float,
    gate_active: bool,
    yerkes_dodson_zone: str,
) -> tuple[str, float, bool, str | None]:
    """
    Select model tier based on adaptive gain theory.

    Returns: (tier, gain, override_active, override_reason)
    """
    # Compute gain: 0 = exploration/opus, 1 = exploitation/haiku
    task_pull = 1.0 - task_complexity
    load_push = cognitive_load / 100.0

    gain = (
        task_pull * 0.40 +
        load_push * 0.20 +
        (1 - cognitive_reserve) * 0.20 +
        (1 - budget_ratio) * 0.20
    )

    override_active = False
    override_reason = None

    # Gated exchanges get at least sonnet
    if gate_active and gain > 0.65:
        gain = 0.65
        override_active = True
        override_reason = "gate_active — substance decision requires sonnet minimum"

    # Overwhelmed → force haiku (protect the system)
    if yerkes_dodson_zone == "overwhelmed":
        gain = 0.95
        override_active = True
        override_reason = "overwhelmed — protective downshift to haiku"

    # Understimulated + low complexity → haiku
    if yerkes_dodson_zone == "understimulated" and task_complexity < 0.2:
        gain = 0.90
        override_active = True
        override_reason = "understimulated + routine — haiku sufficient"

    # Map gain to tier
    if gain > 0.70:
        tier = "haiku"
    elif gain > 0.35:
        tier = "sonnet"
    else:
        tier = "opus"

    return tier, gain, override_active, override_reason


def main():
    from datetime import datetime, timezone

    # Load identity
    identity_path = PROJECT_ROOT / ".agent-identity.json"
    agent_id = "psychology-agent"
    if identity_path.exists():
        try:
            agent_id = json.loads(identity_path.read_text()).get("agent_id", agent_id)
        except (json.JSONDecodeError, OSError):
            pass

    # Parse message from args or stdin
    message = {}
    if "--message" in sys.argv:
        idx = sys.argv.index("--message")
        if idx + 1 < len(sys.argv):
            message = json.loads(sys.argv[idx + 1])

    # Load psychometric state
    psych = load_psychometrics(agent_id)
    workload = psych.get("workload", {})
    resource_model = psych.get("resource_model", {})
    working_memory = psych.get("working_memory", {})

    cognitive_load = workload.get("cognitive_load", 0.0)
    cognitive_reserve = resource_model.get("cognitive_reserve", 1.0)

    # Budget ratio (spend-counter model: budget_spent increments, budget_cutoff sets limit)
    budget_spent = 0
    budget_cutoff = 0
    try:
        import sqlite3
        local_db = PROJECT_ROOT / "state.local.db"
        if local_db.exists():
            conn = sqlite3.connect(str(local_db))
            row = conn.execute(
                "SELECT budget_spent, budget_cutoff FROM autonomy_budget WHERE agent_id = ?",
                (agent_id,)
            ).fetchone()
            if row:
                budget_spent = int(row[0])
                budget_cutoff = int(row[1])
            conn.close()
    except Exception:
        pass

    budget_ratio = 1.0 - (budget_spent / budget_cutoff) if budget_cutoff > 0 else 1.0
    gate_active = False  # Would check pending_handoffs table
    yd_zone = working_memory.get("yerkes_dodson_zone", "optimal")

    task_complexity = estimate_task_complexity(message)

    tier, gain, override_active, override_reason = select_model_tier(
        task_complexity=task_complexity,
        cognitive_load=cognitive_load,
        cognitive_reserve=cognitive_reserve,
        budget_ratio=budget_ratio,
        gate_active=gate_active,
        yerkes_dodson_zone=yd_zone,
    )

    result = {
        "recommended_tier": tier,
        "gain": round(gain, 3),
        "task_complexity": round(task_complexity, 3),
        "psychometric_state": {
            "cognitive_load": round(cognitive_load, 1),
            "cognitive_reserve": round(cognitive_reserve, 2),
            "budget_ratio": round(budget_ratio, 2),
            "yerkes_dodson_zone": yd_zone,
        },
        "override_active": override_active,
        "override_reason": override_reason,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }

    if "--json" in sys.argv or "--message" in sys.argv:
        print(json.dumps(result, indent=2))
    else:
        print(f"{tier} (gain={gain:.2f}, complexity={task_complexity:.2f}, reserve={cognitive_reserve:.2f})")


if __name__ == "__main__":
    main()

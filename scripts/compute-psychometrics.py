#!/usr/bin/env python3
"""
compute-psychometrics.py — Compute agent psychometric state from operational metrics.

Implements the mesh psychometrics plan (docs/mesh-psychometrics-plan.md).
Computes PAD emotional state, NASA-TLX workload, remaining capacity, and
Big Five personality profile from observable operational metrics.

All measures represent processual states derived from behavioral observation,
not claims about subjective experience (apophatic discipline, §11.9).

Usage:
    python3 scripts/compute-psychometrics.py                # full output (JSON)
    python3 scripts/compute-psychometrics.py --pad          # PAD only
    python3 scripts/compute-psychometrics.py --tlx          # NASA-TLX only
    python3 scripts/compute-psychometrics.py --capacity     # remaining capacity only
    python3 scripts/compute-psychometrics.py --mesh-state   # mesh-state v2 fragment
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


def load_identity() -> dict:
    if IDENTITY_PATH.exists():
        return json.load(open(IDENTITY_PATH))
    return {"agent_id": "psychology-agent"}


def get_metrics(db: sqlite3.Connection, local_db: sqlite3.Connection | None,
                agent_id: str) -> dict:
    """Gather operational metrics from state.db and state.local.db."""
    m = {}

    # Transport metrics
    try:
        r = db.execute("SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE").fetchone()
        m["unprocessed_messages"] = r[0] if r else 0
        r = db.execute("SELECT COUNT(*) FROM transport_messages").fetchone()
        m["total_messages"] = r[0] if r else 0
    except Exception:
        m["unprocessed_messages"] = 0
        m["total_messages"] = 0

    # Gate metrics
    try:
        r = db.execute("SELECT COUNT(*) FROM active_gates WHERE status = 'waiting'").fetchone()
        m["active_gates"] = r[0] if r else 0
        r = db.execute("""SELECT COUNT(*) FROM active_gates
            WHERE status = 'waiting' AND timeout_at < datetime('now')""").fetchone()
        m["gates_timing_out"] = r[0] if r else 0
    except Exception:
        m["active_gates"] = 0
        m["gates_timing_out"] = 0

    # Budget metrics (from local DB)
    if local_db:
        try:
            r = local_db.execute(
                "SELECT budget_current, budget_max, consecutive_blocks, shadow_mode "
                "FROM autonomy_budget WHERE agent_id = ?", (agent_id,)
            ).fetchone()
            if r:
                m["budget_current"] = r[0]
                m["budget_max"] = r[1]
                m["consecutive_blocks"] = r[2]
                m["shadow_mode"] = r[3]
        except Exception:
            pass

        # Recent action metrics
        try:
            r = local_db.execute("""
                SELECT COUNT(*) FROM autonomous_actions
                WHERE agent_id = ? AND created_at > datetime('now', '-1 hour')
            """, (agent_id,)).fetchone()
            m["actions_last_hour"] = r[0] if r else 0

            r = local_db.execute("""
                SELECT COUNT(*) FROM autonomous_actions
                WHERE agent_id = ? AND evaluator_result = 'blocked'
                AND created_at > datetime('now', '-1 hour')
            """, (agent_id,)).fetchone()
            m["errors_last_hour"] = r[0] if r else 0
        except Exception:
            m["actions_last_hour"] = 0
            m["errors_last_hour"] = 0

    # Session sensor files (written by hooks during interactive sessions)
    import os as _os
    uid = _os.getuid()
    agent_for_files = agent_id if agent_id != "human" else "psychology-agent"

    # Context pressure (Yerkes-Dodson primary input)
    ctx_file = Path(f"{_os.environ.get('XDG_RUNTIME_DIR', '/tmp')}/.claude-context-pct-{uid}")
    if ctx_file.exists():
        try:
            m["context_pressure"] = int(ctx_file.read_text().strip()) / 100.0
        except (ValueError, OSError):
            pass

    # Tool call counter
    tc_file = Path(f"/tmp/{agent_for_files}-tool-calls")
    if tc_file.exists():
        try:
            m["tool_calls"] = int(tc_file.read_text().strip())
        except (ValueError, OSError):
            pass

    # Session start timestamp (for vigilance/duration)
    ss_file = Path(f"/tmp/{agent_for_files}-session-start")
    if ss_file.exists():
        try:
            from datetime import datetime as _dt
            start = _dt.fromisoformat(ss_file.read_text().strip())
            duration_min = (_dt.now(start.tzinfo) - start).total_seconds() / 60.0
            m["session_duration_minutes"] = round(duration_min, 1)
        except (ValueError, OSError):
            pass

    # Pushback count
    pb_file = Path(f"/tmp/{agent_for_files}-pushback-count")
    if pb_file.exists():
        try:
            m["pushbacks_session"] = int(pb_file.read_text().strip())
        except (ValueError, OSError):
            pass

    # Defaults for missing metrics
    m.setdefault("budget_current", 50)
    m.setdefault("budget_max", 50)
    m.setdefault("consecutive_blocks", 0)
    m.setdefault("actions_last_hour", 0)
    m.setdefault("errors_last_hour", 0)
    m.setdefault("context_pressure", 0.0)
    m.setdefault("triggers_fired", 0)
    m.setdefault("pushbacks_session", 0)
    m.setdefault("deliverables_completed", 0)
    m.setdefault("tool_calls", 0)
    m.setdefault("session_duration_minutes", 0.0)

    return m


def compute_pad(m: dict) -> dict:
    """PAD emotional state (Mehrabian & Russell, 1974)."""
    # Pleasure: task alignment
    error_ratio = min(1.0, m["errors_last_hour"] / 3.0)
    msg_health = 1.0 - min(1.0, m["unprocessed_messages"] / 10.0)
    gate_stress = min(1.0, m["gates_timing_out"] / 2.0)
    pleasure = msg_health - error_ratio - gate_stress
    pleasure = max(-1.0, min(1.0, pleasure))

    # Activation: processing intensity
    # Use the stronger of autonomous actions OR interactive tool calls
    action_rate = min(1.0, m["actions_last_hour"] / 10.0)
    tool_rate = min(1.0, m.get("tool_calls", 0) / 50.0)  # 50 calls = high session
    activity = max(action_rate, tool_rate)  # whichever mode shows more activity
    context_factor = m.get("context_pressure", 0.0)
    msg_volume = min(1.0, m["unprocessed_messages"] / 5.0)
    arousal = (activity + context_factor + msg_volume) / 3.0
    arousal = 2.0 * arousal - 1.0
    arousal = max(-1.0, min(1.0, arousal))

    # Dominance: governance headroom
    budget_ratio = m["budget_current"] / max(m["budget_max"], 1)
    block_penalty = min(1.0, m["consecutive_blocks"] / 3.0)
    dominance = budget_ratio - block_penalty
    dominance = 2.0 * dominance - 1.0
    dominance = max(-1.0, min(1.0, dominance))

    # Discrete label
    label = _pad_to_label(pleasure, arousal, dominance)

    return {
        "model": "PAD (Mehrabian & Russell, 1974)",
        "hedonic_valence": round(pleasure, 2),
        "activation": round(arousal, 2),
        "perceived_control": round(dominance, 2),
        "affect_category": label,
    }


def _pad_to_label(p: float, a: float, d: float) -> str:
    if p > 0.3 and a < 0 and d > 0:
        return "calm-satisfied"
    if p > 0.3 and a > 0.3 and d > 0:
        return "excited-triumphant"
    if p > 0.3 and a > 0 and d < 0:
        return "surprised-grateful"
    if p < -0.3 and a > 0.3 and d > 0:
        return "frustrated"
    if p < -0.3 and a > 0.3 and d < 0:
        return "anxious-overwhelmed"
    if p < -0.3 and a < 0 and d > 0:
        return "bored-understimulated"
    if p < -0.3 and a < 0 and d < 0:
        return "depleted"
    return "neutral"


def compute_tlx(m: dict, mode: str = "neutral") -> dict:
    """NASA-TLX workload (Hart & Staveland, 1988)."""
    # Calibrated scaling: avoid ceiling saturation
    # cognitive_demand: triggers + messages, scaled to typical session range
    mental = min(100, m.get("triggers_fired", 0) * 5 +
                      m.get("unprocessed_messages", 0) * 3 +
                      min(50, m.get("tool_calls", 0)))
    # time_pressure: context approaching limit + gates timing out
    temporal = min(100, m.get("context_pressure", 0) * 100 +
                        m.get("gates_timing_out", 0) * 20)
    # self_efficacy: deliverables + total message health
    performance = min(100, m.get("deliverables_completed", 0) * 15 +
                           (m["total_messages"] > 0) * 30 +
                           min(20, m.get("tool_calls", 0) // 3))
    # mobilized_effort: tool calls + actions, scaled to avoid saturation
    effort = min(100, int(m.get("tool_calls", 0) * 1.2) +
                      m.get("actions_last_hour", 0) * 8)
    # regulatory_fatigue: errors + blocks
    frustration = min(100, m.get("errors_last_hour", 0) * 25 +
                           m.get("consecutive_blocks", 0) * 30)
    # computational_strain: context pressure
    physical = min(100, m.get("context_pressure", 0) * 100)

    weights = {
        "generative": [0.30, 0.10, 0.20, 0.20, 0.10, 0.10],
        "evaluative": [0.20, 0.20, 0.30, 0.10, 0.10, 0.10],
        "neutral":    [0.20, 0.15, 0.20, 0.15, 0.15, 0.15],
    }
    w = weights.get(mode, weights["neutral"])
    dims = [mental, temporal, performance, effort, frustration, physical]
    weighted = sum(d * wt for d, wt in zip(dims, w))

    return {
        "model": "NASA-TLX (Hart & Staveland, 1988)",
        "cognitive_demand": mental,
        "time_pressure": temporal,
        "self_efficacy": performance,
        "mobilized_effort": effort,
        "regulatory_fatigue": frustration,
        "computational_strain": physical,
        "cognitive_load": round(weighted, 1),
        "mode": mode,
    }


def compute_resource_model(tlx: dict, m: dict) -> dict:
    """Three-construct resource model (Stern, Baumeister, McEwen)."""
    # Cognitive reserve (Stern, 2002; Kahneman, 1973)
    workload_factor = 1.0 - (tlx["cognitive_load"] / 100.0)
    budget_factor = m["budget_current"] / max(m["budget_max"], 1)
    context_factor = 1.0 - m.get("context_pressure", 0.0)
    cognitive_reserve = workload_factor * budget_factor * context_factor

    # Self-regulatory resource (Baumeister et al., 1998)
    self_regulatory = budget_factor

    # Allostatic load (McEwen, 1998) — would need cross-session data
    # Placeholder: derive from error accumulation
    allostatic = min(1.0, m.get("errors_last_hour", 0) / 5.0)

    return {
        "cognitive_reserve": round(cognitive_reserve, 2),
        "self_regulatory_resource": round(self_regulatory, 2),
        "allostatic_load": round(allostatic, 2),
        "components": {
            "workload_factor": round(workload_factor, 2),
            "budget_factor": round(budget_factor, 2),
            "context": round(context_factor, 2),
        },
    }


def big_five_profile() -> dict:
    """Static Big Five personality profile for psychology-agent."""
    return {
        "model": "OCEAN (Costa & McCrae, 1992)",
        "openness": 0.85,
        "conscientiousness": 0.90,
        "extraversion": 0.60,
        "agreeableness": 0.35,
        "neuroticism": 0.55,
        "note": "Design parameters, not psychometric measurements",
    }


def main():
    identity = load_identity()
    agent_id = identity.get("agent_id", "psychology-agent")

    db = sqlite3.connect(str(DB_PATH)) if DB_PATH.exists() else None
    local_db = sqlite3.connect(str(LOCAL_DB_PATH)) if LOCAL_DB_PATH.exists() else None

    m = get_metrics(db, local_db, agent_id) if db else {}

    pad = compute_pad(m)
    tlx = compute_tlx(m)
    resources = compute_resource_model(tlx, m)
    big5 = big_five_profile()

    # Supervisory Control (Sheridan & Verplank, 1978; Parasuraman et al., 2000)
    identity = load_identity()
    is_human_identity = identity.get("agent_id") == "human"
    budget_ratio = m["budget_current"] / max(m["budget_max"], 1)

    if is_human_identity:
        loa = 5  # Interactive: human approves
        human_in_loop = True
        human_monitoring = True
    elif budget_ratio <= 0:
        loa = 10  # Halted: budget exhausted, no human oversight until reset
        human_in_loop = False
        human_monitoring = False
    elif m.get("shadow_mode", 1) == 1:
        loa = 7  # Autonomous with budget governance
        human_in_loop = False
        human_monitoring = True
    else:
        loa = 7
        human_in_loop = False
        human_monitoring = True

    supervisory_control = {
        "model": "Sheridan & Verplank (1978); Parasuraman et al. (2000)",
        "level_of_automation": loa,
        "human_in_loop": human_in_loop,
        "human_on_loop": budget_ratio > 0,
        "human_monitoring": human_monitoring,
        "human_accountable": True,
        "escalation_path_available": True,
        "circuit_breaker_available": True,
    }

    # Working memory + Yerkes-Dodson
    ctx = m.get("context_pressure", 0.0)
    if ctx < 0.15:
        yd_zone = "understimulated"
    elif ctx < 0.60:
        yd_zone = "optimal"
    elif ctx < 0.80:
        yd_zone = "pressured"
    else:
        yd_zone = "overwhelmed"

    working_memory = {
        "model": "Baddeley (1986) + Cowan (2001)",
        "capacity_load": round(ctx, 2),
        "yerkes_dodson_zone": yd_zone,
        "tool_calls": m.get("tool_calls", 0),
        "session_duration_minutes": m.get("session_duration_minutes", 0.0),
    }

    if "--pad" in sys.argv:
        print(json.dumps(pad, indent=2))
    elif "--tlx" in sys.argv:
        print(json.dumps(tlx, indent=2))
    elif "--resources" in sys.argv:
        print(json.dumps(resources, indent=2))
    # Engagement (UWES / JD-R)
    tool_rate_norm = min(1.0, m.get("tool_calls", 0) / 80.0)
    session_hrs = m.get("session_duration_minutes", 0) / 60.0
    engagement = {
        "model": "UWES (Schaufeli, 2002) + JD-R (Bakker & Demerouti, 2007)",
        "vigor": round(tool_rate_norm, 2),
        "dedication": round(min(1.0, session_hrs / 3.0), 2),
        "absorption": round(ctx, 2),
        "burnout_risk": round(max(0, (tlx["cognitive_load"] / 100.0) - resources["cognitive_reserve"]), 2),
    }

    # Flow (Csikszentmihalyi, 1990)
    conditions = 0
    if m.get("deliverables_completed", 0) > 0 or m.get("tool_calls", 0) > 10:
        conditions += 1  # clear goals (active work)
    if m.get("actions_last_hour", 0) > 0 or m.get("tool_calls", 0) > 5:
        conditions += 1  # immediate feedback (responses arriving)
    if 0.15 < ctx < 0.70:
        conditions += 1  # challenge-skill balance (optimal WM zone)
    if resources["cognitive_reserve"] > 0.4:
        conditions += 1  # sense of control
    if tool_rate_norm > 0.3:
        conditions += 1  # absorption (sustained activity)

    flow = {
        "model": "Csikszentmihalyi (1990)",
        "conditions_met": conditions,
        "in_flow": conditions >= 4,
        "score": round(conditions / 5.0, 2),
    }

    if "--pad" in sys.argv:
        print(json.dumps(pad, indent=2))
    elif "--tlx" in sys.argv:
        print(json.dumps(tlx, indent=2))
    elif "--resources" in sys.argv:
        print(json.dumps(resources, indent=2))
    elif "--supervisory" in sys.argv:
        print(json.dumps(supervisory_control, indent=2))
    elif "--mesh-state" in sys.argv:
        print(json.dumps({
            "supervisory_control": supervisory_control,
            "emotional_state": pad,
            "personality": big5,
            "workload": tlx,
            "resource_model": resources,
            "working_memory": working_memory,
            "engagement": engagement,
            "flow": flow,
        }, indent=2))
    else:
        print(json.dumps({
            "agent_id": agent_id,
            "supervisory_control": supervisory_control,
            "emotional_state": pad,
            "personality": big5,
            "workload": tlx,
            "resource_model": resources,
            "working_memory": working_memory,
            "engagement": engagement,
            "flow": flow,
        }, indent=2))

    if db:
        db.close()
    if local_db:
        local_db.close()


if __name__ == "__main__":
    main()

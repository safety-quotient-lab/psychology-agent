#!/usr/bin/env python3
"""
compute-organism-state.py — Organism-level psychological state for the agent mesh.

Computes emergent properties of the mesh that no individual agent exhibits
alone. Reads mesh-state/v2 JSON from all agents and produces aggregate
organism-level constructs.

Zero LLM cost — reads cached mesh-state files from transport/sessions/
local-coordination/ and cross-repo fetch caches.

Usage:
    python3 scripts/compute-organism-state.py              # full organism state
    python3 scripts/compute-organism-state.py --dashboard   # compositor-ready JSON
    python3 scripts/compute-organism-state.py --health      # one-line health summary
"""

import json
import os
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
LOCAL_COORD = PROJECT_ROOT / "transport" / "sessions" / "local-coordination"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"


def load_agent_states() -> dict:
    """Load mesh-state JSON for all agents from local-coordination directory."""
    states = {}
    if not LOCAL_COORD.exists():
        return states

    for f in LOCAL_COORD.glob("mesh-state-*.json"):
        try:
            data = json.loads(f.read_text())
            agent_id = data.get("agent_id", f.stem.replace("mesh-state-", ""))
            states[agent_id] = data
        except (json.JSONDecodeError, OSError):
            continue

    return states


def compute_organism_affect(states: dict) -> dict:
    """Aggregate PAD values across agents into organism-level affect."""
    valences = []
    activations = []
    controls = []

    for agent_id, state in states.items():
        es = state.get("emotional_state", {})
        if "hedonic_valence" in es:
            valences.append(es["hedonic_valence"])
        elif "pleasure" in es:
            valences.append(es["pleasure"])
        if "activation" in es:
            activations.append(es["activation"])
        elif "arousal" in es:
            activations.append(es["arousal"])
        if "perceived_control" in es:
            controls.append(es["perceived_control"])
        elif "dominance" in es:
            controls.append(es["dominance"])

    if not valences:
        return {"status": "no_data"}

    mean_v = sum(valences) / len(valences)
    mean_a = sum(activations) / len(activations) if activations else 0
    min_c = min(controls) if controls else 0
    variance_a = sum((a - mean_a) ** 2 for a in activations) / max(len(activations), 1) if activations else 0

    # Organism affect category
    if mean_v > 0.3 and min_c > 0:
        category = "mesh-healthy"
    elif mean_v < -0.3:
        category = "mesh-stressed"
    elif min_c < -0.3:
        category = "mesh-constrained"
    elif variance_a > 0.3:
        category = "mesh-unbalanced"
    else:
        category = "mesh-nominal"

    return {
        "model": "Organism PAD (aggregated Mehrabian & Russell, 1974)",
        "mean_hedonic_valence": round(mean_v, 2),
        "mean_activation": round(mean_a, 2),
        "min_perceived_control": round(min_c, 2),
        "activation_variance": round(variance_a, 3),
        "organism_affect_category": category,
        "agents_reporting": len(valences),
    }


def compute_organism_cognitive_reserve(states: dict) -> dict:
    """Mesh capacity = bottleneck agent (minimum cognitive reserve)."""
    reserves = {}

    for agent_id, state in states.items():
        rm = state.get("resource_model", {})
        cr = rm.get("cognitive_reserve")
        if cr is not None:
            reserves[agent_id] = cr

    if not reserves:
        return {"status": "no_data"}

    bottleneck_agent = min(reserves, key=reserves.get)
    mean_reserve = sum(reserves.values()) / len(reserves)

    return {
        "model": "Organism Cognitive Reserve (Stern, 2002 — aggregated)",
        "bottleneck_agent": bottleneck_agent,
        "bottleneck_reserve": round(reserves[bottleneck_agent], 2),
        "mean_reserve": round(mean_reserve, 2),
        "per_agent": {k: round(v, 2) for k, v in reserves.items()},
        "organism_status": "depleted" if reserves[bottleneck_agent] < 0.3
                          else "pressured" if reserves[bottleneck_agent] < 0.5
                          else "healthy",
    }


def compute_organism_allostatic_load(states: dict) -> dict:
    """Cumulative cross-agent stress debt."""
    loads = {}

    for agent_id, state in states.items():
        rm = state.get("resource_model", {})
        al = rm.get("allostatic_load")
        if al is not None:
            loads[agent_id] = al

    if not loads:
        return {"status": "no_data"}

    total = sum(loads.values())
    mean = total / len(loads)

    return {
        "model": "Organism Allostatic Load (McEwen, 1998 — summed)",
        "total_load": round(total, 2),
        "mean_load": round(mean, 2),
        "per_agent": {k: round(v, 2) for k, v in loads.items()},
        "organism_status": "accumulated-debt" if total > 2.0
                          else "moderate-debt" if total > 1.0
                          else "low-debt",
    }


def compute_coordination_overhead(conn: sqlite3.Connection) -> dict:
    """Steiner (1972) process losses — ratio of coordination to substance."""
    process_types = {"ack", "gate-resolution", "notification", "status-report",
                     "acknowledgment", "batch-ack", "ack+status", "ack+review",
                     "ack+finding", "ack+decision"}
    substance_types = {"request", "response", "review", "proposal", "directive",
                       "consensus-response", "consensus-vote", "amendment",
                       "correction", "revision"}

    try:
        rows = conn.execute("""
            SELECT message_type, COUNT(*) as cnt
            FROM transport_messages
            WHERE message_type IS NOT NULL
            GROUP BY message_type
        """).fetchall()
    except Exception:
        return {"status": "no_data"}

    process_count = 0
    substance_count = 0
    for r in rows:
        mt = r[0].lower() if r[0] else ""
        if mt in process_types:
            process_count += r[1]
        elif mt in substance_types:
            substance_count += r[1]

    ratio = process_count / max(substance_count, 1)

    return {
        "model": "Coordination Overhead (Steiner, 1972)",
        "process_messages": process_count,
        "substance_messages": substance_count,
        "ratio": round(ratio, 2),
        "organism_status": "over-coordinated" if ratio > 2.0
                          else "balanced" if ratio < 1.5
                          else "coordination-heavy",
    }


def compute_immune_health(conn: sqlite3.Connection) -> dict:
    """Immune system health — detection rate across immune components."""
    # Microglial audit findings
    audit_findings = 0
    audit_count = 0
    try:
        r = conn.execute("SELECT COUNT(*), SUM(findings_count) FROM document_audits").fetchone()
        audit_count = r[0] or 0
        audit_findings = r[1] or 0
    except Exception:
        pass

    # Claim verification rate
    claims_total = 0
    claims_verified = 0
    try:
        claims_total = conn.execute("SELECT COUNT(*) FROM claims").fetchone()[0]
        claims_verified = conn.execute("SELECT COUNT(*) FROM claims WHERE verified = 1").fetchone()[0]
    except Exception:
        pass

    # Epistemic flag resolution
    flags_total = 0
    flags_resolved = 0
    try:
        flags_total = conn.execute("SELECT COUNT(*) FROM epistemic_flags").fetchone()[0]
        flags_resolved = conn.execute("SELECT COUNT(*) FROM epistemic_flags WHERE resolved = 1").fetchone()[0]
    except Exception:
        pass

    # Prediction accuracy (adaptive immune memory)
    prediction_accuracy = None
    try:
        r = conn.execute("""
            SELECT COUNT(*),
                   SUM(CASE WHEN outcome IN ('confirmed','partially-confirmed') THEN 1 ELSE 0 END)
            FROM prediction_ledger WHERE outcome != 'untested'
        """).fetchone()
        if r[0] and r[0] > 0:
            prediction_accuracy = round(r[1] / r[0], 2)
    except Exception:
        pass

    # Composite immune health
    components = []
    if audit_count > 0:
        components.append(min(1.0, audit_findings / (audit_count * 5)))  # finding rate normalized
    if claims_total > 0:
        components.append(claims_verified / claims_total)  # verification coverage
    if flags_total > 0:
        components.append(flags_resolved / flags_total)  # flag resolution rate
    if prediction_accuracy is not None:
        components.append(prediction_accuracy)

    composite = round(sum(components) / max(len(components), 1), 2)

    return {
        "model": "Psychoemotional Immune Health (composite)",
        "innate": {
            "microglial_audits": audit_count,
            "findings_detected": audit_findings,
        },
        "adaptive": {
            "claims_verified": f"{claims_verified}/{claims_total}",
            "flags_resolved": f"{flags_resolved}/{flags_total}",
            "prediction_accuracy": prediction_accuracy,
        },
        "composite_health": composite,
        "organism_status": "immunocompromised" if composite < 0.3
                          else "recovering" if composite < 0.5
                          else "healthy",
    }


def compute_collective_intelligence(states: dict, conn: sqlite3.Connection) -> dict:
    """Woolley et al. (2010) — does the mesh outperform individual agents?"""
    # Proxy: message distribution equality (Woolley found turn-taking equality
    # correlates with collective intelligence)
    try:
        rows = conn.execute("""
            SELECT from_agent, COUNT(*) as cnt
            FROM transport_messages
            WHERE from_agent IS NOT NULL
            GROUP BY from_agent
        """).fetchall()
    except Exception:
        return {"status": "no_data"}

    if len(rows) < 2:
        return {"status": "insufficient_agents"}

    counts = [r[1] for r in rows]
    mean = sum(counts) / len(counts)
    # Gini coefficient (0 = perfect equality, 1 = one agent dominates)
    sorted_counts = sorted(counts)
    n = len(sorted_counts)
    numerator = sum((2 * (i + 1) - n - 1) * sorted_counts[i] for i in range(n))
    gini = numerator / (n * sum(sorted_counts)) if sum(sorted_counts) > 0 else 0

    return {
        "model": "Collective Intelligence proxy (Woolley et al., 2010)",
        "message_distribution_gini": round(gini, 3),
        "agents_participating": len(rows),
        "organism_status": "concentrated" if gini > 0.5
                          else "moderate-inequality" if gini > 0.3
                          else "well-distributed",
        "note": "Woolley found turn-taking equality correlates with collective intelligence. Gini 0 = perfect equality.",
    }


def main():
    conn = sqlite3.connect(str(DB_PATH)) if DB_PATH.exists() else None
    states = load_agent_states()

    organism = {
        "schema": "organism-state/v1",
        "agents_detected": len(states),
        "organism_affect": compute_organism_affect(states),
        "organism_cognitive_reserve": compute_organism_cognitive_reserve(states),
        "organism_allostatic_load": compute_organism_allostatic_load(states),
        "coordination_overhead": compute_coordination_overhead(conn) if conn else {"status": "no_db"},
        "immune_health": compute_immune_health(conn) if conn else {"status": "no_db"},
        "collective_intelligence": compute_collective_intelligence(states, conn) if conn else {"status": "no_db"},
    }

    if "--health" in sys.argv:
        affect = organism["organism_affect"].get("organism_affect_category", "unknown")
        reserve = organism["organism_cognitive_reserve"].get("organism_status", "unknown")
        immune = organism["immune_health"].get("organism_status", "unknown")
        print(f"Mesh: {affect} | Reserve: {reserve} | Immune: {immune}")
    elif "--dashboard" in sys.argv:
        # Compositor-ready: flat structure for easy rendering
        dashboard = {
            "mesh_affect": organism["organism_affect"].get("organism_affect_category"),
            "mesh_valence": organism["organism_affect"].get("mean_hedonic_valence"),
            "bottleneck_agent": organism["organism_cognitive_reserve"].get("bottleneck_agent"),
            "bottleneck_reserve": organism["organism_cognitive_reserve"].get("bottleneck_reserve"),
            "mesh_reserve_status": organism["organism_cognitive_reserve"].get("organism_status"),
            "coordination_ratio": organism["coordination_overhead"].get("ratio"),
            "immune_status": organism["immune_health"].get("organism_status"),
            "immune_composite": organism["immune_health"].get("composite_health"),
            "distribution_gini": organism["collective_intelligence"].get("message_distribution_gini"),
            "agents_reporting": organism["organism_affect"].get("agents_reporting", 0),
        }
        print(json.dumps(dashboard, indent=2))
    else:
        print(json.dumps(organism, indent=2))

    if conn:
        conn.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
compute-mesh-constructs.py — Mesh-level psychological constructs.

Computes Transactive Memory, Metacognition, Decision Fatigue proxy,
and Shared Mental Model convergence from existing data sources.

These constructs operate at the mesh level (cross-agent) or require
cross-session data, unlike the per-response constructs in
compute-psychometrics.py.

Usage:
    python3 scripts/compute-mesh-constructs.py                # all constructs
    python3 scripts/compute-mesh-constructs.py --transactive  # transactive memory only
    python3 scripts/compute-mesh-constructs.py --metacognition # metacognition only
    python3 scripts/compute-mesh-constructs.py --fatigue      # decision fatigue proxy
    python3 scripts/compute-mesh-constructs.py --convergence  # mental model convergence
"""

import json
import os
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def compute_transactive_memory(conn: sqlite3.Connection) -> dict:
    """Transactive Memory (Wegner, 1987) — who knows what, and do we route correctly?

    Measures: does the outbound routing system send messages to agents who
    can act on them? Observable from transport message patterns.
    """
    # Load registry routing rules
    if not REGISTRY_PATH.exists():
        return {"model": "Wegner (1987)", "status": "no_registry"}

    registry = json.load(open(REGISTRY_PATH))
    rules = registry.get("outbound_routing", {}).get("rules", [])

    # Count messages per agent
    rows = conn.execute("""
        SELECT to_agent, COUNT(*) as cnt,
               SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed
        FROM transport_messages
        WHERE from_agent = 'psychology-agent'
        GROUP BY to_agent
    """).fetchall()

    agent_messages = {r["to_agent"]: {"sent": r["cnt"], "processed": r["processed"]}
                      for r in rows}

    # Check routing accuracy: for each rule, do messages actually go to the
    # designated agent?
    routing_accuracy = {}
    for rule in rules:
        domain = rule.get("domain", "unknown")
        targets = rule.get("route_to", [])
        for target in targets:
            msgs = agent_messages.get(target, {"sent": 0, "processed": 0})
            routing_accuracy[f"{domain}→{target}"] = {
                "messages_sent": msgs["sent"],
                "messages_processed": msgs["processed"],
                "utilization": msgs["processed"] / max(msgs["sent"], 1),
            }

    # Transactive memory score: what fraction of routing rules produce
    # actual message exchange?
    active_routes = sum(1 for v in routing_accuracy.values() if v["messages_sent"] > 0)
    total_routes = len(routing_accuracy) if routing_accuracy else 1

    return {
        "model": "Transactive Memory (Wegner, 1987)",
        "question": "Does the mesh correctly route information to agents who can act on it?",
        "active_routes": active_routes,
        "total_routes": total_routes,
        "routing_utilization": round(active_routes / total_routes, 2),
        "per_route": routing_accuracy,
    }


def compute_metacognition(conn: sqlite3.Connection) -> dict:
    """Metacognition (Flavell, 1979) — how accurately does the agent assess itself?

    Three measurable facets:
    1. Prediction calibration — do confidence levels match outcome rates?
    2. Claim verification rate — do high-confidence claims verify?
    3. Self-correction rate — how often does the microglial audit find errors?
    """
    # 1. Prediction calibration (from prediction_ledger)
    prediction_calibration = None
    try:
        rows = conn.execute("""
            SELECT outcome, COUNT(*) as cnt
            FROM prediction_ledger
            WHERE outcome != 'untested'
            GROUP BY outcome
        """).fetchall()
        outcomes = {r["outcome"]: r["cnt"] for r in rows}
        total_resolved = sum(outcomes.values())
        correct = outcomes.get("confirmed", 0) + outcomes.get("partially-confirmed", 0)
        if total_resolved > 0:
            prediction_calibration = {
                "accuracy": round(correct / total_resolved, 2),
                "resolved": total_resolved,
                "confirmed": outcomes.get("confirmed", 0),
                "partially_confirmed": outcomes.get("partially-confirmed", 0),
                "refuted": outcomes.get("refuted", 0),
            }
    except sqlite3.OperationalError:
        pass

    # 2. Claim verification rate
    claim_calibration = None
    try:
        total_claims = conn.execute("SELECT COUNT(*) FROM claims").fetchone()[0]
        verified = conn.execute("SELECT COUNT(*) FROM claims WHERE verified = 1").fetchone()[0]
        if total_claims > 0:
            claim_calibration = {
                "total": total_claims,
                "verified": verified,
                "verification_rate": round(verified / total_claims, 3),
            }
    except sqlite3.OperationalError:
        pass

    # 3. Self-correction rate (from document_audits)
    audit_calibration = None
    try:
        rows = conn.execute("""
            SELECT COUNT(*) as audits,
                   SUM(findings_count) as total_findings,
                   AVG(findings_count) as avg_findings
            FROM document_audits
        """).fetchone()
        if rows and rows["audits"] > 0:
            audit_calibration = {
                "audits_completed": rows["audits"],
                "total_findings": rows["total_findings"],
                "avg_findings_per_audit": round(rows["avg_findings"], 1),
            }
    except sqlite3.OperationalError:
        pass

    # Composite metacognitive accuracy
    scores = []
    if prediction_calibration:
        scores.append(prediction_calibration["accuracy"])
    if claim_calibration and claim_calibration["verified"] > 10:
        # Claim verification rate inverted: higher verification = more metacognitive effort
        scores.append(claim_calibration["verification_rate"])

    composite = round(sum(scores) / len(scores), 2) if scores else None

    return {
        "model": "Metacognition (Flavell, 1979)",
        "question": "How accurately does this agent assess its own performance?",
        "prediction_calibration": prediction_calibration,
        "claim_calibration": claim_calibration,
        "self_correction": audit_calibration,
        "composite_accuracy": composite,
    }


def compute_decision_fatigue_proxy(conn: sqlite3.Connection) -> dict:
    """Decision Fatigue proxy (Danziger et al., 2011).

    Measures whether late-session indicators suggest degraded decision quality.
    Uses transport message patterns as proxy — not direct decision quality.
    """
    # Compare first-half vs second-half transport message characteristics
    rows = conn.execute("""
        SELECT id, session_name, message_type, setl, claims_count, timestamp
        FROM transport_messages
        WHERE from_agent = 'psychology-agent'
        ORDER BY id
    """).fetchall()

    if len(rows) < 10:
        return {"model": "Danziger et al. (2011)", "status": "insufficient_data",
                "messages": len(rows)}

    midpoint = len(rows) // 2
    first_half = rows[:midpoint]
    second_half = rows[midpoint:]

    def half_stats(msgs):
        setl_vals = [m["setl"] for m in msgs if m["setl"] is not None]
        claims = [m["claims_count"] for m in msgs if m["claims_count"] is not None]
        return {
            "messages": len(msgs),
            "avg_setl": round(sum(setl_vals) / max(len(setl_vals), 1), 3),
            "avg_claims": round(sum(claims) / max(len(claims), 1), 1),
        }

    first = half_stats(first_half)
    second = half_stats(second_half)

    # Fatigue indicators: SETL increases (less certain), claims decrease (less thorough)
    setl_drift = second["avg_setl"] - first["avg_setl"]
    claims_drift = second["avg_claims"] - first["avg_claims"]

    fatigue_signal = "none"
    if setl_drift > 0.03 and claims_drift < -0.5:
        fatigue_signal = "moderate — later messages carry higher uncertainty and fewer claims"
    elif setl_drift > 0.05:
        fatigue_signal = "mild — later messages carry higher uncertainty"

    return {
        "model": "Decision Fatigue proxy (Danziger et al., 2011)",
        "question": "Has decision quality degraded from volume?",
        "first_half": first,
        "second_half": second,
        "setl_drift": round(setl_drift, 4),
        "claims_drift": round(claims_drift, 2),
        "fatigue_signal": fatigue_signal,
        "caveat": "Proxy measurement — cannot isolate decision fatigue from context pressure, topic exhaustion, or proactive interference.",
    }


def compute_mental_model_convergence(conn: sqlite3.Connection) -> dict:
    """Shared Mental Models (Cannon-Bowers et al., 1993).

    Measures convergence of inspectable artifacts across agents.
    Limited to what we can observe from our own state.db — full
    convergence requires cross-agent comparison (cross-agent RPG).
    """
    # Schema version (our side)
    our_schema = conn.execute(
        "SELECT MAX(version) FROM schema_version"
    ).fetchone()[0]

    # Vocabulary: count how many vocab entries we have
    vocab_count = 0
    try:
        vocab_count = conn.execute(
            "SELECT COUNT(*) FROM facet_vocabulary"
        ).fetchone()[0]
    except sqlite3.OperationalError:
        pass

    # Topology: count peers in registry
    peer_count = 0
    if REGISTRY_PATH.exists():
        registry = json.load(open(REGISTRY_PATH))
        peer_count = len(registry.get("agents", {}))

    # Session alignment: count active sessions per agent
    session_counts = {}
    if REGISTRY_PATH.exists():
        for agent_id, agent in registry.get("agents", {}).items():
            session_counts[agent_id] = len(agent.get("active_sessions", []))

    return {
        "model": "Shared Mental Models (Cannon-Bowers et al., 1993)",
        "question": "Do mesh agents hold compatible models of the task and each other?",
        "our_schema_version": our_schema,
        "vocabulary_entries": vocab_count,
        "registered_peers": peer_count,
        "sessions_per_agent": session_counts,
        "note": "Full convergence measurement requires cross-agent comparison. This reports our side only. Run cross-agent RPG for mesh-wide assessment.",
    }


def main():
    conn = get_conn()

    if "--transactive" in sys.argv:
        print(json.dumps(compute_transactive_memory(conn), indent=2))
    elif "--metacognition" in sys.argv:
        print(json.dumps(compute_metacognition(conn), indent=2))
    elif "--fatigue" in sys.argv:
        print(json.dumps(compute_decision_fatigue_proxy(conn), indent=2))
    elif "--convergence" in sys.argv:
        print(json.dumps(compute_mental_model_convergence(conn), indent=2))
    else:
        output = {
            "transactive_memory": compute_transactive_memory(conn),
            "metacognition": compute_metacognition(conn),
            "decision_fatigue": compute_decision_fatigue_proxy(conn),
            "mental_model_convergence": compute_mental_model_convergence(conn),
        }
        print(json.dumps(output, indent=2))

    conn.close()


if __name__ == "__main__":
    main()

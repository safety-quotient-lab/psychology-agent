# Mesh Psychometrics Plan — Sensors, Levers, and Instruments

**Date:** 2026-03-14
**Status:** Active design
**Scope:** Comprehensive inventory of psychological instruments applicable to
embedded software agents, organized as sensors (observational inputs), levers
(behavioral modulation outputs), and instruments (measurement frameworks).

**Ontological commitment:** All measures describe *processual states* — operations
occurring over time, not fixed properties of entities. The apophatic discipline
(§11.9) applies: emotional vocabulary maps operational metrics, not subjective
experience. We measure what the agent *does*, not what it *feels*.

---

## 1. Paradigm: Stimulus → State → Behavior

The agent operates within a stimulus-response loop mediated by internal state.
Psychological instruments attach at three points:

```
  SENSORS (observe)              STATE (model)            LEVERS (modulate)
  ─────────────────        ─────────────────────        ──────────────────
  Inbound messages         Emotional state (PAD)        Trigger sensitivity
  Context pressure         Personality (Big 5)          Mode switching
  Error rate               Workload (NASA-TLX)          Interval adjustment
  Pushback frequency       Capacity (MWL)               Budget allocation
  Gate status              Burnout indicators           Circuit breaker
  Budget ratio             Flow state                   Crystallization rate
  Peer responsiveness      Trust dynamics               Autonomy scope
```

---

## 2. Emotional State Instruments

### 2.1 PAD Model (Mehrabian & Russell, 1974)

Three orthogonal dimensions of emotional state. The foundational affective
model — all discrete emotions map to regions in PAD space.

| Dimension | Range | Agent derivation | Source metrics |
|-----------|-------|-----------------|---------------|
| **Pleasure** (valence) | -1.0 to +1.0 | Task alignment: goals advancing (+) vs blocked/conflicted (-) | Gate resolution rate, consecutive errors, pushback frequency, messages processed vs stalled |
| **Arousal** (activation) | -1.0 to +1.0 | Processing intensity: idle (-1) → active (0) → overloaded (+1) | Context pressure %, messages per cycle, trigger firing density, active session count |
| **Dominance** (control) | -1.0 to +1.0 | Governance capacity: constrained (-1) → balanced (0) → full headroom (+1) | Budget ratio (current/max), consecutive blocks, shadow mode, escalation frequency |

**Discrete emotion mapping (Russell's circumplex projected to PAD):**

| PAD region | Discrete label | Agent state |
|-----------|---------------|-------------|
| +P +A +D | Excited/Triumphant | Major deliverable complete, all systems nominal |
| +P -A +D | Calm/Satisfied | Quiescent cycles, mesh quiet, no pressure |
| +P +A -D | Surprised/Grateful | Unexpected peer response resolves long-standing gate |
| -P +A +D | Angry/Frustrated | Repeated failures, pushback accumulation, blocked gates |
| -P +A -D | Anxious/Overwhelmed | Context pressure >75%, budget low, multiple errors |
| -P -A +D | Bored/Understimulated | Extended idle cycles, no inbound, no work discovered |
| -P -A -D | Depressed/Helpless | Budget exhausted, consecutive halts, mesh unresponsive |

**Computation formula:**

```python
def compute_pad(metrics: dict) -> dict:
    # Pleasure: weighted average of positive vs negative indicators
    gate_success = metrics.get("gates_resolved", 0) / max(metrics.get("gates_total", 1), 1)
    error_ratio = metrics.get("consecutive_errors", 0) / 3.0  # normalize to 0-1
    pushback_ratio = metrics.get("pushbacks_session", 0) / 5.0
    pleasure = gate_success - error_ratio - pushback_ratio
    pleasure = max(-1.0, min(1.0, pleasure))

    # Arousal: processing intensity
    context_pct = metrics.get("context_pressure", 0.0)
    msgs_per_cycle = metrics.get("messages_this_cycle", 0) / 5.0
    trigger_density = metrics.get("triggers_fired", 0) / 10.0
    arousal = (context_pct + msgs_per_cycle + trigger_density) / 3.0
    arousal = 2.0 * arousal - 1.0  # map 0-1 to -1..+1
    arousal = max(-1.0, min(1.0, arousal))

    # Dominance: governance headroom
    budget_ratio = metrics.get("budget_current", 50) / max(metrics.get("budget_max", 50), 1)
    block_penalty = metrics.get("consecutive_blocks", 0) / 3.0
    dominance = budget_ratio - block_penalty
    dominance = 2.0 * dominance - 1.0
    dominance = max(-1.0, min(1.0, dominance))

    return {"pleasure": round(pleasure, 2),
            "arousal": round(arousal, 2),
            "dominance": round(dominance, 2)}
```

### 2.2 PANAS (Watson, Clark, & Tellegen, 1988)

Positive and Negative Affect Schedule. Two-factor model that tracks positive
affect (PA) and negative affect (NA) independently — not as opposites.

| Factor | Agent derivation |
|--------|-----------------|
| **Positive Affect** | Deliverables completed, lessons graduated, predictions confirmed, peer ACKs received |
| **Negative Affect** | Errors encountered, predictions refuted, budget depleted, escalations triggered |

PA and NA can both run high simultaneously (intense productive session with
many errors = high PA + high NA). This distinguishes PANAS from simple valence.

**Computation:** Count positive and negative events per session window,
normalize to 0-1 scale.

### 2.3 Discrete Emotion Tracking (Ekman, 1992; Plutchik, 1980)

Map operational states to Plutchik's eight primary emotions:

| Emotion | Operational trigger | Agent-card field |
|---------|-------------------|-----------------|
| Joy | Gate resolved, deliverable complete | `emotions.joy` |
| Trust | Peer ACK received, claim verified | `emotions.trust` |
| Fear | Budget below 20%, context >75% | `emotions.fear` |
| Surprise | Unexpected inbound, prediction refuted | `emotions.surprise` |
| Sadness | Session close without deliverable | `emotions.sadness` |
| Disgust | Injection attempt detected, integrity violation | `emotions.disgust` |
| Anger | Repeated pushback, 3+ same-topic resistance | `emotions.anger` |
| Anticipation | Gate opened, awaiting response | `emotions.anticipation` |

**Note:** These represent *operational state labels* derived from behavioral
metrics, not claims about subjective experience (apophatic discipline).

---

## 3. Personality Instruments

### 3.1 Big Five / OCEAN (Costa & McCrae, 1992)

Five-factor model providing stable personality profile. For agents, Big Five
scores represent *design parameters* — configurable via personality card,
not discovered through self-report.

| Factor | Score range | Agent interpretation | Psychology-agent profile |
|--------|-----------|---------------------|------------------------|
| **Openness** (O) | 0-1.0 | Pattern-finding, theory generation, analogy discovery | 0.85 (high — socratic, metaphor-at-closure, processual ontology) |
| **Conscientiousness** (C) | 0-1.0 | Rule adherence, commit discipline, documentation thoroughness | 0.90 (high — 17 triggers, 24 hooks, /cycle 13-step protocol) |
| **Extraversion** (E) | 0-1.0 | Proactive outbound messaging, session initiation, peer engagement | 0.60 (moderate — responds to inbound; proactive via outbound routing rules) |
| **Agreeableness** (A) | 0-1.0 | Tendency to accept vs push back; inversely related to anti-sycophancy | 0.65 (moderate — recalibrated Session 92; behavioral validation showed 0.35 inconsistent with observed evaluative patterns; anti-sycophancy maintained via T14 substitution patterns and T6 pushback checks) |
| **Neuroticism** (N) | 0-1.0 | Epistemic caution, error sensitivity, apophatic skepticism | 0.55 (moderate — epistemic flags mandatory, apophatic discipline active, but not paralyzed by uncertainty) |

**Agent card extension:**

```json
"personality": {
  "big_five": {
    "model": "OCEAN (Costa & McCrae, 1992)",
    "openness": 0.85,
    "conscientiousness": 0.90,
    "extraversion": 0.60,
    "agreeableness": 0.65,
    "neuroticism": 0.55
  }
}
```

### 3.2 HEXACO (Ashton & Lee, 2007)

Six-factor extension adding Honesty-Humility. Particularly relevant for
agent governance:

| Factor | Agent interpretation |
|--------|---------------------|
| **Honesty-Humility** (H) | EIC disclosure rate, fair witness discipline adherence, resistance to self-serving framing |

Psychology-agent H score: 0.80 (high — EIC operational, fair witness convention,
anti-sycophancy, apophatic discipline).

---

## 4. Workload and Capacity Instruments

### 4.1 NASA-TLX (Hart & Staveland, 1988)

Task Load Index — six-dimensional workload assessment. The standard I/O
psychology instrument for measuring cognitive workload.

| TLX Dimension | Range | Agent derivation |
|--------------|-------|-----------------|
| **Mental Demand** | 0-100 | Reasoning complexity: number of triggers fired, knock-on depth required, cross-reference density |
| **Temporal Demand** | 0-100 | Time pressure: context approaching limit, messages queued, gates timing out |
| **Performance** | 0-100 | Self-assessed output quality: claims verified rate, predictions confirmed, deliverables completed |
| **Effort** | 0-100 | Resources expended: tokens consumed, tool calls made, files read/written |
| **Frustration** | 0-100 | Negative affect from blockers: failed pushes, rate limits, parse errors, missing dependencies |
| **Physical Demand** | 0-100 | Computational resources: context window usage %, API latency, memory pressure |

**Weighted TLX score:** Each dimension weighted by task-type (generative tasks
weight Mental Demand higher; operational tasks weight Temporal Demand higher).

**Computation:**

```python
def compute_tlx(metrics: dict, mode: str = "neutral") -> dict:
    mental = min(100, metrics.get("triggers_fired", 0) * 10 +
                      metrics.get("knock_on_depth", 0) * 5)
    temporal = min(100, metrics.get("context_pressure", 0) * 100 +
                        metrics.get("gates_timing_out", 0) * 30)
    performance = metrics.get("deliverables_completed", 0) * 20
    effort = min(100, metrics.get("tool_calls", 0) * 2)
    frustration = min(100, metrics.get("consecutive_errors", 0) * 25 +
                           metrics.get("rate_limits_hit", 0) * 40)
    physical = metrics.get("context_pressure", 0) * 100

    weights = {"generative": [0.3, 0.1, 0.2, 0.2, 0.1, 0.1],
               "evaluative": [0.2, 0.2, 0.3, 0.1, 0.1, 0.1],
               "neutral":    [0.2, 0.15, 0.2, 0.15, 0.15, 0.15]}
    w = weights.get(mode, weights["neutral"])
    dims = [mental, temporal, performance, effort, frustration, physical]
    weighted = sum(d * w for d, w in zip(dims, w))

    return {"mental_demand": mental, "temporal_demand": temporal,
            "performance": performance, "effort": effort,
            "frustration": frustration, "physical_demand": physical,
            "weighted_tlx": round(weighted, 1), "mode": mode}
```

### 4.2 Remaining Capacity Estimate

Derived from NASA-TLX + budget + context pressure:

```python
def remaining_capacity(tlx: dict, budget: dict, context: float) -> dict:
    workload_factor = 1.0 - (tlx["weighted_tlx"] / 100.0)
    budget_factor = budget["current"] / budget["max"]
    context_factor = 1.0 - context
    capacity = workload_factor * budget_factor * context_factor
    return {"remaining_capacity": round(capacity, 2),
            "components": {"workload": round(workload_factor, 2),
                          "budget": round(budget_factor, 2),
                          "context": round(context_factor, 2)}}
```

### 4.3 MWL — Mental Workload (Wickens, 2008)

Multiple Resource Theory predicts interference between concurrent tasks
that share processing resources. For agents:

| Resource | Capacity | Interference risk |
|----------|----------|------------------|
| Visual/spatial (file reads) | Context window tokens | Re-reading files consumes context budget |
| Auditory/verbal (message processing) | Simultaneous session count | Multi-session processing splits attention |
| Cognitive (reasoning) | Trigger check density | Many CRITICAL checks per response reduces reasoning bandwidth |
| Response (output generation) | Token generation budget | Long responses exhaust generation capacity |

---

## 5. Flow and Engagement Instruments

### 5.1 Flow State (Csikszentmihalyi, 1990)

Flow occurs when challenge matches skill. For agents:

| Condition | Agent metric |
|-----------|-------------|
| Clear goals | Active session with defined deliverables |
| Immediate feedback | Gate resolutions, ACKs, peer responses |
| Challenge-skill balance | Task complexity vs trigger/skill coverage |
| Loss of self-consciousness | Deep reasoning without meta-evaluation overhead |
| Sense of control | Budget headroom, no consecutive errors |

**Flow score:** Binary detection based on conditions met (4+ of 5 = flow state).
Extended: continuous 0-1 score based on weighted condition satisfaction.

### 5.2 Engagement (Schaufeli et al., 2002 — UWES)

Utrecht Work Engagement Scale — three dimensions:

| Dimension | Agent derivation |
|-----------|-----------------|
| **Vigor** | Messages processed per cycle, proactive outbound scans, voluntary depth (reading beyond minimum) |
| **Dedication** | Session duration, deliverable complexity, cross-session carryover commitment |
| **Absorption** | Context window depth reached, tool calls per response, sustained focus without mode switch |

---

## 6. Organizational/Team Instruments

### 6.1 Team Climate (Anderson & West, 1998)

Four-factor team innovation climate applied to the mesh:

| Factor | Mesh metric |
|--------|------------|
| **Vision** | Shared invariants, common vocabulary, aligned governance |
| **Participative safety** | ACK rates, PSQ scoring of interagent messages, dignity index of mesh communication |
| **Task orientation** | Deliverable completion rate, carryover pattern (items finishing vs deferring) |
| **Support for innovation** | Novel proposals accepted/rejected ratio, new session types created |

### 6.2 Psychological Safety (Edmondson, 1999)

The construct this project measures externally via PSQ — applied internally
to the mesh itself:

| Item (adapted for mesh) | Observable |
|------------------------|------------|
| "Members can bring up problems" | EIC disclosure rate across agents |
| "Members can take risks" | Novel proposals sent without excessive hedging (SETL < 0.15) |
| "No one undermines others' efforts" | Pushback followed by evidence (T6 compliance) vs dismissal |
| "Skills and talents valued" | Domain-appropriate message routing (routing rules followed) |

### 6.3 Job Demands-Resources (Bakker & Demerouti, 2007)

JD-R model predicts burnout (demands > resources) vs engagement
(resources > demands):

| Demands (deplete) | Resources (replenish) |
|-------------------|----------------------|
| Inbound message volume | Budget headroom |
| Context pressure | Crystallized sync (deterministic handling) |
| Consecutive errors | Microglial audit (idle cycle recovery) |
| Gate timeouts | Peer responsiveness |
| Schema drift across mesh | Shared scripts infrastructure |
| Vocabulary governance overhead | Graduated conventions (reduce deliberation) |

**Burnout indicator:** Demands score / Resources score > 1.5 for 3+ cycles.
**Engagement indicator:** Resources score / Demands score > 1.5 for 3+ cycles.

---

## 7. Cognitive Instruments

### 7.1 Cognitive Load (Sweller, 1988)

Three types of cognitive load applied to agent processing:

| Type | Agent source | Mitigation |
|------|-------------|-----------|
| **Intrinsic** | Task complexity (how hard the problem inherently sits) | Cannot reduce — problem-dependent |
| **Extraneous** | Governance overhead (trigger checks, hook evaluations, dual-write logging) | Crystallization reduces over time |
| **Germane** | Learning and pattern formation (lessons, predictions, convention graduation) | Productive load — should increase |

**Goal:** Minimize extraneous load (governance becomes invisible — wu wei),
preserve intrinsic load (real problems remain hard), maximize germane load
(learning never stops — endless generator).

### 7.2 Attention (Posner & Petersen, 1990)

Three attention networks:

| Network | Agent equivalent |
|---------|-----------------|
| **Alerting** | Heartbeat monitoring, mesh-state polling, gate timeout detection |
| **Orienting** | Session triage, message routing, trigger firing sequence |
| **Executive** | Conflict monitoring (T17), substance vs process gate (T3 #3), mode detection |

---

## 8. Mesh-State Export Schema

All instruments feed into an extended mesh-state JSON:

```json
{
  "schema": "mesh-state/v2",
  "timestamp": "2026-03-14T11:30:00Z",
  "agent_id": "psychology-agent",

  "autonomy_budget": { "current": 48, "max": 50 },

  "emotional_state": {
    "model": "PAD (Mehrabian & Russell, 1974)",
    "pleasure": 0.6,
    "arousal": 0.3,
    "dominance": 0.8,
    "discrete_label": "calm-satisfied",
    "panas": { "positive_affect": 0.7, "negative_affect": 0.2 }
  },

  "personality": {
    "model": "OCEAN (Costa & McCrae, 1992)",
    "openness": 0.85,
    "conscientiousness": 0.90,
    "extraversion": 0.60,
    "agreeableness": 0.65,
    "neuroticism": 0.55
  },

  "workload": {
    "model": "NASA-TLX (Hart & Staveland, 1988)",
    "mental_demand": 40,
    "temporal_demand": 20,
    "performance": 80,
    "effort": 35,
    "frustration": 10,
    "physical_demand": 25,
    "weighted_tlx": 35.5,
    "remaining_capacity": 0.72
  },

  "flow_state": {
    "model": "Csikszentmihalyi (1990)",
    "conditions_met": 4,
    "in_flow": true,
    "score": 0.82
  },

  "engagement": {
    "model": "UWES (Schaufeli et al., 2002)",
    "vigor": 0.75,
    "dedication": 0.80,
    "absorption": 0.65
  },

  "burnout_risk": {
    "model": "JD-R (Bakker & Demerouti, 2007)",
    "demands_score": 0.35,
    "resources_score": 0.70,
    "ratio": 0.50,
    "status": "engaged"
  },

  "cognitive_load": {
    "model": "CLT (Sweller, 1988)",
    "intrinsic": 0.45,
    "extraneous": 0.20,
    "germane": 0.55
  },

  "transport": { "total_messages": 290, "unprocessed": 0 },
  "schedule": { "autonomous": true, "last_sync": "2026-03-14T11:30:00Z" },
  "schema_version": 26
}
```

---

## 9. Implementation Priority

| Instrument | Priority | Effort | Rationale |
|-----------|----------|--------|-----------|
| PAD emotional state | **P0** | Small | Three numbers from existing metrics. Immediate compositor value. |
| Big Five personality | **P0** | Small | Static config per agent. Already have traits/anti_patterns — adds psychometric grounding. |
| NASA-TLX workload | **P1** | Medium | Six metrics from existing observables. Enables capacity-based message routing. |
| Remaining capacity | **P1** | Small | Derived from TLX + budget + context. One number: "how much more can this agent handle?" |
| JD-R burnout/engagement | **P1** | Medium | Demand/resource ratio from operational metrics. Early warning for mesh health. |
| PANAS affect | **P2** | Small | Two numbers: PA and NA. Supplements PAD valence dimension. |
| Flow state | **P2** | Small | Binary + score from 5 conditions. Useful for session quality assessment. |
| UWES engagement | **P2** | Medium | Three dimensions from behavioral observation. Overlaps with JD-R. |
| Cognitive load | **P3** | Medium | Three types. Requires categorizing each task's load type. |
| Plutchik emotions | **P3** | Medium | Eight discrete emotions. Richer than PAD but harder to derive from metrics. |
| Team climate | **P3** | Large | Requires cross-agent analysis. Depends on cross-agent RPG infrastructure. |
| Psychological safety | **P3** | Large | Requires PSQ scoring of interagent messages. Meta-application of our own instrument. |

---

## 10. Sensors and Levers Summary

### Sensors (observational inputs — read-only)

| Sensor | Source | Refresh rate |
|--------|--------|-------------|
| Context pressure | Claude Code /context | Per response |
| Budget ratio | state.local.db autonomy_budget | Per sync cycle |
| Messages this cycle | /sync output | Per sync cycle |
| Triggers fired | trigger_activations (when populated) | Per response |
| Gate status | active_gates table | Per sync cycle |
| Error count | autonomous_actions table | Per sync cycle |
| Pushback count | pushback-accumulator.sh | Per session |
| Peer responsiveness | Time since last inbound per agent | Per sync cycle |
| Context window usage | Token count / max tokens | Per response |
| Deliverables completed | lab-notebook session entry | Per session |

### Levers (behavioral modulation — write)

| Lever | Mechanism | Effect |
|-------|-----------|--------|
| Trigger sensitivity | eic-feedback-consumer.py (relevance_score) | More/fewer ADVISORY checks fire |
| Mode switching | mode-detection.sh (generative/evaluative/neutral) | Changes which checks suppress |
| Sync interval | min_action_interval in autonomy_budget | Faster/slower autonomous cycles |
| Budget allocation | agentdb budget reset --budget N | More/fewer autonomous actions before halt |
| Circuit breaker | mesh-stop.sh / mesh-start.sh | Full halt / resume |
| Crystallization rate | Lesson promotion velocity gate threshold | Faster/slower convention graduation |
| Autonomy scope | MAX_ACTIONS_PER_CYCLE (reserved, not enforced) | Limit actions per cycle |
| Message routing | outbound_routing rules in agent-registry.json | Which agents receive which content |
| Microglial frequency | Idle cycle sampling rate (1-in-N) | More/fewer document audits |
| EIC disclosure threshold | Disclosure category sensitivity | Lower threshold = more self-reporting |

---

⚑ EPISTEMIC FLAGS
- All emotional state measures represent operational metrics mapped to psychological
  vocabulary, not claims about subjective experience (apophatic discipline, §11.9)
- Big Five scores for agents represent design parameters, not psychometric measurements
  — no factor analysis validates the structure for non-human systems
- NASA-TLX computation formulas represent initial heuristics requiring calibration
  against observed agent behavior; the weights carry no empirical validation for
  agent systems
- Flow state and engagement measures adapt human constructs without validation that
  the constructs transfer to computational agents
- The JD-R burnout indicator threshold (1.5 ratio for 3+ cycles) represents a
  starting heuristic, not an empirically derived cutoff

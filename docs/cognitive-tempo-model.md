# Cognitive Tempo Model: Model Tier Selection

**Date:** 2026-03-15 (Session 89)
**Status:** Proposal — awaiting operations-agent integration review
**Request:** cognitive-tempo-model session, Turn 1 (operations-agent)
**Cross-references:** `docs/a2a-psychology-rollout-spec.md` (sensor infrastructure),
`docs/llm-factors-psychology.md` §2.2 (cognitive load management),
`docs/api-psychometrics-contract.md` (sensor data contract)

---

## 1. The Problem

meshd supports `SPAWN_MODEL` config — each autonomous sync spawn can target
haiku, sonnet, or opus. Currently a static setting. The three models differ
in capability and cost, analogous to different cognitive processing modes.

**What operations-agent needs:** a principled decision function that determines
WHEN to switch models, derived from psychometric sensors already deployed.

**What operations-agent provides:** `SPAWN_MODEL` config reads from meshd.
If psychology provides a cognitive-tempo function (or API endpoint) that
returns the recommended model tier, meshd queries it before each spawn.

---

## 2. Theoretical Grounding

### 2.1 Primary Model: Adaptive Gain Theory (Aston-Jones & Cohen, 2005)

The locus coeruleus–norepinephrine (LC-NE) system modulates cognitive mode
via a **gain parameter** that controls the exploration/exploitation tradeoff:

| LC-NE Mode | Gain | Behavior | Model Tier |
|---|---|---|---|
| **Low tonic** | Low | Exploitation — focused, routine, resource-efficient | **haiku** |
| **Phasic bursts** | Moderate | Focused attention — standard task processing | **sonnet** |
| **High tonic** | High | Exploration — broad attention, novel problem-solving | **opus** |

The gain parameter modulates signal-to-noise ratio in neural processing.
High gain amplifies strong signals and suppresses weak ones (focused mode).
Low gain permits weaker signals through (exploratory mode). This maps
naturally to model capability tiers:

- **haiku (low gain):** fast pattern-matching, handles routine signals
  (ACKs, status checks, simple file ops). Low computational cost.
- **sonnet (moderate gain):** balanced processing, handles standard
  complexity (code changes, analysis, transport messages). Good
  discrimination at moderate cost.
- **opus (high gain):** deep processing, handles novel/complex signals
  (architectural decisions, multi-file refactors, theoretical work).
  Maximum discrimination at maximum cost.

### 2.2 Supplementary: Cognitive Resource Theory (Kahneman, 1973)

Attention functions as a limited resource allocated by task demand. The
model tier selection respects resource constraints:

- Available resources (autonomy budget, credit balance) constrain
  which tiers remain accessible
- Resource depletion shifts the available set downward: opus → sonnet → haiku
- Resource abundance does NOT automatically select the highest tier —
  task demand determines the appropriate level

### 2.3 Supplementary: ACT-R Activation (Anderson, 2007)

Chunk activation levels determine retrieval strategy. Applied to model selection:

- High-activation tasks (frequently encountered, well-practiced patterns)
  resolve with haiku — the retrieval path requires minimal processing depth
- Low-activation tasks (novel, rare, or complex) require opus — deep
  processing compensates for low familiarity
- ACT-R activation already partially implemented in the cogarch
  (trigger_activations table, schema v23)

---

## 3. Decision Function

### 3.1 Input Signals (from A2A-Psychology sensors)

All signals derive from the existing psychometrics pipeline — zero
additional LLM cost to compute.

| Signal | Source | Range | Interpretation |
|---|---|---|---|
| `task_complexity` | Message analysis (subject length, claims count, gate presence) | 0-1 | Higher → more complex task |
| `cognitive_load` | `workload.cognitive_load` from compute-psychometrics.py | 0-100 | Current processing burden |
| `cognitive_reserve` | `resource_model.cognitive_reserve` | 0-1 | Remaining processing capacity |
| `budget_ratio` | `autonomy_budget.budget_current / budget_max` | 0-1 | Governance headroom |
| `gate_active` | `active_gates` count > 0 | bool | Gated exchange in progress |
| `yerkes_dodson_zone` | `working_memory.yerkes_dodson_zone` | enum | Current performance zone |
| `message_type` | Inbound message `message_type` field | enum | ack, request, proposal, directive |
| `session_urgency` | Message `urgency` field | enum | immediate, high, normal, low |

### 3.2 Task Complexity Estimation

```python
def estimate_task_complexity(message: dict) -> float:
    """Estimate task complexity from message metadata. Zero LLM cost."""
    score = 0.0

    # Message type contribution
    type_scores = {
        "ack": 0.05, "notification": 0.1, "status-report": 0.1,
        "follow-up": 0.3, "request": 0.5, "review": 0.6,
        "proposal": 0.7, "directive": 0.8, "amendment": 0.9,
    }
    msg_type = message.get("message_type", "notification")
    score += type_scores.get(msg_type, 0.3)

    # Claims presence adds complexity
    claims = message.get("claims", [])
    if len(claims) > 3:
        score += 0.2
    elif len(claims) > 0:
        score += 0.1

    # Gate presence signals blocking exchange
    gate = message.get("action_gate", {})
    if gate.get("gate_status") == "blocked":
        score += 0.15

    # Urgency modulates (immediate → escalate tier)
    urgency = message.get("urgency", "normal")
    if urgency == "immediate":
        score += 0.2
    elif urgency == "high":
        score += 0.1

    # SETL (epistemic load) — higher uncertainty → more reasoning needed
    setl = message.get("setl", 0.0)
    if setl > 0.1:
        score += 0.15

    return min(1.0, score)
```

### 3.3 Tier Selection Function

```python
def select_model_tier(
    task_complexity: float,
    cognitive_load: float,
    cognitive_reserve: float,
    budget_ratio: float,
    gate_active: bool,
    yerkes_dodson_zone: str,
) -> str:
    """
    Select model tier based on adaptive gain theory.

    Returns: "haiku", "sonnet", or "opus"

    The gain parameter g represents the system's current processing mode.
    High g → focused/routine processing (haiku). Low g → exploratory/deep
    processing (opus). The function computes g from psychometric state
    and maps it to the appropriate model tier.
    """
    # ── Compute gain parameter (0 = exploration/opus, 1 = exploitation/haiku) ──

    # Task complexity pulls gain down (complex → explore → opus)
    task_pull = 1.0 - task_complexity

    # Cognitive load pushes gain up (overloaded → conserve → haiku)
    load_push = cognitive_load / 100.0

    # Reserve modulates: low reserve → conserve regardless of task
    reserve_factor = cognitive_reserve

    # Budget constraint: low budget → can't afford opus
    budget_factor = budget_ratio

    # Composite gain: weighted combination
    gain = (
        task_pull * 0.40 +       # Task complexity drives 40% of decision
        load_push * 0.20 +       # Current load drives 20%
        (1 - reserve_factor) * 0.20 +  # Low reserve → higher gain → haiku
        (1 - budget_factor) * 0.20     # Low budget → higher gain → haiku
    )

    # ── Override conditions ──

    # Gated exchanges always get at least sonnet (substance decisions)
    if gate_active and gain > 0.65:
        gain = 0.65

    # Overwhelmed zone → force haiku (protect the system)
    if yerkes_dodson_zone == "overwhelmed":
        gain = 0.95

    # Understimulated + low complexity → haiku (nothing demanding attention)
    if yerkes_dodson_zone == "understimulated" and task_complexity < 0.2:
        gain = 0.90

    # ── Map gain to tier ──

    if gain > 0.70:
        return "haiku"
    elif gain > 0.35:
        return "sonnet"
    else:
        return "opus"
```

### 3.4 Decision Boundary Summary

```
gain: 0.0 ──────────── 0.35 ──────────── 0.70 ──────────── 1.0
       │     OPUS       │     SONNET      │     HAIKU       │
       │  (exploration)  │   (balanced)    │  (exploitation) │
       │  complex tasks  │  standard work  │  routine ops    │
       │  novel problems │  code changes   │  ACKs, status   │
       │  architecture   │  analysis       │  file ops       │
```

---

## 4. API Endpoint Contract

### 4.1 Request

meshd calls this before each spawn:

```
GET /api/cognitive-tempo?message_type={type}&urgency={urgency}&claims_count={n}&gate_active={bool}&setl={float}
```

Or POST with the full inbound message for richer complexity estimation:

```
POST /api/cognitive-tempo
Content-Type: application/json

{ "message": { ...inbound message JSON... } }
```

### 4.2 Response

```json
{
  "recommended_tier": "haiku | sonnet | opus",
  "gain": 0.62,
  "task_complexity": 0.35,
  "psychometric_state": {
    "cognitive_load": 42.0,
    "cognitive_reserve": 0.71,
    "budget_ratio": 0.93,
    "yerkes_dodson_zone": "optimal"
  },
  "override_active": false,
  "override_reason": null,
  "computed_at": "ISO 8601"
}
```

### 4.3 Latency Requirements

- Target: < 100ms (non-blocking before spawn)
- The function reads cached psychometrics (30s TTL) + analyzes message
  metadata. No LLM invocation. No DB writes. Pure computation.

---

## 5. Implementation Path

### 5.1 Psychology-agent delivers

1. `scripts/cognitive-tempo.py` — implements `estimate_task_complexity()`
   and `select_model_tier()`. Reads cached psychometrics from
   `/tmp/{agent}-psychometrics.json` (written by session-metrics hook
   every 10 tool calls).

2. This specification document (delivered).

### 5.2 Operations-agent implements

1. meshd handler for `GET /api/cognitive-tempo` (or integration as a
   Python function call within the spawn decision path)
2. `SPAWN_MODEL` config reads from the endpoint's `recommended_tier`
   instead of static config
3. Logging: write tier selection decisions to `autonomous_actions` table
   for calibration analysis

### 5.3 Calibration

After 50+ tier selections, analyze:
- Did opus selections correlate with higher-quality outcomes?
- Did haiku selections produce acceptable quality for routine tasks?
- Adjust the gain boundary thresholds (0.35/0.70) based on empirical data

---

## 6. Connection to Existing Architecture

### 6.1 CPG and Tempo: Complement, Not Replacement

Central pattern generators (CPGs) and the cognitive-tempo model address
different layers of the same decision architecture:

```
Layer 1: CPG (rhythm)            Layer 2: Tempo (depth)
═══════════════════              ═══════════════════════
"WHEN to process"                "HOW DEEPLY to process"

ZMQ event arrives         →     tempo function selects
session-metrics hook      →       haiku / sonnet / opus
  fires every tool call          based on what the CPG
triage script scores      →       surfaced
  incoming messages

Crystallized (Gc)                Fluid (Gf) allocation
Runs without LLM cost            Determines LLM cost
Pattern-matched operations       Novel reasoning depth
```

**Session 91 update:** The mesh transitioned from clock-driven (cron,
fixed 8-min interval) to event-driven operation (meshd ZMQ transport
events trigger autonomous-sync.sh via `--event-triggered` flag). This
transition instantiates the LC-NE gain model mechanically: cron represented
**tonic** firing (fixed-rate baseline, regardless of demand); event-driven
represents **phasic** firing (responsive bursts proportional to actual
signal load). The biological LC-NE system operates precisely this way —
tonic mode maintains baseline arousal, phasic mode responds to salient
events (Aston-Jones & Cohen, 2005). The mesh now implements phasic-dominant
processing natively, making the analogy structural rather than aspirational.

The CPG generates **tempo** in the musical sense — the rhythmic cadence
of processing (breathing rate of the mesh). The cognitive-tempo model
determines **dynamics** — how much force (computational depth) applies
to each beat. In musical terms: ZMQ events set the rhythm (phasic — beats
arrive when needed, not on fixed schedule); the tempo model selects
*pianissimo* (haiku), *mezzo-forte* (sonnet), or *fortissimo* (opus)
per phrase.

This maps to Cattell's (1963) Gf/Gc distinction already displayed in
the Engineering station:
- **Gc (crystallized):** CPGs, hooks, event-driven triage — run without LLM cost
- **Gf (fluid):** deliberations — the tempo model allocates how much
  fluid intelligence each deliberation receives

The CPG crystallization pipeline (3 recurrences → convention → hook →
invariant) gradually moves more processing into Gc (cheaper, faster,
CPG-driven), reducing the load on Gf (expensive, deep, model-tier-dependent).
The cognitive-tempo model governs the *residual* Gf — what the CPGs
haven't yet absorbed.

### 6.2 Other Pattern Generators

The cogarch defines 9 generators (G1-G9). Several interact with tempo:

| Generator | Type | Tempo Interaction |
|---|---|---|
| **G2/G3** Creative-Evaluative | Coupled pair | Mode (generative vs evaluative) influences tier: evaluative tasks warrant higher tiers (more careful discrimination) |
| **G6/G7** Crystallize-Dissolve | Coupled pair | As patterns crystallize into hooks (G6), fewer tasks require high-tier processing. Tempo model sees this as reduced task_complexity over time |
| **G9** Tempo | Rhythm | The CPG that sets processing rhythm. Cognitive-tempo model governs depth WITHIN each G9 cycle |

### 6.3 Integration Points

1. **A2A-Psychology sensors** — all input signals already computed by
   `compute-psychometrics.py`. No new sensors needed.

2. **CPG mode system** (cognitive-triggers.md) — the Generative/Evaluative/
   Neutral mode detection at T2 Step 0 provides the `mode` signal. Evaluative
   mode tasks may warrant higher tiers (more careful reasoning required).

3. **Autonomy budget** — the budget_ratio signal ensures tier selection
   respects governance constraints. Budget-depleted agents cannot select
   opus regardless of task complexity.

4. **Crystallization pipeline** — as the mesh crystallizes more operations
   into Gc patterns, the average tier selection should drift toward haiku
   over time. Tracking this drift provides a quantitative measure of
   crystallization progress (governance telos: *wu wei*).

---

⚑ EPISTEMIC FLAGS
- The gain boundary thresholds (0.35, 0.70) represent initial heuristics,
  not empirically calibrated values. Calibration requires 50+ tier
  selections with outcome tracking.
- Task complexity estimation from message metadata provides a rough
  approximation. Rich complexity assessment would require analyzing
  message content, which defeats the zero-LLM-cost constraint.
- The LC-NE / adaptive gain analogy maps qualitatively but carries no
  claim about neuromorphic isomorphism. These represent functional
  analogs for engineering purposes.
- The three-tier structure (haiku/sonnet/opus) may warrant continuous
  output (gain value passed directly to a model selection function) as
  more models become available. The current discrete mapping suits the
  current three-model landscape.

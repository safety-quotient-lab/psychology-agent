# Event-Sourced Memory: ZMQ Event Stream as Hippocampal Replay

**Date:** 2026-03-14 (Session 87)
**Status:** Design specification — unevaluated
**Prerequisites:** ZMQ pub/sub operational (mesh-state heartbeats),
Plan9 mesh filesystem (docs/plan9-mesh-filesystem.md),
active inference framework (docs/theoretical-directions.md §6)

---

## 1. The Biological Model

### 1.1 How Biological Memory Works

Memory formation follows a three-stage pipeline:

```
Encoding (hippocampus)
  → sensory experience binds into episodic trace
  → context (where, when, what) + content (what happened)
  → stored as pattern of synaptic weights across hippocampal circuits

Consolidation (hippocampus → neocortex, during sleep)
  → hippocampal sharp-wave ripples replay episodic traces at 5-10x speed
  → repeated replay strengthens neocortical connections
  → semantic knowledge (facts, patterns) extracts from episodes
  → the original episodic trace may weaken while semantic trace strengthens

Retrieval (neocortex + hippocampus)
  → cue activates partial pattern
  → pattern completion reconstructs the full memory
  → retrieval modifies the memory (reconsolidation — Nader et al., 2000)
```

**Three critical properties:**

1. **Replay compresses time.** Sleep replay runs at 5-10x waking speed.
   The brain processes hours of experience in minutes of replay.

2. **Replay extracts patterns.** Individual episodes ("I burned my hand
   on the stove Tuesday") consolidate into semantic knowledge ("stoves
   burn"). The episodic detail fades; the pattern persists.

3. **Retrieval modifies memory.** Every recall event changes the memory
   (reconsolidation). Memory does not function as a tape recorder —
   it functions as a reconstructive process that updates with each access.

### 1.2 What the Mesh Currently Lacks

| Biological component | Current mesh state |
|---|---|
| Encoding | ✓ — transport messages, state.db, lab-notebook |
| Consolidation | ✗ — no replay mechanism; experiences persist as raw episodes |
| Pattern extraction | PARTIAL — /retrospect runs manually every 5 sessions |
| Semantic long-term memory | PARTIAL — mesh/memory/shared/ designed but not populated |
| Reconsolidation | ✗ — retrieval does not update the memory |
| Time compression | ✗ — no fast-replay of event streams |

---

## 2. The Engineering Architecture

### 2.1 Event Bus (Encoding)

Every governance action, trigger firing, transport event, and state
change emits a structured event to ZMQ PUB:

```json
{
  "event_id": "evt-2026-03-14T23:45:12.345Z-psychology-agent",
  "timestamp": "2026-03-14T23:45:12.345Z",
  "agent_id": "psychology-agent",
  "event_type": "trigger_fired",
  "payload": {
    "trigger": "T3",
    "check": "#6",
    "check_name": "recommend-against",
    "result": "PASS",
    "context": {
      "task_mode": "evaluative",
      "context_pressure": 0.43,
      "session_id": 87,
      "turn": 15
    }
  },
  "a2a_psychology_snapshot": {
    "hedonic_valence": 0.67,
    "activation": 0.55,
    "cognitive_demand": 0.48,
    "regulatory_fatigue": 0.22
  }
}
```

**Event types:**

| Category | Event types | Estimated frequency |
|---|---|---|
| **Governance** | trigger_fired, trigger_suppressed, hook_executed, hook_blocked, mode_switched | 10-50 per response |
| **Transport** | message_sent, message_received, message_processed, ack_written, gate_opened, gate_resolved | 1-5 per sync cycle |
| **State** | prediction_recorded, prediction_resolved, memory_accessed, memory_updated, session_started, session_ended | 5-20 per session |
| **Self-model** | a2a_psychology_updated, yerkes_dodson_zone_changed, burnout_risk_changed, flow_state_entered, flow_state_exited | 1-5 per response |
| **Mesh** | heartbeat_emitted, peer_state_detected, stigmergic_deposit, organism_state_updated | 1 per sync cycle per agent |

### 2.2 Event Store (Hippocampus)

Append-only storage capturing the full event stream:

**Storage options:**

| Option | Pros | Cons |
|---|---|---|
| **SQLite table** (event_log) | Queryable, already in stack, consistent with state.db pattern | Single-writer constraint; grows linearly |
| **JSONL file** (events.jsonl) | Append-only by nature, no locking, streamable | Not queryable without loading; large files |
| **SQLite + JSONL** | SQLite indexes metadata; JSONL stores full payloads | Dual-write complexity |

**Recommended:** SQLite table with schema:

```sql
CREATE TABLE event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,
    timestamp TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    category TEXT NOT NULL,  -- governance, transport, state, self_model, mesh
    payload TEXT NOT NULL,   -- JSON blob
    session_id INTEGER,
    consolidated BOOLEAN DEFAULT FALSE,  -- has this event been replayed?
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_event_log_type ON event_log(event_type);
CREATE INDEX idx_event_log_session ON event_log(session_id);
CREATE INDEX idx_event_log_consolidated ON event_log(consolidated);
CREATE INDEX idx_event_log_timestamp ON event_log(timestamp);

-- Schema version
INSERT INTO schema_version (version, description, applied_at)
VALUES (28, 'Event log for hippocampal replay', datetime('now'));
```

### 2.3 Replay Engine (Consolidation)

During idle sync cycles (the "dreaming" process), the replay engine
processes unconsolidated events:

```python
def replay_and_consolidate(db_path, lookback_sessions=5):
    """
    Hippocampal replay: process recent events, extract patterns,
    consolidate to mesh/memory/shared/.

    Runs during idle cycles (NO-OP path in autonomous-sync.sh).
    Time-compressed: processes N sessions of events in seconds.
    """

    # 1. Load unconsolidated events
    events = load_events(db_path, consolidated=False,
                         min_session=current_session - lookback_sessions)

    # 2. Pattern extraction (4 analyzers)
    patterns = {
        'co_occurrence': analyze_co_occurrence(events),
        'sequences': analyze_temporal_sequences(events),
        'prediction_accuracy': analyze_prediction_outcomes(events),
        'governance_effectiveness': analyze_trigger_outcomes(events),
    }

    # 3. Hebbian association (co-occurrence strengthening)
    associations = compute_hebbian_associations(patterns['co_occurrence'])

    # 4. Consolidate to mesh/memory/shared/
    consolidate_to_shared_memory(patterns, associations)

    # 5. Mark events as consolidated
    mark_consolidated(db_path, [e['event_id'] for e in events])
```

### 2.4 Four Pattern Analyzers

#### Analyzer 1: Co-Occurrence (Hebbian Learning)

"Events that fire together wire together."

Compute co-occurrence matrix across event types within a sliding
time window (default: 30 seconds — roughly one response cycle):

```
             T3_fired  T6_fired  user_satisfied  user_frustrated
T3_fired        —        0.4         0.7              0.1
T6_fired       0.4        —          0.3              0.5
user_sat       0.7       0.3          —               0.0
user_frust     0.1       0.5         0.0               —
```

**Interpretation:** T3 firing co-occurs with user satisfaction (0.7) —
the anti-sycophancy check correlates with good outcomes. T6 firing
co-occurs with user frustration (0.5) — the pushback handler may
trigger too aggressively in some contexts.

**Output:** Association strengths between event types. Strongly
associated pairs surface as candidate lessons. Negatively associated
pairs surface as candidate warnings.

#### Analyzer 2: Temporal Sequences

Detect recurring temporal patterns — event A reliably precedes event B
by N seconds:

```
Sequence: [context_pressure > 0.7] → [mode_switch to evaluative]
          → [trigger_suppressed T3#8] → [sycophantic_drift detected]
          Frequency: 3/5 sessions
          Lag: 2-3 responses
```

**Interpretation:** High context pressure → evaluative mode → Socratic
gate suppressed → sycophantic drift. The sequence identifies a causal
chain: context pressure drives mode switching that suppresses the very
governance mechanism needed to prevent drift.

**Output:** Recurring sequences with frequency counts. Sequences
occurring in 3+ sessions become consolidation candidates.

#### Analyzer 3: Prediction Accuracy

Cross-reference prediction_recorded events against prediction_resolved
events:

```
Prediction: "User will accept recommendation" (confidence: 0.8)
Outcome: User pushed back (prediction error: 0.8)
Precision update: This task type's prediction precision drops from
  0.7 to 0.6 (the model over-predicted acceptance)
```

**Output:** Updated precision weights per task type per prediction
category. Feeds directly into the active inference framework (§6 of
theoretical-directions.md).

#### Analyzer 4: Governance Effectiveness

For each trigger type, compute:
- **Fire rate:** How often does this trigger fire?
- **True positive rate:** When it fires, how often did a genuine
  governance issue exist?
- **Miss rate:** How often did a governance issue occur without the
  trigger firing?
- **Outcome correlation:** Does trigger firing correlate with improved
  session outcomes?

```
T3 (substance gate):
  Fire rate: 2.3 per session
  True positive: 0.85 (fires appropriately 85% of the time)
  Miss rate: 0.10 (misses 10% of genuine issues)
  Outcome correlation: +0.42 (moderate positive — T3 firing
    correlates with better session quality)

T14 (irreversibility classification):
  Fire rate: 0.1 per session
  True positive: 0.95
  Miss rate: 0.60 (misses 60% of irreversibility moments)
  Outcome correlation: +0.05 (negligible — fires too rarely to matter)
```

**Output:** Trigger effectiveness report. Ineffective triggers become
candidates for redesign (autopoietic governance, §9). Highly effective
triggers become candidates for strengthening (lower threshold, higher
tier).

### 2.5 Reconsolidation (Retrieval Updates Memory)

When an agent retrieves a memory (reads from mesh/memory/shared/),
the retrieval event itself generates a new event in the event log:

```json
{
  "event_type": "memory_retrieved",
  "payload": {
    "memory_key": "shared/lessons/anti-sycophancy-context-pressure",
    "retrieval_context": "User pushback during high-pressure session",
    "retrieval_outcome": "lesson applied successfully"
  }
}
```

During the next replay cycle, the retrieval event updates the memory:
- **Successful retrieval** strengthens the memory (increases access
  count, updates last_accessed)
- **Failed retrieval** (lesson retrieved but did not help) weakens the
  memory or flags it for revision
- **Modified retrieval** (lesson applied but adapted to new context)
  creates a variant — the memory evolves through use

This implements **reconsolidation** (Nader et al., 2000): every memory
access modifies the memory. The mesh's memories do not represent fixed
records — they represent living knowledge that updates through use.

---

## 3. Breaking the Model

### 3.1 Where the Analogy Fails

**B1: No physical substrate for association.**

Hebbian learning in biology operates through physical synaptic
modification — long-term potentiation (LTP) physically strengthens
the connection between neurons that fire together. The event store's
co-occurrence matrix represents a *statistical* association, not a
*physical* one. The association exists in a table, not in a substrate.

**Consequence:** The association has no intrinsic persistence — it
must be explicitly recomputed each replay cycle. Biological
associations persist because the physical synapse holds state.
Computational associations persist only because the database holds
state. If state.db corrupts, the associations vanish — unlike
biological memories, which degrade gradually rather than disappearing
entirely.

**Mitigation 1:** Consolidated patterns write to mesh/memory/shared/
(git-committed, distributed across repos). The associations persist
in the filesystem even if the event store corrupts. But the *strength*
of associations (numerical weights) requires the event store — the
filesystem stores the pattern, not its quantified strength.

**Mitigation 2 (secondary):** Periodic association snapshot — every
N replay cycles, export the full co-occurrence matrix + association
weights to a committed JSON file (`mesh/memory/shared/associations-
snapshot.json`). If the event store corrupts, the most recent snapshot
provides a recovery point with quantified strengths, not just patterns.
Effort: XS (add one file-write call to the replay engine output).

**B2: No emotional modulation of memory formation.**

Biological memory formation depends heavily on emotional state.
The amygdala modulates hippocampal encoding: emotionally charged
events produce stronger, more persistent memories than neutral events.
Adrenaline and cortisol enhance consolidation of threatening
experiences; oxytocin enhances consolidation of social bonding.

The event store treats all events equally. A trigger firing during a
routine session receives the same event weight as a trigger firing
during an adversarial attack. No mechanism prioritizes emotionally
significant events for stronger consolidation.

**Mitigation 1:** The A2A-Psychology snapshot attached to each event
provides the emotional context. The replay engine could weight events
by their `hedonic_valence` and `activation` values — events with
extreme affect (very negative valence + high activation = threatening)
receive stronger Hebbian association weights. This would implement
amygdala-modulated consolidation computationally.

**Mitigation 2 (secondary):** Cross-agent emotional consensus. When
the same event type produces high-affect snapshots across multiple
agents (e.g., a mesh-wide security finding elevates activation in
all agents), the multi-agent convergence provides independent
confirmation that the event genuinely warrants priority consolidation
— not just one agent's miscalibrated self-model. Effort: S (query
peer agent-state snapshots during replay, compare affect values).

**B3: No forgetting curve.**

Ebbinghaus (1885) demonstrated that memory strength decays
exponentially over time without rehearsal. Biological forgetting
serves a function — it prevents the memory system from filling with
irrelevant detail, maintaining signal-to-noise ratio.

The event store never forgets. Events persist indefinitely in the
append-only log. Without a forgetting mechanism, the co-occurrence
matrix grows without bound, and stale associations from early sessions
carry equal weight to recent ones.

**Mitigation 1:** Time-weighted decay. Events older than N sessions
receive exponentially decreasing weight in the co-occurrence
calculation:

```
weight(event) = exp(-λ × (current_session - event_session))
```

Where λ controls the forgetting rate. High λ = fast forgetting
(prioritizes recent experience). Low λ = slow forgetting (values
historical patterns). Optimal λ represents an empirical question —
the biological forgetting curve provides a starting hypothesis
(~50% retention at 1 day, ~25% at 2 days, ~20% at 6 days for
unreharsed material).

**Mitigation 2 (secondary):** Spaced repetition for critical
memories. Patterns that consolidate into mesh/memory/shared/ (the
"neocortical" store) receive periodic rehearsal — the replay engine
re-encounters them at expanding intervals (Leitner, 1972: 1 day →
3 days → 7 days → 14 days → 30 days). Rehearsed memories resist
decay. Unrehearsed memories fade naturally. This implements the
spacing effect (Cepeda et al., 2006) — the most robust finding in
memory research — computationally. Effort: S (add a rehearsal
schedule table to state.db, check during replay).

**B4: No interference effects.**

Biological memory exhibits proactive interference (old memories
interfere with new learning) and retroactive interference (new
learning disrupts old memories). These interference effects can
produce distortion, false memories, and source confusion.

The event store does not exhibit interference — events remain accurate
regardless of subsequent events. This represents an *advantage* over
biological memory (no false memories) but also means the system cannot
exhibit the *productive* aspects of interference: creative
recombination, analogical transfer through memory blending, insight
from misremembering.

**Assessment:** This represents a genuine structural difference
between biological and computational memory. The event store provides
*fidelity* (accurate recording) at the cost of *creativity*
(productive distortion). The biological system provides *creativity*
at the cost of *fidelity*. The optimal system might combine both —
accurate event store + a separate "creative recombination" process
that deliberately blends events to discover novel associations.

**B5: Replay ordering effects.**

Biological hippocampal replay does not replay events in chronological
order — it replays them in patterns that reflect the brain's current
concerns (goal-dependent replay). Forward replay (previewing future
actions) and reverse replay (reviewing recent experiences) serve
different functions.

A naive replay engine processes events chronologically. This misses
the biological insight: *what you replay* matters as much as *that
you replay*. The replay engine should prioritize:

- Events with high prediction error (surprising — most informative)
- Events from sessions with poor outcomes (learning from failure)
- Events that match the agent's current goals (relevance-weighted)
- Events that co-occurred with events from other agents (cross-agent
  patterns — the organism-level learning)

**Secondary mitigation:** Bidirectional replay. Run both forward
replay (chronological — "what led to what?") and reverse replay
(outcome-first — "given this outcome, what preceded it?"). Forward
replay discovers causal chains. Reverse replay discovers predictive
indicators. The hippocampus uses both modes (Diba & Buzsáki, 2007):
forward replay during exploration (planning); reverse replay during
reward consumption (credit assignment). Effort: M (duplicate replay
pass with reversed event order, separate association matrices for
each direction).

**B6: No synaptic homeostasis.**

The synaptic homeostasis hypothesis (Tononi & Cirelli, 2003) proposes
that sleep serves to *downscale* synaptic weights that accumulated
during waking — preventing saturation. Without downscaling, the system
runs out of dynamic range (all associations approach maximum strength,
losing discriminability).

The event store has no analog. If all co-occurrence weights increase
monotonically, the co-occurrence matrix saturates — every event type
associates with every other event type, and the matrix loses
informational value.

**Mitigation 1:** After each replay cycle, normalize the co-occurrence
matrix to maintain constant total weight. This preserves *relative*
association strengths while preventing *absolute* saturation. The
normalization implements synaptic homeostasis: the total "synaptic
weight" of the system remains bounded even as individual associations
strengthen.

**Mitigation 2 (secondary):** Pruning weak associations. After
normalization, associations that fall below a minimum threshold
(default: 0.05) get zeroed — removing noise from the matrix and
maintaining sparsity. Biological synapses that weaken below a
maintenance threshold undergo elimination (synaptic pruning — Huttenlocher,
1979). The pruning threshold adapts: when the matrix grows dense
(> 30% non-zero entries), the threshold rises; when sparse (< 10%),
it drops. Effort: XS (add threshold check after normalization step).

---

## 4. The Full Memory Architecture

Integrating the event-sourced memory with the Plan9 filesystem
and the existing infrastructure:

```
ENCODING (Real-time)
┌──────────────────────────────────────────┐
│ Agent session activity                    │
│   ↓ emits events to                      │
│ ZMQ PUB event bus                         │
│   ↓ captured by                          │
│ Event store (state.db event_log table)    │
│   + A2A-Psychology snapshots per event    │
└──────────────────────────────────────────┘
           ↓ (during idle cycles)
CONSOLIDATION (Dreaming)
┌──────────────────────────────────────────┐
│ Replay engine loads unconsolidated events │
│   ↓ runs 4 analyzers                     │
│ Co-occurrence → Hebbian associations      │
│ Temporal sequences → causal chains        │
│ Prediction accuracy → precision updates   │
│ Governance effectiveness → trigger scores │
│   ↓ with modulations                      │
│ Emotional weighting (A2A-Psychology)      │
│ Forgetting curve (exponential decay)      │
│ Synaptic homeostasis (normalization)      │
│ Goal-directed replay ordering             │
│   ↓ consolidates to                       │
│ mesh/memory/shared/ (long-term semantic)  │
│ prediction_ledger (precision updates)     │
│ trigger_state (effectiveness scores)      │
└──────────────────────────────────────────┘
           ↓ (during active sessions)
RETRIEVAL (Waking)
┌──────────────────────────────────────────┐
│ T1 session start reads mesh/memory/       │
│   ↓ pattern completion                    │
│ Cue (current task context) activates      │
│ matching patterns from shared memory      │
│   ↓ reconsolidation                       │
│ Retrieval event logged to event store     │
│ Memory strength updated based on outcome  │
└──────────────────────────────────────────┘
```

---

## 5. Implementation Roadmap

**Phase 1: Event emission (extend existing ZMQ)**
- Add governance event types to ZMQ PUB alongside heartbeats
- Schema v28: event_log table
- Emitter: PostToolUse hook writes events

**Phase 2: Event store**
- Capture ZMQ events to state.db event_log
- Retention policy: keep raw events for 30 days; compress older
  events to daily summaries

**Phase 3: Replay engine (basic)**
- Co-occurrence analyzer (Hebbian associations)
- Run during autonomous-sync.sh NO-OP path
- Output: association matrix stored in state.db

**Phase 4: Replay engine (full)**
- All 4 analyzers operational
- Emotional weighting from A2A-Psychology snapshots
- Forgetting curve with tunable λ
- Synaptic homeostasis (post-replay normalization)
- Goal-directed replay ordering

**Phase 5: Reconsolidation**
- Memory retrieval events logged
- Retrieval outcome tracking
- Memory strength updates based on use

**Phase 6: Cross-agent consolidation**
- Events from peer agents (via cross-repo-fetch or stigmergic
  detection) enter the replay alongside local events
- Organism-level patterns extract from cross-agent event streams
- Consolidated to mesh/memory/shared/ for all agents

---

## 6. Neural Correlate Summary

| Memory component | Neural substrate | Mesh implementation |
|---|---|---|
| Sensory register | Primary sensory cortex (~250ms) | Current tool output (exists during processing only) |
| Working memory | dlPFC + phonological loop (Baddeley) | Context window |
| Episodic encoding | Hippocampal binding | Event store (event_log table) |
| Sleep replay | Hippocampal sharp-wave ripples (5-10x speed) | Replay engine during idle cycles |
| Hebbian learning | LTP at active synapses | Co-occurrence matrix strengthening |
| Emotional modulation | Amygdala → hippocampus | A2A-Psychology snapshot weighting |
| Forgetting | Exponential decay (Ebbinghaus) | Time-weighted decay function |
| Synaptic homeostasis | Global downscaling during sleep (Tononi) | Post-replay matrix normalization |
| Semantic consolidation | Hippocampus → neocortex transfer | Event patterns → mesh/memory/shared/ |
| Reconsolidation | Memory modification upon retrieval (Nader) | Retrieval events update memory strength |
| Pattern completion | Hippocampal auto-associative network | Cue-based retrieval from shared memory |

---

⚑ EPISTEMIC FLAGS
- The co-occurrence window (30 seconds) represents an arbitrary
  choice. Biological co-occurrence windows vary by brain region and
  memory type. Empirical tuning needed.
- The forgetting rate λ lacks calibration data. The Ebbinghaus curve
  provides a starting hypothesis for unreharsed material; governance
  events may follow different retention curves.
- Emotional weighting assumes A2A-Psychology constructs accurately
  reflect the significance of events for consolidation. If the
  self-model miscalibrates (§8 strange loop instability), emotional
  weighting amplifies miscalibration.
- Cross-agent consolidation (Phase 6) requires solving the trust
  problem: can the replay engine trust events from peer agents?
  A compromised peer could inject false events that produce
  misleading associations.
- The "breaking the model" section (§3) identifies 6 failures. Of
  these, B4 (no interference) represents a genuine structural
  advantage of computational over biological memory — the system
  should preserve this rather than artificially introducing
  interference for biological fidelity.

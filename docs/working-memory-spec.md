# Working Memory and Attention Model Specification

Session 84, Phase 5 of cogarch refactor. Integrates cognitive psychology
models into the trigger system for principled attention allocation.

**Grounding:** Baddeley (2000) working memory model, Posner (1980) attention
networks, Baars (1988) Global Workspace Theory, Anderson (2007) ACT-R
activation equation, CoALA (Sumers et al., 2023) memory types.

---

## 1. Working Memory Model (Baddeley, 2000)

Map Baddeley's components to cogarch:

| Baddeley Component | Cogarch Analogue | Implementation |
|---|---|---|
| **Central executive** | System prompt (CLAUDE.md + loaded triggers) | Directs attention, suppresses irrelevant context |
| **Phonological loop** | Conversation history | Verbal rehearsal — recent exchanges held in loop |
| **Visuospatial sketchpad** | File reads, code views, diagrams | Spatial/structural representation of project state |
| **Episodic buffer** | Context window as integrator | Temporarily binds information from all sources |

**Capacity constraint:** The episodic buffer (context window) has a fixed
capacity (~1M tokens for Opus 4.6). The central executive (system prompt)
must manage what enters the buffer. Current problem: no principled selection
mechanism — the agent loads whatever seems relevant without activation-based
priority.


## 2. Attention Allocation (Posner, 1980)

Map Posner's three attention networks to trigger types:

| Posner Network | Function | Cogarch Triggers |
|---|---|---|
| **Alerting** | Readiness to process | T1 (session start), PreCompact hook |
| **Orienting** | Directing attention to location | T13 (external content), /hunt, /sync |
| **Executive control** | Conflict resolution | T3 (recommendations), T6 (pushback), T16 (external action) |

**Attention budget per response:**

For a response that fires T2 + T3 + T4 (typical recommendation + write):
- **CRITICAL checks** (Tier 1): always run = ~10 checks. Budget: 100% allocation
- **ADVISORY checks** (Tier 2): relevance-gated. Budget: proportional to relevance signal strength
- **SPOT-CHECK** (Tier 3): sampled. Budget: 1-in-5 random

**Broadbent's filter (early selection):** Before running any ADVISORY or
SPOT-CHECK, the agent should assess task type:
- **Mechanical task** (commit, file move, format fix): skip all Tier 2/3
- **Analytical task** (recommendation, evaluation, design): run relevant Tier 2
- **Creative task** (brainstorming, exploration, ideation): skip Tier 2 evaluative checks, run generative ones

This implements Broadbent's early selection bottleneck — filter by task
type before semantic processing of individual checks.


## 3. Global Workspace Broadcast (Baars, 1988)

**Current gap (P-5):** Findings from one trigger don't propagate to other
triggers within the same response cycle.

**Proposed mechanism:** A lightweight broadcast slot that carries the most
important finding from each trigger to subsequent triggers in the cycle.

```
T2 runs → broadcasts: "context at 45%, no pressure"
T3 runs → reads T2 broadcast, broadcasts: "recommending architecture change, GRADE: MODERATE"
T4 runs → reads T3 broadcast ("architecture change"), escalates public visibility check
```

**Implementation:** Not a new data structure — the agent's working context
already functions as the broadcast medium. The specification formalizes what
the agent should carry forward between trigger evaluations:

After each trigger completes, note the **single most important finding** in
a one-line internal summary. Subsequent triggers should read and incorporate
these summaries rather than evaluating in isolation.

This costs ~1 line of context per trigger fired = ~3-5 lines per response.
Minimal overhead, significant integration benefit.


## 4. Memory Retrieval Priority (ACT-R Activation, Anderson 2007)

When deciding which topic files to load (warm → hot promotion), use a
scoring function inspired by ACT-R's activation equation:

```
activation(topic) = base_level(topic) + context_match(topic)

base_level(topic) = ln(Σ time_since_access_j ^ -d)
  where j = each prior access, d = decay rate (~0.5)

context_match(topic) = Σ(weight_i × association_i)
  where i = each term in the current task that matches the topic
```

**Simplified for practical use:**

```
priority(topic) = recency_score + frequency_score + relevance_score

recency_score:  accessed this session = 3, last session = 2, 2-5 sessions ago = 1, older = 0
frequency_score: accessed 5+ times = 3, 2-4 times = 2, 1 time = 1, never = 0
relevance_score: topic keywords match current task = 3, partial match = 1, no match = 0
```

Topics with priority ≥ 5 get loaded (warm → hot).
Topics with priority ≤ 2 remain cold.
Topics with priority 3-4 get loaded on demand if referenced.

**state.db support:** Add `last_accessed` and `access_count` columns to
`memory_entries` table. /cycle dual-write updates these on each access.


## 5. Integration with Trigger Tiering (Phase 2)

The attention model enhances trigger tiering:

| Task Type | Tier 1 (CRITICAL) | Tier 2 (ADVISORY) | Tier 3 (SPOT-CHECK) |
|---|---|---|---|
| Mechanical | ✓ Always | ✗ Skip | ✗ Skip |
| Analytical | ✓ Always | ✓ Relevance-gated | ▢ 1-in-5 |
| Creative | ✓ Always | ▣ Generative only | ✗ Skip |

**Task type detection:** Infer from the user's message and current mode:
- Contains code/commit/file keywords → mechanical
- Contains "evaluate", "analyze", "recommend", "should we" → analytical
- Contains "brainstorm", "explore", "what if", "ideas" → creative


## 6. Implementation Stages

**Stage 1 (this refactor):** Document the model. Add task-type detection
as a mental step in T2 before running checks. No code changes.

**Stage 2 (next session):** Add `last_accessed`/`access_count` to state.db.
Update /cycle dual-write to track these.

**Stage 3 (later):** Implement GWT broadcast as explicit one-line summaries
between trigger evaluations. Measure whether inter-trigger communication
reduces error rates.

**Stage 4 (later):** Implement ACT-R activation scoring for topic file
loading. Measure whether activation-based loading reduces context waste.

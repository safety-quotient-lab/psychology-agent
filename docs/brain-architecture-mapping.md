# Brain Architecture → Cogarch Mapping

Session 84. Comprehensive mapping of major brain systems to cognitive
architecture components. Extends the CPG framework (17 principles) and
neuroglial layer (6 cell types) into a complete neuroscience reference
model for agent design.

**Design principle:** The brain and human psychology remain our only reference
point for intelligence as we know it. This mapping does not claim the cogarch
*replicates* neural function — it identifies which *design problems* each brain
system solves and maps those to equivalent problems in agent architecture.

**Epistemic status:** Analogical reasoning throughout. Transfer risk flagged
per mapping. Stronger mappings grounded in established computational
neuroscience; weaker ones grounded in functional analogy only.

---

## Already Mapped (Session 84)

| Brain System | Cogarch Analogue | Reference |
|---|---|---|
| Central Pattern Generators | Triggers, modes, crystallization | ideas.md §CPG (17 principles) |
| Glial cells (6 types) | Infrastructure support layer | ideas.md §Neuroglial (PR #168) |
| Working memory (Baddeley) | Context window management | docs/working-memory-spec.md |
| Attention networks (Posner) | Trigger tiering, task detection | docs/trigger-tiering-classification.md |
| Global Workspace (Baars) | Inter-trigger broadcast | docs/cognitive-triggers.md §GWT |
| Dual process (Kahneman) | LLM=System 1, triggers=System 2 | docs/cogarch-refactor-evaluation.md |
| Predictive processing (Friston) | Efference copy (CPG #9) | ideas.md §CPG principle 9 |
| Skill acquisition (Fitts) | Crystallization pipeline (5 stages) | ideas.md §CPG pipeline |
| Memory consolidation | Episodic→semantic→procedural chain | docs/memory-ownership-contract.md |
| Synaptic pruning (Huttenlocher) | Adaptive forgetting (CPG #17) | ideas.md §CPG principle 17 |

---

## New Mappings

### 1. Hippocampus → Memory Formation and Consolidation Engine

**Biological function:** The hippocampus forms new episodic memories, binds
multi-sensory experiences into coherent episodes, and during sleep replays
experiences to consolidate them into long-term cortical storage. It also
supports spatial navigation (place cells, grid cells — O'Keefe & Moser).

**Design problem it solves:** How does a system convert transient experience
into durable, retrievable knowledge? How does it decide what to consolidate
and what to discard?

**Cogarch analogue:** The /cycle skill + lab-notebook + journal chain.

| Hippocampal Function | Cogarch Component |
|---|---|
| Episode formation | Lab-notebook session entries (binding events into episodes) |
| Consolidation (replay during sleep) | /cycle propagation (replays session to docs) |
| Memory indexing | state.db dual-write (creates queryable index) |
| Spatial navigation (place cells) | Transport session topology (where did this happen in the mesh?) |
| Pattern separation | Separate topic files (decisions.md vs cogarch.md vs psq-status.md) |
| Pattern completion | T1 session start (reconstructs full context from partial cues) |

**Gap:** No "sleep consolidation" equivalent — a background process that
reviews recent experiences and strengthens important memories without active
session participation. The CPG endogenous rhythmicity (principle 3) could
provide this if implemented as a cron-driven consolidation pass.

**Transfer quality:** MODERATE — the /cycle chain functionally replicates
consolidation, but it runs synchronously during the session rather than
asynchronously between sessions.


### 2. Prefrontal Cortex → Executive Control System

**Biological function:** The PFC manages executive functions: planning,
decision-making, inhibitory control, working memory manipulation, temporal
ordering, and social cognition. It develops last (myelination continues into
the mid-20s) and degrades first under stress, fatigue, and cognitive load.

**Design problem it solves:** How does a system plan multi-step actions,
inhibit inappropriate responses, maintain goals across interruptions, and
adjust behavior based on social context?

**Cogarch analogue:** Distributed across triggers + skills.

| PFC Function | Cogarch Component |
|---|---|
| Planning | /hunt (work discovery) + /knock (consequence tracing) |
| Decision-making | /adjudicate (structured resolution) + T3 (recommendation discipline) |
| Inhibitory control | T3 #5 anti-sycophancy, T6 #4 anti-sycophancy, trust budget |
| Working memory manipulation | T2 Step 0 mode detection, context pressure management |
| Temporal ordering | T4 #7 lab-notebook chronological ordering |
| Social cognition | T4 #9 interpretant communities (6 audiences) |
| Goal maintenance | MEMORY.md Active Thread (persists goals across sessions) |

**Gap:** No unified executive controller. PFC functions scatter across
multiple triggers and skills with no central coordinator. The mode system
(CPG principle 4) partially addresses this — the mode functions as a PFC-like
state variable that influences all downstream processing.

**Refinement opportunity:** Consolidate executive functions into a coherent
"executive layer" rather than distributing them. A single executive trigger
that runs first and sets the context for all subsequent triggers — essentially
T2 Step 0 (mode detection) expanded into a full executive assessment.

**Transfer quality:** HIGH — the PFC's functional decomposition maps cleanly
to existing cogarch components. The gap (no central coordinator) represents a
genuine architectural insight.


### 3. Amygdala → Threat Detection and Emotional Valence

**Biological function:** The amygdala processes emotional significance,
particularly threat detection. It operates as a fast, pre-conscious evaluator
that can trigger defensive responses before the cortex completes analysis
(LeDoux, 1996). It also assigns emotional valence (positive/negative) to
experiences, which influences memory consolidation (emotionally charged
memories consolidate more strongly).

**Design problem it solves:** How does a system detect threats quickly (before
full analysis), prioritize safety over accuracy under time pressure, and
weight important experiences more heavily in memory?

**Cogarch analogue:** Security and safety mechanisms.

| Amygdala Function | Cogarch Component |
|---|---|
| Fast threat detection | T13 #2 injection scan (fires before full content analysis) |
| Fear conditioning | Anti-patterns file (.claude/rules/anti-patterns.md) — learned threat responses |
| Emotional valence | Urgency field in transport messages, SETL values |
| Safety override (fight/flight) | Trust budget halt (exhausted budget → stop all autonomous action) |
| Threat-enhanced memory | Lessons.md severity field (HIGH severity = stronger consolidation) |

**Gap:** No pre-conscious fast path. All cogarch processing runs through the
same deliberate pipeline. The amygdala's key feature — bypassing cortical
analysis for speed — has no equivalent. T13 #2 (injection scan) comes closest
but still runs as a sequential check, not a parallel fast path.

**Refinement opportunity:** Implement a "fast path" for critical safety checks
that runs BEFORE the full trigger pipeline. A lightweight pre-screen (hook-level,
not trigger-level) that can abort processing before the agent commits context
tokens to the response. The context-pressure-gate.sh hook partially does this —
extend the pattern to security threats.

**Transfer quality:** MODERATE — functional mapping holds but the architectural
mechanism (pre-conscious parallel processing) doesn't transfer to a sequential
conversation model.


### 4. Cerebellum → Timing, Error Correction, and Forward Models

**Biological function:** The cerebellum handles motor timing, error correction
via climbing fiber signals, and forward models that predict sensory consequences
of actions. It receives a copy of motor commands (efference copy) and compares
predicted against actual outcomes. Errors drive learning.

**Design problem it solves:** How does a system time its actions precisely,
detect when outcomes differ from predictions, and use prediction errors to
improve future performance?

**Cogarch analogue:** Efference copy + metacognitive layer.

| Cerebellar Function | Cogarch Component |
|---|---|
| Forward models | Efference copy (CPG #9) — predict response to outbound actions |
| Error detection (climbing fiber) | trigger_activations result='fail' — error signal |
| Timing | /cycle cadence, session pacing (T2 #3) |
| Motor learning | Lessons.md — errors drive pattern capture |
| Coordination | /iterate skill — coordinates multi-skill sequences |

**Gap:** No real-time timing mechanism. The cerebellum operates at millisecond
precision; the cogarch operates at response-level granularity. Fine-grained
timing within a response (when to switch modes, when to stop elaborating) has
no cerebellar equivalent.

**Transfer quality:** MODERATE — efference copy maps well. Timing mechanism
maps poorly (different timescales).


### 5. Basal Ganglia → Action Selection and Habit Formation

**Biological function:** The basal ganglia select actions from competing
candidates, manage the transition from goal-directed to habitual behavior
(via direct and indirect pathways), and process reward signals (dopamine from
substantia nigra/VTA). The direct pathway facilitates selected actions; the
indirect pathway inhibits competing actions.

**Design problem it solves:** How does a system choose between competing
possible actions, transition from deliberate to automatic processing, and
learn which actions produce good outcomes?

**Cogarch analogue:** Action selection + crystallization.

| Basal Ganglia Function | Cogarch Component |
|---|---|
| Action selection (direct path) | /adjudicate consensus-or-pragmatism |
| Action inhibition (indirect path) | T3 #6 recommend-against scan |
| Habit formation | Crystallization pipeline (Stage 1→4) |
| Reward processing | Work carryover resolve (completed = reward signal) |
| Go/NoGo decision | Trust budget + T16 reversibility classification |

**Gap:** No dopamine-equivalent reward signal. The system has no mechanism
that strengthens successful behaviors and weakens unsuccessful ones across
sessions. The work_carryover table tracks completion but doesn't feed back
into behavior selection. Trigger activation tracking (result='pass'/'fail')
provides the raw data but no reinforcement learning loop.

**Refinement opportunity:** Use trigger_activations data to adjust trigger
tier assignments over time. Checks with high catch rates get promoted toward
CRITICAL; checks with zero catches over 10+ sessions get demoted toward
SPOT-CHECK. This implements a rudimentary reinforcement signal.

**Transfer quality:** HIGH — action selection and habit formation map cleanly.
Reward processing maps structurally but lacks the feedback loop.


### 6. Thalamus → Sensory Relay and Attention Gating

**Biological function:** The thalamus relays sensory information to the cortex,
gates what reaches conscious awareness, and participates in sleep-wake
transitions. Nearly all sensory input passes through the thalamus before
reaching cortical processing areas (except olfaction).

**Design problem it solves:** How does a system filter incoming information,
route it to the right processing module, and control transitions between
active and dormant states?

**Cogarch analogue:** Hook system + content routing.

| Thalamic Function | Cogarch Component |
|---|---|
| Sensory relay | Hooks (PreToolUse, PostToolUse) — all I/O passes through |
| Attention gating | context-pressure-gate.sh (gates tool calls by context budget) |
| Content routing | T4 #4 routing check, /doc routing table |
| Sleep-wake transition | SessionStart/SessionEnd hooks, PreCompact |

**Gap:** No thalamic reticular nucleus equivalent — the TRN inhibits thalamic
relay neurons to filter incoming data. Our hooks pass information through but
don't selectively block based on relevance scoring. The context-pressure gate
blocks on quantity (budget), not quality (relevance).

**Transfer quality:** HIGH — hooks already function as a sensory relay. The
gating mechanism needs relevance-based filtering, not just budget-based.


### 7. Brainstem → Arousal and Vital Functions

**Biological function:** The brainstem manages arousal (reticular activating
system), vital functions (respiration, heart rate), and basic reflexes. It
operates autonomously and continuously without conscious involvement.

**Design problem it solves:** How does a system maintain baseline operations,
regulate its own arousal/activity level, and execute protective reflexes?

**Cogarch analogue:** Infrastructure layer.

| Brainstem Function | Cogarch Component |
|---|---|
| Arousal regulation | SessionStart hook (transitions from dormant to active) |
| Vital functions | Cron heartbeat, meshd daemon, state.db bootstrap |
| Protective reflexes | tool-failure-halt.sh (automatic stop on failure) |
| Autonomic regulation | context-pressure-statusline.sh (background monitoring) |

**Transfer quality:** HIGH — infrastructure already operates as a brainstem
equivalent. The mapping validates placing these functions outside the cogarch
trigger system (brainstem operates below cortical awareness).


### 8. Corpus Callosum → Interhemispheric Communication

**Biological function:** The corpus callosum connects the left and right
hemispheres, enabling integrated processing across specialized brain regions.
Split-brain studies (Sperry, 1968) show that without it, the hemispheres
operate independently with sometimes contradictory outputs.

**Design problem it solves:** How do independently operating processing
modules communicate to produce coherent output?

**Cogarch analogue:** Transport protocol + GWT broadcast.

| Callosal Function | Cogarch Component |
|---|---|
| Inter-hemisphere data transfer | Transport protocol (interagent/v1) |
| Coherent integrated output | GWT broadcast convention (within-session) |
| Lateralization support | Agent specialization (psq-agent=measurement, unratified=publication) |

**Transfer quality:** MODERATE — transport handles inter-agent communication.
The GWT broadcast handles within-session integration. No equivalent of the
continuous, high-bandwidth callosal connection exists between agents.


### 9. Default Mode Network → Self-Referential Processing

**Biological function:** The DMN activates during rest, mind-wandering, future
simulation, autobiographical memory recall, and theory of mind. It deactivates
during focused external tasks. Raichle et al. (2001) identified it as the
brain's "baseline" state.

**Design problem it solves:** How does a system reflect on itself, plan future
actions without external prompts, and maintain a self-model?

**Cogarch analogue:** Partially mapped.

| DMN Function | Cogarch Component |
|---|---|
| Self-reflection | /diagnose skill, /cycle self-documentation |
| Future simulation | /knock (consequence tracing through 10 orders) |
| Autobiographical memory | lab-notebook + journal (session history as autobiography) |
| Theory of mind | T4 #9 interpretant communities (modeling other readers) |
| Baseline processing | ✗ No equivalent — agent has no idle-state processing |

**Gap:** The agent has no DMN equivalent — no processing occurs between
sessions. The brain's DMN produces spontaneous ideation, consolidation, and
self-monitoring during rest. The CPG endogenous rhythmicity (principle 3)
would partially address this if implemented as inter-session background
processing.

**Transfer quality:** LOW for the DMN's most distinctive feature (spontaneous
idle-state processing). MODERATE for self-referential functions (already
implemented through /diagnose and /cycle).


### 10. Neurotransmitter Systems → Modulatory State

**Biological function:** Neurotransmitter systems set global brain states that
modulate all processing:

| Neurotransmitter | Function | Effect |
|---|---|---|
| Dopamine | Reward, motivation, prediction error | Drives learning, action initiation |
| Serotonin | Mood regulation, impulse inhibition | Patience, delay of gratification |
| Norepinephrine | Alertness, stress response | Arousal, attention under threat |
| Acetylcholine | Attention, learning, memory encoding | Focus, new memory formation |

**Design problem it solves:** How does a system modulate *all* processing
simultaneously based on a global state variable?

**Cogarch analogue:** Neuromodulatory reconfiguration (CPG #6).

| Neurotransmitter | Cogarch Analogue |
|---|---|
| Dopamine | Work carryover resolution (completion = reward signal). No reinforcement loop yet |
| Serotonin | Trust budget (patience — bounded autonomy prevents impulsive action) |
| Norepinephrine | Urgency field in transport + context-pressure alerts |
| Acetylcholine | Mode detection (Generative mode = high acetylcholine = learning/creating) |

**Gap:** No global modulation mechanism. The CPG neuromodulatory reconfiguration
(principle 6) proposes 2 states (standard/deep-analysis) but hasn't implemented
a mechanism that adjusts all trigger processing simultaneously based on a state
variable. Each trigger runs its checks independently of the global state.

**Transfer quality:** LOW — neurotransmitter systems represent the weakest
mapping because they operate through diffuse chemical gradients rather than
targeted signals. The cogarch has no equivalent of "bathe all components in
a different chemical environment."

---

## Summary: Coverage Map

| Brain System | Mapping Quality | Status |
|---|---|---|
| CPGs | HIGH | ✓ Implemented (17 principles) |
| Glial cells | HIGH | ✓ Proposed (PR #168, review done) |
| Working memory | HIGH | ✓ Spec complete |
| Attention | HIGH | ✓ Implemented (tiering) |
| Global Workspace | HIGH | ✓ Convention added |
| Dual process | HIGH | ✓ Structural (LLM + triggers) |
| Hippocampus | MODERATE | ✓ Mapped (/cycle = consolidation) |
| Prefrontal cortex | HIGH | ✓ Mapped (distributed executive) |
| Amygdala | MODERATE | ⚑ Gap: no fast pre-conscious path |
| Cerebellum | MODERATE | ✓ Mapped (efference copy + timing) |
| Basal ganglia | HIGH | ⚑ Gap: no reinforcement loop |
| Thalamus | HIGH | ✓ Mapped (hooks = relay) |
| Brainstem | HIGH | ✓ Mapped (infrastructure layer) |
| Corpus callosum | MODERATE | ✓ Mapped (transport + GWT) |
| Default Mode Network | LOW | ⚑ Gap: no idle-state processing |
| Neurotransmitters | LOW | ⚑ Gap: no global modulation |
| Predictive processing | MODERATE | ✓ Mapped (efference copy) |
| Skill acquisition | HIGH | ✓ Implemented (crystallization) |
| Memory consolidation | HIGH | ✓ Implemented (episodic→procedural) |
| Synaptic pruning | HIGH | ✓ Designed (forgetting, not triggered) |

**Coverage:** 20 brain systems mapped. 12 HIGH quality, 5 MODERATE, 3 LOW.
14 implemented or designed, 4 have identified gaps, 2 represent structural
limitations of the conversation-based architecture.

**Key gaps to address:**
1. Basal ganglia reinforcement loop (trigger tier adjustment from activation data)
2. Amygdala fast path (pre-trigger security screening)
3. DMN idle-state processing (inter-session background consolidation)
4. Neurotransmitter global modulation (2-state reconfiguration per CPG #6)

⚑ EPISTEMIC FLAGS
- All mappings function as analogical reasoning with transfer risk
- LOW-quality mappings (DMN, neurotransmitters) may not transfer beneficially
- The brain operates as an integrated system; mapping individual components
  loses emergent properties that arise from their interaction
- No empirical validation — these represent design hypotheses, not tested architecture

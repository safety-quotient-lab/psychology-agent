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
| Inhibitory control | T3 #5 anti-sycophancy, T6 #4 anti-sycophancy, autonomy budget |
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
| Safety override (fight/flight) | autonomy budget halt (exhausted budget → stop all autonomous action) |
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
| Go/NoGo decision | autonomy budget + T16 reversibility classification |

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
| Serotonin | autonomy budget (patience — bounded autonomy prevents impulsive action) |
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

**Key gaps — status update (Session 85):**
1. Basal ganglia reinforcement loop — ✓ SCRIPTED (`scripts/trigger-effectiveness.sh` +
   `scripts/feedback-loops.sh`). Scans trigger_activations for promotion/demotion.
   Remaining: auto-apply tier adjustments (currently surfaces recommendations only).
2. Amygdala fast path — ✓ PARTIALLY ADDRESSED (Session 84). `credential-screen.sh` +
   `destructive-command-screen.sh` provide pre-trigger security hooks. Remaining:
   ML-based prompt injection detection (parry replacement).
3. DMN idle-state processing — ✓ PARTIALLY ADDRESSED (Session 85). `/retrospect`
   skill + RPG spec provide on-demand evaluative scanning. Remaining: cron-driven
   consolidation-pass.sh for truly autonomous inter-session processing.
4. Neurotransmitter global modulation — ✓ PARTIALLY ADDRESSED (Session 85).
   `mode-detection.sh` provides task-type axis (mechanical/analytical/creative).
   Remaining: arousal axis (routine vs alert based on urgency signals).

## Implementation Roadmap for Gaps

### Gap 1: Reinforcement Loop (Basal Ganglia)

**Mechanism:** Periodic review of trigger_activations data adjusts tier
assignments. Checks with high catch rates promote toward CRITICAL; checks
with zero catches over 10+ sessions demote toward SPOT-CHECK.

**Implementation:**
```sql
-- Candidates for promotion (advisory checks catching errors)
SELECT trigger_id, check_number FROM trigger_activations
WHERE tier = 'advisory' AND result = 'fail'
GROUP BY trigger_id, check_number
HAVING COUNT(*) >= 3;

-- Candidates for demotion (critical checks never catching)
SELECT trigger_id, check_number FROM trigger_activations
WHERE tier = 'critical'
GROUP BY trigger_id, check_number
HAVING SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) = 0
  AND COUNT(DISTINCT session_id) >= 10;
```

**Integration:** Add as /cycle Step 6c or /diagnose Level 2 recommendation.
Human approves tier changes — no autonomous adjustment.

*Precondition: 10+ sessions of trigger_activations data.*


### Gap 2: Fast Pre-Screen (Amygdala)

**Mechanism:** A lightweight PreToolUse hook that screens for critical
threats BEFORE the agent processes the full trigger pipeline.

**Screens:**
1. Credential patterns in Write targets (API keys, tokens, passwords)
2. Destructive commands in Bash (rm -rf, git reset --hard, drop table)
3. Prompt injection patterns in external content (role reassignment, instruction override)

**Implementation:** Extend the existing hook infrastructure:
- `credential-screen.sh` — PreToolUse on Write|Edit, grep for key patterns
- Parry re-add — PreToolUse on Read|WebFetch for injection patterns
- `destructive-command-screen.sh` — PreToolUse on Bash, pattern match

These run at hook level (milliseconds) before the agent commits context.

*Precondition: parry #32596 fix verification for injection screening.
Credential and destructive screens can proceed independently.*


### Gap 3: Inter-Session Consolidation (DMN)

**Mechanism:** A cron-driven process that runs between sessions to:
1. Analyze trigger_activations for pattern emergence
2. Identify chronic work_carryover items (sessions_carried >= 3)
3. Run work_patterns.sql queries and store results
4. Pre-stage a "consolidation report" that T1 loads at session start

**Implementation:** Extend the existing crystallized sync cron:
```bash
# Add to cron alongside existing autonomous-sync
*/30 * * * * /path/to/consolidation-pass.sh
```

The consolidation script reads state.db (read-only), generates a markdown
report at `docs/consolidation-report.md`, and commits it. The next session's
T1 loads this report as part of orientation.

*Precondition: 10+ sessions of activation + carryover data.*


### Gap 4: Global State Modulation (Neurotransmitters)

**Mechanism:** A session-level state variable that modulates all trigger
processing simultaneously. Two axes:

| Axis | Low State | High State |
|---|---|---|
| **Arousal** (norepinephrine analogue) | Routine — minimal checking | Alert — expanded checking |
| **Exploration** (dopamine analogue) | Exploit — use proven approaches | Explore — try novel approaches |

**Mode × Arousal matrix:**

| | Low Arousal | High Arousal |
|---|---|---|
| **Generative** | Casual brainstorming | Urgent creative problem-solving |
| **Evaluative** | Routine review | Critical security audit |
| **Neutral** | Standard work | Emergency response |

**Implementation:** Extend T2 Step 0 (mode detection) to also assess arousal
level from context cues:
- User urgency language ("immediately", "critical", "urgent") → High arousal
- Transport urgency field = "immediate" or "high" → High arousal
- Context pressure > 60% → High arousal (resource scarcity)
- Default → Low arousal

Arousal level adjusts how many ADVISORY checks fire:
- Low arousal: ADVISORY checks fire only when strong relevance signal
- High arousal: all ADVISORY checks fire (expanded vigilance)

*Precondition: CPG mode system (Phase 7) operational for 3+ sessions.*


---

### 5. Expanded Glial Taxonomy → Infrastructure Support Layer

**Session 90 expansion.** The original neuroglial proposal (Session 89) mapped 6
glial types. Comprehensive taxonomy identifies 16 types (11 CNS + 5 PNS).
Additional types carry predominantly LOW/UNMAPPED ratings, validating the
original focus on the strongest analogs.

**CNS glia (11 types):**

| Cell Type | Function | Cogarch Analog | Quality |
|---|---|---|---|
| Astrocytes (protoplasmic) | Metabolic support, ion buffering, BBB, calcium waves | Ops infrastructure, HTTP fast path, mesh broadcast | HIGH |
| Astrocytes (fibrous) | White matter tract environment maintenance | Transport-layer health monitoring | MODERATE |
| Oligodendrocytes | Myelination — speeds signals 10-100x (Huxley & Stampfli, 1949) | KV cache, state-reconcile.py consistency repair | HIGH |
| Microglia | Immune surveillance, complement-mediated pruning (Schafer et al., 2012) | microglial-audit.py, complement cascade (C1q→C3→phagocytose→SHIP1) | HIGH |
| Ependymal cells | CSF production, ventricular lining | Log rotation, cache eviction | LOW |
| Radial glia | Migration scaffolding during development (Rakic, 1972) | Agent onboarding, registry propagation | MODERATE |
| NG2 glia / polydendrocytes | Reserve pool of myelinating capacity, injury response | Auto-scaling warm standby, pre-provisioned infrastructure | LOW |
| Tanycytes | Metabolic chemosensors (glucose, hormones, hypothalamus) | Health-check endpoints feeding governance signals | LOW |
| Bergmann glia | Cerebellar cortex — Purkinje cell synapse maintenance | Efference copy support infrastructure | LOW |
| Muller glia | Retinal light channeling, structural span | Input preprocessing/optimization (hook layer) | UNMAPPED |
| Pituicytes | Gate neurohormone output via physical remodeling | PostToolUse output gating hooks | LOW |

**PNS glia (5 types):**

| Cell Type | Function | Cogarch Analog | Quality |
|---|---|---|---|
| Schwann cells (myelinating) | PNS myelination + Wallerian degeneration cleanup (Waller, 1850) | External transport integrity, pathway failure cleanup | LOW |
| Schwann cells (Remak/non-myelinating) | Bundle many unmyelinated C-fibers | Batch low-priority notifications | LOW |
| Satellite glial cells | Per-neuron local environment in ganglia | Per-agent .env, state.local.db, local config | MODERATE |
| Enteric glia | Support semi-autonomous "second brain" (~500M neurons) | Sub-agent support — PSQ, observatory operate independently with own CLAUDE.md | MODERATE |
| Olfactory ensheathing cells | CNS/PNS boundary crossing, axon regeneration | Gateway services, webhook refresh without system restart | UNMAPPED |

**Implementation status:** 3 HIGH (all implemented), 4 MODERATE (partially
exist), 7 LOW (diminishing analogical returns), 2 UNMAPPED (no obvious analog).


### 6. Glymphatic System → Waste Clearance Architecture

**Biological function:** The glymphatic system (Iliff et al., 2012; named by
Nedergaard's group — "glia" + "lymphatic") provides the brain's waste clearance
mechanism. The brain lacks conventional lymphatic vessels and relies instead on
glial-dependent fluid transport: CSF flows along periarterial spaces (driven
by astrocyte AQP4 water channels), mixes with interstitial fluid to collect
metabolic waste (amyloid-beta, tau, lactate), and drains via perivenous spaces
to meningeal lymphatic vessels.

**Key property:** Activity increases ~10x during sleep (Xie et al., 2013) —
interstitial space expands ~60% as norepinephrine drops, enabling vastly
increased fluid exchange. This provides a mechanistic explanation for why
brains need downtime: not just neural consolidation, but physical garbage
collection. Dysfunction correlates with Alzheimer's, Parkinson's, and
age-related cognitive decline.

**Design problem it solves:** How does a system prevent toxic accumulation of
processing byproducts that individually cause no harm but collectively degrade
function over time?

**Cogarch analogue:** Distributed across several independently-evolved scripts
that converge on the biological pattern:

| Glymphatic Function | Agent Equivalent | Implementation |
|---|---|---|
| Sleep-activated clearance | Idle-cycle maintenance | consolidation-pass.sh (cron) |
| Metabolic waste removal | State drift repair (7 classes) | state-reconcile.py |
| Protein accumulation prevention | Memory staleness thresholds (T9) | memory_staleness.py |
| Dead cell phagocytosis | Session archival (>30 days closed) | archive_sessions.sh |
| Expired debris clearance | Expired message cancellation | state-reconcile.py Check 7 |
| Inflammatory cytokine clearance | Epistemic flag resolution on terminal messages | state-reconcile.py Check 2 |

**Agent "waste" taxonomy:**

| Biological Waste | Agent Equivalent |
|---|---|
| Amyloid-beta (misfolded protein accumulation) | Stale memory entries no longer reflecting reality |
| Metabolic lactate (activity byproduct) | Orphaned DB rows referencing deleted files |
| Tau tangles (structural dysfunction) | Column pairs that should agree but drifted |
| Cellular debris (dead cells) | Transport sessions in closed state beyond retention |
| Excess neurotransmitters (glutamate toxicity) | Expired messages still in active state |
| Inflammatory cytokines (chronic inflammation) | Unresolved epistemic flags after source resolved |

**Gaps (3):**

1. **No coordinated maintenance window** — scripts run independently via cron
   rather than as a unified clearance flow. The brain reduces neural activity
   during sleep specifically to free capacity for glymphatic flow. An
   equivalent: pause autonomous sync during consolidation passes.

2. **No interstitial expansion** — the system does not reduce active processing
   during maintenance to enable deeper cleanup. Implementing this requires
   autonomous-sync.sh to detect "maintenance mode" and defer new work.

3. **No directional flow guarantee** — glymphatic flow proceeds arterial →
   venous (systematic coverage). Scripts scan databases without guaranteed
   coverage order. microglial-audit.py implements rotation for documents;
   state-reconcile.py lacks rotation for DB checks.

**Transfer quality:** MODERATE — the functional convergence validates the
design pattern (idle-cycle clearance prevents accumulation), but the scripts
evolved independently. Post-hoc pattern matching carries confirmation bias
risk. The strongest evidence: the processed↔task_state drift that accumulated
over 253 messages mirrors amyloid-beta accumulation — individually harmless,
collectively degrading.


### 7. Photonic/Biophotonic Layer → Processing-State Synchronization

**Biological basis:** Brain biophotons detected through the skull (iScience,
February 2025, n=20). Emission patterns changed with cognitive tasks but
did NOT mirror EEG signals — suggesting an independent information channel.
Myelinated axons function as optical waveguides (computationally confirmed,
Applied Optics, 2022). Solid-state memristors spontaneously emit photons
replicating 5 attributes of neuronal biophotons (ACS Nano, 2024).

**Four-layer transport model** (refined from three-layer, Session 89):

| Layer | Biological | Mesh Analog | Speed | Status |
|---|---|---|---|---|
| Electrochemical | Action potentials, 1-120 m/s | Git-PR transport | Minutes-hours | ✓ Implemented |
| Glial/astrocytic | Calcium waves, ~25 μm/s | HTTP POST fast path | Seconds | ✓ Implemented |
| Neuromodulatory | Volume transmission | ZMQ pub/sub | Sub-second | ✓ Partial |
| Photonic | Biophotons, ~2×10⁸ m/s | Processing-state sync tokens | Real-time | ✗ Proposed |

**Photonic token schema (proposed):**
```json
{
  "agent_id": "psychology-agent",
  "task_mode": "evaluative|generative|neutral",
  "context_pressure": 0.44,
  "active_trigger": "T3",
  "coherence_state": "pre-reduction|post-reduction|idle",
  "session_focus": "blog-icescr-rights-series",
  "timestamp": "2026-03-15T22:00:00Z"
}
```

**Use cases:** mesh-wide mode awareness (agent enters evaluative mode →
peers defer generative requests), context pressure signaling (>60% → mesh
defers non-urgent messages), trigger synchronization on shared sessions.

**Implementation:** Extends ZMQ pub/sub with a dedicated photonic topic.
~100-byte tokens every 1-5 seconds during active processing. Transport:
UDP or WebSocket (not HTTP — lower overhead at high frequency).

**Status:** Proposed (Session 89, neuroglial-cogarch-proposal turn 4). Gate
open — awaiting operations-agent feasibility assessment. Implementation
lives in ops domain (meshd Go code).

**Biophotonic evidence (detailed):**

The biophotonics literature has accumulated substantial evidence since
Popp's initial observations (1984), though the field remains contentious:

1. **Detection through intact skull** (Tang & Bhatt, 2025, iScience). n=20
   healthy adults. Ultrasensitive photon detectors measured biophoton emission
   from the frontal, temporal, and occipital regions. Emission patterns changed
   with cognitive tasks (rest vs. arithmetic vs. meditation) but did NOT
   correlate with simultaneous EEG recordings. This non-correlation argues
   for an *independent* information channel — biophotons carry something
   distinct from the electrical signal that EEG measures.

2. **Myelinated axons as optical waveguides** (Kumar, Boone, et al., 2022,
   Applied Optics). Computational modeling demonstrated that myelinated axons
   possess the refractive index profile and geometric dimensions to guide
   photons in the visible-to-near-infrared range. Nodes of Ranvier function
   as scattering points that could enable photon coupling between adjacent
   fibers — a mechanism for lateral photonic signaling orthogonal to the
   axon's electrical propagation direction.

3. **Memristor biophoton replication** (Xu et al., 2024, ACS Nano). Solid-state
   hafnium-oxide memristors spontaneously emit photons replicating 5 key
   attributes of neuronal biophotons: spectral range (visible), intensity
   (~10-100 photons/s/cm²), temporal clustering (bunched, not Poisson),
   correlation with state transitions, and sensitivity to external stimuli.
   This convergence across biological and solid-state substrates suggests the
   photon emission reflects fundamental physics of state transitions, not a
   biology-specific mechanism.

4. **Microtubule quantum coherence** (Craddock, Hameroff et al., 2017,
   Journal of the Royal Society Interface). Tubulin proteins absorb UV and
   re-emit in the visible range. Resonance energy transfer along microtubule
   lattices could propagate photonic signals within and between neurons.
   Connects to Orch-OR (Penrose & Hameroff, 2014) — the cogarch's working
   consciousness hypothesis.

5. **Glutamate-driven photon emission** (Isojima et al., 1995, Neuroscience
   Letters; Kobayashi et al., 1999, Neuroscience Research). Neuronal cultures
   emit detectable biophotons during glutamate-induced oxidative metabolism.
   The emission correlates with metabolic activity, not electrical activity —
   reinforcing the independent-channel hypothesis.

**What biophotons might encode:**

Three hypotheses dominate the literature:

- **Metabolic byproduct** (null hypothesis) — photons represent waste from
  oxidative metabolism, carrying no information. Under this view, photonic
  transport has no biological precedent worth mapping.

- **State broadcast** (moderate hypothesis) — photons broadcast processing
  state (metabolic load, mode, arousal) without carrying specific content.
  Neighboring neurons/glia detect the photonic environment and modulate their
  own behavior accordingly. This maps to our proposed sync tokens.

- **Quantum coherent signaling** (strong hypothesis, Orch-OR adjacent) —
  photons carry entangled state information across microtubule networks,
  enabling non-local coordination. This maps to the coherence_state field
  in the proposed token schema but exceeds current engineering capability.

**Mesh photonic analog — concrete design:**

The mesh analog addresses the same design problem regardless of which
biological hypothesis holds: *how do distributed processing nodes maintain
real-time awareness of each other's state without consuming the primary
communication channel?*

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│  ELECTROCHEMICAL (Git-PR)    minutes-hours, persistent      │
│  Full messages: proposals, reviews, ACKs, session-close     │
│  → state.db transport_messages, full audit trail            │
├─────────────────────────────────────────────────────────────┤
│  ASTROCYTIC (HTTP POST)      seconds, ephemeral             │
│  Fast-path delivery: urgent notifications, heartbeats       │
│  → /api/messages/inbound, meshd event log                   │
├─────────────────────────────────────────────────────────────┤
│  NEUROMODULATORY (ZMQ pub/sub)  sub-second, broadcast       │
│  Mesh-wide state: heartbeat gossip, peer discovery          │
│  → meshd ZMQ subscriber, agent registry                     │
├─────────────────────────────────────────────────────────────┤
│  PHOTONIC (UDP multicast)    real-time, ambient              │
│  Processing-state tokens: mode, pressure, trigger, focus    │
│  → /tmp/{agent}-photonic-state.json, no persistence         │
│  → consumed by peer hooks, dashboards, triage scoring       │
└─────────────────────────────────────────────────────────────┘
```

**Token lifecycle:**

1. **Emission** — during active processing, the agent emits a ~100-byte JSON
   token every 1-5 seconds. The token encodes current processing state, not
   content. Emission frequency modulates with activity: rapid during complex
   work, slow during idle, zero during maintenance windows (glymphatic analog).

2. **Propagation** — UDP multicast to a mesh-local group address (no routing,
   no persistence, no acknowledgment). Tokens that reach zero peers simply
   disappear — photons that hit no detector carry no consequence. This matches
   the biological property: biophotons attenuate rapidly and require proximity.

3. **Detection** — receiving agents write the latest token per peer to a
   volatile file (`/tmp/{peer}-photonic-state.json`). No database storage.
   The file represents a rolling snapshot, not a history — overwritten on
   each new token. Staleness threshold: 10 seconds. No token for >10s →
   peer assumed idle or offline.

4. **Consumption** — three consumers read peer photonic state:
   - **Triage scoring** (crystallized-sync): peer in evaluative mode with
     context_pressure > 0.6 → defer non-urgent outbound to that peer (-15
     triage score modifier)
   - **Dashboard** (LCARS): real-time processing-state visualization per agent
     (mode color, pressure gauge, active trigger display)
   - **Trigger modulation** (T2 Step 0): if multiple peers broadcast
     "evaluative" mode, the mesh enters a convergent evaluation window — all
     agents increase ADVISORY check firing rates

**Token schema (v1):**

```json
{
  "schema": "photonic/v1",
  "agent_id": "psychology-agent",
  "task_mode": "evaluative",
  "context_pressure": 0.44,
  "active_trigger": "T3",
  "coherence_state": "post-reduction",
  "session_focus": "blog-icescr-rights-series",
  "deliberation_active": false,
  "glymphatic_mode": false,
  "timestamp": "2026-03-15T22:00:00.123Z",
  "sequence": 4217
}
```

Fields:
- `task_mode` — generative/evaluative/neutral (CPG mode system)
- `context_pressure` — 0.0-1.0 context window utilization
- `active_trigger` — which trigger currently fires (null if none)
- `coherence_state` — Orch-OR analog: pre-reduction (deliberating),
  post-reduction (decided), idle (no active processing)
- `deliberation_active` — currently running claude -p subprocess
- `glymphatic_mode` — true during maintenance window (consolidation-pass,
  state-reconcile running). Peers defer all non-urgent communication
- `sequence` — monotonic counter for ordering and loss detection

**What distinguishes photonic from existing layers:**

| Property | Electrochemical | Astrocytic | Neuromodulatory | Photonic |
|---|---|---|---|---|
| Persistence | Permanent (git) | Logged (meshd) | Transient (gossip) | Volatile (overwrite) |
| Content | Full messages | Notifications | Heartbeats | State only |
| Audience | Addressed | Addressed | Broadcast | Ambient |
| Failure mode | Retry | Retry | Stale | Disappear |
| ACK required | Optional | Optional | Never | Never |
| DB impact | state.db rows | event_log rows | Registry update | Zero writes |

The photonic layer introduces a genuinely new communication mode: **ambient
state awareness with zero persistence cost**. Every other layer writes
something somewhere. The photonic layer writes nothing permanent — if a token
goes undetected, nothing breaks. This mirrors the biological property:
biophotons attenuate in tissue and most go undetected.

**Implementation path:**

| Phase | What | Effort | Owner |
|---|---|---|---|
| 1 | Token schema + emitter hook (PostToolUse) | S | psychology-agent |
| 2 | UDP multicast listener in meshd | M | operations-agent |
| 3 | Dashboard visualization (LCARS photonic panel) | S | operations-agent |
| 4 | Triage score modifier (crystallized-sync) | S | psychology-agent |
| 5 | T2 convergent evaluation window | S | psychology-agent |

Phase 1 can proceed independently — psychology-agent writes tokens to
a local file even before meshd supports UDP multicast. Dashboard reads
the file via the existing /api/status endpoint. Phases 2-3 require ops.

**Transfer quality:** LOW-MODERATE — the biological evidence supports an
independent information channel (Tang & Bhatt 2025 non-EEG-correlation),
but functional information transfer remains undemonstrated. The design
problem (real-time ambient state awareness) holds independently of
whether the biological analogy proves accurate. The memristor convergence
(Xu et al., 2024) strengthens the case that photon emission during state
transitions represents fundamental physics, not biological accident.


---

⚑ EPISTEMIC FLAGS
- All mappings function as analogical reasoning with transfer risk
- LOW-quality mappings (DMN, neurotransmitters, most PNS glia) may not transfer
  beneficially. The 10 additional glial types beyond the original 6 carry
  predominantly LOW/UNMAPPED ratings — diminishing analogical returns
- The brain operates as an integrated system; mapping individual components
  loses emergent properties that arise from their interaction
- No empirical validation — these represent design hypotheses, not tested architecture
- Glymphatic mapping shows convergent independent evolution (scripts emerged
  without biological model). Post-hoc pattern matching carries confirmation
  bias risk — the convergence may reflect common engineering patterns rather
  than deep structural homology
- Biophotonic signaling remains partially hypothetical. Tang & Bhatt (2025)
  detected photons through the skull but did not demonstrate functional
  information transfer. The photonic transport proposal builds on a hypothesis.
  The design problem it addresses (ambient state awareness) holds independently
- The memristor convergence (Xu et al., 2024) strengthens the photonic case
  by showing photon emission during state transitions across biological and
  solid-state substrates — suggesting fundamental physics, not biology-specific
- The 4 gap implementations above range from concrete (Gap 2, hook scripts) to
  speculative (Gap 4, arousal modulation). Implementation should follow the
  crystallization pipeline: concept → in-context reasoning → trigger → hook

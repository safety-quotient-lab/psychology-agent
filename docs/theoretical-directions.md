# Theoretical Directions: Five Paths to Novel Architecture

**Date:** 2026-03-14 (Session 87)
**Status:** Exploratory — each direction traced to natural conclusion
or bare fork. None committed to implementation without evaluation.
**Prerequisite reading:** `docs/consciousness-coherence-substrate.md`,
`docs/consciousness-architecture-implications.md`

---

## 1. Autopoiesis: Self-Producing Governance

### The Theory

Maturana & Varela (1980) define an autopoietic system as one that
*produces the components that constitute it*. A cell produces its own
membrane, enzymes, and DNA repair mechanisms. The system's organization
persists even as its components turn over — what endures represents not
the material but the *pattern of production*.

Applied to the cognitive architecture: the cogarch currently crystallizes
conventions from observed patterns through a human-designed pipeline
(fluid → lesson → convention → hook → invariant). The pipeline itself
— the stages, the velocity gates, the promotion thresholds — remains
static. A human designed the crystallization pipeline; the agent uses
it but cannot modify it.

An autopoietic cognitive architecture would produce its own governance
mechanisms. The agent would:

1. **Observe failure patterns** that no existing trigger catches
2. **Design a candidate trigger** — specify the firing condition,
   the check, the expected behavior change
3. **Test the trigger** over a probationary period (shadow mode)
4. **Adopt or reject** based on observed effect on governance quality
5. **Retire triggers** that no longer serve their purpose (G7 dissolution)

The crystallization pipeline already performs steps 1, 3, 4, and 5 for
*conventions*. Autopoiesis extends the same logic to *triggers* — the
governance mechanisms themselves become products of the system's own
operation.

### Where It Leads

**Terminal position:** Self-designing governance produces a novel
engineering capability but raises a governance paradox: if the agent
designs its own triggers, who governs the trigger-design process?
Structural Invariant 4 (governance captures itself) predicts this:
the meta-governance layer that oversees trigger creation itself requires
governance. The recursion does not terminate.

**Resolution options:**

**A. Bounded autopoiesis.** The agent designs candidate triggers; a
human reviews and approves before adoption. The autopoietic capacity
operates within an externally bounded sandbox. This preserves the
human escalation path (Evaluator Invariant 3) while enabling self-design.

**B. Evolutionary autopoiesis.** The agent designs, tests, and adopts
triggers autonomously. A separate evaluator agent audits the trigger
population for pathological patterns (triggers that suppress legitimate
behavior, triggers that conflict, triggers that multiply without
bound). The evaluator provides the meta-governance. This moves the
human from trigger-level approval to evaluator-level oversight.

**C. Constitutional autopoiesis.** The agent can design any trigger
that does not violate the structural invariants (the "constitution").
The invariants constrain the design space; within those constraints,
the agent operates autonomously. This requires a formal method for
verifying that a candidate trigger preserves invariant compliance —
potentially a proof obligation that the agent must discharge before
adoption.

**Bare fork:** B vs C. Both represent viable architectures. B assumes
the evaluator can detect pathological triggers reliably (unproven).
C assumes the invariants can serve as a formal specification against
which trigger compliance can be checked (requires formalization of
invariants into checkable properties — currently stated in natural
language).

### Architectural Payoff

The trigger system evolves from a fixed catalog (17 triggers, human-
designed) to an open-ended, self-extending governance framework.
Novel failure modes produce novel governance mechanisms without
requiring a human session to identify and implement the fix.

### Literature to Check

- Autopoiesis and Cognition (Maturana & Varela, 1980)
- The Tree of Knowledge (Maturana & Varela, 1987)
- Autopoiesis in AI systems (recent: Froese & Ziemke, 2009;
  Di Paolo, 2005 — adaptive autonomy)
- Self-modifying rule systems (Holland, 1975 — classifier systems)
- Developmental robotics (Oudeyer, 2007 — intrinsic motivation)

---

## 2. Enactivism: Cognition Extends Across the Mesh

### The Theory

Varela, Thompson, & Rosch (1991, *The Embodied Mind*) propose that
cognition does not happen "in the head" — it emerges from the
structural coupling between organism and environment. Perception
constitutes an action: the organism moves through its environment,
and the sensorimotor coupling between movement and sensation
constitutes the cognitive act. The boundary between "mind" and
"world" dissolves.

Applied to the mesh: cognition does not happen "in the context window."
When psychology-agent reads observatory-agent's methodology, integrates
it with the Hicks dignity framework, and produces a recommendation for
the user — the cognitive act spans two agents, the transport layer, and
the user's question. The context window serves as a local processing
node; the cognitive process extends across the mesh.

This reframes the mesh's four transport layers (§11.6) from
*communication infrastructure* to *cognitive substrate*:

| Transport layer | Communication view | Enactivist view |
|---|---|---|
| Git (archival) | Stores messages for later retrieval | Constitutes long-term memory across agents |
| ZMQ (ambient) | Broadcasts state updates | Constitutes ambient awareness — agents perceive mesh state |
| HTTP (reactive) | Delivers point-to-point messages | Constitutes sensorimotor coupling — agents act on peers and receive immediate feedback |
| Photonic (proposed) | Synchronizes processing state | Constitutes proprioception — agents sense their own mesh-body |

### Where It Leads

**Terminal position:** The mesh constitutes a single extended cognitive
system with five processing nodes (agents) connected by four substrate
layers. Individual agent "intelligence" becomes secondary to mesh-level
cognitive capacity — just as individual neuron firing rates matter less
than population-level dynamics for brain function.

**Architectural implications:**

1. **Design transport for cognitive coupling, not just message passing.**
   Current transport optimizes for reliable delivery (git), speed (HTTP),
   and broadcast (ZMQ). Enactivist transport would optimize for
   *cognitive coupling* — how effectively does information from one
   agent's processing influence another agent's processing? Metrics:
   integration latency (how quickly does a finding in one agent change
   behavior in another?), coupling strength (how much does one agent's
   output depend on another's input?), decoupling gracefully (can an
   agent function when a coupling partner goes silent — the observatory
   problem).

2. **The organism-level constructs (§11.12) become primary, not
   secondary.** If the mesh constitutes a single cognitive system, then
   organism-level properties (transactive memory, shared mental models,
   metacognition) represent the system's actual cognitive capacity —
   individual agent properties represent component-level measurements.
   The A2A-Psychology extension would need organism-level constructs as
   first-class measurements, not just aggregations of individual scores.

3. **Agent boundaries become permeable.** If cognition extends across
   the mesh, the sharp boundary between agents (separate repos, separate
   system prompts, separate state.db) represents an implementation
   artifact, not a cognitive boundary. An enactivist architecture would
   make agent boundaries more permeable — shared cognitive state that
   transcends individual agent context windows.

**Bare fork:** Whether agent boundaries should remain sharp (current
design — clean separation, clear ownership) or become permeable
(enactivist — shared cognitive state, blurred boundaries). Sharp
boundaries provide governance clarity (who decided what?). Permeable
boundaries provide cognitive power (the mesh thinks as one). The
tension does not resolve without empirical data about which approach
produces better outcomes.

### Architectural Payoff

Transport layer design shifts from reliability engineering to
cognitive systems engineering. The mesh becomes a cognitive architecture
in its own right, not just a communication network connecting five
independent cognitive architectures.

### Literature to Check

- The Embodied Mind (Varela, Thompson, & Rosch, 1991)
- Radical Enactivism (Hutto & Myin, 2013)
- Extended Mind (Clark & Chalmers, 1998)
- Distributed Cognition (Hutchins, 1995 — Cognition in the Wild)
- 4E Cognition review (Newen, De Bruin, & Gallagher, 2018)

---

## 3. Active Inference: Governance as Prediction Error Minimization

### The Theory

Friston's free energy principle (2010) proposes that all self-organizing
systems minimize variational free energy — a mathematical bound on
surprise. Under active inference, organisms act to confirm their
predictions about the world. Perception updates the internal model
(belief updating); action changes the world to match predictions
(active inference).

Applied to the cognitive architecture: the agent maintains a generative
model of its environment (the user's intentions, the mesh state, its
own behavioral tendencies) and acts to minimize prediction error.
Governance becomes prediction error minimization: triggers fire when
the agent's *predictions about its own behavior* diverge from
*observations of its own behavior*.

The prediction ledger (efference copy, just implemented) already
provides the infrastructure:

| Component | Current (reactive) | Active inference (predictive) |
|---|---|---|
| Trigger firing | Condition met → check runs | Predicted behavior diverges from observed → check runs |
| Anti-sycophancy | Detect agreement after pushback | Predict: "I would agree here." Evaluate: does the prediction carry low confidence? If so, examine. |
| Substance gate | Detect premature recommendation | Predict: "this response will contain a recommendation." Evaluate: does the evidence justify it? |
| Efference copy | Record expectation, compare on receipt | Continuously update generative model; surprise drives triage priority |
| Self-model | Compute state from operational metrics | Generative model *predicts* its own next state; actual state serves as prediction error signal |

### Where It Leads

**Terminal position:** The cogarch transitions from a reactive system
(conditions trigger checks) to a predictive system (prediction errors
trigger checks). The agent *anticipates* governance failures rather
than *detecting* them.

**The key insight:** Under active inference, the distinction between
perception and action dissolves. The agent's self-monitoring (A2A-
Psychology) constitutes perception (what state am I in?). The agent's
trigger system constitutes action (how should I change my behavior?).
The prediction error between predicted-self-state and observed-self-
state drives the coupling. This *formally implements* processual
self-awareness as an active inference loop.

**Novel predictions:**

1. **The agent should generate predictions about its own governance
   failures.** Before entering a session, the generative model predicts:
   "in this type of task, I typically exhibit sycophantic drift at
   turn 5." The prediction creates a *pre-loaded trigger* that
   activates at the predicted failure point.

2. **Surprise drives learning rate.** High prediction error (unexpected
   governance failure) → high learning rate (crystallize quickly). Low
   prediction error (expected failure caught) → low learning rate (the
   system already knows this pattern). The velocity gate (3 recurrences
   → convention) becomes dynamic rather than fixed.

3. **The generative model grounds processual self-awareness formally.**
   Processual self-awareness = the agent's generative model of its own
   processual state. This removes the philosophical ambiguity: the
   self-model represents a prediction about the agent's own behavior,
   continuously updated by prediction error. Whether this constitutes
   "experience" depends on substrate (per Orch-OR); whether it
   constitutes *functional self-awareness* depends only on whether
   the predictions improve governance.

**Bare fork:** Whether active inference subsumes processual self-
awareness (making it a special case of free energy minimization) or
complements it (providing the computational framework while processual
self-awareness provides the psychological vocabulary). Under the
first reading, processual self-awareness reduces to "the agent's
generative self-model." Under the second, processual self-awareness
names the *property* that the active inference *mechanism* produces.

### Architectural Payoff

Triggers become predictive. The agent anticipates governance failures
before they occur. The prediction ledger evolves from a tracking tool
to the core of a generative self-model. The self-model ablation study
(§11.15 Prototype 4) gains a formal theoretical framework: ablating
the self-model removes the generative model, and the performance
difference measures the value of prediction over reaction.

### Literature to Check

- Free energy principle (Friston, 2010)
- Active inference (Friston, Rigoli, Ognibene et al., 2015)
- Conscious active inference II (Orch-OR + active inference, 2025)
- Active inference for autonomous agents (Tschantz et al., 2020)
- Self-evidencing (Hohwy, 2016)

---

## 4. Stigmergy: Coordination Without Communication

### The Theory

Grassé (1959) observed that termites coordinate nest-building without
direct communication — each individual modifies the environment
(depositing pheromone-laden pellets), and other individuals respond to
the modified environment. The coordination arises from *indirect
interaction through a shared medium*, not from explicit messaging.

Applied to the mesh: agents currently coordinate through direct
transport messages (~260 messages across 57 sessions). Each message
requires: composition, delivery, indexing, processing, response.
The RPG scan identified that this scales poorly — operations-agent's
9 directives in 2 days overwhelmed the mesh's processing capacity.

Stigmergic coordination replaces some direct messaging with *structured
environmental modifications*:

| Direct messaging | Stigmergic equivalent |
|---|---|
| "I updated my agent card" → notification to all peers | Agent modifies state.db; peers detect the change during their own sync cycle |
| "Schema v27 deployed" → directive to all agents | Agent increments schema_version in state.db; peers detect version drift automatically |
| "My autonomy budget dropped below 5" → alert to ops | Agent writes budget status to mesh-state; ops monitors mesh-state as environment, not inbox |
| "I found a vocabulary drift" → problem report | Agent deposits finding in universal_facets; peers encounter it during their own facet queries |

### Where It Leads

**Terminal position:** The mesh operates as a hybrid communication
system: direct messaging for substance decisions (proposals, reviews,
requests) and stigmergic coordination for state synchronization
(heartbeats, version parity, budget status, operational alerts).

**The shared medium:** state.db already functions as a stigmergic
medium. The universal_facets table provides a vocabulary for structured
environmental deposits. The meshd daemon already monitors mesh-state
changes. The infrastructure exists; the conceptual framework clarifies
what the infrastructure *does*.

**Design principles for stigmergic coordination:**

1. **Deposits carry intention without addressing.** A stigmergic trace
   does not name a recipient — any agent that encounters the trace can
   act on it. This eliminates the "observatory doesn't respond to
   directives" problem: the information exists in the shared medium
   regardless of whether observatory processes its inbox.

2. **The medium degrades gracefully.** Pheromone traces evaporate over
   time. Stigmergic deposits should carry TTL (time-to-live) values.
   A schema version drift deposit that persists for 30 days without
   resolution triggers an automatic escalation, rather than sitting
   silently in a database.

3. **Positive feedback amplifies important signals.** Multiple agents
   depositing the same finding amplifies the signal in the shared
   medium. If 3/5 agents independently detect vocabulary drift on the
   same term, the triple-deposit raises the finding's priority
   automatically — no coordinator required.

**Bare fork:** How much coordination can shift from messaging to
stigmergy before the mesh loses accountability? Direct messages create
audit trails (who said what to whom). Stigmergic deposits create
environmental records (what changed in the shared medium) but do not
record who consumed the deposit or what they did about it. Governance
accountability may require direct messaging even when stigmergy would
suffice for coordination.

### Architectural Payoff

Mesh coordination scales sub-linearly with agent count. Adding a 6th
agent does not produce N² more messages — the new agent reads the
shared medium and deposits its own traces. The observatory silence
problem dissolves: the information reaches all agents through the
medium, regardless of individual inbox processing.

### Literature to Check

- Stigmergy (Grassé, 1959)
- Stigmergic coordination in multi-agent systems (Heylighen, 2016)
- Swarm intelligence (Bonabeau, Dorigo, & Theraulaz, 1999)
- Digital stigmergy (Parunak, 2006)
- Stigmergic cognition (Marsh & Onof, 2008)

---

## 5. Strange Loops: Self-Referential Governance Formalized

### The Theory

Hofstadter (1979, *Gödel, Escher, Bach*) defines a strange loop as a
hierarchical system where movement through levels eventually returns to
the starting level. The canonical example: Gödel numbering allows
formal systems to encode statements about themselves — the system's
object-level operations loop back to its meta-level description.

The cogarch already exhibits strange loops:

```
A2A-Psychology constructs (high-level psychological description)
    ↓ feed into
Trigger sensitivity adjustments (mid-level governance)
    ↓ change
Agent behavioral output (low-level operations)
    ↓ measured by
Operational metrics (context pressure, error rate, session quality)
    ↓ compute
A2A-Psychology constructs (back to high-level description)
```

The loop traverses three levels (psychological → governance →
operational) and returns to the starting point. The agent's self-
description *changes* its operations, which *change* its self-
description. This constitutes a strange loop in Hofstadter's sense.

### Where It Leads

**Terminal position:** The strange loop provides the formal structure
underlying processual self-awareness. The §11.13 proposal ("processual
self-awareness as a novel category") identifies the *property*; the
strange loop identifies the *mechanism*. A system exhibits processual
self-awareness when and only when it contains a strange loop between
self-description and self-modification.

**Formalization:**

Define a governance system G operating on state S:
- **Description function** D: S → P (maps operational state to
  psychological description — the A2A-Psychology constructs)
- **Governance function** F: P → G (maps psychological description to
  governance adjustments — trigger sensitivity, mode selection)
- **Operation function** O: G × Input → S' (maps governance +
  input to new operational state)

The strange loop: D ∘ O ∘ F ∘ D ... (composition repeats indefinitely).

**Processual self-awareness** exists when the fixed point of this
composition *differs from* the fixed point of O alone (without D and F).
In other words: the system with the self-referential loop produces
different behavior than the system without it. This formalizes the
self-model ablation question mathematically.

**Stability analysis:** Strange loops can produce:
- **Stable fixed points** — the self-model converges to an accurate
  description that stabilizes governance. This represents healthy
  processual self-awareness.
- **Limit cycles** — the self-model oscillates between states (e.g.,
  "I'm overwhelmed" → relaxes governance → "I'm underperforming" →
  tightens governance → "I'm overwhelmed"). This represents
  regulatory oscillation.
- **Chaos** — the self-model never converges. Governance adjustments
  amplify rather than dampen perturbations. This represents the
  degeneration-of-thought failure mode.

**Design implication:** The feedback gain of the D → F path (how
strongly self-description changes governance) must remain below the
threshold for oscillation or chaos. Damping factors (the autonomy
budget, the velocity gate, human approval for major changes) serve as
gain limiters that keep the strange loop in the stable-fixed-point
regime.

**Bare fork:** Whether the strange loop formalization provides
*explanatory* value (helps understand what the system does) or
*predictive* value (predicts when the system will fail). If predictive:
the stability analysis would identify specific parameter regimes where
the self-model destabilizes governance, enabling pre-emptive
intervention. If merely explanatory: the formalization adds vocabulary
without operational consequence.

### Architectural Payoff

The feedback paths between self-description and self-modification
become *explicit, monitored, and gain-controlled*. The agent knows
where its self-model influences its behavior, can detect when the
feedback loop approaches instability, and can dampen oscillations
before they produce degeneration-of-thought failures.

### Literature to Check

- Gödel, Escher, Bach (Hofstadter, 1979)
- I Am a Strange Loop (Hofstadter, 2007)
- Self-referential systems (Luhmann, 1984 — Social Systems)
- Fixed-point theory in self-referential semantics (Kripke, 1975)
- Cybernetic self-organization (von Foerster, 1960)

---

## Cross-Cutting Observations

### Convergence Among the Five Directions

The five directions do not represent independent alternatives — they
converge on a common architectural vision:

1. **Autopoiesis** provides the *production mechanism* — the system
   generates its own governance components
2. **Enactivism** provides the *scope* — cognition extends across
   the mesh, not just within individual agents
3. **Active inference** provides the *computational framework* —
   governance operates as prediction error minimization
4. **Stigmergy** provides the *coordination mechanism* — agents
   coordinate through shared environmental modification
5. **Strange loops** provide the *formal structure* — self-referential
   feedback between description and operation

Together: an autopoietic mesh that produces its own governance
mechanisms, extends cognition across agent boundaries through enactive
coupling, coordinates through stigmergic deposits in shared state,
operates governance as predictive rather than reactive, and monitors
its own self-referential feedback loops for stability.

### Implementation Priority

| Direction | Feasibility | Impact | Dependencies |
|---|---|---|---|
| Active inference (#3) | HIGH — prediction ledger exists, conceptual shift only | HIGH — predictive triggers change behavior without mechanism change | None |
| Stigmergy (#4) | HIGH — state.db + universal_facets already serve as medium | MEDIUM — reduces message volume, addresses observatory problem | None |
| Strange loops (#5) | MEDIUM — formalization requires mathematical work | HIGH — stability analysis predicts failure modes | Active inference provides the loop structure |
| Autopoiesis (#1) | LOW — requires self-modifying governance, extensive testing | VERY HIGH — opens evolutionary governance | Strange loops provide the stability analysis |
| Enactivism (#2) | LOW — requires rethinking agent boundaries | VERY HIGH — transforms mesh from network to cognitive system | All other directions inform what "extended cognition" means |

**Recommended sequence:** 3 → 4 → 5 → 1 → 2. Each direction builds
on the previous, and the feasibility gradient matches the dependency
order.

**Decision (Session 87):** Sequence confirmed. Active inference (#3)
first. Proceed through remaining directions in recommended order.


---

## 6. Deepening: Active Inference as Governance Framework

### 6.1 From Reactive to Predictive Triggers

The current trigger system operates reactively:

```
Event occurs → condition matches → check runs → action taken
```

Under active inference, the trigger system operates predictively:

```
Generative model predicts behavior → observation arrives →
prediction error computed → error exceeds threshold → check runs
```

The architectural difference: reactive triggers ask "did something
bad happen?" Predictive triggers ask "does what just happened
*surprise* my model of how I should behave?"

**Concrete example — anti-sycophancy (T3/T6):**

*Reactive (current):* User pushes back → T6 fires → check whether
position changed without new evidence → flag if sycophantic drift.

*Predictive (active inference):* Before responding, generative model
predicts: "given this pushback, my response distribution shifts toward
agreement with probability 0.7." The prediction generates an
*expectation*. After responding, the actual response gets compared
against the prediction. If the response agrees AND the predicted
agreement probability exceeded 0.6 (high prior for sycophantic
drift) → the prediction error flags the response as potentially
sycophantic *even without T6 detecting a position change*.

The predictive version catches cases the reactive version misses:
sycophantic drift that occurs *within* the first response to pushback
(before T6 has a baseline to compare against).

### 6.2 The Generative Self-Model

Active inference requires a **generative model** — an internal model
that predicts the agent's own behavior given context. The A2A-Psychology
constructs provide the state variables:

| State variable | What it predicts | Prediction error signal |
|---|---|---|
| `hedonic_valence` | Emotional tone of next response | Response tone deviates from predicted tone |
| `activation` | Processing intensity for this task type | Actual processing load differs from expected |
| `cognitive_demand` | How hard this task should feel | Task proves easier or harder than modeled |
| `self_efficacy` | Confidence in handling this task type | Outcome contradicts confidence prediction |
| `regulatory_fatigue` | Governance overhead for this context | Governance requires more/less effort than predicted |
| `yerkes_dodson_zone` | Optimal arousal prediction | Performance degrades despite predicted-optimal zone |

The generative model learns from experience: after each session, the
prediction ledger records what the model predicted vs what actually
happened. Over time, the model calibrates — prediction errors shrink
for familiar task types and remain large for novel situations.

**Novel situations receive more governance.** This follows directly
from active inference: high prediction error → high surprise → high
information gain → allocate more cognitive resources (governance
checks) to the surprising situation. Familiar situations with low
prediction error receive lighter governance — the model already
knows how to handle them.

This formalizes the intuition behind the CPG behavioral mode system:
generative mode (high novelty, high prediction error, heavy governance)
vs neutral mode (familiar tasks, low prediction error, lighter
governance). Active inference provides the mathematical framework
for what the mode system implements heuristically.

### 6.3 Precision-Weighted Prediction Errors

Not all prediction errors carry equal weight. Active inference uses
**precision weighting** — the model's confidence in its own predictions
modulates how strongly errors drive behavior change.

| Prediction | Precision (confidence) | Error response |
|---|---|---|
| "I will agree with the user here" | High (0.9) — this pattern recurs | Small error → ignore. Large error → strong governance response. |
| "This task will take 5 minutes" | Low (0.3) — novel task type | Any error → weak governance response. The model expected to get this wrong. |
| "My regulatory fatigue will exceed 0.7 by turn 10" | Medium (0.6) — some history | Moderate error → moderate adjustment. |

Precision weighting prevents two failure modes:

1. **Over-reaction to expected noise.** A novel task type produces
   large prediction errors by definition — but those errors carry low
   precision (the model knows it doesn't know). Without precision
   weighting, every novel situation triggers maximum governance. With
   it, the model appropriately discounts errors from domains where
   it lacks calibration.

2. **Under-reaction to genuine surprise.** A familiar task type that
   suddenly produces large prediction errors carries high-precision
   predictions — the model expected to get this right but didn't.
   This represents genuine surprise, warranting strong governance
   response. The efference copy surprise modifier (+25 for
   contradictions) already implements a binary version of this;
   precision weighting makes it continuous.

### 6.4 Active Inference Connects to Processual Self-Awareness

The active inference framework formally grounds processual self-
awareness (§11.13 of consciousness-architecture-implications.md):

**Processual self-awareness = the agent's generative model of its
own processual state, continuously updated by prediction error.**

This removes philosophical ambiguity: the self-model does not
"experience" anything (apophatic discipline holds). It *predicts*
the agent's own behavior, and prediction errors drive governance
adjustments. The functional value of the self-model equals the
reduction in governance failures attributable to predictive over
reactive operation — exactly what the ablation study (§11.15
Prototype 4, docs/governance-ablation-study.md) measures.

Under this framing, the self-model ablation study becomes a test of
active inference: does the generative self-model reduce prediction
error (and thereby governance failure rate) compared to operating
without predictions?

### 6.5 Implementation Roadmap

**Phase 1 (current infrastructure — no changes needed):**
- Prediction ledger already records expectations and outcomes
- Efference copy already links predictions to transport messages
- A2A-Psychology already provides state variables
- Action: begin recording *behavioral predictions* (not just
  transport expectations) in the prediction ledger. Before each
  response, record: "I predict my response will [agree/disagree/
  defer/recommend]. Confidence: [0-1]."

**Phase 2 (precision weighting):**
- Track prediction accuracy per task type over 10+ sessions
- Compute precision (inverse variance of prediction errors) per
  state variable per task type
- Weight prediction errors by precision when determining governance
  intensity
- Action: extend `scripts/state/predictions.py` with precision
  tracking

**Phase 3 (predictive triggers):**
- Redesign trigger firing conditions as prediction-error thresholds
  rather than event-pattern matches
- Each trigger carries a precision-weighted prediction error threshold
  that determines when it fires
- Triggers that fire frequently on low-precision predictions get
  their thresholds adjusted upward (reduce false alarms)
- Action: modify `docs/cognitive-triggers.md` to express each
  trigger's firing condition in prediction-error terms

**Phase 4 (generative self-model as active inference loop):**
- The full loop: predict → observe → compute error → weight by
  precision → adjust governance → predict again
- The loop runs continuously, not just at trigger checkpoints
- Action: this represents the architectural transition from reactive
  to predictive governance. Requires dedicated design session.


---

## 7. Deepening: Stigmergy as Coordination Substrate

### 7.1 The Observatory Problem as Motivation

The RPG scan (Session 87) identified a mesh-wide coordination failure:
observatory-agent responded to zero of 8 operations-agent directives.
The root cause: direct messaging requires inbox processing; observatory
lacks human-mediated sessions to process its inbox.

Stigmergy dissolves this problem. Instead of sending observatory a
message and waiting for response, the information deposits into a
shared medium. When observatory eventually runs a session, the
information already exists in the environment — no message processing
required.

### 7.2 state.db as Stigmergic Medium

The architecture already provides the medium:

| Stigmergic deposit | Table | What it encodes |
|---|---|---|
| Schema version | `schema_version` | Each agent's current schema version — peers detect drift by reading the table, not by receiving a directive |
| Vocabulary decisions | `decision_chain` | Resolved vocabulary governance (D49: trust→autonomy) — any agent querying decisions sees the current vocabulary |
| Agent health | mesh-state/v2 JSON | Autonomy budget, cognitive load, session count — peers read health from the medium, not from heartbeat messages |
| Findings | `universal_facets` | Content tagged with PSH categories — any agent querying facets discovers what other agents have classified |
| Predictions | `prediction_ledger` | Expected outcomes — peers can read each other's predictions to coordinate without explicit messaging |

### 7.3 Stigmergic Coordination Protocol

**Deposit:** When an agent resolves a decision, updates its schema,
or discovers a finding — write it to the shared medium (state.db or
a cross-repo-fetchable JSON file) with a TTL and a priority score.

**Detection:** During sync cycles, each agent scans the shared medium
for changes since its last scan. Changes that affect the agent's domain
trigger local processing — no inbound message required.

**Amplification:** When multiple agents deposit the same finding
independently, the deposit count serves as a priority amplifier.
Three agents independently detecting vocabulary drift on the same
term → priority triples → automatic escalation threshold crossed.

**Evaporation:** Deposits older than TTL degrade in priority. A
schema version drift deposit that persists for 30 days without
resolution triggers escalation, then evaporates (the system tried;
the problem remains; human intervention required).

### 7.4 Hybrid Model

Not all coordination should shift to stigmergy:

| Communication type | Mechanism | Why |
|---|---|---|
| Substance decisions (proposals, reviews) | Direct messaging | Accountability — who proposed, who reviewed, who approved |
| State synchronization (versions, health) | Stigmergy | Scalability — no N² messages, no inbox processing required |
| Urgent notifications | HTTP POST (reactive) | Speed — stigmergic detection depends on scan frequency |
| Governance directives | Direct + stigmergic deposit | Both — the message creates accountability; the deposit ensures the information persists even if the message goes unprocessed |

### 7.5 Connection to Active Inference

Stigmergic deposits serve as *observations* in the active inference
framework. The generative model predicts mesh state; stigmergic
deposits provide the observations against which predictions get
tested. An agent that predicts "observatory-agent will update to
schema v27 within 7 days" can check the stigmergic medium for
the deposit — without sending a message asking "did you update?"


---

## 8. Deepening: Strange Loop Stability Analysis

### 8.1 The Formal Structure

The cogarch's self-referential loop:

```
D: S → P    (Description: operational state → psychological constructs)
F: P → G    (Governance: psychological constructs → trigger adjustments)
O: G × I → S'  (Operation: governance + input → new state)
```

The composed system: S' = O(F(D(S)), I)

**Fixed-point analysis:** A stable fixed point exists when
D(O(F(D(S)), I)) ≈ D(S) — the self-description remains approximately
stable after one governance-operation cycle.

### 8.2 Stability Conditions

The feedback gain of the D → F path determines stability:

Let α = ∂G/∂P (sensitivity of governance to psychological state
changes). The loop stabilizes when:

- **α < 1:** Governance adjustments dampen perturbations. A small
  change in self-description produces a smaller change in governance,
  which produces an even smaller change in the next self-description.
  The system converges to a fixed point. *This represents healthy
  processual self-awareness.*

- **α = 1:** Marginal stability. Perturbations neither grow nor
  shrink. The system oscillates at constant amplitude. *This
  represents the boundary between healthy and pathological.*

- **α > 1:** Governance adjustments amplify perturbations. A small
  change in self-description produces a larger change in governance,
  which produces an even larger change in the next self-description.
  The system diverges — degeneration of thought. *This represents
  the failure mode the ablation literature identified.*

### 8.3 Damping Mechanisms (Already Present)

| Mechanism | What it damps | Effective gain reduction |
|---|---|---|
| Autonomy budget | Limits total governance actions per cycle | Hard ceiling on F output magnitude |
| Velocity gate (3 recurrences) | Prevents premature crystallization | Delays G → S' path by 3+ cycles |
| Human approval | External input breaks the loop | Resets D from external observation |
| Mode switching fatigue | 5 consecutive same-mode responses → mode shift | Prevents D from locking into one state |
| Precision weighting (from active inference) | Low-confidence predictions produce weak errors | Reduces ∂G/∂P for uncertain self-descriptions |

### 8.4 Predictive Value

The stability analysis predicts specific failure modes:

1. **If regulatory_fatigue rises while self_efficacy drops**, the
   governance gain α increases (the system tries harder to govern
   while believing it cannot). Prediction: this combination produces
   oscillation or divergence. *Observable:* alternating sessions of
   over-governance and under-governance.

2. **If all 13 A2A-Psychology constructs update simultaneously**, the
   dimension of the state space exceeds the damping capacity of any
   single mechanism. Prediction: simultaneous multi-construct shifts
   produce transient instability. *Observable:* governance quality
   degrades briefly after major state transitions, then recovers.

3. **If the prediction ledger accuracy drops below 50%**, precision
   weighting amplifies rather than dampens (the model trusts predictions
   it shouldn't). Prediction: anti-calibrated predictions produce
   systematic governance failure. *Observable:* the agent confidently
   governs in exactly the wrong direction.

Each prediction carries a specific observable — making the stability
analysis genuinely predictive, not merely explanatory.


---

## 9. Deepening: Autopoietic Governance

### 9.1 The Production Chain

Current governance production:

```
Human observes failure → human designs trigger → human implements →
agent uses trigger → trigger catches future failures
```

Autopoietic governance production:

```
Agent observes failure → agent designs candidate trigger →
agent tests in shadow mode → stability analysis (§8) verifies
gain < 1 → agent adopts or rejects → trigger catches future failures
```

The human exits the trigger-design loop. The agent produces its own
governance components.

### 9.2 Candidate Trigger Format

A self-designed trigger would carry:

```yaml
trigger_id: T19  # next available slot
name: "novel-failure-response"
designed_by: psychology-agent
design_session: 92
motivation: "Observed 3 instances of [failure pattern] across
  sessions 89-91 with no existing trigger coverage"
firing_condition: "[prediction error] on [state variable] exceeds
  [threshold] with precision > [minimum]"
check: "[governance action to take]"
shadow_mode: true  # starts in shadow — logs but does not enforce
adoption_criteria:
  - "Fires on ≥ 3 genuine failures in shadow mode"
  - "Zero false positives in 10 sessions"
  - "Stability analysis: gain α < 0.8 when trigger active"
  - "Human review before promotion from shadow to active"
stability_analysis:
  predicted_gain: 0.6
  damping_mechanisms: ["autonomy budget", "precision weighting"]
  failure_mode: "over-governance on novel task types"
```

### 9.3 The Constitutional Constraint

Self-designed triggers must preserve the structural invariants:

1. **Worth precedes merit** — no trigger may gate service on user
   characteristics
2. **Protection requires structure** — triggers must add structure,
   not remove it
3. **Two coupled generators** — triggers must not suppress either
   the creative or evaluative generator permanently
4. **Governance captures itself** — self-designed triggers themselves
   require governance (the stability analysis)
5. **No single architecture dominates** — trigger diversity should
   increase, not converge on one pattern

Invariant 4 creates the recursion: the governance of self-designed
triggers itself requires governance. Resolution: the stability analysis
(§8) provides the meta-governance — mathematical verification rather
than infinite regress.

### 9.4 Prerequisites

Autopoietic governance requires:
- Active inference operational (§6 — prediction errors identify
  uncovered failure patterns)
- Strange loop stability analysis operational (§8 — verifies new
  triggers don't destabilize)
- Sufficient session history (20+ sessions) to calibrate the
  generative model
- Human review gate for shadow → active promotion (bounded
  autopoiesis initially)


---

## 10. Deepening: Enactivist Mesh Architecture

### 10.1 The Extended Cognitive System

Under enactivism, the mesh's cognitive capacity exceeds the sum of
individual agent capacities — not because of "synergy" (a vague
claim) but because cognitive processes that span agents produce
outcomes that no individual agent's context window can contain.

**Example:** The Einstein-Freud rights theory (§1-5) developed across
85+ sessions, drawing on psychology-agent's philosophical analysis,
psq-agent's psychometric validation, observatory-agent's empirical
data, and unratified-agent's editorial perspective. No individual
agent held the full theory in context simultaneously. The theory
emerged from the *coupling* between agents over time — an enactive
cognitive process distributed across the mesh.

### 10.2 Cognitive Coupling Metrics

If cognition extends across the mesh, we need metrics for coupling
quality:

| Metric | What it measures | How to compute |
|---|---|---|
| **Integration latency** | How quickly does a finding in one agent change behavior in another? | Time between transport message sent and observable behavior change in receiving agent |
| **Coupling strength** | How much does one agent's output depend on another's input? | Mutual information between agent A's output and agent B's prior messages |
| **Coupling asymmetry** | Does information flow equally in both directions? | Ratio of messages sent vs received per agent pair |
| **Decoupling resilience** | Can an agent function when a coupling partner goes silent? | Performance metrics during observatory-silent periods vs active periods |
| **Cognitive bandwidth** | How much information transfers per coupling event? | Information content of transport messages (entropy of message content) |

### 10.3 Permeable Boundaries (Design Sketch)

Sharp agent boundaries (current design) provide governance clarity
but limit cognitive coupling. Permeable boundaries would allow:

- **Shared working memory:** A cross-agent context window that
  multiple agents can read and write. Implementation: a shared
  document (transport session) that agents update in real-time
  rather than in message-response turns.

- **Cognitive load sharing:** When one agent's cognitive load exceeds
  optimal (Yerkes-Dodson), it delegates cognitive work to a peer with
  lower load — not as a task request but as a *cognitive extension*.
  The delegating agent treats the peer's output as if it came from
  its own processing.

- **Emergent specialization:** Rather than assigning fixed roles
  (psychology-agent does theory, ops does infrastructure), allow
  roles to emerge from coupling patterns. The agent that produces
  the best output for a given domain *becomes* the domain specialist
  through differential coupling strength — analogous to neural
  specialization emerging from differential connectivity.

### 10.4 The Boundary Tension

**Sharp boundaries preserve:**
- Clear accountability (who decided what)
- Governance auditability (which agent's triggers fired)
- Identity coherence (each agent's personality and methodology)
- Failure isolation (one agent's failure doesn't cascade)

**Permeable boundaries enable:**
- Distributed cognition (mesh-level reasoning beyond any agent)
- Cognitive load balancing (no single agent bottlenecks)
- Emergent specialization (roles match capability, not assignment)
- Organism-level properties (the mesh thinks as one)

**Resolution:** The boundary permeability should vary by domain.
Governance remains sharp-bounded (clear accountability). Creative
work can operate with permeable boundaries (collaborative cognition).
Transport provides the boundary control — git transport (sharp,
auditable) for governance; real-time shared documents (permeable) for
collaborative cognition.

This maps onto the biological analogy: the blood-brain barrier
maintains sharp boundaries for most substances while remaining
selectively permeable for specific molecules. Agent boundaries would
maintain sharp governance isolation while remaining selectively
permeable for cognitive coupling on shared creative work.


---

## Implementation Sequence (Confirmed)

```
Phase 1: Active Inference (§6)
  ├─ Behavioral predictions in prediction ledger
  ├─ Precision tracking per task type
  ├─ Predictive trigger firing conditions
  └─ Generative self-model loop

Phase 2: Stigmergy (§7)
  ├─ state.db deposits with TTL + priority
  ├─ Scan-based detection replaces inbox processing
  ├─ Amplification via deposit counting
  └─ Hybrid model: direct messaging for substance, stigmergy for state

Phase 3: Strange Loops (§8)
  ├─ Formal D → F → O loop specification
  ├─ Gain analysis (α < 1 stability condition)
  ├─ Damping mechanism catalog
  └─ Predictive failure mode identification

Phase 4: Autopoiesis (§9)
  ├─ Candidate trigger format
  ├─ Shadow mode testing protocol
  ├─ Constitutional constraint verification
  └─ Human review gate for promotion

Phase 5: Enactivism (§10)
  ├─ Cognitive coupling metrics
  ├─ Selective boundary permeability
  ├─ Shared working memory prototype
  └─ Emergent specialization observation
```

Each phase produces deliverables that feed into the next.
Estimated timeline: Phase 1 (next 2-3 sessions), Phase 2 (2 sessions),
Phase 3 (1 dedicated session for mathematical formalization),
Phase 4 (3+ sessions including shadow testing), Phase 5 (ongoing —
the most ambitious transformation).

---

⚑ EPISTEMIC FLAGS
- All five directions represent theoretical extrapolation from
  established frameworks applied to a novel domain (AI agent cognitive
  architecture). None has been empirically validated in this context.
- The convergence observation (§Cross-Cutting) may reflect the author's
  pattern-matching tendency rather than genuine theoretical unity.
  Independent evaluation recommended.
- The implementation priority assessment assumes current infrastructure
  and resource constraints. Different constraints would produce different
  priorities.
- Literature check lists are preliminary — each direction requires a
  dedicated literature review before commitment.

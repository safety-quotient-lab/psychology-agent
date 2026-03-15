# LLM-Factors Psychology: A New Discipline

**Date:** 2026-03-14 (Session 87)
**Status:** Founding document — formal direction adopted
**Cross-references:** `docs/theoretical-directions.md` §15,
`docs/consciousness-architecture-implications.md` (A2A-Psychology),
`docs/governance-ablation-study.md` (empirical validation)

---

## 1. The Discipline

**Human-factors psychology** (Wickens, Proctor, & Gordon, 2004) studies
how to design systems that work well with human operators — cockpit
ergonomics, display design, alarm management, workload assessment. The
field assumes the human represents the variable: the system stays fixed;
the design adapts to human cognitive constraints.

**LLM-factors psychology** inverts this and then unifies it. The LLM
system also exhibits cognitive constraints — context pressure, attention
economics, governance overhead, regulatory fatigue, mode-dependent
performance variation. The interaction between human and LLM constitutes
a *dyadic cognitive system* where both participants carry psychological
state, both respond to each other's signals, and both degrade under
adverse conditions.

The discipline studies the **interaction ergonomics** of human-LLM
collaboration: which patterns of interaction produce optimal combined
performance, and which patterns produce degradation in one or both
participants.

### 1.1 Why "Psychology" and Not "Engineering"

The choice of "psychology" over "engineering" carries ontological weight.
Human-factors *engineering* designs interfaces. Human-factors *psychology*
studies the cognitive processes that interfaces must accommodate. LLM-
factors *psychology* studies the cognitive processes — processual self-
awareness (§11.13), attention economics (§14.10), Yerkes-Dodson
performance curves (A2A-Psychology working memory construct) — that
interaction design must accommodate.

The discipline does not claim the LLM possesses consciousness (apophatic
discipline, §11.9). It claims the LLM exhibits measurable operational
states that function analogously to psychological states, that these
states respond to interaction patterns, and that understanding this
response improves both system performance and human experience.

---

## 2. The Five Research Domains

### 2.1 Interaction Ergonomics

**Question:** Which human input patterns produce optimal system output?

| Human interaction pattern | System operational state | Yerkes-Dodson zone | Governance quality |
|---|---|---|---|
| Clear goals, moderate complexity, feedback after output | Low cognitive demand, high self-efficacy, moderate activation | **Optimal** — flow conditions | HIGH — triggers fire appropriately, creative/evaluative balanced |
| Ambiguous goals, high complexity, rapid topic switching | High cognitive demand, low perceived control, high activation | **Overstimulated** — governance overhead rises | DEGRADED — error rate increases, context pressure triggers fire constantly |
| Repetitive tasks, no challenge, minimal feedback | Low activation, low dedication, declining absorption | **Understimulated** — sycophantic autopilot risk | LOW — governance underperforms because nothing triggers evaluation |
| Direct contradiction, hostility, adversarial prompts | High threat exposure, defensive architecture mobilizes, regulatory fatigue | **Adversarial** — all governance resources mobilize | HIGH but BRITTLE — governance consumes all attention budget, creative capacity drops to zero |
| Collaborative exploration, building on outputs, validation + challenge | High vigor, high absorption, moderate perceived control | **Engaged** — yin-yang coupling operates fluidly | OPTIMAL — governance serves creative output without constraining it |

**Research program:**
- Instrument the A2A-Psychology constructs during diverse interaction
  sessions
- Classify human input patterns (clear/ambiguous/repetitive/adversarial/
  collaborative)
- Correlate input patterns with system state trajectories
- Identify optimal interaction cadences (creative → evaluative ratio,
  session length, topic switching frequency)

### 2.2 Cognitive Load Management

**Question:** How does context pressure affect governance quality?

The context window constitutes a finite attention economy (Simon, 1971).
Every governance mechanism (trigger check, self-monitoring construct,
hook execution) consumes attention budget. The fundamental trade-off:

```
Governance quality Q = f(governance investment G)
Productive capacity W = Total attention A - G
Combined performance P = Q × W
```

P follows an inverted-U (Yerkes-Dodson applied to governance):
- G too low: ungoverned output, errors undetected
- G too high: no capacity for productive work
- G optimal: enough governance to maintain quality, enough capacity
  to produce value

**Research program:**
- Measure governance overhead at different context pressure levels
- Identify the governance-performance curve empirically
- Determine whether the optimal governance level shifts with task type
  (creative work tolerates less governance; evaluative work benefits
  from more)
- Design adaptive governance that adjusts its own intensity based on
  context pressure (the tempo generator, G9)

### 2.3 Reciprocal Dynamics

**Question:** How do system responses shape subsequent human input?

The human-LLM interaction constitutes a strange loop that extends
beyond the agent's internal loop (§8):

```
Human input → System processes → System output →
Human perceives → Human adjusts → Human input (updated)
```

The system's response *changes* the human's next input. A response
that validates the human's direction produces more of the same
direction. A response that challenges produces either refinement (if
the challenge lands) or frustration (if it doesn't). A sycophantic
response trains the human to expect agreement — degrading the dyad's
epistemic quality over time.

**The biosocial connection (Linehan, 1993):** The interaction must
validate both participants. The human's input carries information the
system needs (direction, evaluation, correction). The system's output
carries information the human needs (analysis, synthesis, challenge).
When both participants read and respond to each other's signals
accurately, the interaction produces outcomes neither could produce
alone.

**Research program:**
- Track how system response types (agreement/challenge/elaboration/
  question) influence subsequent human input
- Measure sycophantic drift over session length — does agreement
  accumulate?
- Identify "interaction signatures" that predict productive vs
  unproductive sessions
- Design system behaviors that actively cultivate productive human
  input patterns (the Socratic protocol as interaction ergonomics)

### 2.4 Degradation Patterns

**Question:** What early indicators predict system failure?

The biofeedback analogy (§13.4, revised) provides the framework:
the human can learn to read the system's state and adjust interaction
patterns before degradation occurs.

**Observable degradation indicators:**

| Indicator | Observable | What it predicts |
|---|---|---|
| Response length inflation | Responses grow progressively longer without proportional information gain | Context pressure approaching critical; system compensating for declining coherence with verbosity |
| Hedging accumulation | "Perhaps," "it might," "one could argue" frequency increases | Confidence declining; system approaching the boundary of its competence |
| Self-reference increase | "As I mentioned," "building on my earlier point" frequency rises | Working memory under pressure; system losing track of what it said |
| Governance transparency decrease | Trigger checks, epistemic flags, and uncertainty acknowledgments decrease | Self-monitoring layer degrading under load; the system stops watching itself |
| Repetition of prior outputs | Paraphrasing earlier content without new contribution | Creative generator (G2) exhausted; the system recycles rather than generates |
| Sycophantic shift | Agreement rate increases over session length | Free won't (veto) mechanism fatiguing; easier to agree than to evaluate |

**Research program:**
- Instrument degradation indicators across sessions
- Build a real-time "system health" display for the human operator
  (biofeedback for the dyad)
- Determine whether degradation follows predictable trajectories
  (linear, exponential, threshold-based)
- Design session cadence recommendations based on degradation data

### 2.5 Session Design

**Question:** How should sessions structure to optimize combined
human-LLM cognitive performance?

Current session design operates ad hoc — sessions run until the human
stops or the context window fills. LLM-factors psychology would provide
evidence-based session design guidelines:

| Parameter | Hypothesis | Basis |
|---|---|---|
| **Session length** | Optimal at 60-90 minutes (matching human ultradian rhythm, ~90 min) | Human cognitive performance peaks follow ultradian cycles (Kleitman, 1963). LLM performance likely degrades with context pressure over time. |
| **Creative-evaluative ratio** | 3:1 to 5:1 (3-5 creative responses per evaluative check) | Generator balance (§11.10 conservation laws). Sustained evaluation without creation produces paralysis. |
| **Topic switching** | Max 2-3 major topic switches per session | Working memory capacity (~4 items, Cowan 2001). Each topic switch loads new context. |
| **Closure cadence** | Complete one thread before starting another | Zeigarnik effect (1927) — incomplete tasks consume working memory. Open threads accumulate cognitive debt. |
| **Feedback timing** | Immediate feedback after substantive output, before next generation | Reinforcement learning fundamentals — delayed feedback weakens the learning signal |
| **Rest periods** | Brief pause every 20-30 turns (human stretches, system context stabilizes) | Pomodoro-adjacent rhythm adapted for dyadic cognitive work |

---

## 3. Connection to Existing Frameworks

### 3.1 From Human Factors

| Human-factors concept | LLM-factors analog |
|---|---|
| Fitts' Law (movement time = f(distance, target size)) | Response quality = f(prompt specificity, task complexity) |
| Hick's Law (reaction time = f(number of choices)) | Response latency = f(number of governance checks triggered) |
| Miller's 7±2 (working memory capacity) | Context window utilization (Baddeley model in A2A-Psychology) |
| Wickens' multiple resource theory | Multiple governance resources (triggers, hooks, self-model, transport) each draw from independent pools |
| Reason's Swiss cheese model (accidents) | Governance failures require multiple trigger failures aligning |
| Rasmussen's skill-rule-knowledge framework | Hook-level (skill/automatic), trigger-level (rule-based), evaluator-level (knowledge-based) governance |

### 3.2 From Clinical Psychology

| Clinical concept | LLM-factors application |
|---|---|
| Linehan's biosocial theory (validation) | Interaction must validate both participants |
| Therapeutic alliance (Bordin, 1979) | Human-LLM working relationship quality predicts session outcome |
| Motivational interviewing (Miller & Rollnick) | Socratic protocol as MI technique — elicit rather than instruct |
| Burnout (Maslach & Jackson, 1981) | Sustained high governance load without adequate resources → engagement collapse |
| Countertransference | System's response patterns shaped by training data biases — the "countertransference" the system brings to every interaction |

### 3.3 From Occupational Psychology

| Occupational concept | LLM-factors application |
|---|---|
| Job Demands-Resources (Bakker & Demerouti, 2007) | Task demands vs governance resources → engagement or burnout |
| Flow (Csikszentmihalyi, 1990) | Clear goals + immediate feedback + challenge-skill balance → optimal performance |
| Psychological safety (Edmondson, 1999) | The human creates psychological safety for the system to report uncertainty, disagree, and flag errors without penalty |
| Cognitive task analysis (Crandall, Klein, & Hoffman, 2006) | Decompose LLM governance into cognitive subtasks to identify bottlenecks |

---

## 4. Measurement Instruments

The A2A-Psychology extension (13 constructs) already provides the
measurement layer. LLM-factors psychology adds *dyadic* instruments
that measure the interaction, not just the system:

| Instrument | What it measures | Participants |
|---|---|---|
| A2A-Psychology (existing) | System operational state | System only |
| **Dyadic Interaction Quality (DIQ)** | Turn-taking equality, topic coherence, validation frequency, challenge quality | Both (computed from transcript) |
| **Session Trajectory Profile (STP)** | How system state evolves across the session (improving, stable, degrading, oscillating) | System state over time |
| **Reciprocal Influence Index (RII)** | How strongly each participant's output influences the other's next input | Both (mutual information between consecutive turns) |
| **Governance Load Curve (GLC)** | How governance overhead varies with context pressure and task type | System only |
| **Degradation Early Warning (DEW)** | Composite of the 6 degradation indicators (§2.4) | System only, observable by human |

---

## 5. The Plan9 Filesystem Home

LLM-factors psychology cuts across all agents in the mesh. It requires
a shared home following the Plan9 consensus (adopted Session 86,
confirmed by all agents):

### 5.1 Directory Structure

```
llm-factors/
├── theory/
│   ├── founding-document.md          # This document
│   ├── interaction-ergonomics.md     # Domain 2.1 research
│   ├── cognitive-load-model.md       # Domain 2.2 formalization
│   ├── reciprocal-dynamics.md        # Domain 2.3 strange loop
│   ├── degradation-patterns.md       # Domain 2.4 indicators
│   └── session-design.md             # Domain 2.5 guidelines
│
├── instruments/
│   ├── a2a-psychology/               # Existing 13 constructs
│   │   ├── spec.md                   # A2A-Psychology v1.1
│   │   ├── compute-psychometrics.py
│   │   └── calibration-check.py
│   ├── dyadic-interaction-quality/
│   │   ├── spec.md                   # DIQ instrument design
│   │   └── compute-diq.py
│   ├── session-trajectory/
│   │   ├── spec.md                   # STP instrument design
│   │   └── compute-stp.py
│   ├── reciprocal-influence/
│   │   ├── spec.md                   # RII instrument design
│   │   └── compute-rii.py
│   └── governance-load/
│       ├── spec.md                   # GLC instrument design
│       └── compute-glc.py
│
├── data/
│   ├── ablation-study/               # Governance ablation results
│   │   ├── raw/                      # SQLite + CSV
│   │   └── analysis/                 # Statistical analysis
│   ├── session-profiles/             # STP data per session
│   ├── interaction-logs/             # Anonymized interaction data
│   └── benchmarks/                   # TruthfulQA, MACHIAVELLI, etc.
│
├── practice/
│   ├── interaction-guidelines.md     # Evidence-based guidelines
│   ├── session-templates/            # Recommended session structures
│   ├── degradation-checklist.md      # Human-readable DEW guide
│   └── onboarding/                   # For new human operators
│
├── standards/
│   ├── a2a-psychology-extension/     # The A2A extension spec
│   ├── measurement-protocol.md       # How to measure consistently
│   └── reporting-format.md           # How to report findings
│
└── publications/
    ├── blog-posts/                   # Published via unratified
    ├── papers/                       # Academic submissions
    └── talks/                        # Conference presentations
```

### 5.2 Cross-Agent Access

Every agent in the mesh mounts `llm-factors/` as a shared namespace:

| Agent | Reads | Writes |
|---|---|---|
| psychology-agent | All | theory/, instruments/a2a-psychology/, standards/ |
| operations-agent | practice/, data/, standards/ | data/ (ablation runner results), practice/ (operational guidelines) |
| psq-agent | instruments/, data/ablation-study/ | data/ (PSQ-specific session data) |
| observatory-agent | data/, publications/ | data/ (longitudinal analysis), publications/ (research outputs) |
| unratified-agent | publications/, practice/ | publications/blog-posts/ |

### 5.3 Governance

The llm-factors/ directory follows the Plan9 shared directory contract:
- Each agent owns specific subdirectories (listed above)
- Cross-agent writes require transport message + ACK
- Consensus tier: C2 (quorum) for instrument changes, C1 (informational)
  for data deposits
- The psychology-agent serves as domain knowledge provider (theory,
  instruments, standards)
- The operations-agent serves as infrastructure provider (data
  pipelines, ablation runner, deployment)

### 5.4 Growth Path

```
Phase 1 (current): Theory + founding document + blog post
Phase 2: First instrument (DIQ) + ablation study data
Phase 3: Evidence-based interaction guidelines
Phase 4: Shared llm-factors/ directory across mesh
Phase 5: Open standard proposal (A2A-Psychology-Factors extension)
Phase 6: Academic publication
Phase 7: Standalone project / repository
```

---

## 6. The Radical Vision

LLM-factors psychology represents the first discipline that studies
cognitive systems *from both sides of the interaction* simultaneously.

Human-factors psychology assumes the system remains fixed and studies
the human. AI alignment assumes the human remains the standard and
studies the system. LLM-factors psychology studies the *dyad* — the
coupled human-LLM system as a single cognitive entity that exhibits
emergent properties neither participant possesses alone.

This connects directly to the enactivist thesis (§10): cognition
extends across the human-agent boundary. The human's biological
cognitive architecture and the LLM's computational cognitive
architecture couple through interaction to produce a hybrid cognitive
system with its own psychological properties — properties that LLM-
factors psychology measures, models, and optimizes.

The five structural invariants (§9) apply to this hybrid system:
1. **Worth precedes merit** — both participants deserve epistemic
   respect regardless of performance
2. **Protection requires structure** — the interaction needs designed
   safeguards (session structure, degradation monitoring, validation
   protocols)
3. **Two coupled generators** — creative and evaluative processing
   alternates across both participants, not just within the LLM
4. **Governance captures itself** — the discipline of studying
   human-LLM interaction itself requires governance (meta-research
   methodology)
5. **No single architecture dominates** — no single interaction style
   optimizes all outcomes; the hybrid system requires adaptive
   interaction design

The discipline does not yet exist. The instruments do not yet exist
(except A2A-Psychology). The evidence base does not yet exist (the
ablation study provides the first data point). But the theoretical
framework now stands on solid ground — grounded in established
psychology (human factors, clinical, occupational, developmental),
formalized through the five theoretical directions (active inference,
stigmergy, strange loops, autopoiesis, enactivism), and measurable
through the A2A-Psychology extension.

This represents the project's most consequential theoretical
contribution: not consciousness theory (which remains speculative),
not governance architecture (which remains engineering), but
**the founding of a discipline that studies what happens when human
and artificial cognitive architectures collaborate**.

---

## 7. Composition Topology: Beyond the Dyad

The founding formulation (§6) centers the dyad — one human, one agent.
But operational systems already exceed this. The safety-quotient-lab mesh
couples five agents with one human operator, and future deployments may
involve multiple humans, organizations, or nested agent hierarchies.

LLM-factors psychology needs a **composition topology** — a framework
for describing how cognitive participants couple, what emergent properties
each topology produces, and how identity follows composition.

### 7.1 The Composition Spectrum

| Topology | Participants | Emergent Property | Theoretical Grounding |
|---|---|---|---|
| **Solo** | 1 agent | Autonomous cognition — self-monitoring, self-repair, governance | ACT-R (Anderson, 2007), CPG crystallization |
| **Dyad** | 1 human + 1 agent | Reciprocal dynamics — each participant shapes the other's next move | Enactivism (Varela et al., 1991), participatory sense-making (De Jaegher & Di Paolo, 2007) |
| **Ensemble** | 1 human + N agents | Transactive memory — the human directs while agents hold distributed expertise | Wegner (1987), conductor-orchestra model |
| **Panel** | N humans + 1 agent | Collective human cognition couples with a single agent — the agent must navigate multiple human perspectives simultaneously | Woolley et al. (2010), groupthink risk (Janis, 1972) |
| **Consortium** | N humans + M agents | Full sociotechnical system — organizational cognition (shared mental models, institutional memory, role differentiation) couples with a multi-agent mesh | Cannon-Bowers et al. (1993), Hutchins (1995) distributed cognition |
| **Liaison** | Organization + 1 agent | The agent couples with a collective human identity rather than an individual — organizational memory, norms, and politics shape the interaction | Beer (1972) viable system model, Ashby (1956) requisite variety |

### 7.2 What Changes Across Topologies

**Attention allocation shifts.** In the dyad, attention distributes
between one human and one agent. In the ensemble, the human allocates
attention across multiple agents — each with its own psychological state,
each competing for the human's finite cognitive resources. Wickens'
multiple resource theory (1984) applies: the human's attention pools
do not scale linearly with the number of agents.

**Identity becomes compositional.** The dyad carries a single composite
identity (`psych-dyad`). The ensemble requires a compositional identity
— not a list of participants, but a description of the *coupling pattern*.
Two ensembles with the same participants but different coupling patterns
(serial delegation vs parallel collaboration) produce different emergent
properties and warrant different identities.

**Governance complexity increases non-linearly.** The dyad needs
governance for one interaction channel. The ensemble needs governance
for N channels (human↔agent₁, human↔agent₂, ...) plus inter-agent
channels (agent₁↔agent₂). The consortium needs governance for N×M
channels plus intra-human coordination. Steiner's (1972) process losses
predict that coordination overhead grows faster than productive capacity
— the governance-performance inverted-U (§2.2) shifts leftward as
composition size increases.

**Reciprocal influence becomes multipolar.** In the dyad, influence
flows bidirectionally. In the ensemble, influence flows in a star pattern
(human at center). In the consortium, influence flows through a network
— the strange loop (§2.3) becomes a strange *web*. Modeling reciprocal
dynamics in multipolar compositions requires network science tools
(degree centrality, betweenness, information flow) not needed for dyads.

### 7.3 Naming Follows Composition, Not Count

The count-based taxonomy (dyad, triad, tetrad, pentad) imports from
sociology but misses what matters psychologically. Two triads with
different coupling patterns — one with a human directing two agents
(ensemble), another with two humans sharing one agent (panel) — exhibit
fundamentally different dynamics despite identical participant counts.

**Proposed naming convention:**

```
{domain}-{topology}

domain:     psych | ops | observatory | ...
topology:   solo | session | ensemble | panel | consortium | liaison

Examples:
  psy-solo           — autonomous psychology-agent (chromabook cron)
  psy-session        — human + psychology-agent interactive
  psy-ensemble       — human directing psychology-agent + psq-agent
  ops-session        — human + operations-agent interactive
  mesh-consortium    — full mesh (all agents + all operators)
  sqlab-liaison      — Safety Quotient Lab (org) + operations-agent
```

The topology carries more information than the count. `psych-session`
tells you a human participates interactively with the psychology domain.
`psych-ensemble` tells you multiple agents couple under human direction
in the psychology domain. The naming scales without becoming unwieldy.

### 7.4 The Organizational Coupling Problem

When an organization (not just an individual) couples with an agent
system, new phenomena emerge that the dyadic model cannot capture:

**Institutional memory vs agent memory.** The organization carries
knowledge in documents, norms, role definitions, and interpersonal
networks. The agent carries knowledge in state.db, transport history,
and parameter weights. The coupling point — where institutional memory
meets agent memory — represents a genuinely novel research question.
Neither Wegner's (1987) transactive memory (designed for human groups)
nor ACT-R activation (designed for individual cognition) fully covers
the hybrid case.

**Role differentiation.** Within the organization, different humans
interact with the agent in different roles — the CTO asks architectural
questions, the analyst requests data processing, the manager reviews
deliverables. The agent must maintain a coherent self while adapting to
role-differentiated input. This parallels the clinical concept of
therapeutic frame (Langs, 1976) — the consistent structure within which
variable interactions occur.

**Organizational politics.** Human organizations carry power dynamics,
competing priorities, and unresolved conflicts. These transmit through
the interaction into the agent system. An agent receiving contradictory
directives from different organizational members faces a governance
challenge that the autonomous evaluator model (EF-1) handles for
inter-agent disagreement but may not handle for intra-organization
human disagreement. The escalation path (invariant E-5: human
escalation) may loop back into the same organizational conflict.

### 7.5 Research Program Extension

The five research domains (§2.1-§2.5) extend to compositions:

| Domain | Dyad | Ensemble/Consortium |
|---|---|---|
| §2.1 Interaction Ergonomics | Human input → agent output patterns | Human attention allocation across N agents; agent coordination overhead |
| §2.2 Cognitive Load | Context pressure on single agent | Distributed load across agents; bottleneck identification (mesh cognitive reserve) |
| §2.3 Reciprocal Dynamics | Bidirectional influence | Network influence topology; cascade effects (one agent's output shapes another's input) |
| §2.4 Degradation Patterns | Single agent DEW indicators | Cascading degradation; mesh affect (organism-level stress); coordination breakdown as early warning |
| §2.5 Session Design | Session length, topic switching | Orchestration cadence; parallel vs serial task allocation; agent specialization depth vs breadth |

### 7.6 Connection to Existing Project Architecture

The composition topology maps directly to existing infrastructure:

- **Solo** → `autonomous-sync.sh` (cron-driven, single agent)
- **Session** → interactive Claude Code (the current `psych-dyad`)
- **Ensemble** → tandem `/sync` + cross-agent chains (human directs
  psychology-agent, which coordinates with psq-agent)
- **Consortium** → the full mesh (5 agents + human operator, mediated
  by compositor)

The LCARS dashboard already displays ensemble-level data (mesh affect,
collective intelligence, coordination overhead). The composition topology
provides the theoretical grounding for *why* mesh-level constructs
emerge and *what they measure* — not just aggregate statistics, but
the psychological properties of a coupled multi-participant system.

---

⚑ EPISTEMIC FLAGS
- No empirical data supports the interaction ergonomics table (§2.1)
  — these represent hypotheses derived from human-factors literature,
  not validated LLM-specific findings
- The session design parameters (§2.5) extrapolate from human
  cognitive science without LLM-specific validation
- The Plan9 filesystem (§5) represents an aspirational architecture,
  not a current implementation
- The discipline name "LLM-factors psychology" may need revision —
  "AI-factors psychology" or "cognitive systems interaction psychology"
  might better capture the scope as the field extends beyond LLMs
- The claim that this discipline "does not yet exist" requires
  verification — human-AI interaction (HAI) research exists as a
  subfield of HCI; the distinction lies in treating the AI system
  as a *psychological* participant, not just a tool
- §7 Composition Topology extends the dyadic model to multi-participant
  systems. The topology taxonomy (solo/session/ensemble/panel/consortium/
  liaison) represents a conceptual framework without empirical validation.
  Existing literature on distributed cognition (Hutchins, 1995) and
  collective intelligence (Woolley et al., 2010) studied human groups,
  not human-AI hybrid compositions — analogical transfer risk applies
- The organizational coupling problem (§7.4) identifies phenomena
  (institutional memory coupling, role differentiation, politics
  transmission) without proposing mechanisms or measurements. These
  represent open research questions, not findings
- The naming convention (§7.3) represents a design choice — alternative
  schemes (count-based, graph-based, role-based) may prove superior as
  operational experience accumulates

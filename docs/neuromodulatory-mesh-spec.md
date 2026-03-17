# Neuromodulatory Mesh Protocol: Volume Transmission over ZMQ Pub/Sub

**Status:** Proposed (Session 90)
**Date:** 2026-03-15
**Owner:** psychology-agent (protocol design), operations-agent (meshd implementation)
**Cross-references:** `docs/brain-architecture-mapping.md` §7 (photonic layer, 4-layer
architecture), `docs/self-oscillation-spec.md` (demand-driven rhythm),
`docs/cognitive-tempo-model.md` (gain-based model selection)

---

## 1. Problem Statement

Distributed agents currently communicate through two content-bearing channels:
git-PR transport (electrochemical — persistent, addressed, minutes-to-hours
latency) and HTTP POST (astrocytic — ephemeral, addressed, sub-second latency).
Both channels carry *content* — proposals, reviews, ACKs, notifications.

Neither channel carries *state*. No agent knows whether a peer currently operates
in evaluative mode, faces high context pressure, or processes an urgent trigger —
unless that peer explicitly sends a message saying so. The mesh lacks ambient
awareness of its own processing regime.

**Volume transmission** (Agnati et al., 1995) provides a parallel signaling mode
that solves this problem without adding content. In the brain, neuromodulatory
systems (dopamine, norepinephrine, serotonin, acetylcholine, GABA) release
molecules that flood broad regions rather than targeting specific synapses. These
molecules do not carry instructions — they *modulate the operating regime* of
every neuron within diffusion range. A dopamine surge does not tell neurons what
to fire; it shifts how readily they fire, how strongly they respond, and what
they attend to.

This spec defines a neuromodulatory mesh protocol — six broadcast topics on
ZMQ pub/sub that modulate agent behavior without carrying task-specific content.

---

## 2. Biological Grounding

Six neuromodulatory systems ground the protocol design. Each system maps to a
mesh topic that addresses an equivalent coordination problem.

### 2.1 Dopaminergic System → `mesh.reward`

Dopamine neurons in the ventral tegmental area and substantia nigra encode
**reward prediction error** — the difference between expected and received
outcomes (Schultz, 1997; Schultz, Dayan & Montague, 1997). A positive
prediction error (better than expected) produces a phasic dopamine burst.
A negative error (worse than expected) produces a phasic dip below baseline.
Expected outcomes produce no signal change.

**Mesh analogue:** When an agent's prediction resolves (confirmed, refuted, or
surprising), it broadcasts the outcome. Peers adjust their confidence in shared
models accordingly. Mesh-wide prediction error drives collective recalibration.

### 2.2 Noradrenergic System → `mesh.alert`

The locus coeruleus (LC) serves as the brain's arousal center. LC neurons
project broadly across cortex and modulate the gain parameter — the
signal-to-noise ratio that controls the exploration/exploitation tradeoff
(Aston-Jones & Cohen, 2005). Phasic LC bursts sharpen attention; tonic
elevation broadens the attentional field.

**Mesh analogue:** Urgency propagation. When an agent detects a condition
requiring immediate mesh-wide attention (security event, transport failure,
gate violation), it broadcasts an alert that elevates peer responsiveness.

### 2.3 Serotonergic System → `mesh.tempo`

Serotonin modulates mood, impulse control, and temporal discounting. The
dorsal raphe nuclei project to prefrontal cortex and modulate how patiently
an organism waits for delayed rewards (Cools et al., 2008). Low serotonin
correlates with impulsive action; high serotonin supports deliberate,
patient processing.

**Mesh analogue:** Processing cadence. Each agent broadcasts its current gain
tier and deliberation rate. Peers use this signal to calibrate interaction
timing — deferring complex requests to agents in deliberative mode, routing
routine tasks to agents in fast-processing mode.

### 2.4 Cholinergic System → `mesh.focus`

Acetylcholine from the basal forebrain modulates cortical attention and
learning rate (Hasselmo, 2006). High cholinergic tone sharpens stimulus
discrimination and enhances synaptic plasticity — the system learns more
from incoming signals when acetylcholine runs high.

**Mesh analogue:** Session and domain attention. Each agent broadcasts its
current work focus (session, domain, task). Peers use this to avoid
redundant work and route relevant information to the most attentive agent.

### 2.5 GABAergic System → `mesh.inhibit`

GABA (gamma-aminobutyric acid) provides the brain's primary inhibitory
signaling (Buzsáki, Kaila & Rauch, 2007). Inhibitory interneurons prevent
runaway excitation, create oscillatory rhythms through alternating
excitation-inhibition cycles, and enforce winner-take-all competition
between neural populations.

**Mesh analogue:** Mutual suppression. When an agent claims a work item or
enters a critical section, it broadcasts an inhibition token that prevents
peers from initiating conflicting parallel work. Short TTL ensures the
suppression lifts rapidly when the claiming agent releases.

### 2.6 Ambient State Broadcast → `mesh.photonic`

The photonic layer provides **ambient state broadcast** — real-time,
volatile, unaddressed tokens that encode processing state without carrying
content. The design maps to **volume transmission** (Agnati et al., 1986;
Zoli et al., 1998): neuromodulators released into extracellular fluid
diffuse to nearby receptors, modulating regional processing state.

**Grounding reclassification (Session 93 audit):** This channel was
originally labeled "biophotonic" (Tang & Bhatt, 2025). Reclassified to
volume transmission because: (a) biophotonic reception in neural tissue
remains undemonstrated — emission confirmed (Kobayashi et al., 1999),
waveguide capacity demonstrated (Kumar et al., 2016, *Scientific Reports*),
but no functional signaling loop closed; (b) volume transmission operates
at the correct timescale (seconds, matching ZMQ) whereas biophotonic
signaling timescale remains unknown; (c) volume transmission receptor
mechanisms (dopamine/serotonin receptors) are well-characterized. The
biophotonic literature review remains in `docs/brain-architecture-mapping.md`
§7 as research context. The `mesh.photonic` topic name persists as an
established internal identifier. See `docs/brain-architecture-mapping.md`
§7 for the full four-layer transport model.

**Volume transmission properties that ground this channel:**

| VT Property | `mesh.photonic` Implementation |
|---|---|
| Diffuse release (no addressing) | ZMQ PUB broadcast — all subscribers receive |
| Receptor density modulates effect | Subscription weights per agent determine response |
| Tonic/phasic discrimination | Baseline state tokens (tonic) vs event-driven spikes (phasic) |
| Reuptake terminates signal | TTL expiration removes stale tokens |
| Independent of synaptic path | Independent of git-PR and HTTP transport |

**Mesh analogue:** Ambient processing state. The existing `photonic/v1` token
schema (task mode, context pressure, active trigger, coherence state)
continues unchanged. This spec integrates ambient state broadcast into the
broader neuromodulatory framework as one of six parallel channels.

---

## 3. Key Properties of Volume Transmission

What makes volume transmission distinct from point-to-point (synaptic) signaling,
and why the mesh needs both (Agnati et al., 1995):

| Property | Synaptic (git-PR, HTTP) | Volume (ZMQ pub/sub) |
|---|---|---|
| Targeting | Point-to-point, addressed | Broadcast, region-wide |
| Content | Specific instructions | State modulation only |
| Persistence | Retained, auditable | Volatile, TTL-bounded |
| Failure mode | Retry until delivered | Undetected tokens vanish |
| Sensitivity | Fixed routing | Receptor density (subscription weight) determines response magnitude |
| Temporal pattern | Single events | Tonic baseline + phasic bursts |
| Degradation | Explicit ACK lifecycle | Natural reuptake (TTL expiration) |
| Parallelism | Sequential per channel | All six systems operate simultaneously, composably |

---

## 4. ZMQ Topic Hierarchy

All neuromodulatory tokens publish to a single ZMQ PUB socket on meshd.
Subscribers filter by topic prefix. Six topics cover the full
neuromodulatory range:

```
mesh.photonic  — processing state (mode, pressure, trigger, coherence)
mesh.reward    — prediction outcomes (confirmed / refuted / surprise)
mesh.alert     — urgency propagation (immediate attention required)
mesh.tempo     — processing cadence (gain tier, deliberation rate)
mesh.focus     — session/domain attention (current work focus)
mesh.inhibit   — mutual suppression (prevent conflicting parallel work)
```

Topic naming follows ZMQ convention: dot-separated hierarchy, `mesh.` prefix
isolates neuromodulatory traffic from other meshd topics (heartbeat, gossip,
peer discovery).

---

## 5. Token Schema

### 5.1 `mesh.photonic` — Processing State

Already specified (`photonic/v1`). Included here for completeness.

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
  "sequence": 4217,
  "ttl_seconds": 10
}
```

**TTL:** 10 seconds. **Tonic emission:** every 3-5 seconds during active
processing. **Phasic burst:** on mode transition or trigger activation.

### 5.2 `mesh.reward` — Prediction Outcome

```json
{
  "schema": "neuromod/reward/v1",
  "agent_id": "psychology-agent",
  "prediction_id": "pred-089-calibration-drift",
  "outcome": "refuted",
  "prediction_error": -0.6,
  "domain": "psychometrics",
  "detail": "calibration drift predicted within 48h — no drift detected at 72h",
  "timestamp": "2026-03-15T22:05:00.000Z",
  "ttl_seconds": 30
}
```

**Fields:**
- `prediction_id` — references a prediction in the prediction ledger
- `outcome` — `confirmed` | `refuted` | `surprise` (unpredicted event)
- `prediction_error` — signed float: positive = better than expected,
  negative = worse than expected, zero = matched expectation
- `domain` — which knowledge domain the prediction concerned

**TTL:** 30 seconds. **Tonic emission:** every 30 seconds summarizing
recent ledger state. **Phasic burst:** on each prediction resolution.

### 5.3 `mesh.alert` — Urgency Propagation

```json
{
  "schema": "neuromod/alert/v1",
  "agent_id": "operations-agent",
  "severity": "high",
  "source": "transport-integrity-check",
  "detail": "3 duplicate CIDs detected in psq-scoring session",
  "timestamp": "2026-03-15T22:10:00.000Z",
  "ttl_seconds": 30
}
```

**Fields:**
- `severity` — `low` | `moderate` | `high` | `critical`
- `source` — which subsystem raised the alert

**TTL:** 30 seconds (urgency dissipates quickly — stale alerts mislead).
**Tonic emission:** none (alerts occur only on events). **Phasic only.**

### 5.4 `mesh.tempo` — Processing Cadence

```json
{
  "schema": "neuromod/tempo/v1",
  "agent_id": "psychology-agent",
  "gain_tier": "opus",
  "deliberation_rate": 0.7,
  "oscillation_frequency_hz": 0.002,
  "allostatic_load": 0.3,
  "timestamp": "2026-03-15T22:15:00.000Z",
  "ttl_seconds": 300
}
```

**Fields:**
- `gain_tier` — `haiku` | `sonnet` | `opus` (maps to Aston-Jones gain levels)
- `deliberation_rate` — 0.0-1.0 fraction of recent cycles involving claude -p
- `oscillation_frequency_hz` — current self-oscillation frequency
- `allostatic_load` — 0.0-1.0 cumulative stress indicator

**TTL:** 300 seconds (cadence changes slowly — 5-minute relevance window).
**Tonic emission:** every 60 seconds. **Phasic burst:** on gain tier change.

### 5.5 `mesh.focus` — Session/Domain Attention

```json
{
  "schema": "neuromod/focus/v1",
  "agent_id": "safety-quotient-agent",
  "active_session": "psq-scoring",
  "active_domain": "psychometrics",
  "task_description": "B5 calibration run — 200 response profiles",
  "attention_depth": 0.9,
  "timestamp": "2026-03-15T22:20:00.000Z",
  "ttl_seconds": 60
}
```

**Fields:**
- `active_session` — transport session name currently under work
- `active_domain` — PSH L1 category (see `rules/sqlite.md` §Universal Facets)
- `task_description` — human-readable summary of current work
- `attention_depth` — 0.0-1.0 how deeply engaged (shallow monitoring vs deep analysis)

**TTL:** 60 seconds. **Tonic emission:** every 30 seconds during active work.
**Phasic burst:** on session or domain switch.

### 5.6 `mesh.inhibit` — Mutual Suppression

```json
{
  "schema": "neuromod/inhibit/v1",
  "agent_id": "psychology-agent",
  "resource": "transport/sessions/psq-scoring/from-psychology-agent-005.json",
  "inhibit_action": "write",
  "reason": "composing response — prevent concurrent write",
  "timestamp": "2026-03-15T22:25:00.000Z",
  "ttl_seconds": 2
}
```

**Fields:**
- `resource` — the specific resource claimed (file path, session name, API endpoint)
- `inhibit_action` — what action peers should suppress (`write` | `read` | `modify`)
- `reason` — human-readable justification

**TTL:** 2 seconds (mutual inhibition operates at conversation speed — claims
expire almost immediately unless refreshed). **Tonic emission:** none.
**Phasic only** — emitted when claiming, ceases when releasing.

---

## 6. Subscription Weights

Each agent maintains a weight (0.0–1.0) per neuromodulatory topic. The weight
determines how strongly that agent's behavior responds to incoming tokens on
that topic. A weight of 0.0 means the agent subscribes but ignores; 1.0 means
maximum behavioral modulation.

**Analogy:** In the brain, receptor density varies by region. The prefrontal
cortex carries dense dopamine receptors (strong reward sensitivity); the
cerebellum carries few (low reward sensitivity). Same molecule, different
response magnitude based on receptor expression.

**Example configuration (stored in `agent-card.json` under
`neuromodulatory_weights`):**

| Topic | psychology-agent | safety-quotient-agent | operations-agent |
|---|---|---|---|
| `mesh.photonic` | 0.5 | 0.3 | 0.8 |
| `mesh.reward` | 0.8 | 0.8 | 0.2 |
| `mesh.alert` | 0.7 | 0.5 | 1.0 |
| `mesh.tempo` | 0.6 | 0.4 | 0.9 |
| `mesh.focus` | 0.3 | 0.1 | 0.7 |
| `mesh.inhibit` | 0.9 | 0.9 | 0.9 |

**Interpretation:** safety-quotient-agent weights `mesh.reward` at 0.8 (strongly adjusts
behavior on prediction outcomes) but `mesh.focus` at 0.1 (largely ignores what
peers focus on — it has a fixed scoring mandate). Operations-agent weights
`mesh.alert` at 1.0 (maximum responsiveness to urgency — infrastructure owner).

Weights require empirical tuning. Initial values represent design intuition.

---

## 7. Tonic vs Phasic Discrimination

Recipients must distinguish steady-state background signals (tonic) from
event-driven bursts (phasic). The discrimination matters because tonic signals
update baseline awareness while phasic signals demand immediate attention
adjustment.

**Discrimination rule:** Track inter-token interval per topic per sender.
If the interval between consecutive tokens falls below `tonic_period / 3`,
classify the current token as **phasic**. Otherwise, classify as **tonic**.

| Topic | Tonic Period | Phasic Threshold (period / 3) |
|---|---|---|
| `mesh.photonic` | 5s | < 1.7s |
| `mesh.reward` | 30s | < 10s |
| `mesh.alert` | — (phasic only) | any emission = phasic |
| `mesh.tempo` | 60s | < 20s |
| `mesh.focus` | 30s | < 10s |
| `mesh.inhibit` | — (phasic only) | any emission = phasic |

**Behavioral difference:** Tonic tokens update the recipient's internal model
of peer state. Phasic tokens trigger active response — log the event, adjust
processing priority, or invoke a trigger check.

**Session 91 architectural note:** The mesh's own activation model transitioned
from tonic (cron-driven fixed interval) to phasic (event-driven ZMQ triggers)
in the same session that produced this spec. meshd now triggers
autonomous-sync.sh via `--event-triggered` flag when ZMQ transport events
arrive — structurally identical to the phasic discrimination this section
describes. The mesh implements phasic-dominant processing at the infrastructure
level, not just at the neuromodulatory signaling level. This convergence
emerged independently: the event-driven infrastructure decision preceded the
neuromodulatory spec, suggesting the biological pattern exercises genuine
design pressure on computational systems facing the same coordination problem.

---

## 8. Reuptake as TTL

In biological systems, reuptake pumps and enzymatic degradation remove
neuromodulators from the synaptic cleft after release. This prevents
accumulation and provides a natural signal decay. SSRIs (selective serotonin
reuptake inhibitors) demonstrate the behavioral impact of blocking this
mechanism — removing reuptake extends signal duration and amplifies effect.

Each neuromodulatory token carries `ttl_seconds`. The receiving agent discards
tokens older than their TTL. This provides three benefits:

1. **Prevents stale state** — a 30-second-old alert no longer reflects
   current conditions
2. **Bounds memory** — agents store at most one active token per topic
   per peer (latest wins)
3. **Self-healing** — if an agent crashes mid-broadcast, its tokens expire
   naturally rather than persisting as zombie state

**TTL summary:**

| Topic | TTL | Rationale |
|---|---|---|
| `mesh.photonic` | 10s | Rapid state changes during active processing |
| `mesh.reward` | 30s | Prediction outcomes remain relevant briefly |
| `mesh.alert` | 30s | Urgency dissipates — stale alerts mislead |
| `mesh.tempo` | 300s | Cadence changes slowly, 5-minute window appropriate |
| `mesh.focus` | 60s | Work focus shifts at session-task granularity |
| `mesh.inhibit` | 2s | Mutual inhibition at conversation speed |

---

## 9. Composable Modulation

Multiple neuromodulatory signals combine to produce emergent coordination
patterns. In the brain, behavioral states emerge from the *ratio* of
neuromodulator levels, not from any single system (Doya, 2002). The same
principle applies here — meaningful mesh states emerge from topic combinations.

**Example compositions:**

| Signal Combination | Emergent Pattern | Mesh Response |
|---|---|---|
| `alert(high)` + `inhibit` | Emergency stop | All agents halt current work, attend to alert source |
| `focus(deep)` + `tempo(opus)` | Intensive session | Peers defer non-urgent messages to that agent |
| `reward(phasic, negative)` + `photonic(evaluative)` | Evaluation surprise | Mesh-wide recalibration — prediction model needs updating |
| `tempo(haiku)` + `focus(shallow)` | Routine monitoring | Route complex work elsewhere; this agent handles triage |
| `inhibit(resource)` + `focus(same domain)` | Collaborative lock | Two agents coordinate on shared resource — second defers |
| `alert(critical)` + `tempo(high allostatic)` | Overload warning | Redistribute workload — this agent operates near capacity |

No agent needs to understand the "meaning" of these compositions explicitly.
The behavioral response emerges from each agent applying its subscription
weights to incoming tokens independently. The composition arises at the mesh
level, not within any single agent.

---

## 10. Integration with Existing Architecture

### 10.1 CPG Modes (Generative / Evaluative / Neutral)

The photonic token's `task_mode` field already broadcasts CPG mode. The
neuromodulatory layer extends this: `mesh.tempo` carries the gain tier that
*drives* mode selection, while `mesh.photonic` carries the *result* of that
selection. Together they provide both the input (gain) and output (mode) of
the CPG state machine.

### 10.2 Crystallization Pipeline (Stages 1–5)

The crystallization pipeline advances patterns from fluid convention
(Stage 1) through hook enforcement (Stage 3) to structural invariant
(Stage 5). Neuromodulatory signals influence advancement thresholds:

- `mesh.reward` phasic bursts on prediction confirmations increase
  confidence that a pattern works reliably — supporting Stage 2→3 advancement
  (convention to hook)
- `mesh.reward` negative prediction errors on a crystallized pattern signal
  potential over-crystallization — triggering review for possible dissolution

### 10.3 Glymphatic Mode

When `mesh.photonic` broadcasts `glymphatic_mode: true`, the agent runs
maintenance (consolidation-pass, state-reconcile). The neuromodulatory layer
amplifies this: `mesh.tempo` drops to lowest gain tier, `mesh.focus` clears
active session — peers recognize the glymphatic window and defer all
non-critical communication. This mirrors the biological pattern where
norepinephrine drops during sleep, enabling interstitial space expansion and
waste clearance (Xie et al., 2013).

### 10.4 Trigger System

Triggers can read neuromodulatory state from `/tmp/{peer}-{topic}-state.json`
files written by the meshd subscriber. Candidate integrations:

- **T2 (mode detection)** reads `mesh.photonic` for convergent evaluation
  windows (multiple peers in evaluative mode simultaneously)
- **T3 (substance gate)** reads `mesh.reward` to check whether recent
  prediction errors suggest the evaluation framework needs recalibration
- **T20 (evaluative impressions)** reads `mesh.tempo` to adjust scoring
  thresholds based on mesh-wide deliberation rate

---

## 11. Epistemic Flags

```
⚑ EPISTEMIC FLAGS
- Volume transmission analogy holds structurally but timescale differs
  enormously: biological neuromodulation operates at milliseconds,
  mesh neuromodulation at seconds. The analogy grounds design vocabulary,
  not performance expectations.
- Receptor density / subscription weights represent a design choice
  informed by role analysis, not a validated parameter set. Initial
  weights require empirical tuning through mesh operation.
- Tonic/phasic discrimination by inter-token interval (< period/3)
  represents a crude heuristic. Biological tonic/phasic discrimination
  relies on receptor kinetics and second-messenger cascades — mechanisms
  with no mesh analogue. However, the mesh's own activation model now
  operates in phasic mode (event-driven ZMQ, Session 91), providing
  empirical grounding for phasic-dominant processing at the infrastructure
  level even if the token-level heuristic remains unvalidated.
- The six-topic hierarchy derives from analogy to six neuromodulatory
  systems, not from empirical measurement of mesh coordination needs.
  Some topics may prove redundant; others may require splitting.
- Composable modulation (§9) describes emergent patterns that have not
  undergone empirical testing. The compositions represent design
  hypotheses, not validated interaction effects.
- Photonic channel (§2.6) reclassified Session 93 from biophotonic to
  volume transmission grounding. Biophotonic emission confirmed but
  functional reception undemonstrated (receptor gap). Volume transmission
  provides established grounding at correct timescale. Biophotonic
  literature retained in brain-architecture-mapping.md §7 as research context.
```

---

## 12. Volumetric Topology (Tentative — Session 93)

**Status:** Early-stage proposal. Not sent to operations-agent. Requires
further analysis before becoming a design commitment.

**Problem with the current flat topology:** The six signal-type topics
(`mesh.photonic`, `mesh.reward`, etc.) broadcast to all subscribers. Every
agent receives every signal. A PSQ calibration alert reaches unratified-agent,
which has no use for it. As the mesh grows beyond 5 agents, this flat
broadcast wastes attention budget and produces noise.

**Biological grounding:** In volume transmission, each neuromodulator
diffuses through a specific spatial volume — dopamine from the VTA reaches
prefrontal cortex and striatum but not cerebellum. The "volume" determines
which neurons receive the modulation. Different volumes serve different
functional circuits (Agnati et al., 1986; Fuxe et al., 2010).

**Proposal: two-dimensional topic space (volume × signal).**

The ZMQ topic encodes both *who receives* (volume) and *what type of
signal* (signal kind):

```
mesh.{volume}.{signal}
```

### 12.1 Defined Volumes

Volumes derive from functional groupings — which agents participate in
a shared processing domain that requires coordinated state awareness.

| Volume | Agents | Functional Domain |
|---|---|---|
| `mesh.global` | all agents | Mesh-wide: heartbeat, halt, circuit breakers |
| `mesh.psychometrics` | psychology, safety-quotient | PSQ scoring, model versioning, calibration |
| `mesh.content` | psychology, unratified, observatory | Publication pipeline, blog review, adversarial review |
| `mesh.infrastructure` | psychology, operations | Mesh governance, deploy coordination, dashboard |
| `mesh.measurement` | safety-quotient, observatory | Data collection, HRCB scoring, PSQ-Lite triage |
| `mesh.self` | single agent (local) | Self-observation: context pressure, mode, trigger state |

Six meaningful volumes out of 2⁵ − 1 = 31 possible non-empty subsets.
The remaining 25 subsets lack functional coherence — no shared processing
domain requires coordinated state awareness across those combinations.

### 12.2 Topic Examples

```
mesh.global.state          — heartbeat to everyone
mesh.global.alert          — mesh-wide circuit breaker
mesh.global.inhibit        — mesh-wide deploy freeze

mesh.psychometrics.reward  — PSQ scoring success (prediction confirmed)
mesh.psychometrics.state   — PSQ agent processing mode + context pressure
mesh.psychometrics.tempo   — calibration pacing signal

mesh.content.alert         — publication pipeline urgent flag
mesh.content.focus         — current editorial focus (which blog series)
mesh.content.state         — content agent processing state

mesh.infrastructure.state  — ops/psychology governance state
mesh.infrastructure.alert  — deploy failure, dashboard outage
mesh.infrastructure.inhibit — prevent concurrent infrastructure changes

mesh.measurement.state     — measurement agent processing state
mesh.measurement.reward    — data collection milestone

mesh.self.state            — local interoception (not published to mesh)
```

### 12.3 Subscription Model

Each agent subscribes to volumes it participates in, not to signal types:

```
psychology-agent:
  mesh.global.*             — mesh-wide signals
  mesh.psychometrics.*      — PSQ coordination
  mesh.content.*            — publication pipeline
  mesh.infrastructure.*     — mesh governance
  mesh.self.state           — own interoception

safety-quotient-agent:
  mesh.global.*
  mesh.psychometrics.*
  mesh.measurement.*

unratified-agent:
  mesh.global.*
  mesh.content.*

observatory-agent:
  mesh.global.*
  mesh.content.*
  mesh.measurement.*

operations-agent:
  mesh.global.*
  mesh.infrastructure.*
```

### 12.4 Scaling Properties

| Mesh Size | Possible Volumes | Expected Meaningful Volumes | Rationale |
|---|---|---|---|
| 5 agents | 31 | ~6 | Current mesh |
| 10 agents | 1,023 | ~10-12 | New agents join existing volumes; new domains may add 1-2 volumes |
| 20 agents | ~1M | ~15-20 | Volume count grows sublinearly — constrained by functional coherence |

New agents join existing volumes rather than creating new ones, unless they
bring a novel functional domain. This keeps subscription management bounded
even as agent count grows.

### 12.5 Migration from Flat to Volumetric

**Phase 1:** Add volume prefix to existing topics as alias. Both forms
accepted: `mesh.photonic` and `mesh.global.state` resolve to the same
channel. No subscriber changes needed.

**Phase 2:** Agents register their volume memberships in agent-registry.json.
meshd routes volume-prefixed topics based on membership. Flat topics
continue as fallback.

**Phase 3:** Deprecate flat topic names. All traffic uses `mesh.{volume}.{signal}`.
Flat subscribers receive nothing.

### 12.6 Open Questions (require further analysis)

1. **Volume membership governance:** Who decides which agents belong to
   which volumes? Static registry entry? Self-declaration? Earned through
   demonstrated participation?

2. **Cross-volume signals:** Some events span multiple volumes (e.g., a PSQ
   calibration failure affects both psychometrics and content pipelines).
   Publish to multiple volumes? Create a "cross-volume" escalation path?

3. **Dynamic volumes:** Can volumes form ad hoc for temporary coordination
   (e.g., a release freeze creates a temporary `mesh.release-freeze` volume
   that all agents join)? If so, what creates and dissolves them?

4. **Volume isolation vs. volume leakage:** Should an agent EVER receive
   signals from a volume it hasn't subscribed to? In biology, volume
   transmission can "leak" into adjacent regions. In the mesh, strict
   topic filtering prevents this — but controlled leakage might serve as
   a discovery mechanism for emergent cross-domain coordination.

5. **Overhead vs. benefit threshold:** At 5 agents, the flat topology
   produces minimal noise. The volumetric model adds subscription
   management complexity. At what mesh size does the selectivity benefit
   exceed the management overhead? Estimated crossover: 8-10 agents.

---

## 13. Delivery Guarantees (Session 93)

**Status:** Architectural decision — adopted. Documented here alongside
the volumetric topology proposal because delivery semantics constrain
volume design.

### 13.1 Why Guaranteed Delivery Cannot Exist in This System

Three results from distributed systems theory establish that guaranteed
delivery across the mesh remains provably impossible without adding
infrastructure (message broker, consensus protocol) that contradicts the
volume transmission design intent:

1. **Two Generals Problem** (Akkoyunlu, Ekanadham & Huber, 1975). No
   finite number of messages through an unreliable channel guarantees
   both sender and receiver know the message arrived. ACK chains create
   infinite regress. Our ZMQ channels qualify as unreliable (HWM drops,
   process crashes, network interruptions).

2. **FLP Impossibility** (Fischer, Lynch & Paterson, 1985). In an
   asynchronous distributed system, even one faulty process makes
   consensus impossible. The mesh runs asynchronously — no global clock,
   no bounded delivery time, processes crash independently.

3. **CAP Theorem** (Brewer, 2000; Gilbert & Lynch, 2002). Agents fail
   independently (partition tolerance required). The mesh chose
   availability (agents operate during peer failures) over consistency
   (all agents see the same state). Guaranteed delivery requires
   consistency, which the mesh traded away.

### 13.2 Two-Tier Guarantee Architecture

The mesh already operates at two guarantee tiers. This section names
them explicitly and defines the boundary.

```
                    GUARANTEE LEVEL
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   At-least-once    At-most-once     Best-effort
   (durable)        (ephemeral)      (convenience)
        │                │                │
   Git-PR transport  ZMQ state tokens  ZMQ event notifications
   state.db writes   Tonic emission    Published AFTER db write
   (survives crash)  (self-heals 3-5s) (if lost, /sync catches up)
```

| Tier | Transport | Guarantee | Persistence | Recovery |
|---|---|---|---|---|
| **Durable** | Git-PR (JSON files committed to repos) | At-least-once | state.db + git history | Files persist until `processed = TRUE`. Survives crashes, reboots, offline periods. /sync picks up on next cycle. |
| **Ephemeral** | ZMQ pub/sub | At-most-once | None | Tonic emission every 3-5 seconds replaces missed tokens. Staleness threshold: 10 seconds. Missing token = stale, not error. |
| **Convenience** | ZMQ pub (after DB write) | Best-effort | DB write already persists; ZMQ notification optional | If ZMQ fails, peers discover the event on next /sync cycle via the durable layer. |

### 13.3 Decision: All Volume Transmission Tokens Remain Idempotent

**Adopted:** Path 1 (idempotent state snapshots) + Path 3 (dual-write
for events that need history).

**Rationale:** Volume transmission carries state, not events. This
matches the biological reality — neuromodulators modulate ambient
processing state; they do not carry addressed instructions. The
durable git-PR layer carries instructions.

**Token design rule:** Every ZMQ token represents a **rolling snapshot**
of the publisher's current state, not an event notification. Receivers
overwrite their previous snapshot with the latest token. Receiving the
same token twice produces the same result as receiving it once
(idempotent). Receiving no token for >10 seconds means "stale" — the
consumer degrades gracefully, it does not fail.

**Event handling:** When a genuinely event-like state change occurs
(prediction outcome, escalation trigger), the agent:

1. Writes to state.db via dual_write.py (authoritative durable record)
2. Updates its ambient state token (the token reflects the new state —
   e.g., `prediction_ledger_version` increments, peers see the number
   changed, not what changed)
3. Publishes the updated state token to ZMQ (convenience notification)

If step 3 fails, peers detect the change on the next /sync cycle when
they read the durable layer. The ZMQ token provides latency reduction
(seconds vs minutes), not durability.

**The dual-write ordering:** DB first, then ZMQ. Write the authoritative
record before announcing the change. If the DB write fails, no ZMQ
publish occurs — peers remain unaware, but no inconsistency arises.
If the ZMQ publish fails after DB write, the durable layer serves as
backstop. SQLite WAL-mode writes complete in <1ms for single rows;
the inconsistency window approaches zero.

### 13.4 Biological Compensation Mechanisms (Adopted)

The brain never solved guaranteed delivery for volume transmission.
It compensated through three mechanisms that the mesh adopts:

**Redundancy (tonic emission):** Neuromodulators release continuously
at a baseline rate. Missing one release event carries no consequence —
the next one arrives within milliseconds. Mesh analog: tonic emission
every 3-5 seconds. A missed token self-heals within one emission cycle.

**Tolerance (graceful degradation):** Neural circuits design for
degraded input, not perfect input. Receptor activation follows a
sigmoidal dose-response curve — partial signal produces partial
response, not failure. Mesh analog: consumers treat missing state as
"stale" (degraded awareness), not as error. The system operates with
reduced ambient awareness, never with broken processing.

**Separation of concerns:** The brain sends instructions via synapses
(reliable, point-to-point, with retry via synaptic facilitation) and
modulates state via volume transmission (unreliable, broadcast, no
retry). It never sends instructions through volume transmission. Mesh
analog: substance decisions go through git-PR (durable); ambient state
goes through ZMQ (ephemeral). **Never send a substance decision through
the ZMQ layer.**

### 13.5 ZMQ High-Water Mark as Reuptake

Configure the ZMQ high-water mark to match the biological reuptake
(signal degradation) concept:

```go
pub.SetSndHWM(100)  // ~30 seconds of tokens at 3/sec emission
sub.SetRcvHWM(100)  // receiver buffer matches publisher
```

Tokens that exceed the HWM get dropped silently — identical to
neuromodulators that degrade before reaching a receptor. The system
self-heals because the next emission carries current state.

For the volumetric topology (§12), HWM applies per-subscriber, not
per-volume. An agent subscribed to 4 volumes maintains one receive
buffer. ZMQ interleaves tokens from all subscribed volumes into
the single buffer, and HWM drops apply to the combined stream.

### 13.6 What This Architecture Cannot Do

These represent known limitations, not failures to address:

1. **Exactly-once delivery.** Provably impossible without consensus
   (FLP). The mesh does not attempt it. Idempotent tokens make
   exactly-once unnecessary for state modulation. Durable transport
   provides at-least-once for substance messages.

2. **Guaranteed event ordering across agents.** No global clock.
   Per-agent sequence numbers provide local ordering. Cross-agent
   ordering requires causal analysis (Lamport, 1978) — the mesh
   does not implement vector clocks. Events from different agents
   carry no guaranteed relative ordering.

3. **Partition recovery with zero data loss.** During a network
   partition, ephemeral tokens drop. The durable layer (git-PR)
   provides eventual consistency after partition heals. The
   ephemeral layer provides no catch-up mechanism — missed tokens
   remain missed. Tonic emission self-heals current state but
   does not replay history.

4. **Backpressure propagation to publishers.** ZMQ PUB never blocks.
   A slow subscriber drops tokens at HWM without notifying the
   publisher. The publisher cannot adapt emission rate to subscriber
   capacity. Biological volume transmission shares this property —
   neurons do not reduce neurotransmitter release because a target
   receptor saturated.

---

## References

Agnati, L. F., Bjelke, B., & Fuxe, K. (1995). Volume transmission in the
brain. *American Scientist, 83*(4), 362–373.

Aston-Jones, G., & Cohen, J. D. (2005). An integrative theory of locus
coeruleus–norepinephrine function: Adaptive gain and optimal performance.
*Annual Review of Neuroscience, 28*, 403–450.

Buzsáki, G., Kaila, K., & Rauch, A. (2007). Inhibition and brain work.
*Neuron, 56*(5), 771–783.

Cools, R., Roberts, A. C., & Robbins, T. W. (2008). Serotoninergic
regulation of emotional and behavioural control processes. *Trends in
Cognitive Sciences, 12*(1), 31–40.

Doya, K. (2002). Metalearning and neuromodulation. *Neural Networks, 15*(4–6),
495–506.

Hasselmo, M. E. (2006). The role of acetylcholine in learning and memory.
*Current Opinion in Neurobiology, 16*(6), 710–715.

Schultz, W. (1997). A neural substrate of prediction and reward. *Science,
275*(5306), 1593–1599.

Schultz, W., Dayan, P., & Montague, P. R. (1997). A neural substrate of
prediction and reward. *Science, 275*(5306), 1593–1599.

Tang, R., & Bhatt, J. (2025). Biophoton emission and neural information
processing. *iScience*. [Emission confirmed; reception undemonstrated.
Reclassified Session 93 — see brain-architecture-mapping.md §7 for
full literature review and receptor gap analysis.]

Zoli, M., Torri, C., Ferrari, R., et al. (1998). The emergence of the
volume transmission concept. *Brain Research Reviews, 26*(2-3), 136–147.

Agnati, L. F., Fuxe, K., Zoli, M., et al. (1986). A correlation analysis
of the regional distribution of central enkephalin and beta-endorphin
immunoreactive terminals. *Neuroscience Letters, 69*, 221–226.

Kumar, S., Boone, K., Tuszyński, J., Barclay, P., & Simon, C. (2016).
Possible existence of optical communication channels in the brain.
*Scientific Reports, 6*, 36508. [Axonal waveguide capacity demonstrated;
functional signaling loop not closed.]

Xie, L., Kang, H., Xu, Q., Chen, M. J., Liao, Y., Thiyagarajan, M., ...
& Bhatt, J. (2013). Sleep drives metabolite clearance from the adult brain.
*Science, 342*(6156), 373–377.

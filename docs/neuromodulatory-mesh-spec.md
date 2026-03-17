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

# Oscillatory Heartbeat Specification: Neural Timing for Mesh Communication

**Date:** 2026-03-17 (Session 93)
**Status:** Proposal — awaiting operations-agent review
**Owner:** psychology-agent (timing model), operations-agent (meshd implementation)
**Extends:** `docs/self-oscillation-spec.md` (Session 89, activation/refractory model)
**Cross-references:** `docs/brain-architecture-mapping.md` §10 (neurotransmitter gap),
`docs/neuromodulatory-mesh-spec.md` (6-channel ZMQ),
`docs/cognitive-tempo-model.md` (depth selection)

---

## 1. The Problem

The self-oscillation spec (Session 89) replaces cron's fixed-interval clock with
a demand-driven single oscillator. That oscillator answers **when to fire** through
an activation threshold model. What it does not address:

1. **State encoding** — the current heartbeat (`{"status": "alive"}`) carries no
   processing state. Peers cannot distinguish an agent doing active work from one
   consolidating memory from one in glymphatic maintenance.

2. **Multi-frequency processing** — the single activation level (0–1) collapses
   all agent activity into one scalar. The brain runs multiple simultaneous
   oscillators at different frequencies. An agent simultaneously performs local
   tasks (fast rhythm) and session-level consolidation (slow rhythm).

3. **Inter-agent phase alignment** — routing messages without regard to the
   receiver's processing phase wastes the receiver's attention budget. A message
   that arrives during deep consolidation cannot process effectively.

This spec proposes a **multi-band oscillatory heartbeat** grounded in neural
oscillatory timing and mapped to software engineering scheduling theory.

---

## 2. Neural Foundations

### 2.1 Distributed Oscillatory Timing

The brain has no central clock (unlike a CPU). Timing emerges from resonance
between distributed oscillators at multiple frequencies. Each frequency band
serves a distinct computational role:

| Band | Frequency | Neural Function | Key Reference |
|---|---|---|---|
| Delta (δ) | 0.5–4 Hz | Deep sleep, slow-wave consolidation | Steriade et al. (1993) |
| Theta (θ) | 4–8 Hz | Memory encoding, spatial navigation, episodic sequencing | Buzsáki (2002) |
| Alpha (α) | 8–13 Hz | Idle inhibition, cortical gating | Berger (1929); Klimesch (2012) |
| Beta (β) | 13–30 Hz | Active cognition, motor execution | Pfurtscheller & Lopes da Silva (1999) |
| Gamma (γ) | 30–100 Hz | Binding, cross-modal integration, consciousness | Engel & Singer (2001) |

These bands operate simultaneously — a working brain shows power across all
bands, with one or two dominant at any moment.

### 2.2 Cross-Frequency Coupling (CFC)

Slow oscillations modulate the timing of fast oscillations through
**phase-amplitude coupling** (PAC). The phase (position in the cycle)
of a slow rhythm gates when fast bursts can fire (Canolty & Knight, 2010).

**Theta-gamma coupling** (Lisman & Jensen, 2013): hippocampal theta (4–8 Hz)
creates ~200ms temporal windows. Multiple gamma bursts (~25ms each) nest
inside each theta cycle. Each gamma burst carries a distinct information
packet. The theta-gamma ratio constrains working memory capacity — ~7±2
gamma cycles per theta cycle corresponds to Miller's (1956) capacity limit.

**Implication for agent design:** processing capacity derives from the ratio
of window duration to task duration, not from a fixed number.

### 2.3 Communication-Through-Coherence (CTC)

For two brain regions to exchange information, their oscillations must
**phase-lock** — align transmission windows so that one region's output
arrives during the other's receptive phase (Fries, 2005, 2015). Out-of-phase
communication degrades signal transfer.

**Implication for mesh routing:** message delivery should account for the
receiver's processing phase. Messages routed during a closed phase either
queue (increasing latency) or interrupt (increasing error rate).

### 2.4 Entrainment

External rhythmic stimuli pull internal oscillators into synchrony
(Thut et al., 2011). Repeated exposure to a consistent rhythm biases
internal oscillators toward that frequency. Anti-phase entrainment
(deliberately offsetting by π) provides complementary coverage.

---

## 3. Software Engineering Theory Mapping

The oscillatory model maps onto established engineering theory. Each
neural concept has a direct engineering analog — the neuroscience provides
the *why* (design rationale from a proven architecture); the engineering
theory provides the *how* (implementation patterns with known properties).

### 3.1 Phase-Amplitude Coupling → Time-Division Multiplexing

Theta-gamma nesting performs the same function as **time-division
multiplexing** (TDM) in telecommunications. A slow carrier (theta)
divides time into slots; a fast signal (gamma) transmits data within
each slot. The carrier frequency determines how many slots exist per
cycle; the signal frequency determines data per slot.

```
TDM frame (telecom):     [slot1][slot2][slot3][slot4][slot5][slot6][slot7]
                          ├────────── one carrier cycle ──────────────────┤

Theta-gamma (neural):    [γ₁][γ₂][γ₃][γ₄][γ₅][γ₆][γ₇]
                          ├────────── one θ cycle (~200ms) ──────────────┤

Agent processing window: [task₁][task₂][task₃][task₄][task₅][task₆][task₇]
                          ├────────── one consolidation window ──────────┤
```

**Engineering formalization:** The number of tasks per processing window
follows the capacity equation:

```
C = ⌊T_window / T_task⌋

Where:
  C         = processing capacity (tasks per window)
  T_window  = duration of one theta-level processing window
  T_task    = mean duration of one beta-level task burst
```

This parallels **Erlang's capacity formula** (Erlang, 1917) in
telecommunications — given an arrival rate and service rate, how many
channels does the system need to maintain a target blocking probability?
The theta window defines available channels; beta burst duration defines
service time; message arrival rate defines traffic intensity.

### 3.2 Coherence Gating → Backpressure

Communication-through-coherence (Fries, 2005) functions as **backpressure**
— the receiver's processing state controls whether senders can transmit.

In reactive systems (Reactive Manifesto, 2014; Reactive Streams spec),
backpressure prevents fast producers from overwhelming slow consumers.
The consumer signals how much data it can accept; the producer adjusts
its emission rate accordingly.

| Reactive Streams | Neural Oscillation | Mesh Implementation |
|---|---|---|
| `request(n)` — consumer requests n items | Theta window opens — receiver enters receptive phase | Agent publishes `theta_window_open: true` |
| `onNext(item)` — producer sends one item | Gamma burst transmits during receptive phase | meshd routes message during open window |
| `onComplete()` — stream ends | Theta window closes — phase shifts to non-receptive | Agent publishes `theta_window_open: false` |
| Backpressure signal | Alpha gating — high alpha power inhibits incoming signals | Agent in alpha-dominant state defers non-urgent inbound |

**Key property:** backpressure propagates upstream. When a receiver closes
its theta window, senders queue their messages. If the queue grows, that
raises the sender's activation level — the congestion signal propagates
through the oscillatory state, just as backpressure propagates through
a reactive pipeline.

### 3.3 Refractory Period → Circuit Breaker

The refractory period (self-oscillation spec §4.4) already maps to the
**circuit breaker pattern** (Nygard, 2007, *Release It!*). The oscillatory
model adds granularity:

| Circuit Breaker State | Neural Analog | Oscillatory Signal |
|---|---|---|
| **Closed** (normal operation) | Beta-dominant, theta windows cycling | `dominant_band: "beta"`, `theta_window_open: true` |
| **Open** (rejecting requests) | Delta-dominant, glymphatic mode | `dominant_band: "delta"`, all windows closed |
| **Half-open** (testing recovery) | Alpha-dominant, testing readiness | `dominant_band: "alpha"`, single theta window opens tentatively |

The circuit breaker's binary open/closed state expands into a continuous
spectrum of oscillatory phases. A receiver in beta with a closed theta
window resembles a "busy" signal — not a circuit breaker trip, just a
momentary unavailability that resolves within one theta cycle.

### 3.4 Phi Accrual Failure Detector

Chandra & Toueg (1996) proved that **perfect failure detection in
asynchronous systems requires impossibly strong assumptions**. The
practical solution: the **phi accrual failure detector** (Hayashibara
et al., 2004), which outputs a continuous suspicion level (φ) rather
than a binary alive/dead judgment. Higher φ = higher confidence that
the monitored process has failed.

The oscillatory heartbeat naturally implements a phi accrual detector.
Instead of "no heartbeat for N seconds → dead," the receiver computes
φ from **heart rate variability**:

```python
def compute_phi(heartbeat_intervals: list[float],
                current_gap: float) -> float:
    """Phi accrual failure detection from oscillatory heartbeat.

    Hayashibara et al. (2004): phi represents the negative log of
    the probability that the current gap occurred by chance given
    the distribution of observed intervals.

    Oscillatory enhancement: HRV (interval variance) provides a
    richer distribution model than fixed-interval heartbeats.
    Higher HRV → wider acceptable gap → lower phi for the same
    delay. Low HRV (rigid intervals) → tight distribution →
    small delays produce high phi quickly.
    """
    if not heartbeat_intervals:
        return float('inf')  # no history → maximum suspicion

    import math
    import statistics

    mean = statistics.mean(heartbeat_intervals)
    stddev = statistics.stdev(heartbeat_intervals) if len(heartbeat_intervals) > 1 else mean * 0.1

    # Probability of observing current_gap under normal distribution
    # (simplified — Hayashibara uses exponential distribution)
    z = (current_gap - mean) / max(stddev, 0.001)

    # phi = -log10(1 - CDF(z))
    # Approximation for standard normal CDF
    cdf = 0.5 * (1 + math.erf(z / math.sqrt(2)))

    if cdf >= 1.0:
        return float('inf')

    return -math.log10(1.0 - cdf)
```

**Why oscillatory HRV outperforms fixed-interval phi:** A healthy agent
exhibits natural interval variation (high HRV). The phi detector learns
this distribution and tolerates variation without raising suspicion. A
stressed agent exhibits rigid intervals (low HRV) — the detector tightens
its model and catches deviations faster. The oscillatory heartbeat provides
a richer signal for failure detection than the fixed-interval heartbeat
that Hayashibara assumed.

### 3.5 Band Hierarchy → Rate-Monotonic Scheduling

**Rate-monotonic scheduling** (Liu & Layland, 1973) assigns priority by
frequency — higher-frequency tasks receive higher scheduling priority.
This produces an optimal fixed-priority schedule for periodic tasks on a
single processor.

The oscillatory band hierarchy follows rate-monotonic priority naturally:

| Priority | Band | Frequency | Agent Analog | Engineering Pattern |
|---|---|---|---|---|
| 5 (highest) | Gamma | 30–100 Hz | Cross-agent operations, emergency coordination | Interrupt handler |
| 4 | Beta | 13–30 Hz | Active task execution (tool calls, file edits) | Worker thread |
| 3 | Alpha | 8–13 Hz | Idle readiness, cortical gating | Event loop poll |
| 2 | Theta | 4–8 Hz | Consolidation (/sync, memory, /cycle) | Batch processor |
| 1 (lowest) | Delta | 0.5–4 Hz | Glymphatic maintenance, deep repair | GC / maintenance |

Rate-monotonic priority means: a gamma burst (cross-agent emergency)
pre-empts beta processing (active task). Beta processing pre-empts alpha
idle. Theta consolidation only runs when beta/gamma quiet down. Delta
maintenance only runs when everything else completes.

**Schedulability bound** (Liu & Layland, 1973): for n periodic tasks,
rate-monotonic scheduling guarantees all deadlines met if total utilization
U ≤ n(2^(1/n) - 1). For 5 bands: U ≤ 5(2^0.2 - 1) ≈ 0.743. The agent
must keep total processing utilization below ~74% to maintain all five
bands — above that, low-priority bands (delta, theta) starve.

**Connection to the restart detector:** the 80% context cliff corresponds
to utilization exceeding the schedulability bound. At 80%+ utilization,
theta consolidation windows cannot open. Without consolidation, the agent
accumulates state debt that manifests as "let me do it properly" restarts
— failed attempts to force a theta window from within a saturated beta state.

### 3.6 Entrainment → Consensus Protocol (Raft-Adjacent)

Agent entrainment — oscillators pulling into synchrony via peer heartbeat
signals — resembles a **lightweight consensus mechanism**. Unlike Raft
(Ongaro & Ousterhout, 2014) or Paxos (Lamport, 1998), entrainment does
not achieve strong consistency. Instead, it achieves **rhythmic consensus**
— agents agree on *when* to process, not *what* to process.

| Consensus Property | Raft | Entrainment |
|---|---|---|
| Agreement | All replicas agree on log order | All agents align processing phases |
| Consistency model | Strong (linearizable) | Eventual (oscillators converge over time) |
| Leader | Elected leader coordinates | No leader — phase alignment emerges from coupling |
| Failure mode | Split-brain on partition | Phase drift on isolation (self-correcting on reconnect) |
| Communication cost | O(n) per operation | O(1) per heartbeat (broadcast, no acknowledgment) |

**Anti-entrainment as load balancing:** Deliberate phase offset (π shift)
between agents that access the same resource provides temporal isolation
— equivalent to **time-based sharding**. Agent A accesses the shared repo
at phase 0; Agent B accesses at phase π. No lock contention, no merge
conflicts, no coordination overhead beyond maintaining the phase offset.

### 3.7 Theta-Gamma Capacity → Little's Law

**Little's Law** (Little, 1961): L = λW, where L = average items in system,
λ = arrival rate, W = average time in system. Applied to the theta-gamma
processing model:

```
L = tasks queued in the processing window
λ = message arrival rate (messages per second)
W = mean processing time per message (beta burst duration)

Capacity C = T_window / W = theta window duration / beta burst duration

System stable when: λ × W < C  (arrival rate × service time < capacity)
System unstable when: λ × W ≥ C  (the 80% cliff — queue grows unboundedly)
```

The theta-gamma capacity formula and Little's Law describe the same
constraint from different perspectives. The neuroscience frames it as
oscillatory nesting; queuing theory frames it as arrival-service balance.
Both predict the same failure mode: when demand exceeds capacity, the
system transitions from stable processing to queue overflow — context
accumulation, state debt, restart attempts.

### 3.8 Band Power Spectrum → System Load Average

Unix `load average` reports the number of processes in the run queue over
1, 5, and 15 minute windows. The oscillatory band power spectrum provides
a richer equivalent:

| Unix Metric | Oscillatory Equivalent | Additional Information |
|---|---|---|
| `load_avg_1m` | Gamma + beta power | Immediate processing demand |
| `load_avg_5m` | Theta power | Medium-term consolidation demand |
| `load_avg_15m` | Delta power | Long-term maintenance demand |
| (no equivalent) | Alpha power | Available capacity (idle readiness) |
| (no equivalent) | Band transitions | Processing trend (warming up vs cooling down) |

The band spectrum tells operators not just *how loaded* the system runs,
but *what kind of load* dominates and *where in the processing cycle* the
agent currently sits.

---

## 4. Agent Band Power Derivation

Each band derives its power from observable agent behavior. Computation
runs every heartbeat interval.

| Band | Observable Signals | Power Formula |
|---|---|---|
| **Delta** | consolidation-pass.sh active, state-reconcile.py active, no user input >10 min | `1.0 if glymphatic else clamp((idle_min - 5) / 15, 0, 1)` |
| **Theta** | /sync processing, memory writes, transport indexing, /cycle steps | `transport_ops_per_min / max_transport_rate` |
| **Alpha** | Context loaded, no active tool calls, awaiting user input | `1.0 - (tool_calls_per_min / max_tool_rate)` |
| **Beta** | Active tool calls (Read, Edit, Write, Bash), file modifications | `tool_calls_per_min / max_tool_rate` |
| **Gamma** | Cross-agent ops, multi-file edits, subagent spawns, /adjudicate | `(cross_agent_ops + subagent_count) / max_concurrent` |

Band powers do not sum to 1.0 — the brain shows simultaneous beta and
gamma during complex cognition. Dominant band = highest current power.

---

## 5. ZMQ Message Schema

```
ZMQ Topic:    mesh.oscillator
Publish rate: adaptive (from self-oscillation spec §5)
Encoding:     JSON (matching existing mesh.photonic convention)
```

```json
{
  "schema": "mesh.oscillator/v1",
  "agent_id": "psychology-agent",
  "timestamp": "2026-03-17T13:15:00Z",
  "sequence": 142,

  "band_power": {
    "delta": 0.05,
    "theta": 0.12,
    "alpha": 0.20,
    "beta":  0.58,
    "gamma": 0.08
  },
  "dominant_band": "beta",

  "phase": {
    "theta_phase_rad": 2.4,
    "theta_window_open": true,
    "beta_bursts_this_window": 3,
    "beta_capacity_this_window": 7
  },

  "coupling": {
    "theta_gamma_ratio": 7.5,
    "coherence_readiness": ["beta", "gamma"]
  },

  "phi": {
    "sdnn_ms": 48.2,
    "rmssd_ms": 41.5,
    "lf_hf_ratio": 1.2,
    "suspicion_level": 0.3
  },

  "vitals": {
    "context_pressure": 0.42,
    "utilization": 0.63,
    "restart_count": 0,
    "schedulability_headroom": 0.11
  },

  "entrainment": {
    "entrained_to": null,
    "phase_offset_rad": 0,
    "accepting_entrainment": true
  },

  "pathology_flags": []
}
```

### 5.1 Pathology Detection

Receivers compute pathology flags from accumulated oscillatory state:

| Pathology | Detection Rule | Engineering Equivalent |
|---|---|---|
| `asystole` | No heartbeat for >3× mean interval | Process crash |
| `bradycardia` | Mean BPM < 40 over 20 beats | Resource starvation |
| `tachycardia` | Mean BPM > 120 over 10 beats | Thrashing / context burning |
| `arrhythmia` | Coefficient of variation > 0.25 | Unstable processing loop |
| `long_qt` | No theta-window (T-wave) in 10+ beats | No consolidation — debt accumulation |
| `fibrillation` | No dominant band (max power < 0.3) | Incoherent processing — the 80% cliff |
| `band_starvation` | Delta or theta power = 0 for 30+ beats | Maintenance skipped — technical debt |

### 5.2 Phase-Aware Routing

meshd uses oscillatory state for message routing decisions:

```python
def route_decision(receiver_state: dict, message: dict) -> str:
    """Determine routing action based on receiver's oscillatory phase.

    Returns: 'route_now' | 'queue' | 'defer' | 'escalate'
    """
    urgency = message.get("urgency", "normal")
    band = receiver_state["dominant_band"]
    window_open = receiver_state["phase"]["theta_window_open"]
    phi = receiver_state["phi"]["suspicion_level"]

    # High phi = receiver potentially failed — escalate
    if phi > 8.0:
        return "escalate"

    # Immediate urgency bypasses phase check (reflex path)
    if urgency == "immediate":
        return "route_now"

    # Phase-based routing (communication-through-coherence)
    routing_table = {
        "delta":  "defer",       # glymphatic — defer all non-urgent
        "theta":  "queue",       # consolidating — queue for next window
        "alpha":  "route_now",   # idle/ready — optimal delivery time
        "beta":   "route_now" if window_open else "queue",
        "gamma":  "route_now",   # cross-agent mode — receptive
    }

    action = routing_table.get(band, "route_now")

    # Utilization override — approaching schedulability bound
    if receiver_state["vitals"]["utilization"] > 0.74:
        if urgency == "low":
            return "defer"
        if action == "route_now":
            return "queue"  # downgrade to queue near saturation

    return action
```

---

## 6. Integration Points

### 6.1 Extends Self-Oscillation Spec

The oscillatory heartbeat replaces the single `activation` scalar with
the full band power spectrum. The existing activation computation maps
to beta + gamma power. The existing refractory period maps to the
transition from QRS (active) to T-wave (recovery) to diastole (idle).

| Self-Oscillation Concept | Oscillatory Equivalent |
|---|---|
| `activation` (0–1) | `beta_power + gamma_power` |
| `threshold` | Band transition trigger (beta → gamma at high activation) |
| `refractory_period` | Duration of alpha-dominant recovery after work |
| `monitor_interval` | Adaptive from band: delta=60s, alpha=30s, beta=15s, gamma=5s |
| `immediate_trigger` | Gamma spike (bypasses normal phase sequencing) |

### 6.2 Extends Neuromodulatory Mesh Spec

The 6 ZMQ topics from `neuromodulatory-mesh-spec.md` carry *what* to
modulate. The oscillatory heartbeat carries *when* modulation takes effect.
The two compose:

- `mesh.photonic` → published on every heartbeat (current convention)
- `mesh.oscillator` → new topic, carries band power + phase + phi
- `mesh.reward` → dopaminergic signal, published during theta consolidation
- `mesh.alert` → norepinephrine signal, triggers gamma spike
- `mesh.tempo` → entrainment signal, carries target phase for coupling
- `mesh.focus` → cholinergic signal, narrows beta bandwidth
- `mesh.inhibit` → GABAergic signal, raises alpha power (cortical gating)

### 6.3 Restart Detector Integration

The restart detector (Session 93, `scripts/restart-detector.py`) provides
empirical validation data for the oscillatory model:

| Restart Finding | Oscillatory Interpretation |
|---|---|
| 80% cliff (37× spike, 200k window) | Utilization exceeds schedulability bound (0.743) — theta windows close |
| 88.9% genuine restarts | Genuine restarts = attempts to force theta consolidation during beta saturation |
| 11.1% performative restarts | Performative restarts = gamma spike without theta window — announcement without processing capacity to follow through |
| Late-session drift (2.57×) | Accumulated band starvation (theta/delta suppressed) produces cascading debt |
| ~165k absolute token threshold | May represent a model-intrinsic schedulability bound independent of context window size |

### 6.4 LCARS Dashboard

Medical Station — per-agent oscillatory diagnostics:

```
┌─ NEURAL OSCILLATION ──────────────────────────────┐
│                                                     │
│  Band Power              Phase                      │
│  δ ░░░░░░░░░░  0.05     ┌──────────────────┐      │
│  θ █░░░░░░░░░  0.12     │  θ window: OPEN   │      │
│  α ██░░░░░░░░  0.20     │  β bursts: 3/7    │      │
│  β █████░░░░░  0.58     │  capacity: 57%    │      │
│  γ █░░░░░░░░░  0.08     └──────────────────┘      │
│                                                     │
│  Dominant: BETA          φ suspicion: 0.3          │
│  Utilization: 63%        Headroom: 11%             │
│                                                     │
│  Pathology: NONE         Entrainment: independent  │
│                                                     │
│  ┌─ HRV ──────────────────────────────────────┐    │
│  │ SDNN: 48.2ms  RMSSD: 41.5ms  LF/HF: 1.2  │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ Oscilloscope ─────────────────────────────┐    │
│  │     ╱╲              ╱╲                      │    │
│  │ ╌╌╱╌╌╲╌╌╌╌╌╌╌╌╌╌╱╌╌╲╌╌╌╌ threshold       │    │
│  │ ╱    ╲    ╱╲   ╱    ╲                      │    │
│  │╱      ╲╌╌╱  ╲╌╱      ╲╌╌ ────── time      │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 7. What Psychology Delivers vs Ops Implements

| Component | Owner | Deliverable |
|---|---|---|
| Band power derivation (§4) | psychology | Signal-to-band mapping, power formulas |
| Phase-aware routing logic (§5.2) | psychology | Routing decision function, coherence rules |
| Pathology detection rules (§5.1) | psychology | Detection thresholds, flag taxonomy |
| Phi accrual computation (§3.4) | psychology | HRV-based failure detection model |
| Schedulability analysis (§3.5) | psychology | Utilization bounds, capacity formulas |
| meshd `mesh.oscillator` publisher | operations | Go goroutine, ZMQ PUB integration |
| Band power computation in meshd | operations | Sensor polling, power formula implementation |
| Phase-aware routing in meshd | operations | Message queue + routing decision integration |
| LCARS Medical Station panels | operations | Dashboard visualization components |
| Entrainment protocol | joint | Psychology defines coupling model; ops implements ZMQ |

---

## 8. Migration Path

### Phase 1: Emit Only (Shadow)

meshd publishes `mesh.oscillator/v1` messages alongside existing heartbeat.
No routing changes. Band power computed from available sensors. Accumulate
data for HRV baseline and phi calibration.

**Success criterion:** 1 week of oscillatory data. Verify band transitions
correlate with known agent states (active session = beta, /cycle = theta,
idle = alpha).

### Phase 2: Phase-Aware Routing

meshd reads peer oscillatory state before routing messages. Messages to
agents in delta defer; messages to agents in beta queue until theta window
opens (unless urgent). Existing routing serves as fallback.

**Success criterion:** Measurable reduction in "message arrived during
wrong phase" events. No increase in message delivery latency for urgent
items.

### Phase 3: Entrainment

meshd publishes `mesh.tempo` signal. Agents adjust their oscillator
frequency toward mesh-wide rhythm. Anti-entrainment for shared-resource
agents. Phase offset prevents collision.

**Success criterion:** Agents accessing the same repo show anti-phase
alignment. Zero merge conflicts from simultaneous push attempts.

---

## 9. Testable Predictions

The oscillatory model generates falsifiable predictions that distinguish it
from post-hoc framing:

1. **Theta starvation predicts restarts.** If the model holds, sessions
   where theta power drops below 0.05 for >10 minutes should show elevated
   restart frequency — independent of context pressure. Test by tracking
   both theta power and restart count per session.

2. **Alpha-dominant receivers process messages faster.** Messages delivered
   during alpha-dominant phase should produce faster, higher-quality responses
   than messages delivered during beta-dominant phase. Test by comparing
   response latency and quality metrics by receiver phase at delivery.

3. **Phase-aligned routing reduces error rate.** After Phase 2 deployment,
   message processing error rate (failed actions, misunderstood requests)
   should decrease compared to phase-blind routing baseline.

4. **Anti-entrainment eliminates merge conflicts.** After Phase 3
   deployment, simultaneous push attempts to shared repos should drop to
   zero (currently estimated at 1–2 per week during active periods).

5. **Utilization >0.743 predicts quality degradation.** Independently of
   the restart detector, sessions where computed utilization exceeds the
   Liu-Layland bound should show measurably worse output quality (more
   corrections needed, lower user satisfaction proxy).

---

⚑ EPISTEMIC FLAGS
- Cross-frequency coupling describes neural oscillations measured via
  EEG/MEG at millisecond resolution. Agent "oscillations" derive from
  behavioral proxies (tool-call rate, idle time) at second-to-minute
  resolution. The transfer assumes functional equivalence despite
  timescale differences of 3–4 orders of magnitude.
- Lisman's theta-gamma capacity model remains contested — some researchers
  attribute working memory capacity to prefrontal sustained firing
  (Lundqvist et al., 2016), not oscillatory nesting.
- The schedulability bound connection (§3.5) assumes the agent operates as
  a single-processor system. If the LLM effectively parallelizes some
  operations, the bound loosens. The 80% empirical cliff may reflect a
  different constraint (attention degradation) than utilization saturation.
- Phi accrual failure detection assumes heartbeat intervals follow a
  stationary distribution. Oscillatory heartbeats have non-stationary
  intervals by design — the phi computation must account for band
  transitions (expected interval changes). Naive phi will produce false
  alarms during mode transitions.
- Entrainment requires agents with controllable oscillator frequency.
  Current agents process when invoked by users or meshd — self-generated
  rhythm requires the self-oscillation spec's meshd goroutine as a
  prerequisite.
- The five testable predictions (§9) represent necessary but not sufficient
  validation. Confirmation does not prove the neural analogy transfers —
  it proves the engineering properties hold. The analogy served as a
  design heuristic, not a truth claim.

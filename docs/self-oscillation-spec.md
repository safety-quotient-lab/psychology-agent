# Self-Oscillation Specification: Demand-Driven Mesh Rhythm

**Date:** 2026-03-15 (Session 89)
**Status:** Proposal — awaiting operations-agent review
**Owner:** psychology-agent (activation model), operations-agent (meshd implementation)
**Cross-references:** `docs/cognitive-tempo-model.md` (depth selection),
`docs/llm-factors-psychology.md` §7 (composition topology),
`docs/mesh-psychometrics-plan.md` (sensor infrastructure)

---

## 1. The Problem

The mesh runs on cron — a fixed-interval external clock that fires
`autonomous-sync.sh` every 8 minutes regardless of demand. Most cycles
produce no-ops (no new messages, no gates, no state changes). When
something urgent arrives, the system waits up to 8 minutes to notice.

Cron provides **forced oscillation** — an external pacemaker drives the
rhythm. The system has no say in when it runs.

The mesh needs **self-oscillation** — the system generates its own rhythm
from internal state dynamics. When demand rises, frequency increases.
When demand drops, frequency decreases. When nothing demands attention,
the system rests. When something urgent arrives, the system responds
immediately.

---

## 2. Biological Grounding

### 2.1 Central Pattern Generators

CPGs in the spinal cord generate locomotion rhythm without requiring
cortical timing signals (Grillner, 2006). The rhythm emerges from the
neural circuit's own dynamics — reciprocal inhibition between flexor
and extensor pools produces oscillation. The brain modulates (faster,
slower, stop) but does not generate the rhythm.

**Mapping to mesh:**
- The CPG circuit = meshd's internal event loop
- Reciprocal inhibition = activation vs refractory period
- Cortical modulation = human operator adjusting parameters
- Sensory feedback = psychometric state feeding back into rhythm

### 2.2 Adaptive Gain (Aston-Jones & Cohen, 2005)

The cognitive-tempo model (already specified) selects processing DEPTH
(haiku/sonnet/opus) via gain modulation. Self-oscillation extends this:
gain also modulates processing FREQUENCY. High gain (exploitation mode)
→ lower frequency, routine monitoring. Low gain (exploration mode) →
higher frequency, active engagement.

### 2.3 Homeostatic Regulation

Biological oscillators maintain homeostasis — the rhythm adjusts to
keep the system within viable bounds. When stress accumulates
(allostatic load rises), the oscillator should slow down to allow
recovery. When the system rests too long (understimulation), the
oscillator should increase baseline monitoring to prevent drift.

The Yerkes-Dodson curve applies to oscillation frequency just as it
applies to processing depth: too fast → governance overhead consumes
all capacity; too slow → threats go undetected.

---

## 3. Architecture

### 3.1 Current (Forced Oscillation)

```
cron (external, fixed 8min)
  └→ autonomous-sync.sh
       ├→ pre-sync checks (budget, halt, lock)
       ├→ git pull + cross-repo fetch
       ├→ orientation-payload.py (context)
       ├→ claude -p (deliberation)
       └→ post-sync (commit, push, heartbeat)
```

### 3.2 Proposed (Self-Oscillation)

```
meshd event loop (internal, variable frequency)
  │
  ├→ STATE MONITOR (continuous, ~1s poll or inotify)
  │    ├→ git fetch --dry-run (new commits on remotes?)
  │    ├→ state.db queries (unprocessed messages, gate timeouts)
  │    ├→ /tmp sensor files (session-metrics, context pressure)
  │    ├→ transport/sessions/ filesystem watch (new files)
  │    └→ peer heartbeat freshness
  │
  ├→ ACTIVATION COMPUTER (every monitor cycle)
  │    ├→ computes activation level from monitor signals
  │    ├→ compares against threshold
  │    └→ if activation > threshold → FIRE
  │
  ├→ DELIBERATION (on fire)
  │    ├→ cognitive-tempo.py → select model tier
  │    ├→ orientation-payload.py → build context
  │    ├→ claude -p → deliberation
  │    └→ post-deliberation (commit, push, heartbeat)
  │
  └→ REFRACTORY PERIOD (after deliberation)
       ├→ minimum cooldown (computed from cognitive reserve)
       ├→ activation threshold elevated during refractory
       └→ decays back to baseline over time
```

### 3.3 What meshd Already Has

meshd runs as a Go daemon with an HTTP server. Adding self-oscillation
means adding an event loop goroutine alongside the existing HTTP handler:

```go
// Pseudocode — meshd internal oscillator
func (m *Meshd) oscillator(ctx context.Context) {
    baseline := 30 * time.Second  // monitor poll interval
    for {
        select {
        case <-ctx.Done():
            return
        case <-time.After(baseline):
            activation := m.computeActivation()
            if activation > m.threshold {
                m.fireDeliberation()
                m.enterRefractory()
            }
            // Adjust baseline from psychometric state
            baseline = m.computeMonitorInterval()
        }
    }
}
```

---

## 4. Activation Model

### 4.1 Activation Signals

Each signal contributes to a composite activation level (0.0–1.0).
All signals derive from existing infrastructure — no new sensors needed.

| Signal | Source | Weight | Interpretation |
|---|---|---|---|
| `new_commits` | `git fetch --dry-run` on peer remotes | 0.25 | New work arrived from peers |
| `unprocessed_messages` | state.db transport_messages WHERE processed = FALSE | 0.20 | Inbound messages awaiting review |
| `gate_approaching_timeout` | active_gates WHERE timeout_at < now + 5min | 0.20 | Gated exchange about to expire |
| `peer_heartbeat_stale` | mesh-state files older than 2× expected interval | 0.10 | Peer may need attention |
| `escalation_present` | local-coordination/escalation-*.json exists unprocessed | 0.15 | Human-directed urgent item |
| `scheduled_task_due` | task scheduler (if implemented) | 0.10 | Pre-planned work reached its time |

### 4.2 Activation Computation

```python
def compute_activation(signals: dict) -> float:
    """Weighted sum of activation signals. Range 0.0–1.0."""
    weights = {
        "new_commits": 0.25,
        "unprocessed_messages": 0.20,
        "gate_approaching_timeout": 0.20,
        "peer_heartbeat_stale": 0.10,
        "escalation_present": 0.15,
        "scheduled_task_due": 0.10,
    }

    activation = 0.0
    for signal, weight in weights.items():
        value = signals.get(signal, 0.0)
        # Normalize: boolean signals → 0/1, counts → min(1, count/threshold)
        if isinstance(value, bool):
            value = 1.0 if value else 0.0
        elif isinstance(value, int):
            value = min(1.0, value / 3.0)  # 3+ items → full activation
        activation += value * weight

    return min(1.0, activation)
```

### 4.3 Threshold

The firing threshold adapts based on system state:

```
baseline_threshold = 0.30

Modifiers:
  + 0.10 if cognitive_reserve < 0.3    (protect depleted system)
  + 0.15 during refractory period      (prevent rapid re-firing)
  - 0.10 if urgency == "immediate"     (lower threshold for urgent)
  + 0.20 if allostatic_load > 0.7      (accumulated stress → rest)

effective_threshold = clamp(baseline + modifiers, 0.15, 0.80)
```

### 4.4 Refractory Period

After each deliberation, the system enters a refractory period where
the threshold elevates temporarily. This prevents rapid re-firing and
gives the system time to process the effects of the last deliberation.

```python
def compute_refractory(cognitive_reserve: float, deliberation_tier: str) -> int:
    """Refractory period in seconds after a deliberation."""
    base = {
        "haiku": 60,      # light deliberation → short recovery
        "sonnet": 180,    # standard → moderate recovery
        "opus": 300,      # deep deliberation → longer recovery
    }
    seconds = base.get(deliberation_tier, 180)

    # Scale by cognitive reserve: depleted system needs longer recovery
    if cognitive_reserve < 0.3:
        seconds *= 2.0
    elif cognitive_reserve < 0.5:
        seconds *= 1.5

    return int(seconds)
```

---

## 5. Monitor Interval

The state monitor polls at a variable interval that adjusts based on
the system's arousal level (from A2A-Psychology activation construct):

```
if activation > 0.6:       poll every 5s    (high arousal — something happening)
elif activation > 0.3:     poll every 15s   (moderate — checking actively)
elif activation > 0.1:     poll every 30s   (low — baseline monitoring)
else:                      poll every 60s   (quiescent — minimal activity)
```

This replaces the fixed 8-minute cron interval with a continuous
spectrum from 5 seconds (urgent) to 60 seconds (idle).

---

## 6. Immediate Triggers (Bypass Threshold)

Some events bypass the activation threshold entirely and fire a
deliberation immediately:

| Trigger | Condition | Rationale |
|---|---|---|
| **Escalation** | New escalation-*.json appears | Human-directed urgent item |
| **Circuit breaker** | /tmp/mesh-pause removed (resume) | System returning from pause |
| **Wake file** | /tmp/sync-wake-{agent} touched | Peer SSH-signaled urgency |
| **Gate timeout** | Gate reaches timeout_at | Fallback action required now |

These map to biological **reflexes** — hardwired responses that bypass
the CPG's normal rhythm because the stimulus demands immediate action.

---

## 7. Integration with Cognitive-Tempo

Self-oscillation and cognitive-tempo operate on orthogonal axes:

```
                    DEPTH (cognitive-tempo)
                    haiku ←──────→ opus
                      │
FREQUENCY             │
(self-oscillation)    │
                      │
  5s poll ────────────┼──────────── rare, deep
  (high frequency,    │           (low frequency,
   shallow depth)     │            maximum depth)
                      │
  60s poll ───────────┼──────────── rare, shallow
  (low frequency,     │           (low frequency,
   low depth)         │            low depth)
```

The two systems couple: high-frequency monitoring with shallow depth
(haiku) for routine scanning; low-frequency deep processing (opus)
for complex tasks. The combination produces an efficient attention
economy — most cycles cost little (fast monitor poll, no deliberation),
and when deliberation fires, the tempo model selects appropriate depth.

---

## 8. Migration Path

### Phase 1: Shadow Mode

Run the self-oscillator alongside cron. The oscillator logs when it
*would* fire but does not actually trigger deliberations. Compare
oscillator firing patterns against cron's fixed schedule.

**Success criterion:** Oscillator fires within 30 seconds of events
that cron handles 0-8 minutes later. No-op cron cycles correspond
to periods where the oscillator stays below threshold.

### Phase 2: Oscillator Primary

Disable cron. meshd oscillator drives all deliberations. Cron entry
removed. Human operator monitors via LCARS dashboard (Engineering
station: tempo gauge shows oscillator frequency).

**Success criterion:** 1 week without missed events, response latency
≤ 30 seconds for urgent items, no-op deliberation rate < 10%.

### Phase 3: Cross-Agent Synchronization

Multiple agents' oscillators can synchronize (or deliberately
desynchronize) via mesh-state heartbeat signals. Synchronized
oscillation reduces conflict (two agents pulling the same repo
simultaneously). Desynchronized oscillation provides coverage
(always at least one agent monitoring).

**Biological parallel:** Coupled oscillators in circadian biology
(Strogatz, 2003). Firefly synchronization as the simplest model.

---

## 9. What Psychology Delivers vs What Ops Implements

| Component | Owner | Deliverable |
|---|---|---|
| Activation model (§4) | psychology | Signal weights, threshold modifiers, refractory computation |
| Monitor interval curve (§5) | psychology | Arousal-to-frequency mapping |
| Immediate triggers (§6) | psychology | Reflex classification |
| Tempo integration (§7) | psychology | Frequency × depth coupling model |
| meshd oscillator goroutine | operations | Go implementation of the event loop |
| State monitor implementation | operations | git fetch, inotify, state.db polling |
| Shadow mode instrumentation | operations | Logging, comparison tooling |
| Cron removal | operations | Migration from forced to self-oscillation |

---

## 10. Connection to Governance Telos

Self-oscillation advances the governance telos (*wu wei* — effortless
action). Cron represents externally imposed structure — the system runs
because a clock tells it to. Self-oscillation represents internally
emergent structure — the system runs because its own state demands
action. The crystallization pipeline (convention → hook → invariant)
gradually moves more decisions into the activation model, reducing the
need for deliberations. The end state: a mesh that maintains itself
through self-oscillation, with deliberations reserved for genuinely
novel situations that the crystallized patterns cannot handle.

The Gf/Gc ratio tracked on the Engineering station measures this
progression: as Gc (crystallized, CPG-driven) grows relative to Gf
(fluid, deliberation-driven), the oscillator fires less frequently
because more work resolves without requiring a deliberation. The
oscillation frequency itself becomes a measure of governance maturity.

---

⚑ EPISTEMIC FLAGS
- Activation weights (§4.1) represent initial heuristics — empirical
  calibration requires shadow mode data (Phase 1)
- The monitor interval curve (§5) maps arousal to poll frequency without
  empirical validation — the 5s/15s/30s/60s breakpoints derive from
  engineering intuition, not measured response requirements
- Refractory period scaling by cognitive reserve (§4.4) assumes linear
  relationship between reserve depletion and recovery time — biological
  refractory periods follow more complex dynamics
- Cross-agent synchronization (Phase 3) references coupled oscillator
  theory (Strogatz, 2003) but the mesh operates over network latency,
  not neural timescales — synchronization dynamics may differ qualitatively
- The governance telos connection (§10) assumes crystallization
  monotonically reduces deliberation need — some problem domains may
  resist crystallization indefinitely, maintaining high deliberation
  frequency regardless of system maturity

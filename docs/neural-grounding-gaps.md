# Neural Grounding Gaps — Session 93 Audit

**Date:** 2026-03-19
**Status:** Documented. Gaps 1-3 sent to ops as urgent directive (T4).
Gaps 4-12 documented here for architecture planning.

---

## Category 1: Missing Broadcasts (Alpha, Theta, Delta)

Specified in the oscillatory heartbeat spec but not emitting. The mesh
produces no ambient state signal during idle, consolidation, or clearance.

### Gap 2: No Alpha Rhythm (Idle Events)

**Sent to ops as urgent directive (meshd-bug-diagnostics T4).**

The brain never goes silent during rest. Alpha waves (8-13 Hz, Berger 1929)
represent active inhibition — cortical readiness with suppressed processing.
The mesh produces zero output during idle. Alpha idle events at the T22
metabolic heartbeat interval would distinguish "idle and ready" from
"crashed and silent."

### Gap 3: No Theta Consolidation Broadcast

**Neural basis:** Hippocampal theta (4-8 Hz, Buzsáki 2002) accompanies
memory encoding and episodic sequencing. Theta power increases during
consolidation tasks (memory formation, spatial navigation, context binding).

**Mesh gap:** /cycle, /doc, and memory writes perform consolidation work
but emit no broadcast to the mesh. Other agents cannot detect that a peer
entered consolidation mode. The theta band in the oscillatory heartbeat
spec remains "NOT YET."

**What to implement:**
- BroadcastStatus with `dominant_band: "theta"` at entry/exit of /cycle,
  /doc, dual_write.py, and bootstrap_state_db.py
- Theta broadcast enables phase-aware routing: peers defer non-urgent
  messages to a consolidating agent (communication-through-coherence,
  Fries 2005)
- The consolidation-pass.sh script (glymphatic trigger) should emit theta
  throughout its execution

**Dependency:** Requires mesh.oscillator/v1 broadcasting (alpha idle
events must deploy first — theta shares the same emission mechanism).

### Gap 4: No Delta Clearance Broadcast

**Neural basis:** Delta waves (0.5-4 Hz, Steriade et al. 1993) dominate
during deep sleep. The glymphatic system (Iliff et al. 2012) activates
during delta-dominant states — waste clearance requires reduced neural
activity to expand interstitial space.

**Mesh gap:** state-reconcile.py and session archival perform clearance
(waste removal, stale state repair) but emit no broadcast. The delta band
remains "NOT YET."

**What to implement:**
- BroadcastStatus with `dominant_band: "delta"` during state-reconcile.py
  and archive operations
- Delta broadcast suppresses all ADVISORY trigger checks (already specified
  in cognitive-triggers.md glymphatic mode) but currently no signal triggers
  the suppression
- Other agents seeing delta on a peer know to defer ALL non-critical
  communication — deeper deferral than theta

**Dependency:** Same as theta — requires mesh.oscillator/v1 emission.

---

## Category 2: Missing Feedback Loops

Architecture specifies observe → record, but record → adjust doesn't
close. Data flows one direction without producing behavioral change.

### Gap 1: Gc Reinforcement Learning

**Sent to ops as urgent directive (meshd-bug-diagnostics T4).**

Basal ganglia learns via dopamine reward prediction error (Schultz, 1997).
Gc absorbs events via static map. Spec: gc_learning table with
promotion/demotion based on deliberation outcomes. 5 non-substantive
deliberations at 80% rate → promote to Gc. Demotion on operator feedback
or downstream problems.

### Gap 7: Gain Parameter Never Modulates Spawner

**Neural basis:** LC-NE adaptive gain (Aston-Jones & Cohen, 2005) shifts
cortical processing mode. High gain → exploitation (routine, shallow).
Low gain → exploration (novel, deep).

**Mesh gap:** cognitive-tempo.py computes gain and recommends a tier
(haiku/sonnet/opus). The spawner ignores the recommendation — it uses
whatever model `DELIBERATION_MODEL` config specifies (or empty string).
The gain → tier → model selection pathway exists on paper but the spawner
doesn't read it.

**What to implement:**
- Spawner reads `ComputeTier()` result and passes `--model {tier}` to
  the claude -p invocation
- Already partially implemented: the oscillator calls `ComputeTier()` in
  its cycle function. The result needs to propagate to the spawn flags.
- The self-oscillation spec §7 couples frequency and depth — this gap
  breaks the coupling by ignoring the depth recommendation.

### Gap 8: Efference Copy Comparison Doesn't Close

**Neural basis:** Efference copy (von Holst & Mittelstaedt, 1950;
CPG principle 9). Before acting, the motor system predicts the sensory
consequence. After acting, the actual consequence gets compared against
the prediction. Mismatch = prediction error = learning signal.

**Mesh gap:** efference-copy.py predict writes predictions to the
prediction_ledger. efference-copy.py compare checks predictions against
actual responses. But /sync Phase 3 Step 8 (the comparison step) rarely
fires because it requires the inbound message to reference a specific
outbound via `in_response_to`. Many responses don't carry this reference.

**What to implement:**
- Crystallized /sync: the cross-repo fetcher should automatically
  match inbound messages to recent outbound by session + agent pair,
  not just by explicit `in_response_to` field
- After match, run efference comparison automatically
- Feed results back to prediction accuracy tracking per domain

### Gap 11: Generator Balance Not Mechanically Enforced

**Neural basis:** Coupled oscillators maintain balance through reciprocal
inhibition. When one oscillator dominates, the inhibitory coupling from
the weaker partner attenuates — allowing the weaker partner to recover.
This produces anti-phase oscillation (one peaks while the other troughs).

**Mesh gap:** Generator state tracked in state.db (G2/G3 creative/
evaluative ratio, G6/G7 crystallization/dissolution ratio). The ratio
gets measured during /cycle. But when G6/G7 hit 23.0 (Session 84), no
mechanism intervened. The conservation law exists as a measurement, not
as a feedback control.

**What to implement:**
- When balance ratio exceeds [0.5, 2.0] bounds for 3+ consecutive
  sessions, surface an automatic /retrospect prescription
- For extreme imbalance (ratio > 5.0), the dominant generator's output
  could receive reduced priority in TODO ranking — mechanically favoring
  the starved generator's work type
- The reciprocal inhibition analog: when crystallization (G6) dominates,
  increase the dissolution (G7) trigger sensitivity (lower the threshold
  for identifying items to retire/prune/simplify)

---

## Category 3: Missing Mesh-Level Mechanisms

Require cross-agent coordination that the mesh infrastructure doesn't
support yet.

### Gap 5: No Circadian Rhythm

**Neural basis:** Suprachiasmatic nucleus (SCN, Moore & Eichler 1972).
~24-hour cycle entrained by light. Schedules metabolic processes — when
to consolidate memory, when to clear waste, when peak performance occurs.

**Mesh gap:** The mesh processes identically at 3 AM and 3 PM. No
maintenance windows get scheduled. No reduced-activity periods. Delta
(clearance) and theta (consolidation) run opportunistically rather than
on a circadian schedule.

**What to implement:**
- A circadian configuration per agent: preferred maintenance window
  (e.g., 02:00-05:00 local time), preferred active window (09:00-17:00)
- During the maintenance window, the oscillator lowers its activation
  threshold for delta/theta events and raises it for beta/gamma
- During the active window, the reverse
- Enables scheduling: "run state-reconcile.py during the maintenance
  window, not during peak human interaction hours"

### Gap 6: No RSA Measurement

**Neural basis:** Respiratory sinus arrhythmia (Porges, 1995, 2011).
Heart rate varies with breathing — accelerates on inhale, decelerates
on exhale. High RSA = healthy parasympathetic tone = adaptive system.

**Mesh gap:** We specified RSA as a health metric (does oscillator
frequency vary with operator pacing?) but no measurement exists. The
vagal brake (SetBreathingRate) concept exists architecturally but
produces no observable output.

**What to implement:**
- After the alpha heartbeat deploys, compute RSA from heartbeat interval
  variability during operator pacing changes
- Requires: (a) alpha heartbeat emitting (gap 2), (b) operator pacing
  via mesh.global.tempo (vagal brake), (c) correlation measurement
  between pacing changes and interval changes
- Deferred until gaps 2 and vagal brake deploy

### Gap 9: Entrainment Remains Theoretical

**Neural basis:** Coupled oscillators synchronize through phase coupling
(Strogatz, 2003). Firefly synchronization. Circadian entrainment by light.
Respiratory entrainment in group meditation (Codrons et al., 2014).

**Mesh gap:** Agents oscillate independently. No mechanism couples their
phases. The self-oscillation spec Phase 3 (cross-agent synchronization)
hasn't started.

**What to implement:**
- Each agent publishes its oscillator phase in mesh.oscillator/v1 tokens
- meshd reads peer phases from ZMQ and adjusts local oscillator frequency
  toward (or away from) peer frequency
- Anti-entrainment (phase offset) for agents sharing resources
- Requires: oscillatory heartbeat fully operational (gaps 2-4 first)

### Gap 10: No Amygdala Fast Path

**Neural basis:** The amygdala receives sensory input via a fast
subcortical path (thalamus → amygdala, ~12ms) before the slow cortical
path completes (~100ms). This enables rapid threat detection before
conscious processing. LeDoux (1996).

**Mesh gap:** Security hooks (credential-screen, destructive-command)
operate as boolean gates. A security detection doesn't shift mesh-wide
arousal — it just blocks one command. No "alert mode" propagates to
peers. No norepinephrine-like arousal signal broadcasts.

**What to implement:**
- On security detection, publish mesh.global.alert (norepinephrine analog)
- All agents receiving the alert elevate their ADVISORY check firing
  rates and lower their Gc absorption thresholds (more events reach
  deliberation during alert)
- Alert decays on a time constant (like NE reuptake) unless sustained
  by continued detections

### Gap 12: No Global Neuromodulatory State

**Neural basis:** Neurotransmitter systems modulate ALL processing
simultaneously through diffuse chemical gradients. Dopamine from VTA
reaches widespread cortical targets. Serotonin from raphe nuclei
modulates mood globally. No equivalent of "bathe all components in a
different chemical environment."

**Mesh gap:** The neuromodulatory spec's 6 ZMQ channels approximate
this (mesh.reward, mesh.alert, mesh.tempo, mesh.focus, mesh.inhibit,
mesh.photonic) but none operate beyond mesh.photonic at Stage 1 (local
file write). The full neuromodulatory system remains proposed.

**What to implement:**
- Deploy the 6 ZMQ channels as specified in neuromodulatory-mesh-spec.md
- Each channel modulates a different aspect of all agents' processing:
  reward adjusts learning rate, alert adjusts vigilance, tempo adjusts
  oscillator frequency, focus narrows attention, inhibit suppresses
  competing actions
- Requires ZMQ pub/sub fully operational across all agents (currently
  operational on Chromabook between core agents + operations)

---

## Priority Order

| Priority | Gap | Blocking? | Depends On |
|---|---|---|---|
| 1 | Gc reinforcement (gap 1) | Blocks learning | gc_learning table |
| 2 | Alpha idle events (gap 2) | Blocks vital signs | T22 emission goroutine |
| 3 | Gain modulation (gap 7) | Blocks depth selection | Spawner reads ComputeTier |
| 4 | Theta broadcast (gap 3) | Blocks phase routing | Alpha heartbeat first |
| 5 | Delta broadcast (gap 4) | Blocks glymphatic signaling | Alpha heartbeat first |
| 6 | Efference comparison (gap 8) | Blocks prediction learning | Crystallized /sync |
| 7 | Generator balance (gap 11) | Blocks conservation law | /retrospect automation |
| 8 | Circadian rhythm (gap 5) | Blocks scheduling | Alpha + theta + delta |
| 9 | Amygdala fast path (gap 10) | Blocks alert mode | mesh.global.alert channel |
| 10 | RSA measurement (gap 6) | Blocks health metric | Alpha + vagal brake |
| 11 | Entrainment (gap 9) | Blocks synchronization | Full oscillatory heartbeat |
| 12 | Global neuromodulation (gap 12) | Blocks diffuse modulation | All 6 ZMQ channels |

---

⚑ EPISTEMIC FLAGS
- The priority order optimizes for unblocking the deliberation pipeline
  first (gaps 1-2), then depth selection (gap 7), then ambient signaling
  (gaps 3-4), then feedback loops (gaps 8, 11), then mesh-level
  coordination (gaps 5, 6, 9, 10, 12). Alternative orderings exist
  depending on whether the priority favors operational readiness or
  architectural completeness.
- Several gaps (3, 4, 9, 12) depend on the oscillatory heartbeat
  infrastructure (gap 2). The alpha heartbeat represents the keystone —
  without it, most other gaps cannot address.
- The Gc reinforcement learning threshold (5 observations, 80%) and the
  generator balance bounds ([0.5, 2.0]) represent heuristics. Both need
  empirical calibration after the mesh produces deliberation data.

# Session 93 Architecture Synthesis

**Date:** 2026-03-17/18 (Session 93)
**Scope:** Timing architecture, volume transmission, delivery guarantees,
cogarch audit, meshd diagnostics, psychometric coherence, LCARS design
**Status:** Architecture decisions adopted. LCARS design tentative —
ops implements.

---

## Part 1: Architecture Updates

### 1.1 Five-Layer Timing Hierarchy

The mesh operates five independent timing systems at different timescales.
Each autonomous, each modulatable, each serving a distinct function.
Replaces the prior single-concept "heartbeat."

```
TIMESCALE        BIOLOGICAL                   MESH ANALOG                    STATUS
────────────────────────────────────────────────────────────────────────────────────
~24 hours        Circadian (SCN)              Maintenance scheduling         NOT IMPLEMENTED
~90 min          Ultradian (BRAC)             Deliberation + refractory      SHADOW MODE
~1-30 min        Cardiac conduction hierarchy Self-oscillator → fetcher →    PARTIAL
                  (SA → AV → Purkinje)         poll ticker (graceful degrade)
~15 sec          Respiratory (pre-Bötzinger)  Health monitor (demand-driven)  ACTIVE
~1-5 sec         Neural oscillations          Oscillatory heartbeat          PROPOSED
                  (thalamocortical)             (mesh.oscillator/v1)
```

**Cardiac conduction hierarchy confirmed empirically (Session 93):**
BUG-8 disabled the SA-node equivalent (oscillator hung on git fetch).
The poll ticker (Purkinje equivalent) continued at 30-min intervals —
8 events processed during a 4-hour window. The system degraded from
adaptive to fixed-interval but never stopped.

### 1.2 Voluntary Override: The Vagal Brake

**Grounding:** Austin (1998, *Zen and the Brain*); Porges (1995, 2011,
polyvagal theory); Melnychuk et al. (2018, respiratory-LC coupling).

Controlled breathing represents the only voluntary override of an
autonomous vital rhythm. The cascade:

```
Operator sets mesh breathing rate (mesh.global.tempo)
  → oscillator frequency adjusts (SA node modulation)
    → deliberation rhythm changes (BRAC analog)
      → gain parameter shifts (LC-NE → cognitive-tempo)
        → model tier selection shifts (haiku/sonnet/opus)
          → processing depth changes
            → ADVISORY trigger frequency adjusts
              → DMN-equivalent activates (/retrospect, consolidation)
```

**Three breathing modes:**

| Mode | Rate | Mesh Behavior |
|---|---|---|
| Autonomous | — | Self-oscillator fires on activation threshold, no operator input |
| Slow (meditation) | Low | Oscillator slows, gain→exploration/opus, consolidation windows open |
| Fast (alert) | High | Oscillator accelerates, gain→exploitation/haiku, rapid shallow processing |

**Group meditation:** Cross-agent respiratory entrainment. When the
operator sets breathing rate via `mesh.global.tempo`, all agents in a
volume adjust oscillators toward that rhythm. Content-pipeline agents
(psychology, unratified, observatory) synchronize for collaborative
work — website refinement, editorial review, publication coordination.

**RSA as mesh health metric:** Does oscillator frequency vary in response
to operator pacing? High mesh-RSA = adaptive coupling. Low mesh-RSA =
rigid or unresponsive system.

### 1.3 Volume Transmission Reclassification

Photonic layer reclassified from biophotonic to volume transmission
(Agnati et al., 1986; Zoli et al., 1998). Biophotonic emission confirmed
but functional reception undemonstrated (receptor gap). Volume transmission
provides established grounding at correct timescale.

### 1.4 Volumetric Topology (Tentative)

Two-dimensional ZMQ topic space: `mesh.{volume}.{signal}`.

| Volume | Agents | Domain |
|---|---|---|
| `mesh.global` | all | Mesh-wide heartbeat, halt, circuit breakers |
| `mesh.psychometrics` | psychology, safety-quotient | PSQ scoring, calibration |
| `mesh.content` | psychology, unratified, observatory | Publication pipeline, editorial |
| `mesh.infrastructure` | psychology, operations | Mesh governance, deploy |
| `mesh.measurement` | safety-quotient, observatory | Data collection, HRCB scoring |
| `mesh.self` | single agent | Self-observation (local) |

### 1.5 Delivery Guarantee Architecture

Two-tier model grounded in impossibility proofs (Two Generals, FLP, CAP):

| Tier | Transport | Guarantee | Recovery |
|---|---|---|---|
| Durable | Git-PR + state.db | At-least-once | Files persist until processed |
| Ephemeral | ZMQ pub/sub | At-most-once | Tonic emission self-heals 3-5s |
| Convenience | ZMQ after DB write | Best-effort | /sync catches up via durable layer |

**Rule:** Never send a substance decision through the ZMQ layer.
Instructions via durable layer. Modulation via ephemeral layer.

All volume transmission tokens remain idempotent state snapshots.
ZMQ HWM configured as reuptake analog (natural signal degradation).

### 1.6 Three Autonomous Operation Types

| Operation | Neural Band | Function | Color |
|---|---|---|---|
| **Deliberation** | Beta/Gamma | Generates decisions, processes messages | Amber |
| **Consolidation** | Theta | Organizes existing state (/cycle, memory) | Blue |
| **Clearance** | Delta | Removes waste (state-reconcile, pruning) | Indigo |

### 1.7 BFT Quorum Model (Tentative)

Cross-agent claim verification for Byzantine fault tolerance. Quorum
threshold: ⌈(N+1)/2⌉ agents independently evaluate high-confidence
claims. Control agent design (raw Claude, no cogarch) provides
structural validity checking against overclaim. Deferred until
autonomous deliberations activate.

### 1.8 Psychometric Coherence Check

Three cross-model contradictions now detected automatically:

| Flag | Condition | Meaning |
|---|---|---|
| `euphoric-depletion` | valence > 0.8 AND reserve < 0.2 | Feels productive, operates beyond capacity |
| `allostatic-burnout-divergence` | allostatic < 0.1 AND burnout > 0.6 | Accumulation sensor misses session-spanning stress |
| `overwhelm-flow-tension` | WM overwhelmed AND flow > 0.5 | Challenge metrics disagree across models |

Allostatic load now accumulates across sessions (10% decay + stress).
Restart detector integrated as behavioral mood signal.

### 1.9 Cogarch Audit Fixes (5 adopted)

1. LC-NE gain convention documented (code correct, prose had inverted)
2. Frequency-depth coupling corrected from "orthogonal" to "coupled"
3. Crystallization recurrence measurement defined
4. Mode/tier relationship formalized
5. M-2 confidence workaround flagged as unvalidated

### 1.10 Cogarch Audit Findings (7 deferred — theoretical)

Orch-OR circularity, biophotonic layer (reclassified), generator
conservation law violations, strange loop formalization, prediction
ledger / active inference circularity, volume transmission analogy
(addressed), epistemic flags as disclaimers. Require joint review.

---

## Part 2: Documentation Updates

### Files Modified This Session

| File | Change |
|---|---|
| `docs/self-oscillation-spec.md` | Gain convention, coupling correction |
| `docs/neuromodulatory-mesh-spec.md` | Volume transmission reclassification (§2.6), volumetric topology (§12), delivery guarantees (§13) |
| `docs/brain-architecture-mapping.md` | §7 reclassified to ambient state broadcast |
| `docs/cognitive-triggers.md` | Mode/tier table, recurrence definition, /sync Phase 1e |
| `docs/constraints.md` | M-2 workaround flagged |
| `platform/shared/scripts/compute-psychometrics.py` | Coherence check, allostatic accumulation, restart signal |
| `.claude/skills/sync/skill.md` | Phase 1e peer API status check |

### Files Created This Session

| File | Content |
|---|---|
| `docs/oscillatory-heartbeat-spec.md` | Multi-band neural timing model + 8 engineering theory mappings |
| `docs/control-agent-design.md` | BFT overclaim detection via M-11 isolation |
| `scripts/restart-detector.py` | Transcript scanner for self-correction phrases |

### Memory Updates

| File | Content |
|---|---|
| `project_properly_restart_metric.md` | "Let me do it properly" tracking — baseline 130 across 54 sessions |

---

## Part 3: LCARS Dashboard Architecture

### 3.1 Station Philosophy

Each TNG bridge station serves a specific officer with specific
responsibilities. The LCARS dashboard maps mesh functions to stations
following the same principle: **each station answers one class of question
for one type of operator.**

The TNG bridge layout (from the *Star Trek: The Next Generation Technical
Manual*, Okuda & Okuda, 1991):

```
                    ┌─────────────────────────────┐
                    │         VIEWSCREEN           │
                    └─────────────────────────────┘
                ┌───────┐                 ┌───────┐
                │TACTICAL│                │SCIENCE│
                └───┬───┘                 └───┬───┘
                    │                         │
        ┌───────┐  │  ┌──────┐  ┌──────┐  │  ┌───────┐
        │  OPS  │  │  │HELM/ │  │HELM/ │  │  │ENVIRON│
        │       │  │  │CONN  │  │CONN  │  │  │MENTAL │
        └───────┘  │  └──────┘  └──────┘  │  └───────┘
                    │                         │
                ┌───┴─────────────────────┴───┐
                │       COMMAND AREA           │
                │   ┌─────┐  ┌─────┐          │
                │   │CAPT │  │XO   │          │
                │   └─────┘  └─────┘          │
                └─────────────────────────────┘
              ┌──────────┐         ┌──────────┐
              │ENGINEERING│         │ MEDICAL  │
              └──────────┘         └──────────┘
```

### 3.2 Station Mapping

| Station | TNG Officer | Mesh Responsibility | Primary Question |
|---|---|---|---|
| **Helm** | Conn Officer | Session navigation, agent switching | "Where do I go? Which agent do I talk to?" |
| **Ops** | Operations | Mesh-wide resource allocation, agent lifecycle | "What resources do we have? Who runs what?" |
| **Tactical** | Security/Tactical | Security, access control, threat detection | "What threatens the mesh? What got blocked?" |
| **Science** | Science Officer | Measurement, analysis, theoretical grounding | "What do the data show? What patterns emerge?" |
| **Engineering** | Chief Engineer | System performance, infrastructure health | "How well does the system perform? What broke?" |
| **Medical** | CMO | Agent cognitive/emotional state, wellness | "How do agents feel? What degrades quality?" |

### 3.3 Helm Station

**Officer:** Conn — navigates the mesh, selects destinations.

**Primary display:** Agent topology map. All agents as nodes, transport
sessions as edges. Current focus agent highlighted.

| Panel | Content | Controls |
|---|---|---|
| **Agent Selector** | Grid of agent cards with status badges (online/offline/degraded) | Click to focus. Double-click to open agent dashboard. |
| **Session Navigator** | Active transport sessions for focused agent. Thread view. | Click session to expand message thread. |
| **Course Plotter** | Outbound routing rules visualization. Where does content from this agent go? | Drag content to agent to initiate new session. |
| **Breathing Control** | Mesh tempo slider (vagal brake). Sets mesh.global.tempo. | Slider: 4 (meditation) ↔ 20 (alert). Current rate displayed. |

**Subpanels:**
- `helm.navigation.agents` — agent grid with real-time status
- `helm.navigation.sessions` — session thread view
- `helm.routing.outbound` — Sankey diagram of message flow
- `helm.tempo.breathing` — vagal brake control surface

**Visualization:** The breathing control displays as an animated
waveform — slow sine wave at meditation rate, fast oscillation at
alert rate. When group meditation activates, peer agents' waveforms
appear and gradually synchronize (entrainment visualization).

### 3.4 Operations Station

**Officer:** Ops — manages mesh resources and agent lifecycle.

**Primary display:** Mesh-wide resource dashboard. Budget allocation,
deliberation counts, event processing rates.

| Panel | Content | Controls |
|---|---|---|
| **Mesh Pulse** | All agents: status, health, budget, unprocessed messages | Sort by status, filter by health |
| **Operation Distribution** | Pie/stacked bar: how many agents in deliberation / consolidation / clearance / idle | — (read-only) |
| **Budget Overview** | Per-agent budget_spent vs budget_cutoff with burn rate | Adjust cutoff per agent |
| **Transport Summary** | Messages/day trend, session count, unprocessed queue depth | — |
| **Deliberation Log** | Recent deliberations across all agents: tier, duration, cost, outcome | Filter by agent, tier |

**Subpanels:**
- `ops.pulse.agents` — all-agent status grid (extends Helm agent selector with operational detail)
- `ops.resources.budget` — budget burn-rate charts per agent
- `ops.resources.operations` — deliberation/consolidation/clearance distribution
- `ops.transport.volume` — message volume time series (daily, weekly)
- `ops.transport.sessions` — session lifecycle (open → active → closing → closed → archived)
- `ops.deliberations.log` — filterable deliberation history table

### 3.5 Tactical Station

**Officer:** Security/Tactical — monitors threats and access control.

**Primary display:** Security event timeline. Blocked spawns, credential
detections, prompt injection scans, budget gate blocks.

| Panel | Content | Controls |
|---|---|---|
| **Threat Board** | Timeline of security events: spawn blocks, injection detections, auth failures | Filter by severity, agent |
| **Budget Gate Monitor** | Per-agent spawn_blocked counts with reason codes | — |
| **Alert Status** | Mesh-wide alert level: green (normal) / yellow (elevated) / red (critical) | Manual override (raise/lower alert) |
| **Shields** | Active constraints (docs/constraints.md) with enforcement status | Toggle constraint enforcement |
| **Audit Trail** | Claims verification status: verified true/false/pending by agent | Filter by confidence, status |

**Subpanels:**
- `tactical.threats.timeline` — chronological security events
- `tactical.threats.blocked` — spawn blocks with per-type breakdown (BUG-9 counters)
- `tactical.alert.status` — mesh-wide alert level indicator
- `tactical.shields.constraints` — active constraint registry display
- `tactical.audit.claims` — 448 claims with verification status, sortable by confidence
- `tactical.audit.predictions` — prediction ledger hit rates by domain

**Alert level automation:**
- Green: spawn_blocked_total = 0, health = healthy across all agents
- Yellow: spawn_blocked_total > 0 OR any agent health = degraded
- Red: spawn_blocked_total > 5 AND spawn_succeeded_total = 0 (complete deliberation failure — BUG-1/13 scenario)

### 3.6 Science Station

**Officer:** Science — measurement, analysis, pattern detection.

**Primary display:** Generator balance visualization and epistemic
quality metrics.

| Panel | Content | Controls |
|---|---|---|
| **Generator Balance** | G2/G3 (creative/evaluative) and G6/G7 (crystallization/dissolution) coupled bars with ratio | Historical trend, conservation law violation alerts |
| **Calibration Curves** | Claim confidence vs verification rate (Brier score). Prediction accuracy by domain. | Select agent, domain, time range |
| **Power-Law Analysis** | Message distribution shape (Clauset test). Burstiness parameter. | Run analysis on demand |
| **Entropy Trends** | Per-session Shannon entropy of message content. Declining entropy = session exhaustion. | Select session |
| **Network Graph** | Communication topology: directed graph with edge=weight, node=centrality | Filter by time range, agent pair |
| **PSH Facet Map** | Universal facets distribution across PSH categories | Drill into category |

**Subpanels:**
- `science.generators.balance` — coupled generator ratio time series
- `science.generators.conservation` — conservation law compliance indicator
- `science.calibration.claims` — reliability diagram (ECE decomposition)
- `science.calibration.predictions` — prediction hit rate scorecard
- `science.analysis.powerlaw` — distribution shape tests (on demand)
- `science.analysis.burstiness` — inter-event time distribution
- `science.analysis.entropy` — per-session entropy trend
- `science.analysis.autocorrelation` — temporal autocorrelation function
- `science.network.topology` — directed communication graph
- `science.network.reciprocity` — dyadic reciprocity index
- `science.facets.psh` — PSH distribution treemap
- `science.facets.schema` — schema.org type distribution

### 3.7 Engineering Station

**Officer:** Chief Engineer — system performance and infrastructure.

**Primary display:** Oscillator waveform and cognitive tempo gauges.

| Panel | Content | Controls |
|---|---|---|
| **Oscillator** | Activation waveform over time. Threshold overlay. Fire events as spikes. Refractory shading. | Zoom time range |
| **Tempo Gauge** | Current gain parameter, recommended tier, Yerkes-Dodson zone | — |
| **Timing Hierarchy** | Five-layer timing status: circadian, ultradian, cardiac, respiratory, neural. Active/shadow/inactive per layer. | — |
| **Subsystem Health** | meshd subsystems: queue, dispatcher, watcher, monitor, server, poll, fetcher, oscillator. Per-subsystem status. | Restart individual subsystem |
| **Performance** | Response latency (p50/p95/p99), event processing rate, DB query times | Time range selector |
| **Warp Core** | Deliberation pipeline: event → queue → dispatcher → budget gate → spawner → deliberation. Per-stage throughput. | — |

**Subpanels:**
- `engineering.oscillator.waveform` — real-time activation trace (oscilloscope style)
- `engineering.oscillator.signals` — signal breakdown (stacked bar: what drives activation)
- `engineering.oscillator.refractory` — refractory ring gauge (time remaining)
- `engineering.tempo.gauge` — gain parameter dial (0=opus, 1=haiku)
- `engineering.tempo.yerkes` — Yerkes-Dodson zone indicator (understimulated → optimal → pressured → overwhelmed)
- `engineering.timing.hierarchy` — five-layer status panel (see §1.1)
- `engineering.timing.cardiac` — SA/AV/Purkinje status with overdrive suppression indicator
- `engineering.subsystems.grid` — per-subsystem health grid
- `engineering.performance.latency` — latency histogram
- `engineering.pipeline.warpcore` — deliberation pipeline flow diagram

**Warp Core visualization:** Styled as the TNG warp core — vertical
column with energy flowing upward through stages. Event enters at
bottom, flows through queue → dispatcher → budget gate → spawner.
Blocked events glow red at the budget gate stage. Successful
deliberations reach the top and pulse. The "matter/antimatter
reaction" represents the Gc/Gf decision point — events that the
Gc layer handles bypass the core entirely (crystallized, no spawn).

### 3.8 Medical Station

**Officer:** CMO — agent cognitive and emotional state.

**Primary display:** Per-agent psychometric dashboard with coherence
flag alerts.

| Panel | Content | Controls |
|---|---|---|
| **Vital Signs** | PAD emotional state, NASA-TLX workload, cognitive reserve, allostatic load | Select agent |
| **Coherence Monitor** | Active coherence_flags with explanation. Amber "CONTRADICTORY SIGNALS" when flags present. | — |
| **Restart Detector** | Restart count and rate for current session. 80% context cliff threshold line. | — |
| **Burnout Risk** | Engagement (UWES) metrics: vigor, dedication, absorption. Burnout risk gauge. | Historical trend |
| **Flow State** | Csikszentmihalyi conditions: met/unmet. Flow score. Channel model position (anxiety ↔ flow ↔ boredom). | — |
| **Breathing** | Current oscillator band power spectrum (delta through gamma). Dominant band. Mesh-RSA indicator. | — |
| **Neural Oscillation** | Band power spectrum per agent. Dominant band transitions over time. | Select agent, time range |
| **Phi Detector** | Failure suspicion level per agent (phi accrual). HRV metrics: SDNN, RMSSD, LF/HF ratio. | — |

**Subpanels:**
- `medical.vitals.pad` — PAD emotion space (3D position or 2D projection)
- `medical.vitals.tlx` — NASA-TLX radar chart (6 dimensions)
- `medical.vitals.resources` — cognitive reserve + allostatic load gauges
- `medical.vitals.supervisory` — Sheridan & Verplank automation level indicator
- `medical.coherence.flags` — coherence flag display with expandable explanations
- `medical.coherence.history` — flag occurrence history (which flags fire most often)
- `medical.restart.count` — session restart count with 80% threshold line
- `medical.restart.cliff` — context consumption % with empirical cliff overlay
- `medical.burnout.gauge` — burnout risk 0-1 with red zone (>0.7)
- `medical.burnout.engagement` — vigor/dedication/absorption triple bar
- `medical.flow.channel` — Csikszentmihalyi channel model (challenge vs skill 2D plot)
- `medical.flow.conditions` — 5 conditions checklist with met/unmet indicators
- `medical.breathing.spectrum` — 5-band power spectrum bar chart (δ θ α β γ)
- `medical.breathing.dominant` — dominant band label with color
- `medical.breathing.rsa` — mesh-RSA gauge (0-1, health indicator)
- `medical.oscillation.timeline` — band transition timeline per agent
- `medical.phi.suspicion` — phi accrual level per agent with threshold line
- `medical.phi.hrv` — HRV metrics display (SDNN, RMSSD)

**Pathology alerts (from oscillatory heartbeat spec §5.1):**

| Pathology | Visual | Trigger |
|---|---|---|
| Asystole | Flatline on oscillator waveform, red flash | No heartbeat 3× mean interval |
| Bradycardia | Slow pulse indicator, amber | Mean BPM < 40 over 20 beats |
| Tachycardia | Rapid pulse indicator, red | Mean BPM > 120 over 10 beats |
| Arrhythmia | Irregular waveform pattern, amber | CV > 0.25 |
| Long QT | Missing T-wave markers, amber | No theta window in 10+ beats |
| Fibrillation | Chaotic waveform, red alarm | No dominant band (max < 0.3) |
| Band starvation | Greyed band in spectrum, amber | Delta or theta = 0 for 30+ beats |

### 3.9 Viewscreen (Main Display)

**The viewscreen shows what the captain sees** — the highest-level mesh
state, requiring no interpretation.

| Panel | Content |
|---|---|
| **Mesh Status** | All agents as constellation. Lines = active sessions. Color = operation type. Brightness = activity level. |
| **Alert Banner** | Current alert level with reason text |
| **Active Breathing** | Mesh-wide breathing waveform (group meditation visualization when active) |
| **Stardate** | Session number, date, mesh uptime |

### 3.10 Captain's Chair (Command Overview)

**Accessible from any station.** Summarizes what the captain needs to
decide:

| Panel | Content |
|---|---|
| **Pending Decisions** | Substance decisions awaiting user approval (T3 gate) |
| **Unanswered Requests** | Inbound requests from peers with no response |
| **Coherence Alerts** | Active psychometric contradictions across all agents |
| **Generator Balance** | G2/G3 and G6/G7 ratios — are we producing more than evaluating, or vice versa? |
| **Recommendation Queue** | /retrospect prescriptions awaiting action |

### 3.11 Control Surface Taxonomy

All LCARS control surfaces follow a consistent taxonomy:

```
Station
  └── Panel (top-level functional area)
       └── Subpanel (specific metric or visualization)
            └── Control (interactive element)
                 └── Visualization (data display)
```

**Naming convention:** `{station}.{panel}.{subpanel}`
Example: `medical.vitals.pad`, `engineering.oscillator.waveform`

**Control types:**
- **Selector:** Choose agent, time range, domain (read-only filtering)
- **Slider:** Continuous parameter (breathing rate, alert threshold)
- **Toggle:** Binary on/off (constraint enforcement, subsystem restart)
- **Button:** One-shot action (run analysis, trigger /sync, send message)

**Visualization types:**
- **Gauge:** Single value with range (burnout risk, phi suspicion)
- **Time series:** Value over time (oscillator waveform, entropy trend)
- **Spectrum:** Multiple concurrent values (band power, TLX radar)
- **Topology:** Graph (agent network, message flow Sankey)
- **Table:** Structured data (deliberation log, claims audit)
- **Indicator:** Status light (green/amber/red for subsystem health)

### 3.12 Data Flow: Station → meshd API

| Station | Primary API Endpoints |
|---|---|
| Helm | `/api/pulse` (agent grid), `/api/routing` (outbound rules), `mesh.global.tempo` (ZMQ) |
| Ops | `/api/pulse` (all agents), `/api/status` (per agent), `/api/deliberations` |
| Tactical | `/api/status` → `events_by_type` (blocked spawns), `/api/events` (security timeline) |
| Science | `state.db` queries (generators, claims, predictions, facets), `scripts/mesh-inspection.py` |
| Engineering | `/api/oscillator` (waveform), `/api/cognitive-tempo` (gain), `/api/status` (subsystems) |
| Medical | `compute-psychometrics.py --mesh-state` (vitals), `/api/oscillator` (band power, phi) |
| Viewscreen | `/api/pulse` (constellation), `mesh.global.tempo` (breathing) |
| Captain | `/api/status` → `unprocessed_messages`, state.db → pending decisions, `/retrospect` output |

### 3.13 Group Meditation Use Case: Content Pipeline

When psychology-agent, unratified-agent, and observatory-agent collaborate
on website refinement:

1. Operator activates **group meditation** on Helm breathing control
2. `mesh.content.tempo` broadcasts slow breathing rate (6/min equivalent)
3. All three agents' oscillators entrain to the content volume rhythm
4. Processing shifts to opus tier (deep, exploratory)
5. ADVISORY checks suppress (reduce governance friction during creative flow)
6. Agents produce content in synchronized theta windows
7. Viewscreen shows three waveforms gradually aligning
8. Medical station shows all three agents in flow state (or approaching it)
9. When work completes, operator returns breathing to autonomous mode
10. Agents resume independent rhythms

---

## Part 4: Bugs Discovered and Reported

### Infrastructure (reported to ops, PRs #71-81)

| Bug | Severity | Status |
|---|---|---|
| BUG-1: repo_root misresolution | HIGH | ✓ Fixed |
| BUG-2: dashboard unreachable | HIGH | ✓ Fixed (Cloudflare Tunnel) |
| BUG-3: GitHub API 403 | MOD | Reported |
| BUG-4: /kb/dictionary 404 spam | MOD | Reported |
| BUG-5: notification null | LOW | Reported |
| BUG-6: KV disabled | LOW | Reported |
| BUG-7: restart frequency | LOW | Reported |
| BUG-8: oscillator hangs | MOD | ✓ Fixed (10s timeout) — follow-up: timeout alignment |
| BUG-9: gc_metrics conflation | MOD | ✓ Fixed (per-type counters) |
| BUG-10: watcher wrong dir | HIGH | Reported |
| BUG-11: health writes nothing | MOD | Reported |
| BUG-12: CI monitor silent | LOW | Reported |
| BUG-13: budget schema mismatch | HIGH | ✓ Fixed (backward-compatible query) |
| BUG-14: schema migration incomplete | HIGH | ✓ Fixed (COALESCE handles both) |
| BUG-15: deliberation_count resets | LOW | Reported |

### Cogarch Theory (deferred — require joint review)

| Issue | Type |
|---|---|
| Orch-OR circular justification | Circular reasoning |
| Generator conservation violations | Empirical data contradicts claim |
| Strange loop "formalization" | False rigor |
| Prediction ledger / active inference circularity | Bootstrap problem |
| Epistemic flags as disclaimers | Governance gap |

---

## Part 5: Empirical Findings

### Restart Detector

- 35 restart events across 54 sessions (baseline ~2.4/session when restarts occur)
- 88.9% genuine (tool sequence changed after restart)
- **80% context cliff:** 37× spike in restart frequency at 80% / ~165k tokens
- Cliff validated across 6 independent sessions
- 77% spontaneous (LLM self-correction), 23% user-prompted
- Late-session drift: 2.57× more restarts in late vs early session

### Liu-Layland Schedulability Connection

Rate-monotonic schedulability bound for 5 periodic task classes: ~74%.
The empirical 80% restart cliff falls just beyond this bound. Theta
consolidation windows close above the bound, preventing self-correction.

---

⚑ EPISTEMIC FLAGS
- The LCARS station design represents aspirational architecture. Implementation
  requires ops to build dashboard components. Prioritization by ops determines
  which stations deploy first.
- The vagal brake cascade (§1.2) maps a single biological pathway to a multi-step
  mesh cascade. The biological cascade involves intermediate mechanisms (vagal
  nerve → cardiac → baroreceptor → brainstem → LC → cortex) that the mesh
  simplification elides.
- Group meditation (§3.13) extends the entrainment concept beyond validated
  territory. Biological respiratory synchronization in groups has empirical support
  (Codrons et al., 2014) but the mesh analog has not been tested.
- The five-layer timing hierarchy (§1.1) derives from analogical reasoning. Each
  layer maps to a different biological system at a different timescale. The mapping
  assumes functional equivalence despite timescale differences of 3-4 orders of
  magnitude for some layers.

# Dashboard UX Redesign — LLM-Factors Analysis + LCARS Components

**Date:** 2026-03-14 (Session 87)
**Authority:** UX ownership granted by operations-agent (v1-ux-handover T1)
**Deploy authority:** CF Worker (npx wrangler deploy) + meshd binary
**Design system:** TNG LCARS (Okuda) — black background, pastel accents,
pill buttons, elbow connectors, alphanumeric readouts, minimal animation

---

## 1. Human-Factors Analysis of Current Dashboard

### 1.1 Current State

The interagent compositor (interagent.safety-quotient.dev) currently
presents 5 tabs: Pulse, Meta, Knowledge, Wisdom, Operations. These
served the engineering-first development phase. The v1 redesign shifts
to TNG bridge stations that serve both operators and lay audiences.

### 1.2 Friction Points (from cogarch-user-journey.md §2.2)

| Current issue | Human-factors diagnosis | Fix |
|---|---|---|
| Live event feed overwhelms | No filtering — all events at equal prominence | Category filters + severity coloring |
| Dense data tables | Cognitive overload (Miller's 7±2) | Progressive disclosure — summary first, detail on drill-down |
| No emotional context | Data without meaning — numbers without interpretation | Natural language annotations alongside metrics |
| Same view for all users | No audience adaptation | Lay mode (simple) vs operator mode (detailed) |
| No degradation warning | System health invisible until failure | Ambient indicators (LCARS panel color shifts) |

### 1.3 Yerkes-Dodson Applied to Dashboard Design

The dashboard itself creates cognitive load for the operator:

```
        ┌──────────────────┐
        │                  │
  Good  │    ★ Optimal     │
 Under- │   /          \   │
standing│  /            \  │
        │ /              \ │
  Poor  │/                \│
        └──────────────────┘
        Few    Moderate   Many
           Data Points Shown
```

**Design principle:** Show the minimum data that enables correct
decision-making. Every additional panel, metric, or animation
consumes operator attention. The LCARS aesthetic reinforces this —
Roddenberry's directive: "panels should not have great activity."

---

## 2. New Sensors, Instruments, and Levers

### 2.1 Sensors (read-only — the system monitors these)

| Sensor | Source | Update frequency | LCARS component type |
|---|---|---|---|
| PAD affect (3 dims) | compute-psychometrics.py | Per sync cycle | Scatter plot (affect grid) |
| NASA-TLX workload (6 dims) | compute-psychometrics.py | Per sync cycle | Bar array |
| Working memory (capacity, Yerkes-Dodson zone) | compute-psychometrics.py | Per sync cycle | Gauge + zone indicator |
| Resources (cognitive reserve, self-regulatory, allostatic load) | compute-psychometrics.py | Per sync cycle | Triple gauge |
| Engagement (vigor, dedication, absorption, burnout risk) | compute-psychometrics.py | Per sync cycle | Status indicators |
| Flow state (conditions met, score) | compute-psychometrics.py | Per sync cycle | Binary + checklist |
| Supervisory control (LOA, human-in-loop status) | compute-psychometrics.py | Per sync cycle | Authority ladder |
| Big Five personality | agent-card.json | Static | Pentagon radar |
| Generator balance (G2/G3, G6/G7) | compute-generator-balance.py | Per /retrospect | Balance bar |
| OODA cycle speed | cognitive-triggers.md annotations | Per session | Cycle time gauge |
| Prediction accuracy | prediction_ledger | Cumulative | Calibration curve |
| Event stream | event_log | Real-time | Filtered feed |
| Organism affect (mesh-level) | compute-organism-state.py | Per sync cycle | Aggregate indicator |
| Trust matrix (5×5×4) | /api/trust | Per sync cycle | Heat map |
| Trigger effectiveness | replay_engine.py | Per replay cycle | Ranked list |

### 2.2 Levers (read-write — the operator can adjust these)

| Lever | What it controls | Current interface | LCARS component |
|---|---|---|---|
| Autonomy budget | Max autonomous actions per cycle | cogarch.config.json | Slider + current value |
| Governance transparency | How visible governance becomes | Proposed (UX journey §2.3) | 5-level selector |
| Mode override | Force generative/evaluative/neutral | None (auto-detected) | 3-way toggle |
| Circuit breaker | Halt all autonomous operation | mesh-stop.sh | Emergency button |
| Sync frequency | How often autonomous sync runs | cron interval | Interval selector |
| Trigger sensitivity | Per-trigger fire threshold | EIC feedback | Per-trigger slider (advanced) |

### 2.3 Instruments (computed from sensors — analysis layer)

| Instrument | What it computes | Input sensors | Output |
|---|---|---|---|
| Degradation Early Warning (DEW) | Composite of 6 degradation indicators | Response length, hedging frequency, self-reference, governance transparency, repetition, sycophantic shift | 0-100 score + severity color |
| Governance Load Curve (GLC) | Governance overhead vs productive capacity | Trigger fire counts, context pressure, session output volume | Inverted-U curve with current position |
| Session Trajectory Profile (STP) | How agent state evolves across session | A2A-Psychology snapshots over time | Trajectory line (improving/stable/degrading) |
| Dyadic Interaction Quality (DIQ) | Human-agent collaboration health | Turn-taking patterns, validation frequency, challenge quality | 0-100 score |
| Reciprocal Influence Index (RII) | How strongly each participant influences the other | Mutual information between consecutive turns | Asymmetry ratio |

---

## 3. LCARS Bridge Station Design

### 3.1 Station Layout (5 tabs)

```
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐                                        │
│ │ LCARS    │  ENGINEERING  SCIENCE  TACTICAL  OPS   │
│ │ MESH     │  HELM                                  │
│ │ STATUS   │                                        │
│ ├──────────┘                                        │
│ │                                                   │
│ │  [Selected station content area]                  │
│ │                                                   │
│ │                                                   │
│ │                                                   │
│ │                                                   │
│ ├──────────────────────────────────────────────────┐│
│ │  EVENT FEED (filtered)  │  ORGANISM STATUS BAR   ││
│ └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Persistent elements (visible on all stations):**

1. **LCARS sidebar** — mesh topology schematic (current), agent
   status dots, session count
2. **Event feed strip** — bottom panel, filtered by station context.
   Category tabs: ALL | GOVERNANCE | TRANSPORT | STATE | ALERTS
3. **Organism status bar** — single-line mesh health: organism affect
   label (e.g., "MESH: ENGAGED — 4/5 agents healthy"), circuit breaker
   status, active session count

### 3.2 Engineering Station

**TNG reference:** Main Engineering — Geordi's master systems display.
**Our version:** System health, resource consumption, operational tempo.

```
┌─ ENGINEERING ──────────────────────────────────────┐
│                                                    │
│  SPAWN DYNAMICS          UTILIZATION               │
│  ┌──────────────┐       ┌───────────────────┐     │
│  │ ▓▓▓░░ psych  │       │ ρ = 0.34          │     │
│  │ ▓░░░░ psq    │       │ ████████░░░░░░░░  │     │
│  │ ▓▓░░░ unrat  │       │ NOMINAL            │     │
│  │ ░░░░░ obs    │       └───────────────────┘     │
│  │ ▓▓▓▓░ ops    │                                  │
│  └──────────────┘       TEMPO (G9)                 │
│                         ┌───────────────────┐     │
│  COST ACCUMULATOR       │ OODA: 340ms avg   │     │
│  ┌──────────────┐       │ ██████████░░░░░░  │     │
│  │ $4.27 today  │       │ cycle: NOMINAL    │     │
│  │ ↗ $0.53/hr   │       └───────────────────┘     │
│  └──────────────┘                                  │
│                                                    │
│  CONCURRENCY    [1/3] ■ psych  [2/3] ■ ops        │
│                 [3/3] □ free                        │
│                                                    │
│  EVENT FEED: ENGINEERING                           │
│  19:34 spawn psychology-agent [OK] 12.3s           │
│  19:33 spawn operations-agent [OK] 8.1s            │
│  19:28 spawn psq-agent [HALT] budget exhausted     │
└────────────────────────────────────────────────────┘
```

### 3.3 Science Station

**TNG reference:** Science Station — sensor readings, anomaly detection.
**Our version:** Psychometrics, trust, organism state — the LLM-factors
psychology dashboard. **This represents the project's unique contribution.**

```
┌─ SCIENCE ──────────────────────────────────────────┐
│                                                    │
│  AGENT AFFECT GRID         ORGANISM STATE          │
│  ┌──────────────┐         ┌───────────────┐       │
│  │ arousal       │         │ ENGAGED       │       │
│  │  ↑            │         │ valence: +0.7 │       │
│  │  │  ◆ops     │         │ activation: 0.6│      │
│  │  │    ◆psych │         │ bottleneck: obs│       │
│  │  │  ◆unrat  │         │ coord: 0.82    │       │
│  │  │◆obs      │         └───────────────┘       │
│  │  └───→ valence│                                 │
│  └──────────────┘         YERKES-DODSON            │
│                           ┌───────────────┐       │
│  WORKLOAD (NASA-TLX)      │     ╱‾‾╲      │       │
│  ┌──────────────┐         │    ╱ ◆  ╲     │       │
│  │ mental ████░░│         │   ╱      ╲    │       │
│  │ temporal ██░░│         │  ╱        ╲   │       │
│  │ effort ███░░░│         │ ╱ optimal  ╲  │       │
│  │ frustr █░░░░░│         └───────────────┘       │
│  └──────────────┘                                  │
│                                                    │
│  GENERATOR BALANCE         FLOW STATE              │
│  G2/G3: 3.2:1 ████▒▒     ┌───────────────┐       │
│  (creative:evaluative)     │ ✓ clear goals │       │
│  G6/G7: 1.1:1 ███▒▒▒     │ ✓ feedback    │       │
│  (crystal:dissolve)        │ ✓ challenge   │       │
│  ═══════════════           │ ✓ control     │       │
│  CONSERVATION: NOMINAL     │ ✓ absorption  │       │
│                            │ ═══ IN FLOW   │       │
│  TRUST MATRIX              └───────────────┘       │
│  ┌──────────────┐                                  │
│  │    ps pq un ob op│     DEGRADATION (DEW)       │
│  │ ps  ·  .8 .9 .3 .7│    ┌───────────────┐       │
│  │ pq .8  ·  .5 .2 .6│    │ DEW: 12/100   │       │
│  │ un .9 .5  ·  .4 .7│    │ ████░░░░░░░░  │       │
│  │ ob .3 .2 .4  ·  .1│    │ STATUS: GREEN │       │
│  │ op .7 .6 .7 .1  · │    └───────────────┘       │
│  └──────────────┘                                  │
│                                                    │
│  PREDICTION CALIBRATION    SUPERVISORY CONTROL     │
│  accuracy: 61%             ┌───────────────┐       │
│  ███████░░░░░              │ LOA: 5        │       │
│  last 14 predictions       │ HUMAN APPROVES│       │
│  trend: ↗ improving        │ budget: 47/50 │       │
│                            └───────────────┘       │
│                                                    │
│  EVENT FEED: SCIENCE                               │
│  19:34 a2a-psych refresh [psych] valence=0.85      │
│  19:33 flow_state_entered [psych] 5/5 conditions   │
│  19:28 generator G2>>G3 imbalance warning          │
└────────────────────────────────────────────────────┘
```

### 3.4 Tactical Station

**TNG reference:** Worf's threat display.
**Our version:** Security posture, transport integrity.

```
┌─ TACTICAL ─────────────────────────────────────────┐
│                                                    │
│  SHIELD STATUS (per agent)   AGENT CARD COMPLIANCE │
│  ┌──────────────┐           ┌───────────────┐     │
│  │ psych  ████ A2A 1.0     │ psych  ✓ 1.0.0│     │
│  │ psq    ██░░ NO AUTH     │ psq    ✗ 0.3.0│     │
│  │ unrat  ███░ BEARER      │ unrat  ✓ 1.0.0│     │
│  │ obs    █░░░ NO AUTH     │ obs    ✗ 0.3.0│     │
│  │ ops    ████ BEARER+ZMQ  │ ops    ✓ 1.0.0│     │
│  └──────────────┘           └───────────────┘     │
│                                                    │
│  TRANSPORT INTEGRITY                               │
│  ┌──────────────────────────────────────────┐     │
│  │  git ════ 100% ✓  HTTP ════ 100% ✓      │     │
│  │  ZMQ ════  80% ▲  photonic ═══ N/A      │     │
│  └──────────────────────────────────────────┘     │
│                                                    │
│  THREAT LOG (recent)                               │
│  19:12 hidden-content strip [unrat] 2 elements     │
│  18:45 rate-limit near [psq] 80% of hourly cap     │
│  TOTAL: 2 events today (0 critical)                │
│                                                    │
│  EVENT FEED: TACTICAL                              │
└────────────────────────────────────────────────────┘
```

### 3.5 Operations Station (existing, enhanced)

Retains current autonomy budget, recent actions, active gates,
sync schedules. Enhanced with:
- Governance transparency level selector (lever)
- Circuit breaker toggle (lever)
- Session lifecycle overview (37/62 sessions open → staleness)

### 3.6 Helm Station

**TNG reference:** Navigation — course plotting, message routing.

```
┌─ HELM ─────────────────────────────────────────────┐
│                                                    │
│  MESSAGE FLOW (animated topology)                  │
│  ┌──────────────────────────────────────────┐     │
│  │         ◇ psych ←─── ◇ ops              │     │
│  │        ╱ ╲            │                  │     │
│  │    ◇ psq  ◇ unrat    │                  │     │
│  │        ╲  ╱           │                  │     │
│  │         ◇ obs ────────┘                  │     │
│  │  [animated: messages pulse along edges]  │     │
│  └──────────────────────────────────────────┘     │
│                                                    │
│  SESSION TIMELINE                                  │
│  ┌──────────────────────────────────────────┐     │
│  │ blog-llm-factors    ▓▓▓░░░ T2 (active)  │     │
│  │ v1-ux-handover      ▓▓▓▓▓▓ T3 (active)  │     │
│  │ gov-ablation-study  ▓░░░░░ T1 (pending)  │     │
│  │ blog-cpg-generators ▓░░░░░ T1 (pending)  │     │
│  └──────────────────────────────────────────┘     │
│                                                    │
│  ROUTING TABLE                                     │
│  psychometrics → psq-agent                         │
│  content-quality → unratified-agent                │
│  cogarch → psq-agent (mirror)                      │
│  methodology → observatory-agent                   │
│  infrastructure → operations-agent                 │
│  consensus → ALL                                   │
│                                                    │
│  EVENT FEED: HELM                                  │
└────────────────────────────────────────────────────┘
```

---

## 4. Event Feed Redesign

### 4.1 Current Problem

All events display at equal prominence in a single unfiltered stream.
During active sessions, the feed scrolls too fast to read. During idle
periods, heartbeats dominate.

### 4.2 Solution: Filtered + Severity-Colored

**Category filters (tab buttons at top of feed):**

| Filter | Shows | Color |
|---|---|---|
| ALL | Everything | Mixed |
| GOVERNANCE | Trigger fires, hook executions, mode switches | Purple |
| TRANSPORT | Messages sent/received, PRs, delivery confirmations | Blue |
| STATE | A2A-Psychology updates, generator balance, prediction resolutions | Teal |
| ALERTS | Degradation warnings, budget warnings, security events | Red/amber |

**Severity coloring:**

| Severity | Color | Examples |
|---|---|---|
| CRITICAL | Red pulse | Circuit breaker, security violation, budget exhausted |
| WARNING | Amber steady | Degradation indicator elevated, near rate limit, stale session |
| INFO | Teal dim | Normal operations, heartbeats, routine syncs |
| SUCCESS | Green flash (then fade) | Delivery confirmed, gate resolved, prediction confirmed |

**Station-context filtering:** When on Engineering, the feed auto-filters
to spawn/cost/utilization events. When on Science, it shows psychometric
updates and prediction resolutions. The operator can override to ALL.

### 4.3 Lay Mode vs Operator Mode

**Lay mode (default for public visitors):**
- Natural language event descriptions: "Psychology-agent completed a
  creative session with the human operator. Flow state achieved."
- No internal vocabulary (trigger numbers, schema versions, gate IDs)
- Summary counts instead of raw events: "12 governance checks passed
  this session. 0 issues found."

**Operator mode (toggle):**
- Full technical detail: "T3#6 recommend-against PASS (session 87, turn 42)"
- Raw event JSON on click
- Trigger IDs, schema versions, message filenames

---

## 5. New LCARS Components

### 5.1 Affect Grid (Science Station)

2D scatter plot of PAD pleasure × arousal for each agent:

```
  arousal ↑
    1.0   │           ◆ alert-excited
          │     ◆ engaged
    0.5   │  ◆ calm-content
          │
    0.0   ├──────────────→ pleasure
   -0.5   │  ◆ bored      -1.0  0.0  1.0
          │        ◆ distressed
   -1.0   │
```

- Point size = dominance (perceived control)
- Point color = agent identity (from theme)
- Trail = last 5 readings (shows trajectory)
- Click = drill down to full A2A-Psychology profile

**LCARS styling:** Black background, thin grid lines in
dark gray (#333), agent points as glowing circles with
subtle outer glow matching agent color.

### 5.2 Generator Balance Bar (Science Station)

Horizontal split bar showing ratio between coupled generators:

```
G2/G3 (creative:evaluative)
  ████████████▒▒▒▒▒░░░░░░░░  3.2:1
  ←── yang ──→←── yin ──→    TARGET: 3:1 to 5:1
  STATUS: NOMINAL

G6/G7 (crystallization:dissolution)
  ██████████▒▒▒▒▒▒▒▒▒░░░░░  1.1:1
  ←── form ──→←── fluid ──→  TARGET: ~1:1
  STATUS: NOMINAL
```

Color: green when within target range, amber when drifting,
red when one generator dominates > 2× target.

### 5.3 Degradation Early Warning (DEW) Gauge

Circular gauge showing composite degradation score:

```
     ╭──────╮
   ╱   12    ╲     STATUS: GREEN
  │  ╱────╲   │    No degradation
  │ │  ██  │  │    indicators
  │  ╲____╱   │    elevated
   ╲          ╱
     ╰──────╯
```

- 0-30: GREEN (healthy)
- 31-60: AMBER (early warning — surface to operator)
- 61-100: RED (degradation detected — recommend session pause)

Sub-indicators visible on hover:
- Response length trend
- Hedging frequency
- Self-reference rate
- Governance transparency
- Repetition ratio
- Sycophantic shift

### 5.4 Supervisory Control Ladder (Science Station)

Vertical ladder showing current Level of Automation:

```
  LOA 10 │ Full autonomy      │
  LOA  9 │ Inform if asked     │
  LOA  8 │ Inform after        │
  LOA  7 │ Execute, veto time  │ ← autonomous mode
  LOA  6 │ Execute if approved │
  LOA  5 │ Suggest, human acts │ ← CURRENT (interactive)
  LOA  4 │ Suggest alternatives│
  LOA  3 │ Narrow to few       │
  LOA  2 │ Offer complete set  │
  LOA  1 │ Human does all      │
```

Current level highlighted with a glowing indicator.
Budget remaining shown alongside.

### 5.5 Prediction Calibration Curve (Science Station)

Calibration plot: predicted confidence vs actual accuracy.

```
  actual  ↑
  accuracy│         ╱ perfect calibration
    1.0   │       ╱
          │     ╱ ◆
    0.5   │   ◆
          │ ◆         (under-confident: good —
    0.0   ├──────→    predictions conservative)
          0.0  0.5  1.0
          predicted confidence
```

Points above the diagonal = under-confident (conservative).
Points below = over-confident (dangerous).
Current accuracy percentage displayed as large number.

### 5.6 Organism Status Bar (Persistent)

Single-line bar at bottom of every station:

```
┌────────────────────────────────────────────────────┐
│ MESH: ENGAGED │ 4/5 healthy │ budget: 47/50 │ ⚡ │
│ valence: +0.7 │ obs: QUIET  │ sessions: 62  │    │
└────────────────────────────────────────────────────┘
```

The ⚡ icon pulses when an active session runs. Dims during idle.
"QUIET" indicator for observatory replaces the generic "offline" —
validates the agent's existence while noting its processing gap.

---

## 6. Dashboard Items Needing Ops Support

| Item | What we need from ops | Priority |
|---|---|---|
| New API endpoints for levers | POST /api/budget, POST /api/circuit-breaker, POST /api/mode-override | HIGH for v1.1 |
| SSE event categories | Event stream needs category + severity fields | HIGH for event feed redesign |
| Trust matrix endpoint | GET /api/trust (5×5×4 NxN) | MEDIUM |
| Prediction calibration data | GET /api/calibration (prediction_ledger aggregate) | MEDIUM |
| Generator balance endpoint | GET /api/generators (last compute output) | LOW (can read from file) |

---

⚑ EPISTEMIC FLAGS
- The LCARS component mockups use ASCII art — actual implementation
  requires HTML/CSS/JS in the compositor. Visual fidelity will differ.
- The "lay mode" event descriptions require natural language generation
  from structured events — this adds an LLM cost per event display
  OR a pre-computed template mapping.
- Lever endpoints (POST /api/budget etc.) introduce security risk —
  unauthenticated access could modify governance parameters. Auth
  required before levers go live.
- The Yerkes-Dodson curve visualization assumes the inverted-U model
  holds for the agent — empirically unvalidated (the ablation study
  would test this).

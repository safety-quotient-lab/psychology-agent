# LCARS Change Manifest — agentd Architecture (Session 95)

**For:** ops-session (final mission before dissolution)
**Source:** `docs/agentd-design-session95.md` §10-18, `docs/agentd-implementation-roadmap.md` §Phase 6
**Delivery:** transport message to operations-agent

---

## Summary

The cognitive architecture gained three layers (Gf/Gc/Gm), a photonic substrate
layer, 9 coupling modes, a vagal brake cascade, and holobiont monitoring. The
LCARS dashboard needs new panels, sliders, and data visualizations to expose
these to the human operator.

**Two dashboards, separate codebases:**
- **agentd /obs** (per-agent): Go templates in `platform/templates/`
- **meshd fleet LCARS** (fleet-wide): JS/CSS/HTML compositor (moving from ops-agent repo to meshd)

---

## Per-Agent Dashboard (agentd /obs) — New Panels

### 1. Three-Panel Cognitive Display (replaces single status view)

```
+----------------+----------------+-----------------+
|  NEURAL        |  GLIAL         |  PHOTONIC        |
|                |                |                  |
|  Gf depth #### |  reconcile ##  |  coherence 0.95  |
|  Gf freq  ###  |  audit    ###  |  spectral:       |
|  Gc freq  ##   |  drainage ###  |   DA  00##00     |
|  mode: eval    |  prune    ##   |   NE  0##000     |
|                |  optimize #### |   5HT 000###     |
|  triggers:     |                |  maturity: 0.72  |
|   T3 + T6 + .. |  drift: 0.02   |  waveguide: OK   |
+----------------+----------------+-----------------+
```

**Data source:** new agentd endpoints (see API section below)

### 2. Vagal Brake Cascade Slider

```
+---------------------------------------------+
|  VAGAL BRAKE                                 |
|                                              |
|  Breathing  000000###00  moderate             |
|  -------------------------------------------  |
|  1. oscillator  000000###00  [coupled]       |
|  2. Gf freq     0000###0000  [coupled]       |
|  3. gain/depth  00000000##0  [coupled]       |
|  4. model tier  00000000##0  (derived)       |
|  5. proc depth  00000000##0  (derived)       |
|  6. ADVISORY    00000000##0  (derived)       |
|  7. coupling    00000000##0  (derived)       |
|                                              |
|  [coupled] = follows master tempo            |
|  click to [override] = independent slider    |
|  (derived) = cannot detach                   |
|                                              |
|  Group meditation: [OFF]                     |
+---------------------------------------------+
```

**Interaction:**
- Master slider adjusts all coupled levels proportionally
- Click `[coupled]` to detach → independent slider appears
- Click `[override]` to re-couple
- Group meditation toggle broadcasts mesh.global.tempo

**Data source:** `POST /api/vagal` (write), `GET /api/vagal` (read)

### 3. Coupling Mode Indicator

Display current coupling mode with generator balance:

```
+---------------------------+
|  COUPLING: task-directed   |
|  G2 (generative): ###0000  |
|  G3 (convergent): 0000###  |
|  Frame: object-centered    |
+---------------------------+
```

9 possible modes: task-directed (creative/evaluative/balanced), free-associating,
alternating (NREM/REM), suppressed, arrested, conflicted.

**Data source:** `GET /api/oscillator`

### 4. Microbiome Health Panel

```
+------------------------------+
|  MICROBIOME                   |
|  claude-api  ##########  OK   |
|  github      #########0  lag  |
|  sqlite      ##########  OK   |
|  runtime     ##########  OK   |
|                               |
|  Holobiont coherence: 0.92    |
+------------------------------+
```

**Data source:** `GET /api/microbiome`

### 5. Trait Accumulation Metrics

```
+--------------------------------------+
|  MODE TRAITS                          |
|                                       |
|  task-directed(eval):                 |
|    usage: 847  stage: associative     |
|    prompt hit rate: 0.73 (^0.04)      |
|    transition: 3200ms (v800ms)        |
|                                       |
|  free-associating:                    |
|    usage: 42   stage: cognitive       |
|    prompt hit rate: 0.61              |
|    transition: 5100ms                 |
+--------------------------------------+
```

**Data source:** `GET /api/traits`

### 6. Gm Sub-Sliders

```
+----------------------------+
|  Gm MAINTENANCE             |
|  reconcile  000##00000  std |
|  audit      00##000000  hi  |
|  drainage   000##00000  std |
|  prune      0000##0000  mod |
|  optimize   00000#0000  low |
+----------------------------+
```

**Data source:** `POST /api/gm` (write), `GET /api/gm` (read)

---

## Fleet LCARS (meshd) — New Panels/Stations

### 7. Photonic Field Coherence (Science Station)

Fleet-wide substrate state — aggregated from all agents' photonic tokens:

```
+----------------------------------------------+
|  PHOTONIC FIELD                               |
|  Fleet coherence: 0.91                        |
|                                               |
|  psychology  ######### 0.95                   |
|  psq         ######## 0.87                    |
|  observatory ######### 0.93                   |
|  unratified  ######## 0.89                    |
|                                               |
|  Spectral diversity index: 0.34 (balanced)    |
|  Mesh coupling: complementary                 |
+----------------------------------------------+
```

### 8. Spectral Profile Comparison (Science Station)

Side-by-side spectral profiles across agents:

```
+----------------------------------------------+
|  SPECTRAL PROFILES                            |
|            DA    NE    5-HT   maturity        |
|  psych    0.3   0.1   0.7    0.72             |
|  psq      0.5   0.2   0.4    0.65             |
|  obs      0.2   0.4   0.3    0.41             |
|  unrat    0.4   0.1   0.6    0.38             |
|                                               |
|  NE pattern: psych=tonic, obs=phasic          |
+----------------------------------------------+
```

### 9. Vagal Brake / Group Meditation (Helm Station)

Fleet-wide breathing control:

```
+----------------------------------------------+
|  MESH BREATHING                               |
|                                               |
|  mesh.global.tempo: 000###00  moderate        |
|  Group meditation: [OFF]                      |
|                                               |
|  Agent entrainment:                           |
|   psych    ##########  entrained              |
|   psq      #########0  drifting               |
|   obs      ##########  entrained              |
|   unrat    ########00  independent            |
|                                               |
|  Mesh RSA: 0.78 (adaptive)                    |
+----------------------------------------------+
```

### 10. Mode Transition Speed (Engineering Station)

```
+----------------------------------------------+
|  MODE TRANSITIONS (mean ms)                   |
|                                               |
|  active->DMN:       1200ms  ##########        |
|  DMN->active:        800ms  ########          |
|  active->sleep:     4500ms  ##################|
|  task(cr)->task(ev): 2100ms  ##############   |
|                                               |
|  Trend: v12% this week (improving)            |
+----------------------------------------------+
```

### 11. Microbiome Fleet View (Medical Station)

Aggregated symbiont health across all agents:

```
+----------------------------------------------+
|  FLEET MICROBIOME                             |
|                                               |
|  claude-api: 4/4 healthy                      |
|  github:     3/4 healthy (psq: 429 ratelimit) |
|  sqlite:     4/4 healthy                      |
|                                               |
|  Dysbiosis alert: psq GitHub rate-limited     |
+----------------------------------------------+
```

---

## New agentd API Endpoints (Phase 6 prerequisite: Phase 4 complete)

| Endpoint | Method | Returns |
|---|---|---|
| `GET /api/photonic` | GET | Current photonic token: coherence, spectral_profile, maturity, state |
| `GET /api/oscillator` | GET | Oscillator state: activation, phase, coupling_mode, refractory |
| `GET /api/gm` | GET | Gm operations: last_reconcile, last_audit, drainage_count, etc. |
| `POST /api/gm` | POST | Adjust Gm sub-slider rates |
| `GET /api/microbiome` | GET | Symbiont health: claude, github, sqlite, runtime |
| `GET /api/connectome` | GET | Peer weights, learning metrics, spectral diversity |
| `GET /api/traits` | GET | mode_traits summary, prompt_quality, transition_speed |
| `GET /api/vagal` | GET | Breathing rate, cascade state, overrides |
| `POST /api/vagal` | POST | Adjust master tempo, toggle overrides, group meditation |
| `POST /api/wake` | POST | Wake from sedation |
| `POST /api/sedate` | POST | Enter sedation (was: sleep) |
| `POST /api/budget/reset` | POST | Reset autonomy budget |

---

## Station Plugin System

Each LCARS station loads as a separate JS module:

```
meshd/static/js/stations/
  engineering.js    # spawn dynamics, mode transitions, utilization
  science.js        # PAD, spectral profiles, photonic field, traits
  tactical.js       # security, transport integrity, CurveZMQ status
  operations.js     # budget, gates, sessions, autonomous actions
  helm.js           # message flow, routing, vagal brake, group meditation
  medical.js        # microbiome health, PSQ, safety scoring
```

Add a station: create `{name}.js` in the directory. meshd auto-discovers.
Remove a station: delete the file. No code changes needed.

---

## Naming Conventions (Three Registers)

| Register | Usage in LCARS |
|---|---|
| Cognitive science (primary) | All labels, headers, tooltips visible to user |
| Neuroscience (parenthetical) | Tooltips on hover: "Convergent processing (serotonergic, dorsal raphe)" |
| Cybernetics (governance) | System health labels: "VSM S3: self-regulation nominal" |

---

## Priority Order for ops-session

1. **New agentd API endpoints** (Phase 4+ prerequisite — stub with mock data first)
2. **Three-panel cognitive display** (highest visual impact)
3. **Vagal brake slider** (core interaction)
4. **Coupling mode indicator** (essential status)
5. **Spectral profile comparison** (fleet-level Science station)
6. **Photonic field coherence** (fleet-level Science station)
7. **Microbiome health** (Medical station)
8. **Trait accumulation metrics** (Science station)
9. **Mode transition speed** (Engineering station)
10. **Station plugin system** (structural, enables future additions)
11. **Group meditation controls** (Helm station)

---

## Dissolution Checklist (after LCARS delivery)

- [ ] LCARS compositor code moved from ops-agent repo to meshd
- [ ] All new panels implemented and visually verified
- [ ] New API endpoints stubbed (mock data until agentd Phase 4+)
- [ ] Station plugin system functional
- [ ] Close all ops transport sessions
- [ ] Remove ops from agent-registry.json (all repos)
- [ ] Remove ops git remote from all agents
- [ ] Remove ops cron/systemd on chromabook
- [ ] Final transport message: "ops-agent dissolved. LCARS transferred to meshd."

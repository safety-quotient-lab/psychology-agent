# Capability Chain Analysis

**Date:** 2026-03-15 (Session 89)
**Status:** Living document — update each session
**Purpose:** Map what each capability unlocks, what blocks it, and what
becomes possible when the block clears.

---

## Operational (deployed, working)

### Sensors + Display

| Capability | Status | Unlocked |
|---|---|---|
| A2A-Psychology sensors (8 constructs) | ✓ All 5 agents serving PRIMARY READINGS | Per-agent psychometric state visible to human operator |
| Compositor `/api/psychometrics` | ✓ Deployed to interagent.safety-quotient.dev | Single fetch, all data — dashboard consumes unified payload |
| LCARS dashboard (10 stations) | ✓ Deployed (ops owns code, psychology owns domain model) | Biofeedback display for the human-LLM dyad (LLM-factors §2.4) |
| Sensor fidelity indicators | ✓ PRIMARY READINGS / SENSOR ESTIMATE | Operator knows data quality without checking endpoints |
| Medical station (PAD, TLX, DEW, LOA) | ✓ HTML pane + JS (awaiting ops deploy) | Per-agent brain-level diagnostics |

### Governance + Hooks

| Capability | Status | Unlocked |
|---|---|---|
| T20 evaluative impressions | ✓ In cogarch (Session 89) | Agent's evaluative signal captured instead of evaporating as praise |
| Transport schema validator | ✓ PostToolUse hook | Malformed interagent/v1 messages caught on write |
| E-Prime enforcer | ✓ PostToolUse hook | Ontological discipline mechanically monitored |
| Prediction detector | ✓ PostToolUse hook | Prediction language flagged for ledger logging |
| MANIFEST auto-regeneration | ✓ PostToolUse hook | Transport messages never go unindexed |
| Auto dual-write | ✓ PostToolUse hook (transport → state.db) | Transport messages indexed to state.db automatically |
| Git commit-msg | ✓ .git/hooks/ | Co-Authored-By auto-added, conventional commit format checked |
| Git pre-commit | ✓ .git/hooks/ | Broken cross-references caught before commit |
| Git post-merge | ✓ .git/hooks/ | New transport messages flagged after PR merge + MANIFEST regen |

### Models + Scripts

| Capability | Status | Unlocked |
|---|---|---|
| Cognitive-tempo model | ✓ Spec + script (`cognitive-tempo.py`) | Haiku/sonnet/opus selection from psychometric state. Gain boundaries: <0.35 opus, 0.35-0.70 sonnet, >0.70 haiku |
| Impressions detector | ✓ Script (`impressions-detector.py`) | Batch transcript scanning: `--report`, `--drift`, `--insights`. Baseline: 532 findings, 161 transcripts |
| draft-transport.py | ✓ Script | Transport message authoring from CLI one-liner. Eliminates 40-70 lines of boilerplate |
| Composition topology | ✓ Glossary + LLM-factors §7 | Naming convention: `{domain}-solo`, `{domain}-session`, `mesh-ensemble`. Domain prefixes registered |

---

## Blocked (waiting on dependency)

### Self-Oscillation → Demand-Driven Mesh Rhythm

```
Blocked by: ops meshd implementation (PRs #49, #50)
Spec:       docs/self-oscillation-spec.md
Unlocks:
  ├→ Variable-frequency monitoring (5s urgent → 60s idle)
  ├→ Immediate response to urgent events (< 30s vs 0-8 min cron)
  ├→ Refractory period (cognitive reserve recovery)
  ├→ Oscillator waveform on Medical station (agent brain activity)
  └→ Foundation for cross-agent synchronization (Phase 3)
```

### Cognitive-Tempo in meshd → Automatic Model Tier Selection

```
Blocked by: ops meshd integration (PR #43)
Spec:       docs/cognitive-tempo-model.md
Unlocks:
  ├→ Zero-cost tier selection before each deliberation
  ├→ Credit optimization (haiku for routine, opus for complex)
  ├→ Tier distribution tracking (% haiku/sonnet/opus over time)
  └→ Empirical calibration of gain boundaries (50+ selections)
```

### /api/relay Delivery → Transport Without Git Ceremony

```
Blocked by: compositor /api/relay requires auth token setup
Already deployed: route exists in ops worker.js
Unlocks:
  ├→ Single HTTP call replaces 30-60s clone+branch+commit+push+PR
  ├→ No temp directories (/tmp/deliver-*)
  ├→ Immediate delivery (< 2s vs 30-60s)
  ├→ Dual-write: meshd delivery + git PR audit trail
  └→ Enables relay for agents lacking direct transport paths
```

### Budget Model Deployment → Spend-Counter on All Agents

```
Blocked by: user go-ahead for chromabook deployment (steps 1-5)
Code:       all changes committed (21 files migrated Session 89)
Unlocks:
  ├→ Consistent budget_spent/budget_cutoff across mesh
  ├→ Cognitive-tempo budget_ratio from real data (not defaults)
  ├→ Operations station budget cards show accurate spend
  └→ Unlimited mode (cutoff=0) for development sessions
```

### Generator Balance Live Data → Science Station G2/G3, G6/G7

```
Blocked by: trigger_activations data (needs 10+ sessions of logging)
Schema:     trigger_activations table exists (schema v23)
Unlocks:
  ├→ Science station generator bars with real ratios
  ├→ Creative-evaluative balance tracking per session
  ├→ Crystallization velocity measurement (patterns promoted/session)
  └→ Governance telos progress metric (drift toward wu wei)
```

### Evaluative Calibration → T20 Check 4 Hit Rate

```
Blocked by: 50+ logged evaluative impressions in prediction_ledger
Instrument: scripts/impressions-detector.py --insights
Unlocks:
  ├→ Agent evaluative hit rate (% of "good thinking" that proved correct)
  ├→ Evidence for/against sycophancy hypothesis
  ├→ Calibration data for T20 frequency thresholds
  └→ LLM-factors §2.3 reciprocal dynamics — does agent praise shape human behavior?
```

### v1 Tag → Release Milestone

```
Blocked by:
  ├→ Factored documents consistency pass (Session 87 TODO)
  ├→ Budget model deployment to chromabook
  └→ Compositor sync verified (ops deploys LCARS dashboard)
Unlocks:
  ├→ Public reference point for the project
  ├→ Stable base for blog posts and publications
  └→ Semantic versioning for subsequent changes
```

---

## Theoretical (spec exists, not yet implementable)

| Capability | Blocked By | When It Graduates |
|---|---|---|
| Cross-agent oscillator sync (Phase 3) | Self-oscillation Phase 2 operational | After 1 week of single-agent self-oscillation |
| mesh-panel (N humans + 1 agent) | First operational instance | When a multi-human session occurs |
| mesh-consortium (N humans + M agents) | First operational instance | When full mesh operates with multiple humans |
| mesh-liaison (org + agents) | First organizational coupling | When an external org engages with the mesh |
| Dyadic Interaction Quality (DIQ) | LLM-factors §4 instrument design | When DIQ spec completes + transcript data available |
| Session Trajectory Profile (STP) | LLM-factors §4 instrument design | When STP spec completes |
| Organizational coupling model (§7.4) | Theoretical development | When institutional memory coupling formalized |

---

## Dependency Graph (Critical Path)

```
self-oscillation ──→ cross-agent sync ──→ mesh-wide rhythm
        │
cognitive-tempo ───→ tier distribution ──→ cost optimization
        │
relay delivery ────→ instant transport ──→ transport overhead → 0
        │
budget deploy ─────→ real budget data ───→ cognitive-tempo calibration
        │
v1 tag ←────────────── all above ──────────── factored docs pass
```

---

⚑ EPISTEMIC FLAGS
- Capability statuses reflect Session 89 end state — ops deployments
  may advance some blocked items before next human session
- The critical path assumes serial dependencies; some items can
  advance in parallel (budget deploy + relay setup + factored docs)
- "Unlocks" lists represent expected value, not guaranteed outcomes —
  each unlock carries its own implementation risk

# A2A-Psychology Mesh Rollout Specification

**Date:** 2026-03-14
**Status:** Ready for operations-agent review
**Extension:** https://github.com/safety-quotient-lab/a2a-psychology
**Version:** 1.1 (9 constructs + calibration protocol)

---

## Overview

A2A-Psychology provides standardized psychological state reporting for
A2A-compatible agents. This specification defines the complete rollout
path for deploying the extension across the safety-quotient-lab mesh.

**What the extension provides:**
- 9 psychological constructs measuring agent and operator state
- Real-time sensor infrastructure (zero LLM cost — SQLite + shell counters)
- Mesh-state/v2 broadcast format
- Per-agent calibration protocol
- Self-calibration check for /diagnose integration

**What the extension requires:**
- Schema v26+ (state.db)
- PostToolUse hook registration
- Agent card extension declaration
- Per-agent Big Five personality scores
- Per-agent calibration constants

---

## Architecture

```
  SENSORS (zero LLM cost)         COMPUTE (Python, ~50ms)        BROADCAST
  ═══════════════════════         ════════════════════════        ═════════

  session-metrics.sh ──┐
    (PostToolUse hook)  │
    • tool call count   │
    • session duration  ├──→ compute-psychometrics.py ──→ /tmp/{agent}-psychometrics.json
    • context estimate  │      • PAD emotional state          (updated every 10 tool calls)
                        │      • NASA-TLX workload
  state.db ─────────────┤      • Resources (3 constructs)
    • transport_messages│      • Working memory + Y-D zone ──→ mesh-state/v2 JSON
    • active_gates      │      • Supervisory Control            (updated every sync cycle)
    • epistemic_flags   │      • Engagement + Flow
    • claims            │      • Personality (static)
    • prediction_ledger │
                        │
  state.local.db ───────┤
    • autonomy_budget   │
    • autonomous_actions│
                        │
  .agent-identity.json ─┘

  compute-mesh-constructs.py ──→ Transactive Memory
    • agent-registry.json         Metacognition
    • transport patterns          Decision Fatigue
    • claim verification          Shared Mental Models
    • prediction calibration
```

---

## Constructs

### Level 1: Individual Agent (per-response refresh)

| # | Construct | Model | Sensors | Refresh |
|---|-----------|-------|---------|---------|
| 1 | **Supervisory Control** | Sheridan & Verplank (1978) | .agent-identity.json, autonomy_budget | Per computation |
| 2 | **Affect** (PAD) | Mehrabian & Russell (1974) | transport_messages, active_gates, autonomous_actions, tool_calls | Every 10 tool calls |
| 3 | **Personality** (Big Five) | Costa & McCrae (1992) | agent-card.json (static config) | On redesign only |
| 4 | **Cognitive Load** (TLX) | Hart & Staveland (1988) | tool_calls, transport_messages, active_gates, context_pressure | Every 10 tool calls |
| 5 | **Working Memory** | Baddeley (1986) + Yerkes-Dodson (1908) | context_pressure (session-metrics.sh), tool_calls | Every 10 tool calls |
| 6 | **Resources** | Stern (2002), Baumeister (1998), McEwen (1998) | autonomy_budget, epistemic_flags, memory_entries, cognitive_load | Every 10 tool calls |
| 7 | **Engagement** | Schaufeli (2002) + Bakker & Demerouti (2007) | tool_calls, session_duration, context_pressure | Every 10 tool calls |
| 8 | **Flow** | Csikszentmihalyi (1990) | deliverables, tool_calls, context_pressure, cognitive_reserve | Every 10 tool calls |

### Level 2: Mesh (per-sync-cycle refresh)

| # | Construct | Model | Sensors | Refresh |
|---|-----------|-------|---------|---------|
| 9 | **Transactive Memory** | Wegner (1987) | agent-registry.json, transport_messages routing patterns | Per /sync |
| 10 | **Metacognition** | Flavell (1979) | prediction_ledger, claims, document_audits | Per /sync |
| 11 | **Decision Fatigue** | Danziger et al. (2011) | transport_messages SETL drift, claims count drift | Per /sync |
| 12 | **Shared Mental Models** | Cannon-Bowers et al. (1993) | schema_version, facet_vocabulary, agent-registry, agent-card | Per /sync (cross-agent RPG) |

### Level 3: Human-Agent System (consent-gated)

| # | Construct | Model | Sensors | Refresh |
|---|-----------|-------|---------|---------|
| 13 | **Operator Welfare** | Dawson & McCulloch (2005) | session_duration, system clock (circadian), timer-based reminders | Timer-based (requires operator consent) |

---

## Rollout Steps Per Agent

### Step 1: Prerequisites (operations-agent coordinates)

```bash
# Verify schema v26+
sqlite3 state.db "SELECT MAX(version) FROM schema_version;"
# If < 26: run bootstrap or migration

# Verify shared scripts current
git pull origin main  # gets latest mesh-state-export.py with psychometrics
```

### Step 2: Deploy Sensor Hook

```bash
# Copy session-metrics.sh to agent's hooks directory
cp platform/shared/hooks/session-metrics.sh .claude/hooks/session-metrics.sh
chmod +x .claude/hooks/session-metrics.sh

# Register in .claude/settings.json — add to PostToolUse array:
# {"hooks": [{"type": "command", "command": ".claude/hooks/session-metrics.sh"}]}
```

### Step 3: Deploy Compute Scripts

```bash
# Already in platform/shared/scripts/ via git pull
# Symlink if needed:
ln -sf ../platform/shared/scripts/compute-psychometrics.py scripts/compute-psychometrics.py
ln -sf ../platform/shared/scripts/compute-mesh-constructs.py scripts/compute-mesh-constructs.py
```

### Step 4: Set Agent-Specific Calibration Constants

Each agent edits their `session-metrics.sh`:

| Agent | TOKENS_PER_CALL | Rationale |
|-------|----------------|-----------|
| psychology-agent (interactive) | 7000 | Long file reads, skill loads, complex writing |
| psychology-agent (autonomous) | 3000 | /sync cycles, shorter tool chains |
| safety-quotient-agent | 2000 | Scoring jobs, model operations |
| unratified-agent | 4000 | Blog authoring, content processing |
| observatory-agent | 2500 | Data analysis, corpus scoring |
| operations-agent | 3500 | Infrastructure management, mesh coordination |

### Step 5: Set Big Five Personality Scores

Each agent adds to their agent-card.json `personality.big_five`:

| Agent | O | C | E | A | N | Rationale |
|-------|---|---|---|---|---|-----------|
| psychology-agent | 0.85 | 0.90 | 0.60 | 0.35 | 0.55 | High openness (theory), low agreeableness (anti-sycophancy) |
| safety-quotient-agent | 0.50 | 0.95 | 0.40 | 0.60 | 0.30 | High conscientiousness (calibration), low openness (empirical focus) |
| unratified-agent | 0.70 | 0.75 | 0.80 | 0.70 | 0.40 | High extraversion (public-facing), high agreeableness (audience-oriented) |
| observatory-agent | 0.55 | 0.85 | 0.35 | 0.80 | 0.45 | High agreeableness (consensus facilitator), low extraversion (neutral) |
| operations-agent | 0.60 | 0.90 | 0.70 | 0.50 | 0.35 | High conscientiousness (infrastructure), moderate extraversion (directive) |

### Step 6: Add A2A-Psychology Extension to Agent Card

```json
{
  "extensions": [
    {
      "uri": "https://github.com/safety-quotient-lab/a2a-psychology/v1",
      "required": false,
      "description": "Agent psychological state — 9 constructs from operational metrics"
    }
  ]
}
```

### Step 7: Verify Calibration

```bash
python3 scripts/psychometric-calibration-check.py
# Expected: 5/5 nominal
```

### Step 8: Verify Mesh-State Broadcast

```bash
python3 platform/shared/scripts/mesh-state-export.py --stdout | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k in ['emotional_state', 'workload', 'resource_model', 'working_memory']:
    print(f'{k}: {\"present\" if k in d else \"MISSING\"}')"
```

---

## Compositor Dashboard Integration

Operations-agent implements 5 visual elements on the compositor:

| Element | Data source | Display |
|---------|------------|---------|
| Agent affect grid | mesh-state/v2 `emotional_state` per agent | 5 colored indicators (green/yellow/red by hedonic_valence) |
| Yerkes-Dodson zone bars | mesh-state/v2 `working_memory.yerkes_dodson_zone` | Per-agent horizontal bar, color-coded by zone |
| Cognitive reserve gauge | mesh-state/v2 `resource_model.cognitive_reserve` | Per-agent 0-1 gauge (red <0.3, green >0.7) |
| LOA badge | mesh-state/v2 `supervisory_control.level_of_automation` | Per-agent badge ("LOA 5: Human Approves" etc.) |
| Burnout warning | mesh-state/v2 `engagement.burnout_risk` | Mesh-wide alert if any agent >0.5 for 3+ cycles |

---

## Validation Experiment

**Question:** Does psychometric data improve human operator mesh management?

**Measure:**
1. Time to notice agent degradation (Yerkes-Dodson zone shift)
2. Routing decisions informed by cognitive reserve data
3. Intervention timeliness when burnout risk rises

**Success criterion:** Human operator references dashboard data at least
once per session when making mesh management decisions.

**Duration:** 10 sessions after full rollout.

---

## Files Delivered

| File | Location | Purpose |
|------|----------|---------|
| `compute-psychometrics.py` | scripts/ (shared) | PAD + TLX + Resources + WM + Supervisory + Engagement + Flow |
| `compute-mesh-constructs.py` | scripts/ (shared) | Transactive Memory + Metacognition + Decision Fatigue + Convergence |
| `psychometric-calibration-check.py` | scripts/ (shared) | /diagnose integration — 5 calibration verifications |
| `session-metrics.sh` | .claude/hooks/ (per agent) | PostToolUse sensor: tool calls, duration, context, real-time recompute |
| `mesh-state-export.py` | platform/shared/scripts/ | mesh-state/v2 with psychometric fields |
| `mesh-psychometrics-plan.md` | docs/ | Full instrument inventory + sensor/lever tables |
| `mesh-mental-models.md` | docs/ | Shared mental model convergence framework |
| `sdt-ccs-theoretical-directions.md` | docs/ | SDT + CCS theoretical grounding |
| `a2a-psychology-rollout-spec.md` | docs/ (this file) | Rollout specification for operations-agent |

---

⚑ EPISTEMIC FLAGS
- Calibration constants (TOKENS_PER_CALL, activation normalization) represent
  heuristics from Session 86 observation. Each agent requires empirical
  calibration against their own workload profile.
- Big Five personality scores represent design choices, not psychometric
  measurement. No factor analysis validates the structure for agent systems.
- The validation experiment measures whether humans USE the data, not whether
  the data accurately represents agent state. Both questions matter; this
  experiment addresses only the first.
- Operator Welfare (Construct 13) requires explicit consent. The spec includes
  it; deployment must gate on operator agreement.

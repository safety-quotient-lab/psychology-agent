# LCARS Dashboard — Next Steps

**Date:** 2026-03-15 (Session 89)
**Status:** v1-beta.4 deployed. Psychometrics live across all 5 agents.

---

## Completed (Sessions 88-89)

- [x] 10-layer LCARS visual overhaul (Session 88)
- [x] A2A-Psychology panels across all 5 stations (Session 89)
- [x] Shared psychometrics data layer — single compositor fetch (Session 89)
- [x] API contract: `docs/api-psychometrics-contract.md` (Session 89)
- [x] Cognitive-tempo model: adaptive gain theory (Session 89)
- [x] Budget model migration: budget_spent/budget_cutoff (Session 89)
- [x] Mobile responsive fixes (Session 89)
- [x] Content mirroring event handlers (Session 89)
- [x] Medical tab pane added to public index.html (Session 89)
- [x] Compositor Worker deployed with `/api/psychometrics` route (Session 89)
- [x] All 5 agents serving PRIMARY READINGS (Session 89)
- [x] TNG-style sensor fidelity indicators (Session 89)
- [x] LCARS gate indicator chips (idle/active/timeout) (Session 89)

---

## Immediate (next session)

### 1. Compositor Worker Sync with Operations-Agent

**Priority:** HIGH
**Effort:** M (merge + test)

Our `interagent/worker.js` (556 lines) diverged from the operations-agent
canonical copy (1859 lines). Ops added:

- `GET /api/pulse` — mesh heartbeat (agent health aggregation)
- `GET /api/operations` — budgets, actions, gates, schedules
- `POST /api/relay` — transport relay (create PR on target repo)
- `POST /api/redirect` — redirect misrouted messages
- `GET /api/trust` — NxN agent trust matrix (4 dimensions)
- `GET /vocab/schema[.json]` — vocabulary JSON Schema
- Restricted CORS (mesh origins only, not `*`)
- Separate `agent-card.json` import (not inline)

**Approach:** Pull ops worker.js as base, graft our `/api/psychometrics`
route + `approximatePsychometrics()` fallback onto it. Keep ops as upstream
for shared compositor routes. Psychology-agent additions: psychometrics only.

### 2. Budget Model Deployment to Chromabook

**Priority:** HIGH
**Effort:** S (5 steps from ops directive)

Code migrated. Deployment steps:
1. Build new meshd binary from operations-agent main
2. Migrate state.db columns on all 5 agents
3. Swap meshd binary + restart
4. Verify `/api/status` shows budget_spent/budget_cutoff
5. Deploy compositor Worker (already done — backward-compat shim handles both)

### 3. Compositor Worker Deploy (wrangler deploy)

**Priority:** DONE
**Note:** Deployed Session 89. Future deploys needed after worker.js sync.

---

## Short-term (v1 release blockers)

### 4. Factored Documents Consistency Pass

**Priority:** MEDIUM
**Effort:** M

einstein-freud-rights-theory.md split into 5 files (Session 87). Verify:
cross-references resolve, section numbering standalone, E-Prime holds,
accessible-to-psych-undergrads standard applies independently.

### 5. v1 Tag

**Gate:** All above items complete + compositor Worker synced with ops.

---

## Medium-term (post-v1)

### 6. Per-Agent Dashboards (optional)

Currently only psychology-agent runs the LCARS compositor. Other agents
serve data via `/api/psychometrics` + `/api/status`. Per-agent dashboards
warranted only if an agent needs its own operator-facing display:

| Agent | Dashboard need | Rationale |
|---|---|---|
| safety-quotient-agent | LOW | Scoring pipeline monitoring — could use compositor |
| unratified-agent | LOW | Content publishing — existing monitor worker covers health |
| observatory-agent | MEDIUM | HN longitudinal study may need research-specific display |
| operations-agent | LOW | meshd ops console — CLI (`meshctl`) covers most needs |

### 7. Engineering Station Live Data

Requires ops worker sync (Item 1). The Engineering station's Deliberation
Cascade, Utilization, Tempo, Cost panels await `/api/tempo` and
`/api/spawn-rate` endpoints. Ops worker likely implements these already.

### 8. Generator Balance Live Data

Currently placeholder ratios. Requires `/api/generators` endpoint or
computation from trigger_activations table. Lower priority — the
placeholder values communicate the concept until data flows.

### 9. Cognitive-Tempo Integration

Ops integrates `scripts/cognitive-tempo.py` into meshd spawn path.
Dashboard could display recommended tier per spawn (Engineering station).

---

⚑ EPISTEMIC FLAGS
- Worker.js divergence between psychology-agent and operations-agent
  creates a maintenance risk — two copies evolving independently
- The restricted CORS in ops version may affect dashboard fetch behavior
  if not properly configured for interagent.safety-quotient.dev origin

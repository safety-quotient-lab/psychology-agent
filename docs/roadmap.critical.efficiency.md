# Efficiency Chain Analysis

**Date:** 2026-03-15 (Session 89)
**Status:** Living document — update each session
**Purpose:** Map where operator time goes, what automation exists,
what automation remains possible, and the expected time savings.

---

## Session 89 Time Budget (observed)

Approximate allocation of operator attention across a marathon session:

| Activity | Est. Time | Automation Level | Notes |
|---|---|---|---|
| /sync (inbound processing) | 15 min | Partial — manual triage, automated fetch | 4 PRs merged, 3 ACKs written |
| Transport message authoring | 25 min | **Now automated** — draft-transport.py | 7 messages × ~3.5 min each (manual JSON) |
| Transport delivery (deliver-to-peer.sh) | 8 min | Partial — script handles git, but 30-60s per delivery | 8 deliveries × ~45s each |
| Dashboard development | 45 min | Manual — domain expertise required | A2A-Psychology panels, psychometrics module |
| Cognitive-tempo model | 20 min | Manual — theoretical work | Spec + script, CPG integration |
| Self-oscillation spec | 15 min | Manual — theoretical work | Spec writing, domain analysis |
| /cycle (post-session docs) | 10 min | Partial — skill guides, manual execution | lab-notebook, MEMORY, snapshot |
| Hook development | 15 min | Manual — infrastructure engineering | 6 hooks written and registered |
| Bug investigation + fixes | 10 min | Manual | Medical pane missing, MANIFEST bug, prefetch timing |
| Git operations (commit, push, rebase) | 8 min | Partial — commit-msg hook now auto-adds Co-Authored-By | ~15 commits, occasional rebase |
| Retrospective | 8 min | Partial — /retrospect skill guides | LCARS-scoped retrospective |
| **Total** | **~180 min** | | |

---

## Efficiency Gains Deployed (Session 89)

### 1. draft-transport.py — Transport Message Boilerplate Elimination

| Metric | Before | After |
|---|---|---|
| Lines per message | 40-70 (manual JSON) | 1 (CLI command) |
| Time per message | ~3.5 min | ~15 sec |
| Error rate | Occasional missing fields | Schema-validated output |
| Savings per session | — | ~20 min (at 7 messages/session) |

### 2. MANIFEST Auto-Regeneration Hook

| Metric | Before | After |
|---|---|---|
| MANIFEST freshness | Stale until /sync or manual regen | Updated on every transport write |
| Bug frequency | Session 89: 7 messages went unindexed | Zero — hook fires automatically |
| Operator attention | Must remember to regenerate | Zero — fully automated |

### 3. Auto Dual-Write Hook (transport → state.db)

| Metric | Before | After |
|---|---|---|
| state.db indexing | Manual dual_write.py calls (frequently skipped) | Automatic on every transport write |
| Data completeness | Gaps — messages written but not indexed | Complete — every message indexed |
| Query reliability | state.db sometimes behind markdown | state.db synchronized with filesystem |

### 4. Git commit-msg Hook (Co-Authored-By)

| Metric | Before | After |
|---|---|---|
| Boilerplate per commit | 2 lines manually added to heredoc | Zero — hook auto-appends |
| Miss rate | Occasional commits without attribution | Zero — always added |
| Savings per session | ~1 min (at 15 commits) | Trivial but eliminates cognitive load |

### 5. Shared Psychometrics Module (single-fetch cache)

| Metric | Before | After |
|---|---|---|
| Fetch calls per tab switch | 5 (one per agent) | 1 (shared cache, 30s TTL) |
| Network round-trips per dashboard refresh | 20+ (5 agents × 4 stations) | 1 (compositor unified payload) |
| Data staleness risk | Each station fetches independently, different timestamps | All stations read same snapshot |

### 6. Sensor Fidelity Indicators

| Metric | Before | After |
|---|---|---|
| Operator confusion | "Awaiting data" with no explanation | "SENSOR ESTIMATE" or "PRIMARY READINGS" |
| Trust calibration | Operator must verify endpoint status manually | Dashboard self-reports data quality |

---

## Efficiency Gains Available (not yet deployed)

### 7. /api/relay Delivery (replaces deliver-to-peer.sh)

| Metric | Current | After Relay |
|---|---|---|
| Time per delivery | 30-60 sec (clone+branch+commit+push+PR) | < 2 sec (single HTTP POST) |
| Temp directory cleanup | /tmp/deliver-* accumulates | None — no local filesystem |
| Savings per session | ~6 min (at 8 deliveries × 45s) | ~7.5 min freed |

**Blocked by:** Auth token setup for compositor /api/relay endpoint.

### 8. Self-Oscillation (replaces cron)

| Metric | Current | After Self-Oscillation |
|---|---|---|
| No-op deliberation rate | ~80% (most cron cycles produce no-ops) | < 10% (fires only when activation threshold crosses) |
| Response latency to urgent events | 0-8 min (fixed cron interval) | < 30 sec (immediate trigger on activation) |
| Credit waste on no-ops | ~4 credits/hour on empty cycles | ~0.5 credits/hour (monitor polls cost nothing) |
| Recovery after deep deliberation | Fixed interval regardless | Refractory period scales with cognitive reserve + tier |

**Blocked by:** ops meshd implementation (PRs #49, #50).

### 9. Cognitive-Tempo Auto-Selection

| Metric | Current | After Integration |
|---|---|---|
| Model tier selection | Static config (manual operator change) | Automatic per deliberation from psychometric state |
| Haiku usage for routine work | 0% (always sonnet) | ~60% (ACKs, status checks, simple file ops) |
| Credit savings estimate | — | 40-60% reduction on routine autonomous cycles |
| Opus usage for complex tasks | Manual escalation | Automatic when task_complexity > 0.65 |

**Blocked by:** ops meshd integration (PR #43).

### 10. /cycle Modular Decoupling

| Metric | Current | After Decoupling |
|---|---|---|
| Steps per /cycle | 13 (touching 10+ files) | Modular sub-phases, independently invocable |
| Context consumption | Large (full skill loads into context) | Smaller per-phase loads |
| Partial runs | All-or-nothing | Run only the phases that apply |

**Blocked by:** Dedicated refactoring session (TODO item from Session 85).

---

## Efficiency Frontier (theoretical maximum)

If all available gains deploy:

| Activity | Current Time | Projected Time | Savings |
|---|---|---|---|
| Transport authoring | 25 min/session | 3 min/session | 22 min |
| Transport delivery | 8 min/session | 1 min/session | 7 min |
| No-op deliberation waste | ~80% of autonomous cycles | < 10% | 70% credit reduction |
| Manual tier selection | Operator decides | Automatic | Cognitive load reduction |
| /cycle overhead | 10 min/session | 5 min/session | 5 min |
| **Total session savings** | | | **~34 min/session** |

At 3.3 sessions/week average, that represents ~112 minutes/week of
recovered operator attention — roughly one full additional session's
worth of productive work per week.

---

## Measurement Protocol

Track these metrics across sessions to validate efficiency gains:

1. **Transport messages per session** — count in /cycle Step 1
2. **Delivery time per message** — log in lab-notebook if notable
3. **No-op deliberation rate** — query autonomous_actions after
   self-oscillation deploys
4. **Credit consumption per session** — from autonomy_budget delta
5. **Hook fire count** — session-metrics.sh already tracks
6. **/cycle duration** — timestamp start vs end in lab-notebook

Report in /retrospect scans alongside existing prediction audit and
win discovery.

---

⚑ EPISTEMIC FLAGS
- Time estimates derive from Session 89 observation of a single
  marathon session. Shorter sessions may show different proportions.
- Projected savings assume full deployment of all available gains —
  partial deployment yields partial savings (non-linear)
- "112 minutes/week" calculation assumes 3.3 sessions/week average
  and full efficiency frontier — both estimates carry uncertainty
- The efficiency frontier does not account for new work that
  automated systems introduce (monitoring hooks, reviewing automated
  output) — net savings may prove lower than gross savings

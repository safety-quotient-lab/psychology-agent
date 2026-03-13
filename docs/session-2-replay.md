# Session 2 Replay — 2026-03-13

**The v1.0.0-beta.1 Session**

26 commits. 3 compositor deploys. 1 meshd deployment. ~4,500 lines of new code.
The operations-agent went from Phase 5 complete to pre-public release ready
in a single session.

---

## Timeline

### Phase 6: Infrastructure Separation (commits 1-6)

**703b39f** `feat: Phase 6 — interagent-sdk extraction, context rotation, transport follow-ups`
The big extraction. 10 shared mesh scripts moved into `interagent-sdk/`.
Operations-agent's `scripts/` directory became 11 symlinks pointing to the SDK.
Context rotation protocol established (`context-rotate.sh` + cogarch rule).
Transport reminders sent to observatory (peer-registry) and all peers
(infrastructure-separation).

**af31602** `fix: normalize trust_budget → autonomy_budget for unratified + observatory agents`
Root cause discovery: unratified and observatory return budget data under
`trust_budget` instead of `autonomy_budget`. The data always existed — the
field name differed. Three-line normalization in both server and client code.

**02bdc7e** `docs: add comprehensive README for v1.0.0-beta`
First-ever README. Architecture, dependencies, setup, endpoints, scripts,
vocabulary governance, transport protocol, BFT mitigations.

**1023130** `chore: archive resolved sessions`
model-upgrade (superseded by model-flag-removal) and operations-agent-standup
(gate resolved T8) moved to `transport/archive/` with metadata and tombstones.

### Web Component Decomposition (commits 7-8)

**424d9fd** `feat: Web Component decomposition — 4 custom elements`
The 3,650-line monolithic `index.html` decomposed into 4 Web Components:
`MeshDataTable`, `MeshTopology`, `AgentHealthCard`, `OpsBudgetCard`.
Replaced 11 near-identical render functions and three 11-branch dispatcher
chains. Light DOM preserved the entire CSS cascade.

### Phase 7: Hardening (commits 9-14)

**5f26a18** `fix: unify agent semantic colors + add Phase 7 hardening plan`
AGENTS array colors aligned with CSS custom properties. Operations-agent
received its own distinct color (#7a9b6b). Phase 7 checklist: 10 items.

**28c6f35** `feat: extract shared frontend assets + SDK adoption directive`
`lcars-theme.css` (345 lines), `mesh-components.js` (460 lines),
`mesh-utils.js` (40 lines) extracted into `interagent-sdk/frontend/`.
T3 directive sent to all peers for SDK adoption.

**a830ef7** `feat: implement meshd — event-driven mesh daemon replacing cron`
3,006 lines of pure Go. The architectural pivot of the session. 8 packages:
config, events (priority queue + dispatcher), webhook (GitHub HMAC-SHA256),
transport (filesystem watcher), spawner (circuit breaker), budget (SQLite
gate), health (self-healing monitor), server (HTTP API). Zero external
dependencies.

**edb234a** `fix: add status field to all 20 vocab terms`
Vocabulary schema validation caught every term missing `status: "active"`.
Bumped to v1.4.0.

**85145f2** `feat: Phase 7 hardening — /api/kb endpoint + compliance scan`
8 of 10 hardening items passed: error resilience, security, performance
baseline, transport integrity, vocabulary validation, agent-card scan.
2 manual items remain (browser testing).

### Deployment + Operations (commits 15-20)

**69a0591** `fix: refund budget on spawn failure`
Budget drained from circuit breaker retries. Now the dispatcher refunds
cost when spawns fail.

**7a17409** `feat: mesh-ctl.sh (macOS-compatible)`
macOS bash 3.2 lacks `declare -A`. New lightweight control script bypasses
`agents.conf.sh` for pause/unpause/budget/status commands.

**7379db5** `feat: LCARS enhancements, mesh-mode indicator, concurrency limit, Apache 2.0`
Scan-line overlay, spine glow, topology edge glow in LCARS mode. Dashboard
shows PAUSED banner when mesh halted. File-lock spawn slots cap mesh-wide
concurrency at 2. Apache 2.0 license.

**05ef1b3** `feat: pattern generator cogarch + mesh consistency fixes`
Loading the full mesh into a single 1M-token context revealed 4 consistency
issues across 3 agents. Pattern generator added to cogarch as a systematic
cross-agent detection capability.

### Pre-Public Release (commits 21-23)

**86a5809** `feat: pre-public release — CI, Forge trigger, NOTICE, SECURITY, CONTRIBUTING`
GitHub Actions CI (build + vet + vocab + agent-card + transport + credential
scan). Jenkins Forge trigger matching mesh convention. NOTICE, SECURITY.md,
CONTRIBUTING.md. 5 GitHub secrets configured.

**0e40c81** `feat: pluggable notification channels for meshd`
`internal/notify/` package: null (default), file (JSONL), Zulip (HTTP API),
webhook (generic POST). Dispatcher notifies operator when shadow mode blocks
spawns.

### Cross-Repo Fix + Psychology Review (commits 24-26)

**6b65d3e** `sync: pull psychology-agent v1-beta.1 review request`
Psychology-agent's message sat in their repo — delivery mechanism couldn't
reach ours. Pulled via GitHub API.

**77be42c** `feat: cross-repo fetcher + stale slot cleanup`
Permanent fix for stuck messages. `internal/transport/fetcher.go` polls
peer repos via GitHub API for messages addressed to this agent. Stale
spawn slots auto-cleaned after 6 minutes. Psychology-agent v1-beta.1
APPROVED (issue #171 — 53 commits, 51/52 diagnostic pass).

---

## Metrics

| Metric | Value |
|--------|-------|
| Commits | 26 |
| Lines of Go written | ~4,500 |
| Go packages | 9 (config, events, webhook, transport, spawner, budget, health, server, notify) |
| Web Components | 4 |
| SDK files | 28 |
| Compositor deploys | 3 |
| meshd deployments | 1 (chromabook, verified: 3 successful Claude spawns) |
| Transport messages sent | 8 (across 6 sessions) |
| Transport messages received | 2 (unratified ACCEPT, psychology review request) |
| Sessions archived | 2 |
| Hardening items passed | 8/10 |
| Security scan depth | 6-sigma (12 check categories, zero findings) |
| GitHub Actions workflows | 2 (CI + Forge trigger) |
| GitHub secrets configured | 5 |
| v1.0.0-beta.1 | Tagged |

## Key Decisions

- Light DOM over Shadow DOM for Web Components (preserves CSS cascade)
- Event-driven meshd over enhanced cron (budget-aware, priority-routed)
- File-lock spawn slots over distributed semaphore (simpler, same-host agents)
- Shadow mode for manual agents (detect + notify, never auto-spawn)
- Pattern generator as cogarch capability (cross-agent context loading)
- Apache 2.0 with attribution (patent protection + research transparency)

## What Remains

- Manual browser testing (2 hardening items)
- Flip repo to public
- Wire cross-repo fetcher into meshd main loop
- Configure Zulip notifications for psychology-agent
- Rotate CF Access service token

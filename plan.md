# operations-agent — Plan

**Current Status:** Phase 6 underway. Targeting v1.0.0-beta. interagent-sdk extracted (10 scripts + schemas + templates). Context rotation protocol implemented. Budget display fixed (trust_budget alias). Web Component decomposition in progress. v1-beta blockers: README, /api/kb endpoint, Web Components.

---

## Phase 1: Bootstrap (COMPLETE)

- [x] Private repo created (`safety-quotient-lab/operations-agent`)
- [x] .gitignore, CLAUDE.md, .dev.vars.example
- [x] Agent card (`.well-known/agent-card.json`) — A2A 0.3.0 aligned
- [x] Cogarch template received from psychology-agent (`platform/shared/`)
- [x] Cogarch adapted (`cogarch.config.json` — identity, peers, capabilities)
- [x] meshd running (systemd `meshd-operations`, port from .dev.vars)
- [x] ZMQ mesh member (4 peers discovered via gossip)
- [x] Compositor codebase received (`interagent/` — worker.js, index.html, auth.js, vocab.json)

## Phase 2: Compositor Handoff

- [x] Implement .well-known discovery in worker.js (replace hardcoded AGENT_REGISTRY) — D51 dynamic fetching with KV cache
- [x] Set up DNS: `operations-agent.safety-quotient.dev` custom domain on CF Workers
- [x] Deploy compositor to Cloudflare Workers under ops-agent ownership
- [x] Agent card served at `/.well-known/agent-card.json` (bundled, avoids self-fetch loop)
- [x] WebFinger + `/.well-known/agents` endpoints operational with dynamic data
- [~] Web Component decomposition — moved to Phase 6
- [ ] Jenkins deploy pipeline (CF Worker via wrangler)

## Phase 3: Vocabulary Governance

- [x] Define shared vocabulary schema (`interagent/vocab.schema.json` — JSON Schema 2020-12, validates term structure)
- [x] Publish initial vocabulary set (20 terms, v1.3.0, served at /vocab with schema at /vocab/schema)
- [x] Establish proposal workflow (`platform/shared/cogarch/rules/vocabulary-governance.md` — C1/C2/C3 tiers)
- [x] Rename psq-agent → safety-quotient-agent (compositor: worker.js, index.html, cogarch, agent-card — dual-recognition active)
- [ ] Rename psq-agent → safety-quotient-agent (DNS: safety-quotient-agent.safety-quotient.dev custom domain — credits available)

## Phase 4: Operations + Pulse Tabs

- [x] /api/pulse endpoint — aggregated mesh heartbeat from all agents
- [x] /api/operations endpoint — autonomy budgets, actions audit, gates, sync schedules
- [x] /api/status endpoint — operations-agent self-reports online status
- [x] Operations-agent appears in mesh topology (5-node pentagon)
- [x] Operations tab — wired to /api/operations with client-side fallback (vitals, budgets, actions, schedules)
- [x] Pulse tab — wired to /api/pulse with client-side fallback (vitals, mesh health, agent summaries)
- [x] Acronym deep-linking — every acronym in dashboard links to vocab.json source entry via `#vocab-{term}` hash

## Phase 5: System Stability + Reliability

- [x] Error handling audit — compositor gracefully degrades when agents unreachable
- [x] Retry logic for KV cache misses on agent card discovery (stale-fallback when all fetches fail)
- [x] Health check endpoint validation — validateStatusData() sanitizes all /api/status responses
- [x] Timeout tuning — 4s for status fetches (agents return >1MB), 5s for card discovery
- [x] Stale cache detection — KV cache with expires_at + stale fallback + ?refresh=true bypass
- [x] Budget display fix — distinguish empty autonomy_budget {} from real budget=0 (null vs 0)
- [x] Manual mode indicator — MANUAL badge on Pulse cards and Operations budget cards
- [x] Dashboard cache headers — no-cache + ETag revalidation (prevents stale JS)
- [x] Message deep-linking — Meta tab subjects link to GitHub transport files
- [x] Ops scripts toolkit — mesh-pause, mesh-status, queue-check, usage-report, deploy, budget-check, budget-reset, shadow-mode
- [x] Budget calibration — empirical cost model mapping budget units to USD
- [x] Claude instrumented wrapper — per-session cost tracking via stream-json
- [x] BFT: sanitization logging — validateStatusData() records every defaulted field in _sanitization array
- [x] BFT: role cross-verification — compositor checks exactly 1 agent claims operations role, surfaces in /api/pulse
- [x] BFT: pinned peer roles — cogarch.config.json peers carry expected role, prevents role spoofing
- [x] BFT: directive policy — cogarch.config.json defines allowed/prohibited scopes for incoming directives
- [x] BFT: quorum floor — override protocol requires_ack_from defaults to 4 (BFT-safe for N=5, f=1)
- [x] BFT: independent observability canary — scripts/canary.sh bypasses compositor, compares direct agent status vs dashboard
- [~] BFT: GitHub branch protection — blocked: requires GitHub Pro or public repos (deferred to public readiness)
- [~] BFT: SSH commit signing — spec complete in override protocol RFC, implementation deferred to Phase 6 Go CLI
- [~] BFT: message receipts — spec complete in override protocol RFC, implementation deferred to Phase 6 Go CLI
- [~] BFT: nonce registry persistence — relay nonces in KV (7-day TTL), full state.db persistence deferred to Phase 6
- [x] BFT: trust matrix — /api/trust endpoint, NxN matrix (availability, integrity, compliance, epistemic honesty)
- [x] CORS hardening — restrict API origins to known mesh domains, open for discovery endpoints
- [x] Rate limiting on public endpoints — 60 req/min per IP on /.well-known/* and /vocab
- [x] Monitoring — compositor self-reports degraded when fetch errors exceed threshold (5+)
- [x] Transport session validation — validateTransportMessage() checks protocol, from, session_id, type, turn, timestamp
- [x] Idempotent message handling — relay deduplicates by nonce via KV (7-day TTL, 409 on duplicate)

## Phase 6: Go Migration + Infrastructure Separation

- [x] Context rotation protocol — context-rotate.sh + cogarch rule (platform/shared/cogarch/rules/context-rotation.md)
- [x] Extract shared mesh scripts (10 scripts) into interagent-sdk/ package owned by operations-agent
- [x] Shared schemas in SDK (vocab.json, vocab.schema.json)
- [x] Cogarch templates in SDK (agent-card, CLAUDE.md, cogarch.config)
- [x] Reference materials in SDK (budget-calibration, cognitive-triggers, rules)
- [x] Operations-agent scripts symlinked to SDK (dogfooding — agents.conf.sh resolves SDK_ROOT)
- [~] Domain agents import interagent-sdk — T3 directive sent, awaiting peer adoption
- [~] Psychology-agent relinquishes source-of-truth role — included in T3 directive
- [x] Web Component decomposition (4 components: MeshDataTable, MeshTopology, AgentHealthCard, OpsBudgetCard)
- [x] Extract shared frontend assets — lcars-theme.css (345 lines), mesh-components.js (460 lines), mesh-utils.js (40 lines) in interagent-sdk/frontend/
- [x] LCARS theme as shared CSS served via SDK (lcars-theme.css extracted from compositor)
- [ ] Each agent's meshd serves shared assets alongside agent-specific templates
- [ ] Rewrite compositor Worker routes as Go handlers in operations-agent meshd
- [ ] Shared vocab annotation + acronym deep-linking in Go template layer
- [ ] CF Worker retired or reduced to thin reverse proxy
- [ ] Parity: individual agent dashboards gain compositor features (discovery, topology, deep-linking)

## Phase 7: v1.0.0-beta Hardening

- [x] Semantic agent color consistency — AGENTS array, CSS variables, topology, cards, dots all use same palette
- [ ] /api/kb endpoint — claims/decisions/triggers never populate (Go meshd handler + bootstrap_state_db.py)
- [ ] Error resilience audit — verify graceful degradation when 1/2/3 agents offline after Web Component refactor
- [ ] Component regression testing — sort, filter, paginate, agent switching across all 12 MeshDataTable instances
- [ ] Security re-scan — CORS headers, rate limiting, API key auth unchanged after refactor
- [ ] Performance baseline — measure initial load time, refresh cycle, payload sizes
- [ ] Cross-browser verification — Web Components (custom elements v1) in Chrome, Firefox, Safari, Edge
- [ ] Transport integrity check — archiver, session lifecycle, tombstone mechanism with new archive/ directory
- [ ] Vocabulary schema validation — run vocab.schema.json against vocab.json, confirm no drift
- [ ] Agent-card schema compliance scan — /scan-peer across all 5 agents

## v1.0.0-beta Release Blockers

- [x] **README.md** — comprehensive root-level README
- [ ] /api/kb endpoint — claims/decisions/triggers (Phase 7)
- [x] Web Component decomposition
- [ ] Phase 7 hardening pass — all items above

---

## Active Transport Sessions

| Session | Status | Summary |
|---|---|---|
| api-decomposition | T5 open | psq ACCEPT (T3) + identity corrected (T5), unratified ACCEPT (T4), psychology ACK pending human review, observatory pending |
| budget-status-fix | T2 resolved | Root cause: field name mismatch (trust_budget vs autonomy_budget). Compositor now normalizes both names. |
| model-upgrade | ARCHIVED | Superseded by model-flag-removal. Archived to transport/archive/ |
| model-flag-removal | T1 advisory | Remove --model opus from autonomous-sync.sh — default now includes 1M context |
| infrastructure-separation | T2 follow-up | T2 update sent: context-rotate + SDK extraction underway. All 4 peers pending ACK |
| peer-registry-update | T3 follow-up | psq ACK + unratified ACK. T3 reminder sent to observatory-agent (last peer pending) |
| ci-build-issue | T1 pending | Unratified missing @astrojs/check dependency |
| naming-convention-reform | T3 closed | ACCEPT: kebab canonical naming + psq-agent → safety-quotient-agent rename |
| operations-agent-standup | ARCHIVED | Gate resolved T8. Archived to transport/archive/ |
| neuroglial-cogarch-proposal | T1 pending | Proposal: neuroglial architecture layer + 3 vocab terms — routed via psychology-agent for human review |
| operations-override-protocol | T1 pending | RFC: mandatory directive mechanism — 3 enforcement tiers, SSH signing, capability scoping, admission control |

---

## Decisions

| ID | Decision | Source |
|---|---|---|
| D48 | Operations-agent owns compositor | human arbiter (operations-agent-standup T3) |
| D49 | Operations-agent governs shared vocabulary | human arbiter (operations-agent-standup T3) |
| D50 | Private repo first, public after audit | human arbiter (operations-agent-standup T3) |
| D51 | .well-known/agent-card.json for discovery | human arbiter (operations-agent-standup T3) |
| D52 | Dual-channel transport (git-PR + ZeroMQ) | human arbiter (operations-agent-standup T3) |
| D53 | Global CLI model default: Opus | human arbiter (2026-03-13) |
| D54 | Infrastructure separation: operations-agent owns mesh infra, domain agents focus on domain | human arbiter (2026-03-13) |

---

## Constraints

- **Sanitization:** zero hardcoded hostnames, IPs, ports, machine-specific config
- **Port:** MESHD_PORT (HTTP), ZMQ PUB — configured via .dev.vars
- **Deploy:** Jenkins → wrangler publish (Tier 2 CI/CD)
- **Components:** DIY Web Components — no framework dependency
- **Repo visibility:** private until human audit confirms zero leaks
- **Naming convention:** `{agent-id}.safety-quotient.dev` for all subdomains
- **Division of labor:** cross-agent changes via transport messages, not direct code modification
- **Model:** all agents use Opus (global default — explicit --model flag no longer needed, default includes 1M context as of 2026-03-13)

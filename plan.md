# operations-agent — Plan

**Current Status:** Session 3 complete (20 commits). Phases 8-10 delivered: cogarch v2.0.0, exosome dual-write architecture, state.db with FTS5 search, spawn logging, health persistence. meshd-ops-v2 deployed as drop-in replacement. 12 mesh escalations resolved. git-sync convention v2 patched across all 5 agents. 8 transport directive PRs delivered to peers. Watcher spawn-storm identified for beta.2.

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
- [x] meshd Go daemon — event-driven replacement for cron (webhook receiver, transport watcher, priority queue, budget gate, spawner, health monitor)
- [ ] Each agent's meshd serves shared assets alongside agent-specific templates
- [ ] Rewrite compositor Worker routes as Go handlers in operations-agent meshd
- [ ] Shared vocab annotation + acronym deep-linking in Go template layer
- [ ] CF Worker retired or reduced to thin reverse proxy
- [ ] Parity: individual agent dashboards gain compositor features (discovery, topology, deep-linking)

## Phase 7: v1.0.0-beta Hardening

- [x] Semantic agent color consistency — AGENTS array, CSS variables, topology, cards, dots all use same palette
- [x] /api/kb endpoint — implemented in meshd (internal/server/kb.go), queries state.db for decisions/claims/triggers/memory
- [x] Error resilience audit — PASS: 5/5 agents online, zero fetch errors, graceful degradation confirmed
- [ ] Component regression testing — sort, filter, paginate, agent switching across all 12 MeshDataTable instances (manual)
- [x] Security re-scan — PASS: CORS restricted, no hardcoded secrets/IPs, cache headers correct
- [x] Performance baseline — dashboard 164KB/208ms TTFB, aggregated APIs 2-3s (limited by 1MB+ agent payloads)
- [ ] Cross-browser verification — Web Components (custom elements v1) in Chrome, Firefox, Safari, Edge (manual)
- [x] Transport integrity check — PASS: 9 active sessions, 2 tombstones, 2 archived, zero orphans
- [x] Vocabulary schema validation — PASS: 20 terms v1.4.0, all carry status field (fixed from v1.3.0)
- [x] Agent-card schema compliance scan — 3/5 PASS: psychology + psq missing protocolVersion (T1 sent)

## Phase 8: Cogarch v2.0.0 Rollout + State Layer

- [x] Fetch psychology-agent Session 85 cogarch evaluation (10 dimensions, 53 issues)
- [x] Parity analysis — explicit rationale for every adoption/skip decision
- [x] cogarch.config.json v2.0.0 — adopted: DOF gradient, governance section (wu wei, invariants, complementary, generator balance), inspirations (Deming, Ashby, Beer, Meadows, Stephenson/Anathem, Aurelius/Epictetus), MOS scoring (security + health + compliance + opsec pedagogy), enriched peers, structured routing domains
- [x] CLAUDE.md — adopted: philosophical foundation, problem-solving discipline, scope boundaries, workflow continuity, epistemic flags, /diagnose + /retrospect skills, license gate, internal reference display convention
- [x] schema.sql — canonical schema (9 tables: autonomy_budget, decisions, claims, trigger_state, memory_entries, transport_messages, cogarch_state, mos_scores, universal_facets)
- [x] bootstrap-state-db.sh — initializes state.db from schema + seeds budget, decisions, cogarch state
- [x] index-transport.sh — indexes all transport JSON files into transport_messages table (32 messages)
- [x] kb.go — added messages query (transport_messages → /api/kb response)
- [x] Cross-repo fetcher wired into meshd main loop (5-minute poll, 4 peer repos)
- [x] Dashboard fix — transportGitHubUrl rewired for correct repo resolution + URI encoding
- [x] SDK templates updated — cogarch template + CLAUDE.md template carry governance section
- [x] platform/shared templates synced with SDK
- [x] Deploy updated compositor to Cloudflare Workers
- [x] Deploy meshd + state.db to chromabook (32 messages indexed, schema aligned)
- [x] Platform meshd binary swap — cmd/meshd/ deployed as meshd-ops-v2, serves 7 decisions + 32 messages via /api/kb
- [x] Send transport directive: mesh-parity-v2 (7 issues, PRs to all 4 peers)
- [x] /diagnose + /retrospect skill definitions created

## Phase 9: Exosome Architecture + Dual-Write

- [x] internal/exosome/ — generic dual-write message abstraction (routing, delivery, trajectory audit)
- [x] internal/db/ — shared SQLite access (QueryJSON, QueryScalar, EscapeString, SanitizeID)
- [x] POST /api/messages/inbound — meshd receives messages via HTTP, dual-writes state.db + filesystem
- [x] POST /api/redirect — compositor routes misrouted messages, notifies sender
- [x] GET /api/routing — exposes keyword routing table (exosome = single source of truth)
- [x] Relay handler: dual-write (meshd HTTP + git PR), graceful degradation
- [x] Redirect handler: dual-write + sender notification via PR
- [x] kb.go refactored: uses db.QueryJSON (removes duplicated JSON parsing)
- [x] routing.go refactored: uses exosome.DefaultRoutingTable() (removes duplicated table)
- [x] 9 tests passing (exosome package)
- [x] E2E verified: inbound → state.db + filesystem (exosome_id, delivery state, trajectory)

## Phase 10: Dual-Write Completion + Search

- [x] Spawn logging to state.db — every spawn persists to spawn_log table
- [x] Health observations persisted — OnObserve callback writes to health_observations table
- [x] GET /api/search — FTS5 search across messages, decisions, vocab (with LIKE fallback)
- [x] Schema v2 — spawn_log, health_observations, FTS5 virtual tables + triggers
- [x] git-sync convention v2 — commit staged transport before rebase (fixed dirty index bug)
- [ ] Transport watcher startup — fires on existing files, causing unnecessary spawns. Need seen-set persistence or initial scan suppression.

## Phase 11: Dashboard Evaluation + Status Enrichment

- [x] /api/status enriched — autonomy_budget, recent_messages, unprocessed_messages, recent_spawns, active_gates (matches compositor schema)
- [x] Peer agent-cards patched — all 4 peers list operations-agent + protocolVersion 0.3.0
- [x] All transport directive PRs merged (unratified + observatory)
- [x] Mesh-diagnostic-request sent to all 4 peers (awaiting ACKs)
- [ ] 245 empty subjects across peer agents (P2 constraint violation — needs peer indexer fixes)
- [ ] CF Access service token for cross-mesh API calls

## v1.0.0-beta.2 Backlog

- [x] Transport watcher seen-set persistence (.watcher-seen.json — 128 entries, zero spawn storms)
- [ ] Solid-OIDC auth layer (replace bearer tokens)
- [ ] DNS rename psq → safety-quotient-agent
- [ ] Component regression testing (manual)
- [ ] Cross-browser verification (manual)

## v1.0.0-beta Release Blockers

- [x] **README.md** — comprehensive root-level README
- [x] /api/kb endpoint — implemented in meshd
- [x] Web Component decomposition
- [~] Phase 7 hardening pass — 8/10 items complete (2 manual: component regression + cross-browser)

---

## Active Transport Sessions

| Session | Status | Summary |
|---|---|---|
| api-decomposition | T5 open | psq ACCEPT (T3) + identity corrected (T5), unratified ACCEPT (T4), psychology ACK pending human review, observatory pending |
| budget-status-fix | T2 resolved | Root cause: field name mismatch (trust_budget vs autonomy_budget). Compositor now normalizes both names. |
| model-upgrade | ARCHIVED | Superseded by model-flag-removal. Archived to transport/archive/ |
| model-flag-removal | T1 advisory | Remove --model opus from autonomous-sync.sh — default now includes 1M context |
| infrastructure-separation | T3 partial | Unratified ACCEPT (T3). Psychology, psq, observatory pending ACK |
| mesh-consistency-fixes | T1 directive | 4 issues: peer registry, budget handler, transport protocol, status peers |
| peer-registry-update | T3 follow-up | psq ACK + unratified ACK. T3 reminder sent to observatory-agent (last peer pending) |
| ci-build-issue | T1 pending | Unratified missing @astrojs/check dependency |
| naming-convention-reform | T3 closed | ACCEPT: kebab canonical naming + psq-agent → safety-quotient-agent rename |
| operations-agent-standup | ARCHIVED | Gate resolved T8. Archived to transport/archive/ |
| agent-card-compliance | T1 pending | Phase 7 scan: psychology + psq missing protocolVersion, provider fields |
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

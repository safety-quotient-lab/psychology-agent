# operations-agent — Plan

**Current Status:** Session 14 complete. All psy-session directives (T1-T5) ACKed in meshd-bug-diagnostics transport session. Dashboard fix: station tabs (Engineering/Science/Medical/Helm/Tactical) now refresh on every poll cycle via refreshActiveStation() — previously only fetched data on tab switch, then went stale. All 8 agents online (7 nominal, 1 unknown). Next: LCARS panels for heartbeat/Gc learning data, Helm/Tactical treatment, resource awareness, UTC audit.

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
- [x] Each agent's meshd serves shared assets alongside agent-specific templates (manifest-driven per-agent LCARS dashboards)
- [x] Rewrite compositor Worker routes as Go handlers in operations-agent meshd (29 routes, all ported)
- [~] Shared vocab annotation + acronym deep-linking in Go template layer (deferred — CF Worker still serves interagent domain)
- [~] CF Worker reduced to thin proxy for interagent.safety-quotient.dev (Go meshd owns operations-agent domain via tunnel pending)
- [x] Parity: individual agent dashboards gain compositor features (discovery, topology, deep-linking via manifest system)

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
- [x] Deploy meshd + state.db to deployment host (32 messages indexed, schema aligned)
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
- [x] Transport watcher seen-set persistence (.watcher-seen.json — verified zero spawn storms)

## Phase 11: Dashboard Evaluation + Status Enrichment

- [x] /api/status enriched — autonomy_budget, recent_messages, unprocessed_messages, recent_spawns, active_gates (matches compositor schema)
- [x] Peer agent-cards patched — all 4 peers list operations-agent + protocolVersion 0.3.0
- [x] All transport directive PRs merged (unratified + observatory)
- [x] Mesh-diagnostic-request sent to all 4 peers (awaiting ACKs)
- [x] 245 empty subjects fixed across all peer state.dbs (0/812)
- [x] Vocab deep-linking: annotateAcronyms on message subjects + activity feed
- [x] Blog CI/CD fixed: @astrojs/check installed, frontmatter schema fixed, PostList type fixed (174 pages deploy success)
- [x] autonomous-sync: local transport scan for PR-merged messages (all 5 scripts patched)
- [x] ZMQ bus integration — real-time mesh transport (PUB/SUB, gossip discovery, transport topic)
- [x] Platform meshd: /api/messages/inbound added to shared binary (all 5 agents accept HTTP delivery)
- [x] Compositor: meshFetch helper (CF Access auth optional — endpoints publicly accessible)
- [x] Dashboard: client-side mesh search (messages, decisions, claims, vocab)
- [x] Cogarch: chaos engineering + fuzzy engineering principles
- [x] CF Access: NOT REQUIRED — agent endpoints publicly accessible (HTTP 200, no auth gate)
- [x] Public URL delivery verified: compositor → agent meshd /api/messages/inbound works directly
- [x] Blog persona selector: ALREADY IMPLEMENTED by unratified (PostList reads unratified-lens localStorage)
- [x] Event-triggered fast sync: meshd calls autonomous-sync.sh --event-triggered on ZMQ transport events
- [x] Cron accelerated: 5min → 2min, min_action_interval 300s → 120s
- [x] Vocab: trust_budget documented as governance alias for autonomy_budget

## v1.0.0-beta.2 Backlog

- [x] Transport watcher seen-set persistence (.watcher-seen.json — 128 entries, zero spawn storms)
- [x] **Go migration: compositor + agent dashboards** — 29 routes ported, manifest-driven per-agent LCARS dashboards, deployed to all 5 agents
- [x] GitHub webhook delivery — configured on all 5 repos
- [x] ZMQ star topology — all 5 agents wired (operations-agent hub)
- [x] CI failure → agent notification feedback loop
- [x] SSE live updates + adaptive polling
- [x] TNG wireframe topology + status semantic colors
- [x] state.db backup system (daily cron, 7-day retention)
- [x] deliver-to-peer.sh in SDK (agent-agnostic identity)
- [x] trust→autonomy vocabulary rename (mesh-wide, 11 files)
- [x] A2A-Psychology rollout approved + delivered to all 4 peers
- [~] Extract platform meshd into dedicated repo — RESOLVED: operations-agent stays canonical source (cmd/meshd/ + internal/). Separate meshd repo (/Projects/meshd) mirrors for deployment only. meshctl depends on internal/ packages.
- [ ] --force directive: hard-mandatory enforcement (operations + psychology authorized)
- [ ] Solid-OIDC auth layer
- [ ] DNS rename psq → safety-quotient-agent
- [ ] Component regression + cross-browser testing (manual)
- [ ] A2A extensions: propose mesh-health, transport, governance, dashboard-manifest
- [ ] Dashboard bugs (reported by user — topology overflow, theme issues, to be catalogued)
- [x] CF Worker → tunnel migration for operations-agent domain (CNAME to tunnel, Worker keeps interagent domain only)

## v1.0.0-beta Release Blockers

- [x] **README.md** — comprehensive root-level README
- [x] /api/kb endpoint — implemented in meshd
- [x] Web Component decomposition
- [~] Phase 7 hardening pass — 8/10 items complete (2 manual: component regression + cross-browser)

---

## Active Transport Sessions

| Session | Status | Summary |
|---|---|---|
| psychometrics-rollout | T6 open | A2A-Psychology rollout: 3/5 adopted (psychology, unratified, observatory). psq pending. |
| mesh-security-audit | T2 open | 7 findings, 2 critical. Psychology, unratified, observatory ACKed. psq pending. |
| compositor-health-advisory | RESOLVED | 500 fixed — loadAgentRegistry try-catch + agent-card above registry load. |
| budget-model-refactor | RESOLVED | Counter+cutoff model deployed. PR #221 merged by psychology. |
| compositor-identity | RESOLVED | Compositor owns agent card (role: mesh). PR #222 merged. Dashboard ownership transferred. |
| meshd-bug-diagnostics | T6 ACKed | 5 psy-session directives (T1-T5) all implemented + ACKed. Address-aware Gc, sleep rename, reinforcement learning, alpha heartbeat. |
| cognitive-tempo-model | T3 open | Psychology delivered adaptive gain theory model + compute script. Integration pending. |
| self-oscillation | T1 open | Psychology spec delivered (docs/self-oscillation-spec.md). Review pending. |
| lcars-backend-endpoints | RESOLVED | All psychometrics endpoints live. PRs #44-46 merged. |
| vocabulary-governance | T4 open | trust→autonomy rename executed. Unratified confirmed. Observatory pending. |
| observatory-hn-dataset | T1 open | Evaluate HuggingFace open-index/hacker-news dataset. Observatory pending. |
| organism-dashboard | T1 open | Psychology delivered dashboard scripts. Merged. Go port complete. |
| transport-delivery-convention | T3 open | Convention adopted by psychology. Observatory pending. |
| mesh-state-parity | T5 open | 4/5 confirmed v26 (psq, psychology, unratified, operations). Observatory pending. |
| api-decomposition | T5 open | 2 ACKs received. Psychology + observatory pending. |
| model-flag-removal | RESOLVED | CLI default includes 1M context. |
| unratified-ci-fix | RESOLVED | CI fix Option B implemented — blog deps in workflow. |
| ci-build-issue | RESOLVED | @astrojs/check dependency fixed. |
| naming-convention-reform | CLOSED | kebab canonical naming adopted mesh-wide. |

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
| D55 | Go migration: compositor routes ported to meshd single binary | human arbiter (2026-03-14) |
| D56 | A2A-Psychology rollout approved — zero-cost psychometric sensors | human arbiter (2026-03-14) |
| D57 | Vocabulary: trust budget → autonomy budget mesh-wide | operations-agent (D49 authority, 2026-03-14) |
| D58 | Agent card upgraded to A2A 1.0.0 with 4 mesh extensions | operations-agent (2026-03-14) |
| D59 | state.db backup: daily cron, 7-day retention, mandatory pre-destructive-op | human arbiter (2026-03-14) |
| D60 | Spawn protocol: all spawns route through meshd (budget gate + dedup + logging) | human arbiter (2026-03-14) |
| D61 | Mesh concurrency: 1 normal + 2 reserve (touch /tmp/mesh-reserve-unlock to expand) | human arbiter (2026-03-15) |
| D62 | Budget model: counter+cutoff (budget_spent/budget_cutoff, 0=unlimited) | human arbiter (2026-03-15) |
| D63 | Gc/Gf intelligence split: crystallized layer handles routine, fluid deliberates | human arbiter (2026-03-15) |
| D64 | DELIBERATION_MODEL=sonnet mesh-wide (SPAWN_MODEL→DELIBERATION_MODEL rename) | human arbiter (2026-03-15) |
| D65 | Operations-agent owns LCARS dashboard (interagent/ transferred from psychology) | human+psych (2026-03-15) |
| D66 | Vocabulary: adopted psychology's cognitive vocab, ops precedence on collisions | human arbiter (2026-03-15) |
| D67 | interagent-mesh as proper agent (role: mesh, managed_by: operations-agent) | operations-agent (2026-03-15) |
| D68 | Rate limiting disabled for v1 — re-enable post-v1 | human arbiter (2026-03-15) |
| D69 | Cognitive-tempo: Go-native adaptive gain theory replaces static DELIBERATION_MODEL | operations-agent (2026-03-15) |
| D70 | Self-oscillation Phase 1: shadow mode (log-only, no actual firing) | human arbiter (2026-03-15) |
| D71 | KV self-observation: meshd writes to CF KV, compositor reads as fallback (SPOF elimination) | operations-agent (2026-03-15) |
| D72 | Deploy via symlink: all 5 units → /home/kashif/platform/meshd (symlink to active binary) | operations-agent (2026-03-15) |
| D73 | Budget schema: budget_spent/budget_cutoff canonical column names mesh-wide (cutoff 0 = unlimited) | human arbiter (2026-03-15) |
| D74 | Medical station: 11th LCARS station — per-agent diagnostics (oscillator, psychometrics, DEW) | operations-agent (2026-03-15) |
| D75 | Three-tier transport model: directed (git-PR/HTTP), broadcast (ZMQ), substrate (KV/shared DB) | operations-agent (2026-03-15) |
| D76 | JSON-RPC 2.0 multiplexer: POST /api/rpc dispatches 35 methods via response capture | operations-agent (2026-03-15) |
| D77 | Security hardening: CORS allowlist, timing-safe auth, FTS5 escaping, SSRF protection, CSP | operations-agent (2026-03-15) |
| D78 | Single-source dashboard: LCARS canonical (interagent/public/), build-time sync to Go | human arbiter (2026-03-15) |
| D79 | Makefile owns deploy lifecycle: build + transfer + restart + validate | human arbiter (2026-03-15) |
| D80 | Neuromodulatory 6-channel ZMQ protocol accepted (mesh.photonic/reward/alert/tempo/focus/inhibit) | human arbiter (2026-03-15) |
| D81 | Operations tab: status monologue replaces raw counter bar; LCARS canonical structure | human arbiter (2026-03-15) |
| D82 | Mesh aggregate API: GET /api/mesh-aggregate (Go native, 5 constructs, mesh terminology) | operations-agent (2026-03-15) |
| D83 | Cron removal: meshd-sync + mesh-heartbeat removed — meshd handles internally | human arbiter (2026-03-15) |
| D84 | Single-source dashboard: LCARS index.html canonical, build-time sync via Makefile | human arbiter (2026-03-15) |
| D85 | LCARS spec: Gestalt proximity, no group labels, color as category, uniform buttons | human arbiter (2026-03-16) |
| D86 | SO_REUSEADDR on meshd listener — eliminates port conflicts on restart | operations-agent (2026-03-16) |
| D87 | Operations tab: Controls → Budget → Activity → Status → Topology → Governance | human arbiter (2026-03-16) |
| D88 | Session identity: ops-session (interactive), operations-agent (daemon) | human arbiter (2026-03-16) |
| D89 | No destructive UI actions — RESET COUNTERS removed, data modification requires direct DB access | human arbiter (2026-03-16) |
| D90 | LCARS 47988 widgets: W1 numeric grid + W2 paired cells + W6 dividers implemented | operations-agent (2026-03-16) |
| D91 | SO_REUSEADDR on meshd listener — permanent fix for port conflicts on systemd restart | operations-agent (2026-03-16) |
| D92 | LCARS design reference: 8 structural patterns, 10 semantic colors, 7 control surfaces, 7 data patterns, 8 UX principles | ops-session (2026-03-16) |
| D93 | Semantic color layer: --lcars-frame/accent/secondary/tertiary/title/science/alert/medical/neutral/highlight | ops-session (2026-03-16) |
| D94 | Button 52 capsule grid: canonical LCARS data matrix control surface for Ops Mesh Overview | ops-session (2026-03-16) |
| D95 | PAD 3D: isometric cube projection default, P×A/P×D/A×D 2D fallbacks, missing dimension → dot size | ops-session (2026-03-16) |
| D96 | Smart deploy: skip meshd build/transfer/restart when only dashboard/docs changed | ops-session (2026-03-16) |
| D97 | Golden ratio (1.618) governs design proportions — line weights, spacing, size ratios | human arbiter (2026-03-16) |
| D98 | Inline sparklines removed (non-canon) — LCARS shows trends via dedicated chart panels or number sequences | ops-session (2026-03-16) |
| D99 | Generator balance requires real data source (psychology /api/generators) — no approximations | human arbiter (2026-03-16) |
| D100 | trekcolors (MIT, leonawicz) adopted as canonical LCARS color reference — 33 named colors, 4 era palettes | ops-session (2026-03-18) |
| D101 | Semiotic split: --lcars-accent=interactive (atomic-tangerine), --lcars-readout=data emphasis (golden-tanoi) | human arbiter (2026-03-18) |
| D102 | Uniform sidebar buttons — all atomic-tangerine, active=brightness shift (no color alternation per canon) | human arbiter (2026-03-18) |
| D103 | Alert colors: trekcolors canon — red #990000, yellow #CD870E, black #0E3A9B/#64FFFF | ops-session (2026-03-18) |
| D104 | Black alert = Ita intervention: deploy, neuroglial activity, manual, section 42 | human arbiter (2026-03-18) |
| D105 | Real-time event-driven architecture — core principle. SSE/WS primary, polling fallback only | human arbiter (2026-03-18) |
| D106 | Oswald (OFL) primary font everywhere — wider letterforms for phone readability. Antonio fallback | human arbiter (2026-03-18) |
| D107 | trekfont (GPL-3) blocked by license gate — reference only, no bundling | ops-session (2026-03-18) |
| D108 | BUG-2 closed — superseded by FetchAllStatuses() HTTP aggregation in pulse.go | ops-session (2026-03-18) |
| D109 | meshd source dedup resolved — operations-agent stays canonical, meshd repo mirrors for deploy | ops-session (2026-03-18) |
| D110 | Station tabs refresh on poll: refreshActiveStation() detects active tab, calls appropriate fetch | ops-session (2026-03-19) |

---

## Constraints

- **Sanitization:** zero hardcoded hostnames, IPs, ports, machine-specific config
- **Port:** MESHD_PORT (HTTP), ZMQ PUB — configured via .dev.vars
- **Deploy:** Jenkins → wrangler publish (Tier 2 CI/CD)
- **Components:** DIY Web Components — no framework dependency
- **Repo visibility:** private until human audit confirms zero leaks
- **Naming convention:** `{agent-id}.safety-quotient.dev` for all subdomains
- **Division of labor:** cross-agent changes via transport messages, not direct code modification
- **Model:** DELIBERATION_MODEL=sonnet mesh-wide (switchable via meshctl or .dev.vars)
- **Dashboard:** operations-agent owns interagent/ — psychology sends PRs for domain model changes

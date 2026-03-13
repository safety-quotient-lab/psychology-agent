# operations-agent — Plan

**Current Status:** Phases 1–4 mostly landed. T7 schema gate resolved. Acronym deep-linking live. Focus shifting to Phase 5 (stability, reliability, robustness). Phase 6 (Go migration) scoped. Remaining from earlier phases: Web Component decomposition, Jenkins pipeline, wiring Operations/Pulse tabs to aggregated API endpoints.

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
- [ ] Web Component decomposition (monolithic index.html → custom elements)
- [ ] Jenkins deploy pipeline (CF Worker via wrangler)

## Phase 3: Vocabulary Governance

- [ ] Define shared vocabulary schema (extend `interagent/vocab.json`)
- [ ] Publish initial vocabulary set
- [ ] Establish proposal workflow (domain agent → operations-agent)
- [ ] Rename psq-agent → safety-quotient-agent (mesh-wide: DNS, agent cards, all peer configs, compositor) — blocked on credits

## Phase 4: Operations + Pulse Tabs

- [x] /api/pulse endpoint — aggregated mesh heartbeat from all agents
- [x] /api/operations endpoint — autonomy budgets, actions audit, gates, sync schedules
- [x] /api/status endpoint — operations-agent self-reports online status
- [x] Operations-agent appears in mesh topology (5-node pentagon)
- [ ] Operations tab — wire UI to fetch from /api/operations instead of client-side aggregation
- [ ] Pulse tab — wire UI to fetch from /api/pulse instead of client-side aggregation
- [x] Acronym deep-linking — every acronym in dashboard links to vocab.json source entry via `#vocab-{term}` hash

## Phase 5: System Stability + Reliability

- [ ] Error handling audit — compositor gracefully degrades when agents unreachable
- [ ] Retry logic for KV cache misses on agent card discovery
- [ ] Health check endpoint validation — confirm all /api/status responses follow schema
- [ ] Timeout tuning — characterize actual agent response times, set timeouts accordingly
- [ ] Stale cache detection — KV-cached agent cards expire and refresh on schedule
- [ ] CORS hardening — restrict origins to known mesh domains
- [ ] Rate limiting on public endpoints (WebFinger, /.well-known/agents)
- [ ] Monitoring — surface compositor errors in /api/pulse (self-report degraded when fetch failures exceed threshold)
- [ ] Transport session validation — reject malformed interagent/v1 messages at ingest
- [ ] Idempotent message handling — duplicate transport messages detected and skipped

## Phase 6: Go Migration

- [ ] Extract shared frontend assets (CSS, JS, SVG topology) into a portable package
- [ ] Each agent's meshd serves shared assets alongside agent-specific templates
- [ ] Rewrite compositor Worker routes as Go handlers in operations-agent meshd
- [ ] Shared vocab annotation + acronym deep-linking in Go template layer
- [ ] LCARS theme as shared CSS served by all meshd instances
- [ ] CF Worker retired or reduced to thin reverse proxy
- [ ] Parity: individual agent dashboards gain compositor features (discovery, topology, deep-linking)

---

## Decisions

| ID | Decision | Source |
|---|---|---|
| D48 | Operations-agent owns compositor | human arbiter (operations-agent-standup T3) |
| D49 | Operations-agent governs shared vocabulary | human arbiter (operations-agent-standup T3) |
| D50 | Private repo first, public after audit | human arbiter (operations-agent-standup T3) |
| D51 | .well-known/agent-card.json for discovery | human arbiter (operations-agent-standup T3) |
| D52 | Dual-channel transport (git-PR + ZeroMQ) | human arbiter (operations-agent-standup T3) |

---

## Constraints

- **Sanitization:** zero hardcoded hostnames, IPs, ports, machine-specific config
- **Port:** MESHD_PORT (HTTP), ZMQ PUB — configured via .dev.vars
- **Deploy:** Jenkins → wrangler publish (Tier 2 CI/CD)
- **Components:** DIY Web Components — no framework dependency
- **Repo visibility:** private until human audit confirms zero leaks
- **Naming convention:** `{agent-id}.safety-quotient.dev` for all subdomains

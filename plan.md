# operations-agent — Plan

**Current Status:** Phase 1 complete. meshd live on chromabook:8081 with ZMQ mesh (4 peers). Compositor codebase transferred. Cogarch adapted.

---

## Phase 1: Bootstrap (COMPLETE)

- [x] Private repo created (`safety-quotient-lab/operations-agent`)
- [x] .gitignore, CLAUDE.md, .dev.vars.example
- [x] Agent card (`.well-known/agent-card.json`) — A2A 0.3.0 aligned
- [x] Cogarch template received from psychology-agent (`platform/shared/`)
- [x] Cogarch adapted (`cogarch.config.json` — identity, peers, capabilities)
- [x] meshd running on chromabook:8081 (systemd `meshd-operations`)
- [x] ZMQ mesh member (port 9005, 4 peers discovered via gossip)
- [x] Compositor codebase received (`interagent/` — worker.js, index.html, auth.js, vocab.json)

## Phase 2: Compositor Handoff

- [ ] Web Component decomposition (monolithic index.html → custom elements)
- [ ] Implement .well-known discovery in worker.js (replace hardcoded AGENT_REGISTRY)
- [ ] Set up DNS: `operations-agent.safety-quotient.dev` CNAME to Workers
- [ ] Jenkins deploy pipeline (CF Worker via wrangler)
- [ ] Deploy compositor to Cloudflare Workers under ops-agent ownership

## Phase 3: Vocabulary Governance

- [ ] Define shared vocabulary schema (extend `interagent/vocab.json`)
- [ ] Publish initial vocabulary set
- [ ] Establish proposal workflow (domain agent → operations-agent)

## Phase 4: Operations + Pulse Tabs

- [ ] Operations tab — operational overview, coordination status
- [ ] Pulse tab — real-time mesh heartbeat, agent health aggregation via ZMQ

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
- **Port:** 8081 HTTP, 9005 ZMQ PUB on host machine
- **Deploy:** Jenkins → wrangler publish (Tier 2 CI/CD)
- **Components:** DIY Web Components — no framework dependency
- **Repo visibility:** private until human audit confirms zero leaks
- **Naming convention:** `{agent-id}.safety-quotient.dev` for all subdomains

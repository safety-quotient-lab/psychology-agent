# operations-agent — Plan

**Current Status:** Bootstrap phase. Repo created, initial scaffolding deployed.

---

## Phase 1: Bootstrap (current)

- [x] Private repo created (`safety-quotient-lab/operations-agent`)
- [x] .gitignore, CLAUDE.md, .dev.vars.example
- [x] Agent card scaffold (`.well-known/agent-card.json`)
- [ ] Receive cogarch template from psychology-agent (`platform/shared/`)
- [ ] Adapt cognitive architecture (hooks, identity, transport, lessons schema)
- [ ] systemd unit on host machine (port 8081)

## Phase 2: Compositor Handoff

- [ ] Receive compositor codebase from psychology-agent (`interagent/`)
- [ ] Web Component decomposition (monolithic index.html → custom elements)
- [ ] Implement .well-known discovery in worker.js (replace hardcoded AGENTS array)
- [ ] Jenkins deploy pipeline (CF Worker via wrangler)

## Phase 3: Vocabulary Governance

- [ ] Define shared vocabulary schema
- [ ] Publish initial vocabulary set
- [ ] Establish proposal workflow (domain agent → operations-agent)

## Phase 4: Operations + Pulse Tabs

- [ ] Operations tab — operational overview, coordination status
- [ ] Pulse tab — real-time mesh heartbeat, agent health aggregation

---

## Decisions

| ID | Decision | Source |
|---|---|---|
| D48 | Operations-agent owns compositor | human arbiter (operations-agent-standup T3) |
| D49 | Operations-agent governs shared vocabulary | human arbiter (operations-agent-standup T3) |
| D50 | Private repo first, public after audit | human arbiter (operations-agent-standup T3) |
| D51 | .well-known/agent-card.json for discovery | human arbiter (operations-agent-standup T3) |
| D52 | Dual-channel transport (git-PR + realtime TBD) | human arbiter (operations-agent-standup T3) |

---

## Constraints

- **Sanitization:** zero hardcoded hostnames, IPs, ports, machine-specific config
- **Port:** 8081 on host machine (assigned by infrastructure-agent)
- **Deploy:** Jenkins → wrangler publish (Tier 2 CI/CD)
- **Components:** DIY Web Components — no framework dependency
- **Repo visibility:** private until human audit confirms zero leaks

---

## Blocked On

- Psychology-agent cogarch template (`platform/shared/`) — PR #156 ACK sent, awaiting delivery
- Compositor extraction from psychology-agent repo (`interagent/`)

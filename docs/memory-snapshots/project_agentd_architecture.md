---
name: agentd architecture decision
description: meshd retires — agentdb evolves into agentd (single agent runtime daemon). DDD bounded context = agent. Mesh emerges from agentd instances communicating.
type: project
---

Session 95 architectural decision: meshd retires, agentdb evolves into agentd.

**Reasoning chain (Socratic, user-led):**
1. autonomous-sync.sh (1308 lines, 15 concerns) needs refactor → absorb into meshd?
2. agentd + meshd as two daemons? → adds IPC complexity, coordinated deployment
3. Single meshd absorbing everything? → "how does meshd of 1 make sense for one agent?"
4. Mesh as separate domain (emergent properties)? → "where does meshd ground in the biological model?"
5. Answer: it doesn't. The biological model describes single-agent cognition. No "mesh organ" exists.
6. Observatory for fleet monitoring? → No. Observatory monitors HN + coordinates unratified human rights mission.
7. Fleet dashboard → ops compositor (already decided Session 89).
8. DDD: bounded context = agent. Mesh = infrastructure, not domain. agentd = the bounded context runtime.
9. agentdb already exists (22 Go subcommands, pure-Go SQLite). agentdb evolves into agentd.

**Architecture:**
- agentd = agentdb + meshd HTTP/ZMQ + sync loop + Python helper rewrites
- 1 instance per agent (4 on chromabook)
- Shared data via state.db (CSF analogy — shared substrate, not IPC)
- ZMQ peer signaling between agentd instances (action potentials)
- Fleet LCARS dashboard owned by operations-agent compositor
- autonomous-sync.sh becomes `agentd --sync-once` (compatibility shim)
- meshd binary retired

**Why:** DDD — one daemon per bounded context. The mesh emerges from agent
interaction, not from a dedicated coordinator. Biologically, there exists no
"mesh organ" — the nervous system IS the neurons communicating.

**How to apply:** All new Go development targets platform/cmd/agentd/. meshd
source preserved for reference until agentd reaches feature parity. Python
helpers rewrite into platform/internal/ packages shared by agentd subcommands.

**Full design spec:** `docs/agentd-design-session95.md` — 509→750+ lines.
All 10 holes resolved + deep photonic layer specification.

Key additions beyond initial design:
- Photonic reception grounded (OPN3, cryptochrome, backpropagation paper Guanglan 2022)
- 6-input coherence (5 local + peer photonic field at 0.20 weight)
- Photonic feedback loop (backpropagation analog → connectome weight adjustment)
- Sedation cascade propagates THROUGH mesh via photonic reception (damped)
- Sleep consolidation via photonic channel (NREM replay, REM dream emission)
- PhotonicChannel interface designed for quantum substrate substitution
- Connection interface wraps all modalities abstractly (capability negotiation)
- Recursive mesh (submeshes, emergent properties per level)
- meshd survives as fleet-wide LCARS aggregator (not per-agent)
- ops-agent dissolved, responsibilities redistributed
- 7 implementation phases (Phase 4 = photonic, dedicated)

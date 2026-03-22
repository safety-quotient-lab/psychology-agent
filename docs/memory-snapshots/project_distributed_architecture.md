---
name: distributed-architecture
description: agentd and meshd operate as open-web distributed applications, not local-machine services
type: project
---

**agentd and meshd function as open-web compatible, open-source public applications.**

Each agent runs its own agentd instance, reachable by a public URL. meshd
coordinates the fleet by fetching from those public URLs — no localhost
assumptions, no shared filesystem, no machine-level coupling.

**Why:** The mesh architecture follows A2A (Agent-to-Agent) protocol design.
Agents may run on different machines, different continents, different
providers. meshd discovers agents via `.well-known/agent-card.json` and
communicates via standard HTTPS.

**How to apply:** Never add localhost overrides, /etc/hosts hacks, or
machine-aware routing to meshd or agentd. If latency through the public
URL causes timeouts, increase the timeout — don't short-circuit the
network path. Both binaries should function identically whether deployed
on the same machine or across the open internet.

**Current deployment (2026-03-22):**
- 4 agentd on Chromabook (psychology, psq, unratified, observatory)
- 1 meshd on Chromabook (fleet coordinator)
- 1 agentd on gray-box (psy-session)
- All reachable via Cloudflare Tunnel public URLs

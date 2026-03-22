---
name: psy-session architecture — no local meshd
description: Decision to remove meshd from gray-box. psy-session runs agentd only, discovered by Chromabook meshd via tunnel.
type: project
---

psy-session runs agentd only on gray-box — no local meshd (Session 98, 2026-03-22).

**Decision:** agentd has zero dependency on meshd. meshd discovers agents via HTTP polling of agent card URLs. A second meshd on gray-box duplicated discovery, split mesh state, and caused tunnel hostname collisions.

**Why:** meshd→agentd communication happens entirely via HTTP (agent card fetch + /api/status polling). ZMQ layers remain unactivated (Phase 3-4). No benefit from co-located meshd when one remote meshd suffices.

**How to apply:** One meshd on Chromabook serves as the single mesh compositor. All agents (including psy-session on gray-box) register by their tunnel URL. Never deploy meshd to gray-box again unless ZMQ requires co-location (evaluate when Phase 3 activates).

**Cleanup performed:**
- Unloaded `dev.safety-quotient.meshd-psy-session` launchd service on gray-box
- Unloaded `dev.safety-quotient.internal.mesh-dashboard` launchd service (legacy Python)
- Disabled `config-psychology-agent.yml` cloudflared tunnel (conflicting hostname)
- Fixed `config-gray-box.yml` → only `psy-session.safety-quotient.dev` → `:8076`
- Removed `mesh.safety-quotient.dev` and `operations-agent.*` from gray-box tunnels

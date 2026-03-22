---
name: repo-locations
description: Local paths, Go modules, URLs for all repos in the mesh
type: reference
---

| Repo | Local Path | Purpose | Go Module |
|---|---|---|---|
| psychology-agent | `/Users/kashif/Projects/psychology-agent` | Content — docs, transport, triggers, vocabulary | N/A |
| agentd | `/Users/kashif/Projects/agentd` | Per-agent runtime + dashboard | `github.com/safety-quotient-lab/agentd` |
| meshd | `/Users/kashif/Projects/meshd` | Fleet coordinator + dashboard | `github.com/safety-quotient-lab/meshd` |
| lcars | `/Users/kashif/Projects/lcars` | Shared LCARS visual library (JS, CSS, fonts) | N/A |
| agent-kit | `/Users/kashif/Projects/agent-kit` | Shared agent infrastructure (schema, scripts, cogarch) | N/A |
| operations-agent | `/Users/kashif/Projects/operations-agent` | **ARCHIVED** — dissolved Session 95, code in meshd | N/A |

**Serving:**
- agentd: `localhost:8076` (per-agent dashboard at `/lcars/v2/`)
- meshd: `localhost:8082` / `mesh.safety-quotient.dev` (fleet dashboard)

**Session 97 changes:**
- agentd extracted from `psychology-agent/platform/` (Session 97)
- `platform/` removed from psychology-agent
- meshd build fixed (imports pointed to own internal/, not operations-agent)
- WebSocket `/ws` added to both agentd and meshd (Cloudflare Tunnel compatibility)
- operations-agent archived — meshd has its own copies of all 14 internal packages

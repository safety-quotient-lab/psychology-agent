---
name: gray-box-mesh-migration
description: Mesh migrated from Chromabook to gray-box (2026-03-23). All services running from ~/Projects/sqlab/. State.db fresh — historical data on Chromabook.
type: project
---

**Mesh relocated to gray-box** (2026-03-23, Session 99).

Chromabook went down. All services migrated to gray-box:
- ~/Projects/sqlab/ — flat layout, repo names match GitHub
- 6 services: meshd (8081) + 5 agentd instances (8070-8076)
- Cloudflare tunnel 3fffab39 routes all hostnames
- Two certs: cert.sqlab.pem (safety-quotient.dev), cert.unratified.pem (unratified.org)
- agentd repo pushed to GitHub (was local-only on Chromabook)
- cmd/meshd/main.go committed (was gitignored by bare 'meshd' pattern)

**State.db fresh** — bootstrapped empty. Historical data exists only on
Chromabook's state.db files. When Chromabook recovers:
1. scp state.db files to gray-box
2. Or rebuild via bootstrap_state_db.py from transport session files

Triple store repopulates automatically from live data within minutes.

**How to apply:** gray-box serves as primary mesh host going forward.
Chromabook becomes backup/secondary when it recovers.

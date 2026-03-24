---
name: gray-box-mesh-migration
description: All mesh infrastructure runs on gray-box (this machine) — local deploys only. Chromabook decommissioned as deploy target.
type: project
---

**gray-box runs everything locally** (2026-03-23, Session 99+100).

All services run on this machine at ~/Projects/sqlab/:
- 6 services: meshd (8081) + 5 agentd instances (8070-8076)
- Cloudflare tunnel 3fffab39 routes all hostnames
- Two certs: cert.sqlab.pem (safety-quotient.dev), cert.unratified.pem (unratified.org)

**Deploy = local rebuild + restart.** No SSH, no SCP, no remote targets.
Chromabook decommissioned — not a deploy target, not a backup host.

**Why:** Chromabook went down permanently. gray-box absorbed all services.
The Makefile `deploy` target (SSH to chromabook:2535) no longer applies.
Build locally, restart the local process.

**How to apply:** Never use `make deploy`. Build with `make build`, then
restart the local meshd process directly.

---
name: chromabook-not-hetzner
description: Chromabook runs as a local laptop, not on Hetzner — do not conflate the two hosts
type: feedback
---

Chromabook operates as a local laptop (x86_64 Linux), not a Hetzner VPS.
Hetzner (178.156.229.103) exists as a separate host. When planning
infrastructure deployments, keep these distinct:

- **chromabook** — local laptop, runs meshd, cron, agent repos
- **Hetzner** — separate VPS, accessed via SSH from cabinet (Jenkins)
- **cabinet** — Jenkins host, separate from both

Do not propose deploying services "on Hetzner (chromabook)" — they differ
in network exposure, uptime guarantees, and role.

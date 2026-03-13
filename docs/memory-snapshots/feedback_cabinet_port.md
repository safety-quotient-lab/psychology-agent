---
name: cabinet-ssh-port
description: Cabinet machine uses SSH port 2535, not default 22. Use ssh -p 2535 cabinet.
type: feedback
---

Cabinet SSH runs on port 2535, not the default 22.

**Why:** Non-standard port, discovered 2026-03-12 when default port refused connections.

**How to apply:** Always use `ssh -p 2535 cabinet` or configure ~/.ssh/config on chromabook. From chromabook: `ssh -p 2535 cabinet`. Direct from mac: `ssh chromabook "ssh -p 2535 cabinet '...'"`.

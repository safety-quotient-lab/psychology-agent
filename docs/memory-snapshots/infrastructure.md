# Infrastructure Knowledge

## Chromabook

- **Architecture:** x86_64 (NOT ARM64). Cross-compile with `GOOS=linux GOARCH=amd64`.
- **SSH host:** `chromabook` (chromabook.local:2535, key: ~/.ssh/github-sqlab)
- **Project dirs:** `~/projects/psychology`, `~/projects/psychology-sqlab`,
  `~/projects/unratified`, `~/projects/observatory`
- **Shared scripts:** `~/platform/shared/scripts/` — agents symlink to this
- **meshd binary:** `~/platform/meshd` — single binary serving all 4 agents
- **meshd ports:** psychology:8076, psq:8077, unratified:8078, observatory:8079
- **Cron:** 4 autonomous-sync jobs at 5-min intervals, offset by 1 min each
- **unudhr does NOT exist** as a separate directory on chromabook

## Cloudflare

- **interagent-mesh:** CF Worker (NOT tunnel). Deploy: `wrangler deploy` from `interagent/`.
  Public URL: interagent.safety-quotient.dev. Worker name: `interagent-mesh`.
- **Account ID:** 82cd6d38b51fdc6019af192853b1fced
- **API token name:** CLOUDFLARE_GITHUB_ACTIONS_SECRET (in psychology-agent/.dev.vars)
- **Tunnel ID:** 4db92fc5-7725-4554-a0d3-89259d8dabae (routes agent subdomains to meshd)

## CI/CD Pipeline (docs/devops-pipeline.md)

- **Tier 1 (GitHub Actions):** All CF Workers/Pages auto-deploy on push.
  Secrets configured on: unratified, psychology-agent, observatory.
- **Tier 2 (Jenkins):** forge.safety-quotient.dev — being set up by another agent.
  For meshd binary deploy, shared scripts sync, PSQ model pipeline.
  Status: infra hardening in progress; service accounts pending. No Jenkinsfiles
  or forge config have landed in any repo yet. Block until service accounts arrive.
- **Tier 3 (Cron):** Autonomous sync — self-managing, budget-gated.

## Known Gotchas

- **Mixed timestamp formats** break SQLite ORDER BY. Normalize via CASE expression
  (strip offset/Z for sorting). Applied in meshd collector/status.go.
- **UNIQUE(filename) across sessions** silently drops messages. Use
  UNIQUE(session_name, filename) — fixed in schema v17.
- **`content.subject` vs `payload.subject`** — interagent/v1 uses `content`,
  older messages use `payload`. Bootstrap checks both.
- **meshd binary locked while running** — must pkill before SCP replacement.
- **Bootstrap needs `--force` flag** for non-interactive (SSH/cron) contexts.
- **Observatory dir consolidated** — `~/projects/observatory-sqlab` removed (Session 73).
  Only `~/projects/observatory` remains (state.db, cron, meshd all point here).

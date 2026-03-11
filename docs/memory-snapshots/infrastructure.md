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

## Cabinet (Jenkins host)

- **Hostname:** cabinet (separate machine from chromabook, same OS: Linux amd64)
- **Jenkins URL:** forge.safety-quotient.dev (behind Cloudflare Access)
- **Go version:** 1.24.4 (installed on cabinet, builds meshd locally)
- **Auth:** CF Access service token (FORGE_ACCESS_CLIENT_ID/SECRET) + Jenkins API token
- **SSH key:** `/var/lib/jenkins/.ssh/id_ed25519` (jenkins@cabinet, ED25519)
  Authorized on chromabook (kashif@chromabook:~/.ssh/authorized_keys) and
  Hetzner (root@178.156.229.103:~/.ssh/authorized_keys)
- **Credentials in Jenkins:** `cloudflare-workers-token`, `cloudflare-account-id`,
  `deploy-ssh-key` (SSH to chromabook), `hetzner-ssh-key` (SSH to Hetzner)
  Both SSH credentials use the same jenkins@cabinet ED25519 key.
- **Global env vars:** DEPLOY_HOST (chromabook), DEPLOY_PORT (2535), DEPLOY_USER (kashif),
  DEPLOY_MESHD_PATH, DEPLOY_SCRIPTS_PATH, DEPLOY_PROJECT_DIRS, MESHD_PORTS,
  HETZNER_HOST, HETZNER_REMOTE_DIR, PSQ_HEALTH_URL, PSQ_SCORE_URL, PSQ_SERVICE_NAME

## CI/CD Pipeline (docs/devops-pipeline.md)

- **Tier 1 (GitHub Actions):** All CF Workers/Pages auto-deploy on push.
  Secrets configured on: unratified, psychology-agent, observatory, safety-quotient.
- **Tier 2 (Jenkins):** forge.safety-quotient.dev (cabinet). OPERATIONAL (Session 74).
  Pipelines: meshd build+deploy, shared scripts sync, compositor (fallback),
  unratified blog+workers, PSQ health check.
  Trigger: GH Actions relay (trigger-forge.yml) through CF Access. Hourly SCM fallback.
  PSQ model deploy: parameterized Jenkinsfile (manual trigger, Session 75).
- **Tier 3 (Cron):** Autonomous sync — self-managing, budget-gated.
- **Why a relay?** GitHub webhooks cannot inject custom headers (CF-Access-Client-Id/Secret).
  The GH Actions relay authenticates to CF Access using service-token credentials
  stored as GitHub secrets, then calls the Jenkins Remote Build API.

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

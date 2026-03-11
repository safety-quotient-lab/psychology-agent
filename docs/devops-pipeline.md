# DevOps Pipeline — Full Infrastructure Map

Last updated: 2026-03-11

## Architecture: Three-Tier Deployment Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    TIER 1: GitHub Actions                    │
│         (Cloudflare Workers/Pages — cloud-to-cloud)         │
├─────────────────────────────────────────────────────────────┤
│  Trigger: git push to main (path-filtered)                  │
│  Target: Cloudflare API                                     │
│  Secrets: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID      │
│                                                             │
│  ✓ unratified-blog     (Pages)   — blog/**                  │
│  ✓ interagent-mesh     (Worker)  — interagent/**            │
│  ✓ unratified-ap       (Worker)  — workers/ap/**            │
│  ✓ unratified-monitor  (Worker)  — workers/monitor/**       │
│  ✓ hn-hrcb site        (Pages)   — site/**                  │
│  ✓ hn-hrcb-cron        (Worker)  — worker/**                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TIER 2: Jenkins                           │
│    (Infrastructure deploys — requires SSH/LAN access)       │
├─────────────────────────────────────────────────────────────┤
│  Trigger: webhook from GitHub OR manual                     │
│  Target: chromabook (LAN) + Hetzner (remote)                │
│                                                             │
│  ○ meshd build+deploy     — platform/** changes             │
│  ○ shared scripts sync    — platform/shared/** changes      │
│  ○ PSQ model deploy       — manual trigger only             │
│  ○ tunnel health check    — periodic                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TIER 3: Cron (self-managing)              │
│           (Autonomous agent loops on chromabook)            │
├─────────────────────────────────────────────────────────────┤
│  Managed by: ensure-cron.sh                                 │
│  Self-healing: budget gates, escalation, lock files         │
│                                                             │
│  ✓ psychology-agent sync    — every 5 min                   │
│  ✓ psq-agent sync           — every 5 min                   │
│  ✓ unratified-agent sync    — every 5 min                   │
│  ✓ observatory-agent sync   — every 5 min                   │
│  ✓ heartbeat (per agent)    — embedded in sync loop         │
│  ✓ CF Worker crons          — managed by Cloudflare         │
└─────────────────────────────────────────────────────────────┘
```


## Deployment Inventory

### Cloudflare Workers and Pages

| # | Component | Source repo | Source path | Type | CF project name | Deploy trigger | Workflow file |
|---|-----------|-------------|-------------|------|-----------------|---------------|---------------|
| 1 | Compositor | psychology-agent | `interagent/` | Worker | `interagent-mesh` | GH Actions on `interagent/**` | `deploy-compositor.yml` |
| 2 | ActivityPub | unratified | `workers/ap/` | Worker | `unratified-ap` | GH Actions on `workers/**` | `deploy-workers.yml` |
| 3 | Monitor | unratified | `workers/monitor/` | Worker | `unratified-monitor` | GH Actions on `workers/**` | `deploy-workers.yml` |
| 4 | Blog | unratified | `blog/` | Pages | `unratified-blog` | GH Actions on `blog/**` | `deploy.yml` |
| 5 | Observatory site | observatory | `site/` | Pages | `hn-hrcb` | GH Actions on `site/**` | `deploy.yml` |
| 6 | Observatory cron | observatory | `worker/` | Worker | `hn-hrcb-cron` | GH Actions on `worker/**` | `deploy.yml` |


### Self-Hosted Services

| # | Component | Source repo | Deploy target | Deploy mechanism | Trigger |
|---|-----------|-------------|---------------|-----------------|---------|
| 7 | meshd (Go binary) | psychology-agent | chromabook LAN | Go cross-compile → SCP → restart | Manual (→ Jenkins Phase 2) |
| 8 | Shared scripts | psychology-agent | chromabook LAN | SCP → verify symlinks | Manual (→ Jenkins Phase 2) |
| 9 | PSQ scoring server | safety-quotient | Hetzner 178.156.229.103 | `hetzner-deploy.sh` (11-step) | Manual (→ Jenkins Phase 2) |


### Autonomous Agent Loops

| # | Agent | Interval | Script | Budget system |
|---|-------|----------|--------|--------------|
| 10 | psychology-agent | 5 min | `autonomous-sync.sh` | autonomy_budget table, 20 credits |
| 11 | psq-agent | 5 min | `autonomous-sync.sh` | autonomy_budget table, 20 credits |
| 12 | unratified-agent | 5 min | `autonomous-sync.sh` | autonomy_budget table, 20 credits |
| 13 | observatory-agent | 5 min | `autonomous-sync.sh` | autonomy_budget table, 20 credits |


### CI-Only Pipelines (no deploy)

| # | Pipeline | Source repo | Trigger | Purpose |
|---|----------|-------------|---------|---------|
| 14 | ShellCheck | psychology-agent | Push/PR on `**/*.sh` | Lint shell scripts |
| 15 | ShellCheck | psychology-sqlab | Push/PR on `**/*.sh` | Lint shell scripts |
| 16 | Build check | unratified | Push/PR to main | TypeScript + Astro build gate |


## Secrets

| Repo | `CLOUDFLARE_ACCOUNT_ID` | `CLOUDFLARE_API_TOKEN` |
|------|------------------------|----------------------|
| safety-quotient-lab/unratified | ✓ | ✓ |
| safety-quotient-lab/psychology-agent | ✓ | ✓ |
| safety-quotient-lab/observatory | ✓ | ✓ |


## Infrastructure Endpoints

| Service | Public URL | Origin |
|---------|-----------|--------|
| Compositor | `interagent.safety-quotient.dev` | CF Worker `interagent-mesh` |
| Psychology agent API | `psychology-agent.safety-quotient.dev` | cloudflared tunnel → chromabook:8076 |
| PSQ agent API | `psq-agent.safety-quotient.dev` | cloudflared tunnel → chromabook:8077 |
| Unratified agent API | `unratified-agent.unratified.org` | cloudflared tunnel → chromabook:8078 |
| Observatory agent API | `observatory-agent.unratified.org` | cloudflared tunnel → chromabook:8079 |
| PSQ scoring | `psq.safety-quotient.dev` | Hetzner CX (178.156.229.103) |
| Blog | `blog.unratified.org` | CF Pages `unratified-blog` |
| Observatory | `observatory.unratified.org` | CF Pages `hn-hrcb` |
| Status monitor | `status.unratified.org` | CF Worker `unratified-monitor` |


## Cloudflare Tunnel

```
Tunnel ID: 4db92fc5-7725-4554-a0d3-89259d8dabae
Config:    ~/.cloudflared/config-psychology-agent.yml
Daemon:    cloudflared service on chromabook

Routes:
  psychology-agent.safety-quotient.dev → localhost:8076 (meshd)
  psq-agent.safety-quotient.dev        → localhost:8077 (meshd)
  unratified-agent.unratified.org      → localhost:8078 (meshd)
  observatory-agent.unratified.org     → localhost:8079 (meshd)
```


## Phase 2 Plan: Jenkins Pipelines

### meshd Build and Deploy

```
Trigger:  GitHub webhook on platform/** changes
Pipeline:
  1. git pull psychology-agent
  2. cd platform && GOOS=linux GOARCH=arm64 go build -o meshd-linux ./cmd/meshd/
  3. scp meshd-linux chromabook:~/platform/meshd
  4. ssh chromabook "sudo systemctl restart meshd-psychology meshd-psq meshd-unratified meshd-observatory"
  5. curl each agent endpoint /api/status → verify 200
```

### Shared Scripts Sync

```
Trigger:  GitHub webhook on platform/shared/** changes
Pipeline:
  1. git pull psychology-agent
  2. rsync platform/shared/scripts/ chromabook:~/platform/shared/scripts/
  3. ssh chromabook "ls -la ~/projects/*/scripts/autonomous-sync.sh" → verify symlinks
```

### PSQ Model Deploy

```
Trigger:  Manual (parameterized build — model path)
Pipeline:
  1. Activate venv
  2. python calibrate.py --model $MODEL_PATH
  3. python export_onnx.py --model $MODEL_PATH
  4. python eval_held_out.py --model $MODEL_PATH
  5. sha256sum model files
  6. ssh hetzner "cp -r /opt/.../models/psq-student /opt/.../models/psq-student.backup"
  7. rsync model files to hetzner:/opt/.../models/psq-student/
  8. ssh hetzner "sha256sum /opt/.../models/psq-student/*.onnx" → compare
  9. ssh hetzner "sudo systemctl restart psq-server"
  10. curl psq.safety-quotient.dev/health → verify 200
  11. curl -X POST psq.safety-quotient.dev/score -d '{"text":"test"}' → verify score
```

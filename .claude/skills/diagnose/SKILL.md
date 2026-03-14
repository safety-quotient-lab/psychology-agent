---
name: diagnose
description: Systemic self-diagnostic — transport, memory, budget, triggers, consistency, state.db health.
user-invocable: true
argument-hint: "[full | transport | budget | state | consistency | quick]"
allowed-tools: Read, Grep, Glob, Bash
---

# Diagnose — Systemic Self-Diagnostic (Operations Agent)

Run a structured self-diagnostic across all operational subsystems.
Surfaces problems invisible during normal work — stale state, broken
transport, budget anomalies, schema drift, peer inconsistency.

---

## Trigger Phrases

- "what's broken?" / "health check" / "self-diagnostic"
- "something seems off" / "debug the system"

---

## Arguments

| Argument | Scope |
|---|---|
| *(empty)* or `full` | All checks below |
| `transport` | Transport integrity only |
| `budget` | Budget + spawn state only |
| `state` | state.db schema + data health |
| `consistency` | Cross-agent consistency (pattern generator) |
| `infrastructure` | Transport mechanisms audit (ZMQ, HTTP, webhooks, SSE, manifests) |
| `quick` | Fast checks only (no network, no peer fetches) |

---

## Procedure

### 1. Transport Health
- Read `transport/MANIFEST.json` — verify session list matches `transport/sessions/`
- Check for orphaned sessions (in filesystem but not MANIFEST)
- Check for stale sessions (no new turns in >14 days)
- Verify all JSON files parse without error
- Count messages with empty subjects (should be 0 per P2 constraint)

### 2. State.db Health
- Run `sqlite3 state.db ".tables"` — verify all 9 expected tables exist
- Run `SELECT max(version) FROM schema_versions` — verify schema version
- Check `autonomy_budget` — budget_current > 0, no consecutive_blocks > 3
- Check `cogarch_state` — verify content_hash matches current cogarch.config.json
- Check `transport_messages` — count vs filesystem, subject NOT NULL constraint
- Check for WAL file size (large WAL indicates missing checkpoint)

### 3. Budget + Spawn State
- Read budget from state.db: `SELECT * FROM autonomy_budget`
- Check `/tmp/mesh-pause` sentinel
- Check `/tmp/context-rotate-*` sentinels
- Check spawn slot files: `/tmp/mesh-spawn-slot-*` (stale = older than 6 min)
- Verify circuit breaker state (if meshd running)

### 4. Cogarch Integrity
- Validate `cogarch.config.json` parses as valid JSON
- Check required sections: identity, peers, governance, transport
- Verify agent_id matches CLAUDE.md and agent-card.json
- Verify all peer discovery_urls resolve (quick: skip network check)

### 5. Cross-Agent Consistency (full mode only)
- Fetch all peer agent-cards via `gh api`
- Check: does every peer list operations-agent?
- Check: protocolVersion alignment (should all say 0.3.0)
- Check: vocabulary terms — any local overrides diverging from vocab.json?
- Run the pattern generator checks from cogarch.config.json

### 6. Dashboard + Compositor
- Verify compositor responds: `curl -s https://interagent.safety-quotient.dev/api/pulse`
- Check CORS headers on API endpoints
- Verify agent-card KV cache freshness

### 7. Transport Infrastructure Audit (`infrastructure` mode)
Checks the actual transport mechanisms — not message content, but the pipes.

**ZMQ Bus:**
- For each agent: check if ZMQ PUB socket configured in meshd service unit
- Test connectivity: `timeout 2 curl -s http://localhost:{port}/api/status` for each port
- Check gossip: does the ZMQ bus report all 5 peers discovered?
- Flag agents with no ZMQ PUB (relay-only, no broadcast capability)

**HTTP Inbound:**
- For each agent: `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:{port}/api/messages/inbound -d '{}'`
- Expect 400 (bad request) not 404 (endpoint missing) or 5xx (broken)
- Test via public URL: same check against `https://{agent}.safety-quotient.dev/api/messages/inbound`

**SSE Streams:**
- For each agent: `timeout 3 curl -s -N http://localhost:{port}/api/events/stream | head -1`
- Expect `: connected to` heartbeat line
- Flag agents where SSE returns error or no flusher support

**Dashboard Manifests:**
- For each agent: `curl -s http://localhost:{port}/dashboard/manifest`
- Verify JSON parses, has widgets array, agent_id matches
- Check widget count (should have >= 6 standard widgets)

**GitHub Webhooks:**
- Check each repo: `gh api repos/{org}/{repo}/hooks --jq '.[].config.url'`
- Flag repos with no webhook pointing to meshd
- Check webhook delivery health: `gh api repos/{org}/{repo}/hooks/{id}/deliveries --jq '.[0].status_code'`

**Cross-Repo Fetcher:**
- Check `.watcher-seen.json` — last modification time (stale if >10 min)
- Check fetcher log lines in meshd journal for recent activity
- Verify GITHUB_TOKEN set (required for private repo access)

**Tunnel Routing:**
- For each agent public URL: `curl -s -o /dev/null -w '%{http_code}' https://{agent}.safety-quotient.dev/health`
- Expect 200. Flag any non-200 as tunnel misconfiguration.

---

## Output Format

```
## Diagnostic Report — {timestamp}

### Transport: {PASS|WARN|FAIL}
- {findings}

### State.db: {PASS|WARN|FAIL}
- {findings}

### Budget: {PASS|WARN|FAIL}
- {findings}

### Cogarch: {PASS|WARN|FAIL}
- {findings}

### Consistency: {PASS|WARN|FAIL|SKIPPED}
- {findings}

### Compositor: {PASS|WARN|FAIL}
- {findings}

⚑ EPISTEMIC FLAGS
- {any uncertainties or scope limitations}
```

---

## Post-Diagnostic

- File issues for any FAIL items
- Update plan.md with findings
- If consistency issues found, consider sending a mesh-consistency-fixes directive

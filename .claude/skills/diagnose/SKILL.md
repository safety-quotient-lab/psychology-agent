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

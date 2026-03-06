---
globs: ["transport/**/*.json", ".well-known/*.json"]
---

# Interagent Transport Conventions

## Message Schema

All transport messages follow `interagent/v1` or an extension (`command-request/v1`,
`local-coordination/v1`).

Required top-level fields:
- `schema` — protocol identifier
- `session_id` — transport session name (semantic, not opaque)
- `turn` — monotonically increasing integer per session
- `timestamp` — ISO 8601 with timezone offset
- `from` / `to` — agent identification blocks

## Naming Convention

```
transport/sessions/{session-name}/{direction}-{descriptor}-{sequence}.json
```

Direction values: `from-{agent_id}`, `to-{agent_id}`, or `{semantic-name}` (legacy).

## Urgency Field (adopted 2026-03-06)

Top-level, sibling to `setl`. Enum: `immediate | high | normal | low`.
Absence implies `normal`. Backward-compatible.

## Action Gate

Every message should include `action_gate` with:
- `gate_condition` — what must happen before acting
- `gate_status` — `open` or `blocked`

## Epistemic Flags

Transport messages carry `epistemic_flags` as an array of strings.
Flag scope limitations, unverified claims, and confidence boundaries.

## Agent Card (.well-known/)

In-repo agent-card describes git-PR transport topology.
CF Worker agent-card describes HTTP API surface.
Both are complementary — `http_discovery` field in the in-repo card cross-references.

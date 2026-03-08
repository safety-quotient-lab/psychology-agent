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

## Data Integrity (read-diff-write-verify)

Before creating or modifying transport session files, follow this pattern
(enforced by T16 Check 5):

1. **Read** — list existing files in the target session directory and read
   MANIFEST.json for current state
2. **Diff** — compare existing messages against the intended write:
   - Check for duplicate turn numbers (collision)
   - Check for duplicate content (repeated ACK, re-sent message)
   - Verify the new turn number follows the last existing turn
3. **Write** — create the session file only if the diff shows it as needed.
   Skip if a duplicate already exists
4. **Verify** — after writing, confirm:
   - File count in the session directory matches expected total
   - MANIFEST.json updated with the new message reference
   - No naming collisions introduced
   - Turn sequence remains monotonic

This prevents duplicate messages, naming collisions, and MANIFEST drift that
compound across multi-session exchanges.

## Agent Card (.well-known/)

In-repo agent-card describes git-PR transport topology.
CF Worker agent-card describes HTTP API surface.
Both are complementary — `http_discovery` field in the in-repo card cross-references.

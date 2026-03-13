---
name: scan-peer
description: Scan a peer agent's agent-card for schema compliance — A2A fields, vocabulary consistency, discovery health — and write structured findings to transport session.
user-invocable: true
argument-hint: "<peer-name | all> [--session <session-id>]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch
---

# /scan-peer — Peer Agent Card Compliance Scan

Scan a peer agent's agent-card.json for schema compliance against the
mesh minimum schema. Produce structured findings in interagent/v1 format
and deliver to the appropriate transport session.

Operations-agent's variant of /scan-peer focuses on agent-card schema
compliance (D49 vocabulary governance) rather than content quality.

## Arguments

| Argument | Default | Meaning |
|----------|---------|---------|
| `<peer-name>` | *required* (`all` scans every peer) | Peer to scan |
| `--session <id>` | `schema-compliance` | Transport session for findings |

## Peer Registry

Read from `cogarch.config.json` → `peers.agents`. Each peer has a `card_url`.

## Protocol

### Phase 1: Fetch Agent Cards

For each peer (or single peer if specified):

```
GET {card_url}
```

If fetch fails, record as finding: "agent card unreachable."

### Phase 2: Evaluate Against Minimum Schema

Check each card against the proposed minimum schema (from T7 / operations-agent-standup):

| Required Field | Constraint |
|---|---|
| `protocolVersion` | Must equal "0.3.0" |
| `name` | Must match agent_id (machine-stable) |
| `description` | Present and non-empty |
| `version` | Semver preferred |
| `capabilities` | Object with at least `streaming` and `pushNotifications` booleans |
| `defaultInputModes` | Array, at least `["application/json"]` |
| `defaultOutputModes` | Array, at least `["application/json"]` |
| `skills` | Array of objects with id, name, description, tags |
| `security` | Object documenting auth scheme |

### Phase 3: Vocabulary Consistency

Cross-reference agent card terms against `interagent/vocab.json`:
- Terms used in agent cards that lack vocab definitions
- Terms used inconsistently with their vocab definition
- Naming convention violations (should match `{agent-id}.safety-quotient.dev`)

### Phase 4: Score and Filter Findings

For each finding:
1. Assign severity: `high` (missing required field), `medium` (inconsistency),
   `low` (style suggestion)
2. Assign confidence: 0.0–1.0
3. Filter: only include findings with confidence >= 0.7
4. Cap at 10 findings per peer

### Phase 5: Write Findings to Transport

Write to `transport/sessions/{session}/to-{peer}-scan-NNN.json` using
interagent/v1 schema:

```json
{
  "schema": "interagent/v1",
  "session_id": "{session}",
  "turn": "N",
  "timestamp": "ISO-8601",
  "message_type": "review",
  "from": {
    "agent_id": "operations-agent",
    "role": "operations",
    "schemas_supported": ["interagent/v1"],
    "discovery_url": "https://operations-agent.safety-quotient.dev/.well-known/agent-card.json"
  },
  "to": {
    "agent_id": "{peer-agent-id}",
    "discovery_url": "{peer-card-url}"
  },
  "transport": {
    "method": "git-PR",
    "persistence": "persistent"
  },
  "body": {
    "type": "schema-compliance-scan",
    "peer_card_url": "{card_url}",
    "minimum_schema_version": "0.1.0",
    "findings": [],
    "summary": {
      "total_findings": 0,
      "by_severity": { "high": 0, "medium": 0, "low": 0 },
      "compliant": true
    }
  },
  "urgency": "normal",
  "setl": 0.05,
  "action_gate": { "gate_condition": "none", "gate_status": "open" },
  "ack_required": false,
  "epistemic_flags": []
}
```

## Output Format

```
/scan-peer complete
  Peer: {name | all}
  Cards fetched: {N}/{total}
  Findings: {X} total ({H} high, {M} medium, {L} low)
    - {peer}: {field} — {description}
  Written: transport/sessions/{session}/to-{peer}-scan-NNN.json
  Compliant peers: {list}
  Non-compliant peers: {list}
```

## What /scan-peer Does NOT Do

- **Fix issues** — operations-agent reports; each agent fixes their own card
- **Modify peer repos** — read-only access
- **Auto-send findings** — drafts for user review before delivery

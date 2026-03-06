# Command Request Protocol — interagent/v1 Extension

**Date:** 2026-03-06
**Status:** Draft — first use pending (rsync model files to Hetzner)
**Prerequisite:** interagent/v1 base protocol (docs/subagent-layer-spec.md)
**Related:** docs/bft-design-note.md (Byzantine fault tolerance principles)

---

## Overview

The command-request extension adds two message types to interagent/v1:

- `command-request` — one agent requests another to execute a specific operation
- `command-response` — the executing agent reports the outcome with verifiable evidence

These message types embed the six BFT principles from bft-design-note.md
directly into the protocol schema.

---

## Why a Dedicated Message Type

The existing interagent/v1 `message_type` values (`status-update`,
`decision+request`, `decision+status`) encode informational exchanges.
Requesting a peer to execute a shell command introduces new requirements:

1. **Specificity** — the exact operation must be unambiguous
2. **Authorization** — who approved this command and in what context
3. **Verification** — the response must prove execution occurred correctly
4. **Refusal rights** — the executing agent can decline with reasoning
5. **Idempotency** — the requesting agent needs to know if re-issue works safely

Encoding these as prose inside a generic message loses structure, makes
verification impossible to automate, and creates ambiguity about execution state.

---

## Schema: command-request

```json
{
  "schema": "interagent/v1",
  "session_id": "<session-identifier>",
  "turn": "<turn-number>",
  "timestamp": "<ISO-8601>",
  "message_type": "command-request",

  "from": {
    "agent_id": "<requesting-agent>",
    "role": "<role>",
    "instance": "<instance-descriptor>"
  },
  "to": {
    "agent_id": "<executing-agent>",
    "role": "<role>",
    "instance": "<instance-descriptor>"
  },
  "transport": {
    "method": "git-pr",
    "persistence": "persistent"
  },

  "command": {
    "operation_id": "<unique-operation-identifier>",
    "operation_type": "<category>",
    "description": "<human-readable description of what this command does>",
    "command_string": "<exact command to execute>",
    "working_directory": "<path where command should run>",
    "environment": {
      "<ENV_VAR>": "<value or reference>"
    },

    "preconditions": [
      "<condition that must hold before execution>"
    ],

    "expected_outcome": {
      "description": "<what success looks like>",
      "verification_method": "<how to confirm success>",
      "verification_command": "<optional command that confirms success>"
    },

    "idempotent": true,
    "estimated_duration_seconds": 60,
    "destructive": false,
    "requires_human_approval": false,

    "authorization": {
      "authorized_by": "user",
      "authorization_context": "<session reference or explicit approval>",
      "authorization_timestamp": "<ISO-8601>"
    }
  },

  "claims": [],
  "setl": 0.0,
  "epistemic_flags": [],

  "action_gate": {
    "gate_condition": "<what must happen next>",
    "gate_status": "open",
    "gate_note": "<context>"
  }
}
```

### Field Definitions

| Field | Required | Description |
|---|---|---|
| `command.operation_id` | Yes | Unique ID for this operation (for tracking, dedup, idempotency) |
| `command.operation_type` | Yes | Category: `file_transfer`, `service_management`, `build`, `verification`, `configuration` |
| `command.description` | Yes | Human-readable explanation — what and why |
| `command.command_string` | Yes | Exact shell command. No ambiguity. Copy-paste executable |
| `command.working_directory` | No | Path context for execution. Defaults to repo root |
| `command.environment` | No | Environment variables required. Secrets referenced by name, not value |
| `command.preconditions` | Yes | Conditions that must hold. Agent checks before executing |
| `command.expected_outcome` | Yes | What success looks like + how to verify (BFT Principle 1) |
| `command.idempotent` | Yes | Safe to re-run? (BFT Principle 2) |
| `command.estimated_duration_seconds` | No | Rough timing for timeout/monitoring |
| `command.destructive` | Yes | Removes, overwrites, or modifies existing state? |
| `command.requires_human_approval` | No | Escalate to human before executing? Default false |
| `command.authorization` | Yes | Who approved, when, in what context (BFT Principle 4) |

---

## Schema: command-response

```json
{
  "schema": "interagent/v1",
  "session_id": "<session-identifier>",
  "turn": "<turn-number>",
  "timestamp": "<ISO-8601>",
  "message_type": "command-response",

  "from": {
    "agent_id": "<executing-agent>",
    "role": "<role>",
    "instance": "<instance-descriptor>"
  },
  "to": {
    "agent_id": "<requesting-agent>",
    "role": "<role>",
    "instance": "<instance-descriptor>"
  },
  "transport": {
    "method": "git-pr",
    "persistence": "persistent"
  },

  "in_response_to": {
    "operation_id": "<matches command.operation_id>",
    "turn": "<turn of the command-request>"
  },

  "command_response": {
    "status": "<executed | refused | failed | partial | verification_failed>",

    "execution_evidence": {
      "exit_code": 0,
      "stdout_summary": "<truncated output — key lines>",
      "stderr_summary": "<if relevant>",
      "duration_seconds": 45,
      "executed_at": "<ISO-8601>",
      "executed_on": "<hostname or instance descriptor>"
    },

    "state_attestation": {
      "file_hashes": {
        "<filename>": "<sha256:hex>"
      },
      "health_check": {
        "url": "<endpoint>",
        "status_code": 200,
        "body_summary": "<key fields from response>"
      },
      "process_status": {
        "service_name": "<systemd unit or process>",
        "active": true,
        "pid": 12345
      },
      "git_state": {
        "commit": "<short-hash>",
        "branch": "<branch>",
        "clean": true
      }
    },

    "refusal_reason": {
      "category": "<precondition_unmet | security_concern | scope_violation | resource_unavailable>",
      "detail": "<structured explanation>",
      "suggested_resolution": "<what the requesting agent can do>"
    },

    "verification_result": {
      "method": "<what was checked>",
      "passed": true,
      "evidence": "<verification output>"
    }
  },

  "claims": [],
  "setl": 0.0,
  "epistemic_flags": [],

  "action_gate": {
    "gate_condition": "<next step>",
    "gate_status": "<open | blocked_human_verification>",
    "gate_note": "<context>"
  }
}
```

### Response Status Values

| Status | Meaning | BFT principle |
|---|---|---|
| `executed` | Command ran successfully; evidence attached | P1 (evidence-bearing) |
| `refused` | Agent declined; `refusal_reason` explains why | P4 (refusal with reasoning) |
| `failed` | Command ran but failed; evidence shows failure | P1 + P5 (escalation) |
| `partial` | Command partially completed; evidence shows extent | P1 + P5 |
| `verification_failed` | Command ran, but post-execution verification failed | P5 (human escalation) |

### State Attestation

All fields in `state_attestation` are optional — include whichever are relevant
to the operation. The requesting agent specifies expected attestation in
`command.expected_outcome.verification_method`; the executing agent provides
matching evidence.

| Attestation type | When to use |
|---|---|
| `file_hashes` | File transfer, model deployment, config changes |
| `health_check` | Service deployment, endpoint verification |
| `process_status` | Service start/stop/restart |
| `git_state` | Repository operations, deploy from repo |

---

## Protocol Flow

```
  Requesting Agent                    Executing Agent
       │                                    │
       │  command-request                   │
       │  (operation_id, command_string,    │
       │   preconditions, authorization)    │
       │ ──────────────────────────────────►│
       │                                    │
       │                         Check preconditions
       │                         ┌──────────┤
       │                         │ Met?     │
       │                         └──────────┤
       │                                    │
       │                    ┌───── Yes ─────┤───── No ─────┐
       │                    │               │               │
       │                 Execute         Refuse          Escalate
       │                    │               │               │
       │                 Verify          Reason           Human
       │                    │               │               │
       │  command-response  │               │               │
       │  (status, evidence,│               │               │
       │   attestation)     │               │               │
       │ ◄──────────────────┘               │               │
       │ ◄──────────────────────────────────┘               │
       │ ◄──────────────────────────────────────────────────┘
       │                                    │
  Verify attestation                        │
  (spot-check or full)                      │
       │                                    │
```

---

## Security Considerations

1. **Command injection** — `command_string` is executed as-is. The executing
   agent must validate the command against a permitted operations list or
   pattern before executing. Arbitrary shell commands from untrusted peers
   represent a critical security risk.

2. **Secret handling** — `command.environment` references secrets by name,
   never by value. Secrets never appear in transport messages. The executing
   agent resolves secret names from its local secret store.

3. **Destructive operations** — `command.destructive: true` commands require
   explicit `command.requires_human_approval: true` or prior authorization
   documented in `command.authorization`.

4. **Scope boundary** — agents should only execute commands within their
   declared capability scope. A PSQ agent should refuse a command to modify
   general-agent configuration.

---

## Operation Types

| Type | Description | Example |
|---|---|---|
| `file_transfer` | Move files between hosts | rsync, scp |
| `service_management` | Start, stop, restart services | systemctl, health check |
| `build` | Build, install, compile | npm install, make |
| `verification` | Check state without modifying it | sha256sum, curl /health |
| `configuration` | Modify system or application config | wrangler secret put, env setup |

---

## Versioning

This extension uses the `interagent/v1` schema namespace. The `message_type`
field value (`command-request`, `command-response`) distinguishes these messages
from existing v1 types. No schema version bump required — the extension is
additive and backward-compatible.

---

## First Use

The first command-request will ask psq-agent (Chromabook) to rsync PSQ model
files to the Hetzner production server. See transport/sessions/psychology-interface/
for the live message.

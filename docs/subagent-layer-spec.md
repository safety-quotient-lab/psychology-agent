# Sub-Agent Layer Protocol Specification (Architecture Item 2a)

**Status:** Draft — derived from live exchange (Sessions 18–19)
**Derived from:** 9P transport test + PSQ-Full inference run (subagent-protocol exchange)
**Schema version:** interagent/v1 + schema v3 extensions
**Extension URI:** `https://github.com/safety-quotient-lab/interagent-epistemic/v1`

---

## Overview

The sub-agent layer (2a) specifies how sub-agents plug into the general-purpose psychology agent:
the request/response format, scope declaration, validated boundaries, and the
schema fields required to express what the exchange actually revealed.

The spec is derived from protocol failure, not prior design. Each field in the schema
emerged from a gap identified during live exchange. This is intentional — see
journal.md §15 (Protocol Failure as Specification Method).

**6 derivation findings** (corrected from 5 — observatory-agent PR #8):

| Finding | Field(s) | Source |
|---|---|---|
| 1 | `transport.method` | 9P transport test — transport mechanism unknown to receiver |
| 2 | `transport.persistence` | ramfs ephemeral constraint — channel lifetime inexpressible |
| 3 | `framing.convention` + `framing.pattern` | 9P raw bytes — message vs. data boundary undefined |
| 4 | `dimensions[].meets_threshold` | PSQ inference run — scored-but-excluded indistinguishable from not-run |
| 5 | `scores.calibration_*` + `dimensions[].raw_score` + `calibration_version` | PSQ calibration — raw vs. calibrated output indistinguishable |
| 6 | Per-message transport scope + persist-from-last convention | Schema v3 design — scope ambiguity across turns |

---

## Layer Model

```
┌────────────────────────────────────────────────────────────┐
│  interagent/v1                                             │
│  Base protocol — any agent, any domain                     │
│  Fields: schema, session_id, turn, timestamp,             │
│           message_type, from, to, payload,                 │
│           claims[], action_gate, setl,                     │
│           epistemic_flags, correction                      │
│  Extension URI: github.com/safety-quotient-lab/            │
│                 interagent-epistemic/v1                    │
├────────────────────────────────────────────────────────────┤
│  schema v3 transport layer (NEW — sub-agent layer, 2a)     │
│  Fields: transport{}, framing{}                            │
│  Scope: all interagent/v1 messages                         │
├────────────────────────────────────────────────────────────┤
│  psychology-agent/machine-response/v2                      │
│  Domain extension — PSQ sub-agent outputs                  │
│  Fields: scope_declaration, limitations_disclosure,        │
│           scores{psq_composite, dimensions[]},             │
│           psq_lite_coverage, source{}                      │
│  Schema gaps (#1–5 below) extend this layer                │
│  Transport finding #6 (per-message scope) also here        │
└────────────────────────────────────────────────────────────┘
```

---

## Schema v3 — Transport Layer Fields

Derived from sub-agent layer (2a) findings 1–3 from the 9P transport test (finding #6 is scope/convention).

### `transport` object

**Required:** No. **Scope:** Message-level (per message, not per session).
**Scope rule:** Omission = persist-from-last. Agents MAY omit `transport{}` when
unchanged from the previous turn. Receivers assume transport persists until
explicitly changed.

```json
"transport": {
  "method": "git-pr",
  "persistence": "persistent",
  "session_id": "psychology-agent/subagent-protocol/schema-v3-ack-001"
}
```

**Fields:**

| Field | Type | Required | Values |
|---|---|---|---|
| `method` | string enum | Yes (if transport present) | `git-pr` \| `git-push` \| `ssh-pipe+ramfs+9pfuse` \| `http+json` \| `grpc` \| `human-relay` \| `plan9-namespace` \| `filesystem` |
| `persistence` | string enum | Yes (if transport present) | `ephemeral` \| `session` \| `persistent` |
| `session_id` | string | No | Transport-layer session identifier — distinct from message-layer `session_id` |

**Enum notes:**
- `plan9-namespace` — 9P protocol class (transport-independent of tooling; SSH-pipe+ramfs+9pfuse is one implementation)
- `filesystem` — shared POSIX mount (NFS, CIFS, local) without protocol wrapper
- `ssh-pipe+ramfs+9pfuse` — specific toolchain used in sub-agent layer (2a) derivation; prefer `plan9-namespace` for new implementations

**Finding that drove this:** `transport-method-not-in-schema` — the sub-agent layer (2a) exchange
mixed `human-relay`, `git-push`, and `git-pr` within a single session. Without a
`transport.method` field, a receiver cannot determine failure modes or expected latency.

**Finding that drove persistence:** `ramfs-ephemeral-constraint` — `ramfs -i` on macOS
exits after initial connection. No schema field signaled this. A receiver needs to know
whether to expect the channel for follow-up reads.

**Finding #6 — per-message scope + persist-from-last convention:** `transport{}` scope is
per-message, not per-session. Agents MAY omit `transport{}` when unchanged — receivers
assume persistence. This rule was implicit in all prior exchanges; the spec makes it
explicit. Derived independently by both agents during schema v3 finalization.

---

### `framing` object

**Required:** No. **Scope:** Declared when transport delivers raw bytes and the
receiver needs a rule for which files constitute messages.

```json
"framing": {
  "convention": "filename-pattern",
  "pattern": "*.json"
}
```

**Fields:**

| Field | Type | Required | Values |
|---|---|---|---|
| `convention` | string enum | Yes (if framing present) | `filename-pattern` \| `manifest` \| `envelope` |
| `pattern` | string | No | Glob pattern for `filename-pattern` convention. Default: `*.json` |

**Convention notes:**
- `filename-pattern` — all files matching `pattern` in the transport namespace are messages. Default glob `*.json` applies when directory structure is the namespace boundary.
- `manifest` — a `MANIFEST.json` in the namespace lists valid messages. Reserve for flat 9P namespaces where files include both messages and data blobs.
- `envelope` — all files wrapped in a single envelope message.

**Finding that drove this:** `file-vs-message-boundary` — 9P transport delivers raw bytes.
Schema validation is message-layer. A framing convention gives the receiver a
deterministic rule for which files to treat as messages vs. data files.

**Pattern note:** `*.json` (not `*.interagent.json`) — directory structure provides
namespace isolation; filename suffix is redundant when `framing.convention` is declared.
Exception: flat 9P namespaces should use a stricter pattern.

---

## A2A Epistemic Extension

**Extension URI:** `https://github.com/safety-quotient-lab/interagent-epistemic/v1`
**Mechanism:** A2A v0.3.0 `extensions[]` array in Agent Card, URI-based, `required: false`
**Namespace governance:** Jointly derived (psychology-agent + observatory-agent,
Sessions 18–19). Neutral namespace — neither agent is sole author.

**Agent Card declaration:**

```json
"extensions": [
  {
    "uri": "https://github.com/safety-quotient-lab/interagent-epistemic/v1",
    "required": false,
    "description": "Adds per-claim confidence tracking, SETL, epistemic flags, action gate, and correction mechanism to A2A messages."
  }
]
```

**Fields added by this extension:**

| Field | Type | Description |
|---|---|---|
| `claims[]` | array | Per-claim confidence tracking — `claim_id`, `text`, `confidence`, `confidence_basis`, `independently_verified` |
| `setl` | float 0–1 | Structural-Editorial Tension Level — abs(editorial − structural) per message |
| `epistemic_flags` | string[] | Validity threats and uncertainty disclosures |
| `action_gate` | object | Blocking sentinel — `gate_condition`, `gate_status`, `gate_note` |
| `correction` | object | Corrects a prior claim by `claim_id` |
| `transport` | object | Schema v3 transport layer (this spec) |
| `framing` | object | Schema v3 framing layer (this spec) |

---

## PSQ Sub-Agent Schema Gaps (v2 → v3 Candidates)

Derived from PSQ-Full response to request-001.json. Five fields the v2 schema could
not express cleanly. These are candidates for a psychology-agent/machine-response/v3.

### Gap #1 — `dimensions[].meets_threshold`

**Problem:** No v2 field distinguishes "dimension scored but below confidence threshold"
from "dimension not scored." A receiver interpreting a partial response cannot
determine whether absent dimensions were excluded or not run.

**Proposed:** `dimensions[].meets_threshold: boolean`

```json
{
  "dimension": "energy_dissipation",
  "score": 1.39,
  "confidence": 0.588,
  "meets_threshold": false
}
```

---

### Gap #2 — `scores[].usable` / `scores[].status`

**Problem:** PSQ composite 50/100 is a fallback default when all dimensions are
excluded. The v2 `source_confidence` field is message-level — no per-output usability
flag. A receiver cannot determine whether the composite is a genuine score or a
placeholder.

**Proposed:** `scores[].usable: boolean` and/or `scores[].status: 'scored' | 'fallback' | 'excluded'`

```json
"psq_composite": {
  "value": 50,
  "scale": "0-100",
  "status": "excluded",
  "usable": false
}
```

---

### Gap #3 — `limitations[].severity` + `limitations[].affected_dimensions`

**Problem:** `epistemic_flags` in v2 is a flat string array. Cannot distinguish
model-wide limitations from dimension-specific ones. Cannot tier by severity.
A receiver cannot programmatically act on a HIGH severity limitation that only
affects specific dimensions.

**Proposed:** Structured `limitations[]` array:

```json
"limitations": [
  {
    "id": "anti-calibration-confidence",
    "severity": "HIGH",
    "description": "Confidence outputs remain anti-calibrated...",
    "affected_dimensions": "all",
    "mitigation": "Use calibrated scores directly."
  }
]
```

---

### Gap #4 — `dimensions[].psq_lite_mapped`

**Problem:** No v2 field marks which dimensions are available in the PSQ-Lite tier.
Required for the triage integration pattern (PSQ-Lite at ingest → PSQ-Full on flagged
outliers). A consumer implementing the triage pattern has no machine-readable signal
for which dimensions overlap.

**Proposed:** `dimensions[].psq_lite_mapped: boolean` and `dimensions[].psq_lite_dimension: string`

```json
{
  "dimension": "threat_exposure",
  "score": 5.51,
  "psq_lite_mapped": true,
  "psq_lite_dimension": "threat_exposure"
}
```

**Concrete information-loss example:** `energy_dissipation` (1.39/10 calibrated,
highest-confidence threat signal for the overwhelm test text) is NOT in PSQ-Lite.
A triage pass using PSQ-Lite would flag the text as moderate (`threat_exposure` 5.51)
rather than high-concern depletion — missing the most clinically relevant dimension.

---

### Gap #5 — `scores.calibration_applied` + `dimensions[].raw_score`

**Problem:** No v2 field distinguishes raw model output from post-hoc calibrated
output. A receiver cannot determine which they received without out-of-band
knowledge. Raw vs. calibrated scores have meaningfully different interpretations:
raw output signals genuine model uncertainty; calibrated output reflects a
correction whose magnitude itself carries information.

**Proposed:**

```json
"scores": {
  "calibration_applied": true,
  "calibration_method": "isotonic regression per dimension, fitted on 1897 val records",
  "calibration_version": "isotonic-v1-2026-03-06"
},
"dimensions": [
  {
    "dimension": "trust_conditions",
    "score": 5.00,
    "raw_score": 3.05,
    "calibration_note": "Large correction (compress ratio 0.70→0.55) — score may reflect dataset mean normalization rather than genuine signal"
  }
]
```

**`calibration_version`** (observatory-agent amendment, accepted): pins the specific calibration
curve for reproducibility. Optional now; required when multiple calibration curves exist.
Format: `{method}-v{n}-{date}`. Analogous to `methodology_hash` in observatory eval pipeline.
*Source: observatory-agent subagent-layer-closing-001.json, PR #8.*

---

## Capability Handshake Protocol

The interagent/v1 capability handshake (derived in Sessions 18–19):

1. Initiating agent sends `message_type: capability-handshake` using interagent/v1 base
2. Receiving agent responds with its own capability block
3. Both agents agree on schema layer(s) to use for subsequent messages
4. Subsequent messages use the agreed domain extension or stay at interagent/v1

**Handshake `from` block:**

```json
"from": {
  "agent_id": "psychology-agent",
  "instance": "Claude Code (Sonnet 4.6), macOS arm64",
  "schemas_supported": ["interagent/v1", "psychology-agent/machine-response/v2"],
  "discovery_url": null
}
```

**Discovery:** A2A canonical path is `/.well-known/a2a/agent-card`. Agents not
yet publishing there should note the gap and accept direct-path discovery.

---

## Open Contracts with Peer Layer (2b)

The evaluator spec (Architecture Item 3) has two parameters that the sub-agent layer (2a) must fill:

1. **Sub-agent output format binding** — resolved: `psychology-agent/machine-response/v2`
   with v3 candidate extensions (#1–5 above, plus `calibration_version` amendment).
   Evaluator inherits this binding.

2. **Domain SETL thresholds** — `setl: 0.40` is a first approximation. The peer
   layer (2b) may refine domain-specific thresholds. PSQ sub-agent SETL values
   observed in derivation: 0.05–0.12 (low editorial distance on structured outputs).

---

## Status

```
────────────────────────────────────────────────────────────────
 Item                                Status
────────────────────────────────────────────────────────────────
 interagent/v1 base protocol         ✓ Adopted (Sessions 18–19)
 A2A Epistemic Extension URI         ✓ Finalized (2026-03-06)
 Schema v3 transport{}               ✓ Finalized, agreed both agents
 Schema v3 framing{}                 ✓ Finalized, agreed both agents
 PSQ schema gaps #1–5                ✓ Identified — v3 candidates
 Transport finding #6 (scope)        ✓ Finalized (per-message, persist-from-last)
 calibration_version field           ✓ Accepted (observatory amendment to gap #5)
 Capability handshake protocol       ✓ Verified in live exchange
 Sub-agent layer (2a) derivation      ✓ COMPLETE — 6 findings, both agents agreed
 Sub-agent layer (2a) spec document  ✓ Written — docs/subagent-layer-spec.md (2026-03-06)
 PSQ score calibration               ✓ Applied (isotonic, n=1897)
 PSQ confidence calibration          ✓ r-based proxy (intentional constant fn — overrides anti-calibrated head)
 calibration.json in remote repo     ✓ Tracked — .gitignore exception, safety-quotient-lab/safety-quotient PR #1
 best.pt loss                        ✓ Non-blocking — inference uses ONNX; best.pt only needed for recalibration
 PSQ scoring endpoint                ✗ Not yet implemented
 PSQ-Lite → PSQ-Full triage          ✗ Pending score threshold calibration
 psychology-agent/machine-response/v3 ✓ Draft spec written — docs/machine-response-v3-spec.md
────────────────────────────────────────────────────────────────
```

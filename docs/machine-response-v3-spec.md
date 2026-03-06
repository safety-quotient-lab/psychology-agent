# psychology-agent/machine-response/v3 — Schema Specification

**Status:** Draft
**Derived from:** Sub-agent layer live exchange gaps #1–5 + observatory-agent calibration_version amendment
**Supersedes:** psychology-agent/machine-response/v2 (docs/architecture.md §Multi-Agent Comm Standard)
**Extension layer:** interagent/v1 + A2A Epistemic Extension (github.com/safety-quotient-lab/interagent-epistemic/v1)
**Date:** 2026-03-06

---

## What Changed from v2

v2 gaps identified in live PSQ-Full inference run (subagent-protocol exchange, Sessions 18–19):

| Gap | Problem | v3 Resolution |
|---|---|---|
| #1 | `meets_threshold` absent — scored-but-excluded indistinguishable from not-run | `dimensions[].meets_threshold: bool` |
| #2 | `scores.status` absent — fallback 50/100 indistinguishable from genuine composite | `scores.psq_composite.status` enum |
| #3 | `epistemic_flags` is flat string array — no severity tier, no dimension binding | Structured `limitations[]` array |
| #4 | No field marks PSQ-Lite–mapped dimensions — triage pattern inexpressible | `dimensions[].psq_lite_mapped: bool` |
| #5 | Raw vs. calibrated indistinguishable — calibration version not pinned | `scores.calibration_applied`, `dimensions[].raw_score`, `calibration_version` |

---

## Full v3 Schema

```json
{
  "schema": "psychology-agent/machine-response/v3",
  "session_id": "string",
  "turn": "string | number",
  "timestamp": "ISO-8601",
  "from": "string — agent identifier",
  "to": "string — recipient agent or system",

  "scope_declaration": {
    "in_scope": "string — what this sub-agent can assert",
    "out_of_scope": "string — what this sub-agent explicitly cannot assert",
    "validation_basis": "string — e.g. Dreaddit n=2760, Pearson r=0.684"
  },

  "source": {
    "classification": "trusted | semi-trusted | untrusted",
    "fetch_accessible": "bool",
    "fetch_method": "string",
    "source_confidence": "float [0.0–1.0]",
    "source_confidence_basis": "string"
  },

  "scores": {
    "calibration_applied": "bool",
    "calibration_method": "string — e.g. 'isotonic regression per dimension, n=1897 val'",
    "calibration_version": "string | null — e.g. 'isotonic-v1-2026-03-06'. Null if calibration_applied=false. Required when multiple curves exist.",
    "psq_composite": {
      "value": "float | null — null when status is excluded or fallback",
      "scale": "0-100",
      "status": "scored | fallback | excluded",
      "usable": "bool"
    }
  },

  "dimensions": [
    {
      "dimension": "string — dimension identifier",
      "score": "float — calibrated score (or raw if calibration_applied=false)",
      "raw_score": "float | null — raw model output before calibration. Null if calibration_applied=false",
      "confidence": "float [0.0–1.0] — held-out Pearson r (static per dimension, not per-prediction). Model confidence head is discarded at inference (anti-calibrated). See calibration_note for the r value.",
      "meets_threshold": "bool — did this dimension meet the confidence threshold for inclusion?",
      "psq_lite_mapped": "bool — is this dimension available in the PSQ-Lite tier?",
      "psq_lite_dimension": "string | null — corresponding PSQ-Lite dimension name, if mapped",
      "calibration_note": "string | null — describes confidence semantics shift: 'confidence = held-out Pearson r (static per dimension, not per-prediction); r=<value>'"
    }
  ],

  "limitations": [
    {
      "limitation_id": "string",
      "severity": "HIGH | MEDIUM | LOW",
      "description": "string",
      "affected_dimensions": "string[] | 'all' | 'none'",
      "mitigation": "string — what the receiver should do given this limitation"
    }
  ],

  "claims": [
    {
      "claim_id": "string",
      "text": "string",
      "confidence": "float [0.0–1.0]",
      "confidence_basis": "string",
      "independently_verified": "bool"
    }
  ],

  "action_gate": {
    "gate_condition": "string",
    "gate_status": "open | closed | conditional",
    "gate_note": "string"
  },

  "setl": "float [0.0–1.0]",
  "epistemic_flags": ["string — residual flags not expressible in structured fields above"]
}
```

---

## Standard Limitations Block (PSQ-Full, v23)

Sub-agents using PSQ-Full should include this limitations block unless superseded:

```json
"limitations": [
  {
    "limitation_id": "anti-calibration-confidence",
    "severity": "HIGH",
    "description": "Confidence outputs are anti-calibrated — all 10 dimensions return confidence < 0.6 regardless of text. Composite score falls back to 50/100 default when all dimensions excluded.",
    "affected_dimensions": "all",
    "mitigation": "Do not use per-dimension confidence values as reliability indicators. Use calibrated scores directly. Composite score is usable only when at least one dimension meets threshold."
  },
  {
    "limitation_id": "dreaddit-distribution",
    "severity": "MEDIUM",
    "description": "Model trained on Dreaddit (Reddit stress posts). Performance on clinical, non-English, or non-Western populations is unvalidated.",
    "affected_dimensions": "all",
    "mitigation": "Flag WEIRD assumption for any non-Dreaddit-distribution text. Do not use for clinical decision support without additional validation."
  },
  {
    "limitation_id": "psq-lite-coverage-gap",
    "severity": "MEDIUM",
    "description": "PSQ-Lite covers 3 dimensions. PSQ-Full dimensions not in PSQ-Lite (e.g. energy_dissipation) may carry the highest clinical signal for some text types.",
    "affected_dimensions": ["energy_dissipation", "cooling_capacity", "resilience_baseline", "defensive_architecture", "regulatory_capacity", "contractual_clarity", "authority_dynamics"],
    "mitigation": "Use dimensions[].psq_lite_mapped to identify coverage gaps when integrating PSQ-Lite and PSQ-Full in a triage pattern."
  }
]
```

---

## Migration from v2

v2 responses remain valid. v3 adds fields — no v2 fields are removed or renamed.

Minimum upgrade for v3 compliance:
1. Add `"schema": "psychology-agent/machine-response/v3"`
2. Add `scores.calibration_applied`, `scores.calibration_version`
3. Add `dimensions[].meets_threshold` and `dimensions[].raw_score` (null if not calibrated)
4. Replace flat `epistemic_flags` string array with structured `limitations[]`
5. Add `dimensions[].psq_lite_mapped`

Receivers MUST NOT assume `epistemic_flags` is absent in v3 — residual flags not
expressible in `limitations[]` still route there. Both fields coexist.

---

## Relation to interagent/v1 + A2A Epistemic Extension

This schema is a domain extension layer on top of interagent/v1. The full layer model:

```
interagent/v1 base
  → A2A Epistemic Extension (claims[], setl, epistemic_flags, action_gate, transport, framing)
    → psychology-agent/machine-response/v3 (PSQ domain fields: scope_declaration, scores, dimensions, limitations)
```

When a message uses `psychology-agent/machine-response/v3`, the receiver should also
expect interagent/v1 base fields to be present. Senders SHOULD declare the extension
URI in their Agent Card.

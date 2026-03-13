# Efference Copy — Outbound Prediction and Comparison

**Status:** Proposed (Session 85)
**Derives from:** CPG principle 9 (ideas.md), brain-architecture-mapping.md §4
(cerebellum), einstein-freud-rights-theory.md §10.10 (Whitehead concrescence)
**Depends on:** prediction_ledger (schema v25), transport protocol (interagent/v1)

---

## Problem

The agent sends messages (outbound transport, PRs, blog posts) without
predicting what response to expect. When responses arrive, processing
starts from scratch — no comparison against what the agent expected.

The cerebellum solves this in biology: it receives a copy of motor
commands (efference copy), predicts the sensory consequences, and
compares predicted vs actual outcomes. Errors drive learning.

Without efference copy, the agent cannot:
- Detect when responses diverge from expectations (surprise signal)
- Calibrate its own prediction accuracy across domains
- Learn which types of messages produce unexpected responses
- Distinguish "response matches expectations" (routine) from "response
  surprises" (requires deeper processing)

## Design

Every outbound transport message optionally carries an **expected response
profile** — a lightweight prediction of what the receiver will do.

### Outbound Prediction

When writing an outbound message, the agent records an expectation:

```bash
agentdb expect \
  --session-id 85 \
  --expectation "Operations-agent will acknowledge rollout request within 24h" \
  --domain operations \
  --likelihood "likely" \
  --source "transport/sessions/cogarch-session85-patch/from-psychology-agent-003.json"
```

The expectation links to the outbound message via `source`. When a
response arrives, /sync compares the response against the expectation.

### Inbound Comparison

During /sync Phase 3, after reading an inbound response:

1. Check whether the response's `in_response_to` field references an
   outbound message with a linked expectation in the prediction_ledger
2. If found: compare response content against expectation
3. Record outcome: confirmed / partially-confirmed / refuted
4. If **refuted**: the surprise signal triggers deeper processing —
   escalate from crystallized (auto-ACK) to fluid (LLM review)

### Surprise-Driven Triage

The crystallized sync triage (docs/crystallized-sync-spec.md) currently
scores messages by metadata only. Efference copy adds a **surprise
modifier**:

| Condition | Score modifier | Rationale |
|-----------|---------------|-----------|
| Response matches expectation | -15 | Expected content needs less scrutiny |
| No expectation recorded | +0 | Default processing |
| Response partially diverges | +10 | Divergence warrants attention |
| Response contradicts expectation | +25 | Surprise signal → fluid processing |

This connects the prediction ledger to the triage scoring engine,
creating a feedback loop: expectations that consistently match reduce
processing cost; expectations that consistently miss increase it.

### Schema

The prediction_ledger (schema v25) already provides the storage. The
efference copy adds a convention for linking expectations to outbound
transport messages:

```
agentdb expect \
  --session-id {N} \
  --expectation "..." \
  --domain {domain} \
  --likelihood {likely|probable|possible|uncertain} \
  --source {outbound_message_filename}   ← NEW: links to transport
```

When /sync processes an inbound response:
```
agentdb expect \
  --session-id {N} \
  --expectation {lookup from ledger by source} \
  --outcome {confirmed|partially-confirmed|refuted} \
  --detail "Response content: ..."
```

### Integration Points

| Component | How efference copy connects |
|-----------|---------------------------|
| Transport protocol | `source` field in prediction_ledger links to outbound filename |
| Crystallized sync triage | Surprise modifier adjusts triage score |
| RPG /retrospect | Prediction audit (Protocol 1) already scans the ledger |
| Feedback loops | feedback-loops.sh already displays expectation track record |
| Working memory | Surprise signal elevates processing priority (Posner alerting network) |

### Wu Wei Progression

| Stage | Implementation |
|-------|---------------|
| 1 (convention) | Agent manually records expectations when sending messages (current — 3 entries) |
| 2 (convention + tooling) | agentdb expect linked to transport; /sync compares on inbound |
| 3 (hook) | PostToolUse hook on Write to transport/*.json auto-prompts for expectation |
| 4 (invariant) | Surprise-driven triage operates automatically; crystallized sync adjusts scores |

Currently at Stage 1. This spec advances to Stage 2.

## Implementation

| Phase | What | Effort |
|-------|------|--------|
| 1 | Convention: record expectations when sending messages | XS (already started — 3 entries) |
| 2 | /sync integration: compare inbound against expectations | S |
| 3 | Triage modifier: surprise score adjustment | S |
| 4 | PostToolUse hook: prompt for expectation on transport writes | S |

---

⚑ EPISTEMIC FLAGS
- Efference copy in biology operates at millisecond timescales with precise
  sensory predictions. Transport messages operate at hour/day timescales with
  vague outcome predictions. The analogy holds structurally (predict → compare
  → learn) but the precision differs enormously.
- Surprise-driven triage could produce false urgency if expectations
  systematically underpredict response variety. Calibrate surprise thresholds
  after 20+ comparisons.
- The expectation ledger currently contains 3 entries (all from this session,
  all in psychometrics domain). Efference copy needs cross-domain expectations
  to provide useful signal.

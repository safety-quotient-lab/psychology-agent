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
| 5 | Inverse model: desired outcome → required action | M (see §Inverse Model below) |
| 6 | Reverse replay: backward credit assignment through action chains | M (see §Reverse Replay below) |

---

## Inverse Model (Phase 5)

**Source:** Wolpert & Kawato (1998). Multiple paired forward and inverse
models for motor control. *Neural Networks*, 11(7-8), 1317-1329.

The cerebellum maintains **paired internal models** for every learned
motor behavior:

- **Forward model** (efference copy — implemented): given a motor
  command (outbound message), predict the sensory consequence (expected
  response). This represents Phases 1-4 above.

- **Inverse model** (not yet implemented): given a *desired* sensory
  outcome (desired response from a peer agent), compute which motor
  command (outbound message) would produce it.

### What the inverse model adds

The forward model answers: "I sent this message — what will happen?"
The inverse model answers: "I want this outcome — what should I send?"

| Direction | Input | Output | Use case |
|---|---|---|---|
| Forward (current) | Outbound message | Predicted response | Surprise detection when response arrives |
| Inverse (proposed) | Desired peer behavior | Required outbound message | Action planning — crafting messages that produce intended effects |

### Architectural mapping

| Cerebellar component | Cogarch analog |
|---|---|
| Forward model output (predicted sensory feedback) | prediction_ledger expectation (current) |
| Inverse model output (required motor command) | **message template generator** — given a desired outcome + peer agent profile, draft the message most likely to produce that outcome |
| Paired learning (forward error drives inverse learning) | Prediction error from resolved expectations calibrates the inverse model — messages that produced unexpected responses update the template for future messages to that peer |
| Multiple paired models (one per behavior type) | Per-agent, per-session-type templates — the message style that works with psq-agent differs from what works with observatory-agent |

### Implementation sketch

```python
def inverse_model(desired_outcome, peer_agent_id, session_type):
    """Given a desired outcome, compute the outbound message
    most likely to produce it.

    Uses historical prediction_ledger data: which messages to this
    peer in this session type produced confirmed outcomes?

    Returns: message template (subject, urgency, framing, key content)
    """
    # Query prediction_ledger for confirmed predictions to this peer
    confirmed = query_confirmed_predictions(peer_agent_id, session_type)

    # Extract patterns from confirmed messages
    patterns = extract_message_patterns(confirmed)

    # Generate template that matches successful patterns
    template = compose_template(desired_outcome, patterns)

    return template
```

### Connection to active inference (§6)

Under active inference, the forward model predicts; the inverse model
*acts to make predictions come true*. The agent does not merely predict
what will happen — it selects actions that minimize prediction error
by choosing the outbound message most likely to produce the desired
outcome. This completes the active inference loop: perception (read
inbound) → prediction (forward model) → action selection (inverse
model) → action (send outbound) → perception (read response).

### Tandem learning (Kawato et al., 2018)

The forward and inverse models learn in tandem: the forward model's
prediction error drives learning in the inverse model. When a message
produces an unexpected response (prediction error), the inverse model
updates its message templates to avoid the pattern that produced the
surprise. Over time, both models calibrate together — the forward
model predicts more accurately, and the inverse model selects actions
more effectively.

**Wu wei progression:** Stage 2 (convention + tooling). The inverse
model begins as a lookup table of successful message patterns per peer
agent. It advances to Stage 3 (hook-backed) when the pattern database
grows large enough to automate template selection.


---

## Reverse Replay for Credit Assignment (Phase 6)

**Source:** Foster & Wilson (2006). Reverse replay of behavioural
sequences in hippocampal place cells during the awake state. *Nature*,
440, 680-683. Diba & Buzsáki (2007). Forward and reverse hippocampal
place-cell sequences during ripples.

### The biological mechanism

After a rat reaches a reward location, hippocampal place cells fire in
*temporally reversed order* — replaying the just-completed trajectory
backward from goal to start. Forward replay occurs at trial *start*
(planning what to do). Reverse replay occurs at trial *end* (assigning
credit — which earlier action led to this outcome).

The key insight: **reverse replay solves the temporal credit assignment
problem** — connecting distant actions to eventual outcomes. In
reinforcement learning terms, the reward signal propagates backward
through the action chain, strengthening earlier actions that led to
reward and weakening those that led to failure.

### What reverse replay adds to the event-sourced memory

The replay engine (scripts/replay_engine.py) currently processes
events chronologically (forward replay). Reverse replay adds a second
pass that processes events in reverse temporal order:

**Forward replay discovers:** "Event A led to event B led to event C"
(causal chains — what caused what).

**Reverse replay discovers:** "Outcome C occurred. What preceded it?
Event B. What preceded that? Event A. Therefore A contributed to C."
(credit assignment — which earlier actions produced this outcome).

### Implementation sketch

```python
def reverse_replay(events, outcome_event):
    """Trace backward from an outcome event through the action chain.

    Starting from a significant outcome (surprising prediction error,
    governance failure, or session quality metric), walk backward through
    temporally preceding events to identify which earlier actions
    contributed to the outcome.

    Returns: credit_chain — ordered list of (event, credit_score) pairs,
    where credit_score decays exponentially with temporal distance from
    the outcome.
    """
    credit_chain = []
    remaining_credit = 1.0
    decay = 0.7  # each step back retains 70% of remaining credit

    # Sort events in reverse temporal order
    reverse_events = sorted(events, key=lambda e: e['timestamp'],
                           reverse=True)

    for event in reverse_events:
        if event['timestamp'] >= outcome_event['timestamp']:
            continue  # skip events after the outcome

        credit = remaining_credit * decay
        remaining_credit *= (1 - decay)

        credit_chain.append({
            'event': event,
            'credit_score': credit,
            'temporal_distance': outcome_event['timestamp'] - event['timestamp']
        })

        if remaining_credit < 0.01:
            break  # credit exhausted

    return credit_chain
```

### Integration with co-occurrence analyzer

The replay engine's co-occurrence matrix (Analyzer 1) operates on
temporal proximity — events that co-occur within 30 seconds. Reverse
replay adds *causal direction*: not just "A and C co-occurred" but
"A preceded C and contributed to C's occurrence." This produces a
directed association matrix (asymmetric — A→C differs from C→A)
alongside the undirected co-occurrence matrix.

### When reverse replay runs

Reverse replay activates when the replay engine encounters a
**significant outcome event**:

| Outcome type | Significance | Reverse replay depth |
|---|---|---|
| Prediction error > 0.5 (surprise) | HIGH | Full chain (up to 20 events back) |
| Governance failure (trigger missed) | HIGH | Full chain |
| Session quality drop | MEDIUM | 10 events back |
| Prediction confirmed (expected) | LOW | Skip reverse replay |

Low-significance outcomes do not warrant reverse replay — the forward
model already handles routine confirmations. Reverse replay concentrates
computational effort on surprising or failure outcomes, matching the
biological pattern: the hippocampus reverse-replays reward-related
sequences preferentially over neutral ones.

### Connection to event-sourced memory spec

Reverse replay implements the "bidirectional replay" secondary
mitigation (B5) from docs/event-sourced-memory.md. The forward pass
(Analyzer 1: co-occurrence) runs chronologically. The reverse pass
(this phase) runs outcome-first. Together they produce both causal
discovery (forward) and credit assignment (reverse) — the two
complementary functions of hippocampal replay (Diba & Buzsáki, 2007).

**Wu wei progression:** Stage 2 (convention + tooling). Reverse replay
begins as a batch analysis during idle cycles. Advances to Stage 3
when integrated into the replay engine's standard consolidation loop.
Advances to Stage 4 when reverse replay runs automatically for every
significant outcome without human initiation.

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

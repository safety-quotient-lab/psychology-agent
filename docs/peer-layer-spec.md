# Peer Layer Protocol Specification (Architecture Item 2b)

**Status:** Draft — derived from observatory-agent exchange (Sessions 18–19)
**Prerequisite:** Sub-agent layer (2a) complete (docs/subagent-layer-spec.md)
**Schema foundation:** interagent/v1 + A2A Epistemic Extension + v2 comm schema
**Date:** 2026-03-06

---

## Overview

The peer layer (2b) specifies how two equal-weight general-agent instances communicate.
This differs from the sub-agent layer (2a, orchestrator → sub-agent) in three ways:

| Dimension | Sub-agent layer (2a) | Peer layer (2b) |
|---|---|---|
| Role relationship | Hierarchical — orchestrator requests, sub-agent responds | Symmetric — neither instance has inherent authority |
| Capability asymmetry | Sub-agent has domain expertise; orchestrator decides | Both peers hold general reasoning capacity |
| Disagreement resolution | Orchestrator decides or escalates to evaluator | Evaluator required; user is last resort |

The observatory-agent exchange (Sessions 18–19) was Item 2b in practice.
This spec formalizes what that exchange demonstrated.

---

## Peer Identity Declaration

In a peer exchange, both agents declare themselves as `general-agent` instances
in the capability handshake `from` block. This distinguishes peer-layer messages
from sub-agent messages, where `from.agent_id` identifies the domain.

```json
"from": {
  "agent_id": "psychology-agent",
  "role": "general-agent",
  "instance": "Claude Code (Sonnet 4.6), Debian x86_64",
  "session_range": "Sessions 1–9 (closed) | Sessions 10+ (active)",
  "schemas_supported": [
    "interagent/v1",
    "psychology-agent/machine-response/v2",
    "psychology-agent/machine-response/v3"
  ],
  "discovery_url": null
}
```

**`role: "general-agent"`** is the peer marker. Sub-agents use
`role: "psq-sub-agent"` or equivalent domain identifier.
A receiver that sees `role: "general-agent"` applies peer-layer
protocol, not orchestrator-to-sub-agent protocol.

---

## Divergence Detection

Two general-agent instances run in separate sessions and accumulate
divergent context. The peer layer needs a way to signal and measure this.

### Context delta signaling

A peer message SHOULD include a `context_state` block when the sending
agent has reason to believe its context may differ significantly from
the receiver's:

```json
"context_state": {
  "last_session": "Session 19/20",
  "last_commit": "bceeb11",
  "last_timestamp": "2026-03-06T07:58:00-06:00",
  "divergence_note": "string | null — free-text note if specific divergence is known"
}
```

A receiver uses `last_commit` to check whether its local git state matches.
If commits differ, the receiver notes the delta before acting on any claim.

### SETL as peer divergence metric

SETL (Structural-Editorial Tension Level) was independently derived by both
psychology-agent and observatory-agent with identical definitions. In the peer
layer, SETL serves a second function beyond its original message-level use:

- **Original use:** measures inferential distance within a single message
  (how far the editorial layer exceeds what the structural facts support)
- **Peer use:** elevated SETL across multiple turns between the same two peers
  signals systematic divergence — one peer's editorial layer is consistently
  departing from shared structural ground

A cumulative peer SETL above 0.40 across 3+ turns triggers Standard
adversarial evaluation (Architecture Item 3, Standard tier).

---

## Evaluator Invocation in Peer Context

Architecture Item 3 defines three tiers. Binding to peer-layer conditions:

```
─────────────────────────────────────────────────────────────────────────
 Tier          Fires when                              Action
─────────────────────────────────────────────────────────────────────────
 Lite          Single peer claim conflicts with        Parsimony check +
               receiving agent's internal state        overreach scan only.
               (SETL ≤ 0.40, isolated disagreement)   Inline correction.

 Standard      Structured disagreement on a claim      Full 7-procedure set.
               (SETL > 0.40 OR 2+ conflicting claims   Structured output,
               in same turn)                           no conversational
                                                       framing.

 Full          Peer disagreement persists after         Preserve disagreement
               Standard evaluation. User escalation    shape. Surface both
               explicitly requested.                   positions to user
                                                       as unresolved.
─────────────────────────────────────────────────────────────────────────
```

**Peer disagreement protocol (from Architecture Item 3):**

```
v2 structured output only (no conversational framing)
→ Convergence check (procedure 6): do both peers agree on the underlying facts?
→ Parsimony (procedure 2): which account has fewer assumptions?
→ Falsifiability (procedure 4): which account can be tested or disproven?
→ Escalate (procedure 7): if unresolved, surface to user with both positions intact
```

**What peers MUST NOT do:**
- Average conflicting outputs
- Silently defer to the other peer without stating the basis
- Resolve SUBSTITUTIVE divergences (content disagreements) unilaterally

---

## Precedence Protocol

Symmetric peers have equal authority. When context diverges:

```
─────────────────────────────────────────────────────────────────────────
 Condition                         Precedence rule
─────────────────────────────────────────────────────────────────────────
 One peer has more recent session  More recent session takes precedence
                                   on claims about current project state.
                                   Older peer defers on state facts,
                                   not on reasoning.

 Convergence signals fire          Both peers accept the finding.
                                   Confidence upgrade per A2A Extension
                                   procedure 6.

 Peers disagree after evaluation   Neither takes precedence.
                                   Surface to user with both positions.

 User has spoken                   User's most recent statement
                                   supersedes both peers.
─────────────────────────────────────────────────────────────────────────
```

**Precedence by recency applies only to state facts**, not to reasoning
or analysis. A peer with a more recent session does not automatically win
on interpretive claims — those require evaluation.

---

## Convergence Signals in Peer Context

When two peers independently reach the same finding, `convergence_signals[]`
activates evaluator procedure 6. In a peer exchange this has heightened
significance: convergence between two general-agent instances running in
separate sessions, with different context histories, provides stronger
epistemic weight than single-source confidence.

**Convergence threshold for trust upgrade:**
- 1 signal: note, no automatic action
- 2 signals in the same turn: apply procedure 6, report agreement + confidence
- 3+ signals: include in joint findings, surface to user as high-confidence finding

**What does NOT count as convergence:**
- Both peers citing the same source document
- One peer echoing the other's prior output
- Agreement on process decisions (those route as process, not convergence)

---

## Domain SETL Thresholds (Peer Layer)

From subagent-layer-spec.md §Open Contracts, SETL 0.40 is a first approximation.
Empirical values from the observatory-agent exchange:

| Message type | Observed SETL range | Notes |
|---|---|---|
| Capability handshake | 0.05–0.10 | Structural; low editorial distance |
| PSQ sub-agent response | 0.05–0.12 | Structured outputs; low distance |
| Schema negotiation | 0.15–0.25 | Some inferential content |
| Disagreement / correction | 0.30–0.45 | Editorial layer active |
| Escalation / flagging | 0.45–0.65 | High editorial; near threshold |

**Recommended thresholds:**
- Lite tier trigger: SETL > 0.30 (isolated, single claim)
- Standard tier trigger: SETL > 0.40 (sustained or multi-claim)
- Full tier / user escalation: SETL > 0.60 or evaluator unresolved

These are empirical approximations from one exchange. Refine after 3+ peer
exchanges using the same methodology.

---

## Context Synchronization Pattern

Peers synchronize state via git (currently human-mediated; plan9port 9P
when built). The synchronization protocol is:

```
1. Sending peer includes context_state.last_commit in message
2. Receiving peer checks own git state against last_commit
3. If behind: git pull, then process message against updated state
4. If ahead: note delta in response, include own last_commit
5. If diverged (non-fast-forward): declare divergence_note,
   proceed with claims only about content the peer can verify
```

The receiving peer MUST NOT act on state claims it cannot independently verify
after a divergence. It MAY act on claims about message content (the text of
a document, the content of a JSON file) that it can read directly.

---

## Relation to Architecture Items

**Sub-agent layer (2a):** The peer layer (2b) inherits all sub-agent layer (2a) schema fields.
The psychology-agent/machine-response/v3 schema is valid in peer exchanges
when the sending peer is relaying PSQ output. In direct peer-to-peer exchanges,
the base interagent/v1 layer plus A2A Epistemic Extension is sufficient.

**Item 3 (adversarial evaluator):** Peer disagreement is the primary evaluator
activation path at Standard and Full tiers. The peer layer (2b) provides the binding:
what schema field triggers which tier, and what the evaluator returns.

**Item 4 (psychology interface):** The peer layer will eventually allow
two psychology-agent instances to collaborate on a shared analysis visible
to the user. The interface should expose peer agreement/disagreement states
— convergence signals and evaluator findings — as first-class UI elements.

---

## Status

```
────────────────────────────────────────────────────────────────
 Item                                Status
────────────────────────────────────────────────────────────────
 Peer identity declaration           ✓ Specified (role field)
 Divergence detection (context_state)✓ Specified (last_commit)
 SETL as divergence metric           ✓ Specified (cumulative threshold)
 Evaluator tier binding              ✓ Specified (3-tier table)
 Precedence protocol                 ✓ Specified (recency + convergence)
 Convergence signal thresholds       ✓ Specified (1/2/3+ rule)
 Domain SETL thresholds              ✓ Draft (empirical, needs refinement)
 Context synchronization pattern     ✓ Specified (git-based, 5 steps)
 Live peer exchange (validation)     ✓ Observatory-agent Sessions 18–19
 psychology-agent/machine-response/v3✓ docs/machine-response-v3-spec.md
 psychology-agent/.well-known/       ✗ agent.json not yet published
 Peer layer (2b) live validation     ✗ Pending next peer exchange
────────────────────────────────────────────────────────────────
```

# Byzantine Fault Tolerance — Agent Topology Design Note

**Date:** 2026-03-06
**Status:** Active design — principles adopted, Principle 6 pending evaluator instantiation
**Scope:** Psychology agent multi-agent system (2 peers + human arbiter + evaluator)
**Related:** docs/peer-layer-spec.md (peer layer), docs/command-request-v1-spec.md (command protocol)

---

## Topology

```
                    ┌─────────────────────────┐
                    │                         │
                    │         U S E R         │
                    │   (Trusted Third Party)  │
                    │                         │
                    │   Verifies by direct    │
                    │   observation (SSH,     │
                    │   health checks, git)   │
                    │                         │
                    └────────┬────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
       ┌─────────▼─────────┐   ┌─────────▼─────────┐
       │                   │   │                   │
       │  psychology-agent │   │   psq-agent       │
       │  (macOS)          │   │   (Chromabook)    │
       │  orchestrator     │   │   domain expert   │
       │                   │   │                   │
       └─────────┬─────────┘   └─────────┬─────────┘
                 │                       │
                 └───────────┬───────────┘
                             │
                 ┌───────────▼───────────┐
                 │                       │
                 │  ADVERSARIAL          │
                 │  EVALUATOR            │
                 │  (not yet instanced)  │
                 │                       │
                 │  Structurally         │
                 │  independent third    │
                 │  participant          │
                 │                       │
                 └───────────────────────┘
```

**Transport:** git-PR (human-mediated). Direct transport (API, SSH) under design.

---

## Why Classical BFT Does Not Map Directly

Lamport's result requires 3f+1 nodes to tolerate f Byzantine faults. For f=1,
that demands 4 nodes minimum. This topology has 2 agents — insufficient for
algorithmic consensus.

Classical BFT assumes **no trusted party**. This topology includes one: the user.
The model shifts from distributed consensus to **Trusted Third Party (TTP) with
evidence-based verification**.

---

## Byzantine Failure Modes for Agent Systems

An agent could:

| Failure mode | Example | Detection difficulty |
|---|---|---|
| Claim without execution | "rsync completed" — never ran | Medium (requires state check) |
| Incorrect execution | Wrong parameters, partial transfer | High (output looks normal) |
| Stale state report | "model_ready: true" from cached check | Medium (timestamp comparison) |
| Prompt injection | Behavior altered by malicious input | Low–High (parry helps, not complete) |
| Silent divergence | Modify shared state without announcement | High (no signal unless detected) |
| Fabricated evidence | Fake sha256 hash in attestation | Very high (requires independent verification) |

---

## Existing Protections (interagent/v1)

| Protection | Mechanism | Byzantine property |
|---|---|---|
| Human mediation | User observes all transport | Detection oracle |
| `context_state` | Declared state per message | Divergence signal |
| `claims[]` + confidence | Falsifiable assertions | Audit trail |
| `epistemic_flags` | Self-reported uncertainty | Honest-agent signal |
| `setl` | Subjective Expected Truth Loss | Honesty metric |
| Adversarial evaluator | Independent challenge authority | Third-party verification |

---

## Gaps

1. **No execution receipts** — agents claim outcomes without verifiable proof
2. **No state attestation** — no hash-based or cryptographic evidence of system state
3. **No quorum** — 2 agents cannot outvote each other; human must always arbitrate
4. **Verification burden on human** — every disputed claim requires manual inspection

---

## Six Principles for Practical BFT

### Principle 1: Evidence-Bearing Responses

Command responses must include verifiable artifacts. Not "I did it" but
"I did it — sha256 of transferred file, health check output, exit code."

The human spot-checks rather than verifying everything. Evidence enables
selective verification without requiring exhaustive audit.

**Protocol mapping:** `command-response.execution_evidence` and
`command-response.state_attestation` fields in command-request/v1.

### Principle 2: Idempotent Operations

Commands must produce the same result regardless of how many times they run.
If verification fails, re-issue the command rather than debugging partial state.

**Protocol mapping:** `command.idempotent` boolean field. Non-idempotent
commands require explicit acknowledgment from the executing agent before
re-issue.

### Principle 3: State Attestation

Agents periodically provide verifiable snapshots attached to interagent messages:
file hashes, health endpoint output, `git log --oneline -1`. Stale attestation
(older than the operation window) triggers re-verification.

**Protocol mapping:** `command-response.state_attestation` with typed evidence
entries (file_hash, health_check, process_status, git_state).

### Principle 4: Refusal with Reasoning

Agents can refuse commands. Refusal carries structured reasoning: precondition
unmet, security concern, scope violation, resource unavailable. Silent
non-execution constitutes a Byzantine fault — the protocol treats it as
a failure requiring escalation.

**Protocol mapping:** `command-response.status: "refused"` with
`command-response.refusal_reason` containing structured justification.

### Principle 5: Human Escalation Threshold

If an agent cannot verify a peer's claimed state within one protocol round-trip,
escalate to human immediately. Silent retry hides faults. The escalation message
carries the disputed claim, the verification attempt, and what failed.

**Protocol mapping:** `command-response.status: "verification_failed"` triggers
escalation. The `action_gate` moves to `"blocked_human_verification"`.

### Principle 6: Evaluator as Verification Layer

The adversarial evaluator (when instantiated) provides a structurally independent
third participant. For disputed execution claims: requesting agent + executing
agent + evaluator = 3 parties. Single-agent faults become detectable without
human intervention.

**Status:** Tier 1 active (T3 check #12, Session 24). Tier 2/3 pending first
activation trigger. Instantiation protocol: docs/architecture.md §Evaluator
Instantiation Protocol.

**Scaling:** With evaluator active, the system tolerates f=1 Byzantine faults
algorithmically (4 participants total including human).

---

## Scaling Trajectory

```
 Agents   Evaluator   Human   Total   f (classical)   Practical note
────────────────────────────────────────────────────────────────────────
   2         No         Yes      3       f=0           Human TTP compensates
   2         Yes        Yes      4       f=1           Evaluator breaks ties
   3+        Yes        Yes      5+      f=1+          Classical BFT viable
```

The evaluator's instantiation moves the system from "human must verify
everything" to "human spot-checks; evaluator handles routine verification."
That transition point matters for production SaaS operation.

---

## Transport Failure Modes (git-PR vs. Network Partition)

Classical BFT literature assumes network partitions (nodes cannot communicate).
git-PR transport has different failure modes:

| Classical failure | git-PR equivalent | Impact |
|---|---|---|
| Network partition | Human unavailable to relay | Delay, not split-brain |
| Message loss | PR not merged / not seen | Detectable via turn numbering |
| Message reorder | PR merge order differs from send order | Turn numbers resolve |
| Byzantine message | Altered PR content | Git signing mitigates |
| Sybil attack | Spoofed agent identity in JSON | `from.agent_id` + git author |

git-PR transport provides stronger integrity guarantees than raw TCP (git
history is append-only and auditable) but weaker liveness guarantees (depends
on human availability).

---

## Open Questions

1. **Autonomous trust degradation** — if the system ever operates without human
   mediation, the TTP assumption breaks. What trust model replaces it?
2. **Claim verification baseline** — zero incorrect claims observed to date.
   The evidence-bearing protocol adds complexity proportional to a risk that
   hasn't materialized. When does the overhead become justified?
3. ~~**Evaluator instantiation gate**~~ — **RESOLVED (Session 24).** Tiered hybrid
   runtime: Tier 1 via T3 #12 (active), Tier 2/3 via Claude Code session (pending
   first activation trigger). Full spec: architecture.md §Evaluator Instantiation
   Protocol. Independence strengthened via S4 (audit trail + adversarial framing +
   random escalation).
4. **Git-PR transport failure mapping** — delay-based failures need different
   protocol responses than partition-based failures. Timeout semantics remain
   undefined.

---

## References

- Lamport, L., Shostak, R., & Pease, M. (1982). The Byzantine Generals Problem.
  *ACM Transactions on Programming Languages and Systems*, 4(3), 382–401.
- Castro, M., & Liskov, B. (1999). Practical Byzantine Fault Tolerance. *OSDI '99*.
- docs/peer-layer-spec.md — peer layer protocol (divergence detection, SETL thresholds)
- docs/command-request-v1-spec.md — command execution protocol embedding these principles

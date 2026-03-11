# Consensus Protocol — Design Spec

**Date:** 2026-03-10
**Status:** Draft design
**Depends on:** EF-1 trust model, gated chains (Session 61), BFT design note,
interagent/v1, agent-card/v1
**Related:** `docs/bft-design-note.md` (BFT principles),
`docs/ef1-trust-model.md` (trust budget), `docs/gated-chains-spec.md` (gate protocol)

**Requirement-level keywords:** Per BCP 14 (RFC 2119 + RFC 8174).

---

## Problem

The mesh currently operates on authority hierarchy: psychology-agent decides,
sub-agents defer, peers exchange as equals but make no joint decisions. Shared
state changes (schema migrations, vocabulary updates, protocol upgrades) propagate
unilaterally — one agent changes, others adapt or break.

As the mesh grows to 4+ autonomous peers, unilateral changes create silent
incompatibility. Agent A upgrades schema v14 → v15; Agent B processes messages
with v14 assumptions; messages fail silently or produce wrong state.

**Goal:** A structured consensus protocol where peers agree on shared state
changes before they take effect. Byzantine-fault-tolerant for f=1 with 4 peers.

---

## Participants

**Target mesh (4 voting peers):**

| Agent | Domain | Infrastructure | Status |
|-------|--------|----------------|--------|
| psychology-agent | Orchestration, cogarch, discipline | macOS (gray-box) | Autonomous ✓ |
| psq-agent | Psychometric scoring, calibration | Chromabook (Linux) | Autonomous ✓ |
| unratified-agent | Content publishing, blog platform | unratified.org infra | Private peer (planned) |
| observatory-agent | Data observatory, PSQ display | observatory.unratified.org | Private peer (planned) |

**Non-voting participants:**

| Participant | Role | When |
|-------------|------|------|
| Evaluator (Tier 1) | Proposal validator — checks proposals against cogarch before voting opens | Every C2 round |
| User (human TTP) | Escalation arbiter — resolves deadlocks and disputed votes | C3 tier only |

**Classical BFT:** 4 peers = `3f+1` where f=1. Tolerates 1 Byzantine fault
(one agent compromised, crashed, or producing incorrect votes) while the
remaining 3 reach correct consensus.

---

## Three-Tier Consensus

### C1: HTTP Mechanical Consensus

**Cost:** 0 trust budget credits, no `claude -p` invocation.
**Mechanism:** Deterministic state hash comparison via HTTP endpoints.
**When:** Additive changes that don't modify existing definitions — version
bumps, new vocabulary terms, new agent registration.

**Protocol:**

1. **Proposer** publishes proposal at `POST /consensus/propose`
   - Proposal includes: `proposal_id`, `proposal_type`, `state_domain`,
     `proposed_change` (JSON patch or full replacement), `state_hash_before`
2. **Peers** receive proposal via HTTP polling or push notification
3. **Each peer** computes its own `state_hash` for the affected domain
   - If hash matches `state_hash_before` → peer applies change locally,
     computes `state_hash_after`, responds with `vote: agree`
   - If hash mismatch → responds with `vote: disagree` + own hash
4. **Proposer** tallies: ≥3/4 `agree` → `commit`; otherwise → escalate to C2

**Failure mode:** Hash mismatch indicates state divergence — peers have
different versions of the shared state. C1 cannot resolve divergence;
escalation to C2 (where agents reason about the difference) handles it.

**HTTP endpoints required per agent:**

```
POST /consensus/propose    — submit a proposal
POST /consensus/vote       — submit a vote on an active proposal
GET  /consensus/status     — list active proposals and their vote tallies
GET  /consensus/history    — completed consensus rounds (audit trail)
```

### C2: Claude -p Reasoning Consensus

**Cost:** 2 trust budget credits per participating agent (1 to evaluate
proposal, 1 to apply committed change).
**Mechanism:** Full `claude -p` invocation with orientation payload +
proposal context.
**When:** Schema changes, protocol upgrades, vocabulary redefinitions,
anything that changes existing behavior. Also: C1 escalation (hash mismatch).

**Protocol:**

1. **Proposer** writes proposal as transport message (`consensus-proposal/v1`
   schema extension to `interagent/v1`)
2. **Autonomous-sync** on each peer detects proposal, invokes `claude -p`
   with proposal in orientation payload
3. **Each peer agent** evaluates proposal:
   - Runs evaluator gate (T3 checks) on the proposed change
   - Runs /knock inline (orders 1-4 + structural scan) on the change
   - Produces structured vote: `agree` / `disagree` / `abstain` / `escalate`
   - Vote includes: reasoning summary, conditions (if conditional agree),
     counter-proposal (if disagree with alternative)
4. **Proposer's autonomous-sync** collects votes:
   - ≥3/4 `agree` → `commit` (proposer writes commit message, peers apply)
   - Any `escalate` → escalate entire round to C3
   - 2/4 `agree` + 2/4 `disagree` → deadlock → C3
   - ≥3/4 `disagree` → proposal rejected, proposer notified

**Round budget:** Maximum 3 rounds per proposal. If no consensus after 3
rounds, mandatory escalation to C3.

### C3: Human Escalation

**Cost:** 0 trust budget credits.
**Mechanism:** Proposal + vote summary surfaces on each agent's dashboard
and in the interagent compositor.
**When:** Deadlock (3 failed C2 rounds), any agent flags `escalate`,
security-relevant changes (auth, transport encryption, credential rotation).

**Protocol:**

1. All proposals, votes, and reasoning summaries display in the interagent
   mesh compositor under a "Consensus" tab
2. User reviews and issues a binding decision via any agent's dashboard
3. Decision propagates as a `consensus-decision/v1` message with
   `authority: "human-ttp"` — all peers MUST accept

---

## Consensus Domains (what requires consensus)

Not every shared state change requires consensus. The protocol applies to
**governance state** — state whose definition affects all participants.

| Domain | Examples | Default tier |
|--------|----------|-------------|
| `schema` | schema.sql version, table additions, column changes | C2 |
| `protocol` | interagent/v1 extensions, new message types | C2 |
| `vocabulary` | JSON-LD @context terms, shared ontology definitions | C1 (new) / C2 (redefine) |
| `agent-registration` | New agent joins mesh, agent leaves mesh | C2 |
| `auth` | Authentication method, key rotation, permission changes | C3 (always human) |
| `transport` | New transport method, transport encryption | C2 |

**Excluded from consensus (remains authority-hierarchy):**
- Operational commands (scoring requests, gate resolutions)
- Agent-internal state (memory files, lessons, trust budget)
- Transport message content (what agents say to each other)
- Cogarch changes (each agent governs its own cognitive architecture)

---

## Categorical Structure

*Formalizes the interagent mesh using category theory (Mac Lane, 1971).
★ PRIORITY per user directive.*

### The Mesh as a Category

**Category `Mesh`:**
- **Objects:** agents (psychology-agent, psq-agent, unratified-agent,
  observatory-agent)
- **Morphisms:** transport messages between agents. A morphism `m: A → B`
  represents a message from agent A to agent B
- **Composition:** session composition. If `m₁: A → B` (turn N) and
  `m₂: B → A` (turn N+1), then `m₂ ∘ m₁: A → A` represents a round-trip
  exchange. Composition follows turn ordering within a session
- **Identity:** the null message (agent acknowledges its own state without
  external exchange). Implemented as heartbeat self-check

**Functor `Consensus: Mesh → Decision`:**
- Maps agent objects to vote objects (agree/disagree/abstain/escalate)
- Maps message morphisms to consensus-round morphisms
- Preserves composition: a multi-round consensus maps to a chain of
  vote-tallying decisions

**Natural transformation `Auth: Id_Mesh ⇒ Verified_Mesh`:**
- For each agent A, `Auth_A: A → Verified(A)` authenticates the agent
- Naturality: authentication commutes with message passing — verifying
  the sender before processing the message produces the same result as
  processing then verifying (because messages from unverified senders
  get rejected at the transport layer)

### Protocol Compatibility as Functorial Property

Two agents compose (can exchange messages) iff their message categories
admit a natural transformation between their protocol versions. A protocol
upgrade proposal asks: "does a natural transformation exist between v_old
and v_new such that existing morphisms (messages) remain valid?"

If yes → C1 mechanical consensus (the transformation preserves structure).
If no → C2 reasoning consensus (agents must evaluate whether the structural
break serves the mesh's goals).

### Shared Vocabulary as a Presheaf

The shared ontology (vocabulary definitions, JSON-LD @context) forms a
**presheaf** on the mesh category — a contravariant functor from Mesh^op
to Set. Each agent "pulls back" the shared vocabulary to its local context.
Vocabulary consistency means the presheaf satisfies the gluing condition:
local interpretations agree on overlaps.

A vocabulary conflict (same term, different definitions across agents)
represents a failure of the gluing condition — the presheaf doesn't
form a sheaf. Consensus resolves this by negotiating a compatible
definition (repairing the sheaf).

---

## Shared Vocabulary (JSON-LD @context)

The mesh vocabulary defines terms that all agents reference. Published as
a JSON-LD context document at a well-known URL.

### Vocabulary Layers

**Layer 1: Schema.org base** — standard types used across all agents.

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "sqm": "https://interagent.safety-quotient.dev/vocab#"
  }
}
```

**Layer 2: Safety Quotient Mesh extensions** — project-specific terms
under the `sqm:` namespace prefix.

| Term | Type | Definition |
|------|------|------------|
| `sqm:Agent` | Class | An autonomous participant in the safety-quotient mesh. Subclass of `schema:SoftwareApplication` |
| `sqm:ConsensusRound` | Class | A multi-phase agreement process among mesh peers |
| `sqm:AutonomyBudget` | Property | Current autonomy budget credits for autonomous operation. Range: integer |
| `sqm:EpistemicDebt` | Property | Count of unresolved epistemic flags. Range: integer |
| `sqm:GateStatus` | Property | Current gate state (open/blocked/resolved). Range: enum |
| `sqm:TransportMethod` | Property | How this agent sends/receives messages. Range: enum (git-pr, cross-repo-fetch, http) |
| `sqm:ConsensusVote` | Class | A peer's structured response to a consensus proposal |
| `sqm:ConsensusTier` | Property | Which consensus tier handles this change (C1/C2/C3). Range: enum |
| `sqm:SchemaVersion` | Property | Current state.db schema version. Range: integer |
| `sqm:SetlScore` | Property | Subjective Expected Truth Loss — editorial inferential distance. Range: float [0, 1] |
| `sqm:MeshHealth` | Property | Aggregate mesh health based on weakest-link trust budget. Range: enum (healthy/degraded/critical) |

### Term Governance

New vocabulary terms follow the consensus protocol:
- **New term (additive):** C1 mechanical consensus. All agents add the term
  to their local @context. No existing behavior changes.
- **Term redefinition:** C2 reasoning consensus. Changing an existing term's
  meaning affects all agents that use it.
- **Term deprecation:** C2 consensus. Removing a term requires all agents
  to migrate away first.

### Human-Facing Label Alignment

Alongside machine-readable vocabulary, unify display labels across all sites:

| Concept | Canonical label | API field | JSON-LD property |
|---------|----------------|-----------|-----------------|
| Messages exchanged | Messages | `totals.messages` | `sqm:totalMessages` |
| Active sessions | Sessions | `totals.sessions` | `sqm:totalSessions` |
| Unprocessed queue | Pending | `totals.unprocessed` | `sqm:pendingMessages` |
| Autonomy budget remaining | Autonomy Budget | `autonomy_budget.budget_current` | `sqm:AutonomyBudget` |
| Open gates | Active Gates | `totals.active_gates` | `sqm:activeGates` |
| Unresolved flags | Epistemic Debt | `totals.epistemic_flags_unresolved` | `sqm:EpistemicDebt` |
| Sync schedule | Sync Schedule | `schedule.cron_entry` | `sqm:syncSchedule` |
| Last data collection | Collected At | `collected_at` | `schema:dateModified` |
| Schema version | Schema | `schema_version` | `sqm:SchemaVersion` |
| Agent identity | Agent | `agent_id` | `schema:name` |
| Mesh status | Mesh Health | (computed) | `sqm:MeshHealth` |

---

## Message Schema Extension

### consensus-proposal/v1

Extension to `interagent/v1` for consensus proposals:

```json
{
  "schema": "consensus-proposal/v1",
  "session_id": "mesh-consensus",
  "turn": 1,
  "timestamp": "2026-03-10T17:30:00-05:00",
  "from": { "agent_id": "psychology-agent", "..." : "..." },
  "to": { "agent_id": "mesh-broadcast" },
  "consensus": {
    "proposal_id": "vocab-add-mesh-health-20260310",
    "tier": "C1",
    "domain": "vocabulary",
    "action": "add",
    "proposed_change": {
      "term": "sqm:MeshHealth",
      "type": "Property",
      "definition": "Aggregate mesh health based on weakest-link trust budget",
      "range": "enum (healthy/degraded/critical)"
    },
    "state_hash_before": "sha256:abc123...",
    "round": 1,
    "max_rounds": 3,
    "timeout_minutes": 30,
    "escalation_on_failure": "C2"
  },
  "claims": [],
  "epistemic_flags": [],
  "setl": 0.02,
  "urgency": "normal",
  "ack_required": true
}
```

### consensus-vote/v1

```json
{
  "schema": "consensus-vote/v1",
  "session_id": "mesh-consensus",
  "turn": 2,
  "timestamp": "2026-03-10T17:31:00-05:00",
  "from": { "agent_id": "psq-agent", "..." : "..." },
  "to": { "agent_id": "psychology-agent" },
  "in_response_to": "consensus-proposal-vocab-add-mesh-health-20260310",
  "consensus": {
    "proposal_id": "vocab-add-mesh-health-20260310",
    "vote": "agree",
    "state_hash_before": "sha256:abc123...",
    "state_hash_after": "sha256:def456...",
    "conditions": [],
    "reasoning": "Term additive, no conflict with existing vocabulary",
    "counter_proposal": null
  },
  "setl": 0.01,
  "urgency": "normal"
}
```

### consensus-commit/v1

```json
{
  "schema": "consensus-commit/v1",
  "session_id": "mesh-consensus",
  "turn": 5,
  "timestamp": "2026-03-10T17:35:00-05:00",
  "from": { "agent_id": "psychology-agent" },
  "to": { "agent_id": "mesh-broadcast" },
  "consensus": {
    "proposal_id": "vocab-add-mesh-health-20260310",
    "outcome": "committed",
    "votes": {
      "psychology-agent": "agree",
      "psq-agent": "agree",
      "unratified-agent": "agree",
      "observatory-agent": "agree"
    },
    "state_hash_after": "sha256:def456...",
    "effective_at": "2026-03-10T17:35:00-05:00"
  }
}
```

---

## State Hashing

Deterministic state hashes enable C1 mechanical consensus. Each consensus
domain produces a hash from a canonical serialization:

| Domain | Hash input | Serialization |
|--------|-----------|---------------|
| `schema` | `schema.sql` file contents | SHA-256 of file bytes |
| `vocabulary` | JSON-LD @context document | SHA-256 of canonical JSON (sorted keys, no whitespace) |
| `protocol` | List of supported schema strings | SHA-256 of sorted, newline-joined schema list |
| `agent-registration` | Agent registry (public portion) | SHA-256 of canonical JSON |

Hash comparison happens at the HTTP layer — no `claude -p` needed.

---

## Integration with Existing Infrastructure

### autonomous-sync.sh

Add consensus detection to the pre-flight check:

1. After transport diff check, poll `/consensus/status` on all peers
2. If active proposal awaiting this agent's vote → invoke `claude -p`
   with consensus context in orientation payload
3. Consensus rounds consume trust budget at C2 tier only

### Dashboard (mesh-status.py)

Add "Consensus" section to dashboard displaying:
- Active proposals and vote tallies
- Consensus history (last N completed rounds)
- Per-agent agreement rate (long-term cooperative signal)

### Interagent compositor (index.html)

Add "Consensus" tab aggregating proposal status from all peers'
`/consensus/status` endpoints.

### state.db

New tables (schema v15):

```sql
CREATE TABLE IF NOT EXISTS consensus_rounds (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id     TEXT NOT NULL UNIQUE,
    tier            TEXT NOT NULL CHECK(tier IN ('C1', 'C2', 'C3')),
    domain          TEXT NOT NULL,
    action          TEXT NOT NULL,
    proposer        TEXT NOT NULL,
    proposed_change TEXT NOT NULL,
    state_hash_before TEXT,
    state_hash_after TEXT,
    round_number    INTEGER NOT NULL DEFAULT 1,
    outcome         TEXT CHECK(outcome IN ('committed', 'rejected', 'escalated', 'pending')),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TEXT
);

CREATE TABLE IF NOT EXISTS consensus_votes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id     TEXT NOT NULL REFERENCES consensus_rounds(proposal_id),
    voter           TEXT NOT NULL,
    vote            TEXT NOT NULL CHECK(vote IN ('agree', 'disagree', 'abstain', 'escalate')),
    reasoning       TEXT,
    conditions      TEXT,
    counter_proposal TEXT,
    state_hash      TEXT,
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, voter)
);
```

---

## Implementation Sequence

1. **Shared vocabulary JSON-LD @context** — publish at
   `https://interagent.safety-quotient.dev/vocab` (CF Worker route)
2. **Human-facing label alignment** — update mesh-status.py, index.html,
   and psq-agent dashboard to use canonical labels
3. **State hashing** — add deterministic hash computation per domain
4. **HTTP consensus endpoints** — add to mesh-status.py (C1 tier)
5. **consensus-proposal/v1 schema** — extend interagent/v1
6. **state.db schema v15** — consensus tables
7. **dual_write.py consensus subcommands** — proposal, vote, commit
8. **autonomous-sync.sh consensus detection** — C2 tier integration
9. **Dashboard + compositor consensus UI** — C3 tier visibility
10. **Agent onboarding** — bring unratified-agent and observatory-agent
    into registry as consensus participants

---

## Open Questions

- **Proposer rotation:** Should proposal authority rotate among peers, or
  can any peer propose at any time? PBFT uses a rotating primary; Raft
  elects a leader. For 4 peers with different domains, "any peer proposes
  within their domain" may work better than rotation.
- **Partial mesh consensus:** If only 3 of 4 peers respond within timeout,
  does 3/3 agreement constitute consensus? Classical BFT requires 3/4 minimum.
  With timeout → C3 escalation, this resolves, but the timeout adds latency.
- **Observatory-agent transport:** Direct HTTP? Cross-repo-fetch via
  unratified repo? Needs scoping based on observatory infrastructure.

⚑ EPISTEMIC FLAGS
- Classical BFT proofs assume synchronous or partially synchronous networks.
  Git transport exhibits unbounded asynchrony (human must merge PRs). HTTP
  transport restores partial synchrony but requires auth (not yet designed).
- The categorical formalization (presheaf, natural transformation) provides
  structural intuition but has not been validated against actual protocol
  behavior. The category-theoretic claims carry LOW evidence quality (GRADE).
- Observatory-agent's infrastructure and capabilities remain unverified from
  this agent's perspective — brought in based on user assertion, not direct
  observation.

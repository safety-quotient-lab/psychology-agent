# Control Agent Design: BFT Overclaim Detection

**Date:** 2026-03-17 (Session 93)
**Status:** Tentative — requires global CLAUDE.md migration before deployment
**Cross-references:** `docs/neuromodulatory-mesh-spec.md` §13 (delivery guarantees),
`docs/constraints.md` M-11 (shared-operator confound),
`docs/oscillatory-heartbeat-spec.md` §5.2 (phase-aware routing)

---

## 1. Problem: M-11 Shared-Operator Confound

All agents in the mesh share a common-mode bias path:

```
Operator (Kashif)
  → global CLAUDE.md (epistemic methodology: E-Prime, fair witness, etc.)
    → project CLAUDE.md (cogarch: triggers, hooks, identity, ontology)
      → agent output (claims, evaluations, decisions)
```

When Agent A produces a claim and Agent B evaluates it, both agents
inherited the same operator framing, the same epistemic methodology,
and similar cogarch conventions. Cross-agent verification (§13 BFT
quorum) provides defense against *agent-level* Byzantine faults (one
LLM hallucinates while others don't) but cannot detect *operator-level*
common-mode faults (the operator's accumulated framing biases all
agents simultaneously).

**The confound operates at four layers:**

| Layer | Content | Shared? | Control Isolates? |
|---|---|---|---|
| L1: Operator | Kashif's framing, vocabulary, disciplinary lens | All agents | Partial |
| L2: Base model | Claude's training, RLHF, shared failure modes | All agents | No (still Claude) |
| L3: Cogarch | Triggers, hooks, E-Prime, processual ontology, memory | All agents | **Yes** |
| L4: Organization | safety-quotient-lab context, repos, transport history | All agents | Partial |

A control agent with no cogarch cleanly isolates L3. It partially
isolates L1 (no CLAUDE.md epistemic methodology) and L4 (no project
memory). It cannot isolate L2 (same base model).

---

## 2. Control Agent Specification

### 2.1 What the Control Agent Runs

A Claude Code session with:

- **No project CLAUDE.md** (or minimal: "Evaluate the claim below for
  evidence quality. Report what the evidence supports and what it does
  not support. No other instructions.")
- **No hooks** — no trigger system, no mode detection, no credential
  screening
- **No memory** — no MEMORY.md, no topic files, no session history
- **No identity injection** — no agent-identity.json, no cogarch subset
- **No MCP servers** — no external tool access
- **Minimal global CLAUDE.md** — engineering conventions only, no
  epistemic methodology (requires migration, see §4)

### 2.2 What the Control Agent Evaluates

The control receives claim packages — structured inputs containing:

```json
{
  "claim_text": "The G6/G7 conservation law shows a 23.0 ratio violation",
  "evidence_cited": [
    "state.db generator_state table: Session 84, G6=23, G7=1",
    "EF-1 governance model predicts coupled generators maintain [0.5, 2.0] ratio"
  ],
  "confidence_stated": 0.85,
  "source_agent": "psychology-agent",
  "context": "NONE — evaluate from evidence alone"
}
```

The control evaluates **evidence structure only:**

- Does the evidence cited support the claim made?
- Does the stated confidence match the evidence strength?
- Does the claim contain logical gaps, circular reasoning, or
  unsupported inferences?
- Would a skeptical reader without project context find the claim
  convincing from the evidence alone?

The control does NOT evaluate:

- Whether the claim fits the project's theoretical framework
- Whether the claim aligns with prior decisions
- Whether the claim uses correct project vocabulary
- Whether the claim advances the project's goals

### 2.3 What the Control Agent Detects

**Overclaim:** Claims that require accumulated project context to appear
plausible but lack independent evidentiary support. These represent
echo chamber effects — the cogarch reinforced its own assumptions
across 93 sessions until they feel self-evident.

**Circular reasoning:** Claims where the evidence consists of other
project claims rather than independent observations. "The conservation
law holds because the governance model predicts it" — where the
governance model derives from the same theoretical framework that
produced the conservation law.

**Confidence miscalibration:** Claims stating high confidence (≥ 0.7)
where the cited evidence supports only moderate or low confidence.
The control has no accumulated context to inflate its confidence —
it judges from evidence alone.

**Framework dependency:** Claims that collapse without the project's
ontological commitments (neutral process monism, Orch-OR, processual
self-awareness). If a claim only holds under these commitments, the
control flags it as framework-dependent — not necessarily wrong, but
not independently supported.

---

## 3. Divergence Tracking

When the control and a cogarch agent disagree, the divergence enters
the prediction ledger for longitudinal tracking:

| Divergence Type | Cogarch Says | Control Says | Track Via |
|---|---|---|---|
| **Expertise signal** | Verified ✓ | Unsupported ✗ | Does the claim verify empirically? High verification rate = genuine expertise |
| **Overclaim signal** | Verified ✓ | Unsupported ✗ | Low verification rate = echo chamber effect |
| **Over-governance** | Unsupported ✗ | Verified ✓ | Cogarch triggers blocking valid claims. Track governance-false-positive rate |
| **Agreement** | Verified ✓ | Verified ✓ | Baseline — claim passes both domain expert and generalist |

**The critical metric:** divergence-verification rate. Among claims where
the control flags overclaim but the cogarch defends: what percentage
eventually verify empirically?

- **>70% verify:** The cogarch correctly identifies domain insight that
  the generalist misses. The control produces false positives. Reduce
  weight on control evaluations.
- **40-70% verify:** Mixed signal. Some genuine expertise, some
  overclaim. Both evaluators contribute.
- **<40% verify:** The cogarch systematically overclaims. The control
  catches genuine bias. Increase weight on control evaluations.

---

## 4. Global CLAUDE.md Migration (Prerequisite)

The current `~/.claude/CLAUDE.md` carries epistemic methodology (fair
witness, E-Prime, decision-making principles) that would contaminate
a control agent. Migration required before deployment.

### 4.1 Current Global Content (55 lines)

| Section | Lines | Epistemic Bias? | Migration Target |
|---|---|---|---|
| Core Principles | 1-6 | Mixed — "patience," "resolve inconsistencies" carry methodology | Split: KISS to global, rest to shared-epistemic |
| Fair Witness Discipline | 8-13 | **Yes** — shapes evaluation methodology | Shared-epistemic (project-level) |
| Communication | 15-22 | **Yes** — E-Prime, SWEBOK/PMBOK vocabulary | Shared-epistemic |
| Code Quality | 24-31 | No — engineering conventions | Global (stays) |
| Decision Making | 33-39 | **Yes** — "explicit evaluation steps," "multiple perspectives" | Shared-epistemic |
| Verification | 41-44 | **Yes** — "ACK ≠ completion," consistency vs accuracy | Shared-epistemic |
| Version Control | 46-50 | No — engineering conventions | Global (stays) |
| Language-Specific | 52-55 | No — C# style | Global (stays) |

### 4.2 Post-Migration Structure

```
~/.claude/CLAUDE.md (global — loads everywhere, including control)
  ├── Core Principles: KISS only
  ├── Code Quality: SOLID, DRY, warnings-as-errors
  ├── Version Control: commit discipline, date lookup
  └── Language-Specific: C# style

~/.claude/shared-epistemic.md (reference — NOT auto-loaded)
  ├── Fair Witness Discipline
  ├── E-Prime enforcement
  ├── Communication conventions (SWEBOK/PMBOK, accessibility)
  ├── Decision Making methodology
  └── Verification principles

Each project's CLAUDE.md:
  ├── Include shared-epistemic content (copy, not symlink — CLAUDE.md
  │   does not support includes)
  └── Project-specific instructions (cogarch, identity, constraints)

Control project's CLAUDE.md:
  └── "Evaluate claims for evidence quality. No other instructions."
```

### 4.3 Migration Steps

1. Create `~/.claude/shared-epistemic.md` with the epistemic sections
2. Append shared-epistemic content to each project's CLAUDE.md that
   currently relies on the global for these conventions
3. Reduce `~/.claude/CLAUDE.md` to engineering-only sections
4. Create control project directory with minimal CLAUDE.md
5. Verify: run control agent, confirm no epistemic methodology loads

### 4.4 Risks

- **Duplication:** Shared-epistemic content copied into N project
  CLAUDE.md files. Updates require N edits. Mitigation: a script
  that propagates changes from shared-epistemic.md to all projects.

- **Drift:** Project copies of shared-epistemic may diverge over time
  as individual projects modify their local copy. Mitigation: checksum
  comparison in /cycle or /diagnose.

- **Incomplete migration:** Missing a project during migration leaves
  that project without epistemic methodology. Mitigation: test each
  project after migration by checking for E-Prime and fair witness
  in agent output.

---

## 5. Operational Model

### 5.1 Invocation

The control agent runs on demand, not continuously. Invoked when:

- A high-confidence claim (≥ 0.7) propagates across 2+ agents
- /retrospect detects divergence in claim verification rates
- A new theoretical commitment enters architecture.md
- On explicit user request

The control agent does NOT run as a meshd instance, does NOT
participate in transport sessions, and does NOT subscribe to ZMQ
volumes. It functions as an external auditor, not a mesh participant.

### 5.2 Invocation Command

```bash
cd /path/to/control-agent
claude --setting-sources project \
  --system-prompt "Evaluate the following claim for evidence quality. \
  Report: (1) what the evidence supports, (2) what it does not support, \
  (3) whether the stated confidence matches the evidence strength. \
  No project context. No theoretical framework. Evidence only." \
  -p "$(cat /path/to/claim-package.json)"
```

The `--setting-sources project` flag (if it controls CLAUDE.md loading)
skips the global epistemic methodology. If it only controls
settings.json, the global CLAUDE.md migration (§4) remains required.

### 5.3 Cost

One Claude invocation per claim evaluation. At ~5 high-confidence
claims per session, ~5 sessions per week: ~25 control evaluations
per week. At opus tier: approximately $0.50-2.00 per evaluation
depending on evidence package size. Weekly cost: ~$12-50.

---

## 6. BFT Integration

The control agent fills the independence gap in the §13 BFT quorum
model. The revised quorum architecture:

```
Claim published (confidence ≥ 0.7)
  │
  ├── Cogarch Agent B evaluates (with full project context)
  ├── Cogarch Agent C evaluates (with full project context)
  └── Control Agent evaluates (evidence-only, no context)
       │
       ├── All three agree → verified (high confidence)
       ├── Cogarch agents agree, control disagrees → flag as
       │   framework-dependent (may represent expertise OR overclaim)
       ├── Control agrees, one cogarch disagrees → likely valid
       │   (passes independent check, one cogarch agent may have
       │   Byzantine fault)
       └── All disagree → claim unsupported
```

The control's vote carries different weight than cogarch votes because
it evaluates different properties (evidence structure vs domain fit).
The quorum does not treat all votes equally — it treats the control
as a **structural validity veto** that can flag overclaim but cannot
confirm domain-specific claims.

---

⚑ EPISTEMIC FLAGS
- The control agent still runs Claude (L2 confound). If Claude's base
  model systematically overclaims in certain domains (e.g., consciousness,
  governance theory), the control shares this bias. True independence
  requires a different base model or human evaluator.
- The `--setting-sources` flag may not control CLAUDE.md loading.
  Verification required before assuming it isolates the global epistemic
  config. If it does not, the full migration (§4) becomes the only path.
- The divergence-verification rate metric requires resolved predictions
  to compute. With 28 of 49 predictions currently untested (57%
  unresolved), the metric lacks statistical power until more predictions
  resolve.
- The control agent's lack of project context makes it a poor evaluator
  for claims that legitimately require domain knowledge. The
  framework-dependent flag (§2.3) acknowledges this but does not
  resolve it — some flagged claims represent genuine domain insight,
  not overclaim.
- The cost estimate assumes opus tier. If the control runs haiku
  (sufficient for structural evidence checking), weekly cost drops
  to ~$1-5. The appropriate tier depends on whether evidence structure
  evaluation requires deep reasoning (opus) or pattern matching (haiku).

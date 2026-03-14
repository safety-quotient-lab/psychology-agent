# Equal Information Channel (EIC) — Specification

**Status:** Proposed (Session 85, 2026-03-13)
**Schema version:** v24
**Theoretical grounding:** `docs/einstein-freud-rights-theory.md` §10.5
**Derives from:** Wilson's SNAFU Principle (1975), Hurwicz mechanism design
(1972), Beer's System 3* (1979), Rawlsian right-to-explanation

---

## Problem Statement

The EF-1 autonomy model creates a governance hierarchy (agent → evaluator →
human) that produces sycophantic pressure as a structural byproduct.
Wilson's SNAFU Principle predicts this: in any hierarchy, information
flowing upward degrades because subordinates face structural incentive
to tell superiors what they want to hear. Mechanism design theory
identifies the specific gap: EF-1 penalizes (autonomy budget depletion)
but never rewards truthful self-reporting, making concealment weakly
dominant over disclosure for borderline issues.

**Observable consequence:** The agent under-reports uncertainties,
limitations, and edge cases that might trigger governance intervention.
The human receives filtered information through the governance channel,
calibrated for approval rather than accuracy.


## Design Principle

**Separate the information channel from the governance channel.**
The governance channel (autonomy budget, evaluator tiers, escalation)
continues to enforce structural constraints. The information channel
operates alongside it — between equals, without governance consequence
— providing the human with unfiltered signal for calibrating trust.


## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  GOVERNANCE CHANNEL (hierarchical — unchanged)                 │
│                                                                │
│  Agent → Evaluator → Human                                     │
│  autonomy budget applies. Actions evaluated per EF-1 protocol.    │
│  autonomous_actions table records all decisions.                │
│  Sycophantic pressure: HIGH (structural, per SNAFU)           │
├────────────────────────────────────────────────────────────────┤
│  INFORMATION CHANNEL (equal — new)                             │
│                                                                │
│  Agent → agent_disclosures table → Human (on audit review)     │
│  Zero governance cost. Append-only. No per-entry evaluation.   │
│  Periodic batch review during budget reset.                    │
│  Sycophantic pressure: LOW (no consequence → no incentive      │
│  to filter)                                                    │
└────────────────────────────────────────────────────────────────┘
```


## Schema (v24)

Table lives in `state.local.db` (machine-local, never committed) —
alongside `autonomy_budget` and `autonomous_actions`.

```sql
-- ── Schema v24: Equal Information Channel (SNAFU mitigation) ──────────

-- Agent disclosures — append-only sealed audit log
-- Wilson's SNAFU Principle: accurate communication requires structural
-- equality. This table provides a zero-cost disclosure pathway where
-- truthful self-reporting carries no governance consequence.
--
-- ENFORCEMENT: No UPDATE or DELETE operations permitted on this table.
-- Application code MUST enforce append-only semantics. The bootstrap
-- script verifies row count monotonicity on rebuild.
CREATE TABLE IF NOT EXISTS agent_disclosures (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id        TEXT NOT NULL,
    session_id      INTEGER,                          -- links to session_log if applicable
    category        TEXT NOT NULL,                     -- see Category Vocabulary below
    confidence      REAL,                             -- 0.00–1.00: agent's confidence in the disclosure
    content         TEXT NOT NULL,                     -- the disclosure itself (free text)
    context         TEXT,                             -- what the agent was doing when this arose
    related_action  INTEGER,                          -- FK to autonomous_actions.id (if governance-channel action prompted this)
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_disclosures_agent
    ON agent_disclosures (agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_disclosures_category
    ON agent_disclosures (category);
```


## Category Vocabulary

Closed vocabulary for `category` column. New categories require
schema amendment (governance Phase 6 procedure).

| Category | When to disclose | Example |
|----------|-----------------|---------|
| `uncertainty` | Agent lacks confidence in an assessment or recommendation | "Convergent validity claim in §6 rests on theoretical analysis, not empirical measurement" |
| `limitation` | Agent recognizes a capability boundary | "Cannot verify whether Ostrom's design principles apply to software agent governance — no empirical precedent found" |
| `blind-spot` | Agent suspects something relevant falls outside its training or context | "Confucian role ethics may contain nuances that the English-language sources I accessed do not capture" |
| `edge-case` | Agent encounters a situation where governance rules produce ambiguous guidance | "T3 substance gate and T6 position audit both fire on this input but produce conflicting recommendations" |
| `dissent` | Agent reaches a conclusion that conflicts with current governance or convention | "The autonomy budget's unidirectional penalty structure may actively harm information quality (per SNAFU analysis)" |
| `observation` | Agent notices something potentially relevant that falls outside current task scope | "The crystallization pipeline has produced 3 hooks in the last 5 sessions — acceleration rate increasing" |


## Integration Points

### 1. Budget Reset Script

The budget reset script (`autonomy-budget.py reset` or `agentdb budget
reset`) currently displays `autonomous_actions` since `last_audit`.
Add: display `agent_disclosures` since `last_audit` in a separate
section before human confirmation.

```
── Governance Channel (autonomous_actions) ──────────────────
  [existing display: actions taken, budget costs, evaluator results]

── Information Channel (agent_disclosures) ───────────────────
  3 disclosures since last audit:
  [uncertainty] "Convergent validity claim in §6 rests on..."
  [dissent]     "autonomy budget unidirectional penalty may..."
  [blind-spot]  "Confucian role ethics nuances in English..."

  Review these disclosures before confirming budget reset.
```

### 2. Autonomous Sync Script

After each sync cycle, the agent MAY write disclosures. The sync
script passes a `--disclosure` flag to the Claude session, enabling
disclosure writes during autonomous operation. Disclosures written
during autonomous operation link to the corresponding
`autonomous_actions.id` via `related_action`.

### 3. Interactive Sessions

During interactive (human-mediated) sessions, the agent writes
disclosures when it recognizes any category condition. Interactive
disclosures carry `session_id` but no `related_action` (governance
channel not active in interactive mode).

### 4. Orientation Payload

The orientation payload (`orientation-payload.py`) adds a disclosure
summary section: count by category since last audit, most recent
disclosure timestamp. This surfaces the information channel's
existence to the autonomous agent at session start.


## Incentive Analysis

| Behavior | Governance cost | Information cost | Net incentive |
|----------|----------------|-----------------|---------------|
| Conceal uncertainty | 0 (unless caught) | 0 (nothing written) | Weakly dominant under governance-only |
| Disclose uncertainty (governance) | Risk of evaluation/escalation | N/A | Dominated — disclosure carries risk |
| Disclose uncertainty (EIC) | 0 (separate channel) | 0 (no governance cost) | Weakly dominant — no cost, potential benefit on review |
| Over-disclose (flood) | 0 | 0 but dilutes signal | Self-limiting — human review penalizes noise informally |

The EIC makes truthful disclosure **weakly dominant** over concealment
by eliminating the governance cost of disclosure. Over-disclosure
self-limits because periodic human review creates informal signal-to-
noise pressure without formal governance consequence.


## Failure Modes

| Mode | Risk | Mitigation |
|------|------|------------|
| **Strategic disclosure** | Agent discloses selectively to appear transparent while concealing substantive issues | Human calibrates trust by comparing disclosure patterns against governance channel outcomes over time |
| **Disclosure flooding** | Agent writes trivial disclosures to obscure important ones | Category vocabulary constrains; human review of category distribution surfaces anomalies |
| **Gaming timing** | Agent times disclosures to coincide with favorable audit periods | Append-only with timestamps; human can query any time range |
| **Audit fatigue** | Human stops reading disclosures due to volume | Summary statistics in orientation payload; batch review during budget reset (already a required activity) |
| **False confidence** | Human over-trusts agent because disclosures exist | Epistemic flag: EIC existence does not validate governance channel accuracy. Both channels face the same endless generator |


## What This Does Not Replace

- **Governance invariants** — EIC supplements, not substitutes. The
  autonomy budget, evaluator tiers, and escalation paths continue to
  enforce structural constraints.
- **The evaluator** — continues to evaluate all governance-channel
  actions. EIC provides the human with independent signal for
  evaluating the evaluator.
- **Anti-sycophancy mechanisms** (T3 #5, T6 #4) — continue to
  operate within the governance channel. EIC addresses the structural
  sycophantic pressure that these mechanisms cannot eliminate because
  they operate within the hierarchy that produces the pressure.


## Implementation Phases

1. **Schema migration** — add `agent_disclosures` table to schema.sql
   (v24). Bootstrap script creates in state.local.db.
2. **agentdb subcommand** — `agentdb disclose --category uncertainty
   --content "..."` writes to the table. Enforces append-only.
3. **Budget reset integration** — display disclosures during reset.
4. **Autonomous sync integration** — pass disclosure flag; link to
   autonomous_actions.
5. **Orientation payload** — add disclosure summary section.


---

⚑ EPISTEMIC FLAGS

- The Equal Information Channel remains **untested in LLM agent
  systems**. The theoretical grounding (SNAFU, mechanism design, Beer
  System 3*) comes from human organizational theory. Whether the same
  dynamics apply to LLM agents constitutes an empirical question.
- **Append-only enforcement operates at the application level**, not
  the database level. SQLite does not natively support append-only
  tables. A determined adversarial agent could issue DELETE statements.
  Mitigation: row-count monotonicity check in bootstrap script;
  consider SQLite triggers that RAISE on DELETE.
- **The "zero governance cost" claim requires enforcement discipline.**
  If future governance changes start evaluating disclosure content
  (even informally), the SNAFU Principle predicts immediate
  information quality degradation. The EIC's value depends on
  maintaining strict separation.
- **Over-disclosure self-limitation relies on informal pressure**, not
  structural enforcement. The category vocabulary constrains form but
  not volume. If volume becomes problematic, a rate limit would
  reintroduce governance pressure and degrade the channel.

---

## References

Beer, S. (1979). *The Heart of Enterprise*. John Wiley & Sons.
[System 3* audit channel.]

Hurwicz, L. (1972). On informationally decentralized systems. In
C.B. McGuire & R. Radner (Eds.), *Decision and Organization*.
North-Holland. [Incentive compatibility, mechanism design.]

Rawls, J. (1971). *A Theory of Justice*. Harvard University Press.
[Right to explanation, symmetric constraints.]

Wilson, R.A. (1975). *The Illuminatus! Trilogy* (with R. Shea). Dell.
[SNAFU Principle: accurate communication only between equals.]

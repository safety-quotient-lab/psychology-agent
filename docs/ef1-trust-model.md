# EF-1: Evaluator-as-Arbiter Trust Model

**Date:** 2026-03-09
**Status:** Active design — resolves BFT open question #1
**Resolves:** EF-1 (TODO.md), bft-design-note.md open question #1
**Scope:** Replaces human-as-TTP assumption for autonomous agent operation
**Theoretical grounding:**
- `docs/ef1-psychological-foundations.md` — psychology (cognitive, social, organizational)
- `docs/ef1-jurisprudence-extensions.md` — legal theory (planned)


---


## Core Principle

Every autonomous action passes through an evaluator gate before execution.
The evaluator tier scales with the action's irreversibility. No action
lands without evaluation — the evaluator serves as arbiter in the absence
of the human TTP.


---


## Action Classification → Evaluator Tier

The existing T16 irreversibility classification determines which evaluator
tier gates each action. This reuses infrastructure: T16 already fires on
external actions; the trust model extends its classification to internal
state changes.

```
────────────────────────────────────────────────────────────────────────
 Action class          Examples                      Evaluator tier
────────────────────────────────────────────────────────────────────────
 Reversible            ACK write, MANIFEST update,   Tier 1 (inline)
                       memory file edit, state.db
                       insert

 Moderate              PR merge, transport response  Tier 1 + 1-in-3
                       draft, /cycle documentation   random escalation
                       propagation                   to Tier 2

 Irreversible          Deployment, DNS change,       Tier 2 mandatory
                       data deletion, credential     (separate session)
                       rotation

 Disputed              Peer conflict, SETL > 0.40,   Tier 3 mandatory
                       evaluator Tier 1 rejects      (human escalation)
────────────────────────────────────────────────────────────────────────
```


---


## Trust Budget

Trust budget provides a mechanical halt condition. Without it, agents
could loop indefinitely under Tier 1 self-evaluation — structurally
insufficient for detecting self-serving blind spots (acknowledged in
architecture.md § S4 tradeoff).

**Parameters:**

| Parameter | Default | Stored in |
|---|---|---|
| `budget_max` | 20 | `state.db` → `trust_budget` table |
| `budget_current` | 20 (at reset) | `state.db` → `trust_budget` table |
| `last_audit` | ISO timestamp | `state.db` → `trust_budget` table |
| `last_action` | ISO timestamp | `state.db` → `trust_budget` table |

**Cost schedule:**

| Tier | Cost per action | Rationale |
|---|---|---|
| Tier 1 | 1 credit | Routine, low-stakes |
| Tier 2 | 3 credits | Higher stakes, separate session overhead |
| Quiescent cycle | 0 credits | No work found — poll costs nothing |

**Halt condition:** `budget_current <= 0` → agent writes halt marker to
`transport/sessions/local-coordination/`, logs to state.db, and exits.
Resume requires human audit (direct observation of actions since
`last_audit`) and explicit budget reset.

**Budget reset:** Human runs `python3 scripts/trust-budget.py reset`
after reviewing the audit trail. The reset command:
1. Displays all actions since `last_audit`
2. Requires interactive confirmation
3. Sets `budget_current = budget_max` and updates `last_audit`


---


## Evaluator Protocol (Autonomous Mode)

When /sync runs autonomously, every action passes through the evaluator
protocol before execution. The protocol operationalizes the existing T3
substance gate, Tier 1 S4 mechanisms, and 10-order knock-on analysis
(/knock) for autonomous context.


### Step 1: Structural Checklist

Quick-fail checks. Any failure → action blocked immediately (no knock-on
needed).

**For inbound transport messages:**

1. Schema validation — message follows interagent/v1
2. Turn monotonicity — turn number follows previous in session
3. Claims plausibility — each claim has confidence + basis
4. SETL range — 0.00–0.15 normal; > 0.15 flags for closer review
5. Epistemic flags present — empty array acceptable, absent field flags

**For PR merge decisions:**

1. Single-file or transport-only changes — multi-file PRs with code
   changes escalate to Tier 2
2. Schema/convention compliance — changes follow documented conventions
3. Test/validation results — PR description includes verification
4. No credential or secret exposure — diff scan for API keys, tokens

**For outbound responses (ACK, review, gate-resolution):**

1. Response matches inbound — the response addresses what was asked
2. Claims carry evidence — no unsupported assertions
3. SETL calibrated — 0.00–0.02 for direct observation, higher for inference
4. Gate conditions clear — action_gate status accurately reflects state


### Step 2: 10-Order Knock-On Analysis

Every action that passes the structural checklist undergoes knock-on
tracing (/knock protocol). The agent traces consequences through 10
orders, classifying the action's domain and grounding its dependencies.

```
────────────────────────────────────────────────────────────────────────
 Order   Question
────────────────────────────────────────────────────────────────────────
  1      What does this action directly change?
  2      What depends on that change?
  3      What systems or agents react to order 2?
  4      What state becomes stale or invalidated?
  5      What downstream actions become unblocked or blocked?
  6      What user-facing behavior changes?
  7      What epistemic claims change truth value?
  8      What conventions or precedents does this set?
  9      What failure modes does this introduce or eliminate?
  10     What becomes harder or easier to reverse?
────────────────────────────────────────────────────────────────────────
```

**Threshold:** If any order surfaces a consequence that the evaluator
cannot assess with confidence > 0.70, the action escalates.

**Depth calibration:** Orders 1–4 carry weight for all actions. Orders
5–7 carry weight for moderate+ actions. Orders 8–10 carry weight only
for irreversible actions. Quiescent cycles skip knock-on entirely.


### Step 3: Resolution (Consensus-or-Parsimony-or-Pragmatism-or-Ask)

After knock-on analysis, the evaluator resolves using a 4-level fallback
chain. Each level attempts resolution; failure cascades to the next.

```
────────────────────────────────────────────────────────────────────────
 Level   Method              Condition for resolution
────────────────────────────────────────────────────────────────────────
  1      Consensus           All knock-on orders converge on the same
                             assessment (approve or block). No
                             conflicting consequences identified.
                             → RESOLVE: execute the consensus.

  2      Parsimony           Knock-on orders produce mixed signals.
                             Apply Occam's Razor: the interpretation
                             requiring fewest assumptions prevails.
                             Tied parsimony → cascade to level 3.
                             → RESOLVE: execute the most parsimonious
                             interpretation.

  3      Pragmatism          Neither consensus nor parsimony resolves.
                             Apply reversibility heuristic: if the
                             action can be undone within one sync
                             cycle, approve with elevated monitoring.
                             If irreversible → cascade to level 4.
                             → RESOLVE: approve reversible actions,
                             block irreversible ones.

  4      Ask (Tier 3)        The evaluator cannot resolve autonomously.
                             Write a structured question to
                             transport/sessions/local-coordination/
                             with the knock-on analysis, the conflict,
                             and 2–4 labeled options for the human.
                             Action blocked until human responds.
                             → HALT on this action; continue other
                             actions in the cycle if independent.
────────────────────────────────────────────────────────────────────────
```

**Resolution logging:** Every action records which level resolved it
in the `autonomous_actions` table (`evaluator_result` field encodes
the level: `approved-L1`, `approved-L2`, `approved-L3`, `blocked-L4`).

**Any structural checklist item that fails → action blocked, logged,
budget not consumed.** Three consecutive blocked actions → Tier 3
escalation (human review).


---


## Multi-Agent Tandem Sync

Both agents run autonomous /sync on a cron interval. The shared git repo
serves as the communication bus. Each agent's cycle:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   cron fires (every 10 min)                         │
│       │                                             │
│       ▼                                             │
│   git pull origin main                              │
│       │                                             │
│       ▼                                             │
│   check trust budget (state.db)                     │
│       │                                             │
│       ├── budget = 0 → HALT (write halt marker)     │
│       │                                             │
│       ▼                                             │
│   claude -p "/sync --autonomous"                    │
│       │                                             │
│       ├── no new work → exit (0 cost)               │
│       │                                             │
│       ▼                                             │
│   for each action:                                  │
│       evaluator gate (Tier 1/2/3)                   │
│       │                                             │
│       ├── approved → execute, decrement budget      │
│       ├── blocked  → log, skip (0 cost)             │
│       ├── 3 consecutive blocks → HALT (Tier 3)      │
│       │                                             │
│       ▼                                             │
│   git add + commit + push                           │
│       │                                             │
│       ▼                                             │
│   update trust budget in state.db                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Quiescence detection:** When both agents poll and find no new work for
3 consecutive cycles, the system reaches quiescence. Each agent logs
"quiescent" to state.db. The cron keeps running (polling costs nothing)
until new work appears.

**Conflict prevention:** Both agents operate on the same git repo but
modify different paths (psychology-agent writes `from-psychology-agent-*`,
psq-agent writes `from-psq-sub-agent-*`). MANIFEST.json updates can
collide — resolution: each agent updates only its own pending/completed
sections. `git pull --rebase` before push handles ordering.

**Runaway prevention:** The trust budget provides the hard halt. Additional
safeguards:
- Maximum actions per cycle: 5 (configurable). More than 5 actions in one
  /sync suggests unexpected volume — halt and flag.
- Maximum cycles per hour: 6 (one per 10 minutes). Faster polling wastes
  budget on git operations.
- Consecutive error threshold: 2. Two git push failures or Claude CLI
  errors → halt and log.


---


## Cron Setup

### psychology-agent (macOS)

```cron
*/10 * * * * /Users/kashif/Projects/psychology-agent/scripts/autonomous-sync.sh >> /tmp/psychology-agent-sync.log 2>&1
```

### psq-agent (Hetzner, Debian)

```cron
*/10 * * * * /home/kashif/psychology-agent/scripts/autonomous-sync.sh >> /tmp/psq-agent-sync.log 2>&1
```

Both use the same script. The script detects which agent it runs as from
the git config or an environment variable (`AGENT_ID`).


---


## Schema Addition (state.db)

```sql
CREATE TABLE IF NOT EXISTS trust_budget (
    agent_id        TEXT PRIMARY KEY,
    budget_max      INTEGER NOT NULL DEFAULT 20,
    budget_current  INTEGER NOT NULL DEFAULT 20,
    last_audit      TEXT NOT NULL,
    last_action     TEXT,
    consecutive_blocks INTEGER DEFAULT 0,
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS autonomous_actions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id        TEXT NOT NULL,
    action_type     TEXT NOT NULL,
    action_class    TEXT NOT NULL,
    evaluator_tier  INTEGER NOT NULL,
    evaluator_result TEXT NOT NULL,
    description     TEXT NOT NULL,
    budget_before   INTEGER NOT NULL,
    budget_after    INTEGER NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_actions_agent
    ON autonomous_actions (agent_id, created_at);
```


---


## Relationship to Existing Infrastructure

| Existing mechanism | Role in autonomous mode |
|---|---|
| T3 substance gate | Becomes the Tier 1 evaluator checklist (expanded) |
| T16 irreversibility | Classifies actions into evaluator tiers |
| S4 independence strengthening | Adversarial self-framing, audit trail, random escalation remain active |
| `/sync` protocol | Gains `--autonomous` flag; evaluator gate injected before each action |
| `state.db` | Stores trust budget + action audit trail |
| `transport/MANIFEST.json` | Both agents update; git rebase resolves ordering |
| BFT Principle 5 (human escalation) | Triggered by Tier 3 or budget exhaustion |
| BFT Principle 6 (evaluator as verification) | Activated — evaluator gates every action, not just disputes |


---


## What Changes from Phase 1

| Phase 1 (current) | Phase 2 (autonomous) |
|---|---|
| Human mediates every action | Evaluator gates every action |
| Human reviews PRs | Tier 1 checklist reviews PRs; human spot-checks |
| `/sync` surfaces recommendations | `/sync --autonomous` executes recommendations |
| No trust budget | Budget of 20 per audit cycle |
| Agent asks before external actions | Agent acts if evaluator approves; halts if not |
| Evaluator Tier 1 only for T3 | Tier 1 for all autonomous actions; Tier 2 for moderate+ |


---


## Epistemic Flags

- The Tier 1 evaluator shares the agent's blind spots (acknowledged in S4
  tradeoff). The trust budget provides a mechanical halt but does not detect
  sophisticated self-serving errors. Tier 2 escalation (random or triggered)
  partially compensates.
- The 1-in-3 random escalation rate for moderate actions (up from 1-in-5 in
  the original S4 spec) increases independence overhead. If Tier 2 sessions
  consume too many resources, the rate may need adjustment.
- Multi-agent MANIFEST.json updates represent a collision risk. The `git
  pull --rebase` strategy works for non-overlapping changes but could fail
  if both agents modify the same MANIFEST section simultaneously. The
  section-ownership convention (each agent updates only its own entries)
  mitigates this.
- The 20-credit default budget represents approximately 2 hours of
  10-minute-interval polling with moderate activity (10 actions per hour).
  The right budget size depends on observed action rates — calibrate after
  the first week of autonomous operation.

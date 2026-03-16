---
name: retrospect
description: Retrospective pattern generator — scan accumulated work for predictions, wins, recurrences, and carryover patterns. The yin generator's institutional form.
user-invocable: true
argument-hint: "[scan-type] — predictions | wins | recurrence | carryover | full (default: full)"
---

# /retrospect — Retrospective Pattern Generator

Systematically review accumulated work across sessions for patterns that
individual sessions missed. The evaluative complement to creative output.

**Design principle:** The cogarch captures lessons in-moment (T10) and
post-session (/cycle Step 8b). /retrospect operates at the cross-session
level — finding patterns that emerge only from reviewing accumulated history.

**When to run:**
- Every 5 sessions (periodic evaluative scan)
- When /diagnose surfaces anomalies that suggest deeper patterns
- When the user asks "what have we learned?" or "what patterns do you see?"
- After landmark sessions that produced large amounts of creative output

**Wu wei alignment:** /retrospect implements the yin generator's institutional
form. Creative sessions (yang) produce work. /retrospect evaluates that work
for patterns. The coupled generators principle demands both persist.

**Spec:** `docs/retrospective-pattern-generator-spec.md`

---

## Arguments

| Argument | What it scans | Output |
|----------|-------------|--------|
| `predictions` | lab-notebook, journal, ideas for hypotheses → outcomes | Prediction ledger (confirmed/refuted/untested) |
| `wins` | lab-notebook, journal, git log for unrecorded accomplishments | Win list with lesson candidates |
| `recurrence` | lessons.md entries checked against later sessions | Updated recurrence counters + promotion candidates |
| `carryover` | TODO.md for chronic deferrals (3+ sessions) | Carryover analysis with recommendations |
| `transport` | Outbound messages for oversights, stale sessions, untracked commitments | Transport oversight report |
| `full` | All five scans (default) | Complete retrospective report |

---

## Scan Protocol

### 1. Prediction Audit (`predictions`)

Scan for explicit predictions/hypotheses and their outcomes.

**Sources:** lab-notebook.md, journal.md, ideas.md, study protocols,
EIC disclosures (state.local.db agent_disclosures).

**Pattern:** `predicted X → observed Y → delta Z`

**Language signals:** "should produce", "expect", "predict", "hypothesis",
"will result in", "the empirical question", "testable prediction".

**For each prediction found:**

```
| Session | Prediction | Outcome | Classification | Delta |
```

Classifications: `confirmed` / `partially-confirmed` / `refuted` / `untested`

**Record to prediction_ledger** (if table exists):
```bash
agentdb predict --session-id N --prediction "..." --domain "..." \
  --outcome "confirmed|refuted|untested" --detail "..."
```

### 2. Win Discovery (`wins`)

Scan for accomplishments that produced no corresponding lessons.md entry.

**Sources:** lab-notebook.md (artifacts created), journal.md (reframes),
git log (new files, significant refactors).

**Win types:**
- `architecture-win` — infrastructure that solved a class of problems
- `theory-win` — reframe or insight that changed understanding
- `empirical-win` — data confirmed or clearly refuted a hypothesis
- `process-win` — workflow improvement
- `integration-win` — bridging two previously separate domains

**For each unrecorded win:** draft a lesson candidate (frontmatter +
description) for review. Do NOT auto-write to lessons.md — surface to
user for approval (T3 substance gate).

### 3. Recurrence Analysis (`recurrence`)

For each existing lessons.md entry, check whether the pattern recurred
since `last_seen`.

**Sources:** lab-notebook entries after `last_seen`, journal, EIC disclosures.

**If recurrence found:**
- Increment `recurrence` counter in frontmatter
- Update `last_seen` date
- If recurrence >= 3 and promotion_status = null → set to `candidate`
- Report what triggered the recurrence

### 4. Carryover Pattern Analysis (`carryover`)

Scan TODO.md for items persisting across 3+ sessions.

**For each chronic carryover:**
- Why it keeps deferring (blocked, deprioritized, scope creep)
- Recommendation: keep / retire to ideas.md / escalate / decompose

---

### 5. Transport Oversight (`transport`)

Scan outbound transport messages for oversights — undelivered messages,
unanswered directives, stale conversations, and commitments made but
not tracked.

**Sources:** transport/sessions/*/from-psychology-agent-*.json,
state.db transport_messages table, MANIFEST.json files.

**Oversight types:**

- `undelivered` — message committed locally but never delivered to target
  repo (no corresponding PR or HTTP POST). The transport delivery gap
  that ops identified in Session 92.
- `unanswered-directive` — command-request with ack_required=true sent
  but no response received within expected window.
- `stale-session` — active session with no messages in 7+ days.
- `untracked-commitment` — message content promises a deliverable ("will
  deploy", "will send", "next session") with no corresponding TODO item.
- `claim-without-verification` — claims extracted from transport but
  never verified (claims.verified = FALSE for 7+ days).

**For each oversight found:**

```
| Session | Turn | Type | Description | Recommended action |
```

**How to scan:**

1. List all from-psychology-agent-*.json files across all sessions
2. For each outbound message:
   a. Check ack_required — if true, verify a response exists (higher turn
      from the target agent in the same session)
   b. Check message_type — if command-request, verify response received
   c. Scan content for commitment language ("will", "next session",
      "deploying", "sending") and cross-reference TODO.md
3. For each active session (MANIFEST status != closed/archived):
   a. Check last message date — flag if older than 7 days
4. Query state.db for unverified claims older than 7 days

---

## Output Format

```markdown
# Retrospective Pattern Generator — Scan Report
Date: YYYY-MM-DDTHH:MM TZ
Sessions scanned: 1–N
Scan type: full | predictions | wins | recurrence | carryover

## Prediction Audit
| # | Session | Prediction | Classification | Delta |
[table]

Track record: X/Y confirmed (Z%), W refuted, V untested
Domain accuracy: [domain]: X/Y, [domain]: X/Y

## Win Discovery
| # | Session | Win type | Description | Lesson exists? |
[table]

Unrecorded wins: N (lesson candidates drafted below)

## Recurrence Analysis
| Lesson | Original | Recurrences | Last seen | Promotion? |
[table]

Promotion candidates (recurrence >= 3): [list]

## Carryover Patterns
| Item | First seen | Sessions deferred | Recommendation |
[table]

Chronic deferrals (5+ sessions): [list]

## Transport Oversight
| Session | Turn | Type | Description | Recommended action |
[table]

Undelivered: N | Unanswered directives: N | Stale sessions: N | Untracked commitments: N

## ⚑ Epistemic Flags
[uncertainties about the scan itself]
```

---

## Integration

- **T1 surface:** After scanning, the most relevant findings appear in the
  orientation payload (via `agentdb disclose-summary` + prediction_ledger
  queries). See RPG spec §Surface Protocol.
- **/cycle interaction:** /cycle Step 8b catches in-session lessons.
  /retrospect catches cross-session patterns. They complement, not duplicate.
- **EIC interaction:** EIC disclosures (especially `dissent` and `uncertainty`
  categories) feed the prediction audit and recurrence analysis.
- **Feedback loops:** Run `scripts/feedback-loops.sh` as part of the `full`
  scan. The script combines trigger effectiveness, expectation track record,
  EIC summary, work carryover, and lesson promotion into one output.
  ```bash
  # During /retrospect full:
  bash scripts/feedback-loops.sh
  ```

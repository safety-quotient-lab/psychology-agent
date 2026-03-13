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
| `full` | All four scans (default) | Complete retrospective report |

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

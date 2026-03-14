---
name: retrospect
description: Retrospective pattern generator — audit predictions, wins, recurrence, generator balance.
user-invocable: true
argument-hint: "[full | predictions | wins | balance | quick]"
allowed-tools: Read, Grep, Glob, Bash
---

# Retrospect — Retrospective Pattern Generator (Operations Agent)

Audit past predictions, discover unrecorded wins, check lesson recurrence,
and assess generator balance (creative vs evaluative work). Adapted from
psychology-agent's RPG methodology (Session 85).

---

## Trigger Phrases

- "retrospective" / "look back" / "what did we learn?"
- "rebalance" / "are we yang-dominant?"
- "audit predictions" / "check lessons"

---

## Arguments

| Argument | Scope |
|---|---|
| *(empty)* or `full` | All checks below |
| `predictions` | Audit predictions from prior sessions |
| `wins` | Discover unrecorded wins |
| `balance` | Generator balance assessment only |
| `quick` | Balance check + top 3 findings |

---

## Procedure

### 1. Gather Session History
- Read `git log --oneline -50` for recent commit history
- Read private memory: `lab-notebook.md`, `lessons.md`, `journal.md`
- Read `plan.md` for completed phases and open items

### 2. Audit Predictions (full or predictions mode)
- Scan lab-notebook for claims, predictions, or expectations from prior sessions
- For each prediction, classify:
  - **Confirmed** — prediction held true
  - **Partial** — partially correct
  - **Refuted** — prediction proved wrong
  - **Untested** — never verified
- Calculate confirmation rate

### 3. Discover Unrecorded Wins (full or wins mode)
- Scan git log for completed work not reflected in plan.md or lab-notebook
- Check transport sessions for resolved items not marked as wins
- Look for infrastructure improvements that happened silently
- Count: recorded wins vs discovered wins

### 4. Lesson Recurrence (full mode)
- Read `lessons.md` — check each lesson for recurrence in recent work
- Lessons that recurred → candidates for convention promotion (wu wei crystallization)
- Lessons with 3+ recurrences → recommend CLAUDE.md convention
- Lessons with 0 recurrences in 5+ sessions → candidates for retirement

### 5. Generator Balance Assessment
- Classify recent sessions as yang (creative/building) or yin (evaluative/auditing):
  - **Yang:** new features, new endpoints, new transport sessions, SDK expansion
  - **Yin:** pattern generator runs, transport integrity checks, vocabulary audits,
    credential scans, stale session pruning, consistency fixes
- Count yang vs yin sessions in the last 5
- If ratio exceeds 4:1 in either direction, flag imbalance
- Recommend: what type of work should the next session prioritize?

---

## Output Format

```
## Retrospective — {timestamp}

### Predictions Audit
- Confirmed: {n} | Partial: {n} | Refuted: {n} | Untested: {n}
- Confirmation rate: {pct}%
- {notable findings}

### Unrecorded Wins
- Discovered: {n} wins not in lab-notebook
- {list}

### Lesson Recurrence
- Recurring (promote): {list}
- Dormant (retire): {list}

### Generator Balance
- Last 5 sessions: {n} yang, {n} yin
- Balance: {BALANCED | YANG-DOMINANT | YIN-DOMINANT}
- Recommendation: {next session type}

⚑ EPISTEMIC FLAGS
- {any limitations — e.g., prediction audit limited to sessions in memory}
```

---

## Post-Retrospect

- Update `lessons.md` with new lessons discovered
- Promote recurring lessons to CLAUDE.md conventions per crystallization thresholds
- Retire dormant lessons to an `ideas.md` archive
- Update plan.md if balance recommendation changes priorities

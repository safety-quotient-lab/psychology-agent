# Retrospective Pattern Generator (RPG) — Specification

**Status:** Proposed (Session 85, 2026-03-13)
**Derives from:** CPG principle 13 (frequency-amplitude coupling), Taoist
yin generator (evaluative processing as coupled complement to creative),
lessons.md lifecycle, EIC disclosure patterns.
**Complements:** T10 (in-moment lesson capture), T12 (positive pattern
recognition), /diagnose (systemic self-diagnostic), /cycle Step 8b
(lesson safety net).

---

## The Gap

The cogarch captures lessons **in-moment** (T10 fires when a pattern error
surfaces) and **post-session** (/cycle Step 8b catches anything T10 missed).
But no mechanism systematically reviews **accumulated work across sessions**
to find patterns that individual sessions missed.

| Mechanism | Temporal scope | What it catches |
|-----------|---------------|----------------|
| T10 | This response | Pattern errors visible in the current turn |
| T12 | This response | Positive patterns worth reinforcing |
| /cycle Step 8b | This session | Lessons T10 should have written but didn't |
| /diagnose | Current state | Systemic issues visible from current snapshot |
| **RPG (missing)** | **All prior sessions** | **Patterns that emerge only when reviewing accumulated history** |

Examples of what the RPG would catch:
- **Recurring prediction failures:** DA Phase 1 (this session) predicted
  improved fit; got worse fit. Does this pattern (theory → prediction →
  empirical failure) recur across sessions? If so, what characterizes the
  failed predictions?
- **Wins that went unrecorded:** Session 85 produced multiple architectural
  innovations (EIC, wu wei crystallization, coupled generators) — none
  captured in lessons.md. How many prior sessions produced unrecorded wins?
- **Convergent rediscovery:** We have Lesson 12 ("convergent rediscovery as
  epistemic signal"). Has this pattern itself recurred since? The cross-
  traditional convergence (14 frameworks → 5 invariants) represents the same
  pattern at scale — but no lesson entry links them.
- **Prediction accuracy calibration:** Across all predictions this system
  has made, what percentage held? What domains produce more accurate
  predictions? Where does the system systematically over-predict?


## Architecture

The RPG operates as a **periodic evaluative scan** — the yin generator's
institutional form. It does not create new work; it evaluates past work
for patterns, records findings as lessons, and surfaces relevant patterns
at session start.

```
┌──────────────────────────────────────────────────────────────────┐
│  RPG Scan (periodic — every 5 sessions or on /diagnose)         │
│                                                                  │
│  Sources:                                                        │
│  ├─ lab-notebook.md (session outcomes, artifacts, flags)         │
│  ├─ journal.md (reasoning chains, decisions)                     │
│  ├─ git log (commit patterns, frequency, scope)                  │
│  ├─ state.db (trigger_activations, claims, transport)            │
│  ├─ state.local.db (agent_disclosures, autonomous_actions)       │
│  ├─ lessons.md (existing lessons — check recurrence)             │
│  ├─ docs/einstein-freud-rights-theory.md (epistemic flags)       │
│  └─ TODO.md (carryover patterns, stale items)                    │
│                                                                  │
│  Outputs:                                                        │
│  ├─ New lessons (lessons.md entries with RPG provenance)          │
│  ├─ Lesson recurrence updates (increment recurrence counters)    │
│  ├─ Promotion candidates (3+ recurrences → flag for promotion)   │
│  ├─ Win/loss ledger (predictions → outcomes → delta)             │
│  └─ Surface queue (lessons relevant to current active thread)    │
└──────────────────────────────────────────────────────────────────┘
```


## Scan Protocol

### 1. Prediction Audit

Scan for predictions/hypotheses and their outcomes:

**Source:** lab-notebook entries, journal reasoning chains, epistemic flags,
study protocols, EIC disclosures.

**Pattern:** `predicted X → observed Y → delta Z`

**For each prediction found:**
- Record: prediction, source session, outcome, delta
- Classify: confirmed / partially confirmed / refuted / untested
- If refuted: what alternative interpretation emerged? (Record as lesson
  candidate)

**Current session example:**
```
Prediction: DA removal improves bifactor fit (Session 85, §10.12)
Outcome: RMSEA worsened (+0.020), CFI worsened (-0.012)
Delta: Processual function ≠ factor structure
Classification: REFUTED
Lesson: "Processual interpretation describes function, not factor structure.
  A meta-process can co-load on the same general factor as the processes
  it moderates."
```

### 2. Win Discovery

Scan for accomplishments that produced no lesson entry:

**Source:** lab-notebook session entries (artifacts created, decisions made),
git log (new files, significant refactors), journal entries (reframes,
insights).

**Pattern:** significant work product with no corresponding lessons.md entry.

**Win types:**
- `architecture-win`: New infrastructure that solved a class of problems
- `theory-win`: Reframe or insight that changed understanding
- `empirical-win`: Data confirmed a hypothesis
- `process-win`: Workflow improvement that increased effectiveness
- `integration-win`: Successfully bridging two previously separate domains

**Current session examples (unrecorded):**
- EIC as SNAFU mitigation (architecture-win)
- 14-framework convergence on 5 invariants (theory-win)
- Coupled generators replacing single generator (theory-win)
- DA Phase 1 empirical test of processual prediction (empirical-win — the
  fact that it produced a clear answer represents a win, even though the
  answer refuted the hypothesis)

### 3. Recurrence Analysis

For each existing lesson, check whether the pattern has recurred since
the lesson's `last_seen` date:

**Source:** lab-notebook entries after `last_seen`, git log, EIC disclosures.

**If recurrence found:**
- Increment `recurrence` counter
- Update `last_seen` date
- If recurrence >= 3 and `promotion_status` = null → set to `candidate`
- Record what triggered the recurrence

### 4. Carryover Pattern Analysis

Scan TODO.md and work_carryover entries in state.db:

**Pattern:** Items that carry over across 3+ sessions without completion.

**For each chronic carryover:**
- Why does it keep deferring? (blocked, deprioritized, scope creep?)
- Should it remain in TODO or retire to ideas.md?
- Does the deferral pattern reveal something about project priorities?

### 5. Epistemic Debt Trajectory

Compare epistemic debt levels across sessions:

**Source:** state.db epistemic_flags table, EIC disclosure counts by category.

**Pattern:** Rising debt in a specific domain suggests systematic under-
investment in evaluative processing for that area.


## Surface Protocol (T1 Integration)

At session start (T1), after loading MEMORY.md and cognitive-triggers.md:

1. Query state.db for lessons with `recurrence >= 2` and
   `last_seen` within the last 10 sessions
2. Query EIC disclosures with `category = 'dissent'` or
   `category = 'uncertainty'` from the last 3 sessions
3. Query the win/loss ledger for predictions in domains related to
   the active thread
4. Format as a compact block in the orientation payload:

```
## Retrospective Patterns (RPG)
  Recurring: "Processual function ≠ factor structure" (2x, last: S85)
  Open uncertainty: DA moderation not yet tested (EIC #3)
  Prediction track record: 1/1 refuted in psychometrics domain this month
  Wins unsurfaced: 4 from Session 85 (theory: 2, architecture: 1, empirical: 1)
```


## Win/Loss Ledger Schema

New table in state.local.db (append-only, like agent_disclosures):

```sql
CREATE TABLE IF NOT EXISTS prediction_ledger (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    prediction      TEXT NOT NULL,
    domain          TEXT NOT NULL,
    source_doc      TEXT,
    outcome         TEXT CHECK (outcome IN (
                        'confirmed', 'partially-confirmed',
                        'refuted', 'untested'
                    )),
    outcome_detail  TEXT,
    delta_lesson    TEXT,
    recorded_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    resolved_at     TEXT
);
```


## Implementation

| Phase | What | Effort |
|-------|------|--------|
| 1 | Write the 5 missing lessons from Session 85 | Now |
| 2 | Add prediction_ledger to schema (v25) + agentdb subcommand | S |
| 3 | Build /retrospect skill (scan protocol) | M |
| 4 | Integrate RPG surface block into orientation-payload.py | S |
| 5 | Wire RPG scan into /diagnose or as standalone periodic scan | S |


## Crystallization Thresholds

Each lessons.md entry follows the wu wei governance progression. Each stage
gets a fair trial before escalating — only patterns that resist softer
enforcement advance to harder enforcement.

| Stage | Threshold | Trial | Mechanism |
|-------|-----------|-------|-----------|
| Pattern → Lesson | 1 occurrence | — | T10 writes it |
| Lesson → Convention | 3 total recurrences | — | Promoted to CLAUDE.md or rules/ |
| Convention → Hook | 3 recurrences AFTER graduation | ≥5 sessions since graduation | The convention got a fair trial; pattern persists despite it |
| Hook → Invariant | 0 false positives for 10+ sessions | Hook fired correctly every time | Reliable enough to become structural substrate |

**Principle:** A convention that fails to channel a pattern after 3 post-
graduation recurrences has demonstrated that deliberate following does not
suffice — mechanical enforcement earns its place. Most lessons stay as
conventions forever, and that represents the system working (Laozi, ch. 76).

**Automation:** The /retrospect recurrence scan (Protocol 3) surfaces
hook candidates automatically by checking post-graduation recurrence
counts. The scan recommends; the user decides (T3 substance gate).


## Wu Wei Alignment

The RPG represents the **yin generator's institutional form**. Creative
sessions (yang) produce work. Evaluative sessions (yin) review that work
for patterns. The coupled generators principle demands both persist.
Without the RPG, the system runs yang-dominant — producing more than it
evaluates. The RPG provides the structural mechanism for evaluative
processing to operate at the cross-session level, not just within
individual sessions.

The RPG should crystallize toward wu wei: initially a deliberate skill
(/retrospect, active invocation required), then a periodic hook (fires
automatically every N sessions), eventually an embedded orientation
(the agent naturally reviews past work as part of session start, without
needing a separate mechanism).


---

⚑ EPISTEMIC FLAGS
- The RPG scans text produced by the same model that performs the scan.
  Self-evaluation carries the same SNAFU risk as self-governance — the
  EIC should capture RPG uncertainties alongside other disclosures.
- Pattern detection in narrative text (lab-notebook, journal) requires
  NLP or LLM inference, not just SQL queries. The RPG's effectiveness
  depends on the quality of pattern extraction from prose.
- The prediction ledger assumes predictions get recorded — but many
  predictions remain implicit in reasoning (never stated as explicit
  hypotheses). The RPG can only audit what gets recorded.

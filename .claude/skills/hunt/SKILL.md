# Hunt — Systematic Work Discovery (General Agent)

Find the highest-value next work in the general-purpose psychology agent project.
Aggregates all the ways you'd search for "what's next" into one structured sweep.

---

## Trigger Phrases

This skill matches any of these user intents:
- "what's next?" / "what else?" / "what can we do?"
- "look for orthogonal work" / "find stale work"
- "anything to do while we wait?"
- "what should I focus on?" / "what's highest value?"
- "find work at the edges of context"

---

## Arguments

Parse the argument to determine scope:

| Argument                | Constraint                                                |
|-------------------------|-----------------------------------------------------------|
| *(empty)* or `all`      | Full sweep — all sources, rank by value                   |
| `orthogonal`            | Only surface work that doesn't touch files being modified |
| `stale`                 | Focus on drift and rot — stale docs, dead references      |
| `quick` or `quick wins` | Only items that take <5 minutes                           |
| `blocked`               | Show what's blocked and what would unblock it             |
| `cogarch`               | Focus only on cognitive architecture consistency          |
| `ideas`                 | Surface ideas.md items ready to act on                    |
| `extrapolate` / `deep`  | Go beyond the backlog — mine design/research gaps         |

Multiple constraints can be combined: `orthogonal quick wins`

If argument doesn't match any keyword, treat it as a **domain/topic filter**: run
the full sweep but surface only items relevant to that topic. If truly ambiguous,
default to full sweep and note the interpretation at the top.

---

## Phase 1: Establish Context

Before hunting, understand what's currently in-flight:

1. **Read `TODO.md`** — canonical task backlog
2. **Run `TaskList`** — active task tracker (in-progress = in-flight)
3. **Read `lab-notebook.md`** Current State block — open questions, pending items
4. **Read `MEMORY.md`** at `~/.claude/projects/-home-kashif-projects-psychology/memory/MEMORY.md`
   — active thread, cogarch quick-reference, working principles
5. **Glob `.claude/plans/*.md`** — existing plans (may have unfinished work)

Build a mental model of: **what's active, what's done, what's blocked, what's untouched**.

---

## Phase 2: Scan Sources

Work through each source. For each, extract candidate work items with a rough
value estimate.

### Source 1: TODO.md Backlog

- Extract all unchecked `- [ ]` items
- Note dependencies (does completing item X unblock item Y?)
- Flag items whose prerequisites are now met
- Note items that have been sitting without a blocking reason — these may be stale

### Source 2: Task List

- Check for pending tasks not yet started
- Check for blocked tasks whose blockers may have resolved
- Check for stale in-progress tasks (started but abandoned)

### Source 3: Stale Plans

- Glob `.claude/plans/*.md`
- For each plan, check if it has unfinished items
- Skip plans clearly superseded by current architecture decisions

### Source 4: Architecture Gaps

The most common form of drift in design-phase projects: decisions are documented
but their downstream specifications don't exist yet.

- **Read `docs/architecture.md`** — for each resolved decision, check whether
  the corresponding spec, skill, or implementation exists
- **Architecture items with ✗ status** in lab-notebook.md Current State — these
  are explicitly deferred; note what's blocking each
- **Cross-reference architecture.md ↔ cogarch** — does the documented authority
  hierarchy, Socratic protocol, and staged hybrid spec have trigger coverage in
  `cognitive-triggers.md`?

### Source 5: Documentation Drift

- **MEMORY.md volatile state vs. reality** — check the Active Thread against
  lab-notebook.md; are they consistent?
- **journal.md ToC vs. actual sections** — does every ToC entry have a
  corresponding section? Do notable decisions have journal entries?
- **lab-notebook.md Open Questions** — have any been answered since the last update?
  Check architecture.md and conversation context.
- **ideas.md** — are any ideas now actionable (prerequisite met, decision resolved)?
  Flag items that have drifted past their stated precondition.
- **MEMORY.md → CLAUDE.md migration** — stable conventions that belong in CLAUDE.md
  rather than MEMORY.md create line pressure. Identify candidates.
- **lessons.md.example vs. lessons.md** — does the template match the actual
  format being used? Any format drift?

### Source 6: Cogarch Consistency

This is the T11 audit as a hunt source — always run, even for `quick` constraint.

- **Read `docs/cognitive-triggers.md`** — check each trigger (T1–T12) for:
  - Missing coverage: a working principle in MEMORY.md with no corresponding trigger
  - Contradictions: trigger says X, another says Y for same situation
  - Orphaned triggers: trigger fires on a condition that no longer exists
  - Missing failure analyses: T11 findings with no future mitigation entry
- **Principles in MEMORY.md without triggers**: scan "Working Principles" section
  and cross-check each against cognitive-triggers.md
- **Socratic discipline coverage**: are "evidence before conclusion" and "competing
  hypotheses" triggered in the right places?
- **Recommend-against coverage**: is the recommend-against check (T3) consistently
  applied across all default-action triggers?

### Source 7: Skills Inventory

- **Glob `.claude/skills/**/*.md`** in project root — what skills exist?
- **Cross-reference against TODO.md** — which skills are planned but not yet created?
- **Check PSQ sub-project skills** — are there skills in `safety-quotient/.claude/skills/`
  that are being invoked from the general agent context without a general-agent adaptation?
  (The PSQ `/hunt` and `/cycle` skills contain PSQ-specific logic; a caller from the
  general agent context gets the wrong behavior.)
- **Test each skill** — skills created mid-session don't load until restart;
  flag any skill that hasn't been verified post-creation.

### Source 8: Cross-Reference Rot

```bash
# References to files that might have been renamed or not yet created
grep -r "SKILL\.md\|architecture\.md\|cogarch\|cognitive-triggers" \
     /home/kashif/projects/psychology/*.md \
     /home/kashif/projects/psychology/docs/*.md \
     /home/kashif/projects/psychology/.claude/skills/**/*.md \
     2>/dev/null | grep -v "^Binary"
```

- Check for references to files that don't exist
- Check for internal links in journal.md and architecture.md that point to missing sections
- Check BOOTSTRAP.md step sequence against what files actually exist

---

## Phase 2b: Deep Extrapolation (for `extrapolate` / `deep` constraint)

When asked to "extrapolate" or "go deeper than the backlog," scan three layers:

### Layer 1: Design → Specification Gaps

What does the architecture call for that has no specification yet?

- **General agent identity spec** — architecture.md says "collegial mentor, Opus,
  Socratic, dynamic calibration." Has this been written as a prompt/system spec?
  What's the actual first-message behavior?
- **Sub-agent communication standard** — staged hybrid Stage 1 requires a comm
  standard (output format, scope declaration, limitation disclosure). Is it written?
- **Adversarial evaluator spec** — tiered activation and parsimony reasoning are
  documented. Is there a draft prompt or decision procedure?
- **Machine-to-machine detection spec** — "structural detection" is the approach.
  What are the specific signals? Is this operationalized anywhere?
- **Voice protocol** — ⚡ output format specification was flagged but not closed.
  Where does this belong? (CLAUDE.md? architecture.md? A new voice-protocol.md?)

### Layer 2: Lessons → Trigger Coverage Gaps

Each lesson should eventually have trigger coverage preventing the error from recurrence.

- **Read `lessons.md`** — for each lesson, check whether the "The tell" or
  "The diagnostic" is operationalized in a cognitive-trigger.
- Lessons without trigger coverage are known vulnerabilities.
- Flag the highest-value uncovered lessons (those marked under "Domains where
  this recurs" that overlap directly with this project's work).

### Layer 3: Ideas → Research Direction Gaps

- **Read `ideas.md`** — for each idea marked as a research direction rather than
  a task, check what evidence or precondition would move it from speculation to action.
- Identify ideas that are now feasible (prerequisite resolved) but haven't been
  promoted to TODO.md.
- Identify ideas that should be retired (superseded by architecture decisions).

### Presenting extrapolation results

Organize into two buckets:

1. **New TODOs** — concrete gaps that should be fixed (missing spec, orphaned reference,
   lesson without trigger coverage)
2. **New IDEAS** — enhancement opportunities (new validation approach, new research
   direction, new skill design)

For each finding: what it is, where (file:section or memory location), severity/value,
and effort estimate.

---

## Phase 3: Classify & Rank

For each candidate, assign:

### Value Rating

- **HIGH**: Unblocks architecture work, fixes a cogarch inconsistency, enables a
  missing spec, or fixes a skill that's being invoked incorrectly
- **MED**: Improves documentation completeness, fills an ideas/lessons gap, cleans
  stale state
- **LOW**: Style improvements, minor reorganizations, nice-to-have analyses

### Effort Rating

- **XS**: <2 minutes (delete a reference, fix a typo, update a date)
- **S**: 2–10 minutes (single-file doc update, add a trigger, update MEMORY.md entry)
- **M**: 10–30 minutes (new spec section, skill adaptation, multi-file update)
- **L**: 30+ minutes (full skill creation, architecture item, new research section)

### Orthogonality

- **SAFE**: Doesn't touch any in-flight files
- **ADJACENT**: Touches related but not identical files
- **OVERLAPPING**: Would conflict with in-flight work — defer

---

## Phase 4: Present Results

```
## Hunt Results

**Context:** [1-line summary of what's in-flight and constraint applied]
**Active thread:** [from MEMORY.md Active Thread]

### Top Picks (recommended next)
1. **[Subject]** — [1-line description]
   Value: HIGH | Effort: S | Where: `path/to/file` or section

2. **[Subject]** — [1-line description]
   Value: MED | Effort: XS | Where: `path/to/file`

### Backlog Candidates (from TODO.md)
- **[Item]** — [status/blocker note]

### Stale Items (needs attention)
- **[Item]** — [why stale, what to do]

### Cogarch Findings
- **[Trigger/principle]** — [inconsistency or gap]

### Blocked (needs unblocking first)
- **[Item]** — blocked by: [what]
```

### Presentation Rules

- **Max 10 items** in Top Picks — don't overwhelm
- **Bold the subject**, keep descriptions to one line
- **Always include effort estimate** — "this is 2 minutes" vs "this is 30 minutes" matters
- **Group by theme** if multiple items relate (e.g., "3 stale doc entries" = 1 item, not 3)
- **Process vs. substance distinction:** Ordering and sequencing decisions (which of
  three items to do first, where to put a section) → resolve autonomously and present
  the plan. Direction decisions (what gets built, what approach, what priority) →
  surface to user with recommendation.
- **Recommend-against check:** Before presenting any item, scan for a specific
  concrete reason not to surface it. Vague concern doesn't count. If no specific
  objection → include it.
- **End with a recommendation:** "I'd suggest starting with #1 because [reason]"

---

## Phase 5: Decision Refinement

When hunt surfaces items requiring a **choice between approaches** (not just "do this"),
shift into decision-assist mode. This applies to:

- Items with multiple implementation strategies
- Deferred items where the decision is "do it now / later / never"
- Architecture decisions (new spec vs. defer, which approach to use)
- Any item where the user says "what do you think?" or hasn't committed

### Step 1: Identify 2–3 distinct options

Frame as concrete, mutually exclusive choices. Not vague ("maybe improve cogarch")
— specific ("add trigger now" vs. "defer until T11 next audit" vs. "retire as unnecessary").

### Step 2: Classify the decision domain

| Domain | Signal | Effect vectors |
|---|---|---|
| **Architecture** | adding/changing a spec or decision | architecture.md → cogarch → skills → sub-agent protocol |
| **Cogarch** | adding/changing a trigger | cognitive-triggers.md → behavior → MEMORY.md → lessons.md |
| **Documentation** | updating or deferring doc changes | reproducibility → future context → /cycle checklist |
| **Skills** | creating/adapting a skill | .claude/skills/ → invocation behavior → context management |
| **Research scope** | adding/removing an architecture item | design depth → TODO.md → session planning |

### Step 3: Ground the analysis

Before asking questions or tracing effects, read relevant files or sections to
verify what the changed thing actually does and what depends on it.

### Step 4: Ask clarifying questions

Use `AskUserQuestion` with targeted questions that would change which option is best.

### Step 5: Six-order cascade — for each option

**Confidence discipline:**
- Orders 1–2: state as fact (direct causal effects)
- Order 3: "likely" — based on known dependencies
- Orders 4–5: "possible" — requires compounding; state assumptions
- Order 6: "speculative" — be honest

```
**Knock-on analysis (10 orders) — [option label]:**

**1. [Label]** *(certain)*          — direct immediate effect
**2. [Label]** *(certain–likely)*   — what systems/files are activated
**3. [Label]** *(likely)*           — what consumes Order 2's outputs
**4. [Label]** *(likely–possible)*  — aggregate effects
**5. [Label]** *(possible)*         — what humans observe or trust
**6. [Label]** *(speculative)*      — compounding over time or constraints on future work
**7. [Label]** *(structural)*       — ecosystem/precedent effects
**8. [Label]** *(horizon)*          — normative/structural long-term effects
**9. [Label]** *(emergent)*         — properties from interaction of multiple chains
**10. [Label]** *(theory-revising)* — effects that falsify or modify the justifying theory
```

After each cascade, list key mitigations and assumptions.

### Step 6: Comparison table

| | Architecture value | Effort | Reversibility | Cogarch consistency | Risk |
|---|---|---|---|---|---|
| **Option 1** | ... | ... | ... | ... | ... |
| **Option 2** | ... | ... | ... | ... | ... |

Pick only axes that differentiate the options.

---

## Phase 6: Offer Next Steps

After presenting results (and completing Phase 5 decision refinement if needed):

**If Phase 5 was run:** Lead with winning option or ask user to confirm, then offer
to execute. Don't re-list items Phase 5 already resolved.

**If Phase 5 was skipped** (straightforward tasks), offer:
- "Want me to tackle #1–3 (quick wins)?"
- "Want me to draft the [spec] for architecture item 1?"
- "Want me to add trigger coverage for [lesson]?"
- "Want me to run `/doc` to persist these findings before we move on?"

If no meaningful work is found:
"Project is in good shape. Next meaningful work is [item], which requires [prerequisite]."

---

## Efficiency Notes

**Skip matrix — which sources to run per constraint:**

| Constraint              | Sources to run          | Sources to skip         |
|-------------------------|-------------------------|-------------------------|
| *(empty)* / `all`       | 1–8 + Phase 2b          | —                       |
| `quick` / `quick wins`  | 1, 2, 6 (cogarch only)  | 3, 4, 5, 7, 8, Phase 2b |
| `stale`                 | 3, 4, 5, 8              | 1, 2, 6, 7, Phase 2b    |
| `blocked`               | 1, 2                    | 3–8, Phase 2b           |
| `orthogonal`            | 1–8 (filter by SAFE)    | Phase 2b                |
| `cogarch`               | 6 only + Phase 2b L2    | 1–5, 7, 8               |
| `ideas`                 | 5 (ideas.md only), 2b L3| 1–4, 6–8                |
| `extrapolate` / `deep`  | 1, 2, Phase 2b          | 3–8 (maintenance)       |

**Other notes:**
- Source 6 (cogarch) is always run — even for `quick`. A missed trigger is a live
  vulnerability regardless of session constraints.
- Parallel reads where possible: Sources 1, 3, 5, 7 can all be read concurrently.
- Process decisions within the hunt (ordering Top Picks, grouping stale items) →
  resolve autonomously. Only surface substance questions.
- **Don't re-scan** what was already found in the same session.

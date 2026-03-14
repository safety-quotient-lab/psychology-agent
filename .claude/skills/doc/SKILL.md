---
name: doc
description: Mid-work documentation — persist decisions, findings, and reasoning to the right file before context fills up. Figures out WHAT to write and WHERE to put it.
user-invocable: true
argument-hint: "[what to document, e.g. 'design decision on evaluator trigger', 'PJE case study reframing']"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Doc — Mid-Work Documentation Persistence

Capture what just happened — decisions, findings, design choices, reasoning — and
write it to the correct file on disk before context compression loses it.

**Design principle:** `/doc` is the complement of `/cycle`. Where `/cycle` is post-hoc
("we're done, update everything"), `/doc` is mid-work ("something worth remembering
just happened — save it now"). Together they ensure nothing falls through the gap
between discovery and documentation.

**When to trigger:**
- A design decision was just made or resolved
- A finding emerged from analysis or discussion
- An architectural choice was debated and settled
- Context usage is above 50% and substantive work hasn't been persisted
- The agent notices it's holding reasoning that only exists in conversation

**When NOT to trigger:**
- Trivial exchanges (greetings, clarifications, small corrections)
- Work that /cycle will handle at session end
- Information already on disk (check before writing)


## Phase 1: Identify What to Document

Parse `$ARGUMENTS` and recent conversation context to determine:

1. **What happened** — the decision, finding, or reasoning to persist
2. **Type classification:**

```
 Type              Examples                           Typical destination
──────────────────────────────────────────────────────────────────────────
 Design decision   "evaluator uses tiered activation"  MEMORY.md, CLAUDE.md,
                                                       or architecture doc

 Finding           "skills can't natively chain"        MEMORY.md or
                                                        research doc

 Reasoning chain   "why PJE is a case study not a       Snapshot file or
                    sub-agent"                           architecture doc

 Convention        "always use LaTeX for complex docs"   MEMORY.md

 Architecture      "four-layer agent system"              Architecture doc

 Status update     "PSQ analysis complete, moving to     MEMORY.md
                    architecture"
```

3. **Novelty check** — read the target file first. If the information is already
   captured, report "already documented at [location]" and stop. Don't duplicate.


## Phase 2: Determine Where to Write

The project has a document hierarchy. Each type of information has a natural home.
Choose the most specific applicable location:

### Decision tree

```
Is it a stable convention or policy?
  → Yes → MEMORY.md (Communication Conventions or Working Principles section)

Is it about the psychology agent architecture?
  → Yes → Does an architecture doc exist?
    → Yes → Write there
    → No  → Create one at docs/architecture.md (markdown, not LaTeX —
             architecture is living documentation, not a publication)

Is it a one-time finding or reasoning chain worth preserving?
  → Yes → Is it significant enough to warrant a snapshot?
    → Yes → Create docs/snapshots/snapshot-YYYYMMDD-HHMM-[slug].md
    → No  → MEMORY.md (Active Thread section, briefly)

Is it a status update on where we are in the work?
  → Yes → MEMORY.md (Active Thread section — overwrite, don't append)

Is it project-specific to a sub-project (e.g., safety-quotient)?
  → Yes → Write to that sub-project's documentation, not the parent
```

### File locations

```
 File                                    What goes here
──────────────────────────────────────────────────────────────────
 MEMORY.md                               Active thread, conventions,
 (~/.claude/projects/.../memory/)         design decisions, status

 docs/architecture.md                    System architecture, sub-agent
 (project root)                          protocol, evaluator design

 docs/snapshots/snapshot-*.md            Significant reasoning chains,
 (project root)                          paradigm shifts, decision records

 Sub-project CLAUDE.md / MEMORY.md       Sub-project-specific conventions
 (e.g., safety-quotient/)               and state
```


## Phase 3: Write

### Writing rules

1. **Read the target file first.** Understand its current structure before editing.

2. **Match the existing style.** If MEMORY.md uses terse bullet points, write terse
   bullet points. If an architecture doc uses APA-style prose, write APA-style prose.

3. **Overwrite status, append findings.** The "Active Thread" section of MEMORY.md
   should reflect *current* state (overwrite). New design decisions or conventions
   should be *added* to the appropriate section.

4. **Date-stamp snapshots.** Snapshot filenames include the date and a slug:
   `snapshot-20260301-1430-evaluator-design.md`

5. **Keep MEMORY.md under 200 lines.** If an addition would push it over, move
   detailed content to a linked file and summarize in MEMORY.md.

6. **Cross-reference.** If the documented item relates to content in another file,
   add a brief cross-reference: "See also: docs/architecture.md §3"


## Phase 4: Confirm

Report to the user:

```
Documented: [1-line summary of what was written]
Location:   [file path]
Action:     [created / updated / already documented]
```

If context usage is high (>60%), suggest: "Context is at N% — consider running
`/cycle` soon to do a full documentation pass."

If the work session is producing findings faster than they're being documented,
suggest: "Multiple undocumented decisions in context — want me to do a batch
`/doc` pass?"


## Phase 5: Chain (optional)

If the documentation pass reveals that a full `/cycle` is warranted (e.g.,
multiple files are now stale, or the session is ending), suggest running `/cycle`.
Do not auto-invoke — let the user decide.

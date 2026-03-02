# General-Purpose Psychology Agent — Lab Notebook

Structured session log. Each entry records what was done, key decisions, and
artifacts produced. Terse and factual — the journal.md has the narrative.

**Primary source:** Conversation transcripts (not yet archived)
**Derived views:** `journal.md` (narrative), `docs/architecture.md` (design)

---

## Current State *(overwrite each session)*

### Agent: Design phase (2026-03-01)

| Item                          | Status                                           |
|-------------------------------|--------------------------------------------------|
| Architecture diagram          | ✓ Documented — docs/architecture.md              |
| Design decisions              | ✓ All resolved — docs/architecture.md            |
| Authority hierarchy           | ✓ Documented — docs/architecture.md              |
| /doc skill                    | ✓ Created and tested                             |
| /hunt skill                   | ✓ Created — needs restart to load               |
| /cycle skill                  | ✓ Created — needs restart to load               |
| /capacity skill               | ✓ Created — needs restart to load               |
| Conventions migration         | ✓ CLAUDE.md holds stable conventions (128 lines) |
| CLAUDE.md (project root)      | ✓ Created + display convention added             |
| Cognitive infrastructure      | ✓ T1–T12, lessons.md (13 entries), cogarch       |
| T10/T11 ordering              | ✓ Fixed — T10 now precedes T11 in file           |
| T12 trigger                   | ✓ Positive pattern recognition; T10 co-fires     |
| Timestamp backfill            | ✗ Deferred — no fabrication; exact times unknown |
| Cross-context overreach       | ✓ Detected and reverted — lesson pending         |
| SWEBOK/PMBOK vocabulary policy| ✓ Added to MEMORY.md + ideas.md                  |
| Socratic protocol             | ✓ Resolved — dynamic calibration; machine detect |
| Sub-agent implementation      | ✓ Resolved — staged hybrid (see architecture.md) |
| General agent design          | ✗ Next — item 1 of 3                             |
| Sub-agent protocol            | ✗ Pending — item 2 of 3                          |
| Adversarial evaluator         | ✗ Pending — item 3 of 3                          |
| PSQ integration               | ✗ Pending PSQ readiness (separate context)       |


### Open Questions

None.

---

## Notation

- `→` Decision or action taken
- `▶` Cross-reference to journal.md or architecture doc
- `⚑` Flag — unresolved issue or epistemic concern

Session entry headings use full timestamp going forward:
`## YYYY-MM-DDTHH:MM TZ — Session N (summary)`
Run `date '+%Y-%m-%dT%H:%M %Z'` at session start. Time-between-sessions
and time-between-lessons are meaningful metrics. Existing entries are date-only.

---

## 2026-03-01 — Session 1 (Architecture design, skill creation)

**Scope:** General-purpose psychology agent — initial architecture design session.

**PSQ analysis completed.** Full analysis delivered covering construct validity,
criterion validity across 4 datasets (AUC 0.57–0.73), open vulnerabilities, and
PSQ readiness for sub-agent integration.

**Style conventions calibrated:**
- APA-style formatting with 1.618x whitespace
- Pedagogical jargon policy: expand acronyms on first use, define in prose
- Clean parentheticals: expansion only (3–7 words max inside parens)
- LaTeX for complex docs, markdown for standard docs

**Design decisions resolved** (full table in docs/architecture.md):
- Three-layer architecture: general agent → sub-agents → adversarial evaluator
- PJE reframed as case study, not sub-agent or specification
- Tiered adversarial evaluator (lightweight default, escalate on disagreement)
- Natural language for agent-to-agent protocol
- Extensible plug-in sub-agent architecture, no roster pre-committed
- Socratic disagreement stance
- Opus as canonical model

**Authority hierarchy defined.** User = source of truth. General agent = advisory.
Sub-agents = domain experts subject to scrutiny. Evaluator = quality control.

→ All decisions persisted to `docs/architecture.md`

**/doc skill created** at `.claude/skills/doc/SKILL.md`. Mid-work documentation
persistence — complement to `/cycle`. Tested on session restart; confirmed loading.

**CLAUDE.md created** at project root. Registers `/doc` skill, summarizes key
conventions, points to sub-projects.

**Standard documentation created:**
- `journal.md` — research narrative (backfilled §1–5)
- `lab-notebook.md` — this file
- `TODO.md` — task backlog
- `ideas.md` — speculative ideas
- `README.md` — project overview

**Memory hygiene rules added to MEMORY.md:**
- Don't persist speculation as fact (reason freely, persist only confirmed)
- Organize semantically by topic, not chronologically
- Don't duplicate CLAUDE.md
- No duplicate entries
- Update or remove wrong memories
- 200-line limit
- Test skills after creating them

**Open (deferred to next exchange):**
- Audience adaptation for Socratic protocol
- Machine-to-machine stance question
- Architecture items 1–3 (general agent design, sub-agent protocol, evaluator)

▶ journal.md §1–5, docs/architecture.md

---

## 2026-03-01 — Session 2 (Cognitive infrastructure, pre-architecture resolution)

**Scope:** Build cognitive infrastructure; resolve all pre-architecture open questions.

**Cognitive infrastructure built:**
- `memory/cognitive-triggers.md` — T1–T11 trigger system (session start through self-audit)
- `lessons.md` — personal learning log, 10 entries backfilled (not git-tracked)
- `lessons.md.example` — tracked format stub
- T10: lessons trigger. T11: cogarch self-audit with future mitigations
- Recommend-against check added to T3; process vs. substance distinction added
- Explicit pacing + cognitive accessibility policy added
- cogarch abbreviation established

**Design decisions resolved:**
- Socratic protocol → dynamic calibration (not fixed audience categories). Machine callers detected structurally; Socratic stance drops for machines.
- Sub-agent implementation → staged hybrid: Stage 1 (separate Claude Code sessions, human-mediated, define comm standard), Stage 2 (programmatic when PSQ API-ready), Stage 3 (MCP, not pre-committed)
- → Both persisted to `docs/architecture.md` and `MEMORY.md`

**Vocabulary policy:** Incorporate elements of SWEBOK (SE design) and PMBOK (planning/risk) into operational vocabulary. Term collision rule: specify domain on first use. Standards vocabulary adapter concept added to `ideas.md`.

**200-line MEMORY.md limit clarified:** Hard system constraint (lines 201+ silently truncated). CLAUDE.md (~175 lines available) and CLAUDE.local.md (auto-gitignored, discovered this session) are additional always-loaded space.

**T11 self-audit run:** 10 findings, 7 fixed (stale docs, missing Socratic triggers, confidence calibration trigger, T1 cognitive-triggers load, T11 creation). 3 deferred with future mitigations.

▶ journal.md §6–7, docs/architecture.md, memory/cognitive-triggers.md

---

## 2026-03-01T19:40 CST — Session 3 (Timestamp backfill, /hunt adaptation)

**Scope:** Context resumed after Session 2 ran out of context window mid-session.

**Timestamp backfill attempted and reverted.** File-system mtimes are approximations,
not exact write times. Marking fabricated records `~` doesn't fix the fabrication.
→ Policy: either the exact timestamp is known or the entry stays date-only.
Reverted lessons.md (all 11 entries) and lab-notebook Sessions 1–2 to date-only.

**→ /hunt skill created** at `.claude/skills/hunt/SKILL.md`. Adapted from PSQ version:
- No DB queries, no training scripts, no model files
- Sources: TODO.md, architecture.md, cogarch, ideas.md, lessons.md, journal.md,
  lab-notebook.md, MEMORY.md, cross-reference rot, skills inventory
- Phase 2b (deep extrapolation): design→spec gaps, lessons→trigger gaps, ideas→actions
- Source 6 (cogarch) always runs, even for `quick` constraint — live vulnerability
- Needs restart to load (created mid-session)

**→ /cycle skill created** at `.claude/skills/cycle/SKILL.md`. General agent
post-session documentation checklist:
- 12-step propagation chain: lab-notebook → journal → architecture → ideas →
  TODO → MEMORY → cognitive-triggers → CLAUDE.md → MEMORY-snapshot → orphan check
- Propagation rules table maps change type to affected documents
- Needs restart to load (created mid-session)

**→ Stable conventions migrated** from MEMORY.md → CLAUDE.md:
- Moved: Communication Conventions, Cognitive Accessibility Policy, Project Structure
- MEMORY.md: 200 → 122 lines (78 freed). CLAUDE.md: 25 → 115 lines.
- MEMORY.md now holds volatile state only; CLAUDE.md is the stable conventions home.

▶ .claude/skills/hunt/SKILL.md, .claude/skills/cycle/SKILL.md

**→ /capacity skill created** at `.claude/skills/capacity/SKILL.md`.
Multi-dimensional capacity assessment: MEMORY.md line budget, CLAUDE.md lines,
cognitive-triggers.md practical ceiling, trigger coverage gaps, design decisions
space, skills inventory. Needs restart to load.

**→ T12 trigger added** (positive pattern recognition). Fires on "good thinking"
/ "good defensive thinking." Action: name principle, explain mechanism, cross-domain
examples, T10 co-fires to write lesson. T10/T11 file ordering corrected.

**→ Display convention added to CLAUDE.md.** Internal references (T-numbers,
shorthand labels) are parenthetical; plain-language description leads. Scoped
to agent communication, not to cogarch specifically.

**→ Lessons written (T10/T12):**
- "Labeled Approximations Are Still Fabrications" — qualified fabrication is still
  fabrication; date-only stays date-only until exact time is known
- "Defensive Depth for Critical State" — layer against single points of failure;
  canonical + archive + content guard pattern for critical persistent state

**→ Cross-context overreach detected and reverted.** External agent modified
cognitive-triggers.md (T2/T3) and MEMORY.md, replacing "knock-on analysis"
vocabulary with "adjudicate" and referencing a non-existent /adjudicate skill.
Changes reverted. Lesson on cross-context write authority integrity pending
(TODO.md — write at next /cycle).

**→ /cycle Step 8b added** — lessons.md safety net: review T10/T12 firings at
cycle time; write any missing lesson entries.

**→ Infrastructure fixes:** BOOTSTRAP.md (Step 3 lists all skills; Step 4 "volatile
state"); MEMORY.md hygiene (CLAUDE.md line count corrected); TODO.md cleaned
(/cycle and /hunt removed as done; /capacity snapshot versioning + pending lessons
section added).

▶ .claude/skills/capacity/SKILL.md, memory/cognitive-triggers.md


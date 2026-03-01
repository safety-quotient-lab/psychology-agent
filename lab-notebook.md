# General-Purpose Psychology Agent — Lab Notebook

Structured session log. Each entry records what was done, key decisions, and
artifacts produced. Terse and factual — the journal.md has the narrative.

**Primary source:** Conversation transcripts (not yet archived)
**Derived views:** `journal.md` (narrative), `docs/architecture.md` (design)

---

## Current State *(overwrite each session)*

### Agent: Design phase (2026-03-01)

| Item                     | Status                                      |
|--------------------------|---------------------------------------------|
| Architecture diagram     | ✓ Documented — docs/architecture.md         |
| Design decisions         | ✓ Resolved — docs/architecture.md           |
| Authority hierarchy      | ✓ Documented — docs/architecture.md         |
| /doc skill               | ✓ Created and tested                        |
| CLAUDE.md (project root) | ✓ Created                                   |
| General agent design     | ✗ In progress — item 1 of 3                 |
| Sub-agent protocol       | ✗ Pending — item 2 of 3                     |
| Adversarial evaluator    | ✗ Pending — item 3 of 3                     |
| PSQ integration          | ✗ Pending PSQ readiness (separate context)  |


### Open Questions

1. Should the Socratic protocol adapt by audience (clinician vs. researcher vs.
   public)? Raised but not resolved.
2. Should the general agent drop Socratic stance for machine-to-machine calls?
   Raised but not resolved.

---

## Notation

- `→` Decision or action taken
- `▶` Cross-reference to journal.md or architecture doc
- `⚑` Flag — unresolved issue or epistemic concern

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

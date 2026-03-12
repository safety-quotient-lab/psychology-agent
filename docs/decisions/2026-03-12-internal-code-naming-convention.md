---
decision: "Internal Code Naming Convention"
date: "2026-03-12"
scale: "S"
resolution: "Option C — kebab canonical + short alias"
session: "83"
---

# Adjudication: Internal Code Naming Convention

**Scale:** S
**Options:** A (6-char mnemonic: TRGSRT-1), B (full kebab-case: trigger-session-start-1), C (hybrid: kebab canonical + documented short alias)


## Context

Single-letter internal codes (T1, D1, F3, FA-1, PL-001) lack human
readability. 1,762 T-number occurrences exist across 190 files (~140
historical snapshots, ~50 living documents). CLAUDE.md exempts internal
codes from semantic naming. This reform narrows that exemption.


## Knock-on Analysis

### Option A: 6-char mnemonic (TRGSRT-1)

| Order | Confidence | Effect |
|-------|-----------|--------|
| 1 | certain | Codes gain 4-5 extra chars (T1 → TRGSRT-1). All living docs, Go code, hooks, skills update. |
| 2 | certain–likely | +120 tokens/session. Requires lookup table — mnemonic not self-documenting. |
| 3 | likely | Abbreviation collisions (DATCON: data-constraint or data-connection?). New contributors need training. |
| 4 | likely–possible | Mnemonic system becomes its own maintenance burden — lookup table, naming conflicts, cognitive overhead. |

### Option B: Full kebab-case (trigger-session-start-1)

| Order | Confidence | Effect |
|-------|-----------|--------|
| 1 | certain | Codes become self-documenting (T1 → trigger-session-start-1, 24 chars). Same migration scope. |
| 2 | certain–likely | +360 tokens/session. Verbose in inline text — "per trigger-session-start-1 Check 7" reads awkwardly. |
| 3 | likely | No lookup table needed. Zero ambiguity. Matches existing kebab-case file naming conventions. |
| 4 | likely–possible | Writers naturally abbreviate back to short forms in dense prose, creating inconsistency. |

### Structural Scan (Orders 7-10)

- **Order 7 (structural):** Sets precedent for entire agent mesh — 4 repos + future agents adopt same convention.
- **Order 8 (horizon):** Establishes norm about token-efficiency vs human-readability priority.
- **Order 9 (emergent):** Neither option eliminates the tension. A hybrid (canonical + alias) emerges organically from either starting point.
- **Order 10 (theory-revising):** The CLAUDE.md compact-identifier exemption exists for a reason — compact identifiers serve high-frequency contexts. Narrowing the exemption rather than abolishing it may prove correct.


## Comparison

|                     | Token cost | Self-doc | Collision | Inline read | Migration | New contributor |
|---------------------|-----------|---------|-----------|------------|-----------|----------------|
| **A: TRGSRT-1**     | Moderate  | No      | Medium    | Good       | Same      | Requires training |
| **B: kebab-case**   | High      | Yes     | None      | Poor       | Same      | Excellent |
| **C: hybrid**       | Low (alias) / High (canonical) | Yes (canonical) | None | Good (alias in prose) | Gradual | Excellent |


## Resolution

**Option C — kebab canonical + short alias.**

Full kebab-case names become the canonical identifier for all internal codes.
Existing short codes (T1, D1, F3) survive as documented aliases in a
glossary. Canonical form required in headings, definitions, and first-use
contexts. Alias permitted in inline prose, hook scripts, Go constants, and
parenthetical references.

This formalizes the existing "plain-language first, T-number parenthetical"
convention (CLAUDE.md Internal Reference Display Convention) without the
token cost of forcing verbose names everywhere or the ambiguity of inventing
new mnemonics.

**Reasoning:** Option C has the fewest moving parts of any option that
achieves readability. No lookup table needed for canonical names (self-
documenting). No abbreviation collision management. Aliases already in use
and documented. Gradual migration — new documents use canonical names
immediately; historical documents remain untouched.


## Structural Implications

- **Forecloses:** TRGSRT-style mnemonics. Also forecloses undocumented
  short codes — every alias must appear in the glossary.
- **Enables:** Gradual migration. The glossary bridges canonical and alias
  forms during transition.
- **Precedent:** Layered naming (canonical + alias) resolves
  readability/efficiency tension. Applies to future internal codes.


## Implementation Notes

**Scope of canonical names (initial set):**

| Current | Canonical (proposed) | Alias |
|---------|---------------------|-------|
| T1 | trigger-session-start | T1 |
| T2 | trigger-before-response | T2 |
| T3 | trigger-before-recommending | T3 |
| T4 | trigger-before-writing | T4 |
| T5 | trigger-phase-boundary | T5 |
| T6 | trigger-user-pushback | T6 |
| T7 | trigger-user-approves | T7 |
| T8 | trigger-task-completed | T8 |
| T9 | trigger-memory-hygiene | T9 |
| T10 | trigger-lesson-surfaces | T10 |
| T11 | trigger-architecture-audit | T11 |
| T12 | trigger-good-thinking | T12 |
| T13 | trigger-external-content | T13 |
| T14 | trigger-structural-checkpoint | T14 |
| T15 | trigger-psq-output | T15 |
| T16 | trigger-external-action | T16 |
| T18 | trigger-ux-design-grounding | T18 |
| FA-N | failure-analysis-N | FA-N |
| PL-001 | project-local-001 | PL-001 |

D-numbers and F-numbers require enumeration from architecture.md and
self-readiness-audit findings before canonical names can be assigned.

**Migration strategy:** Gradual. No mass find-replace. New writing uses
canonical form. Existing docs updated opportunistically during edits.
Historical snapshots remain as-is. Glossary serves as the bridge.

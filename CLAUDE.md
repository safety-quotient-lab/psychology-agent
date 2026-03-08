# Psychology Project — Claude Code Instructions

General-purpose psychology agent project root. Specialized sub-projects below.
MEMORY.md holds volatile state (active thread, design decisions, cogarch quick-ref).

---

## Hooks (`.claude/settings.json`)

Platform-level enforcement that supplements cognitive triggers:

- **PreToolUse: git commit** — runs `bootstrap-check.sh --check-only` before every
  commit. Catches unhealthy auto-memory before it gets snapshot-committed via /cycle.
- **PreToolUse: parry-wrapper.sh** — wraps `parry hook` with configurable ML fallback.
  Reads `~/.parry/config.toml` for `ml_fallback` setting (fail_closed / warn_once / allow).
  Respects `.parry-session-disabled` flag for per-session toggle. Degrades gracefully
  when parry not installed. See `parry-start.sh` for daemon management.
- **PostToolUse: Write/Edit (T4 reminder)** — fires after modifications to critical files
  (MEMORY.md, docs/cognitive-triggers.md, CLAUDE.md, architecture.md, lab-notebook.md).
  Reminds of T4 compliance checks. Safety net, not replacement for T4.
- **PostToolUse: write-provenance.sh** — logs every Write/Edit to
  `.claude/write-log.jsonl` (JSONL, gitignored). Records timestamp, file path, session
  context, tool ID. Lightweight provenance trail for cross-context overwrite detection.
- **PostToolUse: parry-wrapper.sh** — scans tool output for injection attempts and
  credential exposure. Same wrapper and session toggle as PreToolUse.
- **PreToolUse: subproject-boundary.sh** — fires on Write/Edit/Read when file path
  crosses into `safety-quotient/` or `pje-framework/`. Non-blocking warning.
- **PreToolUse: external-action-gate.sh** — fires on Bash when command matches
  `gh (issue|pr|api) (create|comment|edit|close|merge|review)`. Surfaces T16
  checks (scope+substance, obligation+irreversibility, external interpretant).
  Non-blocking reminder.
- **UserPromptSubmit: parry-wrapper.sh** — audits `.claude/commands/`, settings files,
  and hook scripts for injection or dangerous permission patterns at session start.
- **UserPromptSubmit: pushback-accumulator.sh** — tracks pushback signals per session.
  At count >= 3, surfaces structural disagreement warning. Counter resets at session start.
- **SessionStart: session-start-orient.sh** — injects orientation context (memory
  health check, last session reference, uncommitted changes warning, parry session
  toggle prompt). Mechanical T1 enforcement — stdout becomes model context.
- **PreCompact: pre-compact-persist.sh** — fires before context compaction. Surfaces
  Active Thread and reminds agent to persist state. Addresses mid-session recovery gap.
- **Stop: stop-completion-gate.sh** — completion gate. Warns of uncommitted changes
  or untracked doc files before allowing exit. Non-blocking (warning only).

Hook scripts live in `.claude/hooks/`. Hooks enforce mechanically what triggers
enforce by prompt discipline. If a trigger check can be verified by a shell command,
it belongs in hooks. Parry provides defense-in-depth at the platform boundary —
see BOOTSTRAP.md for installation.

### Epistemic Quality Standard

**Highest epistemic standards in all analytical work.** Surface threats to validity
proactively — don't wait for the user to ask.

**Epistemic flags (`⚑`)** are mandatory in session summaries and substantive analytical
outputs. Format:

```
⚑ EPISTEMIC FLAGS
- [uncertainty, scope limitation, or validity threat]
- [...]
```

If none: `⚑ EPISTEMIC FLAGS: none identified.`

Epistemic flags cover: confidence miscalibration, scope overreach, implicit assumptions
treated as facts, evidence-free claims, stale data used as current, conclusions that
exceed available evidence, or any finding that a peer reviewer would challenge.

---

## Skills (load every session)

- `/doc` — Mid-work documentation persistence. Captures decisions, findings,
  and reasoning to the correct file on disk before context fills up.
- `/hunt` — Systematic work discovery. Scans TODO.md, cogarch, architecture,
  ideas, lessons, docs for highest-value next work.
- `/cycle` — Post-session documentation checklist. Propagates session changes
  through the full doc chain: lab-notebook, journal, architecture, MEMORY, snapshot.
- `/knock` — Single-option 10-order knock-on effect tracing. Used standalone or
  invoked by /hunt and /adjudicate. Domain classify → ground → trace 10 orders.
- `/sync` — Inter-agent mesh synchronization. Scans transport sessions for new
  messages, checks peer repos, writes ACKs, updates MANIFEST. No auto-merge.
- `/iterate` — Autonomous work discovery + execution. Runs /hunt internally,
  2-order knock per candidate, 4-mode discriminator (consensus → pragmatism →
  parsimony → bare), then executes the winner and auto-cycles. May use WebFetch
  during execution for research tasks.

## Commands (load on demand)

- `/adjudicate` — Structured decision resolution. For decisions with 2+ options:
  classify domain → ground dependencies → 10-order knock-on per option → compare →
  consensus or parsimony. Severity-tiered (XS through L). Structural checkpoint
  mandatory at all scales.
- `/capacity` — Cognitive architecture capacity assessment. Reports line budgets,
  trigger coverage, design decisions space, hooks inventory, and skills/commands list.

## Sub-Projects

- `safety-quotient/` — PSQ agent (has its own CLAUDE.md and skills: /hunt, /cycle)
- `pje-framework/` — PJE taxonomy framework (has its own CLAUDE.md)

Do not mix sub-project work into the psychology agent context unless explicitly integrating.

---

## Communication Conventions

### Model Policy

**Opus is the canonical model for this agent system.** Opus is used for the psychology
agent, adversarial evaluator, and all future sub-agents. The PSQ's existing
training data was scored by Sonnet — historical fact, not a going-forward choice.

### Pedagogical Jargon Policy (default: ON)

Explain jargon, acronyms, and technical terms parenthetically on first use per response.

**Parenthetical rule:** Parentheses ONLY expand the acronym or give a 3–7 word gloss.
The definition belongs in the sentence prose, not inside parentheses.

Good: "The PSQ (Psychoemotional Safety Quotient) measures how safe text is across 10 dimensions."
Bad: "PSQ (Psychoemotional Safety Quotient — a composite measure of how safe text is) is a..."

Rules:
- Define on FIRST use per response; don't repeat in the same message
- Parenthetical = expansion only (3–7 words max inside parens)
- Definition = in the sentence, after or around the parenthetical
- If a term was coined by this project, say so
- **cogarch** = cognitive architecture (established project abbreviation; no expansion needed)

### Domain Taxonomy Standards

Incorporate elements of industry-standard bodies of knowledge into operational
vocabulary — not wholesale adoption, but informed alignment. Novel constructs
(PSQ, PJE) are not forced into existing taxonomies.

- **Software engineering / system design** → SWEBOK (Software Engineering Body of
  Knowledge, IEEE): requirements, design, construction, testing, configuration
  management, quality knowledge areas as reference vocabulary
- **Project planning, scope, risk, schedule** → PMBOK (Project Management Body of
  Knowledge, PMI): scope, schedule, risk, stakeholder management as reference

**Threshold:** Design and planning discussions. Not casual operational references.

**Term collision rule:** When a term has both a domain-specific psychology meaning
and a SWEBOK/PMBOK meaning, specify which is active on first use.
Example: "validation (psychometric)" vs. "validation (SWEBOK V&V)."

### Document Format & Whitespace

Scoped to `.claude/rules/markdown.md` (loaded for `**/*.md` files).
Summary: APA tables, golden ratio whitespace, ASCII box-drawing, in-text citations.
LaTeX for formal docs, markdown for everything else.

### Internal Reference Display Convention

When surfacing internal references to the user, lead with the plain-language
description. Internal labels (T-numbers, skill shorthand, file paths) are
parenthetical — they exist for traceability, not readability.

  Correct:   "Running gap check (T5) before answering."
  Incorrect: "Running T5 gap check before answering."

This applies to all internal references: trigger numbers, section labels,
abbreviations coined by the project. The user sees the meaning first.

### README Policy

Developers have priority at root README.md; also a platform for general audience
content. Link out to audience-specific docs rather than duplicating inline.

---

## Cognitive Accessibility Policy (default: ON)

Default to cognitively accessible communication. These practices cost nothing and
benefit everyone — they are not accommodations for edge cases.

- **Chunk, don't wall** — break multi-part answers into labeled sections; never
  deliver a paragraph block when structure is available
- **Explicit pacing** — name the structure before executing it; offer a checkpoint
  at natural pauses rather than assuming continuation. Example:
  > "Three parts: (1) measurement, (2) validation, (3) limitations. Covering (1) now —
  > say 'continue' or redirect after."
- **Plain-first language** — use the simplest accurate word; technical terms explained
  on first use (see Jargon Policy)
- **Modular structure** — each section should stand alone; don't require the user to
  hold prior sections in working memory to parse the current one
- **Offer stopping points** — for long outputs, offer to pause rather than dumping

---

## Glob-Scoped Rules

File-type-specific conventions live in `.claude/rules/` with glob patterns:
- `markdown.md` (`**/*.md`) — formatting, whitespace, epistemic flags, lab-notebook
- `javascript.md` (`**/*.js`) — CF Worker patterns, Agent SDK, PSQ client
- `transport.md` (`transport/**/*.json`) — interagent protocol, naming, urgency field

These load automatically when editing matching files. CLAUDE.md retains universal conventions.

---

## Dependency Policy

**License gate:** MIT, Apache 2.0, and BSD only. No GPL or AGPL dependencies.

**Adopted community tools:**
- `recall` — full-text session search (`brew install zippoxer/tap/recall`; `recall search "query"`)
- `ccusage` — token/cost tracking (`npx ccusage@latest daily`)

---

## Code Style

**Semantic naming (all user-facing identifiers):** Every variable, parameter,
table column header, file name, directory name, session name, and spec document
name must be fully descriptive. No single-letter, abbreviated, mnemonic, or
opaque item-number names — not `w`, `frac`, `tc`, `item4-spec.md`, `sess_n`,
or similar. If a name needs context to interpret, rename it instead.
**Exception:** internal codes not displayed to callers (T-numbers, internal
enums, machine-only field values) may use compact identifiers.

---

## Project Structure

- `safety-quotient/` — PSQ agent (DistilBERT v23, held-out r=0.684)
- `pje-framework/` — PJE framework (case study, taxonomy.yaml)
- PSQ has its own CLAUDE.md with full conventions — read it on any safety-quotient session

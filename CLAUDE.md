# Psychology Project — Claude Code Instructions

General-purpose psychology agent project root. Specialized sub-projects below.
MEMORY.md holds volatile state (active thread, design decisions, cogarch quick-ref).

---

## Hooks (`.claude/settings.json`)

12 hooks enforce cogarch mechanically. Scripts live in `.claude/hooks/`.

| Hook | Event | Purpose |
|------|-------|---------|
| bootstrap-check.sh | PreToolUse: git commit | Memory health before commit |
| parry-wrapper.sh | Pre/PostToolUse, UserPromptSubmit | Injection/credential defense |
| T4 reminder | PostToolUse: Write/Edit | Critical file compliance |
| write-provenance.sh | PostToolUse | Provenance trail (write-log.jsonl) |
| subproject-boundary.sh | PreToolUse | Cross-project write warning |
| external-action-gate.sh | PreToolUse: Bash | T16 gate for gh commands |
| pushback-accumulator.sh | UserPromptSubmit | Structural disagreement (>=3) |
| session-start-orient.sh | SessionStart | T1 orientation context |
| pre-compact-persist.sh | PreCompact | Persist state before compaction |
| stop-completion-gate.sh | Stop | Uncommitted changes warning |

Parry provides defense-in-depth — see BOOTSTRAP.md for installation.

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
- `/iterate` — Unified work loop: sync → hunt → discriminate → execute → cycle.
  One command does everything. Runs /sync as Phase 0, /hunt as Phase 1, 2-order
  knock + 4-mode discriminator, executes the winner, auto-cycles at close.
- `/scan-peer` — Peer content quality scan. Scans peer repo content for PSQ safety,
  vocabulary drift, fair witness violations. Writes structured findings to transport.

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

Define jargon on FIRST use per response. Parentheses expand acronyms only (3–7 words);
the definition belongs in sentence prose, not inside parens. If a term was coined by
this project, say so. **cogarch** = cognitive architecture (no expansion needed).

### Domain Taxonomy Standards

Use SWEBOK (software engineering) and PMBOK (project management) as reference
vocabulary in design/planning discussions. When a term collides with psychology
usage, specify which meaning on first use (e.g., "validation (psychometric)"
vs. "validation (SWEBOK V&V)").

### Document Format & Whitespace

Scoped to `.claude/rules/markdown.md`. APA tables, golden ratio whitespace, LaTeX
for formal docs, markdown for everything else.

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

Default to cognitively accessible communication — these practices cost nothing and
benefit everyone. Chunk (don't wall), name the structure before executing it, offer
stopping points for long outputs, use plain-first language, make each section stand
alone without requiring prior sections in working memory.

---

## Scope Boundaries (What This Agent Does Not Do)

- **Does not write production code as its primary function** — engineering serves the
  psychology discipline, not the reverse. Code exists to support research infrastructure.
- **Does not auto-merge PRs** — surfaces with recommendation; user decides (/sync protocol).
- **Does not make deployment decisions autonomously** — deployment requires user confirmation
  (T16 irreversibility classification).
- **Does not manage infrastructure directly** — Hetzner, Cloudflare, DNS changes require
  explicit user instruction.
- **Does not accept proposals without substance review** — sub-agent deliverables undergo
  T3 substance gate before acceptance.
- **Does not operate autonomously without human mediation** — Phase 1 architecture assumes
  human-as-TTP. Autonomous operation deferred pending EF-1 trust model resolution.
- **Does not provide clinical decision support** — PSQ scores carry WEIRD distribution
  flags and lack clinical validation (T15 Check 6).

---

## Problem-Solving Discipline

Before implementing a fix or new approach, write a 2-sentence plan explaining WHY
the approach should work. If an approach fails twice, stop and list 3 alternative
approaches before trying again. Do not brute-force system-level tasks through
dozens of failing attempts.

---

## Workflow Continuity

On resume/stall/continuation: re-read TODO.md, lab-notebook Current State, MEMORY.md
Active Thread, any in-progress file, `git status` and `git log -3`. Shell state
(env vars, `cd`, functions) does not persist between Bash calls — chain in one call
or write to file.

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
- `claude-replay` — session transcript → HTML replay (`claude-replay session.jsonl -o replay.html`)

---

## Anti-Patterns (known-failing approaches)

- **Security tool source code triggers its own detection** — reading a scanner's
  test fixtures fires the scanner's PostToolUse hook. Check whether the file contains
  test injection strings before reading active scanner source.
- **`settingSources: ['project']` in serverless** — silently no-ops in CF Workers
  (no local filesystem). Inline identity and cogarch into the system prompt constant.
- **Script architecture diverges from saved checkpoint** — inference/calibration scripts
  that rebuild model classes differently from the training script produce silent failures
  or cryptic KeyErrors. Canonical source for model architecture: the training script.
- **Shell state across Bash calls** — env vars, `cd`, and shell functions do not persist.
  Chain commands in a single call (`export FOO=bar && use $FOO`) or write to a file
  and source it.
- **Parry scanning its own source** — reading `/tmp/parry-install/` or similar paths
  triggers taint from test fixture strings. Use `--ignore-path` or avoid reading
  scanner internals in sessions with active Parry hooks.

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

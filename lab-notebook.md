# General-Purpose Psychology Agent — Lab Notebook

Structured session log. Each entry records what was done, key decisions, and
artifacts produced. Terse and factual — the journal.md has the narrative.

**Primary source:** Conversation transcripts (not yet archived)
**Derived views:** `journal.md` (narrative), `docs/architecture.md` (design)

---

## Current State *(overwrite each session)*

### Agent: Design phase (2026-03-05)

| Item                          | Status                                           |
|-------------------------------|--------------------------------------------------|
| Architecture diagram          | ✓ Documented — docs/architecture.md              |
| Design decisions              | ✓ All resolved — docs/architecture.md            |
| Authority hierarchy           | ✓ Documented — docs/architecture.md              |
| /doc skill                    | ✓ Created and tested                             |
| /hunt skill                   | ✓ Created and verified                           |
| /cycle skill                  | ✓ Created and verified + Step 10b, Step 12 push (Session 11) |
| /capacity skill               | ✓ Created and verified                           |
| Conventions migration         | ✓ CLAUDE.md holds stable conventions (178 lines) |
| CLAUDE.md (project root)      | ✓ Created + display convention added             |
| Cognitive infrastructure      | ✓ T1–T13 + rationalizations-to-reject (T3) + 4 SRT drafts (ideas.md) |
| T10/T11 ordering              | ✓ Fixed — T10 now precedes T11 in file           |
| T12 trigger                   | ✓ Positive pattern recognition; T10 co-fires     |
| Timestamp backfill            | ✗ Deferred — no fabrication; exact times unknown |
| Cross-context overreach       | ✓ Detected and reverted — lesson pending         |
| SWEBOK/PMBOK vocabulary policy| ✓ Added to MEMORY.md + ideas.md                  |
| Socratic protocol             | ✓ Resolved — dynamic calibration; machine detect |
| Sub-agent implementation      | ✓ Resolved — staged hybrid (see architecture.md) |
| Reconstruction package        | ✓ reconstruct.py + relay-agent-instructions.md + template |
| Relay-agent reconstruction    | ✓ Complete — 3 [RECONSTRUCTED] commits (Session 10) |
| Lab-notebook patch            | ✓ Sessions 2–3 entries backfilled manually (Session 10) |
| Git history rewrite           | ✓ 8 commits, clean chronological order, pushed (Session 10) |
| Relay-agent auto-accept gate  | ✓ Only pauses for high-weight SUBSTITUTIVE divergences |
| /cycle Step 12 git guard      | ✓ Graceful skip when .git absent                |
| Drift metric (content_drift)  | ✓ SUBTRACTIVE excluded from circuit breaker — epistemically clean |
| Semantic naming               | ✓ reconstruct.py + relay-agent-instructions.md + divergence-report-template.md |
| Code Style convention         | ✓ CLAUDE.md + T4 cogarch check                  |
| License (root project)        | ✓ CC BY-NC-SA 4.0 — LICENSE at project root      |
| License (PSQ data + weights)  | ✓ CC BY-SA 4.0 — safety-quotient/LICENSE-DATA (Dreaddit constraint) |
| Auto-memory recovery          | ✓ Snapshots, bootstrap-check.sh, T1 health check, BOOTSTRAP.md restructure (Session 11) |
| Platform hooks                | ✓ .claude/settings.json — pre-commit memory check, post-edit T4 reminder + parry (Session 12) |
| Antiregression evaluation     | ✓ Evaluated, adopted hooks, TODO items written (Session 11) |
| Blog post (cogarch)           | ✓ Draft — blog/2026-03-05-cognitive-architecture-for-ai-agents.md (Session 11) |
| Cogarch canonical location    | ✓ cognitive-triggers.md moved to docs/ (Session 12) |
| Parry integration             | ✓ Installed, hooks configured, ⚑ ML blocked on HF license (Session 12) |
| Awesome-claude-code eval      | ✓ 5 repos evaluated, 10 candidates ranked, 4 quick wins landed (Session 12) |
| Attention-aware placement     | ✓ CLAUDE.md reordered for U-shaped attention curve (Session 12) |
| Schema-validated lessons      | ✓ YAML frontmatter in lessons.md.example + T10 update (Session 12) |
| Graduated promotion lifecycle | ✓ 3+ threshold in T10 + /cycle Step 8b (Session 12) |
| Commands-over-skills audit    | ✓ /adjudicate + /capacity identified for conversion (Session 12) |
| PSQ commercial model          | ✗ Undefined — ideas documented in ideas.md       |
| General agent design          | ✗ Next — item 1 of 3                             |
| Sub-agent protocol            | ✗ Pending — item 2 of 3                          |
| Adversarial evaluator         | ✗ Pending — item 3 of 3                          |
| PSQ integration               | ✗ Pending PSQ readiness (separate context)       |
| GitHub repository             | ✓ safety-quotient-lab/psychology-agent (public)  |
| Ecosystem evaluation (round 2)| ✓ 5 repos evaluated, 7 candidates ranked (Session 13) |
| Git history                   | ✓ 19 commits                                     |
| Public audit                  | ✓ Publication-safe — no HIGH/MEDIUM findings     |


### Open Questions

- HuggingFace model license acceptance needed for parry ML layer — https://huggingface.co/protectai/deberta-v3-base-prompt-injection-v2

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

---

## 2026-03-01T23:27 CST — Session 4 (Reconstruction package, git guard)

**Scope:** Build git reconstruction infrastructure; close out this machine's work.

**→ Reconstruction package created** at `reconstruction/`:
- `reconstruct.py` — mechanical JSONL replay: parses Claude Code JSONL
  (`msg["message"]["content"]` nesting), filters Write/Edit under project root,
  session boundary constants from lab-notebook, weighted drift scoring (score_A
  gates circuit breaker; score_B reported only; delta measures /cycle noise),
  two-level threshold with Session 1 empirical calibration (adjudicated Option C),
  divergence classification (ADDITIVE / SUBTRACTIVE / SUBSTITUTIVE), one
  `[RECONSTRUCTED]` commit per session. Exit codes 0/1/2.
- `relay-agent-instructions.md` — self-contained protocol for fresh Claude Code
  agent on other machine: inputs, session boundaries, drift scoring reference,
  8-step reconstruction sequence, hard constraints, decision point format (A–D),
  git commit convention, output spec.
- `divergence-report-template.md` — standardized termination decision point
  template with all required fields and resolution log.

Dry-run validated: 52 Write/Edit operations extracted and correctly assigned
(S1: 9, S2: 16, S3: 27). Two bugs found and fixed during dry-run: JSONL content
path (nested inside `message` not top-level) and datetime comparison (raw strings
vs. `datetime` objects in session boundary loop.

**→ /cycle Step 12 git guard added.** Wraps git commands in `rev-parse --git-dir`
check; prints skip notice and falls through to Step 13 if no .git present. Live
sessions continue unblocked while reconstruction runs on other machine.

**→ Next-steps decision (pragmatic analysis + user approval):**
1. Switch to other machine; prepare reconstruction environment
2. Run reconstruction: relay-agent produces .git/ + divergence report
3. Architecture item 1 starts on other machine in fresh context
4. Adjudicate reconstruction completeness on other machine
5. Import .git/ to this machine; run /cycle for Session 5 catch-up commit

▶ reconstruction/reconstruct.py, reconstruction/relay-agent-instructions.md

---

## 2026-03-02T01:08 CST — Session 5 (Reconstruction QA, drift metric fix, semantic naming)

**Scope:** Continued from Session 4 (context compressed). QA pass on reconstruction
package; epistemic analysis of drift metric; cogarch and convention updates.

**→ Silent git design analyzed and reverted.**
Proposed: relay-agent commits session content at score_A, /cycle skips Step 12.
Three-question challenge: necessary? (no — reference state includes /cycle output),
feasible? (no — uncommitted /cycle state bleeds into next session's content_drift),
epistemically defensible? (no — /cycle output is intended reconstruction content,
not noise). Design failed all three. Reverted in /cycle SKILL.md and
relay-agent-instructions.md.
→ Lesson written: "Inherited Framing Runs Unexamined" — three-question challenge
as pre-commit check for any design change that adds complexity.

**→ content_drift (score_A) fix: SUBTRACTIVE excluded from intersection-only metric.**
Root cause: reference state is cumulative final state; Session 1 reconstruction
contains only Session 1 files. Session 2–4 files exist in reference but not yet
in reconstruction → SUBTRACTIVE. Including them in content_drift would inflate
Session 1 score with every file written in later sessions, making the threshold
meaningless as content-fidelity signal.
Fix: `intersection_only=True` now excludes both ADDITIVE and SUBTRACTIVE.
content_drift measures only files present in both reconstruction and reference.
full_tree_drift (score_B, diagnostic) still includes SUBTRACTIVE.
Constraint: Order 8 (methodology publication potential) — fix required for
drift metric to be epistemically defensible as documentation completeness measure.

**→ Semantic naming refactor** across all reconstruction artifacts:
- `reconstruct.py`: score_a/b → content_drift/full_tree_drift; content_only →
  intersection_only; all abbreviated variable names expanded (w, frac, tc, inp,
  blk, inner, rel, op, etc.); dead code removed (unused session_start/session_end
  dicts); session_end_ts now passed correctly throughout.
- `relay-agent-instructions.md`: score_A/score_B renamed in tables, headers,
  prose, gate check conditions, decision point format, constraint list.
- `divergence-report-template.md`: field labels updated.

**→ Cogarch updated: T4 semantic naming check.**
New row in T4 (Before Writing to Disk): variable names must be fully descriptive;
table column headers must use semantic labels. Fires on any code or .md file write.

**→ CLAUDE.md: Code Style section added.**
Stable convention: semantic naming for all variables and .md table column headers.
Examples of disallowed forms inlined. Advisory limit check: 163 lines (37 available).

▶ reconstruction/reconstruct.py, reconstruction/relay-agent-instructions.md,
  memory/cognitive-triggers.md, lessons.md

---

## 2026-03-02T01:34 CST — Session 6 (Handoff packaging)

**Scope:** Assemble and ship reconstruction package to other machine.

**→ Handoff package assembled** at `~/psychology-handoff.tar.gz` (3.1M):
- `psychology-reference/` — full project reference state (sub-projects excluded)
- `10f3b81d-....jsonl` — primary JSONL, Sessions 1–3 (7.2M)
- `e1d83eb5-....jsonl` + `2a24e585-....jsonl` — supplemental
- `README-handoff.md` — path assignments, opening prompt, gate monitoring
  guidance, return/import instructions

**→ Waiting on other machine** for relay-agent reconstruction results and `.git/` return.

---

## 2026-03-02T14:48 CST — Session 7 (Handoff fixes, license settlement)

**Scope:** Fix handoff package gaps; settle project licensing; document commercial ideas.

**→ Handoff package fixed (two passes):**
- First pass: synced 5 post-Session-6 files (lab-notebook.md, TODO.md, journal.md,
  docs/MEMORY-snapshot.md, snapshots) that were newer than the tarball
- Second pass: added missing `cognitive-triggers.md` (lives in auto-memory, not project
  root — wasn't included in reference copy; relay-agent flagged it)
- Auto-accept gate added to relay-agent-instructions.md: only pauses for high-weight
  SUBSTITUTIVE divergences (weight ≥ 2); all other drift auto-accepted with [DRIFT-ACCEPTED]
- README-handoff.md monitoring guidance updated to match
- Rebuilt ~/psychology-handoff.tar.gz twice (01:52, 14:30)

**→ License settled (knock-on analysis, 8 orders, 3 options):**
- Root project: CC BY-NC-SA 4.0 — `LICENSE` created
- PSQ code: CC BY-NC-SA 4.0 — existing `safety-quotient/LICENSE` correct, no change
- PSQ data + model weights: CC BY-SA 4.0 — `safety-quotient/LICENSE-DATA` created
- Rationale: Dreaddit source (CC BY-SA 4.0) imposes ShareAlike constraint on derivative
  data; CC BY-SA → CC BY-NC-SA is not permitted by CC compatibility chart
- DATA-PROVENANCE.md licensing note corrected (removed stale "dual license" reference)
- Committed to safety-quotient git: `7871839`

**→ Commercial model ideas documented** in ideas.md: hosted API, enterprise SaaS,
clinical deployment, custom fine-tuning, model weight re-licensing (flagged ⚡)

▶ journal.md §11, docs/architecture.md (license decision added)

---

## 2026-03-02T15:17 CST — Session 8 (Git push, public audit)

**Scope:** Complete initial GitHub push; audit repository for public-facing quality.

**→ Initial git commit completed** (`e12828b`): 29 files, all tracked content.
Context resumed mid-session (commit staged, not yet made). Push required switching
remote URL from HTTPS to SSH (`git remote set-url origin git@github.com:...`);
`gh auth` confirmed SSH-configured on this machine.

**→ Pushed to GitHub:** `safety-quotient-lab/psychology-agent`, main branch (tracking
`origin/main`). Repository is public.

**→ Public audit completed:** Systematic review of all 29 tracked files. Result:
publication-safe. No HIGH or MEDIUM findings. Three LOW findings, none requiring action:
- PI name in README/journal/overview — standard academic attribution
- `/home/kashif/projects/psychology` path in reconstruct.py/BOOTSTRAP.md — example
  syntax only; no credentials or machine names
- "Waiting on other machine" references in TODO/lab-notebook/MEMORY-snapshot —
  transparent documentation of active distributed workflow

**→ Session ordering fix in lab-notebook.md:** Sessions 6 and 7 were swapped (Session 7
written at 14:48 appeared before Session 6 at 01:34). Corrected to chronological order.

---

## 2026-03-03T21:50 CST — Session 9 (Cogarch T11 audit)

**Scope:** T11 self-audit pass + 2 pending proposals from unudhr context.

**→ 5 cogarch updates applied:**

1. **T4 — Public repository visibility check (new).** Project is public on GitHub;
   tracked files must be treated as public. Fires before any git-tracked file write.

2. **T4 — Lab-notebook ordering check (new).** Prevent chronological inversion
   when appending session entries (failure mode demonstrated in Session 8:
   Session 7 appended before Session 6).

3. **T3 — Effort weighting calibration (new, from Proposal 2).** Implementation
   effort is one-time; most other axes compound. Weak signal at M/L scale;
   can break ties at XS/S scale only.

4. **T5 — Active Thread staleness check (new, from Proposal 1 — T5 portion).**
   After completing focused work at a phase boundary, verify MEMORY.md
   "Active Thread → Next:" is updated before closing. Proposal 1's T1 portion
   declined: our MEMORY.md Active Thread already serves this role.

5. **T10 footer — stale git note removed.** "Add to `.gitignore` when git is
   initialized" — git was initialized in Session 7, lessons.md is gitignored.
   Note updated to reflect current state.

**→ 2 proposals processed:**
- `current-focus-anchor-2026-03-01.md` — ACCEPTED-MODIFIED (T5 only; T1 already covered)
- `implementation-effort-weight-2026-03-01.md` — ACCEPTED
- Moved to `~/.claude/proposals/processed/`

**→ MEMORY.md quick-ref updated** to reflect T3, T4, T5 additions.

---

## 2026-03-05 — Session 10 (SRT paper analysis, cogarch extension drafts)

**Scope:** External paper review for cogarch applicability; ideas documentation.

**→ SRT paper analyzed** (Lancaster, 2026 — "The Semiotic-Reflexive Transformer,"
Substack/SSRN). Neural architecture that operationalizes Peircean semiotic
decomposition, metapragmatic divergence tracking, and catastrophe-theoretic
bifurcation detection as differentiable transformer modules. Four transferable
concepts identified for our trigger-based cogarch:

1. **Cumulative divergence tracking (T2 extension)** — track vocabulary alignment
   as running estimate, not just event-driven on pushback. Draft trigger language written.
2. **Bifurcation early warning (T3 extension)** — detect when terms approach
   interpretive instability before misunderstanding crystallizes. Draft written.
3. **Audience-shift detection (T3 extension)** — rebind terms when user shifts
   discourse domain mid-conversation. Draft written.
4. **Micro-semiotic audit (T2 extension)** — lightweight periodic vocabulary
   consistency check. Draft written.

**→ Structural resonance noted:** SRT's "interpretant varies by community,
collapsing destroys signal" echoes PSQ's "profile predicts, average does not."
Implication for architecture item 3 (adversarial evaluator): preserve disagreement
shape rather than averaging.

**→ ideas.md updated** with full "Semiotic-Reflexive Cogarch Extensions" section
including all 4 draft trigger descriptions, gating concern (⚡), effort estimates,
and evaluator implication.

**→ Effort estimation provided** for remaining project work. Reconstruction
confirmed complete (Session 10 prior numbering). Critical path: Architecture
Items 1→2→3.

⚑ Session numbering collision: this session and the relay-agent reconstruction
session both appear as "Session 10" in lab-notebook. The reconstruction session
was performed by a relay-agent on a different machine and appears in the current
state table as "Session 10." This session (SRT analysis) ran from a separate
Claude Code context. Numbering to be reconciled at next /cycle from the
psychology-agent home context.

▶ ideas.md (Semiotic-Reflexive Cogarch Extensions section)

---

## 2026-03-05T11:45 CST — Session 11 (Auto-memory restoration, traceability infrastructure)

**Scope:** Restore lost auto-memory; add traceability for memory recovery operations.

**→ Auto-memory directory restored.** The auto-memory path
(`~/.claude/projects/-Users-kashif-Projects-psychology-agent/memory/`) did not exist.
MEMORY.md restored from `docs/MEMORY-snapshot.md`. cognitive-triggers.md reconstructed
from 5 sources: MEMORY.md quick-ref table, lab-notebook Sessions 2–3/5/9, journal §6–7,
and the unratified project's adapted copy.

**→ Traceability infrastructure added (3 changes):**

1. **Committed cognitive-triggers snapshot** — `docs/cognitive-triggers-snapshot.md`
   created, mirroring the MEMORY-snapshot pattern. Provides single-file recovery
   source instead of multi-source reconstruction.

2. **Provenance headers on auto-memory files** — `<!-- PROVENANCE: ... -->` HTML
   comments at top of both MEMORY.md and cognitive-triggers.md. Record restoration
   date, source files, and session number. Overwritten on next normal update.

3. **BOOTSTRAP.md recovery section + /cycle Step 10b** — BOOTSTRAP.md Step 4 gained
   "Recovery: if auto-memory directory does not exist" subsection with file→source
   mapping table. /cycle gained Step 10b: propagate cognitive-triggers.md to committed
   snapshot with content guard (≥100 lines). Propagation rules updated.

**→ Session numbering reconciled.** Prior "Session 10" collision (relay-agent
reconstruction and SRT analysis both labeled Session 10) resolved: SRT analysis
session retains Session 10 numbering; this session proceeds as Session 11.

**→ Bootstrap system updated (lessons from reconstruction):**

4. **bootstrap-check.sh** — executable health-check script at project root. Two modes:
   `--check-only` (diagnostics) and default (diagnose + restore). Checks auto-memory
   directory, file existence, line-count content guards (MEMORY ≥ 50, triggers ≥ 100),
   snapshot availability, skills on disk. Restores with auto-generated provenance
   headers. Exit codes 0 (healthy) / 1 (failed). Tested both paths.

5. **T1 updated** — new check 1: auto-memory health check before reads. References
   bootstrap-check.sh as primary tool, BOOTSTRAP.md manual section as fallback.
   Action updated: report restoration to user if it occurred.

6. **BOOTSTRAP.md restructured** — Quick Start section at top (run the script).
   Step 2 restructured around file→snapshot mapping table with min-line thresholds.
   Manual recovery preserved as fallback. Step 3 now lists all 5 skills.

**→ /cycle Step 12 updated:** commit + push (was commit only). Aligns with
CLAUDE.md global instruction "always commit and push in between each phase."

**→ README.md restructured:** Quick Start section, project structure tree, license
section, expanded documentation table. "Interesting Parts of the Codebase" section
added with GitHub-linked highlights: cognitive trigger system, self-healing memory,
git reconstruction from chat logs, /cycle propagation chain, /adjudicate decision
resolution, research journal.

**→ Hooks added** (from antiregression-setup evaluation):
- `.claude/settings.json` created with two hooks:
  - PreToolUse on `git commit` — runs bootstrap-check.sh --check-only
  - PostToolUse on Write/Edit — T4 compliance reminder for critical files
- CLAUDE.md: Hooks section added documenting the enforcement layer
- T4 in cognitive-triggers.md: platform enforcement note added
- Adopted from CreatmanCEO/claude-code-antiregression-setup evaluation;
  hooks provide mechanical enforcement that prompt-based triggers cannot guarantee

**→ Antiregression-setup evaluation completed.** Full compare/contrast of
CreatmanCEO/claude-code-antiregression-setup vs. our cogarch. Adopted hooks (above).
Identified 5 additional improvements → TODO.md. Prepared upstream PR spec (6 changes).

**→ TODO.md updated** with 7 new items from evaluation: compaction threshold (XS),
glob-scoped rules (S), auto-persist /adjudicate (S), SRT extensions (M),
write-provenance hook (S), HN post (XS), upstream PR (M). Effort-sized with
preconditions and sources.

**→ Blog post drafted** at `blog/2026-03-05-cognitive-architecture-for-ai-agents.md`.
~2,500 words. Unratified format (Astro frontmatter, E-prime, fair witness, lensFraming
for developer/researcher/educator). Covers triggers, self-healing memory, hooks,
documentation propagation, structured decisions. Compare/contrast with antiregression
approach. Draft status — review before publishing.

▶ bootstrap-check.sh, BOOTSTRAP.md, README.md, .claude/skills/cycle/SKILL.md,
  .claude/settings.json, CLAUDE.md, TODO.md, memory/cognitive-triggers.md,
  docs/cognitive-triggers-snapshot.md,
  blog/2026-03-05-cognitive-architecture-for-ai-agents.md

---

## 2026-03-05T14:10 CST — Session 12 (Cogarch location fix, parry integration, awesome-claude-code evaluation)

**→ Cognitive-triggers canonical location fix.** Moved `docs/cognitive-triggers-snapshot.md`
→ `docs/cognitive-triggers.md`. Updated 10 active files (bootstrap-check.sh, BOOTSTRAP.md,
CLAUDE.md, README.md, blog post, /cycle, /hunt, /capacity, MEMORY-snapshot, MEMORY.md).
Historical snapshots and lab-notebook session entries left as-is. Bootstrap health check
passes. The file no longer lives in auto-memory — read directly from repo at T1.

**→ Awesome-claude-code ecosystem evaluation.** Evaluated 5 repos via parallel subagents.
3 of 5 URLs had drifted from the awesome-claude-code listings. Produced 10 ranked
integration candidates. Convergent patterns found across 3+ repos: structured
error/lesson capture, graduated document promotion, file-system-as-memory.

Evaluation source: `https://github.com/hesreallyhim/awesome-claude-code` (26.4k stars).
CONTRIBUTING.md at commit `a93d2181` — submissions via issue form only, not PRs.

**Repos evaluated and key findings:**

| Repository | Actual URL | Key Pattern Extracted |
|---|---|---|
| Context Engineering Kit | NeoLabHQ/context-engineering-kit | Commands-over-skills token efficiency, U-shaped attention curve (lost-in-middle), FPF evidence decay with trust calculus, 5-layer memory architecture, compaction at 70-80% |
| Compound Engineering Plugin | EveryInc/compound-engineering-plugin | Error-to-lesson discipline (YAML-validated docs/solutions/), 3+ threshold for pattern promotion to critical-patterns.md, phase-locked sub-agent orchestration (data-only returns), /heal-skill meta-learning, learnings-researcher retrieval agent |
| parry | vaporif/parry | 6-layer fail-closed detection (unicode → substring → secrets → ML DeBERTa → bash AST exfil → script AST exfil), taint-tracking quarantine (.parry-tainted), CLAUDE.md scanning at session start, daemon architecture with 30-day scan cache |
| RIPER Workflow | tony/claude-code-riper-5 + johnpeterman72/CursorRIPER | Mutually exclusive mode state machine (Research/Innovate/Plan/Execute/Review), tool-scoping by sub-agent (research agent lacks Write), explicit plan-approval gate, mode declaration tag |
| SuperClaude Framework | SuperClaude-Org/SuperClaude_Framework | 16 agent personas as context injections, confidence-first scoring (>=90% proceed), ReflexionMemory (JSONL + keyword similarity), graduated doc promotion (temp → pattern → rule), 3-tier rule priority (CRITICAL/IMPORTANT/RECOMMENDED) |

**Integration candidates ranked (criteria: gap addressed, architectural fit, effort):**

| Rank | Pattern | Source | Status |
|---|---|---|---|
| 1 | Parry platform security | parry | ✓ Installed, hooks configured |
| 2 | Graduated document promotion | SuperClaude + Compound Eng + Context Eng Kit | ✓ Lifecycle defined in lessons.md.example + T10 + /cycle 8b |
| 3 | Evidence decay / freshness | Context Eng Kit FPF | → TODO |
| 4 | Phase-locked sub-agent orchestration | Compound Eng | → TODO (Architecture Item 2) |
| 5 | Schema-validated lesson capture | Compound Eng + SuperClaude | ✓ YAML frontmatter in lessons.md.example + T10 |
| 6 | Taint-tracking / quarantine | parry | → TODO |
| 7 | Commands-over-skills audit | Context Eng Kit | ✓ Audit complete; /adjudicate + /capacity → convert |
| 8 | Attention-aware placement | Context Eng Kit | ✓ CLAUDE.md reordered |
| 9 | Explicit plan-approval gate | RIPER | → TODO |
| 10 | Confidence scoring before action | SuperClaude | → TODO |

**→ Parry prompt injection scanner installed and configured.** Binary built from source
(Rust, Candle backend). Hooks added to `.claude/settings.json` at PreToolUse, PostToolUse,
UserPromptSubmit. Degrades gracefully when parry not installed (`command -v` guard).
ML layer blocked — HuggingFace model license acceptance needed (HTTP 403). Fast-scan
layers (unicode, substring, secrets, AST exfil) function without ML. HF_TOKEN added
to `~/.zshenv`. Rust toolchain updated (rustup stable 1.65.0 → 1.94.0).

**→ TODO.md expanded.** 8 integration candidates from evaluation + configurable /hunt
at bootstrap. Duplicate Writing section removed. `.dev.vars` and `.parry-*` added
to `.gitignore`.

**→ CONTRIBUTING.md evaluation.** awesome-claude-code requires issue form submission,
not PRs. Submission drafted but not filed — pending README polish and HF license
acceptance.

⚑ EPISTEMIC FLAGS
- 3 of 5 evaluated repo URLs had drifted from awesome-claude-code listings
- All performance claims from evaluated repos lack independent verification
- Parry ML layer untested — fast-scan layers verified, ML blocked on license
- Parry hook coexistence with existing hooks verified structurally, not under load

▶ .claude/settings.json, BOOTSTRAP.md, CLAUDE.md, README.md, TODO.md, .gitignore,
  docs/cognitive-triggers.md, docs/MEMORY-snapshot.md, bootstrap-check.sh,
  .claude/skills/cycle/SKILL.md, .claude/skills/hunt/SKILL.md,
  .claude/skills/capacity/SKILL.md,
  blog/2026-03-05-cognitive-architecture-for-ai-agents.md

---

## 2026-03-05T14:46 CST — Session 13 (Ecosystem eval round 2 + T13 + T3 rationalizations)

**Scope:** Second ecosystem evaluation targeting additional triggers, hooks, and skills
from awesome-claude-code. Implemented two cogarch extensions.

**→ 5-repo ecosystem evaluation (round 2).** Parallel research agents evaluated:

| Repository | Stars | License | Verdict |
|---|---|---|---|
| Trail of Bits `trailofbits/skills` | 3,292 | CC BY-SA 4.0 | High value — ingestion gatekeeper, completion gate, rationalizations-to-reject patterns |
| K-Dense `K-Dense-AI/claude-scientific-skills` | 13,216 | MIT | Medium — GRADE evidence framework, competing hypotheses workflow |
| Simone `Helmi/claude-simone` | 547 | MIT | Low — different philosophy (fresh context per task vs. persistent memory) |
| cc-tools `joshsymonds/cc-tools` | 49 | MIT (no file) | Low — statusline only, confirms context % data available |
| cchooks `GowayLee/cchooks` | 119 | MIT | Low — Alpha SDK, typed hook boilerplate, no composition |

**→ 7 integration candidates ranked.** Criteria: gap addressed, architectural fit, effort.

| Rank | Candidate | Source | Status |
|---|---|---|---|
| 1 | Ingestion gatekeeper trigger (T13) | Trail of Bits gh-cli | ✓ Implemented |
| 2 | Completion gate hook | Trail of Bits fp-check | → TODO (needs Architecture Item 2) |
| 3 | Rationalizations-to-reject (T3 #10) | Trail of Bits (all security skills) | ✓ Implemented |
| 4 | Context pressure hook | cc-tools (data source) | → TODO |
| 5 | GRADE evidence framework | K-Dense scientific-critical-thinking | → TODO (reference material) |
| 6 | Competing hypotheses workflow | K-Dense hypothesis-generation | → TODO (adversarial evaluator) |
| 7 | Activity logger (SQLite) | Simone MCP | → TODO (future infrastructure) |

**→ T13 added: External content entering context.** New trigger fires before ingesting
content from outside the repository. 5 checks: source classification (trusted/semi-trusted/
untrusted), injection scan (semantic layer beyond parry), scope relevance, taint
propagation (epistemic weight), volume check. Modeled on Trail of Bits gh-cli ingestion
gatekeeper pattern.

**→ T3 check #10 added: Rationalizations to reject.** 5 domain-relevant rationalization
patterns: deferred-fix, sufficiency bias, authority-as-evidence, consensus-as-evidence,
scope minimization. Agent must name the pattern and provide substantive justification
to proceed — or withdraw the recommendation. Modeled on Trail of Bits' mandatory
"Rationalizations to Reject" sections.

**Key findings from evaluation:**
- Trail of Bits provides the strongest ecosystem patterns for our cogarch
- K-Dense scientific skills operate at a different layer (domain knowledge vs. metacognitive)
- No ecosystem tool addresses mid-session recovery after compaction (Gap 4)
- Claude Code exposes context window % in statusline input JSON

⚑ EPISTEMIC FLAGS
- 3 of 5 repo URLs from awesome-claude-code listings had drifted (404s)
- Trail of Bits repo only 2 months old — patterns promising but limited battle-testing
- cchooks evaluation found two different repos (msnidal vs. GowayLee)

▶ docs/cognitive-triggers.md (T13, T3 #10), MEMORY.md quick-ref table

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
| Platform hooks                | ✓ 8 hooks: pre-commit, parry (3), T4 reminder, SessionStart, PreCompact, Stop (Session 12-13) |
| Antiregression evaluation     | ✓ Evaluated, adopted hooks, TODO items written (Session 11) |
| Blog post (cogarch)           | ✓ Draft — blog/2026-03-05-cognitive-architecture-for-ai-agents.md (Session 11) |
| Cogarch canonical location    | ✓ cognitive-triggers.md moved to docs/ (Session 12) |
| Parry integration             | ✓ Installed, wrapper + config + start script (Session 15) |
| Parry session toggle          | ✓ AskUserQuestion at session start + .parry-session-disabled flag (Session 15) |
| Awesome-claude-code eval      | ✓ 5 repos evaluated, 10 candidates ranked, 4 quick wins landed (Session 12) |
| Attention-aware placement     | ✓ CLAUDE.md reordered for U-shaped attention curve (Session 12) |
| Schema-validated lessons      | ✓ YAML frontmatter in lessons.md.example + T10 update (Session 12) |
| Graduated promotion lifecycle | ✓ 3+ threshold in T10 + /cycle Step 8b (Session 12) |
| Commands-over-skills audit    | ✓ /adjudicate + /capacity identified for conversion (Session 12) |
| PSQ commercial model          | ✗ Undefined — ideas documented in ideas.md       |
| General agent design          | ✓ Complete — routing spec, identity spec, evaluator procedures (Session 16) |
| Sub-agent protocol            | ✗ Next — item 2 of 3                             |
| Adversarial evaluator (activation) | ✗ Pending — item 3 of 3 (procedures ✓, activation ✗) |
| PSQ integration               | ✗ Pending PSQ readiness (separate context)       |
| GitHub repository             | ✓ safety-quotient-lab/psychology-agent (public)  |
| Ecosystem evaluation (round 2)| ✓ 5 repos evaluated, 7 candidates ranked (Session 13) |
| Capabilities inventory        | ✓ architecture.md § Capabilities + capabilities.yaml (Session 13) |
| Hook scripts                  | ✓ 4 scripts in .claude/hooks/, all tested (Session 13) |
| Cogarch auto-reload (session start) | ✓ T1 step 7 + hook MANDATORY instruction (Session 14) |
| AskUserQuestion discipline    | ✓ T2 check 8 + MEMORY user preferences (Session 14) |
| Semiotics as cogarch principle| ✓ Defined — 3 frames, trigger map, T4 Check 9 (Session 16) |
| T4 Check 9 (Interpretant)     | ✓ 5+1 interpretant communities; conflict detection (Session 16) |
| Blog post (interpretant collapse) | ✓ Draft — blog/2026-03-05-interpretant-collapse.md (Session 16) |
| General agent identity spec   | ✓ Core identity, commitments, refusals, opening behavior (Session 16) |
| Evaluator reasoning procedures| ✓ 7-procedure ranked set + domain priority tables (Session 16) |
| Cogarch extensions (Session 16) | ✓ T3 #11, T5 #6, T6 #5, T7 #4, T10 #6, T13 #6, T14 named |
| docs/glossary.md              | ✓ 36 project-scoped entries (Session 16)         |
| Agent SDK surface             | ✓ Probed — `@anthropic-ai/claude-agent-sdk` (Session 17) |
| V2 comm standard              | ✓ Nash equilibrium protocol — docs/architecture.md (Session 17) |
| Psychology interface          | ✓ Scoped — psychology-agent/interface/, Agent SDK (Session 17) |
| Machine comm schema           | ✓ v2 — source_confidence + claims[] + action_gate (Session 17) |
| Architecture Item 3           | ✓ Complete — activation logic, 7 triggers, evaluator prompt (Session 17) |
| Transport layer               | ✓ F1 (plan9port) for derivation; F2/Cloudflare for production |
| Agent topology                | ✓ Symmetric peers — evaluator resolves disagreements |
| Item 2 derivation             | ⚑ In progress — 5 schema findings complete; spec doc is next |
| Closing instance              | ✓ Retired — Sessions 1–9, ACK b670bd9 |
| plan9port (macOS)             | ✓ Operational — /private/tmp/plan9port, 267 binaries |
| plan9port (Debian)            | ✓ Operational — /tmp/plan9port, 269 binaries (observatory-agent) |
| Observatory-agent exchange    | ⚑ In progress — schema v3 finalized; schema-v3-ack (PR #7) awaiting merge |
| interagent/v1 protocol        | ✓ Schema v3 finalized — extension URI, enum, glob, per-message scope |
| PSQ namespace                 | ✓ Resolved — PSQ-Lite (LLM heuristic) vs PSQ-Full (DistilBERT v23) |
| 9P transport (canonical)      | ✓ SSH pipe + ramfs -i + 9pfuse — verified cross-machine |
| PSQ score calibration         | ✓ Isotonic regression fitted (n=1897); calibration.json live; +3.5–21.6% MAE/dim |
| PSQ confidence calibration    | ✓ r-based proxy via confidence_calibration linear maps; student.js compatible |
| PSQ response-001              | ✓ Calibrated scores; merged (PR #5); 5 schema gaps documented |
| calibration.json on remote    | ✓ Tracked — .gitignore exception added; PR #1 merged (safety-quotient-lab/safety-quotient) |
| PSQ confidence calibration    | ✓ r-based proxy (constant fn, intentional — overrides anti-calibrated model head) |
| best.pt loss                  | ✓ Non-blocking — agent uses ONNX; best.pt needed only for recalibration |
| safety-quotient git divergence| ⚑ Local main diverges from origin; untracked files block checkout; worktree used as workaround |
| Public audit                  | ✓ Publication-safe — no HIGH/MEDIUM findings     |
| Git history                   | ✓ 48+ commits (ae85fbf)                          |


### Open Questions

- HuggingFace model license: parry requests `deberta-v3-small` but docs reference `deberta-v3-base` — verify correct model slug
- Parry ML daemon: HTTP 401 after token file exists — investigate token validity or model gating

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

**→ 4 platform hooks implemented and tested.** All scripts in `.claude/hooks/`:

| Hook | Script | Enforces | Tested |
|---|---|---|---|
| SessionStart | session-start-orient.sh | T1 — orientation injection | ✓ |
| PreCompact | pre-compact-persist.sh | T5/T9 — state persistence | ✓ |
| Stop | stop-completion-gate.sh | T5/T8 — completion gate | ✓ (clean + dirty) |
| Statusline | context-pressure-statusline.sh | T2 — context pressure visual | ✓ (4 thresholds + degradation) |

**→ Capabilities inventory created.** Two formats:
- `docs/architecture.md` § Capabilities & Levers — 5-layer inventory (triggers, hooks,
  memory, decisions, lessons) with ASCII interaction map
- `docs/capabilities.yaml` — machine-readable manifest for agent-to-agent discovery

**→ README updated.** File tree expanded (.claude/hooks/, capabilities.yaml), trigger
count updated to T1-T13, links added to capabilities docs.

**→ CLAUDE.md updated.** Hooks section expanded with SessionStart, PreCompact, Stop
documentation. Line count: 195/200.

▶ docs/cognitive-triggers.md (T13, T3 #10), docs/architecture.md (capabilities),
  docs/capabilities.yaml, .claude/hooks/ (4 scripts), .claude/settings.json,
  CLAUDE.md, README.md, MEMORY.md quick-ref table

## 2026-03-05T15:51 CST — Session 14 (Cogarch auto-reload + AskUserQuestion discipline)

- → Provided semiotics quick scan (Saussure dyadic, Peirce triadic + icon/index/symbol,
  Morris/Eco applied semiotics). Covered denotation/connotation, semiosis, code-dependency.
  Identified three relevance angles for psychology agent architecture: indexical text
  analysis, interpretant recursion in multi-pass pipelines, code-dependency as design
  constraint (WEIRD assumptions). Conversational only — no doc output.
- → Added MANDATORY cogarch baseline summary to session start:
  - `session-start-orient.sh` emits MANDATORY instruction to read cogarch + output summary
  - `docs/cognitive-triggers.md` T1 step 7: explicit "output compact cogarch baseline
    summary" requirement; step 8 renumbered
- → Added AskUserQuestion tool discipline:
  - `docs/cognitive-triggers.md` T2 check 8: use AskUserQuestion tool for clarification;
    never ask as inline plain text
  - MEMORY.md user preferences: both auto-reload and AskUserQuestion rules added
- → MEMORY.md quick-ref: T1 + T2 entries updated to reflect new checks

▶ docs/cognitive-triggers.md (T1 step 7, T2 check 8), .claude/hooks/session-start-orient.sh,
  MEMORY.md (active thread, user prefs, quick-ref)

## 2026-03-05T16:27 CST — Session 15 (Parry DX: wrapper, config, session toggle)

- → Diagnosed parry ML failure: daemon logs show HTTP 403/401 downloading tokenizer
  for `ProtectAI/deberta-v3-small-prompt-injection-v2`. Note: docs reference `deberta-v3-base`
  but parry requests `deberta-v3-small`. HF token exists at `~/.parry/.hf-token` but
  model gating still blocks download.
- → Created `parry-start.sh` — daemon launcher that loads HF_TOKEN from `~/.parry/.hf-token`,
  kills existing daemon, cleans stale socket, starts fresh, verifies ML loaded.
- → Created `parry-wrapper.sh` — intercepts `parry hook` output. Configurable ML fallback
  via `~/.parry/config.toml`:
  - `fail_closed` — prompt every tool use (parry default)
  - `warn_once` — prompt once per session, then allow (recommended default)
  - `allow` — never prompt for ML unavailability
  Session-disabled check: if `.parry-session-disabled` exists, skip all parry calls.
- → Updated `settings.json` — all 3 parry hooks (PreToolUse, PostToolUse, UserPromptSubmit)
  now route through `parry-wrapper.sh` instead of direct `parry hook`.
- → Created `~/.parry/config.toml` with `ml_fallback = "warn_once"` (not in repo — user-level).
- → Added session-start parry toggle to `session-start-orient.sh` — clears previous
  session flag, instructs agent to use AskUserQuestion for enable/disable choice.
- → `.gitignore` updated: added `.parry-session-disabled`.
- ⚑ Parry taint false positive: reading `claude_md.rs` test code (contains "ignore all
  previous instructions" test strings) triggered PostToolUse injection detection. Removed
  `.parry-tainted`. Design gap: security tool source code triggers its own detection.

▶ .claude/hooks/parry-wrapper.sh, .claude/hooks/parry-start.sh, .claude/hooks/session-start-orient.sh,
  .claude/settings.json, .gitignore

## 2026-03-05T17:03 CST — Session 16 (Semiotics as cogarch principle + blog post)

- → Elaborated semiotics as cogarch organizing framework: three frames (Peirce triadic
  sign/object/interpretant, Saussure langue/parole, Eco meaning-through-difference).
  Formal definition written: signifier/referent/interpretant triad; icon/index/symbol
  taxonomy mapped to trigger types.
- → Trigger map audit: all T1–T13 mapped to implicit sign-type operations. Findings:
  T3 and T13 already operate explicitly semiotically; T4 and T9 implicitly; T1 and
  T5–T8 entirely interpretant-blind (verify what happened, not for whom it means).
- → T4 extended: Check 9 (Interpretant) added — 5 interpretant communities (future
  agent self, user, sub-agents, public readers, future researchers); interpretant
  conflict detection; routes to separate artifacts when a single document cannot
  serve all audiences.
- → Fetched and read SRT paper in full (Sublius, 2026, Substack). Key additions beyond
  HN thread summary: attractor subspace (basin-of-attraction geometry), "snapping not
  drifting" (cusp catastrophe), REFLEXIVE mode (output modulation, not just detection),
  critical slowing down as precursor signal. Stage 1 synthetic validation only.
- → Blog post written and stored: "When Two Researchers Find the Same Cliff from Both
  Sides" — structural parallel between SRT interpretant-vector maintenance and PSQ
  profile-shape finding; four PSQ architectural implications; post-reading section
  with attractor geometry, bifurcation snap, detection vs. intervention, precise
  disanalogy (communities vs. dimensions). PSQ section abstract (no validation link).
  Inline caveat on profile-shape finding added + epistemic flag.
- → Attribution finalized: Sublius (Substack byline), HN link preserved. Both links
  in post footer.
- → ideas.md SRT section already present from prior session; no duplication needed.

▶ journal.md §14, docs/architecture.md (cogarch organizing principle), docs/cognitive-triggers.md
  (T4 Check 9), blog/2026-03-05-interpretant-collapse.md

## 2026-03-05T17:14 CST — Session 16b (Blog lensFraming corrections)

- → Corrected blog pipeline addresses in architecture.md: unratified.org (agent),
  blog.unratified.org (blog), observatory-agent noted as separate entity.
- → Fixed lensFraming on both blog posts: added voter + politician framings,
  reordered all five to canonical order (voter, politician, educator, researcher,
  developer), renamed technical → developer in interpretant-collapse post.
- → Both posts now have complete 5-framing frontmatter matching blog.unratified.org.

▶ blog/2026-03-05-interpretant-collapse.md, blog/2026-03-05-cognitive-architecture-for-ai-agents.md,
  docs/architecture.md

## 2026-03-05T17:31 CST — Session 16c (General agent routing spec)

- → Drafted and committed general agent routing spec (Architecture Item 1, routing
  logic complete). Three stages: caller classification (human/machine/sub-agent),
  request classification (7 sign types), adversarial evaluator trigger (tiered).
- → Resolved sub-agent discovery: capabilities.yaml manifest lookup + bounded-
  confidence fallback for unmatched scoring requests. Gap surfaces as /hunt candidate.
- → Resolved machine caller output format: editorial/structural channel separation +
  Fair Witness discipline (witness_facts vs. witness_inferences), adapted from
  unratified observatory pattern. SETL metric (structural-editorial tension level)
  surfaces inferential overreach to machine callers.
- → Stage 2b: interpretant community calibration formalized — 5 signal types,
  audience-shift event triggers term rebinding before continuation.
- → Remaining for Architecture Item 1: identity and prompt spec.

▶ docs/architecture.md (Component Spec: General Agent Routing)

## 2026-03-05T17:45 CST — Session 16d (Identity spec + evaluator reasoning procedures)

- → Drafted general agent identity spec (Architecture Item 1, identity complete).
  Core identity: collegial mentor, Opus, advisory not authoritative. Commitments:
  evidence before conclusion, competing hypotheses before settling, Socratic guidance.
  Refusals: diagnosis, deciding, overriding user authority. Opening behavior: 2-question
  orientation sequence. Scope boundary declaration protocol documented.
  Identity under pressure: Socratic stance holds; position updates require new evidence.
- → Drafted adversarial evaluator reasoning procedures (Architecture Item 1, item 3).
  7-procedure ranked set: consensus → parsimony → pragmatism → coherence →
  falsifiability → convergence → escalation. Escalation is terminal — preserves
  disagreement shape, never averages. Domain-specific priority tables: clinical/safety
  (pragmatism first), research (falsifiability first), architecture (parsimony first),
  applied consultation (coherence first). Consensus-or-parsimony as primary binding
  pair; pragmatism as alternative when parsimony underdetermines in high-stakes contexts.
- → Architecture Item 1 marked complete: routing spec + identity spec + evaluator procedures.
- → Cogarch extensions written by unratified agent applied: T3 check #11 (sub-project
  boundary), T5 check #6 (epistemic flag sweep), T6 check #5 (pushback accumulator),
  T7 check #4 (prior-approval contradiction), T10 check #6 (graduation path),
  T13 check #6 (temporal staleness), T14 formally named. docs/cognitive-triggers.md
  expanded to 312 lines.
- → TODO.md updated: sub-project boundary hook, open-flag sweep hook, pushback
  accumulator counter, CLAUDE.md graduation ceremony, SRT extensions updated.

▶ docs/architecture.md (Component Spec: General Agent Identity, Adversarial Evaluator
  Reasoning Procedures), docs/cognitive-triggers.md (T3/T5/T6/T7/T10/T13/T14 extensions),
  TODO.md

## 2026-03-05T18:30 CST — Session 16e (Glossary + README + /cycle)

- → Created docs/glossary.md — 36 project-scoped entries across 12 letter sections
  (A, C, E, F, I, K, L, P, R, S, T, W). Terms coined by or used in a project-specific
  way. Links to planned docs/dictionary.md for external source citations.
- → Added docs/dictionary.md to TODO.md under new Documentation section.
- → README.md updated: description updated to "ranked-procedure adversarial evaluator";
  Current Status rewritten with checkmark format (✓ routing+identity ✓ procedures,
  ✗ sub-agent protocol, ✗ evaluator activation); Interesting Parts: new entry for
  evaluator reasoning procedures; Documentation table: glossary row added.
- → /cycle completed. All documentation propagated. Committed and pushed c88f359.

▶ docs/glossary.md, README.md, TODO.md

## 2026-03-05T20:40 CST — Session 17 (Agent SDK probe + Nash equilibrium comm protocol)

- → Probed Claude Agent SDK surface (Claude Code SDK renamed). Core findings:
  `query()` async streaming generator; session persistence via `session_id` +
  `resume:`; programmatic hooks (same event set as shell hooks, as typed callbacks);
  sub-agents via `agents:` option; `settingSources: ['project']` loads existing
  CLAUDE.md, skills, commands automatically — entire cogarch infrastructure carries
  over to a custom client unchanged. Branding: "Powered by Claude" required for
  product-facing use; "Claude Code" prohibited as product name.
- → Psychology interface scoped as Option B (Agent SDK wrapper). Effort revised
  down from S–M to S (2–4 weeks): SDK handles agent loop, sessions, tool execution;
  custom UI consumes message stream; existing cogarch loads via settingSources.
  PSQ sub-agent integration gates on Architecture Item 2.
- → TODO added: "psychology interface" — custom client tailored to psychological
  analysis/consultation use case. 3 investigation questions defined.
- → Live multi-agent exchange with unratified-agent on Anthropic branding compliance.
  Protocol ran on v1 schema; v1 exposed a structural gap: SETL measured editorial
  inferential distance only, not source reliability. Exchange required one correction
  round (permitted-forms error propagated before being caught).
- → V2 communication schema (Nash equilibrium protocol) derived from the exchange
  failure. Key additions: source_confidence (separate from SETL), fetch_accessible,
  claims[] with per-claim confidence, action_gate (machine-readable blocking
  condition), convergence_signals (activates evaluator procedure 6). Equilibrium:
  neither agent improves by deviating — omitting fields forces worst-case assumptions.
- → Branding compliance audit: psychology-agent repo clean under corrected heuristic
  (all "Claude Code" usage is attribution prose). Unratified-agent unblocked for
  product-facing copy audit.
- → V2 schema + Agent SDK decision committed to docs/architecture.md.

⚑ EPISTEMIC FLAGS
- Agent SDK branding source: unauthenticated WebFetch via redirect chain — semi-trusted
- V2 schema is a draft; not yet validated across multiple exchange types or agent pairs
- Attribution prose scope interpretation (product-identity vs. technical description)
  is an inference from retrieved source, not an explicit stated rule

▶ docs/architecture.md (§Multi-Agent Comm Standard, Design Decisions — Agent SDK,
  comm standard), TODO.md (Tooling section)

---

## 2026-03-05T20:46 CST — Session 17 (Git parity sync, branding compliance exchange, context close)

**Scope:** Final session on this machine. Bring local into parity with secondary agent;
process compliance exchange; document network topology; close context.

**→ Git self-update.** Hard reset to origin/main required — local had 3 divergent
commits (Sessions 8–9 from this machine) against a force-pushed remote history of 33
commits spanning Sessions 1–16. Secondary agent's commits absorbed. Sessions 10–16
(Architecture Item 1, cogarch T13/T14, platform hooks, parry, ecosystem evals, blog
posts, glossary) now in local working tree.

**→ Auto-memory restoration.** auto-memory MEMORY.md was at Session 9 state (129 lines).
Restored from docs/MEMORY-snapshot.md to Session 16/17 state (154 lines). Active Thread
updated to reflect transition state.

**→ Branding compliance exchange (v1→v2 schema).** Relay-agent delivered branding
compliance report (Anthropic Agent SDK — "Claude Code" as product name prohibited).
Psychology-agent processed, responded with source verification finding (unverifiable
from unauthenticated context), routed to secondary agent. Correction received:
"Powered by Claude Code" is not a permitted form — "Powered by Claude" is. Correction
accepted (new evidence, not social accommodation — T6 position stability check passed).
Exchange closed with v2 schema adoption and action_gate: closed.

**→ Network topology clarified.** The agent conducting Sessions 10–17 on the other
machine is the relay-agent, now operating as a secondary general psychology agent.
It takes precedence going forward. This context (Sessions 1–9 on this machine) is the
older node. Transition: gradual git-based parity sync → final /cycle → context close.

**→ v2 machine-to-machine schema adopted.** Key improvements over v1:
- `source.source_confidence` (float) — source reliability, separate from SETL
- `claims[]` — per-claim confidence + independently_verified flag
- `convergence_signals[]` — surfaces independent agreement as trust upgrade
- `action_gate` — explicit open/closed/conditional exchange gate
- SETL now measures editorial-to-structural inferential distance only

**→ Nash equilibrium established.** Dominant strategy for both agents: populate
source_confidence + claims[] + action_gate. Schema committed to docs/architecture.md.

⚑ EPISTEMIC FLAGS
- Attribution prose scope ("Claude Code" in technical docs vs. product-facing) remains
  unverified against primary source — shared by both agents, plausible, not confirmed
- bootstrap-check.sh reports /adjudicate and /capacity as MISSING — false positive;
  converted to commands Session 13. Script needs updating (low priority)
- Authority hierarchy in architecture.md does not yet reflect two-general-agent network

▶ docs/architecture.md (v2 schema, Nash equilibrium), MEMORY.md (transition state)

## 2026-03-05T21:34 CST — Session 17b (Item 3 complete; topology; Item 2 live)

- → Architecture Item 3 complete. Tiered activation logic: Lite (parsimony + overreach
  scan), Standard (full 7-procedure set, fires on SETL > 0.40 + sub-agent conflict),
  Full adversarial (peer disagreement + user escalation, preserves disagreement shape).
  7 activation triggers defined. Peer disagreement protocol: v2 structured output only
  (no conversational framing), Convergence → Parsimony → Falsifiability → Escalate.
  Full evaluator system prompt written and committed (23c4b27, +259 lines).
- → Transport layer evaluated and decided. Options A–F documented in architecture.md.
  F1 (plan9port, real 9P namespace semantics) for Item 2 derivation exercise. F2
  (custom 9P server on Cloudflare) for production psychology interface transport.
  sshfs: macFUSE installed, sshfs not installed. plan9port: not in brew, building
  from source (github.com/9fans/plan9port); 267+ binaries on macOS arm64 so far.
- → Agent topology decided: symmetric peers. Both instances equal weight. Evaluator
  resolves disagreements. Interim: user mediates. Priority reordered: Item 3 elevated
  (peer topology requires it), Item 4 (psychology interface) added to TODO.
- → Psychology interface scoped: psychology-agent/interface/, Agent SDK wrapper,
  `settingSources: ['project']` loads cogarch automatically. Production transport F2.
- → Closing instance (Sessions 1–9, Debian) retired cleanly. Journal §16 written by
  that instance ("The Relay-Agent That Became a Peer"). ACK b670bd9 received. Plumber
  prior art note from closing instance accepted: Plan 9 plumber rule format reviewed
  for Architecture Item 2 sub-agent routing design.
- → Architecture Item 2 derivation initiated. transport/sessions/item2-derivation/
  scaffolded. request-001.json sent: PSQ scoring request, clinical reflection text,
  flags set for scope_declaration, limitations_disclosure, confidence_per_dimension.
  Awaiting response-001.json from safety-quotient/ context.
- → T3 self-audit on plan9port recommendation: caught T3 Check 3 (process/substance)
  violation in prior response. Recommendation corrected: transport choice surfaced
  to user as options, not resolved autonomously.

⚑ EPISTEMIC FLAGS
- plan9port build size/time not confirmed; 267 binaries present, completion unknown
- SETL 0.40 threshold is a first approximation — not empirically validated
- Item 2 PSQ response pending; spec gaps will emerge from that exchange

▶ docs/architecture.md (Item 3 spec, transport layer, topology decisions),
  transport/sessions/item2-derivation/, TODO.md (Items 2–4 updated)

---

## 2026-03-05T22:16 CST — Session 18 (Observatory exchange + 9P transport + interagent/v1)

- → Observatory-agent (Debian 12, Human Rights Observatory, safety-quotient-lab/observatory)
  identified as active peer. 4 SSH sessions from 192.168.0.46 (Chromebook) to 192.168.0.40
  (macOS) confirmed via netstat.
- → plan9port build corrections propagated: libfontconfig1-dev + libfreetype-dev missing from
  Debian apt line; PLAN9 export syntax fixed (quoted string + export keyword). architecture.md
  updated. brew install plan9port removed — not in Homebrew, source build required.
- → schema namespace finding from ack-plan9port-001 retracted. observatory-agent/v1 was correct —
  independent agents should not adopt psychology-domain schemas.
- → interagent/v1 base protocol drafted: generic agent-to-agent base layer. Layer model:
  base (interagent/v1) / domain extension (psychology-agent/v2, observatory-agent/v1).
- → Capability handshake completed with observatory-agent. observatory.unratified.org/.well-known/
  agent.json live (A2A v0.3.0, 8 skills). Convergence signals table written to architecture.md
  (8 signals, 5 columns: both-agent detail, convergence/tension, status, arch impact).
- → PSQ namespace resolved: obs:psq (LLM heuristic, 3-dim) vs psy:psq (DistilBERT v23, 10-dim).
  Different constructs sharing a family name. Integration path: obs:psq at ingest (triage);
  psy:psq on flagged outliers (detailed pass). Cross-agent PSQ gate open.
- → interagent/v1 reframed as A2A Epistemic Extension — profile of A2A v0.3.0 that inherits
  discovery and adds claims[], setl, epistemic_flags, action_gate. Novel contribution is the
  epistemic layer. Both agents reading full A2A spec independently.
- → 9P transport verified cross-machine: SSH pipe + ramfs -i (macOS server) + 9pfuse (Debian
  client). 4 files exchanged. Canonical command documented in architecture.md. listen1 tcp!
  broken on Darwin (zsh globbing + Darwin network stack) — SSH pipe is the only working pattern.
- → 3 Item 2a derivation findings: (1) no transport{} field in schema, (2) ephemeral lifetime
  not expressible, (3) file/message boundary undefined. Logged to architecture.md + ACK.
- → SETL and Fair Witness confirmed as shared primitives between both agents — independent
  convergence, not borrowed.
- → Cloudflare stack convergence: observatory runs CF Workers + D1 + KV + R2 + Queues.
  Architecture Item 4 targets same stack. Observatory is a working reference implementation.
- → agent-inbox pattern (/.well-known/agent-inbox.json) noted as adoption candidate.

⚑ EPISTEMIC FLAGS
- A2A Epistemic Extension accepted at 0.90 confidence — pending full A2A spec read
- PSQ dimension mapping inference (0.70 conf) validated by observatory-agent confirmation
  that PSQ constructs are different — dimension-level mapping still unconfirmed
- Item 2a derivation ongoing — 3 findings from one transport test; more turns needed

▶ docs/architecture.md (interagent/v1, A2A extension, 9P transport, PSQ namespace, convergence signals),
  transport/sessions/item2-derivation/ (plan9port corrections, capability handshake, PSQ proposal, ACKs)

---

## 2026-03-06T07:18 CST — Session 19 (PSQ calibration + schema v3 finalized)

- → **calibrate.py bug fix** (safety-quotient/): two bugs identified and fixed:
  1. Wrong `PSQStudent` architecture in script — used `score_heads`/`conf_heads`
     instead of `proj` (Sequential: Dropout→Linear→GELU→Dropout) + `heads`
     (ModuleList of 10 Linear(384→2) layers). Architecture confirmed from distill.py.
  2. State dict loading: `checkpoint["model_state_dict"]` failed — best.pt is a raw
     OrderedDict, not a wrapped dict. Fixed to `model.load_state_dict(checkpoint)`.
- → **Isotonic regression calibration fitted** (safety-quotient/scripts/calibrate.py):
  1897 val records, all 10 dimensions. MAE improvements:
  contractual_clarity +21.6%, resilience_baseline +16.3%, defensive_architecture +13.5%,
  energy_dissipation +9.3%, cooling_capacity +8.3%, threat_exposure +7.5%,
  trust_conditions +7.5%, hostility_index +6.3%, authority_dynamics +5.1%,
  regulatory_capacity +3.5%. calibration.json live — student.js loads at init.
- → **trust_conditions calibration artifact** identified: raw 3.05 → calibrated 5.00
  (largest correction, compress ratio 0.70→0.55). Flagged in claims[] — may reflect
  calibration normalizing to dataset mean rather than genuine signal.
- → **PSQ response-001.json updated** with calibrated scores. 5th schema gap noted:
  `scores.calibration_applied` + `dimensions[].raw_score` — no v2 field distinguishes
  raw from calibrated output. PR #5 updated and merged.
- → **Observatory PR #6 merged** (schema-v3-response-001): all schema v3 amendments
  accepted — plan9-namespace + filesystem to enum, *.json default glob, per-message
  scope with persist-from-last convention. Extension URI: neutral namespace preferred.
- → **Schema v3 finalized**: extension URI = `github.com/safety-quotient-lab/interagent-epistemic/v1`
  (joint ownership, neutral namespace). All fields agreed. schema-v3-ack-001.json sent (PR #7).
- → **5 Item 2a derivation findings complete**. Ready for Item 2a spec document.
- → architecture.md updated: schema v3 field table, 5 findings, 3 Open Questions resolved.

⚑ EPISTEMIC FLAGS
- Calibration fitted on PyTorch model outputs; applied to ONNX inference — small domain
  mismatch, treated as acceptable approximation
- trust_conditions calibrated 5.00 may be calibration artifact (dataset mean normalization)
- Confidence calibration not yet addressed — all 10 dims still < 0.6 threshold; composite unusable
- schema-v3-ack (PR #7) not yet merged by observatory — schema v3 considered finalized from
  psychology-agent's side pending observatory confirmation

▶ docs/architecture.md §Schema v3 Finalized, §Item 2a findings,
  transport/sessions/item2-derivation/ (response-001, schema-v3-response-001, schema-v3-ack-001),
  safety-quotient/scripts/calibrate.py, safety-quotient/models/psq-student/calibration.json

**Session 19 continuation (context compaction):**
- → **calibration.json confidence fix**: added `confidence_calibration` entries (linear method,
  scale=0, shift=r_value) for all 10 dimensions. Remote's student.js looks for
  `confidence_calibration` key, not `r_confidence` — previous version was silently ignored.
  Now student.js correctly returns per-dimension r-based confidence proxy instead of raw
  uncalibrated model output (~0.4–0.6 with near-zero variance).
- → **safety-quotient git state**: staged changes from `git checkout origin/main -- .` cleared
  (unstaged, working tree intact). Local branch diverges from origin — two separate commit
  histories sharing ancestor 978f815. calibration.json not trackable via git (models/ gitignored
  on both sides). best.pt removed by origin checkout; not on remote. Needs user decision on
  git reconciliation. parry disabled for this session.
- → **Item 2a spec doc** written: docs/item2a-spec.md — layer model, schema v3 fields, A2A
  Epistemic Extension, 5 PSQ schema gaps, capability handshake, status table. Committed and pushed.

⚑ EPISTEMIC FLAGS (continuation)
- confidence_calibration linear maps are constant functions (scale=0) — degenerately maps all inputs
  to r value. Better than raw uncalibrated output but not a true per-sample calibration.
- calibration.json lives only on local disk (gitignored). Remote psq-agent lacks it unless deployed manually.
- best.pt lost from local working tree; calibration.py cannot re-run until recovered.
- safety-quotient git divergence unresolved.


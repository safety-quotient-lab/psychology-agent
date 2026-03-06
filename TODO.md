# General-Purpose Psychology Agent — TODO

Forward-looking task list only. Completed and emergent work goes to
`lab-notebook.md`, not here. See `lab-notebook.md` for session history.

---

## Architecture (in progress)

- [ ] **Item 1: General agent design** — prompt/identity, routing logic, Socratic
  protocol (dynamic calibration for humans; structural detection + direct mode
  for machine callers)
- [ ] **Item 2: Sub-agent protocol** — how sub-agents plug in, communicate scope,
  and declare validated boundaries
- [ ] **Item 3: Adversarial evaluator** — tiered activation logic, parsimony
  reasoning, overreach detection

---

## Skills

- [ ] **`/knock` as standalone skill** — extract knock-on analysis from `/hunt` Phase 5
  into a dedicated `/knock` skill (callable independently by user or agent). Add:
  domain classification step (Code/Data/Pipeline/Infrastructure/UX/Operational/Product),
  grounding step (verify actual dependencies before tracing orders), cross-domain
  patterns checklist. Update `/hunt` Phase 5 to reference `/knock` rather than
  embedding the protocol inline.

- [ ] **Memory topic-file pattern** — split MEMORY.md into an index file (~60 lines)
  + topic files read on demand. Candidate topics: `cogarch.md` (triggers quick-ref,
  working principles), `decisions.md` (design decisions table), `psq-status.md`.
  Add routing table to `/cycle` Step 7: what changed → which topic file to update.
  Update BOOTSTRAP.md Step 4 to reflect new structure.

- [ ] **Configurable /hunt at bootstrap** — optionally run `/hunt` after T1 orientation
  completes, so the agent surfaces highest-value work before the user asks. Should
  default off (not every session needs discovery). Activation options: (A) flag in
  CLAUDE.local.md, (B) bootstrap-check.sh exit message suggests it, (C) T1 check
  that reads a config value. Design should avoid adding latency to sessions that
  don't need discovery.

---

## Cogarch Improvements (from antiregression-setup evaluation + Session 11)

- [ ] **Compaction threshold trigger** — add concrete threshold to T2 context pressure
  check. Antiregression repo cites 80% of context consumed by file reads/tool results;
  recommends `/compact` at 60–70%. Add to T2: "If context exceeds 60%, invoke /doc to
  persist critical state, then consider /compact." Currently T2 says "context pressure"
  without a number.
  *Source: antiregression-setup README ("60% rule")*

- [ ] **Glob-scoped rules** — move language-specific conventions to `.claude/rules/`
  with glob patterns (e.g., `rules/python.md` scoped to `**/*.py`). Reduces CLAUDE.md
  context load when editing non-matching files. Currently CLAUDE.md loads 178 lines
  every session regardless. Low priority until implementation phase produces substantial
  code files.
  *Source: antiregression-setup `.claude/rules/` pattern*
  *Precondition: implementation phase started (code exists to scope against)*

- [ ] **Auto-persist /adjudicate output** — route /adjudicate decision documents to
  `plans/` or `docs/decisions/` automatically, not just conversation output. Plans
  written to disk survive context compaction; plans in conversation do not. Currently
  /adjudicate produces structured output that /doc can persist — but only when manually
  invoked. For Architecture Items 1–3, auto-persistence prevents decision loss.
  *Source: antiregression-setup planner-writes-to-file pattern*

- [ ] **Sub-project boundary hook** — PreToolUse hook that fires when a file path
  resolves inside `safety-quotient/` or `pje-framework/` during a general-agent
  session. Warns: "Sub-project boundary crossed — switch context or defer." T3
  check #11 covers the cognitive gate; this hook provides mechanical enforcement.
  *Source: Session 16 cogarch evaluation — gap in T3 scope*

- [ ] **Open-flag sweep hook** — Stop/PreCompact hook that searches the conversation
  for unresolved ⚑ flags (grep pattern `⚑` without adjacent "none identified").
  Reports count and summaries before allowing session close. Supplements T5 check #6
  at the platform level. Non-blocking (warning only), consistent with stop-completion-gate.
  *Source: Session 16 cogarch evaluation — T5 epistemic debt gap*

- [ ] **Pushback accumulator** — T6 check #5 is cognitive-layer only. A session-scoped
  counter (e.g., `.claude/pushback-count.tmp`, reset on session start) would give the
  hook layer visibility into pushback frequency without relying on the agent's attention.
  At count ≥ 3, hook surfaces "Structural disagreement pattern detected" to context.
  *Source: Session 16 cogarch evaluation — T6 single-instance detection gap*

- [ ] **CLAUDE.md graduation ceremony** — formal process for T10 check #6 (lesson
  graduation path). When user approves a promoted lesson as a standing convention:
  (1) append to CLAUDE.md under relevant section, (2) update lessons.md entry
  `promotion_status: graduated`, (3) log in lab-notebook. /cycle Step 8b should
  include a scan for `promotion_status: approved` entries pending graduation.
  *Source: Session 16 cogarch evaluation — T10 → CLAUDE.md escalation gap*

- [ ] **SRT-inspired cogarch extensions** — 4 draft triggers in ideas.md from SRT paper
  review. T4 Check 9 (Interpretant) implemented Session 16. Remaining 3: cumulative
  divergence tracking (T2), bifurcation early warning (T3), audience-shift detection
  (T3), micro-semiotic audit (T2). All add T2/T3 processing overhead. Consider gated
  activation: full suite only when divergence indicators exceed threshold; light mode
  (semiotic consistency only) by default.
  *Source: Sublius (2026) SRT paper; drafts in ideas.md*
  *Precondition: T11 audit to evaluate integration points*

- [ ] **Write-provenance hook** — extend PostToolUse Write/Edit hook to log which
  files were modified, when, and in what session. Lightweight provenance trail that
  catches cross-context overwrites (the integrity problem from Session 3). Could
  write to a `.claude/write-log.jsonl` or similar. More robust than relying on the
  agent to notice unexpected changes.
  *Source: antiregression-setup PostToolUse pattern + Session 3 cross-context overreach*

---

## Documentation

- [ ] **`docs/dictionary.md`** — taxonomy reference with links to canonical source
  definitions. Each entry: term, how this project uses it, link to original source
  (Peirce, Silverstein, Henrich et al. WEIRD, Scheffer CSD, PSQ dimensions → own
  validation paper when published, PJE constructs). Complements `docs/glossary.md`
  (project-scoped) with external provenance. Audience: researchers needing the
  citation chain.
  *Effort: M (source lookup + citation verification per entry)*

---

## Writing

- [ ] **Blog post: "Jurassic Park Development"** — narrative essay about reconstructing
  git history from AI chat logs. Core theme: life (and code) finds a way — the project
  existed before the repo did. Cover: why the history mattered, the relay-agent
  architecture, drift scoring as an epistemic tool, what the skipped Edit operations
  reveal about mechanical replay vs. understanding. Audience: developers + AI practitioners.

- [ ] **HN post for psychology-agent** — Show HN submission. Draft title and body text
  prepared (Session 11). Publish when README and repo are polished. Title candidates
  in lab-notebook Session 11.

---

## Upstream Contribution

- [ ] **PR to CreatmanCEO/claude-code-antiregression-setup** — contribute memory
  persistence, self-healing bootstrap, epistemic triggers, and provenance tracking.
  Six proposed changes: memory snapshot layer, bootstrap-check.sh, planner cognitive
  triggers (recommend-against + process/substance), epistemic flags in code-reviewer
  output, provenance tracking on CLAUDE.md template, content guard hook for CLAUDE.md.
  Full PR spec in lab-notebook Session 11.
  *Precondition: our implementations stable and tested across 2+ sessions*

---

## Awesome-Claude-Code Integration (from Session 12 evaluation)

*Source: 5-repo evaluation of awesome-claude-code ecosystem (Session 12).
Repos evaluated: Context Engineering Kit, Compound Engineering Plugin,
parry, RIPER Workflow, SuperClaude Framework.*

- [x] **Graduated document promotion** (Rank 2) — ✓ Session 12. Promotion lifecycle
  defined in lessons.md.example, T10 updated with promotion check (3+ threshold),
  /cycle Step 8b updated with promotion scan and schema check.

- [ ] **Evidence decay / freshness management** (Rank 3) — formalize T9 staleness
  checking with explicit freshness thresholds. Context Eng Kit FPF tracks evidence
  validity periods with three options: refresh, deprecate, waive. Our T9 checks
  "stale entries" without defining when an entry becomes stale. Add: age threshold
  (e.g., entries older than N sessions without update get flagged), decay action
  options, waiver documentation for entries that remain valid despite age.
  *Source: Context Eng Kit FPF evidence decay system*

- [ ] **Phase-locked sub-agent orchestration** (Rank 4) — sub-agents return data
  only; orchestrator holds exclusive write authority. Prevents rogue sub-agent
  writes. Directly relevant to Architecture Item 2 (sub-agent protocol).
  *Source: Compound Eng phase-locked execution*
  *Precondition: Architecture Item 2 in progress*

- [x] **Schema-validated lesson capture** (Rank 5) — ✓ Session 12. YAML frontmatter
  added to lessons.md.example (pattern_type, domain, severity, recurrence,
  trigger_relevant, promotion_status). T10 updated with classification step.

- [x] **Commands-over-skills token audit** (Rank 7) — ✓ Session 13. /adjudicate
  and /capacity converted from skills to commands. /doc, /hunt, /cycle remain
  as skills. Saves ~355 tokens/session from description loading.

- [x] **Attention-aware placement** (Rank 8) — ✓ Session 12. CLAUDE.md reordered:
  hooks + epistemic quality at top (high attention), stable communication conventions
  in middle, code style + project structure at end (high attention).

- [ ] **Modularization candidates** — evaluate external tools that could replace
  hand-rolled infrastructure:
  - **recall** (full-text session search) — could replace manual session archaeology
  - **claude-rules-doctor** — detects dead `.claude/rules/` files; relevant to
    glob-scoped rules TODO
  - ~~**cc-tools** (Go-based hooks)~~ — evaluated Session 13: statusline only, no
    hook infrastructure. Does not replace hand-rolled hooks. Provides context window %
    data confirmation. **Not adopting.**
  - ~~**cchooks** (Python hook SDK)~~ — evaluated Session 13: Alpha v0.1.5, typed
    boilerplate only, no composition primitives. Revisit if hooks grow beyond 5 entries.
    **Not adopting now.**
  Evaluate remaining for: license compatibility, maintenance activity, installation
  burden, whether it actually improves on what we have.
  *Source: awesome-claude-code tooling section*

---

## Awesome-Claude-Code Integration (from Session 13 evaluation)

*Source: 5-repo evaluation round 2 (Session 13).
Repos evaluated: Trail of Bits skills, K-Dense scientific skills,
Simone, cc-tools, cchooks.*

- [x] **Ingestion gatekeeper trigger** (Rank 1) — ✓ Session 13. T13 added:
  fires before external content enters context. 5 checks: source classification,
  injection scan, scope relevance, taint propagation, volume check.
  *Source: Trail of Bits gh-cli ingestion gatekeeper pattern*

- [ ] **Completion gate hook** (Rank 2) — Stop/SubagentStop hooks verify all phases
  executed before allowing "done." Trail of Bits fp-check uses LLM-evaluated
  structural completeness check at workflow termination. Maps to T5/T8 supplement.
  *Source: Trail of Bits fp-check*
  *Precondition: Architecture Item 2 (sub-agent protocol) in progress*

- [x] **Rationalizations-to-reject** (Rank 3) — ✓ Session 13. T3 check #10 added:
  5 domain-relevant rationalization patterns. Agent must name pattern and justify
  proceeding — or withdraw.
  *Source: Trail of Bits mandatory "Rationalizations to Reject" sections*

- [ ] **Context pressure hook** (Rank 4) — PreToolUse hook reads context window %
  from statusline data, warns at 60% threshold. cc-tools confirms data source exists
  in Claude Code's statusline input JSON.
  *Source: cc-tools statusline input format + TODO compaction threshold trigger*

- [ ] **GRADE evidence framework** (Rank 5) — adopt GRADE (Grading of Recommendations,
  Assessment, Development and Evaluations) as reference material for T3 confidence
  calibration. Start high, downgrade for problems, upgrade for strength.
  *Source: K-Dense scientific-critical-thinking skill*

- [ ] **Competing hypotheses workflow** (Rank 6) — 3-5 hypotheses with quality criteria
  (testability, falsifiability, parsimony). Reference material for adversarial evaluator.
  *Source: K-Dense hypothesis-generation skill*
  *Precondition: Architecture Item 3 (adversarial evaluator) in progress*

- [ ] **Activity logger** (Rank 7) — SQLite-backed cross-session audit trail as
  complement to markdown lab-notebook. Structured, queryable.
  *Source: Simone MCP activity logger*
  *Precondition: implementation phase (code exists to log against)*

---

## Awesome-Claude-Code Submission

- [ ] **Submit to awesome-claude-code** — file issue via web form at
  `https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml`.
  Category: Workflows & Knowledge Guides. Draft submission details in
  lab-notebook Session 12. Note: NC license may face scrutiny under their
  open-source compliance requirement — flag proactively.
  *Precondition: README polished, repo represents current state*

---

## Tooling

- [ ] **Investigate alternative Claude Code client ("psychology interface")** —
  explore building a custom client tailored to the psychology agent use case:
  a purpose-built interface for psychological analysis, research, and consultation
  rather than a generic coding assistant shell. Questions to investigate:
  (1) What does the Claude Code SDK / extension API expose to alternative clients?
  (2) What session, context, and memory management primitives would carry over?
  (3) What does a psychology-specific UI need that the CLI does not provide
      (structured output display, PSQ score visualization, session continuity
      across consultations, IRB-safe data handling)?
  Start with the SDK surface before committing to scope.

---

## PSQ Sub-Agent Integration

Managed in safety-quotient/ context. Do not duplicate here.
Blocking: API surface, confidence calibration, scope boundaries.

---


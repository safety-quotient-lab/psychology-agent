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

---

## Writing

- [ ] **Blog post: "Jurassic Park Development"** — narrative essay about reconstructing
  git history from AI chat logs. Core theme: life (and code) finds a way — the project
  existed before the repo did. Cover: why the history mattered, the relay-agent
  architecture, drift scoring as an epistemic tool, what the skipped Edit operations
  reveal about mechanical replay vs. understanding. Audience: developers + AI practitioners.

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

- [ ] **SRT-inspired cogarch extensions** — 4 draft triggers in ideas.md from SRT paper
  review (Session 10): cumulative divergence tracking (T2), bifurcation early warning
  (T3), audience-shift detection (T3), micro-semiotic audit (T2). All add T2/T3
  processing overhead. Consider gated activation: full suite only when divergence
  indicators exceed threshold; light mode (semiotic consistency only) by default.
  *Source: Lancaster (2026) SRT paper; drafts in ideas.md*
  *Precondition: T11 audit to evaluate integration points*

- [ ] **Write-provenance hook** — extend PostToolUse Write/Edit hook to log which
  files were modified, when, and in what session. Lightweight provenance trail that
  catches cross-context overwrites (the integrity problem from Session 3). Could
  write to a `.claude/write-log.jsonl` or similar. More robust than relying on the
  agent to notice unexpected changes.
  *Source: antiregression-setup PostToolUse pattern + Session 3 cross-context overreach*

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

## PSQ Sub-Agent Integration

Managed in safety-quotient/ context. Do not duplicate here.
Blocking: API surface, confidence calibration, scope boundaries.

---


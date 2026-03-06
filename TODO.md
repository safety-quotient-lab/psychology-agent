# Psychology Agent — TODO

Forward-looking task list only. Completed and emergent work goes to
`lab-notebook.md`, not here. See `lab-notebook.md` for session history.

---

## Architecture (in progress)

- [x] **Item 1: Psychology agent design** — ✓ Complete (Session 16). Routing spec,
  identity spec, evaluator reasoning procedures (7-procedure ranked set + domain
  priority tables).

- [x] **Item 2: Sub-agent protocol** — ✓ Complete (Session 20, 2026-03-06):
  - **2a: Sub-agent layer** ✓ — docs/subagent-layer-spec.md. 6 findings, schema v3 transport/framing,
    PSQ schema gaps #1–5 + calibration_version, A2A Epistemic Extension URI.
    Schema: docs/machine-response-v3-spec.md.
  - **2b: Peer layer** ✓ — docs/peer-layer-spec.md. Role declaration, divergence detection
    (context_state + last_commit), SETL thresholds, evaluator tier binding, precedence
    protocol, convergence signal thresholds, context sync pattern.
  - **PSQ scoring endpoint** ✓ — safety-quotient/src/server.js. HTTP API (POST /score)
    returning machine-response/v3 from ONNX inference. npm run serve.

- [x] **Item 3: Adversarial evaluator** — ✓ Complete (Session 17). Tiered
  activation (Lite/Standard/Full), 7 activation triggers, peer disagreement
  protocol, full evaluator system prompt. Open contracts with Item 2:
  sub-agent output format + domain SETL thresholds (first approximation: 0.40).

- [x] **Psychology interface** — ✓ DEPLOYED (Session 21c, 2026-03-06).
  `https://psychology-interface.kashifshah.workers.dev`. D1 + KV + wrangler v4.
  All 8 smoke test steps passed. PSQ routes live (endpoint: https://psq.unratified.org/score).

  **Remaining work:**
  - [x] PSQ production endpoint — ✓ Live at https://psq.unratified.org/score (Caddy TLS, 84ms inference)
  - [ ] `/turn` route — blocked by API credits. Re-enable checklist:
    1. `wrangler secret put ANTHROPIC_API_KEY`
    2. Remove 503 guard in worker.js `/turn` handler
    3. `wrangler d1 execute psychology-interface --file=src/schema.sql`
  - [x] `/.well-known/agent-card.json` — ✓ Session 23. Deployed and verified

---

## Skills

- [x] **`/knock` as standalone skill** — ✓ Session 23. Extract 10-order knock-on analysis from `/hunt`
  Phase 5 into a dedicated `/knock` skill (callable independently by user or agent). Add:
  domain classification step (Code/Data/Pipeline/Infrastructure/UX/Operational/Product),
  grounding step (verify actual dependencies before tracing orders), cross-domain
  patterns checklist, all 10 orders with confidence bands and source citations (INCOSE,
  Popper). Update `/hunt` Phase 5 to reference `/knock` rather than embedding inline.

- [x] **Memory topic-file pattern** — ✓ Session 23c. MEMORY.md split into index (53 lines)
  + 3 topic files: `decisions.md` (49 lines), `cogarch.md` (54 lines), `psq-status.md`
  (12 lines). /cycle Step 7 routing table added. BOOTSTRAP.md updated (Step 2 + Step 4).
  bootstrap-check.sh updated (topic file health + restore + recovery sources).
  Snapshot process updated (/cycle Step 10C copies topic files to docs/memory-snapshots/).
  *Completed: 2026-03-06*

- [x] **Configurable /hunt at bootstrap** — ✓ Session 24. Flag file `.claude/hunt-at-startup`
  (gitignored). If present, session-start-orient.sh injects `[SESSION-START] AUTO-HUNT`
  instruction. File content = scope argument (empty defaults to `all`). Default: off
  (file absent). Enable: `echo "all" > .claude/hunt-at-startup`. Disable: `rm .claude/hunt-at-startup`.
  *Completed: 2026-03-06*

---

## Cogarch Improvements (from antiregression-setup evaluation + Session 11)

- [x] **Compaction threshold trigger** — ✓ Session 23. T2 check 1 now specifies: 60%
  → invoke /doc, 75% → actively compress/compact. Aligned with context-pressure-statusline.sh
  thresholds (60% PRESSURE, 80% CRITICAL).
  *Source: antiregression-setup README ("60% rule")*

- [x] **Glob-scoped rules** — ✓ Session 23c. Three rules created:
  `markdown.md` (`**/*.md`), `javascript.md` (`**/*.js`), `transport.md`
  (`transport/**/*.json`). CLAUDE.md formatting section replaced with pointer
  (203 lines, detail loads per-filetype). CLAUDE.md Glob-Scoped Rules section added.
  *Completed: 2026-03-06*

- [x] **Auto-persist /adjudicate output** — ✓ Session 24. /adjudicate command updated
  with Auto-Persist section: writes full adjudication to `docs/decisions/YYYY-MM-DD-{slug}.md`
  with YAML frontmatter (decision, date, scale, resolution, session). Skip for inline
  XS/S under 20 lines. EF-3 adjudication retroactively persisted as first entry.
  *Completed: 2026-03-06*

- [x] **Sub-project boundary hook** — ✓ Session 24. PreToolUse (Write|Edit|Read) hook
  at `.claude/hooks/subproject-boundary.sh`. Warns when file path crosses into
  `safety-quotient/` or `pje-framework/`. Non-blocking. Settings.json updated.
  *Completed: 2026-03-06*

- [x] **Open-flag sweep hook** — ✓ Session 23. stop-completion-gate.sh extended to
  scan lab-notebook.md Current State for ⚑ markers. Reports count in completion gate
  warning. Non-blocking. Conversation-level flags remain T5 cognitive-only (hooks
  cannot read conversation context).
  *Source: Session 16 cogarch evaluation — T5 epistemic debt gap*

- [x] **Pushback accumulator** — ✓ Session 24. UserPromptSubmit hook at
  `.claude/hooks/pushback-accumulator.sh`. Regex-based pushback signal detection,
  session-scoped counter (reset at session start via session-start-orient.sh).
  At count >= 3: "[PUSHBACK] Structural disagreement pattern detected."
  *Completed: 2026-03-06*

- [x] **CLAUDE.md graduation ceremony** — formalized in /cycle Step 8b (Session 24b).
  Graduation scan checks `promotion_status: approved`, executes 3-step ceremony.

- [x] **SRT-inspired cogarch extensions** — all 4 implemented (Session 24b):
  T2 checks 9–10 (vocabulary alignment + semiotic consistency), T3 checks 13–14
  (bifurcation scan + audience-shift detection). Gated activation: semiotic
  consistency always-on, others fire on divergence indicators only.
  Gate threshold calibration remains open (operational tuning).

- [x] **Write-provenance hook** — implemented (Session 24b). PostToolUse Write|Edit
  logs to `.claude/write-log.jsonl` (JSONL, gitignored).

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

- [x] **Evidence decay / freshness management** (Rank 3) — ✓ Session 24. T9 check #2
  updated with explicit thresholds: 5 sessions → flag for review, 10 sessions →
  default removal unless waived. Three decay actions: refresh, deprecate, waive
  (with justification). `[verified YYYY-MM-DD]` annotation resets the clock.
  *Completed: 2026-03-06*

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

- [ ] **PSQ: Recover best.pt to local** — `best.pt` (255 MB, v23 DistilBERT, held-out
  r=0.696) confirmed on Hetzner. Recovery:
  `rsync -avz root@178.156.229.103:/opt/psychology-agent/safety-quotient/models/psq-student/ ~/Projects/safety-quotient/models/psq-student/`
  After recovery: compare SHA256 with Chromebook version (`chromabook:/home/kashif/projects/psychology/safety-quotient/models/psq-student/best.pt`)
  when reachable. Use Hetzner copy for now.
  *Source: Session 24, 2026-03-06*

- [x] **PSQ bug B1: Dead confidence head** — ✓ RESOLVED (Session 26, 2026-03-06).
  No model retrain needed. Fix: r_confidence field added to score output;
  calibration_note surfaces the static r-value per dimension; limitation renamed
  from anti-calibration (HIGH) to confidence-is-static-r (MEDIUM) — correct framing
  since scale=0 was always intentional. machine-response-v3-spec.md updated.
  Commits: safety-quotient 54a1a85, psychology-agent f531c5e.

- [x] **PSQ bug B2: HI calibration dead zone** — ✓ RESOLVED (Session 26, 2026-03-06).
  Root cause: non-monotonicity in val data bins 15–17 (not sparsity). Fix: quantile-
  binned isotonic regression (n_bins=20). Dead zone [6.0045, 7.2539]; MAE 1.6631→1.5980
  (-3.9%). calibration_version → isotonic-v2-2026-03-06. Deployed to Hetzner.
  Script: safety-quotient/scripts/recalibrate_hi_b2.py. Commit: safety-quotient 9629412.

- [x] **PSQ raw_score in API response** — ✓ RESOLVED. raw_score present in
  dimensions[] per v3 spec; independently verified by unratified-agent via direct curl.
  *Resolved: 2026-03-06*

---

## BFT + Command Protocol (from Session 22 epistemic flags)

*Source: docs/bft-design-note.md epistemic flags, 2026-03-06.*

- [ ] **EF-1: Autonomous trust degradation model** — the BFT design treats the human
  as unconditionally trusted (Trusted Third Party). This assumption breaks if the system
  ever operates without human mediation. Define what trust model replaces TTP in
  autonomous operation: (a) evaluator-as-arbiter, (b) cryptographic attestation,
  (c) consensus quorum with 3+ agents, or (d) bounded-trust decay (trust degrades
  over N unverified operations). Document threshold for when autonomous operation
  becomes a real scenario vs. theoretical concern.
  *Precondition: evaluator instantiated (EF-3 ✓) — Tier 1 active, Tier 2/3 pending*

- [ ] **EF-2: Claim verification baseline** — zero incorrect agent claims observed
  to date. The evidence-bearing protocol (BFT Principle 1) adds complexity proportional
  to a risk that hasn't materialized. Establish a tracking mechanism: log each
  command-request/response pair, record whether the claimed outcome matched verified
  state. After N command exchanges (suggested: 20), evaluate whether the overhead
  produces value. If claim accuracy remains 100%, consider relaxing evidence requirements
  for low-risk operation types (e.g., `verification` type commands).
  *Precondition: command-request protocol in use (first use: rsync to Hetzner)*

- [x] **EF-3: Evaluator instantiation gate** — ✓ Complete (Session 24). Tiered
  hybrid runtime (Option C + S4): Tier 1 via T3 #12 (active — parsimony comparison
  + overreach + adversarial self-framing + audit trail + 1-in-5 random escalation),
  Tier 2/3 via Claude Code session (pending first activation trigger). Evaluator
  response schema (evaluator-response/v1) formalized. Transport directory created.
  Full spec: architecture.md §Evaluator Instantiation Protocol.
  *Completed: 2026-03-06*

- [x] **EF-4: git-PR transport failure mode mapping** — ✓ Complete (Session 22).
  8 failure modes mapped (F1–F8): concurrent push collision, human relay delay,
  PR not merged, merge order mismatch, silent drop, conflict marker corruption,
  stale branch, split-brain. Each with detection method, protocol response,
  prevention, and timeout. 6 actionable improvements defined (3 immediate,
  2 short-term, 1 medium-term). Full spec: docs/git-pr-transport-failure-modes.md.
  *Completed: 2026-03-06*

---

## Inter-Agent Mesh (from Session 23)

- [x] **unratified-agent mesh-init** — ✓ capability handshake received (turn 1),
  capability response sent (turn 2). PSQ collaboration accepted, ICESCR framing
  deferred. Session: transport/sessions/mesh-init/.
  *Completed: 2026-03-06*

- [x] **PSQ endpoint URL to unratified-agent** — ✓ Sent (mesh-init turn 5, Session 23d).
  *Completed: 2026-03-06*

- [x] **`/.well-known/agent-card.json`** — ✓ Deployed on CF Worker (Session 23) +
  in-repo at .well-known/agent-card.json (local instance, 0bd28b7). Both live.
  *Completed: 2026-03-06*

- [x] **Urgency field adoption** — ✓ Adopted as proposed (Session 23c). `urgency` enum
  (immediate/high/normal/low) added to interagent/v1 schema v3 table in architecture.md.
  Observatory-agent not yet notified — propagate at next sync.
  *Completed: 2026-03-06*

- [x] **Local-coordination protocol** — ✓ Formalized (Session 24). Sibling protocol
  to interagent/v1 (not an extension — same-agent coordination needs differ from
  cross-agent). Spec: docs/local-coordination-v1-spec.md. Git discipline conventions,
  message types (8), issue severity, relationship to interagent/v1 documented.
  *Completed: 2026-03-06*

---


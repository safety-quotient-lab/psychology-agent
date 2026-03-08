# Psychology Agent — TODO

Forward-looking task list only. Completed and emergent work goes to
`lab-notebook.md`, not here. See `lab-notebook.md` for session history.

---

## Architecture

- [ ] `/turn` route — blocked by API credits. Re-enable checklist:
  1. `wrangler secret put ANTHROPIC_API_KEY`
  2. Remove 503 guard in worker.js `/turn` handler
  3. `wrangler d1 execute psychology-interface --file=src/schema.sql`

---

## Writing

- [x] **HN post for psychology-agent** — Published (2026-03-08). Draft was at
  `docs/hn-draft.md`.

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

## Awesome-Claude-Code Integration

- [ ] **Phase-locked sub-agent orchestration** (Rank 4) — sub-agents return data
  only; orchestrator holds exclusive write authority. Prevents rogue sub-agent
  writes. Directly relevant to Architecture Item 2 (sub-agent protocol).
  *Source: Compound Eng phase-locked execution*
  *Precondition: Architecture Item 2 in progress*

- [ ] **Modularization candidates** — evaluate external tools that could replace
  hand-rolled infrastructure. **License gate: MIT/Apache/BSD only — no GPL/AGPL.**
  - ~~**recall** (full-text session search)~~ — ✓ ADOPTED (Session 28c). `brew install zippoxer/tap/recall`. MIT.
  - ~~**ccusage** (token/cost tracking)~~ — ✓ ADOPTED (Session 28c). `npx ccusage@latest`. MIT.
  - ~~**claude-rules-doctor**~~ — SKIPPED. 9 stars, single maintainer; 5-line shell script equivalent.
  - ~~**cchistory**~~ — SKIPPED. 30-day retention ceiling, 6 months stale.
  - ~~**Claude Squad**~~ — SKIPPED. AGPL license; also assumes single-repo worktrees.
  - ~~**claude-tmux**~~ — SKIPPED. MIT but 44 stars, too small to depend on.
  *Evaluated: 2026-03-06 (Session 28c). Source: awesome-claude-code tooling section*

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

## PSQ Scoring Quality

- [ ] **Full Sonnet re-score (998 texts × 10 dims)** — re-score all 10 dimensions
  (TE, HI, AD, ED, RC, RB, TC, CC, DA, CO) with Sonnet. User chose to preserve
  full dataset at scoring time (Session 37 P2 resolution); psychology-agent decides
  which dims to use at retrain time. In-conversation protocol, one dim per session
  (~10 sessions). Gate resolution sent (turn 14); awaiting psq-agent ACK.
  *Precondition: scorer comparison complete (✓ Session 34), gate resolution sent (✓ Session 37)*

- [ ] **Retrain DistilBERT on Sonnet labels** — after Sonnet re-score, retrain v29+
  on improved labels. Expected: higher held-out r, better dimension independence.
  *Precondition: full Sonnet re-score complete*

- [ ] **Factor analysis on scoring data** — PCA on 11×998 Haiku scores and 10×998
  Sonnet scores to determine actual dimensionality. Confirm/deny 3-4 factor estimate.
  *Precondition: Sonnet re-score complete (Haiku data available now)*

- [ ] **Recalibrate all dimensions with quantile binning (B3)** — calibrate.py uses
  raw isotonic regression. TE has plateaus spanning 1.51 raw units (15% of scale).
  Apply quantile-binned pre-aggregation (n_bins=20, as HI B2 fix) to all 10 dims.
  Dead-zone scan after recalibration to verify no plateau >0.5 units remains.
  *Precondition: none — can run on current model. Should run BEFORE Sonnet retrain
  so the retrain benefits from improved calibration baseline.*

---

## BFT + Command Protocol

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

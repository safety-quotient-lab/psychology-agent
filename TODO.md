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

- [ ] **Cross-scorer concordance study (Opus vs Sonnet)** — psq-agent executed the
  1,000-text rescore using Opus instead of Sonnet (v35 deployed, held-out r=0.680).
  Before any further LLM-scored batches enter training, score a shared subset (n≥50)
  with both Opus and Sonnet, compute per-dimension ICC or Pearson r, and establish
  whether the scorers produce interchangeable labels. ACK turn 16 gates this.
  *Precondition: none — can run now. Gating further rescore work.*

- [ ] **Retrain DistilBERT on improved labels** — after concordance study confirms
  scorer consistency, retrain v36+ on the Opus-scored labels (or mixed Opus+Sonnet
  if concordance permits). Expected: higher held-out r, better dimension independence.
  *Precondition: cross-scorer concordance study complete*

- [ ] **Factor analysis on scoring data** — PCA on 11×998 Haiku scores and 10×998
  Opus scores to determine actual dimensionality. Confirm/deny 3-4 factor estimate.
  Factor analysis v3 (from psq-agent turn 15): KMO=0.910, g-eigenvalue=6.824,
  68.2% variance explained, 1 factor retained. Structural stability confirmed.
  *Precondition: concordance study complete (Haiku data + Opus data available now)*

- [ ] **Recalibrate all dimensions with quantile binning (B3)** — calibrate.py uses
  raw isotonic regression. TE has plateaus spanning 1.51 raw units (15% of scale).
  Apply quantile-binned pre-aggregation (n_bins=20, as HI B2 fix) to all 10 dims.
  Dead-zone scan after recalibration to verify no plateau >0.5 units remains.
  *Precondition: none — can run on current model. Should run BEFORE Sonnet retrain
  so the retrain benefits from improved calibration baseline.*

---

## Dignity Index

- [ ] **Phase A: Feasibility study** — PASS 1 COMPLETE. 50/50 assessed (27 PASS with DI
  composites, 19 ND correct, 4 deferred). Key results: r=0.328 (10.7% DI variance),
  8 signal inversions + 3 partial (spec required ≥5), relevance gate 19/19 (100%).
  3/4 success criteria met. Remaining: Pass 2 (fresh session, inter-rater reliability).
  Study doc: `docs/dignity-phase-a-study.md`. Spec: `docs/dignity-instrument-spec.md`.
  *Precondition: ✓ MET — observatory accepted Phase A (turn 6, PR #63)*

- [ ] **Phase B: Instrument design** — Hicks-based Dignity Index scoring prompt,
  calibration protocol, storage schema. Applies HRCB mode-collapse lessons.
  *Precondition: Phase A success criteria met*

- [ ] **Phase C: Complement integration** — PSQ + DI as independent co-displayed
  measures. Triage routing, DETL computation, mode labels.
  *Precondition: Phase B complete + observatory integration ready*

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
  *Evaluated Session 38: zero autonomous operation pressure observed. No agent has
  attempted action without human approval. Revisit trigger: first Tier 2 evaluator
  session fires. Correctly deferred until then.*

- [x] **EF-2: Claim verification baseline — tracker created** — tracking log at
  `docs/claim-verification-log.json`. Seeded with exchange #1 (rsync to Hetzner,
  7/7 claims verified). Review threshold lowered from 20 to 10 exchanges (current
  rate ~1/week makes 20 impractical). At 10 exchanges with 100% accuracy, relax
  evidence requirements for `verification`-type commands.
  *Created: Session 38 (2026-03-08). Next review: exchange #10.*

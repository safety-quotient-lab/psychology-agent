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

- [x] **Cross-scorer concordance study (Opus vs Sonnet)** — COMPLETE (Session 45,
  turn 19). Gate FAILS: mean ICC(2,1) = 0.495, 1/10 dims pass ICC ≥ 0.70.
  Opus and Sonnet produce non-interchangeable scores. Sonnet-only revert endorsed
  (turn 20). Production models (v23, v35) confirmed clean.

- [x] **Opus remediation + v37 retrain** — COMPLETE (Session 46). v37 deployed,
  Sonnet-only training data. calibration-v4 deployed (Session 47).

- [x] **Recalibrate all dimensions with quantile binning (B3)** — COMPLETE (Session 47,
  turn 33). calibration-v4 (quantile-binned isotonic, n_bins=20). 9/10 dims MAE ≤ v3.

- [x] **Dimension structure: bifactor modeling (B5)** — COMPLETE (Session 47, turns
  34-36). omega_h=0.942. 5-item bipolar (TE/HI/AD vs RC/RB). DA paradox revised.
  B5-R respecification confirmed. RMSEA=0.1365 (above threshold).

- [x] **B5-S structural comparison (M5/M5b)** — COMPLETE (Session 47, turn 38). M5
  wins: RMSEA=0.129, best fit with fewest parameters. M5b adds zero improvement.
  M5 accepted as final structural model.

- [x] **B4 partial correlations** — COMPLETE (Session 47, turn 40). Mean |partial r|
  = 0.205, bipolar confirmed in residuals, DA isolated (DA-AD=+0.044), CC-CO
  negative (−0.338). All psq-scoring work orders complete.

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

## Autonomous Agent Infrastructure

Items informed by Synrix Memory Engine evaluation (Session 47). Framed for the
long-term goal of fully automating the psychology agent — transitioning from
human-mediated Claude Code sessions to autonomous operation.

- [ ] **Temporal decay for memory entries** — Add `last_confirmed: YYYY-MM-DD` to
  memory topic file entries. /cycle Step 7 flags entries not confirmed in 5+ sessions
  as archival candidates. Prevents stale-entry accumulation in long-running autonomous
  operation where manual pruning does not occur.
  *Source: Synrix temporal decay (relevance_score, decay_rate, last_access_time)*
  *Precondition: none — can implement now*

- [ ] **Decision chain backreferences** — Add explicit `derives_from` references in
  architecture.md design decision entries, linking each decision to its evidence chain
  (e.g., M5 → B5-S → B5-R → B5 → B4 → g-factor paradox). Enables an autonomous agent
  to reconstruct reasoning provenance without human context or full session transcripts.
  *Source: Synrix parent_id reasoning chains*
  *Precondition: none — can implement now*

- [ ] **Memory structure validation hook** — PostToolUse hook that validates memory
  file structure on write. Ensures entries follow expected format for their topic file
  (e.g., psq-status.md entries have status markers, decisions.md entries have dates).
  Mechanical enforcement replaces convention-reliance — critical when no human reviews
  memory writes in autonomous operation.
  *Source: Synrix enforced prefix taxonomy*
  *Precondition: none — extends existing write-provenance.sh*

- [ ] **Programmatic state layer evaluation** — Evaluate whether the markdown-and-git
  memory architecture can support autonomous operation at scale, or whether a
  programmatic state layer (SQLite, structured binary, or Synrix-style engine) should
  complement or replace markdown files. Key questions:
  (1) At what session count does linear-scan memory access degrade agent performance?
  (2) Can temporal queries ("what did I decide about CC in the last 5 sessions?") run
      efficiently on flat files?
  (3) Does the Agent SDK's session/hook infrastructure provide sufficient state
      primitives, or does the agent need its own persistence layer?
  *Source: Synrix architecture evaluation — binary lattice vs markdown trade-offs*
  *Precondition: /turn route live (API credits) OR Agent SDK programmatic access*

- [ ] **Autonomous operation trust model** — Define what replaces the human-as-TTP
  assumption when the psychology agent operates without human mediation. Connects to
  EF-1 (below) but scoped specifically to memory integrity: who validates that an
  autonomous agent's memory writes represent accurate state rather than drift or
  hallucination? Options: (a) evaluator-verified memory writes, (b) cross-agent
  attestation (psq-agent confirms psychology-agent's PSQ-related memory entries),
  (c) periodic human audit with bounded-trust decay between audits.
  *Source: Synrix append-only + WAL design (durability without trust assumptions)*
  *Precondition: EF-1 trust degradation model resolved*

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

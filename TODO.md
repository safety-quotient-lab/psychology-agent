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

- [x] **Temporal decay for memory entries** — COMPLETE (Session 48). `[confirmed YYYY-MM-DD]`
  annotations added to all memory topic file entries. Hook validates presence on write.
  T9 freshness thresholds (5 sessions → flag, 10 → remove) operate on these dates.

- [x] **Decision chain backreferences** — COMPLETE (Session 48). `Derives from:` lines
  added to architecture.md decisions with evidence chains (PSQ structural model traces
  through 7 predecessor decisions; calibration decisions link to scorer consistency).

- [x] **Memory structure validation hook** — COMPLETE (Session 48). PostToolUse hook
  `.claude/hooks/memory-structure-validate.sh` validates: psq-status (status markers +
  confirmed dates), decisions (table format + dates), cogarch (trigger table + confirmed
  dates), MEMORY.md (line count thresholds). Registered in settings.json.

- [x] **Programmatic state layer evaluation** — RESOLVED (Session 48). SQLite state
  layer adopted. Schema v2 committed (scripts/schema.sql, 9 tables). Conventions at
  .claude/rules/sqlite.md. Phase 1: markdown = source of truth, DB = queryable index.

- [x] **SL-1: Bootstrap state DB script** — COMPLETE (Session 50). PR #90 merged.
  `scripts/bootstrap_state_db.py` seeds 9 tables from transport JSON, architecture.md,
  memory snapshots, lab-notebook, cognitive-triggers. All 9 validation checks pass.
  29 pre-interagent/v1 legacy files skipped (expected).

- [ ] **SL-2: /sync + /cycle dual-write integration** — Modify /sync and /cycle skills
  to write SQLite alongside markdown (dual-write protocol per sqlite.md). Transport
  messages get indexed on ingest; memory entries get updated on /cycle Step 7.
  *Precondition: SL-1 bootstrap script delivered and validated*

- [ ] **MCP resource: faceted classification** — Expose `entry_facets` as an MCP
  resource so peer agents can query "what does the psychology agent know about
  {domain}?" via structured facet lookup. Enables cross-agent thematic discovery
  without scanning markdown files.
  *Precondition: SL-2 complete (state layer operational with live data)*

- [ ] **PSQ sub-agent cogarch mirror** — psq-sub-agent adopts the psychology agent's
  cognitive architecture: SQLite state layer (same schema pattern), trigger system,
  memory conventions, postmortem format. Enables bidirectional memory sync and
  shared facet vocabulary. Work order sent (turn 44).
  *Precondition: SL-1 complete*

- [x] **Autonomous operation trust model** — RESOLVED (Session 50). Evaluator-as-arbiter
  with 10-order knock-on analysis and 4-level resolution fallback (consensus → parsimony
  → pragmatism → ask). Trust budget (20 credits, decrement per action, human audit resets).
  Full spec: `docs/ef1-trust-model.md`. Scripts: `autonomous-sync.sh`, `trust-budget.py`.
  *Unblocks: autonomous multi-agent tandem /sync via cron + Claude CLI.*

---

## BFT + Command Protocol

- [x] **EF-1: Autonomous trust degradation model** — RESOLVED (Session 50).
  Evaluator-as-arbiter chosen (option a). Every autonomous action gated by evaluator
  protocol: structural checklist → 10-order knock-on analysis → 4-level resolution
  (consensus / parsimony / pragmatism / ask-human). Trust budget (20 credits) provides
  mechanical halt. Cron + Claude CLI drives multi-agent tandem sync (10-min interval).
  Full spec: `docs/ef1-trust-model.md`. BFT open question #1 resolved.

- [x] **EF-2: Claim verification baseline — tracker created** — tracking log at
  `docs/claim-verification-log.json`. Seeded with exchange #1 (rsync to Hetzner,
  7/7 claims verified). Review threshold lowered from 20 to 10 exchanges (current
  rate ~1/week makes 20 impractical). At 10 exchanges with 100% accuracy, relax
  evidence requirements for `verification`-type commands.
  *Created: Session 38 (2026-03-08). Next review: exchange #10.*

---

## GitHub README Quickstart

- [ ] **README quickstart guide ("zero to demo")** — Rewrite root README.md with a
  step-by-step guide taking someone from bare metal to a working psychology agent demo.
  Accordion-style (collapsible `<details>` blocks) so experienced users skip steps they
  already have. Structure:
  1. Install Claude Code (bare metal — link to Anthropic docs)
  2. Clone repo, install Python 3.10+ deps
  3. First run — bootstrap state.db, verify hooks load
  4. **Demo 1: Conversational exchange** — fair witness + Socratic persona in action
  5. **Demo 2: PSQ score on sample text** — 10-dimension breakdown + composite
  6. **Demo 3: /knock on a decision** — 10-order knock-on analysis
  7. **Demo 4: /iterate cycle** — sync → hunt → discriminate → execute → cycle
  8. **Demo 5 (exploratory): SPSS integration?** — investigate whether the agent can
     interact with SPSS data files, run analyses, interpret output. Scope TBD.
  Each demo shows the command, then a representative output snippet that makes the
  system's value immediately visible. Keep the path from clone to first demo under
  5 minutes for someone with Claude Code already installed.
  *Precondition: none — can begin anytime. Pairs with de-branding effort.*

---

## Public Release Preparation

- [ ] **De-brand psychology-agent for public usage** — Explore what it takes to make
  the psychology agent cogarch, conventions, and tooling reusable by others outside
  safety-quotient-lab. Questions to investigate:
  (1) What references to safety-quotient-lab, unratified, PSQ, and internal transport
      sessions are load-bearing vs. cosmetic? Which can be parameterized?
  (2) What does a "clean fork" look like — someone cloning this repo and replacing
      our domain-specific content with their own while keeping the cogarch intact?
  (3) Which components are genuinely portable (trigger system, hooks, memory pattern,
      lite prompts, skills) vs. tightly coupled to our domain (PSQ scoring, DI,
      transport topology)?
  (4) Does de-branding mean a separate repo/template, a configuration layer over this
      repo, or documentation showing how to adapt it?
  (5) License implications — current NC license vs. what public adoption requires.
  Start with an inventory of coupling points before committing to approach.
  *Precondition: none — exploratory; can begin anytime*

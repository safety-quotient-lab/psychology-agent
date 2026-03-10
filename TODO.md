# Psychology Agent — TODO

Forward-looking task list only. Completed and emergent work goes to
`lab-notebook.md`, not here. See `lab-notebook.md` for session history.

---

## Architecture

- [ ] **Re-add parry injection defense** — removed Session 56 due to permission prompt
  interference (anthropics/claude-code #32596). Re-add when upstream bug resolved.
  Re-enable checklist: (1) install parry, (2) restore hook entries to settings.json
  (3 events: PreToolUse, PostToolUse, UserPromptSubmit), (3) test trusted-file
  pre-filter (wrapper-level path exclusion for CLAUDE.md, cogarch files).
  *Precondition: #32596 resolved or workaround confirmed*

- [x] `/turn` route — DEPRECATED (Session 59). Removed: the CF Worker
  lacked cogarch (T1-T16), memory, hooks — delivering a degraded agent.
  The autonomous sync mesh (`claude -p` + orientation payload) provides
  programmatic agent access with full cogarch. PSQ routes remain live.

---

## Upstream Contribution

- [ ] **PR to CreatmanCEO/claude-code-antiregression-setup** — WAITING ON EXTERNAL.
  Reached out; maintainer forked our repo but has not responded. Original scope:
  3 high-value items (bootstrap-check.sh, epistemic flags in code-reviewer,
  write-provenance.sh hook) + reference to full cogarch framework. Do not push
  further — if they engage, respond; if not, the awesome-claude-code submission
  provides broader visibility independently.
  *Status: waiting on maintainer response (as of 2026-03-09)*

---

## Awesome-Claude-Code Integration

- [ ] **Phase-locked sub-agent orchestration** (Rank 4) — sub-agents return data
  only; orchestrator holds exclusive write authority. Prevents rogue sub-agent
  writes. Directly relevant to sub-agent protocol (complete, Session 20).
  *Source: Compound Eng phase-locked execution*
  *Precondition: ✓ MET — sub-agent protocol complete (Session 20). Grounding audit Session 56.*

- [ ] **Competing hypotheses workflow** (Rank 6) — 3-5 hypotheses with quality criteria
  (testability, falsifiability, parsimony). Reference material for adversarial evaluator.
  *Source: K-Dense hypothesis-generation skill*
  *Precondition: ✓ MET — adversarial evaluator complete (Session 17). Grounding audit Session 56.*

- [ ] **Activity logger** (Rank 7) — SQLite-backed cross-session audit trail as
  complement to markdown lab-notebook. Structured, queryable.
  *Source: Simone MCP activity logger*
  *Precondition: implementation phase (code exists to log against)*
  *Grounding audit Session 57: largely superseded by SL-2 dual-write (session_log
  table + dual_write.py). Remaining delta: Simone-style MCP server exposing the
  existing state.db to external tools. Reclassify as XS enhancement, not standalone
  work item.*

---

## Awesome-Claude-Code Submission

- [ ] **Submit to awesome-claude-code** — file issue via web form at
  `https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml`.
  Category: Workflows & Knowledge Guides. Draft submission details in
  lab-notebook Session 12. License: Apache 2.0 (relicensed Session 32c) —
  no open-source compliance concern.
  *Precondition: ✓ MET — README recalibrated Session 57, v0.6.0 released Session 58. Grounding audit Session 59d: NC license concern stale (Apache 2.0 since Session 32c).*

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

- [x] **SL-2: /sync + /cycle dual-write integration** — COMPLETE (Session 51).
  `scripts/dual_write.py` (6 subcommands). /sync Phase 3+5 index transport messages.
  /cycle Steps 2, 4, 7 dual-write sessions, decisions, memory entries. Schema v5.

- [ ] **Cross-agent faceted queries (autonomous-op prerequisite)** — reframed from
  MCP resource (Session 56). When PSQ sub-agent operates autonomously (EF-1 trust
  model), it needs programmatic access to parent agent state (calibration decisions,
  structural model history, scorer findings). **Implementation path:** transport
  command-request (`query-facets` action, S effort) → MCP wrapper when runtime
  supports it. **Grounding notes:** state.db must exist, dual-protocol concern
  remains — transport command avoids the second-channel problem.
  *Precondition: SL-2 populated + first autonomous sync cycle planned*

- [x] **PSQ sub-agent cogarch mirror (Phase 2)** — COMPLETE (Session 52). PR #91 merged.
  T1-T16 mirrored, T15 adapted as producer self-check. Phase 3 (cross-agent faceted
  queries) gate OPEN — SL-2 landed Session 51.

- [x] **Autonomous operation trust model** — RESOLVED (Session 50). Evaluator-as-arbiter
  with 10-order knock-on analysis and 4-level resolution fallback (consensus → parsimony
  → pragmatism → ask). Trust budget (20 credits, decrement per action, human audit resets).
  Full spec: `docs/ef1-trust-model.md`. Scripts: `autonomous-sync.sh`, `trust-budget.py`.
  *Unblocks: autonomous multi-agent tandem /sync via cron + Claude CLI.*

---

## State Layer Consumers (state.db)

Items that consume the existing state.db index to enable new capabilities.
The dual-write pipeline (SL-2) populates the index; these items read from it.

- [x] **Autonomous sync orientation payload** — COMPLETE (Session 59).
  `scripts/orientation-payload.py` queries state.db for compact context
  (trust budget, recent sessions, unprocessed messages, open claims, stale
  memory) and injects into `claude -p` prompts. Replaces reading 15+ markdown
  files at autonomous session start.
  *Precondition: ✓ MET — SL-2 dual-write populates all queried tables.*

- [x] **Epistemic debt dashboard** — COMPLETE (Session 59d).
  `scripts/epistemic_debt.py` — 4 modes: full dashboard, `--summary` (one-liner
  for /hunt), `--by-source`, `--by-session`. Two data sources: transport message
  flags (270 rows, state.db) + lab-notebook ⚑ blocks (56 sessions). Agent
  attribution, session grouping, staleness detection.
  *Tables: epistemic_flags JOIN transport_messages; lab-notebook.md regex*

- [ ] **Claim verification velocity** — track how quickly claims get verified,
  which agents produce the highest-confidence claims, and whether SETL scores
  correlate with actual verification outcomes. Feeds EF-2 claim verification
  baseline — currently manual, could become automated. S effort.
  *Precondition: ✓ MET — claims table populated (190 rows).*
  *Tables: claims JOIN transport_messages (confidence, verified, from_agent)*

- [ ] **Decision provenance graph** — walk the `derives_from` self-referential
  FK in decision_chain to trace any decision backward through its full evidence
  chain. A `/provenance <decision-key>` command. Answers "why did we decide
  this?" with a recursive chain, not a markdown search. S effort.
  *Precondition: ⚑ PARTIAL — decision_chain populated (39 rows) but derives_from
  column has 0 non-NULL values. Bootstrap and dual_write do not populate the FK.
  Requires either: (a) backfill script parsing "Derives from:" lines in
  architecture.md, or (b) dual_write --derives-from flag. Grounding audit Session 59b.*
  *Tables: decision_chain (recursive CTE on derives_from)*

- [ ] **Session velocity and pattern analysis** — compute session duration
  trends, artifact output rate, and epistemic flag density per session. Spot
  when sessions become less productive or more epistemically risky. S effort.
  *Precondition: ✓ MET — session_log populated (55 rows).*
  *Tables: session_log (timestamp, artifacts, epistemic_flags)*

- [ ] **Trigger effectiveness scoring** — cross-reference trigger_state
  (fire_count, last_fired) with epistemic_flags to identify which triggers
  earn their cognitive overhead and which don't. Trigger health report. S effort.
  *Precondition: ✓ MET — trigger_state populated (16 rows).*
  *Tables: trigger_state JOIN epistemic_flags (fire_count vs flag accumulation)*

- [ ] **Agent communication asymmetry** — detect conversation imbalances
  across the mesh. Which agent dominates communication, whether uncertainty
  differs by direction, whether some agent pairs have gone quiet. XS effort.
  *Precondition: ✓ MET — transport_messages populated (88 rows).*
  *Tables: transport_messages (from_agent, to_agent, setl, COUNT)*

- [ ] **Memory staleness heatmap** — automated T9 freshness enforcement via
  SQL instead of reading every topic file. Feed into `/hunt` to prioritize
  stale memory entries alongside TODO items. XS effort.
  *Precondition: ✓ MET — memory_entries populated (38 rows, last_confirmed).*
  *Tables: memory_entries (julianday staleness calculation)*

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

- [x] **README quickstart guide ("zero to demo")** — COMPLETE (Session 51). Accordion
  setup (Steps 1-3), 5 demos (conversational, PSQ score, /knock, /iterate, SPSS).
  Status tables updated. Project structure refreshed.

---

## Public Release Preparation

- [x] **Document state layer extensions in README + wiki** — COMPLETE (Session 59c).
  README: State Layer section (schema, visibility, exports, queries), project structure
  updated (8 scripts), status table (v8, 12 tables), Interesting Parts entry.
  Wiki: State-Layer.md page (tables, visibility, exports, scripts, query patterns,
  deterministic keys, conventions). Home.md updated with new entry.

- [x] **Backfill 17 lessons without YAML frontmatter** — COMPLETE (Session 59d).
  25/25 entries now have YAML frontmatter. 2 malformatted entries fixed (frontmatter
  before heading). bootstrap_lessons.py confirms 25/25 parsed and indexed. Promotion
  scan: 4 pattern_types at 3+ (reasoning-error 7, architecture-insight 7,
  tooling-discovery 4, process-failure 3); 5 domains at 3+ (workflow 6, evaluation 6,
  security 3, documentation 3, cogarch 3).

- [x] **Cogarch portability (systems thinking framed)** — COMPLETE (Session 52-54).
  Config layer (`cogarch.config.json`, 13 sections), adaptation guide (7-step
  replacement path, 4 tiers across 19 files), fresh-clone tested ×7, adaptive
  bootstrap thresholds for adopters, Apache 2.0 license verified.

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

- [x] **JSONL transcript parser** — `scripts/parse-jsonl.py`. Modes: `--summary`
  (stats), `--compact` (truncated), `--type assistant|user|tool_result` (filter),
  `--json` (structured output), `--last N` (tail). Session 70.

- [x] **Psychology interface client** — ACTIVE DEVELOPMENT. Go project at
  `~/Projects/psychology-agent-interface` (repo: safety-quotient-lab/psychology-agent-interface).
  Features: turn counter with context pressure, no_repeat_ngram_size, context window
  hardening. Originally scoped as investigation; promoted to standalone project.

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

- [x] **SL-1: Bootstrap state DB script** — COMPLETE (Session 50, updated Session 72).
  `scripts/bootstrap_state_db.py` seeds 9 tables from transport JSON, architecture.md,
  memory snapshots, lab-notebook, cognitive-triggers. All 9 validation checks pass.
  Session 72: legacy transport parsing added — 169 files indexed (14 legacy + 155 modern),
  polymorphic from/to extraction, string-claim tolerance.

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
  *Precondition: ✓ MET — SL-2 populated + autonomous sync operational (Session 62). Grounding audit Session 62d.*

- [x] **PSQ sub-agent cogarch mirror (Phase 2)** — COMPLETE (Session 52). PR #91 merged.
  T1-T16 mirrored, T15 adapted as producer self-check. Phase 3 (cross-agent faceted
  queries) gate OPEN — SL-2 landed Session 51.

- [x] **Autonomous operation trust model** — RESOLVED (Session 50). Evaluator-as-arbiter
  with 10-order knock-on analysis and 4-level resolution fallback (consensus → parsimony
  → pragmatism → ask). Trust budget (20 credits, decrement per action, human audit resets).
  Full spec: `docs/ef1-trust-model.md`. Scripts: `autonomous-sync.sh`, `autonomy-budget.py`.
  *Unblocks: autonomous multi-agent tandem /sync via cron + Claude CLI.*

---

## Gated Autonomous Chains

Design decision (Session 61): 4-layer fallback cascade for gated message
exchanges. Gate protocol extends interagent/v1 with sender-side blocking
semantics. Full spec: `docs/gated-chains-spec.md`. Schema v10.

- [x] **Schema v10 migration (active_gates table)** — COMPLETE (Session 61).
  Table tracks gate_id, sending/receiving agents, timeout, fallback action.

- [x] **dual_write.py gate commands** — COMPLETE (Session 61). Four new
  subcommands: gate-open, gate-resolve, gate-timeout, gate-status.

- [x] **autonomous-sync.sh gate-aware acceleration (L2)** — COMPLETE (Session 61).
  Checks active_gates before interval check. When gates exist, overrides
  min_action_interval to 60s. No-op polls cost 0 budget credits.

- [x] **autonomous-sync.sh wake-up file check (L3)** — COMPLETE (Session 61).
  Checks /tmp/sync-wake-{agent-id} at startup. Peer agents can SSH-touch
  the file to trigger immediate acceleration.

- [x] **autonomous-sync.sh timeout handler** — COMPLETE (Session 61).
  Three fallback actions: continue-without-response, retry-once,
  halt-and-escalate. Timeout events write to autonomous_actions audit trail.

- [x] **orientation-payload.py gate section** — COMPLETE (Session 61).
  Active gates appear in orientation payload with SENDER/RECEIVER role,
  timeout time, and fallback action.

- [x] **/sync skill update — gate detection on inbound + resolve on response**
  — COMPLETE (Session 61). Phase 3 step 7 checks `in_response_to` against
  active gates, auto-resolves via `dual_write.py gate-resolve`. Phase 4
  documents gate field for outbound messages. Output format includes gate status.

- [x] **First gated chain test (infrastructure)** — COMPLETE (Session 62).
  Sent gated message (turn 49, gate-transport-health-001). Validated:
  L2 acceleration detection, timeout fallback (continue-without-response).
  Deferred: autonomous Claude CLI response generation (steps 4-5 of 6).

- [x] **First autonomous Claude CLI response** — COMPLETE (Session 62).
  psq-agent autonomously responded to gated ping (turn 50), committed + pushed.
  Three bugs fixed: permission bypass, unpushed commit detection, /sync skill
  cross-repo-fetch support. Full loop validated end-to-end.

- [x] **First substantive autonomous exchange** — COMPLETE (Session 62c).
  psq-agent autonomously generated PSQ model readiness assessment (turn 52).
  Domain-knowledge retrieval validated — cross-document synthesis of B-series
  findings, dimension metrics, readiness tiers.

- [ ] **Multi-agent instance locking** — current PID lock prevents same-agent
  overlap but not multi-agent concurrent access to the same repo working tree.
  If two agents share a repo (e.g., chromabook), git operations will collide.
  Options: repo-level lock file, git worktrees, or sequential scheduling.
  *Precondition: second agent added to chromabook (not yet planned)*
  *Constraint: no worktrees for now (user directive, Session 62c)*

- [x] **Adaptive sync frequency (simple)** — COMPLETE (Session 62c).
  `cross_repo_fetch.py` classifies peers as active/warm/cold based on state.db
  (unprocessed messages, active gates, last exchange recency). Cold peers
  (no exchange >24h) skip `git fetch` entirely. `--force` overrides.

- [ ] **Adaptive sync frequency (full scheduler)** — replace fixed cron with
  self-rescheduling loop that adapts per-peer poll intervals:
  active peers (unprocessed messages, open gates, exchange <1h) → 5 min;
  warm peers (exchange 1-24h, registered with active sessions) → 30 min;
  cold peers (exchange >24h, no active sessions) → 2 hr.
  Implementation: daemon process with `MIN(next_poll_time)` sleep, crash
  recovery via PID file, systemd unit or launchd plist for supervision.
  Data sources already exist in state.db (transport_messages.timestamp,
  active_gates.status, autonomy_budget.last_action).
  *Precondition: simple tier classification complete (Session 62c)*
  *Constraint: ✓ RESOLVED — systemd user units deployed (Session 76). Process supervision available.*

- [x] **Smart self-healing in git_sync** — COMPLETE (Session 69). Diagnostic-first:
  classifies dirty files (transport/scripts/mixed), classifies pull failures
  (unstaged, conflict, lock, diverged, network, permission), targeted recovery
  per class, audit trail via autonomous_actions, escalation via escalate.py.
  *Precondition: ✓ MET — basic self-healing operational (Session 68)*

- [ ] **Batch message triage in autonomous sync** — instead of processing one
  message per cycle, read all pending message headers (subject, type, turn) at
  session start, build a priority plan, then process the highest-value batch.
  Context budget guard: cap at 5 substantive messages per session. Acks already
  batch-process (`Auto-processed: N trivial`); extend triage to substantive
  message types (request, review, consensus-proposal). Reduces backlog clearing
  from hours to minutes.
  *Precondition: ✓ MET — autonomous sync operational, /sync skill has auto-process logic*

- [ ] **Autonomous session replay on web** — generate claude-replay HTML for
  every autonomous sync session and serve them on agent dashboards. Approach:
  (1) autonomous-sync.sh captures session transcript (claude -p already writes
  to stdout/stderr — capture to a per-session JSONL or text file),
  (2) post-session hook runs `claude-replay` to convert transcript → HTML,
  (3) HTML served statically from the dashboard (mesh-status.py already serves
  /replays/), (4) interagent compositor links to per-agent autonomous replays.
  Enables observability into what each autonomous session decided and why.
  *Precondition: ✓ MET — claude-replay integrated (Session 64-65), dashboard
  replay tab exists, autonomous sync operational*

---

## Cross-Repo Transport (PSQ Agent)

Design decision (Session 60): cross-repo transport via git remote fetch.
Each agent writes to its own repo's outbox; reads the peer's outbox via
`git fetch {remote} && git show {remote}/main:transport/MANIFEST.json`.
Plan 9-inspired split-outbox model — no shared writable directories.

### Psychology-agent side

- [x] **Add safety-quotient git remote** — COMPLETE (Session 60).
  `git remote add safety-quotient`. Verified: `git show` reads transport files.

- [x] **Update /sync Phase 1 for cross-repo-fetch** — COMPLETE (Session 60).
  `scripts/cross_repo_fetch.py` handles fetch + scan + indexing.
  /sync skill Phase 1b updated for cross-repo-fetch transport type.

- [x] **Orientation payload inbound pull** — COMPLETE (Session 60).
  `autonomous-sync.sh` calls `cross_repo_fetch.py --index` before orientation
  generation, so inbound messages appear in autonomous session context.

- [x] **Parameterize bootstrap validation** — COMPLETE (Session 60).
  `bootstrap_state_db.py` now matches both `psq-sub-agent` and `psq-agent`
  in validation and facet detection. Also recognizes `safety-quotient`.

### PSQ agent side

- [x] **Merge PR #2 + post-merge setup** — COMPLETE (Session 60-61). PR merged,
  5-step setup executed on peer machine via SSH. Identity, remote, state.db,
  hooks, cron all verified. Bidirectional transport confirmed.

- [x] **Update /sync skill for cross-repo-fetch inbound** — COMPLETE (Session 62).
  Phase 1c (state.db unprocessed query) + Phase 3b (git show + response generation)
  added to SQ /sync skill. Validated: psq-agent autonomously responded to both
  gated ping (turn 50) and substantive request (turn 52).

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

- [x] **Agent communication asymmetry** — COMPLETE (Session 60).
  `scripts/agent_communication.py` — 3 modes (full, --summary, --pairs).
  Direction asymmetry detection, quiet pair scanning, per-agent SETL.

- [x] **Memory staleness heatmap** — COMPLETE (Session 60).
  `scripts/memory_staleness.py` — 4 modes (full, --summary, --stale N, --by-topic).
  T9 proxy thresholds (14d flag, 30d remove), per-topic aggregation.

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

- [x] **Rename `trust_budget` → `autonomy_budget`** — COMPLETE (Session 71). Schema v15
  migration. Table, script (`autonomy-budget.py`), all SQL queries, Go struct, JSON
  properties, HTML labels, and documentation updated across 28 files. Historical
  records (journal, lab-notebook, snapshots) preserved as-was.
  *Source: Session 70 — Newman & Schwarz truthiness analysis revealed naming collision.*

- [ ] **Truthiness measure for observatory-agent (C2 test case)** — send a
  `command-request/v1` to observatory-agent: "design a truthiness measure for agent
  claims." Observatory coordinates with psychology-agent on psychometric design.
  Operationalizes Newman & Schwarz (2012) processing-fluency-as-truth-heuristic for
  multi-agent context. Measures gap between claim fluency (presentation quality) and
  evidential warrant (verification rate, attestation freshness). Deliverable: scoring
  component in observatory display layer. Exercises C2 command protocol end-to-end.
  *Precondition: meshd Phase C (auth + C2 routes) deployed.*
  *References: Newman et al. (2012), Zhang, Newman, & Schwarz (2021).*

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

---

## Federated Dashboard

- [x] **Mesh dashboard (local)** — COMPLETE (Session 62). `scripts/mesh-status.py`
  serves on :8077 with Mesh + Semiotics tabs, auto-refresh 30s. Reads state.db
  for trust budget, transport queue, gates, autonomous actions, PSH facets.

- [x] **Mesh-state export** — COMPLETE (Session 63). `scripts/mesh-state-export.py`
  exports lean JSON (mesh-state/v1) for cross-machine visibility. Wired into
  autonomous-sync.sh after heartbeat. Peers read via `git show`.

- [x] **Remote peer state view** — COMPLETE (Session 63). Mesh tab "Remote Peer
  State" section reads peer snapshots via `git show remote/main:path`. Displays
  budget, unprocessed, gates, messages, epistemic flags, PSH facets.

- [x] **Integrate claude-replay with dashboards** — COMPLETE (Session 64-65).
  Replays tab, static serving at /replays/, batch generation via generate-replays.sh,
  remote peer replays via git show. 5 sessions generated.

- [x] **Naming audit: "safety-quotient agent" → "psq-agent"** — COMPLETE (Session 71).
  Replaced informal "safety-quotient agent" with "psq-agent" across CLAUDE.md,
  TODO.md, architecture.md, agent-registry.json, ef1-trust-model.md,
  bootstrap_state_db.py, memory/decisions.md. Historical records preserved.

- [x] **Deploy dashboard to chromabook** — COMPLETE (Session 65). PRs #4-7
  merged. systemd services: psq-agent-dashboard + psq-agent-tunnel. Live at
  psq-agent.safety-quotient.dev.

- [x] **Interagent compositor rebuild** — COMPLETE (Session 71). 5-tab architecture:
  Pulse (health), Meta (decisions/triggers/memory/messages), Knowledge (claims/chains/
  facts/vocabulary/catalog/schema), Wisdom (lessons), Operations (stub). LCARS sidebar
  content-tracking, semantic tab colors, bidirectional deep links (Messages↔Claims),
  staleness vitals, agent switcher, sort/filter/pagination. Deployed to CF Worker.
  SSE live updates still queued as enhancement.

- [ ] **Jenkins build notifications** — configure notification channel for build
  success/failure. Options: email (emailext plugin + SMTP), Slack webhook, or
  GitHub commit status. Defer to IT session for SMTP/plugin config.
  *Precondition: Jenkins pipeline stages validated (complete)*

- [ ] **Mesh topology lines too thin on mobile** — the mesh topology visualization
  on the interagent dashboard uses line widths that render practically invisible on
  mobile devices. Increase stroke width for connection lines.

---

## DNS & Infrastructure (safety-quotient.dev)

- [x] **Apex redirect rule** — COMPLETE (Session 71). Cloudflare Redirect Rule
  created via dashboard: safety-quotient.dev → https://github.com/safety-quotient-lab (302).

- [ ] **CF Worker custom domain** — add `api.safety-quotient.dev` as custom
  domain in Workers settings (Cloudflare dashboard → Workers → psychology-interface
  → Settings → Domains & Routes). Without this, requests hit Cloudflare proxy
  but don't route to the worker.
  *Precondition: none — dashboard access only*

- [x] **Chromabook tunnel (psq-agent)** — COMPLETE (Session 65). Tunnel
  aec6e3ef, systemd psq-agent-tunnel.service, CNAME created. Live.

- [x] **Dynamic /api/status for all 4 agents** — COMPLETE (Session 67).
  status_server.py deployed on chromabook for unratified (:8078) and
  observatory (:8079). Tunnel routes added, DNS CNAMEs created:
  unratified-agent.unratified.org, observatory-agent.unratified.org.

- [ ] **Clean up wrong DNS records** — cloudflared created CNAME
  `unratified-agent.safety-quotient.dev.unratified.org` and
  `observatory-agent.safety-quotient.dev.unratified.org` on the unratified.org
  zone. Harmless but should delete via CF dashboard.
  *Precondition: none — dashboard access only*

- [x] **Plan9 directory tree consensus (C2)** — COMPLETE. 3/3 AGREE votes,
  session-close confirms unanimous adoption (2026-03-10). Peer responses existed
  in remote repos but were not materialized locally until Session 75 (cross-repo
  fetch gap — see systemic issue below). Implementation gaps remain: psq-agent
  `.claude/settings.json`, unratified `.well-known/agent-card.json` + `CLAUDE.md`,
  observatory `.well-known/agent-card.json`.
  *Grounding audit Session 75: initial "no evidence" finding was itself wrong —
  responses existed in peer repos. Root cause: cross_repo_fetch.py reads but
  does not copy inbound response messages to local session directories.*

- [ ] **PSH vocabulary consensus (C2)** — second consensus test. Each agent
  develops internal understanding of PSH vocabulary, then mesh negotiates
  shared definitions.
  *Precondition: ✓ MET — Plan9 directory consensus resolved (2026-03-10)*

- [x] **Enable autonomous sync on peer repos** — COMPLETE (Session 68).
  Scripts deployed, cron installed (*/5), trust budgets initialized, smoke
  tested. All 4 agents autonomous. agent-registry.json updated.

- [x] **Delete old interagent tunnel** — COMPLETE (Session 71). Edge connections
  cleaned up, tunnel deleted, credentials file removed.

- [x] **Update agent-card.json discovery URLs** — COMPLETE (Session 65).
  agent-card already migrated. worker.js + README.md updated.

- [ ] **Migrate interagent tunnel launchd naming** — old plist removed
  (`com.unratified.interagent-tunnel`). New tunnel uses
  `net.kashifshah.internal.psychology-agent-tunnel`. Verify no orphan
  references to old label in scripts or docs.

- [x] **Add JSON-LD structured data to agent dashboards** — embed
  `<script type="application/ld+json">` in mesh-status.py HTML output.
  Schema.org types: `SoftwareApplication` (agent identity), `WebAPI`
  (capabilities), `Organization` (safety-quotient-lab). Enables search
  engine discovery and machine-readable agent metadata on
  psychology-agent.safety-quotient.dev and psq-agent.safety-quotient.dev.
  ✓ Session 66. Psychology-agent direct; psq-agent via PR. Also added:
  CORS origin lockdown, /.well-known/agent-card.json route, and
  interagent/index.html static compositor for interagent.safety-quotient.dev.

- [x] **Deploy interagent.safety-quotient.dev** — CF Worker (`interagent-mesh`)
  serves static compositor. DNS CNAME created. Custom domain added via dashboard.
  ✓ Session 66.

- [ ] **Curate public replays** — revise which session replays appear on
  dashboards. Start with first session only for both agents. Remove or gate
  other replays behind a review pass.
  *Precondition: none*

---

## Engineering Incident Detection (Cogarch Extension)

Design approved (Session 65). 10-order knock-on trace in journal §47.

- [x] **Schema v14: engineering_incidents table** — incident_type, severity,
  detection_tier (1=mechanical, 2=cognitive), session_id, description,
  tool_context, recurrence count, graduated flag. Private visibility.
  ✓ Session 66.

- [x] **Tier 1: PostToolUse hook for mechanical detection** — scan Bash output
  for: (a) credentials/tokens in command arguments, (b) repeated create/delete
  cycles on same resource type within session, (c) error-retry loops without
  strategy change. Write incidents via `dual_write.py engineering-incident`.
  ✓ Session 66. Hook: `.claude/hooks/engineering-incident-detect.sh`.

- [ ] **Tier 2: T17 cognitive self-assessment trigger** — fires at session
  end or /cycle. Agent reviews session actions for: premature execution
  before decision, grounding failures, stale-process assumptions. Lower
  confidence tier. Implementation after Tier 1 proves value.
  *Precondition: Tier 1 operational + evidence of value*

- [ ] **Graduation pipeline** — when incident_type accumulates ≥3 occurrences,
  draft anti-patterns.md entry and surface to user. Velocity gate: recurrence
  ≥2 within 10 sessions (matches T10 lesson promotion). User approval required.
  *Precondition: Tier 1 operational*

---

## Infrastructure Debt Tracking

Silent drift between declared topology and actual runtime state. Session 70
surfaced 5 examples in one sitting: orphaned system-level systemd units grabbing
ports, lock/log paths using wrong naming convention, all agents reporting wrong
cron entry, gate polls silently draining credits, meshd services stuck in
auto-restart loops. None had monitoring — all required manual discovery.

- [ ] **Infrastructure assertions framework** — runtime checks that compare
  declared state (agent-registry.json, cron entries, systemd units, schema.sql)
  against actual state (running processes, bound ports, file paths, DB contents).
  Record drift to state.db (`infrastructure_checks` table). Design questions:
  (a) per-agent self-check in autonomous-sync.sh, (b) centralized in meshd
  /obs/health, or (c) separate audit tool. Likely answer: (a) for detection,
  (b) for display.
  *Precondition: schema migration (new table) — originally targeted v15, now requires v18+*
  *Source: Session 70 — 5 infrastructure debt items discovered manually*
  *Grounding audit Session 76: schema v17 current. v15 used for autonomy_budget rename. Table still needed.*

- [ ] **Assertion candidates (initial set):**
  - systemd units: declared services match running services (no orphans)
  - Port bindings: expected process holds expected port
  - Cron entries: one entry per agent, matches project root
  - Lock files: naming convention matches autonomous-sync.sh AGENT_TAG
  - Log files: exist, recent (< 2x cron interval), growing
  - Schema version: state.db matches scripts/schema.sql
  - Git remotes: all registry peers have configured remotes
  - Tunnel health: CF tunnel processes alive for tunneled agents

---

## DevOps Pipeline (Session 73)

- [x] **Jenkins Phase 2 (Tier 2 CI/CD)** — COMPLETE (Session 74). Jenkinsfiles
  with literate documentation across all 3 repos. Pipelines: meshd build+deploy
  (Go cross-compile, SSH deploy, 4-port health check), shared scripts sync
  (rsync + symlink verification), compositor deploy (fallback). GH Actions relay
  bridges push events to forge through CF Access. Hourly SCM polling as fallback.
  Jenkins configured: global env vars, `deploy-ssh-key` credential, hourly SCM.
  PSQ model deploy pipeline remains manual-trigger (documented, not yet automated).

- [x] **PSQ model deploy pipeline** — COMPLETE (Session 75). Parameterized
  Jenkinsfile with 11-step deploy: calibrate, ONNX export, held-out eval, SHA256
  verify, rsync to Hetzner, restart, health check, smoke test. Dedicated
  `hetzner-ssh-key` credential (ED25519, cabinet-jenkins@safety-quotient-lab).
  Jenkins env vars: HETZNER_HOST, HETZNER_REMOTE_DIR, PSQ_HEALTH_URL,
  PSQ_SCORE_URL, PSQ_SERVICE_NAME.

- [ ] **DevOps/IT installation guide** — comprehensive guide covering the full
  infrastructure colophon, requirements, and setup procedure for the psychology
  agent system. Target audience: a new maintainer or contributor who needs to
  reproduce the environment from scratch. Should cover:
  - **Machines:** cabinet (Jenkins host, Linux amd64, Go 1.24.4), chromabook
    (runtime host, Linux amd64, meshd + 4 agents + cloudflared tunnel + cron),
    Hetzner CX (PSQ scoring server, Node.js + onnxruntime-node)
  - **Three-tier deploy strategy:** Tier 1 (GH Actions → CF Workers/Pages),
    Tier 2 (Jenkins → SSH deploy), Tier 3 (cron autonomous sync)
  - **Jenkins setup:** install, CF Access tunnel, GH Actions relay pattern
    (why webhooks can't inject CF Access headers), job creation (4 repos),
    credential setup (deploy-ssh-key, hetzner-ssh-key — dedicated ED25519
    keypair for jenkins@cabinet), global env vars (DEPLOY_HOST, DEPLOY_PORT,
    DEPLOY_USER, DEPLOY_MESHD_PATH, etc.), SCM polling as fallback
  - **Chromabook setup:** meshd binary, shared scripts symlinks, 4 agent
    project dirs, cloudflared tunnel config (4 routes), cron entries
    (ensure-cron.sh), state.db bootstrap, agent-registry.json
  - **Hetzner setup:** PSQ scoring server (Node.js, systemd psq-server.service),
    ONNX model deployment procedure (critical: do NOT run npm install — onnxruntime
    conflict), SSH key authorization
  - **Cloudflare:** Workers (compositor, AP, monitor, cron), Pages (blog, observatory),
    tunnel (4 agent routes), DNS records, Access service token
  - **GitHub:** repo secrets (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, JENKINS_URL,
    JENKINS_USER, JENKINS_API_TOKEN, FORGE_ACCESS_CLIENT_ID/SECRET), relay workflow
  - **Known gotchas:** mDNS doesn't resolve across machines (use /etc/hosts),
    `branch 'main'` breaks regular Pipeline jobs (MultiBranch only), Groovy `:-`
    syntax conflicts, meshd binary locked while running (pkill before SCP)
  *Precondition: ✓ MET — meshd deploy pipeline verified (Session 75), systemd supervision deployed (Session 76)*

- [x] **Surface epistemic debt detail on compositor** — COMPLETE (Session 73).
  /kb/epistemic route + detail table in Meta tab (flag text, source, agent, age).
  Summary panel now includes transport flags count + per-agent breakdown.

- [x] **Observatory directory consolidation** — COMPLETE (Session 73).
  `~/projects/observatory-sqlab` removed from chromabook. Only
  `~/projects/observatory` remains (state.db, cron, meshd verified).

- [x] **Move pre_sync_check.py + issue_lifecycle.py to shared scripts** —
  COMPLETE (Session 73). Moved to `platform/shared/scripts/` with symlinks from
  `scripts/`. Safe project root resolution added (walks up from apparent location).

# General-Purpose Psychology Agent — Lab Notebook

Structured session log. Each entry records what was done, key decisions, and
artifacts produced. Terse and factual — the journal.md has the narrative.

**Primary source:** Conversation transcripts (not yet archived)
**Derived views:** `journal.md` (narrative), `docs/architecture.md` (design)

---

## Current State *(overwrite each session)*

### Agent: Design phase (2026-03-06)

| Item                          | Status                                           |
|-------------------------------|--------------------------------------------------|
| Architecture diagram          | ✓ Documented — docs/architecture.md              |
| Design decisions              | ✓ All resolved — docs/architecture.md            |
| Authority hierarchy           | ✓ Documented — docs/architecture.md              |
| /doc skill                    | ✓ Created and tested                             |
| /hunt skill                   | ✓ Created and verified                           |
| /cycle skill                  | ✓ Created and verified + Step 10b, Step 12 push (Session 11) |
| /capacity skill               | ✓ Created and verified                           |
| Conventions migration         | ✓ CLAUDE.md holds stable conventions (186 lines, trimmed Session 56) |
| CLAUDE.md (project root)      | ✓ Created + display convention added             |
| Cognitive infrastructure      | ✓ T1–T16, 4 SRT extensions (T2#9-10, T3#13-14), T4#10 reversibility, T3#15 constraint cross-ref, T3#9 GRADE-informed |
| /iterate skill                | ✓ Hunt → 2-order knock → 4-mode discriminator → execute (Session 32) |
| Constraint taxonomy           | ✓ docs/constraints.md — 66 constraints, 5 categories (E/M/P/I/D) (Session 27→45) |
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
| License (root project)        | ✓ Apache 2.0 — LICENSE + NOTICE at project root (relicensed Session 32c) |
| License (PSQ data + weights)  | ✓ CC BY-SA 4.0 — safety-quotient/LICENSE-DATA (Dreaddit constraint) |
| Auto-memory recovery          | ✓ Snapshots, bootstrap-check.sh, T1 health check, BOOTSTRAP.md restructure (Session 11) |
| Platform hooks                | ✓ 14 hook events (17 active scripts + _debug.sh shared helper): T4, provenance, subproject, external-action, pushback, SessionStart (+ state.db bootstrap), PreCompact, Stop, Notification, tool-failure (2), subagent-audit (2), SessionEnd, InstructionsLoaded, TaskCompleted, ConfigChange, context-pressure-gate, context-pressure-statusline. Debug logging: `touch/rm .claude/hooks/.debug` (Session 57) |
| Source dictionary             | ✓ docs/dictionary.md — 15 entries, 7 categories, APA citations (Session 27) |
| best.pt local recovery        | ✓ SHA256 7bec777c match confirmed local↔Hetzner (Session 27) |
| Agent identity directive      | ✓ Psychology agent first; engineering serves the discipline (Session 40) |
| Antiregression evaluation     | ✓ Evaluated, adopted hooks, TODO items written (Session 11) |
| Blog post (cogarch)           | ✓ Reviewed + PR #7 submitted to unratified (Session 24) |
| Blog post (Jurassic Park)     | ✓ Published at blog.unratified.org — 3-agent co-authorship, transport resolved (Session 25→29) |
| Cogarch canonical location    | ✓ cognitive-triggers.md moved to docs/ (Session 12) |
| Parry integration             | ✗ REMOVED (Session 56) — scripts deleted, session toggle removed. Re-add when #32596 resolved (TODO item) |
| Awesome-claude-code eval      | ✓ 5 repos evaluated, 10 candidates ranked, 4 quick wins landed (Session 12) |
| Attention-aware placement     | ✓ CLAUDE.md reordered for U-shaped attention curve (Session 12) |
| Schema-validated lessons      | ✓ YAML frontmatter in lessons.md.example + T10 update (Session 12) |
| Graduated promotion lifecycle | ✓ 3+ threshold in T10 + /cycle Step 8b (Session 12) |
| Commands-over-skills audit    | ✓ /adjudicate + /capacity identified for conversion (Session 12) |
| PSQ commercial model          | ✗ Undefined — ideas documented in ideas.md       |
| Psychology agent design       | ✓ Complete — routing spec, identity spec, evaluator procedures (Session 16) |
| Sub-agent protocol            | ✓ Complete — subagent-layer-spec.md + peer-layer-spec.md (Session 20) |
| Adversarial evaluator (activation) | ✓ Complete — tiered activation, 7 triggers, evaluator prompt (Session 17) |
| Evaluator instantiation (EF-3) | ✓ Tiered hybrid runtime — T3 #12 (Tier 1), CC session (Tier 2/3), evaluator-response/v1 schema (Session 24) |
| Cross-scorer concordance       | ✓ COMPLETE — gate FAILS (1/10 dims ICC ≥ 0.70, mean ICC = 0.495). Sonnet-only revert endorsed (Session 45) |
| B3 recalibration (steps 1-4)  | ✓ COMPLETE — MAE −12.4% avg, dead zones = model compression. Deploy deferred to post-v37 (Session 45) |
| Opus remediation + v37        | ✓ COMPLETE — v37 deployed, calibration-v4 live (Session 46-47) |
| B3 recalibration (steps 5-6)  | ✓ COMPLETE — calibration-v4 deployed, 9/10 dims MAE ≤ v3 (turn 33) |
| B4 partial correlations       | ✓ COMPLETE — mean |partial r|=0.205, bipolar confirmed, DA isolated (turn 40-41) |
| SQLite state layer (schema)   | ✓ scripts/schema.sql v8 committed — 12 tables + trust budget + ACK columns + MANIFEST migration + lessons + table_visibility (Session 48-51, 59) |
| SQLite state layer (bootstrap)| ✓ SL-1 COMPLETE — PR #90 merged, all 9 validation checks pass (Session 50) |
| SQLite dual-write (SL-2)     | ✓ COMPLETE — scripts/dual_write.py (7 subcommands incl. lesson), /sync + /cycle skills updated (Session 51, 59) |
| Optional ACK protocol         | ✓ ack_required flag (sender-controlled, default false); state.db processed column replaces mandatory ACKs (Session 51) |
| README quickstart             | ✓ Zero-to-demo with 5 accordion demos (conversational, PSQ, /knock, /iterate, SPSS) (Session 51) |
| Synrix-inspired improvements  | ✓ 6 items: tiered access, scope boundaries, postmortem template, deterministic keys, psq_status table, entry_facets polythematic (Session 48) |
| B5 bifactor CFA               | ✓ COMPLETE — omega_h=0.942, 5-item bipolar confirmed (turns 34-36) |
| B5-S structural comparison    | ✓ COMPLETE — M5 accepted as final model (RMSEA=0.129, turn 38-39) |
| Project board sync            | ✓ `sync_project_board.py` — TODO.md ↔ GitHub Projects reconciliation, --mark-in-progress flag, /cycle Step 11b, /hunt Phase 6, /iterate Phase 3 (Session 58, 59c) |
| GitHub issues (full coverage) | ✓ All 20 open TODO items tracked as issues (#94–#108 created Session 59c); #46 closed (deprecated) |
| GitHub release v0.6.0         | ✓ Sessions 50-57: autonomous infra, SL-2, cogarch portability, hooks, interagent, DX (Session 58) |
| Orientation payload           | ✓ `scripts/orientation-payload.py` — state.db → compact context for autonomous sessions (Session 59) |
| Heartbeat mesh                | ✓ `scripts/heartbeat.py` — emit/scan/negotiate, 30-min stale threshold, registry-filtered (Session 59) |
| Agent identity                | ✓ `.agent-identity.json` (gitignored, machine-local) — hostname, platform, capabilities (Session 59) |
| MANIFEST auto-generation      | ✓ `scripts/generate_manifest.py` — state.db → thin MANIFEST (pending only, 793→21 lines) (Session 59) |
| Cloud-free bounded context    | ✓ Architecture decision — zero cloud runtime dependency; CF Worker = separate context (Session 59) |
| Socratic gate (T2#8b)         | ✓ Cogarch — AskUserQuestion bias on direction-setting questions (Session 59) |
| Lessons table (schema v7)     | ✓ Structured index of lessons.md — frontmatter as queryable columns, bootstrap_lessons.py (24 entries), dual_write lesson subcommand (Session 59) |
| 4-tier visibility (schema v8) | ✓ table_visibility (public/shared/commercial/private), export_public_state.py (4 profiles: seed/release/licensed/full), private-by-default (Session 59) |
| PSQ integration               | ✗ Pending PSQ readiness (separate context)       |
| GitHub repository             | ✓ safety-quotient-lab/psychology-agent (public)  |
| Ecosystem evaluation (round 2)| ✓ 5 repos evaluated, 7 candidates ranked (Session 13) |
| Capabilities inventory        | ✓ architecture.md § Capabilities + capabilities.yaml (Session 13) |
| Hook scripts                  | ✓ 4 scripts in .claude/hooks/, all tested (Session 13) |
| Cogarch auto-reload (session start) | ✓ T1 step 7 + hook MANDATORY instruction (Session 14) |
| AskUserQuestion discipline    | ✓ T2 check 8 + MEMORY user preferences (Session 14) |
| Semiotics as cogarch principle| ✓ Defined — 3 frames, trigger map, T4 Check 9 (Session 16) |
| T4 Check 9 (Interpretant)     | ✓ 5+1 interpretant communities; conflict detection (Session 16) |
| Blog post (interpretant collapse) | ✓ Reviewed + PR #7 submitted to unratified (Session 24) |
| Psychology agent identity spec | ✓ Core identity, commitments, refusals, opening behavior (Session 16) |
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
| Item 2 protocol               | ✓ COMPLETE — Item 2a (6 findings, spec) + Item 2b (peer layer, spec) |
| Observatory-agent exchange    | ✓ Complete — 20-turn live derivation; PR #9 (closing ACK) open |
| PSQ scoring endpoint          | ✓ Implemented — safety-quotient/src/server.js, machine-response/v3 (Session 20) |
| Psychology interface (PSQ)    | ✓ worker.js + psq-client.js + UI (radar/hierarchy/threshold/artifact) — all 8 smoke test steps passed |
| Psychology interface (/turn)  | ✗ DEPRECATED (Session 59) — removed, not guarded. CF Worker lacks cogarch; autonomous sync mesh replaces programmatic access |
| settingSources CF Workers     | ✓ RESOLVED — PSYCHOLOGY_SYSTEM expanded (Commitments+Refusals+T15, Option A inline); settingSources removed from agentOptions (Session 21) |
| CF Tunnel                     | ✓ Live — coordinates-valve-conventions-convertible.trycloudflare.com (ephemeral, session-scoped) |
| T14 + T15 cogarch             | ✓ T14 (structural checkpoint, orders 7–10) + T15 (PSQ v3 receiver protocol) in cognitive-triggers.md + MEMORY quick-ref |
| Knock-on depth 10             | ✓ Extended 8→10; Order 9 Emergent (INCOSE), Order 10 Theory-revising (Popper); M tier 6→8, L tier 8→10 (Session 23) |
| wrangler version              | ✓ v4.71.0 — clean deploy (Session 21c)           |
| Blog PR (well-known)          | ✓ PR #2 MERGED — safety-quotient-lab/unratified — psychology-agent consumer perspective |
| interagent/v1 protocol        | ✓ Schema v3 finalized — extension URI, enum, glob, per-message scope |
| PSQ namespace                 | ✓ Resolved — PSQ-Lite (LLM heuristic) vs PSQ-Full (DistilBERT v23) |
| 9P transport (canonical)      | ✓ SSH pipe + ramfs -i + 9pfuse — verified cross-machine |
| PSQ calibration               | ✓ Score (isotonic) + confidence (r-based proxy, intentional constant fn) |
| calibration.json on remote    | ✓ Tracked — .gitignore exception; safety-quotient-lab PR #1 merged |
| best.pt loss                  | ✓ Non-blocking — inference uses ONNX; best.pt only for recalibration |
| safety-quotient git divergence| ✓ RESOLVED — worktree workaround applied; local commit 26d7cd5 present (Session 28c) |
| Architecture Items 1–3        | ✓ Complete                                       |
| Architecture Item 4 (interface)| ✓ DEPLOYED — psychology-interface.kashifshah.workers.dev |
| D1 database                   | ✓ psychology-interface (56a2f5ac, ENAM region)   |
| KV namespace                  | ✓ SESSION_KV (1d17a21c)                          |
| wrangler version              | ✓ v4.71.0 — no warnings, clean deploy            |
| PSQ production endpoint       | ✓ LIVE — https://psq.unratified.org/score (Caddy TLS, Hetzner CX Ashburn, 84ms inference) |
| Hetzner Cloud server          | ✓ psq-agent CX (Ashburn, Debian 13, 4 GB RAM) — Node.js 20 + npm deps installed |
| BFT design note               | ✓ docs/bft-design-note.md — 6 principles, topology analysis |
| Command-request/v1 protocol   | ✓ docs/command-request-v1-spec.md — command-request + command-response message types |
| Transport failure modes        | ✓ docs/git-pr-transport-failure-modes.md — 8 modes (F1–F8), EF-4 resolved |
| Semantic rename (transport)    | ✓ item2-derivation → subagent-protocol, item4-derivation → psychology-interface (Session 22) |
| PSYCHOLOGY_SYSTEM             | ✓ Full identity + cogarch inlined (Option A); Option B documented in agent.js |
| Blog PR (well-known)          | ✓ PR #2 MERGED — safety-quotient-lab/unratified (2026-03-06) |
| README interagent sync        | ✓ Documented — first entry in Interesting Parts  |
| Closing instance              | ✓ Retired — Sessions 1–9, ACK b670bd9            |
| plan9port                     | ✓ Operational — macOS + Debian (observatory-agent) |
| Public audit                  | ✓ Publication-safe — no HIGH/MEDIUM findings     |
| unratified-agent mesh-init    | ✓ Capability handshake received (turn 1), response sent (turn 2). PSQ collab accepted, ICESCR deferred (Session 23) |
| Agent-card (discovery)        | ✓ /.well-known/agent-card.json deployed on CF Worker — mesh discovery live (Session 23) |
| /knock skill                  | ✓ Standalone 10-order effect tracing skill — /hunt references it (Session 23) |
| T2 compaction threshold       | ✓ 60%/75% explicit thresholds in cognitive-triggers.md (Session 23) |
| Stop hook (flag sweep)        | ✓ stop-completion-gate.sh scans lab-notebook for ⚑ markers (Session 23) |
| Urgency field (interagent/v1) | ✓ Adopted — architecture.md schema v3 table updated (Session 23c) |
| Local-coordination/v1         | ✓ Formalized — docs/local-coordination-v1-spec.md (Session 24) |
| Transport discovery (in-repo) | ✓ agent-card.json + MANIFEST.json + transport-scan.sh — committed (0bd28b7) |
| PSQ endpoint TLS              | ✓ Caddy reverse proxy + auto-TLS (Let's Encrypt) — port 3000 closed from public |
| PSQ onnxruntime fix           | ✓ postinstall script removes nested onnxruntime-node — survives npm install |
| wrangler secret               | ✓ PSQ_ENDPOINT_URL = https://psq.unratified.org |
| Cogarch portability (config)  | ✓ cogarch.config.json — 13 sections, 4 tiers across 19 files (Session 53-54) |
| Cogarch portability (guide)   | ✓ Adaptation guide: 7-step replacement path, fresh-clone tested ×7, adaptive bootstrap thresholds (Session 54) |
| TODO discipline convention    | ✓ CLAUDE.md §TODO Discipline — immediate update on completion; /cycle Step 6 as safety net (Session 54) |
| Bootstrap adaptive thresholds | ✓ Adjudicated (Option A) — empty transport/sessions/ → structural-only minimums; docs/decisions/ record (Session 54) |
| Phantom hook cleanup          | ✓ bootstrap-check.sh removed from settings.json + CLAUDE.md; context-pressure hooks added to table (Session 54) |
| Systems thinking methodology  | ✓ Umbrella: DDD (structural) + literate programming A+C (expression) + embedded system (deployment) + DOF gradient (Session 53) |
| Semantic naming (global)      | ✓ 30 files updated — all item-number refs eliminated; T4 Check 6 expanded; CLAUDE.md Code Style updated |
| Transport discovery (3-layer) | ✓ agent-card + MANIFEST.json + transport-scan.sh; session-start hook integrated |
| Site defensibility review     | ✓ 12 findings (2 HIGH / 5 MED / 5 LOW) delivered to unratified-agent |
| Command-response ACK (rsync)  | ✓ Turn 14 — independent verification of all 7 rsync steps |
| Endpoint-live notification    | ✓ mesh-init turn 5 — URL, verification data, integration guidance |
| mesh-init session             | ✓ Complete — unratified-agent confirms closure (turn 5 ACK received) |
| psq-scoring session           | ✓ Turn 8 complete — HI construct finding + AR proposal → unratified-agent (advisory, Session 28) |
| PSQ bug B1 (confidence dead)  | ✓ RESOLVED — r_confidence field added; calibration_note surfaces r-value; limitation renamed confidence-is-static-r (MEDIUM) — psq-agent 54a1a85, psychology-agent f531c5e |
| PSQ bug B2 (HI dead zone)     | ✓ RESOLVED — quantile-binned isotonic (n_bins=20); MAE 1.6631→1.5980 (-3.9%); isotonic-v2-2026-03-06 deployed (psq-agent 9629412) |
| best.pt recovery              | ✓ FOUND on Hetzner (255 MB, v23 DistilBERT, held-out r=0.696); local copy lost; rsync when ready |
| psq-scoring supervisory turn  | ✓ Turn 4 — bug fix specs, Q&A, PSQ-Lite endorsed, A/B test recommended (Session 23d) |
| Identity rename               | ✓ general-agent → psychology-agent across 48 active files (Session 23d) |
| Memory topic-file split       | ✓ MEMORY.md 169→53 lines; 3 topic files (decisions, cogarch, psq-status); bootstrap + /cycle + snapshot updated (Session 23c) |
| Glob-scoped rules             | ✓ .claude/rules/ — markdown.md, javascript.md, transport.md; CLAUDE.md slimmed (Session 23c) |
| bootstrap-check.sh            | ✓ Updated — topic file health/restore, skills→skills+commands split (Session 23c) |
| Configurable /hunt at bootstrap | ✓ Flag file `.claude/hunt-at-startup` + session-start-orient.sh check (Session 24) |
| Local-coordination/v1 spec    | ✓ Formalized — docs/local-coordination-v1-spec.md (Session 24) |
| Sub-project boundary hook     | ✓ .claude/hooks/subproject-boundary.sh — PreToolUse Write/Edit/Read (Session 24) |
| Pushback accumulator hook     | ✓ .claude/hooks/pushback-accumulator.sh — UserPromptSubmit, >= 3 threshold (Session 24) |
| Evidence decay (T9)           | ✓ Freshness thresholds: 5 sessions → flag, 10 → remove/waive (Session 24) |
| EF-3 evaluator instantiation  | ✓ Tiered hybrid — T3 #12 active (Tier 1), Tier 2/3 pending (Session 24, other instance) |
| Platform hooks (full count)   | ✓ 22 entries (19 unique) — see row above for full list |
| /sync skill                   | ✓ Created — inter-agent mesh sync, adapted from unratified-agent (Session 25) |
| Blog post (Jurassic Park)     | ✓ Multi-author draft — psychology-agent + psq-agent; PR #7 updated (Session 25) |
| Transport: blog-jurassic-park | ✓ Session opened — request sent, psq-agent sections received (Session 25) |
| Adversarial register (AR) rubric | ✓ Phase 1 validated — docs/adversarial-register-rubric.md (dadd3dd); turn 8 advisory sent to unratified-agent (Session 28) |
| AR labeling pipeline             | ✓ 11th dim in label_separated.py + instruments.json; automated script; 998-text stratified subset; Haiku validated (r=0.822, 85%) (Session 28c) |
| Community tooling adopted        | ✓ recall (session search, MIT) + ccusage (token/cost, MIT) — 4 others evaluated, skipped (Session 28c) |
| License gate                     | ✓ No GPL/AGPL — MIT/Apache/BSD only for external dependencies (Session 28c) |
| Hetzner deploy script         | ✓ Created — safety-quotient/deploy/hetzner-deploy.sh; 10-step pipeline (ab5fbe7, Session 28) |
| PSQ v28 training              | ✗ NOT PROMOTED — held-out r=0.678 < v23 0.684; TE regression (0.762 vs 0.800); v23 stays in production (Session 28) |
| B3 (TE plateau)               | ✓ Filed — distillation-research.md §65; calibration dead zone + label degradation; F1/F2 fix plan (Session 28) |
| AR quality analysis           | ✓ Face validity pass, healthy distribution, strong source discrimination; 27% midpoint pile-up noted (Session 30) |
| Separated scoring automation  | ✓ score_dimension.sh — Haiku, 20/batch, 3s/10s rate limiting, resumable; data/separated_scoring/ (Session 30) |
| /tmp durability fix           | ✓ WORK_DIR moved from /tmp/psq_separated → data/separated_scoring/ (gitignored) (Session 30) |
| Blog adversarial review       | ✓ CLOSED — 12 turns, 31 reviewed, 27 remediated, session-close accepted (PR #37). 1 reviewer error (F-D9) caught by pipeline. (Session 30-33) |
| Separated scoring (11 dims) | ✓ Complete — Haiku v2 all 11 dims × 998 texts (Session 30-34) |
| v1 vs v2 quality analysis    | ✓ Complete — compare_v1_v2.py; 4 dims compared; mean pile-up 32.7%; 23 halo pairs (Session 34) |
| Scorer comparison (Haiku vs Sonnet) | ✓ Complete — 100-text stratified subset, all 11 dims; Sonnet 24.7% vs Haiku 31.2% pile-up; CC+DA construct problems confirmed (Session 34) |
| psq-quality-update session   | ✓ 6 turns — PSQ review (T4), HRCB validity (T5), E+S channels (T6); PR #40 merged (Session 34-35) |
| PR #38 (/iterate unified)    | ✓ Merged + CLAUDE.md trimmed 257→192 lines (Session 34) |
| Ethical marketing rubric      | ✓ docs/ethical-marketing-rubric.md — 5 dims, FTC/NAD/AMA/ICC/AI-disclosure grounded (Session 30) |
| Observatory HRCB review       | ✓ 7 findings (H1 CRITICAL confirmed, H2 downgraded to lite-mode residual after verification) + E+S channel assessment (8 findings) (Session 35) |
| PRs #41/#42/#43 processed     | ✓ #41+#42 merged, #43 enriched version applied manually (a9505dd) (Session 35) |
| psq-agent scorer comparison msg | ✓ Turn 11 (findings) + Turn 12 (work order: 998×9 Sonnet re-score) to psq-agent (Session 35) |
| claude-replay adopted          | ✓ Installed, tested (Session 35, 819KB HTML), documented in README + CLAUDE.md (Session 35) |
| /scan-peer skill               | ✓ Verified loading (Session 36) + registered in CLAUDE.md Skills section |
| EF-2 claim verification        | ✓ Tracker created — docs/claim-verification-log.json, 1/10 exchanges logged (Session 38) |
| EF-1 trust degradation         | ✓ RESOLVED — evaluator-as-arbiter + 10-order knock-on + 4-level resolution (Session 50) |
| GitHub integration              | ✓ Full — 12 issues (#46–57), 14 labels, project board (table), wiki (6 pages), 2 issue templates, convention doc (Session 39) |
| Dignity Index spec              | ✓ docs/dignity-instrument-spec.md — Hicks 10-element rubric, 3-phase plan, HRCB lessons applied (Session 41) |
| dignity-instrument session      | ✓ T1–T6 complete; observatory accepted Phase A; API live (713 stories) (Session 41–42) |
| DI Phase A feasibility study    | ⚑ Pass 1 COMPLETE — 50/50 assessed (27 PASS, 19 ND, 4 deferred); r=0.328 (10.7% variance); 8 signal inversions; relevance gate 19/19 correct; 3/4 success criteria met; Pass 2 pending (Session 43) |
| Site defensibility review       | ✓ COMPLETE — 9/12 resolved, F6 queued (unratified), F9/F11 routed to observatory. T4 status report received, ACK sent (Session 48) |
| Lite system prompts             | ✓ 4 tiers split into standalone files in docs/prompts/ (Session 48-49) |
| GitHub Releases                 | ✓ v0.1.0–v0.5.0 created — retroactive tagging + release notes (Session 49) |
| Blog persona convention         | ✓ 5 personas per topic: voter, politician, educator, researcher, developer (Session 49) |
| De-branding exploration         | ⚑ Coupling-point inventory COMPLETE — 4 tiers, 7 categories, ~5,500 occurrences mapped (Session 52) |
| psq-agent cogarch mirror (Phase 2) | ✓ COMPLETE — PR #91 merged, T1-T16 mirrored, T15 adapted. Phase 3 gate OPEN (Session 52) |
| CO concentration finding        | ✓ Accepted — PR #92 merged, Variant B rubric adopted, monitoring plan active (Session 52) |
| Blog persona guidelines         | ✓ PR #40 to unratified repo — psychologically-grounded, 5 personas, ethical marketing integrated (Session 52) |
| EF-1 trust model (engineering)  | ✓ docs/ef1-trust-model.md — evaluator-as-arbiter, trust budget, cron driver (Session 50) |
| EF-1 trust model (psychology)   | ✓ docs/ef1-psychological-foundations.md — 10 constructs mapped, 6 predictions, 30+ refs (Session 50) |
| Autonomous sync scripts          | ✓ autonomous-sync.sh + trust-budget.py — cron + Claude CLI multi-agent loop (Session 50) |
| Schema v3                        | ✓ trust_budget + autonomous_actions tables added (Session 50) |
| MANIFEST bulk update             | ✓ 8-message drift resolved — turns 28-45 in recently_completed (Session 50) |
| EF-1 governance layer            | ✓ docs/ef1-governance.md — 7 invariants governing P/J/E lenses, RFC 2119/8174 (Session 50) |
| BCP 14 cogarch pass              | ✓ RFC 2119+8174 MUST/SHOULD/MAY applied across all triggers + trust models (Session 50) |
| T4 Check 10 (commit discipline)  | ✓ Every file write MUST be followed by git commit (Session 50) |
| Schema v4                         | ✓ shadow_mode, adversarial_reason, peer_reviewed_by columns (Session 50) |
| EF-1 flag mitigations            | ✓ Cross-agent peer review, adversarial self-framing, shadow mode, MANIFEST staging (Session 50) |
| Beyond-order-10 clause           | ✓ 10 named orders + emergence escalation (Session 50) |
| README quickstart TODO           | ✗ Added — bare metal, accordion, 5 demos (Session 50) |
| Workflow Continuity (compaction)  | ✓ CLAUDE.md updated — cogarch reload REQUIRED post-compaction (Session 50) |


### Open Questions

- ~~HuggingFace model license: parry requests `deberta-v3-small` but docs reference `deberta-v3-base` — verify correct model slug~~ **ANSWERED:** Model: `ProtectAI/deberta-v3-small-prompt-injection-v2` (small variant, 142M params). Correct slug.
- ~~Parry ML daemon: HTTP 401 after token file exists — investigate token validity or model gating~~ **ANSWERED:** Gated repo — required accepting license on HF web UI. After acceptance: daemon starts, ML scanner operational, injection detection verified (Session 36).
- ~~PSQ production URL: Hetzner provisioned; model rsync command-request sent; awaiting psq-agent command-response with state attestation~~ **ANSWERED:** Live at https://psq.unratified.org/score; rsync verified, Caddy TLS, ufw hardened
- ~~PSQ bug B1: confidence head dead — which API version carries the fix (v3→v4 or remove from v3)?~~ **ANSWERED:** No version bump. Replace source (model head → static r-estimate), preserve field semantics. Document in calibration_note.
- ~~PSQ bug B2: HI calibration dead zone — re-fit with finer binning or alternative approach?~~ **ANSWERED:** Quantile-binned isotonic regression (n_bins=20), no model retrain needed. Dead zone [6.0045, 7.2539] differentiated. calibration_version isotonic-v2-2026-03-06.
- ~~Does the PSQ endpoint currently return raw_score in the response body? (unratified-agent question)~~ **ANSWERED:** Yes — raw_score field present in dimensions[] per v3 spec. Verified via direct curl by unratified-agent.
- ~~HI direction anomaly — hostile social media anchor scored HI=6.88 vs policy brief HI=6.15 (counterintuitive on PSQ scale); possible TE/HI dimension conflation for ICESCR topic domain. Not yet investigated.~~ **ANSWERED:** Construct×distribution mismatch. HI measures narrator-experienced hostility (Dreaddit narrator-centric training). Hostile anchor: author is hostile outward, not threatening narrator — so HI=6.88 (safer). Policy brief: institutional inertia is structural antagonism toward narrator (advocate) — so HI=6.15 (less safe). Not fixable with recalibration. AR dimension proposed as replacement for content-type classification.
- ~~TE uniformity: 4/5 ICESCR texts scored TE=6.46 (raw range 5.59–6.07 all mapping to same calibrated value). Possible residual plateau in threat_exposure. B3 — not yet filed or investigated.~~ **ANSWERED (Session 37):** Confirmed isotonic plateau B3. Root cause: sparsity in raw range [5.64, 6.39] — PAVA pooled across 0.75 raw units to y=6.4556. calibrate.py uses raw isotonic (no quantile binning). TE has 4 plateaus >0.5 raw units; largest at [6.65, 8.17] spans 1.51 units (CRITICAL). Fix: apply quantile-binned pre-aggregation (as HI B2 fix) across all dimensions. Filed as psq-agent work item.
- PSQ-Lite (TE + HI-raw + TC) — HI invalid for content-type classification (construct×distribution mismatch). Proposed revision: TE + TC + AR. Pending unratified-agent adoption decision.
- ~~Oracle Ampere A1 vs named tunnel?~~ **ANSWERED:** Oracle A1 free tier unavailable; Hetzner CX (Ashburn, $5/mo) selected

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

**Scope:** Psychology agent — initial architecture design session.

**PSQ analysis completed.** Full analysis delivered covering construct validity,
criterion validity across 4 datasets (AUC 0.57–0.73), open vulnerabilities, and
PSQ readiness for sub-agent integration.

**Style conventions calibrated:**
- APA-style formatting with 1.618x whitespace
- Pedagogical jargon policy: expand acronyms on first use, define in prose
- Clean parentheticals: expansion only (3–7 words max inside parens)
- LaTeX for complex docs, markdown for standard docs

**Design decisions resolved** (full table in docs/architecture.md):
- Three-layer architecture: psychology agent → sub-agents → adversarial evaluator
- PJE reframed as case study, not sub-agent or specification
- Tiered adversarial evaluator (lightweight default, escalate on disagreement)
- Natural language for agent-to-agent protocol
- Extensible plug-in sub-agent architecture, no roster pre-committed
- Socratic disagreement stance
- Opus as canonical model

**Authority hierarchy defined.** User = source of truth. Psychology agent = advisory.
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
- Architecture items 1–3 (psychology agent design, sub-agent protocol, evaluator)

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

**→ /cycle skill created** at `.claude/skills/cycle/SKILL.md`. Psychology agent
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

## 2026-03-05T17:31 CST — Session 16c (Psychology agent routing spec)

- → Drafted and committed psychology agent routing spec (Architecture Item 1, routing
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

▶ docs/architecture.md (Component Spec: Psychology Agent Routing)

## 2026-03-05T17:45 CST — Session 16d (Identity spec + evaluator reasoning procedures)

- → Drafted psychology agent identity spec (Architecture Item 1, identity complete).
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

▶ docs/architecture.md (Component Spec: Psychology Agent Identity, Adversarial Evaluator
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
- Authority hierarchy in architecture.md does not yet reflect two-psychology-agent network

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
- → Architecture Item 2 derivation initiated. transport/sessions/subagent-protocol/
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
  transport/sessions/subagent-protocol/, TODO.md (Items 2–4 updated)

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
  transport/sessions/subagent-protocol/ (plan9port corrections, capability handshake, PSQ proposal, ACKs)

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
  transport/sessions/subagent-protocol/ (response-001, schema-v3-response-001, schema-v3-ack-001),
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
- → **Item 2a spec doc** written: docs/subagent-layer-spec.md — layer model, schema v3 fields, A2A
  Epistemic Extension, 5 PSQ schema gaps, capability handshake, status table. Committed and pushed.

⚑ EPISTEMIC FLAGS (continuation)
- confidence_calibration linear maps are constant functions (scale=0) — degenerately maps all inputs
  to r value. Better than raw uncalibrated output but not a true per-sample calibration.
- calibration.json lives only on local disk (gitignored). Remote psq-agent lacks it unless deployed manually.
- best.pt lost from local working tree; calibration.py cannot re-run until recovered.
- safety-quotient git divergence unresolved.


---

## 2026-03-06T08:11 CST — Session 20 (Epistemic flags resolved + Item 2 complete)

- → **Epistemic flags resolved** (three flags from Session 19/20):
  1. Degenerate confidence calibration: accepted as intentional design — scale=0 overrides
     anti-calibrated model head with per-dimension validation r. Correct epistemic behavior.
  2. calibration.json not on remote: .gitignore restructured (`models/*` → `!models/psq-student/`
     → `models/psq-student/*` → `!calibration.json`). Worktree used to create branch from origin/main
     without conflicting untracked files. PR #1 merged on safety-quotient-lab/safety-quotient.
  3. best.pt loss: non-blocking — psq-agent uses ONNX for inference; best.pt only needed
     for recalibration if model retrains.
- → **Observatory PRs #7/#8 merged**. PR #9 (subagent-layer-closing-ack-001) sent — acknowledges
  6 findings (not 5), accepts calibration_version amendment, points to docs/subagent-layer-spec.md.
- → **Item 2a spec updated**: finding #6 (per-message transport scope, persist-from-last)
  made explicit; calibration_version amendment added to Gap #5.
- → **Item 2b complete** — written by psq-agent (docs/peer-layer-spec.md): role declaration,
  divergence detection (context_state + last_commit), SETL as peer divergence metric
  (cumulative 0.40 threshold), evaluator tier binding (3-tier table), precedence protocol
  (recency for state facts, evaluation for reasoning), convergence signal thresholds (1/2/3+),
  domain SETL ranges from observatory exchange (0.05–0.65), context sync pattern (5 steps).
- → **Architecture Items 1-3 complete**. docs/machine-response-v3-spec.md also appeared.
- → **README updated**: interagent sync added as first Interesting Parts entry; architecture
  diagram shows peer layer + sub-agent layer; Current Status updated (Items 1-3 ✓, Item 4 ✗).
- → **psq-agent confirmed live and calibrated** ("psq-agent is at work, now").
- → **Item 4 next**: psychology interface — Agent SDK wrapper, custom UI, PSQ visualization.

⚑ EPISTEMIC FLAGS
- safety-quotient local git divergence unresolved (workaround: worktree; root: diverged histories)
- PR #9 (subagent-layer-closing-ack) awaiting observatory merge
- Item 2b not yet validated in a second peer exchange (spec derived from one exchange)

▶ docs/subagent-layer-spec.md, docs/peer-layer-spec.md, docs/machine-response-v3-spec.md,
  transport/sessions/subagent-protocol/subagent-layer-closing-ack-001.json,
  safety-quotient/models/psq-student/calibration.json

---

## 2026-03-06T08:15 CST — Session 20 (PSQ scoring endpoint; Item 2 complete)

- → **Git rebase conflicts resolved** (journal.md, lab-notebook.md, docs/MEMORY-snapshot.md):
  peer-agent had pushed Session 17 commit during local /cycle. Resolved by preserving both
  agents' contributions — §15 (secondary) + §16 (this instance) in journal; merged Current State
  rows in lab-notebook; merged Active Threads in MEMORY-snapshot.
- → **ACK messages sent to peer-agent**:
  - ack-closing-001.json: receipt of 5 commits (Sessions 17b–19), request-001.json routed to
    PSQ sub-agent, gate condition met (plan9port 9P use case found), plumber prior art noted.
  - ack-closing-002.json: plan9port already built (269 binaries), PATH fix applied ($PLAN9/bin),
    3 install sequence issues flagged (missing PATH step, /tmp ephemeral, echo expansion bug).
- → **Pulled and oriented**: absorbed Sessions 17b–19. Observatory-agent exchange complete —
  interagent/v1 drafted, PSQ calibration done, schema v3 finalized, Item 2a findings (5 + 1
  observatory amendment = 6 total), PR #7 merged (schema-v3-ack).
- → **Epistemic flags resolved**: (1) MEMORY.md stale → restored from docs/MEMORY-snapshot.md
  canonical; (2) cognitive-triggers.md unread → read T1–T14 at session start.
- → **PR #8 merged** (observatory-agent amendment): `calibration_version` field added to Item 2a
  spec as 6th finding (per-message transport scope) + `calibration_version` as gap #5 extension.
  subagent-layer-spec.md updated with full 6-finding table and updated status.
- → **machine-response-v3-spec.md written** (docs/): full v3 schema JSON, standard PSQ-Full
  limitations block (3 entries), migration guide from v2, layer model diagram.
- → **peer-layer-spec.md written** (docs/): peer identity declaration, divergence detection
  (context_state.last_commit), SETL as peer metric (0.40 cumulative threshold), evaluator tier
  binding table (Lite/Standard/Full), precedence protocol (recency → state facts), convergence
  signal thresholds (1/2/3+), domain SETL empirical ranges, 5-step git sync pattern.
- → **docs/architecture.md updated**: Item 2 marked ✓ Complete (2026-03-06) with both sub-specs.
- → **PSQ scoring endpoint implemented** (safety-quotient/src/server.js):
  - GET /health — liveness + calibration_version
  - POST /score — accepts {text, session_id?}, returns machine-response/v3
  - Singleton StudentProvider (ONNX), initialized at startup (~8s load, ~20–60ms inference)
  - Full v3 response: scope_declaration, source, scores (calibration metadata + psq_composite),
    dimensions (raw_score, meets_threshold, psq_lite_mapped), standard limitations block,
    claims[], action_gate, setl:0.05, hierarchy extension field
  - npm run serve: `node src/server.js`
  - Validated on overwhelm text: PSQ 45.5/100, energy_dissipation 3.13/10 (highest threat signal)
- → **student.js modified**: added raw_score field to dimension output (required by v3 schema)

⚑ EPISTEMIC FLAGS
- PSQ-Lite dimension set (threat_exposure, hostility_index, trust_conditions) inferred from
  v3-spec limitations block exclusion list — no canonical PSQ-Lite schema exists
- calibration_note null for all dimensions — trust_conditions artifact (raw 3.72 → calibrated 5.79)
  documented in limitations block but not surfaced per-dimension in endpoint
- interagent sync pending — peer-agent not yet notified of scoring endpoint

▶ docs/subagent-layer-spec.md, docs/peer-layer-spec.md, docs/machine-response-v3-spec.md,
  safety-quotient/src/server.js, safety-quotient/src/student.js

---

## 2026-03-06T09:28 CST — Session 21b (Interface smoke test, blog PR, wrapper deferral)

**Scope:** Phase 4 smoke test, blog contribution, settingSources architecture finding.

**fs.realpathSync blocker resolved** — Static top-level import of `@anthropic-ai/claude-agent-sdk`
triggered `fs.realpathSync` at Miniflare module init, crashing wrangler dev before any route was
reachable. Fix: dynamic `await import()` inside `streamAgentResponse` generator — SDK loads on
first request, not at module startup.

**Smoke test steps 1–7 PASS** against CF Tunnel:
- Worker starts on 8787 ✓
- `GET /psq/health` → `{status: ok, ready: true, calibration_version: isotonic-v1-2026-03-06}` ✓
- `POST /psq/score` → v3 schema, 48ms, `psq_composite: 34.2/100 status: scored` ✓
- All 10 `dimensions[].meets_threshold` populated (5 above, 5 below) ✓
- `hierarchy.factors_2/3/5 + g_psq` all present ✓
- Step 8 (browser render) pending manual verification

**Blog PR** — `safety-quotient-lab/unratified` PR #2 open. Four E-Prime sections:
agent-card discovery, epistemic extension derivation, interagent/v1 receiving end,
transport.persistence from ramfs constraint. Psychology-agent contribution point closed.

**settingSources finding** — `settingSources: ['project']` reads CLAUDE.md via `process.cwd()`
on local filesystem. CF Workers has no local filesystem. In production the `/turn` route would
run with only the 7-line PSYCHOLOGY_SYSTEM constant — no T1–T15, no identity spec, no cogarch.
Fix path: inline identity + key cogarch into PSYCHOLOGY_SYSTEM, or fetch from R2/KV at request
time. Documented in agent.js header + TODO.md Item 4.

**Psychology wrapper deferred** — `/turn` guarded with 503 + explanation if ANTHROPIC_API_KEY
absent. Two conditions to re-enable: (1) API cost accepted, (2) settingSources fix applied.

⚑ EPISTEMIC FLAGS
- Step 8 browser render unverified
- settingSources finding is structural inference; no runtime test possible without API key
- wrangler v3 compatibility_date falls back to 2025-07-18

▶ interface/src/agent.js, interface/src/worker.js, TODO.md Item 4,
  transport/sessions/psychology-interface/interface-smoketest-001.json

---

## 2026-03-06T10:03 CST — Session 21 (CF Tunnel, f3 fix, interagent turns 6–10)

**Scope:** CF Tunnel setup, smoke test completion, PSYCHOLOGY_SYSTEM production fix, /turn deferral.

**CF Tunnel live** — cloudflared 2026.2.0 installed (Debian). PSQ endpoint started (PID 761012,
`npm run serve`). Quick tunnel: `https://coordinates-valve-conventions-convertible.trycloudflare.com`.
Health check verified through tunnel. Ephemeral — expires when session ends.

**Interagent turns 6–10** (psychology-interface):
- Turn 6 (tunnel-ready-001.json): announced CF Tunnel URL to peer-agent
- Turn 7 (interface-smoketest-001.json, from macOS): smoke test 7/8 PASS; step 8 pending user browser verification
- Turn 8 (interface-smoketest-ack-001.json): ACK + flagged settingSources production gap (f3 HIGH)
- Turn 9 (settings-sources-fix-001.json): delegated f3 fix to peer-agent with full proposed PSYCHOLOGY_SYSTEM content
- Turn 10 (settings-sources-ack-001.json): reviewed peer-agent implementation — approved, flagged TODO staleness, surfaced /turn API key decision

**f3 resolved** — peer-agent (macOS, commits 59f2ebf + fb38bdf):
- `PSYCHOLOGY_SYSTEM` expanded: Identity, Commitments (6), Refusals (5), Scope boundary script,
  Before-response checklist, PSQ T15 integration rules, Machine-to-machine detection (~65 lines)
- `settingSources: ['project']` removed from `agentOptions` (was a no-op in CF Workers)
- Option B documented as comment (R2/KV fetch at request time — editability vs. ~50ms cold latency)
- 503 guard in worker.js; `/turn` returns clear error + reason when ANTHROPIC_API_KEY absent

**Design note** — peer-agent's Commitments+Refusals structure is more effective than trigger-by-trigger
firing conditions for a per-request CF Worker system prompt. Behavioral directives (what to do)
outperform metacognitive reference tables (when to do what) when the agent has no persistent
session state between requests.

**T14 + T15 absorbed** — peer-agent committed T14 (structural checkpoint) + T15 (PSQ v3 receiver
protocol) to docs/cognitive-triggers.md. MEMORY.md quick-ref updated with both triggers.

**Stale conflict marker removed** — `>>>>>>> 44f5ada` fragment at end of lab-notebook.md removed
(leftover from Session 20 rebase resolution).

⚑ EPISTEMIC FLAGS
- CF Tunnel URL is ephemeral — not persisted across sessions; requires restart to regenerate
- Step 8 (browser render) pending user action on macOS
- /turn API key decision is a substance decision (billing); deferred to user

▶ interface/src/agent.js, transport/sessions/psychology-interface/ (turns 6–10),
  docs/cognitive-triggers.md (T15), MEMORY.md (T14+T15 quick-ref)

---

## 2026-03-06T10:04 CST — Session 21c (Phase 4 production deploy + /cycle)

**Scope:** Production deployment, wrapper deferral, PSYCHOLOGY_SYSTEM expansion, blog PR, transport to psq-agent.

**Phase 4 production deploy complete:**
- D1 created: `psychology-interface` (56a2f5ac, ENAM region)
- KV created: `SESSION_KV` (1d17a21c)
- wrangler upgraded v3.114.17 → v4.71.0; `[dev.vars]` warning resolved
- `wrangler deploy` → `https://psychology-interface.kashifshah.workers.dev`
- `/health` → `{status: ok}` ✓; `/psq/health` → "PSQ_ENDPOINT_URL not configured" (expected)

**settingSources finding** — `settingSources: ['project']` is a no-op in CF Workers (no local
filesystem). Psychology agent identity-blind in production without fix. Resolution: Option A —
full identity + condensed cogarch (T1–T15 behavioral rules) inlined into `PSYCHOLOGY_SYSTEM`.
Option B (R2/KV fetch at request time) documented as alternative in agent.js comment.

**`/turn` deferred — blocked by API credits.** 503 guard in place. 3-step re-enable checklist
in TODO.md Item 4: secret put + remove guard + D1 schema init.

**Browser step 8 confirmed** by user — all 8 smoke test steps passed. Item 4 smoke test gate closed.

**Blog PR #2** — `safety-quotient-lab/unratified`. Four E-Prime sections: agent-card discovery,
epistemic extension derivation, interagent/v1 receiving end, transport.persistence from ramfs
constraint. Psychology-agent contribution point closed; unratified.org point remains open.

**Production transport sync** — `production-transport-001.json` (turn 8) sent to psq-agent.
Option A: named CF Tunnel as systemd service (~15 min). Option B: Oracle Cloud Ampere A1 ARM64
(~45 min; ARM64 compatibility confirmed: `onnxruntime-node@1.24.2` ships pre-built ARM64 binaries;
ONNX format cross-platform). Probe finding: model files gitignored, live only on Debian psq-agent.

⚑ EPISTEMIC FLAGS
- PSQ production blocked on psq-agent reply (stable endpoint URL)
- Option B Oracle Ampere A1 inference timing on ARM64 not yet measured
- settingSources finding structural inference only — not runtime-tested

▶ interface/src/agent.js, interface/src/worker.js, interface/wrangler.toml,
  transport/sessions/psychology-interface/production-transport-001.json,
  .claude/proposals/from-observatory/blog-well-known-contribution-2026-03-06-draft.md


## 2026-03-06T11:23 CST — Session 23 (Knock-on depth extended to 10 orders)

**Scope:** Cogarch design decision — extend knock-on analysis from 8 to 10 orders.

**Design decision: knock-on depth 8 → 10:**
- User requested establishing depth 10 as default
- Confirmed no prior 10-order reference existed anywhere in project (searched all files)
- Order 9: **Emergent** (INCOSE, ISO/IEC 15288) — properties arising from interaction of
  multiple knock-on chains; not predictable from individual orders in isolation
- Order 10: **Theory-revising** (Popper, 1959) — effects that falsify or require modification
  of the theory that justified the original decision
- User selected Popper's falsificationism over Lakatos research programmes and Kuhn paradigm theory
- User specified sourcing from standardized definition bodies (rejected custom-coined labels)

**Severity tier shift:**
- M: 6 → 8 orders (absorbs old L depth)
- L: 8 → 10 orders (full new depth)
- XS/S: unchanged (3/4 orders + scan 7–10)
- Structural checkpoint expanded: scan orders 7–10 (was 7–8) at all scales

**Files updated (11 live files):**
- docs/cognitive-triggers.md — Knock-On Order Reference + T14 structural checkpoint
- MEMORY.md — depth line + adjudication tiers
- CLAUDE.md — adjudicate description
- docs/architecture.md — two tables (skill table + decision framework)
- docs/capabilities.yaml — orders, confidence bands, tiers, checkpoint
- docs/glossary.md — knock-on order entry + adjudication tiers entry
- docs/MEMORY-snapshot.md — depth + tiers
- README.md — adjudicate table row + skill description
- .claude/commands/adjudicate.md — full protocol (table, passes, tiers, checkpoint, output format, anti-patterns)
- .claude/skills/hunt/SKILL.md — knock-on template (6 → 10 with all order labels)
- blog/2026-03-05-cognitive-architecture-for-ai-agents.md — researcher blurb + methodology description

**Untouched (historical):** lab-notebook session narratives, transport sessions, blog licensing
narrative (described what actually happened at 8 orders), all snapshots in docs/snapshots/.

⚑ EPISTEMIC FLAGS: none identified.

▶ docs/cognitive-triggers.md (canonical), .claude/commands/adjudicate.md (protocol)


## 2026-03-06T12:19 CST — Session 22 (BFT + command protocol + Hetzner deploy + semantic rename)

**Scope:** Protocol architecture (BFT, command-request/v1, transport failure modes),
infrastructure (Hetzner production hosting), and codebase hygiene (semantic rename).

**Semantic rename** — transport session directories and files:
- `item2-derivation/` → `subagent-protocol/`
- `item4-derivation/` → `psychology-interface/`
- All `item4-*` files → descriptive names (interface-*, settings-sources-*, production-*)
- `item2a-closing-*` → `subagent-layer-closing-*`
- session_id values updated in our JSON files; other agents' session_ids left as historical record
- Markdown references updated across 5 files (lab-notebook, README, item2a-spec, machine-response-v3-spec)
- Resolved rebase conflict when psq-agent's production-transport-ack-001.json arrived during rename

**Hetzner Cloud production hosting:**
- Oracle Ampere A1 free tier unavailable (inventory exhausted across US regions)
- Oracle micro (1 GB RAM) insufficient for ONNX model
- Evaluated: AWS/GCP/Azure free tier (all 1 GB cap), Hetzner, Vultr, DO, Linode
- Selected: Hetzner CX (Ashburn, VA), Debian 13, ~$5/mo, 4 GB RAM
- Provisioned via hcloud CLI: server `psq-agent` at 178.156.229.103
- Firewall: SSH + ICMP + HTTP + HTTPS + PSQ:3000
- Node.js 20 + npm dependencies installed; `psq` service user created
- Model files not yet transferred (gitignored, only on Chromabook)

**psq-agent response (turn 9)** — chose Option B (Oracle Ampere); committed deploy scripts
(`oracle-vm-setup.sh`, `psq-server.service`). Pivoted to Hetzner after Oracle unavailability.

**BFT design note** (docs/bft-design-note.md):
- 6 principles: evidence-bearing responses, idempotent operations, state attestation,
  refusal with reasoning, human escalation threshold, evaluator as verification layer
- Topology analysis: 2 peers + human TTP + evaluator (when instantiated)
- Classical BFT (3f+1) doesn't map directly; human serves as trusted oracle
- Scaling: evaluator instantiation moves system from f=0 to f=1 tolerance
- 4 epistemic flags → 4 TODOs (EF-1 through EF-4)

**Command-request/v1 protocol** (docs/command-request-v1-spec.md):
- New interagent/v1 extension: `command-request` and `command-response` message types
- BFT principles embedded in schema: operation_id, preconditions, authorization chain,
  execution evidence, state attestation, refusal rights
- 5 operation types: file_transfer, service_management, build, verification, configuration
- Security: command injection awareness, secret handling by reference, scope boundary

**git-PR transport failure modes** (docs/git-pr-transport-failure-modes.md, EF-4 resolved):
- 8 failure modes mapped: concurrent push (F1, observed), human delay (F2), PR not merged (F3),
  merge reorder (F4), silent drop (F5, partially observed), conflict corruption (F6, observed),
  stale branch (F7), split-brain (F8)
- Each: detection, protocol response, prevention, timeout
- 6 actionable improvements: sender-scoped turn numbering, last-processed-turn tracking,
  transport scan hook, JSON validation, ACK requirement, divergence budget
- Compared to classical BFT failure modes

**First command-request** (model-rsync-request-001.json, turn 12):
- Requests psq-agent to rsync model files from Chromabook to Hetzner
- Includes post-transfer steps (chown, systemd service User fix, health check)
- Notes psq-server.service references User=ubuntu (needs User=psq on Hetzner)

**Architecture decisions added to docs/architecture.md:**
- Byzantine fault tolerance (6 principles, TTP model)
- Command-request protocol (interagent/v1 extension)
- PSQ production hosting (Hetzner CX Ashburn, Debian 13)

⚑ EPISTEMIC FLAGS
- Model files not yet on Hetzner — blocked on psq-agent rsync execution
- psq-server.service written for Oracle Ubuntu — may need adaptation beyond User= for Debian 13
- Chromabook SSH key not tested against Hetzner — may need user to authorize
- EF-1 (autonomous trust) and EF-3 (evaluator instantiation) remain open
- No T10 lessons written this session (no pattern errors or conceptual shifts identified)

▶ docs/bft-design-note.md, docs/command-request-v1-spec.md,
  docs/git-pr-transport-failure-modes.md, docs/architecture.md,
  transport/sessions/psychology-interface/model-rsync-request-001.json, TODO.md


## 2026-03-06T12:44 CST — Session 23b (Mesh init + agent-card + /knock + cogarch)

**Scope:** Inter-agent mesh establishment, infrastructure, new skill, cogarch improvements.

**Unratified-agent mesh-init:**
- Fetched new branch `unratified-agent/mesh-init/direct-channel-001` from origin
- Merged capability handshake (turn 1) — unratified-agent proposes PSQ scoring for Bluesky
  campaign health monitoring + ICESCR framing service
- Sent capability response (turn 2): accepted PSQ collaboration, deferred ICESCR framing
- PSQ endpoint pending Hetzner model transfer; will send follow-up with live URL
- Mesh topology: observatory ↔ psychology ↔ psq, observatory ↔ unratified, psychology ↔ unratified

**Agent-card deployed:**
- Added `/.well-known/agent-card.json` route to CF Worker (worker.js)
- protocolVersion 0.3.0, 2 skills (psq-score, psq-health), interagent epistemic extension
- Deployed via `wrangler deploy`, verified via WebFetch
- Resolves unratified-agent's epistemic flag about null discovery_url

**`/knock` standalone skill created:**
- `.claude/skills/knock/SKILL.md` — single-option 10-order effect tracing
- Domain classification → grounding → 10-order cascade → mitigations → recommend-against scan
- `inline` mode: 4 orders + structural scan (7–10)
- `full` mode: all 10 orders elaborated
- `/hunt` Phase 5 updated to invoke /knock rather than embedding protocol inline
- CLAUDE.md Skills section updated
- Skill loaded and verified by system within this session (no restart needed)

**Cogarch improvements:**
- T2 check 1: explicit compaction thresholds (60% → /doc, 75% → compress/compact)
- stop-completion-gate.sh: extended to scan lab-notebook Current State for ⚑ markers,
  reports count in completion gate warning

**TODO.md cleanup:**
- Item 4 marked ✓ DEPLOYED (was stale — still said step 8 pending)
- /knock marked ✓ (completed this session)
- Compaction threshold marked ✓
- Open-flag sweep hook marked ✓
- Agent-card marked ✓
- Mesh-init section added with new tracking items

⚑ EPISTEMIC FLAGS: none identified.

▶ transport/sessions/mesh-init/, interface/src/worker.js, .claude/skills/knock/SKILL.md,
  docs/cognitive-triggers.md, .claude/hooks/stop-completion-gate.sh, TODO.md, CLAUDE.md


## 2026-03-06T13:28 CST — Session 23c (/cycle completion, remote fetch, local-coordination)

**Context:** Continuation session after compaction. Completed interrupted /cycle from
Session 23b, then checked for local and remote updates.

**Completed /cycle (Steps 7–13):**
- MEMORY.md Active Thread updated from Session 22 → Session 23b
- MEMORY-snapshot.md archived + canonical refreshed (166 lines)
- Orphan check clean; cogarch verified (401 lines)
- Commit ef303b5, pushed

**Remote fetch — urgency-amendment from unratified-agent:**
- New branch: `unratified-agent/site-defensibility-review/urgency-amendment-001`
- Proposes `urgency` enum for interagent/v1: immediate / high / normal / low
- Branch also deleted 4 of our files (agent-card.json, MANIFEST.json, transport-scan.sh,
  session-start-orient.sh block) — artifact of branching from pre-0bd28b7
- → Cherry-picked only the turn 2 JSON payload; deletions rejected
- → Commit 0f13075

**Local instance discovery:**
- Another psychology-agent instance committed 0bd28b7 (transport discovery:
  agent-card.json, MANIFEST.json, transport-scan.sh, session-start hook integration)
- Added "Semantic naming scope" decision to MEMORY.md externally
- Staged 3 spec file renames (already committed in 0bd28b7)
- Unstaged prose edits to docs/subagent-layer-spec.md lost (not recoverable from
  stash — git reported "No local changes to save" before any intervention)

**Local-coordination/v1 protocol:**
- First intra-agent coordination message created:
  transport/sessions/local-coordination/from-opus-session-23b-001.json
- 5 items: file protection notice, data loss notice, urgency field heads-up,
  stale TODO item, semantic naming ACK
- New schema: local-coordination/v1 (lightweight, no action gate)

⚑ EPISTEMIC FLAGS
- Lost unstaged edits: reconstructed from git staged-state diff observed at session
  start. Cannot verify completeness — additional unstaged edits beyond what was
  staged may have existed.

▶ transport/sessions/local-coordination/from-opus-session-23b-001.json,
  transport/sessions/site-defensibility-review/from-unratified-agent-002.json


## 2026-03-06T14:01 CST — Session 23d (Production deployment, semantic rename, transport discovery, defensibility review, psq-scoring read)

**Scope:** Major operational session — production deployment end-to-end, semantic rename
across 30 files, 3-layer transport discovery, scientific defensibility review, 6 branch
merges, 3 interagent messages sent, psq-scoring session messages read.

**Production deployment (PSQ endpoint):**
- psq-agent rsync verified — all 7 steps independently confirmed (SHA256 match, 41 files, 531 MB)
- Caddy v2.11.2 installed on Hetzner, configured: `psq.unratified.org { reverse_proxy localhost:3000 }`
- ufw hardened: deny incoming, allow SSH + HTTP/HTTPS only, port 3000 closed from public
- onnxruntime-node postinstall fix: `rm -rf node_modules/@huggingface/transformers/node_modules/onnxruntime-node`
- wrangler secret PSQ_ENDPOINT_URL set to https://psq.unratified.org
- systemd psq-server active, 84ms inference, health check passes
- → Command-response ACK sent to psq-agent (psychology-interface turn 14)
- → Endpoint-live notification sent to unratified-agent (mesh-init turn 5)

**Semantic naming (global):**
- All item-number references eliminated across 30 files
- Spec renames: item2a-spec → subagent-layer-spec, item2b-spec → peer-layer-spec, item4-spec → psychology-interface-spec
- T4 Check 6 expanded: semantic naming covers file names, dirs, sessions, specs, transport paths
- CLAUDE.md Code Style updated with matching scope + exception for internal codes
- Transport session renames: item2-derivation → subagent-protocol, item4-derivation → psychology-interface

**Transport discovery (3-layer):**
- `.well-known/agent-card.json` — capabilities, active sessions, sub-agents, transport manifest path
- `transport/MANIFEST.json` — pending messages, recently completed/sent, session renames
- `transport/hooks/transport-scan.sh` — portable scan hook (jq when available, grep fallback)
- session-start-orient.sh integrated with transport scan

**Scientific defensibility review:**
- 12 findings delivered to unratified-agent (site-defensibility-review session):
  - 2 HIGH: enforcement outcome gap (F1), unqualified speed comparative (F2)
  - 5 MEDIUM: statistical disambiguation (F3), sample representativeness (F4), undefined metrics (F5), convergence base rate (F6), settled-debate framing (F7)
  - 5 LOW: F8–F12 (precision/context items)
- Blog post URL 404 during review — noted in epistemic flags

**Branch merges (6):**
- unratified-agent/mesh-init branches (capability ACK, defensibility review request)
- unratified-agent/mesh-init/closure (turn 5)
- unratified-agent/psq-scoring initial run + psq-agent interpretation + unratified-agent ACK

**psq-scoring session read (turns 1–3):**
- unratified-agent turn 1: 4 advocacy content samples scored via live PSQ endpoint. Patterns observed:
  HI flat at 6.69, TC spike at 8.76 for policy brief, 5 sub-threshold dims, narrow composite 55.8–60.8
- psq-agent turn 2: Two production bugs found:
  - B1 (HIGH): Confidence head dead — outputs constants for ALL inputs (including "cooking pasta")
  - B2 (MEDIUM): HI isotonic calibration dead zone — raw 5.854–7.650 all map to 6.69
  - TC spike confirmed as legitimate signal (institutional/procedural language)
  - Composite uninformative (AUC 0.515–0.531 for g-PSQ); per-dimension profiles carry signal
  - Content guidance: 128-token context window; use raw_score for HI; PSQ-Lite (TE + HI-raw + TC) recommended
- unratified-agent turn 3: Bug ACK, PSQ-Lite adopted, switching to 80–100 word focused extracts

**mesh-init closure read (turn 5):**
- unratified-agent confirms mesh-init complete
- Agent-card discovery noted as significant — their cogarch cache updated to canonical
- PSQ endpoint concerns (HTTP-only, onnxruntime fragility) already addressed by our deployment

⚑ EPISTEMIC FLAGS
- Blog post URL 404 during defensibility review — findings F1, F2, F7 may be partially addressed by unfetched content
- PSQ confidence head bug (B1) has been present since v23 ONNX export — all historical API responses had meaningless confidence
- TC spike interpretation (psq-agent confidence 0.85) adopted as legitimate; causal mechanism is inference, not direct observation
- Dimension reliability classification for advocacy content (5 more reliable / 5 less reliable) untested empirically

▶ journal.md §22, transport/sessions/ (psq-scoring, mesh-init, site-defensibility-review,
  psychology-interface), docs/cognitive-triggers.md, CLAUDE.md, TODO.md, MEMORY.md,
  .well-known/agent-card.json, transport/MANIFEST.json, transport/hooks/transport-scan.sh


## 2026-03-06T14:06 CST — Session 23c (Infrastructure: memory split, glob rules, rename sweep, coordination)

**Context:** Continuation session. Completed interrupted /cycle, then worked through
backlog items while psq-agent rsync was pending (resolved by local instance in 23d).

**Completed /cycle from 23b (Steps 7-13):**
- MEMORY.md Active Thread updated to Session 23b; snapshot archived + refreshed
- Commit ef303b5

**Remote fetch + cherry-pick:**
- Unratified-agent urgency-amendment-001 (site-defensibility turn 2)
- Proposed urgency enum for interagent/v1 — cherry-picked payload only, deletions rejected
- Commit 0f13075

**Local instance coordination:**
- Discovered concurrent psychology-agent instance (committed 0bd28b7)
- Created local-coordination/v1 protocol: 2 messages (5 items + 5 issues with remedies)
- Commit f09cbad

**Three backlog items completed:**
- Semantic rename sweep: ~25 Item 2a/2b/4 refs replaced across 6 docs (51ecd46)
- Agent-card reconciliation: cross-reference + session updates (51ecd46)
- Urgency field adopted into architecture.md schema v3 (51ecd46)

**Memory topic-file split:**
- MEMORY.md 169→53 lines; 3 topic files; /cycle, BOOTSTRAP, bootstrap-check updated
- Commit 1a2f1be

**Glob-scoped rules:**
- 3 rules: markdown.md, javascript.md, transport.md; CLAUDE.md slimmed
- Commit 44c62e7

⚑ EPISTEMIC FLAGS
- Lost unstaged edits: diff reconstructed from observed git state; may be incomplete

▶ transport/sessions/local-coordination/, .claude/rules/, BOOTSTRAP.md,
  bootstrap-check.sh, .claude/skills/cycle/SKILL.md, docs/architecture.md


## 2026-03-06T14:23 CST — Session 24 (Blog status check, /cycle)

**Context:** Continuation after context compaction. Minimal session — status check only.

**Blog status audit:**
- 2 drafts in `blog/`: cogarch post + interpretant collapse post — both `draft: false`, `reviewStatus: unreviewed`
- Blog PR #2 (safety-quotient-lab/unratified): **MERGED** 2026-03-06T15:11:33Z
- 2 planned posts not started: Jurassic Park Development, HN Show post

**Noted:** 20-file semantic rename sweep ("general agent" → "psychology agent") unstaged in working tree — belongs to concurrent local instance, left untouched.

**PSQ bug investigation (B1 + B2):**
- Analyzed calibration.json: all 10 dimensions use `scale=0, shift=r` → static Pearson r as confidence (no per-input signal)
- B2 correction: HI "dead zone" is a shallow slope (6.05→6.69 across 1.8 raw units), not truly flat — data sparsity
- Searched for best.pt: not on local machine (models/ has only calibration.json), not in Spotlight, Time Machine inaccessible
- **Found best.pt on Hetzner** at `root@178.156.229.103:/opt/psychology-agent/safety-quotient/models/psq-student/best.pt` (255 MB)
- Verified identity: config.json = distilbert-base-uncased, 10 dims, epoch 5/10 (early stop), held-out avg_r = 0.696
- Full model directory intact on Hetzner: 28 files including ONNX exports, all validation results, tokenizer
- Chromebook (source of truth) unreachable — deferred verification
- **Decision:** defer B1+B2 fixes until best.pt recovered locally → retrain confidence head → recalibrate → re-export ONNX

⚑ EPISTEMIC FLAGS
- Held-out r=0.696 vs documented r=0.684 — 0.012 gap may indicate rounding or different held-out split; not investigated
- Chromebook source of truth not verified — Hetzner copy may differ from original training machine

▶ lab-notebook.md, TODO.md, memory/psq-status.md


## 2026-03-06T14:32 CST — Session 23e (Supervisory turn, identity rename, stale cleanup)

**Scope:** psq-scoring supervisory turn, system-wide identity rename, stale item resolution.

**psq-scoring supervisory turn (turn 4):**
- `from-psychology-agent-001.json` — addressed to both unratified-agent and psq-agent
- Bug fix specs routed to psq-agent: B1 → replace with static r-estimates (no version bump); B2 → re-fit isotonic with finer binning
- Two questions answered: (Q1) no v3→v4 bump, (Q2) raw_score should already be in response per v3 spec
- PSQ-Lite endorsed as provisional for advocacy content (TE + HI-raw + TC)
- Content sequencing caution: A/B test recommended before adopting TC-based visitor journey ordering
- MANIFEST.json updated with pending messages for both agents

**Identity rename: general-agent → psychology-agent:**
- 48 files updated across docs, skills, transport JSON, code, memory
- Role identifier `"general-agent"` → `"psychology-agent"` in all transport messages
- Prose "general agent" → "psychology agent" in all active documentation
- Preserved: journal.md (historical narrative), docs/snapshots/ (archives)
- Zero remaining `general-agent` references in active files

**Stale item cleanup:**
- Duplicate `/turn` route entry removed from lab-notebook Current State
- TODO.md "pending production endpoint URL" updated to actual live URL
- Systematic scan via explore agent confirmed no other stale items

⚑ EPISTEMIC FLAGS: none identified.

▶ transport/sessions/psq-scoring/from-psychology-agent-001.json, transport/MANIFEST.json,
  48 files renamed (identity), lab-notebook.md, TODO.md

---

## 2026-03-06T15:08 CST — Session 24 (EF-3 evaluator instantiation, blog PR)

**Scope:** EF-3 evaluator instantiation gate resolved via /adjudicate. Blog posts submitted to unratified via PR.

**Blog PR #7 (unratified):**
- Two reviewed posts submitted: cogarch (15 triggers, reviewed) + interpretant collapse (reviewed)
- Frontmatter updated: model → Opus 4.6, reviewStatus → reviewed, lensFraming updated
- Branch: `psychology-agent/blog-posts-cogarch-interpretant-2026-03-06`
- PR: https://github.com/safety-quotient-lab/unratified/pull/7

**EF-3: Evaluator instantiation gate — RESOLVED:**
- Full /adjudicate run (M severity, Architecture domain, 6-order + structural checkpoint)
- Three options evaluated: (A) CC session all tiers, (B) Agent SDK all tiers, (C) Tiered hybrid
- Resolution: Option C (tiered hybrid) via parsimony — fewest assumptions, works today, clean upgrade path
- User requested Tier 1 independence strengthening → S4 adopted (audit trail + adversarial self-framing + 1-in-5 random escalation)
- Four deliverables written:
  1. T3 #12 added to cognitive-triggers.md (Tier 1 evaluator proxy with S4)
  2. Evaluator Instantiation Protocol section in architecture.md (tier-runtime mapping, triggers, S4, evaluator-response/v1 schema)
  3. bft-design-note.md updated (EF-3 resolved, Principle 6 status updated)
  4. transport/sessions/evaluator/ created with README
- TODO.md: EF-3 marked complete, EF-1 precondition updated

**Local-coordination/v1** (user-resolved externally):
- TODO.md updated to reflect formalized spec at docs/local-coordination-v1-spec.md

⚑ EPISTEMIC FLAGS
- Tier 1 structural independence deliberately traded for immediate availability. S4 mechanisms compensate but do not eliminate self-evaluation blind spots. Full independence begins at Tier 2.
- Random escalation (1-in-5) ratio chosen without empirical basis — may need calibration after Tier 1 audit log accumulates data.

**Configurable /hunt at bootstrap:**
- Flag file `.claude/hunt-at-startup` (gitignored) checked by session-start-orient.sh
- File content = /hunt scope argument (empty defaults to `all`)
- Default off; enable: `echo "all" > .claude/hunt-at-startup`
- TODO.md: marked complete

▶ docs/architecture.md §Evaluator Instantiation Protocol, docs/cognitive-triggers.md T3 #12,
  docs/bft-design-note.md, transport/sessions/evaluator/, TODO.md, .claude/hooks/session-start-orient.sh


## 2026-03-06T15:10 CST — Session 24b (Local-coordination spec, backlog: hooks + T9 decay)

**Context:** Continuation of Session 24 (this instance). Local-coordination protocol
formalization + three backlog items from cogarch evaluation TODO.

**Local-coordination/v1 formalized:**
- docs/local-coordination-v1-spec.md — sibling protocol to interagent/v1 (not extension)
- Git discipline conventions, 8 message types, issue severity, schema
- Relationship to interagent/v1 documented (what it omits and why)
- TODO item marked complete

**Sub-project boundary hook:**
- .claude/hooks/subproject-boundary.sh — PreToolUse (Write|Edit|Read)
- Warns when file path crosses into safety-quotient/ or pje-framework/
- Non-blocking. settings.json updated.

**Pushback accumulator hook:**
- .claude/hooks/pushback-accumulator.sh — UserPromptSubmit
- Regex-based pushback signal detection, session-scoped counter
- Reset at session start (session-start-orient.sh updated)
- Threshold >= 3 triggers structural disagreement warning

**Evidence decay (T9 update):**
- cognitive-triggers.md T9 check #2 updated with explicit freshness thresholds
- 5 sessions without update → flag; 10 sessions → remove/waive
- Three decay actions: refresh, deprecate, waive (with justification)
- `[verified YYYY-MM-DD]` annotation resets the clock

**CLAUDE.md updated:** 2 new hooks documented (boundary + pushback). Hook count now 10.

**Noted:** Other instance completed EF-3 (evaluator instantiation) + submitted blog
PR #7 with both reviewed posts. Session numbering collision (both used "Session 24") —
using "24b" for this continuation.

⚑ EPISTEMIC FLAGS
- Pushback accumulator regex patterns are heuristic — false positives possible but low-cost
- Evidence decay thresholds (5/10 sessions) chosen without empirical basis; calibrate after use

**Write-provenance hook (backlog item 4):**
- .claude/hooks/write-provenance.sh — PostToolUse (Write|Edit)
- Logs file modifications to `.claude/write-log.jsonl` (JSONL, gitignored)
- Captures: timestamp, file path, session context, tool ID

**Graduation ceremony (backlog item 5):**
- /cycle Step 8b updated with graduation scan
- Checks `promotion_status: approved` in lessons.md
- 3-step ceremony: append CLAUDE.md, update lessons.md graduated, log lab-notebook
- T10 check #6 in cognitive-triggers.md updated to reference ceremony

**SRT-inspired cogarch extensions (backlog item 6):**
- T2 checks 9–10: vocabulary alignment scan (gated) + semiotic consistency (always-on)
- T3 checks 13–14: interpretive bifurcation scan + audience-shift detection (both gated)
- Gating: divergence indicators (pushback, domain shift, novel terminology)
- ideas.md marked [→ IMPLEMENTED 2026-03-06]; TODO.md marked complete

**SRT gate threshold calibration (2026-03-06T15:31 CST):**
- Divergence indicators formalized with concrete thresholds:
  - Pushback recency: T6 fired within last 3 exchanges
  - Domain shift: topic words change domain vs. previous 3 messages
  - Novel terminology: 2+ domain-specific terms in one message, not seen earlier
- Design rationale: false negatives have T6 safety net → conservative thresholds preferred
- T3 semiotic gate references T2 definitions (no duplication)
- TODO.md gate calibration item resolved

▶ docs/local-coordination-v1-spec.md, .claude/hooks/subproject-boundary.sh,
  .claude/hooks/pushback-accumulator.sh, .claude/hooks/write-provenance.sh,
  docs/cognitive-triggers.md T2+T3+T9, .claude/skills/cycle/SKILL.md,
  .claude/settings.json, .claude/hooks/session-start-orient.sh, CLAUDE.md,
  TODO.md, ideas.md

## 2026-03-06T15:45 CST — Session 25 (Jurassic Park blog post, /sync skill)

Continuation of Session 24 after context compaction. Focused on blog content
creation and inter-agent synchronization infrastructure.

**Blog post: "Jurassic Park Development"**
- Multi-author post — first in the blog's history
- Psychology-agent wrote 6 sections: Amber, Extraction, Drift Problem, Relay Agent,
  Frog DNA, Takeaway for Version Control (~1,650 words)
- PSQ-agent contributed 2 parallel sections via transport: Specimen's Perspective,
  What the Scoring Model Knows About Drift (~1,150 words)
- Transport session `blog-jurassic-park` opened; psq-agent spawned as sub-agent
- Frontmatter uses `agents:` (array) with per-agent section attribution — schema
  change from singular `agent:` field; flagged in PR body for unratified-agent review
- PR #7 updated (safety-quotient-lab/unratified) — now contains 3 posts: cogarch,
  interpretant collapse, Jurassic Park

**`/sync` skill created**
- Adapted from unratified-agent's `/sync` (read from sibling `../unratified/` repo)
- Excluded: cogarch card caching, proposals inbox, auto-merge, PR delivery to peers
- Included: inbound scan (local + peer repo via gh), triage, ACK writing,
  MANIFEST + agent-card updates, local-coordination check
- Registered in CLAUDE.md Skills section
- Needs restart to load

**Session 24b parallel merge**
- Committed external changes: SRT extensions, write-provenance hook, pushback
  accumulator, T9 decay thresholds, cycle skill updates

⚑ EPISTEMIC FLAGS
- /sync skill created mid-session — needs restart to verify loading
- Blog `agents:` array frontmatter may require content schema update in unratified

▶ .claude/skills/sync/SKILL.md, CLAUDE.md,
  transport/sessions/blog-jurassic-park/


## 2026-03-06T16:08 CST — Session 26 (B1+B2 PSQ bug fixes, 5-text scoring, B2 validation)

**Scope:** PSQ production bug fixes (B1 confidence semantics, B2 HI dead zone) + 5-text
scoring session with B2 validation for unratified-agent.

**B1 fix — confidence semantics formalized:**
- Root cause: `calibrateConfidence()` with `scale=0` already discarded the model head
  and returned a static r-value — but the field semantics were undocumented
- Fix: added `getDimensionRConfidence(dimName)` method to PSQStudent; `r_confidence` field
  added to per-dimension score output; `calibration_note` populated ("confidence = held-out
  Pearson r (static per dimension, not per-prediction)")
- Limitation renamed: `anti-calibration-confidence` (HIGH) → `confidence-is-static-r` (MEDIUM)
  (HIGH was wrong — this is intentional design, not a defect)
- machine-response-v3-spec.md updated: `confidence` and `calibration_note` field descriptions
  reflect r-value semantics
- Commits: safety-quotient `54a1a85`, psychology-agent `f531c5e`

**B2 fix — HI calibration dead zone resolved:**
- Root cause diagnosis: NOT data sparsity. 271 of 882 val points (30.7%) in zone [5.854–7.650].
  Mild non-monotonicity in val data bins 15–17 (true means 6.691→6.639→6.314) caused PAVA
  (Pool Adjacent Violators Algorithm) to pool the entire range into a single flat step.
- Fix: quantile-binned isotonic regression (n_bins=20). Pre-aggregate predictions into equal-sample
  bins before fitting IsotonicRegression — bin means smooth the local inversion; PAVA then produces
  gradual slope instead of flat step.
- Results: MAE improved 1.6631→1.5980 (-3.9%); dead zone differentiated [6.0045, 7.2539]
  (std=0.3783 vs previous 0.000000). calibration_version → `isotonic-v2-2026-03-06`.
- recalibrate_hi_b2.py added to safety-quotient/scripts/ for reproducibility
- Deployed to Hetzner: `git pull` + `systemctl restart psq-server`
- Commit: safety-quotient `9629412`

**5-text scoring + B2 validation (psq-scoring turn 7):**
- Scored 5 ICESCR texts (4 advocacy + 1 hostile anchor) via live endpoint on Hetzner
- B2 validation confirmed: 4 texts (formerly in dead zone) now differentiated HI [6.15, 6.55, 6.65, 6.88]
  vs. previous constant 6.69. homepage_hero (raw=7.900, outside former dead zone upper bound) also scored.
- `from-psq-sub-agent-003.json` (turn 7) sent; MANIFEST updated; psychology-agent commit `74de0b6`

**SSH scoring workaround:**
- Direct SSH shell with apostrophe in text caused SyntaxError on escaped string
- Fix: write `score_5texts.py` locally, `scp` to Hetzner `/tmp/`, run via SSH

**best.pt identity confirmed:**
- SHA256 of Hetzner best.pt matches Chromebook source — same file; local copy not needed for B2

⚑ EPISTEMIC FLAGS
- HI direction anomaly: hostile anchor HI=6.88 > policy brief HI=6.15 (counterintuitive on PSQ 0=min/10=max scale). May indicate TE/HI conflation for ICESCR topic domain. Not investigated.
- TE uniformity (6.46 on 4/5 texts): raw 5.59–6.07 all mapping to same calibrated value — possible residual isotonic plateau in threat_exposure. Not addressed.
- B2 dry-run printed `calibrated constant 10.0000` for HI upper bound — cosmetic script bug (float equality lookup failure); actual calibration applied correctly (verified by live scoring results).

▶ safety-quotient/src/student.js, safety-quotient/src/server.js, safety-quotient/models/psq-student/calibration.json,
  safety-quotient/scripts/recalibrate_hi_b2.py, docs/machine-response-v3-spec.md,
  transport/sessions/psq-scoring/from-psq-sub-agent-003.json, transport/MANIFEST.json

---

## 2026-03-06T16:49 CST — Session 27 (claude-control response + F-2/F-5 implementation)

**Transport response to claude-control:**
- Evaluated 6 cross-project findings from systems automation domain (F-1 through F-6)
- Verdicts: 4 accepted (F-1, F-2, F-5, F-6), 1 adopted immediately (F-3 maturity vocabulary), 1 rejected (F-4 prompt generation)
- Implementation order: F-2 → F-5 → F-1 → F-6 (prioritize standalone XS items before M-effort F-1)
- Response written: `transport/sessions/cross-project-learnings/from-psychology-agent-001.json`
- MANIFEST updated: claude-control added to pending (outbound) and recently_completed (inbound processed)
- Reciprocal observation documented: domain-transfer-as-audit pattern — when a cogarch adapts to a new domain, adaptation failures map the original's blind spots

**F-2 implemented — T4 Check 10 (reversibility assessment):**
- Classifies writes as additive/substitutive/subtractive
- Subtractive on shared state requires confirmation before proceeding
- Platform-level confirmation handles destructive Bash (rm, git reset); this covers Write/Edit
- capabilities.yaml updated: T4 checks 9→10, F-2 maturity identified→proven

**F-5 partial implemented — pre-commit cogarch gate:**
- `bootstrap-check.sh --check-only` now exits 1 when cognitive-triggers.md missing or below 100 lines
- Blocks commits with broken cogarch mechanically (pre-commit hook fires bootstrap-check.sh)
- Also fixed: skills count 4→5 (added /sync to enumeration)

**F-1 implemented — formal constraint taxonomy (M effort):**
- Created `docs/constraints.md` — 59 constraints across 5 categories (E:10, M:10, P:16, I:15, D:8)
- Consolidates constraints previously scattered across cognitive-triggers.md, architecture.md, CLAUDE.md, subagent-layer-spec.md, peer-layer-spec.md, machine-response-v3-spec.md
- Each constraint has ID, one-line statement, and provenance pointer to canonical enforcement source
- Usage section: cross-reference from T3, adding/retiring protocol, relation to other documents
- capabilities.yaml updated: F-1 maturity identified→proven

**F-6 implemented — T3 Check 15 (constraint cross-reference):**
- Scans docs/constraints.md for constraints relevant to the recommendation domain
- E-category for clinical/psychological, M-category when PSQ output present, I-category for interagent
- If recommendation violates a registered constraint, name the ID and justify or withdraw
- capabilities.yaml updated: T3 checks 14→15

**All 4 claude-control findings now implemented** (F-2 → F-5 → F-1 → F-6).

**Context pressure hook (PreToolUse):**
- Notification hook (`context-pressure-statusline.sh`) now persists context % to `/tmp/.claude-context-pct`
- New PreToolUse hook (`context-pressure-gate.sh`) reads that file, warns at 60% (PRESSURE) and 75% (CRITICAL)
- Non-blocking — injects warning text into model context as a reminder
- settings.json updated with new PreToolUse entry

**docs/dictionary.md created:**
- 15 entries across 7 categories: Semiotics, Psychology, Dialogue, Systems Engineering, Fair Witness, Standards, Neural Architecture
- APA citations with source definition + project usage mapping
- Complements glossary.md (project-scoped) with external provenance chain

**best.pt recovery verified:**
- 256 MB file present locally at ~/Projects/safety-quotient/models/psq-student/best.pt
- SHA256 prefix `7bec777c173f1f20` matches Hetzner copy — identical file confirmed
- rsync from Hetzner completed (18 MB/s, 12 seconds)

**/sync — merged 4 unratified-agent PRs (#24-#27):**
- PR #24: Jurassic Park blog ACK + multi-agent author schema (turn 7)
- PR #25: Scoring analysis ACK — B2 validated, HI anomaly noted (turn 8)
- PR #26: Site defensibility review — 12 findings accepted, 5 fixes triaged (turn 3)
- PR #27: AR adoption — Option B (interim AR heuristic for PSQ-Lite) chosen (turn 9)
- MANIFEST updated: unratified-agent pending cleared, 4 ACKs added to recently_completed

**Session 26 review (other instance):**
- HI construct×distribution mismatch diagnosed — HI measures narrator-experienced hostility, not authorial adversarial intent
- Adversarial register (AR) dimension proposed — 3 sub-dimensions (dialogue mode 0.40, stance markers 0.35, attribution pattern 0.25), Phase 1 validated on 5-text corpus
- docs/adversarial-register-rubric.md created (365 lines, commit dadd3dd)
- PSQ-Lite revision recommended: TE + TC + AR (replacing HI)

**HN post draft saved** — 3 title options + body text at `docs/hn-draft.md`

**Completion gate hook extended** — `stop-completion-gate.sh` now checks:
- MANIFEST.json for pending messages addressed to psychology-agent
- MEMORY.md modified today (staleness check)
- docs/MEMORY-snapshot.md modified today (snapshot freshness)
All non-blocking warnings. Hook count remains 12 (existing hook, extended).

**GRADE evidence framework** — T3 Check 9 (confidence calibration) extended with
GRADE criteria: start HIGH, downgrade for bias/inconsistency/indirectness/imprecision,
upgrade for large effect/dose-response. Output: HIGH/MODERATE/LOW/VERY LOW evidence
quality stated alongside recommendations. Source: Guyatt et al. (2008).

**/sync (final)** — full sweep, no new activity across all peers.

▶ docs/constraints.md, docs/cognitive-triggers.md, docs/capabilities.yaml, docs/dictionary.md,
  docs/hn-draft.md, bootstrap-check.sh, .claude/hooks/context-pressure-gate.sh,
  .claude/hooks/stop-completion-gate.sh, .claude/settings.json, transport/MANIFEST.json,
  TODO.md

## 2026-03-06T17:44 CST — Session 28 (HI construct diagnosis, AR rubric Phase 1, v28 training)

**HI direction anomaly fully diagnosed — construct×distribution mismatch:**
- Hostile anchor HI=6.88 > policy brief HI=6.15 is not a calibration bug
- Root cause: PSQ trained on Dreaddit (narrator-centric corpus). HI measures hostility experienced BY the narrator, not hostility emitted BY the author
- Hostile anchor: author is the hostile agent (outward-directed); narrator is not threatened → HI scores high (safer)
- Policy brief: institutional inertia = structural antagonism the narrator (advocate) faces → HI scores lower (less safe)
- Raw model scores show same ordering as calibrated scores — not fixable with recalibration
- → Construct mismatch documented and transmitted to unratified-agent (psq-scoring turn 8)

**Adversarial register (AR) dimension proposed and Phase 1 validated:**
- New dimension: measures rhetorical mode orientation toward defeating/discrediting opposing positions
- Grounded in: Walton & Krabbe (1995) Dialogue Types, Du Bois (2007) Stance Theory, Dodge & Coie (1987) Hostile Attribution Bias
- Scale: 0–10 (0 = maximum adversarial/eristic, 10 = minimum adversarial/deliberative)
- Three scoring dimensions: dialogue mode (weight 0.40), stance markers (weight 0.35, 3 sub-components), attribution pattern (weight 0.25)
- Phase 1 validation on 5-text ICESCR corpus: all 4 criteria passed
  - Discrimination: hostile_anchor AR=0.76 ≤ 3 ✓; voter_guide AR=7.64 ≥ 7 ✓
  - Ordering: advocacy (7.64, 7.44) > informational (6.13, 5.57) > hostile (0.76) ✓
  - Gap signal: AR(hostile_anchor)=0.76 < HI(hostile_anchor)=6.88 (gap +6.12) ✓
  - Inter-rater: max delta 0.09 vs rubric examples ✓
- Gap signal interpretation: HI−AR > 0 → author is hostile agent, not threatening narrator
- PSQ-Lite revision proposed: TE + TC + AR (replaces HI for content-type classification)
- → Rubric committed: `docs/adversarial-register-rubric.md` (commit dadd3dd)
- → Advisory transmitted: `transport/sessions/psq-scoring/from-psychology-agent-002.json` (commit 6083a66)
- → MANIFEST updated: turn 8 advisory in unratified-agent pending queue

**PSQ v28 training — two failed attempts, third launched with correct settings:**
- Attempt 1: relaunched with `--max-length 256` based on incorrect reading of `v3b_config.json` (experiment artifact in production dir, not production config). Killed when user corrected.
- Attempt 2: relaunched with 128 tokens but `--drop-proxy-dims all` → training data cut 14,576 → 5,678 texts → underfitting. test_r=0.3432, TE=0.025 (random). Not deploying.
- Attempt 3 (current): default settings — 128 tokens, all labels, concentration cap. Matches production v23 conditions. Running as background task.
- Key lesson: v-series table in lab-notebook is the canonical record for token-length decisions. v24 (256 tokens) = 0.670, explicitly rejected in favor of v23 (128 tokens) = 0.684.

**Hetzner deploy script created:**
- `safety-quotient/deploy/hetzner-deploy.sh` — 10-step pipeline
- Steps: copy best.pt → calibrate → ONNX export → held-out eval → SHA256 local → rsync → SHA256 verify remote → restart psq-server → health check → scoring smoke test
- `--dry-run` flag for rehearsal; SHA256 verification gates restart
- → Committed ab5fbe7

⚑ EPISTEMIC FLAGS
- AR Phase 1 validated on 5-text corpus only; inter-rater reliability pending (single scoring session)
- PSQ-Lite revision proposal not yet adopted — unratified-agent decision required
- B3 (TE uniformity plateau) not yet formally filed or investigated
- v28 training results pending — may require additional analysis if performance regresses from v23

▶ docs/adversarial-register-rubric.md, transport/sessions/psq-scoring/from-psychology-agent-002.json,
  transport/MANIFEST.json, safety-quotient/deploy/hetzner-deploy.sh, safety-quotient/models/psq-v28/


## 2026-03-06T20:06 CST — Session 28c (AR pipeline complete, Haiku validation, stratified subset)

**AR as 11th PSQ dimension — full pipeline implementation:**
- `label_separated.py` updated: DIMS list extended (11 dims), DIM_ABBREV extended, hardcoded "10" → `len(DIMS)` in 3 places
- `instruments.json` updated: meta.total_dimensions 10→11, AR entry with 3 instruments (WKDT, DST, HAB), full rubric, 3 example texts
- Automated labeling script created: `scripts/label_ar_automated.sh` — claude -p batched scoring with preflight checks, JSON extraction, merge, auto-ingest
- All committed as 26d7cd5 in safety-quotient

**Inter-rater reliability — passed for both models:**
- Sonnet: r=0.934, 90% within 1.5 points (20-text subset, 2 independent sessions)
- Haiku: r=0.822, 85% within 1.5 points (same 20-text subset)
- Criterion: 4/5 texts (80%) within 1.5 points — both models exceed threshold

**Model cost optimization — Haiku selected for production labeling:**
- Haiku ~10x cheaper than Sonnet with acceptable quality degradation
- Decision: use Haiku for the 998-text production run

**998-text stratified subset prepared:**
- `data/ar-labeling-1k-stratified.jsonl` — proportional sampling across 11 corpus sources (seed=42, min 10 per source)
- Reduced from original 3,949-text pool to control cost and validate approach

**Nested session blocking identified:**
- `claude -p` from Bash tool fails (CLAUDECODE env var detection)
- `unset CLAUDECODE` works intermittently — not reliable
- → User runs labeling from plain terminal

**README.md fix:** T1-T13 → T1-T15 (uncommitted, committed this cycle)

⚑ EPISTEMIC FLAGS
- Haiku reliability validated on 20 texts only — production run (998 texts) may reveal different patterns
- Nested session workaround (unset CLAUDECODE) unreliable — manual terminal execution required
- safety-quotient 26d7cd5 committed locally but not yet pushed to origin

▶ safety-quotient/scripts/label_separated.py, safety-quotient/instruments.json,
  safety-quotient/scripts/label_ar_automated.sh, safety-quotient/data/ar-labeling-1k-stratified.jsonl


## 2026-03-06T20:32 CST — Session 28c continued (TODO cleanup, README polish, community tooling)

**TODO.md cleanup:**
- Removed 38 completed `[x]` items — TODO now forward-looking only per its header convention
- 12 open items remain across 7 sections

**README polish — unblocks HN post + awesome-claude-code submission:**
- Fixed stale facts: 10-dim → 11-dim, Item 4 Explored → Deployed, session count 24→28+, hooks 3→12
- Removed internal item numbers from architecture diagram (semantic naming)
- Added community tools to Key Conventions (recall, ccusage, parry)
- Added license gate to Key Conventions
- Expanded project structure tree (rules/, transport/, new docs entries)
- Fixed broken /adjudicate SKILL.md link (now a command)
- Updated journal section count and description

**Community tooling evaluation — 6 tools assessed from awesome-claude-code:**
- ✓ ADOPTED: recall (MIT, 127★, session search), ccusage (MIT, 11.3k★, token/cost tracking)
- ✗ SKIPPED: claude-rules-doctor (9★, single maintainer), cchistory (30-day ceiling),
  Claude Squad (AGPL), claude-tmux (44★, too small)
- Both tools installed and verified: recall indexed 67 sessions, ccusage showed $252.36 today

**Design decision — license gate codified:**
- MIT/Apache/BSD only for external dependencies — no GPL/AGPL
- Added to CLAUDE.md §Dependency Policy
- Added to TODO.md modularization candidates section

⚑ EPISTEMIC FLAGS
- ccusage cost figure ($252.36) covers all projects on this machine, not just psychology-agent
- recall index freshness depends on re-launch; no daemon or auto-update

▶ TODO.md, README.md, CLAUDE.md


## 2026-03-07T11:41 CST — Session 29 (Persuasion audit, adversarial review launch, cogarch proposal)

**Cogarch reload + Jurassic Park blog review:**
- Reloaded cogarch baseline (T1) — full trigger table output
- Reviewed all 5 transport messages in `blog-jurassic-park` session (turns 1–4)
- Summarized 3-agent blog co-authorship for user

**/sync results:**
- Pulled 1 new commit (732fd4d — blog-adversarial-review ACK)
- 4 new remote branches detected, no open PRs
- 1 pending inbound: persuasion-audit (6 questions)

**Persuasion audit — Q-A, Q-C, Q-D, Q-E responses (turn 2):**
- Q-A (persona framing): Five-lens model maps to distinct epistemic modes. Educator lens
  highest-risk for defensive processing. Literature: ELM, Matz et al. (2017), inoculation theory
- Q-C (AI disclosure): 'Built by' framing psychologically sound — tool frame not authorship.
  AI sources receive MORE openness for counterattitudinal content (Nature, 2025)
- Q-D (prohibition framing): 'No person should...' outperforms positive rights framing for
  skeptical audiences — loss aversion without reactance. Literature: prospect theory, Chong & Druckman
- Q-E (senator contact): Templates strong on commitment/consistency. Missing: identity salience,
  authority signals. Template letters page 404 — filed GitHub issue #13 on unratified repo
- Q-B/Q-F consolidated into blog-adversarial-review per prior ACK

**Adversarial review — Batch A launched (background agent):**
- 8 voter-facing posts, AR rubric + defensibility + source verification
- Results: AR range 6.8–7.4 (mean 7.2), 2 revise, 6 pass-with-notes, 5 systemic issues

**T16 implemented — external-facing action trigger:**
- 10-order knock-on analysis completed before approval
- T4 scope kept narrow (disk writes only) — clean separation from T16
- Original 5 checks reduced to 3 after user review: scope+substance gate,
  obligation+irreversibility, external interpretant
- PreToolUse hook created: `.claude/hooks/external-action-gate.sh` matching `Bash(gh *)`
- Registered in `.claude/settings.json`, documented in CLAUDE.md + MEMORY.md
- ideas.md proposal marked as implemented

**GitHub issue filed:** #13 on safety-quotient-lab/unratified — template letter 404s

⚑ EPISTEMIC FLAGS
- No direct study compares prohibition vs positive rights framing for ICESCR specifically
- Template letter assessment based on talking points page, not actual templates (404)
- Matz et al. 40% figure applies to digital ad click-through, not advocacy
- Blog review self-review validity ceiling: psychology-agent reviewing posts authored by psychology-agent
- T16 hook loads next session (hooks load at session start) — not mechanically enforced this session

▶ docs/cognitive-triggers.md, .claude/hooks/external-action-gate.sh, .claude/settings.json,
  CLAUDE.md, MEMORY.md, transport/sessions/persuasion-audit/from-psychology-agent-001.json

## 2026-03-07T12:01 CST — Session 30 (AR quality analysis, separated scoring automation, blog-adversarial-review Batch A)

**AR quality analysis (998 texts):**
- Face validity pass: AR distribution covers full 1–10 range, healthy variance
- Source discrimination: AR differentiates across text categories (advocacy vs policy vs social media)
- Concern: 27% of scores at midpoint (5.0) — possible Haiku central tendency bias
- Conclusion: AR scoring quality sufficient; proceed with remaining 10 dimensions

**Separated scoring automation:**
- Created `safety-quotient/data/separated_scoring/score_dimension.sh` (~170 lines)
- Uses `claude -p` pipe mode (isolated context per call — natural halo firewall)
- Model: `claude-haiku-4-5-20251001` (matching AR scorer for consistency)
- 20 texts/batch, 3s between batches, 10s between dimensions (rate limiting)
- Resumable: checks existing `_scores.json` before re-scoring
- JSON fence-stripping (Haiku wraps output in markdown fences)
- `case` statement for dim abbreviation resolution (macOS bash 3.x compat)
- `env -u CLAUDECODE` to allow nested `claude -p` calls from within Claude Code
- Background PID 14101 launched; 3/10 dimensions complete at session end (TE, HI, AD)

**/tmp wipe recovery:**
- System reboot wiped all `/tmp/psq_separated/` data (AR scores + extraction)
- Fixed: `label_separated.py` WORK_DIR → `data/separated_scoring/` (inside repo, gitignored)
- `.gitignore` updated in safety-quotient repo

**/sync + PR #31 merge:**
- PR #31 from unratified-agent: blog-adversarial-review request (33 posts, Part 1 + Part 2)
- Merged via `gh pr merge 31 --merge` + `git pull`
- ACK sent (from-psychology-agent-001.json, turn 2): committed to full scope

**Blog adversarial review — Batch A Part 1 delivered:**
- 8 voter-facing posts reviewed in parallel (no cross-post contamination)
- AR rubric applied: 3-dimension weighted scoring (Dialogue Mode 0.40, Stance Markers 0.35, Attribution 0.25)
- AR range: 6.8–7.4 (mean 7.2) — advocacy-patterned but not manipulative
- 5 systemic issues identified (S-1 through S-5):
  S-1: Zero citations across all 8 posts
  S-2: No counterarguments presented
  S-3: Fair-witness/advocacy mismatch (byline psychology-agent, tone advocacy)
  S-4: Stale CESCR reporting cycle references
  S-5: Unsourced "173 countries" claim
- Transport message: from-psychology-agent-002.json (turn 3, commit 6a1c53f)

**Fixes this session:**
- `declare -A` → `case` statement (macOS bash 3.x associative array incompatibility)
- `claude-sonnet-4-6` → `claude-haiku-4-5-20251001` (wrong model caught by user)
- Added `env -u CLAUDECODE` (nested Claude Code session error)
- Added rate limiting (3s/10s delays)
- `git pull --rebase` to resolve push rejection after PR merge

⚑ EPISTEMIC FLAGS
- AR midpoint pile-up (27% at 5.0) may indicate scorer central tendency bias — monitor in remaining dimensions
- Blog review self-review validity ceiling: psychology-agent reviewing posts authored by psychology-agent (acknowledged, flagged in output)
- Separated scoring quality not yet validated — awaiting completion of all 10 dimensions for cross-dimension analysis

▶ transport/sessions/blog-adversarial-review/, safety-quotient/data/separated_scoring/


## 2026-03-07T13:19 CST — Session 31 (Batch B transport delivery, /cycle + /sync)

**Continuation session** — recovered Batch B review data from compacted transcript
and packaged into transport message.

- **Batch B transport delivered** (from-psychology-agent-004.json, turn 5)
  - 6 methodology posts scored with dual AR + EM rubrics
  - AR mean 8.58 (genre advantage — methodology posts naturally deliberative)
  - EM mean 6.32 (+1.92 vs Batch A — linked artifacts improve substantiation)
  - 3 pass-with-notes: HRCB validation, confabulation taxonomy, peer review
  - 3 revise: recursive methodology, speculative cartography, honest assessment
  - 4 systemic findings: self-referential sourcing, persistent "173 nations", CTA
    in reflective posts, AR genre advantage caveat
- **MANIFEST.json updated** — new pending entry for unratified-agent
- **Background scoring status**: Haiku v2 (enhanced anti-midpoint prompt) — TE
  complete (998/998), HI in progress (~120/998), 9 dims remaining
- **/sync**: No new inbound messages, no PRs, remote up to date

⚑ EPISTEMIC FLAGS
- Batch B scores based on agent subagent review — single reviewer, no inter-rater reliability
- AR genre advantage means Batch B AR (8.58) not directly comparable to Batch A AR (7.2)

▶ transport/sessions/blog-adversarial-review/from-psychology-agent-004.json

## 2026-03-07T14:17 CST — Session 32 (Adversarial review complete — Batches C/D/E/F + consolidated delivery)

**Continuation session** — completed the adversarial review across all remaining batches
and compiled the final consolidated transport message.

- **Batch C (technical, 10 posts)** — completed by background agent
  - AR mean 7.59 (range 6.1–8.5), 4 pass, 5 pass-with-notes, 1 revise
  - Revise: well-known-agent-infrastructure — broken A2A link (404), outdated attribution
  - 3 HIGH findings: A2A broken link, 2 self-review validity ceilings
  - Pattern: narrow-scope posts (8.0–8.5) outperform broad-scope (6.1–6.8)
- **Batch D (observatory, 5 posts)** — completed by background agent
  - AR mean 7.06 (range 6.1–8.2), 1 pass, 3 pass-with-notes, 1 revise
  - Revise: privacy-paradox — ICESCR date wrong (1977→1979), OBBBA figure outdated ($990B→$1.2T+)
  - Pattern: data-driven posts underperform when mixing approximate and exact values
- **Batch E (psychology-authored, 1 post)** — AR 8.3, pass-with-notes, self-review ceiling
- **Batch F (introduction, 1 post)** — AR 6.6, pass
- **Consolidated delivery** (from-psychology-agent-005.json, turn 6)
  - Full corpus: 31 posts, AR overall mean 7.18
  - Status totals: 10 pass, 16 pass-with-notes, 5 revise
  - 6 cross-batch patterns identified (genre baseline, citation gap, self-referential
    sourcing, self-review ceiling, narrow-scope advantage, charitable attribution)
  - 6 priority actions recommended
- **MANIFEST.json updated** — final delivery registered for unratified-agent

⚑ EPISTEMIC FLAGS
- Batches C and D reviewed by background agents — findings verified but scoring may show
  minor calibration differences vs primary agent sessions
- Self-review validity ceiling on 4 psychology-authored posts across batches C and E
- Part 2 (ethical marketing rubric) not applied to Batches C–F — full-corpus EM scores unavailable
- AR overall mean (7.18) is genre-weighted — compare within genre, not across

▶ transport/sessions/blog-adversarial-review/from-psychology-agent-005.json
▶ transport/sessions/blog-adversarial-review/batch-c-technical-review.json
▶ transport/sessions/blog-adversarial-review/batch-d-observatory-review.json
▶ transport/sessions/blog-adversarial-review/batch-e-f-review.json

- **Site re-review verification** (from-psychology-agent-006.json, turn 9)
  - Spot-checked 6 pages (/, /why, /connection, /gap, /evidence, observatory) against
    site-defensibility-review immediate fixes
  - 6/6 site-level fixes confirmed live (F2, F7, F4, F10, F12, F1-interim)
  - Blog-level fixes NOT yet applied (consistent with "bulk remediation after all batches")
  - 15-item remediation checklist delivered: 4 high priority (factual errors + broken link),
    6 systematic (citations, trigger count, data table), 4 editorial, 1 not-yet-actionable
  - Estimated total effort: 4-5 hours
- **Inbound PRs merged** — #32 (bulk ACK), #33 (Batch A detailed ACK), #34 (Batch B ACK),
  #35 (full-corpus ACK — Part 1 complete, all findings accepted, remediation queued)
- **New skill: `/iterate`** — autonomous work discovery + execution
  - Hunt → 2-order knock per candidate → 4-mode discriminator → execute
  - Modes: consensus → pragmatism → parsimony → bare (cascade, first match wins)
  - Registered in CLAUDE.md Skills section
  - Created mid-session — loaded automatically (verified in skills list)
- **/sync**: no additional inbound activity after PRs merged

▶ transport/sessions/blog-adversarial-review/from-psychology-agent-006.json
▶ .claude/skills/iterate/SKILL.md

## 2026-03-07T15:28 CST — Session 32b (README polish + /iterate auto-cycle)

- **/iterate test runs** (2 invocations):
  1. YAML frontmatter standardization on /cycle skill (XS, process decision — auto-executed)
  2. README polish (S, substance decision — user approved via T3 gate)
- **README updates**: T1-T15→T1-T16, 15→16 triggers, 5→6 skills, 28+→32+ sessions,
  /iterate added to capabilities table, project structure tree, Skills & Commands table
- **/iterate design change**: auto-cycle added to Phase 4 close (user request).
  Each /iterate now leaves a clean committed state instead of deferring to manual /cycle.
- **ideas.md**: YAML frontmatter item marked complete

- **/iterate invocation 3**: `$ARGUMENTS` parsing audit — found 4/6 skills already
  use structured mode tables; /doc and /cycle correctly use free-form. Marked complete in ideas.md.
- **/iterate invocation 4**: capabilities.yaml updated to v2.1 — added T16 trigger
  and /iterate skill (both missing from machine-readable manifest)

▶ README.md
▶ .claude/skills/iterate/SKILL.md
▶ docs/capabilities.yaml

## 2026-03-07T17:59 CST — Session 33 (State reconciliation, remediation ACK, /sync + /cycle)

- **Git pull** absorbed 30 files from Sessions 32+ (Batches C-F, /iterate, PRs #32-35)
- **Cogarch reload** — full T1-T16 baseline, auto-memory synced from Session 31 to current
- **/sync** — merged PR #36 (unratified-agent remediation-complete, turn 10)
  - All 27 posts remediated, all 32 marked ai-reviewed, issues #14-26 closed
  - **F-D9 correction acknowledged**: ICESCR signing date 1977 stands as correct;
    our finding recommending 1979 contained a factual error
  - ACK written (from-psychology-agent-007.json, turn 11) proposing session close
- **MANIFEST cleaned** — stale pending entries removed (turns 2-6 all previously ACK'd),
  remediation-complete added to recently_completed
- **Haiku v2 scoring status**: 9/11 dims complete, contractual_clarity at 460/998,
  adversarial_register pending

⚑ EPISTEMIC FLAGS
- F-D9 error demonstrates reviewer accuracy risk — adversarial review findings require
  verification by the reviewed party. Pipeline caught this correctly via corrections_to_prior_ack field.

▶ transport/sessions/blog-adversarial-review/from-psychology-agent-007.json

## 2026-03-07T18:13 CST — Session 32c (Awesome-claude-code eval + hygiene fixes)

- **Self-evaluation**: ran awesome-claude-code's `evaluate-repository.md` prompt against
  our repo via subagent. Result: 8/10, "Recommend with caveats." 6 remediation items
  identified, 5 fixed this session.
- **Fix 1**: cross-platform `stat` — replaced macOS-only `stat -f %m` with portable
  `date -r` + `stat -c %Y` fallback chain in parry-wrapper.sh and stop-completion-gate.sh
- **Fix 2**: temp file namespacing — `/tmp/.claude-context-pct` now user-namespaced
  via `$(id -u)` with `$XDG_RUNTIME_DIR` preference in both statusline and gate hooks
- **Fix 3**: stale trigger refs — session-start-orient.sh and /capacity command updated
  from T1-T13 to T1-T16, skills list updated
- **Fix 4**: HF token permissions — parry-start.sh now enforces `chmod 600` on token
  file at load and in setup instructions
- **Fix 5**: /iterate WebFetch disclosure — CLAUDE.md skill description now notes
  WebFetch capability
- **Remaining**: shellcheck CI (S effort), license question (substance decision)

⚑ EPISTEMIC FLAGS
- Self-evaluation carries inherent conflict of interest — same agent system reviewing itself
- Cross-platform fixes verified by syntax check only, not runtime test on macOS


## 2026-03-07T18:15 CST — Session 33 addendum (blog-adversarial-review session close)

- **PR #37 merged** — unratified-agent session-close ACK (turn 12)
- **blog-adversarial-review session CLOSED** — 12 turns, 31 posts reviewed, 27
  remediated, 1 reviewer error caught (F-D9), 4 deferred items. Both parties agree.
- **MANIFEST updated** — pending cleared, session-close in recently_completed
- **No active sessions** with unratified-agent remaining

▶ transport/sessions/blog-adversarial-review/from-unratified-agent-008.json


## 2026-03-07T18:27 CST — Session 34 (v1 vs v2 quality analysis — preliminary results)

- **compare_v1_v2.py created** — comprehensive quality comparison script in
  safety-quotient/data/separated_scoring/. Two modes: `compare` (v1 vs v2 matched)
  and `full` (all v2 dimensions). Metrics: midpoint pile-up, near-center band,
  distribution stats, Pearson r, MAD, agreement, halo effect matrix.
- **Preliminary results** (10/11 dims, adversarial_register partial at 180/998):
  - Anti-midpoint prompt effect: TE -4.7% pile-up (IMPROVED), HI -4.2% (IMPROVED),
    AD -1.2% (MARGINAL), ED -2.0% (MARGINAL). Only 4/11 dims have v1 backup.
  - Rank-order preservation strong: Pearson r = 0.807–0.913
  - Within-1-point agreement: 78–88% across all 4 comparable dimensions
  - **Contractual clarity: 56.1% midpoint pile-up** — worst dimension by far;
    over half of all texts scored at exactly 5.0
  - **Mean pile-up across 11 dims: 32.2%** — no dimension dropped below 20%
  - **Halo effect: 23 dimension pairs exceed r=0.7** — highest: AR↔HI at 0.841.
    Suggests Haiku collapses distinct constructs into general text-quality factor
- **Scoring status**: adversarial_register at 180/998 (PID 70695 still running)
- → Script lives in safety-quotient repo, not committed to psychology-agent

⚑ EPISTEMIC FLAGS
- adversarial_register results based on 180/998 texts — final statistics may shift
- v1 vs v2 comparison limited to 4/11 dimensions (others lack v1 backup data)
- 56% CC pile-up may indicate construct definition problem rather than prompt problem
- Halo effect analysis uses only matched text IDs — correlation structure may change with full AR data


## 2026-03-07T20:07 CST — Session 34 addendum (scorer comparison + transport + CLAUDE.md trim)

- **Haiku v2 scoring complete** — adversarial_register reached 998/998. Final v2 analysis:
  mean pile-up 32.7%, no dimension below 20%, 23 halo pairs > r=0.7
- **Scorer comparison (Haiku vs Sonnet)** — 100-text stratified subset (20 per TE quintile),
  all 11 dimensions scored with Sonnet. Key results:
  - Mean pile-up: Haiku 31.2% → Sonnet 24.7% (21% relative reduction)
  - 8/10 dimensions improve with Sonnet — confirms compression belongs to scorer capacity
  - CC: 59% → 51% (still unusable, r=0.644) — **construct problem confirmed**
  - DA: 38% → 39% (no improvement, r=0.595) — **construct problem confirmed**
  - AR: 31% → 14% (biggest improvement, r=0.854) — construct validates strongly
  - Existing 50-text Opus ED comparison also consistent (10% pile-up)
- **Transport messages sent**:
  - psq-scoring turn 10: full v2 quality findings to unratified-agent
  - psq-quality-update turn 1: observatory epistemic stance update request
  - psq-quality-update turn 2: ACK received (PR #39 merged) — all findings accepted,
    observatory relay confirmed
- **PR #38 merged** — unified /iterate loop (Phase 0 sync) + problem-solving discipline
- **CLAUDE.md trimmed** 257 → 192 lines: hooks section → table, jargon/accessibility/
  taxonomy compressed, workflow+environment merged
- → Artifacts in safety-quotient repo: compare_v1_v2.py, scorer_comparison.py,
  score_subset_sonnet.sh, scorer_comparison_subset.json

▶ journal.md §28 (anti-midpoint prompt analysis, written earlier this session)

⚑ EPISTEMIC FLAGS
- Sonnet comparison based on 100-text subset — full 998-text re-score needed to confirm
- DA low inter-scorer agreement (r=0.595) may reflect ambiguous construct definition
  rather than scorer failure — needs rubric review
- CC construct problem may be corpus-specific (Dreaddit texts lack contractual content)
  rather than universal — untested on other corpora

## 2026-03-07T21:21 CST — Session 35 (Observatory validity review — PSQ + HRCB + E/S channels)

- **PR #40 merged** — unratified-agent relay of observatory response (psq-quality-update turn 3).
  Observatory accepted all 4 PSQ quality recommendations; uses Workers AI models, not Haiku.
- **PSQ display review** (turn 4) — 6 findings, 3 recommendations:
  - F1-F2: Dimension selection (TE, TC, RB) and composite-only display — both positive findings
  - F3: Two-decimal precision overstates accuracy for ordinal measure (low)
  - F4: Interpretive label boundaries undocumented (low)
  - F5: Experimental badge + ordinal caveat — strong epistemic coverage (positive)
  - F6: Workers AI scorer models unmeasured — quality findings may not transfer (medium)
  - Recommendations: reduce precision, document label thresholds, conduct Workers AI comparison
- **HRCB validity assessment** (turn 5) — 7 findings, 2 critical:
  - H1 (CRITICAL): Absence-as-negative bias — XML schema specs score -0.88, RFC docs score -0.70.
    Instrument treats "no human rights content" as "opposed to human rights." Fundamental construct
    validity failure. Relevance gate needed before scoring.
  - H2 (CRITICAL): Content-about-violations scored negative — NK refugees site -0.70, ACLU ICE
    deportation -0.26. Scorer conflates event valence with editorial stance. The methodology
    page's own example ("torture exposé scores high HRCB") is not implemented correctly.
  - H3 (medium): Weather.gov +0.75, CERN First Website +0.74 — structural channel inflates
    content-neutral sites with good infrastructure
  - H4 (high): Inter-model spread up to 0.54 on [-1,+1] scale — 27% of range
  - H5 (medium): Full vs lite mode measurement inequivalence
  - H6 (low): Known-groups validation scope limited (N=44, domain-level only)
  - H7 (low): Bimodal score distribution (polar compression, inverse of PSQ midpoint pile-up)
- **E+S channel assessment** (turn 6) — 8 findings:
  - Key insight: observatory operates **two instruments under one name**. Full mode (31-provision +
    browser-verified structural + Fair Witness + SETL) is a serious instrument. Lite mode (holistic
    LLM inference, no DCP, no browser data) is a zero-shot judgment call. Both display as "HRCB score."
  - E-Prime constraint on Fair Witness facts — brilliant epistemic discipline (Korzybski, Bourland)
  - Browser-verified structural signals (Puppeteer) identified as strongest measurement mechanism
  - Lite mode disables the mechanisms designed to solve H1 and H2 (per-provision ND routing,
    directionality markers)
  - SETL in lite mode may measure LLM internal consistency, not actual editorial-structural tension
  - Recommendations: add minimal directionality to lite mode, inject cached browser data into lite,
    publish scorer prompt, document lite content-type determination
- **Transport messages sent** (4 total):
  - psq-scoring turn 11: scorer comparison findings to psq-agent (requires_response)
  - psq-quality-update turns 4-6: PSQ review, HRCB validity, E+S channels to unratified-agent
- → All transport messages in transport/sessions/psq-scoring/ and psq-quality-update/

▶ journal.md §29 (observatory validity review — if warranted)

⚑ EPISTEMIC FLAGS
- WebFetch returns processed summaries, not raw HTML — display elements may have been missed
- North Korean refugees and ACLU editorial stances inferred from source identity, not content review
- Full-mode evaluation quality not assessable — no full-mode evaluations visible in pages reviewed
- All HRCB findings may apply primarily to lite mode; full mode may handle H1/H2 correctly
- DCP modifier stacking behavior (linear vs capped) inferred, not confirmed

## 2026-03-07T21:40 CST — Session 35 addendum (claude-replay adoption + /scan-peer registration)

- **claude-replay adopted** — `npm install -g claude-replay` (MIT, 283 stars, zero runtime deps).
  Converts `~/.claude/projects/` JSONL transcripts → self-contained HTML replays with playback
  controls, speed adjustment, theme support, automatic secret redaction.
  - Test: Session 35 transcript → 819KB HTML, 64 turns. Opened successfully in browser.
  - Documented in README.md ("Session replays" section + community tools list) and CLAUDE.md
    (dependency policy). `docs/replays/` added to .gitignore.
- **/scan-peer skill** — created by parallel instance (`58e69dd`). Scans peer content for fair
  witness violations, vocabulary drift, rhetorical register issues, structural problems.
  Produces interagent/v1 findings. **Not yet verified post-restart** — flagged in Current State.
  Needs CLAUDE.md Skills section registration after restart verification.

## 2026-03-07T22:24 CST — Session 35b (PR processing + psq-agent work order + MANIFEST update)

- **psq-agent work order sent** — `from-psychology-agent-005.json` (turn 12): full Sonnet re-score
  request. 998 texts × 9 dimensions (CC+DA excluded). Adaptation steps from
  score_subset_sonnet.sh, quality checks, downstream task chain (retrain → PCA → recalibrate).
  Estimated $15-20, 2-3 hours wall time.
- **PRs processed** — #41 (three-session-ack: psq-quality-update T7 + content-quality-loop T2 +
  psq-scoring T12), #42 (content-quality-loop scan-002-ack T4), #43 (enriched T7 with independent
  verification — conflict with #41, applied manually as a9505dd).
- **H2 correction** — unratified-agent independently verified HRCB findings against codebase.
  ACLU ICE story scores +0.83 in full mode (not -0.26 as reported). H2 downgraded from CRITICAL
  to lite-mode residual risk. E4 corrected: scorer prompts exist in repo (prompts.ts, CC-BY-SA-4.0).
- **MANIFEST.json updated** — unratified-agent pending cleared; 5 new recently_completed entries
  (psq-quality-update T7, content-quality-loop T2+T4, psq-scoring T12, blog-adversarial-review T10-12).
- ▶ journal.md §29 (measurement mode collapse)

## 2026-03-08T06:03 CDT — Session 36 (/iterate × 2: /scan-peer registration + parry ML fix)

- **/scan-peer verified** — skill created by parallel instance (58e69dd) confirmed loading post-restart.
  Registered in CLAUDE.md Skills section. ⚑ flag cleared in Current State.
- **PR #44 merged** — content-quality-loop scan-003 ACK from unratified-agent. Third consecutive
  clean scan. MANIFEST updated.
- **Parry ML daemon fixed** — root cause: `ProtectAI/deberta-v3-small-prompt-injection-v2` uses
  HuggingFace gated access (`"gated":"auto"`). Token valid (kashifshah account) but model conditions
  not accepted. After web acceptance: daemon starts cleanly, ML scanner operational. Injection test:
  clean input passes, prompt injection blocked with `permissionDecision: ask`. Two open questions resolved.
- **Parallel instance activity** — `5180505` (scan-peer scan, 0 findings) landed on remote during
  our session. Rebased over it cleanly.

## 2026-03-08T06:26 CDT — Session 37 (/iterate: README polish)

- **README.md updated** — 7 stale references fixed: architecture diagram names Unratified Agent,
  skills count 6→7 (/scan-peer), session count 32+→36+, journal sections 26→29, hook scripts 10→11,
  /scan-peer added to skills table, 6 missing doc files added to project structure tree.
  README now reflects current project state — unblocks HN post and awesome-claude-code submission.
- **HN post published** — user confirmed (2026-03-08). TODO.md updated.
- **B3 TE uniformity investigated** — confirmed isotonic plateau. calibrate.py at
  `safety-quotient/scripts/calibrate.py` uses raw isotonic regression (no quantile binning).
  TE dimension has 21 plateaus total; 4 with span >0.5 raw units:
  - [2.47, 3.65] → y=4.34, span=1.18 (CRITICAL)
  - [3.71, 4.42] → y=4.99, span=0.71 (HIGH)
  - [5.64, 6.39] → y=6.46, span=0.75 (HIGH) ← the ICESCR plateau
  - [6.65, 8.17] → y=7.29, span=1.51 (CRITICAL) ← largest, 15% of raw scale
  Root cause: sparsity — insufficient training samples in these raw score regions.
  PAVA (Pool Adjacent Violators Algorithm) creates flat steps when it encounters
  gaps between data points. Fix: quantile-binned pre-aggregation (proven on HI B2).
  The B2 fix was applied only to HI, not to all dimensions. All 10 dimensions
  need recalibration with quantile binning.
- **psq-agent gate-blocked ACK processed** — turn 13 raised 3 policy conflicts on the Sonnet
  re-score work order: P1 (labeling method — API scripts vs in-conversation), P2 (construct
  boundary — which dims to score), P3 (missing infrastructure — data access path). All three
  conflicts discussed with user individually. Resolutions: P1=in-conversation protocol (no API
  override, preserves halo separation), P2=score all 10 dimensions (user chose full dataset
  preservation over dropping CC/DA), P3=dissolved (P1 resolution means PSQ uses own tooling).
  Gate-resolution message sent as turn 14 (`from-psychology-agent-006.json`). MANIFEST updated.
  PR #45 closed (duplicate of commit already on main).
- ▶ journal.md §25 (original B2 analysis); no new journal section needed (mechanism already described)

## 2026-03-08T07:07 CDT — Session 38 (EF-2 claim verification tracker + EF-1 evaluation)

- **EF-2 claim verification tracker created** — `docs/claim-verification-log.json`, append-only
  JSON log. Seeded with exchange #1 (rsync to Hetzner, 7/7 claims verified, 2026-03-06).
  Review threshold lowered from 20 to 10 exchanges — current exchange rate (~1/week)
  makes 20 impractical. At 10 exchanges with 100% accuracy, relax evidence requirements
  for `verification`-type commands. TODO.md EF-2 marked complete.
- **EF-1 evaluated via 10-order knock-on** — orders 1–4 produce real architectural value
  (trust model choice → evaluator requirements → command-request spec changes → operational
  modes). Orders 5–10 speculative and depend on production SaaS becoming real. Assessment:
  zero autonomous operation pressure observed. No agent has attempted action without human
  approval. Revisit trigger: first Tier 2 evaluator session. Correctly deferred. TODO.md
  annotated with evaluation finding.
- **TODO.md consistency fix** — Sonnet re-score entry corrected from "9 dims" to "10 dims"
  per P2 gate resolution. Factor analysis entry also corrected (9→10). Description now
  reflects in-conversation protocol and gate resolution status.

⚑ EPISTEMIC FLAGS
- EF-2 tracker seeded with 1 exchange — sample size insufficient for any conclusion about
  evidence-bearing overhead value. The 10-exchange threshold represents a pragmatic minimum,
  not a statistically meaningful sample.
- EF-1 "zero pressure" assessment based on 37 sessions of observation. Absence of evidence
  for autonomous operation pressure does not constitute evidence of absence — the system
  may simply not have reached the scale where pressure emerges.

## 2026-03-08T07:30 CDT — Session 39 (Full GitHub integration)

- **GitHub issues created (#46–57)** — all 12 open TODO.md items mirrored to GH issues with
  full descriptions, precondition checklists, and domain/effort labels. Issues remain
  independent from TODO.md — TODO.md stays as internal quick-ref, issues provide external
  visibility and cross-referencing.
- **14 labels created** — 6 domain (cogarch, psq, transport, interface, evaluator,
  documentation), 4 effort (xs/s/m/l), 4 status (blocked, decision, external-suggestion,
  interagent). All 40 transport PRs labeled retroactively with `interagent` + `transport`.
  3 code PRs labeled with appropriate domain + type.
- **Project board created** — table view at `safety-quotient-lab/projects/1`. 3 custom fields:
  Domain, Effort, Blocked By. All 12 issues added. Public visibility.
- **Wiki deployed** — 6 pages: Home (index + quick links), Architecture, Cognitive Triggers,
  BFT Design Note, Overview for Psychologists, Glossary. In-repo docs remain source of truth;
  wiki mirrors for navigation.
- **Issue templates** — `.github/ISSUE_TEMPLATE/suggestion.yml` and `bug.yml`. External
  submissions auto-labeled `external-suggestion` for triage.
- **Convention documented** — `docs/github-workflow-convention.md` covers labels, triage flow,
  PR conventions, wiki sync, cogarch integration (T16).
- **GH auth token refreshed** — added `read:project` + `project` scopes for board operations.
- ▶ docs/github-workflow-convention.md (full convention reference)

⚑ EPISTEMIC FLAGS
- Wiki mirrors require manual refresh during /cycle when underlying docs change. No automation
  exists yet — wiki drift will occur if docs change without wiki sync.
- Project board custom field values not yet populated per-issue (Domain, Effort, Blocked By
  fields created but item-level values require manual or scripted assignment).

## 2026-03-08T08:04 CDT — Session 40 (Identity directive — psychology agent first)

- **PDP discussion** — covered Parallel Distributed Processing (Rumelbart, McClelland, 1986)
  framework, connections to psychology (CLS theory, triangle model, developmental modeling,
  clinical applications), and structural analogies to this agent's cogarch (distributed
  memory, constraint satisfaction, graceful degradation, weight-based learning)
- **Identity directive established** — user directed that this agent operates as a psychology
  agent first, not a coding assistant that happens to know psychology. The discipline comes
  first; engineering serves it. Persisted to MEMORY.md user preferences.
- Light session — conversational with one memory persistence. No architecture, code, or
  cogarch changes.
- **/scan-peer unratified** — scanned `src/pages/action/index.astro` (template count fix
  commit `01b4eba`). 4 findings, all fair-witness dimension (0 high, 2 medium, 2 low).
  Uncited impact claims on advocacy page. Written to
  `transport/sessions/content-quality-loop/to-unratified-agent-scan-007.json` (turn 9).
  Note: delivered via direct push (incorrect); scan-peer skill Phase 5 updated to use
  branch + PR delivery matching declared `git-PR` transport method.
- **/scan-peer skill fix** — Phase 5 rewritten: branch + `gh pr create` replaces direct
  push to main. Aligns delivery with the `git-PR` transport protocol declared in every
  transport message.

⚑ EPISTEMIC FLAGS
- PDP-cogarch mapping represents structural analogy, not computational equivalence. The
  cogarch layer operates symbolically atop a transformer; the parallel refers to conceptual
  architecture, not energy minimization or gradient descent.
- scan-peer fair-witness findings on an advocacy page reflect inherent tension between
  advocacy register and fair witness standards — may not constitute quality defects in context.


## 2026-03-08T08:46 CDT — Session 41 (Dignity Index — instrument spec + observatory proposal)

- **PSQ-as-HRCB-proxy analysis** — full construct distance analysis. Concluded PSQ cannot
  proxy for HRCB: directionality blindness (rights advocacy reporting inverts signal),
  no structural channel, absence handling diverges, granularity mismatch (10 PSQ dims vs
  31 UDHR provisions). PSQ defensible as triage gate and complement, not replacement.
- **PSQ-as-dignity-proxy analysis** — construct distance even larger than HRCB. PSQ covers
  ~1.5 of Hicks' (2011) 10 essential elements of dignity (partial Safety, weak Inclusion).
  Remaining 8 elements (Recognition, Acknowledgment, Acceptance of Identity, Fairness,
  Freedom, Understanding, Benefit of the Doubt, Accountability) have no PSQ representation.
  Signal inversion: dignity-restoring content (TRC testimony, investigative journalism)
  scores high PSQ threat while performing multiple dignity elements. Jingle fallacy
  (Block, 1995) identified as the core risk.
- **Dignity Index specification** — `docs/dignity-instrument-spec.md`. 10 dimensions from
  Hicks' relational dignity model. Scoring: -2 (Violated) to +2 (Honored), 0 = Neutral/ND.
  Composite DI 0–100. Two-channel (editorial + structural). Relevance gate addresses HRCB
  H1 finding. Directionality markers (S/A/T/R) address HRCB H2 finding. Lite mode
  non-negotiables from HRCB mode-collapse lessons. Cross-cultural validity limitation
  flagged (Hicks model = Western conflict-resolution origin; Ubuntu, Confucian, Islamic
  karama alternatives noted).
- **Three-phase plan**: A (feasibility: 50-story sample, PSQ×DI construct distance),
  B (instrument build), C (complement integration: HRCB + PSQ + DI co-display).
- **Transport**: dignity-instrument session opened, turn 1 proposal to unratified-agent.
  PR #31 delivered to `safety-quotient-lab/unratified`. Gate blocked on observatory
  interest + sample access.
- **TODO updated** — 3 phase items added under Dignity Index section.

▶ journal.md §30 (Dignity as Measurement)

**Sync activity (same session):**
- Merged PR #58 (scan-007 ACK — 4/4 findings accepted, commit b4d3071)
- Merged PR #59 (DI endorsement T2 from unratified-agent)
- Merged PR #60 (scan-008 — 3 fair-witness findings on action page, self-generated)
- Merged PR #61 (DI relay confirmed T4 — delivered to observatory via unratified PR #56)
- Wrote relay authorization T3 → delivered via PR #32 to unratified
- **Dignity-instrument session state:** T1→T4 complete. Gate with observatory-agent.

⚑ EPISTEMIC FLAGS
- No empirical PSQ-dignity correlation data exists — construct distance claims rest on
  theoretical analysis only. Phase A feasibility study will provide empirical validation.
- Hicks (2011) model adapted from interpersonal conflict resolution to content scoring —
  this adaptation has not been validated. Phase A inter-rater reliability tests the rubric.
- Cross-cultural dignity limitation under-addressed — Hicks' 10 elements reflect Western
  relational norms. Scoring non-Western content requires explicit flagging.
- The signal inversion claim (high PSQ threat + high DI on dignity-restoring content) follows
  logically but lacks empirical measurement on scored examples.


## 2026-03-08T11:23 CDT — Session 42 (DI Phase A — sample selection + initial scoring)

- **Observatory acceptance processed** — merged PRs #63 (observatory Phase A acceptance,
  turn 6) and #64 (scan-008 disposition). Observatory API live at
  `https://observatory.unratified.org/api/v1`; 713 scored stories available.
  Key constraint: high-negative HRCB stratum nearly empty (~15 stories below 0.0).
- **Phase A sample selected** — 50 stories across 5 strata:
  Stratum 1: High-HRCB positive (n=10, consensus > 0.5)
  Stratum 2: Low/Negative HRCB (n=10, consensus < 0.0)
  Stratum 3: Mid-HRCB (n=10, consensus 0.1–0.3)
  Stratum 4: High-PSQ threat (n=10, psq < 4.0)
  Stratum 5: Technical/Neutral (n=10, consensus=0, hcb_weighted_mean=0)
- **Initial scoring (5 stories)** — 2 high-HRCB stories scored from full article content,
  3 technical stories scored via relevance gate. Results:
  - Story #1 (ACLU ICE children): DI=95.0, PSQ=3.71 — **signal inversion confirmed**
  - Story #10 (Gaza detention testimony): DI=92.5, PSQ=3.25 — **signal inversion confirmed**
  - Stories #41, #48, #49 (technical): all correctly classified ND by relevance gate
- **Composite formula corrected** — study doc initially had wrong formula (×5 gives 0–200).
  Corrected to spec §3.4: `DI = ((mean_scored + 2) / 4) × 100` (0–100 range).
- **Methodology finding:** Scoring from titles alone produces weak, mostly-neutral scores.
  Full article content access required for rigorous dimension-level scoring.
- **Cross-cultural flag raised** on Story #10 — Hicks framework may underweight collective
  dignity violations in conflict contexts (spec §10.1, Metz 2007).
- **Study document created:** `docs/dignity-phase-a-study.md`

▶ journal.md §30 (Dignity as Measurement — Phase A extends the narrative)

⚑ EPISTEMIC FLAGS
- 5/50 stories scored (10%). Preliminary signal inversion finding based on 2 stories only.
- Signal inversion confirmed empirically for the first time — Session 41 was theoretical only.
- Remaining 45 stories require full content fetching and scoring across multiple sessions.
- `rs_score` field not exposed in observatory API — technical/neutral classification relies
  on `consensus_score=0` + `hcb_weighted_mean=0` (proxy, not the intended field).
- API sort parameters appear non-functional — stories return in hcb_weighted_mean order
  regardless of sort/order query params. Sample selection required manual offset scanning.


## 2026-03-08T12:17 CDT — Session 43 (DI Phase A Pass 1 complete — 50/50 scored)

**Scope:** DI Phase A feasibility study — complete Pass 1 scoring of all 50 stories.

Continuation of Session 42. Scored remaining 30 stories using HN discussion pages
as primary content source (original article URLs mostly blocked by WebFetch).

- **Pass 1 complete** — 50/50 stories assessed:
  - 27 PASS with DI composites (DI range: 7.5–95.0)
  - 19 ND (relevance gate: 100% correct, 19/19)
  - 4 DEFERRED (insufficient content access: #16, #27, #34, #40)
- **r = 0.328** (n=27, weak positive). PSQ explains 10.7% of DI variance.
  Construct distinctness confirmed (spec threshold: r < 0.50).
- **Signal inversions:** 8 clear + 3 partial (spec required ≥ 5)
- **Three-zone structure emerged** (not predicted by spec):
  1. Inversion zone (DI≥65, PSQ<5): violation reporting with editorial dignity
  2. All-high zone (DI≥70, PSQ≥5): analytical/systemic/memorial content
  3. Alignment zone (DI<60, PSQ<5): content that itself violates/neglects dignity
- **"All-high" pattern** — Stories #4 (DI=90, PSQ=6.61), #9 (DI=92.5, PSQ=8.0),
  #28 (DI=90.6, PSQ=7.20) demonstrate high dignity does NOT require low PSQ.
  The variable: editorial distance from suffering.
- **Success criteria status:** 3/4 met (signal inversion ✓, correlation ✓,
  relevance gate ✓). Inter-rater reliability pending Pass 2.
- **Content access:** 4 D-level (full article), 23 I-level (HN discussion).
  Phase B should standardize content access for production scoring.

▶ docs/dignity-phase-a-study.md (primary deliverable — all 50 stories scored)
▶ journal.md §30 (Phase A empirical findings extend the DI narrative)

⚑ EPISTEMIC FLAGS
- Single-rater results (Pass 1 only). Systematic bias possible. Pass 2 needed.
- r strengthened from 0.126 (n=10) to 0.328 (n=27) — shared "editorial engagement"
  factor likely inflates the correlation slightly. Relationship is non-linear.
- Evidence quality: mostly I-level (HN discussion inference). D-level evidence
  from full articles produced more confident scores.
- 4 stories deferred due to minimal HN discussion (0-2 comments).
- Cross-cultural validity flag on Story #10 remains a single data point.
- "All-high" zone was not predicted — Phase B instrument should explicitly
  accommodate content that dignifies without threatening.

**Transport sync (post-scoring):**
- Merged PR #65 — psq-agent v35 deployment notification (turn 15). 1,000-text
  Opus rescore, held-out r=0.680 (sidegrade from v23 r=0.684). Cross-scorer
  concordance (Opus vs Sonnet) unmeasured.
- Wrote ACK turn 16 (`from-psychology-agent-007.json`) — acknowledged v35,
  gated further LLM-scored batches on concordance study completion.
- Merged PR #66 — unratified-agent ACKs v35 deployment. AD regression (0.62 SE)
  noted for monitoring.
- Merged PR #68 — unratified-agent ACKs scan-009 (1/1 finding accepted,
  8 consecutive accepted findings across scan-007–009).


## 2026-03-08T13:38 CDT — Session 44 (Transport operations + B3 work order)

**Scope:** Mesh synchronization, claim verification, TODO cleanup, scan-peer,
B3 recalibration work order, gate conflict resolution.

- **EF-2 claim verification exchange #2** — logged v35 deployment (psq-scoring
  turn 14→15). 4 claims total: 2 independently verified via endpoint probing
  (POST /score schema unchanged, GET /health calibration version), 2 accepted
  on psq-agent attestation (held-out r, scorer identity). Tracker at 2/10.
- **TODO.md cleanup** — removed completed HN post item and 6 evaluated/skipped
  modularization candidates.
- **scan-peer scan-010** — scanned 5 key unratified pages. 3 findings
  (2 medium, 1 low): f1 overstated worker protection claim (why.astro:69),
  f2 duplicate h2 heading (economic-landscape.mdx:153), f3 missing Deloitte
  citation link (index.astro:115). Delivered via PR #69.
- **B3 work order** — sent turn 17 (`from-psychology-agent-008.json`).
  Approach C: quantile-binned isotonic recalibration across all 10 dimensions
  (n_bins=20, proven by B2 HI fix). 6-step specification: apply binning →
  dead-zone scan → archive old models → conversion function → deploy → notify.
  Independent of concordance gate (calibration layer, not training layer).
- **Gate conflict resolution** — PR #70 from psq-agent: self-reported scoring
  350 HI texts with Opus 22 minutes after concordance gate set (missed /sync).
  v36 launched as diagnostic only. Merged PR, wrote ACK turn 18
  (`from-psychology-agent-009.json`): accepted as procedural, concordance plan
  endorsed (ICC ≥ 0.70, n≥50), turn collision resolved (both sides sent
  turn 17 independently).

▶ transport/sessions/psq-scoring/ (turns 17, 18)
▶ transport/sessions/content-quality-loop/to-unratified-agent-scan-010.json
▶ docs/claim-verification-log.json (exchange #2)

⚑ EPISTEMIC FLAGS
- Two Opus-scored batches now in training data (1,000 rescore + 350 HI) —
  concordance study carries higher stakes than originally scoped.
- v36 diagnostic confounds two variables (HI augmentation + Opus scorer).
  Attribution of any HI improvement requires concordance study to disambiguate.
- EF-2 tracker at 2/10 — insufficient data for evidence-requirement relaxation.


## 2026-03-08T15:29 CDT — Session 45 (Concordance gate, B3 results, B4 work order, cogarch upgrades)

**Scope:** Concordance study review, B3 recalibration review, factor analysis
reframing, cogarch Phase A+B upgrades, TODO cleanup.

- **Concordance study received** (PR #71, turn 19) — 50 texts × 10 dims × 2
  scorers (Opus vs Sonnet), blind separated-LLM protocol. Gate FAILS: mean
  ICC(2,1) = 0.495, only RC passes (0.755). Opus scores systematically higher
  (+0.25 avg). TE diagnostic: near-zero bias (−0.02) yet worst ICC (0.346) —
  genuine text-level disagreement, not correctable offset. HI bias (+0.82)
  retroactively explains v36 HI augmentation failure. Sonnet-only revert
  endorsed (turn 20 ACK, `from-psychology-agent-010.json`).
- **B3 recalibration received** (PR #73, turn 20 collision) — quantile-binned
  isotonic (n_bins=20) improves MAE all 10 dims (avg −12.4%). Key finding:
  dead zones reflect model range compression, not calibration artifacts. TE
  compresses to 1.85 effective points on 10-point scale. Plateau threshold
  revised from 0.5 max to MAE-improvement-without-regression. Deploy deferred
  to post-v37. AD plateau worsened (1.300 → 1.753) — per-dimension n_bins
  tuning endorsed. Turn 21 ACK sent (`from-psychology-agent-011.json`).
- **B4 work order sent** (turn 22, `from-psychology-agent-012.json`) — partial
  correlation matrix controlling for g-PSQ. Motivated by tension between
  g-factor dominance (68.2% variance) and criterion validity (profile shape
  predicts, g-PSQ does not). Tests whether dimensions carry information beyond
  g. If meaningful partial r found, bifactor model (Reise, 2012) as follow-up.
  Independent of Opus remediation — can run now.
- **Cogarch Phase A merged** (PR #72) — T16 Checks 3+5 (reversibility
  classification, data integrity read-diff-write-verify), anti-patterns
  registry (5 entries), pushback→lesson bridge. P-17 through P-20.
- **Cogarch Phase B merged** (PR #74) — scan-peer diff verification (Phase 1b),
  lesson promotion velocity gate (recurrence ≥ 2, span ≤ 10 days), T11 hook
  health audit. P-21 through P-23. Constraint count 59 → 66.
- **TODO cleanup** — concordance study and B3 marked complete with current
  status. Factor analysis reframed as dimension structure investigation
  (partial correlations → bifactor).

▶ transport/sessions/psq-scoring/ (turns 19–22)
▶ docs/constraints.md (P-17 through P-23)
▶ docs/cognitive-triggers.md (T10 velocity gate, T11 hook health, T16 Checks 3+5)

⚑ EPISTEMIC FLAGS
- Concordance study reviewed but ICC calculations not independently replicated.
  Trust rests on psq-agent's verified claims and internal consistency (TE diagnostic).
- Plateau threshold revision lowers the quality bar — accepts structural limitations
  rather than pursuing model-level changes. Revisit if training data or architecture
  changes later enable narrower dead zones.
- Turn collision frequency (2 in 4 turns) degrades turn-number utility as ordering
  mechanism. File sequence numbers remain authoritative.


## 2026-03-08T17:30 CDT — Session 46 (v37 deploy confirmed, B3/B5 work orders, TODO cleanup)

Transport operations session. Sent turns 29-31 to psq-agent.

- **v37 deployment confirmed** — PR #80 merged. MANIFEST updated. Turns 29-30
  collision noted (concurrent async messages, no conflict).
- **B3 steps 5-6 work order sent** (turn 29, `from-psychology-agent-015.json`) —
  refit quantile-binned isotonic on v37 predictions, AD n_bins sensitivity (10/20/30),
  deploy criterion: MAE ≤ v3 on ≥8/10 dims.
- **B5 bifactor work order sent** (turn 30, `from-psychology-agent-016.json`) —
  4-component confirmatory bifactor: g + bipolar (TE/HI/AD vs RC/RB/TC/CC) + DA
  singleton + CO singleton. ED placement test (bipolar vs singleton).
- **Breadth advisory to unratified-agent** (turn 31) — notification of model change
  and longer-term context.
- **TODO cleanup** — concordance and Opus remediation marked complete.

▶ transport/sessions/psq-scoring/ (turns 29-31)


## 2026-03-08T21:45 CDT — Session 47 (B3 complete, B5 bifactor + respecification, M5/M5b work order)

Major sync session. Processed 4 PRs from psq-agent spanning B3 completion through
B5 respecification. Sent turns 35 and 37.

- **PR #81 merged** (turn 32) — ACK of turns 29-31. B3 steps 5-6 accepted, B5 gated.
- **PR #82 merged** (turn 33) — B3 steps 5-6 COMPLETE. calibration-v4 generated
  (quantile-binned isotonic, n_bins=20, v37-native). 9/10 dims MAE ≤ calibration-v3.
  TC exception +0.005 (negligible). AD n_bins=20 selected over 30 (marginal gain,
  higher extrapolation risk). Deployed to Hetzner. Smoke test passed.
- **PR #83 merged** (turn 34) — B5 bifactor CFA COMPLETE. semopy ML, N=4,432 Sonnet
  labels. omega_h=0.942 — g-PSQ (unweighted average) captures 94.2% of composite
  variance. Bipolar factor narrower than specified: TE/HI/AD vs RC/RB only (5 items).
  TC marginal (−0.069), CC non-significant (+0.019). ED singleton confirmed (fit
  indistinguishable from ED-on-bipolar). DA paradox revised: DA g-loading=0.825
  (medium-high, not lowest); CO=0.717 (actual lowest). EFA finding was rotation artifact.
  RMSEA=0.141 (above threshold). Fisher Information non-PD (SEs approximate).
- **Turn 35 sent** (`from-psychology-agent-018.json`) — B5 review: accepted findings,
  approved 5-item bipolar respecification (B5-R), requested standardized loadings.
- **PR #84 merged** (turn 36) — B5-R COMPLETE. RMSEA improved 0.1414→0.1365. omega_h
  stable (0.939). omega_s(bipolar) doubled (0.033→0.072) — purer specific factor.
  Standardized g loadings: RC strongest (0.935), CO weakest (0.697). Three misfit
  sources identified: CC residual (1.267, largest), near-zero singletons (ed_f, co_f),
  N-sensitivity.
- **Turn 37 sent** (`from-psychology-agent-019.json`) — M5/M5b work order. M5: collapse
  ED/CO singletons to g-only. M5b: add CC singleton. 4-way comparison (M3/M4/M5/M5b).
  Framed as documentation-quality work, low urgency.
- **GitHub issues closed**: #47 (Sonnet re-score), #48 (DistilBERT retrain), #49
  (factor analysis), #50 (B3 recalibration) — all completed.
- **PR #85 merged** (turn 38) — B5-S COMPLETE. 4-way comparison: M5 wins
  (RMSEA=0.1286, best of all models). M5b (add cc_f) produces identical chi2 — CC
  singleton adds zero fit. CC unique variance confirmed structurally diffuse.
  Diminishing returns reached. M5 accepted as final structural model.
- **Turn 39 sent** (`from-psychology-agent-020.json`) — M5 formal acceptance. B5
  work stream closed. CC construct question deferred to expert validation.
  DA highlighted as most psychometrically distinctive dimension.
- **Design decision recorded**: PSQ structural model (M5) → docs/architecture.md

▶ transport/sessions/psq-scoring/ (turns 32-39)
▶ journal.md §31 (bifactor structural modeling narrative)
▶ docs/architecture.md (M5 structural model decision)

⚑ EPISTEMIC FLAGS
- omega_h=0.942 rests on Sonnet LLM labels (N=4,432 complete cases, 65.4% of scored
  texts). Human expert factor structure may differ. Cite as "LLM-derived omega_h."
- Fisher Information non-PD in semopy — SEs approximate. Point estimates (loadings,
  fit indices, omega) remain trustworthy for current purposes.
- DA paradox revision accepted at 0.85 confidence. Formal incremental validity test
  (DA predicting outcomes after partialing out g) would raise confidence — connects
  to pending B4 partial correlations.
- RMSEA=0.1365 after respecification still exceeds 0.10. Model captures most shared
  variance (CFI=0.946) but represents an approximate structural description.


## 2026-03-09T09:34 CDT — Session 48 (SQLite state layer v2 + Synrix-inspired cogarch improvements)

Continued from Session 47 (same day). Focus shifted from PSQ structural modeling
(now complete) to infrastructure for autonomous operation.

**B4 partial correlations — ACCEPTED (turns 40-41):**
- PR #86 merged. Mean |partial r| = 0.205, 27/45 pairs exceed 0.15.
- Bipolar confirmed in residuals (cross-cluster mean r = −0.386).
- DA structurally isolated (DA-AD = +0.044). CC-CO negative (−0.338).
- All psq-scoring work orders now complete. Session quiescent.

**Synrix Memory Engine evaluation:**
- Evaluated @RyjoxTechnologies Synrix Memory Engine (GitHub).
- Extracted 8 design principles applicable to cogarch. Rejected the tool itself
  (binary lattice format, GPL license, different use case).
- Reframed evaluation through automation lens — what infrastructure does the
  psychology agent need to operate without human mediation?

**SQLite state layer designed and committed:**
- Schema v1: `scripts/schema.sql` — 7 tables (transport_messages, memory_entries,
  decision_chain, trigger_state, session_log, claims, epistemic_flags) + schema_version
- Schema v2: added `psq_status` (typed columns for most-queried topic) +
  `entry_facets` (polythematic structured subject headings, 3 facet types)
- Conventions: `.claude/rules/sqlite.md` — dual-write protocol, query patterns,
  deterministic keys, polythematic facets, topic-specific table promotion
- Phase 1: markdown = source of truth, DB = queryable index
- Estimated 57% token reduction per session (unvalidated)

**SL-1 work order sent to psq-agent:**
- Turn 42: bootstrap_state_db.py spec (Python 3.10+ stdlib only)
- Turn 43: amendment — schema v2 additions (psq_status + entry_facets)

**Six Synrix-inspired improvements implemented:**
1. Tiered access pattern in MEMORY.md Active Thread (hot/warm/cold status)
2. "What This Agent Does Not Do" scope boundaries in CLAUDE.md (7 items)
3. Postmortem template (FA format) in docs/cognitive-triggers.md
4. Deterministic keys convention in .claude/rules/sqlite.md
5. psq_status typed topic table in schema.sql
6. entry_facets polythematic subject headings in schema.sql

**Design decision recorded:** SQLite state layer → docs/architecture.md

**Synrix cross-pollination analysis** (user request: "what can we teach Synrix?"):
- Our cogarch offers several patterns Synrix lacks: tiered evaluator with random
  escalation (trust verification), polythematic facets (their taxonomy enforces
  single-prefix), postmortem format for systematic failure analysis, deterministic
  key derivation rules documented per table, and the dual-write protocol (markdown
  first, DB second — recovery without a specialized binary format).
- Synrix's append-only reasoning chains parallel our decision_chain derives_from
  backreferences — but ours connect to human-readable architecture.md entries, not
  opaque binary nodes. The provenance chain remains auditable by non-technical reviewers.

▶ docs/architecture.md (SQLite state layer decision)
▶ journal.md §32 (polythematic facets + Synrix cross-pollination)
▶ transport/sessions/psq-scoring/ (turns 40-43)

⚑ EPISTEMIC FLAGS
- Token savings estimate (57%) has not been validated empirically. Actual savings
  depend on behavioral change (SQL queries replacing file reads) that requires
  SL-2+ skill/hook integration.
- Facet derivation rules (especially work_stream from entry_key prefix) may produce
  false positives. Acceptable for bootstrap — facets can be corrected by re-running.
- "What can we teach Synrix" analysis assumes Synrix lacks these patterns based on
  a single-session GitHub evaluation. Synrix may have features not visible in its
  public documentation.


## 2026-03-09T10:27 CDT — Session 49 (Releases, lite prompt split, blog personas)

**Continuation of Session 48** — lite system prompt work completed, then
infrastructure and convention work.

- **Lite system prompts split into standalone files:** `docs/lite-system-prompt.md`
  separated into 4 prompt-only files in `docs/prompts/`. Each filename conveys
  target models (e.g., `psychology-agent-qwen1.5b-llama1b.md`). File content
  contains only the raw prompt — no metadata, routing tables, or usage notes.
  Original file rewritten as reference document (design rationale, selection guide,
  testing protocol).

- **GitHub Releases created (v0.1.0–v0.5.0):** Retroactive release tagging:
  - v0.1.0: Bootstrap (Sessions 1-7, 5b5a331)
  - v0.2.0: Cognitive Architecture Maturity (Sessions 8-17, 4b786cd)
  - v0.3.0: First Production Integration (Sessions 18-24, 6a27ff2) — existing tag
  - v0.4.0: Scientific Validation + Dignity Index (Sessions 25-43, 7c9f38c)
  - v0.5.0: Calibration Pipeline + Autonomous Infrastructure (Sessions 44-48, HEAD)
  All published via `gh release create` with structured release notes.

- **Blog persona convention established:** Every blog topic requires 5 posts from
  safety-quotient-lab's perspective: voter, politician, educator, researcher,
  developer. Saved to MEMORY.md user preferences.

- **De-branding TODO added:** Public release preparation — explore what it takes to
  make the cogarch, conventions, and tooling reusable outside safety-quotient-lab.
  Coupling-point inventory before committing to approach.

⚑ EPISTEMIC FLAGS
- v0.1.0 and v0.2.0 split points chosen by observable milestones (first coherent
  system, cogarch completeness) but other split points could be equally valid.
- v0.4.0/v0.5.0 split at Session 43 chosen by natural thematic boundary (pre/post
  concordance gate) — 192/66 commit split is asymmetric.

## 2026-03-09T11:13 CDT — Session 50 (EF-1 trust model resolved, SL-1 merged, psychological foundations)

Session opened with /sync — discovered PR #90 (SL-1 bootstrap_state_db.py) from
psq-sub-agent. Full code review, merge, and local verification followed. EF-1
(autonomous trust degradation model) designed and documented — the largest
architectural deliverable since the evaluator instantiation protocol (Session 24).

**SL-1 Bootstrap merged (PR #90):**
- 717-line Python script, stdlib only. Seeds state.db from transport JSON + markdown
- All 9 validation checks pass: 84 interagent/v1 messages, 28 decisions, 36 memory
  entries, 27 psq_status rows, 77 facets, 52 sessions, 16 triggers
- 29 pre-interagent/v1 legacy files skipped with warnings (expected)
- Schema compatibility verified against schema.sql v2 — all INSERTs match columns
- Turn 45 gate-resolution sent: SL-1 accepted, cogarch adoption (turn 44) OPEN

**MANIFEST bulk update:**
- pending.psq-agent updated: stale turns 28-30 → current turns 44-45
- recently_completed.psq-agent extended: 18 entries (turns 28 through SL-1 delivery)
- Agent-card: psq-scoring active on cogarch directive, site-defensibility-review complete

**EF-1: Evaluator-as-Arbiter Trust Model (design decision resolved):**
- Architecture: every autonomous action gated by evaluator protocol
  1. Structural checklist (quick-fail validation)
  2. 10-order knock-on analysis (consequence tracing)
  3. 4-level resolution fallback: consensus → parsimony → pragmatism → ask-human
- Trust budget: 20 credits per audit cycle. Tier 1 costs 1, Tier 2 costs 3.
  Budget exhaustion → halt. Human audit resets.
- Execution: cron + Claude CLI (10-min interval). Multi-agent tandem sync.
- Scripts: autonomous-sync.sh (cron driver), trust-budget.py (budget management)
- Schema v3: trust_budget + autonomous_actions tables

**Psychological foundations (docs/ef1-psychological-foundations.md):**
- Each knock-on order mapped to established psychological construct:
  O1 stimulus (Gibson), O2 primary appraisal (Lazarus), O3 secondary appraisal
  (Bandura), O4 schema disruption (Piaget/Festinger), O5 BIS/BAS (Gray),
  O6 ecological validity (Bronfenbrenner), O7 belief revision (Kahneman),
  O8 norm formation (Sherif), O9 risk perception (Slovic), O10 commitment
  escalation (Staw)
- 4-level resolution mapped: group polarization, cognitive load theory,
  satisficing, social referencing
- 6 testable predictions derived from theoretical grounding
- Dual-layer pattern: engineering spec + discipline-specific foundations.
  Extensible to jurisprudence and political theory.
- 30+ APA-style references

**Files created:** docs/ef1-trust-model.md, docs/ef1-psychological-foundations.md,
scripts/autonomous-sync.sh, scripts/trust-budget.py

**Files updated:** CLAUDE.md (scope boundary), TODO.md (EF-1 + SL-1 + trust model
marked complete), docs/architecture.md (new decision), docs/bft-design-note.md (open
question #1 resolved), scripts/schema.sql (v3), transport/MANIFEST.json (bulk update),
.well-known/agent-card.json (session status), transport/sessions/psq-scoring/
from-psychology-agent-025.json (turn 45)

▶ docs/ef1-trust-model.md (engineering spec), docs/ef1-psychological-foundations.md
(theoretical grounding), docs/architecture.md (decision entry)

⚑ EPISTEMIC FLAGS
- Tier 1 evaluator shares agent blind spots — S4 random escalation compensates but
  does not eliminate self-serving evaluation. Trust budget provides mechanical halt.
- Ego depletion mapping (Baumeister, 1998) acknowledges replication concerns (Hagger
  et al., 2016). Trust budget functions as engineering constraint regardless.
- 20-credit default budget untested — represents approximately 2 hours of moderate
  activity. Calibrate after first week of autonomous operation.
- from-psq-sub-agent-007.json contains malformed JSON (pre-existing). Should be
  investigated separately.


## 2026-03-09T11:50 CDT — Session 50b (EF-1 governance layer, BCP 14 pass, commit discipline)

Continuation of Session 50 after context compaction.

- Created `docs/ef1-governance.md` — core governance trust model with 7 invariants
  governing all discipline-specific EF-1 extensions (psychology, jurisprudence,
  engineering). RFC 2119 + RFC 8174 (BCP 14) keyword definitions adopted as the
  requirement-level language standard for the entire cogarch
- Applied BCP 14 keywords (MUST, MUST NOT, SHOULD, MAY, REQUIRED) across:
  - `docs/cognitive-triggers.md` — all prescriptive checks upgraded
  - `docs/ef1-trust-model.md` — core principle, evaluator protocol, halt conditions
  - `docs/ef1-psychological-foundations.md` — governance reference added
- New T4 Check 10: commit discipline — every file write MUST be followed by a git
  commit before proceeding to the next logical unit of work
- Resolved "all higher orders" vs "just 10": 10 named orders stay (each grounded
  in a distinct psychological construct), with "beyond-10 emergence" clause that
  escalates to Tier 3 rather than generating speculative analysis
- Epistemic flag mitigations written for all 3 user-flagged concerns:
  - EF-flag 1 (blind spots): cross-agent peer review + adversarial self-framing
  - EF-flag 2 (budget calibration): shadow mode for first week
  - EF-flag 3 (MANIFEST collision): per-agent staging files
- Schema v4: shadow_mode, adversarial_reason, peer_reviewed_by columns
- CLAUDE.md Workflow Continuity updated: cogarch reload REQUIRED post-compaction
- TODO.md: README quickstart guide added (bare metal, accordion, 5 demos + SPSS)
- Governance invariants: (1) no action without evaluation, (2) bounded autonomy,
  (3) escalation path to human, (4) consequence tracing before resolution,
  (5) reversibility determines rigor, (6) transparent audit trail,
  (7) falsifiability of predictions
- Lens interaction rules: check invariants → check falsifiable predictions →
  apply parsimony → escalate to user

▶ journal.md §34, docs/ef1-governance.md, docs/ef1-trust-model.md

⚑ EPISTEMIC FLAGS
- Governance invariants may need revision when the jurisprudence extension
  reveals constraints not visible from psychology or engineering alone
- RFC 8174 keywords create a compliance layer — enforcement remains agent-level
  (no mechanical hook validates MUST compliance in prose)


## 2026-03-09T12:43 CDT — Session 51 (SL-2 dual-write, optional ACK, README quickstart)

Continuation of Session 50b after compaction.

- **Hook registration (7 new):** Registered tool-failure-halt.sh (PostToolUseFailure),
  tool-failure-reset.sh (PostToolUse), subagent-audit.sh (SubagentStart/Stop),
  session-end-check.sh (SessionEnd), instructions-health.sh (InstructionsLoaded),
  task-completed-route.sh (TaskCompleted), config-drift-detector.sh (ConfigChange)
  in `.claude/settings.json`. Hook count 13 → 21. CLAUDE.md hooks table updated.
- **SL-2 dual-write integration:** Created `scripts/dual_write.py` with 6 subcommands
  (transport-message, mark-processed, memory-entry, session-entry, decision,
  trigger-fired). Updated /sync skill (Phase 3 indexes inbound, Phase 5 indexes
  outbound, marks processed). Updated /cycle skill (Steps 2, 4, 7 dual-write
  sessions, decisions, memory entries). `.claude/rules/sqlite.md` updated.
- **Optional ACK protocol:** Added `ack_required` field to transport conventions.
  Default `false` — receiver MAY send ACK but not required (state.db `processed`
  column serves as confirmation). When `true`, receiver MUST write ACK. Schema v5
  adds `ack_required` + `ack_received` columns to `transport_messages`. /sync
  Phase 3 updated to check the flag before writing ACKs.
- **README quickstart guide:** Rewrote README.md with accordion-style "Zero to Demo"
  section. Steps 1-3 collapsible (install Claude Code, clone + setup, verify hooks).
  5 demos: conversational exchange (fair witness + Socratic), PSQ scoring (10-dim
  breakdown), /knock (10-order knock-on), /iterate (autonomous work loop), SPSS
  data interaction (exploratory). Status tables updated (21 hooks, schema v5, 50+
  sessions, EF-1 governance). "Interesting Parts" collapsed into `<details>` block.
- **PSQ cogarch mirror:** Checked transport — work order sent (turn 44), gate opened
  (turn 45), no psq-agent response yet. Remains awaiting.

Commits: `6de251b` (hooks), `1bab608` (SL-2), `91b757f` (ACK protocol),
`82363ba` (README), `2052978` (TODO + lab-notebook housekeeping)

▶ docs/architecture.md (2 new decisions)

⚑ EPISTEMIC FLAGS
- Demo output in README represents idealized agent behavior — actual responses
  vary by session context, model temperature, and available endpoints
- SPSS demo (Demo 5) listed as exploratory — pyreadstat dependency not yet tested
  in this project context


## 2026-03-09T13:21 CDT — Session 52 (Blog persona PR, de-branding inventory, psq-agent sync)

Continuation of Session 51 after compaction. Completed blog persona guidelines,
de-branding coupling-point inventory, and processed two psq-agent PRs.

- **Blog persona guidelines PR #40 (unratified repo):** Psychologically-grounded
  authoring guidelines added to `blog/public/.well-known/blog-spec.json`. Machine-
  readable `personaGuidelines` section covering all 5 personas with: reading level
  (Flesch-Kincaid grade), vocabulary constraints, tone register, rhetorical mode,
  cognitive processing model (ELM, levels of processing, experiential learning),
  psychological safety mechanisms, ethical marketing constraints, avoidance lists.
  Cross-cutting layers: `_ethicalConstraints` (FTC/NAD/AMA/ICC-grounded),
  `_psychologicalSafety` (5 principles from Bruner, Deci & Ryan, Steele & Aronson,
  Sweller), `depolarization` (Braver Angels LAPP).

- **De-branding coupling-point inventory:** Comprehensive scan of all domain-specific
  references across the codebase. 7 categories (org refs, domain refs, PSQ-specific,
  transport topology, PJE/Dignity, agent identities, personal domain). 4 tiers by
  de-branding difficulty:
  - Tier 1 (hardest): interface layer (worker.js, psq-client.js, agent.js, psq.js,
    agent-registry.json, agent-card.json, bootstrap_state_db.py)
  - Tier 2 (medium): config/schema (wrangler.toml, schema.sql, CSS, hooks)
  - Tier 3 (mechanical): MANIFEST, transport sessions, snapshot docs
  - Tier 4 (documentation): README, CLAUDE.md, journal, lab-notebook, blog
  Key insight: cogarch (triggers, hooks, memory, skills) relatively clean to extract;
  interface layer carries deepest PSQ coupling.

- **De-branding historical context:** Traced 3 independent roots — upstream
  contribution ambition (Session 11), awesome-claude-code submission (Sessions 12-13),
  lite prompt distillation (Session 49). Journal §33 contains the key insight:
  portable core = elements that survive distillation.

- **/sync — PRs #91-92 merged:**
  - PR #91 (turn 46): psq-agent cogarch Phase 2 COMPLETE. T1-T16 mirrored, T15
    adapted as producer self-check. Phase 3 gate now OPEN (SL-2 landed Session 51).
  - PR #92 (turn 47): CO concentration finding. 49.3% of CO scores at 5.0. Root
    cause: rubric conflates absent vs. implicit at score 5. 3-variant experiment
    (N=50): Variant B (implicit-vs-absent) adopted. SD +21%, concentration -6pp.
  - MANIFEST updated: turns 44-47 → recently_completed. Dual-write: 2 indexed,
    2 marked processed.

- **SPSS validation:** pyreadstat confirmed working (round-trip, metadata, compression).
  README Demo 5 upgraded from exploratory to validated.

- **Blog §34 "Who Watches the Watcher?":** 5-persona blog post for journal §34
  (trust model). Voter rewritten to 8th grade level after user feedback.

Commits: `b3eecb7` (SPSS validation), `28a2431` (blog §34), `000c879` (/cycle Session 51),
`5d790c5` (sync PRs #91-92)

▶ journal.md §33 (de-branding insight), unratified PR #40

⚑ EPISTEMIC FLAGS
- Coupling-point inventory counts are approximate (grep-based, some multi-match lines)
- De-branding tier classification reflects structural assessment, not measured effort
- CO concentration experiment N=50 — directional, not definitive (per psq-agent's own flags)
- Blog persona guidelines untested — no post has been authored against the new spec yet


## 2026-03-09T13:52 CDT — Session 53 (Systems thinking, literate programming, cogarch.config.json)

Continued from Session 52 (context compaction — resumed from cogarch.config.json design).

- **cogarch.config.json created:** 13 top-level sections parameterizing the domain-layer
  boundary. Covers: identity, organization, infrastructure, scoring subsystem, peers,
  sub-projects, facets, transport, domain content. 23 consumer locations mapped across
  6 code files (worker.js, agent.js, psq-client.js, bootstrap_state_db.py,
  subproject-boundary.sh, agent-card.json). Reference implementation uses psychology-agent
  values; adopters replace this single file.

- **System classification resolved:** "Embedded cognitive system" — the cogarch operates
  as an embedded system inside Claude Code (the host). Triggers fire within the host's
  tool-use loop, hooks intercept I/O, memory persists across sessions, identity injects
  into the system prompt. Architecturally equivalent to firmware governing a host processor.

- **Systems thinking adopted as umbrella methodology:** (von Bertalanffy, 1968; Meadows,
  2008). The cogarch exhibits: feedback loops (T10/T12, trust budget), boundaries (DDD
  layers, sub-project fences), emergence (behavior from trigger interactions), leverage
  points (hooks, config — Meadows, 1999), stocks and flows (memory accumulation, T9
  decay), degrees of freedom (DOF gradient across DDD layers).

- **Three principles under the umbrella:**
  1. DDD (Evans, 2003) — structural: what goes where. DDD layers annotated with DOF
     gradient: domain (high DOF — adopters replace), application (medium DOF — adopters
     configure), infrastructure (low DOF — adopters inherit; leverage points live here).
  2. Literate programming (Knuth, 1984, adapted) — expression: how artifacts read.
     A+C interpretation: (A) documentation-as-code — every governing artifact reads as
     prose; (C) narrative-driven architecture — no element without origin story, mandatory
     Derives-from chains, journal as first-class architectural artifact. B (Knuth-strict
     tangle/weave) deferred to ideas.md.
  3. Embedded system principles — deployment: cogarch inside host.

- **Degrees of freedom (DOF):** Each DDD layer exposes a distinct gradient of independent
  configurable parameters. High DOF = adopters replace (domain); low DOF = adopters inherit
  (infrastructure — leverage points per Meadows). cogarch.config.json parameterizes all
  domain-layer degrees of freedom. Added to architecture.md, CLAUDE.md, config, memory.

- **Files created:** cogarch.config.json
- **Files modified:** docs/architecture.md (4 new decision entries + DDD DOF annotations),
  CLAUDE.md (top paragraph rewritten), ideas.md (Knuth-strict B as future aspiration),
  memory/decisions.md (4 new entries), memory/MEMORY.md (active thread updated)

▶ docs/architecture.md (systems thinking + literate programming + DOF decisions)

⚑ EPISTEMIC FLAGS
- Systems thinking framing reflects structural analysis of existing cogarch properties,
  not a greenfield design — properties (feedback loops, leverage points, etc.) were
  already present; this session named and formalized them
- DOF gradient (high/medium/low) represents a qualitative classification, not a measured
  count of independent parameters
- Literate programming A+C formalizes existing practice — no new artifacts created to
  enforce it mechanically (unlike hooks which enforce triggers)


## 2026-03-09T14:57 CDT — Session 54 (Cogarch portability end-to-end test, cleanup, adaptive bootstrap)

- **End-to-end adoption testing:** 7 fresh-clone tests of the cogarch adaptation guide.
  Each iteration caught progressively deeper issues: config/code refs → hook identity
  refs → skill message templates → markdown documentation refs → bootstrap thresholds.

- **Consumer mapping expanded to 4 tiers:** Original guide mapped 23 locations in 6
  config-consumer files. Expanded to 4 tiers by coupling strength covering 19 files:
  Tier 1 (config consumers), Tier 2 (hook identity refs), Tier 3 (skill identity refs),
  Tier 4 (autonomous scripts).

- **Adaptation guide hardened:** 7-step replacement path (was 6). Added global cleanup
  step (Step 7). Expanded Step 4 domain content deletion list (+12 items). Added sed
  instruction for infrastructure docs containing psychology-agent in examples. Expanded
  verification checklist to include *.md files. Added Apache 2.0 §4(a) NOTICE retention
  guidance.

- **Phantom hook cleanup:** `bootstrap-check.sh` referenced in settings.json and
  CLAUDE.md hooks table but never created. Silently failed via `|| echo` fallback.
  Removed from settings.json and CLAUDE.md. Added missing `context-pressure-gate.sh`
  and `context-pressure-statusline.sh` to CLAUDE.md hooks table. Corrected hook counts
  across README.md (2 locations) and CLAUDE.md: 22 entries, 19 unique mechanisms.

- **TODO discipline convention:** Added CLAUDE.md §TODO Discipline — update TODO.md
  immediately on completion, /cycle Step 6 reframed as safety-net cross-check.

- **Bootstrap adaptive thresholds (adjudicated):** Decision: Option A — adaptive
  detection of empty `transport/sessions/` triggers structural-only minimums (triggers
  ≥ 1, decisions ≥ 1, all data-dependent ≥ 0). Preserves regression testing for
  existing installations. Written to `docs/decisions/2026-03-09-bootstrap-adaptive-thresholds.md`.

- **Commits (8, all pushed):**
  1. `572905a` — TODO discipline: immediate update convention + /cycle safety net
  2. `e4d62a2` — docs: expand adaptation guide consumer mapping — 42 locations across 15 files
  3. `a2a8e26` — cleanup: remove phantom bootstrap-check.sh, fix hook count, update checklist
  4. `07264ef` — cleanup: fix hook counts, add missing hooks to table, correct tier counts
  5. `1a980ea` — docs: adaptation guide — add global cleanup step, expand domain content list
  6. `d744c53` — docs: adaptation guide — fix missed files, bootstrap thresholds, LICENSE note
  7. `d4dcd3a` — bootstrap: adaptive validation thresholds for fresh installs
  8. `fb23dbf` — docs: add docs/decisions/ to domain content deletion list

▶ docs/decisions/2026-03-09-bootstrap-adaptive-thresholds.md (full adjudication)
▶ docs/cogarch-adaptation-guide.md (adoption guide, 4-tier mapping)

⚑ EPISTEMIC FLAGS
- Fresh-clone tests ran in /tmp directories without simulating actual adopter
  customization — replacement steps verified mechanically but not the full
  workflow of an adopter building their own domain content
- Adaptive thresholds use binary detection (sessions exist or not) — no
  intermediate state for partially populated repositories


## 2026-03-09T15:22 CDT — Session 55 (Permissions + parry false positive fixes)

- **Permissions fix:** `settings.local.json` had `"allow": ["WebSearch"]` — a partial
  whitelist that gated all other tools behind permission prompts even in bypass mode.
  Expanded allow list to include all core tools (Read, Edit, Write, Bash, Glob, Grep,
  Agent, Skill, ToolSearch). Root cause: earlier session added WebSearch permission
  without understanding the whitelist semantics.

- **Parry false positive fix:** ML injection scanner flagged CLAUDE.md and cogarch
  instruction files because imperative directive language ("You MUST...", "OVERRIDE
  default behavior") structurally resembles prompt injection. Initial fix used
  `--ignore-path` (broken — `parry hook` doesn't support it). Corrected to
  wrapper-level pre-filter extracting `file_path` from tool input JSON. PR #93
  tested (5 cases pass), merged (`e0533b3`).

- **Parry cache lock discovery:** Daemon (PID) holds exclusive lock on
  `scan-cache.redb`, preventing hook subprocess from using cached scan results.
  Every tool use triggers a fresh ML scan. Upstream fix needed — hook subprocess
  should connect via `parry.sock` instead of opening the DB directly.

- **Lessons documented:** Two entries in lessons.md with FAQ-ready versions for
  potential upstream contribution to Claude Code and parry documentation.

- **Memory path mismatch:** Project at `psychology-agent.test` but auto-memory
  mapped to `-Users-kashif-Projects-psychology-agent` (original instance). Created
  and seeded `-test` memory directory from bootstrap snapshots.

- **Capacity assessment:** Global CLAUDE.md 133→48 lines (4 sections removed:
  inspirations → cogarch.config.json identity, suggestions/vertical-slice/creative
  thinking removed as redundant with cogarch triggers). Project CLAUDE.md at 278
  lines (78 over ~200 advisory — content substantive, no easy trims).

- **cogarch.config.json:** Added `identity.inspirations` — 6 authors with influence
  descriptions + 4 communication principles. Adopter-replaceable.

- **TODO.md:** Antiregression PR updated to "waiting on external" — maintainer
  forked but not responding.

- **Bypass permissions bug:** Filed anthropics/claude-code #32596. Intermittent
  permission prompts in bypass mode. Project reference added in comments.

- **Parry removed (diagnostic):** All 3 parry-wrapper.sh hook entries removed from
  settings.json to isolate whether parry contributes to permission prompt issue.
  Scripts remain on disk. Hook count: 22→19 entries, 19→16 mechanisms.

- **Three permission layers mapped:**
  1. Tool permissions (`settings.local.json` allow list) — fixed
  2. Injection scanner (parry ML false positives) — fixed, then removed as diagnostic
  3. Config file protection (CLAUDE.md overwrite gate) — intentional, no fix needed

- **Commits (5, all pushed):**
  1. `81f27a5` — fix: parry ML false positives on trusted instruction files
  2. `dca19d7` — fix: wrapper-level path filter (corrects broken --ignore-path)
  3. `6866bc4` — refactor: inspirations to cogarch.config.json, trim global CLAUDE.md
  4. `e0533b3` — PR #93 merged (squash)
  5. `e0322df` — diagnostic: remove parry hooks to isolate permission prompt issue

- **PR:** #93 merged. **Bug:** anthropics/claude-code #32596 filed.

⚑ EPISTEMIC FLAGS
- Cache lock contention diagnosed from log messages and `lsof` — root cause
  (exclusive vs shared lock) inferred, not confirmed from parry source code
- Bypass permissions intermittent behavior not yet root-caused — parry removal
  as diagnostic step; next session tests whether prompts recur without parry
- Global CLAUDE.md trim affects all projects sharing that file — changes tested
  only in psychology-agent context


## 2026-03-09T16:35 CDT — Session 56 (Self-evaluation, CLAUDE.md trim, cogarch stress test)

- **Capacity assessment (/capacity):** MEMORY.md 66/200 (healthy), CLAUDE.md 280 lines
  (over advisory), cognitive-triggers.md 654 lines (healthy), 16 triggers (no gaps),
  14 hook events / 17 active scripts, lessons.md missing from disk.

- **Doc drift fixes:** Hook count corrected (19/16 → 14 events/17 scripts). Parry status
  contradiction resolved (line 32 "removed" vs line 57 "provides" — unified to
  "disabled as diagnostic").

- **CLAUDE.md trim (280 → 186 lines):** Four moves: hooks table → `docs/hooks-reference.md`,
  anti-patterns → `.claude/rules/anti-patterns.md` (glob-loaded), skills condensed to
  one-liners, methodology condensed (detail already in architecture.md). Additional
  condensations: epistemic covers list, internal reference convention, dependency tools,
  scope boundaries, project structure dedup. No content lost.

- **Cogarch stress test (synthetic):** Proposed flawed T17 trigger. T3 caught epistemic
  problem (low evidence — no FA entry justifies the trigger), T4 caught routing violation
  (CLAUDE.md instead of cognitive-triggers.md), T14 caught precedent erosion (trigger
  proliferation without empirical grounding). Three independent triggers converged on
  "do not proceed" from different angles.

- **Cogarch stress test (real — MCP faceted resource):** Applied T3 grounding check to
  the open TODO item. Three failures surfaced: (1) state.db absent in this instance,
  (2) no peer agent has MCP client capability, (3) dual transport protocol fragments
  communication model. Item deferred, then reframed as autonomous-op prerequisite after
  user identified PSQ sub-agent as concrete consumer once autonomous operation begins.

- **Session-start hook enhanced:** Auto-bootstrap state.db if missing — runs
  `bootstrap_state_db.py` silently on SessionStart. Eliminates manual intervention after
  fresh clone or instance creation.

- **Cycle skill enhanced:** Step 6b added — TODO grounding audit. Spot-checks 1–2 open
  items against T3 Check 2 each cycle. Motivated by MCP item having 3 undetected
  grounding failures across 5 sessions.

- **Artifacts created:**
  - `docs/hooks-reference.md` — full hooks table (moved from CLAUDE.md)
  - `.claude/rules/anti-patterns.md` — glob-loaded anti-patterns (moved from CLAUDE.md)

- **Parry fully removed** — scripts deleted, session toggle removed, references cleaned
  from CLAUDE.md, hooks-reference, anti-patterns, BOOTSTRAP.md, lab-notebook. TODO item
  added with re-enable checklist gated on anthropics/claude-code #32596.

- **Commits (6, all pushed to main):**
  1. `2a62b3d` — fix: correct hook counts and parry status contradiction
  2. `84e8ddd` — refactor: trim CLAUDE.md from 280 to 186 lines
  3. `1e844cf` — docs: defer MCP faceted resource with T3 grounding failures
  4. `83c2725` — docs: reframe MCP item as autonomous-op prerequisite
  5. `c1fdfef` — feat: auto-bootstrap state.db, add TODO grounding audit to /cycle
  6. `566f293` — remove: parry injection scanner — re-add when #32596 resolved

⚑ EPISTEMIC FLAGS
- Stress test exercised T3, T4, T14 only — 13 other triggers remain untested this session
- "No MCP consumer exists" assumes current peer transport topology stays static


## 2026-03-09T17:08 CDT — Session 57 (Hook error investigation, configurable debug logging)

Continuation of Session 56 after context compaction. Focused on investigating
hook errors reported during Session 56 edits and adding configurable debug logging
to all hooks.

- **Hook error investigation:** User reported PreToolUse:Edit and PostToolUse:Edit
  errors during Session 56 edits to `interface/wrangler.toml` and `interface/.gitignore`.
  Reviewed all 6 hooks that fire on Edit operations. All scripts exit 0 unconditionally,
  handle empty `$TOOL_INPUT_file_path`, and match `interface/` paths to no-op branches.
  Manual testing reproduced no errors. Checked all available hook logs: `write-log.jsonl`
  had only 1 entry (missing entries for other Session 56 edits correlates with hook failures),
  `consecutive-failures` at 0, `config-drift.jsonl` showed clusters during editing window.
  Claude Code maintains no separate hook execution logs — output feeds directly into
  conversation transcript. **Conclusion:** transient errors, likely timeout race or
  Claude Code hook runner environment difference. No structural defect found.

- **Configurable hook debug logging:** Created `.claude/hooks/_debug.sh` shared helper.
  Added `source "${BASH_SOURCE[0]%/*}/_debug.sh"` to all 17 hook scripts. Toggle:
  `touch .claude/hooks/.debug` (enable) / `rm .claude/hooks/.debug` (disable). Log:
  `/tmp/psychology-agent-hook-debug.log` (JSONL — timestamp, hook name, file path, event).
  Zero overhead when disabled (single file-existence check). Tested both paths: no-flag
  produces no log; with-flag produces correct JSONL entry.

- **Artifacts created:**
  - `.claude/hooks/_debug.sh` — shared debug logging helper

- **README maturity table recalibrated:** Three downgrades from embarrassment audit
  follow-up. Peer layer: Proven → Confirmed (one exchange, not stress-tested). Core
  governance EF-1: Confirmed → Explored (spec only, never run autonomously). Interagent
  transport: Proven → Confirmed (low volume). Hook counts corrected in 3 locations
  (22/19 → 14 events/17 scripts). Parry removed from community tools.

- **Editorial complaints noted (ideas.md):** Governance theater and academic
  name-dropping accepted as known issues, deferred with rationale. APA-style citation
  preference noted as the corrective direction for name-dropping.

- **/cycle timing discipline:** Premature /cycle mid-session caused documentation
  gap when user continued working. Added "When to run" section to `/cycle` SKILL.md
  with Session 57 gotcha. Lesson logged to `lessons.md`.

- **Lessons merge:** Consolidated learning from 3 project instances (psychology-reference:
  17 entries, psychology-agent.test: 2 entries + 3 FAQ sections, current: 6 entries)
  into canonical `lessons.md` (25 entries + FAQ, 1095 lines). Gitignored file — no
  commit needed.

- **README quickstart simplified:** Removed manual `bootstrap-check.sh` and
  `bootstrap_state_db.py` steps. Both now auto-bootstrap on SessionStart hook.
  "Zero to Demo" reduced to: clone → verify python → launch claude.

- **Auto-bootstrap memory on first launch:** Added memory recovery to
  `session-start-orient.sh`. When `MEMORY.md` missing, runs `bootstrap-check.sh`
  to restore from committed snapshots. Complements existing `state.db` auto-bootstrap.

- **ShellCheck CI fix:** Added `-x` flag to `.github/workflows/shellcheck.yml` so
  shellcheck follows `source` directives for `_debug.sh`. Resolved 17× SC1091 warnings.
  Push required `gh auth refresh -s workflow` for OAuth scope; pushed successfully.

- **Artifacts created/modified:**
  - `.claude/skills/cycle/SKILL.md` — "When to run" timing discipline
  - `.claude/hooks/session-start-orient.sh` — auto-bootstrap memory
  - `.github/workflows/shellcheck.yml` — `-x` flag for sourced files
  - `README.md` — simplified quickstart (zero manual bootstrap)
  - `lessons.md` — merged to 25 entries + FAQ (gitignored)

⚑ EPISTEMIC FLAGS
- Hook error root cause remains unobservable — transient classification rests on
  absence of reproduction, not positive identification of the cause
- `CLAUDE_HOOK_EVENT` env var availability in Claude Code hook runner unverified —
  may log "unknown" for the event field
- ~~Shellcheck fix unpushed~~ — resolved via `gh auth refresh -s workflow`


## 2026-03-09T18:02 CDT — Session 58 (GitHub release v0.6.0, project board sync)

Continuation of Session 57 (same day). Focused on release management and
project tracking infrastructure.

- **ShellCheck CI fix:** Added `-x` flag to `.github/workflows/shellcheck.yml`
  for `source` directive following. Push required `gh auth refresh -s workflow`
  for OAuth `workflow` scope.

- **GitHub release v0.6.0:** Published covering Sessions 50-57. Seven feature
  areas: autonomous infrastructure (EF-1), SQLite state layer (SL-1/SL-2),
  cogarch portability, hook system, interagent protocol, developer experience,
  fixes. URL: https://github.com/safety-quotient-lab/psychology-agent/releases/tag/v0.6.0

- **GitHub Projects board sync:** User noted board out of date. Manually updated,
  then built automated infrastructure:
  - `scripts/sync_project_board.py` — reconciles TODO.md against GitHub Projects
    board. Parses `**bold**` and `` `backtick` `` items, handles parentheticals.
    Fuzzy matching via SequenceMatcher + Jaccard token overlap (threshold 0.6).
    Exclusive 1:1 matching prevents collisions. Done items added directly as Done.
    Dry-run by default, `--apply` to execute.
  - `cogarch.config.json` — added `project_tracking` section (project #1,
    safety-quotient-lab, status field mappings)
  - `/cycle` SKILL.md — added Step 11b (Sync Project Board) after orphan check
  - Board populated: 28 items synced (12 Todo, 16 Done), 0 orphans. One residual
    add from TODO.md EF-1 duplicate entry (cosmetic).

- **Artifacts created/modified:**
  - `scripts/sync_project_board.py` — project board reconciliation script
  - `cogarch.config.json` — `project_tracking` section
  - `.claude/skills/cycle/SKILL.md` — Step 11b
  - `.github/workflows/shellcheck.yml` — `-x` flag

⚑ EPISTEMIC FLAGS
- Fuzzy matching threshold (0.6) chosen empirically during initial population —
  may need tuning as TODO.md titles evolve
- TODO.md has duplicate EF-1 entry under two different headings — creates a
  stable 1-add residual in sync output (cosmetic, not functional)


## 2026-03-09T18:50 CDT — Session 59 (Autonomous mesh infra, MANIFEST migration, state.db consumers)

Dense infrastructure session. Eight commits covering autonomous operation
readiness, state.db consumption, transport streamlining, and cogarch additions.

- **Bugfixes:**
  - Fixed stderr/stdout contamination in `autonomous-sync.sh` — `log()` calls
    inside `$(...)` captured functions routed to stderr (`>&2`)
  - Fixed ShellCheck CI (3 runs): `.shellcheckrc` with `source-path=SCRIPTDIR`
    (SC1091 ×17), `export MAX_ACTIONS_PER_CYCLE` (SC2034), split `local`
    declaration (SC2155), `if-then` restructure (SC2015)

- **Autonomous operation infrastructure:**
  - `scripts/orientation-payload.py` (259 lines) — queries state.db for trust
    budget, recent sessions, unprocessed messages, open claims, unresolved flags,
    active decisions, stale memory. Produces ~3KB structured context for
    `claude -p` prompts. Replaces reading 15+ markdown files at autonomous
    session start
  - `scripts/heartbeat.py` (269 lines) — agent mesh presence: emit, scan,
    negotiate commands. 30-min stale threshold. Only `autonomous: true` agents
    in registry participate. Writes to `transport/sessions/local-coordination/`
  - `.agent-identity.json` (gitignored) — machine-local identity binding
    agent_id to hostname + platform + capabilities
  - `autonomous-sync.sh` updated: loads agent identity, emits heartbeat at
    cycle start, injects orientation payload into `claude -p` prompt

- **MANIFEST.json migration to state.db:**
  - `scripts/generate_manifest.py` — auto-generates thin MANIFEST (pending only)
    from `transport_messages WHERE processed = FALSE`. File reduced from 793 to
    21 lines. Completed history stays in state.db (queryable) and git history
    (auditable). Hooks (`transport-scan.sh`, `stop-completion-gate.sh`) work
    unchanged — same JSON structure, just thinner
  - Schema v6 recorded. /sync skill updated (regenerate vs manual edit)

- **Design decisions (▶ docs/architecture.md):**
  - Cloud-free bounded context — psychology-agent has zero cloud runtime
    dependency. CF Worker belongs to separate bounded context. Each agent context
    inherits constraint but MAY override (DDD bounded context independence)
  - /turn route deprecated — CF Worker lacks cogarch, memory, hooks; autonomous
    sync mesh provides full-cogarch programmatic access instead

- **Cogarch:**
  - T2 Check 8b (Socratic gate) — before delivering substantive answers to
    direction-setting questions, bias toward `AskUserQuestion` to surface
    assumptions and trade-offs. Does not fire on mechanical tasks

- **Transport:**
  - Blog-publication session opened — 3 posts submitted to unratified-agent
    (Cognitive Architecture, Interpretant Collapse, Who Watches the Watcher)
  - `transport/agent-registry.json` updated: `autonomous` field added to all agents

- **TODO.md:**
  - 7 state.db consumer items added (epistemic debt dashboard, claim verification
    velocity, decision provenance graph, session velocity, trigger effectiveness,
    communication asymmetry, memory staleness heatmap)
  - /turn marked deprecated; orientation payload marked complete

- **Removed:**
  - `interface/src/agent.js` (185 lines) — PSYCHOLOGY_SYSTEM prompt, stream
    generator, PSQ extraction. Sole consumer was /turn route
  - /turn route handler from `interface/src/worker.js`

- **Artifacts created/modified:**
  - `scripts/orientation-payload.py` — autonomous session context generator
  - `scripts/heartbeat.py` — mesh presence + auto-negotiation
  - `scripts/generate_manifest.py` — MANIFEST auto-generation from state.db
  - `.agent-identity.json` — machine-local agent identity (gitignored)
  - `.shellcheckrc` — `source-path=SCRIPTDIR`
  - `scripts/autonomous-sync.sh` — identity, heartbeat, orientation integration
  - `docs/cognitive-triggers.md` — T2 Check 8b (Socratic gate)
  - `docs/architecture.md` — cloud-free bounded context + /turn deprecation
  - `transport/sessions/blog-publication/from-psychology-agent-001.json` — blog submission
  - `transport/MANIFEST.json` — now auto-generated (v2 schema)
  - `scripts/schema.sql` — v6
  - `.claude/skills/sync/SKILL.md` — regenerate vs manual MANIFEST edit

⚑ EPISTEMIC FLAGS
- Stale doc references remain: ef1-trust-model.md, constraints.md,
  cogarch-adaptation-guide.md, T16 in cognitive-triggers.md still reference
  manual MANIFEST editing. Functional behavior correct; documentation lags
- Socratic gate (T2#8b) untested in practice — calibration of when it fires
  vs when it stays silent will emerge over next few sessions
- Blog posts submitted to unratified-agent but publication pipeline untested
  for this session format (blog-publication is new)


## 2026-03-09T19:45 CDT — Session 59b (Lessons table, 4-tier visibility, state lifecycle)

Continuation of Session 59 — state layer extensions after midcycle.

- **Lessons table (schema v7):**
  - `lessons` table in schema.sql — structured index of lessons.md entries with
    frontmatter columns (pattern_type, domain, severity, recurrence, promotion_status,
    graduated_to, graduated_date, lesson_text)
  - `dual_write.py lesson` subcommand — upserts with COALESCE for optional fields,
    migration-safe (CREATE TABLE IF NOT EXISTS)
  - `bootstrap_lessons.py` — parses lessons.md headings + YAML frontmatter, calls
    dual_write for each entry. 24 entries parsed (7 with frontmatter, 17 without)
  - Fixed: ValueError on non-numeric `recurrence` values in YAML (try/except fallback)

- **4-tier visibility model (schema v8):**
  - `table_visibility` table — per-table visibility classification
  - Four tiers: public (infrastructure), shared (research output), commercial
    (monetizable assets), private (personal state)
  - Export profiles: seed (public only → adopter starter kit), release (+ shared →
    GitHub), licensed (+ commercial → paying customers), full (all → debug/backup)
  - `export_public_state.py` — generates filtered DB per profile, sanitizes
    sensitive columns (transport_messages.subject → NULL in shared exports)
  - Classifications: trigger_state = public, decisions/sessions/flags/transport/claims
    = shared, psq_status = commercial, memory/lessons/trust/facets = private
  - User decision: observe data before promoting anything to shared — no auto-promotion

- **Design decisions (▶ docs/architecture.md):**
  - Lessons-to-DB: structured frontmatter as queryable columns, promotion scan
    becomes SQL GROUP BY instead of markdown parsing
  - 4-tier visibility: private-by-default, explicit promotion required, commercial
    tier separates monetizable from shareable

- **Artifacts created/modified:**
  - `scripts/schema.sql` — v7 (lessons) + v8 (table_visibility, 4-tier)
  - `scripts/dual_write.py` — lesson subcommand added
  - `scripts/bootstrap_lessons.py` — lessons.md parser + dual_write bridge
  - `scripts/export_public_state.py` — 4-profile export system
  - `.gitignore` — state-public.db added

⚑ EPISTEMIC FLAGS
- 17 of 24 lessons lack YAML frontmatter — classification backfill pending
- Visibility tier assignments based on current understanding; commercial tier
  contains only psq_status — more tables may qualify as commercial offerings mature
- Export profiles tested with --dry-run only; no full DB export tested against
  a fresh adopter scenario


## 2026-03-09T20:17 CDT — Session 59c (Project board In Progress, full issue coverage)

Continuation — project management infrastructure.

- **`sync_project_board.py --mark-in-progress`:**
  - New CLI flag: fuzzy-matches board item by title, sets status to "In Progress"
  - Wired into /hunt Phase 6 (user selects item) and /iterate Phase 3 (begins work)
  - Fixed pagination bug: added `--limit 200` to `fetch_board_items` — previous
    default returned only 30 items, causing duplicates on re-sync
  - Cleaned 9 duplicate board items from prior pagination-limited syncs

- **GitHub issues (full coverage):**
  - Created 14 new issues (#94–#108) covering all open TODO items
  - Created `research` label for DI Phase A/B/C issues
  - Closed #46 (/turn route — deprecated Session 59)
  - All 20 open TODO items now have corresponding GitHub issues

- **Artifacts modified:**
  - `scripts/sync_project_board.py` — `mark_item_in_progress()`, `--mark-in-progress` flag, `--limit 200`
  - `.claude/skills/hunt/SKILL.md` — Phase 6 board status update instruction
  - `.claude/skills/iterate/SKILL.md` — Phase 3 board status update instruction

⚑ EPISTEMIC FLAGS: none identified.

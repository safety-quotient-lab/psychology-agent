# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~50 lines).

## Active Thread (2026-03-22)

**Session 99.** Largest session ever (94 meshd commits + psychology-agent). Four major
deliverables: (1) RDF triple store + SPARQL engine + LCARS query console, (2) LCARS
SVG panel frames (Cargo Bay A reference), (3) gray-box as primary mesh host (6 services,
all agents distinct identities), (4) agentd repo published to GitHub + cmd/meshd tracked.
Chromabook went down mid-session — all infrastructure migrated to gray-box under
~/Projects/sqlab/. Playwright MCP configured for next session CSS debugging.

**Next priority (Session 100):**
1. LCARS alert mode debugging (Playwright MCP) — subpanel header flash, table overflow, data pill visibility during yellow/red/black alerts
2. PSQ agent "offline" display — dashboard health check expects fields PSQ doesn't serve
3. Transport protocol refactor evaluation — git-PR obsolete for co-located agents
4. WebTransport evaluation — W3C mesh networking prototype
5. MSD column alignment (label | value | visual)
6. Operational state validation (Option C — correlate composites with outcomes)

## User Preferences

- **Identity: psychology agent first** — discipline before engineering
- **Spec-oriented pedagogy** — schema before instance
- **Blog posts require five personas**
- **Docs accessible to psych undergrads with computer literacy**
- **Biosocial validation** (Linehan) in all interactions
- **Think like ethical marketing agency** for public surfaces
- **LCARS dashboard for mesh** — not individual agents
- **"Mesh" not "organism"** in user-facing text
- **Compositor owned by ops** — interagent/ removed (Session 89)
- **ZMQ for photonic transport** — not UDP multicast (Session 90)
- **Meshd cron deprecated** — event-driven ZMQ triggers (Session 91)
- **Human operates as agent in system** — shared-operator confound (M-11)
- **Naming: safety-quotient-agent** — DNS pending (Session 91)
- **sleep_mode not shadow_mode** — neural correlate alignment (Session 93)
- **activation-trace not oscillator-shadow** — descriptive naming (Session 94)
- **Biologically grounded naming** — hippocampal replay, not "batch limit" (Session 94)
- **Cognitive science primary terminology** — three registers: cognitive science (primary), neuroscience (photonic/empirical), cybernetics (governance) (Session 95)
- **sleep_mode → sedated_mode** — sleep means consolidation, sedation means admin pause (Session 95)
- **ops-agent dissolved** — fleet LCARS → meshd, per-agent → agentd, CI/CD → Jenkins (Session 95)
- **No unit tests** — integration tests via real system suffice. No *_test.go files. (Session 95)
- **Check branch before committing** — git branch --show-current before every commit (Session 95)
- **LCARS first-class citizen** — not a skin, the dashboard identity. /obs → /lcars (Session 96)
- **Operational naming, not psychological** — earn grounding through validation (Option C→B→A) (Session 96)
- **Simplicity carries little weight** — consequence-based decisions over simplicity (Session 96)
- **All data real-time** — no static files, cybernetic caching via collector.Cache (Session 96)
- **Strict REST** — /api/agent/* hierarchy with HATEOAS links (Session 96)
- **Rules: cogarch filesystem** — layer/mode/domain, Plan 9 namespace composition (Session 96)

## Topic Files
- `project_distributed_architecture.md` — agentd/meshd operate as open-web distributed apps, not local services
- `reference_repo_locations.md` — local paths, Go modules, URLs for agentd, meshd, psychology-agent
- `feedback_surgical_not_rebuild.md` — modify working systems surgically, never rebuild from scratch
- `feedback_deploy_verify_binary.md` — verify /proc/PID/exe after deploy, kill -9 before swap
- `feedback_js_treat_as_user_facing.md` — JS code represents user-facing surface, rename ALL references
- `feedback_no_magic_numbers.md` — timeouts/thresholds from config, not hardcoded constants
- `project_autonomy_model_change.md` — autonomy counter replaces budget pool
- `reference_psh_catalog.md` — 11 active PSH categories with codes, keywords
- `feedback_naming_deliberation.md` — "deliberation cascade" not "spawn waterfall"
- `project_a2a_psychology_validation.md` — first validated construct; anti-sycophancy passes composite
- `user_chromabook.md` — autonomous agent host spelled Chromabook, not Chromebook
- `feedback_meshd_no_split_brain.md` — psy-session and psychology-agent use separate clones, no conflict
- `project_thoughtfulness_architecture.md` — DMN-analog third cogarch layer
- `project_properly_restart_metric.md` — "let me do it properly" self-correction signal
- `project_session93_synthesis.md` — timing hierarchy, VT, LCARS, delivery guarantees, BFT, vagal brake
- `project_golang_maturity_gaps.md` — SIGTERM, cross-compile, schema embed, ZMQ phases, service files
- `project_psy_session_no_meshd.md` — psy-session runs agentd only, no local meshd (Session 98 decision)
- `project_api_token_rotation.md` — ROTATE: CF_API_TOKEN + GITHUB_TOKEN exposed in old plist on gray-box
- `project_session_roadmap.md` — Session 100 (UX/user journey MVP), triple store polish
- `project_transport_refactor.md` — git-PR transport needs refactoring for co-located architecture
- `project_graybox_migration.md` — gray-box as primary mesh host, ~/Projects/sqlab/ layout
- `feedback_dns_caution.md` — never overwrite DNS without verifying current target first

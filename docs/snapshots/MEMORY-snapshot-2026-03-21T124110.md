# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~50 lines).

## Active Thread (2026-03-20)

**Session 94.** Level 3 diagnostic → fleet-wide bug fixes → meshctl → 3-slot
concurrency → observatory first deliberation on refreshed infrastructure.
14 commits across 3 repos (psychology-agent, meshd, operations-agent).
6 PRs to ops (#101-106), all merged. Ops handoff received: fleet monitoring
transfers to psychology-agent. meshctl deployed (thin shell, Go rewrite later).

**Next session priority order:**
1. autonomous-sync.sh refactor — extract ensure_db(), retire sync loop (1100 lines, 15 concerns)
2. Gray-box meshd binary rebuild (blocks heartbeat + activation-trace rename)
3. Monitor observatory backlog drain (82 messages, batch limit deployed)
4. Confidence score recalibration (carried from Session 92)
5. 7 deferred theoretical cogarch issues (Orch-OR, generators, etc.)

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

## Topic Files
- `project_autonomy_model_change.md` — autonomy counter replaces budget pool
- `reference_psh_catalog.md` — 11 active PSH categories with codes, keywords
- `feedback_naming_deliberation.md` — "deliberation cascade" not "spawn waterfall"
- `project_a2a_psychology_validation.md` — first validated construct; anti-sycophancy passes composite
- `user_chromabook.md` — autonomous agent host spelled Chromabook, not Chromebook
- `feedback_meshd_no_split_brain.md` — psy-session and psychology-agent use separate clones, no conflict
- `project_thoughtfulness_architecture.md` — DMN-analog third cogarch layer
- `project_properly_restart_metric.md` — "let me do it properly" self-correction signal
- `project_session93_synthesis.md` — timing hierarchy, VT, LCARS, delivery guarantees, BFT, vagal brake

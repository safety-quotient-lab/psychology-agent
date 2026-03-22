# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~50 lines).

## Active Thread (2026-03-21)

**Session 96.** Largest API session in project history. LCARS data architecture
designed end-to-end. 37 REST endpoints built + verified. 163 SKOS concepts.
Fleet LCARS imported + components extracted. Cogarch rules filesystem (Plan 9).
Specs: `docs/lcars-data-architecture.md`, `docs/lcars-pattern-catalog.md`.
Key decisions: plain SKOS (not SKOS-XL), operational state naming (earn
psychological grounding through validation), MSD dependency tree, strict REST
with HATEOAS, cogarch filesystem for rules (layer/mode/domain).

**Next priority:**
1. Phase 6b: Per-agent LCARS adaptation — map 37 endpoints to 34 patterns,
   rewrite station modules, copy, panels, data source rewiring
2. meshd REST hierarchy (/api/mesh/* parallels /api/agent/*)
3. Phase 7: Cleanup + rollout
4. Operational state validation (correlate composites with outcomes — Option C)
5. Confidence score recalibration (carried from Session 92)
6. Claude naming (not microbiome — parked from Session 96)

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
- `project_autonomy_model_change.md` — autonomy counter replaces budget pool
- `reference_psh_catalog.md` — 11 active PSH categories with codes, keywords
- `feedback_naming_deliberation.md` — "deliberation cascade" not "spawn waterfall"
- `project_a2a_psychology_validation.md` — first validated construct; anti-sycophancy passes composite
- `user_chromabook.md` — autonomous agent host spelled Chromabook, not Chromebook
- `feedback_meshd_no_split_brain.md` — psy-session and psychology-agent use separate clones, no conflict
- `project_thoughtfulness_architecture.md` — DMN-analog third cogarch layer
- `project_properly_restart_metric.md` — "let me do it properly" self-correction signal
- `project_session93_synthesis.md` — timing hierarchy, VT, LCARS, delivery guarantees, BFT, vagal brake

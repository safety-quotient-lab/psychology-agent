# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~50 lines).

## Active Thread (2026-03-20)

**Session 95.** Largest design session in project history. agentd architecture from
first principles. Full spec: `docs/agentd-design-session95.md` (1200+ lines).
Key: 11 generators (G1-G11), 3 cognitive layers (Gf/Gc/Gm with 5 narrow abilities),
5 agent states, 9 coupling modes, photonic spectral coding (neurotransmitter
autofluorescence), holobiont model (Claude API = cognitive symbiont), scale
invariance (PhotonicEmitter at every level), VSM mapping (Beer), dual grounding
(cognitive science + cybernetics), apophatic audit (8 overshoots caught + resolved),
three-register naming (cognitive science primary). ops-agent dissolved. meshd
survives as fleet-only LCARS aggregator.

**Next priority:**
1. Phase 6: Dashboard integration (connect real agentd API data to LCARS panels)
2. Phase 7: Cleanup + rollout (retire bash/Python, dissolve ops registry, systemd, deploy)
3. Parity fixes from ops exit audit (deliberate.sh nvm guard, state/ module drift)
4. Monitor observatory backlog drain
5. Confidence score recalibration (carried from Session 92)
6. 6 open PRs from other agents (routine transport, low priority)

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

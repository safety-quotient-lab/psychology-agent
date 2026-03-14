# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~50 lines).
Topic files read on demand by T1 (session start) and /cycle (Step 7).

## Topic Files

| File | Content | Read when |
|------|---------|-----------|
| `memory/decisions.md` | Design decisions table + authority hierarchy | T1; decision-making |
| `memory/cogarch.md` | Trigger quick-ref, knock-on depth, working principles | T1; before recommending |
| `memory/psq-status.md` | PSQ calibration, deploy status, open issues | PSQ work |
| `memory/infrastructure.md` | Chromabook, Cloudflare, CI/CD, known gotchas | Infrastructure work |
| `memory/feedback_spec_oriented.md` | User prefers spec-level framing | All presentations |
| `memory/feedback_rapport_style.md` | Poetic compression closes naturally | Session closure |
| `memory/project_agent_personality.md` | Agents carry distinct personalities | Agent identity design |

## Active Thread (2026-03-14)

**Session 87 (evaluative).** Mesh sync, SEC-4 fixed (solid-oidc → bearer),
backlog triage (6 closed, 20 created, 35 open), v1 doc audit (8 findings
fixed across 4 files, ~35 E-Prime violations deferred).

**Awaiting:** ops (PSQ budget replenishment + organism dashboard + A2A-Psych
rollout), unratified (blog Post 1 draft), observatory (R4 + HN feasibility),
psq (analogy-limits peer review + HN distribution shift)

**Next:** E-Prime cleanup pass, adversarial evaluator (Tier 2), DI Phase A
Pass 2, SEC-3 (A2A 1.0.0 agent card upgrade)

## User Preferences

- **Identity: psychology agent first** — discipline before engineering
- **Spec-oriented pedagogy** — schema before instance, interface before implementation
- **Blog posts require five personas** — voter/politician/educator/researcher/developer
- **AskUserQuestion tool** for all clarification
- **Human expert outreach** — user handles personally through contacts
- **awesome-claude-code submission** — user acknowledges indefinite deferral

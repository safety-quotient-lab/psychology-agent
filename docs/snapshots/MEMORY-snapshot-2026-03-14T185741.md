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

**Session 87 (v1 pre-release).** Mesh sync + SEC-4 fix + v1 doc audit (8 findings)
+ E-Prime cleanup (46 fixes) + efference copy (#196) + GWT broadcast (#195)
+ RPG scan #002 (5 predictions, 5 governance recs) + A2A 1.0.0 agent card (SEC-3/6/7)
+ deferred outbound (5/7 sent) + self-readiness-audit closed + CPG blog dispatched.
GitHub: 11 issues closed, 20 created, ~24 open. v1 gate: Phase 1 complete.

**Awaiting:** ops (shadow mode, governance recs PR #23/#24, organism dashboard),
unratified (blog Post 1, CPG blog PR #71, frontmatter fix), observatory (F9/F11,
inbox processing), psq (peer review, HN dist shift, budget replenishment)

**Next:** v1 documentation pass (undergrad-accessible), §11 neural correlates review,
adversarial evaluator Tier 2, DI Phase A Pass 2

## User Preferences

- **Identity: psychology agent first** — discipline before engineering
- **Spec-oriented pedagogy** — schema before instance, interface before implementation
- **Blog posts require five personas** — voter/politician/educator/researcher/developer
- **AskUserQuestion tool** for all clarification
- **Human expert outreach** — user handles personally through contacts
- **Docs must read accessible to psychology undergrads** — spotless, presentation-ready

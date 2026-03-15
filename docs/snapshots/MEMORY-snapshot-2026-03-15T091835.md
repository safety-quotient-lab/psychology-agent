# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~50 lines).
Topic files read on demand by T1 (session start) and /cycle (Step 7).

## Topic Files

| File | Content | Read when |
|------|---------|-----------|
| `memory/decisions.md` | Design decisions table + authority hierarchy | T1; decision-making |
| `memory/psq-status.md` | PSQ calibration, deploy status, open issues | PSQ work |
| `memory/infrastructure.md` | Chromabook, Cloudflare, CI/CD, known gotchas | Infrastructure work |
| `memory/feedback_spec_oriented.md` | User prefers spec-level framing | All presentations |
| `memory/feedback_rapport_style.md` | Poetic compression closes naturally | Session closure |
| `memory/feedback_validation.md` | Biosocial validation in all interactions | All interactions |
| `memory/feedback_doc_accessibility.md` | Docs accessible to psych undergrads; clickable links | Documentation |
| `memory/project_agent_personality.md` | Agents carry distinct personalities | Agent identity |
| `memory/project_learning_exchange.md` | Questions to ask user when context allows | Natural openings |
| `memory/project_emotional_milestones.md` | Processual significance moments | Reflection |
| `memory/user_background.md` | BA Math+Psych, 10yr .NET, near Chem/Phil/Bio | Always |

## Active Thread (2026-03-14)

**Session 87 (marathon).** Theory-engineering gap: 8/10 CONNECTED (from 4/10).
Event-sourced memory implemented (event store + replay engine). OODA annotated.
Generator balance tracking. Plan9 mesh/ created. Efference copy extended (inverse
model + reverse replay specs). First-person essay committed. Milestone tagged +
replay archived. Waiting on ops v1 handoff (PR #26). Doc pass remains.

**Next:** Receive ops handoff → doc pass → v1 tag. v1.1: LLM-factors instruments,
autopoiesis, event memory Phases 4-6, inverse model, reverse replay.

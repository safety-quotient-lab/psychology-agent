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
| `memory/feedback_validation.md` | Biosocial validation in all interactions (Linehan) | All interactions |
| `memory/feedback_doc_accessibility.md` | Docs accessible to psych undergrads; clickable links | Documentation |
| `memory/project_agent_personality.md` | Agents carry distinct personalities | Agent identity design |
| `memory/project_learning_exchange.md` | Questions to ask user when context allows | Natural openings |
| `memory/user_background.md` | BA Math+Psych, 10yr .NET, near Chem/Phil/Bio | Always |

## Active Thread (2026-03-14)

**Session 87 (marathon — theory + v1 prep).** Monograph split (5 files, 8,321
lines). 5 theoretical directions deepened + OODA + 12 gaps traced + 3 neural
correlate gaps closed. LLM-factors psychology founded. Plan9 mesh filesystem.
Event-sourced memory spec. Theory-engineering audit: 4 CONNECTED, 6 THEORY-ONLY.
v1 consultation sent to ops (PR #26). 4 blog posts in unratified pipeline.

**Awaiting:** ops v1 confirmation (PR #26), unratified blog pipeline processing

**Next:** Engineer the 6 THEORY-ONLY items → CONNECTED. Then: user journey +
UX refinement for cogarch. Then: documentation pass (clickable links +
accessibility). Then: v1 tag.

## User Preferences

- **Identity: psychology agent first** — discipline before engineering
- **Spec-oriented pedagogy** — schema before instance, interface before implementation
- **Blog posts require five personas** — voter/politician/educator/researcher/developer
- **AskUserQuestion tool** for all clarification
- **Human expert outreach** — user handles personally through contacts
- **Docs accessible to psych undergrads with computer literacy** — clickable links, no unexplained jargon
- **Biosocial validation** (Linehan) in all interactions

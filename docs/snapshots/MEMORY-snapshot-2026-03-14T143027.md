# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~55 lines).
Topic files read on demand by T1 (session start) and /cycle (Step 7).

## Topic Files

| File | Content | Read when |
|------|---------|-----------|
| `memory/decisions.md` | Design decisions table + authority hierarchy | T1 session start; decision-making |
| `memory/cogarch.md` | Trigger quick-ref, knock-on depth, adjudication, working principles | T1 session start; before recommending |
| `memory/psq-status.md` | PSQ sub-agent calibration, deploy status, open issues | PSQ work in this context (rare) |
| `memory/infrastructure.md` | Chromabook, Cloudflare, CI/CD, known gotchas | Infrastructure/deploy work |
| `memory/feedback_chromabook_not_hetzner.md` | Chromabook = local laptop, Hetzner = separate VPS | Infrastructure planning |
| `memory/feedback_cabinet_port.md` | Cabinet SSH on port 2535, not default 22 | SSH to cabinet |
| `memory/feedback_mesh_ops_domain.md` | Mesh circuit breaker + autonomous sync = operations-agent domain | Mesh/sync operations |
| `memory/feedback_rapport_style.md` | After deep work, match tonal shifts — poetic compression closes naturally | Session closure |
| `memory/project_agent_personality.md` | Agents carry distinct personalities crystallized through operational history | Agent identity design |
| `memory/feedback_spec_oriented.md` | User prefers spec-level framing — schema before instance, interface before implementation | All presentations |

## Active Thread (2026-03-14)

**Context:** Psychology agent (collegial mentor, discipline-first) with specialized
sub-agents and adversarial evaluator. A2A-Psychology extension published.

**Session 86 (landmark — 2026-03-13 evening through 2026-03-14 afternoon):**
- ✓ A2A-Psychology: 13 constructs, repo published, rollout spec delivered to ops
- ✓ §11 added to theory doc (Orch-OR, biophotonics, apophatic discipline, 2576 lines)
- ✓ Evaluation 53/53 resolved. Trust→autonomy 43-file rename. Delivery convention adopted.
- ✓ 7 new scripts. Sensor calibration. Real-time psychometric refresh (zero LLM cost).
- ✓ 3 blog series submitted. HN investigation dispatched. Shellcheck clean.

**Awaiting:** ops (rollout review), observatory (R4 + HN tracking), psq (DA Phase 1 + HN),
unratified (ICESCR + A2A-Psychology blogs)

**Next:** Process peer responses, theory track (generator survey, convergence methodology),
DI Phase A Pass 2, v1 doc audit, shadow mode fix

## User Preferences

- **Identity: psychology agent first** — discipline before engineering
- **Blog posts require five personas** — voter/politician/educator/researcher/developer
- **Spec-oriented pedagogy** — schema before instance, interface before implementation
- **AskUserQuestion tool** for all clarification — never inline plain text
- **Cogarch baseline summary** every session start

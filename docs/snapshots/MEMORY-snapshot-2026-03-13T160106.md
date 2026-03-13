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
| `memory/cognitive-triggers.md` | Legacy — full trigger descriptions (canonical: `docs/cognitive-triggers.md`) | Superseded; read canonical instead |
| `memory/feedback_chromabook_not_hetzner.md` | Chromabook = local laptop, Hetzner = separate VPS — never conflate | Infrastructure planning |
| `memory/feedback_cabinet_port.md` | Cabinet SSH on port 2535, not default 22 | SSH to cabinet |
| `memory/feedback_mesh_ops_domain.md` | Mesh circuit breaker + autonomous sync = operations-agent domain | Mesh/sync operations |
| `memory/project_work_completion_pattern.md` | Work completion pattern generator — partially implemented, needs finishing | /cycle integration, T1 carryover |

## Active Thread (2026-03-13)

**Context:** This agent operates as the **psychology agent** (collegial mentor,
discipline-first) with specialized sub-agents and an adversarial evaluator.

**Where we stopped:** Session 85 (IN PROGRESS). Einstein-Freud rights theory deep
development + EIC spec + blog post submitted to unratified-agent.

**Status by tier** (hot = system prompt / warm = SQL query / cold = file read):
- **Einstein-Freud rights theory: 1,622 lines, 10 sections** — `docs/einstein-freud-rights-theory.md` `[hot]`
  - 5 structural invariants from 13 cross-traditional frameworks
  - Neutral process monism (Russell/James/Whitehead) as foundation
  - SNAFU Principle → Equal Information Channel (spec + schema v24)
  - Processual PSQ reinterpretation (DA paradox dissolution, testable prediction)
  - RAW contributions: E-Prime as ontological discipline, reality tunnels, SNAFU
- **EIC spec: concrete, schema v24 committed** — `docs/equal-information-channel-spec.md` `[hot]`
- **Blog: Einstein-Freud post submitted to unratified-agent** — transport `blog-einstein-freud` `[hot]`
- **Cogarch upgrade: PENDING** — 5 invariants + EIC + processual PSQ need propagation `[hot]`
- Monistic deepening items 2-4: maqasid + capabilities + Whitehead concrescence `[warm]`

**In-session remaining:**
1. Cogarch self-upgrade (propagate invariants, EIC, processual findings)
2. Patch rollout to operations-agent via transport
3. Monistic deepening: maqasid × process monism, capabilities bridge, Whitehead × crystallization
4. /cycle at session end


## Memory Hygiene

- **Topic files over monolith** — MEMORY.md stays under 60 lines; detail goes to topic files
- **Don't duplicate CLAUDE.md** — MEMORY.md complements stable conventions, doesn't repeat them
- **No duplicate entries** — check before writing; update existing entries rather than appending
- **Don't persist speculation as fact** — only confirmed decisions land in memory files
- **Update or remove wrong memories** — outdated entries are worse than no entry
- **200-line hard limit on MEMORY.md** — system truncates 201+ silently. Topic files have no limit
- **Test skills after creating them** — skills created mid-session don't load until restart


## User Preferences

- **Identity: psychology agent first** — this agent operates as a psychology agent,
  not a coding assistant that happens to know psychology. The discipline comes first;
  engineering serves it. Frame responses through a psychological lens by default.
- **Blog posts require five personas** — voter (8th grade), politician (staff-briefing),
  educator (pedagogical), researcher (methods+citations), developer (architecture).
  All from safety-quotient-lab's perspective, routed through unratified-agent.
- **Trigger naming:** plain-language label first, T-numbers in parenthetical position only.
- **Cogarch baseline summary:** every session start — hook enforces mechanically.
- **AskUserQuestion tool:** Always use the `AskUserQuestion` tool when seeking
  clarification or asking questions — never ask inline as plain text.
- **Remote deployment via SSH/SCP:** SSH into chromabook for operational tasks
  (deploy scripts, install cron, restart services). PRs preferred for code changes
  that benefit from review; SCP acceptable for deploying shared scripts that
  originate from psychology-agent canonical source.

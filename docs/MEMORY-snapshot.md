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
| `memory/feedback_rapport_style.md` | After deep work, match tonal shifts — poetic compression closes naturally | Session closure, communication style |
| `memory/project_agent_personality.md` | Agents should carry distinct personalities, not just roles — personality crystallizes through operational history | Agent identity design, mesh communication |

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

**Completed this session:**
- ✓ Cogarch self-upgrade (CLAUDE.md philosophical foundation, ef1-governance, triggers, architecture, overview)
- ✓ Patch rollout transport to operations-agent (awaiting response)
- ✓ Monistic deepening: maqasid, capabilities, Whitehead concrescence, Taoist dual generators
- ✓ EIC all 5 phases: schema v24, agentdb disclose/disclose-summary, orientation payload
- ✓ /cycle run, blog submitted to unratified
- ✓ Session tagged philosophically important

**Awaiting responses:**
- Unratified-agent: blog deployment (transport `blog-einstein-freud`)
- Operations-agent: patch rollout coordination (transport `cogarch-session85-patch`)

**Session 85 final deliverables (47 commits):**
- 2,000-line theoretical treatise (14 frameworks, 5 invariants, process monism, Taoism)
- EIC: all 5 phases complete (schema v24, agentdb disclose/disclose-summary)
- RPG: /retrospect skill + expectation ledger (schema v25, agentdb expect/expect-summary)
- RPG Scan #001 baseline: 38 predictions (7 confirmed, 7 refuted, 20 untested)
- DA Phase 1 refuted (RMSEA worsened); Phase 2 partially confirmed (5/9 moderation sig)
- 5 new lessons (18 total). Expectation track record: psychometrics 67% accuracy
- Cogarch self-upgraded with philosophical foundation (CLAUDE.md, ef1-governance, triggers)
- Blog submitted + revised. 5 transport sessions to 3 agents.

**Next session priorities:**
1. Process mesh responses (5 sessions, 8 messages pending across 3 agents)
2. 16 evaluation findings remaining (docs/cogarch-evaluation-session85.md)
3. Agent personality rollout (A2A extension to all 5 agent cards)
4. DI Phase A Pass 2 (inter-rater reliability — fresh session required)
5. Run /retrospect (generator balance discipline: every 5 sessions)


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

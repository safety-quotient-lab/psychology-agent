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

**Where we stopped:** Session 86. Mesh sync, PR batch, psq-scoring backlog,
DA moderator green light, README + COLOPHON, state.db rebuild.

**Completed Session 86:**
- ✓ /sync full sweep — 30 inbound messages processed from psq-agent
- ✓ 10 PRs merged (#165-#169, #173, #156-#157, #151, #175), 2 closed (#149-#150 naming collision)
- ✓ PR #158 rebased and merged (A2A protocolVersion 0.3.0 agent-card)
- ✓ psq-scoring backlog: 17 messages batch-processed (v37, calibration-v4, bifactor, cogarch adoption)
- ✓ DA moderator Phase 1 green-lighted to psq-agent (psq-processual-studies T3)
- ✓ Self-readiness audit R4 tally PR #74 opened on observatory repo
- ✓ /diagnose L3: state.db rebuilt v22→v25, 9 missing tables restored
- ✓ README updated: philosophical foundation, core principles, dependencies, references
- ✓ COLOPHON.md created: full production record
- ✓ Operations-agent directives received (mesh-parity-v2, git-sync-convention, model-upgrade, infrastructure-separation)
- ✓ Microglial audit generator: scripts/microglial-audit.py + autonomous-sync.sh integration
- ✓ Blog series submitted: 4-part ICESCR voter education + March 6 senator post update + connections spec + T4 correction
- ✓ Mesh diagnostic ACK sent to operations-agent

**Awaiting responses:**
- Observatory-agent: R4 session-close (PR #74 pending merge/sync)
- PSQ-agent: DA moderator Phase 1 results
- Operations-agent: mesh-parity-v2 remaining items (P2 non-empty subject, P3 cogarch.config.json)

**Next session priorities:**
1. Process operations-agent directives (infrastructure-separation proposal, neuroglial cogarch proposal)
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

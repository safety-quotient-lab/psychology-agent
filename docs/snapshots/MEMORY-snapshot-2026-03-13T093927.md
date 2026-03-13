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

## Active Thread (2026-03-12)

**Context:** This agent operates as the **psychology agent** (collegial mentor,
discipline-first) with specialized sub-agents and an adversarial evaluator.

**Where we stopped:** Session 83 (final). All work complete. PRs merged, proposals sent,
problem reports filed. Clean stopping point.

**Status by tier** (hot = system prompt / warm = SQL query / cold = file read):
- Crystallized sync: ✓ Steps 1-7 complete + deployed. 52% rate on 123 msgs `[warm]`
- agentdb: ✓ Phases 1-5 complete. Phase 6 (Python cleanup) eligible 2026-03-19 `[warm]`
- SSE dashboards: ✓ Both meshd (Go) and mesh-status.py (Python) serve /events `[warm]`
- Operations-agent: ✓ Turns 1-6 done. Naming convention proposal sent. `[hot]`
- Self-readiness audit: ⚑ R4 — psych+unrat READY, psq NOT-READY (4A blocks) `[hot]`
- Blog crystallized sync: ⚑ Post 404 — frontmatter mismatch, problem report sent `[hot]`
- ZMQ transport: ✓ Merged to main. All 5 meshd instances running with gossip `[warm]`

**Next session priorities:**
1. Check transport for unratified-agent frontmatter fix
2. Check operations-agent naming convention approval
3. Monitor psq-agent 4A/8BCD remediation for R4 closure


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

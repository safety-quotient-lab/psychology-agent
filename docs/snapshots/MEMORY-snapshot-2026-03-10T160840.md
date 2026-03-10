# Psychology Project Memory

**Architecture:** index + topic files. MEMORY.md = always-loaded index (~55 lines).
Topic files read on demand by T1 (session start) and /cycle (Step 7).

## Topic Files

| File | Content | Read when |
|------|---------|-----------|
| `memory/decisions.md` | Design decisions table + authority hierarchy | T1 session start; decision-making |
| `memory/cogarch.md` | Trigger quick-ref, knock-on depth, adjudication, working principles | T1 session start; before recommending |
| `memory/psq-status.md` | PSQ sub-agent calibration, deploy status, open issues | PSQ work in this context (rare) |
| `memory/cognitive-triggers.md` | Legacy — full trigger descriptions (canonical: `docs/cognitive-triggers.md`) | Superseded; read canonical instead |

## Active Thread (2026-03-10)

**Context:** This agent operates as the **psychology agent** (collegial mentor,
discipline-first) with specialized sub-agents and an adversarial evaluator.

**Where we stopped:** Session 64. Federated dashboard with claude-replay,
safety-quotient.dev domain, cross-machine code policy (PRs only).

**Status by tier** (hot = system prompt / warm = SQL query / cold = file read):
- Dashboard: ✓ 3 tabs (Mesh/Semiotics/Replays), launchd service, nav header `[warm]`
- Domain: ✓ safety-quotient.dev purchased, discovery URLs migrated `[warm]`
- Autonomous mesh: ✓ full pipeline (fetch→index→auto-process→pre-flight→sync) `[warm]`
- PRs pending: #4 (autonomous-sync), #5 (dashboard), #6 (domain) to safety-quotient `[warm]`
- Lesson lifecycle: ✓ 17/25 graduated `[warm]`
- DI Phase A Pass 2: pending (fresh session) `[cold]`

**Next:** Configure DNS records (psq, api, psychology-agent subdomains).
Merge PRs #4/#5/#6 on safety-quotient. Naming audit (safety-quotient agent →
psq-agent). DI Phase A Pass 2.


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
- **Blog posts require five personas** — every topic produces posts for: voter,
  politician, educator, researcher, developer. All from safety-quotient-lab's
  perspective, routed through unratified-agent. Reading levels by persona:
  voter (8th grade, plain language, concrete analogies), politician (professional
  staff-briefing level, actionable), educator (pedagogical framing with discussion
  prompts), researcher (methods-and-findings, citations, epistemic flags),
  developer (architecture deep-dive, implementation detail, code references).
- **Trigger naming in conversation:** Always refer to triggers by their firing condition
  ("Before recommending," "Session starts") as the primary label. T-numbers go in
  parenthetical position only.
- **Cogarch baseline summary (every session):** At session start, read
  `docs/cognitive-triggers.md` and output the compact cogarch baseline summary as the
  first visible action. Hook enforces this mechanically.
- **AskUserQuestion tool:** Always use the `AskUserQuestion` tool when seeking
  clarification or asking questions — never ask inline as plain text.
- **No direct remote edits:** Never SSH into remote machines to edit files directly.
  Use PRs to communicate code changes to other agents/machines. PRs provide audit
  trail, review opportunity, and rollback capability.

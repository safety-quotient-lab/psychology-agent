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

## Active Thread (2026-03-08)

**Context:** User wants this agent to be the **psychology agent** (collegial mentor) with:
1. Specialized sub-agents (PSQ is the first)
2. A consensus-or-parsimony adversarial evaluator

**Where we stopped:** Session 38. EF-2 claim verification tracker created
(`docs/claim-verification-log.json`, 1/10 exchanges). EF-1 evaluated — zero autonomous
pressure, correctly deferred. TODO.md Sonnet re-score corrected to 10 dims.
**Next:** Await psq-agent ACK on gate resolution (T14) → Sonnet re-score (10 dims, ~10
sessions). B3 recalibration. User considering delegating all safety-quotient work to psq-agent —
if so, psychology-agent focuses on awesome-cc submission, EF-2 tracking, interface investigation.


## Memory Hygiene

- **Topic files over monolith** — MEMORY.md stays under 60 lines; detail goes to topic files
- **Don't duplicate CLAUDE.md** — MEMORY.md complements stable conventions, doesn't repeat them
- **No duplicate entries** — check before writing; update existing entries rather than appending
- **Don't persist speculation as fact** — only confirmed decisions land in memory files
- **Update or remove wrong memories** — outdated entries are worse than no entry
- **200-line hard limit on MEMORY.md** — system truncates 201+ silently. Topic files have no limit
- **Test skills after creating them** — skills created mid-session don't load until restart


## User Preferences

- **Trigger naming in conversation:** Always refer to triggers by their firing condition
  ("Before recommending," "Session starts") as the primary label. T-numbers go in
  parenthetical position only.
- **Cogarch baseline summary (every session):** At session start, read
  `docs/cognitive-triggers.md` and output the compact cogarch baseline summary as the
  first visible action. Hook enforces this mechanically.
- **AskUserQuestion tool:** Always use the `AskUserQuestion` tool when seeking
  clarification or asking questions — never ask inline as plain text.


## Stable Conventions

Communication conventions, cognitive accessibility policy, project structure: see CLAUDE.md.

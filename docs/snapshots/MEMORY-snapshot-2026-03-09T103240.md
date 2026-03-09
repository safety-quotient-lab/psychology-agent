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

## Active Thread (2026-03-09)

**Context:** This agent operates as the **psychology agent** (collegial mentor,
discipline-first) with specialized sub-agents and an adversarial evaluator.

**Where we stopped:** Session 47 (continued). All psq-scoring work orders
complete — B3, B5, B5-R, B5-S (M5 final), B4 partial correlations accepted.
SQLite state layer designed: schema.sql committed, .claude/rules/sqlite.md
committed, SL-1 work order sent to psq-agent (turn 42 — bootstrap_state_db.py).
Synrix evaluation complete; 4 small improvements implementing now.

**Status by tier** (hot = system prompt / warm = SQL query / cold = file read):
- PSQ scoring: all work orders complete, session quiescent `[hot: no action needed]`
- SQLite state layer: SL-1 awaiting psq-agent delivery `[warm: query transport_messages]`
- DI Phase A Pass 2: pending (inter-rater reliability) `[cold: docs/dignity-phase-a-study.md]`
- Unratified: scan-010 ACK outstanding `[warm: query transport_messages WHERE processed=FALSE]`

**Next:** Finish Synrix-inspired small items (tiered access, scope boundaries,
postmortem format, deterministic keys). Then schema extension discussion.
Await psq-agent: SL-1 bootstrap script.


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

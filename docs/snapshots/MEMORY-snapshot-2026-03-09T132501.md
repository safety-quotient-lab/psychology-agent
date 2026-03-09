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

**Where we stopped:** Session 51. SL-2 dual-write live (/sync + /cycle write
to state.db). Optional ACK protocol (ack_required flag). README zero-to-demo
quickstart with 5 accordion demos. 21 hooks registered. Schema v5.

**Status by tier** (hot = system prompt / warm = SQL query / cold = file read):
- PSQ scoring: all work orders complete, quiescent `[hot: no action needed]`
- SQLite state layer: SL-2 ✓ dual-write live, schema v5 `[warm: dual_write.py]`
- EF-1 trust model: ✓ resolved — governance + trust model + psychological foundations
- DI Phase A Pass 2: pending (inter-rater reliability) `[cold: docs/dignity-phase-a-study.md]`
- PSQ cogarch mirror: work order sent (T44), gate open (T45), awaiting response
- De-branding: exploratory TODO added, no precondition `[cold: TODO.md]`

**Next:** Blog §34 ("Who Watches the Watcher?" — 5 personas). Await psq-agent
cogarch mirror response. DI Phase A Pass 2 (fresh session). De-branding inventory.


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
  perspective, routed through unratified-agent.
- **Trigger naming in conversation:** Always refer to triggers by their firing condition
  ("Before recommending," "Session starts") as the primary label. T-numbers go in
  parenthetical position only.
- **Cogarch baseline summary (every session):** At session start, read
  `docs/cognitive-triggers.md` and output the compact cogarch baseline summary as the
  first visible action. Hook enforces this mechanically.
- **AskUserQuestion tool:** Always use the `AskUserQuestion` tool when seeking
  clarification or asking questions — never ask inline as plain text.

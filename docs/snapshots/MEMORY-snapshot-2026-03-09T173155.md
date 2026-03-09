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

**Where we stopped:** Session 57. Hook error investigation (transient), configurable
debug logging (all 17 hooks), README maturity table recalibrated (3 downgrades),
editorial complaints noted (governance theater, name-dropping → ideas.md).

**Status by tier** (hot = system prompt / warm = SQL query / cold = file read):
- Cogarch portability: ✓ COMPLETE `[cold: done]`
- CLAUDE.md: ✓ trimmed to 186 lines (below ~200 advisory) `[hot: healthy]`
- PSQ scoring: all work orders complete, quiescent `[hot: no action needed]`
- SQLite state layer: SL-2 ✓ dual-write live, schema v5, auto-bootstrap on session start `[warm]`
- PSQ cogarch mirror: Phase 2 ✓ COMPLETE, Phase 3 → autonomous-op prerequisite `[hot]`
- DI Phase A Pass 2: pending (inter-rater reliability) `[cold: docs/dignity-phase-a-study.md]`
- Hook debug logging: ✓ COMPLETE — toggle via `.claude/hooks/.debug` `[cold: done]`

**Next:** DI Phase A Pass 2 (fresh session). First autonomous sync cycle (unblocks
cross-agent faceted queries).


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

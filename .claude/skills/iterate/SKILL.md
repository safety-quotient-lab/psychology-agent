---
name: iterate
description: Unified work loop — sync, hunt, discriminate, execute, cycle. One command does everything.
user-invocable: true
argument-hint: "[quick | deep | domain-filter]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent, WebFetch
---

# Iterate — Autonomous Work Discovery + Execution

Find the single most important thing to do next, then do it.

```
/sync      = check for inbound activity
/hunt      = discover candidates, present to user
/iterate   = sync → hunt → discriminate → execute → cycle
```

The user types `/iterate` and the next most important thing gets worked on.

---

## Arguments

| Argument | Behavior |
|---|---|
| *(empty)* | Full hunt → discriminate → execute |
| `quick` | Quick-wins hunt → discriminate → execute (XS/S items only) |
| `deep` | Deep hunt → discriminate → execute |
| `[domain-filter]` | Hunt filtered to that domain → discriminate → execute |

---

## Protocol

### Phase 0: Sync (compressed)

Run a quick sync internally — not user-facing output, just input to the hunt.

1. `git fetch origin` — new remote commits?
2. `git log HEAD..origin/main --oneline` — anything landed?
3. `ls -t transport/sessions/*/from-*.json | head -5` — new inbound messages?
4. `gh pr list --state open` — open PRs?

If sync finds actionable items, they become candidates in Phase 1.
If clean, proceed silently.

### Phase 1: Hunt (compressed)

Run /hunt internally — not user-facing, but as input to the discriminator.

- Read plan.md, MEMORY.md, transport sessions
- Scan for candidates across all hunt sources
- **Cap at 5 candidates.** Pre-filter to highest value/effort ratio.

Output: internal candidate list.

**Exit condition:** If zero candidates, report "Project clean. No actionable
work found." and stop.

**Single-candidate shortcut:** If only 1 candidate, skip Phase 2 and execute.

### Phase 2: Discriminate

For each candidate (up to 5), run a **2-order inline knock-on**:

```
Order 1 (certain):        Direct, immediate effect of doing this
Order 2 (certain-likely):  What does Order 1 activate or unblock?
```

Apply the **4-mode discriminator** to select the winner:

**Mode 1: Consensus** — Do multiple candidates converge on the same need?

**Mode 2: Pragmatism** — Which produces the most useful result right now?
Favors: items that unblock others, items with external visibility, items
that close open loops (transport messages awaiting response).

**Mode 3: Parsimony** — When similar value, the simplest one wins.

**Mode 4: Bare** — No differentiation above. Pick highest value/effort ratio.

**Substance gate:** If the winner changes what gets built, published, or
committed to, surface to user with recommendation before executing.

### Phase 3: Execute

Do the work. Follow all project conventions during execution.

| Item type | Execute means |
|---|---|
| Documentation fix | Edit the file, verify consistency |
| Transport message | Draft and deliver the response |
| Compositor change | Modify worker.js or index.html, test locally |
| Vocabulary governance | Update vocab.json, draft schema proposal |
| Agent card update | Modify agent-card.json and cogarch.config.json |
| Schema compliance | Draft compliance report for peers |

### Phase 4: Close

1. **Report what was done** — 2-3 sentences
2. **State what changed** — which files modified
3. **Runner-up note** — "Next highest-value item: [runner-up]"
4. **Auto-/cycle** — run /cycle to propagate changes and commit

---

## Chaining

`/iterate` can run repeatedly. Each call re-hunts from current state.
Each /iterate auto-cycles at close, leaving a clean committed state.

---

## Anti-patterns

- **Hunting for 10 minutes on a 2-minute fix** — cap hunt at 3 minutes
- **Presenting candidates to the user** — that's /hunt's job; /iterate decides
- **Executing substance decisions without surfacing** — always confirm first
- **Skipping /cycle** — every /iterate leaves a clean committed state

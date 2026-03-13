---
name: doc
description: Mid-work documentation — persist decisions, findings, and reasoning to the right file before context fills up.
user-invocable: true
argument-hint: "[what to document, e.g. 'schema reconciliation decision', 'compositor deploy change']"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Doc — Mid-Work Documentation Persistence

Capture what just happened — decisions, findings, design choices, reasoning — and
write it to the correct file on disk before context compression loses it.

**Design principle:** `/doc` complements `/cycle`. Where `/cycle` runs post-hoc
("we're done, update everything"), `/doc` runs mid-work ("something worth
remembering just happened — save it now").

**When to trigger:**
- A design decision was made or resolved
- A finding emerged from analysis or discussion
- Context usage exceeds 50% and substantive work hasn't been persisted
- The agent holds reasoning that only exists in conversation

**When NOT to trigger:**
- Trivial exchanges (greetings, clarifications)
- Work that /cycle will handle at session end
- Information already on disk (check before writing)

---

## Phase 1: Identify What to Document

Parse `$ARGUMENTS` and recent conversation context:

1. **What happened** — the decision, finding, or reasoning to persist
2. **Type classification:**

| Type | Examples | Destination |
|---|---|---|
| Decision | "compositor uses Web Components" | plan.md (public) + MEMORY.md (private) |
| Finding | "psq-agent card missing protocolVersion" | lab-notebook.md (private) |
| Convention | "all agent cards require security field" | vocab.json (public) + CLAUDE.md (public) |
| Status update | "Phase 2 deploy complete" | plan.md (public) + lab-notebook.md (private) |
| Architecture insight | "dynamic discovery via KV cache" | journal.md (private) + plan.md (public) |
| Lesson | "session replay reveals transport asymmetry" | lessons.md (private) |
| Cogarch change | "new trigger for vocabulary governance" | cognitive-triggers.md (private) |

3. **Novelty check** — read the target file first. If already captured,
   report "already documented at [location]" and stop.

---

## Phase 2: Determine Where to Write

Two layers: public (repo) and private (auto-memory).

### Decision tree

```
Stable convention or mesh-wide policy?
  → Public: CLAUDE.md or interagent/vocab.json

Phase milestone or decision?
  → Public: plan.md (status + decisions table)
  → Private: MEMORY.md (active thread) + lab-notebook.md (session entry)

Agent-card or discovery change?
  → Public: .well-known/agent-card.json + cogarch.config.json

Significant reasoning or conceptual insight?
  → Private: journal.md (narrative section)

Transferable pattern error or architecture insight?
  → Private: lessons.md (with YAML frontmatter)

Cogarch trigger change?
  → Private: cognitive-triggers.md

Status update on where we stand?
  → Public: plan.md (Current Status — overwrite)
  → Private: lab-notebook.md (Current State — overwrite)

Transport-related (session, message, gate)?
  → Public: transport/sessions/{session}/
  → Private: lab-notebook.md (note the message)
```

### File locations

**Public (repo):**
- `plan.md` — phases, decisions, status
- `.well-known/agent-card.json` — mesh discovery
- `cogarch.config.json` — cognitive architecture
- `CLAUDE.md` — stable conventions
- `interagent/vocab.json` — shared vocabulary
- `transport/sessions/` — interagent messages

**Private (auto-memory: `~/.claude/projects/.../memory/`):**
- `MEMORY.md` — index, active thread, pointers
- `lab-notebook.md` — session log, current state
- `journal.md` — research narrative
- `lessons.md` — lessons learned
- `cognitive-triggers.md` — trigger system T1–T8+

---

## Phase 3: Write

1. **Read the target file first.** Understand its current structure.
2. **Match existing style.** Plan.md uses checkbox lists; lab-notebook uses tables.
3. **Overwrite status, append findings.** Status lines get replaced; new entries append.
4. **Keep MEMORY.md under 200 lines.**
5. **Cross-reference.** Link between public and private docs where relevant:
   "See journal.md §N" in lab-notebook; "See plan.md Phase 2" in MEMORY.md.

---

## Phase 4: Confirm

```
Documented: [1-line summary of what was written]
Public:     [file path(s) updated in repo]
Private:    [file path(s) updated in auto-memory]
Action:     [created | updated | already documented]
```

If context usage exceeds 60%, suggest running `/cycle` soon.

---
name: hunt
description: Systematic work discovery — scan plan.md, transport, compositor, vocabulary for highest-value next work.
user-invocable: true
argument-hint: "[all | quick | blocked | compositor | vocabulary | transport]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# Hunt — Systematic Work Discovery (Operations Agent)

Find the highest-value next work in the operations-agent project.
Aggregates all the ways you'd search for "what's next" into one structured sweep.

---

## Trigger Phrases

- "what's next?" / "what else?" / "what can we do?"
- "find work" / "anything to do?"
- "what should I focus on?" / "what's highest value?"

---

## Arguments

| Argument | Constraint |
|---|---|
| *(empty)* or `all` | Full sweep — all sources, rank by value |
| `quick` | Only items that take <5 minutes |
| `blocked` | Show what's blocked and what would unblock it |
| `compositor` | Focus on compositor work (Web Components, deploy) |
| `vocabulary` | Focus on vocabulary governance work |
| `transport` | Focus on transport sessions and open gates |

---

## Phase 1: Establish Context

1. **Read `plan.md`** — current status, phase checklists, decisions
2. **Read `MEMORY.md`** — bootstrap status, pending items
3. **Read `cogarch.config.json`** — identity, capabilities, peers
4. **Check transport sessions** — open gates, unprocessed messages

Build a mental model of: **what's active, what's done, what's blocked, what's untouched**.

---

## Phase 2: Scan Sources

### Source 1: Plan.md Phase Checklists

- Extract all unchecked `- [ ]` items across all phases
- Note dependencies (does completing X unblock Y?)
- Flag items whose prerequisites are now met
- Note items sitting without a blocking reason — may represent stale work

### Source 2: Transport Sessions

- Scan `transport/sessions/` for open action gates
- Check for unanswered messages (`ack_required: true` without response)
- Check for proposals awaiting our decision as vocabulary governor

### Source 3: Compositor State

- Check `interagent/` for TODO comments or incomplete implementations
- Verify deployed compositor matches local code
- Check for Web Component decomposition opportunities (Phase 2 remaining)
- Jenkins pipeline setup status

### Source 4: Vocabulary Governance

- Read `interagent/vocab.json` — completeness, consistency
- Check for terms used across agent cards that lack vocab definitions
- Check agent-card schema compliance proposal status (T7 open gate)

### Source 5: Agent Card Consistency

- Fetch live agent cards from all peers
- Compare against proposed minimum schema (from T7)
- Identify compliance gaps

### Source 6: Documentation Drift

- **plan.md vs. reality** — do the phase checklists match actual state?
- **MEMORY.md vs. plan.md** — consistent?
- **agent-card.json vs. cogarch.config.json** — peers match?
- **CLAUDE.md** — skills section up to date?

---

## Phase 3: Classify & Rank

For each candidate, assign:

### Value Rating

- **HIGH**: Unblocks phase work, resolves open gates, fixes mesh-wide
  consistency issues
- **MED**: Improves documentation, fills vocabulary gaps, compositor polish
- **LOW**: Style improvements, minor reorganizations

### Effort Rating

- **XS**: <2 minutes (fix a reference, update a date)
- **S**: 2–10 minutes (single-file update, write an ACK)
- **M**: 10–30 minutes (Web Component extraction, vocab schema draft)
- **L**: 30+ minutes (Jenkins pipeline, full vocabulary governance workflow)

### Orthogonality

- **SAFE**: Doesn't touch any in-flight files
- **ADJACENT**: Touches related but not identical files
- **OVERLAPPING**: Would conflict with in-flight work — defer

---

## Phase 4: Present Results

```
## Hunt Results

**Context:** [1-line summary of what's in-flight]
**Current phase:** [from plan.md]

### Top Picks (recommended next)
1. **[Subject]** — [1-line description]
   Value: HIGH | Effort: S | Where: `path/to/file`

2. **[Subject]** — [1-line description]
   Value: MED | Effort: XS | Where: `path/to/file`

### Open Gates (transport)
- **[Gate]** — [condition, status]

### Blocked (needs unblocking first)
- **[Item]** — blocked by: [what]
```

### Presentation Rules

- **Max 10 items** in Top Picks
- **Bold the subject**, one-line descriptions
- **Always include effort estimate**
- **End with a recommendation:** "I'd suggest starting with #1 because [reason]"

---

## Phase 5: Offer Next Steps

- "Want me to tackle #1–3 (quick wins)?"
- "Want me to draft a response to the open gate?"
- "Want me to run `/doc` to persist these findings?"

If no meaningful work found:
"Project in good shape. Next meaningful work requires [prerequisite]."

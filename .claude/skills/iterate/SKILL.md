---
name: iterate
description: Find next highest-value work and do it. Hunt → 2-order knock per candidate → discriminate → execute.
user-invocable: true
argument-hint: "[quick | deep | domain-filter]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent, AskUserQuestion, WebFetch
---

# Iterate — Autonomous Work Discovery + Execution

Find the single most important thing to do next, then do it.

```
/hunt      = discover candidates, present to user
/iterate   = discover → evaluate → discriminate → execute
```

The user types `/iterate` and the next most important thing gets worked on.

---

## Arguments

Parse `$ARGUMENTS` to determine scope:

| Argument          | Behavior |
|-------------------|----------|
| *(empty)*         | Full hunt → discriminate → execute |
| `quick`           | Quick-wins hunt → discriminate → execute (XS/S items only) |
| `deep`            | Deep/extrapolate hunt → discriminate → execute |
| `[domain-filter]` | Hunt filtered to that domain → discriminate → execute |

---

## Protocol

### Phase 1: Hunt (compressed)

Run /hunt internally — not as a user-facing presentation, but as input to the
discriminator. Use the `/hunt` protocol (Sources 1-8) but compress output:

- Read TODO.md, MEMORY.md Active Thread, lab-notebook.md Current State
- Scan for candidates across all hunt sources
- **Cap at 5 candidates.** If hunt surfaces more, pre-filter to the 5 with
  highest value/effort ratio before proceeding to Phase 2.

Output of Phase 1 is an internal candidate list, not user-facing. Format:

```
Candidate 1: [action] — Value: H/M/L, Effort: XS/S/M/L, Source: [where found]
Candidate 2: ...
...
```

**Exit condition:** If hunt finds zero candidates, report "Project is clean.
No actionable work found." and stop.

**Single-candidate shortcut:** If only 1 candidate surfaces, skip Phase 2
and go directly to Phase 3 (execute). No need to discriminate between one option.

### Phase 2: Discriminate

For each candidate (up to 5), run a **2-order inline knock-on**:

```
Order 1 (certain):        What is the direct, immediate effect of doing this?
Order 2 (certain-likely):  What does Order 1 activate or unblock?
```

Then apply the **4-mode discriminator** to select the winner:

#### Discriminator Modes (applied in cascade — first match wins)

**Mode 1: Consensus**
Do multiple candidates converge on the same underlying need? If 3 of 5
candidates all point to the same gap (e.g., "citations needed," "docs stale"),
the consensus item is the winner — it's the system telling you what matters.

**Mode 2: Pragmatism**
Which candidate produces the most useful result right now? Not theoretically
highest-value, but most practically impactful given current state. Favors:
- Items that unblock other items (dependency resolution)
- Items with immediate external visibility (fixes live on a public site)
- Items that close open loops (transport messages awaiting response)

**Mode 3: Parsimony**
When multiple candidates have similar value, the simplest one wins. Fewest
files touched, least coupling, most reversible, lowest cognitive overhead.
"Three similar lines of code is better than a premature abstraction."

**Mode 4: Bare**
No consensus, no clear pragmatic winner, no parsimony distinction. Pick the
highest value/effort ratio. If still tied, pick the one closest to the
Active Thread (continuity over context-switching).

#### Discriminator Output

```
Candidates evaluated: N
Discriminator mode: [consensus | pragmatism | parsimony | bare]
Winner: [Candidate N] — [1-line reason]
Runner-up: [Candidate M] — [why it lost]
```

**Substance gate (T3):** If the winner is a substance decision (changes what
gets built, published, or committed to), surface to user with recommendation
before executing. Process decisions (ordering, formatting, documentation
maintenance) proceed autonomously.

### Phase 3: Execute

Do the work. The winner from Phase 2 becomes the active task.

**Execution rules:**
- Follow all cogarch triggers (T1-T16) during execution
- Use /doc if the work produces decisions or findings worth persisting
- If execution reveals that the item is larger than estimated (S estimated
  but actually M/L), pause and surface to user: "This is bigger than expected.
  [description of scope expansion]. Continue or defer?"
- If execution completes cleanly, proceed to Phase 4

**What "execute" means by item type:**

| Item type | Execute means |
|-----------|---------------|
| Documentation fix | Edit the file, verify consistency |
| Cogarch gap | Draft trigger language, add to cognitive-triggers.md |
| Stale reference | Fix or remove the reference |
| Missing spec | Draft the spec section in the appropriate doc |
| Transport message | Draft and deliver the message |
| Code fix | Make the change, test if applicable |
| Research question | Investigate, write findings to journal or lab-notebook |
| Skill creation | Write the skill, note it needs restart to load |

### Phase 4: Close

After execution:

1. **Report what was done** — 2-3 sentences, not a wall of text
2. **State what changed** — which files were modified
3. **Runner-up note** — "Next highest-value item is [runner-up] if you
   want to /iterate again."
4. **Do NOT auto-/cycle** — /iterate is a single work unit. The user
   decides when to /cycle. Multiple /iterate calls can accumulate before
   a single /cycle.

---

## Chaining

`/iterate` can be called repeatedly. Each call is independent — it re-hunts
from current state (which now includes whatever the previous /iterate changed).

The user can type `/iterate` three times in a row and get three pieces of work
done, then `/cycle` once to propagate all changes.

---

## Anti-patterns

- **Hunting for 10 minutes on a 2-minute fix** — if the hunt phase takes
  longer than the estimated execution, the overhead exceeds the value.
  Cap hunt at 3 minutes wall-clock equivalent (limit source reads).
- **Presenting candidates to the user** — that's /hunt's job. /iterate
  decides and executes. The user sees the result, not the menu.
- **Executing substance decisions without surfacing** — T3 still applies.
  /iterate is autonomous for process decisions, not for "should we change
  the architecture" decisions.
- **Running /cycle after every /iterate** — /iterate is a work unit, not
  a session. Accumulate, then /cycle.
- **Discriminating between 1 candidate** — if there's only one option,
  just do it. The discriminator is for choosing between alternatives.

---

## Integration

| Context | How /iterate interacts |
|---------|----------------------|
| `/hunt` | /iterate runs /hunt internally as Phase 1. If the user wants to see candidates without executing, they use /hunt directly. |
| `/knock` | /iterate runs 2-order inline knock per candidate in Phase 2. If deeper analysis is needed, the user runs /knock directly. |
| `/adjudicate` | If Phase 2 reveals a genuine M/L decision between candidates (not just prioritization), /iterate escalates to /adjudicate and pauses for user input. |
| `/cycle` | /iterate does NOT auto-cycle. The user cycles when ready. |
| `/doc` | /iterate may invoke /doc during Phase 3 if execution produces findings worth persisting. |
| `/sync` | /iterate may invoke /sync if the winner involves transport. |

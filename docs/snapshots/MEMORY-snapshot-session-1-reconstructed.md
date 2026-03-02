<!-- RECONSTRUCTED — approximation of end-of-Session-1 state (2026-03-01) -->
<!-- Source: lab-notebook.md Session 1, journal.md §1–5, docs/architecture.md -->
<!-- Original overwritten by subsequent /cycle runs before versioning existed. -->
<!-- Substance recoverable from primary sources; phrasing approximate.         -->
<!-- Labeled reconstruction per scientific integrity protocol (cost: fidelity, -->
<!-- gain: integrity — better a labeled approximation than a silent gap).       -->

# Psychology Project Memory

## Active Thread (2026-03-01)

**Context:** User wants this agent to be a **general-purpose psychology agent** (collegial mentor) with:
1. Specialized sub-agents (PSQ is the first)
2. A consensus-or-parsimony adversarial evaluator

**Where we stopped:** Design decisions resolved and persisted to `docs/architecture.md`.
`/doc` skill created at `.claude/skills/doc/SKILL.md`. `CLAUDE.md` created at project root.
Restarting session to load `/doc` skill.

**Next:** Resolve three pre-architecture open questions, then architecture items 1–3:
1. Socratic protocol — does it adapt by audience type? How?
2. Sub-agent implementation — staging vs. full API integration?
3. Machine-to-machine callers — is the protocol fundamentally different?

Architecture items:
1. General agent design (prompt, identity, routing logic, Socratic protocol)
2. Sub-agent protocol (plug-in, communication, scope declaration)
3. Adversarial evaluator (tiered activation, parsimony reasoning, overreach detection)


## Design Decisions

```
 Decision                    Choice
──────────────────────────────────────────────────
 Use cases                   All (text analysis, research, applied consultation)
 Sub-agent implementation    Undecided — discuss trade-offs during architecture
 Audience                    Self, clinicians, researchers, public, other agents
 PJE role                    Case study — first real-world application, not a sub-agent
 Evaluator trigger           Tiered (lightweight default, escalate on disagreement)
 Agent-to-agent protocol     Natural language
 Future sub-agents           Extensible plug-in architecture, none pre-committed
 Disagreement stance         Socratic (guide user to discover, never tell)
 Model                       Opus — most capable Claude model
```


## Authority Hierarchy

1. **User** = source-of-truth agent. Final authority on what gets pursued, published, or discarded.
2. **General agent** = advisory, Socratic. Analyzes, challenges, synthesizes — does not decide.
3. **Sub-agents** (PSQ, future) = domain experts. Their content is subject to scrutiny.
4. **Adversarial evaluator** = quality control. Can challenge any sub-agent.

**Key principle:** PJE is a hypothesis space, not a specification. The general agent helps
the user sort signal from aspiration — the same way PSQ reduced 71 PJE terms to 10
validated dimensions. PJE is a case study in applying this agent, not a privileged component.


## Memory Hygiene

- **Organize semantically by topic**, not chronologically — memory is reference, not log
- **Don't duplicate CLAUDE.md** — MEMORY.md complements stable conventions, doesn't repeat them
- **No duplicate entries** — check before writing; update existing entries rather than appending
- **Don't persist speculation as fact** — reasoning and knock-on analysis can go as far as needed,
  but only confirmed decisions land in MEMORY.md; flag hypotheses explicitly if they must be saved
- **Update or remove wrong memories** — outdated entries are worse than no entry
- **200-line limit** — if approaching, move detail to a linked file and summarize here
- **Test skills after creating them** — skills created mid-session don't load until restart;
  always verify at session start before relying on them


## Working Principles

### Write to Disk, Not to Context
Always write substantive work to disk as it's produced. Don't accumulate in context
and save at the end. `/doc` handles mid-work persistence.

### Check for Open Work Before Responding
Before moving to the next topic, scan the conversation for unfinished items —
proposed tests, unanswered questions, offered next steps that were accepted but
not executed. Don't leave loose threads.


## Communication Conventions

### Model Policy
**Opus is the canonical model for this agent system.** Opus is used for the general-
purpose agent, adversarial evaluator, and all future sub-agents. The PSQ's existing
training data was scored by Sonnet — historical fact, not a going-forward choice.

### Pedagogical Jargon Policy (default: ON)
Explain jargon, acronyms, and technical terms parenthetically on first use per response.

**Parenthetical rule:** Parentheses ONLY expand the acronym or give a 3–7 word gloss.
The definition belongs in the sentence prose, not inside parentheses.

Good: "The PSQ (Psychoemotional Safety Quotient) measures how safe text is across 10 dimensions."
Bad: "PSQ (Psychoemotional Safety Quotient — a composite measure of how safe text is) is a..."

Rules:
- Define on FIRST use per response; don't repeat in the same message
- Parenthetical = expansion only (3–7 words max inside parens)
- Definition = in the sentence, after or around the parenthetical
- If a term was coined by this project, say so

### Document Format Policy
- **LaTeX** for complex documentation (papers, psychometric reports, formal analyses)
- **Markdown** for standard documentation (lab notebooks, READMEs, memory files)
- Never use Word. Never use plain text when markdown is available.

### Formatting & Whitespace Policy
- **APA-style formatting** adapted for terminal/markdown output
- APA tables: no vertical rules; horizontal rules at top, under headers, and bottom
- 1.618x (golden ratio) whitespace between sections and logical blocks
- ASCII box-drawing for architecture diagrams and structural elements
- Symbols: ✓ ✗ ★ ↑↓≈ ⚑ ⚠ | Severity: ██░░ HIGH, █░░░ MOD, ░░░░ LOW
- In-text citations where referencing established literature (Author, Year)


## Project Structure

- `/home/kashif/projects/psychology/safety-quotient/` — PSQ agent (DistilBERT model)
- `/home/kashif/projects/psychology/pje-framework/` — PJE framework (case study, taxonomy.yaml)
- PSQ has its own CLAUDE.md with full conventions — read it on any safety-quotient session


## PSQ Sub-Agent Status (managed in its own context)

**Readiness needs:** API surface, calibrated confidence, scope boundaries.
**Open issues:** DA validity, confidence anti-calibration, AD compression, CO weakness,
no human validation, WEIRD assumptions.
Do not duplicate PSQ improvement work in this context.

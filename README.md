# General-Purpose Psychology Agent

A collegial mentor for psychological analysis, research, and applied consultation —
built on the PJE (Psychology-Juris-Engineering) framework with specialized
sub-agents and a consensus-or-parsimony adversarial evaluator.

---

## What It Is

A three-layer agent system:

```
General-Purpose Psychology Agent  (collegial mentor, Opus)
  ├── PSQ Agent                   (psychoemotional safety measurement)
  ├── Future sub-agents           (plug-in, none pre-committed)
  └── Adversarial Evaluator       (consensus-or-parsimony, Opus)
```

The general agent synthesizes across sub-agents, routes requests, and maintains
a Socratic stance — guiding users toward discovery rather than delivering verdicts.
The adversarial evaluator preserves disagreement rather than averaging it away.

---

## Sub-Projects

| Directory         | What it is                                          |
|-------------------|-----------------------------------------------------|
| `safety-quotient/`| PSQ agent — DistilBERT v23, held-out r=0.684, 10-dim text-level safety scoring |
| `pje-framework/`  | PJE taxonomy — first case study application         |

---

## Current Status

**Design phase.** Architecture and conventions are established. Three items remain:
1. General agent design (prompt, routing, Socratic protocol)
2. Sub-agent protocol (plug-in, communication, scope declaration)
3. Adversarial evaluator (tiered activation, parsimony reasoning)

See `docs/architecture.md` for the full design record.

---

## Key Conventions

- **Model:** Opus (Claude's most capable model) for all agent roles
- **Disagreement stance:** Socratic — guide, never tell
- **Documentation:** Write to disk as you go; `/doc` for mid-work, `/cycle` for
  post-work
- **Format:** APA-style with 1.618x whitespace; LaTeX for complex docs, markdown
  for standard docs

See `CLAUDE.md` for full conventions and `MEMORY.md` for current project state.

---

## Skills

| Skill    | When          | What                                      |
|----------|---------------|-------------------------------------------|
| `/doc`   | Mid-work      | Persist decisions and findings to disk    |
| `/cycle` | Post-work     | Full documentation chain update + commit  |
| `/hunt`  | Discovery     | Find highest-value next work              |

*Note: `/cycle` and `/hunt` currently reside in `safety-quotient/` — general agent
versions are on the TODO.*

---

## Principal Investigator

Kashif Shah

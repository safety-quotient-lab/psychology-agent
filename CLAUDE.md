# Psychology Project — Claude Code Instructions

This is the **general-purpose psychology agent** project root. It contains
specialized sub-projects (safety-quotient, pje-framework) and shared tooling.

## Skills

- `/doc` — Mid-work documentation persistence. Captures decisions, findings,
  and reasoning to the correct file on disk before context fills up.

## Sub-Projects

- `safety-quotient/` — PSQ agent (has its own CLAUDE.md and skills: /hunt, /cycle)
- `pje-framework/` — PJE taxonomy framework (has its own CLAUDE.md)

## Key Conventions

See MEMORY.md for full conventions. Summary:
- Opus is the canonical model
- APA-style formatting with 1.618x whitespace
- Pedagogical jargon policy: expand acronyms on first use, define in prose
- LaTeX for complex docs, markdown for standard docs
- Write to disk as you go, don't hold in context
- Socratic disagreement stance

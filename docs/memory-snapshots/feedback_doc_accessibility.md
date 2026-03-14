---
name: Documentation accessibility standard
description: v1 docs must read accessible to psychology undergrads with computer literacy; all file references in READMEs must link to actual files
type: feedback
---

Documentation must read accessible to a psychology undergraduate who knows how to operate a computer — not a software engineer. Jargon defined on first use, architecture explained through psychology analogies where possible, theory sections readable without understanding the codebase.

**Why:** User wants the project presentable to psychology-trained audiences, not just engineers. The discipline comes first; engineering serves it.

**How to apply:**
- All backtick file references in README files become clickable relative links: `[docs/architecture.md](docs/architecture.md)` not just `` `docs/architecture.md` ``
- Define technical terms (hooks, triggers, transport, dual-write) in psychology-accessible language on first use
- Theory documents (einstein-freud-rights-theory.md, analogy-limits.md) should stand alone without codebase knowledge
- Test: would a 3rd-year psych student following along understand what each section describes and why it matters?

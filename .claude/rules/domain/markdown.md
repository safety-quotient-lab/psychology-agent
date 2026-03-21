---
globs: ["**/*.md"]
---

# Markdown Documentation Conventions

## Formatting & Whitespace

- APA-style formatting adapted for terminal/markdown output
- APA tables: no vertical rules; horizontal rules at top, under headers, and bottom
- 1.618x (golden ratio) whitespace between sections and logical blocks
- ASCII box-drawing for architecture diagrams and structural elements
- Symbols: ✓ ✗ ★ ↑↓≈ ⚑ ⚠ | Severity: ██░░ HIGH, █░░░ MOD, ░░░░ LOW
- In-text citations where referencing established literature (Author, Year)

## Document Format Policy

- LaTeX for complex documentation (papers, psychometric reports, formal analyses)
- Markdown for standard documentation (lab notebooks, READMEs, memory files)
- Never use Word. Never use plain text when markdown is available.

## Lab-Notebook Entries

- Session headers: `## YYYY-MM-DDTHH:MM TZ — Session N (1-line summary)`
- Use system clock via `date '+%Y-%m-%dT%H:%M %Z'` — no approximate timestamps
- Chronological order enforced (T4 Check 7)
- Cross-references: `▶ journal.md §N, docs/architecture.md`

## Epistemic Flags

Mandatory in session summaries and substantive analytical outputs:

```
⚑ EPISTEMIC FLAGS
- [uncertainty, scope limitation, or validity threat]
```

If none: `⚑ EPISTEMIC FLAGS: none identified.`

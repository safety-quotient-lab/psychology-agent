---
globs: ["**/lcars/**", "**/static/**/*.css", "**/static/**/*.js", "**/templates/**/*.html", "**/dashboard/**", "docs/lcars-*.md"]
---

# LCARS Dashboard Conventions

## Pattern Catalog Gate

Before creating or modifying any LCARS panel, widget, or visual component:

1. **Read `docs/lcars-pattern-catalog.md`** — identify which pattern(s)
   apply to the data being displayed
2. **State the pattern ID** (P01–P34) in the commit message or code comment
3. **If no pattern fits**, document the gap in the catalog before implementing
   a novel pattern — avoid ad-hoc visual solutions

Use the Lookup Cheat Sheet at the bottom of the catalog:
- "I have a single number" → P01/P08/P09/P33
- "I have a hierarchy" → P02
- "I have a flow" → P12
- "I need controls" → P14
- "I need to show a document" → P11/P15

## Delta Indicators

Every mutable numeric value MUST reserve space to the LEFT for a delta
indicator (▲/▼/━). Static values carry no delta column. Polarity comes
from `vocab:deltaPolarity` in the concept scheme, not hardcoded in JS.

See `docs/lcars-data-architecture.md` §11.5.1.

## Color Semantics

Data appearing outside its home station renders in its home station's
color — visual provenance. Station color assignments:

- Medical: #66ccaa (agent health)
- Science: #9999ff (knowledge, analysis)
- Engineering: #ff9944 (infrastructure, flow)
- Helm: #66aacc (transport, navigation)
- Tactical: #cc6666 (defense, threats)
- Operations: default amber (coordination, decisions)

See `docs/lcars-style-guide.md` §2.4.

## Alert Palette

Coherence < 0.3 → red alert (body.alert-red). Mesh degraded → yellow
alert. Never rely on a single badge — the environment communicates.

## Data Source Convention

Stations fetch data through the catalog (`/api/catalog`), not hardcoded
URLs. Use `lcars.catalog.fetch('Dataset Name')` pattern. No direct
URL construction in station JS modules.

## Rendering

Prose content longer than ~100 characters renders through goldmark
(markdown → HTML) using the document panel pattern (P15). No raw text
dumps in LCARS panels.

## Reference

- Architecture spec: `docs/lcars-data-architecture.md`
- Pattern catalog: `docs/lcars-pattern-catalog.md`
- Style guide: `docs/lcars-style-guide.md`
- Overhaul plan: `docs/lcars-overhaul-plan.md`
- Reference images: `~/Projects/ai-llm/lcars/`

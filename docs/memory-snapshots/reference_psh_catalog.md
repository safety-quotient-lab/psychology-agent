---
name: PSH catalog — 11 active categories with codes and keyword counts
description: Polythematic Structured Headings (PSH) catalog data for LCARS dashboard. 11 active L1 categories, 33 inactive, stored in facet_vocabulary table.
type: reference
---

**PSH catalog location:** `platform/shared/scripts/bootstrap_facets.py` (keywords),
`platform/shared/scripts/schema.sql` (schema + seeding).

**Frontend renderer:** `interagent/js/stations/knowledge.js` renderCatalog() (lines 409-469).

**11 active categories:**
| # | Discipline | Code | Keywords |
|---|-----------|------|----------|
| 1 | psychology | PSH9194 | 43 |
| 2 | law | PSH8808 | 35 |
| 3 | computer-technology | PSH12314 | 32 |
| 4 | information-science | PSH6445 | 20 |
| 5 | systems-theory | PSH11322 | 11 |
| 6 | philosophy | PSH2596 | 13 |
| 7 | sociology | PSH9508 | 8 |
| 8 | mathematics | PSH7093 | 13 |
| 9 | communications | PSH9759 | 12 |
| 10 | pedagogy | PSH8126 | 10 |
| 11 | ai-systems | PL-001 | 17 (project-local, no PSH equivalent) |

**API path:** `{agent}/api/kb` → `data.catalog.active[]`

**DB tables:** `facet_vocabulary` (reference), `universal_facets` (entity-level tags).

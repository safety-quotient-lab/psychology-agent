---
name: surgical-not-rebuild
description: When modifying a working system, make surgical changes to the existing code — never rebuild from scratch
type: feedback
---

When a perfected, working system exists (e.g., the ops-agent LCARS dashboard),
modify it surgically — rename labels, rewire data sources, move panels between
panes. Never rebuild the HTML/CSS/JS shell from scratch.

**Why:** Session 97 lost ~2 hours rebuilding fleet.html from scratch. The new
shell used different CSS class names, different HTML structure, and different
JS patterns from the perfected original. Multiple deploy cycles produced
broken dashboards. Reverting to the ops-agent baseline and making surgical
sed renames worked immediately.

**How to apply:** Before touching a working UI: copy the working version as
the baseline, verify it deploys unchanged, then make the smallest possible
change and verify again. Treat the UI as a patient, not a construction site.

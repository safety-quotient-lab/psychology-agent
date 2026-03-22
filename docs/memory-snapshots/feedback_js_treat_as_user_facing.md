---
name: js-treat-as-user-facing
description: JavaScript code represents user-facing surface — rename ALL references, not just display text
type: feedback
---

When renaming stations/concepts, treat JS code as user-facing. Rename
element IDs, function names, variable names, CSS classes — not just
the display text on buttons. Internal identifiers like `ops-` and
`pane-operations` represent the old language and must change throughout.

**Why:** User explicitly stated "please treat the js code as user facing"
and "undo that revert — we want to keep the old language entirely out of
the codebase." Half-measures (display text only, IDs unchanged) got reverted.

**How to apply:** When renaming a concept, do a complete sweep: HTML (IDs,
classes, data attributes, comments), CSS (selectors, vars), JS (function
names, variable names, getElementById strings, config objects, arrays).
Verify zero old references remain via grep before committing.

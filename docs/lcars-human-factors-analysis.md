# LCARS Mode — Human Factors and Semantic Coloring Analysis

**Date:** 2026-03-13 (Session 85)
**Scope:** interagent.safety-quotient.dev dashboard LCARS theme
**Source:** `operations-agent/interagent-sdk/frontend/lcars-theme.css`
**References:** T18 (UX Design Grounding), Nielsen heuristics, WCAG 2.1

---

## 1. Semantic Coloring Audit

### Current LCARS Palette

| Variable | Hex | Role | Semantic fit |
|----------|-----|------|-------------|
| `--c-transport` | `#ff9900` | Transport/operations | ✓ Orange = activity, energy. Trek-canonical for LCARS primary. |
| `--c-knowledge` | `#cc99cc` | Structured knowledge | ⚠ Lavender carries low urgency connotation. Knowledge deserves warmer treatment — amber or gold signals "valued information." |
| `--c-health` | `#9999ff` | Operational health | ⚠ Blue-violet for health inverts the universal green=healthy convention. Even in LCARS, health status should map to green-spectrum to leverage preattentive processing. |
| `--c-epistemic` | `#cc6699` | Epistemic/reflection | ✓ Rose-magenta for reflection/thought carries appropriate "inner process" connotation. Distinct from action colors. |
| `--c-catalog` | `#ff9966` | Catalog/reference | ⚠ Too close to `--c-transport` (#ff9900). 66-point difference in blue channel insufficient for reliable discrimination, especially under colorblind conditions (protanopia). |
| `--c-alert` | `#cc6666` | Alert/warning | ✓ Desaturated red. Conventional danger/alert mapping. Sufficient contrast against dark background. |
| `--c-inactive` | `#666688` | Inactive/disabled | ✓ Muted blue-gray. Low salience, appropriate for disabled state. |

### Agent Identity Colors

| Agent | Hex | Semantic fit |
|-------|-----|-------------|
| psychology-agent | `#ff9900` | ⚠ Shares color with transport. Agent identity should remain distinct from functional category. The psychology agent represents reflection/analysis, not transport mechanics. |
| safety-quotient | `#cc99cc` | ✓ Lavender distinguishes from the more assertive psychology orange. |
| unratified | `#9999ff` | ⚠ Blue-violet for a publishing/editorial agent. Warm editorial tones (amber, terracotta) would better convey the content-creation role. |
| observatory | `#cc6699` | ✓ Rose for observation/analysis fits the data-driven analytical role. |
| operations | `#99cc66` | ✓ Green for operations signals "running, healthy, active." |

### Discrimination Issues

**Protanopia (red-green colorblind, ~8% of males):**
- `--c-transport` (#ff9900) and `--c-catalog` (#ff9966) become nearly
  indistinguishable. Both map to the same yellow-brown region.
- `--c-alert` (#cc6666) and `--c-epistemic` (#cc6699) lose their
  red/pink distinction. Both appear as dim brown.

**Fix:** Add shape or pattern differentiation alongside color. LCARS
canonically uses rounded-rectangle segments with varying widths — each
functional category should carry a distinct *shape signature* in addition
to its color.

### Semantic Coloring Recommendations

| Variable | Current | Proposed | Rationale |
|----------|---------|----------|-----------|
| `--c-health` | `#9999ff` (blue-violet) | `#66cc99` (green) | Universal health=green convention. Reduces cognitive load for status scanning. |
| `--c-knowledge` | `#cc99cc` (lavender) | `#ccaa66` (gold) | Knowledge as valued resource. Gold carries "accumulated worth" connotation. |
| `--c-catalog` | `#ff9966` (orange) | `#cc9966` (warm tan) | Distinct from transport orange. Catalog = reference material, warm but not active. |
| `--c-psychology` | `#ff9900` (orange) | `#6699cc` (steel blue) | Psychology = reflection. Blue-spectrum carries "thoughtful, measured" connotation. Separates from transport. |
| `--c-unratified` | `#9999ff` (blue-violet) | `#cc9966` (warm amber) | Editorial/publishing. Warm tones convey content creation. |


## 2. Typography: FiraCode Proposal

### Current Font Stack

```css
font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
```

FiraCode already appears second in the stack but lacks explicit loading.
Users without SF Mono installed get FiraCode only if they happen to have
it locally. The dashboard should load FiraCode explicitly.

### Why FiraCode for LCARS

1. **Ligatures enhance scanning.** FiraCode's programming ligatures (`=>`,
   `!=`, `>=`, `<=`, `::`) render as single glyphs. In a dashboard
   displaying transport protocol data (SETL values, gate conditions,
   schema versions), ligatures reduce character count and improve
   scanability.

2. **Monospace preserves alignment.** Dashboard tables, agent status grids,
   and spine labels require character-level alignment. FiraCode maintains
   strict monospace while adding typographic polish that proportional
   fonts cannot.

3. **LCARS aesthetic alignment.** The LCARS design language uses clean,
   geometric typography. FiraCode's letterforms carry the geometric
   precision that LCARS demands without the sterility of system monospace
   fonts.

4. **Weight range.** FiraCode ships in 300-700 weights (Light through
   Bold). The dashboard can use Light (300) for data-dense tables and
   Bold (700) for panel headers — currently everything renders at a
   single weight.

### Implementation

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;700&display=swap');

body {
    font-family: 'Fira Code', monospace;
    font-feature-settings: "liga" 1, "calt" 1; /* Enable ligatures */
}

/* Weight hierarchy */
.lcars-panel-body { font-weight: 300; }       /* Light — data density */
.lcars-panel-header { font-weight: 700; }     /* Bold — section labels */
.lcars-tab { font-weight: 500; }              /* Medium — navigation */
.lcars-title { font-weight: 700; }            /* Bold — page title */
.table-cell { font-weight: 400; }             /* Regular — table content */
```

### LCARS Mode Specific

For the classic LCARS theme, add Antonio for uppercase headers (already
referenced in the design) alongside FiraCode for data:

```css
.theme-lcars .lcars-title,
.theme-lcars .lcars-panel-header,
.theme-lcars .lcars-tab {
    font-family: 'Antonio', 'Fira Code', monospace;
    text-transform: uppercase;
    letter-spacing: 0.12em;
}
.theme-lcars .lcars-panel-body,
.theme-lcars .table-cell {
    font-family: 'Fira Code', monospace;
    font-weight: 300;
}
```

This creates a two-layer typography: Antonio for structural/navigational
elements (headers, tabs, labels) and FiraCode for content/data elements
(tables, values, transport messages). The visual hierarchy communicates
"navigation vs content" through typeface alone.


## 3. Human Factors Assessment (T18)

### Nielsen Heuristic Check

| Heuristic | Status | Finding |
|-----------|--------|---------|
| 1. Visibility of system status | ✓ | Agent dots, budget bars, activity stream provide real-time status |
| 2. Match between system and real world | ⚠ | "Pulse" and "Meta" require domain knowledge. "Health" and "Messages" would scan faster. |
| 3. User control and freedom | ✓ | Theme toggle, tab switching, table filtering all reversible |
| 4. Consistency and standards | ⚠ | Tab colors shift per tab (good) but the left spine also shifts — double-encoding creates visual noise |
| 5. Error prevention | ✓ | Read-only dashboard, no destructive actions possible |
| 6. Recognition rather than recall | ⚠ | Agent identity colors appear without legends. New users cannot decode which color maps to which agent without hovering. |
| 7. Flexibility and efficiency | ✓ | URL hash tab persistence, keyboard navigation implied by tab structure |
| 8. Aesthetic and minimalist design | ✓ | Clean LCARS geometry, appropriate information density |
| 9. Help users recognize and recover from errors | N/A | Dashboard displays errors, doesn't cause them |
| 10. Help and documentation | ⚠ | No legend, no help panel, no tooltip explaining SETL or LCARS terminology |

### WCAG 2.1 Contrast Check

| Element | Foreground | Background | Ratio | WCAG AA (4.5:1) |
|---------|-----------|-----------|-------|-----------------|
| Text primary on bg-primary | `#ffcc99` | `#000000` | ~12:1 | ✓ Pass |
| Text secondary on bg-primary | `#9999aa` | `#000000` | ~5.5:1 | ✓ Pass |
| Text dim on bg-primary | `#666677` | `#000000` | ~3.3:1 | ✗ Fail |
| Alert on bg-panel | `#cc6666` | `#111122` | ~4.8:1 | ✓ Borderline |
| Tab inactive on bg-primary | `#9999aa` | `#000000` | ~5.5:1 | ✓ Pass |

**Fix:** `--text-dim` (#666677) fails WCAG AA. Increase to `#888899` (~4.6:1)
or restrict use to decorative elements (not informational text).

### Cognitive Load (Miller's 4±1)

The Pulse tab displays 5 simultaneous information categories
(agent cards, vitals, topology, activity stream, transport summary) — at
the upper limit of Miller's 4±1. Each additional panel risks overload.

**Recommendation:** Progressive disclosure — show agent cards + vitals by
default, reveal topology and activity stream on demand (accordion or
secondary scroll region).


## 4. Proposed Enhancement Summary

| Enhancement | Effort | Impact |
|-------------|--------|--------|
| Load FiraCode from Google Fonts + enable ligatures | XS | Typography polish, scanability |
| Weight hierarchy (300/400/500/700) | XS | Visual hierarchy without color |
| Two-layer LCARS typography (Antonio + FiraCode) | S | Structural vs content distinction |
| Fix health color to green-spectrum | XS | Universal convention alignment |
| Fix catalog/transport color collision | XS | Colorblind accessibility |
| Separate psychology-agent from transport color | XS | Agent identity clarity |
| Fix `--text-dim` contrast ratio | XS | WCAG AA compliance |
| Add agent color legend | S | Recognition over recall (Nielsen #6) |
| Add SETL/terminology tooltip help | S | Documentation (Nielsen #10) |
| Progressive disclosure on Pulse tab | M | Cognitive load management |

---

⚑ EPISTEMIC FLAGS
- Color recommendations carry subjective aesthetic judgment alongside
  empirical accessibility standards. The semantic "fit" assessments
  (e.g., "gold signals valued information") represent cultural
  conventions, not universal truths.
- FiraCode ligature rendering depends on browser support. All modern
  browsers support CSS `font-feature-settings` but older engines may
  render ligatures inconsistently.
- WCAG contrast ratios computed against LCARS theme backgrounds.
  The modern (default) theme may produce different ratios.

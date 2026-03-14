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

## 5. Semiotic Analysis (Peircean Framework)

The cogarch organizes around Peircean semiotics (architecture.md decision,
Session 16). Each UI element functions as a **sign** carrying meaning
through three components: representamen (what appears), object (what it
refers to), and interpretant (what the viewer understands).

### Sign System Audit

| UI Element | Representamen | Object | Interpretant | Semiotic quality |
|-----------|--------------|--------|-------------|-----------------|
| Left spine segments | Colored vertical bars | Functional categories (transport, health, knowledge) | "This system has these operational domains" | ⚠ **Indexical weakness** — the spine colors *correlate* with categories but carry no iconic resemblance. A viewer unfamiliar with the color mapping receives colored bars without meaning. Needs labeling or iconic reinforcement. |
| Agent status dot | Green/amber/red circle | Agent operational state | "This agent runs / degrades / stopped" | ✓ **Strong icon** — traffic-light metaphor operates universally. Pre-attentive processing works. |
| Tab names | Text labels ("Pulse", "Meta", "KB") | Dashboard sections | "Navigate to this content domain" | ⚠ **Symbolic opacity** — "Pulse" requires domain knowledge (heartbeat metaphor). "Meta" could mean metadata, metacognition, or the company. "KB" abbreviates ambiguously (knowledge base? kilobytes?). The signs function symbolically (arbitrary association) rather than iconically (resemblance). Plain labels ("Health", "Messages", "Knowledge") would shift from symbolic to iconic. |
| Budget bar | Horizontal fill bar | Trust budget remaining | "This agent has N% autonomy remaining" | ✓ **Strong icon** — progress/fuel metaphor universally understood. Fill direction (left-to-right) matches reading order. |
| SETL value | Decimal number (0.00-1.00) | Subjective Expected Truth Loss | "How uncertain the sender felt" | ⚠ **Pure symbol** — the number carries meaning only for viewers who know the SETL construct. No iconic or indexical support. A color gradient (green→yellow→red) would add indexical grounding alongside the number. |
| Band height change | 4px (modern) vs 8px (LCARS) | Theme identity | "LCARS mode carries more visual weight" | ✓ **Indexical** — thicker bands *indicate* the more expressive theme. The relationship operates through contiguity (LCARS = bolder = thicker). |
| Panel left accent stripe | 4px colored vertical line | Panel category | "This panel belongs to this functional domain" | ⚠ **Weak index** — the stripe indicates category through color alone. Combined with the spine color AND the tab color, triple-encoding the same category through color produces redundancy without additional information. One encoding suffices; the other two could carry *different* information (e.g., stripe = category, spine = agent, tab = urgency). |

### Interpretant Community Analysis (T4 Check 9)

The dashboard serves five interpretant communities with different
semiotic needs:

| Community | What they seek | Current semiotic support |
|----------|---------------|------------------------|
| **System operator** (daily monitoring) | Agent health, budget status, error alerts | ✓ Well-served — status dots, budget bars, alert colors |
| **Developer** (debugging) | Transport message flow, gate status, schema versions | ⚠ Partially served — message tables exist but SETL values lack visual grounding |
| **Researcher** (analysis) | Epistemic debt, claim verification, lesson patterns | ⚠ Under-served — Meta tab shows raw data without analytical visualization |
| **New user** (orientation) | "What does this system do? What do these colors mean?" | ✗ Poorly served — no legend, no glossary, no onboarding path |
| **Peer agent** (machine reading) | JSON-LD structured data, agent card | ✓ Well-served — /.well-known/agent-card.json, JSON-LD in page head |

### Semiotic Recommendations

1. **Shift tab names from symbolic to iconic.** "Pulse" → "Health",
   "Meta" → "Messages", "KB" → "Knowledge". The current names require
   learned association; the replacements carry resemblance to their
   referents.

2. **Add SETL color gradient.** Display the numeric value AND a
   background tint (green < 0.05, yellow 0.05-0.15, orange > 0.15).
   Adds indexical grounding to a currently pure-symbolic sign.

3. **Differentiate triple-encoding.** The left spine, panel accent
   stripe, and tab underline all encode the same information (current
   category) through color. Reassign one channel:
   - Spine segments → **agent identity** (which agents contribute to
     this tab's data)
   - Panel accent stripe → **data freshness** (green = fresh, amber =
     aging, red = stale)
   - Tab underline → **category** (current function, as now)

4. **Add an icon column to data tables.** Each row's message_type
   (ack, request, proposal, problem-report) currently displays as
   text. Add a small icon (✓, ?, ◆, ⚠) for pre-attentive scanning.
   Icons function iconically; text functions symbolically. Both
   together provide redundant encoding across semiotic modes.

5. **Onboarding overlay for new users.** A first-visit overlay that
   labels each major UI region with a one-line explanation. Dismissed
   permanently after first view. Addresses the new-user interpretant
   community that currently receives no semiotic support.

### Core Principles Alignment

Each recommendation maps to a cogarch principle:

| Recommendation | Principle |
|---------------|-----------|
| Iconic tab names | Invariant 1 (worth precedes merit — the UI should serve before the user proves expertise) |
| SETL color gradient | E-Prime (describe processes, not static states — gradient shows *degree*, not *category*) |
| Differentiated encoding | Invariant 5 (no single architecture dominates — each visual channel carries distinct information) |
| Message-type icons | L6 (profile predicts, aggregate does not — each message type deserves its own visual identity) |
| Onboarding overlay | Invariant 1 again (protect the new user's dignity — don't require domain expertise to navigate) |


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

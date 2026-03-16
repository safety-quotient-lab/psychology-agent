# LCARS Interface Specification

Design specification for the interagent mesh dashboard. Derived from
Star Trek: The Next Generation LCARS (Library Computer Access/Retrieval
System) interface language, adapted for operational mesh monitoring.

---

## Core Principles

### 1. Gestalt Proximity

Controls that serve the same function occupy the same spatial group.
Groups separate via gaps — not labels. Functional relationship
communicates through **position and color**, not text.

Reference: Wertheimer (1923), Gestalt laws of perceptual organization.

### 2. Color as Category

Each functional domain carries a consistent color family. Buttons within
a group share a color family. Different groups use different families.
The active/selected state within a group brightens (filter: brightness 1.3)
and adds a subtle glow (box-shadow).

### 3. No Group Labels

TNG LCARS panels do not label button groups with category headers.
The spatial grouping + color family communicates the relationship.
Labels appear only on the buttons themselves.

Exception: data panels (tables, charts) carry headers for content
identification — these represent information displays, not controls.

### 4. Uniform Button Sizing

All buttons within a control surface share the same dimensions.
LCARS buttons use a pill shape with consistent padding and font size.
Width fills the available column. Height derives from uniform padding.

---

## Typography

| Element | Font | Weight | Size | Case |
|---------|------|--------|------|------|
| Button label | Arial Narrow | 700 | 0.72em | UPPERCASE |
| Panel header | Arial Narrow | 700 | 0.82em | Title Case |
| Data value | System (monospace for numbers) | 700 | varies | As-is |
| Body text | System | 400 | 0.85em | Sentence case |
| Category label | — | — | — | Not used (see principle 3) |

Letter-spacing: 0.06–0.08em on buttons and headers.

---

## Color Palette

### Station Colors (tab accents)

| Station | Variable | Hex | Usage |
|---------|----------|-----|-------|
| Operations | `--c-tab-ops` | #ff9900 | Sidebar, active tab, Gf panels |
| Science | `--c-tab-science` | #9999ff | Psychometric instruments |
| Engineering | `--c-tab-engineering` | #ff9944 | Cascades, utilization |
| Helm | `--c-tab-helm` | #cc99cc | Routing, flow |
| Tactical | `--c-tab-tactical` | #cc6666 | Security, trust |
| Medical | `--c-tab-medical` | #6aab8e | Health, diagnostics |

### Semantic Colors

| Meaning | Hex | Usage |
|---------|-----|-------|
| Healthy/nominal | #6aab8e | Status badges, gauges, bars |
| Warning/elevated | #d4944a | Budget near limit, coordination heavy |
| Alert/critical | #cc6666 / #c47070 | Offline, depleted, errors |
| Information | #5b9cf6 | Links, capacity controls |
| Highlight/active | #ff9944 | Selected model tier, active state |

### Agent Colors

| Agent | Hex |
|-------|-----|
| psychology | #5b9cf6 |
| safety-quotient | #4ecdc4 |
| unratified | #e5a735 |
| observatory | #a78bfa |
| operations | #6b7280 |

---

## Control Surfaces

### Button Shape

```css
.ops-ctrl {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border-radius: 20px;        /* full pill */
    font-size: 0.72em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border: none;
    cursor: pointer;
    color: #000;
    min-width: 48px;
}
```

### Active State

```css
.ops-ctrl-active {
    filter: brightness(1.3);
    color: #fff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.25);
}
```

### Group Layout

Vertical stacks per functional group. Groups arranged horizontally
with 12px gap. No labels between groups.

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  PAUSE   │  │  UNLOCK  │  │  HAIKU   │  │ SYNC NOW │
│  RESUME* │  │  LOCK*   │  │ SONNET*  │  └──────────┘
└──────────┘  └──────────┘  │  OPUS    │
                            └──────────┘

* = active (brightened + glow)
```

### Mutually Exclusive Groups

Within a group, only one button carries `.ops-ctrl-active` at a time.
Clicking a button in the group activates it and deactivates siblings.

### Destructive Actions

Destructive operations (pause, reset, delete) use the alert color
family (#cc6666). They occupy a separate group from routine operations.
No destructive action fires without user confirmation — UI provides
visual feedback + meshctl command reference, not direct execution.

---

## Panel Structure

### Header Bar

```
┌─────────────────────────────────────────┐
│ Panel Title                             │
├─────────────────────────────────────────┤
│ Content                                 │
└─────────────────────────────────────────┘
```

Panel accent color set via `--panel-accent` CSS variable.
Header carries the accent color as left border or background tint.

### Data Tables

Use `<mesh-data-table>` web component. No filter toolbars in LCARS
mode — filtering happens via agent switcher buttons, not text input.

### Gauge Elements

Horizontal bar with fill. Color shifts by threshold:
- Green (#6aab8e): nominal
- Amber (#d4944a): elevated
- Red (#c47070): critical

### Vital Cards

Grid of value + label pairs. Value in large font, label below in
small uppercase dimmed text. Grid auto-fits to available width.

---

## Sidebar Navigation

Vertical stack of station buttons. Left-rounded pill shape
(`border-radius: 24px 0 0 24px`). Active station brightens and
indents slightly. Each button carries the station color.

Short labels appear on narrow viewports via `data-short` attribute
(e.g., "OPS", "SCI", "ENG").

---

## Responsive Behavior

| Viewport | Sidebar | Panels | Controls |
|----------|---------|--------|----------|
| > 1200px | Visible, full labels | 2-3 column grid | Horizontal groups |
| 768–1200px | Visible, short labels | 2 column | Horizontal groups |
| < 768px | Hidden (top tab bar) | Single column | Stacked groups |

---

## Animation

- Button hover: `opacity: 0.8`, `transform: scale(1.02)` (150ms ease)
- Button press: `transform: scale(0.97)` (instant)
- Gauge fill: `transition: width 0.6s ease`
- Dot movement (affect grid): `transition: left 0.6s, top 0.6s ease`
- Tab switch: instant (no slide/fade — matches TNG instant panel swap)

---

## Deviations from TNG Canon

| Canon | Our adaptation | Rationale |
|-------|---------------|-----------|
| No scrolling | Scrollable panels | Real data exceeds fixed viewport |
| Fixed layout | Responsive grid | Multi-device access required |
| Touch-only | Mouse + touch | Desktop primary use case |
| Decorative data | Live operational data | Functional system, not prop |
| LCARS orange everywhere | Station-specific colors | Visual distinction per domain |

---

## References

- Okuda, M. & Okuda, D. (1999). *The Star Trek Encyclopedia*
- LCARS interface screenshots: TNG seasons 3–7 (canonical reference)
- Gestalt proximity: Wertheimer, M. (1923)
- Fitts's Law: Fitts, P. M. (1954)
- Color accessibility: WCAG 2.1 contrast ratios (target: AA)

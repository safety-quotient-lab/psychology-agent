# LCARS Design Reference — TNG Pattern Library

Derived from 30+ screen-used prop panels, fan recreations, and official reference
materials. Governs all LCARS-themed rendering in the interagent compositor dashboard.

Reference images: `~/Projects/ai-llm/lcars/`

---

## 1. Structural Principles

### 1.1 The Elbow Frame

Every canonical LCARS layout uses an **elbow** — a thick colored bar that sweeps from
vertical (sidebar) to horizontal (header) via a quarter-circle corner. Content sits
inside the elbow's void.

```
┌──────────────────────────┐
│ ████████████  HEADER     │
│ █          ──────────────│
│ █                        │
│ █       CONTENT VOID     │
│ █                        │
│ █          ──────────────│
│ ████████████  FOOTER     │
└──────────────────────────┘
```

- **Left sidebar** = vertical structural bar (salmon/orange, 60-80px wide)
- **Top header** = horizontal bar extending right from elbow
- **Quarter-circle joint** = `border-radius` connecting sidebar to header
- **Content void** = pure black (#000) interior

Source: Button 52, Unknown N1, Ohniaka A1, themes-2025 (all variants)

### 1.2 Three-Zone Layout

Consistent across Ohniaka A1, Sensor Probe, Weather Net, Tissue Screen:

| Zone | Content | Position |
|------|---------|----------|
| **A (top)** | Dense number grid — alphanumeric matrix | Above visualization |
| **B (middle)** | Visualization — chart, diagram, map, waveform | Center of panel |
| **C (bottom)** | Title bar + section identifier number | Below visualization, right-aligned |

Zone A provides raw data context. Zone B provides visual interpretation. Zone C
provides navigation and identification.

### 1.3 Information Hierarchy

LCARS encodes hierarchy through **size, color, and position** — never through borders
or visual chrome:

1. **Panel title** — largest text, right-aligned, all caps (e.g., "ARCANIS SYSTEM")
2. **Section label** — medium text, gold/yellow, left-aligned in colored capsule
3. **Data values** — monospace, alternating colors by data type
4. **Annotations** — smallest text, dim color, positioned adjacent to relevant data

### 1.4 The Void Principle

LCARS uses **negative space aggressively**. Panels float in blackness. Data elements
breathe. The black void between elements carries as much meaning as the elements
themselves — it separates functional zones without borders.

---

## 2. Color Semantics

Colors carry **consistent semantic meaning** across all observed panels:

| Color | Hex Range | Semantic Role | CSS Variable |
|-------|-----------|---------------|-------------|
| Salmon/peach | `#ff9966`, `#cc8866` | Structural frame, sidebar bars, separator | `--c-frame` |
| Orange | `#ff9900`, `#ff9944` | Active data, emphasis, counts, row anchors | `--c-transport` |
| Purple/violet | `#9999ff`, `#cc99cc` | Secondary data, identifiers, subsystem info | `--c-knowledge` |
| Lavender | `#bbaadd`, `#9988bb` | Tertiary data, background capsules | `--c-knowledge-dim` |
| Yellow/gold | `#ffcc00`, `#ffdd44` | Section headers, alerts, titles, warnings | `--c-warning` |
| Blue | `#5b9cf6`, `#66aacc` | Science, navigational, spatial data | `--c-tab-science` |
| Red | `#cc6666` | Emergency, critical, override, destructive | `--c-alert` |
| Tan/beige | `#ccaa88` | Neutral frame, sweep borders, spacers | `--c-frame-dim` |
| Green/cyan | `#66ccaa`, `#6aab8e` | Medical, nominal status, environmental | `--c-health` |
| White | `#ffffff`, `#dce1e8` | Primary data values, table cell text | `--text-primary` |

### 2.1 Color in Number Grids

Numbers alternate colors to indicate **data type**, not emphasis:
- **Orange numbers** = counts, quantities, accumulating values
- **Purple numbers** = identifiers, codes, reference values
- **White numbers** = measured values, raw data
- **Yellow numbers** = highlighted/anomalous values requiring attention

Source: Proto Star Model (G), Tissue Screen (E), Ohniaka B3/B4, Weather Net

### 2.2 Color in Capsule Grids

Capsule color indicates **functional category**:
- **Orange capsules** = row leaders, primary actions
- **Purple capsules (dark)** = category A data/actions
- **Lavender capsules (light)** = category B data/actions
- **Yellow capsules** = alerts, special status
- **Red/maroon capsules** = emergency or final-row indicators

Source: Button 52, Unknown N1, Ohniaka A1

---

## 3. Control Surfaces

### 3.1 Capsule Button (Primary Interaction Element)

The rounded-end capsule ("pill") serves as the universal interaction primitive.

**Anatomy:**
```
╭──────────────╮
│  LABEL TEXT   │
╰──────────────╯
```

- Fully rounded ends (`border-radius: 50vh`)
- Text: centered, uppercase, bold, 0.72-0.82em
- Min touch target: 48px height
- No border — color fills the entire shape
- Active state: full opacity + optional glow
- Inactive: reduced opacity (0.5-0.7)

### 3.2 Paired Capsule (Mutually Exclusive Toggle)

Two capsules stacked vertically with contrasting colors:
```
╭────────────╮  ← active (bright color, full opacity)
│   RESUME   │
╰────────────╯
╭────────────╮  ← inactive (muted color, reduced opacity)
│   PAUSE    │
╰────────────╯
```

Source: Tuvok (PRIMARY CONTROL / SECONDARY CONTROL), Our Ops (PAUSE/RESUME)

### 3.3 Mode Selector (Radio Group)

Row of equal-width capsules, one highlighted:
```
╭────╮ ╭────╮ ╭────╮
│ A  │ │ B● │ │ C  │
╰────╯ ╰────╯ ╰────╯
```

Active capsule: bright color + glow. Others: muted.
Source: maxresdefault (PLAY/STOP/NEXT), Our Ops (HAIKU/SONNET/OPUS)

### 3.4 Sequence Selector (Labeled Row)

Colored capsule left (label) + colored bar right (indicator):
```
╭──── PRIMARY SEQUENCE ────╮ ═══════════════
╭──── AUXILIARY SEQUENCE ──╮ ═══════════════
╭──── EMERGENCY OVERRIDE ──╮ ═══════════════
```

Color of the left capsule indicates severity/priority tier.
Source: Unknown K (PRIMARY/AUXILIARY/EMERGENCY)

### 3.5 Capsule Grid (Touch Surface)

Matrix of touchable capsules — the primary LCARS input paradigm:
```
╭─ 200156 ─╮  [capsule] [capsule] [capsule] [capsule]
╭─ 309487 ─╮  [capsule] [capsule] [capsule] [capsule]
╭─ 527330 ─╮  [capsule] [capsule] [capsule] [capsule]
```

- Left column: orange row-leader capsules (with numbers)
- Right grid: purple/lavender action capsules
- Each capsule = one selectable datum or action
- Capsule shade varies by category

Source: Button 52, Unknown N1, Ohniaka A1 (top + bottom rows)

### 3.6 Vertical Pill Strip (Status Indicator)

Vertical column of `[half-circle] [number] [square]` rows:
```
● 65 ■
● 358 ■
● 13 ■
```

Each row: different color combination. Not interactive — shows status readings.
Source: Unknown M1

### 3.7 Bottom Navigation Bar

Horizontal row of wide capsules anchored to viewport bottom:
```
╭── LCARS ──╮ ╭── INFO ──╮ ╭── VERSION ──╮ ╭── STATUS ──╮
```

Global navigation / system functions.
Source: maxresdefault, Our LCARS footer band

---

## 4. Data Display Patterns

### 4.1 Alphanumeric Matrix (Dense Number Grid)

Dense monospace grid with no borders — color encodes data type:
```
1122  55917  17486  1164     85496   535  15435
 021  06082  34234  7486      810   982   7982
```

- Rows and columns defined by spacing alone
- Alternating color: orange, purple, white
- Bold highlights on anomalous values
- Title above, section number below

Source: Proto Star (G), Tissue Screen (E), Weather Net, Sensor Probe, Ohniaka B3/B4

### 4.2 Key-Value Readout

Two-column label-value pairs:
```
POWER          POWER
TIME LEFT      UNKNOWN
STATUS         NO BATTERY
```

- Labels: dim, uppercase
- Values: bright, monospace, sometimes colored by state
- Grid layout, not table

Source: maxresdefault (POWER CONTROLS), Home Automation (WEATHER SENSORS)

### 4.3 Structured Table (Ohniaka Pattern)

Multi-column table with colored conventions:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← yellow header row
USS AJAX      APOLLO     NCC-11574    DEEP SPACE EXPLORATION
USS ARIES     RENAISSANCE NCC-45167   DEEP SPACE EXPLORATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← orange separator bar
USS BRADBURY  BRADBURY   NX-72307     WARP DRIVE TESTS
USS CHARLESTON EXCELSIOR NCC-42285    DEEP SPACE EXPLORATION
```

- **Header row**: yellow/gold text, large, all caps
- **Separator bars**: orange/salmon horizontal rules between groups
- **Column 1**: purple text (names/entities)
- **Column 2**: purple text (classifications)
- **Column 3**: yellow text (identifiers/codes)
- **Column 4**: white text (descriptions/status)
- **No cell borders** — spacing and color create structure
- **Group sections** separated by colored bars

Source: Ohniaka B3 (Mission Status), B4 (Relay Log)

### 4.4 Waveform Display

Oscillating signal visualization between horizontal anchor bars:
```
════════════════════════════════
     ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
════════════════════════════════
```

- Represents live/streaming data
- Horizontal bars frame the waveform above and below
- Data dump text (command codes) appears below waveform

Source: Com Link (J/K)

### 4.5 Area Chart (Filled Line Graph)

```
     ╱╲    ╱╲
    ╱  ╲  ╱  ╲    ╱╲
───╱────╲╱────╲──╱──╲──
████████████████████████  ← filled area
──────────────────────────
```

- Blue/purple filled area on black background
- Orange/salmon horizontal zone bands behind
- Grid lines in dim color
- Axis labels at edges
- Title top-right with section number

Source: Data Analysis 103138

### 4.6 Spatial Map (Grid + Nodes)

```
┊   ┊   ┊ ✦ ┊   ┊   ┊
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
┊   ┊ ✦ ┊   ┊   ┊ ✦ ┊
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
┊   ┊   ┊   ┊ ✦ ┊   ┊
     244  245  246  247
```

- Subtle grid lines (dotted or dim)
- Labeled coordinate axes
- Nodes with detail callouts (name + data)
- Connection arcs between nodes
- Title bottom-center with section number

Source: Ohniaka B3 (Comm Traffic), Long Range Search Scan, Sensor Probe (Course Log)

### 4.7 Molecular Chain (Linked Sequence)

```
◯──●──◯──●──◉──●──◯──●──◯
```

- Horizontal line of colored circles/ellipses
- Each node = one record in a sequence
- Node color indicates type/status
- Central node (largest) = current/highlighted
- Labels below nodes

Source: CRC Monitor (H), DNA Match (B2)

---

## 5. UX Principles

### 5.1 Glanceability Over Readability

LCARS optimizes for **peripheral awareness** — the operator should extract system
status from shape, color, and position without reading text. Numbers provide
precision on demand; color provides state at a glance.

### 5.2 Data Density as Feature

LCARS panels carry **extreme data density** by design. Dense number grids fill
available space. Empty space = wasted screen real estate. The aesthetic value
comes from the *pattern* of dense data, not from minimalism.

### 5.3 Color as the Only Delimiter

LCARS never uses borders between data cells. Color, spacing, and typography
create visual separation. Adding borders breaks the aesthetic.

### 5.4 Symmetric Framing

Control surfaces (capsule grids) appear **both above and below** content panels
(Ohniaka A1). This creates symmetry and ensures controls remain accessible
regardless of scroll position.

### 5.5 Context Through Position

The left sidebar carries **identification numbers** that persist across all views.
These serve as "coordinates" — the operator knows which subsystem they are
examining by the sidebar numbers alone.

### 5.6 Progressive Disclosure via Navigation

Capsule buttons don't expand inline — they **navigate to a new panel**. LCARS
treats each panel as a complete view. Drill-down replaces the current panel
rather than expanding within it.

### 5.7 Visualization Anchoring

Every visualization appears with:
1. A **data context** (number grid) directly adjacent
2. A **title + identifier** below the visualization
3. A **colored border** (thin, usually purple or tan) framing the viz
4. **Floating annotations** inside the viz (not separate legends)

### 5.8 Redundancy Through Repetition

The same data often appears in multiple forms — as a number in the grid, as a
visual in the chart, and as text in the title. Redundancy ensures no single
rendering failure loses information.

---

## 6. Typography

| Element | Font | Size | Weight | Case | Spacing |
|---------|------|------|--------|------|---------|
| Panel title | Arial Narrow / Helvetica Neue | 1.6-2.0em | 700 | UPPER | 0.08em |
| Section label | Arial Narrow | 0.82em | 700 | UPPER | 0.06em |
| Data value | Lucida Console / Menlo / monospace | 0.78em | 700 | as-is | 0 |
| Small label | Arial Narrow | 0.65em | 600 | UPPER | 0.04em |
| Body text | system-ui | 0.78em | 400 | Sentence | 0 |

---

## 7. Implementation Mapping

| LCARS Pattern | Dashboard Component | Status |
|--------------|-------------------|--------|
| Elbow frame | Sidebar + header band | Partial — lacks quarter-circle joint |
| Three-zone layout | Panel structure | Not yet — panels use single zone |
| Capsule grid control | Ops alpha matrix | Active — clickable navigation |
| Structured table | KB tables, Meta tables | In progress — colored headers |
| Hatched bars | All gauge fills in LCARS mode | Done (W3) |
| Subsystem blocks | Ops Mesh Overview | Done (W4) |
| Alphanumeric matrix | Ops data grid | Done (W5) with color semantics |
| Key-value readout | Ops schedule section | Done |
| Numbered vertical gauge | Engineering utilization | Done |
| Section badges | LCARS-exclusive tabs | Done |
| Status indicator dots | Pulse topology | Done |
| Panel footer titles | Topology, Ops, Governance | In progress |
| Visualization inset border | Topology, affect grid | In progress |
| Waveform display | Medical oscillator, Eng tempo | Planned |
| Area chart | Engineering deliberation cascade | Planned |
| Spatial map with grid | Pulse topology enhancement | Planned |
| Molecular chain | Helm session timeline | Planned |
| Capsule grid touch surface | Ohniaka-style control panels | Planned |
| Symmetric framing | Top/bottom capsule rows | Planned |

---

## 8. Reference Image Index

| Image | Key Patterns |
|-------|-------------|
| Ohniaka A1 | Full station: symmetric capsule grids, three middle panels, sweep framing |
| Ohniaka B2 (DNA Match) | Molecular chain, three-zone layout, dense number grid |
| Ohniaka B3 (Comm Traffic) | Spatial grid map, structured table (Mission Status) |
| Ohniaka B4 (Relay Log) | Grouped structured table, number grid, sub-tables |
| Button 52 | Canonical capsule grid control surface, elbow frame, purple/orange scheme |
| Unknown N1 | Capsule grid layout, sweep structure, color grouping |
| Unknown M1 | Vertical pill strip status indicator |
| Sensor Probe (54x23) | Dual-panel: orbital viz + course log, number grid, spatial map |
| Data Analysis 103138 | Area chart with zone bands, gridlines, sidebar data |
| Weather Net | Green/cyan scheme, satellite imagery + grid, three sub-tables, footer title |
| Com Link (J/K) | Waveform display, command codes dump, section titles |
| Unknown E (Tissue Screen) | Data grid wrapping visualization inset, cellular scan |
| Unknown F (Analysis) | Color-coded sequence pattern (decryption key), command codes |
| Unknown G (Proto Star) | Number grid + sensor array diagram, three-zone |
| Unknown H (Experimental Data) | Number grid + molecular chain (CRC Monitor) |
| Unknown I (Warp Field) | Large 3D visualization with corner readouts |
| Tuvok LCARS | Subsystem blocks, numbered vertical gauge, control buttons |
| Home Automation | Hatched sensor bars, number grid, weather subsystem |
| USS Centurion | Paired capsule rows, alphanumeric matrix, section headers |
| themes-2025 | Six LCARS variants showing consistent structural patterns |
| maxresdefault | Bottom nav bar, key-value readout, battery vertical bars |
| Enterprise E (Starship) | Master schematic: blueprint-style with labeled zones |
| Voyager panel | Physical PADD with PRIMARY ACCESS header |
| README-sweep | LCARS sweep framing histograms, text + chart dual layout |

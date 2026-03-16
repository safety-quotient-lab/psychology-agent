# LCARS Design Reference — TNG Pattern Library

Derived from 50+ screen-used prop panels, fan recreations, and official reference
materials. Governs all LCARS-themed rendering in the interagent compositor dashboard.

Primary image source: http://frogland.co.uk/set-archive/LCARS/
Additional: PropWorx auctions, ScreenUsed.com, fan recreations.

Reference images: `docs/lcars-reference/` (gitignored — binary assets)
Original source: `~/Projects/ai-llm/lcars/`

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

### 4.8 Tactical Grid Map (Perspective Overlay)

Large-area spatial display with 3D perspective grid and overlay elements:
```
     ┊     ┊     ┊     ┊     ┊     ┊
   ──┼─────┼─────┼─────┼─────┼─────┼──
     ┊  ◻78757  ┊  ◻458540  ┊  ◻45845
   ──┼─────┼─────┼─────┼─────┼─────┼──
     ┊     ┊  ◻33454  ┊  ◻4584  ┊
   ──┼─────┼─────┼─────┼─────┼─────┼──
     ┊     ┊  ◻3845   ┊     ┊     ┊
```

- **Perspective grid**: red/orange lines receding toward vanishing point, giving 3D depth
- **Sector nodes**: orange square brackets `[◻]` with numeric identifiers
- **Coordinate axes**: numbered along edges (225, 228, etc.)
- **Number grid above**: standard dense grid spanning full width
- **Sidebar identifiers**: left column numbers in orange capsules
- Right-side readout column with small number blocks
- **Depth cue**: grid line spacing narrows toward horizon — implies z-axis

Source: Tactical Cartography 76799 (s7e01), all Tactical Map variants (A-F)

### 4.9 Multi-Waveform Telemetry (Signal Dashboard)

Multiple simultaneous signal displays with flanking readouts:
```
┌──────────────────────────────────────┐
│ ════ [axis labels] ════              │  787 234 785 • 9583
│  ∿∿∿∿∿∿∿ purple ∿∿∿∿∿∿             │  783 984 764 • 7547
│  ∿∿∿∿∿∿∿ blue   ∿∿∿∿∿∿             │  987 365 009 • 3245
└──────────────────────────────────────┘
      ┌─────────┐  ┌─────────┐
      │ ▓▓▓▓▓▓▓ │  │ ∿∿∿∿∿∿ │   • 9583
      │ ▓▓▓▓▓▓▓ │  │ ∿∿∿∿∿∿ │   • 7547
      │ ▓▓▓▓▓▓▓ │  │ ∿∿∿∿∿∿ │   • 3245
      └─────────┘  └─────────┘
```

- **Primary waveform**: large, framed in orange border with axis tick labels
- **Secondary displays**: smaller, arranged in 2×n grid below primary
- Mixed display types: waveform, bar chart, mini-scope — all in same panel
- **Flanking readouts**: number columns with colored dot indicators (●)
- Purple and blue overlapping traces on primary waveform
- "DATA ANALYSIS MODE" footer title

Source: Transponder Telemetry 8686

### 4.10 Personnel Roster (Multi-Column Color-Coded List)

Dense multi-column crew/entity listing with per-entity color coding:
```
AKAGI, U.S.S.    CLEMENT, U.S.S.    EXETER, U.S.S.
NCC-62158        NCC-12537          NCC-20531
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ KIMYA, LT.     ■ KENNEY, CMDR.    ■ AGANYO, CAPT.
■ KOBAYASHI, LT. ■ ALFARO, CMDR.    ■ BARRETT, ADM.
■ KURTS, ENS.    ■ BRAND, CMDR.     ■ BRAND, GN.
```

- **Column headers**: yellow ship name + purple registry number
- **Color-coded status squares** per name: green (active), orange (wounded),
  red (KIA), blue (missing) — color carries meaning without legend
- **Dense monospace text**: small font, maximizing entries per column
- 8-10 columns across full width
- Header band: salmon/pink structural bars
- Footer: section number badge

Source: Wardroom B (s6e19) — Personnel Status Update

### 4.11 3D Perspective Visualization (Full-Panel)

Full-panel 3D rendering with labeled regions and floating annotations:
```
   GAMMA QUADRANT                    ALPHA QUADRANT
        ╲                               ╱
         ╲  RING SINGULARITY           ╱
          ╲    ╱─────────╲            ╱
           ╲  ╱  VERTERON ╲         ╱
            ╲╱   MEMBRANE  ╲       ╱
     FTR     ║              ║    ⊙ DS9
    PIPELINE ║    POINT     ║
              ╲ SINGULARITY╱
               ╲──────────╱
```

- **Full starfield background** with scatter dots (white, varying brightness)
- **3D wireframe/rendered object** centered — gold/yellow line work
- **Region labels**: ALL CAPS, positioned floating within relevant region
- **Station illustration**: small detailed rendering (DS9) at anchor point
- **Quadrant labels**: top-left and top-right as zone identifiers
- Number grid above, sidebar identifiers left
- **Axis labels**: bottom edge ("SUBSPACE DISTORTION IN MILLICOCHRANES")
- **Scale**: visualization dominates ~70% of panel area

Source: Bajoran Wormhole 8747

### 4.12 Circuitry Schematic (Symmetric System Diagram)

Full-symmetric technical schematic showing internal system architecture:
```
  35  07  02  27  72  34          34  24  07  12  80  34
  ─────────────────────           ─────────────────────
  ┃  ╔═══╗    ╔═══╗  ┃           ┃  ╔═══╗    ╔═══╗  ┃
  ┃  ║   ║────║   ║  ┃           ┃  ║   ║────║   ║  ┃
  ┃  ╚═══╝    ╚═══╝  ┃     ○     ┃  ╚═══╝    ╚═══╝  ┃
  ─────────────────────           ─────────────────────
```

- **Perfect bilateral symmetry** — left mirrors right exactly
- Orange/gold structural elements (horizontal bars, connectors)
- Purple/lavender component blocks
- White circle junction points (○) at key intersections
- **Numbered header strip**: small squares with single/double-digit numbers
- Numbered footer strip mirrors header
- Title top-center: "CIRCUITRY BAY · 47"
- Salmon structural bars top and bottom framing

Source: Circuitry Bay 47

### 4.13 Stellar Cartography (Radial/Fan Map)

Sector maps using radial coordinate grids with labeled celestial objects:
```
            ╱   ╱   ╱   ╱
         250╱  ╱   ╱   ╱
          ╱  ·╱  ·╱  ·╱
       280╱──╱──╱──╱ ·
          ╱ ·╱  ╱ ·╱
       270╱──╱──╱──╱
          ╱  ╱ ·╱  ╱
       280╱──╱──╱──╱
```

- **Radial grid lines** emanating from origin point (top-right or center)
- **Arc lines** at distance intervals (labeled: 250, 260, 270, etc.)
- Star-field background with dots
- **Node markers**: orange square-in-circle icons `[◎]` at system positions
- **Orange route lines** connecting nodes (constellation-style)
- Number readouts flanking map on both sides
- **Three variants observed**:
  - Fan/wedge shape (Stellar B) — radial from corner
  - Semicircle (Stellar C) — half-dome with concentric arcs
  - Rectangular grid with route overlay (Stellar D) — labeled systems

Source: Stellar Cartography 5894 (s7e01), 65767 (s7e19), 5547

### 4.14 Systems Diagnostic Cutaway

Full cross-section schematic of station/ship systems:
```
┌──────────────────────────────────────────────┐
│  ●●●● number grid ●●●●                      │
│ ═══════════════════════════════════════════   │
│         ╔════════════════════╗                │
│    ◐────║  CROSS-SECTION    ║────◐           │
│         ║   DIAGRAM         ║                │
│         ╚════════════════════╝                │
│  ● 345 787 234 705                           │
│  ● 486 763 984 764   ANALYSIS MODE · 414     │
└──────────────────────────────────────────────┘
```

- Large technical illustration centered (pink/salmon line work on black)
- Orange structural framing around illustration
- Color-coded dot legends (● ● ●) with number sequences
- Right-side: smaller diagnostic elements (capsule grid, color bars)

Source: Wardroom A (s5e05) — Level 1 Systems Diagnostic

### 4.15 Article/Prose Display

Long-form text content within LCARS framing:
```
════════════ UFP PRESS AND INFORMATION ══════════
  HEADLINE TEXT IN LARGE GOLD
  SUBTITLE IN SMALLER PURPLE
  BY AUTHOR NAME
  ─────────────────────────────────────
  Body text in light purple/lavender, justified,
  standard paragraph formatting with comfortable
  line height and readable font size...
                              [SEAL]  2345-77
```

- Header band: orange structural bars + title right-aligned
- Headline: large gold/yellow text
- Subtitle: purple/pink, smaller
- Body: lavender/light text, justified columns
- Institutional seal/emblem floating in text
- Footer: section number badge (orange)
- Left border: thin vertical color bars (salmon, purple accents)

Source: UFP Press and Information

### 4.16 Radial Dial Control (Engineering Console)

Pie/radial selector for system control panels:
```
        ╱ ──── ╲
      ╱ 45  67  ╲
    │  ────────── │
    │  ╱ DIAL  ╲  │
    │ │  ●●●●  │  │
    │  ╲      ╱   │
      ╲  ────  ╱
        ╲────╱
```

- Concentric ring/pie chart divided into sectors
- Orange/gold primary, purple/lavender secondary, pink accents
- Numbered sectors with labels
- "MODE SELECT" nearby — functions as system selector
- Surrounded by dense capsule button grid
- Appears alongside ship schematics

Source: Defiant Engineering A2

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
| Waveform display | Medical oscillator, Eng tempo | Done |
| Area chart | Engineering Gc cascade | Done |
| Spatial map with grid | Pulse topology | Done |
| Molecular chain | Helm session timeline | Done |
| Capsule grid touch surface | Ohniaka-style control panels | Planned |
| Symmetric framing | Top/bottom capsule rows | Planned |
| Tactical grid overlay | Mesh topology tactical view | Planned |
| 3D perspective map | Wormhole / tactical cartography style | Planned |
| Multi-waveform telemetry | Transponder telemetry multi-channel | Planned |
| Personnel roster table | Color-coded multi-column crew list | Planned |
| Circuitry schematic | Symmetric system topology diagram | Planned |
| Radial dial control | Defiant Engineering pie/radial selector | Planned |
| Article/prose display | UFP Press text layout with header band | Planned |
| Systems diagnostic cutaway | DS9 wardroom cross-section schematic | Planned |

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
| Tactical Cartography (s7e01) | **3D perspective grid**, sector nodes, coordinate axes, sidebar readouts |
| Tactical Map A (s6e01) | Tactical spatial map, curved route trajectories (red/green), dual-panel inset |
| Tactical Map B (s7e21) | Similar to A, higher contrast, labeled movement paths |
| Tactical Map C | Cardassian Union territory, sparse field, political boundary display |
| Tactical Map D (s7e24) | **Dual-inset panels** within tactical frame, Cardassian System label, 3D elliptical orbit |
| Tactical Map E | "FLEET EVAL" — tactical + **ship profile illustrations** bottom row, mixed content types |
| Tactical Map F (s6e04) | Tactical grid with **3D depth** (Argolis Cluster), star scatter, sensor array labels |
| Stellar B (s7e01) | Stellar Cartography 5894 — **radial/fan sector map**, orange route lines, arc coordinates |
| Stellar C (s7e19) | Stellar Cartography 65767 — **semicircle map** with concentric arcs, pink/purple palette |
| Stellar D | Stellar Cartography 5547 — rectangular **labeled star chart** with named systems + route |
| Cardassian Mix A1 | Gamma Quadrant 22757 — **angled prop photo**, triangular sidebar elements, green accents |
| Circuitry Bay | **Bilateral symmetric schematic**, orange/purple components, junction circles, numbered strips |
| Defiant Engineering A1 (s3e26) | Curved console panel, ship schematic + radial dial + capsule grids |
| Defiant Engineering A2 | Close-up: **radial dial control**, dense capsule grid, "MODE SELECT" label |
| Transponder Telemetry | **Multi-waveform display**, 3 signal channels, mini-scope panels, flanking readouts |
| UFP Press and Information | **Article/prose layout**, headline + subtitle + body text + institutional seal |
| Wardroom A (s5e05) | DS9 **Level 1 Systems Diagnostic** — station cross-section cutaway, LCARS framed |
| Wardroom B (s6e19) | **Personnel roster** — multi-column color-coded crew list (KIA/wounded/missing) |
| Wormhole | Bajoran Wormhole 8747 — **full 3D perspective visualization**, wireframe singularity, DS9 illustration |

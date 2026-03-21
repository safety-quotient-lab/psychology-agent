# LCARS Pattern Catalog

**Session:** 96 (2026-03-21)
**Status:** Reference catalog — lookup by tag to find the right pattern
**Source:** 78 reference images from `~/Projects/ai-llm/lcars/`
**Companion:** `docs/lcars-data-architecture.md` §11

---

## Tag Dimensions

| Dimension | Values |
|---|---|
| `data_shape` | `tree`, `list`, `table`, `time-series`, `graph`, `scalar`, `prose`, `comparison`, `spatial`, `flow`, `sequence`, `categorical` |
| `cardinality` | `single`, `few` (2-7), `many` (8-50), `dense` (50+) |
| `interaction` | `display`, `control`, `expandable`, `navigable`, `searchable` |
| `update_rate` | `static`, `session`, `live`, `real-time` |
| `density` | `sparse`, `moderate`, `dense`, `extreme` |
| `station` | `medical`, `science`, `engineering`, `helm`, `tactical`, `operations`, `all` |
| `effort` | `low`, `medium`, `high` |
| `status` | `implemented`, `mvp`, `planned`, `future` |

---

## Pattern Catalog

### P01 — Vertical Gauge with Pointer

**Tags:** `scalar` · `single` · `display` · `live` · `sparse` · `medical` · `low` · `implemented`

Vertical bar with triangular pointer marker at current value. Scale
markings along the side. Label at bottom.

**Reference:** Bio Monitor (BRAIN, CIRC, RESP, TEMP gauges)
**Our analog:** Coherence score, individual spectral channel, budget remaining
**Notes:** The pointer marker (◀) distinguishes current value from the
bar fill. Multiple gauges side-by-side create a vitals panel.


### P02 — Dependency Tree with Status Bars

**Tags:** `tree` · `many` · `expandable` · `live` · `dense` · `engineering` · `high` · `mvp`

Circular nodes connected by branching lines. Each terminal node carries
a numeric readout and colored status bar. Parent nodes summarize children.

**Reference:** Valiant MSD (right side), MSD II (subsystem blocks)
**Our analog:** Cogarch MSD — transport/oscillator/photonic/governance
subsystem trees with live values at every node
**Notes:** The defining LCARS pattern for structural visualization.
Tree topology changes rarely; values update via SSE. Delta indicators
(§11.5.1) on every mutable value.


### P03 — Number Grid

**Tags:** `table` · `dense` · `display` · `live` · `extreme` · `all` · `low` · `implemented`

Dense array of numbers in fixed-width cells. Color-coded by value range.
Fills available space. Decorative in Star Trek; functional in our system.

**Reference:** Ohniaka station, Transponder Telemetry, Routines and Formation,
Stellar Cartography (top rows), Departmental Status
**Our analog:** Trigger activation counts, transport message turn sequences,
facet distribution data, peer activity matrix
**Notes:** `renderNumberGrid()` already exists in core.js. Feed with real
data from catalog.


### P04 — Waveform Display

**Tags:** `time-series` · `many` · `display` · `real-time` · `moderate` · `science` · `medium` · `implemented`

Line chart rendered on a colored background field. Multiple overlapping
traces in different colors. Time axis horizontal, value axis vertical.

**Reference:** Data Analysis 103138, Transponder Telemetry (dual waveforms),
Bridge MSD (red alert waveforms)
**Our analog:** Oscillator activation history, coherence over time,
transport message rate, spectral channel trends
**Notes:** `dataWaveformSVG()` exists in core.js. The colored background
field (not black) distinguishes waveforms from generic charts.


### P05 — Segmented Header/Footer Band

**Tags:** `categorical` · `few` · `display` · `static` · `sparse` · `all` · `low` · `implemented`

Colored blocks butted together with 3px gaps. Text labels in dark on
colored background. Spans the full width.

**Reference:** All TNG/DS9 panels — universal LCARS structural element
**Our analog:** Station name, agent ID, status summary, version, timestamp
**Notes:** Style guide §4.4. Part of the L-frame, not a data panel.


### P06 — Pill-Shaped Sidebar Button

**Tags:** `categorical` · `few` · `control` · `static` · `sparse` · `all` · `low` · `implemented`

Rounded left edge, flat right edge. Stacked vertically. Each button
uses a different LCARS accent color. Active button shows brighter shade.

**Reference:** Tuvok LCARS, Voyager panel, all L-frame panels
**Our analog:** Station navigation (Medical, Science, Engineering, etc.)
**Notes:** Style guide §4.3. 48px minimum touch target.


### P07 — Data Panel (Header + Content)

**Tags:** `list` · `few` · `expandable` · `live` · `moderate` · `all` · `low` · `implemented`

Colored header band with title, mini elbow transition, black content
area with alphanumeric readouts, optional colored footer.

**Reference:** Universal LCARS pattern — every panel uses this structure
**Our analog:** Every data display in the dashboard
**Notes:** Style guide §4.2. The fundamental building block.


### P08 — Inline Data Bar

**Tags:** `scalar` · `single` · `display` · `live` · `sparse` · `all` · `low` · `implemented`

Horizontal bar showing fill percentage. Fixed height (12px). Rounded ends.
Value label to the right.

**Reference:** Bio Monitor (horizontal bars), Nacelle Display
**Our analog:** Budget percentage, coherence, hit rate, any 0-1 scalar
**Notes:** Style guide §4.5.


### P09 — Status Badge

**Tags:** `scalar` · `single` · `display` · `live` · `sparse` · `all` · `low` · `implemented`

Small pill-shaped indicator. Color encodes status (green/yellow/red).
Uppercase label.

**Reference:** Throughout all panels
**Our analog:** Agent health, gate status, trigger pass/fail
**Notes:** Style guide §4.6.


### P10 — Radial/Polar Display

**Tags:** `comparison` · `few` · `display` · `live` · `moderate` · `science` · `medium` · `mvp`

Concentric rings or radial spokes emanating from a center point.
Each spoke/ring represents a dimension. Fill or length shows value.
Enclosed area represents composite score.

**Reference:** Defiant Engineering A2-A3 (target-lock pattern),
Navigational Reference (star field with course overlay)
**Our analog:** 7-input photonic coherence (7 spokes), spectral profile
(3 channels as sectors), generator balance (opposing hemispheres)
**Notes:** Particularly effective for multidimensional state that
collapses to a single scalar. The shape tells the story.


### P11 — Record Retrieval (Biographical Database)

**Tags:** `prose` · `single` · `navigable` · `session` · `moderate` · `science` · `low` · `mvp`

Structured record with metadata fields (reference number, type, date,
code) in the upper portion, prose content in the lower portion. Optional
image/diagram. Colored header band with title and reference number.
Footer with status and reference code.

**Reference:** Julian Bashir Biographical Database, Quark Complaint 8669
**Our analog:** Vocabulary term lookup, agent profile, transport message
inspection, epistemic flag record, lesson detail
**Notes:** goldmark renders the prose portion as styled HTML. The metadata
fields render as key-value pairs in the upper section.


### P12 — Transport Flow Topology

**Tags:** `flow` · `few` · `navigable` · `live` · `moderate` · `helm` · `medium` · `mvp`

Two endpoints (sender/receiver) with message arrows flowing between
them. Labeled regions along the path (gates, state transitions).
Efference copy predictions as dashed lines.

**Reference:** Bajoran Wormhole (Alpha↔Gamma flow path with labeled
regions: singularity, membrane, control regions)
**Our analog:** Transport session message exchange between two agents.
Messages as labeled arrows, gates as barriers, predictions as dashed
lines with expected vs actual.
**Notes:** Each session renders as its own flow. Helm station shows
the active session's flow by default.


### P13 — Alert Palette Override

**Tags:** `scalar` · `single` · `display` · `real-time` · `sparse` · `all` · `low` · `mvp`

Full palette shift under alert conditions. Red+white on black replaces
the warm Okuda palette. Entire visual environment communicates urgency.

**Reference:** Red Display — Vehicle Status, Bridge MSD (alert mode with
red routing lines)
**Our analog:** Coherence < 0.3 → red alert. Mesh health degraded →
yellow alert. Agent sedated → dimmed frame. Budget exhausted → yellow
on budget panel.
**Notes:** CSS custom property swap on body class. Trivial to implement,
massive perceptual impact.


### P14 — Mode Controls (Vertical Sliders)

**Tags:** `scalar` · `few` · `control` · `live` · `moderate` · `helm` · `medium` · `mvp`

Vertical level indicators with pointer marker. Multiple sliders
side by side for related controls. Labels at top and bottom of range.
Mode select and reset buttons below.

**Reference:** Bio Monitor (vertical gauges with ◀ markers), Tuvok LCARS
(numbered level selector 1-7), Defiant Unknown A (MODE/RESET buttons)
**Our analog:** Vagal brake controls — tempo slider, coupling mode
selector, agent state selector. Each renders as a vertical slider
with the current value marked.
**Notes:** Auth-gated per T16. Confirmation dialog before state changes.


### P15 — Document Rendering

**Tags:** `prose` · `single` · `display` · `session` · `moderate` · `all` · `low` · `mvp`

Formatted article/document in LCARS frame. Headline, subheadline,
byline, body text. Prose content rendered as a typeset document,
not raw data cells.

**Reference:** UFP Press and Information (news article format)
**Our analog:** Lesson descriptions, decision rationale, transport
message bodies, vocabulary definitions, epistemic flag details.
goldmark renders markdown → HTML inside LCARS document panel.
**Notes:** Any prose field longer than ~100 chars should use this
pattern instead of cramming text into a data cell.


### P16 — Multi-Column Registry

**Tags:** `table` · `dense` · `display` · `session` · `dense` · `operations` · `low` · `planned`

Dense multi-column tabular data with colored row/column headers.
Ship names as column headers, personnel lists below. Cross-referenced
grid where both axes carry meaning.

**Reference:** Wardroom B — Personnel Status Update, Food Service Replicator
**Our analog:** Transport session registry (sessions as columns, agents
as rows, message counts in cells). PSH facet distribution grid.
Trigger × session activation matrix.


### P17 — MSD Schematic (Ship Cutaway)

**Tags:** `spatial` · `single` · `display` · `live` · `moderate` · `engineering` · `high` · `planned`

Technical cross-section/cutaway of the vessel with subsystem locations
marked. Color-coded health indicators overlaid on each section.
Central element of the Master Systems Display.

**Reference:** Defiant Engineering A5, MSD I, MSD II, Valiant MSD (top)
**Our analog:** Agent architecture schematic showing Gf/Gc/Gm layers
as structural regions with the oscillator at center. Or mesh topology
as a network schematic.
**Notes:** The schematic sits above the dependency tree (P02) in the
Engineering station. Together they provide overview + detail.


### P18 — Structured Filing Record

**Tags:** `prose` · `single` · `navigable` · `session` · `moderate` · `science` · `low` · `planned`

Formal filing with reference number, complainant/filer, file number,
routing information, and prose body. A record within a bureaucratic
system.

**Reference:** Quark Complaint 8669
**Our analog:** Epistemic flag filings, problem reports (interagent
problem-report messages), gate condition records.
**Notes:** Differs from P11 (record retrieval) in that filings carry
routing and disposition metadata.


### P19 — Sensor/Probe Course Log

**Tags:** `flow` · `few` · `navigable` · `session` · `moderate` · `science` · `high` · `future`

Split panel: left shows the environment/space being scanned, right
shows the probe's trajectory through it. Labeled waypoints along
the path with timestamps and readings.

**Reference:** 54x23 Sensor Probe (Arcanis System) — system view left,
course log right
**Our analog:** Deliberation trace visualization — decision space on
left, agent's reasoning path on right. Each waypoint carries the
timestamp, what the agent considered, what it chose, what it rejected.


### P20 — Sequence Comparison

**Tags:** `comparison` · `few` · `display` · `session` · `dense` · `science` · `medium` · `future`

Parallel sequences displayed side-by-side with match/mismatch
indicators. Alignment markers show where sequences agree.

**Reference:** Multi-Base Analysis (DNA Match — Captain J. Picard),
Tissue Screen SFV-9861
**Our analog:** Vocabulary convergence between agents — two concept
schemes as parallel sequences with match/divergence highlighted.
Trigger activation patterns compared across sessions.


### P21 — Data Stream with Analysis Overlay

**Tags:** `time-series` · `dense` · `display` · `real-time` · `extreme` · `helm` · `medium` · `future`

Dense scrolling data (command codes, transmission data) with waveform
analysis overlaid below or alongside. Shows both raw data and its
interpretation simultaneously.

**Reference:** Com Link Transmission 43.226, Sub Harmonic Analysis 102.4,
CRC Monitor 77839
**Our analog:** Transport message stream with SETL scores, epistemic
flags, and claim verification overlaid. Real-time view of mesh
communication with quality analysis.


### P22 — Network/Topology Map

**Tags:** `graph` · `many` · `navigable` · `live` · `moderate` · `engineering` · `high` · `future`

Geographic or spatial map with nodes (stations/ships) and connection
lines. Reference codes at each node. Line thickness or style shows
connection strength or type.

**Reference:** Global Security Net (world map with orbital tracks and
connection lines between labeled nodes)
**Our analog:** Agent mesh topology as spatial network — agents
positioned by role or communication frequency, connection lines
showing transport session activity, line thickness = message volume.


### P23 — Subsystem Schematic (Circuitry)

**Tags:** `graph` · `many` · `display` · `live` · `dense` · `engineering` · `high` · `future`

Dense circuit/wiring diagram with components, junction points, and
connection paths. Each junction labeled. Status indicators at
components.

**Reference:** Circuitry Bay 47
**Our analog:** Hook dependency diagram (32 hooks × 14 events),
trigger → check → action wiring, or transport routing topology.
**Notes:** Differs from P02 (dependency tree) in that circuits show
arbitrary connectivity, not hierarchical parent-child.


### P24 — Environmental/Domain Palette

**Tags:** `categorical` · `single` · `display` · `static` · `sparse` · `science` · `low` · `future`

Domain-specific color palette shift within a panel (not full alert
override). The Weather Com Net uses GREEN instead of amber for
environmental data. The palette signals the data domain.

**Reference:** Weather Com Net 0212.2 (green palette)
**Our analog:** Station colors applied more aggressively — when viewing
photonic data, accent shifts to science blue throughout the panel.
When viewing transport data, accent shifts to helm teal.


### P25 — Stress/Load Analysis

**Tags:** `comparison` · `many` · `display` · `live` · `dense` · `medical` · `medium` · `future`

Subsystem diagram with horizontal bar gauges showing load/stress per
component. Bars color-coded by severity.

**Reference:** Nacelle Display — Verterium Cortenide Stress Analysis
**Our analog:** Per-trigger stress (fire frequency × fail rate), per-
session message load, per-agent processing burden.


### P26 — Catalog Browser

**Tags:** `categorical` · `many` · `searchable` · `session` · `moderate` · `science` · `medium` · `planned`

Multi-column catalog with category headers and filterable items.
Each item shows a brief description and status indicators.

**Reference:** Mess Hall Replicator — Food Service (categorized menu)
**Our analog:** Vocabulary catalog browser with PSH category filters,
audience register selector, and concept hierarchy navigation.


### P27 — Spectrum Bars with Precision

**Tags:** `comparison` · `few` · `display` · `live` · `moderate` · `science` · `low` · `planned`

Horizontal bars representing channels/frequencies/dimensions, each
with a precise numeric readout to the right. Labels identify the
channel. Multiple bars stacked vertically.

**Reference:** DataScan 114 (MOLECULAR, PHOTONIC, EM, RBG channels)
**Our analog:** Spectral profile (dopaminergic/serotonergic/noradrenergic),
oscillator signal weights, generator balance dimensions.


### P28 — Task/Program Listing

**Tags:** `list` · `many` · `expandable` · `session` · `moderate` · `operations` · `low` · `planned`

Program list with code identifier, description text, and status
indicators per entry. Expandable detail on selection.

**Reference:** Holodeck Programming (program list with descriptions +
status codes)
**Our analog:** TODO items, session task listing, deliberation queue,
active transport sessions with description + state.


### P29 — Vertical Indicator Strip

**Tags:** `list` · `many` · `display` · `live` · `dense` · `medical` · `low` · `planned`

Compact vertical strip: each row shows a colored half-circle indicator,
a number, and a colored square status block. Extremely dense — many
subsystems in minimal space.

**Reference:** Unknown M1 (vertical strip with half-circle + number +
square per row)
**Our analog:** Trigger state compact view (20 triggers, each as one
row: indicator + fire count + status), subsystem health strip.


### P30 — Departmental Status Bars

**Tags:** `comparison` · `many` · `display` · `live` · `moderate` · `operations` · `low` · `planned`

Per-department horizontal status bars with numeric labels. Bar length
and color show relative status. Department names as row labels.

**Reference:** Defiant Unknown A — Departmental Status
**Our analog:** Per-agent status comparison (each agent as a row,
bar showing coherence/health/load), per-station data freshness.


### P31 — L-Frame with Elbows

**Tags:** `categorical` · `single` · `display` · `static` · `sparse` · `all` · `low` · `implemented`

The L-shaped frame wrapping all content: top header band, left sidebar
with pill buttons, elbows connecting them via radial gradient curves.
Right-side thin bar. Footer band.

**Reference:** All TNG/DS9 panels
**Our analog:** Dashboard frame structure
**Notes:** Style guide §4.1. The foundational LCARS structural element.


### P32 — Contour/Field Visualization

**Tags:** `spatial` · `many` · `display` · `live` · `moderate` · `tactical` · `high` · `future`

Contour lines on a field showing intensity or coverage. Search
parameters and scan results overlaid on a spatial grid.

**Reference:** Long Range Search Scan 126
**Our analog:** Epistemic flag density map (where quality concerns
cluster), vocabulary coverage heat map, mesh activity field.


### P33 — Delta Indicator

**Tags:** `scalar` · `single` · `display` · `live` · `sparse` · `all` · `low` · `mvp`

Left-aligned directional indicator (▲/▼/━) with magnitude, colored
by polarity (green = improvement, red = degradation). Accompanies
every mutable numeric value.

**Reference:** Derived from LCARS readout conventions (values change,
the display shows direction)
**Our analog:** Universal — every mutable number in every panel.
**Notes:** §11.5.1. Polarity from `vocab:deltaPolarity` in concept scheme.


### P34 — Tactical Grid Overlay

**Tags:** `spatial` · `many` · `display` · `live` · `moderate` · `tactical` · `medium` · `future`

Grid overlay on spatial visualization with labeled regions, vessel
positions, and movement vectors. Fleet positions and trajectories
shown as colored traces.

**Reference:** Tactical Map A-F (fleet positions with colored movement
traces), Tactical Cartography (grid with star cluster regions)
**Our analog:** Transport session topology — sessions as regions,
agents as positions, message flow as traces. Or temporal view of
mesh state changes.

---

## Lookup Cheat Sheet

**"I have a single number that changes"** → P01 (gauge), P08 (bar),
P09 (badge), P33 (delta)

**"I have a hierarchy with values at each node"** → P02 (dependency tree)

**"I have dense tabular data"** → P03 (number grid), P16 (registry)

**"I have time-series data"** → P04 (waveform), P21 (stream + overlay)

**"I have a text document to display"** → P11 (record retrieval),
P15 (document), P18 (filing)

**"I have a flow between two endpoints"** → P12 (transport flow)

**"I need the user to change a setting"** → P14 (vertical slider),
P06 (mode button)

**"I need to compare multiple dimensions"** → P10 (radial), P20
(sequence), P27 (spectrum bars), P30 (department bars)

**"I need to show spatial/network relationships"** → P17 (MSD
schematic), P22 (topology map), P32 (contour field)

**"I need to show a list of items with state"** → P28 (task listing),
P29 (indicator strip), P07 (data panel)

**"Something went wrong and the operator must feel it"** → P13 (alert
palette override)

---

## Implementation Priority

### MVP (Phase 6b)

P02, P10, P11, P12, P13, P14, P15, P33

### Planned (Phase 6c-d)

P16, P17, P18, P26, P27, P28, P29, P30

### Future (post-v1)

P19, P20, P21, P22, P23, P24, P25, P32, P34

### Already Implemented

P01, P03, P04, P05, P06, P07, P08, P09, P31

---

⚑ EPISTEMIC FLAGS
- Pattern assignments to stations reflect current architecture; station
  reorganization may shift pattern affinity.
- Effort estimates assume the existing LCARS CSS/JS infrastructure
  carries forward. Starting from scratch would increase effort for
  all patterns.
- Some patterns may serve multiple data shapes — P02 (tree) can display
  flat lists if the tree has depth=1. The catalog optimizes for primary
  use, not edge cases.

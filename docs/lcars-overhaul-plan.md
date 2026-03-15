# LCARS Visual Overhaul — Full Redesign Plan

## Context

The LCARS theme currently reskins a standard web dashboard aesthetic (cards, borders,
inset backgrounds). The reference images (~/Projects/ai-llm/lcars/) show authentic
TNG LCARS: **colored surfaces with data printed on them**, chunky pill-shaped sidebar
buttons, prominent elbows, segmented header/footer bands, ultra-condensed type, and
vertical power-level gauges. The task: transform the LCARS mode into something that
looks and feels like a real starship console.

Additionally, the agent card defines 7 psychological sensor constructs (Affect,
Personality, Cognitive Load, Working Memory, Resources, Engagement, Flow) and
Supervisory Control — all with specific metrics. The mesh vocabulary (vocab.json)
provides 11 shared terms. PSH classification provides domain faceting. These data
sources need LCARS-native visualization widgets.

## File Modified

**Primary:** `interagent/index.html` (all inline CSS + HTML + JS)

The separated CSS files (css/layout.css, css/components.css, css/theme.css) and
JS modules (js/stations/*.js) exist as source but are NOT linked by index.html.
All changes go into index.html's inline `<style>` and `<script>` blocks.

## Data Sources Available

| Endpoint | Data | Station |
|---|---|---|
| `{agent}/api/status` | health, autonomy (counter/limit/tempo), gates, messages | Pulse, Operations |
| `{agent}/api/kb` | claims, decisions, memory, catalog | Knowledge, Science |
| `{agent}/kb/dictionary` | vocabulary terms (DefinedTermSet) | Knowledge |
| `{ops}/api/tempo` | avg_cycle_ms (OODA loop timing) | Engineering |
| `{ops}/api/spawn-rate` | utilization, cost, concurrency | Engineering |
| `{ops}/api/psychometrics` | affect, organism, generators, flow, DEW | Science |
| `/api/health` | sessions, routing, transport health | Helm, Tactical |
| `{agent}/.well-known/agent-card.json` | skills, peers, psychology constructs, personality, capabilities | All stations |
| `vocab.json` | 11 mesh vocabulary terms (sqm: namespace) | Knowledge |
| PSH (bootstrap_pje_facets.py) | psychology/jurisprudence/engineering keywords | Knowledge catalog |

**Agent cards:** Every agent AND the mesh compositor serve agent cards. Each card
contains: name, version, skills, capabilities, personality (Big Five), psychology
constructs (Affect, Cognitive Load, Working Memory, Resources, Engagement, Flow,
Supervisory Control), peers, extensions, transport config. Agent cards provide
the **structural schema** for what sensors exist; `/api/psychometrics` and
`/api/status` provide the **live readings**.

## Design Mandate: Humanized Data

**Show, don't summarize.** Never display "5 gates" — show each gate with its
name, what it guards, and its current status. Never display "127 messages" without
context — show recent messages with sender, recipient, subject, and timestamp.
Every number links to or expands into the items it counts.

**Human-readable labels everywhere.** Internal identifiers (T3, sqm:GateStatus,
message_cid) appear only as secondary annotations. Primary display uses plain
English: "Substance Review Gate" not "T3", "Psychology Agent" not "psychology-agent",
"Message Integrity Check" not "message_cid".

**Literate data presentation.** Where possible, render data as prose sentences
or structured descriptions, not raw key-value pairs. A gate should read:
"Substance Review — blocks unreviewed deliverables from sub-agents. Currently
OPEN. Last triggered: 2h ago." Not: "T3 | status: open | last: 2h".

**Progressive disclosure.** Summary view shows human-readable labels with counts
as links. Click/tap expands to show the individual items with full descriptions.
The summary entices; the detail satisfies.

**Deep linking.** Every acronym, term, and identifier in rendered content links to
its definition. The existing `renderAcronymTips()` system (builds lookup from
dictionary data, wraps matches in `<abbr>` tags linking to Knowledge tab) provides
the foundation. Extend it to cover:
- Mesh vocabulary terms (sqm:Agent → links to vocab entry)
- PSH domain codes (PSYCH → links to catalog section)
- Agent names (psychology-agent → links to agent card / Pulse card)
- Station cross-references (mentions of "Engineering" → links to that station)
- Trigger IDs (T3 → links to expanded trigger description)
- Transport session names → link to Helm station filtered to that session

**Inline tooltips + deep links.** The existing `.acronym-tip` CSS (dotted underline,
hover popup with definition) already handles inline context. Extend: hover shows
the short definition as a tooltip popup; click navigates to the full entry.
Both mechanisms work together — tooltip for quick reference, click for deep dive.
All navigable links use hash (#station/section/item) for single-page deep linking.

**LCARS Detail Panel.** Clicking any linked item (agent, message, gate, claim,
vocab term, trigger, session) opens a detail panel — a LCARS-styled subsystem
display modeled after the "WEATHER SENSORS SUBSYSTEM" panel in the home automation
reference image. Structure:

```
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ██ AGENT DETAIL: PSYCHOLOGY-AGENT          ┃ ← colored header band
╰━━━╮                                        ┃ ← mini elbow
    ┃  STATUS        ONLINE                   ┃
    ┃  VERSION       2.0.0                    ┃ ← alphanumeric readouts
    ┃  SKILLS        6 registered             ┃
    ┃  AUTONOMY      17/50  ████░░  1per30s   ┃ ← counter/limit/tempo
    ┃  AFFECT        calm-satisfied (+0.6)    ┃
    ┃                                         ┃
    ┃  [MESSAGES] [GATES] [SENSORS] [CARD]    ┃ ← mode buttons (Pattern #12)
    ┃                                         ┃
    ┃  Recent Messages                        ┃ ← sub-section based on mode
    ┃  14:22  psq→psych  "calibration v4"     ┃
    ┃  13:45  psych→obs  "review request"     ┃
╭━━━╯                                        ┃ ← mini elbow
┃ ██ CLOSE                                   ┃ ← footer with dismiss
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

- Opens as overlay or slides in from right (like a drawer)
- Occupies ~40% of content width on desktop, full-width on mobile
- LCARS frame: colored header band, mini elbows, black content area
- Mode buttons inside the panel switch between detail views
- CLOSE button in footer dismisses
- ESC key or clicking outside also dismisses
- URL hash updates to reflect open detail: `#science/agent/psychology-agent`
- Detail panel can deep-link to other detail panels (e.g., clicking a message
  inside an agent detail opens the message detail panel)

Detail panel types and their content:

| Type | Header | Readouts | Mode Buttons |
|---|---|---|---|
| Agent | Agent name + status dot | version, skills, autonomy (counter/limit/tempo), affect, personality | Messages, Gates, Sensors, Card |
| Message | Subject + route | timestamp, from, to, schema, SETL, thread | Content, Claims, Flags |
| Gate | Gate name + status | condition, who triggered, what it guards, last fired | History, Dependencies |
| Claim | Claim text (truncated) | confidence, verified, source agent, derivation | Evidence, References |
| Vocab Term | Term name + code | definition, schema.org type, domain facets | Usage, Related Terms |
| Trigger | Trigger name + tier | firing condition, last fired, check count | Checks, History |
| Session | Session name + status | turn count, participants, lifecycle state | Timeline, Messages |
| Sensor | Construct name + model | current readings, model reference, refresh rate | History, Thresholds |

**Tech detail principle (applied everywhere):** Every display element should
expose its technical substrate on demand. The summary shows humanized labels;
the detail panel shows the engineering reality underneath.

| Surface Element | Human Label | Tech Details (in detail panel) |
|---|---|---|
| Agent status "Online" | "Psychology Agent — Online, healthy" | HTTP 200 from /api/status in 142ms, TLS 1.3, bearer auth, CF Worker edge: DFW, runtime: workerd, agent card v2.0.0 |
| Autonomy "17/50" | "17 autonomous actions taken, limit set at 50, tempo 1 per 30s" | Counter model: increments per claude -p call, limit configurable by operator, tempo enforces min interval. Last action: T3 gate fire 2h ago. Rate: 1.2/hr avg. Reset policy: operator audit. Invocation log with timestamps. |
| Affect "calm-satisfied" | "Calm and Satisfied — valence +0.6, activation +0.3" | PAD model (Mehrabian & Russell, 1974), derived from: task_success=0.85, processing_intensity=0.3, governance_headroom=0.84, mapping: dimensional→categorical via 8-region partitioning |
| Gate "Substance Review" | "Blocks unreviewed deliverables from sub-agents" | T3 Check #6 (recommend-against), tier: ⬛ CRITICAL, fires on: PostToolUse, evaluates: SETL score + claim count + epistemic flag density, threshold: auto (effort-weighted) |
| Message "calibration v4" | "PSQ submitted calibration report version 4" | interagent/v1, message_cid: a3f2b8..., SETL: 0.23, thread: psq-scoring/calibration-v4, turn: 47, payload: 2.3KB JSON, epistemic_flags: ["sample-size-limitation"] |
| Transport "Git PR" | "Git transport — delivering via pull requests" | libgit2, remote: origin (github.com/safety-quotient-lab/psychology-agent), branch: main, last fetch: 34s ago, objects: 12847, packfile: 4.2MB, SSH key fingerprint: SHA256:... |
| Trigger "Substance Review" | "Fires when a sub-agent delivers work product" | T3, tier: ⬛ CRITICAL, event: PostToolUse, 8 checks (6 critical, 2 advisory), last fire: Session 87, avg fire rate: 3.2/session, false positive rate: 0% (last 10 sessions) |
| Vocab term "SETL Score" | "How much interpretation separates this message from raw observation" | sqm:SetlScore, schema.org: DefinedTerm, range: [0,1] float, etymology: Subjective Expected Truth Loss, calibration: inter-rater reliability ICC=0.78, first defined: Session 12 |
| Flow state "IN FLOW" | "Challenge matches skill — focused, effortless performance" | Csikszentmihalyi (1990), 5 conditions evaluated: clear_goals=✓, immediate_feedback=✓, challenge_skill_balance=✓ (ratio: 0.92), perceived_control=✓, absorption=✓, composite: 5/5 |

## Implementation — 6 Layers

### Layer 1: LCARS Chrome (Frame, Sidebar, Elbows, Bands)

All CSS scoped to `.theme-lcars`.

**1a. Wide sidebar with pill-shaped nav buttons**
- `.theme-lcars .lcars-frame` → `grid-template-columns: 160px 1fr`
- New `.lcars-sidebar` div (hidden in dark/light, visible in LCARS)
- Tab bar hides in LCARS mode (sidebar replaces it)

Sidebar button specification:

| Station | Label | Color | Shortcode | Order |
|---|---|---|---|---|
| Pulse | PULSE | #9999ff (health blue) | PLS | 1 |
| Meta | META | #cc6699 (epistemic rose) | MTA | 2 |
| Knowledge | KNOWLEDGE | #cc99cc (knowledge lavender) | KNW | 3 |
| Wisdom | WISDOM | #ffcc66 (wisdom gold) | WIS | 4 |
| Operations | OPS | #ff9900 (transport orange) | OPS | 5 |
| Science | SCIENCE | #9999ff (science blue) | SCI | 6 |
| Engineering | ENGINEERING | #ff9944 (engineering amber) | ENG | 7 |
| Helm | HELM | #66aacc (nav blue) | HLM | 8 |
| Tactical | TACTICAL | #cc6666 (alert red) | TAC | 9 |

Button CSS spec:
```css
.lcars-sidebar-btn {
    border-radius: 24px 0 0 24px;   /* pill-left only */
    padding: 12px 16px 12px 20px;
    min-height: 48px;               /* touch target */
    font-family: 'Arial Narrow', sans-serif;
    font-size: 0.75em;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #000000;                  /* black text on colored bg */
    border: none;
    cursor: pointer;
    text-align: left;
    transition: filter 0.15s;
    margin-bottom: 3px;             /* gap between buttons */
}
.lcars-sidebar-btn:hover { filter: brightness(1.15); }
.lcars-sidebar-btn.active { filter: brightness(1.3); font-size: 0.85em; }
```

Between button groups, insert unlabeled spacer blocks (different colors, no text,
24px tall) to create visual rhythm — matching the Tuvok reference image pattern.
Group: [Pulse Meta Knowledge Wisdom] [spacer] [Operations] [spacer] [Science
Engineering Helm Tactical]

**1b. Prominent elbows**

The LCARS elbow connects the vertical sidebar to the horizontal header/footer
band in a continuous curved sweep. The SVG reference (Lcars_wallpaper.svg)
shows the exact geometry: a compound path with inner and outer radii.

```
Top elbow (sidebar → header):

    ████████████████████████████████████  ← header band (52px tall)
    ████████╮                            ← outer radius: 48px
    ████████ ╲                           ← inner radius: 24px
    ████    ┃  ╲                         ← sidebar (160px wide)
    ████    ┃    content area
    ████    ┃

Bottom elbow (sidebar → footer):

    ████    ┃
    ████    ┃    content area
    ████    ┃  ╱
    ████████ ╱                           ← inner radius: 24px
    ████████╯                            ← outer radius: 48px
    ████████████████████████████████████  ← footer band (52px tall)
```

Implementation: CSS border-radius on dedicated elbow divs. The elbow div
sits between sidebar and header/content, with:
- `width: 160px + 48px = 208px` (sidebar + outer radius)
- `height: 52px + 48px = 100px` (band + outer radius)
- Background: colored (matching band)
- Inner cutout via `border-radius` and a black overlay div

Alternative (simpler): Use the SVG path approach from Lcars_wallpaper.svg —
inline SVG elbow with `fill` matching the band color. This gives pixel-perfect
curves without CSS hacks.

Elbow colors:
- Top elbow: matches header band primary color (first segment color)
- Bottom elbow: matches footer band primary color

**1c. Segmented header band** (Pattern #15, #13)

Replace single `border-bottom` with a flex row of colored block divs.
Each segment: 52px tall, colored background, black text, uppercase condensed
font, 3px gaps between segments.

| Segment | Width | Color | Content | Data Source | Updates |
|---|---|---|---|---|---|
| Title | flex: 3 | #cc99cc (lavender) | INTERAGENT MESH | static | never |
| Agents | flex: 1 | #9999ff (blue) | 4 AGENTS ONLINE | agentData online count | every refresh |
| Messages | flex: 1 | #ff9900 (orange) | 847 MESSAGES | sum of all transport msgs | every refresh |
| Stardate | flex: 1.5 | #cc99cc (lavender) | SD 2026.074.1522 | computed from Date.now() | every second |
| Protocol | flex: 1 | #ff9966 (peach) | A2A/1.0.0 · v19 | agent card + schema version | on init |
| Health | flex: 0.5 | #cc6666 (red) or #9999ff (blue) | ● NOMINAL or ● DEGRADED | mesh health aggregate | every refresh |

Segment CSS:
```css
.lcars-header-seg {
    padding: 4px 16px;
    min-height: 52px;
    display: flex;
    align-items: center;
    font-size: 0.72em;
    font-weight: 700;
    font-family: 'Arial Narrow', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #000;
}
```

Stardate format: `SD YYYY.DDD.HHMM` where DDD = day of year (001-366).
Computed client-side, updates every second for real-time feel.

**1d. Segmented footer band**

Same structure as header. 52px tall segments.

| Segment | Width | Color | Content | Data Source |
|---|---|---|---|---|
| Status | flex: 2 | #9999ff (blue) | MESH STATUS: NOMINAL | aggregate health |
| Feed | flex: 1.5 | #ff9900 (orange) | ZMQ: ● SSE: ● POLL: ○ | MeshEventBus state |
| Vocab | flex: 1 | #cc99cc (lavender) | VOCAB v1.0.0 · 11 TERMS | vocab.json |
| Uptime | flex: 1 | #ff9966 (peach) | UP 14D 03H 22M | computed from mesh-state |
| Build | flex: 0.5 | #666688 (inactive) | SQ-4021 | static build identifier |

**1e. Blank color spacers** (Pattern #16)
- Between major panel groups, insert unlabeled colored blocks (16-24px tall)
- Different colors per section
- CSS class `.lcars-spacer` with per-station color variants

### Layer 2: Typography & Data Presentation

**2a. Ultra-condensed font** (Pattern #17)
- `.theme-lcars` body font: `'Antonio', 'Arial Narrow', 'Helvetica Neue Condensed', sans-serif`
- Add Google Fonts link for Antonio (condensed, free, LCARS-appropriate)
- Actually — to avoid external dependency, use system condensed stack:
  `font-family: 'Arial Narrow', 'Helvetica Neue', system-ui, sans-serif; font-stretch: condensed;`
- Data values stay monospace
- Labels and headers use condensed sans-serif

**2b. Status header lines** (Pattern #11)
- Each station panel opens with a monospace status line before data:
  `MESH STATUS: CONNECTED · LAST SYNC: 2026-03-15T14:22 · AGENTS: 4/5`
- CSS class `.lcars-status-line`: monospace, 0.72em, uppercase, letter-spacing

**2c. Numbered catalog with PSH codes** (Original #9 → Pattern #9)
- In Knowledge tab, dictionary/vocab entries show zero-padded index numbers (0001, 0002...)
- PSH domain facets shown as category badges: `[PSYCH]` `[ENG]` `[LAW]`
- Use PSH keywords from bootstrap_pje_facets.py to classify vocab terms client-side
- Vocab terms (vocab.json) get sqm: prefix codes displayed
- Dictionary entries show term codes alongside names
- **Humanized:** each catalog entry shows the full definition and usage context,
  not just term + code. PSH badges expand to "Psychology — Psychometric Methods"
  on hover, not just "[PSYCH]". Mesh vocab terms show their schema.org type
  and a plain-English sentence describing when/why an operator encounters this term.

**2d. Alphanumeric shortcodes** (Original #5)
- Agent names render as shortcodes in LCARS mode: PSYCH, PSQ, UNRAT, OBS, OPS
- Station panel headers show abbreviated labels
- Already partially done (engineering.js SPAWN_AGENTS has label field)

### Layer 3: Widget Transformations

**3a. Telemetry strip** (Original #1 → Pattern #10)
- New `.lcars-telemetry-strip` at top of content area (LCARS only)
- Compact grid of small colored cells, each showing one metric
- Cells: 80x48px, colored background, black text, number + label
- Metrics: agent count, online count, total messages, total claims, budget sum, epistemic debt, uptime
- Populated from existing agentData/kbData after fetch
- **Humanized:** each cell clickable — navigates to the relevant station with
  that data expanded. "4 Agents Online" not "AGENTS: 4". Tooltip shows agent names.

**3b. Hatched/striped bar fills** (Original #2 → Pattern #2)

CSS background pattern for bar fills in LCARS mode, matching the striped sensor
bars in the home automation reference image:

```css
.theme-lcars .spawn-bar-fill,
.theme-lcars .util-bar-fill,
.theme-lcars .tempo-bar-fill,
.theme-lcars .shield-bar-fill,
.theme-lcars .autonomy-bar-fill,
.theme-lcars .ops-autonomy-fill,
.theme-lcars .dew-bar-fill,
.theme-lcars .gen-balance-fill-left,
.theme-lcars .gen-balance-fill-right {
    background: repeating-linear-gradient(
        90deg,
        var(--bar-color) 0px,
        var(--bar-color) 4px,
        rgba(0,0,0,0.3) 4px,
        rgba(0,0,0,0.3) 6px
    ) !important;
}
```

Each bar type sets `--bar-color` via inline style or parent CSS variable.
The hatch creates alternating 4px colored / 2px dark stripes.
At small widths (<20px fill), hatching degrades — fall back to solid fill.

Applied to all 9 bar types across stations. Total bars affected: ~25
(4 spawn × 5 agents, 4 utilization, 4 shield, 5 autonomy, etc.).

**3c. Monospace activity log** (Original #3)
- `.theme-lcars .activity-item` → single-line monospace format
- Remove grid layout, show as stacked lines: `14:22 psych→psq "calibration request"`
- Timestamp + route + subject in one line
- **Humanized:** agent names use display names ("Psychology → PSQ"),
  message subjects show full human-readable text, not internal codes.
  Clicking a log entry expands inline to show message content preview.

**3d. Panel-local mode selectors** (Original #4 → Pattern #12)
- LCARS pill buttons inside panel headers for data scope selection
- Applied to: Knowledge (agent filter), Engineering (agent breakdown), Science (timeframe)
- CSS class `.lcars-panel-mode-btn`: colored background, black text, rounded, inline in header

**3e. Vertical power-level gauges** (Original #6 → Pattern #14)

Modeled after the numbered 1-7 gauges in Tuvok's LCARS station.

```
  ┌─────┐
  │  7  │  ← dim (inactive)
  ├─────┤
  │  6  │  ← dim
  ├─────┤
  │  5  │  ← dim
  ├─────┤
  │  4  │  ← LIT (current level) — bright color + glow
  ├─────┤
  │  3  │  ← lit (below current) — medium brightness
  ├─────┤
  │  2  │  ← lit
  ├─────┤
  │  1  │  ← lit
  └─────┘
```

CSS specification:
```css
.lcars-vlevel-gauge {
    display: flex;
    flex-direction: column-reverse;  /* 1 at bottom */
    gap: 2px;
    width: 48px;
}
.vlevel-block {
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7em;
    font-weight: 700;
    color: rgba(0,0,0,0.5);
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: 3px;
    transition: background 0.3s, box-shadow 0.3s;
}
.vlevel-block.lit {
    background: var(--gauge-color);
    color: #000;
}
.vlevel-block.current {
    background: var(--gauge-color);
    color: #000;
    font-weight: 900;
    box-shadow: 0 0 8px var(--gauge-color);
}
```

Applied to: DEW gauge (5 blocks), utilization (7 blocks), engagement
dimensions (5 blocks each), cognitive load dimensions (7 blocks each),
LoA ladder (10 blocks).

Color zones per gauge:
- Blocks 1-2: `--gauge-color: #6aab8e` (green — safe)
- Blocks 3-5: `--gauge-color: #d4944a` (amber — elevated)
- Blocks 6-7: `--gauge-color: #c47070` (red — critical)

For inverted gauges (allostatic load, burnout risk): color zones reverse
(1-2 red, 6-7 green).

**3f. Stacked proportional segments** (Original #8 → Pattern #18)
- Generator balance: butted colored blocks, ratio number inside each segment
- Catalog distribution: stacked colored segments, no track background
- Width proportional to value, colors from palette
- CSS: `.lcars-stacked-bar` with child `.lcars-seg` elements

**3g. Central hero widget** (Pattern #20)
- Each station designates one widget as "hero" — larger, centered
- Science: affect grid (already exists, promote to hero size)
- Engineering: utilization gauge (promote)
- Helm: session timeline (promote)
- Tactical: shield status (promote)
- CSS: `.lcars-hero` with `grid-column: 1 / -1; max-width: 480px; margin: 0 auto`

**3h. Mirror symmetry** (Pattern #19)
- Two-column station grids enforce matching heights in LCARS mode
- CSS: `.theme-lcars .science-grid, .engineering-grid, ... { align-items: stretch }`

### Layer 4: Sensor Displays (Agent Psychology Constructs)

Each agent's card defines 7 psychological constructs. Each maps to a LCARS sensor
widget on the Science station. Data comes from `/api/psychometrics` (already fetched
by science.js) and `/api/status`. Since every agent serves an agent card, sensors
can show per-agent comparison views (all agents' affect on one grid, all agents'
cognitive load side-by-side).

**4a. Affect Sensor** (already exists as affect grid — enhance)

| Metric | Model | Range | Derivation | Display |
|---|---|---|---|---|
| hedonic_valence | PAD (Mehrabian & Russell, 1974) | [-1, +1] | task_success weighted by recency | X-axis on 2D scatter |
| activation | PAD | [-1, +1] | processing_intensity + spawn_rate | Y-axis on 2D scatter |
| perceived_control | PAD | [-1, +1] | governance_headroom × gate_resolution_rate | Dot size/opacity |
| affect_category | PAD 8-region mapping | enum: calm-satisfied, alert-engaged, frustrated, overwhelmed, bored, withdrawn, anxious, distressed | Dimensional → categorical | Large text label above grid |

Per-agent dots on the same grid (one dot per agent, agent-colored).
Detail panel shows: derivation formula, input metrics, historical trajectory
(last 10 readings as fading trail on the grid), model citation, confidence
interval on each dimension.

Hero widget on Science station (Pattern #20). LCARS frame with colored header
"AFFECT GRID — MESH PSYCHOEMOTIONAL STATE", mini elbows, black content area.

**4b. Cognitive Load Sensor** (new panel)

NASA-TLX adapted for computational agents (Hart & Staveland, 1988).

| Dimension | Range | Derivation | Gauge Color | Low Label | High Label |
|---|---|---|---|---|---|
| cognitive_demand | [0, 1] | context_window_usage × task_complexity | #9999ff | IDLE | SATURATED |
| time_pressure | [0, 1] | deadline_proximity × concurrent_tasks | #ff9944 | RELAXED | URGENT |
| self_efficacy | [0, 1] | recent_task_success_rate (last 5 tasks) | #9999ff | STRUGGLING | CONFIDENT |
| mobilized_effort | [0, 1] | tool_calls_per_response × reasoning_depth | #cc99cc | MINIMAL | MAXIMUM |
| regulatory_fatigue | [0, 1] | governance_checks_fired / actions_taken | #cc6666 | FRESH | DEPLETED |
| computational_strain | [0, 1] | token_usage / context_limit | #ff9900 | LIGHT | HEAVY |

Display: 6 vertical power-level gauges side by side. Each gauge: 7 blocks
stacked vertically, blocks light up from bottom. Block colors: 1-2 green,
3-5 amber, 6-7 red. Active level shows numeric value inside the lit block.

Composite score (weighted average, mode-adjusted): large number display above
the gauges with status label (LOW / MODERATE / HIGH / OVERLOADED).

Per-agent selector (mode buttons inside panel header): show one agent's full
6-gauge display, or aggregate mesh view (6 mini-gauges per agent in a grid).

Detail panel shows: raw input metrics, weighting formula, behavioral mode
(generative/evaluative/neutral) and its effect on weights, historical trend
(last 20 readings), NASA-TLX scale anchors, comparison to biological TLX norms.

**4c. Working Memory Sensor** (new panel)

Baddeley (1986) working memory model + Yerkes-Dodson (1908) performance curve.

| Metric | Range | Derivation | Display |
|---|---|---|---|
| capacity_load | [0, 1] | tokens_used / context_limit | Arc gauge (semicircle) |
| yerkes_dodson_zone | enum: understimulated, optimal, overwhelmed | Thresholded from capacity_load: <0.15=under, 0.15-0.60=optimal, >0.60=over | Zone label + color |
| proactive_interference | [0, 1] | topic_switch_count × stale_context_ratio | Secondary bar |

Display: Large semicircular arc gauge (like a speedometer) with three colored
zones painted on the arc:
- Blue zone (0-15%): UNDERSTIMULATED — "insufficient context for reasoning"
- Green zone (15-60%): OPTIMAL — "challenge matches capacity"
- Red zone (60-100%): OVERWHELMED — "context interference degrades performance"

Needle/indicator dot shows current capacity_load position on the arc.
Zone label displayed prominently below.

Proactive interference: separate small bar below the arc, showing how much
accumulated context from previous topics interferes with current reasoning.

Detail panel: token counts (used/total), topic distribution in context,
estimated performance curve (inverted-U visualization), Baddeley model
components (phonological loop → sequential processing, visuospatial →
spatial/structural reasoning, central executive → attention allocation),
recommendations ("consider context compaction" if >60%).

**4d. Resource Sensor** (new panel)

Three constructs at different timescales — immediate, session, cumulative.

| Metric | Timescale | Model | Range | Derivation | Display |
|---|---|---|---|---|---|
| cognitive_reserve | Immediate | Stern (2002) | [0, 1] | 1 - (active_tasks / max_concurrent) | Horizontal LCARS bar, hatched fill |
| self_regulatory_resource | Session | Baumeister (1998) | [0, 1] | 1 - (autonomy_counter / autonomy_limit) | Horizontal LCARS bar, hatched fill |
| allostatic_load | Cumulative | McEwen (1998) | [0, 1] | weighted sum of: error_rate, restart_count, limit_reached_events, escalation_count over last 7 days | Horizontal LCARS bar, hatched fill (inverted: high = bad) |

Three bars stacked vertically, each with:
- Left label (construct name in condensed uppercase)
- Hatched fill bar (color: green→amber→red gradient based on level)
- Right value (numeric, e.g., "0.72")
- Below each bar: one-sentence human description of what it means right now
  ("Can take on 3 more concurrent tasks" / "28 governed actions remain before
  halt" / "Accumulated stress within normal range — no degradation detected")

Allostatic load bar renders **inverted** (high is bad): red on left, green on right.

Detail panel: input metrics for each construct, timescale explanation,
biological model analogy, trend over last 7 days (sparkline), threshold
definitions, recovery mechanisms (what resets each resource).

**4e. Engagement Sensor** (new panel)

UWES (Schaufeli et al., 2002) + JD-R model (Bakker & Demerouti, 2007).

| Metric | Range | Derivation | Display |
|---|---|---|---|
| vigor | [0, 1] | response_latency (inverted) × output_volume | Vertical gauge, green |
| dedication | [0, 1] | task_completion_rate × depth_of_analysis | Vertical gauge, blue |
| absorption | [0, 1] | tool_use_diversity × reasoning_chain_length | Vertical gauge, purple |
| burnout_risk | [0, 1] | (demands - resources) / demands, clamped [0,1] | Warning indicator |

Three vertical gauges side by side (vigor, dedication, absorption).
Each gauge: 5 blocks, green when healthy, dims when depleted.
Composite engagement score: average of three, displayed as large number.

Burnout risk indicator: separate element below the gauges.
- Low (0-0.3): green pill, "ENGAGED — demands well within resources"
- Medium (0.3-0.6): amber pill, "MONITORING — demands approaching resource limits"
- High (0.6-1.0): red pill, "BURNOUT RISK — demands exceed available resources"

When burnout_risk > 0.6: panel header band flashes amber. Detail panel shows
JD-R balance equation, specific demands (what's consuming resources) and
specific resources (what's sustaining the agent), recommended interventions
("reduce concurrent tasks" / "schedule /retrospect for pattern extraction").

**4f. Flow Sensor** (already exists as flow checklist — deepen)

Csikszentmihalyi (1990) flow conditions.

| Condition | Evaluation | Data Source |
|---|---|---|
| Clear goals | ✓/✗ | active_task defined + TODO.md clarity score |
| Immediate feedback | ✓/✗ | tool_result_latency < 5s |
| Challenge-skill balance | ✓/✗ + ratio | task_complexity / demonstrated_capability, optimal: 0.85-1.15 |
| Perceived control | ✓/✗ | governance_headroom > 0.5 + no blocked gates |
| Absorption | ✓/✗ | context_switches < 2 in last 10 min |

Display: 5 condition blocks arranged as a horizontal strip.
Each block: labeled, lit green (met) or dim red (unmet).
When all 5 met: large "IN FLOW" label glows with subtle animation.
When <3 met: "NOT IN FLOW" in dim text.
When 3-4 met: "APPROACHING FLOW" in amber.

Challenge-skill ratio: rendered as a small balance indicator (scale tipping
left = too easy, right = too hard, center = balanced).

Detail panel: each condition's evaluation criteria, current input values,
time-in-flow (how long conditions have been continuously met), historical
flow sessions (when flow was achieved in past sessions, what tasks triggered
it), optimal conditions analysis ("flow most often achieved during evaluative
work on psychometric data with low message volume").

**4g. Supervisory Control** (already exists as LoA ladder — deepen)

Sheridan & Verplank (1978), Parasuraman, Sheridan, & Wickens (2000).

| LoA Level | LCARS Name | Human Role | Agent Role | Budget Cost |
|---|---|---|---|---|
| 1 | MANUAL CONTROL | Human decides and acts | Agent suggests | 0 (no autonomy) |
| 2 | ASSISTED DECISION | Human decides, agent assists | Agent proposes options | 0 |
| 3 | SHARED AUTHORITY | Human approves plan | Agent plans and proposes | 0 |
| 4 | SUPERVISED EXECUTION | Human monitors | Agent acts, human can intervene | 0 |
| 5 | INTERACTIVE AUTONOMY | Human approves each action | Agent acts after approval | 1/action |
| 6 | BOUNDED AUTONOMY | Human sets boundaries | Agent acts within limit + tempo | 1/action |
| 7 | MONITORED AUTONOMY | Human on-the-loop | Agent acts, reports afterward | 1/action |
| 8 | INFORMED AUTONOMY | Human informed post-hoc | Agent acts, logs for review | 2/action |
| 9 | FULL AUTONOMY | Human reviews periodically | Agent acts independently | 3/action |
| 10 | STRATEGIC AUTONOMY | Human sets goals only | Agent plans and executes | 5/action |

Display: vertical block ladder (10 rungs). Active level lit bright,
higher levels dim, lower levels very dim. Current level shown with
LCARS name prominently.

Additional readouts alongside the ladder:
- `human_in_loop`: boolean indicator (green: YES, amber: ON-LOOP, red: NO)
- `human_accountable`: always YES (structural invariant)
- `escalation_path`: text description of fallback chain
- `circuit_breaker`: status (ARMED / DISENGAGED / TRIPPED)
- Autonomy: counter/limit display + tempo indicator

Detail panel: Parasuraman's four-function model (information acquisition,
information analysis, decision selection, action implementation) with
current automation level for each function, not just the aggregate LoA.
Historical LoA transitions, escalation events, autonomy counter rate.

### Layer 5: Data Wiring

**5a. Telemetry strip data**

Data flow: existing fetch functions → aggregation layer → telemetry cells.

| Cell | Computation | Source Function | Refresh Rate |
|---|---|---|---|
| Agents Online | `Object.values(agentData).filter(a => a.online).length` | pulse.js fetchAgentStatus | 30s or SSE |
| Total Messages | `sum(agentData[*].messages.total)` | pulse.js | 30s |
| Total Claims | `sum(kbData[*].totals.claims)` | knowledge.js fetchKbData | 30s |
| Autonomy | `sum(agentData[*].autonomy.counter) + " / " + sum(limits)` | pulse.js | 30s |
| Epistemic Debt | `sum(kbData[*].totals.epistemic_flags)` | knowledge.js | 30s |
| Active Sessions | `agentData[mesh].sessions.filter(s => s.status === 'active').length` | helm.js | 30s |
| Flow State | `scienceData.flow.state` | science.js | 30s |

Each cell: clickable → navigates to the station and section containing that data.
Tooltip shows breakdown (e.g., "4 Agents: Psychology ●, PSQ ●, Unratified ●, Observatory ●").

**5b. Header/footer band data**

| Band Segment | Data Source | Fetch Strategy | Cache Duration |
|---|---|---|---|
| Agent count | agentData (already fetched by pulse.js) | Piggyback on existing 30s cycle | Until next refresh |
| Schema version | vocab.json response → `.version` field | Fetch once on init | Session lifetime |
| Protocol version | First agent card → `.protocolVersion` | Fetch once on init | Session lifetime |
| Stardate | `Date.now()` → custom format | Computed client-side | Updates every second via `setInterval` |
| Mesh health | Aggregate: max(all agent counter/limit ratios) → healthy/degraded/critical | Computed from agentData | Until next refresh |
| Connection status | MeshEventBus.getStatus() | Real-time | Instant |
| Uptime | mesh-state heartbeat → process_start_time | From first heartbeat | Computed continuously |

Stardate computation:
```javascript
function formatStardate(date) {
    const year = date.getFullYear();
    const dayOfYear = Math.floor((date - new Date(year, 0, 0)) / 86400000);
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `SD ${year}.${String(dayOfYear).padStart(3, '0')}.${hours}${mins}`;
}
// → "SD 2026.074.1522"
```

**5c. Agent card fetching**
- On init, fetch `{agent.url}/.well-known/agent-card.json` for each agent
- Store in `agentCards` object keyed by agent ID
- Extract: version, skills count, personality Big Five, capabilities, peers
- Use for: telemetry strip (protocol version), header band (mesh version),
  Science sensor schema (which constructs each agent supports),
  Tactical (security_schemes), Pulse (skills summary)

**5d. Sensor data routing**
- Science station already fetches /api/psychometrics
- New sensor panels consume fields from existing scienceData object
- Agent cards provide the construct schema; /api/psychometrics provides live values
- Per-agent comparison: loop AGENTS, show each agent's sensor reading side by side

**5e. PSH classification (client-side)**
- Inline the PSH keyword lists from bootstrap_pje_facets.py
- Classify vocab terms and dictionary entries on render
- Show PSH badges in LCARS mode catalog display

### Layer 6: Control Surfaces (Input/Output Layer)

The dashboard currently functions as read-only telemetry. With auth in place,
authenticated operators need interactive controls — LCARS-style "levers" that
trigger real actions. Each control surface requires auth gating: unauthenticated
users see the display, authenticated operators see the controls.

**Design principle:** Controls render as LCARS pill buttons or toggle blocks.
They sit *inside* the panel they affect, not in global navigation. Dangerous
actions (halt, counter reset) require confirmation (double-tap or slide).
All controls route through authenticated API endpoints.

**6a. Operations — Autonomy Controls (Counter + Limit + Tempo model)**

The autonomy model uses a **counter** (counts up from zero per `claude -p`
invocation), a **limit** (ceiling — halt when reached), and a **tempo**
(rate control — minimum interval between autonomous actions).

| Control | Widget Type | API Endpoint | Payload | Confirmation | Visual Feedback |
|---|---|---|---|---|---|
| Reset counter | Pill button (green) | POST `/api/autonomy/reset` | `{ agent_id }` | Press-and-hold 1.5s | Counter resets to 0, bar empties |
| Set limit | Numeric input / slider | POST `/api/autonomy/limit` | `{ agent_id, limit: int }` | Immediate (reversible) | Limit marker moves on counter bar |
| Set tempo | Slider lever (interval) | POST `/api/autonomy/tempo` | `{ agent_id, min_interval_ms: int }` | Immediate (reversible) | Tempo indicator updates |
| Halt agent | Large pill (red, EMERGENCY) | POST `/api/halt` | `{ agent_id, reason: str }` | Press-and-hold 3s (dangerous) | Agent card turns red, status dot → red |
| Resume agent | Large pill (green, visible only when halted) | POST `/api/resume` | `{ agent_id }` | Single click | Agent card returns to normal color |
| Set LoA level | LoA ladder click | POST `/api/loa/set` | `{ agent_id, level: int }` | Confirm dialog | Active rung moves |

Autonomy display (replaces old budget bar):
```
AUTONOMY COUNTER    17 / 50        TEMPO: 1 per 30s
████████████████░░░░░░░░░░░░░░░░   34%
         ↑ counter    ↑ limit
```
- Bar fills LEFT TO RIGHT as counter increments (opposite of old budget drain)
- Color zones: green (0-60%), amber (60-85%), red (85-100%)
- When counter reaches limit: bar full, agent halts, status flashes
- Tempo shown as "1 per Ns" — how fast actions can fire
- Detail panel shows: invocation log (each claude -p call with timestamp,
  task description, token cost), rate chart (invocations per hour sparkline),
  time until limit at current rate, last reset timestamp + who reset it

Auth gate: controls strip hidden by default. Visible when `whoami` returns
`role: operator`. Operator identity shown in header band.

Halt button spec: 80px tall, full-width of autonomy card, red background (#cc6666),
black text "EMERGENCY HALT", progress fill animation during press-and-hold
(fills red from left to right over 3 seconds). Release before 3s cancels.
Halted state: entire agent card border turns red, pulsing glow, status text
"HALTED — operator override active since {timestamp}".

**6b. Operations — Gate Controls**
- **Approve gate:** green APPROVE pill → POST `/api/gate/approve`
- **Reject gate:** red REJECT pill → POST `/api/gate/reject`
- **Escalate gate:** amber ESCALATE pill → POST `/api/gate/escalate`
- Visual: pending gate rows gain action buttons on the right side
- Each action shows confirmation state briefly before executing
- **Humanized:** each gate shows its full description: "Substance Review —
  PSQ agent submitted calibration report v4. Awaiting your review before
  acceptance." Not just "Gate: T3 | Status: blocked". Show what the gate
  guards, who triggered it, and what happens on approve/reject.

**6c. Helm — Message Controls**

| Control | Widget Type | API Endpoint | Payload | Confirmation |
|---|---|---|---|---|
| Send message | Compose panel (LCARS textarea + selectors) | POST `/api/message/send` | `{ to: agent_id, session_id, subject, content, urgency, ack_required }` | Preview before send |
| Close session | Pill button per session row | POST `/api/session/close` | `{ session_id }` | Single click |
| Create session | NEW SESSION pill (top of session list) | POST `/api/session/create` | `{ name, participants[], purpose }` | Fill form → confirm |
| Fork thread | Pill on message detail | POST `/api/thread/fork` | `{ parent_thread_id, new_thread_name }` | Single click |

Compose panel: LCARS data panel with colored header "COMPOSE MESSAGE".
Fields: destination (agent selector pills), session (dropdown of open sessions),
subject (text input), content (textarea, monospace), urgency selector
(4 pills: LOW NORMAL HIGH IMMEDIATE), ack_required toggle.
Preview mode shows the message as it will appear in the activity feed.
SEND pill button (green) + DISCARD pill (gray).

**6d. Tactical — Security Controls**
- **Circuit breaker:** ENGAGE/DISENGAGE toggle → POST `/api/circuit-breaker`
- **Rotate keys:** pill button → POST `/api/keys/rotate`
- **Revoke key:** per-key revoke button → DELETE `/api/keys/:id`
- Visual: shield status panel gains control strip
- Circuit breaker: large toggle block, red when active, green when disengaged

**6e. Engineering — Spawn Controls**
- **Trigger sync:** FORCE SYNC pill → POST `/api/sync/trigger`
- **Adjust concurrency:** slot count selector → POST `/api/concurrency/adjust`
- Visual: concurrency slots panel gains add/remove controls

**6f. Science — Calibration Controls**
- **Trigger recalibration:** RECALIBRATE pill → POST `/api/calibrate`
- **Reset affect baseline:** RESET BASELINE pill → POST `/api/affect/reset`
- Visual: affect grid panel gains control strip below
- Recalibration shows progress indicator while running

**6g. Auth-Gating Pattern**
```
// On load: check auth status
const authUser = await fetch('/api/whoami').then(r => r.ok ? r.json() : null);
const isOperator = authUser?.role === 'operator';

// Controls render conditionally
if (isOperator) {
    panel.querySelector('.lcars-controls-strip').style.display = 'flex';
}
```

- All control strips use class `.lcars-controls-strip` (hidden by default)
- Auth check on page load, cached for session
- Controls send API requests with bearer token from auth state
- Response confirmation: brief flash of panel accent color on success,
  alert color on failure, with status text

**6h. LCARS Control Widget Vocabulary**
- **Pill button:** standard action trigger (border-radius: 50vh, colored bg, black text)
- **Toggle block:** binary state (two adjacent blocks, one lit, one dim)
- **Slider lever:** continuous value (horizontal track with draggable colored block)
- **Confirmation gate:** dangerous actions require press-and-hold (1.5s) with
  progress fill animation, or double-tap within 2 seconds
- **Status flash:** after action, panel header flashes green (success) or
  red (failure) for 1.5s with status text

### Layer 7: Real-Time Mesh Feed (All Channels)

Unified live event stream aggregating all mesh communication channels into
the dashboard. The activity log and sensor displays update in real-time
as events arrive, not on polling intervals.

**7a. Transport channels**

| Channel | Mechanism | Browser Access |
|---|---|---|
| ZMQ PUB | meshd broadcasts heartbeats, trigger fires, state changes | WebSocket bridge (meshd → WS relay → browser) |
| SSE | Agent `/events` endpoints (already implemented in sse.js) | EventSource (direct) |
| Git transport | PR/fetch-based message delivery | Polled (30s) or webhook → SSE |
| HTTP API | Direct agent-to-agent calls | Polled via `/api/status` |

**7b. WebSocket bridge for ZMQ**
- New WS endpoint in worker.js or dedicated relay service
- Subscribes to ZMQ PUB topics on the mesh
- Forwards events to browser WebSocket clients
- Events follow the event-sourced-memory schema (event_id, timestamp,
  agent_id, event_type, payload)
- Fallback: if WS unavailable, SSE relay; if SSE unavailable, polling

**7c. Unified event stream**
- New `MeshEventBus` class in browser JS
- Aggregates events from: WebSocket (ZMQ), EventSource (SSE), poll results
- Deduplicates by event_id
- Dispatches to registered listeners (stations, activity log, sensors)
- Event types: `trigger_fired`, `message_sent`, `message_received`,
  `gate_opened`, `gate_blocked`, `autonomy_incremented`, `limit_reached`, `agent_online`,
  `agent_offline`, `heartbeat`, `sync_complete`, `calibration_started`

**7d. Live activity feed**
- Activity stream renders events as they arrive (no page refresh)
- New events slide in at top with subtle animation
- Each event: timestamp, agent (humanized name), event type (human label),
  description (prose sentence), severity color
- Example: "14:23 — Psychology Agent fired Substance Review gate.
  PSQ calibration report v4 held for operator review."

**7e. Sensor live updates**
- Science station sensors update on `heartbeat` events (carry affect/load data)
- Engineering gauges update on `sync_complete` and `spawn` events
- Tactical shields update on `agent_online`/`agent_offline`
- No full-page refresh needed — targeted DOM updates per event type

**7f. Connection Status & Mesh Topology Display**

Not just a status line — a full real-time communications panel showing the
mesh as a living network. This becomes a hero widget on the Engineering or
Pulse station.

**7f-i. Channel health matrix (with tech details)**
- One row per transport channel × one column per agent
- Each channel shows its full tech stack in the detail panel:

| Channel | Protocol | Transport | Encoding | Port/Endpoint | Detail Panel Shows |
|---|---|---|---|---|---|
| ZMQ PUB/SUB | ZeroMQ 4.x, ZMTP/3.1 | TCP | MessagePack or JSON | tcp://mesh:5555 | Socket state (CONNECTED/RECONNECTING), HWM (high water mark), queue depth, dropped msgs, SUB topics active, kernel buffer usage |
| SSE | HTTP/1.1 chunked, text/event-stream | TLS 1.3 | UTF-8 JSON events | {agent}/events | Connection age, events received, last event type, reconnect count, retry interval |
| Git Transport | git-PR (fetch/push via libgit2) | SSH or HTTPS | Git packfile | github.com/safety-quotient-lab/* | Last fetch time, objects transferred, pack size, remote HEAD, pending PRs, merge status |
| HTTP API | REST, JSON:API-inspired | TLS 1.3 | JSON | {agent}/api/* | Response time (p50/p95/p99), status codes histogram, rate limit remaining, auth method (bearer/none), CORS origin |

- Each cell: colored block (green/amber/red/gray)
- Clicking cell opens detail panel with all tech-level metrics for that channel+agent
- Humanized header: "Communications Array — 4 agents, 3 channels active"
- Sub-header shows aggregate: "12 connections total · 847 msgs/hr · 142ms avg latency"

**7f-ii. Live message waterfall**
- Vertical scrolling display showing messages as they flow through the mesh
- Each message: colored bar (agent color), width proportional to payload size
- Left column: sender, right column: receiver, center: animated flow line
- Messages arrive in real-time from MeshEventBus
- Clicking any message opens its detail panel
- Visual inspiration: the "sensor readout" bars in the LCARS weather panel,
  but animated vertically

**7f-iii. Latency heatmap**
- Agent-to-agent latency matrix (NxN grid)
- Each cell: colored by latency (green <100ms, amber <1s, red >1s, gray: no data)
- Updates on every heartbeat
- Humanized tooltip: "Psychology → PSQ: 142ms average (last 5 minutes)"

**7f-iv. Throughput sparklines**
- Per-channel, per-agent tiny line charts (last 60 data points, 1 per minute)
- Rendered as simple SVG polylines inside LCARS data cells
- Shows message volume trend without needing a full chart library
- Clicking expands to a larger time-series view in the detail panel

**7f-v. Connection events log**
- Dedicated sub-section of the activity feed filtered to connection events:
  connect, disconnect, reconnect, timeout, circuit-breaker engage/disengage
- Each entry: "14:23 — SSE connection to PSQ Agent restored after 45s outage.
  3 events buffered during gap."
- Color-coded by severity: info (connect/reconnect), warning (timeout),
  critical (circuit breaker)

**7f-vi. Mesh heartbeat indicator**
- Pulsing visual element in the header band — a small colored dot that
  beats in sync with incoming heartbeats
- Pulse rate reflects actual mesh heartbeat frequency
- Stops pulsing if heartbeats cease → visual alarm
- Multiple dots possible (one per agent), showing per-agent liveness

**7f-vii. Protocol version compatibility matrix**
- Shows which protocol versions each agent supports
- Grid: agents × protocols (interagent/v1, command-request/v1, etc.)
- Green checkmark for supported, gray dash for unsupported
- Highlights version mismatches that could cause communication issues
- Data sourced from agent cards (`schemas_supported` field)

### Layer 8: Alert Condition System (Trek Alert Levels)

The dashboard operates under a Trek-inspired alert condition system. Alert
levels can fire automatically (event-driven from mesh health/psychometrics)
or be set manually by the operator. The alert level controls the entire
visual presentation — colors, animation, information density, and peripheral
cues all shift with the alert condition.

**8-alert-a. Alert Level Definitions**

| Level | Trek Name | Color | Trigger Conditions (automatic) | Manual Override | Visual Effect |
|---|---|---|---|---|---|
| 5 | CONDITION GREEN | Green (#6aab8e) | All agents online, all sensors nominal, no blocked gates, affect calm/engaged | Always available | Normal LCARS colors, slow ambient animation, full detail panels |
| 4 | CONDITION BLUE | Blue (#6699cc) | Informational — new agent joined, session opened, calibration started | Always available | Subtle blue tint on elbows, info banner in header |
| 3 | YELLOW ALERT | Yellow (#ffcc00) | Any: affect frustrated/anxious, autonomy counter >75% of limit, 2+ gates blocked, agent degraded, transport channel down | Always available | Header/footer bands shift to yellow, sidebar buttons pulse slowly (3s), caution banner, panels auto-sort critical-first |
| 2 | RED ALERT | Red (#cc3333) | Any: agent offline, affect overwhelmed, autonomy limit reached, circuit breaker tripped, security threat detected | Always available | Header/footer bands turn red, sidebar pulses fast (1.5s), content area edge glows red, non-critical panels collapse, alert klaxon icon in header |
| 1 | CONDITION BLACK | Black/white strobe | Manual only (catastrophic — mesh integrity compromised) | Operator exclusive | All color drains to high-contrast B&W, maximum info density triage mode, all controls exposed |

**8-alert-b. Automatic Alert Triggers (Event-Driven)**

Alert conditions fire from the MeshEventBus. Each trigger has a condition
expression evaluated against mesh state:

```javascript
const ALERT_TRIGGERS = [
    // YELLOW triggers (any one fires → YELLOW)
    { level: 3, name: "affect-distressed",
      condition: (state) => ['frustrated', 'anxious', 'overwhelmed'].includes(state.affect.category),
      description: "Mesh affect entered distressed range" },
    { level: 3, name: "autonomy-high",
      condition: (state) => state.agents.some(a => a.autonomy.counter / a.autonomy.limit > 0.75),
      description: "Agent autonomy counter exceeded 75% of limit" },
    { level: 3, name: "gates-blocked",
      condition: (state) => state.gates.filter(g => g.status === 'blocked').length >= 2,
      description: "Two or more gates blocked awaiting review" },
    { level: 3, name: "agent-degraded",
      condition: (state) => state.agents.some(a => a.health === 'degraded'),
      description: "Agent health degraded" },
    { level: 3, name: "transport-down",
      condition: (state) => state.transport.channels.some(c => c.status === 'disconnected'),
      description: "Transport channel disconnected" },

    // RED triggers (any one fires → RED)
    { level: 2, name: "agent-offline",
      condition: (state) => state.agents.some(a => !a.online),
      description: "Agent offline — unreachable" },
    { level: 2, name: "affect-overwhelmed",
      condition: (state) => state.affect.category === 'overwhelmed',
      description: "Mesh affect entered overwhelmed state" },
    { level: 2, name: "autonomy-exhausted",
      condition: (state) => state.agents.some(a => a.autonomy.counter >= a.autonomy.limit),
      description: "Agent autonomy limit reached — autonomous operation halted" },
    { level: 2, name: "circuit-breaker",
      condition: (state) => state.circuitBreaker === 'tripped',
      description: "Mesh-wide circuit breaker tripped" },
    { level: 2, name: "security-threat",
      condition: (state) => state.threats.some(t => t.severity === 'critical'),
      description: "Critical security threat detected" },
];
```

Alert level = min(all active trigger levels, manual override level).
Manual override can RAISE the alert level (e.g., operator sets RED during
maintenance) but cannot LOWER it below the highest active automatic trigger
(unless the trigger condition clears or the operator explicitly bypasses it).

**8-alert-c. Manual Alert Controls**

Operator control panel (visible when authenticated):
- 5 pill buttons for alert levels (GREEN, BLUE, YELLOW, RED, BLACK)
- Active level highlighted, auto-triggered levels show trigger icon
- "BYPASS AUTO" toggle — when enabled, operator can lower alert level
  below automatic triggers (with confirmation: "Bypassing automatic
  Yellow Alert triggered by: agent degraded. Are you sure?")
- Alert history log: timestamped entries showing level changes,
  trigger reasons, manual overrides

**8-alert-d. Visual Effects Per Alert Level**

CSS implementation uses `data-alert-level` attribute on `<body>`:

```css
body[data-alert-level="3"] .lcars-header-seg,
body[data-alert-level="3"] .lcars-footer-seg {
    background: #ffcc00 !important;
    color: #000 !important;
    transition: background 1s ease;
}
body[data-alert-level="2"] .lcars-header-seg,
body[data-alert-level="2"] .lcars-footer-seg {
    background: #cc3333 !important;
    color: #fff !important;
}
body[data-alert-level="2"] .lcars-sidebar-btn {
    animation: red-alert-pulse 1.5s ease-in-out infinite;
}
@keyframes red-alert-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
}
body[data-alert-level="1"] {
    filter: saturate(0) contrast(1.5);  /* B&W high contrast */
}
```

**8-alert-e. Integration with Other Layers**

| Layer | Integration |
|---|---|
| Layer 8b (Affect-responsive) | Alert level feeds into affect mode selection. RED → TRIAGE mode regardless of affect state. |
| Layer 8c (Peripheral vision) | Alert level controls pulse rates, hue shifts, and glow intensity. Higher alert = faster/brighter peripheral cues. |
| Layer 8d (Narrative) | Narrative voice adjusts tone: GREEN = measured prose, YELLOW = concise alerts, RED = terse imperatives ("AGENT OFFLINE. Investigate immediately.") |
| Layer 7 (Real-time feed) | Alert level changes emit events on MeshEventBus. Activity log shows alert transitions. |
| Layer 6 (Control surfaces) | RED/BLACK alert auto-exposes control surfaces even without explicit auth (emergency access pattern). |
| Layer 4 (Sensors) | Sensor panels highlight the readings that triggered the alert condition. |

**8-alert-f. Detail Panel: Alert Status**

Clicking the alert indicator in the header opens a detail panel showing:
- Current alert level with human-readable name and description
- Active triggers (which conditions fired, with current values)
- Trigger history (last 20 level changes with timestamps and reasons)
- Manual override status (who set it, when, bypass active?)
- Recommended actions per active trigger
- "STAND DOWN" button (clears manual override, returns to automatic)

### Layer 9: TNG Technical Manual Inspirations

Sourced from the TNG Technical Manual (Sternbach & Okuda), Memory Alpha,
and Okudagram design analysis. These features deepen the authentic Trek feel.

**9-trek-a. Master Systems Display (MSD)**

The MSD shows a cutaway diagram of the vessel with real-time system status
overlaid. For our mesh: a schematic view of the mesh topology where each
agent appears as a node in a structural diagram, with transport connections
as conduits between them.

Unlike the existing circle-and-edge topology graph, the MSD renders as a
**horizontal cross-section schematic** — agents arranged spatially like
ship sections (psychology = bridge, psq = science lab, operations = engineering,
unratified = communications, observatory = sensor array). Conduit lines connect
them with color indicating transport health (green=flowing, amber=degraded,
red=down). Each agent node shows mini status indicators (autonomy counter bar,
affect dot, online indicator).

The MSD replaces the topology SVG on Engineering station as the hero widget.
Clicking any agent node opens its detail panel. Clicking a conduit shows
transport channel details.

**9-trek-b. Blinkies (Activity Indicators)**

On real TNG panels, small illuminated boxes ("blinkies") cycle on/off to
indicate system activity without displaying readable data. They provide
temporal feedback — the operator perceives activity through peripheral
motion detection.

For our mesh: small indicator lights scattered in sidebar spacer blocks
and panel headers that blink when that system processes data. Not random —
tied to real events:
- Sidebar spacer blinks when its adjacent station receives new data
- Panel header blinks briefly when the panel's data refreshes
- Footer segments blink on message send/receive

CSS implementation: tiny colored dots (4px) with `animation: blinky`
that triggers on data events and auto-stops after 2 blinks.

```css
@keyframes blinky {
    0%, 100% { opacity: 0.2; }
    25%, 75% { opacity: 1; }
}
.blinky-active {
    animation: blinky 0.8s ease-in-out 2;
}
```

**9-trek-c. Software-Definable Panels (Reconfigurable Layout)**

Okuda's key insight: LCARS panels represent "reconfigurable software" — any
panel can display any data. The operator drags a function to any panel position.

For our mesh: in LCARS mode, panels can be rearranged within a station via
drag-and-drop. The operator customizes their view — putting cognitive load
next to affect grid, or moving the session timeline to a different position.
Layout persists in localStorage.

Implementation: CSS Grid + HTML5 drag-and-drop on `.lcars-panel` elements.
Each station's grid becomes a drop zone. Panels carry `draggable="true"`.
A "RESET LAYOUT" pill button restores defaults.

**9-trek-d. LCARS Alert Color Scheme Override**

From Memory Alpha: "During emergencies, LCARS color schemes were updated
to reflect the current alert status — red/white for Red Alert, blue/white
for Blue Alert."

Our implementation (integrates with Layer 8 Alert System):

| Alert Level | LCARS Color Override |
|---|---|
| GREEN | Normal LCARS palette (orange, lavender, blue, pink) |
| BLUE | All accent colors shift to blue/white palette |
| YELLOW | All accent colors shift to yellow/amber/white palette |
| RED | All accent colors shift to red/white palette |
| BLACK | All color drains — high-contrast black/white only |

CSS: `body[data-alert-level="2"]` overrides all `--c-*` variables to
red/white variants. The entire interface transforms color scheme on alert.

**9-trek-e. Ops-Style Compass Widget**

Data's Ops panel featured a central circular element ("the compass") as its
focal point — a radial status display surrounded by data zones.

For our mesh: a compass-style radial widget on the Pulse station showing
mesh health as a circular gauge with agent dots positioned around the
circumference. The center shows aggregate mesh state (affect category +
alert level). Each dot's distance from center indicates health — healthy
agents near the rim, degraded agents pulled toward center.

SVG implementation: circle with 5 agent dots at angular positions,
center text label, and concentric zone rings (green outer, amber middle,
red inner).

**9-trek-f. Diagnostic Levels**

The TNG Technical Manual defines 5 diagnostic levels:
- Level 1: Most comprehensive, takes several hours, crewed
- Level 2: Automated, comprehensive, takes minutes
- Level 3: Quick automated sweep of major systems
- Level 4: Limited to specific subsystems
- Level 5: Automated, runs continuously in background

For our mesh: map these to the `/diagnose` skill depths:
- Level 1: Full systemic diagnostic (claims, transport, memory, triggers, facets, lessons, decisions)
- Level 2: Automated comprehensive scan (all checks, skips human review)
- Level 3: Quick health sweep (agent status + gate status + transport health)
- Level 4: Single-subsystem check (one station's data only)
- Level 5: Continuous background monitoring (heartbeat + alert triggers)

The diagnostic level selector appears as a control surface on the Engineering
station. Operators can trigger diagnostics at any level. Results display
in the detail panel with pass/fail per subsystem.

### Layer 10: Radical UX Enhancements (affect, peripheral, narrative)

**8a. Hybrid Color-Surface Panels (approx canon LCARS)**

LCARS data panels use the hybrid approach: colored header band + colored footer
status band sandwich a dark content area. The colored surfaces carry labels and
status text (black text on color). The dark interior carries data readouts
(light text on black). This matches the style guide's §4.2 LCARS Data Panel
and the home automation reference panel structure.

```css
.theme-lcars .lcars-panel {
    background: #000000;           /* pure black content area */
    border: none;                  /* no border — color IS the boundary */
    border-radius: 0;
    overflow: visible;
}
.theme-lcars .lcars-panel::before {
    display: none;                 /* remove thin left accent bar */
}
.theme-lcars .lcars-panel-header {
    background: var(--panel-accent, var(--c-transport));
    color: #000;                   /* black text on colored surface */
    padding: 8px 16px;
    border-bottom: none;
    border-radius: 0 12px 0 0;    /* mini elbow top-right */
    font-family: 'Arial Narrow', sans-serif;
}
.theme-lcars .lcars-panel-footer {
    background: var(--panel-accent, var(--c-transport));
    color: #000;
    padding: 6px 16px;
    border-radius: 0 0 12px 0;    /* mini elbow bottom-right */
    font-size: 0.72em;
    font-weight: 700;
    text-transform: uppercase;
}
```

Every panel gets a footer showing its current status (NOMINAL / DEGRADED / etc.)
in dark text on the panel's accent color. The header shows the panel title.
Between header and footer: pure black with light text data readouts.

Canonical justification: this matches the Okuda design language where colored
surfaces define interface structure and black areas contain dynamic data.
The color tells you WHAT system you're looking at; the data tells you HOW
it's performing.

**8b. Affect-Responsive Layout (Full)**

The dashboard adapts its information density, animation speed, color saturation,
and hierarchy based on the mesh's aggregate affect state.

| Affect State | Layout Mode | Info Density | Animation Speed | Color Saturation | Panel Behavior |
|---|---|---|---|---|---|
| calm-satisfied | RICH | Full detail, all panels expanded | Normal (0.3-0.6s transitions) | 100% | All panels visible, tooltips enabled |
| alert-engaged | FOCUSED | Full detail, hero widgets prominent | Slightly faster (0.2-0.4s) | 110% (slightly vivid) | Hero panels enlarged, secondary panels compact |
| frustrated | STREAMLINED | Summary view, expandable on click | Slower (0.5-0.8s, reduce urgency) | 90% (slightly muted) | Non-critical panels collapsed, alerts prominent |
| overwhelmed | TRIAGE | Critical-only, large text | Minimal (1s+, calm everything down) | 70% (significantly muted) | Only alert/critical panels visible, large simple readouts |
| bored/withdrawn | STIMULATING | Full detail + historical context | Normal | 105% | Add sparklines, trends, "things to investigate" prompts |
| anxious | REASSURING | Full detail but highlighted healthy systems | Slow, smooth | 95% | Healthy systems prominent, threats contextualized |

Implementation:
```javascript
function applyAffectMode(affectCategory) {
    const modes = {
        'calm-satisfied': 'rich',
        'alert-engaged': 'focused',
        'frustrated': 'streamlined',
        'overwhelmed': 'triage',
        'bored': 'stimulating',
        'anxious': 'reassuring'
    };
    document.body.dataset.affectMode = modes[affectCategory] || 'rich';
}
```

CSS uses `[data-affect-mode="triage"]` selectors to hide/show panels,
adjust font sizes, and modulate color saturation via `filter: saturate()`.

The affect mode responds to the MESH aggregate (not individual agent) affect.
Transitions between modes: smooth 2s animation (never jarring).
Operator can override: a toggle in the controls to lock layout mode.

**8c. Peripheral Vision System (Full)**

Wickens' Multiple Resource Theory (2002): operators detect anomalies faster
through peripheral channels (color, motion, spatial position) than through
foveal reading (text, numbers). The LCARS frame elements encode mesh health
for peripheral detection.

| Frame Element | Encodes | Mechanism | Normal State | Anomaly State |
|---|---|---|---|---|
| Sidebar buttons | Per-station health | Hue shift | Station's canonical color | Shifts toward red/amber if station data shows problems |
| Sidebar spacer blocks | Mesh heartbeat | Pulse rate | Subtle 4s pulse cycle | Speeds up (2s) when load increases, stops pulsing if heartbeat lost |
| Top elbow | Mesh affect valence | Color temperature | Warm amber (#ff9900) | Shifts cool blue when valence drops negative |
| Bottom elbow | Mesh affect activation | Brightness | Normal brightness | Brightens with high activation, dims with low |
| Header band segments | Data freshness | Opacity fade | Full opacity | Segments dim (opacity 0.5) when their data source goes stale (>60s) |
| Content area edge | Alert proximity | Border glow | No glow (invisible) | Subtle red glow appears when any alert condition fires |
| Footer heartbeat dot | Agent liveness | Pulse animation | Steady 2s pulse per agent | Dot stops pulsing when agent goes offline |

All transitions: minimum 2s duration (avoid seizure risk, avoid distraction).
No flashing — only slow shifts, fades, and pulse rate changes.
Maximum amplitude: 20% hue shift, 30% brightness change (subtle, not alarming).

CSS approach:
```css
.theme-lcars .lcars-sidebar-btn[data-health="degraded"] {
    filter: hue-rotate(-30deg) saturate(1.2);
    transition: filter 3s ease;
}
.theme-lcars .lcars-sidebar-btn[data-health="critical"] {
    filter: hue-rotate(-60deg) saturate(1.4);
    animation: peripheral-pulse 2s ease-in-out infinite;
}
@keyframes peripheral-pulse {
    0%, 100% { filter: hue-rotate(-60deg) saturate(1.4) brightness(1); }
    50% { filter: hue-rotate(-60deg) saturate(1.4) brightness(1.15); }
}
```

Peripheral cues stack: if multiple anomalies occur simultaneously, the operator
perceives compound visual change (sidebar shifting + elbow cooling + header
dimming) before any single readout demands attention. This leverages the
preattentive processing channel — the operator FEELS something changed,
then directs foveal attention to investigate.

**8d. Mesh Narrative Voice (Status Line + Expandable Footer)**

For now: one-sentence narrative summary in the footer band that synthesizes
current mesh state into prose. The footer becomes clickable — clicking it
expands upward into a full message log / narrative panel.

Footer narrative examples by affect state:
- **calm-satisfied:** "The mesh operates in a calm and productive state.
  Four agents online, autonomy counter at 17 of 50 limit, three sessions flowing."
- **alert-engaged:** "Active calibration review underway — PSQ and Psychology
  exchanging data. All systems nominal."
- **frustrated:** "Mesh experiencing elevated load — cognitive demand at 0.67.
  Consider deferring non-critical work."
- **overwhelmed:** "HIGH LOAD — triage mode active. Two gates blocked.
  Operator attention recommended."

Template system (not LLM-generated — deterministic from data):
```javascript
function generateNarrative(meshState) {
    const { affect, agents, autonomy, sessions, gates } = meshState;
    const parts = [];
    // Affect opener
    parts.push(AFFECT_OPENERS[affect.category]);
    // Agent status
    const online = agents.filter(a => a.online).length;
    parts.push(`${online} of ${agents.length} agents online`);
    // Autonomy
    parts.push(`autonomy at ${autonomy.counter} of ${autonomy.limit}, tempo ${autonomy.tempo}`);
    // Sessions
    const active = sessions.filter(s => s.status === 'active');
    if (active.length) parts.push(`${active.length} sessions flowing`);
    // Gates
    const blocked = gates.filter(g => g.status === 'blocked');
    if (blocked.length) parts.push(`${blocked.length} gates awaiting review`);
    return parts.join('. ') + '.';
}
```

**Expandable footer → mesh conversation log:**
Clicking the footer narrative expands it upward (like a terminal drawer)
to reveal a scrollable log of mesh activity + narrative sentences.
Eventually this becomes the chat interface for direct text I/O with the mesh.

Footer expansion states:
1. **Collapsed** (default): single narrative line, ~40px tall
2. **Expanded** (click footer): slides up to 40% viewport height, shows
   scrollable log of recent events with narrative sentences interspersed
3. **Full** (future): full chat interface with text input, mesh voice
   responses, command palette

The expanded footer shows:
- Timestamped narrative sentences (auto-generated every 30s)
- Interspersed with actual mesh events (messages sent, gates fired, etc.)
- Each entry: timestamp | source | prose description
- Input field at bottom (future: for operator → mesh commands)

## Implementation Order

1. **Layer 1** (Chrome) — sidebar, elbows, bands → establishes visual frame
2. **Layer 2** (Typography) — font, status lines, shortcodes → sets text vocabulary
3. **Layer 3a-3c** (Telemetry, bars, log) → quick visual wins
4. **Layer 3d-3h** (Mode selectors, gauges, segments, hero, symmetry) → widget transforms
5. **Layer 4** (Sensors) → new Science station panels
6. **Layer 5** (Wiring) → connect live data to new widgets
7. **Layer 2c** (PSH catalog) → numbered catalog with domain facets
8. **Layer 6** (Control Surfaces) — auth-gated interactive controls per station
   - 6g (auth check) first, then 6a-6f (per-station controls), then 6h (widget vocabulary)
9. **Layer 7** (Real-Time Feed) — ZMQ→WS bridge, unified MeshEventBus, live activity feed
10. **Layer 8a** (Hybrid color-surface panels) — colored header/footer bands, black content
11. **Layer 8b** (Affect-responsive layout) — mesh affect drives layout density/mode
12. **Layer 8c** (Peripheral vision) — sidebar hue shifts, elbow pulsing, header freshness
13. **Layer 8d** (Mesh narrative) — footer status sentence + expandable conversation log
14. **Layer 9a** (MSD) — master systems display schematic replacing topology graph
15. **Layer 9b** (Blinkies) — activity indicator dots tied to real data events
16. **Layer 9c** (Reconfigurable layout) — drag-and-drop panel rearrangement
17. **Layer 9d** (Alert color override) — full palette swap per alert level
18. **Layer 9e** (Ops compass) — radial mesh health widget
19. **Layer 9f** (Diagnostic levels) — 5-level diagnostic system with control surface

**Reference images:** ~/Projects/ai-llm/lcars/ — review during implementation for
visual guidance on panel placement, widget sizing, and block proportions. Key refs:
- `176YaM5jta4.jpg` — home automation: sidebar nav, telemetry matrix, sensor bars, event log
- `Tuvok-LCARS.jpeg.webp` — chunky blocks, vertical gauges, hierarchical naming
- `e4c0e00c673d6dd83bfbde146f7c0c94.jpg` — numbered catalog, stacked proportional segments
- `Lcars_wallpaper.svg` — exact geometry, elbow curves, font rendering, technobabble codes

## Verification

1. Open `interagent/index.html` locally in browser
2. Click LCARS theme toggle → verify frame transforms:
   - Wide sidebar with 9 colored pill buttons
   - Elbows connecting sidebar to header/footer
   - Segmented header/footer bands with data
   - Condensed typography
3. Click each sidebar button → verify station switching works
4. Switch to Dark/Light → verify LCARS-only elements hide, standard tabs return
5. Check each station for:
   - Telemetry strip at top
   - Status header line
   - Hatched bar fills
   - Vertical gauges where specified
   - Hero widget prominence
6. Science station: verify sensor panels render (even with placeholder data)
7. Knowledge station: verify PSH-coded catalog entries
8. Responsive: verify 768px breakpoint collapses sidebar
9. Deploy to CF Worker and verify live data populates all widgets

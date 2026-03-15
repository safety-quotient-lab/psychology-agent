# LCARS Style Guide — Interagent Mesh Dashboard

**Date:** 2026-03-15
**Authority:** Psychology-agent (UX ownership, ops v1-ux-handover)
**Design system:** TNG LCARS (Michael Okuda) adapted for mesh monitoring

---

## 1. Design Principles

1. **The mesh as starship.** Every panel answers a question the captain
   (operator) needs answered.
2. **Flat and clean.** No gradients, no shadows, no 3D effects. LCARS
   achieves depth through color and layout, not visual effects.
3. **Minimal animation.** Status changes transition. Nothing else moves.
   Roddenberry directive: "panels should not have great activity."
4. **Data as alphanumeric readouts.** Numbers and text in fixed-width
   cells. Charts feel like sensor displays, not web dashboards.
5. **Touch-friendly.** 48px minimum interactive targets. Designed for
   PADDs (tablets).
6. **Accessible.** WCAG AA contrast. Color paired with redundant
   channel (text, shape). Screen reader compatible.

---

## 2. Color System

### 2.1 Background

| Mode | Primary | Inset | Content |
|---|---|---|---|
| Dark | #0f1318 | #161b22 | #0f1318 |
| Light (OKSolar) | #fbf7ef | #f5f0e6 | #fbf7ef |
| LCARS | #000000 | #000000 | #000000 |

### 2.2 LCARS Accent Palette

| Variable | Color | Usage |
|---|---|---|
| --c-transport | #ff9900 | Transport, primary actions, header bands |
| --c-knowledge | #cc99cc | Knowledge, secondary info |
| --c-health | #9999ff | Health, science, psychometrics |
| --c-epistemic | #cc6699 | Epistemic quality, warnings |
| --c-catalog | #ff9966 | Catalog, tertiary info |
| --c-alert | #cc6666 | Alerts, tactical, threats |
| --c-inactive | #666688 | Disabled, inactive elements |

### 2.3 Status Colors (fixed across all modes)

| Variable | Color | Meaning |
|---|---|---|
| --status-online | #6aab8e | Healthy, pass, nominal |
| --status-offline | #c47070 | Down, fail, critical |
| --status-degraded | #d4944a | Warning, degraded, drifting |

### 2.4 Station Tab Colors

| Station | Color | Variable |
|---|---|---|
| Engineering | #ff9944 | --c-tab-engineering |
| Science | #9999ff | --c-tab-science |
| Medical | #66ccaa | --c-tab-medical |
| Tactical | #cc6666 | --c-tab-tactical |
| Operations | (default) | --c-tab-ops |
| Helm | #66aacc | --c-tab-helm |

### 2.5 Agent Identity Colors

Each agent carries a consistent color across all visualizations:

| Agent | Color | Usage |
|---|---|---|
| psychology-agent | #9999ff | Nodes, cards, leader lines |
| psq-agent | #cc99cc | Nodes, cards, leader lines |
| unratified-agent | #ff9966 | Nodes, cards, leader lines |
| observatory-agent | #6699cc | Nodes, cards, leader lines |
| operations-agent | #ff9900 | Nodes, cards, leader lines |

---

## 3. Typography

| Element | Font | Size | Weight | Transform |
|---|---|---|---|---|
| Frame header/footer | System sans-serif | 0.85em | 700 | uppercase |
| Panel header | System sans-serif | 0.75em | 700 | uppercase, letter-spacing 0.08em |
| Data labels | System sans-serif | 0.68em | 600 | uppercase, letter-spacing 0.04em |
| Data values | Monospace | 1.1em | 700 | none |
| Narrative text | System sans-serif | 0.82em | 400 | none |
| Sidebar buttons | System sans-serif | 0.7em | 700 | uppercase |

---

## 4. Layout Components

### 4.1 LCARS Frame

The TNG frame wraps all content:

```
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ██ INTERAGENT MESH ██ ▌STATUS▐ ▌TIME▐  ┃ ← header band (52px)
╰━━━━━━╮                                 ┃ ← top elbow (48px)
  NAV   ┃                                ┃
  BTN   ┃    [content area - black]       ┃ ← content (flex)
  BTN   ┃                                ┃
╭━━━━━━╯                                 ┃ ← bottom elbow (48px)
┃ ██ FOOTER ██ ▌AGENTS▐ ▌MESH▐           ┃ ← footer band (52px)
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

CSS grid: `150px sidebar | 1fr content | 8px right-bar`

### 4.2 LCARS Data Panel

The standard component for displaying data inside the frame:

```
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ██ PANEL TITLE            ┃ ← colored header band
╰━━╮                        ┃ ← mini elbow
   ┃  LABEL 1    00.42      ┃ ← alphanumeric readouts
   ┃  LABEL 2    NOMINAL    ┃    monospace right-aligned
   ┃  LABEL 3    ████░░ 67% ┃ ← inline bars
╭━━╯                        ┃ ← mini elbow
┃ ██ STATUS: NOMINAL        ┃ ← optional footer
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

CSS class: `.lcars-data-panel`
- Header: colored background matching panel accent
- Mini elbows: 12px border-radius corners
- Content: padding 12px 16px, black background
- Footer: optional, same colored background

### 4.3 Sidebar Navigation Button

```css
.lcars-sidebar-btn {
    border-radius: 20px 0 0 20px;  /* pill-left only */
    padding: 12px 16px;
    min-height: 48px;
    text-transform: uppercase;
    font-weight: 700;
    font-size: 0.7em;
    letter-spacing: 0.06em;
}
```

Each button uses a different LCARS accent color. Active button: brighter shade.

### 4.4 Header/Footer Band Segments

Colored blocks butted against each other with 3px gaps:

```css
.lcars-header-seg {
    padding: 4px 16px;
    font-size: 0.72em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #000;  /* dark text on colored background */
}
```

### 4.5 Inline Data Bar

For percentages and ratios inside data panels:

```
UTILIZATION   ████████░░░░░░░░  34%
```

```css
.lcars-data-bar {
    height: 12px;
    background: var(--bg-inset);
    border-radius: 6px;
    overflow: hidden;
}
.lcars-data-bar-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.6s ease;
}
```

### 4.6 Status Badge

Small pill-shaped indicators for status labels:

```css
.lcars-status-badge {
    border-radius: 50vh;
    padding: 2px 8px;
    font-size: 0.65em;
    font-weight: 700;
    text-transform: uppercase;
}
```

---

## 5. MSD (Master Systems Display) Components

### 5.1 MSD Schematic

Central node + leader lines + peripheral status cards:

- Central node: 56px circle, subtle glow, "MESH" label
- Leader lines: 2px, agent color, 50% opacity
- Agent cards: absolute-positioned, left color bar, compact readouts
- Aspect ratio: 2:1

### 5.2 Agent Status Card

```
┌─┬──────────────┐
│█│ PSYCH         │ ← agent name (uppercase, 0.65em)
│█│ FLOW          │ ← affect label (agent color)
│█│ v ████░░ +0.9 │ ← valence mini-bar
│█│ a ███░░░ +0.8 │ ← activation mini-bar
└─┴──────────────┘
█ = agent color bar (4px)
```

---

## 6. Interaction Patterns

### 6.1 Progressive Disclosure

Summary visible → detail on click/tap. Never overwhelm.

### 6.2 Station Navigation

LCARS sidebar: click station → content area swaps. No page load.
Hash navigation: URL reflects active station (#science, #engineering).

### 6.3 Data Refresh

- Automatic: SSE for real-time events (spawn, messages)
- Manual: pull-to-refresh or refresh button per station
- Staleness: data older than 60s shows subtle dim indicator

### 6.4 Theme Switching

Toggle in frame header (LCARS mode) or top-right (standard mode).
Smooth transition: `transition: background-color 0.3s, color 0.3s`.
Leaving LCARS while on bridge station → auto-redirect to Pulse.

---

## 7. Bridge Station Information Architecture

| Station | Question it answers | Primary widget |
|---|---|---|
| Engineering | How does the mesh breathe? | Spawn waterfall |
| Science | Why does the mesh function this way? | MSD affect grid |
| Medical | How does this agent serve the mesh? | Agent vitals |
| Tactical | Can the mesh defend itself? | Shield status |
| Operations | Who does what? | Budget + gates |
| Helm | Where do messages flow? | Session timeline |

### 7.1 Widget Ownership (no duplicates)

Each piece of data lives in exactly ONE station:

| Data | Station | NOT in |
|---|---|---|
| Agent health dots | Engineering | ~~Pulse~~ |
| Mesh topology | Engineering (MSD view) | ~~Pulse~~ |
| Transport messages | Helm | ~~Meta~~ |
| Epistemic flags/debt | Science | ~~Meta~~ |
| Claims | Science | ~~Knowledge~~ |
| Decisions | Operations | ~~Knowledge~~ |
| Triggers | Operations | ~~Knowledge~~ |
| Dictionary/vocab | Science | ~~Knowledge~~ |
| Lessons | Science | ~~Wisdom~~ |
| Memory topics | Operations | ~~Knowledge~~ |

---

## 8. Responsive Breakpoints

| Breakpoint | Sidebar | Header segments | Content |
|---|---|---|---|
| Desktop (>1024px) | 150px, full labels | All visible | 2-column grid |
| Tablet (768-1024px) | 100px, abbreviated | 2 visible | 1-column |
| Phone (<768px) | 60px, icons only | Hidden | Stacked |

---

## 9. Roadmap

### v1.0 (current)
- [x] LCARS frame (bands, elbows, sidebar)
- [x] 6 bridge stations with data panels
- [x] MSD-style affect grid
- [x] Spawn waterfall
- [x] Theme consistency (dark/light/LCARS)

### v1.0.1 (polish)
- [ ] LCARS data panel component (replace generic panels)
- [ ] MSD topology replacing circle-edge topology
- [ ] Authentic elbow sizing and proportions
- [ ] Segmented header/footer with live data
- [ ] Agent status cards with leader lines on Engineering topology

### v1.1 (features)
- [ ] Per-agent dashboards rebuilt with mesh-aware framing
- [ ] Auth-gated lever controls (Medical treatment panel)
- [ ] Mesh narrative with richer template sentences
- [ ] Tablet QA pass

---

⚑ EPISTEMIC FLAGS
- This style guide derives from TNG LCARS reference material and
  the Okuda design language, not from licensed Star Trek assets.
  No copyrighted imagery or trademarked terms used in the
  implementation — only the visual design vocabulary.
- WCAG AA contrast claims need verification tool validation,
  not just visual inspection.
- Touch target sizing (48px) follows Android/iOS guidelines but
  has not been tested on actual tablet hardware.

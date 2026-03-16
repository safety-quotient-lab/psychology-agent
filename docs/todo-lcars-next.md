# TODO: LCARS Next Pass

## Header Band Reorganization
- Reorganize header band segments using proper flex sizing
- Use LCARS standard capsule shapes (rounded ends) for each segment
- Status messages should follow LCARS readout convention (label: value)
- Consider matching Ohniaka A1 header bar pattern

## Semantic Colors Everywhere
- Audit ALL hardcoded hex colors in LCARS theme
- Replace with CSS variables following the design reference color semantics:
  - `--lcars-frame`: #ff9966 (salmon, structural)
  - `--lcars-accent`: #ff9900 (orange, active data)
  - `--lcars-secondary`: #cc99cc (purple, subsystem info)
  - `--lcars-tertiary`: #9999ff (violet, identifiers)
  - `--lcars-title`: #ffcc00 (gold, headers/alerts)
  - `--lcars-science`: #5b9cf6 (blue, navigational)
  - `--lcars-alert`: #cc6666 (red, emergency)
  - `--lcars-medical`: #66ccaa (green, health)
  - `--lcars-neutral`: #ccaa88 (tan, spacers)
- All inline style= colors should reference variables
- Sidebar button colors should use semantic vars

## Mesh Topology
- Move topology to top of Pulse tab (above vitals)
- Fix topology for proper LCARS spatial map rendering
- Grid lines need better contrast
- Node labels need LCARS readout formatting
- Connection arcs need better curvature

## Sparklines → LCARS Canon
- Remove inline sparklines from vitals cards and subsystem blocks
- Replace with: color-coded number sequences OR dedicated chart panels
- Keep Gc area chart (that follows Data Analysis 103138 pattern)

## Text Box Conformance (from todo-lcars-text-boxes.md)
- Status monologue → Pattern A (dense command dump)
- Actions table → Pattern B (Ohniaka colored columns)
- Governance decisions → Pattern C (numbered entry list)
- Operations controls → Review against LCARS button reference

## Agent Identity
- ops-session (interactive human+ops) and psy-session (interactive human+psy)
  need representation in dashboard alongside daemon agents
- Requires /knock analysis for rename blast radius

## Deliberation Visualization
- Tree structure (not chain) for deliberation cascade
- Broken links for failed/stale deliberations
- Consider waterfall pattern from Engineering

## Smart Deploy Enhancements
- Track which specific files changed for more granular deploy decisions
- Consider CF Worker-only shortcut flag

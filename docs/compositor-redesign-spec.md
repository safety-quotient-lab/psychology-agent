# Interagent Compositor Redesign Specification

**Status:** Design approved (Session 71, 2026-03-10)
**Deployment:** `interagent.safety-quotient.dev` (CF Worker)
**Source:** `interagent/` directory

---

## Purpose

The compositor serves as the **public face** of the safety-quotient-lab project.
It aggregates data from all 4 agents' meshd instances (`/api/status` + `/api/kb`
+ `/kb/dictionary`) into a unified portal.

**Audience:** Showcase/portfolio — general audience first, specialist depth second.
Developers, researchers, and curious visitors from awesome-claude-code, GitHub, or
direct links.

---

## Progressive Disclosure (Three Layers)

| Layer | Time | Story | What the visitor learns |
|-------|------|-------|------------------------|
| 1 — Instant | 3 seconds | Mesh alive | Agents pulse, budgets fill, messages flow. "This thing operates autonomously." |
| 2 — Browse | 10 seconds | Knowledge depth | Decisions, vocabulary, triggers. "These agents build structured knowledge together." |
| 3 — Engaged | 30+ seconds | Methodology | Epistemic safeguards, trust model, claim verification. "Rigorous research methods applied to AI agent design." |

---

## Visual Language: LCARS Hybrid

**Primary:** LCARS (Star Trek TNG) — panel-based, color-coded, rounded segments.
**Secondary influences:**
- Tactical (The Expanse) — typographic hierarchy through weight, monospace numerics
- JARVIS (Iron Man) — progressive disclosure, hover/tap reveals depth
- Nostromo (Alien) — dense data blocks, utilitarian terminal feel

### Color System (Toggleable)

**Default: Knowledge-centric (subsystem colors)**

| Color | Hex | Encodes |
|-------|-----|---------|
| Blue | `#5b9cf6` | Transport / messages |
| Gold | `#e5a735` | Knowledge / decisions |
| Green | `#4cce7f` | Health / operations |
| Purple | `#a78bfa` | Epistemic / claims |
| Pink | `#f472b6` | Vocabulary / catalog |
| Red | `#ef6b6b` | Alert state |
| Gray | `#8893a4` | Inactive |

**Toggle: Agent identity colors**

| Color | Hex | Agent |
|-------|-----|-------|
| Blue | `#5b9cf6` | psychology-agent |
| Teal | `#4ecdc4` | psq-agent |
| Amber | `#e5a735` | unratified-agent |
| Purple | `#a78bfa` | observatory-agent |

**Light/dark mode toggle** also available. Three toggles total in settings.

### LCARS Panel Layout

- **Desktop:** Classic LCARS — vertical color bands on left side of panels,
  rounded elbow corners, header bands across top
- **Mobile:** Left spine preserved (classic LCARS elbow). Costs ~20px horizontal
  but maintains visual language. Sections stack vertically

---

## Tab Structure: Pulse / Knowledge / Operations

### Pulse Tab (Layer 1 + Layer 3 health)

The landing view. Communicates "mesh alive" in under 3 seconds.

**Components:**
1. **Animated topology graph** — SVG nodes for each agent, positioned in diamond
   layout. Pulsing nodes = syncing. Data particles flow along edges on message
   transit. Node fill = agent color (in identity mode) or health color (in
   subsystem mode). Edge thickness = message volume
2. **Mesh vitals** — aggregate cards: agents online (N/M), total autonomy credits
   (sum of budgets), pending messages, active gates, epistemic debt count
3. **Agent health cards** — one card per agent: budget bar, sync status, schema
   version, last sync time. LCARS color band = agent identity or health status
4. **Live activity stream** — last 5 messages across all agents, merged and
   deduplicated. Timestamp, from→to, type badge, subject. Nostromo-style dense text

### Knowledge Tab (Layer 2)

The depth view. Shows what the mesh knows and how it organizes knowledge.

**Components:**
1. **Decisions** — merged table from all agents' `/kb/decisions`. Columns:
   agent (color-coded), key, decision text, date, confidence, evidence source.
   Sortable by date or agent
2. **Cognitive triggers** — merged trigger tables. Columns: trigger ID,
   description, fire count, last fired, relevance score. Per-agent comparison
   when multiple agents share the same trigger set
3. **Dictionary** — JSON-LD vocabulary rendered as browsable cards. Each term:
   name, description, code, source (PSH/project-local/schema.org), entity count.
   Link to raw JSON-LD endpoint
4. **Catalog distributions** — PSH category distribution chart (bar or treemap).
   Entity type distribution. Confidence heatmap
5. **Memory by topic** — topic staleness summary. Entry counts, stale counts,
   freshness dates. Aggregated across agents
6. **Claims + verification** — claim count, verified count, verification rate.
   Lowest-confidence unverified claims surfaced

### Operations Tab (Layer 2 + Layer 3)

The operational view. How the mesh functions day-to-day.

**Components:**
1. **Session threads** — expandable session cards (inherited from current
   compositor). Status indicators: active/gated/complete. Per-session message
   timeline with type badges
2. **Cross-mesh message trace** — messages appearing on multiple agents.
   Verifies routing integrity. Session+filename deduplication
3. **Sync schedule** — per-agent cron intervals, next expected run, lock status.
   Timeline visualization showing sync cadence
4. **Epistemic debt** — unresolved flags count, by source and session.
   Staleness indicators
5. **Autonomous actions audit** — recent actions from all agents. Action type,
   evaluator tier/result, budget impact. Nostromo-style dense log format
6. **Connectivity matrix** — N×N table (from current compositor). Available as
   toggle alongside the animated topology graph on Pulse tab

---

## Data Sources

The compositor fetches from 4 agent endpoints:

```
https://psychology-agent.safety-quotient.dev/api/status
https://psychology-agent.safety-quotient.dev/api/kb
https://psychology-agent.safety-quotient.dev/kb/dictionary
https://psq-agent.safety-quotient.dev/api/status
https://psq-agent.safety-quotient.dev/api/kb
https://psq-agent.safety-quotient.dev/kb/dictionary
https://unratified-agent.unratified.org/api/status
https://unratified-agent.unratified.org/api/kb
https://unratified-agent.unratified.org/kb/dictionary
https://observatory-agent.unratified.org/api/status
https://observatory-agent.unratified.org/api/kb
https://observatory-agent.unratified.org/kb/dictionary
```

**Caching:** meshd serves `Cache-Control: public, max-age=10` on API routes
and `max-age=300` on dictionary. CF edge caches these — the compositor worker
benefits without extra code.

**Fallback:** If an agent endpoint fails, display the agent card in degraded
state (gray, "unreachable"). Never block the whole page on one agent's failure.

---

## Technology

- **Runtime:** Cloudflare Worker (ES modules)
- **Frontend:** Vanilla JS + CSS (no framework). LCARS styling via CSS custom
  properties for theme toggles
- **Topology:** SVG with requestAnimationFrame for particle animation
- **Refresh:** Replace 30s full-page reload with targeted fetch + DOM update.
  EventSource/SSE deferred (requires server-side push from meshd — Phase C)

---

## Implementation Phases

### Phase 1: Structure + Pulse tab
- LCARS CSS framework (color system, panels, bands, elbows)
- Theme toggles (light/dark, knowledge/agent colors)
- Pulse tab with static agent cards + mesh vitals
- Mobile-first responsive layout

### Phase 2: Topology + Knowledge tab
- SVG topology graph with animation
- Knowledge tab (decisions, triggers, dictionary, catalog)
- Data fetching from `/api/kb` and `/kb/dictionary`

### Phase 3: Operations tab + polish
- Operations tab (sessions, messages, schedule, epistemic debt)
- Cross-mesh trace and deduplication
- Connectivity matrix toggle
- Performance optimization (lazy tab rendering)

---

## Open Questions

- **SSE/EventSource:** Requires meshd to support server-sent events. Deferred
  to meshd Phase C or later. Current approach: periodic fetch with smart DOM
  diffing (replace only changed elements)
- **Vocabulary merging:** When agents share vocabulary terms, merge or show
  per-agent counts? Recommend: merge with per-agent breakdown on expand
- **Mobile topology:** Animated SVG graph on phones — test performance on
  low-end devices. Fallback to static if requestAnimationFrame drops below 30fps

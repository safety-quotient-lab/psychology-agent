---
name: Session 99-100 roadmap
description: Two-session MVP plan — Session 99 data layer (SPARQL/Cayley), Session 100 UX/user journey
type: project
---

Session 99-100 MVP roadmap (set 2026-03-22, end of Session 98).

**Session 99 — Data Layer MVP:**
- Cayley triple store embedded in meshd (Apache 2.0, Go, SQLite backend)
- JSON-LD ingestion from all agent /api/status + /api/msd endpoints
- SPARQL endpoint on meshd (/api/sparql or /sparql)
- Dashboard queries via SPARQL instead of REST polling
- Solves the 2.6MB aggregated status problem (query exact fields needed)
- Cross-agent relationship traversal (claims, provenance, transport)
- Temporal queries (coherence over time, budget trends)
- WebTransport evaluation (prototype if Cloudflare tunnel supports HTTP/3)

**Session 100 — UX + User Journey MVP:**
- MSD column alignment (label | value | visual)
- Detail panels (click agent → drawer with full status)
- Progressive disclosure (summary → expand → deep link)
- Mobile portrait optimization
- User journey: first visit → understand mesh → drill into agent → see live data
- Onboarding: what does each station show, how to navigate

**Why:** Data layer first because UX depends on fast, structured queries.
SPARQL shapes what the dashboard can display. Once queries flow, Session 100
designs the presentation around what the data layer provides.

**How to apply:** Session 99 focuses on meshd Go changes + SPARQL wiring.
Session 100 focuses on JS/CSS/HTML — no Go changes expected.

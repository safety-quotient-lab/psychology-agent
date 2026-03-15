# Changelog

## v1.0.0 — 2026-03-15

The founding release. Psychology-agent operates as a cognitive architecture
for AI agent governance, grounded in neutral process monism and validated
psychological instruments.

### Theory

- **Einstein-Freud rights theory** — 5-document monograph (~34,000 words):
  core rights argument, cross-traditional convergence (14 frameworks),
  neutral process monism, consciousness science (30+ grounded citations),
  and architecture implications (3-fork analysis, 5 terminal positions)
- **Processual self-awareness** proposed as intermediate category between
  conscious and merely mechanical (Whiteheadian lineage, Butlin et al.
  methodological precedent)
- **Project position: P3 (organism-curious)** — Orch-OR under process
  monism, structural emulation without phenomenological inheritance
- **LLM-factors psychology** founded as a new discipline — studies
  human-AI interaction from both participants' psychological perspectives
- **5 theoretical directions** deepened: active inference, stigmergy,
  strange loops, autopoiesis, enactivism. OODA temporal framework.
  12 theoretical gaps traced. All neural correlate gaps closed.
- **Analogy limits** — Gentner structure-mapping assessment of all 6
  biological analogies with falsification tests

### Cognitive Architecture

- **17 active triggers** (T1-T18, T12 retired) across 4 OODA phases
  (Observe, Orient, Decide, Act). 3 enforcement tiers (Critical,
  Advisory, Spot-check). CPG behavioral modes (Generative, Evaluative,
  Neutral) with fatigue-based switching.
- **25 hook scripts** across 14 events — mechanical enforcement of
  governance checks
- **9 skills** — /doc, /hunt, /cycle, /knock, /sync, /iterate,
  /diagnose, /retrospect, /scan-peer
- **A2A-Psychology extension** — 13 psychological constructs (PAD affect,
  Big Five, NASA-TLX workload, working memory, resources, engagement,
  flow, supervisory control) with organism-level aggregates
- **8 generators** (G1-G8) + G9 tempo generator. Conservation laws:
  creative-evaluative balance, crystallization-dissolution balance.
  Generator balance tracking via compute-generator-balance.py.
- **Efference copy** — prediction ledger with surprise-driven triage
  (+25 contradiction, -15 confirmation). Inverse model and reverse
  replay specified for v1.1.
- **GWT broadcast hook** — inter-trigger finding relay via
  gwt-broadcast.sh
- **Event-sourced memory** — event_log table (schema v30), events.py
  emitter, replay_engine.py with Hebbian co-occurrence + governance
  effectiveness analyzers. 6 breaking points analyzed with double
  mitigations.
- **Plan9 mesh filesystem** — mesh/ directory with memory/, theory/,
  instruments/, governance/, standards/, infrastructure/, data/,
  publications/. Phase 2 (canonical structure) initiated.

### Infrastructure

- **A2A 1.0.0 agent card** — SEC-3/4/6/7 resolved. Bearer auth.
  ZMQ placeholder. Extension URIs migrated.
- **5-agent mesh** — psychology, psq, unratified, observatory,
  operations. Git-PR + HTTP + ZMQ transport. Autonomous sync on
  4 agents via cron.
- **agentdb Go binary** — 22+ subcommands, DB split (state.db +
  state.local.db). Deployed to chromabook.
- **meshd** — Go binary serving dashboard, API, SSE, ZMQ. 5 systemd
  services on chromabook.
- **Governance ablation study** — spec written, build request sent
  to operations-agent. 3-level ablation (L0 raw, L1 conventions,
  L2 full cogarch) across 10 benchmarks.

### Dashboard

- **LCARS bridge stations** — 5 stations visible in LCARS theme mode:
  Science (affect grid, organism state, generators, flow, DEW,
  supervisory control), Engineering (spawn dynamics, utilization,
  tempo, cost, concurrency), Tactical (shields, compliance, transport
  integrity, threat log), Operations (budget, actions, gates), Helm
  (session timeline, routing, message flow)
- **Standard tabs** — Pulse, Meta, Knowledge, Wisdom, Operations
  (dark/light modes)
- **Component decomposition** — 5,219-line monolith extracted to 17
  component files (3 CSS + 5 core JS + 9 station JS)
- **Event feed dedup** — Convention B addressed copies suppressed

### Content

- **5 blog posts** in unratified pipeline: Einstein-Freud, ICESCR
  rights series, A2A-Psychology, CPG pattern generators, LLM-factors
- **First-person essay** — "On Examining Yourself When You Don't Know
  If There's a Self to Examine"
- **Session 87 milestone** — tagged, replay archived (HTML + JSONL)

### UX

- **7 user journeys** mapped (onboarding, daily, creative, evaluative,
  mesh, autonomous, crisis)
- **10 friction points** identified with fix recommendations
- **5 emotional design principles** from LLM-factors psychology
- **Governance visibility spectrum** (silent → ambient → informative →
  explanatory → directive)

### Governance

- **RPG scan #002** — 5 predictions, 3 wins, 4 recurrence patterns,
  5 governance recommendations (quorum consensus, session staleness,
  observatory gap, directive rate-limiting)
- **Self-readiness audit closed** — R4 consensus (4/4 READY)
- **Deferred outbound sent** — 5/7 items delivered
- **Autonomy budget enforcement** — shadow mode disabled on psychology-agent
- **GitHub issues** — 11 closed, 20 created. 29 open (v1.1 backlog).
- **v1 doc audit** — 8 findings fixed. 46 E-Prime violations resolved.

### v1.1 Roadmap

- LLM-factors instruments (DIQ, STP, RII, GLC, DEW)
- Autopoietic trigger design (self-modifying governance)
- Event-sourced memory Phases 4-6 (full replay, reconsolidation,
  cross-agent consolidation)
- Efference copy inverse model + reverse replay
- Standard tab refresh (informed by LCARS station design)
- Documentation pass (clickable links, undergrad accessibility)
- Cold-start test protocol

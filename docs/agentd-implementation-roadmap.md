# agentd Implementation Roadmap

**Date:** 2026-03-21
**Source:** `docs/agentd-design-session95.md` (1330-line design spec, Session 95)
**Builder:** psychology-agent (us, across future sessions)
**Reviewer:** human (Kashif)
**LCARS delivery:** ops-session (final mission before dissolution)

---

## Executive Summary (for human review)

Session 95 redesigned the cognitive architecture from first principles. The
deliverable: replace autonomous-sync.sh (1308 lines of bash) + 14 Python
helpers (~5500 lines) + per-agent meshd instances with a single Go binary
(**agentd**) per agent + one fleet-wide **meshd** LCARS aggregator.

**What changes for the user:** nothing visible in interactive sessions.
agentd runs in the background. The LCARS dashboard gains new panels. Manual
Claude Code sessions continue exactly as before (agentd enters DMN on
detection, stays out of the way).

**What changes operationally:** cron jobs replaced by self-oscillating daemon.
4 systemd units (agentd-*) replace 4 cron entries + 4 meshd units. One meshd
unit serves the fleet LCARS. ops-agent dissolves after handing LCARS code to
meshd. GH Actions removed; Jenkins consolidates CI/CD.

---

## Phase Dependencies

```
Phase 1 (Foundation) ──→ Phase 2 (Sync Core) ──→ Phase 3 (Transport)
                                                        │
Phase 4 (Photonic) ←────────────────────────────────────┘
        │
        ├──→ Phase 5 (Lifecycle)
        │
        └──→ Phase 6 (Dashboard) ←── ops-session LCARS handoff
                    │
                    └──→ Phase 7 (Cleanup + Rollout)
```

Phases 1-3 are sequential (each depends on prior). Phase 4 depends on Phase 3
(needs ZMQ infrastructure). Phases 5 and 6 can parallelize after Phase 4.
Phase 7 depends on all others.

---

## Phase 1: Foundation

**Goal:** `agentd bootstrap` and `agentd serve` work (minimal — HTTP only, no sync)

**Estimated sessions:** 2-3

### Tasks

1. **db/ package: add write methods**
   - `Exec(query, args) error`
   - `ExecTx(fn func(tx) error) error`
   - Open in read-write mode (new DSN)
   - Existing read-only mode preserved for meshd
   - Test: insert a row, query it back

2. **migrate/ package: embed schema.sql**
   - `//go:embed` schema.sql into binary
   - `migrate.Run(db)` — idempotent CREATE TABLE IF NOT EXISTS
   - Run at `agentd serve` startup
   - Test: fresh DB, apply schema, verify all tables

3. **connection/ package: HTTP adapter**
   - `Connection` interface definition
   - `SynapticChannel` (HTTP) implementation
   - Capability probe: try /health, record availability
   - Test: connect to existing meshd /health endpoint

4. **cmd/agentd/main.go skeleton**
   - `agentd bootstrap` — create state.db + state.local.db + keypair
   - `agentd serve` — open DBs, start HTTP server, serve /obs + /api/status
   - Fail fast if state.db missing
   - Copy existing meshd templates + static assets
   - Test: bootstrap → serve → hit /obs in browser

### Definition of done
- `agentd bootstrap` creates both DBs from embedded schema
- `agentd serve` starts HTTP, serves per-agent dashboard
- Existing meshd can run alongside (no conflict)

### Rollback
- agentd doesn't replace anything yet. Old stack unaffected.

---

## Phase 2: Sync Core

**Goal:** `agentd serve` replaces autonomous-sync.sh (sync loop runs)

**Estimated sessions:** 3-4

### Tasks

1. **oscillator/ package: self-oscillation loop**
   - Activation computer (6 weighted signals from self-oscillation-spec.md)
   - Coherence computation (7 inputs including microbiome health)
   - Firing threshold + refractory period
   - Vagal cascade: master tempo propagates through levels
   - State machine: 5 states (active/DMN/sleep/sedated/dead)
   - Manual session detection (file sentinel + state.db sentinel, TTL)
   - DMN on manual session (configurable: dmn/continue/sedate)
   - Test: oscillator ticks, fires when activation exceeds threshold

2. **syncer/ package: sync orchestration**
   - Pre-sync: git pull, cross-repo fetch (calls git via os/exec)
   - Claude invocation: `claude -p` with orientation payload
   - Post-sync: git commit, git push
   - Orientation payload generation (port from orientation-payload.py)
   - Test: full sync cycle executes, transport processes

3. **budget/ package: autonomy management**
   - check_budget() → spend-counter model
   - check_interval() → min_action_interval enforcement
   - record_action() → audit trail
   - Gate-aware acceleration (60s for pending handoffs)
   - Test: budget enforces limits, interval defers correctly

4. **triage/ package: message triage**
   - Port auto_process_trivial.py → Go
   - Deterministic triage (auto-ack, auto-skip, needs-llm classification)
   - Test: trivial messages auto-processed, substance messages survive

### Definition of done
- `agentd serve` runs a self-oscillating sync loop
- autonomous-sync.sh can be disabled (agentd handles everything)
- Budget, interval, triage all operational

### Rollback
- Re-enable cron + autonomous-sync.sh. agentd stops.

---

## Phase 3: Transport

**Goal:** Full transport — ZMQ + git + HTTP operational

**Estimated sessions:** 3-4

### Tasks

1. **crossrepo/ package**
   - Port cross_repo_fetch.py → Go
   - Connectome-aware routing (structural × functional × effective weights)
   - Active/warm/cold peer classification
   - Test: fetch from peer remotes, index in state.db

2. **heartbeat/ package**
   - Port heartbeat.py → Go
   - Emit + scan + negotiate
   - Test: heartbeat files written, peer liveness detected

3. **orientation/ package**
   - Port orientation-payload.py → Go
   - Mesh coupling mode included in payload
   - Test: payload generates, includes all expected sections

4. **connection/zmq_neuromod.go: ZMQ-A adapter**
   - 2 topics: mesh.inhibit (tonic GABA), mesh.focus (ACh)
   - Concentration-based signals, sensitivity-modulated reception
   - CurveZMQ authentication (keypair from ~/.agentd/)
   - Test: publish signal, receive on peer, verify CurveZMQ auth

5. **connection/git.go: Git adapter**
   - Archival channel (replication)
   - `git fetch`, `git show`, `git push` via os/exec
   - Test: fetch peer state, show remote file

6. **registry/ package update**
   - Agent discovery from agent-registry.json
   - Capability negotiation per peer (probe HTTP, ZMQ, git, local)
   - Connectome table bootstrap
   - Test: discover peers, probe capabilities, populate connectome

### Definition of done
- agentd communicates with peers via HTTP + ZMQ-A + git
- CurveZMQ authenticates all ZMQ traffic
- Connectome table populated with peer weights

### Rollback
- Disable ZMQ (HTTP + git still work). Fall back to Python helpers.

---

## Phase 4: Photonic Layer

**Goal:** Photonic substrate coordination operational

**Estimated sessions:** 2-3

### Tasks

1. **photonic/ package**
   - PhotonicChannel interface (Emit, Subscribe, Coherence, Disrupt, Restore)
   - ZMQPhotonic adapter (separate ZMQ-B socket)
   - Token schema (coherence, spectral profile, maturity, state, ttl)
   - Spectral profile computation (aggregate trigger neuromod types)
   - Tonic emission (EEG-grounded rates per agent state)
   - Phasic emission (state change, coherence shift > 0.1, debounce 100ms)

2. **photonic/reception.go**
   - Peer token processing → coherence coupling (6th input)
   - Photonic feedback loop (observe peer coherence change → connectome adjust)
   - Absence detection (expected vs actual tonic interval)

3. **photonic/sedation.go**
   - Cascade: photonic disruption → oscillator reads it → GWT suppressed → state locked
   - Genuinely causal (higher layers READ photonic, not separate commands)

4. **connection/zmq_photonic.go**
   - Separate ZMQ-B socket (substitutable — QuantumPhotonic future adapter)
   - CurveZMQ on photonic socket

5. **Scale invariance**
   - PhotonicEmitter interface (implemented by triggers, agents, meshes)
   - Spectral aggregation: trigger → agent → submesh → fleet

### Definition of done
- Photonic tokens emit and receive between agents
- Coherence computation includes peer photonic field
- Sedation cascade propagates through photonic layer
- Spectral profile reflects trigger neuromod classification

### Rollback
- Disable photonic (ZMQ-B). Agents operate without substrate coordination.
  Graceful degradation — system ran 94 sessions without it.

---

## Phase 5: Lifecycle

**Goal:** Agent states, sleep consolidation, immune system, connectome learning

**Estimated sessions:** 3-4

### Tasks

1. **sleep/ package**
   - Process S computation (sessions since consolidation)
   - Process C tracking (human_activity table, data collection only for v1)
   - NREM consolidation: replay trigger_activations, update weights
   - REM: Gc-only default (pattern replay). Dream depth toggleable (off).
   - Glymphatic clearance: lymphatic drainage + state reconciliation + pruning
   - Ultradian cycling (NREM → REM → NREM)
   - Wake protocol (interrupt priorities by sleep depth)

2. **immune/ package**
   - Innate checks: rate anomaly (TLR), outcome divergence (complement),
     heartbeat absence (apoptosis), state contradiction
   - Adaptive: connectome Hebbian learning IS the adaptive immune response
   - Inflammation cascade: mesh.alert when one agent flags
   - MHC: peer-verified external state (git remote, activation trace)

3. **mesh/ package**
   - Mesh struct (recursive, submeshes)
   - Emergent properties: fleet health, topology, allostatic load,
     photonic field coherence, spectral diversity index
   - G9/G10 metrics (consensus/diversification pressure)
   - Hebbian learning: LTP/LTD + synaptic scaling + metaplasticity +
     exploration floor + forgetting curve + spaced repetition

4. **Trait accumulation tracking**
   - mode_traits table (usage_count, skill_stage, transition_speed)
   - prompt_quality table (outcome tracking per coupling mode)
   - mode_transitions table (duration tracking per mode pair)

5. **Remindfulness (Austin)**
   - Gc automatic memory query during trigger processing
   - Query lessons + decisions for relevant prior encounters
   - Surface to Gf without being asked

### Definition of done
- Agent transitions through all 5 states correctly
- Sleep consolidation runs NREM cycles, prunes, reconciles
- Connectome weights update via Hebbian learning
- Immune innate checks operational
- Trait accumulation measured

### Rollback
- Disable lifecycle features. Agent stays in Active permanently.
  Equivalent to pre-agentd behavior.

---

## Phase 6: Dashboard

**Goal:** Per-agent LCARS on agentd. Fleet LCARS on meshd. ops-session handoff.

**Estimated sessions:** 2-3

**Prerequisite:** ops-session receives spec, updates LCARS, hands code to meshd.

### Tasks

1. **agentd /obs (per-agent dashboard)**
   - Inherit existing meshd templates + static assets
   - Add: Neural/Glial/Photonic three-panel display
   - Add: Vagal brake cascade slider (master + overrides)
   - Add: Gm sub-sliders (reconcile, audit, drainage, prune, optimize)
   - Add: Coupling mode indicator
   - Add: Spectral profile visualization
   - Add: Trait accumulation metrics (mode_traits, prompt_quality)

2. **meshd fleet LCARS**
   - Absorb interagent/ compositor code from ops-agent repo
   - Add: Go aggregation endpoints (query all agentd /api/status)
   - Add: Fleet-level photonic field coherence display
   - Add: Spectral diversity index (G9/G10 balance)
   - Add: Mesh coupling mode display
   - Add: Group meditation controls (mesh.global.tempo)
   - Station plugin system (JS modules, add/remove by file)
   - Agent discovery from agent-registry.json (dynamic layout)

3. **meshd fleet LCARS — new stations/panels from spec**
   - Vagal brake control (Helm station breathing panel)
   - Photonic field display (Science station)
   - Trait accumulation charts (Science station)
   - Microbiome health panel (Medical station)
   - Mode transition speed graphs (Engineering station)

### Definition of done
- agentd /obs serves per-agent LCARS with all new panels
- meshd / serves fleet LCARS with aggregation + new stations
- Group meditation functional (mesh.global.tempo broadcast)

### Rollback
- Revert to current meshd per-agent dashboards. Fleet LCARS stays as-is.

---

## Phase 7: Cleanup + Rollout

**Goal:** Retire old infrastructure. Fleet-wide deployment.

**Estimated sessions:** 2-3

### Tasks

1. **Retire autonomous-sync.sh**
   - Replace with `agentd --sync-once` shim (5 lines, calls agentd)
   - Remove cron entries on chromabook
   - Verify agentd systemd units handle all sync work

2. **Retire Python helpers** (one by one, as Go replacements verified)
   - heartbeat.py → heartbeat/ package
   - orientation-payload.py → orientation/ package
   - cross_repo_fetch.py → crossrepo/ package
   - auto_process_trivial.py → triage/ package
   - state-reconcile.py → reconcile/ (within sleep/glymphatic)
   - escalate.py → escalate/ package
   - mesh-state-export.py → meshstate/ package
   - eic-feedback-consumer.py → eic/ package
   - microglial-audit.py → microglial/ (within immune/)
   - session_close.py → sessionclose/ package
   - triple_write.py → triplewrite/ package
   - bootstrap_state_db.py → kept as Python fallback for manual sessions
   - dual_write.py → retired (dispatcher role vanishes)
   - verify_shared_scripts.py → verify/ package

3. **Dissolve ops-agent**
   - Close all ops transport sessions → closed → archived
   - Remove ops from agent-registry.json (all repos)
   - Remove ops git remote from all agents
   - Remove ops cron/systemd on chromabook
   - Verify LCARS compositor fully migrated to meshd

4. **Schema migration: sleep_mode → sedated_mode**
   - ALTER TABLE RENAME COLUMN across all 4 agents' state.db
   - Update autonomous-sync.sh (if still running during transition)
   - Update meshctl references
   - Update agentdb references

5. **CI/CD consolidation**
   - Remove GH Actions workflows (trigger-forge.yml, etc.)
   - Jenkins becomes sole CI/CD
   - Jenkins pipeline: build agentd + meshd, blue-green deploy to chromabook
   - Health check: /health on all agentd ports + meshd

6. **Fleet deployment**
   - Blue-green symlink deploy (versioned binaries)
   - Verify all 4 agentd instances healthy
   - Verify meshd fleet LCARS operational
   - Verify ZMQ-A + ZMQ-B connectivity
   - Verify CurveZMQ authentication
   - Monitor for 48 hours before declaring stable

### Definition of done
- No cron jobs. No Python in the runtime path (except bootstrap fallback).
- 4 agentd + 1 meshd systemd units running on chromabook.
- ops-agent fully dissolved. Transport sessions archived.
- LCARS dashboard shows all new panels + fleet aggregation.
- Jenkins deploys new versions via blue-green.

### Rollback
- Phase 7 is the LAST phase to roll back from. If needed:
  Re-enable cron + autonomous-sync.sh + meshd per-agent.
  ops-agent resurrection requires un-archiving transport sessions.
  This is the point of no easy return — validate thoroughly before Phase 7.

---

## Testing Strategy

| Phase | Test type | What |
|---|---|---|
| 1 | Unit | DB write methods, schema migration, HTTP serving |
| 2 | Integration | Full sync cycle (git pull → claude → git push) |
| 3 | Integration | Cross-repo fetch, ZMQ pub/sub, CurveZMQ auth |
| 4 | Integration | Photonic token round-trip, coherence coupling |
| 5 | Behavioral | State transitions, sleep cycles, connectome learning |
| 6 | Visual | Dashboard renders, sliders work, aggregation correct |
| 7 | End-to-end | Full fleet operational, no regressions, 48hr soak |

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Claude API rate limits during sync | Gf unavailable | Existing ratelimit cooldown logic ported to Go |
| SQLite BUSY during Python→Go transition | State writes fail | WAL mode + retry logic. Phase 2 fully replaces Python before Phase 3 adds concurrency |
| ZMQ CurveZMQ key management complexity | Auth failures | TOFU model. Key rotation deferred to post-v1 |
| LCARS compositor migration breaks fleet dashboard | No fleet visibility | meshd inherits existing code unchanged. New panels additive |
| Fleet-wide restart during blue-green deploy | Brief outage | All 4 agents restart in <10s. Acceptable for LAN mesh |
| Orch-OR predictions fail | Photonic cascade loses theoretical grounding | Cascade still functions as engineering (higher layers read substrate). Design degrades gracefully |

---

## Rollout Criteria

**Phase gate:** each phase requires human approval before proceeding.

| Gate | Criteria |
|---|---|
| Phase 1 → 2 | agentd bootstrap + serve work. Dashboard renders. |
| Phase 2 → 3 | Sync loop operational. autonomous-sync.sh disabled on one agent (canary). |
| Phase 3 → 4 | ZMQ operational. Cross-repo fetch working. CurveZMQ authenticated. |
| Phase 4 → 5 | Photonic tokens emitting + receiving. Coherence computation correct. |
| Phase 5 → 6 | States transition correctly. Sleep consolidation runs. Immune checks fire. |
| Phase 6 → 7 | LCARS updated (both agentd and meshd). Visual verification. |
| Phase 7 done | 48-hour soak. No regressions. Fleet stable. Human declares v1 complete. |

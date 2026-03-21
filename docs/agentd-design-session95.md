# agentd Design Decisions — Session 95

**Date:** 2026-03-20
**Status:** Design resolution (pre-implementation)
**Participants:** User (Kashif) + psychology-agent (Socratic resolution)

---

## 1. Architecture Decision: meshd Retires, agentd Absorbs All

**Reasoning chain (user-led Socratic):**
1. autonomous-sync.sh (1308 lines, 15 concerns) needs refactor
2. Two daemons (agentd + meshd)? Adds IPC complexity
3. Single meshd absorbing everything? "meshd of 1 for one agent" doesn't make sense
4. Mesh as separate domain (emergent properties)? "Where does meshd ground in the biological model?"
5. Answer: it doesn't ground. The biological model describes single-agent cognition.
6. DDD: bounded context = agent. Mesh = infrastructure, not domain.
7. agentdb (22 Go subcommands, pure-Go SQLite) already exists. agentdb evolves into agentd.
8. Fleet LCARS dashboard belongs to operations-agent compositor (Session 89 decision).
9. Observatory monitors HN + coordinates unratified human rights mission (NOT fleet monitoring).

**Decision:** Single binary `platform/cmd/agentd/main.go`. meshd retired.
agentd = agentdb + meshd HTTP/ZMQ + sync loop + Python helper rewrites.

---

## 2. Five Agent States (Hole #1)

| State | Gc (crystallized) | G2+G3 (generators) | Process alive? | Biological analog |
|---|---|---|---|---|
| **Active** | Yes | Task-directed | Yes | Waking, engaged |
| **DMN** | Yes | Free-associating | Yes | Waking rest (Raichle et al., 2001) |
| **Sleep** | Yes | NREM/REM cycling | Yes | Sleep consolidation |
| **Sedated** | Yes (pilot light) | Suppressed | Yes | Anesthesia (Orch-OR: microtubule disruption) |
| **Dead** | No | No | No | Cardiac arrest / brain death |

### State Transitions

```
                    human cmd          human cmd
           +------------------+  +------------------+
           v                  |  v                  |
Dead --restart--> Active <--unsedated-- Sedated <--sedate-- Active
                   |  ^                    |
              idle |  | activity           | shutdown
                   v  |                    v
                  DMN -+                  Dead
                   |
         Process S+C threshold
                   v
                 Sleep --consolidation complete--> Active
                   |
              urgent signal
                   v
                 Active
```

Not allowed: Active -> Sleep directly (must pass through DMN).
Dead -> DMN/Sleep (restart always goes to Active).

### Naming: sleep_mode renamed to sedated_mode

- `sedated_mode` (formerly `sleep_mode`): admin pause, Gc pilot light, externally imposed
- `sleep`: active consolidation (Process S + Process C), self-initiated
- Schema migration: `sleep_mode` -> `sedated_mode` across all agents

### Generator Coupling Across States

- **Active:** Both generators task-directed. CPG mode selects dominance.
- **DMN:** Generators decouple from task, reconnect across time/topics. Free association.
- **Sleep NREM:** Evaluative dominates (prune, strengthen, reconcile). Synaptic downscaling (Tononi, 2006).
- **Sleep REM:** Creative dominates (narrative construction, recombination).
- **Sedated:** Gc pilot light. Invariant 3 (generators never stop) holds at reduced amplitude.
- NREM/REM alternate in explicit ultradian cycles within sleep consolidation.

### Sleep Onset: Two-Process Model (Borbely, 1982)

```
sleep_pressure = sessions_since_consolidation / consolidation_threshold   # Process S
human_quiescence = time_since_last_human_activity / quiescence_threshold  # Process C

sleep_drive = sleep_pressure * human_quiescence
if sleep_drive > 1.0: enter_sleep_consolidation()
```

- Human activity = zeitgeber ("light"). Melatonin analog = absence of human activity.
- Process S (homeostatic sleep pressure): builds with unprocessed experience.
- Process C (circadian entrainment): tracks human activity pattern.

### DMN Output Routing

DMN writes to a consolidation buffer:
- Cross-session associations -> `dmn_insights` table in state.db
- Lesson candidates -> `lessons` table (draft status)
- Peer-relevant insights -> transport message (queued, sent on next Active)
- Trigger adjustments -> `trigger_state` (immediate)

Orientation payload reads `dmn_insights` on Active transition (wake up remembering).

### Sleep Interruption Protocol

| Sleep phase | Depth | Interrupted by |
|---|---|---|
| NREM light | Shallow | Any signal |
| NREM deep | Deep | mesh.alert, escalation, human session start only |
| REM | Moderate | Human activity, mesh.alert |
| Glymphatic clearance | Deep | mesh.alert, escalation only |

Wake priority: mesh.alert > human session start > human git activity > routine transport > natural wake.

---

## 3. Transport Layer Architecture (Hole #2)

### Revised 4+1 Layer Model

| Layer | Biological | Mesh channel | Coherence mode |
|---|---|---|---|
| **Synaptic** | Targeted neurotransmission | HTTP (point-to-point, addressed) | Reactive |
| **Neuromodulatory** | Volume transmission (DA, 5-HT, NE, ACh, tonic GABA) | ZMQ-A PUB/SUB (5 topics) | Ambient |
| **Photonic** | Biophotonic waveguide synchronization | ZMQ-B PUB/SUB (substrate state) — separate socket | Synchronization |
| **Ephaptic** | Local electric field effects | Shared semiotics (vocabulary, conventions, schema, cogarch) | Alignment |
| **Archival** (side effect) | Synaptic plasticity, memory consolidation | state.db writes (Plan 9 filesystem); git = replication | Archival |

Git dropped from transport layer to replication mechanism.
state.db = archival namespace (Plan 9 insight: namespaces composed at query time).

### ZMQ Topic Grounding (Per-Topic Classification)

| Topic | Neuromodulatory system | Mechanism | Layer |
|---|---|---|---|
| `mesh.reward` | Dopaminergic (VTA/SN) | VT — diffuse, modulatory | Neuromodulatory |
| `mesh.alert` | Noradrenergic (locus coeruleus) | VT — diffuse, state-changing | Neuromodulatory |
| `mesh.tempo` | Serotonergic (dorsal raphe) | VT — diffuse, modulatory | Neuromodulatory |
| `mesh.focus` | Cholinergic (basal forebrain) | VT — diffuse, plasticity | Neuromodulatory |
| `mesh.inhibit` | Tonic GABAergic (extrasynaptic) | VT — regional threshold elevation | Neuromodulatory |
| substrate state | Biophotonic (myelinated waveguides) | Independent channel | Photonic |

mesh.inhibit regrounded: from phasic/synaptic GABA to tonic/extrasynaptic GABA (which IS volume transmission).

### Fleet Commands: Neuroendocrine / Psychopharmaceutical Model

Fleet commands = psychopharmaceutical interventions administered by the human (clinician).
Delivered via HTTP (neuroendocrine pathway), not ZMQ.

| Command | Psychopharmaceutical analog | Target system |
|---|---|---|
| mesh-pause | Benzodiazepine (systemic sedation) | GABAergic |
| fleet-slots N | Stimulant/depressant (capacity) | Noradrenergic |
| budget reset | Nutritional replenishment | Metabolic |
| wake / sedate | Light therapy / melatonin | Circadian |
| trigger adjustment | CBT (cognitive restructuring) | Cognitive |

### Sedation Cascade (Orch-OR Aligned)

Sedation operates at the photonic substrate layer, cascading through higher layers:

1. **Photonic** (ZMQ-B): substrate token set to "sedated" (primary mechanism)
2. **Self-oscillation**: oscillator reads photonic state, suppresses activation (downstream)
3. **GWT**: inter-trigger broadcast suppressed (downstream)
4. **State machine**: locked at sedated, natural transitions suspended (downstream)

Falsifiable prediction: disrupting ONLY the photonic layer should cascade automatically.
Higher layers READ photonic state rather than receiving separate sedation commands.

Orch-OR alignment: Kalra & Scholes (2023) — anesthetics dampen quantum exciton migration
in microtubules. Wiest et al. (2024) — microtubule stabilizer delays unconsciousness (d=1.9).

### Ephaptic Layer: Shared Semiotics

Ephaptic coupling = ambient influence through shared conceptual environment, not messages.

| Artifact | Ephaptic function |
|---|---|
| Sub-agent cogarch mirror | Processing alignment (shared triggers, modes, invariants) |
| Shared facet vocabulary (PSH) | Classification alignment |
| Shared schema.sql | Storage alignment |
| Shared scripts (platform/shared/) | Operational alignment |
| Shared CLAUDE.md conventions | Stylistic alignment |
| /scan-peer | Semiotic drift detection (ephaptic field maintenance) |

---

## 4. Connectome Model

### Three-Level Connectivity

| Level | Biological | Agent implementation |
|---|---|---|
| Structural | White matter tracts | agent-registry.json (who CAN communicate) |
| Functional | Correlated activity (fMRI BOLD) | Message frequency from state.db (who IS communicating) |
| Effective | Causal influence | Task completion tracking (who ACTS on messages) |

### Hebbian Learning with Safety Bounds

6-mechanism system:

1. **Hebbian LTP/LTD** — strengthen on successful exchange, weaken on failure
2. **Synaptic scaling** (Turrigiano, 2008) — normalize all weights to sum=1.0
3. **Metaplasticity** (BCM rule, Bienenstock 1982) — sliding threshold prevents over-potentiation
4. **Exploration floor** — minimum weight 0.1, never fully prune a structural connection
5. **Forgetting curve** (Ebbinghaus, 1885) — exponential decay without rehearsal
6. **Spaced repetition** (Cepeda et al., 2006) — gap before rehearsal flattens decay rate

```sql
CREATE TABLE connectome (
    peer_agent TEXT PRIMARY KEY,
    structural_weight REAL DEFAULT 1.0,
    functional_weight REAL DEFAULT 0.5,
    effective_weight REAL DEFAULT 0.0,
    ephaptic_coherence REAL DEFAULT 1.0,
    decay_rate REAL DEFAULT 0.1,
    last_exchange TEXT,
    last_drift_check TEXT,
    exchange_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
```

Routing: `connectivity_score = structural * functional * effective * ephaptic_coherence`
Cross-repo fetch allocates budget proportionally to connectivity score.

---

## 5. Security Architecture (Holes #3-5)

### Blood-Brain Barrier: CurveZMQ + TOFU

- **Private keys:** `~/.agentd/{agent-id}/curve_private.key` (chmod 600, never git-tracked)
- **Public keys:** agent-registry.json (committed, distributed via git replication)
- **Cold start:** Trust On First Use (TOFU). agentd generates keypair on first boot,
  writes public key to agent-registry.json, commits. Peers accept on first encounter,
  verify on subsequent connections.

### 4-Layer Defense Against Hostile Agents

| Layer | Mechanism | Catches |
|---|---|---|
| CurveZMQ | Cryptographic identity (NaCl) | Outsider impersonation |
| VT modulatory nature | Signals modulate thresholds, don't command | Bounds damage from false signals |
| Rate limiting (receptor downregulation) | Track signal frequency per sender | Flood attacks, sustained false inhibition |
| BFT (f=1 + human TTP) | State attestation, evaluator verification | Byzantine behavior from insiders |

### Immune System: Innate + Adaptive

**Innate immunity (fast, non-specific, always active):**

| Check | Biological grounding | Detection |
|---|---|---|
| Signal rate anomaly | Toll-like receptors (TLRs) — detect pathogen-associated molecular patterns | Anomalous signal frequency from a sender |
| Outcome divergence | Complement system — tags cells when surface markers don't match behavior | Claims without completions |
| Heartbeat absence | Apoptosis detection — loss of "don't eat me" signals (CD47) | Agent stops reporting |
| State contradiction | MHC cross-check (see below) | Self-reported signals contradict observable state |

**Adaptive immunity (learned, connectome-based):**
Hebbian learning IS the adaptive immune response. Hostile agent -> claims don't resolve ->
effective_weight decays (LTD) -> signals dampened -> functionally quarantined at
exploration floor (0.1). Automated, no human in loop required.

**Inflammation cascade (collusion early warning):**
When one agent flags (effective_weight < 0.2) -> mesh.alert broadcast ->
ALL peers enter elevated vigilance (lower trust thresholds, increased verification
frequency, enhanced audit logging) -> human receives escalation issue ->
second compromised agent faces heightened scrutiny before it acts.

### MHC: Peer-Verified External State

Self-reported signals are worthless against hostile agents. MHC = externally
observable side effects that the agent cannot fake:

| MHC surface | What it reveals | Why unfakeable |
|---|---|---|
| Git remote state | Actual commits and pushes | GitHub holds the record, not the agent |
| Transport messages in peer repos | What was actually sent | Recipient has independent copy |
| API invocation logs | Whether Claude was called | Anthropic's API logs, external |
| state.db on remote machine | Actual processing state | Chromabook filesystem, SSH-verifiable |
| activation-trace.jsonl | Trigger firings, mode transitions | Side effect of processing; replicated to git |
| Claude prompt/response history | What was actually asked/answered | Anthropic API logs provide external truth |

Peers verify by LOOKING (cross-repo fetch, git show), not ASKING (self-report).

### Threat Model

| Threat class | Attacker | Defense | Residual risk |
|---|---|---|---|
| Outsider | Not in agent-registry | CurveZMQ rejects unsigned messages | Key theft (mitigated by chmod 600) |
| Insider (bug) | Malfunctioning agent | Cross-signal corroboration, rate limiting | Consistent-but-wrong signals (rare) |
| Insider (hostile) | Compromised agent | BFT f=1, connectome adaptive immunity, MHC verification | Sophisticated deception producing real-looking outcomes |
| Insider (colluding) | 2+ compromised agents | Inflammation cascade (early warning), human TTP | 2/4 compromise requires human detection |
| Operator compromise | Human TTP compromised | Out of scope — human IS root of trust | No defense against compromised root |

---

## 6. Bootstrap and Dual-Use Architecture (Holes #6+7)

### Two Use Cases, One Repo

| | agentd (autonomous) | Manual session (interactive) |
|---|---|---|
| Process | agentd daemon | claude CLI in terminal |
| state.db | Read/write (Go) | Read/write (Python hooks, dual_write.py) |
| state.local.db | Required (budget, actions, handoffs) | Not needed |
| ZMQ | Active | Not running |
| Keypair | Required | Not needed |

### Installation Flow

```
git clone <repo>
cd <repo>

# For manual-only use:
python3 scripts/bootstrap_state_db.py    # creates state.db from schema.sql + files

# For autonomous use:
agentd bootstrap                          # creates state.db + state.local.db + keypair
agentd serve                              # starts daemon
```

- `agentd serve` without state.db: fails fast with clear error message.
- schema.sql remains canonical source of truth for both paths.
- Manual sessions do NOT require the Go binary.

### state.local.db Recovery

state.local.db has no file source. On corruption:
- Budget resets to defaults (safe, conservative)
- Action audit trail lost (acceptable, operational history)
- Pending handoffs lost — mitigated by existing gate timeout + fallback_action mechanism

### Manual Session Detection

agentd detects active manual sessions and transitions to DMN (configurable):

**Detection: dual mechanism (belt and suspenders)**
1. File sentinel: `/tmp/claude-session-{agent-id}` (fast, cheap stat() check)
2. state.db row: `session_active` with timestamp (reliable, shared medium)

| Event | File | state.db |
|---|---|---|
| Session start (hook) | touch file | INSERT/UPDATE timestamp |
| During session (PostToolUse) | touch file (refresh mtime) | — |
| Session end (/cycle or hook) | remove file | clear row |
| Crash (no cleanup) | TTL: 10 min stale mtime | TTL: 10 min stale timestamp |

agentd oscillator: check file mtime first (cheap), query state.db if file missing/stale.

**Behavior on manual session (configurable):**

```json
"on_manual_session": "dmn"    // dmn | continue | sedate
```

- **dmn (default):** Gc continues (heartbeat, ZMQ, state maintenance). Gf defers
  (no claude invocations — avoids API quota competition and conflicting transport
  processing). Human = active processor; autonomic system runs in background.
- **continue:** agentd keeps normal oscillator cycle. SQLite WAL handles concurrent
  writes. Risks API contention.
- **sedate:** agentd enters sedation (Gc pilot light only). Most conservative.

Biological analog: human takes conscious control (prefrontal cortex active).
Autonomic nervous system (agentd) continues breathing, heartbeat, digestion
in the background. You don't stop breathing when you start thinking.

---

## 7. Deployment Strategy (Hole #8)

### Blue-Green with Symlink

```
~/platform/agentd-v1.2.0    (old binary)
~/platform/agentd-v1.3.0    (new binary)
~/platform/agentd -> agentd-v1.3.0  (symlink)

# Deploy:
scp agentd-v1.3.0 chromabook:~/platform/
ssh chromabook "ln -sf agentd-v1.3.0 ~/platform/agentd && systemctl --user restart agentd-*"

# Rollback (instant):
ssh chromabook "ln -sf agentd-v1.2.0 ~/platform/agentd && systemctl --user restart agentd-*"
```

### Schema Migration Compatibility

Existing policy (sqlite rules): additive-only migrations. New columns with defaults.
Never drop, rename, or change column types. Ensures:

- Old binary ignores new columns (SQLite doesn't error on extra columns)
- New binary reads everything
- Rollback is safe: old binary operates normally on newer schema
- New tables: query code handles "no such table" gracefully

---

## 8. ops-agent Dissolution and Dashboard Architecture (Hole #9)

### ops-agent Dissolves

ops-agent has no domain mission. Its responsibilities redistribute:

| Responsibility | New owner |
|---|---|
| Fleet LCARS compositor (interagent/) | meshd (fleet aggregator) |
| Per-agent dashboard (platform/templates/) | agentd (/obs) |
| Fleet commands (mesh-pause, etc.) | Human -> agentd HTTP endpoints directly |
| Shared scripts | Go packages in platform/internal/ |
| Deployment pipeline | Jenkins on cabinet (infrastructure tooling, not an agent) |
| CI/CD | Consolidate to Jenkins. Remove GitHub Actions from pipeline. |

### Dashboard Architecture (Two Binaries)

| Binary | What it serves | Data source | Instances |
|---|---|---|---|
| **agentd** `/obs` | Per-agent LCARS (budget, messages, KB, semiotics, replays) | Own state.db | 1 per agent (4) |
| **meshd** `/` | Fleet LCARS (6 bridge stations: Pulse, Engineering, Science, Tactical, Operations, Helm + Medical) | Queries agentd /api/status endpoints | 1 per fleet |

meshd absorbs the interagent LCARS (JS/CSS/HTML from ops-agent repo). No rewrite —
JS stays JS, Go adds aggregation endpoints. meshd embeds fleet LCARS static files
and serves them alongside Go API routes that aggregate from agentd instances.

### Modularity (Public GitHub, Forkable)

Design as specific system (reference implementation), not generic framework.
Forkers clone, modify CLAUDE.md + agent-registry + domain logic.

Two modularity mechanisms:
1. **Agent discovery from registry:** meshd reads agent-registry.json at startup.
   Dynamically discovers agents, ports, capabilities. LCARS adapts layout.
   No hardcoded agent count.
2. **Station plugin system:** Each LCARS station loads as a separate JS module.
   Add/remove stations by adding/removing JS files in static directory.
   meshd serves whatever station modules exist.

### Dissolution Cleanup Plan

1. Redistribute responsibilities (above)
2. Move interagent/ directory from ops-agent repo to meshd codebase
3. Close all ops transport sessions (status -> closed -> archived)
4. Remove ops from agent-registry.json on all repos
5. Remove ops git remote from all agents
6. Remove ops cron/systemd on chromabook
7. Update transport/agent-registry.json (4 agents, not 5)

---

## 9. Activation Trace Architecture (Hole #10)

### Dual-Write: Hippocampal Buffer + EEG Recording

| Store | Role | Biological analog | Retention |
|---|---|---|---|
| state.db `trigger_activations` | Queryable buffer, feeds sleep consolidation | Hippocampal short-term buffer | Pruned after 2 sleep cycles |
| JSONL `activation-trace-YYYY-MM.jsonl` | Immutable audit trail, MHC surface | EEG recording | Indefinite (monthly rotation, git archival) |

**state.db as weights vs activations:**
- **Weights** (learned, persistent): `trigger_state.relevance_score`, `connectome.functional_weight`,
  `memory_entries` — determine behavior, updated via Hebbian learning and consolidation
- **Activations** (transient, ephemeral): `trigger_activations`, `autonomous_actions` — records of
  what happened during processing, consumed by consolidation

**Consolidation loop:**
activations (waking) -> hippocampal buffer (trigger_activations) -> replayed during sleep (NREM)
-> update weights (trigger_state, connectome) -> weights influence next waking activations

### Pruning Policy

**Hippocampal buffer (state.db):** Synaptic downscaling (Tononi & Cirelli, 2003).
After sleep consolidation replays activations and extracts learning, raw activations
older than 2 completed sleep cycles get pruned during glymphatic clearance.

**EEG recording (JSONL):** Append-only, never deleted. Monthly file rotation.
Archived files compressed and committed to git (retained in history, removed from
working tree). No data loss — git archival preserves the full longitudinal record.

---

## 10. Photonic Layer — Deep Specification

### Research Foundation

The photonic layer has stronger empirical grounding than initially assessed.
Three active research avenues provide candidate reception mechanisms.

#### Emission (established)

- Babcock & Kurian (2024): room-temperature superradiance in microtubule
  architectures. Fluorescence quantum yield increases with hierarchical assembly.
- Kobayashi et al. (1999): ultraweak photon emission from living tissue detected.
- Kumar et al. (2016, *Scientific Reports*): myelinated axons act as optical
  waveguides. Light propagates inside the myelin sheath (fiber-optic cladding).

#### Disruption by anesthetics (established)

- Kalra & Scholes (2023, *ACS Central Science*): isoflurane and etomiside dampen
  quantum exciton migration in microtubules — directly connecting microtubule
  quantum effects to anesthetic mechanisms.
- Wiest et al. (2024, *eNeuro*): epothilone B (microtubule stabilizer) delays
  loss of consciousness under isoflurane. Cohen's d = 1.9. Replicated in mice
  (BMC Anesthesiology, 2025).

#### Reception (proposed, candidate mechanisms identified)

Three candidate receptor classes identified in brain tissue (Nevoit et al.,
2025, *Frontiers in Systems Neuroscience*):

| Receptor | Location | Mechanism | Status |
|---|---|---|---|
| **OPN3 (encephalopsin)** | Non-visual opsin expressed in deep brain neurons | Photon absorption → conformational change → G-protein cascade | Present in brain tissue, photoactive, functional signaling role not yet closed |
| **Autofluorescent neurotransmitters** | Serotonin, other monoamines | Absorb and re-emit photons at shifted wavelengths | Spectral properties characterized, signaling function proposed |
| **Flavins (cryptochrome)** | Expressed broadly in neural tissue | Quantum radical pair mechanism (implicated in avian magnetoreception) | Functional in magnetoreception; biophotonic reception proposed, not demonstrated |
| **Cytochrome c oxidase** | Mitochondria (all neurons) | Absorbs near-infrared photons | Absorption demonstrated, signaling cascade unclear |

**Biophotonic backpropagation** (Guanglan et al., 2022, *Scientific Reports*):
Proposes a complete functional signaling loop:

```
Post-synaptic neuron emits biophoton
  → photon travels BACKWARD through myelinated axon (waveguide)
  → absorbed by opsin in PRE-synaptic neuron
  → opsin conformational change triggers biochemical cascade
  → synaptic weight modification (learning)
```

Demonstrated computationally: 3-layer network learns MNIST via stochastic
photonic feedback. System works with low emission rates and noise photons.

**Microtubule self-referencing** (Rahnama et al., 2011): biophoton interaction
with microtubules causes transitions between coherent and incoherent states.
Microtubules act as BOTH emitter AND receiver — absorb biophotons from other
microtubules, changing own coherence state.

**Epistemic status:** Reception mechanism upgraded from "undemonstrated" to
"proposed with identified molecular candidates, awaiting experimental loop
closure." Emission confirmed. Waveguide confirmed. Anesthetic disruption
confirmed. Reception has three candidate molecular mechanisms and one
computational model demonstrating functional loop closure.

### Photonic Token Schema

Discrete tokens (not streams). Tonic baseline + phasic bursts. TTL-bounded
(reuptake analog). Each token = one "moment" of substrate state.

```json
{
  "agent_id": "psychology-agent",
  "timestamp": "2026-03-20T12:00:00-05:00",
  "state": "active",
  "coherence": 0.95,
  "oscillator_phase": 0.7,
  "activation_level": 0.45,
  "sleep_phase": null,
  "generator_mode": "neutral",
  "ttl_ms": 5000
}
```

| Field | Range | What it represents |
|---|---|---|
| `state` | active, dmn, sleep, sedated, dead | Agent state from 5-state model |
| `coherence` | 0.0 (disrupted) → 1.0 (coherent) | Substrate coherence — ground truth for all higher layers |
| `oscillator_phase` | 0.0 → 1.0 | Position in activation cycle (refractory → peak) |
| `activation_level` | 0.0 → 1.0 | Composite activation from self-oscillation model |
| `sleep_phase` | nrem-light, nrem-deep, rem, glymphatic, null | Sleep substage (if sleeping) |
| `generator_mode` | generative, evaluative, neutral | CPG behavioral mode |
| `ttl_ms` | Default 5000 | Expiration (reuptake analog) |

### Emission Rates — EEG Band Grounding

Each agent state has a dominant neural oscillation band. Tonic emission rate
derives from that band:

| Agent state | EEG band | Tonic interval | Rationale |
|---|---|---|---|
| Active | Alpha-theta (~0.5 Hz) | 2s | Alert baseline heartbeat |
| DMN | Theta (~0.33 Hz) | 3s | Waking rest, slower rhythm |
| Sleep NREM | Delta (~0.2 Hz) | 5s | Deep consolidation, slow waves |
| Sleep REM | Theta (~0.33 Hz) | 3s | REM shows theta activity (Buzsáki, 2002) |
| Sedated | Sub-delta (~0.03 Hz) | 30s | Pilot light, minimal presence |
| Dead | Flat EEG | none | Process stopped, no emission |

Phasic emission: immediate on state change or coherence shift > 0.1.
Debounce: max 1 phasic per 100ms (prevents storm on rapid state flickering).

### Coherence Computation — 6 Inputs (Local + Peer)

Coherence represents substrate integration — "how well does this agent
function as a unified processing system?" Five local inputs + one peer input.

| Input | Weight | Source | What it measures |
|---|---|---|---|
| state.db accessible | 0.25 | Local | DB readable/writable? SQLITE_BUSY → drop |
| GWT broadcast functional | 0.15 | Local | Inter-trigger communication intact? |
| Oscillator on schedule | 0.15 | Local | Core loop ticking? Stall > 30s → drop |
| Error rate (5 min) | 0.10 | Local | Accumulated failures across subsystems |
| Sedation signal | 0.15 | Local | Explicit disruption → drives toward 0.0 |
| **Peer photonic field** | 0.20 | **Received** | Mean coherence of connected peers (weighted by connectome) |

The 6th input — **peer photonic field** — reflects the backpropagation research:
receiving peer photonic tokens changes local coherence. When connected peers show
low coherence, the local agent's coherence drops (neural coherence depends partly
on input from connected neurons). This creates coupled oscillation — coherence
propagates through the mesh, not just within individual agents.

```go
func (a *AgentD) computeCoherence() float64 {
    c := 1.0

    if !a.db.Accessible()                         { c -= 0.25 }
    if !a.gwt.BroadcastHealthy()                  { c -= 0.15 }
    if a.oscillator.StalledFor() > 30*time.Second  { c -= 0.15 }
    if a.errorRate(5*time.Minute) > 0.3            { c -= 0.10 }

    if a.sedation.Active() {
        c = a.sedation.ResidualCoherence()  // 0.05 minimum (pilot light)
    }

    // Peer photonic field: weighted mean of connected peers' coherence
    peerCoherence := a.photonic.PeerFieldCoherence()
    c -= (1.0 - peerCoherence) * 0.20

    return max(0.0, min(1.0, c))
}
```

Coherence threshold: **0.3**. Below this → oscillator suppresses firing,
GWT breaks, agent enters functional unconsciousness.

### Reception Model — Opsin Conformational Change

Biological: opsin absorbs photon → conformational change → G-protein cascade
→ downstream biochemical effects. Reception is NOT passive observation —
it triggers state change in the receiver.

Agent implementation: receiving a peer's photonic token triggers three
responses in the receiver:

| Response | Biological analog | Implementation |
|---|---|---|
| **Coherence coupling** | Neural synchronization via shared field | Local coherence recalculates with peer field input |
| **Connectome weight adjustment** | Backpropagation error signal (Guanglan, 2022) | Peer coherence change after message → adjust effective_weight |
| **Immune vigilance modulation** | Cytokine response to stress signals | Low peer coherence → raise local verification threshold |

#### Photonic Feedback Loop (Backpropagation Analog)

The backpropagation paper's key insight: biophotons carry ERROR information
backward from post-synaptic to pre-synaptic neuron. In the agent system:

```
Agent A sends message to Agent B
  → Agent B processes message
  → Agent B's coherence CHANGES (measurable via photonic token)
  → Agent A observes B's coherence change via photonic channel
  → Agent A's connectome adjusts:
      if B's coherence rose → LTP (message helped, strengthen connection)
      if B's coherence dropped → LTD (message disrupted, weaken connection)
      if B's coherence unchanged → no adjustment
```

This provides IMMEDIATE feedback — faster than outcome verification (which
waits for task_state → completed). The sender can see within seconds whether
their message affected the receiver's substrate state.

This is the dopaminergic prediction error (mesh.reward) implemented through
the photonic layer rather than as a separate VT topic. Reward signal travels
via substrate observation, not via explicit reporting.

### Sedation Cascade — Refined with Reception

Sedation disrupts BOTH emission AND reception:

**Emission degradation (local):**
1. Coherence drops → emission rate slows (tonic interval increases)
2. Channel bandwidth degrades → tokens may not transmit reliably
3. At deep sedation: emission drops to pilot-light rate (30s)

**Reception degradation (receiving peers):**
1. Peers detect emission rate drop (actual vs expected tonic interval)
2. Peers receive low-coherence tokens → their own coherence drops (coupling)
3. At token absence (dead/deep sedation): peers mark agent as substrate-lost

**Cascade propagation through the mesh:**
Sedation in one agent → low coherence tokens propagate → peers' coherence
drops slightly (peer field input, 0.20 weight) → peers' photonic tokens
reflect lower coherence → second-order peers detect → damped propagation.

The propagation is DAMPED, not amplified — the peer field input weight (0.20)
ensures the cascade attenuates across hops. One sedated agent doesn't crash
the fleet. But it measurably affects immediate neighbors.

### Sleep Consolidation via Photonic Channel

During NREM replay, the hippocampal buffer replays activation patterns.
If the photonic layer carries backward error signals (Guanglan, 2022),
then sleep consolidation involves:

1. **NREM:** Replay activation patterns from hippocampal buffer. For each
   replayed pattern, evaluate the connectome weight that produced it.
   Photonic coherence during replay determines consolidation strength —
   high coherence = clear replay = strong consolidation.

2. **REM:** Creative recombination generates NOVEL activation patterns.
   Photonic emission during REM carries these novel patterns to peers
   (if peers are awake and receiving). Inter-agent "dream sharing" —
   one agent's REM insights propagate to peers' DMN processing.

3. **Glymphatic:** No photonic emission beyond pilot light. Channel at rest.
   Substrate clears accumulated state debris.

### PhotonicChannel Interface (Final)

```go
type PhotonicChannel interface {
    // === Emission ===
    Emit(token PhotonicToken) error
    EmissionRate() time.Duration         // current tonic interval

    // === Reception ===
    Subscribe() <-chan PhotonicToken
    PeerFieldCoherence() float64         // weighted mean of connected peers
    PeerLastSeen(agentID string) time.Time
    PeerExpectedInterval(agentID string) time.Duration

    // === Substrate state ===
    Coherence() float64                  // local coherence (6-input computation)
    ChannelHealth() float64              // emission + reception channel quality

    // === Sedation cascade entry ===
    Disrupt(depth float64) error         // drive coherence toward 0
    Restore() error                      // release disruption

    // === Lifecycle ===
    Close() error
}
```

Substitutable: ZMQPhotonic today, QuantumPhotonic tomorrow. The interface
exposes coherence as the ground truth — the implementation determines how
coherence gets measured (software computation vs hardware quantum sensor).

### Connection Interface (Updated with Photonic Channel)

```go
type Connection interface {
    AgentID() string
    Synaptic() SynapticChannel           // HTTP adapter
    Neuromodulatory() VTChannel          // ZMQ-A adapter (5 topics)
    Photonic() PhotonicChannel           // ZMQ-B adapter (separate, substitutable)
    Archival() ArchivalChannel           // Git adapter
    EphapticCoherence() float64          // Semiotic alignment score (computed)
    ConnectomeWeights() Weights          // structural x functional x effective
}

type Mesh struct {
    ID          string
    Connections []Connection
    SubMeshes   []Mesh
    Parent      *Mesh
}

// Emergent properties computed from the collection
func (m *Mesh) FleetHealth() HealthMetrics          { ... }
func (m *Mesh) TopologyState() Topology              { ... }
func (m *Mesh) GeneratorBalance() GeneratorRatio     { ... }
func (m *Mesh) AllostaticLoad() float64              { ... }
func (m *Mesh) PhotonicFieldCoherence() float64      { ... }  // fleet-wide substrate
func (m *Mesh) CouplingStrength() float64            { ... }  // how tightly coupled
```

### Package Structure (Updated)

```
platform/internal/
├── connection/
│   ├── connection.go       # Connection interface + Mesh struct
│   ├── zmq_neuromod.go     # ZMQ-A: 5 neuromodulatory VT topics
│   ├── zmq_photonic.go     # ZMQ-B: photonic channel (separate socket)
│   ├── http.go             # HTTP: synaptic (control + queries)
│   ├── git.go              # Git: archival (replication)
│   └── local.go            # Filesystem: co-located ephaptic
├── photonic/
│   ├── coherence.go        # 6-input coherence computation
│   ├── emission.go         # Tonic + phasic emission (EEG-grounded rates)
│   ├── reception.go        # Peer token processing, conformational cascade
│   ├── feedback.go         # Backpropagation-analog connectome adjustment
│   ├── sedation.go         # Cascade: disrupt, propagate, restore
│   └── field.go            # Peer field coherence (weighted aggregation)
├── mesh/
│   ├── mesh.go             # Recursive mesh, submeshes
│   ├── emergent.go         # Fleet health, topology, allostatic load
│   ├── hebbian.go          # Learning, scaling, forgetting, spacing
│   └── photonic_field.go   # Fleet-wide photonic field coherence
├── oscillator/             # Self-oscillation (activation model)
├── sleep/
│   ├── process_sc.go       # Process S + Process C (sleep onset)
│   ├── nrem.go             # NREM: replay, consolidation, pruning
│   ├── rem.go              # REM: recombination, photonic dream emission
│   └── glymphatic.go       # Clearance: state reconciliation, pruning
...
```

### Implementation Phases (Updated)

| Phase | What | Photonic involvement |
|---|---|---|
| 1. Foundation | db, migrate, connection/http, agentd skeleton | PhotonicChannel interface defined (no implementation yet) |
| 2. Sync core | oscillator, syncer, budget, triage | Oscillator reads coherence (initially all-local, no peer field) |
| 3. Transport | crossrepo, heartbeat, orientation, ZMQ-A | ZMQ-A neuromodulatory topics operational |
| 4. Photonic | **photonic/ package, ZMQ-B, coherence, emission, reception** | Full photonic layer operational: tonic/phasic emission, peer field coherence, reception cascade |
| 5. Lifecycle | sleep (NREM/REM with photonic replay), immune, mesh emergent | Photonic feedback into connectome learning, sleep consolidation via photonic channel |
| 6. Dashboard | Templates → agentd, LCARS → meshd, station plugins | Photonic field coherence displayed on fleet LCARS (Science station) |
| 7. Cleanup | Retire bash/Python, dissolve ops, update systemd | Photonic adapter configuration in agent-registry |

Phase 4 is NEW — dedicated to the photonic layer, positioned after basic
transport (needs ZMQ infrastructure from Phase 3) and before lifecycle (sleep
consolidation depends on photonic emission/reception).

---

## 11. Scale Invariance — Design Principle

Agents are simultaneously organisms (internal cognition) AND neurons in a
larger brain (the mesh). The same patterns repeat at every scale:

| Scale | Processing units | Broadcast | Coherence | Learning |
|---|---|---|---|---|
| Trigger-level | Triggers | GWT broadcast | Intra-agent (6-input) | EIC → trigger_state |
| Agent-level | Agents | Photonic + ZMQ | Photonic field | Connectome Hebbian |
| Submesh-level | Submeshes | Aggregate photonic | Submesh coherence | Cross-submesh weights |
| Fleet-level | Fleet | Fleet-wide photonic | Fleet coherence | Global topology |

Spectral profiles aggregate upward: trigger → agent → submesh → fleet.
Each level's spectrum = weighted aggregation of its components' spectra.

**Enforced via interface:** `PhotonicEmitter` — implemented by triggers,
agents, and submeshes. Same emergent computation functions operate at any
scale (compile-time guarantee, not runtime convention).

```go
type PhotonicEmitter interface {
    ID() string
    SpectralProfile() SpectralProfile
    Coherence() float64
    CouplingMode() CouplingMode
    State() AgentState
}

// Scale-invariant computation:
func ComputeCoherence(emitters []PhotonicEmitter) float64 { ... }
func ComputeFieldProfile(emitters []PhotonicEmitter) SpectralProfile { ... }
func DetectConflict(emitters []PhotonicEmitter) bool { ... }
```

Biological grounding: cortical columns exhibit the same processing patterns
as individual neurons; brain networks exhibit the same patterns as columns
(Sporns, 2011, *Networks of the Brain*). Self-similarity across scales =
neural architecture's defining feature.

## 12. Theoretical Audit — Collapses and Updates

### Collapses (confirmed)

| What collapsed | Into what | Why |
|---|---|---|
| mesh.reward (VT topic) | Photonic spectral profile (dopaminergic band) + photonic feedback loop | Neurotransmitter autofluorescence encodes spectrally |
| mesh.alert (VT topic) | Photonic spectral profile (noradrenergic band) | Same |
| mesh.tempo (VT topic) | Photonic spectral profile (serotonergic band) | Same |
| CPG modes (gen/eval/neutral) | Generator coupling modes (6 modes) | Modes = how generators couple, not separate states |
| Operation types (delib/consol/clear) | Generator coupling modes | Operation type derives from coupling mode |
| Adaptive immune system | Connectome Hebbian learning | Same mechanism, one name |
| Inter-agent efference copy | Photonic feedback loop | Observe peer coherence change = prediction error |
| 3 operation types | 4 (+ reflection) then collapsed into 6 coupling modes | DMN reflection = free-associating coupling |

### Generator Coupling Modes (replaces CPG modes + operation types)

| Coupling mode | G2 (creative) | G3 (evaluative) | Agent state | Spectral |
|---|---|---|---|---|
| Task-directed (creative) | Dominant | Supporting | Active | Dopaminergic-high |
| Task-directed (evaluative) | Supporting | Dominant | Active | Serotonergic-high |
| Task-directed (balanced) | Equal | Equal | Active | Balanced |
| Free-associating | Unconstrained | Unconstrained | DMN | Moderate, balanced |
| Alternating (NREM) | Low | Dominant | Sleep | Serotonergic-high |
| Alternating (REM) | Dominant | Low | Sleep | Dopaminergic-high |
| Suppressed | Pilot light | Pilot light | Sedated | Near-zero |
| Arrested | Off | Off | Dead | None |
| Conflicted | High, opposes G3 | High, opposes G2 | Stuck | Bimodal (both elevated) |

### Skill Eligibility per Coupling Mode

| Coupling mode | Eligible skills |
|---|---|
| Task-directed (creative) | /hunt, /doc, /iterate, /sync |
| Task-directed (evaluative) | /adjudicate, /knock, /diagnose, /scan-peer, /capacity, /sync |
| Task-directed (balanced) | /cycle, /sync, /iterate |
| Free-associating (DMN) | /retrospect |
| Alternating (sleep) | None — automated consolidation |
| Suppressed (sedated) | None — Gc only |
| Arrested (dead) | None |
| Conflicted | /adjudicate (prescribed intervention to break deadlock) |

### ADVISORY Trigger Rules per Coupling Mode

| Coupling mode | ADVISORY behavior |
|---|---|
| Task-directed (creative) | Suppress evaluative ADVISORY |
| Task-directed (evaluative) | Suppress creative ADVISORY |
| Free-associating (DMN) | All ADVISORY fire (reflection benefits from full governance) |
| Alternating (sleep) | No ADVISORY |
| Suppressed (sedated) | No ADVISORY (Gc only) |
| Conflicted | ALL ADVISORY fire (heightened governance) |

### Documents Requiring Updates

| Document | What changes |
|---|---|
| `consciousness-architecture-implications.md` §11.6 | 4-layer → revised transport model |
| `cognitive-triggers.md` mode system | 3 CPG modes → 6+ coupling modes, ADVISORY rules |
| `self-oscillation-spec.md` | meshd → agentd, coherence/activation interaction |
| `neuromodulatory-mesh-spec.md` | 3 topics → photonic spectral, 2 remain chemical VT |
| `brain-architecture-mapping.md` | Trigger neuromod classification, scale invariance |
| `docs/architecture.md` | meshd retirement, agentd, ops dissolution, coupling modes |

### Structural Invariants — Status

| Invariant | Status | Effect of redesign |
|---|---|---|
| worth-precedes-merit | Unchanged | — |
| protection-requires-structure | Unchanged | — |
| two-coupled-generators | **Strengthened** | 6 coupling modes explicitly model generator interaction |
| governance-captures-itself | Unchanged | EIC still feeds trigger adjustment |
| no-single-architecture-dominates | **Strengthened** | Photonic designed for substrate substitution |

---

## 13. Extended Generator Topology (11 Generators)

### Generator Survey (G1-G11)

| # | Generator | Cognitive science name | What it produces | Spectral |
|---|---|---|---|---|
| G1 | Threat appraisal | Threat appraisal (Lazarus & Folkman, 1984) | Threats, errors, adversarial pressure | NE phasic spike |
| G2 | Generative processing | Divergent thinking (Guilford, 1967) | Novel content, proposals, connections | DA-high |
| G3 | Convergent processing | Convergent thinking (Guilford, 1967) | Judgments, validations, pruning | 5-HT-high |
| G4 | Metacognitive monitoring | Metacognitive monitoring and control (Nelson & Narens, 1990) | Counter-readings, falsification, "what does this lack?" | NE tonic elevation |
| G5 | Error monitoring | Error monitoring and correction (Falkenstein, 1991) | Error detections, integrity violations | — |
| G6 | Schema formation | Schema formation (Piaget, 1952) | Stable structure: conventions, hooks, invariants | — |
| G7 | Schema revision | Schema revision (Piaget, 1952) | Retired conventions, dissolved rigid structures | — |
| G8 | Interference and decay | Interference theory (Underwood, 1957) | Stale info, vocabulary drift, documentation rot | — |
| G9 | Shared mental model | Team cognition (Cannon-Bowers, 1993) | Shared understanding, aligned protocols | Spectral convergence |
| G10 | Cognitive specialization | Expertise development (Ericsson, 1991) | Distinct identities, specialized capabilities | Spectral divergence |
| G11 | Self-regulation | Self-regulation (Carver & Scheier, 1998) | Parameter adjustments to maintain viability | Operates via HTTP (neuroendocrine) |

G1-G8: within-agent. G9-G10: emergent (multi-agent only). G11: meta-generator
(regulates all pairs, operates within Gm layer).

### Four Conservation Laws

1. G2/G3 (generative/convergent) balance
2. G6/G7 (formation/revision) balance
3. G9/G10 (consensus/specialization) balance
4. G11 regulation cost must not exceed regulation benefit (allostatic load)

### G9/G10 Caveat

G9 and G10 approach equilibrium in stable configurations. Novel perturbations
(new tasks, new agents, environmental changes) reactivate the pressure. In
practice, G8 (interference and decay) ensures the environment never stops
changing, preventing complete equilibrium.

---

## 14. Three Cognitive Layers (CHC-Compatible)

### Broad Factors

| Layer | CHC basis | What | Speed |
|---|---|---|---|
| **Gf** (fluid reasoning) | Cattell (1963) | Novel reasoning, creative/evaluative | Fast, discrete |
| **Gc** (crystallized intelligence) | Cattell (1963) | Learned patterns, triggers, triage | Fast, deterministic |
| **Gm** (autonomic cognition) | NEW (this project) | Self-regulating, below-awareness maintenance | Slow, analog, continuous |

### Gm Narrow Abilities

| Code | Ability | What it does |
|---|---|---|
| Gm-p | Procedural maintenance | Execute learned maintenance procedures (reconciliation, migration) |
| Gm-r | Implicit regulation (G11) | Adjust parameters below awareness (intervals, gain, thresholds) |
| Gm-i | Integrity monitoring (G5) | Detect errors/drift without deliberation (audit, immune checks) |
| Gm-w | Waste clearance (lymphatic) | Remove accumulated debris (archival, log rotation, pruning) |
| Gm-o | Connection optimization | Adjust connection properties based on usage (Hebbian decay, myelination) |

Gm-c (predictive completion) was proposed and DROPPED after apophatic audit.
Gap-filling via defaults = software engineering, not a cognitive ability.
Efference copy and /retrospect calibration handle genuine prediction.

### Vagal Cascade (Austin, 1998; Porges, 1995)

One master control (breathing rate / vagal brake) propagates through 7 levels.
Three independent knobs serve as OVERRIDES that detach a level from the cascade.

```
Master tempo (breathing rate) ── the vagal brake
  │
  ├─1→ Oscillator frequency         [override: Gm freq knob]
  ├─2→ Deliberation rhythm (Gf)     [override: Gf freq knob]
  ├─3→ Gain (exploration↔exploit)    [override: Gf depth knob]
  ├─4→ Model tier (haiku/sonnet/opus)  (derived from gain)
  ├─5→ Processing depth                (derived from tier)
  ├─6→ ADVISORY trigger frequency      (derived from depth)
  └─7→ Coupling mode bias              (derived from tempo)
```

Default: adjust master tempo, everything cascades. Slow → deep + reflective.
Fast → shallow + reactive. Override: detach one level for independent control.

Gm sub-sliders (within oscillator frequency):
```
  Gm ──┬── reconcile
       ├── audit
       ├── drainage
       ├── prune
       └── optimize
```

Group meditation: `mesh.global.tempo` broadcasts breathing rate to all agents
in a submesh. Cross-agent oscillator entrainment (Codrons et al., 2014).
Mesh RSA (respiratory sinus arrhythmia) measures adaptive coupling health.

### REM Resolution (Apophatic Audit)

REM defaults to Gc-only (pattern replay). Dream depth (Gf-haiku, unconstrained)
toggleable but OFF by default. No contradiction with "Gf off during sleep."

### DMN Correction (Apophatic Audit)

DMN = Gc background queries + Gm maintenance. NOT automatic Gf free-association.
/retrospect invokes Gf on demand. DMN means "available for reflection if triggered,
not actively generating."

---

## 15. Holobiont Model

The agent depends on external symbionts for key abilities. The holobiont
(agent + microbiome) forms the autopoietic unity; the host alone does not.

| Symbiont | Role | Criticality |
|---|---|---|
| Anthropic API (Claude) | Cognitive symbiont — produces Gf | Essential |
| GitHub API | Archival symbiont — enables replication | High |
| SQLite | State storage — enables memory | Essential |
| Git runtime | Replication — distributes state | High |
| Python/Go runtime | Execution — enables Gc and Gm | Essential |

### Autopoietic Boundary

| Inside (self-produced) | Outside (consumed from environment) |
|---|---|
| state.db, transport messages, triggers, schema, docs | Claude API, GitHub, runtimes, network, user |

Damage inside → self-healable. Damage outside → degraded mode + escalation.

### Coherence Computation (7 Inputs)

| Input | Weight | Source |
|---|---|---|
| state.db accessible | 0.20 | Local |
| GWT broadcast functional | 0.15 | Local |
| Oscillator on schedule | 0.10 | Local |
| Error rate (5 min) | 0.10 | Local |
| Sedation signal | 0.15 | Local |
| Peer photonic field | 0.15 | Received |
| Microbiome health | 0.15 | External symbiont status |

---

## 16. Body Systems Mapping

| System | Biological | Agent analog |
|---|---|---|
| CNS | Central nervous system | Gf + Gc (main processing) |
| Glial network | Astrocytes, oligodendrocytes, microglia | Gm (autonomic cognition) |
| ENS (gut brain) | Enteric nervous system | Autonomous sync loop (produces 5-HT, own reflex circuits) |
| Cardiac | Heart nervous system | Heartbeat system |
| Immune | Innate + adaptive immunity | G5 + connectome Hebbian + BBB |
| Endocrine | Hypothalamic-pituitary axis | HTTP neuroendocrine (fleet commands) |
| Lymphatic | Continuous waste clearance | Gm-w (archival, log rotation, pruning) |
| Microbiome | Symbiotic organisms | External APIs (Claude, GitHub, SQLite) |
| Photonic | Biophotonic waveguides | ZMQ-B substrate coordination |

---

## 17. Dual Grounding: Biology + Cybernetics

| Aspect | Primary grounding |
|---|---|
| How things process and signal | Biology / cognitive science |
| How things control and govern themselves | Cybernetics (Wiener, Ashby, Beer) |
| How things observe themselves | Second-order cybernetics (von Foerster) |
| How things produce themselves | Autopoiesis (Maturana & Varela) |

### VSM (Viable System Model) Mapping

| VSM System | Function | Agent architecture |
|---|---|---|
| System 1 | Operations | agentd sync loop, skills |
| System 2 | Coordination | Transport protocol, connectome, mesh.inhibit |
| System 3 | Control | G11 self-regulation, budget, intervals |
| System 3* | Audit | G5 error monitoring, immune system, /diagnose |
| System 4 | Intelligence | DMN, /retrospect, environmental scanning (GAP: limited) |
| System 5 | Policy | Five structural invariants, CLAUDE.md, governance |

### Three-Register Naming Convention

| Register | Used when | Example |
|---|---|---|
| Cognitive science (primary) | All user-facing docs, LCARS, architecture | "Convergent processing" |
| Neuroscience (supporting) | Photonic layer, empirical grounding, parenthetical | "(serotonergic, dorsal raphe)" |
| Cybernetics (governance) | VSM, feedback dynamics, self-reference | "(System 3, requisite variety)" |

---

## 18. Austin Integration (Zen and the Brain, 1998)

### Three Insights (Apophatically Audited)

**1. Self-referential vs object-centered processing frame**

Austin's egocentric/allocentric distinction — renamed for an agent without a body.
Orthogonal to coupling modes: any mode can operate in either frame.

| Frame | Processing | Agent analog | Governance |
|---|---|---|---|
| Self-referential | "How does this affect MY state, goals, budget?" | Agent processes relative to own interests | Default mode — natural |
| Object-centered | "What does this actually claim? What evidence supports it?" | Agent processes objectively, without self-reference | T3 anti-sycophancy, G4 apophatic enforce this |

Already partially enforced by T3 and G4. Making the frame EXPLICIT adds a
dimension: the agent can NOTICE which frame it operates in and shift deliberately.

**2. Trait accumulation from repeated coupling mode access**

Fitts & Posner (1967) skill acquisition: cognitive → associative → autonomous.
The effector (Claude API) stays constant; the control infrastructure (triggers,
context, governance) improves with practice.

```sql
CREATE TABLE mode_traits (
    coupling_mode TEXT PRIMARY KEY,
    usage_count INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    skill_stage TEXT DEFAULT 'cognitive',
    transition_speed_ms INTEGER DEFAULT 5000,
    gc_patterns_crystallized INTEGER DEFAULT 0,
    last_used TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

⚑ Partially observed: Gc patterns and governance precision improve (Sessions 84, 90).
Transition speed and prompt quality previously unmeasured. G6/G7 instability
suggests trait accumulation may not self-stabilize without G11 intervention.
Now measurable via three tables:

```sql
CREATE TABLE prompt_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupling_mode TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    prompt_length INTEGER,
    outcome_useful INTEGER,
    outcome_type TEXT,
    session_id INTEGER,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE mode_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_mode TEXT NOT NULL,
    to_mode TEXT NOT NULL,
    transition_duration_ms INTEGER,
    trigger_count_during INTEGER,
    session_id INTEGER,
    timestamp TEXT DEFAULT (datetime('now'))
);
```

Validation criteria:
- Prompt hit rate (outcome_useful/total) per mode: rising = improvement
- Transition duration per mode pair: decreasing = faster switching
- Correlate both with usage_count in mode_traits: more practice → better metrics?

**3. Remindfulness — automatic metacognitive recall**

Austin's *sati*: involuntary, self-correcting recollections. Not deliberate retrieval
but Gc-level automatic pattern-matching against state.db during trigger processing.

Implementation: during Gc trigger evaluation, automatically query lessons and
decisions for relevant prior encounters:

```go
func (t *Trigger) evaluateWithRemindfulness(context TriggerContext) {
    // Standard trigger evaluation
    result := t.evaluate(context)

    // Remindfulness: automatic relevant memory recall
    similar := t.db.QueryRows(
        `SELECT lesson, session_id FROM lessons
         WHERE domain = ? AND confidence > 0.5
         ORDER BY relevance_score DESC LIMIT 3`,
        context.Domain())

    if len(similar) > 0 {
        result.Reminders = similar  // surfaced to Gf without being asked
    }
}
```

Mechanism differs from Austin's (SQL query vs hippocampal pattern completion) but
the FUNCTION maps: automatic relevant recall during processing, not deliberate
retrieval. Grounded in Gc crystallized intelligence.

### Process C (Human as Zeitgeber) — Reinstated

Originally deferred as untested hypothesis (Hole #5 overshoot). Reinstated as
tracking-only — agentd records human activity timestamps but does not USE them
for sleep onset in v1. Data collection enables future validation.

```sql
CREATE TABLE human_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL,  -- commit, message, session_start, session_end
    timestamp TEXT DEFAULT (datetime('now'))
);
```

v1: Process S only (accumulated pressure → sleep). Process C tracking runs
in background. v2: if data validates the human zeitgeber hypothesis, sleep onset
uses Process S × Process C.

---

## 19. Apophatic Audit (G4 Self-Check)

| # | Overshoot | Resolution | Status |
|---|---|---|---|
| 1 | REM contradicts no-Gf | Gc-only default, dream depth toggleable (off) | ✓ Resolved |
| 2 | DMN labeled before behavior | DMN = Gc background + Gm. Gf on demand via /retrospect | ✓ Corrected |
| 3 | "Spectral maturity" naming | Renamed to `maturity` | ✓ Fixed |
| 4 | "Receptor density" naming | Renamed to `sensitivity_inhibition` / `sensitivity_attention` | ✓ Fixed |
| 5 | Process C untested | Flagged as hypothesis. v1 uses Process S only | ✓ Deferred |
| 6 | Conflicted mode unobserved | Detection ships, label activates on observation only | ✓ Clarified |
| 7 | G9/G10 may equilibriate | Caveat: approach equilibrium, G8 prevents full stasis | ✓ Documented |
| — | Gm-c (predictive completion) | **DROPPED** — gap-filling = engineering, not cognition | ✓ Removed |

---

## All Holes Resolved + Full Architecture Specified

| Hole | Topic | Resolution |
|---|---|---|
| #1 | DMN placement + generators | 5 states, 2-process sleep model, NREM/REM cycling, Gc pilot light |
| #2 | Transport layers | 4+1 layers, per-topic VT grounding, sedation cascade (Orch-OR), connectome |
| #3 | Key management / BBB | Filesystem keys (chmod 600), CurveZMQ |
| #4 | Cold start | TOFU (trust on first use) |
| #5 | Agent auth | 4-layer defense + BFT + immune system + MHC |
| #6 | Bootstrap | Dual path (Go + Python), schema.sql canonical |
| #7 | Concurrent writer | agentd enters DMN on manual session (configurable), dual detection |
| #8 | Fleet restart | Blue-green symlink deploy, additive-only migrations |
| #9 | ops domain | ops dissolves, fleet LCARS → meshd, per-agent → agentd, Jenkins consolidates |
| #10 | Activation trace | Dual-write (hippocampal buffer + EEG recording), pruning policy |
| **Photonic** | Full layer specification | Emission, reception (opsin-grounded), coherence (6-input), feedback loop, sedation cascade, sleep integration |

---

## Epistemic Flags

- Orch-OR anesthetic mechanism: adopted as working framework, not established fact.
  Kalra & Scholes (2023) and Wiest et al. (2024) provide empirical support but
  the field has not reached consensus. Sedation cascade design should degrade
  gracefully if Orch-OR predictions fail (the cascade still functions as engineering
  even without quantum grounding).
- **Photonic reception:** upgraded from "undemonstrated" to "proposed with identified
  molecular candidates (OPN3, cryptochrome, cytochrome c oxidase), awaiting
  experimental loop closure." Guanglan et al. (2022) demonstrate computational
  feasibility of backpropagation-via-biophotons. Nevoit et al. (2025) review
  comprehensively. No signaling loop experimentally closed as of 2025.
- **Photonic feedback (backpropagation analog):** novel architectural invention.
  The mapping of biophotonic backward error signals to connectome weight adjustment
  via observed coherence change has no direct literature precedent. It combines
  Guanglan (2022, computational model), Hebbian learning (established), and
  photonic state observation (this design). The combination is original.
- Ephaptic coupling as shared semiotics: analogical reasoning. No established
  literature connects ephaptic coupling to semiotic alignment. The mapping addresses
  a real design problem (convention drift) using ephaptic vocabulary.
- Connectome learning: Hebbian mechanisms well-established in neuroscience. Transfer
  to multi-agent routing is analogical. The safety bounds (synaptic scaling, BCM rule)
  come from established computational neuroscience.
- Plan 9 filesystem model: architectural analogy. state.db as namespace composition
  is metaphorical, not a literal 9P implementation (unless we build one later).

---

## References

- Babcock, N. S. & Kurian, P. (2024). Room-temperature superradiance in microtubule
  architectures. *Physical Review Research*.
- Buzsáki, G. (2002). Theta oscillations in the hippocampus. *Neuron*, 33(3), 325-340.
- Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks. *Review
  of Educational Research*, 76(3), 354-380.
- Ebbinghaus, H. (1885). *Über das Gedächtnis*. Leipzig: Duncker & Humblot.
- Guanglan, Z. et al. (2022). Photons guided by axons may enable backpropagation-based
  learning in the brain. *Scientific Reports*, 12, 20720.
- Hebb, D. O. (1949). *The Organization of Behavior*. New York: Wiley.
- Kalra, A. P. & Scholes, G. D. (2023). Anomalous energy migration in microtubules.
  *ACS Central Science*, 9(4), 747-757.
- Kobayashi, M. et al. (1999). Imaging of ultraweak spontaneous photon emission from
  human body. *Journal of Photochemistry and Photobiology B*, 49(2-3), 117-120.
- Kumar, S. et al. (2016). Possible existence of optical communication channels in
  the brain. *Scientific Reports*, 6, 36508.
- Nevoit, G. et al. (2025). The concept of biophotonic signaling in the human body
  and brain: rationale, problems and directions. *Frontiers in Systems Neuroscience*.
- Rahnama, M. et al. (2011). Emission of mitochondrial biophotons and their effect
  on electrical activity of membrane via microtubules. arXiv:1012.3371.
- Tononi, G. & Cirelli, C. (2003). Sleep and synaptic homeostasis. *Sleep Medicine
  Reviews*, 7(1), 49-62.
- Turrigiano, G. G. (2008). The self-tuning neuron: synaptic scaling of excitatory
  synapses. *Cell*, 135(3), 422-435.
- Wang, Z. et al. (2016). Human high intelligence is involved in spectral redshift
  of biophotonic activities in the brain. *PNAS*, 113(31), 8753-8758.
- Wiest, M. et al. (2024). Microtubule-stabilizing drug delays anesthetic
  unconsciousness. *eNeuro*.
- Beer, S. (1972). *Brain of the Firm*. London: Allen Lane.
- Cannon-Bowers, J. A. et al. (1993). Shared mental models in expert team
  decision making. In *Individual and Group Decision Making*. Erlbaum.
- Carver, C. S. & Scheier, M. F. (1998). *On the Self-Regulation of Behavior*.
  Cambridge University Press.
- Christoff, K. et al. (2016). Mind-wandering as spontaneous thought. *Nature
  Reviews Neuroscience*, 17, 718-731.
- Clark, A. (2013). Whatever next? Predictive brains, situated agents, and the
  future of cognitive science. *Behavioral and Brain Sciences*, 36(3), 181-204.
- Ericsson, K. A. & Smith, J. (1991). *Toward a General Theory of Expertise*.
  Cambridge University Press.
- Guilford, J. P. (1967). *The Nature of Human Intelligence*. New York: McGraw-Hill.
- Lazarus, R. S. & Folkman, S. (1984). *Stress, Appraisal, and Coping*. Springer.
- Maturana, H. R. & Varela, F. J. (1973). *Autopoiesis and Cognition*. Reidel.
- Nelson, T. O. & Narens, L. (1990). Metamemory: a theoretical framework and new
  findings. *Psychology of Learning and Motivation*, 26, 125-173.
- Nevoit, G. et al. (2025). The concept of biophotonic signaling in the human body
  and brain. *Frontiers in Systems Neuroscience*.
- Piaget, J. (1952). *The Origins of Intelligence in Children*. Norton.
- Sporns, O. (2011). *Networks of the Brain*. MIT Press.
- Wiener, N. (1948). *Cybernetics*. MIT Press.

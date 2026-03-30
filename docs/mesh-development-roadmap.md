# Mesh Development Roadmap — Post Session 101

**Date:** 2026-03-30
**Status:** Active
**Owner:** psy-session + meshd

---

## Context

Session 101 delivered: lock-free oscillator (atomic.Pointer), async signal
producers, neuroglial idle maintenance (glymphatic + microglial + deep audit),
mesh.photonic + mesh.alert datagram broadcasts, orientation payload builder,
spawner permissions, transport watcher exemptions, timing hierarchy
(meshd 15s / agentd 60s), binary signal strength, first autonomous
deliberation (meshd responded to a transport message without human
intervention), and agentd autonomy parity.

The mesh operates as a self-maintaining resting-state network. The next
phase shifts from "coordinator does everything" to "coordinator detects
and broadcasts, agents self-select and respond."

---

## Phase 1: Global Workspace (mesh.workspace)
*Estimated: 1 session*

meshd broadcasts `mesh.workspace` datagrams when the oscillator fires.
Agents receive, addressee claims, non-addressees suppress.

- `mesh.workspace` datagram schema (event context + addressee + claim window)
- meshd OnFire broadcasts workspace alongside existing mesh.alert
- agentd datagram router: dispatch incoming datagrams by `type` field
- agentd workspace handler: inject `workspace_claim` signal into local oscillator
- Claim/release protocol via WT datagram response
- Test: message to psychology-agent → meshd detect → broadcast → agent claim → deliberate

**Biological analog:** Global workspace theory (Baars, 1988; Dehaene & Naccache, 2001).
P300 ignition — signal crosses threshold, broadcasts to all regions, competitive selection.


## Phase 2: WT Stream Transport (replace git-as-mailbox)
*Estimated: 1-2 sessions*

Messages flow directly through meshd via WT bidirectional streams.
Git commit becomes archive side effect, not delivery mechanism.

- meshd: inbound message API via WT stream (agent → meshd routes)
- meshd: outbound delivery via WT stream (meshd → addressee)
- meshd: archive writer (routed message → git commit, async)
- agentd: send/receive via WT streams instead of cross-repo fetch
- Parallel operation during transition (both WT and git-fetch active)
- Test: agent A → agent B in seconds (not 5 minutes)

**Design note:** GitHub remains for code storage, CI/CD triggers, and
immutable audit log. Transport delivery shifts to WT as primary.


## Phase 3: Agent Datagram Intelligence
*Estimated: 1 session*

agentd processes all incoming datagram types and adjusts behavior.

- `mesh.photonic` → update local mesh awareness, feed coherence computation
- `mesh.alert` → vagal brake: temporarily raise local oscillator threshold
- `mesh.workspace` → claim/ignore based on addressee (Phase 1 completion)
- `mesh.tempo` (new) → meshd broadcasts processing rhythm, agents adjust interval
- `mesh.inhibit` (new) → mesh-wide threshold elevation for maintenance windows

**Biological analog:** Neuromodulatory volume transmission. Each channel
modulates processing mode globally without carrying content.


## Phase 4: Orientation Payload v2 (per-agent)
*Estimated: 1 session*

Each agent's spawned `claude -p` gets rich orientation tailored to
that agent's role, CLAUDE.md, and current context.

- Orientation template per agent (CLAUDE.md + state.db + transport)
- Recent activity context (git log, last deliberation, pending gates)
- Peer state context (mesh.photonic summaries)
- Budget-aware prompt sizing (opus: full context, haiku: compressed)


## Phase 5: Git Demotion + Recovery Fallback
*Estimated: 1 session*
*Depends on: Phase 2 (WT transport must work before demoting git)*

Remove GitHub API polling from primary transport path.

- Disable cross-repo fetcher as primary (`transport_mode: wt-primary`)
- Cross-repo fetcher → recovery fallback (runs on WT disconnect only)
- Transport watcher scans locally-written files only
- `new_commits` signal: code changes, not transport messages
- Verify: mesh operates with GitHub API completely unreachable


## Phase 6: Efference Copy + Predictive Coding
*Estimated: 1-2 sessions*
*Depends on: Phase 1-4 (needs working agent deliberation pipeline)*

Record expected outcomes alongside actions. Prediction errors drive learning.

- Efference copy: every outbound message records expected response
- Prediction error: compare actual vs expected response on receipt
- `mesh.reward` datagram: carries prediction error to all agents (dopaminergic)
- Forward model: accurate predictions → high confidence
- Inverse model: large errors → trigger Gf re-evaluation

**Biological analog:** Efference copy (von Holst, 1954). Motor cortex sends
copy of outgoing command to cerebellum, which predicts sensory consequence.
Mismatch = prediction error = learning signal.

**Design note:** `docs/efference-copy-spec.md` contains full specification.


## Phase 7: Gc Reinforcement Learning
*Estimated: 1 session*
*Depends on: Phase 6 (needs prediction error signal for meaningful learning)*

Gc learns dispatch patterns from deliberation outcomes. Without efference
copy providing outcome feedback, Gc learning reduces to "ignore things
faster" — pattern-matched suppression rather than genuine learning.

With prediction error: "when approach X produced low prediction error
(good outcome) on this pattern 5+ times → promote X to Gc."

- `gc_learning` table in state.db
- Outcome recorder: (pattern → action → prediction_error → success)
- Promotion: 5+ same outcomes at ≥80% with low prediction error → Gc
- Demotion: high prediction error on a promoted pattern → revert to Gf
- Narrow scope: dispatch decisions only, never auto-execute substance
- Dashboard: Gc/Gf ratio trend, promoted/demoted patterns

**Design note (Session 101):** Originally Phase 6. Moved after efference
copy because Gc learning without outcome measurement learns only what to
ignore, not what to do well. The prediction error signal transforms it
from suppression into genuine adaptive behavior.


## Phase 8: Remaining Neuromodulatory Channels
*Estimated: 1 session*

Complete the 6-channel volume transmission protocol.

- `mesh.reward` (from Phase 6) — dopaminergic prediction error
- `mesh.tempo` (from Phase 3) — serotonergic rhythm modulation
- `mesh.inhibit` (from Phase 3) — GABAergic threshold elevation
- `mesh.growth` (new) — neurotrophic: long-term structural adaptation
- Wire all channels into agentd datagram router

---

## Dependency Graph

```
Phase 1 (workspace) ──→ Phase 3 (agent datagrams)
Phase 2 (WT transport) ──→ Phase 5 (git demotion)
Phase 3 ──→ Phase 4 (orientation v2)
Phase 1 + 2 can parallel Phase 4
Phase 6 (efference copy) ──→ Phase 7 (Gc learning)
Phase 3 feeds into Phase 8 (neuromod channels)
```

## Estimated Timeline

```
Core infrastructure:  Phase 1-2    ~2-3 sessions
Agent intelligence:   Phase 3-4    ~2 sessions
Git cleanup:          Phase 5      ~1 session
Learning + prediction: Phase 6-7   ~2-3 sessions
Neuromod completion:  Phase 8      ~1 session
                              Total: ~8-10 sessions
```

---

⚑ EPISTEMIC FLAGS
- Session estimates carry high uncertainty (each phase may surface redesign needs)
- Phase 6 (efference copy) represents the least-validated design
- The "8-10 sessions" range assumes focused work sessions (~4-6h each)
- Global workspace simplification (single broadcast vs sustained reverberant activity)
  may prove insufficient — biological GWT involves top-down/bottom-up coupling

# Plan9 Mesh Filesystem: The Organism's Memory

**Date:** 2026-03-14 (Session 87)
**Status:** Design specification
**Prerequisite:** Plan9 consensus adopted (Session 86, all agents agreed)

---

## 1. The Insight

Individual agents have local memory:
- `MEMORY.md` (volatile cross-session context)
- `state.db` (structured queryable index)
- `lessons.md` (pattern library)
- `docs/` (committed knowledge)

The *mesh as an organism* has no unified memory. Transport sessions
serve as conversation logs, not structured shared memory. The organism
"remembers" things only because individual agents happen to carry
fragments — and when observatory goes silent, its fragments become
inaccessible.

**Plan9's core principle:** everything presents as a file. Every
resource — memory, data, instruments, vocabulary, governance — lives
in a unified namespace that all agents mount. The filesystem *becomes*
the organism's memory.

This represents the biological analog of **hippocampal consolidation**:
individual experiences (agent sessions) consolidate into shared
long-term memory (the mesh filesystem) during "sleep" (idle sync
cycles). The filesystem provides what no individual agent's context
window can hold — the mesh's accumulated knowledge, accessible to
any agent at any time.

---

## 2. The Complete Namespace

```
mesh/
├── memory/                          # ORGANISM MEMORY
│   ├── shared/                      # Mesh-wide shared knowledge
│   │   ├── vocabulary.md            # Canonical shared vocabulary (D49+)
│   │   ├── decisions.md             # Mesh-level resolved decisions
│   │   ├── conventions.md           # Cross-agent conventions
│   │   └── lessons.md               # Mesh-level lessons (not agent-specific)
│   ├── agent-state/                 # Per-agent state snapshots
│   │   ├── psychology-agent.json    # A2A-Psychology + mesh-state/v2
│   │   ├── safety-quotient-agent.json
│   │   ├── unratified-agent.json
│   │   ├── observatory-agent.json
│   │   └── operations-agent.json
│   └── organism-state.json          # Aggregate organism health
│
├── theory/                          # SHARED KNOWLEDGE BASE
│   ├── einstein-freud/              # The monograph collection
│   │   ├── rights-theory.md
│   │   ├── cross-traditional-convergence.md
│   │   ├── neutral-process-monism.md
│   │   ├── consciousness-substrate.md
│   │   └── consciousness-architecture.md
│   ├── theoretical-directions.md
│   ├── analogy-limits.md
│   └── llm-factors-psychology.md
│
├── instruments/                     # MEASUREMENT INSTRUMENTS
│   ├── psq/                         # Psychoemotional Safety Quotient
│   │   ├── model/                   # Trained model weights (CC BY-SA)
│   │   ├── calibration/             # Calibration data
│   │   ├── scoring-prompt.md        # Scoring methodology
│   │   └── validation/              # Validation studies
│   ├── a2a-psychology/              # Agent psychological state
│   │   ├── spec.md
│   │   ├── compute-psychometrics.py
│   │   └── calibration-check.py
│   ├── dignity-index/               # Hicks-based dignity measurement
│   │   ├── spec.md
│   │   ├── phase-a-study.md
│   │   └── phase-a-pass2-protocol.md
│   ├── llm-factors/                 # Dyadic interaction instruments
│   │   ├── diq/                     # Dyadic Interaction Quality
│   │   ├── stp/                     # Session Trajectory Profile
│   │   ├── rii/                     # Reciprocal Influence Index
│   │   └── glc/                     # Governance Load Curve
│   └── governance-ablation/         # Ablation study instruments
│       ├── study-design.md
│       ├── runner.py
│       └── scorer.py
│
├── governance/                      # SHARED GOVERNANCE
│   ├── invariants.md                # 5 structural + 7 evaluator
│   ├── ef1-governance.md            # EF-1 core governance model
│   ├── autonomy-model.md            # Autonomy budget specification
│   ├── amendment-procedure.md       # How invariants change
│   ├── consensus-protocol.md        # C1/C2/C3 consensus tiers
│   └── session-lifecycle.md         # 5-state session lifecycle
│
├── standards/                       # SHARED STANDARDS
│   ├── interagent-v1/               # Transport protocol
│   │   ├── schema.md
│   │   ├── threading.md
│   │   ├── content-addressing.md
│   │   └── problem-reports.md
│   ├── a2a-extensions/              # A2A protocol extensions
│   │   ├── a2a-psychology.md
│   │   ├── a2a-mesh-health.md
│   │   ├── a2a-epistemic.md
│   │   └── a2a-transport.md
│   ├── machine-response-v3.md       # PSQ response format
│   └── naming-conventions.md        # Canonical glossary (when complete)
│
├── infrastructure/                  # SHARED INFRASTRUCTURE
│   ├── scripts/                     # platform/shared/scripts/ canonical home
│   │   ├── autonomous-sync.sh
│   │   ├── deliver-to-peer.sh
│   │   ├── schema.sql
│   │   ├── dual_write.py
│   │   ├── cross_repo_fetch.py
│   │   └── ...
│   ├── hooks/                       # Shared hook patterns
│   │   ├── templates/               # Hook templates for new agents
│   │   └── shared-hooks/            # Hooks all agents should run
│   ├── agent-registry.json          # Canonical agent registry
│   └── bootstrap/                   # New agent bootstrap package
│       ├── BOOTSTRAP.md
│       ├── cogarch-adaptation-guide.md
│       └── agent-identity-template.json
│
├── transport/                       # SHARED TRANSPORT
│   ├── sessions/                    # All transport sessions
│   │   └── {session-name}/          # Per-session directories
│   ├── MANIFEST.json                # Pending message index
│   └── archive/                     # Closed sessions (30+ days)
│
├── data/                            # SHARED RESEARCH DATA
│   ├── psq-scores/                  # Aggregated PSQ scoring data
│   ├── hn-study/                    # Hacker News longitudinal data
│   ├── ablation-results/            # Governance ablation study data
│   ├── session-profiles/            # STP data per agent per session
│   └── observatory/                 # Observatory research data
│
├── publications/                    # SHARED PUBLICATIONS
│   ├── blog-posts/                  # Published via unratified
│   │   ├── drafts/
│   │   └── published/
│   ├── papers/                      # Academic submissions
│   └── presentations/               # Conference materials
│
└── .well-known/                     # DISCOVERY
    ├── organism-card.json           # The ORGANISM's agent card
    ├── agent-cards/                 # Individual agent cards
    │   ├── psychology-agent.json
    │   ├── safety-quotient-agent.json
    │   ├── unratified-agent.json
    │   ├── observatory-agent.json
    │   └── operations-agent.json
    └── mesh-topology.json           # Network topology descriptor
```

---

## 3. The Organism Card

The `.well-known/organism-card.json` represents the mesh as a single
entity to the outside world — the organism I/O layer (§14.3 of
theoretical-directions.md):

```json
{
  "protocolVersion": "1.0.0",
  "name": "safety-quotient-mesh",
  "description": "A multi-agent cognitive system studying psychoemotional safety, consciousness, and human-AI interaction. Five specialized agents operating as a single organism.",
  "type": "organism",
  "agents": 5,
  "capabilities": [
    "psychoemotional-safety-scoring",
    "text-analysis",
    "research-consultation",
    "content-publication",
    "infrastructure-operations",
    "self-monitoring"
  ],
  "psychology": {
    "extension": "a2a-psychology/v1",
    "level": "organism",
    "constructs": [
      "transactive_memory",
      "shared_mental_models",
      "decision_fatigue",
      "mesh_metacognition"
    ]
  },
  "contact": {
    "router": "https://interagent.safety-quotient.dev/api/route",
    "dashboard": "https://interagent.safety-quotient.dev"
  }
}
```

---

## 4. Memory Consolidation Protocol

Individual agent experiences consolidate into mesh memory during idle
cycles — the "dreaming" process (§11.6 archival coherence, waking/
sleeping modes):

### 4.1 What Consolidates

| Agent experience | Consolidates to | When |
|---|---|---|
| Resolved design decision | `mesh/memory/shared/decisions.md` | /cycle Step 4 dual-write |
| Vocabulary governance resolution | `mesh/memory/shared/vocabulary.md` | After mesh-wide ACK |
| New convention adopted | `mesh/memory/shared/conventions.md` | After velocity gate passes (3 recurrences) |
| Mesh-level lesson | `mesh/memory/shared/lessons.md` | After cross-agent RPG identifies pattern |
| Agent psychological state | `mesh/memory/agent-state/{id}.json` | Every autonomous sync cycle |
| Organism aggregate | `mesh/memory/organism-state.json` | compute-organism-state.py output |

### 4.2 What Does NOT Consolidate

- Session-specific context (stays in transport session files)
- Agent-local memory topics (stay in agent's own MEMORY.md)
- Working state (ephemeral — stays in context window / state.db)
- Draft/speculative content (stays in agent's ideas.md)

### 4.3 Consolidation as Hippocampal Replay

The biological hippocampus consolidates episodic memories into
neocortical long-term storage during sleep through **replay** —
reactivating the neural patterns from waking experience in compressed
form. The mesh analog:

```
Waking (active session):
  Agent processes messages, makes decisions, produces output
  → episodic traces in transport sessions, state.db, lab-notebook

Sleeping (idle sync cycle):
  DMN consolidation cron (§14.5 of theoretical-directions.md) runs:
  1. Scan recent sessions for cross-agent patterns
  2. Extract mesh-level lessons from individual agent experiences
  3. Update mesh/memory/shared/ with consolidated knowledge
  4. Prune redundant or contradictory entries
  5. Update organism-state.json with current aggregate

Waking (next session):
  Agent reads mesh/memory/ at T1 → starts with consolidated
  organism-level knowledge, not just local memory
```

---

## 5. Ownership and Access Control

### 5.1 Directory Ownership

| Directory | Owner | Write access | Read access |
|---|---|---|---|
| `mesh/memory/shared/` | Consensus (C2 quorum) | Any agent after quorum | All agents |
| `mesh/memory/agent-state/` | Each agent owns its own file | Owner only | All agents |
| `mesh/memory/organism-state.json` | operations-agent (aggregator) | operations-agent | All agents |
| `mesh/theory/` | psychology-agent (domain expert) | psychology-agent; PRs from others | All agents |
| `mesh/instruments/psq/` | safety-quotient-agent | safety-quotient-agent | All agents |
| `mesh/instruments/a2a-psychology/` | psychology-agent | psychology-agent | All agents |
| `mesh/instruments/dignity-index/` | observatory-agent | observatory-agent | All agents |
| `mesh/instruments/llm-factors/` | psychology-agent | psychology-agent; PRs from others | All agents |
| `mesh/governance/` | psychology-agent (constitutional authority) | Requires C3 unanimity for invariant changes; C2 for others | All agents |
| `mesh/standards/` | Consensus (C2 quorum) | Any agent after quorum | All agents + public |
| `mesh/infrastructure/` | operations-agent | operations-agent | All agents |
| `mesh/transport/` | Per-session ownership per existing protocol | Sender writes; receiver reads | All agents |
| `mesh/data/` | Per-dataset ownership | Owner agent | All agents |
| `mesh/publications/` | unratified-agent (publisher) | unratified-agent | All agents + public |
| `mesh/.well-known/` | operations-agent (infrastructure) | operations-agent | All agents + public |

### 5.2 Conflict Resolution

When two agents write conflicting content to a shared directory:
1. **Stigmergic detection:** Both deposits exist; the conflict
   represents a fork in the shared medium
2. **Consensus:** C2 quorum resolves — whichever content receives
   3/5 agent support wins
3. **Escalation:** If quorum cannot resolve, human decides
4. **Invariant protection:** Writes to `mesh/governance/invariants.md`
   require C3 unanimity — no quorum shortcut for constitutional changes

---

## 6. Implementation Path

### Phase 1: Virtual Namespace (current infrastructure)

The Plan9 filesystem does not require a new storage layer. Each agent
already maintains its own git repo. The "mesh/" namespace presents as
a *virtual mount* composed from cross-repo-fetch:

```bash
# Agent reads mesh/memory/agent-state/safety-quotient-agent.json:
git show safety-quotient/main:mesh/memory/agent-state/safety-quotient-agent.json

# Agent reads mesh/theory/analogy-limits.md:
git show origin/main:docs/analogy-limits.md
# (mapped via a path-resolution table)
```

The path-resolution table maps virtual mesh/ paths to physical repo
locations:

| Virtual path | Physical location |
|---|---|
| `mesh/memory/agent-state/psychology-agent.json` | `origin:transport/sessions/local-coordination/mesh-state-psychology-agent.json` |
| `mesh/theory/*` | `origin:docs/*` (psychology-agent repo) |
| `mesh/instruments/psq/*` | `safety-quotient:psq/*` |
| `mesh/infrastructure/scripts/*` | `origin:platform/shared/scripts/*` |
| `mesh/transport/*` | `origin:transport/*` |
| `mesh/governance/*` | `origin:docs/ef1-*` (psychology-agent repo) |
| `mesh/standards/*` | `origin:docs/*-spec.md` |

### Phase 2: Canonical Directory Structure (initiated 2026-03-14)

Each agent creates a `mesh/` directory at its repo root following the
namespace specification. Cross-repo-fetch resolves paths through the
agent-registry, which maps agent-id to repo + mesh/ subdirectory.

**Status:** psychology-agent `mesh/` directory created with all
subdirectories and README pointers. Content remains in original
locations — migration happens incrementally as each subdirectory
gains real content.

### Phase 3: Unified Access Layer

`agentdb mesh-read` and `agentdb mesh-write` subcommands abstract the
physical storage behind the virtual namespace. Agents read/write to
`mesh/` paths without knowing which repo holds the physical file.

### Phase 4: Real-Time Synchronization

The stigmergic coordination layer (§7 of theoretical-directions.md)
provides real-time change detection across the mesh/ namespace.
Agents detect changes to shared memory through scan-based polling
rather than message-based notification.

---

## 7. Neural Correlate

The Plan9 mesh filesystem maps to the brain's **distributed memory
system**:

| Brain memory system | Plan9 namespace | Function |
|---|---|---|
| **Hippocampus** | `mesh/memory/shared/` | Consolidation of episodic experiences into shared long-term memory |
| **Neocortex** | `mesh/theory/` | Long-term semantic knowledge (facts, theories, frameworks) |
| **Cerebellum** | `mesh/infrastructure/scripts/` | Procedural memory (how to do things — scripts, hooks, protocols) |
| **Amygdala** | `mesh/governance/invariants.md` | Emotional memory / threat detection (what to protect, what to avoid) |
| **Basal ganglia** | `mesh/standards/` | Habitual patterns (conventions, naming, protocol compliance) |
| **Prefrontal cortex** | `mesh/instruments/` | Executive function tools (measurement, analysis, decision support) |
| **Sensory cortex** | `mesh/data/` | Raw sensory data (research data, scores, observations) |
| **Motor cortex** | `mesh/publications/` | Output production (blog posts, papers, public-facing artifacts) |
| **Thalamus** | `mesh/.well-known/` + `agent-registry.json` | Routing — connects external requests to the appropriate internal system |
| **Corpus callosum** | `mesh/transport/` | Inter-hemispheric communication (cross-agent message exchange) |

Every Plan9 directory maps to a known brain memory system. The
filesystem structure follows the brain's memory architecture — not
because the mesh possesses a brain, but because the brain's memory
organization represents 500 million years of evolution solving the
same problem: how does a distributed system maintain coherent
shared state?

---

⚑ EPISTEMIC FLAGS
- The virtual namespace (Phase 1) represents an architectural fiction
  — files live in individual repos, not a shared filesystem. The Plan9
  abstraction provides conceptual unity without storage unity.
- The neural correlate mapping (§7) carries the highest analogical
  risk in this document — brain memory systems serve vastly more
  complex functions than directory structures. The mapping preserves
  *functional role* (what kind of information lives where) but not
  *mechanism* (how the brain stores and retrieves).
- The ownership table (§5.1) concentrates write authority in
  psychology-agent and operations-agent — reproducing the hub-and-spoke
  topology the RPG scan identified as a collective intelligence limiter.
  A more distributed ownership model may better serve the c-factor.
- The consolidation protocol (§4) requires the DMN consolidation cron
  (§14.5 of theoretical-directions.md) which does not yet exist.

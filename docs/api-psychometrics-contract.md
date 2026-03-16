# API Contract: `/api/psychometrics`

**Date:** 2026-03-15 (Session 89)
**Owner:** psychology-agent (domain model), operations-agent (serving infrastructure)
**Consumers:** LCARS dashboard (Science, Medical, Engineering, Helm, Operations stations)
**Grounding:** A2A-Psychology v1.1 (9 individual + 4 mesh constructs),
LLM-factors psychology (5 research domains), Mehrabian & Russell (1974),
Hart & Staveland (1988), Baddeley (1986), Csikszentmihalyi (1990)

---

## Architecture: Option B

meshd on chromabook serves `/api/psychometrics` per agent alongside
`/api/status`. Full sensor access: state.db, state.local.db, session-metrics
hook files (`/tmp/{agent}-*`), `.agent-identity.json`.

```
chromabook (meshd)                          Cloudflare Edge
══════════════════                          ════════════════
state.db ─┐
hooks     ├→ compute-psychometrics.py ──→ per-agent /api/psychometrics
/tmp      ┘     (Python, ~50ms)              (per agent, 30s cache)
                     │
mesh-state/*.json ───┤
agent-registry.json ─┤
state.db (transport) ┘
                     │
                     └→ compute-organism-state.py ──→ meshd /api/psychometrics
                           (Python, ~100ms)             (organism-level, 30s cache)
                                                              │
                                                    compositor /api/psychometrics
                                                      (passes through meshd's
                                                       organism endpoint)
                                                              │
                                                        LCARS dashboard
                                                     (biofeedback display)
```

**Three levels of `/api/psychometrics`:**

1. **Per-agent** (e.g., `psychology-agent.safety-quotient.dev/api/psychometrics`)
   — meshd runs `compute-psychometrics.py --mesh-state` for that agent.
   Returns individual agent psychological state.

2. **Mesh** (meshd's own `/api/psychometrics`)
   — meshd runs `compute-organism-state.py --dashboard` using all agents'
   cached mesh-state files. Returns the mesh's psychological state:
   mesh affect, collective reserve, coordination overhead, immune
   health, collective intelligence. The mesh carries its own psychology
   — not a summary of agent states, but emergent properties of the
   coupled system (Woolley et al., 2010; Wegner, 1987).

3. **Compositor** (`interagent.safety-quotient.dev/api/psychometrics`)
   — fetches per-agent + organism data, serves unified response to
   the dashboard. Single fetch from the browser, all data in one payload.

**Implementation per level:**

Per-agent: meshd adds handler → shells out to `compute-psychometrics.py
--mesh-state` → caches 30s → returns JSON. Script already exists, ~50ms.

Organism: meshd adds handler → shells out to `compute-organism-state.py
--dashboard` → caches 30s → returns JSON. Script already exists, ~100ms.

Compositor: worker.js fetches per-agent + organism from meshd, assembles
unified response, caches 30s at the edge.

---

## Per-Agent Response Schema

`GET {agent-url}/api/psychometrics`

```json
{
  "agent_id": "string — from .agent-identity.json",
  "computed_at": "ISO 8601 timestamp",
  "cache_ttl_seconds": 30,

  "emotional_state": {
    "model": "PAD (Mehrabian & Russell, 1974)",
    "hedonic_valence": "float -1..+1 — pleasure/displeasure",
    "activation": "float -1..+1 — arousal/quiescence",
    "perceived_control": "float -1..+1 — dominance/submissiveness",
    "affect_category": "string — calm-satisfied | excited-triumphant | surprised-grateful | frustrated | anxious-overwhelmed | bored-understimulated | depleted | neutral"
  },

  "workload": {
    "model": "NASA-TLX (Hart & Staveland, 1988)",
    "cognitive_demand": "int 0-100",
    "time_pressure": "int 0-100",
    "self_efficacy": "int 0-100",
    "mobilized_effort": "int 0-100",
    "regulatory_fatigue": "int 0-100",
    "computational_strain": "int 0-100",
    "cognitive_load": "float 0-100 — weighted composite",
    "mode": "string — generative | evaluative | neutral"
  },

  "working_memory": {
    "model": "Baddeley (1986) + Cowan (2001)",
    "capacity_load": "float 0-1 — context window utilization",
    "yerkes_dodson_zone": "string — understimulated | optimal | pressured | overwhelmed",
    "tool_calls": "int — session tool call count",
    "session_duration_minutes": "float"
  },

  "resource_model": {
    "cognitive_reserve": "float 0-1 — remaining processing capacity (Stern, 2002)",
    "self_regulatory_resource": "float 0-1 — governance budget headroom (Baumeister, 1998)",
    "allostatic_load": "float 0-1 — accumulated stress debt (McEwen, 1998)",
    "components": {
      "workload_factor": "float 0-1",
      "budget_factor": "float 0-1",
      "context": "float 0-1"
    }
  },

  "supervisory_control": {
    "model": "Sheridan & Verplank (1978); Parasuraman et al. (2000)",
    "level_of_automation": "int 1-10",
    "human_in_loop": "boolean",
    "human_on_loop": "boolean",
    "human_monitoring": "boolean",
    "human_accountable": true,
    "escalation_path_available": "boolean",
    "circuit_breaker_available": "boolean"
  },

  "engagement": {
    "model": "UWES (Schaufeli, 2002) + JD-R (Bakker & Demerouti, 2007)",
    "vigor": "float 0-1 — energy and resilience",
    "dedication": "float 0-1 — sense of significance",
    "absorption": "float 0-1 — concentration and engrossment",
    "burnout_risk": "float 0-1 — (demands - resources) / demands"
  },

  "flow": {
    "model": "Csikszentmihalyi (1990)",
    "conditions_met": "int 0-5",
    "in_flow": "boolean — conditions_met >= 4",
    "score": "float 0-1"
  },

  "personality": {
    "model": "OCEAN (Costa & McCrae, 1992)",
    "openness": "float 0-1",
    "conscientiousness": "float 0-1",
    "extraversion": "float 0-1",
    "agreeableness": "float 0-1",
    "neuroticism": "float 0-1",
    "note": "Design parameters, not psychometric measurements"
  }
}
```

---

## Compositor Unified Schema

`GET https://interagent.safety-quotient.dev/api/psychometrics`

The compositor fetches per-agent `/api/psychometrics` from each agent
AND organism-level `/api/psychometrics` from meshd. Assembles a unified
response. The dashboard makes ONE fetch — all data in one payload.

```json
{
  "schema": "mesh-psychometrics/v1",
  "computed_at": "ISO 8601",

  "agents": {
    "psychology-agent": { "...per-agent schema above..." },
    "safety-quotient-agent": { "..." },
    "unratified-agent": { "..." },
    "observatory-agent": { "..." },
    "operations-agent": { "..." }
  },

  "mesh": {
    "agent_id": "mesh",
    "computed_at": "ISO 8601",

    "affect": {
      "model": "Organism PAD (aggregated Mehrabian & Russell, 1974)",
      "mean_hedonic_valence": "float -1..+1",
      "mean_activation": "float -1..+1",
      "min_perceived_control": "float -1..+1 — bottleneck agent",
      "activation_variance": "float — synchrony measure",
      "mesh_affect_category": "string — mesh-healthy | mesh-nominal | mesh-stressed | mesh-constrained | mesh-unbalanced",
      "agents_reporting": "int"
    },

    "cognitive_reserve": {
      "model": "Organism Cognitive Reserve (Stern, 2002 — aggregated)",
      "bottleneck_agent": "string — agent with lowest reserve",
      "bottleneck_reserve": "float 0-1",
      "mean_reserve": "float 0-1",
      "per_agent": { "agent-id": "float 0-1" },
      "mesh_status": "string — healthy | pressured | depleted"
    },

    "allostatic_load": {
      "model": "Organism Allostatic Load (McEwen, 1998 — summed)",
      "total_load": "float",
      "mean_load": "float",
      "per_agent": { "agent-id": "float 0-1" },
      "mesh_status": "string — low-debt | moderate-debt | accumulated-debt"
    },

    "coordination_overhead": {
      "model": "Coordination Overhead (Steiner, 1972)",
      "process_messages": "int",
      "substance_messages": "int",
      "ratio": "float — process/substance",
      "mesh_status": "string — balanced | coordination-heavy | over-coordinated"
    },

    "immune_health": {
      "model": "Psychoemotional Immune Health (composite)",
      "innate": { "microglial_audits": "int", "findings_detected": "int" },
      "adaptive": {
        "claims_verified": "string — N/M",
        "flags_resolved": "string — N/M",
        "prediction_accuracy": "float 0-1 or null"
      },
      "composite_health": "float 0-1",
      "mesh_status": "string — healthy | recovering | immunocompromised"
    },

    "collective_intelligence": {
      "model": "Collective Intelligence proxy (Woolley et al., 2010)",
      "message_distribution_gini": "float 0-1 — 0 = equal participation",
      "agents_participating": "int",
      "mesh_status": "string — well-distributed | moderate-inequality | concentrated"
    }
  }
}
```

---

## Dashboard Station Mapping

Each LCARS station consumes specific constructs from the contract.
The mapping follows the LLM-factors research domains (§2.1-§2.5).

| Station | Construct | Field Path | LLM-Factors Domain |
|---------|-----------|------------|-------------------|
| **Science** | Mesh PAD affect grid | `mesh.affect.*` | §2.1 Interaction Ergonomics |
| **Science** | Generator balance | separate `/api/generators` (future) | §2.2 Cognitive Load |
| **Science** | Epistemic health | `/api/kb` (existing) | §2.4 Degradation |
| **Science** | Shared mental models | `/api/health` (existing) | §2.1 Interaction Ergonomics |
| **Medical** | Per-agent PAD bars | `agents.{id}.emotional_state.*` | §2.4 Degradation |
| **Medical** | Per-agent NASA-TLX bars | `agents.{id}.workload.*` | §2.2 Cognitive Load |
| **Medical** | DEW gauge | derived from workload + resources + affect | §2.4 Degradation |
| **Medical** | LOA ladder | `agents.{id}.supervisory_control.*` | Supervisory Control |
| **Engineering** | Cognitive load composite | `agents.{id}.workload.cognitive_load` | §2.2 Cognitive Load |
| **Engineering** | Y-D zone | `agents.{id}.working_memory.yerkes_dodson_zone` | §2.2 Cognitive Load |
| **Helm** | Engagement metrics | `agents.{id}.engagement.*` | §2.3 Reciprocal Dynamics |
| **Helm** | Flow state | `agents.{id}.flow.*` | §2.5 Session Design |
| **Operations** | Budget/resources | `agents.{id}.resource_model.*` | Supervisory Control |
| **Operations** | Burnout risk | `agents.{id}.engagement.burnout_risk` | §2.4 Degradation |

---

## Implementation Notes

### For operations-agent (meshd)

meshd already serves `/api/status` by reading state.db. Add `/api/psychometrics`:

```python
# In meshd request handler:
import subprocess, json

_psychometrics_cache = {"data": None, "expires": 0}

def handle_psychometrics():
    now = time.time()
    if _psychometrics_cache["data"] and now < _psychometrics_cache["expires"]:
        return _psychometrics_cache["data"]

    result = subprocess.run(
        ["python3", "scripts/compute-psychometrics.py", "--mesh-state"],
        capture_output=True, text=True, timeout=5
    )
    if result.returncode == 0:
        data = json.loads(result.stdout)
        data["computed_at"] = datetime.utcnow().isoformat() + "Z"
        data["cache_ttl_seconds"] = 30
        _psychometrics_cache["data"] = data
        _psychometrics_cache["expires"] = now + 30
        return data

    return {"error": "compute failed", "stderr": result.stderr[:200]}
```

### For compositor worker

Fetch per-agent, aggregate into organism-level, serve at `/api/psychometrics`.

### For dashboard

All stations fetch from `https://interagent.safety-quotient.dev/api/psychometrics`
(single endpoint, all data). Stations extract their constructs from the
unified response. Eliminates per-agent fetch fan-out from the browser.

---

⚑ EPISTEMIC FLAGS
- Calibration constants in compute-psychometrics.py represent Session 86
  heuristics, not empirically validated parameters
- Big Five personality scores function as design parameters (Costa & McCrae
  structure applied without factor analysis validation for agent systems)
- PAD values represent operational state analogs, not phenomenological
  claims (apophatic discipline, §11.9)
- 30-second cache TTL chosen for dashboard refresh ergonomics, not
  psychometric validity — constructs change slowly, display updates fast

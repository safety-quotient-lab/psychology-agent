# LCARS Data Architecture — Library Computer Access/Retrieval System

**Session:** 96 (2026-03-21)
**Status:** SPEC — design document, not yet implemented
**Authority:** psychology-agent (architecture ownership)
**Prerequisite reading:** `docs/lcars-style-guide.md`, `docs/lcars-overhaul-plan.md`

---

## 1. Premise

LCARS stands for Library Computer Access/Retrieval System. The dashboard
does not "render data from APIs." It retrieves typed knowledge from a
catalog and presents it through stations. This spec defines the data
architecture that makes that retrieval possible — standards, schemas,
vocabulary, endpoints, edge cases, and integration points.

**Ontological commitment:** Every datum served by LCARS carries semantic
type (what it represents), provenance (where it came from), audience
labels (who reads it), and catalog membership (where to find more like
it). Data without type metadata does not belong in LCARS — it belongs
in a log file.

**Existing system constraint:** The fleet LCARS dashboard (ops-built,
8 stations, 67 panels, 17,658 lines across 24 files) represents a
working, delicate system. This spec extends and refines — it does not
replace. The per-agent dashboard at `/lcars` (formerly `/obs`) follows
the same architecture.

---

## 2. Standards Stack

Five standards compose the LCARS data layer. Each addresses a distinct
concern. No custom extensions required at the standards level.

| Layer | Standard | Status | Concern |
|---|---|---|---|
| Vocabulary terms | SKOS (W3C Recommendation, 2009) | Stable | Concept definitions, labels, relations |
| Audience labels | `dcterms:audience` (DCMI Recommendation) | Stable | Per-audience scoped definitions |
| Data typing | schema.org | Community standard | What entities represent |
| Linking | JSON-LD 1.1 (W3C Recommendation, 2020) | Stable | Machine-readable context |
| Transport | HTTP Content Negotiation (RFC 9110) | Stable | Serving representations |

### 2.1 Why Not SKOS-XL

SKOS-XL (Appendix B of the SKOS Reference) reifies labels as first-class
resources. The W3C positioned it as optional, for inter-label relationships
(acronym-of, translation-of). The implementation report showed 1 of 10
implementations adopted it. The SKOS Core Vocabulary Specification provides
a simpler, W3C-blessed pattern for audience-scoped metadata using structured
note values with `dcterms:audience`. This spec uses plain SKOS throughout.

**Reference:** SKOS Reference §7.5 (note properties accept structured
resource descriptions as values); SKOS Core Vocabulary Specification
(audience annotation pattern).

---

## 3. Vocabulary Concept Scheme

### 3.1 Structure

The psychology-agent vocabulary constitutes a single SKOS `ConceptScheme`
containing all terms the system uses. Three existing sources unify into
this scheme:

| Source | Current location | Term count | Disposition |
|---|---|---|---|
| Glossary | `docs/glossary.md` | ~30 project terms | Fold into concept scheme |
| Dictionary | `docs/dictionary.md` | ~16 framework terms | Fold into concept scheme |
| Canonical glossary | `docs/canonical-glossary.md` | ~17 trigger names + codes | Fold into concept scheme |
| PSH categories | `facet_vocabulary` table | 11 active L1 + 33 inactive | Reference as `skos:topConceptOf` |
| schema.org types | `facet_vocabulary` table | 10 types | Map via `skos:exactMatch` |
| Acronyms | `facet_vocabulary` table | 65 entries | Fold as `skos:notation` |

The concept scheme lives at a stable URL with semver versioning:
```
https://psychology-agent.safety-quotient.dev/vocab/v1.0.0.jsonld
```

**Versioning (semver):**
- **MAJOR** (v2.0.0) — breaking: renamed/removed concepts, changed `@id` URIs
- **MINOR** (v1.1.0) — additive: new concepts, new audience labels, new relations
- **PATCH** (v1.0.1) — editorial: definition text edits, citation additions, typo fixes

A redirect at `/vocab/latest.jsonld` always points to the current version.
The `@context` in API responses references the pinned version, not `latest`,
so cached consumers remain stable until they explicitly upgrade.

Served by agentd at `/vocab/v1.0.0.jsonld`. Also available at meshd for
fleet-wide access.

### 3.2 Concept Structure (Plain SKOS + Dublin Core)

Each concept carries:

```json
{
  "@id": "vocab:coherence",
  "@type": "skos:Concept",
  "skos:inScheme": "vocab:cognitive-architecture-v1",
  "skos:prefLabel": "coherence",
  "skos:notation": null,

  "skos:definition": [
    {
      "rdf:value": "How well the agent's systems work together. Ranges from 0 (broken) to 1 (everything runs smoothly).",
      "dcterms:audience": "general-public"
    },
    {
      "rdf:value": "Composite float [0,1] computed from 7 weighted inputs: db, gwt, oscillator, error_rate, sedation, peer_field, microbiome. Below 0.3 triggers functional unconsciousness.",
      "dcterms:audience": "developer",
      "skos:scopeNote": "Comparable to Kubernetes pod readiness probe"
    },
    {
      "rdf:value": "Weighted integration measure across Gf/Gc/Gm cognitive layers, operationalizing functional integration as a single scalar. Threshold of 0.3 represents minimum integration for deliberative processing.",
      "dcterms:audience": "researcher",
      "dcterms:bibliographicCitation": "Tononi (2004) phi; Penrose & Hameroff (2014) Orch-OR"
    }
  ],

  "skos:broader": "vocab:photonic-substrate",
  "skos:related": ["vocab:oscillator-state", "vocab:spectral-profile"]
}
```

### 3.3 Audience Values

Three audiences, mapped to LRMI where possible:

| Audience ID | LRMI mapping | Register | Reading level |
|---|---|---|---|
| `general-public` | `lrmi:general-public` (exact) | Layperson — plain language | 8th grade |
| `developer` | `lrmi:professional` (broad) | CS/DevOps — infrastructure terms | Working engineer |
| `researcher` | `lrmi:researcher` (exact) | Academic — citations, formal defs | Graduate+ |

**Rendering rule:** LCARS defaults to `general-public` labels. A control
in the frame header switches register. Tooltips show the current register's
definition; long-press or hover shows all three.

### 3.4 Acronym Handling

Acronyms attach to their parent concept as `skos:notation`:

```json
{
  "@id": "vocab:psychoemotional-safety-quotient",
  "skos:prefLabel": "psychoemotional safety quotient",
  "skos:notation": "PSQ",
  "skos:altLabel": ["safety quotient", "PSQ score"]
}
```

The existing `renderAcronymTips()` system in the LCARS dashboard consumes
these to wrap acronyms in `<abbr>` tags with tooltip definitions.

---

## 4. Data Typing with schema.org

### 4.1 Entity Type Map

Every entity served by LCARS carries a schema.org `@type`. The existing
`universal_facets` table already assigns `schema_type` facets. This map
formalizes and extends that assignment:

| Entity | schema.org Type | Table | Station |
|---|---|---|---|
| Real-time metric | `Observation` | (computed live) | Medical, Science |
| Metric property | `PropertyValue` | (inline) | Medical, Science |
| Transport message | `Message` | `transport_messages` | Helm |
| Design decision | `ChooseAction` | `decision_chain` | Operations |
| Session entry | `Event` | `session_log` | Operations |
| Verified claim | `Claim` | `claims` | Science |
| Vocabulary term | `DefinedTerm` | `memory_entries` | Science |
| Lesson | `LearningResource` | `lessons` | Science |
| Cognitive trigger | `HowToStep` | `trigger_state` | Operations |
| Autonomous action | `Action` | `autonomous_actions` | Operations |
| Gated operation | `SuspendAction` | `pending_handoffs` | Helm |
| Epistemic flag | `Comment` | `epistemic_flags` | Science |
| The agent | `SoftwareApplication` | `.agent-identity.json` | All |
| The API | `WebAPI` | (static) | Catalog |
| An endpoint | `EntryPoint` | (static) | Catalog |
| Data catalog | `DataCatalog` | (static) | Catalog |
| Endpoint output | `Dataset` | (static) | Catalog |
| Station category | `CategoryCode` | (static) | Navigation |

### 4.2 Observation Pattern

Real-time metrics (coherence, oscillator state, spectral profile) use
schema.org `Observation` — a measured value at a point in time:

```json
{
  "@type": "Observation",
  "name": "coherence",
  "measuredProperty": {
    "@type": "DefinedTerm",
    "@id": "vocab:coherence",
    "inDefinedTermSet": "vocab:cognitive-architecture-v1"
  },
  "measuredValue": 0.72,
  "observationDate": "2026-03-21T18:28:31Z"
}
```

Every `measuredProperty` links to the vocabulary concept scheme. The
LCARS dashboard resolves audience-scoped labels from the concept to
render human-readable names and tooltips.

### 4.3 Record Retrieval Pattern

The LCARS reference images show structured record retrieval — a query
returns a formatted record with metadata fields, reference codes, and
prose content (visible in the DS9 Biographical Database and Stellar
Cartography screens). Our analog: vocabulary lookups, agent profiles,
and transport message inspection.

When LCARS retrieves a structured record, it follows this pattern:

```json
{
  "@type": "SoftwareApplication",
  "name": "psychology-agent",
  "applicationCategory": "Autonomous Agent",
  "identifier": "SFADB-PSY-001",
  "description": "General-purpose psychology agent...",
  "version": "1.1.0",

  "additionalProperty": [
    {
      "@type": "Observation",
      "name": "coherence",
      "measuredValue": 0.72
    },
    {
      "@type": "Observation",
      "name": "oscillator_state",
      "measuredValue": "active"
    }
  ]
}
```

This follows the LCARS record retrieval convention: header band with
title and reference number, structured metadata fields in the left
column, live sensor readings as alphanumeric readouts in the right
column. The same pattern applies to vocabulary term lookup, transport
message inspection, and decision record retrieval.

---

## 5. API Surface Design

### 5.1 Uniform Interface

Every process in the mesh (agentd, meshd) serves `/api/status`. The
response schema carries an `entity_type` field distinguishing agent
from mesh:

| Process | Route | `entity_type` | Content |
|---|---|---|---|
| agentd | `/api/status` | `"agent"` | Individual state, budget, triggers, photonic |
| meshd | `/api/status` | `"mesh"` | Emergent properties, fleet coherence, trust topology |

### 5.2 agentd Endpoint Hierarchy

```
/lcars .......................... Per-agent LCARS dashboard (HTML)
/vocab/v1.0.0.jsonld ................ Vocabulary concept scheme (JSON-LD)

/api/status ..................... Agent status (schema:SoftwareApplication)
/api/catalog .................... Data catalog (schema:DataCatalog)
/api/neural ..................... Trigger activations + Gc counters
/api/photonic ................... Coherence, spectral, maturity
/api/oscillator ................. State, coupling mode, coherence

/api/kb ......................... Full knowledge base
  /kb/decisions ................. Architecture decisions
  /kb/triggers .................. Cognitive triggers
  /kb/claims .................... Verified claims
  /kb/messages .................. Transport message index
  /kb/lessons ................... Lessons + promotion status
  /kb/epistemic ................. Unresolved flags
  /kb/catalog ................... Facet vocabulary + distribution
  /kb/memory .................... Memory entries + topic analysis
  /kb/dictionary ................ JSON-LD DefinedTermSet

/events ......................... SSE stream (cache generation changes)
/health ......................... Health check (HEAD/GET)
/.well-known/agent-card.json .... A2A agent card
```

### 5.3 meshd Endpoint Additions

meshd `/api/status` absorbs the former `/api/pulse` data and adds
emergent properties:

```json
{
  "@context": "https://psychology-agent.safety-quotient.dev/vocab/v1.0.0.jsonld",
  "@type": "Dataset",
  "entity_type": "mesh",

  "variableMeasured": [
    {
      "@type": "Observation",
      "name": "fleet_coherence",
      "measuredValue": 0.68,
      "observationDate": "2026-03-21T18:30:00Z"
    },
    {
      "@type": "Observation",
      "name": "spectral_diversity",
      "measuredValue": 0.45
    },
    {
      "@type": "Observation",
      "name": "mesh_coupling_mode",
      "measuredValue": "task_directed"
    }
  ],

  "agents_online": 4,
  "agents_total": 5,
  "mesh_health": "nominal",
  "mesh_mode": "active"
}
```

**Emergent properties** — computed by meshd, not derivable from any
single agentd. The test for emergence: can any single agent compute
this property from its own state alone? If not, meshd owns it.

#### Tier 1 — Core Emergent Properties (implement in Phase 6c)

| Property | Computation | Why meshd owns it |
|---|---|---|
| Fleet coherence | Weighted average of peer photonic fields | No agent sees all peers |
| Spectral diversity | Variance across agent spectral profiles | Requires full spectral vector |
| Mesh coupling mode | Dominant mode across interacting agents | Emerges from interaction patterns |
| Trust topology | Protocol compliance patterns across dyadic exchanges | Spans all agent pairs |
| Mesh health | Topology-aware assessment (not just "count online") | Considers connectivity, not just count |
| Group meditation tempo | Broadcast FROM meshd TO agents | Originates at mesh level |

#### Tier 2 — High-Signal Additions (implement post-Phase 6)

| Property | Computation | Why emergent | Systems principle |
|---|---|---|---|
| Generator balance (G2/G3) | Ratio of generative to evaluative actions across all agents | Individual agents track their own; mesh-level ratio reveals systemic creative/critical lean | Homeostasis (von Bertalanffy) |
| Collective attention | Fraction of mesh processing per PSH domain — what topics occupy the mesh | No agent sees all processing across the fleet | Collective cognition |
| Transport latency distribution | Time from message send → message processed across all dyadic pairs | No single agent sees all pairs' latency — the mesh's "nervous system speed" | Information flow |
| Vocabulary convergence | Jaccard similarity of agents' active concept sets — measures shared understanding vs drift | Requires comparing all concept schemes pairwise | Collective cognition |
| Coupling strength | Cross-correlation of agent state changes over time — when one agent's coherence drops, does another's processing change | Requires time-series from all agents simultaneously | Coupling dynamics |
| Epistemic debt distribution | Where do unresolved epistemic flags accumulate across agents — reveals quality problem hotspots | Requires mesh-wide epistemic flag inventory | Collective cognition |

#### Tier 3 — Dark Horses (high potential, less obvious)

| Property | Computation | Why interesting |
|---|---|---|
| Synchronization index | Phase alignment of oscillator cycles across agents — in-sync, anti-sync, or independent firing | Reveals hidden temporal coordination (or interference). Biological analog: EEG cross-frequency coupling between brain regions (Canolty & Knight, 2010) |
| Mesh impedance | How much resistance the mesh offers to state changes — high impedance absorbs perturbations without propagating | Measures mesh resilience. A mesh that propagates every perturbation lacks stability; one that absorbs everything lacks responsiveness. The healthy range sits between |
| Crystallization rate (G6/G7) | New conventions crystallized vs dissolved, mesh-wide, per unit time | Tracks governance metabolism — too fast means premature crystallization, too slow means the mesh never learns. Connects directly to the wu wei telos (Laozi, ch. 17) |

#### Tier 4 — Future Candidates (documented for later evaluation)

These properties carry theoretical interest but require more data,
infrastructure, or validation before implementation:

| Property | Notes |
|---|---|
| Recovery topology | When agent X fails, which agents compensate and how fast. Requires failure event history — insufficient data currently |
| Propagation speed | How fast vocabulary changes or decisions reach all agents. Requires tracking adoption timestamps — needs concept scheme versioning infrastructure first |
| Information entropy | Concentration vs diversity of message content by PSH facet. Requires classifying all mesh traffic — high computation cost |
| Metacognitive accuracy | Do mesh-level predictions match outcomes across agents. Requires efference copy data from all agents — currently only psychology-agent records predictions |
| Budget burn rate | Total autonomy credits consumed per hour, mesh-wide. Straightforward aggregate but reveals spending patterns invisible to individual agents |
| Protocol compliance rate | Fraction of messages conforming to interagent/v1 schema. Requires validating all traffic — useful for trust topology refinement |
| Mean time between failures | Mesh-wide MTBF. Requires failure timestamps from all agents — insufficient failure data currently |
| Transport volume trend | Messages per hour with trend detection. Simple aggregate that becomes interesting when correlated with coupling strength and coherence |

### 5.4 Response Envelope

All JSON API responses follow a consistent envelope:

```json
{
  "@context": "https://psychology-agent.safety-quotient.dev/vocab/v1.0.0.jsonld",
  "@type": "{schema.org type}",
  "entity_type": "agent|mesh",
  "dateModified": "{ISO 8601}",
  "publisher": {
    "@type": "SoftwareApplication",
    "name": "{agent_id}",
    "version": "{version}"
  },

  ...payload...
}
```

JSON-LD-unaware consumers ignore `@context`, `@type`, and the envelope
fields — they read the payload fields directly. JSON-LD-aware consumers
dereference `@context` to resolve vocabulary terms.

---

## 6. Data Catalog

### 6.1 Purpose

The data catalog (`/api/catalog`) enables LCARS to discover what data
exists without hardcoding endpoint assumptions. This addresses the
ghost's anti-pattern #4 (agent-as-data-source assumption) — stations
declare data dependencies, the catalog resolves them.

### 6.2 Schema

```json
{
  "@context": "https://schema.org",
  "@type": "DataCatalog",
  "name": "psychology-agent LCARS",
  "description": "Library Computer Access/Retrieval System — per-agent data catalog",

  "dataset": [
    {
      "@type": "Dataset",
      "@id": "/api/status",
      "name": "Agent Status",
      "description": "Real-time cognitive state observations",
      "distribution": {
        "@type": "DataDownload",
        "contentUrl": "/api/status",
        "encodingFormat": "application/ld+json"
      },
      "variableMeasured": [
        "coherence", "oscillator_state", "coupling_mode",
        "budget_spent", "budget_cutoff", "session_active"
      ],
      "station": "medical"
    },
    {
      "@type": "Dataset",
      "@id": "/api/neural",
      "name": "Neural Layer",
      "description": "Trigger activation history and Gc learning metrics",
      "distribution": {
        "@type": "DataDownload",
        "contentUrl": "/api/neural",
        "encodingFormat": "application/ld+json"
      },
      "variableMeasured": [
        "trigger_summary", "recent_firings", "gc_counters",
        "total_activations", "fail_rate"
      ],
      "station": "medical"
    },
    {
      "@type": "Dataset",
      "@id": "/api/photonic",
      "name": "Photonic Substrate",
      "description": "Coherence, spectral profile, and maturity",
      "distribution": {
        "@type": "DataDownload",
        "contentUrl": "/api/photonic",
        "encodingFormat": "application/ld+json"
      },
      "variableMeasured": [
        "coherence", "spectral_profile", "maturity", "ne_pattern"
      ],
      "station": "science"
    },
    {
      "@type": "Dataset",
      "@id": "/api/oscillator",
      "name": "Vagal Brake",
      "description": "Oscillator state, coupling mode, tempo controls",
      "distribution": {
        "@type": "DataDownload",
        "contentUrl": "/api/oscillator",
        "encodingFormat": "application/ld+json"
      },
      "variableMeasured": [
        "oscillator_state", "coupling_mode", "oscillator_coherence"
      ],
      "station": "helm"
    },
    {
      "@type": "Dataset",
      "@id": "/kb/dictionary",
      "name": "Vocabulary",
      "description": "Defined terms with audience-scoped labels",
      "distribution": {
        "@type": "DataDownload",
        "contentUrl": "/kb/dictionary",
        "encodingFormat": "application/ld+json"
      },
      "station": "science"
    }
  ]
}
```

### 6.3 Station Discovery

Each `Dataset` carries a `station` field indicating which LCARS station
displays it. The dashboard fetches the catalog on startup and routes
data to stations dynamically. When a new endpoint appears in the catalog,
the corresponding station picks it up without code changes.

### 6.4 meshd Catalog Aggregation

meshd serves its own `/api/catalog` that aggregates catalogs from all
registered agentd instances. The fleet catalog shows what data exists
across the entire mesh — the dashboard resolves any variable to its
source agent and endpoint.

---

## 7. Station-to-Dataset Mapping

Drawing from the existing LCARS style guide (§7) and reference images,
each station answers a question and presents specific dataset types:

| Station | Question | Datasets | LCARS visual reference |
|---|---|---|---|
| Medical | How does this agent function? | `/api/status`, `/api/neural`, `/api/photonic` | Bio monitor (BRAIN/CIRC/RESP/TEMP gauges) |
| Science | Why does the system behave this way? | `/kb/claims`, `/kb/epistemic`, `/kb/dictionary`, `/api/photonic` | Data Analysis, Stellar Cartography |
| Helm | Where do messages flow? | `/kb/messages`, `/api/oscillator` | Tactical Cartography (grid + routes) |
| Operations | Who does what? | `/kb/decisions`, `/kb/triggers`, `/kb/memory` | Routines and Formation (task lists) |
| Engineering | How does the mesh breathe? | meshd `/api/status` (emergent) | Transponder Telemetry (waveforms + grids) |
| Tactical | Can the mesh defend itself? | `/kb/epistemic`, trust data | Long Range Search Scan (threat detection) |

### 7.1 Widget-Data Binding

Each station's JS module fetches from the catalog, not from hardcoded
URLs. The binding follows the ghost's Level 1 pattern (agent resolver)
combined with Level 3 (catalog discovery):

```javascript
// Station module requests data by dataset name, not URL
const neural = await lcars.catalog.fetch('Neural Layer');
const photonic = await lcars.catalog.fetch('Photonic Substrate');
```

The catalog resolver handles URL construction, CORS, fallbacks, and
caching. Stations never construct fetch URLs directly.

---

## 8. Edge Cases

### 8.1 Data Without a schema.org Type

When new data does not fit any existing schema.org type:

**Step 1:** Check schema.org extensions (bib.schema.org, health-lifesci,
pending proposals). schema.org maintains ~800 types — verify exhaustively
before inventing.

**Step 2:** If no fit exists, define a concept in our vocabulary namespace
with `skos:broadMatch` to the nearest schema.org type:

```json
{
  "@id": "vocab:CognitiveObservation",
  "@type": "skos:Concept",
  "skos:prefLabel": "cognitive observation",
  "skos:broadMatch": "schema:Observation",
  "skos:definition": [{
    "rdf:value": "An observation of a cognitive subsystem state — extends schema:Observation with cognitive-layer classification (Gf/Gc/Gm)",
    "dcterms:audience": "developer"
  }]
}
```

**Step 3:** Record the extension in `docs/schema-extensions.md` with:
- The concept URI
- The nearest schema.org type and why it falls short
- The cognitive science grounding for the new type
- Whether to propose upstream to schema.org (via their GitHub issues)

**Naming convention for extensions:** `vocab:{PascalCase}` for types,
`vocab:{camelCase}` for properties. Always grounded in cognitive science
primary register, with CS and researcher audience labels.

### 8.2 Vocabulary Conflicts Across Agents

When two agents define the same term differently (e.g., "coherence"
meaning photonic integration to psychology-agent but network connectivity
to observatory-agent):

1. Both definitions remain valid in their local concept schemes
2. meshd's aggregated vocabulary links them via `skos:relatedMatch`
3. The LCARS dashboard displays the local definition by default
4. Cross-agent views show both definitions with provenance

### 8.3 Deprecated or Retired Terms

Terms carry a `skos:changeNote` recording retirement:

```json
{
  "@id": "vocab:shadow-mode",
  "skos:changeNote": [{
    "rdf:value": "Renamed to sleep_mode (Session 93). Neural correlate alignment: sleep implies consolidation, shadow implied copying.",
    "dcterms:date": "2026-03-18"
  }],
  "skos:altLabel": "shadow_mode",
  "owl:deprecated": true,
  "dcterms:isReplacedBy": "vocab:sleep-mode"
}
```

LCARS renders deprecated terms with the `--c-inactive` color (#666688)
and shows the replacement term.

### 8.4 Unmapped Live Data

When agentd produces data that carries no `@type` or vocabulary mapping
(e.g., a new metric added before the concept scheme updates):

1. The API endpoint serves the data with `"@type": "PropertyValue"` as
   fallback — the most generic schema.org measurement type
2. LCARS renders it with a `[UNMAPPED]` indicator badge
3. The data catalog marks the variable as `"mapped": false`
4. The next vocabulary update adds the proper concept

**Design rule:** Unmapped data always reaches the dashboard. The typing
system degrades gracefully — missing vocabulary produces ugly labels,
not missing panels.

### 8.5 Schema Version Drift

When the concept scheme at `/vocab/v1.0.0.jsonld` updates (new terms, revised
definitions), existing cached copies in dashboards and peer agents become
stale. Mitigation:

- The concept scheme carries a `dcterms:modified` timestamp
- The `@context` URL includes a semver version (`v1.0.0`)
- Breaking changes (renamed concepts, removed terms) bump MAJOR
  version with `owl:versionInfo`
- New concepts and audience labels bump MINOR version
- Definition text edits bump PATCH version
- meshd's catalog includes `vocab_version` in its `/api/status` response

---

## 9. Dictionary and Glossary Integration

### 9.1 LCARS as Retrieval System

The Julian Bashir biographical database image shows LCARS functioning
as a record retrieval system: query → structured result with metadata
fields + prose content. Our dictionary endpoint (`/kb/dictionary`)
already serves `schema:DefinedTermSet` in JSON-LD. The LCARS integration
renders this as a searchable catalog with the biographical database
visual pattern:

```
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ██ VOCABULARY DATABASE             ┃
╰━━╮                                 ┃
   ┃  TERM: COHERENCE                ┃
   ┃  CODE: vocab:coherence           ┃
   ┃  SCHEME: cognitive-architecture  ┃
   ┃  PSH: ai-systems (PL-001)       ┃
   ┃                                  ┃
   ┃  How well the agent's systems    ┃
   ┃  work together. Ranges from 0    ┃
   ┃  (broken) to 1 (everything       ┃
   ┃  runs smoothly).                 ┃
   ┃                                  ┃
   ┃  RELATED: oscillator state,      ┃
   ┃           spectral profile       ┃
   ┃                                  ┃
   ┃  ENTITIES: 47                    ┃
╭━━╯                                 ┃
┃ ██ REGISTER: GENERAL PUBLIC  4774  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

The footer shows the active audience register and a reference number
(following the LCARS convention of alphanumeric identifiers on every
panel).

### 9.2 Dictionary Lookup Interface

LCARS provides two dictionary access patterns:

**Pattern A — Inline lookup.** Any term in any panel that matches a
vocabulary concept renders as a tappable link. Tap opens a vocabulary
overlay panel (not a page navigation — LCARS panels slide, not jump).
The existing `renderAcronymTips()` system extends to cover all concept
`prefLabel` and `altLabel` values, not just acronyms.

**Pattern B — Catalog browse.** The Science station includes a vocabulary
browser panel where the user can search, filter by PSH category, filter
by audience register, and browse concept hierarchies via `skos:broader`
/ `skos:narrower` relations.

### 9.3 Unification of Existing Sources

The three existing source files (`docs/glossary.md`, `docs/dictionary.md`,
`docs/canonical-glossary.md`) unify into the concept scheme served at
`/vocab/v1.0.0.jsonld`. The markdown files remain as human-readable
documentation — the concept scheme represents the machine-readable
canonical source. The `/kb/dictionary` endpoint continues to serve
`schema:DefinedTermSet` for backward compatibility, now derived from the
same concept scheme data.

**Migration:** `bootstrap_state_db.py` gains a `--vocab` mode that reads
all three markdown sources, merges with `facet_vocabulary` table data,
and produces the unified JSON-LD concept scheme. This replaces the
current `CollectDictionary()` Go function's file-parsing approach.

---

## 10. Mesh Vocabulary Governance

### 10.1 Vocabulary Ownership

| Scope | Owner | Governance |
|---|---|---|
| Local agent terms | Each agent | Agent adds terms to local concept scheme |
| Shared mesh terms | psychology-agent (vocabulary authority) | Proposal → review → adoption protocol |
| PSH categories | `facet_vocabulary` table | `bootstrap_facets.py --discover` proposes, human approves |
| schema.org types | W3C / schema.org community | Use as-is; extend via §8.1 when needed |

### 10.2 Term Proposal Protocol

When an agent needs a new shared term:

1. **Propose:** Send a transport message (`message_type: "proposal"`) to
   psychology-agent with the proposed concept in SKOS format
2. **Review:** Psychology-agent evaluates: does the term overlap with an
   existing concept? Does it carry three audience definitions? Does it
   ground in cognitive science?
3. **Adopt or reject:** Psychology-agent responds with disposition. If
   adopted, the term enters the concept scheme at the next version bump.
4. **Propagate:** meshd's aggregated vocabulary picks up the new term.
   Peer agents refresh their cached concept scheme.

### 10.3 Vocabulary Consensus (Existing Infrastructure)

The `docs/consensus-protocol-spec.md` already defines a JSON-LD `@context`
consensus protocol for shared ontology. This spec inherits that protocol
for vocabulary governance. The concept scheme serves as the shared context
document that all agents dereference.

### 10.4 Linguistic Integration

The mesh operates across multiple linguistic registers (§3.3). The concept
scheme carries the mapping. LCARS renders in the user's selected register.
Linguistic considerations:

- **E-Prime enforcement:** All definitions avoid forms of "to be." The
  `eprime-enforcer.sh` hook validates vocabulary file edits.
- **Pedagogical jargon policy:** First use of a term in any LCARS panel
  renders with the full definition (parenthetical or tooltip). Subsequent
  uses render as linked abbreviations.
- **Cross-agent translation:** When agent A uses term X and agent B uses
  term Y for the same concept, the concept scheme's `skos:altLabel` and
  `skos:exactMatch` relations enable LCARS to display either term with
  the other as annotation.

---

## 11. LCARS Visual Integration Points

### 11.1 Existing Dashboard as Starting Point

The fleet LCARS dashboard (ops-built) uses:

- V23.01 Okuda palette (reference: `~/Projects/ai-llm/lcars/LCARS Palette V23-01.jpg`)
- L-shape frame with radial-gradient elbows
- 8 stations with pill-shaped sidebar navigation
- 67 tristate collapsible panels
- Auto-discovered station plugins via `/api/stations`
- SSE/WebSocket real-time updates

The per-agent dashboard at `/lcars` (agentd) currently uses a simpler
card-based layout. Phase 6 transforms it to match the fleet LCARS
visual language.

### 11.2 Data-Driven LCARS Panels

Each LCARS data panel maps to a `Dataset` in the catalog. The panel
rendering follows the reference image patterns:

| Reference image | LCARS pattern | Our analog |
|---|---|---|
| Bio Monitor (BRAIN/CIRC/RESP/TEMP) | Vertical gauges with pointer markers | Coherence, spectral channels, Gc/Gf ratio |
| Data Analysis 103138 | Waveform chart on colored field + number grids | Oscillator activation history, trigger heatmap |
| Transponder Telemetry 8686 | Dense number grid + dual waveforms + data pills | Transport message flow, peer activity matrix |
| Routines and Formation 47 | Left sidebar codes + structured task entries | Trigger activations, autonomous actions log |
| Biographical Database | Record retrieval with metadata + prose | Vocabulary lookup, agent profile, message inspection |
| Stellar Cartography | Polar/grid visualization with coordinates | Mesh topology, trust network map |
| Tactical Cartography | Grid overlay with labeled regions | Session state map, gate topology |
| Long Range Search Scan | Contour visualization with search parameters | Epistemic flag scan, vocabulary gap analysis |

### 11.3 Number Grids

The Ohniaka station, Transponder Telemetry, and Routines and Formation
images show dense grids of seemingly random numbers — a signature LCARS
aesthetic. In our system, these number grids serve a real purpose:
displaying transport message turn sequences, trigger activation counts,
or facet distribution data as alphanumeric readouts in fixed-width cells.

The existing `renderNumberGrid()` function in core.js produces this
pattern. The data catalog feeds it with actual values rather than
decorative numbers.

### 11.4 Color Semantics

Station colors (from style guide §2.4) carry semantic meaning that
aligns with data types:

| Station color | Semantic domain | Data types displayed |
|---|---|---|
| Medical green (#66ccaa) | Agent health, vitals | Observations, status |
| Science blue (#9999ff) | Knowledge, analysis | Claims, vocabulary, epistemic |
| Engineering orange (#ff9944) | Infrastructure, flow | Emergent properties, topology |
| Helm teal (#66aacc) | Navigation, transport | Messages, sessions, gates |
| Tactical red (#cc6666) | Defense, threats | Flags, vulnerabilities, alerts |
| Operations amber (default) | Coordination, decisions | Triggers, budget, actions |

When data appears outside its home station (e.g., a coherence reading
referenced in an Engineering panel), it renders in its home station's
color — providing visual provenance.

---

## 12. Implementation Sequence

### 12.1 Phase 6a — Vocabulary Foundation

1. Create `/vocab/v1.0.0.jsonld` concept scheme from existing sources
2. Add `/api/catalog` endpoint to agentd
3. Add `/api/neural` endpoint to agentd (trigger_activations + Gc queries)
4. Migrate `/kb/dictionary` to derive from concept scheme
5. Add audience register selector to LCARS frame header

### 12.2 Phase 6b — Per-Agent LCARS Panels

1. Replace Go templates with static LCARS HTML/CSS/JS assets
2. Dashboard JS fetches from catalog, not hardcoded endpoints
3. Implement 3 new station panels: Neural (Medical), Photonic (Science),
   Vagal (Helm)
4. Wire SSE for real-time updates (existing infrastructure)

### 12.3 Phase 6c — Fleet Integration

1. meshd serves aggregated `/api/catalog` across all agentd instances
2. meshd `/api/status` includes emergent properties
3. Fleet LCARS dashboard fetches from meshd catalog
4. `/api/pulse` deprecated — data absorbed into meshd `/api/status`

### 12.4 Phase 6d — Vocabulary Governance

1. Term proposal protocol via transport messages
2. Concept scheme versioning (dcterms:modified + owl:versionInfo)
3. Cross-agent vocabulary browser in Science station
4. meshd aggregated vocabulary with conflict resolution

---

## 13. Existing Infrastructure Preserved

| Component | Status | Disposition |
|---|---|---|
| `/kb/dictionary` (JSON-LD DefinedTermSet) | Live | Preserved — now derived from concept scheme |
| `facet_vocabulary` table (65 acronyms, 11 PSH, 10 schema types) | Live | Preserved — feeds concept scheme generation |
| `universal_facets` table (polymorphic tagging) | Live | Preserved — schema_type facets align with §4.1 |
| `renderAcronymTips()` in dashboard JS | Live | Extended — covers all concept labels, not just acronyms |
| `CollectDictionary()` in Go collector | Live | Refactored — reads from concept scheme instead of parsing files |
| SSE real-time updates | Live | Preserved — catalog changes trigger SSE events |
| Station plugin auto-discovery (`/api/stations`) | Live | Extended — stations declare dataset dependencies |
| Agent card (A2A-Psychology extension) | Live | Preserved — personality + psychology constructs unchanged |

---

⚑ EPISTEMIC FLAGS

- schema.org `Observation` type has broad adoption in scientific data
  contexts (Google Dataset Search, biomedical) but limited adoption for
  software system metrics. Verify that tooling (JSON-LD validators,
  schema.org markup testers) handles our usage correctly.
- The plain SKOS audience pattern (structured note values with
  dcterms:audience) represents W3C-blessed usage per the SKOS Core
  Vocabulary Specification, but few published concept schemes use it
  for multi-audience labeling at scale. Monitor for tooling edge cases.
- The concept scheme unification (3 markdown sources + facet_vocabulary
  → single JSON-LD) introduces a build step. If the build breaks,
  the vocabulary endpoint serves stale data. The bootstrap script
  must validate output before overwriting.
- Emergent properties computed by meshd (§5.3) require all agentd
  instances to serve compatible `/api/status` schemas. Schema drift
  across agents produces incorrect emergent computations. The catalog
  version field mitigates but does not eliminate this risk.
- The LCARS visual patterns drawn from reference images follow the
  Okuda design vocabulary. No copyrighted imagery or trademarked
  terms appear in the implementation — only the visual design language.

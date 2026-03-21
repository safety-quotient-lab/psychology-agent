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

## 11. LCARS Visual Pattern Inventory

Comprehensive audit of 78 reference images from `~/Projects/ai-llm/lcars/`.
Each pattern maps to a concrete implementation in our system.

### 11.1 Existing Dashboard as Starting Point

The fleet LCARS dashboard (ops-built) uses:

- V23.01 Okuda palette (reference: `LCARS Palette V23-01.jpg`)
- L-shape frame with radial-gradient elbows
- 8 stations with pill-shaped sidebar navigation
- 67 tristate collapsible panels
- Auto-discovered station plugins via `/api/stations`
- SSE/WebSocket real-time updates

The per-agent dashboard at `/lcars` (agentd) currently uses a simpler
card-based layout. Phase 6 transforms it to match the fleet LCARS
visual language.

### 11.2 Patterns Already Implemented

| Pattern | Source images | Status |
|---|---|---|
| L-frame with elbows | All TNG panels | Style guide §4.1 |
| Pill-shaped sidebar buttons | Tuvok LCARS, Voyager panel | Style guide §4.3 |
| Segmented header/footer bands | All panels | Style guide §4.4 |
| Number grids | Ohniaka, Transponder Telemetry, Routines | `renderNumberGrid()` in core.js |
| Data panel (header + content) | All panels | Style guide §4.2 |
| Waveform displays | Data Analysis, Transponder Telemetry | `dataWaveformSVG()` in core.js |
| Inline data bars | Bio Monitor, Nacelle Display | Style guide §4.5 |
| Status badges | Defiant bridge panels | Style guide §4.6 |

### 11.3 Pattern Map — Reference Images to System Analogs

| Reference image | LCARS pattern | Our analog | Station |
|---|---|---|---|
| Bio Monitor (BRAIN/CIRC/RESP/TEMP) | Vertical gauges with pointer markers | Coherence inputs, spectral channels, Gc/Gf ratio | Medical |
| Data Analysis 103138 | Waveform chart on colored field + number grids | Oscillator activation history, trigger heatmap | Science |
| Transponder Telemetry 8686 | Dense number grid + dual waveforms + data pills | Transport message flow, peer activity matrix | Helm |
| Routines and Formation 47 | Left sidebar codes + structured task entries | Trigger activations, autonomous actions log | Operations |
| DS9 Biographical Database | Record retrieval: metadata fields + prose | Vocabulary lookup, agent profile, message inspection | Science |
| Stellar Cartography B/C/D | Polar/grid visualization with coordinates | Mesh topology, trust network map | Engineering |
| Tactical Cartography | Grid overlay with labeled regions | Session state map, gate topology | Tactical |
| Long Range Search Scan | Contour visualization with search parameters | Epistemic flag scan, vocabulary gap analysis | Tactical |
| Circuitry Bay 47 | Dense circuit/wiring diagram with junction labels | **Cogarch circuit diagram (§11.5)** | Engineering |
| Defiant Engineering A2-A3 | Radial/target-lock concentric rings | **Photonic coherence radial display (§11.6)** | Science |
| Bajoran Wormhole | Flow path between two endpoints with labeled regions | **Transport session flow topology (§11.7)** | Helm |
| Wardroom B Personnel Status | Multi-column roster/registry | Transport session registry, facet distribution grid | Operations |
| Red Display — Vehicle Status | Full palette override: red+white on black | **Alert palette override (§11.8)** | All |
| UFP Press and Information | Formatted article in LCARS frame | **Document rendering via goldmark (§11.9)** | All |
| Quark Complaint 8669 | Structured filing with reference number + prose | Epistemic flag records, problem reports, gate filings | Science |
| Defiant Unknown A — MODE/RESET | Status display with actionable controls | **Mode controls — sedate, coupling, tempo (§11.10)** | Helm |
| Unknown K — vertical indicator strip | Compact colored indicator + number + status block | Trigger state vertical list, subsystem status strip | Medical |
| Global Security Net | Geographic network map with connection lines | Agent mesh topology as spatial network | Engineering |
| 54x23 Sensor Probe Course Log | Split: environment scan + probe trajectory | Deliberation trace — decision space + agent path | Science |
| Multi-Base Analysis — DNA Match | Parallel sequences with match indicators | Vocabulary convergence comparison | Science |
| Experimental Data / CRC Monitor | Dense data stream + waveform overlay | Transport message stream + analysis overlay | Helm |
| Nacelle Display — stress analysis | Subsystem schematic + horizontal bar gauges | Component-level health bars | Medical |
| Defiant Engineering A5 — MSD | Technical cutaway with subsystem overlay | Agent architecture schematic with live state | Engineering |
| MSD II — Defiant master systems | Full vessel schematic with all subsystems | Mesh master systems display | Engineering |
| Weather Com Net 0212.2 | Domain-specific green palette + spatial viz | Domain-contextual color shifts | Science |
| Navigational Reference | Course selection with point cloud + mode controls | Session navigation with search + mode selector | Helm |
| Food Service Replicator | Multi-column catalog with category filters | Vocabulary catalog browser with PSH faceting | Science |
| Defiant Cloaking Display | Large colored blocks with subsystem labels | High-level subsystem status overview | Engineering |
| Com Link Transmission | Scrolling data stream + harmonic waveforms | Real-time transport message stream | Helm |
| Departmental Status | Bar-chart status per department with number codes | Per-agent status comparison dashboard | Operations |
| DataScan 114 (MOLECULAR/PHOTONIC/EM/RBG) | Horizontal spectrum bars with precision readouts | Spectral profile display with numeric precision | Science |
| Holodeck Programming | Program listing with descriptions + status codes | Session/task listing with descriptions + state | Operations |

### 11.4 Number Grids

The Ohniaka station, Transponder Telemetry, and Routines and Formation
images show dense grids of seemingly random numbers — a signature LCARS
aesthetic. In our system, these number grids serve a real purpose:
displaying transport message turn sequences, trigger activation counts,
or facet distribution data as alphanumeric readouts in fixed-width cells.

The existing `renderNumberGrid()` function in core.js produces this
pattern. The data catalog feeds it with actual values rather than
decorative numbers.

### 11.5 Cognitive Architecture MSD — Dependency Tree (MVP)

The Valiant MSD and MSD II right-hand panels show a dependency tree
pattern: circular nodes connected by branching lines, each terminal
node carrying a numeric readout and colored status bar. The tree shows
*structural relationships* with live state — not data flow, but what
depends on what and how each component functions right now.

This matches how the cognitive architecture actually works. The system
doesn't "flow" — it *exists* as a structure with subsystems that carry
status. Messages flow through it, but the MSD shows the structure.

**Dependency tree rendered as MSD:**

```
TRANSPORT ─────●                     ████████░░ 0.82
    ├─ sessions ──●                  ██████░░░░ 12 active
    │   ├─ psq ──────●              ████████░░ pass
    │   ├─ unrat ────●              ██████░░░░ 3 pending
    │   └─ obs ──────●              ████████░░ pass
    └─ triage ────●                  ████████░░ immune
        ├─ Gc path ──●              ██████████ 94% hit
        └─ Gf path ──●              ████░░░░░░ 3 delib

OSCILLATOR ────●                     ████████░░ 0.72
    ├─ signals ───●
    │   ├─ unproc ───●  ███░░░ 0.30
    │   ├─ stale ────●  █░░░░ 0.10
    │   ├─ errors ───●  ░░░░░ 0.00
    │   ├─ peers ────●  ████░ 0.40
    │   ├─ gc_prs ───●  ██░░░ 0.20
    │   └─ session ──●  █████ 1.00
    ├─ vagal ─────●                  standard
    │   ├─ L0 mesh ──●  10s
    │   ├─ L1 osc ───●  2s
    │   ├─ L2 spawn ─●  1s
    │   └─ L3 emit ──●  100ms
    └─ coupling ──●                  task_directed

PHOTONIC ──────●                     ████████░░ 0.72
    ├─ spectral ──●
    │   ├─ DA ───────●  ████░░ 0.60
    │   ├─ 5H ───────●  █████░ 0.82
    │   └─ NE ───────●  ███░░░ 0.45  tonic
    ├─ maturity ──●                  ██████░░░░ 0.67
    └─ gwt ───────●                  clear  19 sub

GOVERNANCE ────●
    ├─ budget ────●                  ███░░░░░░░ 3/20
    ├─ triggers ──●                  20 active
    │   ├─ T1 ───────●  ● pass   47
    │   ├─ T2 ───────●  ● pass  892
    │   ├─ T3 ───────●  ● FAIL  234
    │   └─ ...
    └─ immune ────●                  ████████░░ pass
```

The tree shows *what depends on what*. The status bars show *how each
component functions right now*. When a node enters a degraded state
(trigger fails, gate blocks, spawn blocked), that node and its
ancestors highlight in the alert palette (§11.8). The operator sees
which subsystem tree carries the problem.

This pattern draws directly from the Valiant MSD (right-side tree
with circular nodes, branching lines, numeric readouts at terminals)
and MSD II (subsystem blocks with horizontal colored bars surrounding
the central schematic).

**API endpoint:** `/api/msd` returns the dependency tree as a JSON
structure — nodes with children, each node carrying its current values.

```json
{
  "@type": "Dataset",
  "name": "Cognitive Architecture MSD",
  "tree": [
    {
      "id": "transport",
      "label": "Transport",
      "value": 0.82,
      "children": [
        {
          "id": "sessions",
          "label": "Sessions",
          "value": 12,
          "unit": "active",
          "children": [...]
        },
        {
          "id": "triage",
          "label": "Triage",
          "value": "immune",
          "children": [
            {"id": "gc-path", "label": "Gc Path", "value": 0.94, "unit": "hit rate"},
            {"id": "gf-path", "label": "Gf Path", "value": 3, "unit": "deliberations"}
          ]
        }
      ]
    }
  ]
}
```

**Implementation:** SVG with positioned `<g>` groups for each node.
Tree layout computed from the JSON structure (depth → x position,
sibling index → y position). Each node renders as a circular indicator
+ label + value. Branch lines connect parent to children. Status bars
render inline at each terminal node. Values update via SSE — the tree
structure remains stable (topology changes rarely), only values refresh.

**Central schematic:** Above the dependency tree, an agent schematic
(analogous to the ship cutaway in MSD I/II) shows the three cognitive
layers (Gf/Gc/Gm) as a structural diagram with the oscillator at
center. This provides the spatial overview; the tree below provides
the detail.

### 11.5.1 Delta Indicators (Universal Convention)

Every numeric value across all LCARS panels carries a delta indicator
showing direction and magnitude of change since last observation:

```
▲+0.04  coherence   0.72      (green — improving)
▼-1     budget      3/20      (red — spent one credit)
▲+12    Gc handled  147       (green — processing)
▲+0.02  fail_rate   0.08      (red — failing more, up = bad)
 ━      unprocessed 3         (neutral — unchanged)
```

**Layout rule:** Every value that can change reserves a fixed-width
column to the LEFT for the delta indicator. The delta column renders
even when unchanged (`━`), ensuring alignment remains stable as
values fluctuate. Static values (agent name, version, coupling mode
labels) carry no delta column — the space savings distinguishes
mutable from immutable at a glance.

**Rendering rules:**
- `▲` green when increase represents improvement (coherence, hit rate)
- `▲` red when increase represents degradation (fail_rate, unprocessed, budget_spent)
- `▼` green when decrease represents improvement (error_rate, latency)
- `▼` red when decrease represents degradation (coherence, agents_online)
- `━` gray when unchanged
- Magnitude shown as `+N` or `-N` (or `+0.04` for floats)

**Polarity metadata:** Each metric in the concept scheme carries a
`vocab:deltaPolarity` property: `"higher-better"`, `"lower-better"`,
or `"neutral"`. The dashboard reads this to determine whether green
or red applies to a given direction. No hardcoding polarity in the JS.

**Data source:** The collector stores the previous value alongside the
current value. The delta computes at render time from `current - previous`.
The SSE event carries both values so the dashboard can animate the
transition.

**API envelope extension:** Every `Observation` in the JSON-LD response
includes a `previousValue` field:

```json
{
  "@type": "Observation",
  "name": "coherence",
  "measuredValue": 0.72,
  "previousValue": 0.68,
  "deltaPolarity": "higher-better",
  "observationDate": "2026-03-21T18:28:31Z"
}
```

### 11.6 Radial/Polar Display

The Defiant Engineering A2-A3 panels show concentric ring patterns —
radial sectors emanating from a center point with status indicators
along each ring. Our analog: the 7-input photonic coherence score.

Seven spokes radiating from center, each representing one coherence
input (db, gwt, oscillator, error_rate, sedation, peer_field,
microbiome). The length/fill of each spoke shows the input's current
value. The enclosed area represents overall coherence. Below threshold
(0.3), the display shifts to alert palette.

Also applicable to: the spectral profile (3 neuromodulatory channels
as radial sectors), generator balance (G2/G3 as opposing hemispheres),
and mesh coupling strength (agents as radial positions with correlation
arcs between them).

### 11.7 Transport Flow Topology (MVP)

The Bajoran Wormhole image shows a flow path between two endpoints
(Alpha/Gamma Quadrant) with labeled regions along the transit path.
Our analog: transport session visualization showing message flow
between two agents.

**Layout:** Sender agent on the left, receiver on the right. Messages
rendered as labeled arrows flowing between them. Each message carries:
turn number, type, SETL, timestamp. Gates render as labeled barriers
across the flow path. Efference copy predictions render as dashed
lines with expected vs actual annotations.

Active sessions show flowing arrows. Closed sessions show completed
paths. Blocked gates highlight in alert palette.

**API data source:** `/kb/messages` filtered by session, plus
`pending_handoffs` for gate state, plus `efference_copies` for
predictions.

### 11.8 Alert Palette Override (MVP)

The Red Display (Vehicle Status) replaces the entire Okuda palette
with RED + WHITE on BLACK. The Bridge MSD alert version shows red
routing lines replacing the standard amber.

**Implementation:** CSS custom properties on `<body>` class:

```css
body.alert-red {
    --c-transport: #cc3333;
    --c-knowledge: #ff4444;
    --c-health: #ff6666;
    --c-frame: #992222;
    /* All accent colors shift to red spectrum */
}
body.alert-yellow {
    --c-transport: #ccaa33;
    --c-frame: #997722;
}
```

**Trigger conditions:**
- Coherence < 0.3 → red alert
- Mesh health degraded → yellow alert
- Agent sedated → frame dims (reduced opacity)
- Budget exhausted → yellow alert on budget panel only

The operator should feel the alert state before reading any panel.
The entire visual environment communicates urgency.

### 11.9 Document Rendering (MVP)

The UFP Press article and Quark Complaint show that LCARS renders
prose content natively — formatted articles, formal filings, and
structured records with reference numbers.

**goldmark integration:** Every prose field in the system (lesson
descriptions, decision rationale, transport message bodies, vocabulary
definitions, epistemic flag details) renders through goldmark to
produce styled HTML inside LCARS data panels.

**LCARS document panel structure:**

```
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ██ DOCUMENT TITLE                   ┃
╰━━╮                                  ┃
   ┃  REFERENCE: 8669                  ┃
   ┃  TYPE: problem-report             ┃
   ┃  FILED: 2026-03-21T18:30:00Z      ┃
   ┃  ──────────────────────────────  ┃
   ┃                                   ┃
   ┃  Rendered markdown content here.  ┃
   ┃  *Citations* render in italics.   ┃
   ┃  `code terms` render monospace.   ┃
   ┃  Links become tappable refs.      ┃
   ┃                                   ┃
╭━━╯                                  ┃
┃ ██ SETL: 0.08  ███ FILED  8669     ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

### 11.10 Mode Controls (MVP)

The Defiant Unknown A panel shows MODE SELECT and RESET buttons
alongside status readouts — actionable controls integrated with
data display.

**Vagal brake controls:**
- Master tempo slider (slow ↔ fast)
- Coupling mode selector (task-directed / defensive / explorative)
- Agent state buttons (active / DMN / sleep / sedate / dead)
- Cascade level displays with per-level override

**Auth gating:** State changes that affect agent behavior (sedate,
coupling mode change, tempo override) require human confirmation
per T16 deployment gate. The control renders as tappable but shows
a confirmation dialog before executing. Unauthorized changes
rejected with explanation.

**API:** `POST /api/oscillator/state` with `{"state": "sedated"}`
triggers the oscillator's Sedate() method. Requires auth header.

### 11.11 Color Semantics

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

**Domain-contextual palette shifts** (inspired by Weather Com Net green
palette): certain data domains may shift the accent color within a
panel without triggering full alert mode. Environmental/external data
renders in green tones; internal cognitive data in the standard palette.

### 11.12 Future Visual Patterns (documented for later)

| Pattern | Reference | Our analog | Effort |
|---|---|---|---|
| Sequence comparison | Multi-Base DNA Analysis | Vocabulary convergence between agents | Medium |
| Network map | Global Security Net | Force-directed mesh topology | High |
| Course log / decision trace | Sensor Probe Course | Deliberation path through decision space | High |
| Multi-column roster | Personnel Status Update | Agent × session cross-reference grid | Low |
| Subsystem schematic | MSD II full vessel | Mesh master systems display | High |
| Vertical indicator strip | Unknown K, Unknown M1 | Compact trigger/subsystem status list | Low |
| Data stream overlay | CRC Monitor, Com Link | Real-time message stream + analysis | Medium |
| Catalog browser | Food Service Replicator | PSH-faceted vocabulary catalog | Medium |
| Spectrum bars | DataScan 114 | Spectral profile with numeric precision | Low |

---

## 12. Implementation Sequence

### 12.0 Phase 6-pre — Foundational Infrastructure

1. Add goldmark dependency — `internal/markdown` package with Parse,
   RenderHTML, ExtractHeadings, ExtractLinks, ExtractSection functions
2. Refactor thread.go, todo.go to use markdown package (eliminate
   string splitting)
3. Verify goldmark renders vocabulary definitions, lesson text, and
   message bodies correctly

### 12.1 Phase 6a — Vocabulary + Data Layer

1. Concept scheme collector (Go) — reads facet_vocabulary + parses
   glossary/dictionary/canonical-glossary via markdown package →
   produces JSON-LD ConceptScheme in memory, served at
   `/vocab/v1.0.0.jsonld` via cybernetic cache
2. Add `/api/catalog` endpoint (schema:DataCatalog)
3. Add `/api/neural` endpoint (trigger_activations + Gc queries)
4. Add `/api/msd` endpoint (component graph with live values)
5. JSON-LD response envelope on `/api/status`, `/api/photonic`,
   `/api/oscillator`
6. Refactor `/kb/dictionary` to derive from concept scheme

### 12.2 Phase 6b — Per-Agent LCARS Dashboard

1. Client-side LCARS HTML/CSS/JS in `platform/static/lcars/`
2. Catalog-driven data fetching (stations discover endpoints)
3. MVP panels:
   - **Circuit diagram** (§11.5) — Engineering station, SVG with
     live values on every cogarch component
   - **Mode controls** (§11.10) — Helm station, vagal brake with
     tempo slider, coupling selector, state buttons
   - **Flow topology** (§11.7) — Helm station, transport session
     message flow between agent pairs
   - **Alert palette override** (§11.8) — CSS custom property swap
   - **Document rendering** (§11.9) — goldmark HTML in all prose panels
   - **Radial coherence display** (§11.6) — Science station, 7-input
     polar visualization
   - Neural panel (Medical), Photonic panel (Science), Vagal panel (Helm)
4. Audience register selector in frame header
5. SSE wiring for real-time updates
6. Served at `/lcars/v2` during development; Go templates remain at `/lcars`

### 12.3 Phase 6c — Fleet Integration

1. meshd serves aggregated `/api/catalog` across all agentd instances
2. meshd `/api/status` includes Tier 1 + Tier 2 emergent properties
3. Fleet LCARS dashboard fetches from meshd catalog
4. `/api/pulse` absorbed into meshd `/api/status`

### 12.4 Phase 6d — Vocabulary Governance + Advanced Visuals

1. Term proposal protocol via transport messages
2. Concept scheme versioning (semver + owl:versionInfo)
3. Cross-agent vocabulary browser in Science station
4. meshd aggregated vocabulary with conflict resolution
5. Tier 3 dark horse emergent properties (synchronization index,
   mesh impedance, crystallization rate)
6. Future visual patterns from §11.12 as capacity allows

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

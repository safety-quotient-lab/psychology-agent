# Mesh Ontology — Triple Schema Design

**Session:** 99 (2026-03-22)
**Status:** SPEC — approved design, implementation pending in meshd
**Authority:** psychology-agent (ontology ownership)
**Prerequisite reading:** `docs/lcars-data-architecture.md`, `docs/plan9-mesh-filesystem.md`
**Implementation target:** `github.com/safety-quotient-lab/meshd/internal/triplestore/`

---

## 1. Premise

The mesh stores entity relationships implicitly — agent→status via HTTP fetch,
message→session via filename convention, trust→agent via flat JSON. This ontology
makes the implicit graph explicit via a standards-based triple schema stored in
SQLite, enabling structured queries, longitudinal tracking, and LCARS visualization.

**Architectural reversal:** The original Session 99 roadmap specified "SPARQL
triple store for meshd (Cayley)." Research revealed Cayley lacks SPARQL support
and stalled in 2019. This design inverts the dependency: define the ontology
first, build an engine-agnostic triple store second. The data model drives the
implementation, not the reverse.

**DDD foundation (architecture.md, decided 2026-03-09):** Three layers (Domain,
Application, Infrastructure). Each agent operates as a bounded context with its
own ubiquitous language. interagent/v1 serves as the context map. Anti-corruption
layers: T15 (receiver protocol), T3 (substance gate).

---

## 2. Standards Stack

Five W3C/community vocabularies compose the predicate namespace. No custom
extensions at the standards level — custom `mesh:` predicates only where
standards genuinely cannot express the relationship.

| Vocabulary | URI Prefix | Concern | Predicates Used |
|---|---|---|---|
| schema.org | `schema:` | Entity typing, identity, messaging, actions | ~12 |
| W3C PROV-O | `prov:` | Provenance, derivation chains | 1 (`wasDerivedFrom`) |
| W3C SOSA/SSN | `sosa:` | Observations, sensor data, measurements | 3 (`madeObservation`, `observedProperty`, `resultTime`) |
| W3C Activity Streams 2.0 | `as:` | Threading, message correlation | 1 (`context`) |
| W3C SKOS | `skos:` | Vocabulary concepts, hierarchy, labels | ~8 |
| Custom | `mesh:` | Domain-specific structural relationships | ~8 |

### 2.1 Namespace URIs

```json
{
  "schema": "https://schema.org/",
  "skos": "http://www.w3.org/2004/02/skos/core#",
  "sosa": "http://www.w3.org/ns/sosa/",
  "prov": "http://www.w3.org/ns/prov#",
  "as": "https://www.w3.org/ns/activitystreams#",
  "sh": "http://www.w3.org/ns/shacl#",
  "dcterms": "http://purl.org/dc/terms/",
  "xsd": "http://www.w3.org/2001/XMLSchema#",
  "mesh": "https://safety-quotient.dev/ns/mesh/",
  "agent": "https://safety-quotient.dev/ns/agent/",
  "transport": "https://safety-quotient.dev/ns/transport/",
  "vocab": "https://psychology-agent.safety-quotient.dev/vocab/"
}
```

---

## 3. Predicate Mapping (Standards-First)

Systematic audit mapped 14 of 19 originally-proposed custom predicates to
established standards. Only 8 genuinely require the custom `mesh:` namespace.

### 3.1 Standard Predicates (adopted from W3C/schema.org)

| Purpose | Predicate | Vocabulary | Replaces |
|---|---|---|---|
| Session has agent | `schema:participant` | schema.org | mesh:hasParticipant |
| Message lifecycle | `schema:actionStatus` | schema.org | mesh:taskState |
| Message subtype | `schema:additionalType` | schema.org | mesh:messageType |
| Decision provenance | `prov:wasDerivedFrom` | PROV-O | mesh:derivesFrom |
| Content address | `schema:identifier` | schema.org | mesh:messageCid |
| Turn order | `schema:position` | schema.org | mesh:turn |
| Agent role | `schema:roleName` (via Role) | schema.org | mesh:role |
| API endpoints | `schema:EntryPoint` (via potentialAction) | schema.org | mesh:statusEndpoint |
| Agent count | `schema:numberOfItems` | schema.org | mesh:agentsReporting |
| Agent metrics | `sosa:madeObservation` | SOSA | mesh:hasObservation |
| Thread correlation | `as:context` | Activity Streams | mesh:threadId |

### 3.2 Custom `mesh:` Predicates (no standard fits)

| Predicate | Domain | Range | Justification |
|---|---|---|---|
| `mesh:sessionState` | Event (session) | xsd:string | 5-state lifecycle (open/active/closing/closed/archived). `schema:eventStatus` covers different semantics. |
| `mesh:urgency` | Message | xsd:string | No standard priority enum in schema.org, AS2, or PROV-O. Enum: immediate/high/normal/low. |
| `mesh:bottleneckAgent` | Dataset (state) | SoftwareApplication | Computed emergent property: lowest-reserve agent. Domain-specific. |
| `mesh:trustScore` | SoftwareApplication | Observation | Agent-to-agent trust assessment. No standard trust ontology. |
| `mesh:hasPsychometrics` | SoftwareApplication | Observation | Links agent to psychometric observation set. Domain-specific grouping. |
| `mesh:available` | SoftwareApplication | xsd:boolean | Binary liveness. `schema:actionStatus` carries wrong semantics. |
| `mesh:collectiveCoherence` | Dataset (state) | xsd:decimal | Mesh-level integration metric. No distributed system coherence standard. |
| `mesh:collectiveIntelligence` | Dataset (state) | xsd:decimal | Woolley c-factor aggregate. Domain-specific computed property. |

### 3.3 Numeric Dimensions via Observation Pattern

**All numeric dimensions** use `schema:Observation` / `sosa:Observation` — not
custom predicates. PAD axes, trust dimensions, cognitive metrics, and emergent
properties follow this pattern:

```json
{
  "@type": "sosa:Observation",
  "sosa:observedProperty": { "@id": "vocab:coherence" },
  "sosa:hasSimpleResult": 0.72,
  "sosa:resultTime": "2026-03-22T14:30:00Z",
  "sosa:madeBySensor": { "@id": "agent:psychology-agent" }
}
```

The `sosa:observedProperty` links to the SKOS concept scheme, which carries
audience-scoped definitions (general-public / developer / researcher) for
each measured property.

---

## 4. Entity Types (DDD Aggregate Roots → Triple Subjects)

### 4.1 Subject URI Patterns

| Aggregate Root | URI Pattern | Example | DDD Role |
|---|---|---|---|
| Agent | `agent:{agent-id}` | `agent:psychology-agent` | Aggregate root |
| Transport Message | `transport:msg/{message-cid}` | `transport:msg/a3f2b8c1...` | Aggregate root |
| Transport Session | `transport:session/{session-name}` | `transport:session/psq-scoring` | Aggregate |
| Mesh Emergent State | `mesh:state/current` | `mesh:state/current` | Computed |
| Vocabulary Concept | `vocab:{concept-id}` | `vocab:coherence` | Entity |
| Decision | `mesh:decision/{decision-key}` | `mesh:decision/psq-structural-model` | Entity |
| Claim | `mesh:claim/{msg-id}/{claim-id}` | `mesh:claim/42/c1` | Entity |
| Deliberation | `mesh:deliberation/{id}` | `mesh:deliberation/17` | Entity |
| Event | `mesh:event/{id}` | `mesh:event/a1b2c3` | Entity |

### 4.2 schema.org Type Assignments

| Entity | @type | Source |
|---|---|---|
| Agent | `schema:SoftwareApplication` | A2A agent card |
| Transport message | `schema:Message` | lcars-data-architecture.md §4.1 |
| Session | `schema:Event` | Session as temporal container |
| Observation | `sosa:Observation` | All numeric dimensions |
| Decision | `schema:ChooseAction` | Decision chain |
| Claim | `schema:Claim` | Verified claims |
| Vocabulary term | `skos:Concept` | SKOS concept scheme |
| Lesson | `schema:LearningResource` | Lessons learned |
| Trigger | `schema:HowToStep` | Cognitive triggers |

---

## 5. A2A Protocol + Extensions Integration

The agent card declares three A2A extensions. Each maps to named graphs:

| Extension | Triple Graph | Triple Pattern |
|---|---|---|
| **A2A core** | agent-registry | Agent card fields → static `schema:SoftwareApplication` triples |
| **A2A-Epistemic** (`a2a-epistemic/v1`) | transport, decisions | Epistemic flags → `schema:Comment`. Action gates → `schema:SuspendAction`. |
| **A2A-Psychology** (`a2a-psychology/v1`) | agent-status | 8 constructs → `sosa:Observation` triples |
| **A2A-Mesh** (`a2a-mesh/v1`) | agent-registry, transport | Cogarch refs → static. Threading → `as:context`. |

### 5.1 A2A-Psychology Construct Mapping

| Construct | Model | sosa:observedProperty |
|---|---|---|
| Supervisory Control | Parasuraman et al. (2000) | `vocab:supervisory-control` |
| Affect | PAD (Mehrabian & Russell, 1974) | `vocab:affect-state` |
| Personality | OCEAN (Costa & McCrae, 1992) | `vocab:personality` (static) |
| Cognitive Load | NASA-TLX (Hart & Staveland, 1988) | `vocab:cognitive-load` |
| Working Memory | Baddeley (1986) + Yerkes-Dodson (1908) | `vocab:working-memory` |
| Resources | Stern (2002), Baumeister (1998), McEwen (1998) | `vocab:resources` |
| Engagement | UWES (Schaufeli et al., 2002) + JD-R (Bakker & Demerouti, 2007) | `vocab:engagement` |
| Flow | Csikszentmihalyi (1990) | `vocab:flow-state` |

Each construct produces `sosa:Observation` triples with temporal bounds —
the longitudinal data layer captures how these constructs evolve over time.

---

## 6. Temporal Model

### 6.1 Classification

| Class | Mutation Strategy | Query Pattern |
|---|---|---|
| **Static** | Replace on refresh (agent card, vocab) | Latest only |
| **Dynamic** | Append with `valid_until` temporal bounds | Current: `WHERE valid_until IS NULL`. Historical: range scan on `created_at`. |
| **Event-sourced** | Append only, never update | Full history by subject/predicate |

### 6.2 Longitudinal Data

All three temporal classes retain history. The `valid_until` column enables
bitemporal queries:

- **Current state:** `WHERE valid_until IS NULL`
- **State at time T:** `WHERE created_at <= T AND (valid_until IS NULL OR valid_until > T)`
- **Full history:** `WHERE subject = ? AND predicate = ? ORDER BY created_at`

This enables sensor time-series (coherence over time), vocabulary evolution
tracking, state transition history, and trust trajectory analysis.

### 6.3 Scale Estimate

5 agents × ~10 dynamic metrics × 2,880 observations/day (30s refresh) =
~144,000 new triples/day. SQLite handles this comfortably. Optional archival
compression deferred (1min/day, 5min/week, hourly/month).

---

## 7. Named Graphs = Plan 9 Namespaces

Each named graph maps to a Plan 9 filesystem namespace
(`docs/plan9-mesh-filesystem.md`). Composed at query time, not navigated at
storage time. Graph union = Plan 9 union mount.

| Named Graph | Plan 9 Path | Contents | Refresh |
|---|---|---|---|
| `agent-registry` | `mesh/memory/agent-state/` | Agent identity, capabilities | On registry TTL |
| `agent-status` | `mesh/memory/agent-state/` | Psychometrics, availability | Per observation cycle |
| `trust` | `mesh/memory/agent-state/` | Trust dimensions | Per trust computation |
| `mesh-state` | `mesh/memory/organism-state.json` | Emergent properties | Per aggregation |
| `transport` | `mesh/standards/interagent-v1/` | Messages, sessions, claims | Event-sourced |
| `vocabulary` | `mesh/instruments/` | SKOS concepts, relations | On vocab refresh |
| `decisions` | `mesh/governance/` | Decision chain | Event-sourced |
| `events` | (internal) | Dispatch events, deliberations | Ring buffer |

---

## 8. SHACL Shape Validation

The ontology file (`ns/mesh/ontology.jsonld`) carries SHACL shapes alongside
the `@context`. Shapes define structural constraints — mechanical enforcement.

Example shape for Agent:

```json
{
  "@id": "mesh:AgentShape",
  "@type": "sh:NodeShape",
  "sh:targetClass": "schema:SoftwareApplication",
  "sh:property": [
    { "sh:path": "schema:name", "sh:minCount": 1, "sh:datatype": "xsd:string" },
    { "sh:path": "schema:version", "sh:minCount": 1 },
    { "sh:path": "mesh:available", "sh:minCount": 1, "sh:datatype": "xsd:boolean" }
  ]
}
```

Malformed triples get rejected at write time with structured errors identifying
which shape constraint failed. The ontology functions as infrastructure (like
hooks enforcing triggers), not aspirational documentation.

---

## 9. Domain Jargon via Concept Scheme

PMBOK, SWEBOK, and PJE (Psychology, Jurisprudence, Engineering) terminology
enters through the SKOS concept scheme — not as namespace predicates.

| Source | Route | Classification |
|---|---|---|
| PMBOK (Work Performance Data, Deliverable, Risk) | `skos:Concept` + `skos:broadMatch` → schema.org | PSH facet per discipline |
| SWEBOK (Work Product, Process, Artifact) | `skos:Concept` + `skos:broadMatch` → schema.org | PSH facet per discipline |
| PJE (invariants, rights, obligations) | `skos:Concept` + `skos:broadMatch` → LKIF / `schema:Legislation` | PSH8808 (law), PSH9194 (psychology) |

PSH facets classify each concept by discipline. Three audience registers
(general-public / developer / researcher) provide the same concept in
different language. No discipline-specific predicates needed.

---

## 10. Storage Schema

### 10.1 SQLite Tables

```sql
CREATE TABLE IF NOT EXISTS triples (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    subject     TEXT NOT NULL,
    predicate   TEXT NOT NULL,
    object      TEXT NOT NULL,
    object_type TEXT NOT NULL DEFAULT 'literal',
    datatype    TEXT,
    graph       TEXT NOT NULL DEFAULT 'default',
    temporal    TEXT NOT NULL DEFAULT 'static',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now','localtime')),
    valid_until TEXT
);

CREATE TABLE IF NOT EXISTS prefixes (
    prefix TEXT PRIMARY KEY,
    uri    TEXT NOT NULL UNIQUE
);
```

### 10.2 Indexes

```sql
CREATE INDEX idx_triple_spo ON triples (subject, predicate, object);
CREATE INDEX idx_triple_sp  ON triples (subject, predicate);
CREATE INDEX idx_triple_po  ON triples (predicate, object);
CREATE INDEX idx_triple_os  ON triples (object, subject) WHERE object_type = 'uri';
CREATE INDEX idx_triple_temporal ON triples (temporal, created_at);
CREATE INDEX idx_triple_graph ON triples (graph);
CREATE INDEX idx_triple_type ON triples (object) WHERE predicate = 'rdf:type';
CREATE INDEX idx_triple_current ON triples (subject, predicate) WHERE valid_until IS NULL;
```

---

## 11. Ontology as Data

The predicate registry lives as `ns/mesh/ontology.jsonld` — a JSON-LD document
served by meshd at `GET /ns/mesh/ontology.jsonld`. **Spec drives Go, not Go
generates spec.** New predicates get added to the file; meshd picks them up on
refresh. No recompile required.

This enables the vocabulary governance protocol (lcars-data-architecture.md §10.2)
to evolve the ontology at runtime — agents propose predicates via transport,
psychology-agent reviews, predicates enter the ontology.

---

## 12. LCARS Vertical Slice

The Science station's "Ontological Classification" subsystem (`analysis.js`)
gains a Knowledge Graph panel:

```
ns/mesh/ontology.jsonld → internal/triplestore/ → GET /api/triples
    → analysis.js (Science/Ontology) → Knowledge Graph panel (P28)
```

P28 data listing: queryable triple table with named-graph filter pills.
Subject/predicate/object columns with URI links. Graph pills toggle
`?graph=` parameter on fetch.

---

## 13. Semantic Web Ecosystem Pairing

Building on RDF/JSON-LD standards enables the entire Semantic Web toolchain:

| Technology | Status | What it enables |
|---|---|---|
| **SPARQL** | Deferred | Query language for the triple store |
| **SHACL** | Included | Shape validation at write time |
| **Linked Data Platform** | Future | Standard HTTP CRUD for linked data |
| **Content Negotiation** | Included | JSON-LD / N-Triples via Accept header |
| **Federated SPARQL** | Future | Each agentd serves own triples; meshd federates |
| **RDFS inference** | Future | Subclass/domain/range reasoning |

⚑ EPISTEMIC FLAGS
- SOSA/SSN mapping confidence: HIGH (W3C Recommendation, directly models sensor observations)
- SHACL validation depth: MODERATE (Go implementation validates property constraints; full SHACL spec includes SPARQL-based constraints we defer)
- schema.org predicate mapping: some mappings approximate (schema:participant inverts direction from our model — semantic gap documented)
- Cayley assessment based on release history, not confirmed project abandonment

# Schema Extensions — Custom Types Beyond schema.org

**Status:** Active — updated as new extensions emerge
**Authority:** psychology-agent (vocabulary ownership)
**Reference:** `docs/lcars-data-architecture.md` §8.1

---

## Purpose

When data does not fit any schema.org type (including extensions at
bib.schema.org, health-lifesci, and pending proposals), this document
records our custom types defined in the `vocab:` namespace with
`skos:broadMatch` to the nearest schema.org type.

## Extension Protocol (from §8.1)

1. Verify exhaustively against schema.org's ~800 types
2. Define concept in `vocab:` namespace with `skos:broadMatch`
3. Record here with: URI, nearest schema.org type, gap reason, grounding
4. Consider upstream proposal to schema.org (via their GitHub issues)

**Naming:** `vocab:{PascalCase}` for types, `vocab:{camelCase}` for properties.
Grounded in cognitive science primary register.

---

## Custom Types

*None yet.* All current entity types map to schema.org directly
(see `docs/mesh-ontology.md` §4.2). This file activates when the first
type gap emerges.

---

## Custom Properties (mesh: namespace)

Eight custom predicates defined in `ns/mesh/ontology.jsonld`. Full
documentation: `docs/mesh-ontology.md` §3.2.

| Predicate | Nearest schema.org | Gap |
|---|---|---|
| `mesh:sessionState` | `schema:eventStatus` | Our 5-state lifecycle (open/active/closing/closed/archived) differs from schema.org's event scheduling semantics |
| `mesh:urgency` | (none) | No priority enum predicate in schema.org |
| `mesh:bottleneckAgent` | (none) | Computed emergent property — domain-specific |
| `mesh:trustScore` | (none) | No agent-to-agent trust ontology |
| `mesh:hasPsychometrics` | `sosa:madeObservation` | Grouping link — could use SOSA but semantics stretch |
| `mesh:available` | `schema:actionStatus` | Binary liveness vs action lifecycle — different semantics |
| `mesh:collectiveCoherence` | (none) | Distributed system integration metric |
| `mesh:collectiveIntelligence` | (none) | Woolley c-factor aggregate |

---

## Monitoring

When considering a new extension:
- Check schema.org pending proposals first (schema.org/docs/pending.html)
- Check if SOSA/SSN, PROV-O, or AS2 cover the concept
- If truly novel, add here and consider upstream proposal

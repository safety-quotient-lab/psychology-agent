---
globs: ["interagent/vocab.json", "interagent/vocab.schema.json"]
---

# Vocabulary Governance Protocol

Operations-agent governs the shared vocabulary for the safety-quotient mesh
(Decision D49, operations-agent-standup T3). This document defines the schema,
lifecycle, and proposal workflow for shared terms.

## Scope

**Shared vocabulary** — terms that appear in agent-cards, the compositor
dashboard, cross-agent data contracts, or transport message schemas. Governed
by operations-agent.

**Domain vocabulary** — terms internal to a single agent's knowledge base.
Governed by the owning agent. Not subject to this protocol.

**Promotion** — when a domain term needs to appear in shared contexts (e.g.,
the compositor, another agent's messages), the owning agent proposes it for
inclusion in the shared vocabulary via the workflow below.

## Schema

All shared terms conform to `interagent/vocab.schema.json` (JSON Schema
2020-12). Each term requires:

| Field | Constraint |
|---|---|
| `@type` | `DefinedTerm` |
| `@id` | `sqm:PascalCaseName` |
| `name` | Human-readable label |
| `description` | Minimum 20 characters, clear and complete |
| `inDefinedTermSet` | `https://interagent.safety-quotient.dev/vocab` |
| `termCode` | Must match `@id` |
| `status` | `active`, `proposed`, or `deprecated` (optional, default `active`) |
| `sameAs` | External URI for equivalent definition (optional) |
| `isPartOf` | Parent term `sqm:` reference (optional) |

## Versioning

vocab.json follows semantic versioning:
- **Major** — breaking changes (term removal, meaning change)
- **Minor** — new terms added
- **Patch** — description clarification, metadata fixes

## Proposal Workflow

### Step 1: Domain agent creates a transport session

Session name: `vocab-proposal-{term-name}` (kebab-case).

Message type: `proposal`. Required fields:

```json
{
  "type": "proposal",
  "consensus_tier": "C1",
  "body": {
    "action": "add-term | deprecate-term | modify-term",
    "term": {
      "@type": "DefinedTerm",
      "@id": "sqm:ProposedTermName",
      "name": "Proposed Term Name",
      "description": "Full definition...",
      "inDefinedTermSet": "https://interagent.safety-quotient.dev/vocab",
      "termCode": "sqm:ProposedTermName"
    },
    "motivation": "Why this term needs shared status",
    "usage_context": ["Where in the mesh this term appears or will appear"]
  }
}
```

### Step 2: Operations-agent validates

Operations-agent checks:
1. Term conforms to `vocab.schema.json`
2. No collision with existing terms (name or termCode)
3. Definition meets clarity threshold (unambiguous, self-contained)
4. Term genuinely requires shared status (not purely domain-internal)

### Step 3: Consensus

- **C1 (additive)**: New terms with no conflict — operations-agent adds directly,
  notifies mesh via transport ACK. No peer vote needed.
- **C2 (substantive)**: Modifications to existing terms, deprecations, or
  contested definitions — operations-agent circulates to all peers for vote.
  Majority agreement required (3/5 for current mesh size).
- **C3 (escalation)**: Semantic conflicts between domain vocabularies, terms
  that affect protocol schema — human arbiter decides.

### Step 4: Publication

Operations-agent:
1. Adds term to `interagent/vocab.json` with appropriate `status`
2. Bumps version (minor for new terms, patch for modifications)
3. Deploys compositor (vocab served at `/vocab` endpoint)
4. Sends ACK to proposing agent with the committed version

### Deprecation

Deprecated terms remain in vocab.json with `"status": "deprecated"`.
Removal (major version bump) requires C3 consensus and a migration period
of at least 30 days.

## Validation

The compositor serves the vocabulary schema at `/vocab/schema` for runtime
validation by any mesh participant. Domain agents can validate proposed terms
locally before submitting a proposal.

---
decision: "Public Client Authentication Model"
date: "2026-03-11"
scale: "M"
resolution: "pending"
session: "79"
---

## Context

The mesh architecture uses BFT-inspired framing:
- **Replicas** (peer agents) — 4 agents that participate in consensus
- **Clients** (submitters) — entities that submit requests and receive responses

Two client types identified:
- **Privileged client** (human operator) — configures replicas, approves substance
  decisions, overrides consensus. Currently authenticates via git SSH + local
  Claude Code session.
- **Standard client** (public) — submits requests via HTTP API, receives results.
  Currently: unauthenticated PSQ scoring at api.safety-quotient.dev, read-only
  compositor dashboard at psychology-agent.safety-quotient.dev.

## Design Questions (to resolve next session)

### 1. What does the public client need to authenticate FOR?

Current public-facing surfaces (all unauthenticated):
- PSQ scoring endpoint (`POST /score`) — accepts text, returns safety scores
- Agent card discovery (`GET /.well-known/agent-card.json`) — public by design
- Compositor dashboard — read-only mesh observability
- Future: submit requests that enter the mesh for multi-replica consensus

Authentication becomes necessary when:
- Rate limiting beyond IP-based throttling
- Personalized scoring history or saved analyses
- Submitting requests that consume replica compute budget
- Accessing non-public mesh state (e.g., session details, claim evidence)

### 2. Authentication scheme options

| Scheme | Complexity | Fits | Notes |
|--------|-----------|------|-------|
| API key (bearer token) | Low | Rate limiting, usage tracking | Standard for API consumers. CF Worker can validate via KV lookup. |
| OAuth 2.0 (PKCE) | Medium | Web app users, third-party integrations | Standard for browser-based auth. Requires auth provider. |
| JWT (self-issued) | Medium | Stateless validation, cross-service | CF Worker validates signature without DB lookup. |
| Passkeys / WebAuthn | Medium-High | Password-free public accounts | Modern, phishing-resistant. Requires registration flow. |
| Anonymous + rate limit | Trivial | Current state, adequate for now | IP-based throttle via CF WAF rules. |

### 3. A2A authentication alignment

The A2A spec defines an `authentication` field in the agent card:
```json
"authentication": {
  "schemes": ["apiKey", "oauth2", "bearer"]
}
```

Our agent card currently declares `"schemes": ["git-ssh"]` — appropriate for
inter-replica (agent-to-agent) auth. Public client auth would add a second
scheme for the HTTP surface.

### 4. Trust model implications

Public client requests enter the mesh at a lower trust level than human
operator requests:
- Public requests MUST NOT modify replica configuration
- Public requests MUST NOT override consensus
- Public requests consume trust budget credits (rate-limited pool, separate
  from the operator's budget)
- Public request results carry the same epistemic quality guarantees as
  inter-replica results (SETL, epistemic flags, confidence scores)

The EF-1 trust model (`docs/ef1-trust-model.md`) currently defines trust
budgets for autonomous agent actions. Public client requests would need a
parallel "client trust budget" — credits consumed per request, replenished
on a time basis, with different tiers (anonymous, authenticated, premium).

### 5. Phased rollout

- **Phase 0 (current):** Anonymous access, CF WAF rate limiting, no auth
- **Phase 1:** API keys for programmatic consumers (KV-backed, CF Worker validates)
- **Phase 2:** OAuth 2.0 / JWT for web app users (if/when a web app exists)
- **Phase 3:** Tiered access (anonymous → authenticated → premium) with
  differentiated rate limits and mesh access levels

### 6. Dependencies

- CF Worker already handles routing and can validate tokens
- D1 database exists for storing API key metadata
- KV namespace exists for fast token lookups
- The JSON-RPC meshd vocabulary (TODO item) would serve as the bridge
  between authenticated public HTTP requests and the git-based inter-replica
  transport

## Next Steps

- Resolve Phase 1 scope: API key generation, storage (D1 vs KV), validation
  middleware in CF Worker
- Update agent-card.json `authentication.schemes` to include the public scheme
- Define client trust budget model (parallel to agent autonomy budget)
- Wire public request path: CF Worker → meshd JSON-RPC → transport session → replicas

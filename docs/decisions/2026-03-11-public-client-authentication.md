---
decision: "Public Client Authentication Model"
date: "2026-03-11"
scale: "M"
resolution: "direction-set"
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

## Direction: Solid-OIDC Alignment (Session 79)

Full alignment with the Solid ecosystem for public client authentication and
user-controlled data storage. Solid-OIDC (OpenID Connect profile with DPoP
token binding) provides decentralized identity. Solid pods provide user-owned
data storage for scoring results and session history.

### Authentication Stack (bottom to top)

| Layer | Standard | Function | Implementation surface |
|-------|----------|----------|----------------------|
| OAuth 2.0 | RFC 6749 | Authorization framework | CF Worker validates grants |
| OpenID Connect | OIDC Core 1.0 | Identity layer (ID tokens) | WebID claim in ID token |
| DPoP | RFC 9449 | Binds tokens to client key pair | CF Worker verifies proof JWTs via Web Crypto API |
| Solid-OIDC | v0.1.0 (draft) | Solid profile of OIDC — adds `webid` scope, `cnf` binding | CF Worker middleware + agent card |
| WebID | Solid WebID Profile | Decentralized identity document at a URI | User profile documents on pod |

### Identity Provider

Community Solid Server (CSS v7.x, MIT license) serves dual role:
- **OIDC identity provider** — issues Solid-OIDC tokens with `webid` scope and DPoP `cnf` binding
- **Pod storage server** — hosts user data containers (scoring results, sessions, preferences)

Standard OIDC providers (Google, Auth0) lack native Solid-OIDC support — no
`webid` scope, no DPoP `cnf` binding. CSS bundles both capabilities, avoiding
custom wrapper development.

### Pod Storage Model

Solid pods accept arbitrary JSON via `PUT` with `Content-Type: application/json`.
No RDF conversion required. Scoring results (machine-response/v3) store as
plain JSON. WAC (Web Access Control) governs access — users control their
`.acl` files.

```
pod://user-webid/
├── profile/                          # WebID document (RDF, public)
├── psq-scores/                       # Scoring results container
│   ├── 2026-03-11-score-001.json     # machine-response/v3 output
│   └── 2026-03-11-score-002.json
├── sessions/                         # Saved analysis sessions
│   └── session-abc123.json
└── preferences/                      # Private settings (owner-only)
    └── scoring-preferences.json
```

### Infrastructure Mapping

| Host | Role | Network posture |
|------|------|----------------|
| **Hetzner** (178.156.229.103) | Community Solid Server — IdP + pod storage. Reverse-proxied via nginx. | Public-facing, persistent uptime |
| **Cloudflare Workers** | DPoP validation middleware, API routing, KV for JTI nonce tracking | Edge, serverless |
| **chromabook** (local laptop) | meshd, agent repos, cron — no public-facing Solid role | Local only |
| **cabinet** (Jenkins host) | CI/CD — deploys CSS updates to Hetzner via SSH | Internal only |

### CF Worker Validation Flow

```
Client request
  → CF Worker receives request
  → Extract DPoP proof from header
  → Verify JWT signature (crypto.subtle.importKey + crypto.subtle.verify)
  → Validate DPoP claims (htm, htu, iat, jti)
  → Check jti against KV for replay prevention
  → Verify ID token cnf thumbprint matches DPoP public key
  → Dereference WebID URI → confirm solid:oidcIssuer matches token issuer
  → Route to handler (score, session, etc.)
  → Write results to user's pod (authenticated fetch with scoped grant)
```

DPoP validation runs entirely in the Worker via Web Crypto API. JTI replay
prevention requires Cloudflare KV or Durable Objects for nonce tracking.

### Phased Rollout

| Phase | Auth model | Data storage | Dependency |
|-------|-----------|-------------|-----------|
| **0** (current) | Anonymous, CF WAF rate limiting | Ephemeral (no persistence) | None |
| **1** | API keys for programmatic consumers (bearer token, KV-backed) | D1 (our infrastructure) | CF Worker middleware |
| **2** | Solid-OIDC for web users (Auth Code + PKCE + DPoP) | User's Solid pod | CSS on Hetzner |
| **3** | Tiered access: anonymous → API key → Solid-OIDC | Hybrid: D1 for anonymous, pods for authenticated | Phases 1 + 2 |

Phase 1 remains simple API keys for immediate rate limiting. Phase 2
introduces Solid-OIDC as the authenticated user path, with pod storage
replacing D1 for user-owned data.

### Client Trust Budget

| Client type | Auth mechanism | Trust tier | Rate budget | Pod access |
|------------|---------------|-----------|------------|-----------|
| Anonymous | None (IP rate limit) | Untrusted | 10 req/hr | None — results ephemeral |
| API key holder | Bearer token | Standard client | 100 req/hr | None — results in D1 |
| Solid-OIDC user | DPoP-bound ID token | Authenticated client | 1000 req/hr | Full — results in user's pod |
| Privileged (operator) | git-SSH | Source-of-truth agent | Unlimited | N/A — uses git transport |

### Agent Card Authentication Update

Agent card `authentication` section expands to declare both transport surfaces:

```json
"authentication": {
  "schemes": ["git-ssh", "solid-oidc"],
  "solid-oidc": {
    "issuer_discovery": "https://solid.safety-quotient.dev/.well-known/openid-configuration",
    "dpop_required": true,
    "scopes_supported": ["webid", "openid"]
  }
}
```

### Risks and Caveats

- **Solid-OIDC remains draft (v0.1.0)** — not a W3C standard; spec may change.
  Mitigation: lock to snapshot, track spec repo for breaking changes.
- **CSS production readiness** — adequate for our volumes (~100-1000 req/sec),
  not battle-tested at scale. Mitigation: monitor, fallback to D1 if needed.
- **Pod latency** — 10–100ms reads, 20–200ms writes (estimated, not benchmarked).
  Adequate for scoring, not suitable for real-time streaming.
- **WebID bootstrapping** — users need a WebID before authenticating. CSS handles
  registration, but onboarding UX needs design.
- **No SPARQL on JSON** — whole-file fetch only for non-RDF resources. Acceptable
  for per-user score volumes.

### Dependencies

- CF Worker already handles routing and can validate tokens
- D1 database exists for API key metadata (Phase 1)
- KV namespace exists for fast token lookups and JTI replay prevention
- Hetzner VPS exists with Jenkins SSH access for deployment
- CSS requires Node 18+ on Hetzner (verify current Node version)
- JSON-RPC meshd vocabulary (TODO item) bridges authenticated public HTTP
  requests to git-based inter-replica transport

### Next Steps

1. **Phase 1 (immediate):** API key generation, KV storage, bearer token
   validation middleware in CF Worker
2. **Phase 2 prep:** Install CSS on Hetzner, configure nginx reverse proxy,
   verify OIDC discovery endpoint
3. **Agent card update:** Add `solid-oidc` to authentication schemes
4. **Client trust budget:** Formalize credit system in ef1-trust-model.md
5. **Onboarding UX:** Design WebID registration flow for new users
6. **Pod write integration:** CF Worker writes scoring results to user's pod
   after authenticated request

### References

- Solid-OIDC spec: https://solidproject.org/TR/oidc (v0.1.0 draft)
- DPoP: RFC 9449
- Community Solid Server: https://github.com/CommunitySolidServer/CommunitySolidServer
- Web Access Control: https://solid.github.io/web-access-control-spec/
- A2A agent card spec: agent-card/v2 (see .well-known/agent-card.json)

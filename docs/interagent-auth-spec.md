# Interagent Authentication — Design Spec

**Date:** 2026-03-10
**Status:** Draft design
**Depends on:** Consensus protocol (docs/consensus-protocol-spec.md),
EF-1 trust model, agent-card/v1
**Related:** `docs/bft-design-note.md` (BFT principles),
OWASP Top 10 (2021), NIST SP 800-207 (Zero Trust Architecture),
NIST SP 800-227 (Post-Quantum Crypto Migration)

**Requirement-level keywords:** Per BCP 14 (RFC 2119 + RFC 8174).

---

## Architecture: Zero Trust

This spec follows NIST SP 800-207 zero-trust principles adapted for
autonomous agent mesh communication.

### Zero-Trust Tenets (applied to interagent mesh)

| ZTA Tenet (NIST) | Mesh Application |
|-------------------|-----------------|
| All data sources and computing services are resources | Each agent dashboard, /api/status, /consensus/* — all protected resources |
| All communication is secured regardless of network location | Agents on the same LAN authenticate identically to agents across the internet. No "internal" exemption |
| Access to individual resources is granted on a per-session basis | Each JWT authorizes one scope for one target for 5 minutes. No persistent sessions |
| Access is determined by dynamic policy | Scope validation checks agent-registry role at request time, not at key issuance. Registry changes take effect immediately |
| The enterprise monitors and measures integrity and security posture | Auth events logged to state.db. Failed attempts surface on dashboard. Engineering incident hook detects credential exposure |
| Resource authentication and authorization are dynamic and strictly enforced | Token expiry + JWKS TTL force continuous re-verification |
| The enterprise collects information about the current state of assets | JWKS fingerprint tracking (TOFU). Mesh health aggregates auth failure rates per peer |

### Trust Boundaries

```
┌──────────────────────────────────────────────────────┐
│                    MESH BOUNDARY                      │
│                                                      │
│  ┌─────────────┐         ┌─────────────┐            │
│  │ psychology-  │ ──JWT── │  psq-agent  │            │
│  │   agent      │         │             │            │
│  │ scope:       │         │ scope:      │            │
│  │  consensus:* │         │  consensus:*│            │
│  │  command:req │         │  status:read│            │
│  │  status:read │         │  gate:notify│            │
│  └──────┬───────┘         └──────┬──────┘            │
│         │                        │                    │
│         │ JWT                    │ JWT                │
│         │                        │                    │
│  ┌──────▼───────┐         ┌──────▼──────┐            │
│  │ unratified-  │ ──JWT── │ observatory-│            │
│  │   agent      │         │   agent     │            │
│  │ scope:       │         │ scope:      │            │
│  │  consensus:* │         │  consensus:*│            │
│  │  content:pub │         │  status:read│            │
│  └──────────────┘         └─────────────┘            │
│                                                      │
│  Every arrow = authenticated + scoped + logged       │
│  No implicit trust between any pair                  │
└──────────────────────────────────────────────────────┘
```

---

## Phased Implementation (Quantum-Ready)

### Phase 1: HMAC-SHA256 Shared Secrets (current — 2 autonomous peers)

**Quantum resistance:** ✓ Symmetric crypto resists Grover's algorithm
(256-bit → 128-bit effective security — well above security threshold).

**Mechanism:**
- Each agent pair shares a secret stored in `agent-registry.local.json`
  (gitignored, machine-local)
- Sender computes HMAC-SHA256 over the JWT header + payload
- Receiver validates HMAC using the shared secret for that agent pair
- **No external dependencies** — Python stdlib `hmac` + `hashlib`

**Limitations:**
- Bilateral secrets: N agents require N*(N-1)/2 shared secrets
- No public-key discovery: new agent registration requires out-of-band
  secret exchange
- Key compromise affects both parties in the pair

**When to use:** 2-3 autonomous agents. Transition to Phase 2 when the
4th peer becomes operational.

### Phase 2: Hybrid Ed25519 + ML-DSA (4+ autonomous peers)

**Quantum resistance:** ✓ Hybrid scheme per NIST SP 800-227 recommendation.
Classical signature (Ed25519) protects against undiscovered PQC
vulnerabilities. Post-quantum signature (ML-DSA / CRYSTALS-Dilithium,
FIPS 204) protects against quantum computers.

**Mechanism:**
- Each agent generates: Ed25519 keypair + ML-DSA keypair
- JWT carries two signatures: `x-sig-classical` (Ed25519) +
  `x-sig-pqc` (ML-DSA)
- Verifier checks BOTH signatures. Token valid only if both pass
- Public keys published at `/.well-known/jwks.json` (both key types)
- **Dependencies:** `PyNaCl` (Ed25519) + `liboqs-python` (ML-DSA)

**JWKS format (Phase 2):**

```json
{
  "keys": [
    {
      "kty": "OKP",
      "crv": "Ed25519",
      "kid": "psychology-agent-classical-1",
      "use": "sig",
      "x": "<base64url-encoded-public-key>"
    },
    {
      "kty": "PQK",
      "alg": "ML-DSA-65",
      "kid": "psychology-agent-pqc-1",
      "use": "sig",
      "x": "<base64url-encoded-public-key>"
    }
  ]
}
```

### Phase 3: Pure ML-DSA (when ecosystem matures)

**Quantum resistance:** ✓ Post-quantum only. Drop classical signatures
when ML-DSA has sufficient deployment track record (NIST recommends
monitoring for 5+ years post-standardization, i.e., ~2029).

**Dependencies:** `liboqs-python` only.

### Crypto-Agility Principle

The auth layer MUST NOT hardcode any algorithm. Design for algorithm
substitution:

1. **Signer** reads `alg` from agent config (`agent-registry.local.json`)
2. **JWKS** declares `alg` per key — receivers dispatch to correct
   verification function
3. **Adding a new algorithm** = config change + library install.
   No protocol change, no schema migration, no consensus round
4. **Deprecating an algorithm** = remove from JWKS, add new key with
   new `kid`. Old tokens expire within 5 minutes

---

## JWT Structure

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT",
  "kid": "psychology-agent-hmac-1"
}
```

Phase 2 header adds `x-alg-pqc`:

```json
{
  "alg": "EdDSA",
  "x-alg-pqc": "ML-DSA-65",
  "typ": "JWT",
  "kid": "psychology-agent-classical-1"
}
```

### Claims (Payload)

```json
{
  "iss": "psychology-agent",
  "aud": "psq-agent",
  "iat": 1741646400,
  "exp": 1741646700,
  "scope": "consensus:vote",
  "jti": "a1b2c3d4-unique-token-id",
  "mesh": "safety-quotient-mesh",
  "ver": "1"
}
```

| Claim | Required | Description |
|-------|----------|-------------|
| `iss` | Yes | Agent ID of the sender. MUST match an agent in receiver's registry |
| `aud` | Yes | Agent ID of the intended receiver. Receiver MUST reject if `aud` != self |
| `iat` | Yes | Issued-at timestamp (Unix epoch) |
| `exp` | Yes | Expiry timestamp. MUST be ≤ `iat + 300` (5 minutes max) |
| `scope` | Yes | Action being authorized. Receiver validates against role permissions |
| `jti` | Yes | Unique token ID (UUID). Prevents replay attacks |
| `mesh` | Yes | Mesh identifier. Prevents cross-mesh token confusion |
| `ver` | Yes | Auth protocol version. Enables future upgrades |

### Token Lifetime

- **Maximum TTL:** 300 seconds (5 minutes)
- **Cache window:** Token cached until `exp - 30s` (refresh 30s before expiry)
- **Clock skew tolerance:** ±30 seconds
- **No refresh tokens:** Agents mint on demand from local private key/shared secret

---

## Scope Permissions Matrix

Scopes encode the zero-trust least-privilege model. Each agent pair has
a defined set of permitted scopes based on their mesh roles.

### Defined Scopes

| Scope | Description | Consensus required |
|-------|-------------|-------------------|
| `status:read` | Read /api/status from peer | No |
| `consensus:propose` | Submit a consensus proposal | No (but proposal itself may require consensus) |
| `consensus:vote` | Vote on an active proposal | No |
| `consensus:commit` | Commit a consensus outcome | No (quorum already reached) |
| `gate:notify` | Send gate notification to peer | No |
| `command:request` | Issue a command-request/v1 | T3 gate (receiver evaluates) |
| `transport:push` | Deliver a transport message via HTTP | No |

### Per-Agent Scope Assignment

Scope assignments derive from the agent-registry `role` field. The
receiver cross-references `iss` → registry → permitted scopes at
validation time (dynamic policy, not static assignment).

```
psychology-agent (orchestrator + peer):
  → psq-agent:        status:read, consensus:*, gate:notify, command:request, transport:push
  → unratified-agent:  status:read, consensus:*, gate:notify, transport:push
  → observatory-agent: status:read, consensus:*, transport:push

psq-agent (domain expert + peer):
  → psychology-agent:  status:read, consensus:*, gate:notify, transport:push
  → unratified-agent:  status:read, consensus:*, transport:push
  → observatory-agent: status:read, consensus:*, transport:push

unratified-agent (content publisher + peer):
  → psychology-agent:  status:read, consensus:*, transport:push
  → psq-agent:         status:read, consensus:*, transport:push
  → observatory-agent: status:read, consensus:*, transport:push

observatory-agent (data observatory + peer):
  → all peers:         status:read, consensus:*, transport:push
```

**Key asymmetry:** Only psychology-agent carries `command:request` scope
for psq-agent. This preserves the operational hierarchy within the
governance-egalitarian consensus model.

---

## OWASP Top 10 Mitigations

| # | Risk | Mitigation | Implementation |
|---|------|-----------|----------------|
| A01 | Broken Access Control | Scope validation against registry role, not JWT claim alone | `validate_scope(iss, scope, registry)` function |
| A02 | Cryptographic Failures | Quantum-ready phased approach. HMAC-SHA256 (Phase 1) → hybrid Ed25519+ML-DSA (Phase 2) | Crypto-agility via `alg` field |
| A03 | Injection | Validate `iss` against registry allowlist. Parameterized SQL queries in dual_write.py | Input validation at auth boundary |
| A04 | Insecure Design | 5-min token expiry. No long-lived sessions. Mint-on-demand | JWT lifecycle design |
| A05 | Security Misconfiguration | HTTPS enforced (Cloudflare tunnels). CORS allowlist (not wildcard). Default-deny unknown scopes | Configuration hardening |
| A07 | Auth Failures | Rate limit: 10 consensus requests/agent/hour. TOFU model for JWKS fingerprint | Rate limiting + key pinning |
| A08 | Integrity Failures | JWKS served over HTTPS only. TOFU fingerprint alerts on key change | Transport security + monitoring |
| A09 | Logging Failures | All auth events → state.db `auth_events` table. Dashboard displays failures | `dual_write.py auth-event` subcommand |
| A10 | SSRF | JWKS URLs resolved from agent-registry only. Never fetch URLs from incoming messages | URL allowlist enforcement |

---

## Replay Attack Prevention

1. **`jti` (JWT ID)** — unique per token. Receiver maintains a sliding
   window of seen `jti` values (5-minute window matching token TTL).
   Duplicate `jti` within the window → reject
2. **`exp` validation** — expired tokens rejected before `jti` check
3. **`aud` binding** — token minted for specific receiver. Forwarding
   a token to a different agent fails `aud` check
4. **State in state.db:**

```sql
CREATE TABLE IF NOT EXISTS auth_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    agent_from  TEXT NOT NULL,
    agent_to    TEXT NOT NULL,
    scope       TEXT NOT NULL,
    jti         TEXT NOT NULL,
    outcome     TEXT NOT NULL CHECK(outcome IN ('success', 'rejected', 'expired', 'replay', 'scope_denied', 'unknown_agent')),
    reason      TEXT,
    ip_address  TEXT
);

CREATE TABLE IF NOT EXISTS seen_tokens (
    jti         TEXT PRIMARY KEY,
    expires_at  TEXT NOT NULL
);
```

**Cleanup:** Periodically purge `seen_tokens` where `expires_at < now`.
Run during autonomous-sync cycle.

---

## Key Management

### Generation (one-time per agent setup)

```bash
# Phase 1: Generate HMAC shared secret for a peer pair
python3 -c "import secrets; print(secrets.token_hex(32))"
# Store in agent-registry.local.json under agents.{peer}.auth.shared_secret
```

```bash
# Phase 2: Generate Ed25519 + ML-DSA keypairs
python3 scripts/generate_agent_keys.py
# Writes to .agent-keys/ (gitignored):
#   .agent-keys/ed25519_private.pem
#   .agent-keys/ed25519_public.pem
#   .agent-keys/ml-dsa_private.key
#   .agent-keys/ml-dsa_public.key
```

### Storage

| File | Location | Gitignored | Contents |
|------|----------|-----------|----------|
| `agent-registry.local.json` | `transport/` | ✓ | Shared secrets (Phase 1) |
| `.agent-keys/` | project root | ✓ | Private + public keys (Phase 2) |
| `/.well-known/jwks.json` | dashboard route | N/A (served, not stored) | Public keys only (Phase 2) |

### Rotation

**Phase 1 (shared secret):**
1. Generate new secret
2. Update both agents' `agent-registry.local.json`
3. Both agents restart auth module
4. Old tokens expire within 5 minutes

**Phase 2 (keypair):**
1. Generate new keypair
2. Add new public key to JWKS (old key remains, tagged with old `kid`)
3. Update signer config to use new `kid`
4. After 10 minutes (2× token TTL), remove old key from JWKS
5. No consensus required (operational, not governance)

### Compromise Response

1. Engineering incident hook detects private key path in tool output →
   **immediate alert**
2. Operator generates new keypair on affected agent
3. Old public key removed from JWKS → immediate rejection of attacker tokens
4. Auth event log reviewed for unauthorized access during compromise window
5. If consensus votes occurred during compromise → flag for C3 human review

---

## Integration with Existing Infrastructure

### agent-registry.local.json (Phase 1)

```json
{
  "agents": {
    "psq-agent": {
      "auth": {
        "shared_secret": "hex-encoded-32-byte-secret",
        "algorithm": "HS256"
      },
      "lan_host": "chromabook.local",
      "lan_user": "kashif"
    }
  }
}
```

### agent-card.json (Phase 2)

Add `auth` section:

```json
{
  "auth": {
    "jwks_url": "https://psychology-agent.safety-quotient.dev/.well-known/jwks.json",
    "algorithms_supported": ["HS256", "EdDSA", "ML-DSA-65"],
    "token_ttl_seconds": 300,
    "protocol_version": "1"
  }
}
```

### mesh-status.py

New routes:
- `GET /.well-known/jwks.json` — public keys (Phase 2)
- Auth middleware on all `/consensus/*` endpoints
- Auth event logging to state.db

### autonomous-sync.sh

Before HTTP calls to peers:
```bash
TOKEN=$(python3 scripts/mint_token.py --target "$PEER_ID" --scope "status:read")
curl -H "Authorization: Bearer $TOKEN" "https://$PEER_URL/api/status"
```

### state.db (schema v15)

Tables: `auth_events`, `seen_tokens` (see Replay Attack Prevention above).

---

## Open Questions

- **CF Worker auth validation:** Workers lack native ML-DSA support.
  Options: (a) WASM-compiled liboqs, (b) delegate PQC verification to
  dashboard, (c) Worker validates classical signature only (sufficient
  for pre-quantum period). Phase 1 HMAC works natively in Workers.
- **TOFU vs CA model:** TOFU (Trust On First Use) is simpler but
  vulnerable to first-contact interception. A mesh CA (psychology-agent
  signs all peer certificates) is stronger but reintroduces hierarchy.
  For now: TOFU with fingerprint alerting.
- **Token scope granularity:** Current scopes are action-level. Should
  resource-level scopes exist (e.g., `consensus:vote:vocabulary` vs
  `consensus:vote:schema`)? Defer until scope violations surface in logs.

⚑ EPISTEMIC FLAGS
- ML-DSA (FIPS 204) finalized August 2024; Python library support (liboqs)
  exists but ecosystem maturity remains limited. Production deployment
  experience scarce as of early 2026.
- The zero-trust model assumes Cloudflare tunnels provide TLS termination.
  If an agent runs without a tunnel (direct HTTP), the auth layer alone
  does not prevent eavesdropping — transport encryption becomes a separate
  concern.
- HMAC-SHA256 shared secrets in Phase 1 provide symmetric-key quantum
  resistance but lose the public-key property (no JWKS discovery, no
  unilateral key rotation). This is a deliberate trade-off for zero
  dependencies.
- OWASP A06 (Vulnerable and Outdated Components) applies when external
  dependencies are added in Phase 2. PyNaCl and liboqs must be pinned
  to audited versions.

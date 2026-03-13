# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in operations-agent, please report
it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email **kashif+sqlab@kashifshah.net** or use
[GitHub Security Advisories](https://github.com/safety-quotient-lab/operations-agent/security/advisories/new)
to report privately.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if you have one)

We aim to acknowledge reports within 48 hours and provide a fix timeline
within 7 days.

## Scope

The following components fall within scope:

- **Cloudflare Worker** (`interagent/worker.js`, `auth.js`) — API endpoints,
  authentication, rate limiting, CORS
- **meshd daemon** (`cmd/meshd/`, `internal/`) — event processing, webhook
  verification, budget gating, spawn management
- **Transport protocol** (`transport/sessions/`) — message integrity,
  session lifecycle, replay protection
- **Agent discovery** (`.well-known/agent-card.json`) — identity verification,
  schema compliance

## Out of Scope

- Denial of service via rate limiting exhaustion (rate limits exist and
  function as designed)
- Social engineering of human operators
- Vulnerabilities in third-party services (Cloudflare, GitHub)

## Security Features

- **HMAC-SHA256 webhook verification** — GitHub webhooks validated before processing
- **CORS restriction** — API access limited to known mesh domains
- **Rate limiting** — 60 req/min per IP on public endpoints, 10 req/min per repo on webhooks
- **API key hashing** — raw keys never stored; SHA-256 hashes persist in KV
- **Budget gating** — autonomous operations require sufficient budget balance
- **Circuit breaker** — cascading failures trigger automatic spawn pause
- **Mesh-wide concurrency** — file-lock based spawn slots prevent resource exhaustion
- **Transport immutability** — signed messages never modified after delivery

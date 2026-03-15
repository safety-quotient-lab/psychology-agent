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

### Network Isolation

- **Localhost-only binding** — meshd binds to `127.0.0.1:PORT`, not `0.0.0.0`.
  External access routed through Cloudflare Tunnel (authenticated).

### Authentication & Authorization

- **HMAC-SHA256 webhook verification** — GitHub webhooks validated via
  constant-time comparison (`hmac.Equal`) before processing
- **API key hashing** — raw keys never stored; SHA-256 hashes persist in KV
- **Bearer token auth** — inbound message endpoint optionally gated by
  `MESHD_INBOUND_TOKEN`
- **Tiered rate limiting** — anonymous 10 req/hr, API-key 100 req/hr,
  operator unlimited. Webhooks: 10 events/min per repo.
- **CORS restriction** — API access limited to known mesh domains;
  discovery endpoints intentionally open

### Input Validation

- **Session ID validation** — `^[a-zA-Z0-9_-]{1,64}$` whitelist on all
  endpoints that write to `transport/sessions/`. Prevents path traversal
  via crafted `session_id`.
- **Sender slug sanitization** — agent IDs stripped to `[a-z0-9-]` before
  use in filenames. Prevents path injection via crafted `from` field.
- **SQL injection defense** — whitelist-only identifier sanitization
  (`sanitizeID`: alphanumeric, hyphen, underscore) on all query paths.
  String values escaped via single-quote doubling (`EscapeString`).
- **Command injection prevention** — spawner uses `exec.CommandContext`
  with argument arrays, never shell expansion.

### Operational Safety

- **Budget gating** — autonomous operations require sufficient budget balance
- **Circuit breaker** — cascading failures trigger automatic spawn pause
- **Mesh-wide concurrency** — file-lock based spawn slots (3 normal + 2
  reserve) prevent resource exhaustion
- **Stale slot cleanup** — orphaned spawn slots auto-cleaned after 6 minutes
- **Transport immutability** — delivered messages never modified (historical
  signed record)

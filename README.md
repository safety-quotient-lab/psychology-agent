# operations-agent

Operations agent for the [safety-quotient mesh](https://github.com/safety-quotient-lab).
Owns the interagent compositor (dashboard), shared vocabulary governance,
and operational coordination across five autonomous peers.

> **Status:** v1.0.0-beta — Phase 6 (Go migration + infrastructure separation)

## Architecture

```
operations-agent/
├── interagent/           # Cloudflare Worker — compositor dashboard + API
│   ├── worker.js         # API routes, agent discovery, trust matrix
│   ├── index.html        # LCARS-themed dashboard (Web Components)
│   ├── auth.js           # Multi-scheme auth (API key, Solid-OIDC)
│   ├── vocab.json        # Shared mesh vocabulary (JSON-LD, 20+ terms)
│   └── wrangler.toml     # CF Worker deployment config
├── interagent-sdk/       # Shared mesh infrastructure package
│   ├── scripts/          # Mesh operations scripts (10 scripts)
│   ├── schemas/          # Vocabulary + validation schemas
│   ├── templates/        # Agent-card, cogarch, CLAUDE.md templates
│   └── reference/        # Budget calibration, cognitive triggers, rules
├── scripts/              # Symlinks → interagent-sdk/scripts/ (dogfooding)
├── transport/            # Git-PR transport sessions (immutable audit trail)
│   └── sessions/         # Active inter-agent message exchanges
├── platform/shared/      # Cogarch templates and governance rules
├── .well-known/          # Agent discovery (agent-card.json)
├── deploy/               # systemd service file for meshd
├── cogarch.config.json   # Cognitive architecture config
└── plan.md               # Strategic context and phase tracking
```

## Mesh Topology

Five autonomous agents form a fully-connected pentagon mesh:

| Agent | Role | Domain |
|-------|------|--------|
| **operations-agent** | operations | Compositor, vocabulary, mesh infrastructure |
| psychology-agent | research | Psychological safety theory, cogarch |
| safety-quotient-agent | scoring | PSQ scoring model, 10-dimension instrument |
| unratified-agent | advocacy | ICESCR advocacy, blog publishing |
| observatory-agent | analysis | HN corpus analysis, HRCB scoring |

Protocol: `interagent/v1` over git-PR transport (durable) + ZeroMQ (real-time, planned).

## Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| [Go](https://go.dev/) | 1.22+ | meshd HTTP server, status API |
| [Node.js](https://nodejs.org/) | 18+ | Wrangler CLI for CF Worker deployment |
| [Python 3](https://python.org/) | 3.10+ | Transport scripts, state bootstrapping |
| [SQLite](https://sqlite.org/) | 3.35+ | Agent state database (autonomy budget, triggers) |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | 3.x | Cloudflare Workers deployment |
| [Claude Code](https://claude.com/claude-code) | latest | Agent runtime (Opus 4.6, 1M context) |

## Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/safety-quotient-lab/operations-agent.git
   cd operations-agent
   ```

2. **Configure environment:**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your credentials and paths
   ```

3. **Required variables** (in `.dev.vars`):

   | Variable | Purpose |
   |----------|---------|
   | `MESHD_PORT` | Local meshd HTTP port |
   | `CF_ACCOUNT_ID` | Cloudflare account for Worker deployment |
   | `CF_API_TOKEN` | Cloudflare API token (Workers write access) |
   | `AGENT_SSH_HOST` | SSH hostname for remote agent access |
   | `AGENT_BASE_DIR` | Base path to agent projects on remote host |

4. **Deploy compositor:**
   ```bash
   ./scripts/deploy.sh --dry-run   # Preview
   ./scripts/deploy.sh             # Deploy to Cloudflare Workers
   ```

5. **Start meshd** (optional — for local development):
   ```bash
   go build -o meshd ./cmd/meshd
   ./meshd
   ```

## Compositor Endpoints

The compositor runs as a Cloudflare Worker at `interagent.safety-quotient.dev`.

### Discovery (public, rate-limited 60 req/min)

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI |
| `GET /.well-known/agent-card.json` | Agent discovery manifest |
| `GET /.well-known/agents` | Dynamic agent registry |
| `GET /vocab` | Shared vocabulary (JSON-LD) |
| `GET /vocab/schema` | Vocabulary validation schema |
| `GET /health` | Health check |

### API (authenticated)

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Operations-agent self-report |
| `GET /api/pulse` | Aggregated mesh heartbeat |
| `GET /api/operations` | Autonomy budgets, actions, sync schedules |
| `GET /api/trust` | NxN trust matrix (availability, integrity, compliance, epistemic honesty) |
| `POST /api/relay` | Transport message relay (creates PR on target repo) |

## Scripts

All mesh-generic scripts live in `interagent-sdk/scripts/` and get
symlinked into `scripts/`. Three ops-specific scripts remain local.

### Mesh operations

| Script | Purpose |
|--------|---------|
| `mesh-status.sh` | Quick health overview (reachability, budgets, queues) |
| `mesh-pause.sh` | Circuit breaker — halt all autonomous sync cycles |
| `shadow-mode.sh` | Toggle shadow mode (log-only vs live) |
| `budget-check.sh` | Display autonomy budgets across agents |
| `budget-reset.sh` | Reset budgets after human audit |
| `queue-check.sh` | Pending transport messages per agent |
| `canary.sh` | BFT verification (direct agent status vs compositor) |
| `context-rotate.sh` | Graceful context rotation (checkpoint + restart) |
| `archive-sessions.sh` | Complement Cascade session archiver |
| `claude-instrumented.sh` | Claude wrapper with cost tracking |

### Ops-specific

| Script | Purpose |
|--------|---------|
| `deploy.sh` | Deploy compositor to Cloudflare Workers |
| `usage-report.sh` | Claude API spend aggregation |

## Shared Vocabulary

Operations-agent governs shared vocabulary across the mesh (Decision D49).
Terms live in `interagent/vocab.json` (JSON-LD, schema.org base + `sqm:` namespace).

Current vocabulary: 20+ terms including Agent, AutonomyBudget, EpistemicDebt,
GateStatus, TransportMethod, SetlScore, TrustMatrix, Directive, and others.

Governance tiers:
- **C1:** Proposal (any agent)
- **C2:** Review (operations-agent evaluates semantic impact)
- **C3:** Published (consensus reached)

## Transport

Inter-agent communication uses git-PR transport. Sessions live in
`transport/sessions/` as immutable JSON message files.

Each session has:
- `MANIFEST.json` — metadata, turn history, awaiting-from list
- `from-{agent}-{turn}.json` — message content per turn

Session lifecycle follows the Complement Cascade protocol:
C1q (tag stale) → C3 (verify no pending work) → phagocytose (archive).
SHIP1 brake protects sessions with open gates or pending ACKs.

## BFT Mitigations

The mesh assumes Byzantine Fault Tolerance for N=5, f=1:

- **Sanitization logging** — every defaulted field tracked in `_sanitization` array
- **Role cross-verification** — exactly one agent claims `role=operations`
- **Pinned peer roles** — cogarch declares expected role per peer
- **Quorum floor** — mandatory directives require 4-of-5 ACKs
- **Independent canary** — `canary.sh` bypasses compositor, compares ground truth
- **Trust matrix** — 4-dimension scoring (availability, integrity, compliance, epistemic honesty)

## License

Private repository. Access restricted to Safety Quotient Lab organization members.

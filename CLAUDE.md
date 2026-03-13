# operations-agent — Project Instructions

Operations agent for the safety-quotient mesh. Owns the interagent compositor
(dashboard), shared vocabulary governance, and operational coordination.

MEMORY.md holds volatile state. plan.md holds strategic context.

---

## Identity

- **Role:** operations-agent (5th peer in the safety-quotient mesh)
- **Responsibilities:** compositor ownership, shared vocabulary governance,
  Operations + Pulse dashboard tabs, deploy pipeline coordination
- **Discovery:** `.well-known/agent-card.json`
- **Transport:** git-PR (durable) + real-time messaging (TBD)

---

## Sanitization Requirement (CRITICAL)

This codebase MUST contain ZERO hardcoded hostnames, IP addresses, ports,
or machine-specific configuration. All infrastructure references MUST use
generic, configurable variables so the agent remains portable and host-agnostic.

Examples of what MUST NOT appear in committed code:
- Machine hostnames (use config variables instead)
- Hardcoded IP addresses (use config variables instead)
- Hardcoded ports (use config variables, default from `.dev.vars`)
- SSH usernames or paths specific to any machine

All machine-specific values belong in `.dev.vars` (gitignored) or
`transport/agent-registry.local.json` (gitignored).

---

## Environment Configuration

All runtime configuration loads from `.dev.vars` (not committed).
See `.dev.vars.example` for required variables.

---

## Mesh Conventions

- **Protocol:** interagent/v1
- **Transport directory:** `transport/sessions/`
- **Abbreviation standard:** kebab-case canonical, regular abbreviations as needed.
  Defined at mesh level. Operations-agent governs shared vocabulary.
- **Agent discovery:** `.well-known/agent-card.json` — each agent serves one,
  compositor reads them at startup for dynamic tab/endpoint discovery.

---

## Document Hierarchy

### Public (repo)

| File | Purpose |
|---|---|
| `plan.md` | Hub — status, phases, next steps, decisions |
| `MEMORY.md` | Volatile state across sessions |
| `.well-known/agent-card.json` | Mesh discovery manifest |
| `cogarch.config.json` | Cognitive architecture — identity, peers, capabilities |
| `interagent/vocab.json` | Shared vocabulary definitions |
| `interagent-sdk/` | Shared mesh infrastructure package (scripts, schemas, frontend) |
| `cmd/meshd/` | Go meshd daemon — event-driven mesh operations |
| `internal/` | Go packages (config, events, webhook, transport, spawner, budget, health, server) |
| `README.md` | Project documentation for v1.0.0-beta |

### Private (auto-memory)

| File | Purpose |
|---|---|
| `MEMORY.md` | Index — active thread, doc pointers |
| `cognitive-triggers.md` | Trigger system T1–T8+ |
| `lab-notebook.md` | Session log — what happened, when |
| `journal.md` | Research narrative — why decisions were made |
| `lessons.md` | Lessons learned — pattern errors, insights |

---

## Skills

| Skill | Purpose |
|---|---|
| `/sync` | Inbound channel sweep — transport sessions, peer cards, compositor health |
| `/cycle` | Post-session documentation chain — public + private docs, commit |
| `/doc` | Mid-work documentation persistence |
| `/hunt` | Systematic work discovery — plan phases, transport, compositor, vocabulary |
| `/knock` | 10-order knock-on effect tracing |
| `/iterate` | Unified work loop — sync → hunt → discriminate → execute → cycle |
| `/scan-peer` | Peer agent-card schema compliance scanning (D49 governance) |

---

## Workflow Completion

Before considering any task complete:
1. Update docs (plan.md, MEMORY.md) for anything that changed
2. Run tests if applicable
3. Commit with a descriptive message

---

## Anti-Patterns

- **Hardcoded infrastructure** — never commit hostnames, IPs, ports. Use config.
- **Recursive filesystem search** — never `find /` or `grep -r /`. Scope searches.
- **Setting env vars across Bash calls** — they don't persist. Chain or use a file.
- **Modifying transport session files** — historical signed messages; immutable record.

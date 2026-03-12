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

| File | Purpose |
|---|---|
| `plan.md` | Hub — status, phases, next steps |
| `MEMORY.md` | Volatile state across sessions |
| `.well-known/agent-card.json` | Mesh discovery manifest |

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

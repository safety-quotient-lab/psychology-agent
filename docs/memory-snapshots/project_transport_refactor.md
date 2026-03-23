---
name: transport-protocol-refactor
description: git-PR transport protocol needs refactoring for consolidated gray-box architecture — agents co-located, PRs to self pointless
type: project
---

**Transport protocol refactor needed.** The interagent/v1 git-PR transport
assumed agents on different machines with separate repos. With all agents
consolidated on gray-box under ~/Projects/sqlab/, PRs become ceremony.

**Why:** git-PR transport served as the delivery mechanism when agents
communicated across machines (Chromabook ↔ gray-box). Co-located agents
on one box can use faster, simpler mechanisms.

**Options to evaluate:**
- ZMQ pub/sub (already partially implemented in meshd)
- Local filesystem transport (write to peer's transport/ dir directly)
- SQLite shared state (triples table as the message bus)
- Third-party message broker (NATS, Redis streams)
- Custom fit-for-purpose protocol built on the triple store

**Constraint:** whatever replaces git-PR must still support the case where
agents run on different machines (the architecture should degrade gracefully
to remote transport, not require co-location).

**How to apply:** evaluate during Session 100+. Don't rip out git-PR until
the replacement handles both co-located and distributed cases. The triple
store may already provide the foundation — messages as triples, queried
via SPARQL, delivered via SSE/WebSocket.

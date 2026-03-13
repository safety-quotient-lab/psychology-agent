---
name: mesh-operations-domain
description: Mesh circuit breaker and autonomous sync operations belong to operations-agent domain — psychology-agent does not manage them
type: feedback
---

Mesh circuit breaker (/tmp/mesh-pause) and autonomous sync operations fall under
operations-agent's domain. Psychology-agent does not remove/set the circuit breaker
or manage autonomous sync scheduling.

**Why:** User explicitly assigned mesh operations to the operations-agent (Session 83).
The psychology-agent focuses on discipline work; infrastructure operations route to
the operations-agent.

**How to apply:** When encountering the mesh-pause circuit breaker or autonomous sync
issues, note the state but do not offer to fix or remove it. Flag for the
operations-agent instead. Do not ask the user about resuming autonomous operations —
that decision belongs to the operations-agent's scope.

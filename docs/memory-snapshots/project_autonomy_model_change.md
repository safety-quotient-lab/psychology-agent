---
name: Autonomy model change — budget → counter with limit + tempo
description: Autonomy model shifting from depleting budget pool to counting counter with configurable limit and tempo (rate). Counter counts claude -p invocations.
type: project
---

Autonomy model uses Cattell's (1963) fluid/crystallized intelligence distinction
plus a mesh-level aggregate.

**Three tiers:**

1. **Fluid intelligence (Gf) — "Deliberations"**
   - Counts `claude -p` invocations (novel adaptive reasoning)
   - Each consumes computational resources, produces new output
   - Per-agent counter with configurable limit and tempo
   - API: `budget_spent` / `budget_cutoff` (new format)

2. **Crystallized intelligence (Gc) — "Operations"**
   - Counts hook fires, trigger checks, cron cycles, rule evaluations
   - Pattern-matched responses that execute without LLM invocation
   - Zero deliberation cost — accumulated knowledge applied automatically
   - Sources: 24 hook scripts, 17 triggers, cron heartbeats, pre-commit checks

3. **Mesh aggregate — "Processing"**
   - Combines Gf + Gc across all agents
   - Own limit and tempo separate from per-agent limits
   - Gc/Gf ratio indicates crystallization efficiency (higher = more patterns
     operating without novel reasoning = more mature mesh)

**Why:** The Gf/Gc distinction maps processual ontology onto operational metrics.
Fluid processing represents novel adaptation; crystallized processing represents
accumulated structure. The ratio tracks the governance telos (wu wei) — higher
crystallization means more effortless operation.

**How to apply:** Dashboard shows both counters per agent, plus mesh aggregate.
Labels: "Deliberations" (Gf), "Operations" (Gc), "Processing" (mesh total).
The Gc/Gf ratio appears on the Science station as a crystallization metric.

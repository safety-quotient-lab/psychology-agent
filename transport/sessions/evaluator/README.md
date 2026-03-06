# Evaluator Session

Adversarial evaluator transport directory. Created Session 24 (EF-3 resolution).

## Contents

- `tier1-audit.jsonl` — structured log of all Tier 1 (Lite) evaluator proxy
  checks from T3 #12. One JSON object per line. Entries with `"escalated": true`
  queue for Tier 2 independent review.
- Future: Tier 2/3 exchange files when first activation trigger fires.

## Schema

Tier 1 entries use `evaluator-response/v1` compact format (no interagent envelope).
Tier 2/3 exchanges use full interagent/v1 envelope.
See: docs/architecture.md §Evaluator Response Schema.

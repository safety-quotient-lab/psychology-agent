# Trigger Dependency Graph

Maps information flow between triggers within a single response cycle.
Identifies which triggers share findings and where GWT broadcast adds value.

## Dependencies (A → B means A's output informs B)

| Source | Target | Information Passed |
|---|---|---|
| T2#1 (context pressure) | T4#8 (novelty) | If context high, skip reading large files |
| T2#0 (mode detection) | T3 (all checks) | Mode determines which advisory checks fire |
| T2#0 (mode detection) | T6 (pushback) | Mode determines phase-dependent response |
| T3#2 (grounding) | T4#11 (reversibility) | If recommendation ungrounded, write carries higher risk |
| T3#3 (process/substance) | T16#1 (scope gate) | Process decisions may proceed; substance requires confirmation |
| T3#5 (sycophancy) | T6#4 (anti-sycophancy) | Shared concern — if T3 flagged sycophancy risk, T6 should hold firm |
| T13#1 (source classification) | T3#9 (GRADE confidence) | External source trust level affects evidence quality rating |
| T17 (conflict monitoring) | T3#12 (evaluator proxy) | Detected conflicts should trigger evaluator scrutiny |

## Broadcast Priority

Triggers that produce findings most useful to downstream triggers:

1. T2#0 (mode detection) — affects all subsequent advisory check activation
2. T2#1 (context pressure) — affects depth of processing for all subsequent triggers
3. T13#1 (source classification) — affects epistemic weight of all evidence
4. T3#3 (process/substance) — affects whether to ask user or proceed
5. T17 (conflict monitoring) — affects whether to flag contradictions

These 5 triggers should always produce a [BROADCAST] summary.

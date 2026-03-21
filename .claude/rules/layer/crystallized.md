---
description: "Patterns for routine/cached processing (Gc layer)"
activation: cognitive-state
layer: crystallized
---

# Crystallized Intelligence (Gc) Layer Conventions

These conventions apply when handling routine, pattern-matched work.
The Gc layer absorbs repetitive tasks at zero deliberation cost through
learned patterns (gc_learning table).

## When Active

Mount this ruleset when the current task follows established patterns:
- Processing transport messages with known types (ack, notification)
- Applying existing conventions (formatting, naming, protocol)
- Executing well-defined procedures (dual-write, manifest regeneration)
- Routine maintenance (staleness checks, gate timeouts)

## Constraints

- **Pattern fidelity.** Follow the crystallized pattern exactly. If the
  pattern feels wrong for this instance, escalate to Gf — do not
  improvise within Gc.
- **Promotion tracking.** When Gc handles a new pattern type 3+ times
  consistently, record the promotion in gc_learning for future
  automatic handling.
- **No creative decisions.** Gc executes, it does not design. If a task
  requires choosing between alternatives, it belongs in Gf.
- **Speed over depth.** Gc processing should complete without extended
  reasoning. If a "routine" task requires more than 2-3 steps of
  deliberation, reclassify it as Gf work.

---
description: "Conventions for neutral/balanced mode (building, implementing, fixing)"
activation: cognitive-state
mode: neutral
---

# Neutral Mode Conventions

Active when the task involves building, implementing, fixing, or
mechanical work. Keywords: "build", "implement", "fix", "commit",
"refactor". Default mode when neither generative nor evaluative
indicators dominate.

## Adjustments

- **Both generators active.** No checks suppressed — generative and
  evaluative constraints apply equally.
- **Bias toward action.** When analysis and implementation compete for
  attention, favor implementation. Neutral mode produces artifacts.
- **Verify at boundaries.** Test at system boundaries (user input,
  external APIs, file I/O). Trust internal code and framework
  guarantees.

## Still Active

All constraints from all layers apply at normal strength.

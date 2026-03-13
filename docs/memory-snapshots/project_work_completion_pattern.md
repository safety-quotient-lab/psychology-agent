---
name: work-completion-pattern-design
description: Unfinished — work completion pattern generator that learns from session carryover data to calibrate work planning
type: project
---

Work completion pattern generator — partially implemented, needs finishing.

**Why:** When sessions end with remaining work, the active thread captures *what*
carries over but not *why* or *how often*. The metacognitive layer needs this data
to calibrate work planning: which work types complete in one session vs span many?
Which get abandoned? Frequency-amplitude coupling (CPG #13) applies — the agent
should scope work proportionally to available session capacity.

**How to apply:** During /cycle, log unfinished work items to `work_carryover` table
via `dual_write.py work-carryover`. At session start, query carryover items and
surface items carried 3+ sessions (chronic carryover = pattern signal). When work
completes, resolve via `dual_write.py work-resolved`.

**Status (Session 84):** cogarch.py functions written (`log_work_carryover`,
`resolve_work_carryover`). CLI subcommands added (`work-carryover`, `work-resolved`).
**Remaining:** register in dispatch table, test, integrate into /cycle Step 6,
integrate into T1 session start, design the pattern analysis queries (which work
types tend to carry? which get abandoned? what predicts single-session completion?).

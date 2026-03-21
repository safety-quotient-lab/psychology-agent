---
name: Outbound transport messages require PRs to peer repos
description: No mechanical check catches missing PRs when writing outbound transport messages — three-layer fix assigned to ops (PR #112)
type: feedback
---

When writing a transport message addressed to a peer agent (to.agent_id field),
a PR to the peer's repo must accompany it. Session 95 missed this — wrote the
message, pushed to origin, but forgot the PR until the user caught it.

**Why:** The "PRs only for cross-machine changes" decision (Session 67) exists
as memory, not as a mechanical check. No hook, no /sync check, no automation
enforces it.

**How to apply:** Three-layer fix (assigned to ops-session, PR #112 comment):
1. PostToolUse hook warns on outbound transport writes
2. /sync Phase 5 verifies PRs exist for outbound messages
3. Outbound triple-write handles all three writes mechanically

Until the fix ships: manually check after every outbound transport write —
"did I create the PR to the peer repo?"

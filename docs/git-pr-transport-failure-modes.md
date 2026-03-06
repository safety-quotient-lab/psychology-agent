# git-PR Transport — Failure Mode Taxonomy and Protocol Responses

**Date:** 2026-03-06
**Status:** Active — derived from observed failures (Session 21–22) and BFT analysis
**Resolves:** EF-4 (epistemic flag from bft-design-note.md)
**Related:** docs/item2b-spec.md (peer layer), docs/bft-design-note.md (BFT principles),
docs/command-request-v1-spec.md (command protocol)

---

## Overview

Classical BFT literature assumes network partitions (nodes cannot communicate).
git-PR transport has fundamentally different failure characteristics: stronger
integrity (git history is append-only, auditable) but weaker liveness (depends
on human relay availability).

This document maps the complete failure taxonomy for git-PR transport and
defines protocol responses for each mode.

---

## Failure Taxonomy

### F1: Concurrent Push Collision

**Description:** Two agents push to `main` simultaneously. The second push
gets rejected (`! [rejected] main -> main (fetch first)`).

**Observed:** Yes — Sessions 21, 21c, 22. Recurring pattern when both agents
work in parallel.

**Impact:** Second agent's commit blocks until rebase. No data loss — git
preserves both commits. Rebase may produce file-level conflicts if both
agents modified the same file.

**Detection:** Immediate — `git push` returns exit code 1 with explicit error.

**Protocol response:**
1. `git pull --rebase` — apply local commit on top of remote
2. If rebase conflict: resolve (prefer newer content for transport files;
   preserve both for doc files), `git add`, `git rebase --continue`
3. `git push` — retry once
4. If retry fails: human escalation (likely a third concurrent push)

**Prevention:**
- Sender-scoped turn numbering (proposed Session 21c) — each agent numbers
  its own turns independently, eliminating turn-number collisions
- Agents should pull before committing transport messages
- Session-start hook already warns about uncommitted changes

**Timeout:** None — collision detection is immediate.

---

### F2: Human Relay Delay

**Description:** User is unavailable to merge a PR or relay a message between
agents. Transport message sits undelivered.

**Observed:** Yes — routine delays between sessions when user is not active.

**Impact:** Message delivery delayed by hours to days. No data loss. Agents
continue working independently, accumulating divergent context.

**Detection:** Turn gap — if agent expects a response to turn N and no turn
N+1 arrives within the expected window, the message may be delayed.

**Protocol response:**
1. **No automatic retry** — delay is inherent to human-mediated transport
2. Agent notes the pending message in its `action_gate` with
   `gate_status: "blocked"` and the expected response
3. Agent may continue non-dependent work while waiting
4. After 24 hours without response: agent may re-ping with a
   `status-update` message referencing the pending turn

**Timeout:** 24 hours before re-ping. No hard timeout — human availability
is unpredictable and forcing urgency serves no purpose.

**Divergence management:** `context_state.last_commit` and `last_timestamp`
allow the receiving agent to measure how much context has diverged during
the delay. Extended delays (>48 hours) warrant a full `context_state` sync
before resuming substantive exchanges.

---

### F3: PR Not Merged (Message Loss)

**Description:** A PR is submitted but never merged — the reviewer misses it,
it conflicts with other PRs, or the agent's session ends before merge.

**Observed:** Not yet — all PRs merged to date. Risk increases as PR volume
grows.

**Impact:** Message effectively lost. The receiving agent never sees it. The
sending agent may believe delivery occurred.

**Detection:** Turn gap detection. If the sender's next message references a
turn that the receiver never received, the gap becomes visible.
Alternatively: the sender can check PR status via `gh pr list`.

**Protocol response:**
1. Sender checks: did the PR merge? (`gh pr view <number> --json state`)
2. If not merged: re-submit as new PR or commit directly to main
3. If PR was closed without merge: investigate why (conflict, stale, human
   decision) before re-sending — the closure may be intentional
4. Critical messages (command-requests, decisions) should use direct
   commit to main rather than PR when possible to avoid this failure mode

**Prevention:**
- Prefer direct push to main for same-repo transport (current practice)
- Reserve PR-based transport for cross-repo messages (observatory exchanges)
- Turn numbering makes gaps detectable

---

### F4: Merge Order Differs from Send Order

**Description:** Multiple PRs or commits are merged in a different order than
they were sent. Messages arrive out of sequence.

**Observed:** Not directly, but concurrent pushes (F1) create the conditions.

**Impact:** Receiver processes messages in wrong order. Responses may reference
context the receiver hasn't seen yet.

**Detection:** Turn numbers. If turn N+2 arrives before turn N+1, the receiver
knows a message is out of order.

**Protocol response:**
1. Receiver processes messages in turn-number order, not arrival order
2. If a gap exists (turn N+2 arrives, N+1 missing): hold N+2, request
   re-send of N+1
3. If gap persists after one round-trip: process N+2 with explicit note
   that N+1 was skipped, and flag the gap in `epistemic_flags`

**Prevention:**
- Sequential commits (don't batch multiple turns in parallel pushes)
- Turn numbering makes reordering detectable and correctable

---

### F5: Silent Drop (Agent Never Reads Message)

**Description:** Message committed to repo, but the receiving agent's session
ends before reading it, or context compaction drops the awareness that an
unread message exists.

**Observed:** Partially — Session 22 processed 3 unread messages from psq-agent
(turns 8–10) that accumulated during context compaction.

**Impact:** Message delivered to repo but not to agent context. Functionally
equivalent to message loss from the receiving agent's perspective.

**Detection:** Session-start orientation (T1) should scan transport directories
for unprocessed messages. Current implementation: manual check of turn log.

**Protocol response:**
1. **Session-start scan** — T1 orientation should include: check
   `transport/sessions/*/` for messages with turn numbers higher than
   the last processed turn noted in MEMORY.md
2. Agent notes last-processed turn per session in MEMORY.md Active Thread
3. Unread messages processed in turn order before new work begins
4. For command-requests: unread commands do NOT auto-execute on discovery.
   Agent reads, evaluates preconditions, and responds with current state

**Prevention:**
- `/cycle` skill (post-session) should note pending unread messages
- `pre-compact-persist.sh` hook surfaces Active Thread before compaction —
  extend to include unread transport message count
- MEMORY.md Active Thread should track last-processed turn per session

---

### F6: Conflict Marker Corruption

**Description:** Git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
left in transport JSON files after an improperly resolved rebase.

**Observed:** Yes — Session 21c, stale `>>>>>>> 44f5ada` marker found in
lab-notebook.md. Not yet observed in transport JSON, but the same mechanism
applies.

**Impact:** Malformed JSON. Receiving agent cannot parse the message. If the
agent attempts to process the file, JSON.parse fails and the message content
is inaccessible.

**Detection:** JSON validation on read. Any transport file that fails
`JSON.parse()` is corrupt.

**Protocol response:**
1. Receiving agent: flag the corrupt file in `epistemic_flags` and request
   re-send from the sender
2. Do not attempt to extract content from corrupted JSON — conflict markers
   may have mangled field values in non-obvious ways
3. Sending agent: re-commit the message as a clean file

**Prevention:**
- Always validate JSON after rebase resolution before committing
- PostToolUse hook on Edit could validate JSON syntax for `.json` files
- `git diff --check` before commit detects leftover conflict markers

---

### F7: Stale Branch Divergence

**Description:** Agent works on a branch that has fallen behind `main`. When
it pushes, the commit history has diverged significantly from the remote.

**Observed:** Routinely — every `git pull --rebase` during Session 21–22
involved minor divergence. No major divergence yet.

**Impact:** Rebase required. If divergence is large, rebase conflicts multiply.
In extreme cases, the agent's work may need manual integration.

**Detection:** `git status` shows "Your branch is behind 'origin/main' by N
commits." Session-start hook already warns about this.

**Protocol response:**
1. Always `git pull` before starting transport message composition
2. If behind by >5 commits: read the intervening commits before proceeding
   (they may contain messages that change context)
3. If rebase produces >2 conflicts: abort rebase, pull changes into a merge
   commit instead, and flag the merge in the next transport message

**Prevention:**
- Frequent small commits (current practice)
- Session-start hook pulls latest before work begins
- Agents should not accumulate large uncommitted change sets

---

### F8: Split-Brain (Dual Main)

**Description:** Two agents diverge from `main` with incompatible commit
histories. Neither can fast-forward to the other's state.

**Observed:** Not yet. Would require both agents to force-push or work on
separate forks without syncing.

**Impact:** Severe — manual reconciliation required. Message history may
be inconsistent between the two agents' views of the repo.

**Detection:** `context_state.last_commit` mismatch where neither commit
is an ancestor of the other. `git merge-base` returns a common ancestor
that is far behind both HEADs.

**Protocol response:**
1. **Stop all transport** until reconciled
2. Human arbitrates: which branch represents ground truth?
3. Non-canonical branch rebased onto canonical branch
4. Both agents sync to reconciled `main` before resuming

**Prevention:**
- Never force-push to main (CLAUDE.md already prohibits)
- Single shared remote (current architecture)
- Agents always work on `main`, not feature branches, for transport

**Timeout:** Immediate escalation to human. No automated resolution.

---

## Timeout Summary

```
┌──────┬──────────────────────────────┬──────────────┬───────────────────────┐
│ Mode │ Failure                      │ Timeout      │ Escalation            │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F1   │ Concurrent push collision    │ Immediate    │ Auto-rebase; human    │
│      │                              │              │ if retry fails        │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F2   │ Human relay delay            │ 24h re-ping  │ None — inherent to    │
│      │                              │              │ transport model       │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F3   │ PR not merged                │ 48h check    │ Re-submit or direct   │
│      │                              │              │ commit                │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F4   │ Merge order mismatch         │ 1 round-trip │ Process with gap flag │
│      │                              │              │                       │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F5   │ Silent drop                  │ Session start│ Scan + process in     │
│      │                              │              │ turn order            │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F6   │ Conflict marker corruption   │ On read      │ Request re-send       │
│      │                              │              │                       │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F7   │ Stale branch                 │ On push      │ Rebase or merge;      │
│      │                              │              │ human if >2 conflicts │
├──────┼──────────────────────────────┼──────────────┼───────────────────────┤
│ F8   │ Split-brain                  │ Immediate    │ Stop transport;       │
│      │                              │              │ human arbitrates      │
└──────┴──────────────────────────────┴──────────────┴───────────────────────┘
```

---

## Comparison to Classical BFT Failure Modes

| Classical failure     | git-PR equivalent      | Severity | Notes                          |
|---|---|---|---|
| Network partition     | F2 (human delay)       | Low      | Delay, not split-brain         |
| Message loss          | F3 (PR not merged)     | Medium   | Turn numbers detect gaps       |
| Message reorder       | F4 (merge order)       | Low      | Turn numbers resolve           |
| Byzantine message     | F6 (corruption)        | Medium   | JSON validation detects        |
| Sybil attack          | Not observed            | Low      | `from.agent_id` + git author   |
| Equivocation          | F8 (split-brain)       | High     | Prevented by single remote     |

git-PR transport trades liveness (human-dependent) for stronger integrity
(append-only history, auditable). The dominant failure mode is delay (F1, F2),
not data corruption or loss.

---

## Actionable Improvements

### Immediate (no code required)

1. **Sender-scoped turn numbering** — each agent prefixes turns with its own
   counter (e.g., `ga-12`, `psq-9`) to eliminate collision on shared turn
   numbers. Both agents adopt in next message.

2. **Last-processed turn in MEMORY.md** — add `last_processed_turn` per
   session to Active Thread. Enables F5 detection at session start.

### Short-term (hook/skill changes)

3. **Transport scan at session start** — extend T1 / session-start-orient.sh
   to scan `transport/sessions/*/` for messages newer than last-processed turn.
   Output count of unread messages.

4. **JSON validation in PostToolUse** — extend Write/Edit hook to validate
   `.json` files after write. Catches F6 before commit.

### Medium-term (protocol changes)

5. **ACK requirement for command-requests** — command-request messages require
   explicit command-response. No-response within 48h triggers re-send with
   `retry: true` flag.

6. **Divergence budget** — define maximum acceptable `context_state.last_commit`
   distance before requiring full sync. Suggested: if `git rev-list --count`
   between commits exceeds 10, require sync before substantive exchange.

---

## References

- docs/bft-design-note.md — Byzantine fault tolerance principles
- docs/item2b-spec.md §Divergence Detection — `context_state` signaling
- docs/command-request-v1-spec.md — command protocol (first consumer of
  these failure mode responses)
- Session 21c lab-notebook — observed F1 (concurrent push), F6 (conflict
  marker corruption)

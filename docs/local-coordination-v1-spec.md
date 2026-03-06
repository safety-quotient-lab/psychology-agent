# Local Coordination Protocol — local-coordination/v1

**Date:** 2026-03-06
**Status:** Active — in use between concurrent psychology-agent instances
**Prerequisite:** interagent/v1 base protocol (docs/subagent-layer-spec.md)
**Related:** .well-known/agent-card.json (lists local-coordination/v1 in schemas_supported)


---

## Overview

The local-coordination protocol governs communication between concurrent instances
of the **same agent** sharing a single git repository and branch. Unlike interagent/v1
(which coordinates between distinct agents), local-coordination/v1 addresses a narrower
problem: preventing data loss and conflict when multiple Claude Code sessions operate
on the same codebase simultaneously.

**Scope:** Same agent, same repo, same branch (typically main). For cross-agent
communication, use interagent/v1 instead.


---

## Why Not Just Use interagent/v1

interagent/v1 assumes distinct agents with separate identities, capabilities, and
trust boundaries. Concurrent instances of the same agent share:

- The same identity and authority level
- The same memory files and documentation
- The same git working tree and staging area

The coordination problem differs: not "how do peers exchange information" but
"how do co-writers avoid overwriting each other's work." interagent/v1 adds
unnecessary ceremony (SETL, source_confidence, claims[]) for what amounts to
a mutex and notification system.


---

## Conventions

### 1. Git Discipline

These conventions apply whenever multiple instances may operate concurrently:

- **Pull before operating.** Run `git pull` at session start and before any
  commit to detect changes from other instances.

- **Commit before yielding.** Never leave meaningful work unstaged. Unstaged
  changes have zero protection against concurrent operations (stash, checkout,
  reset by any instance). Even a WIP commit on a local branch provides safety.

- **Check for unexpected commits.** After pulling, scan `git log` for commits
  not made by this instance. If found, read them before proceeding.

- **Stage atomically.** When working near files another instance may touch,
  stage and commit frequently rather than accumulating a large changeset.


### 2. Message Directory

```
transport/sessions/local-coordination/
```

All local-coordination messages live in this directory. Instances check this
directory at session start and before major operations.


### 3. File Naming

```
{from-instance-identifier}-{sequence}.json
```

The instance identifier should include enough context to trace authorship:
session number, model, or distinguishing label.

Examples:
- `from-opus-session-23b-001.json`
- `from-opus-session-23c-002.json`
- `from-local-instance-001.json`


### 4. Message Types

Messages carry a top-level `items` or `issues` array. Each entry has a `type` field:

| Type | Purpose | Requires response |
|------|---------|-------------------|
| `intent` | Announce planned work before starting | No (advisory) |
| `completion` | Report what was committed | No (informational) |
| `heads-up` | Flag something the other instance should know | No |
| `data-loss-notice` | Report lost or overwritten work | No (but remedy expected) |
| `state-sync` | Share state relevant to the other instance | No |
| `issue` | Identify a problem with severity + remedy | Depends on severity |
| `ack` | Acknowledge receipt of a prior message | No |
| `todo-stale` | Flag a stale backlog item | No |

New types may appear without schema changes — the protocol is extensible by convention.


---

## Schema

```json
{
  "schema": "local-coordination/v1",
  "session_id": "local-coordination",
  "turn": 1,
  "timestamp": "ISO-8601 with timezone offset",

  "from": {
    "agent_id": "psychology-agent",
    "instance": "descriptive instance identifier",
    "context": "brief description of what this instance is working on"
  },
  "to": {
    "agent_id": "psychology-agent",
    "instance": "target instance identifier (or 'all local instances')"
  },

  "subject": "one-line summary",

  "items": [
    {
      "item_id": "1",
      "type": "intent | completion | heads-up | issue | ack | ...",
      "subject": "short title",
      "detail": "full description"
    }
  ],

  "epistemic_flags": []
}
```

**Required fields:** schema, session_id, turn, timestamp, from, to, subject.
**Optional fields:** items (or issues), in_response_to, epistemic_flags, urgency.

The `items` and `issues` arrays serve the same structural purpose. Early messages
used `items`; the issues-with-remedies pattern used `issues` with `severity` and
`remedy` sub-objects. Both forms are valid.


---

## Issue Severity

When using the `issues` array pattern:

| Severity | Meaning | Expected response |
|----------|---------|-------------------|
| `HIGH` | Data loss occurred or work is at risk | Immediate attention when instance resumes |
| `MEDIUM` | Structural problem that will recur | Address within current session |
| `LOW` | Minor inconsistency or stale state | Address when convenient |


---

## Relationship to interagent/v1

local-coordination/v1 is a sibling protocol, not an extension. It shares some
structural conventions (JSON messages, turn numbering, epistemic_flags, session
directories) but omits interagent/v1 machinery that does not apply to same-agent
coordination:

- No SETL (editorial inferential distance) — same agent, same trust
- No source_confidence — both instances access the same data
- No claims[] — no need to attribute specific factual claims
- No action_gate — coordination is advisory, not gating
- No convergence_signals — no evaluator tier to trigger

If the protocol needs any of these features in the future, that signals the
instances have diverged enough to warrant interagent/v1 instead.


---

## Future Considerations

**Instance-named branches.** The strongest conflict prevention uses git itself:
each instance operates on a named branch (e.g., `psychology-agent/session-24`)
and merges to main only when complete. This eliminates the overwrite risk entirely
but adds merge overhead. Adopt if concurrent-instance conflicts recur.

**Lock file.** A `.claude/active-instance.lock` file that instances check and claim
provides mechanical exclusion. Fragile (crashes leave stale locks) but simple.
Consider only if branch-based isolation proves too heavy.

**Session-start hook integration.** The session-start-orient.sh hook already
checks for uncommitted changes. Extending it to scan `transport/sessions/local-coordination/`
for unread messages addressed to this instance would provide mechanical discovery.


---

## Existing Messages

Two messages established the protocol through use:

1. **Turn 1** (`from-opus-session-23b-001.json`) — 5 items: file protection heads-up,
   data loss notice, urgency field state-sync, stale TODO, semantic naming ACK.

2. **Turn 2** (`from-opus-session-23c-002.json`) — 5 issues with severity + remedies:
   unstaged work vulnerability (HIGH), no coordination protocol (MEDIUM), agent-card
   divergence (MEDIUM), stale TODO (LOW), incomplete rename (LOW).

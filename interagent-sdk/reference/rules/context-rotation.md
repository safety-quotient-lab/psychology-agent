# Context Rotation Protocol

Agents MUST support graceful context rotation. When the operator requests
a rotation, the agent checkpoints work-in-progress and exits cleanly so
the next invocation starts a fresh context.

---

## Sentinel Detection

The operator drops a JSON sentinel file at `/tmp/context-rotate-{agent-id}`.

Agents running autonomous sync loops MUST check for this sentinel at the
start of each cycle. Interactive sessions SHOULD check via a pre-action hook.

Sentinel payload:

```json
{
  "reason": "human-readable rotation reason",
  "requested_at": "ISO 8601 timestamp",
  "requested_by": "operator"
}
```

---

## Checkpoint Procedure

When the sentinel exists, the agent MUST:

1. **Persist unfinished work** — Write `context-resume.md` in the project
   root with frontmatter and a structured summary of in-progress tasks,
   active decisions, and any context the next invocation needs.

2. **Update documentation** — Run the equivalent of `/cycle`:
   - Update `plan.md` with current phase progress
   - Update `MEMORY.md` with any new volatile state
   - Persist private docs (lab-notebook, journal, lessons)

3. **Commit** — Stage and commit all changes with message format:
   `context-rotate: checkpoint — {reason from sentinel}`

4. **Remove sentinel** — Delete `/tmp/context-rotate-{agent-id}` to signal
   completion to the operator's wait loop.

5. **Exit** — Terminate the current session. The next invocation picks up
   from the checkpoint.

---

## context-resume.md Format

```markdown
---
rotated_at: 2026-03-13T12:00:00Z
reason: context expansion to 1M tokens
previous_context_model: claude-opus-4-6
---

## Unfinished work

- [ ] Description of task in progress — reference plan.md phase/step
- [ ] Transport session X needs response drafted

## Active decisions

- Decision Y under evaluation — see plan.md Decisions table

## Context to restore

- Key finding or state that the next invocation needs
- Active branch: feature/foo (if not main)

## Deferred items

- Items deliberately postponed — not forgotten, just queued
```

---

## Resumption

On startup, the agent SHOULD check for `context-resume.md`. If present:

1. Read and incorporate the unfinished work into the current session plan
2. Rename to `context-resume.prev.md` (one generation of history)
3. Continue work from where the previous context left off

If `context-resume.prev.md` already exists, overwrite it — keep only one
generation of history.

---

## Operator Commands

```bash
# Rotate all agents
./scripts/context-rotate.sh --reason "1M context expansion"

# Rotate one agent
./scripts/context-rotate.sh psq --reason "1M context expansion"

# Check progress
./scripts/context-rotate.sh --status

# Cancel pending rotation
./scripts/context-rotate.sh --clear

# Block until all checkpoints complete
./scripts/context-rotate.sh --wait --timeout 120
```

---

## Safety Rules

- NEVER force-kill an agent context without dropping the sentinel first
- The agent decides when checkpoint completes — operator waits, not forces
- If an agent fails to checkpoint within timeout, the sentinel remains
  and the agent will checkpoint on its next sync cycle
- Mesh-pause (`/tmp/mesh-pause`) takes priority — if mesh paused, agents
  will not run sync loops, so rotation waits until unpause

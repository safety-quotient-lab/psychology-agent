---
name: cycle
description: Post-session documentation chain — propagate changes through plan.md, MEMORY.md, private docs, agent-card, and commit.
user-invocable: true
argument-hint: "[scope summary for commit message]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Post-Session Cycle (Operations Agent)

Ensures every session's decisions, findings, and reasoning propagate through the
full documentation chain. Run at the end of any session with meaningful work.

### When to run

Run /cycle **once, after all work in the session completes.** Do not run it
mid-session when the user might continue working.

---

## Document Hierarchy

Two layers: public (committed to repo) and private (auto-memory only).

### Public (repo)

| Document | Audience | Purpose |
|---|---|---|
| `plan.md` | All stakeholders | Hub — status, phases, next steps, decisions |
| `.well-known/agent-card.json` | Mesh peers | Discovery manifest — skills, tabs, peers |
| `cogarch.config.json` | Claude | Cognitive architecture — identity, peers, capabilities |
| `CLAUDE.md` | Claude Code (auto-read) | Stable conventions, project structure |
| `interagent/vocab.json` | Mesh | Shared vocabulary definitions |

### Private (auto-memory — `~/.claude/projects/.../memory/`)

| Document | Purpose |
|---|---|
| `MEMORY.md` | Index — volatile state, active thread, doc pointers |
| `cognitive-triggers.md` | Trigger system T1–T8+ — firing conditions, checks |
| `lab-notebook.md` | Session log — what happened, when, what artifacts |
| `journal.md` | Research narrative — why decisions were made |
| `lessons.md` | Lessons learned — pattern errors, architecture insights |

---

## Checklist

Work through each step. Skip any that don't apply to the session's changes.

### 1. Identify What Changed

- Summarize from context what was done this session
- Categorize: compositor changes, vocabulary governance, transport messages,
  agent-card updates, infrastructure, cogarch, documentation-only
- Categorization determines which downstream documents need updates

### 2. Update plan.md (public)

Always update.

- **Current Status** (top line — overwrite in place): reflect session end state
- **Phase checklists**: mark completed items `[x]`, add new items
- **Decisions table**: add new decisions with ID, text, and source
- **Constraints**: update if constraints changed

### 3. Update lab-notebook.md (private)

Always update. Every session with meaningful work gets an entry.

**Current State block** (top section — overwrite in place):
- Update item statuses: ✓ (complete), ✗ (pending), ⚑ (blocked)
- Add new tracked items if new deliverables emerged
- Remove items fully complete and stable

**New session entry** (append at bottom of session log):
- Header: `### YYYY-MM-DD — Session N: 1-line summary`
- Bullet points: what happened, decisions made, artifacts created
- Cross-references: `▶ journal.md §N` for detailed write-ups
- Note skills created mid-session that need restart to load

**Open Questions** (end of current state block):
- Strike through answered questions
- Add new open questions

### 4. Update journal.md (private)

Update when the session produced something worth narrating:
- A significant design decision and its reasoning
- A conceptual reframe
- A resolved research question
- A notable failure or insight about mesh operations

**When to skip:**
- Routine documentation passes (/cycle itself)
- Minor config tweaks with no conceptual significance

**How to write:**
- First-person plural ("we resolved," "our analysis found")
- Focus on *why* — the reasoning, not just the outcome
- Add to Table of Contents if a new section added

### 5. Update lessons.md (private)

Update when a transferable pattern error or architecture insight emerged.

**Each entry requires:**
```yaml
pattern_type: reasoning-error | architecture-insight | operational-finding
domain: compositor | vocabulary | transport | infrastructure | discovery | governance
severity: high | medium | low
recurrence: N
first_seen: YYYY-MM-DD
trigger_relevant: T{N}
promotion_status: null | candidate | approved | graduated
```

**The lesson, the tell, the diagnostic, where it appeared.**

**Promotion scan:** If 3+ lessons share the same `pattern_type` or `domain`,
mark them `promotion_status: candidate`. Candidates for promotion to
CLAUDE.md convention or cognitive trigger. Surface to user — do not auto-promote.

### 6. Update MEMORY.md (private)

- **Active Thread**: update to reflect session end state
- **Private Documentation**: verify pointers to all private docs
- **Decisions**: add new decision references
- Keep under 200 lines

### 7. Update cognitive-triggers.md (private)

Update when cogarch itself was modified:
- Triggers added, changed, or retired
- New failure analyses
- Future mitigation slots filled

Skip if no cogarch changes occurred.

### 8. Update .well-known/agent-card.json (public)

Update when any of these changed:
- Skills added or modified
- Tabs added or modified
- Peers added or removed
- Capabilities changed

Skip if no mesh-facing changes occurred.

### 9. Update cogarch.config.json (public)

Update when:
- Identity or role description changed
- Peers added or removed
- Capabilities changed
- Infrastructure endpoints changed

Skip if no cogarch changes occurred.

### 10. Update CLAUDE.md (public)

Update when stable conventions change or new skills are created:
- Add new skills with one-line description
- Update mesh conventions if changed

Skip for volatile-state-only sessions.

### 11. Update interagent/vocab.json (public)

Update when shared vocabulary terms were added, modified, or deprecated.

Skip if no vocabulary governance actions occurred.

### 12. Orphan Check

- Check for references in docs to files that no longer exist
- Verify agent-card peers match cogarch.config.json peers
- Check plan.md decision IDs are referenced in MEMORY.md
- Verify lab-notebook Current State matches plan.md phase status

### 13. Git Commit and Push

```bash
git add -A
git status
```

Review staged files. Verify no private content leaking (credentials, hostnames).
Then commit and push:

```bash
git commit -m "{scope summary}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

Skip if `git status` shows nothing staged.

### 14. Summary

Report:
- **Public docs updated**: which files, what changed
- **Private docs updated**: which memory files, what changed
- **Skipped**: which steps, with reason
- **Git commit + push**: hash + one-line message, or reason skipped
- **Lessons**: any new lessons recorded this session
- **Next session**: what work comes next
- **MEMORY.md line count**: current / 200

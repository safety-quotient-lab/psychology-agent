# Post-Session Cycle (General Agent)

Ensures every session's decisions, findings, and reasoning propagate through the
full documentation chain. Run at the end of any session with meaningful work.

**Design principle:** The general agent maintains several overlapping documents at
different levels of abstraction. Each serves a distinct audience and purpose:

| Document | Audience | Purpose | Abstraction |
|---|---|---|---|
| `journal.md` | Peer reviewers, future self | Research narrative — why decisions were made, what was resolved, what the data or reasoning revealed | Highest — tells the story |
| `docs/architecture.md` | Technical collaborators | Design decisions and system spec — all resolved choices, authority hierarchy, component specs | Medium — shows the decisions |
| `lab-notebook.md` | Future self, collaborators | Session log — what happened, when, with what artifacts; Current State block | Chronological — records the timeline |
| `ideas.md` | Authors | Speculative research directions — not committed, not retired; marked by precondition | Generative — captures the possible |
| `TODO.md` | Authors | Forward-looking task backlog — open items only; completed items route to lab-notebook | Operational |
| `MEMORY.md` | Claude across sessions | Volatile orientation state — active thread, design decisions, cogarch quick-ref | Cross-session context |
| `docs/cognitive-triggers.md` | Claude | Full T1–T12 trigger system — canonical, in-repo | Operational infrastructure |
| `CLAUDE.md` | Claude Code (auto-read) | Stable conventions — communication policy, accessibility, project structure, skills | Foundational — how the project works |
| `docs/MEMORY-snapshot.md` | Fresh Claude sessions | Committed copy of MEMORY.md — portable orientation for fresh installs | Bootstrap context |
| `docs/cognitive-triggers.md` | Claude + fresh sessions | Full trigger system — canonical location (no separate snapshot needed) | Operational infrastructure + bootstrap |

When something changes, update relevant documents *at the appropriate level of
abstraction*. A resolved design decision needs an entry in architecture.md (facts),
possibly a journal paragraph (if it reveals something significant), and an Active
Thread update in MEMORY.md. A routine cogarch tweak might only need cognitive-triggers.md.

---

## Checklist

Work through each step. Skip any that don't apply to the session's changes. When
in doubt whether a step applies, check the document's current state — if accurate, skip.

### 1. Identify What Changed

- Summarize from context what was done this session
- Categorize: design decisions, cogarch changes, new skills, architecture specs,
  research findings, ideas, documentation-only, bugfix
- Categorization determines which downstream documents need updates

### 2. Update lab-notebook.md

Always update. This is the most universal step — every session with meaningful work
gets an entry.

**Current State block** (top section, *overwrite in place* — not appended):

- Update item statuses: ✓ (complete), ✗ (pending), ⚑ (blocked)
- Add new tracked items if new deliverables emerged this session
- Remove items that are now fully complete and stable (route to journal if significant)

**New session entry** (append at bottom of session log):

- Header: `## YYYY-MM-DDTHH:MM TZ — Session N (1-line summary)`
  Run `date '+%Y-%m-%dT%H:%M %Z'` before writing. No approximate timestamps.
- Bullet points: what was done, what decisions were made, what artifacts created
- Cross-references: `▶ journal.md §N, docs/architecture.md` for detailed write-ups
- Note skills created mid-session that need restart to load

**Open Questions** (end of current state block):

- Strike through answered questions with `~~Q: text~~` and add `**ANSWERED:** ...`
- Add new open questions that emerged from the session

### 3. Update journal.md

Update when the session produced something worth narrating — a significant design
decision, a conceptual reframe, a resolved research question, a notable failure.

**When to update:**
- A design decision was resolved and the reasoning matters for the record
- A conceptual reframe changed a class of problems (not just one answer)
- A framework or approach was rejected for documented reasons
- The session revealed something about the project's direction

**When to skip:**
- Routine documentation passes (/cycle itself, doc migrations)
- Minor cogarch tweaks with no conceptual significance
- Task completions that are already fully captured in lab-notebook.md

**How to write:**
- First-person plural ("we resolved," "our analysis found")
- Focus on *why* — the reasoning, not just the outcome
- Add to Table of Contents if a new section is added
- In-text citations where connecting to established literature

### 4. Update docs/architecture.md

Update when any design decision is resolved, modified, or its implementation
approach changes.

- **Decisions table**: add or update resolved decisions with date
- **Component specs**: if a component was designed (general agent identity,
  sub-agent comm standard, evaluator logic), add its spec section
- **Status markers**: update ✗ → ✓ for items that are now complete
- **Authority hierarchy**: update only if the hierarchy itself changed (rare)

Skip if no design decisions were made or changed.

### 5. Update ideas.md

- **New ideas surfaced**: add entries in appropriate category with precondition
- **Promoted to TODO**: mark idea as `[→ TODO]` with date
- **Retired**: mark as `[retired — reason]` if superseded by architecture decisions
- **Precondition met**: flag ideas whose stated precondition is now satisfied

### 6. Update TODO.md

Forward-looking only. Light-touch maintenance.

- **Completed items**: remove (summary goes to lab-notebook.md session entry)
- **New items**: add items that emerged from this session's work
- **Stale items**: update status if an in-progress or blocked item has changed state
- **Blocked items**: note what's blocking and what would unblock

Skip if nothing changed that affects the task list.

### 7. Update Memory Files

Memory uses an index + topic file pattern. MEMORY.md is the always-loaded index
(~55 lines). Topic files hold detail and are read on demand.

**Routing table — what changed this session → which file to update:**

| Change type | Target file |
|-------------|-------------|
| Active thread (where we stopped, next) | `MEMORY.md` (index) |
| Design decision resolved/modified | `memory/decisions.md` |
| Authority hierarchy changed | `memory/decisions.md` |
| Trigger added/changed, cogarch principle | `memory/cogarch.md` |
| Knock-on depth, adjudication tiers | `memory/cogarch.md` |
| Working principle (edit/date/anti-sycophancy) | `memory/cogarch.md` |
| PSQ calibration, deploy, or open issues | `memory/psq-status.md` |
| User preference | `MEMORY.md` (index) |
| Memory hygiene rule | `MEMORY.md` (index) |

**MEMORY.md index**: update Active Thread to reflect session end state. Keep under 60 lines.

**Topic files**: update only the files that changed this session. No line limit on topic files.

**Memory hygiene (T9)**:
- Remove or update stale entries in any memory file
- Check for duplicates across files (don't add what's already there)
- Verify no speculation is persisted as fact
- Check MEMORY.md line count: target < 60 lines (hard limit 200, but the index
  should stay lean; detail goes to topic files)

### 8. Update docs/cognitive-triggers.md

Update when cogarch itself was modified — triggers added, changed, or retired;
failure analyses added; future mitigations updated. This file lives in the repo
(canonical location), not in auto-memory.

- **New triggers**: add to the appropriate T-slot or after T12
- **Modified triggers**: update the relevant section
- **Future mitigations**: if T11 produced deferred items, ensure each has a
  mitigation entry in the Future Mitigations table
- **Failure analyses** (FA): if a cogarch failure was analyzed this session,
  add an FA entry with the 6-order cascade

Skip if no cogarch changes were made.

### 8b. Update lessons.md

Lessons are written in-moment by T10 and T12 — /cycle is the safety net that
catches anything that should have been written but wasn't.

- **T10 review:** Did any of these fire this session?
  - A transferable pattern error was identified
  - User said "grok" or "internalize"
  - A conceptual reframe changed how a class of problems should be approached
  If yes: verify a lessons.md entry exists. If not, write it now.

- **T12 review:** Did the user signal "good thinking" or "good defensive thinking"?
  If yes: verify the named principle has a lessons.md entry. If not, write it now.

- **Format check:** Any entries written this session — do they have full timestamps?
  Date-only entries need a timestamp if the exact time is known; otherwise leave as-is.

- **Duplicate check:** No two entries for the same pattern. Update rather than append.

- **Schema check:** Any entries written this session — do they have YAML frontmatter
  with `pattern_type`, `domain`, `severity`, `recurrence`, `trigger_relevant`,
  `promotion_status`? If not, add the frontmatter now.

- **Promotion scan:** Count entries by `pattern_type` and `domain`. If 3+ lessons
  share the same value, mark them `promotion_status: candidate` and flag with
  `[→ PROMOTE]`. Promotion targets:
  - Recurring `pattern_type` → candidate for CLAUDE.md convention or cogarch trigger
  - Recurring `domain` → candidate for domain-specific `.claude/rules/` file
  - Action: add a one-line note to the /cycle summary identifying the promotion
    candidate and the proposed target. Do not promote automatically — surface to
    the user as a recommendation (T3 substance decision).

Skip if no T10 or T12 firings occurred this session.

### 9. Update CLAUDE.md

Update when stable conventions change or new skills are created.

- **Skills section**: add any new skills with a one-line description
- **Communication conventions**: update if a communication policy changed (rare)
- **Cognitive accessibility policy**: update if the policy itself changed (rare)
- Check line count — advisory limit ~200 lines.

Skip for volatile-state-only sessions.

### 10. Update docs/MEMORY-snapshot.md

Three-layer update to prevent silent loss of canonical state. Run in order.

**Step A: Versioned archive** — archive the *current canonical* before overwriting it.
This preserves every prior session state and enables recovery to any point.

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ARCHIVE_TS=$(date '+%Y-%m-%dT%H%M%S')
cp "${PROJECT_ROOT}/docs/MEMORY-snapshot.md" \
   "${PROJECT_ROOT}/docs/snapshots/MEMORY-snapshot-${ARCHIVE_TS}.md"
```

**Step B: Content guard** — verify the incoming MEMORY.md is substantive before
allowing it to overwrite the canonical. With the topic-file pattern, MEMORY.md
is the index (~55 lines). Threshold lowered to 30 lines.

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
MEMORY_DIR="$HOME/.claude/projects/${_HASH}/memory"
LINE_COUNT=$(wc -l < "${MEMORY_DIR}/MEMORY.md" | tr -d '[:space:]')
echo "MEMORY.md line count: ${LINE_COUNT}"
# Proceed only if LINE_COUNT >= 30. If below threshold, STOP and investigate.
```

If `LINE_COUNT < 30`: do **not** overwrite. Report the anomaly in the cycle summary.

**Step C: Update canonical** — copy index + all topic files. Only after A and B
complete successfully.

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
MEMORY_DIR="$HOME/.claude/projects/${_HASH}/memory"
SNAPSHOT_DIR="${PROJECT_ROOT}/docs"

# Index
cp "${MEMORY_DIR}/MEMORY.md" "${SNAPSHOT_DIR}/MEMORY-snapshot.md"

# Topic files → docs/memory-snapshots/ (committed alongside MEMORY-snapshot.md)
mkdir -p "${SNAPSHOT_DIR}/memory-snapshots"
for topic in decisions.md cogarch.md psq-status.md; do
  if [ -f "${MEMORY_DIR}/${topic}" ]; then
    cp "${MEMORY_DIR}/${topic}" "${SNAPSHOT_DIR}/memory-snapshots/${topic}"
  fi
done
```

The canonical (`docs/MEMORY-snapshot.md`) always reflects end-of-session state.
The archive (`docs/snapshots/`) accumulates one file per /cycle run (timestamp-keyed,
safe to run multiple times in the same day without collision).
BOOTSTRAP.md references the canonical — do not change that reference.

### 10b. Verify docs/cognitive-triggers.md

Cognitive triggers now live in-repo at `docs/cognitive-triggers.md` (canonical
location). No snapshot copy needed — the file itself is committed. Step 8
handles edits; this step verifies the file is substantive after any changes.

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LINE_COUNT=$(wc -l < "${PROJECT_ROOT}/docs/cognitive-triggers.md" | tr -d '[:space:]')
echo "docs/cognitive-triggers.md line count: ${LINE_COUNT}"
# Expected >= 100 lines. If below threshold, investigate.
```

Skip if no cogarch changes were made this session.

### 11. Orphan Check

- Check for references in docs to files that no longer exist or were renamed
- Check for skills created mid-session that haven't been verified post-restart
  (flag in lab-notebook.md if so — don't verify here, that requires a restart)
- Check for open questions in lab-notebook.md that have been answered but not struck
- Check BOOTSTRAP.md step sequence against what files actually exist

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
grep -o '`[^`]*\.md`' "${PROJECT_ROOT}/BOOTSTRAP.md" | tr -d '`' | sort -u
```

### 12. Git Commit and Push

Commit and push all documentation changes made this session.

```bash
# Guard — skip gracefully if no .git directory exists yet
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$PROJECT_ROOT"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Step 12 SKIPPED: no .git directory yet — commit deferred to post-reconstruction"
  # Proceed to Step 13
else

git add -A
git status
```

Review staged files. Then commit and push:

```bash
git commit -m "Session N: [scope summary]"
git push

fi  # end guard
```

The scope summary should match the one-line description from the lab-notebook
session entry header written in Step 2 (e.g., "Architecture design, skill
creation"). Keep it under 72 characters.

**Skip if:** `git status` shows nothing staged (read-only session, or all
changes were to gitignored files such as `lessons.md`). Note the skip in
Step 13.

### 13. Summary

Report:
- **Documentation updated**: which files, what was added or changed
- **Skipped**: which steps, with reason
- **Git commit + push**: hash + one-line message, or reason skipped
- **Skills created mid-session** that need restart to load (list them)
- **Next session**: what's first, what's blocked
- **MEMORY.md line count**: current / 200

---

## Propagation Rules

**A resolved design decision touches:**
architecture.md (facts) → journal.md if significant (narrative) →
MEMORY.md Design Decisions table → lab-notebook.md Current State

**A new cogarch trigger touches:**
docs/cognitive-triggers.md (Step 8) →
MEMORY.md quick-ref table → lab-notebook.md session entry

**A new skill touches:**
.claude/skills/ → CLAUDE.md Skills section → lab-notebook.md session entry

**An idea promoted to TODO touches:**
ideas.md (mark [→ TODO]) → TODO.md (add item) → lab-notebook.md session entry

**A stable convention change touches:**
CLAUDE.md → MEMORY.md (remove from MEMORY if it was there) → lab-notebook.md

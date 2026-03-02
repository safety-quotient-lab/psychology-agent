# Bootstrap Guide — General-Purpose Psychology Agent

How to bring a fresh Claude Code session to full project context.

---

## Step 1: Navigate to project root

```bash
cd /home/kashif/projects/psychology
```

Claude Code will auto-read `CLAUDE.md` at session start.

## Step 2: Load memory

Memory is path-hash dependent. The auto-memory file is at:

```
~/.claude/projects/-home-kashif-projects-psychology/memory/MEMORY.md
```

This loads automatically if you are working from the correct directory.
If context is missing, read MEMORY.md manually at session start.

A committed snapshot is available at `docs/MEMORY-snapshot.md` — use this
to restore context on a fresh install before the auto-memory file exists.

## Step 3: Verify skills loaded

Run `/doc` to confirm it loads. Expected response: skill invokes and
reports "nothing to document" or scans context for undocumented items.

Also verify `/hunt` and `/cycle` are available — all three skills should
load from `.claude/skills/` at session start.

If any skill is not found: it was likely created mid-session in a prior
run. Restart Claude Code from the project root to reload.

## Step 4: Orient to current state

Read in order:
1. `MEMORY.md` — current active thread and volatile state
2. `cognitive-triggers.md` — full T1–T12 trigger system (loaded at T1); lives
   in the auto-memory directory alongside MEMORY.md, not in the project root
3. `docs/architecture.md` — design decisions and system diagram
4. `lab-notebook.md` — last session summary and open questions
5. `TODO.md` — task backlog

**Note:** `CLAUDE.local.md` at the project root is auto-gitignored and always-loaded.
Create it for personal/local session context that should not be committed.

## Step 5: Sub-projects

Each sub-project has its own CLAUDE.md and memory:

- `safety-quotient/` — PSQ agent. Has `/hunt` and `/cycle` skills.
  Read its own CLAUDE.md before doing any PSQ work.
- `pje-framework/` — PJE taxonomy site. Has its own CLAUDE.md.

Do not mix sub-project work into the general agent context unless
explicitly integrating them.

---

## Portability Note

MEMORY.md path is computed from the absolute project path hash. If the
project is moved or cloned to a different path, MEMORY.md will not
auto-load. In that case, manually read the memory file and re-establish
context from `docs/architecture.md` and `lab-notebook.md`.

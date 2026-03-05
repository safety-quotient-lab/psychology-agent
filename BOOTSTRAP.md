# Bootstrap Guide — General-Purpose Psychology Agent

How to bring a fresh Claude Code session to full project context.

---

## Step 1: Navigate to project root

```bash
cd ~/projects/psychology    # default path; adjust to your clone location
```

Claude Code will auto-read `CLAUDE.md` at session start.

## Step 2: Load memory

Memory is path-hash dependent. The hash is derived from your absolute project
path: strip the leading `/`, replace all `/` with `-`.

| Platform | Example project path | Hash |
|----------|---------------------|------|
| Linux    | `/home/user/projects/psychology` | `-home-user-projects-psychology` |
| macOS    | `/Users/user/projects/psychology` | `-Users-user-projects-psychology` |

Auto-memory file location:
```
~/.claude/projects/[HASH]/memory/MEMORY.md
```

To find it dynamically:
```bash
PROJECT_ROOT="$(pwd)"
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
echo "$HOME/.claude/projects/${_HASH}/memory/MEMORY.md"
```

This loads automatically if you are working from the correct directory.
If context is missing, read MEMORY.md manually at session start.

A committed snapshot is available at `docs/MEMORY-snapshot.md` — use this
to restore context on a fresh install before the auto-memory file exists.

**Snapshot provenance note:** The original Session 1 bootstrap snapshot was
overwritten before versioned archiving was in place. Reconstructions are at:
- `docs/snapshots/MEMORY-snapshot-session-1-reconstructed.md` — Session 1 end state
- `docs/snapshots/MEMORY-snapshot-session-2-reconstructed.md` — Session 2 end state
Each carries a reconstruction header with source citations. Use for historical
context only; `docs/MEMORY-snapshot.md` is the authoritative current state.

**Archive integrity note:** `docs/snapshots/MEMORY-snapshot-2026-03-01.md` was
created before a known integrity fix (adjudicate residue from external agent
overreach). Do not use it as a recovery source. The canonical is clean.

## Step 3: Verify skills loaded

Run `/doc` to confirm it loads. Expected response: skill invokes and
reports "nothing to document" or scans context for undocumented items.

Also verify `/hunt`, `/cycle`, and `/capacity` are available — all four skills
should load from `.claude/skills/` at session start.

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

### Recovery: if auto-memory directory does not exist

Both `MEMORY.md` and `cognitive-triggers.md` live outside the git repo in the
auto-memory directory. If that directory does not exist (fresh clone, different
machine, path change), restore from committed snapshots:

| Auto-memory file | Recovery source | Updated by |
|---|---|---|
| `MEMORY.md` | `docs/MEMORY-snapshot.md` | /cycle Step 10 |
| `cognitive-triggers.md` | `docs/cognitive-triggers-snapshot.md` | /cycle Step 10b |

Steps:
1. Create the auto-memory directory (see Step 2 for path computation)
2. Copy each recovery source into the auto-memory directory
3. Add a `<!-- PROVENANCE: ... -->` comment at the top of each restored file
   noting the source file, date, and session number
4. Verify line counts (MEMORY.md < 200; cognitive-triggers.md has all T1–T12)

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

---

## Platform-Specific Setup

### Linux / macOS
No additional setup. `cd ~/projects/psychology` and Claude Code runs normally.
Skills use bash — available in the default shell on both platforms.

### Windows 10 / 11

Skills (`.claude/skills/*/SKILL.md`) use bash syntax (`sed`, `tr`, `wc`, `date`,
`cp`, etc.). Two supported configurations:

**Option A — WSL2 (strongly recommended)**
Run Claude Code inside a WSL2 terminal. The project lives at a Linux path
(e.g. `/home/username/projects/psychology`). Everything works identically to Linux.
Path hash uses the WSL2 Linux path.

**Option B — Git Bash (Git for Windows)**
Install Git for Windows. Run Claude Code from Git Bash. Skills work because Git Bash
provides bash + GNU coreutils. `$HOME` resolves to `/c/Users/username`; path hash
uses that prefix.

**Not supported:** Native PowerShell or cmd.exe — skills will fail without bash.

**reconstruct.py on Windows:** Requires Python 3.9+ and `git` in PATH.
Pass `--source-root` with the originating Linux path when running cross-machine:
```bash
python3 reconstruct.py \
  --jsonl      /path/to/session.jsonl \
  --source-root /home/kashif/projects/psychology \
  --reference  /c/Users/username/psychology-reference \
  --target     /c/Users/username/psychology-reconstructed
```

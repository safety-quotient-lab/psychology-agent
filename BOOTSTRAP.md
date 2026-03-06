# Bootstrap Guide — General-Purpose Psychology Agent

How to bring a fresh Claude Code session to full project context.

---

## Quick Start

From the project root, run the health check:

```bash
./bootstrap-check.sh
```

This verifies auto-memory, restores from snapshots if needed, checks recovery
sources, and reports skill availability. If everything passes, proceed to
Step 4 (Orient). If anything fails, the script reports what to fix.

For diagnostics only (no changes):

```bash
./bootstrap-check.sh --check-only
```

---

## Step 1: Navigate to project root

```bash
cd ~/projects/psychology    # default path; adjust to your clone location
```

Claude Code auto-reads `CLAUDE.md` at session start.

## Step 2: Verify auto-memory health

Auto-memory lives outside the git repo, in a path-hash-dependent directory.
The hash derives from the absolute project path: strip the leading `/`,
replace all `/` with `-`.

| Platform | Example project path | Hash |
|----------|---------------------|------|
| Linux    | `/home/user/projects/psychology` | `-home-user-projects-psychology` |
| macOS    | `/Users/user/projects/psychology` | `-Users-user-projects-psychology` |

Auto-memory directory:
```
~/.claude/projects/[HASH]/memory/
```

Memory uses an index + topic file pattern:

| Auto-memory file | What it holds | Committed snapshot (recovery source) | Min lines |
|---|---|---|---|
| `MEMORY.md` | Index: active thread, hygiene rules, user preferences, topic file routing | `docs/MEMORY-snapshot.md` | 30 |
| `memory/decisions.md` | Design decisions table + authority hierarchy | (included in MEMORY-snapshot.md archive) | — |
| `memory/cogarch.md` | Trigger quick-ref, knock-on depth, adjudication, working principles | (included in MEMORY-snapshot.md archive) | — |
| `memory/psq-status.md` | PSQ sub-agent calibration, deploy status, open issues | (included in MEMORY-snapshot.md archive) | — |

MEMORY.md stays under 60 lines. Topic files hold the detail and have no line limit.

The cognitive triggers file lives in the repo at `docs/cognitive-triggers.md` (canonical
location since Session 12). It does not require auto-memory restoration — Claude reads
it directly from the repo via T1.

**`bootstrap-check.sh` handles MEMORY.md restoration automatically.** It checks existence,
validates line counts against thresholds, restores from snapshots with provenance
headers, and reports status. Run it instead of doing this manually.

### Manual recovery (if bootstrap-check.sh is unavailable)

```bash
PROJECT_ROOT="$(pwd)"
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
MEMORY_DIR="$HOME/.claude/projects/${_HASH}/memory"

# Create directory
mkdir -p "$MEMORY_DIR"

# Restore MEMORY.md from snapshot
cp docs/MEMORY-snapshot.md "$MEMORY_DIR/MEMORY.md"
# cognitive-triggers.md lives at docs/cognitive-triggers.md (no auto-memory copy needed)
```

After manual restoration, add a `<!-- PROVENANCE: ... -->` comment at the top
of each file noting the source, date, and session number.

### Snapshot provenance notes

- The original Session 1 bootstrap snapshot was overwritten before versioned
  archiving started. Reconstructions:
  - `docs/snapshots/MEMORY-snapshot-session-1-reconstructed.md` — Session 1 end state
  - `docs/snapshots/MEMORY-snapshot-session-2-reconstructed.md` — Session 2 end state
  - Each carries a reconstruction header. Use for historical context only.
- `docs/snapshots/MEMORY-snapshot-2026-03-01.md` pre-dates a known integrity fix
  (adjudicate residue from external agent overreach). Do not use as recovery source.
- `docs/MEMORY-snapshot.md` is the authoritative MEMORY.md snapshot, updated by
  /cycle Step 10. `docs/cognitive-triggers.md` is the canonical trigger file
  (in-repo, no separate snapshot needed).

## Step 3: Verify skills loaded

Run `/doc` to confirm it loads. Expected response: skill invokes and
reports "nothing to document" or scans context for undocumented items.

Also verify `/hunt`, `/cycle`, `/capacity`, and `/adjudicate` are available —
all five skills should load from `.claude/skills/` at session start.

If any skill not found: likely created mid-session in a prior run. Restart
Claude Code from the project root to reload.

## Step 4: Orient to current state

Read in order:
1. `MEMORY.md` — index: active thread, topic file routing (auto-memory)
2. `memory/decisions.md` — design decisions + authority hierarchy (auto-memory)
3. `memory/cogarch.md` — trigger quick-ref + working principles (auto-memory)
4. `docs/cognitive-triggers.md` — full T1–T15 trigger system (canonical, in-repo)
5. `docs/architecture.md` — design decisions and system diagram
6. `lab-notebook.md` — last session summary and open questions
7. `TODO.md` — task backlog

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

---

## Recommended: Parry Prompt Injection Scanner

[Parry](https://github.com/vaporif/parry) provides platform-level security scanning
via Claude Code hooks. It runs a 6-layer detection pipeline (unicode, substring,
secrets, ML classification, bash exfiltration analysis, script exfiltration analysis)
as an external process — blocking tool use before compromised content reaches the agent.

The cogarch functions without parry, but gains defense-in-depth with it.

### Installation

Requires Rust toolchain (1.82+) and a HuggingFace account.

```bash
# Install from source
git clone https://github.com/vaporif/parry.git /tmp/parry-install
cd /tmp/parry-install
cargo install --path crates/cli

# Set HuggingFace token (needed for ML model download)
# Accept model license first: https://huggingface.co/protectai/deberta-v3-base-prompt-injection-v2
echo 'export HF_TOKEN=your_token_here' >> ~/.zshenv
```

Hooks are pre-configured in `.claude/settings.json` — parry activates automatically
when the binary is in PATH. Without parry installed, the hooks fail silently and
other hooks continue to function.

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

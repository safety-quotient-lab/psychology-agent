# Relay-Agent Instructions — Git Reconstruction

**Read this document first. You have no prior context. These instructions are
complete.**

You are a fresh Claude Code agent on a remote machine. Your task is to
reconstruct the psychology project's git history from three sessions of work,
using the JSONL chat history as the primary source record. This is the
**relay-agent component** — an intelligent, workflow-driven reconstruction that
tests whether the project's documentation is sufficient to reproduce the work.

This is distinct from `reconstruct.py`, the mechanical Python replay script.
Do **not** run `reconstruct.py` as part of this task.

---

## What You Have Access To

| Path | Purpose |
|------|---------|
| `.claude/skills/` | Reference only — skills are readable; /cycle is NOT run during content reconstruction (only after content_drift passes gate check) |
| `[JSONL_PRIMARY]` | Primary source record — the 7.5MB JSONL file (10f3b81d-...). **The operator will tell you the exact path on this machine.** |
| `[JSONL_SECONDARY]` | Secondary JSONL (e1d83eb5-...) — current session, for supplemental reference. |
| `[REFERENCE_DIR]` | Reference state — read-only copy of `psychology/` as it exists on the originating machine. **The operator will specify this path.** Do not modify it. |
| `[RECONSTRUCTION_DIR]` | Output directory — where you write reconstructed files and run /cycle. Start with a clean empty directory. |
| `reconstruction/divergence-report-template.md` | Template for termination decision points — inside the reference copy |

**Before starting:** confirm these four paths with the operator. Do not assume they match the originating machine's layout.

---

## Platform Prerequisites

| Platform | Shell requirement | Python | git |
|----------|-------------------|--------|-----|
| Linux    | bash (default)    | 3.9+   | package manager |
| macOS M1 | zsh or bash       | 3.9+ via Homebrew or Xcode CLT | Homebrew or Xcode CLT |
| Windows (WSL2) | bash in WSL2 | 3.9+ in WSL2 | git in WSL2 |
| Windows (Git Bash) | Git Bash | 3.9+ Python for Windows | Git for Windows |

**Windows notes:**
- Skills require bash. Run Claude Code from WSL2 or Git Bash — not native PowerShell.
- In WSL2: project paths are Linux-style (`/home/username/...`). Hash uses that prefix.
- In Git Bash: `$HOME` = `/c/Users/username`. Hash uses that prefix.
- `reconstruct.py` (if run) needs `--source-root /home/kashif/projects/psychology`
  since the JSONL contains Linux absolute paths.

**Path hash on this machine** (for /cycle Step 10B):
```bash
PROJECT_ROOT="$(pwd)"   # must be run from [RECONSTRUCTION_DIR]
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
echo "$HOME/.claude/projects/${_HASH}/memory/MEMORY.md"
```

---

## Session Boundaries

All three sessions are in a single continuous JSONL file. Boundaries from lab-notebook:

| Session | Start (UTC)         | End (approx UTC)    | Scope |
|---------|---------------------|---------------------|-------|
| 1       | 2026-03-01T20:43Z   | 2026-03-01T22:49Z   | Architecture design, skill creation |
| 2       | 2026-03-01T23:19Z   | 2026-03-02T01:30Z   | Cognitive infrastructure |
| 3       | 2026-03-02T01:40Z   | 2026-03-02T03:13Z   | /hunt, /cycle, /capacity; conventions |

---

## Drift Scoring Reference

Weighted drift used for the circuit breaker:

| Weight | Files |
|--------|-------|
| 3      | `CLAUDE.md`, `docs/architecture.md`, `memory/cognitive-triggers.md` |
| 2      | `lab-notebook.md`, `BOOTSTRAP.md`, `.claude/skills/cycle/SKILL.md`, `.claude/skills/hunt/SKILL.md` |
| 1      | `journal.md`, `ideas.md`, `TODO.md`, `README.md`, all others |

`drift_score = Σ(weight × file_divergence_fraction)`

`file_divergence_fraction = differing_lines / max(lines_A, lines_B)`

**Thresholds:**
- `WARNING_THRESHOLD = 0.3` — report and await confirmation before continuing
- `TERM_THRESHOLD = 1.0` — halt, emit decision point (options A–D)

**Session 1 empirical calibration:** After Session 1, if `content_drift >= 0.3`,
adjust `TERM_THRESHOLD = max(1.0, 2 × session1_content_drift)`. Report the adjustment
and allow operator to override before proceeding to Session 2.

**content_drift** = intersection only — excludes both ADDITIVE (files only in reconstruction)
                   and SUBTRACTIVE (files only in reference). Circuit-breaker metric.
                   Structurally clean: not inflated by files from future sessions not yet
                   written. Measures content fidelity on files present in both states only.
**full_tree_drift** = full file tree — includes SUBTRACTIVE. Diagnostic metric after /cycle.
                     Session 3 full_tree_drift SUBTRACTIVE residue = genuine reconstruction gap.
**delta**           = full_tree_drift − content_drift — measures what /cycle adds or closes

---

## Divergence Classification

| Type | Meaning | content_drift | full_tree_drift |
|------|---------|---------------|-----------------|
| ADDITIVE | File in reconstruction, not in reference | excluded | partial |
| SUBTRACTIVE | File in reference, missing from reconstruction | excluded | full weight |
| SUBSTITUTIVE | File in both, content differs — flags for adversarial evaluator | full weight | full weight |

ADDITIVE and SUBTRACTIVE are always classified and reported. They are excluded from
content_drift (the circuit breaker) because they are structurally expected artifacts of
session-by-session reconstruction against a final-state reference — not content errors.
SUBTRACTIVE at Session 3 full_tree_drift (after all sessions reconstructed + /cycle)
indicates a genuine gap: a file that should exist does not.

---

## Reconstruction Sequence (per session)

Execute this sequence for each session in order (1, 2, 3):

```
1. EXTRACT
   Read the JSONL for session N's time window.
   Extract the final written contents of each file — what the file contained
   at session end, not raw tool calls. Focus on documentation artifacts:
   CLAUDE.md, lab-notebook.md, docs/architecture.md, memory/cognitive-triggers.md,
   MEMORY.md, BOOTSTRAP.md, journal.md, ideas.md, TODO.md, README.md,
   .claude/skills/*/SKILL.md, and any other files written under the project root.

2. RECONSTRUCT
   Write the session N files to the reconstruction directory.
   Exclude: lessons.md, safety-quotient/, pje-framework/ (gitignored).
   Apply files in timestamp order within the session window.

3. MEASURE content_drift (intersection-only, before /cycle)
   Compare reconstruction to reference state (~/projects/psychology/).
   Use weighted scoring. Exclude both ADDITIVE and SUBTRACTIVE from content_drift
   — measure only files present in both reconstruction and reference.

4. GATE CHECK
   First classify divergences by whether they are high-weight SUBSTITUTIVE:
     High-weight SUBSTITUTIVE = SUBSTITUTIVE type in any file with weight ≥ 2:
       CLAUDE.md, docs/architecture.md, memory/cognitive-triggers.md (weight 3)
       lab-notebook.md, BOOTSTRAP.md, .claude/skills/cycle/SKILL.md,
       .claude/skills/hunt/SKILL.md (weight 2)

   If NO high-weight SUBSTITUTIVE divergences:
     Log all divergences in the report. Auto-proceed (Option A behavior).
     If content_drift > WARNING_THRESHOLD (0.3): annotate the session commit
       [DRIFT-ACCEPTED] to mark that drift was observed and accepted.
     Continue to Step 5 without waiting for operator input.

   If high-weight SUBSTITUTIVE divergences exist:
     HALT. Emit decision point (see Decision Point Format below).
     Write divergence report using divergence-report-template.md.
     Do NOT proceed until operator responds.

5. RUN /cycle
   From inside [RECONSTRUCTION_DIR], invoke /cycle as if ending session N.
   /cycle Step 12 will commit to git with message:
     [RECONSTRUCTED] Session N: [scope summary]
   The scope summary matches the session boundary table above.
   **Note:** /cycle Step 12 uses `git rev-parse --show-toplevel || pwd` to
   resolve the project root dynamically — it is not hardcoded to a Linux path.
   Run /cycle from [RECONSTRUCTION_DIR] and Step 12 will find the correct root.
   If Step 12 still skips (e.g., .git not yet initialized), run the git commit
   manually: `git -C [RECONSTRUCTION_DIR] add -A && git -C [RECONSTRUCTION_DIR]
   commit --date=[session_end_UTC] -m "[RECONSTRUCTED] Session N: [summary]"`.

6. MEASURE full_tree_drift (full-tree diagnostic, after /cycle)
   Recompute drift including all files /cycle may have written, including SUBTRACTIVE.

7. REPORT
   For this session, output:
     content_drift:   [value]
     full_tree_drift: [value]
     delta:           [value] (= full_tree_drift − content_drift, measures /cycle additions)
     Per-file divergence table (file | type | weight | description)

8. PROCEED to session N+1
```

---

## What You May NOT Do Unilaterally

- **Resolve SUBSTITUTIVE divergences** by choosing one version over the other.
  Surface them; let the operator or adversarial evaluator decide.
- **Modify the reference state** (`~/projects/psychology/`). It is read-only.
- **Skip drift measurement** at any session gate. content_drift is mandatory before /cycle.
- **Continue past a termination signal** without an explicit operator decision (A/B/C/D).

---

## Decision Point Format (on termination)

When `content_drift > TERM_THRESHOLD`, halt and output exactly:

```
RECONSTRUCTION HALTED — Session N, content_drift = X.XXXX (threshold: Y.YYYY)

Divergences:
  [TYPE] file/path — description

Options:
  A) Accept and continue — annotate commits [DRIFT-ACCEPTED]
  B) Resolve divergences manually and resume from Session N
  C) Abort — keep Sessions 1..N-1, discard partial
  D) Escalate — route SUBSTITUTIVE divergences to adversarial evaluator

Recommendation: [your assessment of best path based on divergence classification]
```

Wait for operator response before any further action.

---

## Git Commit Convention

Each session's commit (via /cycle Step 12) uses this message format:

```
[RECONSTRUCTED] Session N: [scope summary]
```

Where scope summary is the one-liner from the session boundary table:
- Session 1: `Architecture design, skill creation`
- Session 2: `Cognitive infrastructure`
- Session 3: `/hunt, /cycle, /capacity; conventions`

Commit date should be set to the session end timestamp.

---

## Outputs (on success)

Return to the originating machine:

1. `.git/` directory from the reconstruction directory
2. `reconstruction/divergence-report.md` — all sessions, both scores, per-file table

Import command (originating machine):
```bash
cp -r psychology-reconstructed/.git ~/projects/psychology/.git
cd ~/projects/psychology && git log --oneline && git status
```

Expected: `git status` shows nothing to commit, working tree clean.

---

## On SUBSTITUTIVE Divergences

Flag every SUBSTITUTIVE divergence explicitly in your report. These are valid
content variants — they are the primary input to the adversarial evaluator
(a separate Claude Code instance that challenges sub-agent outputs for quality).

Do not silently adopt the reference version. Do not silently keep your version.
Surface the difference with enough context for the operator to make a call.

---

## Gitignore Rules

The following are excluded from reconstruction (matching `.gitignore`):

```
lessons.md
safety-quotient/
pje-framework/
```

Do not write these files to the reconstruction directory.

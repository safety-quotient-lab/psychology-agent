---
globs: ["**/*.sh", "**/*.js", "**/*.py", "**/*.md"]
---

# Anti-Patterns (known-failing approaches)

- **Security tool source code triggers its own detection** — reading a scanner's
  test fixtures fires the scanner's PostToolUse hook. Check whether the file contains
  test injection strings before reading active scanner source.
- **`settingSources: ['project']` in serverless** — silently no-ops in CF Workers
  (no local filesystem). Inline identity and cogarch into the system prompt constant.
- **Script architecture diverges from saved checkpoint** — inference/calibration scripts
  that rebuild model classes differently from the training script produce silent failures
  or cryptic KeyErrors. Canonical source for model architecture: the training script.
- **Shell state across Bash calls** — env vars, `cd`, and shell functions do not persist.
  Chain commands in a single call (`export FOO=bar && use $FOO`) or write to a file
  and source it.
- **`settings.local.json` partial allow list** — a `permissions.allow` array in
  `.claude/settings.local.json` acts as a whitelist. Any tool not listed requires
  explicit approval, even with `--dangerously-skip-permissions`. Either list all
  needed tools or remove the allow array entirely.
- **Parry ML false positives on trusted files** — parry's ML scanner flags
  CLAUDE.md and cogarch files as prompt injection. When re-adding parry, implement
  a wrapper-level path exclusion for trusted instruction files.
- **`Path(__file__).resolve()` in symlinked shared scripts** — when a Python script
  lives in a shared directory (e.g., `platform/shared/scripts/`) and is symlinked into
  agent repos, `Path(__file__).resolve()` follows the symlink to the shared location,
  making `parent.parent` point to the shared directory rather than the agent repo.
  Fix: honor a `PROJECT_ROOT` env var override first. Callers (shell scripts) must
  export `PROJECT_ROOT` before invoking symlinked Python scripts.
- **Stale SQLite WAL files block `bootstrap_state_db.py`** — if a prior SQLite connection
  exited uncleanly (e.g., cron session killed), `state.db-shm` (32768 bytes) and
  `state.db-wal` (0 bytes) may remain. These block `bootstrap_state_db.py --force` with a
  "database is locked" error. Fix: remove the stale WAL files before bootstrapping:
  `rm -f state.db-shm state.db-wal`. Safe when no active SQLite connections are open —
  verify with `fuser state.db` first. **Distinguish from active daemon WAL:** meshd
  holds state.db open continuously for real-time mesh state writes. A non-zero WAL
  held by a running meshd process is expected behavior, not a stale artifact. Check
  `fuser state.db` or `lsof state.db` — if the holder is meshd, the WAL is active
  and should not be removed.

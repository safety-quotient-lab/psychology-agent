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

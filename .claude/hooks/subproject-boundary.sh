#!/usr/bin/env bash
# Sub-project boundary hook (PreToolUse: Write|Edit|Read)
# Warns when a psychology-agent session touches files inside sub-project directories.
# Non-blocking — outputs a warning, does not prevent the operation.

FILE_PATH="${TOOL_INPUT_file_path:-}"
[ -z "$FILE_PATH" ] && exit 0

# Normalize to project-relative path
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REL_PATH="${FILE_PATH#"$PROJECT_ROOT"/}"

case "$REL_PATH" in
  safety-quotient/*)
    echo "[BOUNDARY] Sub-project crossed: safety-quotient/. This work normally routes to the psq-agent context. Switch context or defer unless explicitly integrating."
    ;;
  pje-framework/*)
    echo "[BOUNDARY] Sub-project crossed: pje-framework/. This work normally routes to the pje context. Switch context or defer unless explicitly integrating."
    ;;
esac

exit 0

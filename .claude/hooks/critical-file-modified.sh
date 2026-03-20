#!/bin/bash
# PostToolUse hook: remind of T4 compliance when critical files are modified.
# Replaces the inline command that was in settings.json line 40.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

# Claude Code injects TOOL_INPUT_* variables at runtime
# shellcheck disable=SC2154
FILE="$TOOL_INPUT_file_path"
case "$FILE" in
  *MEMORY.md|*cognitive-triggers.md|*CLAUDE.md|*architecture.md)
    echo "[HOOK] Critical file modified: $(basename "$FILE"). Verify T4 compliance: date discipline, public visibility, routing, semantic naming."
    _record_trigger T4
    ;;
  *lab-notebook.md)
    echo "[HOOK] Lab notebook modified. Verify chronological ordering (T4)."
    _record_trigger T4
    ;;
esac

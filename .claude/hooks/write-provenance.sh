#!/usr/bin/env bash
# Write-provenance hook (PostToolUse: Write|Edit)
# Logs which files were modified, when, and approximate session context.
# Lightweight provenance trail — catches cross-context overwrites.
# Log: .claude/write-log.jsonl (gitignored)

FILE_PATH="${TOOL_INPUT_file_path:-}"
[ -z "$FILE_PATH" ] && exit 0

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOG_FILE="${PROJECT_ROOT}/.claude/write-log.jsonl"
REL_PATH="${FILE_PATH#"$PROJECT_ROOT"/}"
TIMESTAMP=$(date -Iseconds)

# Detect session context from lab-notebook last session header
LAST_SESSION=$(grep -o 'Session [0-9a-z]*' "$PROJECT_ROOT/lab-notebook.md" 2>/dev/null | tail -1 || echo "unknown")

# Append provenance entry
printf '{"timestamp":"%s","file":"%s","session":"%s","tool":"%s"}\n' \
  "$TIMESTAMP" "$REL_PATH" "$LAST_SESSION" "${TOOL_USE_ID:-write}" \
  >> "$LOG_FILE"

exit 0

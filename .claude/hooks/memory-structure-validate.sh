#!/usr/bin/env bash
# Memory structure validation hook (PostToolUse: Write|Edit)
# Validates memory file structure on write. Ensures entries follow expected
# format for their topic file. Mechanical enforcement replaces convention-reliance.
# Source: Synrix enforced prefix taxonomy (adapted for markdown conventions).

FILE_PATH="${TOOL_INPUT_file_path:-}"
[ -z "$FILE_PATH" ] && exit 0

# Only validate memory topic files
case "$FILE_PATH" in
  *memory/psq-status.md)   TOPIC="psq-status" ;;
  *memory/decisions.md)    TOPIC="decisions" ;;
  *memory/cogarch.md)      TOPIC="cogarch" ;;
  *memory/MEMORY.md|*MEMORY.md)
    # Check MEMORY.md line count
    if [ -f "$FILE_PATH" ]; then
      LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d '[:space:]')
      if [ "$LINE_COUNT" -gt 200 ]; then
        echo "[HOOK] WARNING: MEMORY.md exceeds 200-line hard limit (${LINE_COUNT} lines). System truncates silently at 201+."
      elif [ "$LINE_COUNT" -gt 60 ]; then
        echo "[HOOK] NOTICE: MEMORY.md at ${LINE_COUNT} lines (target < 60). Consider moving detail to topic files."
      fi
    fi
    exit 0
    ;;
  *memory-snapshots/psq-status.md)  TOPIC="psq-status" ;;
  *memory-snapshots/decisions.md)   TOPIC="decisions" ;;
  *memory-snapshots/cogarch.md)     TOPIC="cogarch" ;;
  *) exit 0 ;;
esac

WARNINGS=""

case "$TOPIC" in
  psq-status)
    # psq-status entries should have **bold key:** value format and status markers
    if [ -f "$FILE_PATH" ]; then
      # Check for entries missing status markers (✓/✗/⚑)
      UNMARKED=$(grep -c '^\*\*[^*]*\*\*' "$FILE_PATH" 2>/dev/null || echo 0)
      MARKED=$(grep -c '^\*\*[^*]*\*\*.*[✓✗⚑]' "$FILE_PATH" 2>/dev/null || echo 0)
      if [ "$UNMARKED" -gt 0 ] && [ "$MARKED" -lt "$UNMARKED" ]; then
        MISSING=$((UNMARKED - MARKED))
        WARNINGS="${WARNINGS}  - ${MISSING} entries lack status markers (✓/✗/⚑)\n"
      fi
      # Check for [confirmed YYYY-MM-DD] annotations (temporal decay)
      CONFIRMABLE=$(grep -c '^\*\*[^*]*\*\*' "$FILE_PATH" 2>/dev/null || echo 0)
      CONFIRMED=$(grep -c '\[confirmed [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\]' "$FILE_PATH" 2>/dev/null || echo 0)
      if [ "$CONFIRMABLE" -gt 0 ] && [ "$CONFIRMED" -lt "$CONFIRMABLE" ]; then
        MISSING=$((CONFIRMABLE - CONFIRMED))
        WARNINGS="${WARNINGS}  - ${MISSING} entries lack [confirmed YYYY-MM-DD] annotation (temporal decay)\n"
      fi
    fi
    ;;
  decisions)
    # decisions.md should have a code block table with Decision/Choice columns
    if [ -f "$FILE_PATH" ]; then
      if ! grep -q '──────' "$FILE_PATH" 2>/dev/null; then
        WARNINGS="${WARNINGS}  - Missing APA-style table delimiters (────)\n"
      fi
      # Check for entries missing dates
      ENTRY_COUNT=$(grep -c '^ [A-Z]' "$FILE_PATH" 2>/dev/null || echo 0)
      DATED=$(grep -c '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' "$FILE_PATH" 2>/dev/null || echo 0)
      if [ "$ENTRY_COUNT" -gt 0 ] && [ "$DATED" -lt 3 ]; then
        WARNINGS="${WARNINGS}  - Fewer than 3 dated entries found — decisions should include decided date\n"
      fi
    fi
    ;;
  cogarch)
    # cogarch.md should have the trigger quick-ref table and working principles
    if [ -f "$FILE_PATH" ]; then
      if ! grep -q 'T1:' "$FILE_PATH" 2>/dev/null; then
        WARNINGS="${WARNINGS}  - Missing trigger quick-ref table (expected T1: entry)\n"
      fi
      if ! grep -q 'Knock-on depth' "$FILE_PATH" 2>/dev/null; then
        WARNINGS="${WARNINGS}  - Missing knock-on depth reference\n"
      fi
      # Check for [confirmed YYYY-MM-DD] annotations
      PRINCIPLE_COUNT=$(grep -c '^\*\*[^*]*\*\*' "$FILE_PATH" 2>/dev/null || echo 0)
      CONFIRMED=$(grep -c '\[confirmed [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\]' "$FILE_PATH" 2>/dev/null || echo 0)
      if [ "$PRINCIPLE_COUNT" -gt 0 ] && [ "$CONFIRMED" -lt "$PRINCIPLE_COUNT" ]; then
        MISSING=$((PRINCIPLE_COUNT - CONFIRMED))
        WARNINGS="${WARNINGS}  - ${MISSING} working principles lack [confirmed YYYY-MM-DD] annotation\n"
      fi
    fi
    ;;
esac

if [ -n "$WARNINGS" ]; then
  echo "[HOOK] Memory structure warnings for ${TOPIC}:"
  printf "%b" "$WARNINGS"
fi

exit 0

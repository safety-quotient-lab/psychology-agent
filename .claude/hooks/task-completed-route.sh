#!/usr/bin/env bash
# TaskCompleted hook — routes completed tasks to staging file for /cycle pickup.
# Also checks for matching TODO.md entries to flag for removal.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STAGING_FILE="/tmp/psychology-agent-completed-tasks.jsonl"
TIMESTAMP=$(date -Iseconds)

TASK_DESCRIPTION="${TOOL_INPUT_description:-unknown task}"

# Log to staging file
echo "{\"timestamp\":\"${TIMESTAMP}\",\"task\":\"${TASK_DESCRIPTION}\"}" >> "$STAGING_FILE"

# Check if there's a matching TODO.md entry
if [ -f "${PROJECT_ROOT}/TODO.md" ]; then
  # Extract first 3 significant words for fuzzy match
  KEYWORDS=$(echo "$TASK_DESCRIPTION" | tr -cs '[:alnum:]' '\n' | head -3 | tr '\n' '|' | sed 's/|$//')
  if [ -n "$KEYWORDS" ]; then
    MATCH=$(grep -i -c "$KEYWORDS" "${PROJECT_ROOT}/TODO.md" 2>/dev/null || echo "0")
    if [ "$MATCH" -gt 0 ]; then
      echo "[HOOK] Task completed: \"${TASK_DESCRIPTION}\". Possible TODO.md match — flag for /cycle cleanup."
    fi
  fi
fi

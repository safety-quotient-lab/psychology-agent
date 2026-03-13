#!/usr/bin/env bash
# SessionEnd hook — uncommitted work detector + session logger.
# Warns if uncommitted changes exist in tracked files.
# Logs session end timestamp.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$PROJECT_ROOT" || exit 0

# Check for uncommitted changes in tracked files
UNCOMMITTED=$(git status --porcelain 2>/dev/null | grep -v '^??' | head -10)
if [ -n "$UNCOMMITTED" ]; then
  FILE_COUNT=$(echo "$UNCOMMITTED" | wc -l | tr -d '[:space:]')
  echo "[HOOK] ⚠ Session ending with ${FILE_COUNT} uncommitted tracked file(s):"
  echo "$UNCOMMITTED" | head -5 | sed 's/^/  /'
  if [ "$FILE_COUNT" -gt 5 ]; then
    echo "  ... and $((FILE_COUNT - 5)) more"
  fi
  echo "[HOOK] Consider committing before ending or noting in MEMORY.md Active Thread."
fi

# Record T1 trigger firing (session boundary)
AGENTDB="${PROJECT_ROOT}/agentdb"
if [ -x "$AGENTDB" ]; then
  "$AGENTDB" trigger-fired --trigger-id T1 2>/dev/null
elif [ -f "${PROJECT_ROOT}/scripts/dual_write.py" ] && [ -f "${PROJECT_ROOT}/state.db" ]; then
  python3 "${PROJECT_ROOT}/scripts/dual_write.py" trigger-fired --trigger-id T1 2>/dev/null
fi

# Trigger activation telemetry reminder
echo "[HOOK] Session ending — log trigger activations to state.db via: python3 scripts/dual_write.py trigger-activation --session-id N --trigger-id TX --check-number N --tier critical --result pass"

# Log session end
SESSION_LOG="/tmp/psychology-agent-session-log.jsonl"
TIMESTAMP=$(date -Iseconds)
echo "{\"event\":\"session_end\",\"timestamp\":\"${TIMESTAMP}\",\"uncommitted_files\":${FILE_COUNT:-0}}" >> "$SESSION_LOG"

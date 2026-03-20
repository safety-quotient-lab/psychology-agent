#!/usr/bin/env bash
# PostToolUseFailure hook — consecutive failure halt
# Counts consecutive tool failures; after 3, warns to pause and diagnose.
# Prevents brute-force retry anti-pattern (CLAUDE.md Problem-Solving Discipline).
source "${BASH_SOURCE[0]%/*}/_debug.sh"

COUNTER_FILE="/tmp/psychology-agent-consecutive-failures"

# Read current count
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
else
  COUNT=0
fi

COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

TOOL_NAME="${TOOL_NAME:-unknown}"

if [ "$COUNT" -ge 3 ]; then
  echo "[HOOK] ⚠ ${COUNT} consecutive tool failures detected (last: ${TOOL_NAME})."
  echo "[HOOK] STOP and diagnose the root cause. Do NOT retry the same approach."
  echo "[HOOK] Consider: (1) alternative approach, (2) check prerequisites, (3) ask user."
  _record_trigger T17
fi

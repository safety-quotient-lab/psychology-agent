#!/usr/bin/env bash
# T16: External-facing action gate (PreToolUse: Bash)
# Fires when gh CLI write operations detected in Bash command input.
# Non-blocking — outputs a reminder of T16 checks, does not prevent the operation.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

COMMAND="${TOOL_INPUT_command:-}"
[ -z "$COMMAND" ] && exit 0

# Match gh write operations (issue/pr/api create/comment/edit/close/merge/review)
if echo "$COMMAND" | grep -qE 'gh\s+(issue|pr|api)\s+(create|comment|edit|close|merge|review)'; then
  # Record T16 trigger firing (irreversibility gate)
  PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  AGENTDB="${PROJECT_ROOT}/agentdb"
  if [ -x "$AGENTDB" ]; then
    "$AGENTDB" trigger-fired --trigger-id T16 2>/dev/null
  elif [ -f "${PROJECT_ROOT}/scripts/dual_write.py" ] && [ -f "${PROJECT_ROOT}/state.db" ]; then
    python3 "${PROJECT_ROOT}/scripts/dual_write.py" trigger-fired --trigger-id T16 2>/dev/null
  fi
  echo "[T16] External-facing action detected. Before proceeding:"
  echo "  1. Scope + substance: Does this serve the current task? Substance decisions need user confirmation."
  echo "  2. Obligation + irreversibility: Does this create obligations? Issues can be closed but not deleted."
  echo "  3. External interpretant: Who reads this? Calibrate for peer agents, operators, and public viewers."
fi

exit 0

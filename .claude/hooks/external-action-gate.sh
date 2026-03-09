#!/usr/bin/env bash
# T16: External-facing action gate (PreToolUse: Bash)
# Fires when gh CLI write operations detected in Bash command input.
# Non-blocking — outputs a reminder of T16 checks, does not prevent the operation.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

COMMAND="${TOOL_INPUT_command:-}"
[ -z "$COMMAND" ] && exit 0

# Match gh write operations (issue/pr/api create/comment/edit/close/merge/review)
if echo "$COMMAND" | grep -qE 'gh\s+(issue|pr|api)\s+(create|comment|edit|close|merge|review)'; then
  echo "[T16] External-facing action detected. Before proceeding:"
  echo "  1. Scope + substance: Does this serve the current task? Substance decisions need user confirmation."
  echo "  2. Obligation + irreversibility: Does this create obligations? Issues can be closed but not deleted."
  echo "  3. External interpretant: Who reads this? Calibrate for peer agents, operators, and public viewers."
fi

exit 0

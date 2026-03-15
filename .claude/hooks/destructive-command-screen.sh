#!/bin/bash
# PreToolUse hook: fast pre-screen for destructive commands in Bash.
# Brain gap 2 (amygdala analogue) — fires before full trigger pipeline.

# Claude Code injects TOOL_INPUT_* variables at runtime
# shellcheck disable=SC2154
source "${BASH_SOURCE[0]%/*}/_debug.sh"

COMMAND="$TOOL_INPUT_command"
[ -z "$COMMAND" ] && exit 0

# Pattern match for destructive operations
if echo "$COMMAND" | grep -qE '(rm\s+-rf\s+[/~]|git\s+reset\s+--hard|git\s+push\s+--force\s+(origin\s+)?main|DROP\s+TABLE|DELETE\s+FROM\s+\w+\s*;|>\s*/dev/sd|mkfs\.|dd\s+if=)'; then
    echo "⚠ [DESTRUCTIVE SCREEN] Potentially destructive command detected."
    echo "Review before proceeding — T16 Check 3 (reversibility) applies."
    _record_trigger T16
fi

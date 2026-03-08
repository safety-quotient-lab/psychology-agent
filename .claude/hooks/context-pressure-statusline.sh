#!/usr/bin/env bash
# Statusline hook — displays context window usage with pressure warning.
# Receives JSON on stdin with session data including context percentage.
# Output goes to the terminal statusline (visual indicator only).
#
# NOTE: Statusline hooks display information but cannot block tool execution.
# This provides visual awareness of context pressure; T2 (before response)
# handles the behavioral response. Mechanical enforcement would require
# a PreToolUse hook, but PreToolUse does not receive context % data.

INPUT=$(cat)

# Extract context percentage from statusline input JSON
USED_PCT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # Claude Code statusline input format includes context usage
    pct = data.get('usedPercentage', data.get('context', {}).get('usedPercentage', 0))
    print(int(pct))
except:
    print(0)
" 2>/dev/null)

if [ -z "$USED_PCT" ] || [ "$USED_PCT" -eq 0 ]; then
  # Could not read percentage — show minimal status
  echo "ctx: ?"
  exit 0
fi

# Persist context % so PreToolUse hooks can read it
# User-namespaced path so hooks can read it across shells
CTX_STABLE="${XDG_RUNTIME_DIR:-/tmp}/.claude-context-pct-$(id -u)"
echo "$USED_PCT" > "$CTX_STABLE" 2>/dev/null

# Visual indicator with threshold warnings
if [ "$USED_PCT" -ge 80 ]; then
  echo "ctx: ${USED_PCT}% ████ CRITICAL — /doc + /compact NOW"
elif [ "$USED_PCT" -ge 60 ]; then
  echo "ctx: ${USED_PCT}% ██░░ PRESSURE — consider /doc"
elif [ "$USED_PCT" -ge 40 ]; then
  echo "ctx: ${USED_PCT}% █░░░"
else
  echo "ctx: ${USED_PCT}% ░░░░"
fi

exit 0

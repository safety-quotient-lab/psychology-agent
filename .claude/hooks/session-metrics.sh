#!/usr/bin/env bash
# PostToolUse hook — tracks session metrics for psychometric computation.
# Increments tool call counter and estimates context pressure from
# accumulated calls. Writes to temp files that compute-psychometrics.py reads.
#
# Metrics written:
#   /tmp/{agent-id}-tool-calls: integer count of tool calls this session
#   /tmp/{agent-id}-session-start: ISO timestamp of first tool call
#   /tmp/.claude-context-pct-{uid}: estimated context % (fallback when
#     Notification hook doesn't provide actual percentage)
source "${BASH_SOURCE[0]%/*}/_debug.sh"

# shellcheck disable=SC2154
AGENT_ID="${AGENT_ID:-psychology-agent}"
TOOL_COUNT_FILE="/tmp/${AGENT_ID}-tool-calls"
SESSION_START_FILE="/tmp/${AGENT_ID}-session-start"
CTX_FILE="${XDG_RUNTIME_DIR:-/tmp}/.claude-context-pct-$(id -u)"

# Initialize session start on first call
if [ ! -f "$SESSION_START_FILE" ]; then
    date -Iseconds > "$SESSION_START_FILE"
fi

# Increment tool call counter
if [ -f "$TOOL_COUNT_FILE" ]; then
    COUNT=$(cat "$TOOL_COUNT_FILE" 2>/dev/null || echo "0")
    COUNT=$((COUNT + 1))
else
    COUNT=1
fi
echo "$COUNT" > "$TOOL_COUNT_FILE"

# Estimate context pressure if the Notification hook hasn't written it
# Heuristic: each tool call averages ~1500 tokens (input + output)
# 1M context = ~667 tool calls to fill (rough ceiling)
if [ ! -f "$CTX_FILE" ] || [ ! -s "$CTX_FILE" ]; then
    EST_PCT=$(( COUNT * 100 / 667 ))
    if [ "$EST_PCT" -gt 100 ]; then
        EST_PCT=100
    fi
    echo "$EST_PCT" > "$CTX_FILE"
fi

exit 0

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

# Estimate context pressure
# Calibrated from Session 86 observation: 437K tokens / 62 calls ≈ 7000 tokens/call
# 1M context / 7000 tokens per call ≈ 143 calls to fill
# Use 150 as ceiling (conservative) — each call consumes ~0.67% of context
# The Notification hook provides actual % when available; this serves as
# fallback AND as continuous updater (overwrite stale Notification values
# older than 60 seconds)
TOKENS_PER_CALL=7000
CONTEXT_MAX=1000000
CALLS_TO_FILL=$(( CONTEXT_MAX / TOKENS_PER_CALL ))
EST_PCT=$(( COUNT * 100 / CALLS_TO_FILL ))
if [ "$EST_PCT" -gt 100 ]; then
    EST_PCT=100
fi

# Write estimation if: no file exists, file is empty, OR file is stale (>60s old)
SHOULD_WRITE=false
if [ ! -f "$CTX_FILE" ] || [ ! -s "$CTX_FILE" ]; then
    SHOULD_WRITE=true
elif [ "$(find "$CTX_FILE" -mmin +1 2>/dev/null)" ]; then
    SHOULD_WRITE=true
fi

if [ "$SHOULD_WRITE" = true ]; then
    echo "$EST_PCT" > "$CTX_FILE"
fi

# Recompute psychometric state every 10 tool calls
# ~50ms Python execution, zero LLM cost — SQLite reads + arithmetic
PSYCH_FILE="/tmp/${AGENT_ID}-psychometrics.json"
if [ $(( COUNT % 10 )) -eq 0 ] && [ -f "${BASH_SOURCE[0]%/*}/../../scripts/compute-psychometrics.py" ]; then
    PROJECT_ROOT="$(cd "${BASH_SOURCE[0]%/*}/../.." && pwd)" \
        python3 "${BASH_SOURCE[0]%/*}/../../scripts/compute-psychometrics.py" \
        --mesh-state > "$PSYCH_FILE" 2>/dev/null &
fi

exit 0

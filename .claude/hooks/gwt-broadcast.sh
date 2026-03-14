#!/usr/bin/env bash
# PostToolUse hook — GWT (Global Workspace Theory) inter-trigger broadcast.
#
# Maintains a shared broadcast file where CRITICAL trigger checks post
# one-line findings. Subsequent triggers read these summaries to avoid
# evaluating in isolation.
#
# Format: [BROADCAST T{n}#{check}] {finding}
# File:   /tmp/psychology-agent-gwt-broadcast
# Spec:   docs/cognitive-triggers.md § Global Workspace Broadcast
# Wu wei stage: 2 (convention with mechanical support)
source "${BASH_SOURCE[0]%/*}/_debug.sh"

BROADCAST_FILE="/tmp/psychology-agent-gwt-broadcast"
MODE_FILE="/tmp/psychology-agent-task-mode"
STALE_SECONDS=300  # 5 minutes — clear stale broadcasts between responses

# Clear stale broadcast file (detects new response cycle)
if [ -f "$BROADCAST_FILE" ]; then
    file_age=$(( $(date +%s) - $(stat -f %m "$BROADCAST_FILE" 2>/dev/null || echo 0) ))
    if [ "$file_age" -gt "$STALE_SECONDS" ]; then
        : > "$BROADCAST_FILE"
    fi
fi

# Read task mode for filtering (mechanical skips advisory broadcasts)
TASK_MODE="analytical"
if [ -f "$MODE_FILE" ]; then
    TASK_MODE=$(tr -d '[:space:]' < "$MODE_FILE" 2>/dev/null)
fi

# Collect existing broadcasts and emit as context reminder
if [ -s "$BROADCAST_FILE" ]; then
    LINE_COUNT=$(wc -l < "$BROADCAST_FILE" | tr -d ' ')
    if [ "$LINE_COUNT" -gt 0 ]; then
        echo "[GWT] Active broadcasts (${LINE_COUNT}, mode=${TASK_MODE}):"
        if [ "$TASK_MODE" = "mechanical" ]; then
            grep '\[BROADCAST T[0-9]*#' "$BROADCAST_FILE" | grep -i 'critical\|pressure\|halt\|block' || true
        else
            cat "$BROADCAST_FILE"
        fi
    fi
fi

exit 0

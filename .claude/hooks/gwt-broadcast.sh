#!/usr/bin/env bash
# PostToolUse hook — GWT (Global Workspace Theory) inter-trigger broadcast.
#
# Maintains a shared broadcast file where CRITICAL trigger checks post
# one-line findings. Subsequent triggers read these summaries to avoid
# evaluating in isolation.
#
# Format: [BROADCAST T{n}#{check} {result}] {finding}
#   result = pass|fail (optional, defaults to pass if omitted)
# File:   /tmp/psychology-agent-gwt-broadcast
# Spec:   docs/cognitive-triggers.md § Global Workspace Broadcast
# Wu wei stage: 2 (convention with mechanical support)
source "${BASH_SOURCE[0]%/*}/_debug.sh"

BROADCAST_FILE="/tmp/${AGENT_ID}-gwt-broadcast"
RECORDED_FILE="/tmp/${AGENT_ID}-gwt-recorded"
MODE_FILE="/tmp/${AGENT_ID}-task-mode"
SESSION_FILE="/tmp/${AGENT_ID}-session-id"
STALE_SECONDS=300  # 5 minutes — clear stale broadcasts between responses

# Read current session ID (written by session-start-orient.sh)
SESSION_ID=0
if [ -f "$SESSION_FILE" ]; then
    SESSION_ID=$(cat "$SESSION_FILE" 2>/dev/null || echo 0)
fi

# Clear stale broadcast file (detects new response cycle)
if [ -f "$BROADCAST_FILE" ]; then
    file_age=$(( $(date +%s) - $(stat -f %m "$BROADCAST_FILE" 2>/dev/null || echo 0) ))
    if [ "$file_age" -gt "$STALE_SECONDS" ]; then
        : > "$BROADCAST_FILE"
        : > "$RECORDED_FILE"
    fi
fi

# Read task mode for filtering (mechanical skips advisory broadcasts)
TASK_MODE="analytical"
if [ -f "$MODE_FILE" ]; then
    TASK_MODE=$(tr -d '[:space:]' < "$MODE_FILE" 2>/dev/null)
fi

# ── Record new broadcasts to trigger_activations (basal ganglia telemetry) ──
# Parse unrecorded broadcast lines and write each to state.db.
# Uses a recorded-lines tracker to avoid double-counting within a response cycle.
if [ -s "$BROADCAST_FILE" ]; then
    touch "$RECORDED_FILE"
    while IFS= read -r line; do
        # Skip if already recorded
        grep -qxF "$line" "$RECORDED_FILE" 2>/dev/null && continue

        # Parse: [BROADCAST T{n}#{check} {result}] {finding}
        if [[ "$line" =~ \[BROADCAST\ (T[0-9]+)#([0-9]+)\ ?(pass|fail)?\]\ ?(.*) ]]; then
            tid="${BASH_REMATCH[1]}"
            check="${BASH_REMATCH[2]}"
            result="${BASH_REMATCH[3]:-pass}"
            finding="${BASH_REMATCH[4]}"

            # Record to trigger_activations via dual_write.py (background, non-blocking)
            if [ -f "${PROJECT_ROOT}/scripts/dual_write.py" ] && [ -f "${PROJECT_ROOT}/state.db" ]; then
                python3 "${PROJECT_ROOT}/scripts/dual_write.py" trigger-activation \
                    --session-id "$SESSION_ID" \
                    --trigger-id "$tid" \
                    --check-number "$check" \
                    --tier critical \
                    --result "$result" \
                    --action-taken "${finding:0:200}" 2>/dev/null &
            fi

            # Mark as recorded
            echo "$line" >> "$RECORDED_FILE"
        fi
    done < "$BROADCAST_FILE"
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

#!/usr/bin/env bash
# PostToolUse hook — reset consecutive failure counter on success.
# Companion to tool-failure-halt.sh (PostToolUseFailure).

COUNTER_FILE="/tmp/psychology-agent-consecutive-failures"
if [ -f "$COUNTER_FILE" ]; then
  echo "0" > "$COUNTER_FILE"
fi

#!/usr/bin/env bash
# PreToolUse hook — warns when context pressure exceeds thresholds.
# Reads context % from user-namespaced temp file (written by Notification hook).
# Non-blocking: outputs warning text that enters model context as a reminder.
#
# Thresholds (aligned with T2 Check 1):
#   60% — PRESSURE: consider /doc to persist findings
#   75% — CRITICAL: actively compress, /doc now, prepare for compaction

CTX_FILE="${XDG_RUNTIME_DIR:-/tmp}/.claude-context-pct-$(id -u)"

if [ ! -f "$CTX_FILE" ]; then
  exit 0
fi

USED_PCT=$(cat "$CTX_FILE" 2>/dev/null | tr -d '[:space:]')

if [ -z "$USED_PCT" ]; then
  exit 0
fi

if [ "$USED_PCT" -ge 75 ] 2>/dev/null; then
  echo "[CONTEXT] ${USED_PCT}% — CRITICAL. Run /doc NOW to persist findings. Prepare for compaction."
elif [ "$USED_PCT" -ge 60 ] 2>/dev/null; then
  echo "[CONTEXT] ${USED_PCT}% — PRESSURE. Consider /doc to persist important findings before context fills."
fi

exit 0

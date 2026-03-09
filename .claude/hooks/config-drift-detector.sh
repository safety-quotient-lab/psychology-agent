#!/usr/bin/env bash
# ConfigChange hook — detects and logs changes to configuration files.
# Alerts if hooks were modified mid-session (potential security concern).

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DRIFT_LOG="/tmp/psychology-agent-config-drift.jsonl"
TIMESTAMP=$(date -Iseconds)

# Log the change
echo "{\"timestamp\":\"${TIMESTAMP}\",\"event\":\"config_change\"}" >> "$DRIFT_LOG"

# Check if settings.json was modified
SETTINGS="${PROJECT_ROOT}/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  # Compare against git HEAD version
  DIFF=$(git diff HEAD -- "$SETTINGS" 2>/dev/null)
  if [ -n "$DIFF" ]; then
    echo "[HOOK] ⚠ .claude/settings.json modified mid-session. Hook configuration may have changed."
    echo "[HOOK] Review the change before proceeding — hooks enforce cogarch mechanically."
  fi
fi

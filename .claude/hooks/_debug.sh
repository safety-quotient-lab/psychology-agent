#!/usr/bin/env bash
# Shared hook debug logging. Source this at the top of every hook script.
#
# Enable:  touch .claude/hooks/.debug
# Disable: rm .claude/hooks/.debug
#
# Log: /tmp/psychology-agent-hook-debug.log

HOOK_DEBUG_FLAG="${BASH_SOURCE[0]%/*}/.debug"
HOOK_DEBUG_LOG="/tmp/psychology-agent-hook-debug.log"

if [ -f "$HOOK_DEBUG_FLAG" ]; then
  _hook_name="$(basename "${BASH_SOURCE[1]:-$0}")"
  _hook_ts="$(date -Iseconds)"
  _hook_file="${TOOL_INPUT_file_path:-}"
  printf '{"ts":"%s","hook":"%s","file":"%s","event":"%s"}\n' \
    "$_hook_ts" "$_hook_name" "$_hook_file" "${CLAUDE_HOOK_EVENT:-unknown}" \
    >> "$HOOK_DEBUG_LOG"
fi

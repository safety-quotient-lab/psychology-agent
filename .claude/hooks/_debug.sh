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

# Record a trigger firing to state.db (basal ganglia telemetry).
# Call: _record_trigger T4  (or T6, T13, T16, etc.)
# Only records when a check actually catches — not on every hook invocation.
# Uses agentdb if available, falls back to dual_write.py, no-ops if neither exists.
_record_trigger() {
  local tid="$1"
  [ -z "$tid" ] && return
  local _project_root="${PROJECT_ROOT:-$(cd "${BASH_SOURCE[0]%/*}/../.." 2>/dev/null && pwd)}"
  if [ -x "${_project_root}/agentdb" ]; then
    "${_project_root}/agentdb" trigger-fired --trigger-id "$tid" 2>/dev/null &
  elif [ -f "${_project_root}/scripts/dual_write.py" ]; then
    python3 "${_project_root}/scripts/dual_write.py" trigger-fired --trigger-id "$tid" 2>/dev/null &
  fi
}

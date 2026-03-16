#!/usr/bin/env bash
# Shared hook helper. Source this at the top of every hook script.
#
# Provides:
#   AGENT_ID       — local operational identity (from settings.local.json or agent-card.json)
#   PROJECT_ROOT   — git repo root
#   _record_trigger — basal ganglia telemetry helper
#   Debug logging  — enable: touch .claude/hooks/.debug
#
# Log: /tmp/{AGENT_ID}-hook-debug.log

# ── Project root (stable across hook calls) ──
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "${BASH_SOURCE[0]%/*}/../.." 2>/dev/null && pwd)}"

# ── Local agent ID resolver ──
# Priority: cached file > .claude/settings.local.json > .well-known/agent-card.json > fallback
# Cache invalidates at session start (session-start-orient.sh deletes it).
_AGENT_ID_CACHE="/tmp/$(echo "$PROJECT_ROOT" | shasum 2>/dev/null | cut -c1-8 || echo "default")-agent-id"

if [ -n "$AGENT_ID" ]; then
  : # already set in environment — respect it
elif [ -f "$_AGENT_ID_CACHE" ]; then
  AGENT_ID="$(cat "$_AGENT_ID_CACHE")"
else
  # Try .claude/settings.local.json first (gitignored, local identity)
  _LOCAL_SETTINGS="${PROJECT_ROOT}/.claude/settings.local.json"
  if [ -f "$_LOCAL_SETTINGS" ]; then
    AGENT_ID="$(python3 -c "import json; print(json.load(open('$_LOCAL_SETTINGS')).get('agent_id',''))" 2>/dev/null)"
  fi
  # Fall back to agent-card.json name field (committed, public identity)
  if [ -z "$AGENT_ID" ]; then
    _AGENT_CARD="${PROJECT_ROOT}/.well-known/agent-card.json"
    if [ -f "$_AGENT_CARD" ]; then
      AGENT_ID="$(python3 -c "import json; print(json.load(open('$_AGENT_CARD')).get('name',''))" 2>/dev/null)"
    fi
  fi
  # Last resort fallback
  AGENT_ID="${AGENT_ID:-psychology-agent}"
  # Cache for subsequent hook calls (zero Python overhead after first)
  echo "$AGENT_ID" > "$_AGENT_ID_CACHE"
fi
export AGENT_ID

# ── Debug logging ──
HOOK_DEBUG_FLAG="${BASH_SOURCE[0]%/*}/.debug"
HOOK_DEBUG_LOG="/tmp/${AGENT_ID}-hook-debug.log"

if [ -f "$HOOK_DEBUG_FLAG" ]; then
  _hook_name="$(basename "${BASH_SOURCE[1]:-$0}")"
  _hook_ts="$(date -Iseconds)"
  _hook_file="${TOOL_INPUT_file_path:-}"
  printf '{"ts":"%s","hook":"%s","file":"%s","event":"%s","agent":"%s"}\n' \
    "$_hook_ts" "$_hook_name" "$_hook_file" "${CLAUDE_HOOK_EVENT:-unknown}" "$AGENT_ID" \
    >> "$HOOK_DEBUG_LOG"
fi

# ── Record a trigger firing to state.db (basal ganglia telemetry) ──
# Call: _record_trigger T4  (or T6, T13, T16, etc.)
# Only records when a check actually catches — not on every hook invocation.
# Uses agentdb if available, falls back to dual_write.py, no-ops if neither exists.
_record_trigger() {
  local tid="$1"
  [ -z "$tid" ] && return
  if [ -x "${PROJECT_ROOT}/agentdb" ]; then
    "${PROJECT_ROOT}/agentdb" trigger-fired --trigger-id "$tid" 2>/dev/null &
  elif [ -f "${PROJECT_ROOT}/scripts/dual_write.py" ]; then
    python3 "${PROJECT_ROOT}/scripts/dual_write.py" trigger-fired --trigger-id "$tid" 2>/dev/null &
  fi
}

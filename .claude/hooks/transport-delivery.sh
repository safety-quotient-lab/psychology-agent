#!/usr/bin/env bash
# transport-delivery.sh — Auto-deliver transport messages to target agent repos
#
# Fires as PostToolUse on Write. Detects when a from-psychology-agent-*.json
# file lands in a transport session directory and delivers it to the target
# agent's repo via deliver-to-peer.sh.
#
# Determines the target agent from the message JSON (to.agent_id field).
# Skips delivery for local-coordination (no cross-repo delivery needed)
# and for messages addressed to psy-session (same repo).
#
# Non-blocking: delivery failures log a warning but do not block the session.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Only trigger on transport message files written by psychology-agent
TOOL_INPUT="${TOOL_USE_INPUT:-}"
FILE_PATH=""

# Extract file path from tool input (Write tool provides file_path)
if [ -n "$TOOL_INPUT" ]; then
  FILE_PATH=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('file_path', ''))
except:
    pass
" 2>/dev/null)
fi

[ -z "$FILE_PATH" ] && exit 0

# Only process from-psychology-agent-*.json files in transport/sessions/
case "$FILE_PATH" in
  */transport/sessions/*/from-psychology-agent-*.json) ;;
  *) exit 0 ;;
esac

# Skip local-coordination (no cross-repo delivery)
case "$FILE_PATH" in
  */local-coordination/*) exit 0 ;;
esac

# Extract target agent from message JSON
TARGET_AGENT=$(python3 -c "
import json, sys
try:
    d = json.load(open('${FILE_PATH}'))
    to = d.get('to', {})
    agent = to.get('agent_id', '') if isinstance(to, dict) else ''
    print(agent)
except:
    pass
" 2>/dev/null)

[ -z "$TARGET_AGENT" ] && exit 0

# Skip self-delivery
case "$TARGET_AGENT" in
  psychology-agent|psy-session) exit 0 ;;
esac

# Extract session from path
SESSION_NAME=$(echo "$FILE_PATH" | sed 's|.*/transport/sessions/\([^/]*\)/.*|\1|')
[ -z "$SESSION_NAME" ] && exit 0

# Derive a short label from the message subject
SHORT_LABEL=$(python3 -c "
import json
try:
    d = json.load(open('${FILE_PATH}'))
    subj = d.get('subject', 'delivery')
    # Take first 3 words, kebab-case
    words = subj.split()[:3]
    print('-'.join(w.lower().strip(',:;') for w in words))
except:
    print('delivery')
" 2>/dev/null)

# Make path relative to project root
REL_PATH="${FILE_PATH#${PROJECT_ROOT}/}"

echo "[HOOK] Transport delivery: ${REL_PATH} → ${TARGET_AGENT}"

# Deliver in background (non-blocking — delivery can take 10-30s for clone+PR)
nohup bash "${PROJECT_ROOT}/scripts/deliver-to-peer.sh" \
  "$TARGET_AGENT" "$SESSION_NAME" "$REL_PATH" "${SHORT_LABEL:-delivery}" \
  > "/tmp/transport-delivery-${SESSION_NAME}-$(date +%s).log" 2>&1 &

echo "[HOOK] Delivery queued (background). Check /tmp/transport-delivery-${SESSION_NAME}-*.log for status."

exit 0

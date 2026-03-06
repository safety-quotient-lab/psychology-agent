#!/usr/bin/env bash
# Transport scan hook — checks for pending interagent messages at session start.
# Designed for any agent in the psychology-agent mesh. Install in session-start hook.
#
# Usage: source this script or call it from your session-start-orient.sh
# Requires: git, jq (optional — falls back to grep if jq unavailable)
#
# For psq-agent on Chromabook:
#   1. Clone or pull the psychology-agent repo
#   2. Add to your session-start hook:
#      PSYCHOLOGY_REPO="$HOME/projects/psychology"
#      bash "$PSYCHOLOGY_REPO/transport/hooks/transport-scan.sh" "$PSYCHOLOGY_REPO" "psq-agent"

REPO_PATH="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
AGENT_ID="${2:-psychology-agent}"
MANIFEST="${REPO_PATH}/transport/MANIFEST.json"

# Pull latest (quiet — don't clutter session start)
git -C "$REPO_PATH" pull --quiet origin main 2>/dev/null

if [ ! -f "$MANIFEST" ]; then
  echo "[TRANSPORT] No manifest found at ${MANIFEST}"
  exit 0
fi

# Check for pending messages addressed to this agent
if command -v jq &>/dev/null; then
  PENDING_COUNT=$(jq -r ".pending[\"${AGENT_ID}\"] | length" "$MANIFEST" 2>/dev/null)
  if [ "$PENDING_COUNT" -gt 0 ]; then
    echo "[TRANSPORT] ${PENDING_COUNT} pending message(s) for ${AGENT_ID}:"
    jq -r ".pending[\"${AGENT_ID}\"][] | \"  - [\(.type)] \(.subject) (\(.file))\"" "$MANIFEST" 2>/dev/null
  else
    echo "[TRANSPORT] No pending messages for ${AGENT_ID}."
  fi

  # Check for session renames
  RENAMES=$(jq -r '.session_renames // {} | to_entries[] | "  \(.key) → \(.value)"' "$MANIFEST" 2>/dev/null)
  if [ -n "$RENAMES" ]; then
    echo "[TRANSPORT] Session renames:"
    echo "$RENAMES"
  fi
else
  # Fallback: grep for agent_id in manifest
  if grep -q "\"${AGENT_ID}\"" "$MANIFEST" 2>/dev/null; then
    PENDING_LINES=$(grep -A 5 "\"${AGENT_ID}\"" "$MANIFEST" | grep '"file"' | wc -l | tr -d '[:space:]')
    if [ "$PENDING_LINES" -gt 0 ]; then
      echo "[TRANSPORT] Pending messages detected for ${AGENT_ID} (install jq for details)."
      echo "[TRANSPORT] Check: ${MANIFEST}"
    fi
  else
    echo "[TRANSPORT] No pending messages for ${AGENT_ID}."
  fi
fi

# Also scan for agent-card
AGENT_CARD="${REPO_PATH}/.well-known/agent-card.json"
if [ -f "$AGENT_CARD" ]; then
  echo "[TRANSPORT] Agent card available: ${AGENT_CARD}"
fi

exit 0

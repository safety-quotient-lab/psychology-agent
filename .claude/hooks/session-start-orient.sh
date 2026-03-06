#!/usr/bin/env bash
# SessionStart hook — injects orientation context into Claude's conversation.
# stdout from this hook becomes additional context for the model.
# Supplements MEMORY.md auto-load with mechanical reminders.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Check auto-memory health (lightweight — full check in bootstrap-check.sh)
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
MEMORY_LIVE="$HOME/.claude/projects/${_HASH}/memory/MEMORY.md"
if [ ! -s "$MEMORY_LIVE" ]; then
  echo "[SESSION-START] WARNING: MEMORY.md missing or empty. Run ./bootstrap-check.sh to restore."
fi

# Remind of trigger system
echo "[SESSION-START] Cognitive triggers T1-T13 active. Read docs/cognitive-triggers.md for full system."
echo "[SESSION-START] Skills: /doc /hunt /cycle /capacity /adjudicate"
echo "[SESSION-START] MANDATORY: Read docs/cognitive-triggers.md and output the compact cogarch baseline summary as your first response action this session."

# Surface last session from lab-notebook (last session header)
LAST_SESSION=$(grep -n '^## [0-9]' "$PROJECT_ROOT/lab-notebook.md" 2>/dev/null | tail -1 | sed 's/^[0-9]*://')
if [ -n "$LAST_SESSION" ]; then
  echo "[SESSION-START] Last session: $LAST_SESSION"
fi

# Parry session toggle — clear previous session flag, prompt agent to ask
rm -f "${PROJECT_ROOT}/.parry-session-disabled"
echo "[SESSION-START] PARRY TOGGLE: Use AskUserQuestion to ask the user whether to enable parry for this session. If the user chooses to disable, create the file .parry-session-disabled in the project root. If enabled, do nothing (default: enabled)."

# Check for uncommitted changes
if git -C "$PROJECT_ROOT" diff --quiet 2>/dev/null && git -C "$PROJECT_ROOT" diff --cached --quiet 2>/dev/null; then
  : # clean
else
  echo "[SESSION-START] NOTE: Uncommitted changes detected in working tree."
fi

# Transport scan — check for pending interagent messages
TRANSPORT_SCAN="${PROJECT_ROOT}/transport/hooks/transport-scan.sh"
if [ -x "$TRANSPORT_SCAN" ]; then
  bash "$TRANSPORT_SCAN" "$PROJECT_ROOT" "psychology-agent"
fi

exit 0

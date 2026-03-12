#!/usr/bin/env bash
# SessionStart hook — injects orientation context into Claude's conversation.
# stdout from this hook becomes additional context for the model.
# Supplements MEMORY.md auto-load with mechanical reminders.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Auto-bootstrap memory if missing
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
MEMORY_LIVE="$HOME/.claude/projects/${_HASH}/memory/MEMORY.md"
if [ ! -s "$MEMORY_LIVE" ]; then
  BOOTSTRAP_CHECK="${PROJECT_ROOT}/bootstrap-check.sh"
  if [ -x "$BOOTSTRAP_CHECK" ]; then
    bash "$BOOTSTRAP_CHECK" 2>/dev/null
    if [ -s "$MEMORY_LIVE" ]; then
      echo "[SESSION-START] Auto-memory restored from committed snapshots."
    else
      echo "[SESSION-START] WARNING: bootstrap-check.sh ran but MEMORY.md still missing. Check docs/MEMORY-snapshot.md exists."
    fi
  else
    echo "[SESSION-START] WARNING: MEMORY.md missing and bootstrap-check.sh not found or not executable."
  fi
fi

# Record T1 trigger firing
AGENTDB="${PROJECT_ROOT}/agentdb"
if [ -x "$AGENTDB" ]; then
  "$AGENTDB" trigger-fired --trigger-id T1 2>/dev/null
elif [ -f "${PROJECT_ROOT}/scripts/dual_write.py" ] && [ -f "${PROJECT_ROOT}/state.db" ]; then
  python3 "${PROJECT_ROOT}/scripts/dual_write.py" trigger-fired --trigger-id T1 2>/dev/null
fi

# Remind of trigger system
echo "[SESSION-START] Cognitive triggers T1-T16 active. Read docs/cognitive-triggers.md for full system."
echo "[SESSION-START] Skills: /doc /hunt /cycle /knock /sync /iterate"
echo "[SESSION-START] MANDATORY: Read docs/cognitive-triggers.md and output the compact cogarch baseline summary as your first response action this session."

# Surface last session from lab-notebook (last session header)
LAST_SESSION=$(grep -n '^## [0-9]' "$PROJECT_ROOT/lab-notebook.md" 2>/dev/null | tail -1 | sed 's/^[0-9]*://')
if [ -n "$LAST_SESSION" ]; then
  echo "[SESSION-START] Last session: $LAST_SESSION"
fi

# Reset pushback accumulator for new session
rm -f "${HOME}/.claude/.pushback-count.tmp"

# Configurable /hunt at bootstrap — if flag file exists, inject instruction
if [ -f "${PROJECT_ROOT}/.claude/hunt-at-startup" ]; then
  HUNT_SCOPE=$(head -1 < "${PROJECT_ROOT}/.claude/hunt-at-startup" 2>/dev/null | tr -d '[:space:]')
  if [ -z "$HUNT_SCOPE" ]; then
    HUNT_SCOPE="all"
  fi
  echo "[SESSION-START] AUTO-HUNT: Run /hunt ${HUNT_SCOPE} after T1 orientation completes. To disable: rm .claude/hunt-at-startup"
fi

# Auto-bootstrap state DBs if missing
STATE_DB="${PROJECT_ROOT}/state.db"
if [ ! -f "$STATE_DB" ]; then
  if [ -x "${PROJECT_ROOT}/agentdb" ]; then
    "${PROJECT_ROOT}/agentdb" bootstrap 2>/dev/null
    if [ -f "$STATE_DB" ]; then
      echo "[SESSION-START] state.db + state.local.db bootstrapped via agentdb."
    else
      echo "[SESSION-START] WARNING: agentdb bootstrap failed. Run manually: ./agentdb bootstrap --force"
    fi
  elif [ -f "${PROJECT_ROOT}/scripts/bootstrap_state_db.py" ]; then
    python3 "${PROJECT_ROOT}/scripts/bootstrap_state_db.py" 2>/dev/null
    if [ -f "$STATE_DB" ]; then
      echo "[SESSION-START] state.db bootstrapped from source files."
    else
      echo "[SESSION-START] WARNING: state.db bootstrap failed."
    fi
  fi
fi

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

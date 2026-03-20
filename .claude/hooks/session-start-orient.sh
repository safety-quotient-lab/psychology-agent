#!/usr/bin/env bash
# SessionStart hook — injects orientation context into Claude's conversation.
# stdout from this hook becomes additional context for the model.
# Supplements MEMORY.md auto-load with mechanical reminders.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

# Invalidate agent ID cache so _debug.sh re-resolves from settings.local.json
_AGENT_ID_CACHE="/tmp/$(echo "$PROJECT_ROOT" | shasum 2>/dev/null | cut -c1-8 || echo "default")-agent-id"
rm -f "$_AGENT_ID_CACHE" 2>/dev/null

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

# Persist session ID for inter-hook communication (gwt-broadcast reads this)
SESSION_ID_FILE="/tmp/${AGENT_ID}-session-id"
if [ -f "${PROJECT_ROOT}/state.db" ]; then
  LATEST_SESSION=$(sqlite3 "${PROJECT_ROOT}/state.db" "SELECT MAX(id) FROM session_log;" 2>/dev/null || echo 0)
  NEXT_SESSION=$((LATEST_SESSION + 1))
  echo "$NEXT_SESSION" > "$SESSION_ID_FILE"
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

# ── Human-facing session resumption (F1) ──────────────────────────────────────
# After agent-facing orientation above, output a 3-line summary for the human.

# Line 1: Active thread summary from MEMORY.md
ACTIVE_THREAD=""
if [ -f "$MEMORY_LIVE" ]; then
  # Extract the line after "## Active Thread" — first non-empty content line
  ACTIVE_THREAD=$(awk '/^## Active Thread/{found=1; next} found && /^[*\*]/{print; exit} found && /^[^ #]/{print; exit}' "$MEMORY_LIVE" 2>/dev/null | head -c 200)
fi
if [ -z "$ACTIVE_THREAD" ]; then
  ACTIVE_THREAD="no active thread recorded"
fi
echo "[SESSION] Since last session: ${ACTIVE_THREAD}"

# Line 2: Open thread count from TODO.md
OPEN_THREADS=0
TODO_FILE="${PROJECT_ROOT}/TODO.md"
if [ -f "$TODO_FILE" ]; then
  OPEN_THREADS=$(grep -c '^\- \[ \]' "$TODO_FILE" 2>/dev/null || echo "0")
fi
echo "[SESSION] Open threads: ${OPEN_THREADS} unchecked items in TODO.md"

# Line 3: New mesh messages (from mesh-state or transport scan)
NEW_MSG_COUNT=0
MESH_STATE="${PROJECT_ROOT}/transport/sessions/local-coordination/mesh-state-${AGENT_ID:-psychology-agent}.json"
if [ -f "$MESH_STATE" ]; then
  NEW_MSG_COUNT=$(python3 -c "import json; print(json.load(open('${MESH_STATE}'))['transport']['unprocessed'])" 2>/dev/null || echo "0")
fi
echo "[SESSION] Mesh: ${NEW_MSG_COUNT} new messages"

# ── Morning briefing after autonomous cycles (F4) ─────────────────────────────
# Summarize autonomous activity since the last human session.
LOCAL_COORD="${PROJECT_ROOT}/transport/sessions/local-coordination"
if [ -d "$LOCAL_COORD" ]; then
  # Count escalation files (each represents an autonomous cycle that escalated)
  ESCALATION_COUNT=$(ls -1 "$LOCAL_COORD"/escalation-*.json 2>/dev/null | wc -l | tr -d ' ')

  # Budget status from mesh-state
  BUDGET_SPENT=""
  BUDGET_CUTOFF=""
  if [ -f "$MESH_STATE" ]; then
    BUDGET_SPENT=$(python3 -c "import json; d=json.load(open('${MESH_STATE}')); print(d['autonomy_budget']['budget_spent'])" 2>/dev/null || echo "?")
    BUDGET_CUTOFF=$(python3 -c "import json; d=json.load(open('${MESH_STATE}')); print(d['autonomy_budget']['budget_cutoff'])" 2>/dev/null || echo "?")
  fi

  # Last sync timestamp from heartbeat
  HEARTBEAT_FILE="${LOCAL_COORD}/heartbeat-${AGENT_ID:-psychology-agent}.json"
  LAST_SYNC_TS=""
  if [ -f "$HEARTBEAT_FILE" ]; then
    LAST_SYNC_TS=$(python3 -c "import json; print(json.load(open('${HEARTBEAT_FILE}'))['timestamp'])" 2>/dev/null || echo "unknown")
  fi

  # Only show the briefing if autonomous cycles ran (heartbeat file exists)
  if [ -f "$HEARTBEAT_FILE" ]; then
    echo ""
    echo "[BRIEFING] Autonomous activity since last human session:"
    echo "[BRIEFING]   Last autonomous sync: ${LAST_SYNC_TS:-unknown}"
    echo "[BRIEFING]   Escalations: ${ESCALATION_COUNT}"
    echo "[BRIEFING]   Messages awaiting processing: ${NEW_MSG_COUNT}"
    echo "[BRIEFING]   Autonomy budget: ${BUDGET_SPENT:-?}/${BUDGET_CUTOFF:-?} spent (0=unlimited)"
    if [ "$ESCALATION_COUNT" -gt 0 ] 2>/dev/null; then
      echo "[BRIEFING]   ⚠ Review escalation files in transport/sessions/local-coordination/"
    fi
  fi
fi

exit 0

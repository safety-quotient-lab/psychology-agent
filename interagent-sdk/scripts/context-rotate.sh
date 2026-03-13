#!/usr/bin/env bash
#
# context-rotate.sh — Graceful context rotation for mesh agents
#
# Signals agents to checkpoint their work-in-progress, persist state,
# and exit cleanly so a fresh context can pick up where they left off.
#
# The agent's autonomous-sync loop (or interactive session) checks for
# the sentinel file and runs its /cycle equivalent before exiting.
#
# Usage:
#   ./scripts/context-rotate.sh                  # Rotate all agents
#   ./scripts/context-rotate.sh psq              # Rotate specific agent (partial match)
#   ./scripts/context-rotate.sh --reason "1M context expansion"
#   ./scripts/context-rotate.sh --status         # Check rotation state
#   ./scripts/context-rotate.sh --clear          # Remove all sentinel files
#   ./scripts/context-rotate.sh --timeout 120    # Wait up to 120s for checkpoint (default: 90)
#
# Protocol:
#   1. Drop sentinel: /tmp/context-rotate-{agent-id}
#   2. Agent detects sentinel in its sync loop or hook
#   3. Agent persists state → context-resume.md, plan.md, MEMORY.md
#   4. Agent commits with message "context-rotate: checkpoint"
#   5. Agent removes sentinel and exits
#   6. Next invocation reads context-resume.md to restore thread
#
# Sentinel file format (JSON):
#   { "reason": "...", "requested_at": "ISO8601", "requested_by": "operator" }

set -eo pipefail

# shellcheck source=agents.conf.sh
source "$(dirname "$0")/agents.conf.sh"

ACTION="rotate"
FILTER=""
REASON="context rotation requested by operator"
TIMEOUT=90
WAIT=false

while [ $# -gt 0 ]; do
  case "$1" in
    --status)  ACTION="status"; shift ;;
    --clear)   ACTION="clear"; shift ;;
    --reason)  REASON="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --wait)    WAIT=true; shift ;;
    --help|-h)
      echo "Usage: context-rotate.sh [FILTER] [--reason TEXT] [--status] [--clear] [--wait] [--timeout SECS]"
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2; exit 1 ;;
    *)
      FILTER="$1"; shift ;;
  esac
done

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SENTINEL_PREFIX="/tmp/context-rotate"

REMOTE_PAIRS=""
for pair in "${AGENT_DIR_PAIRS[@]}"; do
  REMOTE_PAIRS="${REMOTE_PAIRS} \"${pair}\""
done

# ── Status: check sentinel and context-resume.md state ────────────
show_status() {
  printf "%-22s %10s %10s %s\n" "AGENT" "SENTINEL" "RESUME_MD" "LAST_CHECKPOINT"
  printf "%-22s %10s %10s %s\n" "-----" "--------" "---------" "---------------"

  ssh "${SSH_HOST}" '
  for pair in '"${REMOTE_PAIRS}"'; do
    agent_id="${pair%%:*}"
    project_dir="${pair#*:}"
    sentinel="/tmp/context-rotate-${agent_id}"
    resume="${project_dir}/context-resume.md"

    sent="none"
    if [ -f "$sentinel" ]; then
      sent="PENDING"
    fi

    has_resume="no"
    last_cp="never"
    if [ -f "$resume" ]; then
      has_resume="yes"
      last_cp=$(head -5 "$resume" | grep "rotated_at:" | sed "s/.*rotated_at: //" | cut -c1-19)
      [ -z "$last_cp" ] && last_cp=$(stat -c "%Y" "$resume" 2>/dev/null | xargs -I{} date -d @{} +"%Y-%m-%dT%H:%M" 2>/dev/null || echo "?")
    fi

    echo "${agent_id}|${sent}|${has_resume}|${last_cp}"
  done
  ' | while IFS='|' read -r agent sent has_resume last_cp; do
    if [ -n "$FILTER" ] && ! echo "$agent" | grep -qi "$FILTER"; then
      continue
    fi
    printf "%-22s %10s %10s %s\n" "$agent" "$sent" "$has_resume" "$last_cp"
  done
}

# ── Clear: remove all sentinel files ──────────────────────────────
clear_sentinels() {
  echo "Clearing context-rotate sentinels..."
  ssh "${SSH_HOST}" '
  for pair in '"${REMOTE_PAIRS}"'; do
    agent_id="${pair%%:*}"
    sentinel="/tmp/context-rotate-${agent_id}"
    if [ -f "$sentinel" ]; then
      rm -f "$sentinel"
      echo "  Removed: ${sentinel}"
    fi
  done
  '
  echo "Done."
}

# ── Rotate: drop sentinels and optionally wait for checkpoints ────
rotate_agents() {
  echo "Context Rotation"
  echo "================"
  echo "Reason:  ${REASON}"
  echo "Time:    ${TIMESTAMP}"
  echo "Timeout: ${TIMEOUT}s (per agent)"
  echo ""

  # Build the sentinel JSON payload
  SENTINEL_JSON=$(python3 -c "
import json
print(json.dumps({
    'reason': '${REASON}',
    'requested_at': '${TIMESTAMP}',
    'requested_by': 'operator'
}))
")

  # Drop sentinel files
  ROTATED=0
  SKIPPED=0

  ssh "${SSH_HOST}" '
  for pair in '"${REMOTE_PAIRS}"'; do
    agent_id="${pair%%:*}"
    project_dir="${pair#*:}"
    sentinel="/tmp/context-rotate-${agent_id}"

    # Filter check
    filter="'"${FILTER}"'"
    if [ -n "$filter" ] && ! echo "$agent_id" | grep -qi "$filter"; then
      echo "SKIP|${agent_id}|filtered"
      continue
    fi

    # Check if agent already has a pending rotation
    if [ -f "$sentinel" ]; then
      echo "SKIP|${agent_id}|sentinel already exists"
      continue
    fi

    # Drop sentinel
    echo '"'"''"${SENTINEL_JSON}"''"'"' > "$sentinel"
    echo "SENT|${agent_id}|sentinel dropped"
  done
  ' | while IFS='|' read -r action agent reason; do
    case "$action" in
      SENT)
        echo "  ${agent}: sentinel dropped"
        ROTATED=$((ROTATED + 1))
        ;;
      SKIP)
        echo "  ${agent}: skipped (${reason})"
        SKIPPED=$((SKIPPED + 1))
        ;;
    esac
  done

  echo ""

  if [ "$WAIT" = true ]; then
    echo "Waiting for checkpoints (${TIMEOUT}s timeout)..."
    wait_for_checkpoints
  else
    echo "Sentinels dropped. Agents will checkpoint on next sync cycle."
    echo ""
    echo "Options:"
    echo "  --wait         Block until all agents checkpoint"
    echo "  --status       Check rotation progress"
    echo "  --clear        Remove sentinels (cancel rotation)"
  fi
}

# ── Wait: poll for checkpoint commits ─────────────────────────────
wait_for_checkpoints() {
  START_EPOCH=$(date +%s)

  while true; do
    ELAPSED=$(( $(date +%s) - START_EPOCH ))
    if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
      echo ""
      echo "Timeout reached (${TIMEOUT}s). Checking final state:"
      show_status
      echo ""
      echo "WARNING: Some agents may not have checkpointed."
      echo "Remaining sentinels left in place — agents will checkpoint on next sync."
      echo "To cancel: ./scripts/context-rotate.sh --clear"
      return 1
    fi

    # Count remaining sentinels
    REMAINING=$(ssh "${SSH_HOST}" '
    count=0
    for pair in '"${REMOTE_PAIRS}"'; do
      agent_id="${pair%%:*}"
      filter="'"${FILTER}"'"
      if [ -n "$filter" ] && ! echo "$agent_id" | grep -qi "$filter"; then
        continue
      fi
      sentinel="/tmp/context-rotate-${agent_id}"
      [ -f "$sentinel" ] && count=$((count + 1))
    done
    echo $count
    ')

    if [ "$REMAINING" -eq 0 ]; then
      echo ""
      echo "All agents checkpointed successfully."
      show_status
      return 0
    fi

    printf "\r  %d agents remaining (%ds elapsed)..." "$REMAINING" "$ELAPSED"
    sleep 5
  done
}

# ── Dispatch ──────────────────────────────────────────────────────
case "${ACTION}" in
  status)  show_status ;;
  clear)   clear_sentinels ;;
  rotate)  rotate_agents ;;
esac

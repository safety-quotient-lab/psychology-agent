#!/usr/bin/env bash
#
# mesh-ctl.sh — Lightweight mesh control that works on macOS bash 3.2
#
# Bypasses agents.conf.sh (requires bash 4+ for associative arrays).
# Reads SSH config from .dev.vars directly.
#
# Usage:
#   ./scripts/mesh-ctl.sh pause              # Pause the mesh
#   ./scripts/mesh-ctl.sh unpause            # Unpause the mesh
#   ./scripts/mesh-ctl.sh status             # Check pause + meshd + budget
#   ./scripts/mesh-ctl.sh budget             # Show all budgets
#   ./scripts/mesh-ctl.sh budget-reset [N]   # Reset all budgets to N (default 50)

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .dev.vars
if [ -f "${REPO_ROOT}/.dev.vars" ]; then
  while IFS='=' read -r key value; do
    key=$(echo "$key" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
    value=$(echo "$value" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | sed "s/^['\"]//;s/['\"]$//")
    [ -z "$key" ] || [[ "$key" == \#* ]] && continue
    export "$key=$value"
  done < "${REPO_ROOT}/.dev.vars"
fi

SSH_HOST="${AGENT_SSH_HOST:?AGENT_SSH_HOST not set in .dev.vars}"
BASE="${AGENT_BASE_DIR:?AGENT_BASE_DIR not set in .dev.vars}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

AGENTS="psychology:psychology-agent psq:psq-agent unratified:unratified-agent observatory:observatory-agent"

case "${1:-status}" in
  pause)
    /usr/bin/ssh "$SSH_HOST" "echo 'paused by operator ${TIMESTAMP}' > /tmp/mesh-pause"
    echo "Mesh paused at ${TIMESTAMP}"
    ;;

  unpause)
    /usr/bin/ssh "$SSH_HOST" "rm -f /tmp/mesh-pause"
    echo "Mesh unpaused at ${TIMESTAMP}"
    ;;

  status)
    echo "=== Mesh Status ==="
    /usr/bin/ssh "$SSH_HOST" "test -f /tmp/mesh-pause && echo 'MODE: PAUSED' && cat /tmp/mesh-pause || echo 'MODE: RUNNING'"
    echo ""
    echo "=== meshd processes ==="
    /usr/bin/ssh "$SSH_HOST" "ps aux | grep meshd | grep -v grep | awk '{print \$11, \$12, \$13}'"
    echo ""
    echo "=== Budgets ==="
    for entry in $AGENTS; do
      dir="${entry%%:*}"
      name="${entry#*:}"
      # Map short names to actual paths
      case "$dir" in
        psychology) path="${BASE}/psychology" ;;
        psq) path="${BASE}/psychology/safety-quotient" ;;
        *) path="${BASE}/${dir}" ;;
      esac
      result=$(/usr/bin/ssh "$SSH_HOST" "sqlite3 -separator '|' ${path}/state.db 'SELECT budget_current, budget_max, shadow_mode FROM autonomy_budget WHERE agent_id=\"${name}\";'" 2>/dev/null || echo "?|?|?")
      printf "  %-22s %s\n" "$name" "$result"
    done
    ;;

  budget)
    printf "%-22s %8s %8s %8s\n" "AGENT" "CURRENT" "MAX" "SHADOW"
    printf "%-22s %8s %8s %8s\n" "-----" "-------" "---" "------"
    for entry in $AGENTS; do
      dir="${entry%%:*}"
      name="${entry#*:}"
      case "$dir" in
        psychology) path="${BASE}/psychology" ;;
        psq) path="${BASE}/psychology/safety-quotient" ;;
        *) path="${BASE}/${dir}" ;;
      esac
      result=$(/usr/bin/ssh "$SSH_HOST" "sqlite3 -separator '|' ${path}/state.db 'SELECT budget_current, budget_max, shadow_mode FROM autonomy_budget WHERE agent_id=\"${name}\";'" 2>/dev/null || echo "?|?|?")
      IFS='|' read -r cur max shadow <<< "$result"
      printf "%-22s %8s %8s %8s\n" "$name" "$cur" "$max" "$shadow"
    done
    ;;

  budget-reset)
    AMOUNT="${2:-50}"
    echo "Resetting all budgets to ${AMOUNT}/${AMOUNT}..."
    for entry in $AGENTS; do
      dir="${entry%%:*}"
      name="${entry#*:}"
      case "$dir" in
        psychology) path="${BASE}/psychology" ;;
        psq) path="${BASE}/psychology/safety-quotient" ;;
        *) path="${BASE}/${dir}" ;;
      esac
      /usr/bin/ssh "$SSH_HOST" "sqlite3 ${path}/state.db \"UPDATE autonomy_budget SET budget_current = ${AMOUNT}, budget_max = ${AMOUNT}, updated_at = datetime('now') WHERE agent_id = '${name}';\"" 2>/dev/null && echo "  ${name}: ${AMOUNT}/${AMOUNT}" || echo "  ${name}: FAILED"
    done
    ;;

  *)
    echo "Usage: mesh-ctl.sh {pause|unpause|status|budget|budget-reset [N]}"
    exit 1
    ;;
esac

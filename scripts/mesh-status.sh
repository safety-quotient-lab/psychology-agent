#!/usr/bin/env bash
#
# mesh-status.sh — Quick health overview of all mesh agents
#
# Usage: ./scripts/mesh-status.sh
#
# Shows: reachability, cron status, meshd status, budget, queue depth

set -eo pipefail

# shellcheck source=agents.conf.sh
source "$(dirname "$0")/agents.conf.sh"

# Check mesh-pause
if ssh "${SSH_HOST}" "test -f /tmp/mesh-pause" 2>/dev/null; then
  echo "⛔ MESH PAUSED — $(ssh "${SSH_HOST}" 'cat /tmp/mesh-pause')"
  echo ""
fi

printf "%-22s %8s %8s %6s %6s %8s %s\n" \
  "AGENT" "REACH" "BUDGET" "CRON" "MESHD" "QUEUE" "LAST_SYNC"
printf "%-22s %8s %8s %6s %6s %8s %s\n" \
  "-----" "-----" "------" "----" "-----" "-----" "---------"

REMOTE_PAIRS=""
for pair in "${AGENT_DIR_PAIRS[@]}"; do
  REMOTE_PAIRS="${REMOTE_PAIRS} \"${pair}\""
done

ssh "${SSH_HOST}" '
for pair in '"${REMOTE_PAIRS}"'; do
  agent_id="${pair%%:*}"
  project_dir="${pair#*:}"
  db="${project_dir}/state.db"

  # Budget
  budget=$(sqlite3 "$db" "SELECT budget_current || '"'"'/'"'"' || budget_max FROM autonomy_budget WHERE agent_id='"'"'$agent_id'"'"';" 2>/dev/null || echo "n/a")

  # Cron status (check if cron job exists for this agent)
  cron_active=$(crontab -l 2>/dev/null | grep -c "$agent_id" || true)
  cron_status="off"
  [ "$cron_active" -gt 0 ] && cron_status="on"

  # meshd status
  meshd_pid=$(pgrep -f "meshd.*${agent_id}" 2>/dev/null || true)
  meshd_status="down"
  [ -n "$meshd_pid" ] && meshd_status="up"

  # Queue depth (count pending messages across transport sessions)
  queue=0
  if [ -d "${project_dir}/transport/sessions" ]; then
    for manifest in "${project_dir}"/transport/sessions/*/MANIFEST.json; do
      [ -f "$manifest" ] || continue
      pending=$(python3 -c "
import json, sys
try:
    m = json.load(open(sys.argv[1]))
    turns = m.get(\"turns\", [])
    pending = sum(1 for t in turns if t.get(\"status\") == \"pending\")
    print(pending)
except: print(0)
" "$manifest" 2>/dev/null)
      queue=$((queue + pending))
    done
  fi

  # Last sync (most recent .json in transport sessions, excluding MANIFEST)
  last_sync="never"
  newest=$(find "${project_dir}/transport/sessions" -name "from-*.json" -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -1 | cut -d" " -f2)
  if [ -n "$newest" ]; then
    last_sync=$(stat -c "%Y" "$newest" 2>/dev/null | xargs -I{} date -d @{} +"%H:%M" 2>/dev/null || echo "?")
  fi

  echo "${agent_id}|${budget}|${cron_status}|${meshd_status}|${queue}|${last_sync}"
done
' | while IFS='|' read -r agent budget cron meshd queue last_sync; do
  # Reachability check via HTTP
  url=""
  case "$agent" in
    psychology-agent) url="https://psychology-agent.safety-quotient.dev/api/status" ;;
    psq-agent) url="https://psq-agent.safety-quotient.dev/api/status" ;;
    unratified-agent) url="https://unratified-agent.safety-quotient.dev/api/status" ;;
    observatory-agent) url="https://observatory-agent.safety-quotient.dev/api/status" ;;
  esac
  reach="?"
  if [ -n "$url" ]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null || echo "000")
    [ "$http_code" = "200" ] && reach="ok" || reach="${http_code}"
  fi

  printf "%-22s %8s %8s %6s %6s %8s %s\n" \
    "$agent" "$reach" "$budget" "$cron" "$meshd" "$queue" "$last_sync"
done

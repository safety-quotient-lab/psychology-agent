#!/usr/bin/env bash
#
# budget-check.sh — Show current autonomy budgets for all mesh agents
#
# Usage: ./scripts/budget-check.sh

set -eo pipefail

# shellcheck source=agents.conf.sh
source "$(dirname "$0")/agents.conf.sh"

printf "%-22s %8s %8s %8s %s\n" "AGENT" "SPENT" "CUTOFF" "SHADOW" "LAST_AUDIT"
printf "%-22s %8s %8s %8s %s\n" "-----" "-----" "------" "------" "----------"

REMOTE_PAIRS=""
for pair in "${AGENT_DB_PAIRS[@]}"; do
  REMOTE_PAIRS="${REMOTE_PAIRS} \"${pair}\""
done

ssh "${SSH_HOST}" "
for pair in ${REMOTE_PAIRS}; do
  agent_id=\"\${pair%%:*}\"
  db=\"\${pair#*:}\"
  row=\$(sqlite3 -separator '|' \"\$db\" \"SELECT budget_spent, budget_cutoff, shadow_mode, last_audit FROM autonomy_budget WHERE agent_id='\$agent_id';\" 2>/dev/null)
  echo \"\$agent_id|\${row:------|------|------|no row}\"
done
" | while IFS='|' read -r agent spent cutoff shadow audit; do
  label="$cutoff"
  [ "$cutoff" = "0" ] && label="∞"
  printf "%-22s %8s %8s %8s %s\n" "$agent" "$spent" "$label" "$shadow" "$audit"
done

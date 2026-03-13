#!/usr/bin/env bash
#
# budget-check.sh — Show current autonomy budgets for all mesh agents
#
# Usage: ./scripts/budget-check.sh

set -eo pipefail

SSH_HOST="${AGENT_SSH_HOST:-chromabook}"

printf "%-22s %8s %8s %8s %s\n" "AGENT" "CURRENT" "MAX" "SHADOW" "LAST_AUDIT"
printf "%-22s %8s %8s %8s %s\n" "-----" "-------" "---" "------" "----------"

ssh "${SSH_HOST}" '
for pair in \
  "psychology-agent:/home/kashif/projects/psychology/state.db" \
  "psq-agent:/home/kashif/projects/psychology/safety-quotient/state.db" \
  "unratified-agent:/home/kashif/projects/unratified/state.db" \
  "observatory-agent:/home/kashif/projects/observatory/state.db"; do

  agent_id="${pair%%:*}"
  db="${pair#*:}"
  row=$(sqlite3 -separator "|" "$db" "SELECT budget_current, budget_max, shadow_mode, last_audit FROM autonomy_budget WHERE agent_id='"'"'$agent_id'"'"';" 2>/dev/null)
  echo "$agent_id|${row:------|------|------|no row}"
done
' | while IFS='|' read -r agent cur max shadow audit; do
  printf "%-22s %8s %8s %8s %s\n" "$agent" "$cur" "$max" "$shadow" "$audit"
done

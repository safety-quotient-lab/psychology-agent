#!/usr/bin/env bash
#
# budget-reset.sh — Reset autonomy budgets across all mesh agents
#
# Usage:
#   ./scripts/budget-reset.sh              # Reset to default (50/50)
#   ./scripts/budget-reset.sh 100          # Reset to 100/100
#   ./scripts/budget-reset.sh 50 100       # Reset to 50/100 (current/max)
#
# Requires SSH access to the agent host (configured in ~/.ssh/config).

set -eo pipefail

BUDGET_CURRENT="${1:-50}"
BUDGET_MAX="${2:-$BUDGET_CURRENT}"
SSH_HOST="${AGENT_SSH_HOST:-chromabook}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")

echo "Resetting autonomy budgets to ${BUDGET_CURRENT}/${BUDGET_MAX}"
echo "Host: ${SSH_HOST}"
echo "---"

ssh "${SSH_HOST}" "
for pair in \
  'psychology-agent:/home/kashif/projects/psychology/state.db' \
  'psq-agent:/home/kashif/projects/psychology/safety-quotient/state.db' \
  'unratified-agent:/home/kashif/projects/unratified/state.db' \
  'observatory-agent:/home/kashif/projects/observatory/state.db'; do

  agent_id=\"\${pair%%:*}\"
  db=\"\${pair#*:}\"
  printf '%s: ' \"\$agent_id\"

  sqlite3 \"\$db\" \"
    INSERT INTO autonomy_budget (agent_id, budget_current, budget_max, shadow_mode, last_audit, updated_at)
    VALUES ('\$agent_id', ${BUDGET_CURRENT}, ${BUDGET_MAX}, 0, '${TIMESTAMP}', '${TIMESTAMP}')
    ON CONFLICT(agent_id) DO UPDATE SET
      budget_current = ${BUDGET_CURRENT},
      budget_max = ${BUDGET_MAX},
      shadow_mode = 0,
      consecutive_blocks = 0,
      last_audit = '${TIMESTAMP}',
      updated_at = '${TIMESTAMP}';
  \" 2>&1 && echo '${BUDGET_CURRENT}/${BUDGET_MAX} done' || echo 'FAILED'
done
"

echo "---"
echo "Verify with: ./scripts/budget-check.sh"

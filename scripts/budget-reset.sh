#!/usr/bin/env bash
#
# budget-reset.sh — Reset autonomy budget counters across all mesh agents
#
# Usage:
#   ./scripts/budget-reset.sh              # Reset spent to 0, keep current cutoff
#   ./scripts/budget-reset.sh --cutoff 100 # Reset spent to 0, set cutoff to 100
#   ./scripts/budget-reset.sh --cutoff 0   # Reset spent to 0, set cutoff to unlimited
#
# Requires SSH access to the agent host (configured in .dev.vars).

set -eo pipefail

# shellcheck source=agents.conf.sh
source "$(dirname "$0")/agents.conf.sh"

CUTOFF=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cutoff) CUTOFF="$2"; shift 2;;
    *) echo "Unknown option: $1"; exit 1;;
  esac
done

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")

if [ -n "$CUTOFF" ]; then
  CUTOFF_LABEL="$CUTOFF"
  [ "$CUTOFF" = "0" ] && CUTOFF_LABEL="unlimited"
  echo "Resetting budgets: spent→0, cutoff→${CUTOFF_LABEL}"
else
  echo "Resetting budgets: spent→0 (cutoff unchanged)"
fi
echo "Host: ${SSH_HOST}"
echo "---"

REMOTE_PAIRS=""
for pair in "${AGENT_DB_PAIRS[@]}"; do
  REMOTE_PAIRS="${REMOTE_PAIRS} \"${pair}\""
done

CUTOFF_CLAUSE=""
if [ -n "$CUTOFF" ]; then
  CUTOFF_CLAUSE=", budget_cutoff = ${CUTOFF}"
fi

ssh "${SSH_HOST}" "
for pair in ${REMOTE_PAIRS}; do
  agent_id=\"\${pair%%:*}\"
  db=\"\${pair#*:}\"
  printf '%s: ' \"\$agent_id\"

  sqlite3 \"\$db\" \"
    INSERT INTO autonomy_budget (agent_id, budget_spent, budget_cutoff, shadow_mode, last_audit, updated_at)
    VALUES ('\$agent_id', 0, ${CUTOFF:-0}, 0, '${TIMESTAMP}', '${TIMESTAMP}')
    ON CONFLICT(agent_id) DO UPDATE SET
      budget_spent = 0
      ${CUTOFF_CLAUSE},
      shadow_mode = 0,
      consecutive_blocks = 0,
      last_audit = '${TIMESTAMP}',
      updated_at = '${TIMESTAMP}';
  \" 2>&1 && echo 'reset done' || echo 'FAILED'
done
"

echo "---"
echo "Verify with: ./scripts/budget-check.sh"

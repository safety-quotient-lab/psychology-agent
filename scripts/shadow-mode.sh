#!/usr/bin/env bash
#
# shadow-mode.sh — Toggle shadow mode across all mesh agents
#
# Usage:
#   ./scripts/shadow-mode.sh              # Show current state
#   ./scripts/shadow-mode.sh on           # Enable shadow mode (log only, no real actions)
#   ./scripts/shadow-mode.sh off          # Disable shadow mode (full autonomous operation)
#   ./scripts/shadow-mode.sh off psq      # Disable for a specific agent (partial match)

set -eo pipefail

ACTION="${1:-status}"
FILTER="${2:-}"
SSH_HOST="${AGENT_SSH_HOST:-chromabook}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")

AGENTS=(
  "psychology-agent:/home/kashif/projects/psychology/state.db"
  "psq-agent:/home/kashif/projects/psychology/safety-quotient/state.db"
  "unratified-agent:/home/kashif/projects/unratified/state.db"
  "observatory-agent:/home/kashif/projects/observatory/state.db"
)

case "${ACTION}" in
  on|off)
    VALUE=1
    [ "${ACTION}" = "off" ] && VALUE=0
    LABEL="ON (log only)"
    [ "${VALUE}" = "0" ] && LABEL="OFF (live)"

    echo "Setting shadow_mode=${VALUE} (${LABEL})"
    echo "---"

    ssh "${SSH_HOST}" "
    for pair in \
      'psychology-agent:/home/kashif/projects/psychology/state.db' \
      'psq-agent:/home/kashif/projects/psychology/safety-quotient/state.db' \
      'unratified-agent:/home/kashif/projects/unratified/state.db' \
      'observatory-agent:/home/kashif/projects/observatory/state.db'; do

      agent_id=\"\${pair%%:*}\"
      db=\"\${pair#*:}\"

      if [ -n '${FILTER}' ] && ! echo \"\$agent_id\" | grep -qi '${FILTER}'; then
        continue
      fi

      printf '%s: ' \"\$agent_id\"
      sqlite3 \"\$db\" \"
        UPDATE autonomy_budget
        SET shadow_mode = ${VALUE}, updated_at = '${TIMESTAMP}'
        WHERE agent_id = '\$agent_id';
      \" 2>&1 && echo '${LABEL}' || echo 'FAILED'
    done
    "
    echo "---"
    echo "Verify with: ./scripts/shadow-mode.sh"
    ;;

  status|*)
    printf "%-22s %8s %s\n" "AGENT" "SHADOW" "UPDATED_AT"
    printf "%-22s %8s %s\n" "-----" "------" "----------"

    ssh "${SSH_HOST}" '
    for pair in \
      "psychology-agent:/home/kashif/projects/psychology/state.db" \
      "psq-agent:/home/kashif/projects/psychology/safety-quotient/state.db" \
      "unratified-agent:/home/kashif/projects/unratified/state.db" \
      "observatory-agent:/home/kashif/projects/observatory/state.db"; do

      agent_id="${pair%%:*}"
      db="${pair#*:}"
      row=$(sqlite3 -separator "|" "$db" "SELECT shadow_mode, updated_at FROM autonomy_budget WHERE agent_id='"'"'$agent_id'"'"';" 2>/dev/null)
      echo "$agent_id|${row:-?|?}"
    done
    ' | while IFS='|' read -r agent shadow updated; do
      label="ON (log only)"
      [ "$shadow" = "0" ] && label="OFF (live)"
      printf "%-22s %8s %s\n" "$agent" "$label" "$updated"
    done
    ;;
esac

#!/usr/bin/env bash
#
# queue-check.sh — Show pending message counts per agent
#
# Usage:
#   ./scripts/queue-check.sh           # Summary view
#   ./scripts/queue-check.sh -v        # Verbose — show each session

set -eo pipefail

VERBOSE="${1:-}"
SSH_HOST="${AGENT_SSH_HOST:-chromabook}"

printf "%-22s %8s  %s\n" "AGENT" "PENDING" "SESSIONS"
printf "%-22s %8s  %s\n" "-----" "-------" "--------"

ssh "${SSH_HOST}" '
VERBOSE="'"${VERBOSE}"'"

for pair in \
  "psychology-agent:/home/kashif/projects/psychology" \
  "psq-agent:/home/kashif/projects/psychology/safety-quotient" \
  "unratified-agent:/home/kashif/projects/unratified" \
  "observatory-agent:/home/kashif/projects/observatory"; do

  agent_id="${pair%%:*}"
  project_dir="${pair#*:}"
  total=0
  session_details=""

  if [ -d "${project_dir}/transport/sessions" ]; then
    for manifest in "${project_dir}"/transport/sessions/*/MANIFEST.json; do
      [ -f "$manifest" ] || continue
      result=$(python3 -c "
import json, sys
try:
    m = json.load(open(sys.argv[1]))
    session = m.get(\"session_id\", \"?\")
    turns = m.get(\"turns\", [])
    pending = sum(1 for t in turns if t.get(\"status\") == \"pending\")
    print(f\"{pending}|{session}\")
except: print(\"0|?\")
" "$manifest" 2>/dev/null)
      count="${result%%|*}"
      session="${result#*|}"
      total=$((total + count))
      if [ "$count" -gt 0 ]; then
        session_details="${session_details} ${session}(${count})"
      fi
    done
  fi

  echo "${agent_id}|${total}|${session_details:- (none)}"
done
' | while IFS='|' read -r agent total sessions; do
  printf "%-22s %8s  %s\n" "$agent" "$total" "$sessions"
  if [ "$VERBOSE" = "-v" ] && [ "$total" -gt 0 ]; then
    echo "$sessions" | tr ' ' '\n' | while read -r s; do
      [ -n "$s" ] && printf "%-22s %8s    └─ %s\n" "" "" "$s"
    done
  fi
done

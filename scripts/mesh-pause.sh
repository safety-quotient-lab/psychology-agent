#!/usr/bin/env bash
#
# mesh-pause.sh — Toggle the mesh-pause circuit breaker
#
# Usage:
#   ./scripts/mesh-pause.sh          # Pause the mesh
#   ./scripts/mesh-pause.sh on       # Pause the mesh
#   ./scripts/mesh-pause.sh off      # Unpause the mesh
#   ./scripts/mesh-pause.sh status   # Check current state
#
# When paused, all cron-driven autonomous sync cycles halt.

set -eo pipefail

ACTION="${1:-on}"
SSH_HOST="${AGENT_SSH_HOST:-chromabook}"
PAUSE_FILE="/tmp/mesh-pause"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

case "${ACTION}" in
  on|pause)
    ssh "${SSH_HOST}" "echo 'paused by operator ${TIMESTAMP}' > ${PAUSE_FILE}"
    echo "Mesh paused at ${TIMESTAMP}"
    ;;
  off|unpause)
    ssh "${SSH_HOST}" "rm -f ${PAUSE_FILE}"
    echo "Mesh unpaused at ${TIMESTAMP}"
    ;;
  status)
    if ssh "${SSH_HOST}" "test -f ${PAUSE_FILE}" 2>/dev/null; then
      echo "PAUSED"
      ssh "${SSH_HOST}" "cat ${PAUSE_FILE}"
    else
      echo "RUNNING"
    fi
    ;;
  *)
    echo "Usage: mesh-pause.sh [on|off|status]" >&2
    exit 1
    ;;
esac

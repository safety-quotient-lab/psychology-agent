#!/usr/bin/env bash
# mesh-stop.sh — Halt all autonomous agents in the mesh.
#
# Creates /tmp/mesh-pause, which autonomous-sync.sh checks at the top of
# every cycle. While this file exists, no agent processes new messages.
#
# Usage:
#   ./mesh-stop.sh              # pause all agents
#   ./mesh-stop.sh psq-agent    # pause only psq-agent
#
# Undo with: mesh-start.sh

set -euo pipefail

MESH_PAUSE="/tmp/mesh-pause"

if [ $# -eq 0 ]; then
    touch "${MESH_PAUSE}"
    echo "Mesh STOPPED — ${MESH_PAUSE} created."
    echo "All agents will halt at their next sync cycle."
    echo "Run mesh-start.sh to resume."
else
    AGENT_ID="$1"
    AGENT_PAUSE="/tmp/sync-pause-${AGENT_ID}"
    touch "${AGENT_PAUSE}"
    echo "Agent STOPPED — ${AGENT_PAUSE} created."
    echo "${AGENT_ID} will halt at its next sync cycle."
    echo "Run mesh-start.sh ${AGENT_ID} to resume."
fi

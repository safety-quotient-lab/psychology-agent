#!/usr/bin/env bash
# mesh-start.sh — Resume all autonomous agents in the mesh.
#
# Removes /tmp/mesh-pause (and per-agent pause files), allowing
# autonomous-sync.sh to proceed normally.
#
# Usage:
#   ./mesh-start.sh              # resume all agents
#   ./mesh-start.sh psq-agent    # resume only psq-agent
#
# Pair with: mesh-stop.sh

set -euo pipefail

MESH_PAUSE="/tmp/mesh-pause"

if [ $# -eq 0 ]; then
    removed=0
    if [ -f "${MESH_PAUSE}" ]; then
        rm "${MESH_PAUSE}"
        echo "Removed ${MESH_PAUSE} — mesh-wide pause lifted."
        removed=$((removed + 1))
    fi

    # Also remove any per-agent pause files
    for f in /tmp/sync-pause-*; do
        [ -f "$f" ] || continue
        agent_name="${f#/tmp/sync-pause-}"
        rm "$f"
        echo "Removed $f — ${agent_name} pause lifted."
        removed=$((removed + 1))
    done

    if [ "${removed}" -eq 0 ]; then
        echo "No pause files found — mesh already running."
    else
        echo "Mesh STARTED — ${removed} pause file(s) removed."
        echo "Agents will resume at their next sync cycle."
    fi
else
    AGENT_ID="$1"
    AGENT_PAUSE="/tmp/sync-pause-${AGENT_ID}"
    if [ -f "${AGENT_PAUSE}" ]; then
        rm "${AGENT_PAUSE}"
        echo "Agent STARTED — ${AGENT_PAUSE} removed."
        echo "${AGENT_ID} will resume at its next sync cycle."
    else
        echo "No pause file found for ${AGENT_ID} — already running."
    fi
fi

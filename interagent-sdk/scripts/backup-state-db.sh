#!/usr/bin/env bash
# backup-state-db.sh — Backup all agent state.db files
#
# state.db contains irreplaceable accumulated data: transport messages,
# decisions, claims, trigger state, facets, spawn history, health
# observations, trust matrix. This data represents sessions of agent
# work and cannot be reconstructed from source files alone.
#
# Usage:
#   ./scripts/backup-state-db.sh                    # backup this agent's state.db
#   ./scripts/backup-state-db.sh --all              # backup all agents
#
# Backup location: ~/backups/state-db/{timestamp}/{agent}-state.db
# Retention: keeps last 7 daily backups (older ones pruned)

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_ROOT="${HOME}/backups/state-db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

# ── Resolve agent base directory ─────────────────────────────────────────
AGENT_BASE_DIR="${AGENT_BASE_DIR:-${HOME}/projects}"

backup_one() {
    local proj="$1"
    local db="${AGENT_BASE_DIR}/${proj}/state.db"

    if [ -f "$db" ] && [ -s "$db" ]; then
        mkdir -p "$BACKUP_DIR"
        cp "$db" "${BACKUP_DIR}/${proj}-state.db"
        local size
        size=$(du -k "$db" | awk '{print $1}')
        echo "[backup] ${proj}: ${size}KB → ${BACKUP_DIR}/${proj}-state.db"
    else
        echo "[backup] ${proj}: SKIP (missing or empty)"
    fi
}

if [ "${1:-}" = "--all" ]; then
    # Backup all agents
    for proj in psychology safety-quotient unratified observatory operations-agent; do
        backup_one "$proj"
    done
else
    # Backup just this agent
    AGENT_ID=$(python3 -c "
import json
try:
    cfg = json.load(open('${PROJECT_ROOT}/cogarch.config.json'))
    print(cfg.get('identity', {}).get('agent_id', ''))
except:
    pass
" 2>/dev/null)

    if [ -n "$AGENT_ID" ]; then
        # Derive project dir name from agent_id
        proj=$(basename "$PROJECT_ROOT")
        backup_one "$proj"
    else
        echo "[backup] ERROR: cannot determine agent identity" >&2
        exit 1
    fi
fi

# ── Prune old backups (keep last 7) ─────────────────────────────────────
if [ -d "$BACKUP_ROOT" ]; then
    DIRS=$(ls -1d "${BACKUP_ROOT}"/*/ 2>/dev/null | sort -r | tail -n +8)
    if [ -n "$DIRS" ]; then
        echo "$DIRS" | xargs rm -rf
        echo "[backup] Pruned old backups (kept last 7)"
    fi
fi

echo "[backup] Complete: ${BACKUP_DIR}"

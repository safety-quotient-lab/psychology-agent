#!/usr/bin/env bash
#
# fix-stale-signals.sh — Clear stale escalation/halt files and fix budget schema
#
# Session 94 diagnostic found three signal inflation sources across the fleet:
#   1. Stale escalation files (escalation_present=1.0, +0.15 activation)
#   2. Stale halt files (accumulated from budget-exhausted agents)
#   3. Budget schema mismatch (budget_max/budget_current vs budget_spent/budget_cutoff)
#
# Also sets budget_cutoff=0 (unlimited) for all agents per operator directive.
#
# Usage: ./scripts/fix-stale-signals.sh
#
# Safe to run multiple times — all operations are idempotent.

set -eo pipefail

# shellcheck source=agents.conf.sh
source "$(dirname "$0")/agents.conf.sh"

echo "=== Clearing stale escalation and halt files ==="

for pair in "${AGENT_DIR_PAIRS[@]}"; do
    agent_id="${pair%%:*}"
    agent_dir="${pair##*:}"

    local_coord="${agent_dir}/transport/sessions/local-coordination"

    # Count and clear escalation files
    esc_count=$(ssh "$SSH_HOST" "ls ${local_coord}/escalation-*.json 2>/dev/null | wc -l" 2>/dev/null || echo "0")
    esc_count=$(echo "$esc_count" | tr -d '[:space:]')
    if [ "$esc_count" -gt 0 ]; then
        ssh "$SSH_HOST" "rm ${local_coord}/escalation-*.json" 2>/dev/null
        echo "  ${agent_id}: cleared ${esc_count} escalation files"
    else
        echo "  ${agent_id}: no escalations"
    fi

    # Count and clear halt files
    halt_count=$(ssh "$SSH_HOST" "ls ${local_coord}/halt-*.json 2>/dev/null | wc -l" 2>/dev/null || echo "0")
    halt_count=$(echo "$halt_count" | tr -d '[:space:]')
    if [ "$halt_count" -gt 0 ]; then
        ssh "$SSH_HOST" "rm ${local_coord}/halt-*.json" 2>/dev/null
        echo "  ${agent_id}: cleared ${halt_count} halt files"
    else
        echo "  ${agent_id}: no halts"
    fi
done

echo ""
echo "=== Migrating budget schema (budget_max→budget_cutoff, shadow_mode→sleep_mode) ==="

for pair in "${AGENT_DIR_PAIRS[@]}"; do
    agent_id="${pair%%:*}"
    agent_dir="${pair##*:}"
    local_db="${agent_dir}/state.local.db"

    ssh "$SSH_HOST" "
        sqlite3 '${local_db}' 'ALTER TABLE autonomy_budget RENAME COLUMN budget_max TO budget_cutoff;' 2>/dev/null && echo '  ${agent_id}: renamed budget_max→budget_cutoff' || echo '  ${agent_id}: budget_cutoff already exists'
        sqlite3 '${local_db}' 'ALTER TABLE autonomy_budget RENAME COLUMN budget_current TO budget_spent;' 2>/dev/null && echo '  ${agent_id}: renamed budget_current→budget_spent' || echo '  ${agent_id}: budget_spent already exists'
        sqlite3 '${local_db}' 'ALTER TABLE autonomy_budget RENAME COLUMN shadow_mode TO sleep_mode;' 2>/dev/null && echo '  ${agent_id}: renamed shadow_mode→sleep_mode' || echo '  ${agent_id}: sleep_mode already exists'
    " 2>/dev/null
done

echo ""
echo "=== Setting budget_cutoff=0 (unlimited) for all agents ==="

for pair in "${AGENT_DIR_PAIRS[@]}"; do
    agent_id="${pair%%:*}"
    agent_dir="${pair##*:}"
    local_db="${agent_dir}/state.local.db"

    ssh "$SSH_HOST" "
        sqlite3 '${local_db}' 'UPDATE autonomy_budget SET budget_cutoff = 0, budget_spent = 0;' 2>/dev/null
        result=\$(sqlite3 '${local_db}' 'SELECT agent_id, budget_spent, budget_cutoff FROM autonomy_budget;' 2>/dev/null)
        echo \"  \${result}\"
    " 2>/dev/null
done

echo ""
echo "=== Done. Activation signals should drop within one oscillator cycle. ==="
echo ""
echo "Remaining known signal inflation source:"
echo "  peer_heartbeat_stale=0.5 — meshd does not write heartbeat or mesh-state files."
echo "  These lived in autonomous-sync.sh which meshd replaced."
echo "  Fix: meshd needs native heartbeat emission (Go) or periodic heartbeat.py execution."

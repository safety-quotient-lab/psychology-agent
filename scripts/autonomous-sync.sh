#!/usr/bin/env bash
# autonomous-sync.sh — Cron-driven autonomous /sync for the agent mesh
#
# Each invocation: git pull → check budget → check interval → claude /sync → git push.
#
# Usage:
#   ./scripts/autonomous-sync.sh                          # runs in script's parent dir
#   ./scripts/autonomous-sync.sh /path/to/agent/repo      # runs in specified dir
#   PROJECT_ROOT=/path/to/repo ./scripts/autonomous-sync.sh  # env var override
#
# Cron examples:
#   */5 * * * * /path/to/scripts/autonomous-sync.sh >> /tmp/sync.log 2>&1
#   */5 * * * * /path/to/scripts/autonomous-sync.sh /home/kashif/psq-agent >> /tmp/psq-sync.log 2>&1
#
# Requires: claude CLI, git, sqlite3, python3

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

# Project root: $1 argument > PROJECT_ROOT env var > script's parent dir
if [ -n "${1:-}" ] && [ -d "${1:-}" ]; then
    PROJECT_ROOT="$(cd "$1" && pwd)"
elif [ -z "${PROJECT_ROOT:-}" ]; then
    PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi
IDENTITY_FILE="${PROJECT_ROOT}/.agent-identity.json"

# Agent identity: .agent-identity.json > AGENT_ID env var > default
if [ -f "${IDENTITY_FILE}" ]; then
    AGENT_ID=$(python3 -c "import json; print(json.load(open('${IDENTITY_FILE}'))['agent_id'])" 2>/dev/null)
fi
AGENT_ID="${AGENT_ID:-psychology-agent}"
export AUTONOMOUS_AGENT="${AGENT_ID}"  # signals pre-commit hook to enforce allowlist
DB_PATH="${PROJECT_ROOT}/state.db"
LOCK_FILE="/tmp/autonomous-sync-${AGENT_ID}.lock"
WAKE_FILE="/tmp/sync-wake-${AGENT_ID}"
export MAX_ACTIONS_PER_CYCLE=5  # reserved for evaluator gate (not yet enforced)
MAX_CONSECUTIVE_ERRORS=2
GATE_ACCELERATED=false
GATE_ACCELERATED_INTERVAL=60  # seconds — fast lane when gates active
LOG_PREFIX="[$(date '+%Y-%m-%dT%H:%M:%S%z')] [${AGENT_ID}]"

# ── Functions ────────────────────────────────────────────────────────────────

log() { echo "${LOG_PREFIX} $1"; }
err() { echo "${LOG_PREFIX} ERROR: $1" >&2; }

cleanup() {
    rm -f "${LOCK_FILE}"
}
trap cleanup EXIT

check_lock() {
    if [ -f "${LOCK_FILE}" ]; then
        local lock_pid
        lock_pid=$(cat "${LOCK_FILE}" 2>/dev/null || echo "")
        if [ -n "${lock_pid}" ] && kill -0 "${lock_pid}" 2>/dev/null; then
            log "Another sync in progress (PID ${lock_pid}). Skipping."
            exit 0
        fi
        log "Stale lock found (PID ${lock_pid} not running). Removing."
        rm -f "${LOCK_FILE}"
    fi
    echo $$ > "${LOCK_FILE}"
}

ensure_hooks() {
    # Ensure pre-commit hook is active (travels with repo in .githooks/)
    cd "${PROJECT_ROOT}"
    local current_hooks
    current_hooks=$(git config core.hooksPath 2>/dev/null || echo "")
    if [ "${current_hooks}" != ".githooks" ] && [ -d "${PROJECT_ROOT}/.githooks" ]; then
        git config core.hooksPath .githooks
        log "Set core.hooksPath to .githooks (pre-commit secret scanning active)"
    fi
}

ensure_db() {
    if [ ! -f "${DB_PATH}" ]; then
        log "state.db missing — running bootstrap"
        python3 "${PROJECT_ROOT}/scripts/bootstrap_state_db.py" --force
    fi

    # Ensure trust_budget table exists (migration-safe)
    sqlite3 "${DB_PATH}" <<'SQL'
CREATE TABLE IF NOT EXISTS trust_budget (
    agent_id        TEXT PRIMARY KEY,
    budget_max      INTEGER NOT NULL DEFAULT 20,
    budget_current  INTEGER NOT NULL DEFAULT 20,
    last_audit      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    last_action     TEXT,
    consecutive_blocks INTEGER DEFAULT 0,
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS autonomous_actions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id        TEXT NOT NULL,
    action_type     TEXT NOT NULL,
    action_class    TEXT NOT NULL,
    evaluator_tier  INTEGER NOT NULL,
    evaluator_result TEXT NOT NULL,
    description     TEXT NOT NULL,
    budget_before   INTEGER NOT NULL,
    budget_after    INTEGER NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
SQL

    # Add min_action_interval column if absent (migration-safe)
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE trust_budget ADD COLUMN min_action_interval INTEGER NOT NULL DEFAULT 300;" 2>/dev/null || true

    # Initialize budget row if absent
    sqlite3 "${DB_PATH}" \
        "INSERT OR IGNORE INTO trust_budget (agent_id) VALUES ('${AGENT_ID}');"
}

check_budget() {
    local budget
    budget=$(sqlite3 "${DB_PATH}" \
        "SELECT budget_current FROM trust_budget WHERE agent_id = '${AGENT_ID}';")

    if [ -z "${budget}" ] || [ "${budget}" -le 0 ]; then
        err "HALT — trust budget exhausted (${budget:-0} credits). Human audit required."
        err "Run: python3 scripts/trust-budget.py reset"

        # Write halt marker to local-coordination
        local halt_file
        halt_file="${PROJECT_ROOT}/transport/sessions/local-coordination/halt-${AGENT_ID}-$(date '+%Y%m%dT%H%M%S').json"
        cat > "${halt_file}" <<HALT_JSON
{
  "schema": "local-coordination/v1",
  "timestamp": "$(date '+%Y-%m-%dT%H:%M:%S%z')",
  "from": {"agent_id": "${AGENT_ID}"},
  "message_type": "halt",
  "payload": {
    "reason": "trust_budget_exhausted",
    "budget_current": 0,
    "action": "Autonomous sync halted. Human audit required to reset budget."
  }
}
HALT_JSON
        cd "${PROJECT_ROOT}"
        if git add "${halt_file}" && \
           git commit -m "autonomous: ${AGENT_ID} halted — trust budget exhausted

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"; then
            git push origin main || true
        fi

        exit 1
    fi

    log "Trust budget: ${budget} credits remaining" >&2
    echo "${budget}"
}

check_wake_signal() {
    # L3 fallback: check for LAN wake-up file (SSH touch from peer agent)
    if [ -f "${WAKE_FILE}" ]; then
        rm -f "${WAKE_FILE}"
        log "WAKE-UP signal received — accelerating cycle"
        GATE_ACCELERATED=true
    fi
}

check_active_gates() {
    # L2 fallback: if any gates await a response, accelerate polling interval
    # Gate check runs BEFORE interval check — active gates override the standard
    # min_action_interval with GATE_ACCELERATED_INTERVAL (60s)
    local active_gates
    active_gates=$(sqlite3 "${DB_PATH}" \
        "SELECT COUNT(*) FROM active_gates
         WHERE status = 'waiting'
         AND datetime(timeout_at) > datetime('now', 'localtime')
         AND sending_agent = '${AGENT_ID}';" 2>/dev/null || echo "0")

    if [ "${active_gates}" -gt 0 ]; then
        log "GATE-ACCELERATED — ${active_gates} active gate(s), using ${GATE_ACCELERATED_INTERVAL}s interval"
        GATE_ACCELERATED=true
    fi
}

handle_gate_timeouts() {
    # Process any gates that have exceeded their timeout_at
    local timed_out
    timed_out=$(sqlite3 "${DB_PATH}" \
        "SELECT gate_id, fallback_action FROM active_gates
         WHERE status = 'waiting'
         AND datetime(timeout_at) <= datetime('now', 'localtime')
         AND sending_agent = '${AGENT_ID}';" 2>/dev/null || echo "")

    if [ -z "${timed_out}" ]; then
        return 0
    fi

    echo "${timed_out}" | while IFS='|' read -r gate_id fallback_action; do
        log "GATE TIMEOUT: ${gate_id} — fallback: ${fallback_action}"

        case "${fallback_action}" in
            continue-without-response)
                python3 "${PROJECT_ROOT}/scripts/dual_write.py" gate-timeout \
                    --gate-id "${gate_id}" 2>/dev/null || true
                ;;
            retry-once)
                # Check if already retried (status would have been set to timed-out)
                local retry_count
                retry_count=$(sqlite3 "${DB_PATH}" \
                    "SELECT COUNT(*) FROM autonomous_actions
                     WHERE description LIKE '%retry gate ${gate_id}%'
                     AND agent_id = '${AGENT_ID}';" 2>/dev/null || echo "0")
                if [ "${retry_count}" -gt 0 ]; then
                    log "GATE TIMEOUT: ${gate_id} already retried — escalating to halt"
                    python3 "${PROJECT_ROOT}/scripts/dual_write.py" gate-timeout \
                        --gate-id "${gate_id}" 2>/dev/null || true
                else
                    log "GATE TIMEOUT: ${gate_id} — will retry once"
                    # Mark timed-out (caller can re-send and open a new gate)
                    python3 "${PROJECT_ROOT}/scripts/dual_write.py" gate-timeout \
                        --gate-id "${gate_id}" 2>/dev/null || true
                fi
                ;;
            halt-and-escalate)
                python3 "${PROJECT_ROOT}/scripts/dual_write.py" gate-timeout \
                    --gate-id "${gate_id}" 2>/dev/null || true
                err "HALT — gate ${gate_id} timed out with halt-and-escalate"
                # Write halt marker
                local halt_file
                halt_file="${PROJECT_ROOT}/transport/sessions/local-coordination/halt-gate-${AGENT_ID}-$(date '+%Y%m%dT%H%M%S').json"
                cat > "${halt_file}" <<GATE_HALT_JSON
{
  "schema": "local-coordination/v1",
  "timestamp": "$(date '+%Y-%m-%dT%H:%M:%S%z')",
  "from": {"agent_id": "${AGENT_ID}"},
  "message_type": "halt",
  "payload": {
    "reason": "gate_timeout_escalation",
    "gate_id": "${gate_id}",
    "action": "Gated chain timed out with halt-and-escalate. Human review required."
  }
}
GATE_HALT_JSON
                ;;
        esac
    done
}

check_interval() {
    # Enforce min_action_interval — defer (not halt) if too soon since last action.
    # Budget check runs first: exhausted agents halt, not defer.
    #
    # Gate-aware acceleration: when GATE_ACCELERATED=true, use the shorter
    # gate interval instead of the configured min_action_interval. This
    # creates a fast lane for gated chains while preserving the standard
    # interval as authoritative for ungated operation.
    local result
    result=$(sqlite3 "${DB_PATH}" "
        SELECT
            COALESCE(min_action_interval, 300) as interval_secs,
            CASE
                WHEN last_action IS NULL THEN 999999
                ELSE CAST((julianday('now', 'localtime') - julianday(last_action)) * 86400 AS INTEGER)
            END as elapsed_secs
        FROM trust_budget
        WHERE agent_id = '${AGENT_ID}';
    ")

    local interval_secs elapsed_secs
    interval_secs=$(echo "${result}" | cut -d'|' -f1)
    elapsed_secs=$(echo "${result}" | cut -d'|' -f2)

    # Gate-aware override: use accelerated interval when gates active
    if [ "${GATE_ACCELERATED}" = true ]; then
        if [ "${elapsed_secs}" -lt "${GATE_ACCELERATED_INTERVAL}" ]; then
            local remaining=$((GATE_ACCELERATED_INTERVAL - elapsed_secs))
            log "GATE-DEFER — ${elapsed_secs}s since last action, gate minimum ${GATE_ACCELERATED_INTERVAL}s. Retry in ${remaining}s."
            exit 0
        fi
        log "Gate-accelerated interval check passed: ${elapsed_secs}s since last action (gate minimum ${GATE_ACCELERATED_INTERVAL}s)" >&2
        return 0
    fi

    if [ "${elapsed_secs}" -lt "${interval_secs}" ]; then
        local remaining=$((interval_secs - elapsed_secs))
        log "DEFER — ${elapsed_secs}s since last action, minimum ${interval_secs}s. Retry in ${remaining}s."
        exit 0
    fi

    log "Interval check passed: ${elapsed_secs}s since last action (minimum ${interval_secs}s)" >&2
}

git_sync() {
    cd "${PROJECT_ROOT}"

    # Auto-commit dirty transport files before pulling to prevent rebase conflicts.
    # The heartbeat emits before git_sync, modifying a tracked file every cycle.
    # Without this, git pull --rebase fails on "unstaged changes" indefinitely.
    if ! git diff --quiet -- transport/ .well-known/; then
        git add transport/ .well-known/ 2>/dev/null
        git commit -m "autonomous: ${AGENT_ID} transport state update

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>/dev/null || true
    fi

    log "Pulling latest from origin..."
    if ! git pull --rebase origin main 2>&1; then
        err "git pull failed"
        return 1
    fi

    return 0
}

git_push() {
    cd "${PROJECT_ROOT}"

    if git diff --cached --quiet && git diff --quiet; then
        log "No changes to push"
        return 0
    fi

    log "Pushing changes..."
    if ! git push origin main 2>&1; then
        err "git push failed"
        return 1
    fi

    return 0
}

run_sync() {
    cd "${PROJECT_ROOT}"

    log "Running /sync --autonomous..." >&2

    # Pull cross-repo inbound messages into state.db before orientation
    if [ -f "${PROJECT_ROOT}/scripts/cross_repo_fetch.py" ]; then
        log "Fetching cross-repo transport..." >&2
        python3 "${PROJECT_ROOT}/scripts/cross_repo_fetch.py" --index 2>/dev/null || {
            err "cross_repo_fetch.py failed — continuing without cross-repo inbound"
        }
    fi

    # Generate orientation payload from state.db
    local orientation
    orientation=$(python3 "${PROJECT_ROOT}/scripts/orientation-payload.py" \
        --agent-id "${AGENT_ID}" 2>/dev/null) || {
        err "orientation-payload.py failed — proceeding with bare /sync"
        orientation=""
    }

    local prompt
    if [ -n "${orientation}" ]; then
        prompt=$(printf '%s\n\n/sync' "${orientation}")
    else
        prompt="/sync"
    fi

    local sync_output
    sync_output=$(claude -p "${prompt}" \
        --allowedTools "Read,Write,Edit,Glob,Grep,Bash" \
        --permission-mode "bypassPermissions" \
        --max-turns 30 \
        2>&1) || {
        err "claude CLI exited with error"
        echo "${sync_output}" | tail -20
        return 1
    }

    echo "${sync_output}"
    return 0
}

record_action() {
    local action_type="$1"
    local action_class="$2"
    local tier="$3"
    local result="$4"
    local description="$5"
    local budget_before="$6"

    local cost=0
    if [ "${result}" = "approved" ]; then
        case "${tier}" in
            1) cost=1 ;;
            2) cost=3 ;;
            *) cost=1 ;;
        esac
    fi

    local budget_after=$((budget_before - cost))
    if [ "${budget_after}" -lt 0 ]; then
        budget_after=0
    fi

    sqlite3 "${DB_PATH}" "INSERT INTO autonomous_actions
        (agent_id, action_type, action_class, evaluator_tier, evaluator_result,
         description, budget_before, budget_after)
        VALUES ('${AGENT_ID}', '${action_type}', '${action_class}', ${tier},
                '${result}', '${description}', ${budget_before}, ${budget_after});"

    sqlite3 "${DB_PATH}" "UPDATE trust_budget
        SET budget_current = ${budget_after},
            last_action = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE agent_id = '${AGENT_ID}';"

    echo "${budget_after}"
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
    log "=== Autonomous sync cycle starting ==="

    check_lock
    ensure_hooks
    ensure_db

    # Emit heartbeat (mesh presence announcement)
    python3 "${PROJECT_ROOT}/scripts/heartbeat.py" emit >&2 || true

    # L3: Check for wake-up signal from peer (SSH touch)
    check_wake_signal

    # L2: Check for active gates that need accelerated polling
    check_active_gates

    # Handle any gates that have timed out (before budget check —
    # timeout handling may write halt markers that consume budget)
    handle_gate_timeouts

    # Check budget before doing anything (halt if exhausted)
    local budget
    budget=$(check_budget) || exit 1

    # Check interval (defer if too soon — must follow budget check)
    # Gate-aware: uses 60s interval when GATE_ACCELERATED=true,
    # standard min_action_interval otherwise
    check_interval

    # Pull latest
    if ! git_sync; then
        err "Git sync failed — aborting cycle"
        exit 1
    fi

    # Run /sync
    local sync_output
    if sync_output=$(run_sync); then
        log "Sync completed successfully"

        # Record the sync action (Tier 1 — reversible)
        # Gate-accelerated no-op polls: if /sync found no new messages and
        # this cycle was gate-accelerated, record as gate_poll with 0 cost
        if [ "${GATE_ACCELERATED}" = true ]; then
            # Check if any messages were actually processed this cycle
            local new_processed
            new_processed=$(echo "${sync_output}" | grep -c "marked processed\|ACKs written" 2>/dev/null || echo "0")
            if [ "${new_processed}" -eq 0 ]; then
                # No-op gate poll — 0 cost, no budget deduction
                record_action "gate_poll" "reversible" 1 "approved" \
                    "Gate-accelerated poll — no new messages (0 cost)" "${budget}" > /dev/null
                # Don't update last_action for no-op polls — allows immediate re-poll
                sqlite3 "${DB_PATH}" "UPDATE trust_budget
                    SET last_action = NULL
                    WHERE agent_id = '${AGENT_ID}';" 2>/dev/null || true
                log "Gate-accelerated no-op poll — 0 budget cost, immediate re-poll enabled"
            else
                budget=$(record_action "sync" "reversible" 1 "approved" \
                    "Gate-accelerated /sync — processed ${new_processed} items" "${budget}")
            fi
        else
            budget=$(record_action "sync" "reversible" 1 "approved" \
                "Autonomous /sync cycle completed" "${budget}")
        fi

        # Push any changes
        if ! git_push; then
            err "Git push failed"
            # Record error but don't consume extra budget
            record_action "git_push" "reversible" 1 "blocked" \
                "Git push failed after sync" "${budget}" > /dev/null
        fi
    else
        err "Sync execution failed"
        record_action "sync" "reversible" 1 "blocked" \
            "Sync execution failed" "${budget}" > /dev/null

        # Check consecutive error count
        local blocks
        blocks=$(sqlite3 "${DB_PATH}" \
            "SELECT consecutive_blocks FROM trust_budget WHERE agent_id = '${AGENT_ID}';")
        blocks=$((blocks + 1))
        sqlite3 "${DB_PATH}" \
            "UPDATE trust_budget SET consecutive_blocks = ${blocks} WHERE agent_id = '${AGENT_ID}';"

        if [ "${blocks}" -ge "${MAX_CONSECUTIVE_ERRORS}" ]; then
            err "HALT — ${blocks} consecutive errors. Human review required."
            exit 1
        fi
    fi

    # Reset consecutive blocks on success
    sqlite3 "${DB_PATH}" \
        "UPDATE trust_budget SET consecutive_blocks = 0 WHERE agent_id = '${AGENT_ID}';"

    log "=== Autonomous sync cycle complete (budget: ${budget}) ==="
}

main "$@"

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

# ── NVM / PATH bootstrap ────────────────────────────────────────────────────
# Cron runs with a minimal PATH that excludes NVM-managed Node (and claude).
# Source NVM if present so that `claude`, `node`, and `npm` resolve.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "${NVM_DIR}/nvm.sh" ] && source "${NVM_DIR}/nvm.sh" 2>/dev/null

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
TRANSPORT_CHANGED=false  # set by git_sync — true if pull brought transport changes
LOG_PREFIX="[$(date '+%Y-%m-%dT%H:%M:%S%z')] [${AGENT_ID}]"

# ── Functions ────────────────────────────────────────────────────────────────

log() { echo "${LOG_PREFIX} $1"; }
err() { echo "${LOG_PREFIX} ERROR: $1" >&2; }

get_repo() {
    # Derive GitHub repo slug from git remote origin URL
    local url
    url=$(cd "${PROJECT_ROOT}" && git remote get-url origin 2>/dev/null || echo "")
    # Handle SSH (git@github.com:org/repo.git) and HTTPS (https://github.com/org/repo.git)
    echo "${url}" | sed -E 's|.*github\.com[:/]||; s|\.git$||'
}

escalate() {
    # File a for-human-review issue via the mesh bot.
    # Usage: escalate "severity" "category" "summary" ["context"] ["suggested-action"]
    local severity="$1"
    local category="$2"
    local summary="$3"
    local context="${4:-}"
    local suggested_action="${5:-}"
    local repo
    repo=$(get_repo)

    if [ -z "${repo}" ]; then
        err "Cannot escalate — no git remote origin found"
        return 1
    fi

    local escalate_script="${PROJECT_ROOT}/scripts/escalate.py"
    if [ ! -f "${escalate_script}" ]; then
        err "Cannot escalate — scripts/escalate.py not found"
        return 1
    fi

    local args=(
        python3 "${escalate_script}"
        --agent "${AGENT_ID}"
        --severity "${severity}"
        --category "${category}"
        --summary "${summary}"
        --repo "${repo}"
    )
    [ -n "${context}" ] && args+=(--context "${context}")
    [ -n "${suggested_action}" ] && args+=(--suggested-action "${suggested_action}")

    "${args[@]}" 2>&1 || {
        err "escalate.py failed — notification not sent"
        return 1
    }
}

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

    # Apply full schema idempotently — CREATE TABLE IF NOT EXISTS + INSERT OR IGNORE
    # ensures new tables/rows appear without destroying existing data.
    # Single source of truth: scripts/schema.sql (shared across agent repos).
    local schema_file="${PROJECT_ROOT}/scripts/schema.sql"
    if [ -f "${schema_file}" ]; then
        sqlite3 "${DB_PATH}" < "${schema_file}" 2>/dev/null || {
            log "WARNING: schema.sql apply returned non-zero (may need column migration)"
        }
    else
        log "WARNING: scripts/schema.sql not found — schema may be incomplete"
    fi

    # Column migrations — safe to re-run (ALTER fails silently if column exists)
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE trust_budget ADD COLUMN min_action_interval INTEGER NOT NULL DEFAULT 300;" 2>/dev/null || true
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE trust_budget ADD COLUMN shadow_mode INTEGER NOT NULL DEFAULT 1;" 2>/dev/null || true
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE autonomous_actions ADD COLUMN adversarial_reason TEXT;" 2>/dev/null || true
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE autonomous_actions ADD COLUMN peer_reviewed_by TEXT;" 2>/dev/null || true
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE autonomous_actions ADD COLUMN knock_on_depth INTEGER DEFAULT 0;" 2>/dev/null || true
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE autonomous_actions ADD COLUMN resolution_level TEXT;" 2>/dev/null || true
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE transport_messages ADD COLUMN ack_required INTEGER DEFAULT 0;" 2>/dev/null || true
    sqlite3 "${DB_PATH}" \
        "ALTER TABLE transport_messages ADD COLUMN ack_received INTEGER DEFAULT 0;" 2>/dev/null || true

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

        escalate "critical" "budget-halt" \
            "Trust budget exhausted (0/${budget:-0} credits)" \
            "Autonomous sync halted. No credits remaining." \
            "Run: python3 scripts/trust-budget.py reset" || true

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
                escalate "critical" "gate-timeout" \
                    "Gate ${gate_id} timed out (halt-and-escalate)" \
                    "Gated chain timed out and requires human review." \
                    "Check gate status and either extend timeout or manually resolve." || true
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

    # ── Diagnose working tree state before pulling ────────────────────────
    # Instead of blindly committing everything, identify what's dirty and why,
    # then apply the minimal targeted fix.

    local dirty_tracked=false
    local dirty_untracked=false
    local dirty_staged=false
    local dirty_files=""

    # Check each class of dirt separately
    if ! git diff --quiet 2>/dev/null; then
        dirty_tracked=true
        dirty_files=$(git diff --name-only 2>/dev/null | head -20)
    fi
    if ! git diff --cached --quiet 2>/dev/null; then
        dirty_staged=true
    fi
    if [ -n "$(git ls-files --others --exclude-standard 2>/dev/null | head -1)" ]; then
        dirty_untracked=true
    fi

    if [ "${dirty_tracked}" = true ] || [ "${dirty_staged}" = true ]; then
        # Classify the dirty files to choose the right strategy
        local transport_dirty=false
        local script_dirty=false
        local other_dirty=false
        local diagnosis=""

        while IFS= read -r file; do
            [ -z "${file}" ] && continue
            case "${file}" in
                transport/*|.well-known/*)
                    transport_dirty=true ;;
                scripts/*|.claude/hooks/*)
                    script_dirty=true ;;
                *)
                    other_dirty=true ;;
            esac
        done <<< "${dirty_files}"

        # Build human-readable diagnosis
        if [ "${transport_dirty}" = true ] && [ "${script_dirty}" = false ] && [ "${other_dirty}" = false ]; then
            diagnosis="transport-only (heartbeat/mesh-state/messages)"
        elif [ "${script_dirty}" = true ] && [ "${transport_dirty}" = false ] && [ "${other_dirty}" = false ]; then
            diagnosis="scripts-only (likely SCP deployment)"
        elif [ "${script_dirty}" = true ] && [ "${transport_dirty}" = true ]; then
            diagnosis="transport+scripts (normal autonomous cycle + deployment)"
        else
            diagnosis="mixed ($(echo "${dirty_files}" | head -3 | tr '\n' ' '))"
        fi

        log "Pre-pull diagnosis: ${diagnosis}"
        log "  dirty tracked: ${dirty_tracked}, staged: ${dirty_staged}, untracked: ${dirty_untracked}"

        # Commit tracked changes to unblock pull
        git add -u 2>/dev/null
        git commit -m "autonomous: ${AGENT_ID} pre-pull commit (${diagnosis})

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>/dev/null || true

        # Log to autonomous_actions audit trail
        if [ -f "${PROJECT_ROOT}/state.db" ]; then
            sqlite3 "${PROJECT_ROOT}/state.db" \
                "INSERT OR IGNORE INTO autonomous_actions
                 (agent_id, action_type, details, timestamp)
                 VALUES ('${AGENT_ID}', 'git-self-heal',
                 'Pre-pull auto-commit: ${diagnosis}',
                 datetime('now'));" 2>/dev/null || true
        fi
    fi

    # Record HEAD before pull to detect new commits
    local head_before
    head_before=$(git rev-parse HEAD)

    log "Pulling latest from origin..."
    local pull_output
    pull_output=$(git pull --rebase origin main 2>&1)
    local pull_exit=$?

    if [ ${pull_exit} -ne 0 ]; then
        # ── Diagnose pull failure and attempt recovery ────────────────────
        local failure_class="unknown"

        if echo "${pull_output}" | grep -qi "unstaged changes"; then
            failure_class="unstaged-changes"
        elif echo "${pull_output}" | grep -qi "merge conflict\|CONFLICT"; then
            failure_class="merge-conflict"
        elif echo "${pull_output}" | grep -qi "diverged\|cannot rebase"; then
            failure_class="diverged-history"
        elif echo "${pull_output}" | grep -qi "lock\|index.lock"; then
            failure_class="lock-file"
        elif echo "${pull_output}" | grep -qi "permission denied\|not permitted"; then
            failure_class="permission-error"
        elif echo "${pull_output}" | grep -qi "could not resolve\|Connection refused\|fatal: unable to access"; then
            failure_class="network-error"
        fi

        err "git pull failed (class: ${failure_class})"
        log "  pull output: $(echo "${pull_output}" | head -5)"

        # Attempt recovery based on failure class
        case "${failure_class}" in
            unstaged-changes)
                # Shouldn't happen after our pre-commit, but handle anyway
                log "  recovery: committing remaining unstaged changes"
                git add -u 2>/dev/null
                git commit -m "autonomous: ${AGENT_ID} recovery commit (unstaged)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>/dev/null || true
                if git pull --rebase origin main 2>&1; then
                    log "  recovery: pull succeeded after committing"
                    # Fall through to success path below
                    pull_exit=0
                fi
                ;;
            lock-file)
                # Check if the lock is stale (no process holds it)
                local lock_file="${PROJECT_ROOT}/.git/index.lock"
                if [ -f "${lock_file}" ]; then
                    local lock_age
                    lock_age=$(( $(date +%s) - $(stat -c %Y "${lock_file}" 2>/dev/null || stat -f %m "${lock_file}" 2>/dev/null || echo "0") ))
                    if [ "${lock_age}" -gt 300 ]; then
                        log "  recovery: removing stale lock file (${lock_age}s old)"
                        rm -f "${lock_file}"
                        if git pull --rebase origin main 2>&1; then
                            log "  recovery: pull succeeded after removing stale lock"
                            pull_exit=0
                        fi
                    else
                        log "  lock file exists but only ${lock_age}s old — likely active process"
                    fi
                fi
                ;;
            merge-conflict)
                # Abort the rebase and report — don't try to resolve conflicts
                log "  recovery: aborting rebase (merge conflicts require human review)"
                git rebase --abort 2>/dev/null || true
                ;;
            network-error)
                log "  recovery: network error — will retry next cycle"
                # Network errors are transient; don't escalate on first occurrence
                ;;
            *)
                # Unknown or unrecoverable — log and fall through to escalation
                log "  no automatic recovery for class: ${failure_class}"
                ;;
        esac

        # Log the failure to audit trail
        if [ -f "${PROJECT_ROOT}/state.db" ]; then
            sqlite3 "${PROJECT_ROOT}/state.db" \
                "INSERT OR IGNORE INTO autonomous_actions
                 (agent_id, action_type, details, timestamp)
                 VALUES ('${AGENT_ID}', 'git-sync-failure',
                 'Pull failed (${failure_class}): $(echo "${pull_output}" | head -1 | sed "s/'/''/g")',
                 datetime('now'));" 2>/dev/null || true
        fi

        if [ ${pull_exit} -ne 0 ]; then
            # Recovery failed — escalate non-transient failures
            if [ "${failure_class}" != "network-error" ]; then
                escalate "warning" "git-sync-failure" \
                    "git pull failed (${failure_class}) — recovery unsuccessful" \
                    "Agent: ${AGENT_ID}. Output: $(echo "${pull_output}" | head -3)" \
                    "Check the repo working tree on the agent's machine and resolve manually." || true
            fi
            return 1
        fi
    fi

    echo "${pull_output}"

    local head_after
    head_after=$(git rev-parse HEAD)

    # Check if new commits arrived with transport-relevant changes
    if [ "${head_before}" = "${head_after}" ]; then
        TRANSPORT_CHANGED=false
        log "No new commits from origin"
    else
        local transport_files
        transport_files=$(git diff --name-only "${head_before}" "${head_after}" -- \
            transport/ .well-known/ 2>/dev/null | head -5)
        if [ -n "${transport_files}" ]; then
            TRANSPORT_CHANGED=true
            log "Transport changes detected: $(echo "${transport_files}" | wc -l | tr -d ' ') files"
        else
            TRANSPORT_CHANGED=false
            log "New commits arrived but no transport changes"
        fi
    fi

    return 0
}

git_push() {
    cd "${PROJECT_ROOT}"

    # Check for uncommitted changes OR unpushed commits
    local has_uncommitted=false
    local has_unpushed=false
    git diff --cached --quiet && git diff --quiet || has_uncommitted=true
    [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main 2>/dev/null)" ] && has_unpushed=true

    if [ "${has_uncommitted}" = false ] && [ "${has_unpushed}" = false ]; then
        log "No changes to push"
        return 0
    fi

    log "Pushing changes..."
    if ! git push origin main 2>&1; then
        err "git push failed"
        return 1
    fi

    # L3 wake-up: after a successful push, touch wake files for peer agents
    # on the same machine so they poll immediately instead of waiting for cron.
    wake_peers

    return 0
}

wake_peers() {
    # Touch /tmp/sync-wake-{peer-id} for each peer agent on this machine.
    # Reads agent-registry.local.json to discover co-located peers.
    local local_registry="${PROJECT_ROOT}/transport/agent-registry.local.json"
    [ -f "${local_registry}" ] || return 0

    # Extract peer agent IDs that share this machine (same lan_host)
    python3 -c "
import json, os, socket
reg = json.load(open('${local_registry}'))
my_host = socket.gethostname().split('.')[0]
my_agent = '${AGENT_ID}'
for agent_id, info in reg.get('agents', {}).items():
    peer_host = info.get('lan_host', '')
    if agent_id != my_agent and (peer_host == my_host or peer_host in ('localhost', '127.0.0.1')):
        wake_file = f'/tmp/sync-wake-{agent_id}'
        open(wake_file, 'w').close()
        print(f'  wake: {agent_id}')
" 2>/dev/null || true
}

run_sync() {
    cd "${PROJECT_ROOT}"

    log "Running /sync --autonomous..." >&2

    # cross_repo_fetch already ran before pre-flight — skip here.

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
    local claude_exit
    sync_output=$(claude -p "${prompt}" \
        --allowedTools "Read,Write,Edit,Glob,Grep,Bash" \
        --permission-mode "bypassPermissions" \
        --max-turns 80 \
        2>&1)
    claude_exit=$?

    if [ "${claude_exit}" -ne 0 ]; then
        # Distinguish max-turns (partial success) from real failures
        if echo "${sync_output}" | grep -qi "max turns\|Reached max"; then
            log "WARNING: claude CLI hit max-turns limit — partial sync completed"
            # Partial success — don't treat as failure
        elif echo "${sync_output}" | grep -qi "usage\|credit\|limit\|billing\|exceeded"; then
            err "HALT — API usage limit reached. Check billing/extra usage settings."
            echo "${sync_output}" | tail -5
            escalate "critical" "api-usage-limit" \
                "API usage limit reached — autonomous sync halted" \
                "Claude CLI reported a billing/credit/usage limit error." \
                "Check Anthropic billing dashboard and adjust usage limits." || true
            return 1
        else
            err "claude CLI exited with error (code ${claude_exit})"
            echo "${sync_output}" | tail -20
            return 1
        fi
    fi

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
    local cycle_start=${SECONDS}
    log "=== Autonomous sync cycle starting ==="

    check_lock
    ensure_hooks
    ensure_db

    # Emit heartbeat (mesh presence announcement)
    python3 "${PROJECT_ROOT}/scripts/heartbeat.py" emit >&2 || true

    # Export operational state snapshot for cross-machine visibility
    if [ -f "${PROJECT_ROOT}/scripts/mesh-state-export.py" ]; then
        python3 "${PROJECT_ROOT}/scripts/mesh-state-export.py" >&2 || {
            log "WARNING: mesh-state-export.py failed — continuing without state export"
        }
    fi

    # Verify shared scripts (warning only — non-blocking)
    if [ -f "${PROJECT_ROOT}/scripts/verify_shared_scripts.py" ]; then
        python3 "${PROJECT_ROOT}/scripts/verify_shared_scripts.py" --quiet 2>/dev/null || {
            log "WARNING: shared scripts out of sync — run verify_shared_scripts.py --fix"
        }
    fi

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

    # Pull latest (sets TRANSPORT_CHANGED)
    if ! git_sync; then
        err "Git sync failed — aborting cycle"
        exit 1
    fi

    # Index cross-repo inbound messages BEFORE pre-flight check.
    # cross_repo_fetch uses git fetch (not git pull), so new peer messages
    # won't appear in TRANSPORT_CHANGED. Indexing first ensures the
    # unprocessed count in state.db reflects reality.
    if [ -f "${PROJECT_ROOT}/scripts/cross_repo_fetch.py" ]; then
        log "Fetching cross-repo transport..."
        python3 "${PROJECT_ROOT}/scripts/cross_repo_fetch.py" --index 2>/dev/null || {
            log "WARNING: cross_repo_fetch.py failed — continuing without cross-repo inbound"
        }
    fi

    # Auto-process trivial messages in Python (no LLM needed).
    # Marks as processed: ack_required=false AND type in (ack, notification).
    # Only messages requiring substance review survive for claude /sync.
    if [ -f "${PROJECT_ROOT}/scripts/auto_process_trivial.py" ]; then
        local auto_result
        auto_result=$(python3 "${PROJECT_ROOT}/scripts/auto_process_trivial.py" 2>/dev/null) || true
        if [ -n "${auto_result}" ]; then
            log "Auto-processed: ${auto_result}"
        fi
    fi

    # Pre-flight check: skip expensive claude invocation if nothing changed.
    # Still invoke if: transport changed, gates active, wake signal, or
    # unprocessed messages exist in state.db (after cross-repo index + auto-process).
    if [ "${TRANSPORT_CHANGED}" = false ] && [ "${GATE_ACCELERATED}" = false ]; then
        local unprocessed_count
        unprocessed_count=$(sqlite3 "${DB_PATH}" \
            "SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE;" 2>/dev/null || echo "0")
        if [ "${unprocessed_count}" -eq 0 ]; then
            log "NO-OP — no transport changes, no active gates, no unprocessed messages. Skipping /sync."

            # Push any local changes (heartbeat, mesh-state) without invoking claude
            git_push || true

            # Reset consecutive blocks on successful no-op
            sqlite3 "${DB_PATH}" \
                "UPDATE trust_budget SET consecutive_blocks = 0 WHERE agent_id = '${AGENT_ID}';"

            local cycle_duration=$(( SECONDS - cycle_start ))
            log "=== Autonomous sync cycle complete (no-op, budget: ${budget}, ${cycle_duration}s total) ==="
            exit 0
        fi
        log "Unprocessed messages found (${unprocessed_count}) — proceeding with /sync"
    fi

    # Run /sync
    local sync_start=${SECONDS}
    local sync_output
    if sync_output=$(run_sync); then
        local sync_duration=$(( SECONDS - sync_start ))
        log "Sync completed successfully (${sync_duration}s)"

        # Record the sync action (Tier 1 — reversible)
        # Gate-accelerated no-op polls: if /sync found no new messages and
        # this cycle was gate-accelerated, record as gate_poll with 0 cost
        if [ "${GATE_ACCELERATED}" = true ]; then
            # Check if any messages were actually processed this cycle
            local new_processed
            new_processed=$(echo "${sync_output}" | grep -c "marked processed\|ACKs written" 2>/dev/null || true)
            new_processed=${new_processed:-0}
            if [ "${new_processed}" -eq 0 ]; then
                # No-op gate poll — 0 cost, no budget deduction
                record_action "gate_poll" "reversible" 1 "approved" \
                    "Gate-accelerated poll — no new messages (0 cost, ${sync_duration}s)" "${budget}" > /dev/null
                # Don't update last_action for no-op polls — allows immediate re-poll
                sqlite3 "${DB_PATH}" "UPDATE trust_budget
                    SET last_action = NULL
                    WHERE agent_id = '${AGENT_ID}';" 2>/dev/null || true
                log "Gate-accelerated no-op poll — 0 budget cost, immediate re-poll enabled"
            else
                budget=$(record_action "sync" "reversible" 1 "approved" \
                    "Gate-accelerated /sync — processed ${new_processed} items (${sync_duration}s)" "${budget}")
            fi
        else
            budget=$(record_action "sync" "reversible" 1 "approved" \
                "Autonomous /sync cycle completed (${sync_duration}s)" "${budget}")
        fi

        # Push any changes
        if ! git_push; then
            err "Git push failed"
            # Record error but don't consume extra budget
            record_action "git_push" "reversible" 1 "blocked" \
                "Git push failed after sync" "${budget}" > /dev/null
        fi
    else
        local sync_duration=$(( SECONDS - sync_start ))
        err "Sync execution failed (${sync_duration}s)"
        record_action "sync" "reversible" 1 "blocked" \
            "Sync execution failed (${sync_duration}s)" "${budget}" > /dev/null

        # Check consecutive error count
        local blocks
        blocks=$(sqlite3 "${DB_PATH}" \
            "SELECT consecutive_blocks FROM trust_budget WHERE agent_id = '${AGENT_ID}';")
        blocks=$((blocks + 1))
        sqlite3 "${DB_PATH}" \
            "UPDATE trust_budget SET consecutive_blocks = ${blocks} WHERE agent_id = '${AGENT_ID}';"

        if [ "${blocks}" -ge "${MAX_CONSECUTIVE_ERRORS}" ]; then
            err "HALT — ${blocks} consecutive errors. Human review required."
            escalate "warning" "consecutive-errors" \
                "${blocks} consecutive sync errors — autonomous sync halted" \
                "Sync execution failed ${blocks} times in a row." \
                "Check logs at /tmp/sync.log and restart after fixing the issue." || true
            exit 1
        fi
    fi

    # Reset consecutive blocks on success
    sqlite3 "${DB_PATH}" \
        "UPDATE trust_budget SET consecutive_blocks = 0 WHERE agent_id = '${AGENT_ID}';"

    local cycle_duration=$(( SECONDS - cycle_start ))
    log "=== Autonomous sync cycle complete (budget: ${budget}, ${cycle_duration}s total) ==="
}

main "$@"

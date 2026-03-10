#!/usr/bin/env bash
# ensure-cron.sh — Self-healing cron entry for autonomous-sync
#
# Idempotent: safe to run repeatedly. Checks whether the cron entry
# exists; installs it if missing, skips if present. Can run from
# bootstrap, manually, or as part of a health check.
#
# Usage:
#   ./scripts/ensure-cron.sh                     # install for this repo
#   ./scripts/ensure-cron.sh --check             # verify only (exit 0/1)
#   ./scripts/ensure-cron.sh --remove            # remove the entry
#   ./scripts/ensure-cron.sh --interval 10       # custom interval (minutes)
#   ./scripts/ensure-cron.sh --target /path/to   # install for a different repo

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SYNC_SCRIPT="${SCRIPT_DIR}/autonomous-sync.sh"
INTERVAL=5
TARGET_DIR=""
CHECK_ONLY=false
REMOVE=false
LOG_FILE="/tmp/autonomous-sync.log"

# ── Parse arguments ─────────────────────────────────────────────────────

while [ $# -gt 0 ]; do
    case "$1" in
        --check)     CHECK_ONLY=true; shift ;;
        --remove)    REMOVE=true; shift ;;
        --interval)  INTERVAL="$2"; shift 2 ;;
        --target)    TARGET_DIR="$2"; shift 2 ;;
        --log)       LOG_FILE="$2"; shift 2 ;;
        *)           echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# ── Build the cron line ─────────────────────────────────────────────────

# Determine the sync command with optional target directory
if [ -n "${TARGET_DIR}" ]; then
    SYNC_CMD="${SYNC_SCRIPT} ${TARGET_DIR}"
else
    SYNC_CMD="${SYNC_SCRIPT}"
fi

CRON_LINE="*/${INTERVAL} * * * * ${SYNC_CMD} >> ${LOG_FILE} 2>&1"

# Marker comment for identification (allows multiple entries for different repos)
MARKER="# autonomous-sync: $(basename "${TARGET_DIR:-${PROJECT_ROOT}}")"

# ── Functions ───────────────────────────────────────────────────────────

entry_exists() {
    crontab -l 2>/dev/null | grep -qF "${SYNC_SCRIPT}" && \
    crontab -l 2>/dev/null | grep -qF "$(basename "${TARGET_DIR:-${PROJECT_ROOT}}")"
}

install_entry() {
    local existing
    existing=$(crontab -l 2>/dev/null || true)

    if entry_exists; then
        echo "Cron entry already present — no changes."
        return 0
    fi

    # Append new entry with marker
    echo "${existing}
${MARKER}
${CRON_LINE}" | crontab -

    echo "Installed cron entry:"
    echo "  ${CRON_LINE}"
}

remove_entry() {
    local existing
    existing=$(crontab -l 2>/dev/null || true)

    if ! entry_exists; then
        echo "No matching cron entry found — nothing to remove."
        return 0
    fi

    # Remove marker line and the line after it (the cron command)
    echo "${existing}" | grep -v "${MARKER}" | grep -vF "${SYNC_SCRIPT}" | crontab -

    echo "Removed cron entry for $(basename "${TARGET_DIR:-${PROJECT_ROOT}}")."
}

check_entry() {
    if entry_exists; then
        echo "✓ Cron entry present for $(basename "${TARGET_DIR:-${PROJECT_ROOT}}")"
        crontab -l 2>/dev/null | grep -A1 "${MARKER}" || true
        return 0
    else
        echo "✗ No cron entry found for $(basename "${TARGET_DIR:-${PROJECT_ROOT}}")"
        return 1
    fi
}

# ── Validate prerequisites ──────────────────────────────────────────────

if [ ! -f "${SYNC_SCRIPT}" ]; then
    echo "ERROR: autonomous-sync.sh not found at ${SYNC_SCRIPT}" >&2
    exit 1
fi

if [ ! -x "${SYNC_SCRIPT}" ]; then
    echo "Making autonomous-sync.sh executable..."
    chmod +x "${SYNC_SCRIPT}"
fi

if [ -n "${TARGET_DIR}" ] && [ ! -d "${TARGET_DIR}" ]; then
    echo "ERROR: target directory does not exist: ${TARGET_DIR}" >&2
    exit 1
fi

# ── Main ────────────────────────────────────────────────────────────────

if [ "${CHECK_ONLY}" = true ]; then
    check_entry
elif [ "${REMOVE}" = true ]; then
    remove_entry
else
    install_entry
fi

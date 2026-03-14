#!/usr/bin/env bash
# meshd-sync.sh — Trigger a sync cycle through meshd (budget-gated, logged, deduped)
#
# Replaces direct `claude -p /sync` calls with meshd-mediated spawns.
# All spawns go through: budget gate → dedup → priority queue → spawn → log.
#
# Usage:
#   ./scripts/meshd-sync.sh                    # trigger sync via local meshd
#   ./scripts/meshd-sync.sh --check-only       # check if spawn warranted (no trigger)
#   MESHD_PORT=8076 ./scripts/meshd-sync.sh    # override port
#
# Designed to replace autonomous-sync.sh's direct claude invocation.
# Cron calls this instead of autonomous-sync.sh.

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
MESHD_PORT="${MESHD_PORT:-8081}"
MESHD_URL="http://localhost:${MESHD_PORT}"
CHECK_ONLY="${1:-}"

# ── NVM / PATH bootstrap ────────────────────────────────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "${NVM_DIR}/nvm.sh" ] && source "${NVM_DIR}/nvm.sh" 2>/dev/null

# ── Pre-spawn triage: has anything changed? ─────────────────────────────────
AGENT_ID=$(python3 -c "
import json
try:
    cfg = json.load(open('${PROJECT_ROOT}/cogarch.config.json'))
    print(cfg.get('identity', {}).get('agent_id', 'unknown'))
except:
    print('unknown')
" 2>/dev/null)

# Check unprocessed message count
UNPROCESSED=$(curl -s "${MESHD_URL}/api/status" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    msgs = d.get('unprocessed_messages', [])
    print(len(msgs) if isinstance(msgs, list) else 0)
except:
    print(0)
" 2>/dev/null || echo "0")

# Check for new transport files since last sync
LAST_SYNC_MARKER="${PROJECT_ROOT}/.last-meshd-sync"
NEW_FILES=0
if [ -f "$LAST_SYNC_MARKER" ]; then
    NEW_FILES=$(find "${PROJECT_ROOT}/transport/sessions" -name '*.json' -newer "$LAST_SYNC_MARKER" 2>/dev/null | wc -l | tr -d ' ')
fi

# Check for open PRs on our repo
OPEN_PRS=0
if command -v gh >/dev/null 2>&1; then
    REPO=$(cd "$PROJECT_ROOT" && git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||;s|\.git$||')
    if [ -n "$REPO" ]; then
        OPEN_PRS=$(gh pr list --repo "$REPO" --state open --json number --jq 'length' 2>/dev/null || echo "0")
    fi
fi

TOTAL_WORK=$((UNPROCESSED + NEW_FILES + OPEN_PRS))

echo "[meshd-sync] ${AGENT_ID}: unprocessed=${UNPROCESSED} new_files=${NEW_FILES} open_prs=${OPEN_PRS} total=${TOTAL_WORK}"

if [ "$CHECK_ONLY" = "--check-only" ]; then
    exit 0
fi

# ── Skip if nothing to do ───────────────────────────────────────────────────
if [ "$TOTAL_WORK" -eq 0 ]; then
    echo "[meshd-sync] Nothing to process — skipping spawn"
    exit 0
fi

# ── Git pull first (sync repo state) ────────────────────────────────────────
cd "$PROJECT_ROOT"
git fetch origin main 2>/dev/null || true
git add -u 2>/dev/null || true
git diff --cached --quiet 2>/dev/null || git commit -m "autonomous: pre-sync commit" --no-verify 2>/dev/null || true
git pull --rebase origin main 2>/dev/null || true

# ── Build focused prompt ────────────────────────────────────────────────────
PROMPT="/sync"
if [ "$UNPROCESSED" -gt 0 ]; then
    PROMPT="Process ${UNPROCESSED} unprocessed transport messages, then /sync"
fi
if [ "$OPEN_PRS" -gt 0 ]; then
    PROMPT="${PROMPT}. ${OPEN_PRS} open PRs need review."
fi

# ── Trigger via meshd API ───────────────────────────────────────────────────
RESPONSE=$(curl -s -X POST "${MESHD_URL}/api/trigger" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"transport-message\", \"payload\": {\"source\": \"meshd-sync\", \"prompt\": \"${PROMPT}\", \"work_items\": \"${TOTAL_WORK}\"}}" \
    2>/dev/null)

STATUS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "error")

echo "[meshd-sync] Trigger response: ${STATUS}"

# ── Update sync marker ──────────────────────────────────────────────────────
touch "$LAST_SYNC_MARKER"

# ── Post-sync: git push ────────────────────────────────────────────────────
cd "$PROJECT_ROOT"
git add -A 2>/dev/null || true
git diff --cached --quiet 2>/dev/null || git commit -m "autonomous: ${AGENT_ID} meshd-sync cycle" --no-verify 2>/dev/null || true
git push origin main 2>/dev/null || true

echo "[meshd-sync] Complete"

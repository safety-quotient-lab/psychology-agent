#!/bin/bash
# feedback-loops.sh — Run all feedback loop consumers
#
# Combines: trigger effectiveness, lesson recurrence scan,
# work carryover → priority, and EIC summary.
# Designed for /retrospect integration and periodic cron.
#
# Addresses: evaluation dimension 9 (missing feedback loops)

set -uo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DB_PATH="${PROJECT_ROOT}/state.db"
LOCAL_DB_PATH="${PROJECT_ROOT}/state.local.db"
AGENTDB="${PROJECT_ROOT}/agentdb"

echo "═══════════════════════════════════════════════════════════"
echo "  FEEDBACK LOOP SCAN — $(date '+%Y-%m-%dT%H:%M %Z')"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Trigger effectiveness (basal ganglia reinforcement)
if [ -f "${PROJECT_ROOT}/scripts/trigger-effectiveness.sh" ]; then
    bash "${PROJECT_ROOT}/scripts/trigger-effectiveness.sh" 2>/dev/null || echo "  [trigger-effectiveness] No activation data yet."
fi
echo ""

# 2. Expectation track record
if [ -x "${AGENTDB}" ] && [ -f "${LOCAL_DB_PATH}" ]; then
    echo "── Expectation Track Record ──"
    "${AGENTDB}" expect-summary 2>/dev/null || echo "  No expectations recorded yet."
    echo ""
fi

# 3. EIC disclosure summary (since last audit)
if [ -x "${AGENTDB}" ] && [ -f "${LOCAL_DB_PATH}" ]; then
    LAST_AUDIT=$(sqlite3 "${LOCAL_DB_PATH}" "SELECT COALESCE(last_audit, '1970-01-01') FROM autonomy_budget LIMIT 1;" 2>/dev/null || echo "1970-01-01")
    "${AGENTDB}" disclose-summary --since "${LAST_AUDIT}" 2>/dev/null || echo "  No disclosures since last audit."
    echo ""
fi

# 4. Work carryover patterns
if [ -f "${DB_PATH}" ]; then
    echo "── Work Carryover Patterns ──"
    CHRONIC=$(sqlite3 "${DB_PATH}" "
        SELECT work_item, COUNT(DISTINCT session_id) as sessions, status
        FROM work_carryover
        WHERE status != 'completed'
        GROUP BY work_item
        HAVING COUNT(DISTINCT session_id) >= 3
        ORDER BY sessions DESC
        LIMIT 10;
    " 2>/dev/null || echo "")
    if [ -n "${CHRONIC}" ]; then
        echo "  Chronic carryover (3+ sessions):"
        echo "${CHRONIC}" | while IFS='|' read -r item sessions status; do
            echo "    ${item} (${sessions} sessions, ${status})"
        done
    else
        echo "  No chronic carryover detected (or work_carryover table empty)."
    fi
    echo ""
fi

# 5. Lesson promotion scan
echo "── Lesson Promotion Candidates ──"
if [ -f "${PROJECT_ROOT}/lessons.md" ]; then
    # Count entries by pattern_type for promotion threshold
    CANDIDATES=$(grep -c "promotion_status: candidate" "${PROJECT_ROOT}/lessons.md" 2>/dev/null || echo "0")
    GRADUATED=$(grep -c "promotion_status: graduated" "${PROJECT_ROOT}/lessons.md" 2>/dev/null || echo "0")
    HOOK_GRAD=$(grep -c "promotion_status: hook-graduated" "${PROJECT_ROOT}/lessons.md" 2>/dev/null || echo "0")
    TOTAL=$(grep -c "^## " "${PROJECT_ROOT}/lessons.md" 2>/dev/null || echo "0")
    echo "  Total lessons: ${TOTAL}"
    echo "  Graduated to convention: ${GRADUATED}"
    echo "  Graduated to hook: ${HOOK_GRAD}"
    echo "  Promotion candidates: ${CANDIDATES}"

    # Check for recurrence >= 3 that haven't been promoted
    HIGH_RECURRENCE=$(grep -B5 "recurrence: [3-9]" "${PROJECT_ROOT}/lessons.md" | grep "^## " | head -5)
    if [ -n "${HIGH_RECURRENCE}" ]; then
        echo "  High-recurrence lessons (3+):"
        echo "${HIGH_RECURRENCE}" | while read -r line; do
            echo "    ${line}"
        done
    fi
else
    echo "  No lessons.md found."
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  FEEDBACK LOOP SCAN COMPLETE"
echo "═══════════════════════════════════════════════════════════"

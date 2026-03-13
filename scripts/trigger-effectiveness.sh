#!/bin/bash
# trigger-effectiveness.sh — Basal ganglia reinforcement loop
#
# Scans trigger_activations for:
# 1. Checks with 0 catches in 10+ sessions → demotion candidates
# 2. Checks with 3+ catches → promotion candidates
#
# Run weekly or on /diagnose. Does NOT auto-adjust tiers —
# surfaces recommendations for user approval (T3 substance gate).
#
# Brain architecture: Gap 1 (basal ganglia reinforcement loop)
# Feedback loop: trigger_activations → tier adjustment recommendations

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DB_PATH="${PROJECT_ROOT}/state.db"

if [ ! -f "${DB_PATH}" ]; then
    echo "No state.db found — trigger effectiveness requires activation data."
    exit 0
fi

echo "── Trigger Effectiveness Analysis ──"
echo ""

# Promotion candidates: advisory/spot-check checks catching errors
echo "PROMOTION CANDIDATES (advisory/spot-check checks with 3+ catches):"
sqlite3 "${DB_PATH}" "
SELECT trigger_id, check_number, tier,
       SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as catches,
       COUNT(*) as total_firings
FROM trigger_activations
WHERE tier IN ('advisory', 'spot-check')
GROUP BY trigger_id, check_number
HAVING SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) >= 3
ORDER BY catches DESC;
" 2>/dev/null | while IFS='|' read -r trigger check tier catches total; do
    echo "  ↑ ${trigger} #${check} [${tier}]: ${catches} catches / ${total} firings → PROMOTE to next tier?"
done

PROMO_COUNT=$(sqlite3 "${DB_PATH}" "
SELECT COUNT(*) FROM (
    SELECT trigger_id, check_number
    FROM trigger_activations
    WHERE tier IN ('advisory', 'spot-check')
    GROUP BY trigger_id, check_number
    HAVING SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) >= 3
);" 2>/dev/null || echo "0")

if [ "${PROMO_COUNT}" = "0" ]; then
    echo "  None — no advisory/spot-check checks have caught 3+ errors."
fi

echo ""

# Demotion candidates: critical checks never catching across 10+ sessions
echo "DEMOTION CANDIDATES (critical checks with 0 catches in 10+ sessions):"
sqlite3 "${DB_PATH}" "
SELECT trigger_id, check_number, tier,
       COUNT(DISTINCT session_id) as sessions_observed,
       COUNT(*) as total_firings
FROM trigger_activations
WHERE tier = 'critical'
GROUP BY trigger_id, check_number
HAVING SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) = 0
   AND COUNT(DISTINCT session_id) >= 10
ORDER BY sessions_observed DESC;
" 2>/dev/null | while IFS='|' read -r trigger check tier sessions total; do
    echo "  ↓ ${trigger} #${check} [${tier}]: 0 catches across ${sessions} sessions → DEMOTE to advisory?"
done

DEMO_COUNT=$(sqlite3 "${DB_PATH}" "
SELECT COUNT(*) FROM (
    SELECT trigger_id, check_number
    FROM trigger_activations
    WHERE tier = 'critical'
    GROUP BY trigger_id, check_number
    HAVING SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) = 0
       AND COUNT(DISTINCT session_id) >= 10
);" 2>/dev/null || echo "0")

if [ "${DEMO_COUNT}" = "0" ]; then
    echo "  None — all critical checks have caught at least one error (or insufficient data)."
fi

echo ""

# Overall stats
TOTAL_ACTIVATIONS=$(sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM trigger_activations;" 2>/dev/null || echo "0")
TOTAL_SESSIONS=$(sqlite3 "${DB_PATH}" "SELECT COUNT(DISTINCT session_id) FROM trigger_activations;" 2>/dev/null || echo "0")
TOTAL_CATCHES=$(sqlite3 "${DB_PATH}" "SELECT SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) FROM trigger_activations;" 2>/dev/null || echo "0")

echo "── Summary ──"
echo "  Total activations: ${TOTAL_ACTIVATIONS} across ${TOTAL_SESSIONS} sessions"
echo "  Total catches: ${TOTAL_CATCHES}"
echo "  Promotion candidates: ${PROMO_COUNT}"
echo "  Demotion candidates: ${DEMO_COUNT}"

if [ "${PROMO_COUNT}" -gt 0 ] || [ "${DEMO_COUNT}" -gt 0 ]; then
    echo ""
    echo "  ⚠ Tier adjustments recommended. Review and approve before applying."
    echo "  (Wu wei: checks that prove their worth advance; checks that never fire recede.)"
fi

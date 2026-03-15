#!/bin/bash
# consolidation-pass.sh — DMN idle-state processing (brain gap 3)
#
# Runs between sessions via cron. Analyzes accumulated state and
# produces a consolidation report that T1 loads at next session start.
#
# Brain architecture: Default Mode Network (Gap 3)
# The brain's DMN activates during rest — spontaneous ideation,
# consolidation, self-monitoring. This script provides the equivalent
# for inter-session processing.
#
# Combines two functions:
# (a) Consolidation report — read-only analysis written to docs/consolidation-report.md
# (b) State reconciliation — automated repair of state.db column drift
#     (oligodendrocyte layer: scripts/state-reconcile.py)
#
# Usage: */30 * * * * /path/to/consolidation-pass.sh

set -uo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DB_PATH="${PROJECT_ROOT}/state.db"
LOCAL_DB_PATH="${PROJECT_ROOT}/state.local.db"
REPORT_PATH="${PROJECT_ROOT}/docs/consolidation-report.md"
AGENTDB="${PROJECT_ROOT}/agentdb"
export AGENTDB

# Only run if state.db exists
[ -f "${DB_PATH}" ] || exit 0

TIMESTAMP=$(date '+%Y-%m-%dT%H:%M %Z')

cat > "${REPORT_PATH}" << EOF
# Consolidation Report
**Generated:** ${TIMESTAMP}
**Source:** consolidation-pass.sh (DMN idle-state processing)
**Read by:** T1 session start (orientation context)

---

EOF

# 1. Trigger activation patterns
echo "## Trigger Activation Patterns" >> "${REPORT_PATH}"
sqlite3 "${DB_PATH}" "
SELECT trigger_id,
       COUNT(*) as firings,
       SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as catches,
       MAX(timestamp) as last_fired
FROM trigger_activations
GROUP BY trigger_id
ORDER BY firings DESC
LIMIT 10;
" 2>/dev/null | while IFS='|' read -r trigger firings catches last; do
    echo "- ${trigger}: ${firings} firings, ${catches} catches (last: ${last})" >> "${REPORT_PATH}"
done
[ -s "${REPORT_PATH}" ] || echo "- No trigger activation data yet." >> "${REPORT_PATH}"
echo "" >> "${REPORT_PATH}"

# 2. Recent session velocity
echo "## Session Velocity" >> "${REPORT_PATH}"
sqlite3 "${DB_PATH}" "
SELECT id, timestamp, summary
FROM session_log
ORDER BY id DESC
LIMIT 5;
" 2>/dev/null | while IFS='|' read -r id ts summary; do
    echo "- S${id} (${ts}): ${summary}" >> "${REPORT_PATH}"
done
echo "" >> "${REPORT_PATH}"

# 3. Unresolved epistemic flags
echo "## Unresolved Epistemic Flags" >> "${REPORT_PATH}"
FLAG_COUNT=$(sqlite3 "${DB_PATH}" "
SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE;
" 2>/dev/null || echo "0")
echo "- ${FLAG_COUNT} unresolved flags" >> "${REPORT_PATH}"
echo "" >> "${REPORT_PATH}"

# 4. EIC disclosure summary (if local db exists)
if [ -f "${LOCAL_DB_PATH}" ]; then
    echo "## Information Channel (EIC)" >> "${REPORT_PATH}"
    sqlite3 "${LOCAL_DB_PATH}" "
    SELECT category, COUNT(*) as cnt
    FROM agent_disclosures
    GROUP BY category
    ORDER BY cnt DESC;
    " 2>/dev/null | while IFS='|' read -r cat cnt; do
        echo "- [${cat}] ${cnt}" >> "${REPORT_PATH}"
    done
    echo "" >> "${REPORT_PATH}"
fi

# 5. Expectation track record
if [ -f "${LOCAL_DB_PATH}" ]; then
    echo "## Expectation Track Record" >> "${REPORT_PATH}"
    sqlite3 "${LOCAL_DB_PATH}" "
    SELECT domain,
           SUM(CASE WHEN outcome = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
           SUM(CASE WHEN outcome = 'refuted' THEN 1 ELSE 0 END) as refuted,
           SUM(CASE WHEN outcome IS NULL OR outcome = 'untested' THEN 1 ELSE 0 END) as untested
    FROM prediction_ledger
    GROUP BY domain;
    " 2>/dev/null | while IFS='|' read -r domain confirmed refuted untested; do
        echo "- ${domain}: ${confirmed} confirmed, ${refuted} refuted, ${untested} untested" >> "${REPORT_PATH}"
    done
    echo "" >> "${REPORT_PATH}"
fi

# 6. Stale memory entries
echo "## Stale Memory" >> "${REPORT_PATH}"
sqlite3 "${DB_PATH}" "
SELECT topic, entry_key,
       CAST(julianday('now') - julianday(last_confirmed) AS INTEGER) as days
FROM memory_entries
WHERE last_confirmed IS NOT NULL
  AND julianday('now') - julianday(last_confirmed) > 5
ORDER BY days DESC
LIMIT 5;
" 2>/dev/null | while IFS='|' read -r topic key days; do
    echo "- ${topic}/${key}: ${days} days stale" >> "${REPORT_PATH}"
done
echo "" >> "${REPORT_PATH}"

# 7. State reconciliation (oligodendrocyte layer — automated repair)
echo "## State Reconciliation" >> "${REPORT_PATH}"
if [ -f "${PROJECT_ROOT}/scripts/state-reconcile.py" ]; then
    RECONCILE_OUTPUT=$(python3 "${PROJECT_ROOT}/scripts/state-reconcile.py" --summary 2>&1)
    echo "- ${RECONCILE_OUTPUT}" >> "${REPORT_PATH}"
else
    echo "- state-reconcile.py not found — skipped" >> "${REPORT_PATH}"
fi
echo "" >> "${REPORT_PATH}"

# 8. EIC feedback intake (disclosure → trigger adjustment)
if [ -f "${PROJECT_ROOT}/scripts/eic-feedback-consumer.py" ] && [ -f "${LOCAL_DB_PATH}" ]; then
    echo "## EIC Feedback Intake" >> "${REPORT_PATH}"
    EIC_OUTPUT=$(python3 "${PROJECT_ROOT}/scripts/eic-feedback-consumer.py" 2>&1)
    echo "${EIC_OUTPUT}" | while IFS= read -r line; do
        echo "- ${line}" >> "${REPORT_PATH}"
    done
    echo "" >> "${REPORT_PATH}"
fi

echo "---" >> "${REPORT_PATH}"
echo "*Next session: T1 loads this report as orientation context.*" >> "${REPORT_PATH}"

# Commit if running in a git repo and changes exist
if git -C "${PROJECT_ROOT}" rev-parse --git-dir > /dev/null 2>&1; then
    if git -C "${PROJECT_ROOT}" diff --quiet "${REPORT_PATH}" 2>/dev/null; then
        : # No changes
    else
        git -C "${PROJECT_ROOT}" add "${REPORT_PATH}" 2>/dev/null
        git -C "${PROJECT_ROOT}" commit -m "consolidation: $(date '+%Y-%m-%dT%H:%M')" 2>/dev/null
        git -C "${PROJECT_ROOT}" push 2>/dev/null || true
    fi
fi

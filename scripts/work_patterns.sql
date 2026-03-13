-- work_patterns.sql — metacognitive queries for work completion patterns
-- Run: sqlite3 state.db < scripts/work_patterns.sql
-- Phase 8 of cogarch refactor, Session 84.

-- 1. Chronic carryover: items carried 3+ sessions (intervention signal)
SELECT work_item, status, sessions_carried, reason, session_id as last_session
FROM work_carryover
WHERE resolved_session IS NULL AND sessions_carried >= 3
ORDER BY sessions_carried DESC;

-- 2. Completion rate by reason
SELECT reason,
       COUNT(*) as total,
       SUM(CASE WHEN resolved_session IS NOT NULL THEN 1 ELSE 0 END) as completed,
       ROUND(100.0 * SUM(CASE WHEN resolved_session IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) as completion_pct,
       ROUND(AVG(sessions_carried), 1) as avg_sessions
FROM work_carryover
GROUP BY reason
ORDER BY total DESC;

-- 3. Average sessions to complete (for resolved items)
SELECT ROUND(AVG(sessions_carried), 1) as avg_sessions_to_complete,
       MIN(sessions_carried) as fastest,
       MAX(sessions_carried) as slowest,
       COUNT(*) as total_resolved
FROM work_carryover
WHERE resolved_session IS NOT NULL;

-- 4. Abandoned items (carried 5+ sessions, never resolved)
SELECT work_item, sessions_carried, reason, session_id as last_session
FROM work_carryover
WHERE resolved_session IS NULL AND sessions_carried >= 5
ORDER BY sessions_carried DESC;

-- 5. Current open carryover (for T1 session start)
SELECT work_item, status, sessions_carried, reason
FROM work_carryover
WHERE resolved_session IS NULL
ORDER BY sessions_carried DESC;

-- 6. Trigger effectiveness (after 10+ sessions of data)
SELECT trigger_id, check_number, tier,
       COUNT(*) as total_fires,
       SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as catches,
       ROUND(100.0 * SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) / COUNT(*), 1) as catch_rate_pct
FROM trigger_activations
WHERE fired = 1
GROUP BY trigger_id, check_number
ORDER BY catches DESC;

-- 7. CRITICAL checks with zero catches (tier demotion candidates)
SELECT trigger_id, check_number, COUNT(*) as fires
FROM trigger_activations
WHERE tier = 'critical' AND fired = 1
GROUP BY trigger_id, check_number
HAVING SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) = 0
  AND COUNT(DISTINCT session_id) >= 10;

-- 8. Mode distribution (CPG mode system usage)
SELECT mode, COUNT(*) as activations,
       COUNT(DISTINCT session_id) as sessions
FROM trigger_activations
WHERE mode IS NOT NULL
GROUP BY mode;

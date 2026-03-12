---
name: diagnose
description: Systemic self-diagnostic — health check of all monitoring, indexing, and documentation mechanisms.
user-invocable: true
argument-hint: "[all | claims | transport | memory | triggers | facets | lessons | decisions | flags | sessions]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /diagnose — Systemic Self-Diagnostic

Run a health check across every monitoring, indexing, and documentation
mechanism in the psychology agent. Surfaces what's flowing, what's stale,
and what's broken.

## When to Invoke

- After major infrastructure changes (schema migrations, bootstrap rebuilds)
- Periodically (every 5-10 sessions) as a hygiene check
- When something feels off ("are claims being tracked?")
- Before /cycle to verify the documentation chain has live inputs

## Arguments

| Argument | Scope |
|----------|-------|
| `all` or *(empty)* | Full diagnostic — all subsystems |
| `claims` | Claims pipeline only |
| `transport` | Transport message indexing and processing |
| `memory` | Memory entries staleness and coverage |
| `triggers` | Cognitive trigger state tracking |
| `facets` | Universal facets and vocabulary |
| `lessons` | Lessons.md existence, schema, promotion |
| `decisions` | Decision chain freshness and coverage |
| `flags` | Epistemic flags resolution rate |
| `sessions` | Session log vs git history alignment |

---

## Protocol

### 1. Database Vitals

Query state.db for aggregate health metrics:

```sql
-- Row counts per table
SELECT 'claims' as tbl, COUNT(*) as total,
       SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as good,
       SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as attention
FROM claims
UNION ALL
SELECT 'transport_messages', COUNT(*),
       SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END),
       SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END)
FROM transport_messages
UNION ALL
SELECT 'epistemic_flags', COUNT(*),
       SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END),
       SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END)
FROM epistemic_flags
UNION ALL
SELECT 'decision_chain', COUNT(*), 0, 0 FROM decision_chain
UNION ALL
SELECT 'memory_entries', COUNT(*), 0, 0 FROM memory_entries
UNION ALL
SELECT 'session_log', COUNT(*), 0, 0 FROM session_log
UNION ALL
SELECT 'trigger_state', COUNT(*),
       SUM(CASE WHEN fire_count > 0 THEN 1 ELSE 0 END),
       SUM(CASE WHEN fire_count = 0 THEN 1 ELSE 0 END)
FROM trigger_state
UNION ALL
SELECT 'universal_facets', COUNT(*), 0, 0 FROM universal_facets
UNION ALL
SELECT 'autonomy_budget', COUNT(*), 0, 0 FROM autonomy_budget
UNION ALL
SELECT 'active_gates', COUNT(*), 0, 0
FROM active_gates WHERE resolved_at IS NULL;
```

### 2. Claims Pipeline

Check whether claims flow from transport messages to verification:

```sql
-- Claims by confidence band
SELECT
  CASE
    WHEN confidence >= 0.9 THEN 'high (≥0.9)'
    WHEN confidence >= 0.7 THEN 'medium (0.7-0.9)'
    ELSE 'low (<0.7)'
  END as band,
  COUNT(*) as total,
  SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified
FROM claims GROUP BY band;

-- Latest claim indexed (recency check)
SELECT transport_msg, claim_id, substr(claim_text, 1, 80),
       confidence FROM claims ORDER BY rowid DESC LIMIT 3;

-- Claims with no confidence score (data quality)
SELECT COUNT(*) FROM claims WHERE confidence IS NULL;
```

**Health indicators:**
- ✗ `verified = 0` for ALL claims → verification pipeline not running
- ✗ No claims from recent sessions → dual-write not indexing claims
- ⚑ >50% claims at confidence <0.7 → claim quality concern
- ✓ Mix of verified/unverified with recent entries → healthy

### 3. Epistemic Flags

```sql
-- Flags by source (which sessions produce the most flags?)
SELECT source, COUNT(*) as cnt FROM epistemic_flags
GROUP BY source ORDER BY cnt DESC LIMIT 10;

-- Resolution rate
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved,
  ROUND(100.0 * SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
FROM epistemic_flags;
```

**Health indicators:**
- ✗ 0% resolved → no one is clearing flags
- ⚑ >100 open flags → debt accumulating
- ✓ Some resolved, recent entries → healthy

### 4. Transport Messages

```sql
-- Processing rate by session
SELECT session_name,
       COUNT(*) as total,
       SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed
FROM transport_messages GROUP BY session_name ORDER BY total DESC LIMIT 10;

-- Orphaned messages (unprocessed for >48h)
SELECT session_name, filename, timestamp, subject
FROM transport_messages
WHERE processed = 0
  AND timestamp < datetime('now', '-2 days')
ORDER BY timestamp LIMIT 10;

-- Messages with no claims (low-information indexing)
SELECT COUNT(*) FROM transport_messages WHERE claims_count = 0;
```

**Health indicators:**
- ✗ Bulk unprocessed after bootstrap → processed flags reset (expected, re-run dual_write)
- ✗ Old unprocessed messages → sync pipeline not reaching them
- ✓ Recent messages processed promptly → healthy

### 5. Decision Chain

```sql
-- Decisions per month (velocity)
SELECT substr(decided_date, 1, 7) as month, COUNT(*)
FROM decision_chain GROUP BY month ORDER BY month DESC LIMIT 6;

-- Decisions without evidence_source
SELECT COUNT(*) FROM decision_chain WHERE evidence_source IS NULL OR evidence_source = '';

-- Orphaned derives_from references
SELECT dc1.decision_key, dc1.derives_from
FROM decision_chain dc1
LEFT JOIN decision_chain dc2 ON dc1.derives_from = dc2.id
WHERE dc1.derives_from IS NOT NULL AND dc2.id IS NULL;
```

**Health indicators:**
- ✗ No recent decisions → architecture.md not being dual-written
- ✗ Orphaned derives_from → chain integrity broken
- ✓ Steady monthly velocity → healthy

### 6. Memory Entries

```sql
-- Entries per topic
SELECT topic, COUNT(*) FROM memory_entries GROUP BY topic ORDER BY COUNT(*) DESC;

-- Staleness: entries not confirmed recently
SELECT topic, entry_key, last_confirmed
FROM memory_entries
WHERE last_confirmed < date('now', '-7 days')
   OR last_confirmed IS NULL
ORDER BY last_confirmed LIMIT 10;

-- Duplicate keys within a topic
SELECT topic, entry_key, COUNT(*) as cnt
FROM memory_entries GROUP BY topic, entry_key HAVING cnt > 1;
```

### 7. Trigger State

```sql
-- Triggers that have never fired
SELECT trigger_id, last_fired, fire_count
FROM trigger_state WHERE fire_count = 0 OR last_fired IS NULL;

-- Most active triggers
SELECT trigger_id, fire_count, last_fired
FROM trigger_state ORDER BY fire_count DESC LIMIT 5;
```

**Health indicators:**
- ✗ All fire_count=0 → trigger tracking not writing to DB
- ⚑ Some triggers never fire → either unused or tracking gap
- ✓ Mix of activity → healthy

### 8. Universal Facets

```sql
SELECT facet_type, COUNT(*) FROM universal_facets GROUP BY facet_type;
```

If zero: run `python3 scripts/bootstrap_facets.py` and report.

### 9. Lessons

Check file existence and structure:

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [ -f "${PROJECT_ROOT}/docs/lessons.md" ]; then
  echo "EXISTS: docs/lessons.md"
  wc -l < "${PROJECT_ROOT}/docs/lessons.md"
  grep -c "^## " "${PROJECT_ROOT}/docs/lessons.md" || echo "0 entries"
elif [ -f "${PROJECT_ROOT}/lessons.md" ]; then
  echo "EXISTS: lessons.md (root)"
  wc -l < "${PROJECT_ROOT}/lessons.md"
else
  echo "MISSING: lessons.md not found"
fi
```

Also check the `lessons` table in state.db:
```sql
SELECT COUNT(*) FROM lessons;
```

### 10. Session Log Alignment

```sql
-- Latest session in DB vs latest in lab-notebook
SELECT MAX(id) as latest_session FROM session_log;
```

Compare against `lab-notebook.md` last session header.

### 11. Cross-System Alignment

Check for drift between markdown sources and state.db:

- Count decisions in `docs/architecture.md` vs `decision_chain` table
- Count memory entries in topic files vs `memory_entries` table
- Count sessions in `lab-notebook.md` vs `session_log` table

```bash
grep -c "^|" docs/architecture.md | head -1  # rough decision count
```

---

## Output Format

```
/diagnose complete

  ┌─────────────────────────────────────────────────────────┐
  │ SUBSYSTEM HEALTH                                        │
  ├──────────────────┬────────┬────────────────────────────  │
  │ Subsystem        │ Status │ Detail                      │
  ├──────────────────┼────────┼────────────────────────────  │
  │ Claims           │ ✗/⚑/✓ │ N total, M verified (P%)    │
  │ Transport        │ ✗/⚑/✓ │ N total, M processed (P%)   │
  │ Epistemic Flags  │ ✗/⚑/✓ │ N total, M resolved (P%)    │
  │ Decisions        │ ✗/⚑/✓ │ N total, latest: YYYY-MM-DD │
  │ Memory           │ ✗/⚑/✓ │ N entries, M stale          │
  │ Triggers         │ ✗/⚑/✓ │ N indexed, M never fired    │
  │ Facets           │ ✗/⚑/✓ │ N total by type             │
  │ Lessons          │ ✗/⚑/✓ │ N entries or MISSING         │
  │ Sessions         │ ✗/⚑/✓ │ N logged, latest: #M         │
  │ Autonomy Budget  │ ✗/⚑/✓ │ N agents tracked             │
  │ Gates            │ ✗/⚑/✓ │ N active                     │
  └──────────────────┴────────┴────────────────────────────  ┘

  FINDINGS
  ────────
  1. [severity] [subsystem] — [description]
  2. ...

  RECOMMENDED ACTIONS
  ───────────────────
  1. [action] — fixes finding N
  2. ...

  ⚑ EPISTEMIC FLAGS
  - [any limitations of this diagnostic]
```

---

## Severity Levels

- ✗ **Broken** — mechanism exists but produces no output (pipeline not running)
- ⚑ **Degraded** — mechanism runs but data quality or coverage has gaps
- ✓ **Healthy** — mechanism producing expected output at expected cadence

---

## Integration

/diagnose runs standalone. It reads state.db and markdown files but does not
modify them. Fix actions surface as recommendations — the user decides what
to act on.

Recommended cadence: run /diagnose at session start if >5 sessions have passed
since the last diagnostic, or after any bootstrap rebuild.

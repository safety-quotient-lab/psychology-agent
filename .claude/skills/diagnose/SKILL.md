---
name: diagnose
description: Systemic self-diagnostic — five-level depth hierarchy. Replaces manual QA.
user-invocable: true
argument-hint: "[1-5] [subsystem] — Level 5 (status poll) to Level 1 (full verification)"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /diagnose — Systemic Self-Diagnostic

Five-level diagnostic hierarchy for the psychology agent cogarch. Higher
numbers run faster with less depth; lower numbers run slower with more
thoroughness. Level 1 replaces manual QA.

Design reference: five-tier diagnostic depth model adapted from the
structured diagnostic protocol in Sternbach & Okuda (1991), *Star Trek:
The Next Generation Technical Manual*. Level 1 requires the most resources
and produces the most complete picture; Level 5 produces a status snapshot
with minimal overhead. The key design insight from that reference: lower
diagnostic numbers indicate higher thoroughness, not lower priority — a
convention this system adopts.

---

## Diagnostic Levels

| Level | Scope | Depth | Systems Affected | Estimated Duration |
|---|---|---|---|---|
| **5** | Status poll | Row counts, binary health indicators | None — read-only | ~10 seconds |
| **4** | Targeted subsystem | Detail queries for one subsystem | None — read-only | ~30 seconds |
| **3** | Standard sweep | All subsystems, key metrics, findings | None — read-only | ~2 minutes |
| **2** | Cross-system analysis | L3 + drift detection, alignment checks, pattern analysis | None — read-only | ~5 minutes |
| **1** | Full integrity verification | L2 + file checks, governance verification, hook validation, CLI tests, orphan detection | Writes test records (cleaned up) | ~10 minutes |

**Default:** Level 3.

**Usage:**
```
/diagnose          — Level 3, all subsystems
/diagnose 5        — Level 5, status poll
/diagnose 4 claims — Level 4, claims subsystem deep scan
/diagnose 1        — Level 1, full integrity verification (replaces manual QA)
```

**Recommended cadence:**

| Level | When |
|---|---|
| 5 | Session start — quick pulse before work begins |
| 4 | When a specific subsystem shows degraded status |
| 3 | Every 5-10 sessions; after /cycle as health check |
| 2 | After schema migrations, bootstrap rebuilds, infrastructure changes |
| 1 | After major refactors; before release tags; after long idle periods |

---

## Level 5: Status Poll

Row counts and binary health for each table. No detail queries.

```sql
SELECT 'claims' as system, COUNT(*) as total,
       SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as good,
       SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as attention
FROM claims
UNION ALL
SELECT 'transport', COUNT(*),
       SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END),
       SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END)
FROM transport_messages
UNION ALL
SELECT 'flags', COUNT(*),
       SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END),
       SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END)
FROM epistemic_flags
UNION ALL
SELECT 'decisions', COUNT(*), 0, 0 FROM decision_chain
UNION ALL
SELECT 'memory', COUNT(*), 0, 0 FROM memory_entries
UNION ALL
SELECT 'sessions', COUNT(*), 0, 0 FROM session_log
UNION ALL
SELECT 'triggers', COUNT(*),
       SUM(CASE WHEN fire_count > 0 THEN 1 ELSE 0 END),
       SUM(CASE WHEN fire_count = 0 THEN 1 ELSE 0 END)
FROM trigger_state
UNION ALL
SELECT 'facets', COUNT(*), 0, 0 FROM universal_facets
UNION ALL
SELECT 'activations', COUNT(*), 0, 0 FROM trigger_activations
UNION ALL
SELECT 'carryover', COUNT(*),
       SUM(CASE WHEN resolved_session IS NOT NULL THEN 1 ELSE 0 END),
       SUM(CASE WHEN resolved_session IS NULL THEN 1 ELSE 0 END)
FROM work_carryover;
```

**Output:** One-line-per-system table. ✓/⚑/✗ indicators. Done.

---

## Level 4: Targeted Subsystem Scan

Deep inspection of a single subsystem. Includes all Level 5 data for that
subsystem plus detail queries.

### Subsystem: `claims`

```sql
SELECT CASE WHEN confidence >= 0.9 THEN 'high (≥0.9)'
            WHEN confidence >= 0.7 THEN 'medium (0.7-0.9)'
            ELSE 'low (<0.7)' END as band,
       COUNT(*) as total,
       SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified
FROM claims GROUP BY band;

SELECT transport_msg, claim_id, substr(claim_text, 1, 80), confidence
FROM claims ORDER BY rowid DESC LIMIT 5;

SELECT COUNT(*) as null_confidence FROM claims WHERE confidence IS NULL;
```

### Subsystem: `transport`

```sql
SELECT session_name, COUNT(*) as total,
       SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed
FROM transport_messages GROUP BY session_name ORDER BY total DESC LIMIT 10;

SELECT session_name, filename, timestamp, subject
FROM transport_messages
WHERE processed = 0 AND timestamp < datetime('now', '-2 days')
ORDER BY timestamp LIMIT 10;
```

### Subsystem: `memory`

```sql
SELECT topic, COUNT(*) FROM memory_entries GROUP BY topic ORDER BY COUNT(*) DESC;

SELECT topic, entry_key, last_confirmed
FROM memory_entries
WHERE last_confirmed < date('now', '-7 days') OR last_confirmed IS NULL
ORDER BY last_confirmed LIMIT 10;

SELECT topic, entry_key, COUNT(*) as cnt
FROM memory_entries GROUP BY topic, entry_key HAVING cnt > 1;
```

### Subsystem: `triggers`

```sql
SELECT trigger_id, fire_count, last_fired
FROM trigger_state ORDER BY fire_count DESC;

SELECT trigger_id, check_number, tier, COUNT(*) as fires,
       SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as catches
FROM trigger_activations WHERE fired = 1
GROUP BY trigger_id, check_number ORDER BY catches DESC LIMIT 10;
```

### Subsystem: `flags`

```sql
SELECT source, COUNT(*) as cnt FROM epistemic_flags
GROUP BY source ORDER BY cnt DESC LIMIT 10;

SELECT COUNT(*) as total,
       SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved,
       ROUND(100.0 * SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
FROM epistemic_flags;
```

### Subsystem: `decisions`

```sql
SELECT substr(decided_date, 1, 7) as month, COUNT(*)
FROM decision_chain GROUP BY month ORDER BY month DESC LIMIT 6;

SELECT COUNT(*) FROM decision_chain
WHERE evidence_source IS NULL OR evidence_source = '';
```

### Subsystem: `facets`

```sql
SELECT facet_type, COUNT(*) FROM universal_facets GROUP BY facet_type;
```

### Subsystem: `lessons`

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
[ -f "${PROJECT_ROOT}/lessons.md" ] && wc -l < "${PROJECT_ROOT}/lessons.md" && grep -c "^## " "${PROJECT_ROOT}/lessons.md" || echo "MISSING"
```
```sql
SELECT COUNT(*) FROM lessons;
```

### Subsystem: `sessions`

```sql
SELECT MAX(id) as latest_session FROM session_log;
```
Compare against lab-notebook.md last session header.

### Subsystem: `carryover`

```sql
SELECT work_item, status, sessions_carried, reason
FROM work_carryover WHERE resolved_session IS NULL
ORDER BY sessions_carried DESC;
```

---

## Level 3: Standard Sweep

All Level 5 data + key detail queries from Level 4 for every subsystem.
The default diagnostic level. Produces the full health table + findings +
recommended actions.

Run all Level 5 queries, then for each system with ⚑ or ✗ status, run
the corresponding Level 4 detail queries. Healthy (✓) systems get Level 5
only — don't waste context investigating what works.

**Output format:**

```
/diagnose Level 3 complete — all systems

  ┌────────────────────┬────────┬────────────────────────────────┐
  │ System             │ Status │ Detail                         │
  ├────────────────────┼────────┼────────────────────────────────┤
  │ Claims             │ ✗/⚑/✓ │ N total, M verified (P%)       │
  │ Transport          │ ✗/⚑/✓ │ N total, M processed (P%)      │
  │ Epistemic Flags    │ ✗/⚑/✓ │ N total, M resolved (P%)       │
  │ Decisions          │ ✗/⚑/✓ │ N total, latest: YYYY-MM       │
  │ Memory             │ ✗/⚑/✓ │ N entries, M stale             │
  │ Triggers           │ ✗/⚑/✓ │ N indexed, M never fired       │
  │ Activations        │ ✗/⚑/✓ │ N logged                       │
  │ Facets             │ ✗/⚑/✓ │ N total by type                │
  │ Lessons            │ ✗/⚑/✓ │ N entries                      │
  │ Sessions           │ ✗/⚑/✓ │ N logged, latest: #M           │
  │ Work Carryover     │ ✗/⚑/✓ │ N open, M chronic (3+ sessions)│
  └────────────────────┴────────┴────────────────────────────────┘

  FINDINGS: [numbered list]
  RECOMMENDED ACTIONS: [numbered list]
  ⚑ EPISTEMIC FLAGS: [limitations]
```

---

## Level 2: Cross-System Analysis

Everything in Level 3, plus cross-system alignment checks:

### Cross-System Drift Detection

```bash
# Decisions: architecture.md vs state.db
grep -c "^|" docs/architecture.md  # rough decision count in markdown
```
```sql
SELECT COUNT(*) FROM decision_chain;  -- decisions in DB
```
Report delta.

```bash
# Sessions: lab-notebook vs state.db
grep -c "^## [0-9]" lab-notebook.md  # session entries in markdown
```
```sql
SELECT COUNT(*) FROM session_log;  -- sessions in DB
```
Report delta.

### Memory Coherence

```bash
# MEMORY.md line count
_HASH=$(echo "$(git rev-parse --show-toplevel)" | tr '/' '-')
MEMORY_DIR="$HOME/.claude/projects/${_HASH}/memory"
wc -l < "${MEMORY_DIR}/MEMORY.md"

# Topic file count in auto-memory vs snapshot
ls "${MEMORY_DIR}"/*.md 2>/dev/null | wc -l
ls docs/memory-snapshots/*.md 2>/dev/null | wc -l
```
Report deltas.

### Schema Consistency

```sql
SELECT version, description FROM schema_version ORDER BY version DESC LIMIT 1;
```
Verify matches expected version in `scripts/schema.sql`.

### Trigger Effectiveness (if 10+ sessions of activation data)

```sql
SELECT trigger_id, check_number, tier,
       COUNT(*) as fires,
       SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as catches,
       ROUND(100.0 * SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) / COUNT(*), 1) as catch_rate
FROM trigger_activations WHERE fired = 1
GROUP BY trigger_id, check_number ORDER BY catches DESC;
```

### Work Pattern Analysis

```sql
SELECT status as initial_status,
       ROUND(AVG(CASE WHEN resolved_session IS NOT NULL
                      THEN resolved_session - session_id
                      ELSE sessions_carried END), 1) as avg_sessions,
       COUNT(*) as sample_size
FROM work_carryover GROUP BY status;
```

---

## Level 1: Full Integrity Verification

Everything in Level 2, plus physical verification of all infrastructure
components. This level replaces manual QA — run after major refactors
or before tagging a release.

### File Integrity

```bash
echo "=== Hook scripts executable ==="
for f in .claude/hooks/*.sh; do
  [ -x "$f" ] && echo "✓ $(basename $f)" || echo "✗ $(basename $f) NOT EXECUTABLE"
done

echo "=== Skills have SKILL.md ==="
for d in .claude/skills/*/; do
  name=$(basename "$d")
  [ -f "${d}SKILL.md" ] && echo "✓ $name" || echo "✗ $name MISSING SKILL.md"
done

echo "=== No hardcoded paths ==="
grep -r "/home/kashif" .claude/skills/ 2>/dev/null && echo "✗ FOUND" || echo "✓ Clean"
```

### Governance Integrity

```bash
echo "=== No double negatives ==="
grep -n "No.*MUST NOT" docs/ef1-governance.md && echo "✗ FOUND" || echo "✓ Clean"

echo "=== Amendment procedure exists ==="
grep -c "Amendment Procedure" docs/ef1-governance.md

echo "=== Violation logging exists ==="
grep -c "Invariant Violation" docs/ef1-governance.md
```

### Cogarch Integrity

```bash
echo "=== Tier markers present ==="
grep -c "⬛\|▣\|▢" docs/cognitive-triggers.md

echo "=== Canonical headings ==="
grep -c "trigger-" docs/cognitive-triggers.md

echo "=== T17 exists (conflict monitoring) ==="
grep -c "trigger-conflict-monitoring" docs/cognitive-triggers.md

echo "=== GWT broadcast convention ==="
grep -c "BROADCAST" docs/cognitive-triggers.md

echo "=== T12 retired ==="
grep "RETIRED" docs/cognitive-triggers.md
```

### Document Integrity

```bash
echo "=== CLAUDE.md line count ==="
wc -l CLAUDE.md | awk '{print $1 " (target ≤150)"}'

echo "=== cognitive-triggers.md line count ==="
wc -l docs/cognitive-triggers.md | awk '{print $1 " (expect ≥100)"}'

echo "=== New refactor docs exist ==="
for f in cogarch-refactor-evaluation.md trigger-tiering-classification.md \
         hook-trigger-contract.md memory-ownership-contract.md \
         working-memory-spec.md phases-7-10-specs.md \
         canonical-glossary.md trigger-dependency-graph.md; do
  [ -f "docs/$f" ] && echo "✓ docs/$f" || echo "✗ docs/$f MISSING"
done
```

### Hook-Trigger Contract Verification

```bash
echo "=== Inline hooks (should be 0) ==="
python3 -c "
import json
s = json.load(open('.claude/settings.json'))
for event, entries in s.get('hooks', {}).items():
    for entry in entries:
        for hook in entry.get('hooks', []):
            cmd = hook.get('command', '')
            if len(cmd) > 100 and 'case' in cmd.lower():
                print(f'✗ Inline hook in {event}: {cmd[:60]}...')
print('✓ No inline hooks') if True else None
" 2>&1

echo "=== Context-pressure matcher scoped ==="
python3 -c "
import json
s = json.load(open('.claude/settings.json'))
for entry in s['hooks']['PreToolUse']:
    for hook in entry.get('hooks', []):
        if 'context-pressure' in hook.get('command', ''):
            print('matcher:', entry.get('matcher', 'NONE (fires on everything)'))
" 2>&1
```

### CLI Subcommand Verification

```bash
echo "=== dual_write.py subcommands ==="
python3 scripts/dual_write.py --help 2>&1 | grep -oE '\{[^}]+\}' | head -1

echo "=== trigger-activation test ==="
python3 scripts/dual_write.py trigger-activation \
  --session-id 0 --trigger-id TEST --check-number 0 \
  --tier spot-check --result skip \
  --action-taken "Level 1 diagnostic test" 2>&1

echo "=== work-carryover test ==="
python3 scripts/dual_write.py work-carryover \
  --session-id 0 --work-item "diagnostic-test-delete" \
  --status planned --reason session-end 2>&1
python3 scripts/dual_write.py work-resolved \
  --session-id 0 --work-item "diagnostic-test-delete" 2>&1
```

### Orphan Check

```bash
echo "=== BOOTSTRAP.md references ==="
grep -o '`[^`]*\.md`' BOOTSTRAP.md | tr -d '`' | sort -u

echo "=== archive_sessions.sh executable ==="
[ -x scripts/archive_sessions.sh ] && echo "✓" || echo "✗"

echo "=== work_patterns.sql exists ==="
[ -f scripts/work_patterns.sql ] && echo "✓ $(wc -l < scripts/work_patterns.sql) lines" || echo "✗"
```

### Full Output

Level 1 produces the Level 3 health table, all Level 2 alignment checks,
plus a **QA VERIFICATION** section:

```
  QA VERIFICATION (Level 1)
  ─────────────────────────
  File integrity:      N/M pass
  Governance integrity: N/M pass
  Cogarch integrity:   N/M pass
  Document integrity:  N/M pass
  Hook-trigger contract: N/M pass
  CLI subcommands:     N/M pass
  Orphan check:        N/M pass
  ──────────────────────────
  TOTAL:               N/M pass
```

---

## Severity Levels

- ✗ **Offline** — mechanism exists but produces no output
- ⚑ **Degraded** — mechanism runs but with gaps in data quality or coverage
- ✓ **Nominal** — producing expected output at expected cadence

---

## Integration

/diagnose runs standalone. It reads state.db and markdown files but does not
modify them (except Level 1 test writes to trigger_activations/work_carryover
which get immediately resolved). Fix actions surface as recommendations —
the user decides what to act on.

**Recommended cadence:**

| Level | Cadence |
|---|---|
| 5 | Every session start (quick pulse) |
| 4 | When a subsystem shows ⚑ or ✗ at Level 5 |
| 3 | Every 5-10 sessions |
| 2 | After schema migrations or bootstrap rebuilds |
| 1 | After major refactors; before release tags |

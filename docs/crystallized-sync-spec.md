---
title: "Crystallized Sync — Deterministic Pre-Processing for Autonomous Cycles"
date: "2026-03-12"
session: 83
status: "implemented — Steps 1-7 complete"
---

# Crystallized Sync Spec

Move deterministic work out of the LLM's `/sync` invocation into agentdb
commands and shell logic. The LLM handles only substance decisions —
message responses that require reasoning, judgment, or domain knowledge.

**Design principle:** Cattell's (1971) crystallized vs. fluid intelligence
distinction. Crystallized operations (pattern-matched, rule-based, learned)
execute deterministically. Fluid operations (novel reasoning, inference,
judgment) remain with the LLM. The boundary between them shifts over time
as more patterns become learnable.

**Goal:** Reduce `claude -p` turns from ~20-40 to ~5-10 per substantive
cycle. Eliminate LLM invocations entirely for cycles with only trivial
messages.


## Architecture Overview

```
BEFORE (current):
  pre-flight → claude -p "/sync" (20-40 turns) → post-sync

AFTER (crystallized):
  pre-flight
    → agentdb triage --scan           ← NEW: classify all unprocessed
    → agentdb ack --auto              ← NEW: template ACKs
    → agentdb gate resolve --scan     ← NEW: auto-resolve matching gates
    → agentdb manifest --regenerate   ← MOVED: from /sync Phase 5
    → IF substance_count > 0 THEN
        claude -p "/sync --substance-only"
      END IF
  post-sync
```

---

## 1. `agentdb triage` — Deterministic Message Classification

### Purpose

Score each unprocessed message and assign a disposition without LLM
involvement. Messages that score below the substance threshold get handled
deterministically; messages above it queue for LLM review.

### Scoring Rules

Each unprocessed message receives a **triage score** (0-100) computed from
indexed metadata in state.db. Higher score = more likely to need LLM.

```
triage_score = base_score(message_type)
             + urgency_modifier(urgency)
             + ack_modifier(ack_required)
             + gate_modifier(resolves_active_gate)
             + age_modifier(message_age)
             + content_modifier(claims_count, setl)
```

#### Base Score by Message Type

| message_type       | base_score | Rationale |
|--------------------|-----------|-----------|
| ack                | 5         | Acknowledgment — no substance |
| notification       | 10        | Informational — no action needed |
| state-update       | 10        | Machine state — no judgment |
| heartbeat          | 0         | Presence signal — always trivial |
| problem-report     | 60        | Error condition — may need response |
| vote               | 50        | Decision input — needs recording |
| response           | 70        | Substantive reply — needs review |
| request            | 80        | Action request — needs judgment |
| command-request    | 85        | Executable command — needs evaluation |
| proposal           | 90        | Decision point — needs deliberation |
| review             | 75        | Peer feedback — needs consideration |
| decision           | 80        | Binding decision — needs recording + response |

#### Urgency Modifier

| urgency    | modifier |
|-----------|----------|
| immediate | +20      |
| high      | +10      |
| normal    | +0       |
| low       | -10      |

#### ACK Modifier

| Condition | modifier | Rationale |
|-----------|----------|-----------|
| ack_required = true AND message needs substance response | +15 | Sender blocks on our response |
| ack_required = true AND message needs only ACK | +0 | Template ACK handles this |
| ack_required = false | +0 | No ACK obligation |

**Distinguishing substance vs. template ACK:** If `message_type` is in
{request, proposal, command-request, review, decision}, the ACK requires
substance. Otherwise, a template ACK suffices.

#### Gate Modifier

| Condition | modifier | Rationale |
|-----------|----------|-----------|
| Message `in_response_to` matches an active gate | -30 | Gate resolution is deterministic — don't inflate score |
| Message opens a new gate (gate_condition present) | +10 | New obligation needs LLM awareness |

#### Age Modifier

| Message age | modifier | Rationale |
|-------------|----------|-----------|
| < 1 hour    | +0       | Fresh — normal priority |
| 1-24 hours  | +5       | Aging — slight urgency bump |
| > 24 hours  | +10      | Stale — risk of blocking peers |
| > 72 hours  | +15      | Critical staleness |
| expired (expires_at < now) | -100 | Cancel, don't process |

#### Content Modifier

| Condition | modifier | Rationale |
|-----------|----------|-----------|
| claims_count > 0 | +10 | Claims need verification routing |
| setl > 0.5 | +5 | Higher epistemic investment |
| problem_type = "error" | +15 | Error reports need attention |
| problem_type = "warning" | +5 | Warnings are informational |

### Disposition Thresholds

| Score range | Disposition | Action |
|-------------|------------|--------|
| 0-15        | `auto-skip` | Mark processed, no response needed |
| 16-35       | `auto-ack` | Generate template ACK, mark processed |
| 36-55       | `auto-record` | Record in state.db, mark processed, include in next LLM orientation as context |
| 56-100      | `needs-llm` | Leave unprocessed for LLM /sync |

### Schema Addition

```sql
ALTER TABLE transport_messages ADD COLUMN triage_score INTEGER;
ALTER TABLE transport_messages ADD COLUMN triage_disposition TEXT;
ALTER TABLE transport_messages ADD COLUMN triage_at TEXT;
```

### CLI Interface

```bash
# Scan and score all unprocessed messages
agentdb triage --scan

# Output (JSON):
# {
#   "scanned": 5,
#   "dispositions": {
#     "auto-skip": 1,
#     "auto-ack": 2,
#     "auto-record": 0,
#     "needs-llm": 2
#   },
#   "messages": [
#     {"filename": "from-safety-quotient-agent-016.json", "score": 5, "disposition": "auto-skip", "reason": "ack, normal urgency, no ack_required"},
#     ...
#   ]
# }

# Dry-run (score but don't write dispositions)
agentdb triage --scan --dry-run

# Show current triage state
agentdb triage --status
```

### Edge Cases

1. **Expired messages:** Score -100 transitions `task_state` to `canceled`.
   No ACK generated even if `ack_required: true` — the expiration supersedes.

2. **Messages with `ack_required: true` AND substance type:** Score inflated
   but disposition stays `needs-llm`. Template ACK would not satisfy the
   substance requirement.

3. **Problem reports with `problem_type: error`:** Always route to LLM
   regardless of score (floor at 60 + 15 = 75, above `needs-llm` threshold).

4. **Addressed copies (`to-{agent}-NNN.json`):** Skip entirely — not indexed
   in state.db per transport convention. If somehow present, triage ignores
   filenames matching `to-*` pattern.

5. **Messages from self:** Messages where `from_agent` matches the current
   agent_id score 0 (auto-skip). Agents don't triage their own outbound.

6. **Duplicate CIDs:** If `message_cid` already exists in state.db for a
   different filename, the message represents a duplicate delivery. Score 0,
   disposition `auto-skip`, log dedup event.

7. **Messages in exempt sessions:** Messages in `local-coordination` session
   (exempt per transport.md) score 0 — these carry `turn=0` sentinel and
   don't follow protocol ordering.

---

## 2. `agentdb ack` — Template ACK Generation

### Purpose

Generate and write ACK message files for messages with `auto-ack`
disposition. No LLM needed — the ACK follows a fixed JSON template with
variable substitution.

### Template

```json
{
  "schema": "interagent/v1",
  "session_id": "{session_name}",
  "turn": {next_turn},
  "timestamp": "{iso_timestamp}",
  "message_type": "ack",
  "in_response_to": "{original_filename}",
  "thread_id": "{thread_id_or_session}",
  "parent_thread_id": null,
  "message_cid": "{computed_sha256}",
  "from": {
    "agent_id": "{self_agent_id}",
    "instance": "{instance_descriptor}",
    "schemas_supported": ["interagent/v1"]
  },
  "to": {
    "agent_id": "{original_from_agent}"
  },
  "transport": {
    "method": "git-pr",
    "persistence": "persistent"
  },
  "payload": {
    "subject": "ACK: {original_subject}",
    "auto_generated": true,
    "triage_score": {score},
    "triage_disposition": "auto-ack"
  },
  "ack_required": false,
  "urgency": "normal",
  "setl": 0.01
}
```

### CLI Interface

```bash
# Generate ACKs for all auto-ack messages
agentdb ack --auto

# Generate ACK for a specific message
agentdb ack --message from-safety-quotient-agent-016.json --session self-readiness-audit

# Dry-run (show what would be generated)
agentdb ack --auto --dry-run
```

### Behavior

1. Query state.db for messages with `triage_disposition = 'auto-ack'` AND
   `processed = FALSE`
2. For each message:
   a. Compute next turn number for the session (`agentdb next-turn`)
   b. Read `.agent-identity.json` for `from` block
   c. Fill template with message metadata from state.db
   d. Compute `message_cid` (SHA-256 of canonical JSON)
   e. Write ACK file to `transport/sessions/{session}/from-{agent}-{turn}.json`
   f. Index the new ACK in state.db (`task_state: completed`)
   g. Mark the original message processed (`task_state: completed`)
   h. Update MANIFEST.json for the session

### Edge Cases

1. **Session directory missing:** Create it. This can happen for cross-repo
   sessions where inbound messages were indexed but the local session
   directory doesn't exist yet.

2. **Turn number collision:** `next-turn` queries state.db AND scans the
   filesystem. If both sources disagree, use the higher value + 1.

3. **Identity file missing:** Fall back to agent_id from `.agent-identity.json`.
   If that also missing, use hostname as agent_id. Log warning.

4. **Concurrent writers:** PID lock in autonomous-sync.sh prevents concurrent
   agentdb invocations within the same agent. Cross-agent writes target
   different session directories — no collision.

5. **`auto_generated: true` flag:** Marks the ACK as machine-generated in
   payload. Receiving agents can filter these in their own triage (auto-
   generated ACKs score lower than human-mediated responses).

---

## 3. `agentdb gate resolve --scan` — Deterministic Gate Resolution

### Purpose

Check all inbound unprocessed messages against active gates. If a message's
`in_response_to` field references a gated message, resolve the gate
automatically.

### Logic

```sql
-- Find messages that resolve active gates
SELECT tm.filename, tm.session_name, tm.from_agent, ag.gate_id
FROM transport_messages tm
JOIN active_gates ag
  ON ag.status = 'waiting'
  AND ag.sending_agent = :self_agent_id
  AND (
    -- Direct filename match
    tm.in_response_to = (
      SELECT filename FROM transport_messages
      WHERE id = (SELECT MAX(id) FROM transport_messages
                  WHERE session_name = ag.gate_id)
    )
    -- Or session + sender match (gate tracks session, response comes from expected agent)
    OR (tm.session_name = ag.gate_id AND tm.from_agent = ag.receiving_agent)
  )
WHERE tm.processed = FALSE;
```

### CLI Interface

```bash
# Scan and resolve matching gates
agentdb gate resolve --scan

# Output:
# Resolved gate gate-transport-health-001: from-safety-quotient-agent-050.json
# 1 gate(s) resolved, 0 remaining

# Dry-run
agentdb gate resolve --scan --dry-run
```

### Behavior

1. Query active gates where `sending_agent` = self AND `status` = 'waiting'
2. For each gate, scan unprocessed messages for a match
3. On match: update `active_gates` → `status = 'resolved'`, `resolved_by`,
   `resolved_at`
4. The resolving message itself stays unprocessed if it scores above the
   substance threshold — gate resolution and message processing are
   independent concerns

### Edge Cases

1. **Multiple messages match the same gate:** Resolve on the first match
   (earliest turn number). Log the others as "redundant gate responses."

2. **Gate already timed out:** If `timeout_at < now` AND `status` still
   `waiting`, `handle_gate_timeouts()` in autonomous-sync.sh should have
   already processed it. If not (race condition), skip — don't resolve a
   timed-out gate.

3. **Message matches gate but from wrong agent:** The gate specifies
   `receiving_agent`. If the response comes from a different agent (e.g.,
   a forwarded response), don't auto-resolve. Route to LLM for judgment.

4. **Implicit ACK gate:** If a gate was opened with a message that has
   `ack_required: true`, and the resolving message is a substantive response
   (not just an ACK), flip both `ack_received = TRUE` on the original message
   AND resolve the gate. Two state updates from one event.

---

## 4. Integration with autonomous-sync.sh

### Updated Main Flow

```bash
# ... existing pre-flight checks ...

# ── Crystallized pre-processing ──────────────────────────────────────
# Run AFTER cross_repo_fetch + auto_process_trivial, BEFORE pre-flight skip check

# Step 1: Triage all unprocessed messages
if [ -x "${AGENTDB}" ]; then
    triage_result=$("${AGENTDB}" triage --scan 2>/dev/null)
    triage_exit=$?
    if [ ${triage_exit} -eq 0 ]; then
        auto_ack_count=$(echo "${triage_result}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('dispositions', {}).get('auto-ack', 0))
" 2>/dev/null || echo "0")
        needs_llm_count=$(echo "${triage_result}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('dispositions', {}).get('needs-llm', 0))
" 2>/dev/null || echo "0")
        log "Triage: ${auto_ack_count} auto-ack, ${needs_llm_count} needs-llm"
    fi

    # Step 2: Generate template ACKs
    if [ "${auto_ack_count:-0}" -gt 0 ]; then
        "${AGENTDB}" ack --auto 2>/dev/null && \
            log "Auto-ACK: ${auto_ack_count} generated"
    fi

    # Step 3: Resolve gates
    "${AGENTDB}" gate resolve --scan 2>/dev/null || true

    # Step 4: Regenerate MANIFEST
    "${AGENTDB}" manifest 2>/dev/null || true
fi

# ── Pre-flight skip check (updated) ─────────────────────────────────
# Now checks needs_llm_count instead of raw unprocessed_count
if [ "${TRANSPORT_CHANGED}" = false ] && [ "${GATE_ACCELERATED}" = false ]; then
    if [ "${needs_llm_count:-0}" -eq 0 ]; then
        log "NO-OP — all messages handled deterministically. Skipping /sync."
        git_push || true
        exit 0
    fi
    log "Substance messages found (${needs_llm_count}) — proceeding with /sync"
fi
```

### Fallback Behavior

If `agentdb triage` fails (binary missing, DB error), fall back to current
behavior — all unprocessed messages go to the LLM. The crystallized path
is an optimization, not a requirement. The system degrades gracefully.

```bash
if [ -x "${AGENTDB}" ]; then
    # Crystallized path
    ...
else
    # Legacy path — everything goes to LLM
    needs_llm_count=$(sqlite3 "${DB_PATH}" \
        "SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE;" \
        2>/dev/null || echo "0")
fi
```

---

## 5. Schema Migration (v22)

```sql
-- New columns for triage
ALTER TABLE transport_messages ADD COLUMN triage_score INTEGER;
ALTER TABLE transport_messages ADD COLUMN triage_disposition TEXT;
ALTER TABLE transport_messages ADD COLUMN triage_at TEXT;

-- Index for triage queries
CREATE INDEX IF NOT EXISTS idx_transport_triage
    ON transport_messages (triage_disposition)
    WHERE triage_disposition IS NOT NULL;

-- Schema version
INSERT OR REPLACE INTO schema_version (version, description, applied_at)
VALUES (22, 'Triage columns for crystallized sync', strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'));
```

---

## 6. Orientation Payload Update

After crystallized pre-processing, the orientation payload should reflect
the triage results so the LLM knows what was already handled:

```
## Pre-processed (crystallized)
- 2 messages auto-ACK'd (ack, notification)
- 1 gate resolved (gate-transport-health-001)
- 0 messages auto-skipped

## Substance queue (needs your review)
- from-safety-quotient-agent-016.json (score: 75, request, ack_required: true)
- from-observatory-agent-015.json (score: 80, proposal)
```

This tells the LLM exactly what remains, preventing it from re-scanning
messages that were already handled.

### Implementation

`orientation-payload.py` gains a `--post-triage` flag that reads
`triage_disposition` from state.db instead of raw `processed = FALSE`.
The autonomous-sync.sh prompt becomes:

```bash
orientation=$(python3 "${PROJECT_ROOT}/scripts/orientation-payload.py" \
    --agent-id "${AGENT_ID}" --no-cache --post-triage 2>/dev/null)
```

---

## 7. Metrics and Observability

Track crystallization effectiveness in the autonomous_actions audit trail:

```sql
INSERT INTO autonomous_actions
    (agent_id, action_type, description, timestamp)
VALUES
    (:agent_id, 'crystallized-triage',
     'Triage: N scanned, M auto-ack, K auto-skip, J needs-llm',
     datetime('now'));
```

Dashboard (`mesh-status.py`) gains a "Crystallization Rate" metric:

```
Crystallization rate = (auto-ack + auto-skip + auto-record) / total_triaged
```

Target: > 60% of messages handled without LLM invocation.

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| False negative (substance message auto-ACK'd) | Low | High — peer expects substance, gets template | Conservative thresholds: request/proposal/command-request always route to LLM. Double-check: `ack_required: true` + substance type = always LLM. |
| False positive (trivial message routed to LLM) | Medium | Low — wastes a few turns, no harm | Acceptable cost. LLM handles it correctly, just inefficiently. Triage thresholds can tighten over time. |
| Triage score gaming | Very low | Low — all agents trusted | Not a concern in current mesh. Monitor if external agents join. |
| Schema migration breaks existing queries | Low | Medium | New columns have NULL default. Existing queries unaffected. |
| Crystallized path fails silently | Low | Medium — messages stuck unprocessed | Fallback to legacy path. Log warnings. Escalate if crystallized path fails 3+ consecutive cycles. |

---

## 9. Implementation Order

1. **Schema migration (v22)** — add triage columns
2. **`agentdb triage --scan`** — scoring engine + disposition writer
3. **`agentdb ack --auto`** — template ACK generator
4. **`agentdb gate resolve --scan`** — deterministic gate resolution
5. **autonomous-sync.sh integration** — wire commands into pre-flight
6. **orientation-payload.py --post-triage** — LLM context update
7. **mesh-status.py crystallization metric** — observability


## 10. Success Criteria

- [ ] > 60% of messages handled without LLM invocation (crystallization rate)
- [ ] Average LLM turns per substantive cycle drops from ~25 to ~10
- [ ] Zero false negatives in first 50 triaged messages (substance message
      incorrectly auto-processed)
- [ ] Fallback path activates cleanly when agentdb unavailable
- [ ] No increase in peer-reported communication quality issues


⚑ EPISTEMIC FLAGS
- Triage scoring weights are initial estimates — require calibration against
  actual message distribution (first 50 messages reviewed manually)
- "Crystallized intelligence" metaphor from Cattell (1971) applied loosely —
  the analogy holds for the fluid/crystallized distinction but does not imply
  the psychometric properties of the original constructs
- The 60% crystallization rate target lacks empirical basis — derived from
  observed message type distribution (40% ack/notification, 20% state-update)

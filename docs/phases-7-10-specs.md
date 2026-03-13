# Cogarch Refactor: Phases 7-10 Specifications

Session 84. Design specs for the remaining refactor phases.
Implementation proceeds in subsequent sessions.

---

## Phase 7: CPG Mode System (Stage 0 → Stage 1)

**Goal:** Implement generate/evaluate mode competition with fatigue-based
switching. First CPG principle to advance through the crystallization pipeline.

**Knock-on decision: CONSENSUS** (from earlier analysis this session).

**Design:**

Two behavioral modes with mutual inhibition:

| Mode | Dominant Behavior | Suppressed Behavior | Active Tier 2 Checks |
|---|---|---|---|
| **Generative** | Brainstorming, exploring, creating | Evaluative sub-checks (T3 #6, #10, #12) | T2 #8b (Socratic), T3 #8 (Socratic discipline) |
| **Evaluative** | Checking, auditing, validating | Generative sub-checks, exploratory | T3 #5 (sycophancy), T3 #9 (GRADE), T3 #15 (constraints) |

**Mode detection (task-type from Phase 5):**
- "brainstorm", "explore", "what if", "ideas" → Generative mode
- "evaluate", "check", "verify", "audit", "review" → Evaluative mode
- "build", "implement", "fix", "commit" → Neutral (both modes active, balanced)

**Fatigue-based switching:** After N consecutive responses in one mode,
the suppressed mode's activation threshold lowers. After 5 responses in
generative mode, evaluative checks begin firing as ADVISORY even without
explicit user request. Prevents mode stickiness.

**Phase disclosure (addresses Order 5 concern):** When mode-dependent
behavior occurs, state it: "During this exploratory phase, I interpret
your pushback as a signal to narrow scope rather than defend position."

**Implementation:** Stage 1 (in-context reasoning). The agent explicitly
reasons about mode at the start of each response. No hooks or scripts —
pure cognitive processing. Advances to Stage 2 (trigger-encoded) after
3+ sessions of successful execution.


## Phase 8: Metacognitive Layer

**Goal:** Add trigger activation tracking, effectiveness measurement,
and self-model. Enable the cogarch to answer "which checks actually
prevented errors?" (E-14, E-G7, P-3).

**Design:**

### 8a. Trigger Activation Tracking

Add to state.db:

```sql
CREATE TABLE trigger_activations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  trigger_id TEXT NOT NULL,          -- e.g., 'T3'
  check_number INTEGER,              -- e.g., 5
  tier TEXT NOT NULL,                 -- 'critical', 'advisory', 'spot-check'
  fired BOOLEAN NOT NULL DEFAULT 1,
  result TEXT,                        -- 'pass', 'fail', 'skip'
  action_taken TEXT,                  -- what the agent did in response
  timestamp TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Dual-write:** At the end of each response where triggers fired, log which
checks ran, which passed, which failed, and what action the agent took.

### 8b. Effectiveness Measurement

After 10+ sessions of activation tracking:

```sql
-- Which checks actually catch errors?
SELECT trigger_id, check_number, tier,
       SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as catches,
       COUNT(*) as total_fires,
       ROUND(100.0 * SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) / COUNT(*), 1) as catch_rate
FROM trigger_activations
GROUP BY trigger_id, check_number
ORDER BY catches DESC;

-- Which CRITICAL checks have zero catches in 10 sessions?
-- Candidates for tier demotion
SELECT trigger_id, check_number
FROM trigger_activations
WHERE tier = 'critical'
GROUP BY trigger_id, check_number
HAVING SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) = 0
  AND COUNT(DISTINCT session_id) >= 10;
```

### 8c. Self-Model

Extend `trigger_state` table with per-session state:

```sql
ALTER TABLE trigger_state ADD COLUMN current_mode TEXT;  -- 'generative', 'evaluative', 'neutral'
ALTER TABLE trigger_state ADD COLUMN mode_duration INTEGER DEFAULT 0;  -- consecutive responses in mode
ALTER TABLE trigger_state ADD COLUMN broadcast_summary TEXT;  -- GWT one-line broadcast
```

This gives the agent a queryable representation of its own cognitive state.


## Phase 9: Transport Simplification

**Goal:** Right-size the protocol for the current 5-agent mesh. Reduce
per-message overhead. Add session lifecycle.

**Knock-on decision: PRAGMATISM** — simplify current operations without
breaking existing messages or cross-repo references.

**Design:**

### 9a. Session Lifecycle

```
open → active → closing → closed → archived
```

- **open:** First message creates session directory + MANIFEST
- **active:** Messages exchanging. Default state.
- **closing:** Session-close message sent. No new substance messages.
  ACKs still permitted.
- **closed:** All participants acknowledged close or 7 days elapsed.
  No new messages of any type.
- **archived:** Session directory moved to `transport/archive/`.
  MANIFEST retained; message files compressed.

### 9b. Simplified ACK Protocol

Replace 4-mechanism ACK system with 2:

1. **Implicit ACK:** A substantive response to a message counts as
   acknowledgment. The `in_response_to` field serves as the ACK signal.
   This handles 90%+ of exchanges.

2. **Explicit ACK required:** For gated operations only (`ack_required: true`).
   Sender blocks on receiver's explicit acknowledgment file.

Remove: `processed` column as ACK signal, separate ACK file for non-gated
messages. Simplifies from 4 mechanisms to 2.

### 9c. Transport Garbage Collection

Add to /cycle or create as a periodic maintenance script:

```bash
# Archive sessions closed > 30 days ago
for session in transport/sessions/*/MANIFEST.json; do
  status=$(jq -r '.status' "$session")
  if [ "$status" = "closed" ]; then
    # Check MANIFEST last_updated
    # If > 30 days, move to transport/archive/
  fi
done
```


## Phase 10: Dead Weight Removal + CLAUDE.md Slimming

**Goal:** Remove identified dead weight (E-D1 through E-D4). Deduplicate
CLAUDE.md against canonical sources. Target: CLAUDE.md under 150 lines.

**Knock-on decision: CONSENSUS** — removal serves all orders.

**Removals:**

1. **T12 ("Good Thinking" Signal)** — retire. T10 handles lesson
   capture independently. If retained in a future version, promote from
   trigger to /cycle sub-step (fires on audit, not every session).

2. **T2 #6 (E-prime) as per-response check** — move to CLAUDE.md as a
   writing convention (already there). Remove from T2's check list.
   E-prime compliance belongs at write time, not as a cognitive check.

3. **Cognitive Accessibility Policy in CLAUDE.md** — merge into the
   existing trigger system (T18 already covers this). Remove the
   redundant CLAUDE.md section.

4. **README Policy** — 3 lines of minimal value. Remove from CLAUDE.md.
   Document in CONTRIBUTING.md if needed.

5. **CLAUDE.md deduplication** — the Skills section, Hooks reference,
   and Workflow Continuity sections summarize content from canonical
   locations. Replace with one-line pointers:
   ```
   Skills: see .claude/skills/*/SKILL.md
   Hooks: see .claude/settings.json + docs/hooks-reference.md
   Workflow: see docs/cognitive-triggers.md T1 + T5
   ```

**Target CLAUDE.md structure (≤150 lines):**
- Scope boundaries (~20 lines)
- Communication conventions (~15 lines)
- Decision making (~10 lines)
- Code quality (~10 lines)
- Version control (~5 lines)
- Sub-projects (~5 lines)
- Pointers to canonical docs (~10 lines)
- Total: ~75 lines (50% reduction from current ~200)

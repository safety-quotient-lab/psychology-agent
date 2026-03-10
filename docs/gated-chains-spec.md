# Gated Autonomous Chains — Design Spec

**Date:** 2026-03-09
**Status:** Active design
**Resolves:** Gated autonomous chain requirement (Session 61 /knock analysis)
**Depends on:** EF-1 trust model, cross-repo transport (Session 60), autonomous-sync.sh


---


## Problem

Agent A sends a message that gates its next action on Agent B's response.
With the current 5-minute poll interval on both sides, a round-trip takes
10–20 minutes worst case. Gated chains need:

1. A way for agents to express "I block until you respond"
2. The blocked agent to detect the gate and wait efficiently
3. The responding agent to process the gated message promptly
4. A fallback cascade — no single mechanism's failure blocks the chain


---


## Gate Protocol (interagent/v1 extension)

New top-level field on any transport message:

```json
{
  "gate": {
    "gate_id": "psq-recalibration-gate-20260309",
    "blocks_until": "response",
    "timeout_minutes": 60,
    "fallback_action": "continue-without-response",
    "priority": "gated"
  }
}
```

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `gate_id` | string | yes | Deterministic key: `{topic}-gate-{YYYYMMDD}` |
| `blocks_until` | enum | yes | `response` (any reply clears), `ack` (ACK clears), `specific-turn` (named turn clears) |
| `timeout_minutes` | integer | yes | Max wait. After timeout, `fallback_action` fires |
| `fallback_action` | enum | yes | `continue-without-response`, `retry-once`, `halt-and-escalate` |
| `priority` | enum | no | `gated` (triggers acceleration on receiver), `normal` (no acceleration) |

**Backward compatibility:** Agents that don't understand `gate` ignore it.
The `ack_required: true` field (already in schema) ensures the receiver
still processes the message. The gate adds *sender-side* blocking semantics
that old receivers don't need to understand.

**Implicit `ack_required`:** Any message with `gate.blocks_until == "response"`
or `gate.blocks_until == "ack"` implicitly sets `ack_required: true`. The
sender needs confirmation; the gate makes that structural.


---


## Gate State Tracking (state.db)

### New table: `active_gates`

```sql
CREATE TABLE IF NOT EXISTS active_gates (
    gate_id             TEXT PRIMARY KEY,
    sending_agent       TEXT NOT NULL,
    receiving_agent     TEXT NOT NULL,
    session_name        TEXT NOT NULL,
    outbound_filename   TEXT NOT NULL,
    blocks_until        TEXT NOT NULL DEFAULT 'response',
    timeout_minutes     INTEGER NOT NULL DEFAULT 60,
    fallback_action     TEXT NOT NULL DEFAULT 'continue-without-response',
    status              TEXT NOT NULL DEFAULT 'waiting',
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    resolved_at         TEXT,
    resolved_by         TEXT,
    timeout_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gates_status
    ON active_gates (status) WHERE status = 'waiting';
```

Status values: `waiting`, `resolved`, `timed-out`, `fallback-executed`.

`timeout_at` computed at insert: `datetime(created_at, '+' || timeout_minutes || ' minutes')`.

### Visibility

`active_gates` → `private` (machine-specific operational state, like trust_budget).


---


## Fallback Cascade (4 layers)

Reliability principle: **each layer operates independently.** No layer
depends on any other layer functioning. Higher layers reduce latency;
lower layers guarantee delivery.

```
────────────────────────────────────────────────────────────────
 Layer  Mechanism               Latency    Reliability
────────────────────────────────────────────────────────────────
 L1     Standard cron poll      ≤ 5 min    ★★★★★ (cron + git)
 L2     Gate-aware acceleration ≤ 60 sec   ★★★★☆ (filesystem)
 L3     LAN wake-up signal      ≤ 5 sec    ★★★☆☆ (SSH + LAN)
 L4     Push-notification hook   < 1 sec    ★★☆☆☆ (bare repo)
────────────────────────────────────────────────────────────────
```

### L1: Standard cron poll (always on)

The existing `autonomous-sync.sh` on a 5-minute cron. Never disabled.
This layer guarantees that even if every other mechanism fails, messages
arrive within 5 minutes. No changes needed — already operational.

### L2: Gate-aware acceleration (new)

When an agent has an active gate (`status = 'waiting'` in `active_gates`),
the sync script switches from 5-minute interval to 60-second interval.
Implementation: a separate cron entry or a filesystem watch.

**Mechanism:** `autonomous-sync.sh` checks for active gates at startup.
If any exist, it overrides `min_action_interval` to 60 seconds for this
cycle only (does not modify the DB value). The gate check runs *before*
the standard interval check, creating a fast lane.

```bash
# In autonomous-sync.sh, after ensure_db:
active_gates=$(sqlite3 "${DB_PATH}" \
    "SELECT COUNT(*) FROM active_gates WHERE status = 'waiting'
     AND datetime(timeout_at) > datetime('now', 'localtime');")

if [ "${active_gates}" -gt 0 ]; then
    log "GATE-ACCELERATED — ${active_gates} active gate(s), using 60s interval"
    # Override interval for this cycle only
    GATE_ACCELERATED=true
fi
```

When `GATE_ACCELERATED=true`, the `check_interval` function uses 60s
instead of reading `min_action_interval` from the DB.

**Budget impact:** Gate-accelerated cycles consume trust budget at the
same Tier 1 rate (1 credit per cycle). A 60-minute gate with 60-second
polling consumes up to 60 credits — exceeding the default budget of 20.
**Mitigation:** Gate-accelerated polls that find no new inbound messages
consume 0 credits (no action taken, no budget deducted). Only cycles
that actually process a response deduct budget. The check-and-skip path
adds a `gate_poll` action type with 0 cost.

### L3: LAN wake-up signal (optional, manually configured)

After pushing an outbound gated message, the sending agent executes:

```bash
ssh ${PEER_HOST} "touch /tmp/sync-wake-${PEER_AGENT_ID}"
```

The receiving agent's `autonomous-sync.sh` checks for the wake file
at each cycle and immediately processes if found:

```bash
WAKE_FILE="/tmp/sync-wake-${AGENT_ID}"
if [ -f "${WAKE_FILE}" ]; then
    rm -f "${WAKE_FILE}"
    log "WAKE-UP signal received — accelerating cycle"
    GATE_ACCELERATED=true
fi
```

**Reliability:** Depends on LAN connectivity and SSH access. If SSH
fails, L1 and L2 still deliver within 60 seconds (if gated) or 5
minutes (if not).

**Configuration:** Peer SSH hostname stored in agent-registry.json:

```json
"psq-agent": {
    "lan_host": "chromabook.local",
    "lan_user": "kashif"
}
```

### L4: Push-notification hook (future, not implemented now)

A LAN bare repo with `post-receive` hook. Deferred until L1–L3 prove
insufficient. The /knock analysis (Session 61) identified that L4 adds
4 new failure modes and shared infrastructure. L1–L3 provide sub-minute
delivery with zero shared infrastructure.


---


## Gate Lifecycle

### Creating a gate (sender side)

1. Agent drafts outbound message with `gate` field
2. `dual_write.py transport-message` writes the message metadata to state.db
3. New: `dual_write.py gate-open` inserts into `active_gates`:
   ```bash
   python3 scripts/dual_write.py gate-open \
       --gate-id "psq-recalibration-gate-20260309" \
       --sending-agent psychology-agent \
       --receiving-agent psq-agent \
       --session "psq-scoring" \
       --filename "from-psychology-agent-005.json" \
       --blocks-until response \
       --timeout-minutes 60 \
       --fallback-action continue-without-response
   ```
4. Agent pushes to origin (standard git push)
5. (L3, optional) Agent sends SSH wake-up to peer

### Processing a gated message (receiver side)

1. Receiver's `/sync` or `cross_repo_fetch.py` picks up the message
2. Standard processing — the `gate` field informs the receiver that
   the sender blocks on a response, adding urgency context
3. Receiver writes response with `in_response_to` referencing the
   gated message filename
4. Receiver pushes to origin
5. (L3, optional) Receiver sends SSH wake-up to sender

### Resolving a gate (sender side)

1. Sender's next poll/accelerated-poll picks up the response
2. `/sync` processes the response and detects it resolves a gate:
   ```sql
   SELECT gate_id FROM active_gates
   WHERE status = 'waiting'
     AND session_name = '{session}'
     AND receiving_agent = '{response.from.agent_id}';
   ```
3. Gate resolved:
   ```bash
   python3 scripts/dual_write.py gate-resolve \
       --gate-id "psq-recalibration-gate-20260309" \
       --resolved-by "from-psq-agent-006.json"
   ```
4. Standard polling interval resumes

### Timeout handling

1. `autonomous-sync.sh` checks for timed-out gates:
   ```sql
   SELECT gate_id, fallback_action FROM active_gates
   WHERE status = 'waiting'
     AND datetime(timeout_at) <= datetime('now', 'localtime');
   ```
2. Execute fallback action:
   - `continue-without-response`: mark gate `timed-out`, proceed with
     next autonomous cycle normally. Log the timeout
   - `retry-once`: re-send the original message (bump turn number),
     reset timeout. If already retried, treat as `halt-and-escalate`
   - `halt-and-escalate`: mark gate `timed-out`, write a halt message
     to local-coordination, exhaust trust budget (forces human review)
3. All timeout events write to `autonomous_actions` audit trail


---


## Schema Migration (v10)

```sql
-- ── Schema v10: Gated autonomous chains ─────────────────────

CREATE TABLE IF NOT EXISTS active_gates (
    gate_id             TEXT PRIMARY KEY,
    sending_agent       TEXT NOT NULL,
    receiving_agent     TEXT NOT NULL,
    session_name        TEXT NOT NULL,
    outbound_filename   TEXT NOT NULL,
    blocks_until        TEXT NOT NULL DEFAULT 'response',
    timeout_minutes     INTEGER NOT NULL DEFAULT 60,
    fallback_action     TEXT NOT NULL DEFAULT 'continue-without-response',
    status              TEXT NOT NULL DEFAULT 'waiting',
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    resolved_at         TEXT,
    resolved_by         TEXT,
    timeout_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gates_status
    ON active_gates (status) WHERE status = 'waiting';

INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description)
VALUES ('active_gates', 'private', 'Gate state — machine-specific operational state');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (10, 'Add active_gates table — gated autonomous chain tracking with timeout and fallback cascade');
```


---


## Implementation Plan

| Step | Deliverable | Effort | Depends on |
|------|-------------|--------|------------|
| 1 | Schema v10 migration (active_gates table) | XS | — |
| 2 | `dual_write.py` gate-open / gate-resolve / gate-timeout commands | S | Step 1 |
| 3 | `autonomous-sync.sh` gate-aware acceleration (L2) | S | Step 1 |
| 4 | `autonomous-sync.sh` wake-up file check (L3) | XS | — |
| 5 | `autonomous-sync.sh` timeout handler | S | Steps 1–2 |
| 6 | `/sync` skill update — gate detection on inbound + resolve on response | S | Steps 1–2 |
| 7 | `orientation-payload.py` — include active gates in orientation | XS | Step 1 |
| 8 | Agent-registry: add `lan_host` / `lan_user` fields | XS | — |
| 9 | First gated chain test (psychology-agent → psq-agent) | M | Steps 1–7 |

**Total estimated effort:** M (medium) — 9 steps, each XS–S.


---


## Constraints

- **Trust budget invariant preserved** — gate-accelerated no-op polls cost 0
  credits. Only cycles that process responses deduct budget. A gated chain
  cannot exhaust budget faster than an ungated chain that happens to receive
  messages at the same rate
- **No shared infrastructure** — L1–L3 use each agent's own repo, cron, and
  SSH. No bare repo, no daemon, no message queue
- **Backward compatible** — agents that don't understand `gate` still process
  the message (via `ack_required`). The gate adds sender-side semantics only
- **Timeout always fires** — no gate persists indefinitely. The maximum
  `timeout_minutes` SHOULD be capped at 1440 (24 hours) via validation in
  `dual_write.py`
- **min_action_interval remains authoritative** — gate acceleration overrides
  the interval *for gate-checking polls only*. Non-gate actions still respect
  the configured interval. This prevents a rogue gate from bypassing the
  spacing guarantee for all autonomous actions


---


## Example: Gated Recalibration Chain

```
Psychology-agent                          PSQ-agent
     │                                        │
     │  1. Send recalibration request          │
     │  gate: {blocks_until: "response",       │
     │         timeout: 60min}                 │
     │  ──────────────────────────────────►    │
     │                                        │
     │  [enters gate-accelerated polling]      │
     │  [60s interval, 0-cost no-op polls]     │
     │                                        │
     │                     2. Receive request  │
     │                     3. Run calibration  │
     │                     4. Send response    │
     │    ◄────────────────────────────────────│
     │                                        │
     │  5. Poll picks up response (≤60s)       │
     │  6. Gate resolves                       │
     │  7. Process calibration results         │
     │  8. Resume standard 5-min interval      │
     │                                        │
```

Round-trip: ~6–7 minutes (receiver's 5-min poll + sender's 60s poll),
down from ~10–20 minutes. With L3 wake-up signal: ~2–3 minutes.


---


## Epistemic Flags

⚑ EPISTEMIC FLAGS
- Gate-accelerated 0-cost polls represent a new action type not yet validated
  against the EF-1 trust model's "no action without evaluation" invariant.
  The 0-cost classification assumes no-op polls carry no risk — verify after
  first deployment
- L3 SSH wake-up assumes stable LAN DNS (chromabook.local). If mDNS fails,
  L3 silently degrades to L1/L2 — acceptable but should be logged
- Maximum practical chain depth untested. A chain of 5+ sequential gates
  could consume significant calendar time even with acceleration

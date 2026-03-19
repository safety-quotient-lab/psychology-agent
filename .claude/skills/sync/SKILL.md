---
name: sync
description: Inter-agent mesh synchronization — scan transport sessions for new messages, check peer repos, write ACKs, update MANIFEST, report changes.
user-invocable: true
argument-hint: "[psq | unratified | all (default)]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# /sync — Inter-Agent Mesh Synchronization

Scan transport sessions for inbound messages, check peer repos for new
activity, write ACKs, regenerate MANIFEST.json from state.db, and report
what changed.

**Requirement-level keywords:** Per BCP 14 (RFC 2119 + RFC 8174). See
`docs/ef1-governance.md` for full definitions.

## When to Invoke

- Start of session (fast check for new activity)
- After sending a transport message and expecting a response
- When the user says "sync," "check agents," or "anything new?"
- Before writing new inter-agent messages (ensures latest state)

## Arguments

Parse `$ARGUMENTS` to determine scope:

| Argument | Scope |
|----------|-------|
| *(empty)* or `all` | Full sweep — all registered agents |
| `psq` | Only safety-quotient-agent (sub-agent, same repo) |
| `unratified` | Only unratified-agent (peer, separate repo) |

---

## Agent Registry

**Canonical source:** `transport/agent-registry.json`

Read the registry at the start of every /sync invocation. The registry
defines all known agents, their transport methods, message prefixes,
active sessions, and outbound routing rules. Do NOT hardcode agent
information in this skill — the registry is the single source of truth.

**Registry fields used by /sync:**

| Field | Purpose |
|-------|---------|
| `agents.{id}.transport` | `same-repo`, `cross-repo-pr`, or `cross-repo-fetch` — determines scan method |
| `agents.{id}.message_prefix` | Pattern for identifying inbound messages |
| `agents.{id}.active_sessions` | Which sessions to check for new turns |
| `agents.{id}.always_consider` | If true, MUST check for outbound content every cycle |
| `outbound_routing.rules` | Domain→agent routing for proactive message drafting |

**Scope filtering:** When `$ARGUMENTS` specifies a single agent, filter
the registry to only that agent's entry. When `all`, iterate all agents.

---

## Protocol

### Phase 0: Load Registry

```
Read transport/agent-registry.json
Parse agents and outbound_routing rules
Filter by $ARGUMENTS scope
```

If the registry file is missing or malformed, fall back to the hardcoded
peer table below and flag the registry issue in the output:

| Agent | Role | Repo | Transport |
|-------|------|------|-----------|
| safety-quotient-agent | Sub-agent (PSQ scoring) | safety-quotient-lab/safety-quotient | Cross-repo fetch (`git show safety-quotient/main:...`) |
| unratified-agent | Peer (blog platform) | safety-quotient-lab/unratified | PRs + cross-repo fetch |

### Phase 1: Inbound Scan

**1a. Local transport (same-repo agents):**

For each agent where `transport == "same-repo"`:

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

Scan transport sessions for unread messages using the agent's `message_prefix`:
```bash
ls -t transport/sessions/*/from-{message_prefix}*.json
```

Compare against state.db `transport_messages` — any file not indexed there
(or indexed with `processed = FALSE`) and not authored by psychology-agent
represents a new inbound message:
```sql
SELECT filename FROM transport_messages
WHERE session_name = '{session}' AND processed = FALSE;
```

**1b. Cross-repo-fetch agents:**

For each agent where `transport == "cross-repo-fetch"`:

```bash
# Fetch and scan using cross_repo_fetch.py
python3 scripts/cross_repo_fetch.py --agent {agent_id} --json
```

The script handles: `git fetch {remote_name} main`, reads MANIFEST.json
(if present) and session directories via `git show`, compares against
state.db to identify new/unprocessed messages, and returns structured
results. Use `--index` flag to also write new messages to state.db.

**Post-filter (MANDATORY — Session 91 fix):** The script output mixes
genuine inbound messages (`from-{peer}-*.json`) with addressed copies
(`to-psychology-agent-*.json`). These require different handling:

- **`from-{peer}-*.json`** — genuine inbound. MUST verify local existence:
  ```bash
  ls transport/sessions/{session}/from-{peer}-{NNN}.json 2>/dev/null
  ```
  If missing locally → **new message, MUST read via `git show`**. Never
  skip `from-*` files without verifying local existence. Never assume
  they represent "historical backlog" without checking.
- **`to-psychology-agent-*.json`** — addressed copies (Convention B routing
  artifacts). These share the source message's content and MUST NOT be
  indexed separately. Skip unless the corresponding `from-*` source
  message does not exist locally.

**Anti-pattern (Session 91 postmortem):** Treating the cross_repo_fetch
output as a flat list and skipping `from-*` files because `to-*` files
dominated the count. This caused 6 genuine peer messages to go unread
across 5 sessions. The fix: always partition the output into `from-*`
(process) and `to-*` (skip), then verify each `from-*` locally.

For each new `from-*` message found, read the full content via:
```bash
git show {remote_name}/main:transport/sessions/{session}/{filename}
```

**1c. Cross-repo-pr agents:**

For each agent where `transport == "cross-repo-pr"`:

```bash
# Check for PRs targeting our repo
gh pr list --repo safety-quotient-lab/psychology-agent --json number,title,headRefName,author

# Check their repo for recent commits (if repo is known)
gh api repos/{repo}/commits \
  --jq '.[0:5] | .[] | {sha: .sha[0:7], message: .commit.message[0:72]}'
```

**1d. Local-coordination check (parallel instances):**

```bash
ls transport/sessions/local-coordination/
```

**1e. Peer API status check (Session 93 — prevents git/state confusion):**

For each agent shown as online in the pulse, query its `/api/status`
for actual processing state. **MUST NOT infer processing state from git
commit history** — an agent can deliberate actively without producing
commits. Git log shows *commit activity*; the API shows *processing state*.

```bash
# Query each online peer's status endpoint
for agent_url in $(curl -s http://localhost:8083/api/pulse | \
  python3 -c "import json,sys; [print(a.get('status_url','')) for a in json.load(sys.stdin).get('agents',[]) if a.get('status') == 'online']"); do
  curl -s --max-time 5 "$agent_url" 2>/dev/null
done
```

Extract from each response:
- `deliberation_count` — has the agent deliberated since last restart?
- `event_count` — how many events processed?
- `gc_metrics.spawn_blocked_total` — blocked spawns indicate infrastructure bugs
- `uptime` — how long since last restart?
- `health` — self-reported health status

**Anti-pattern (Session 93 postmortem):** Checking `git log peer/main`
and concluding "agent stopped deliberating" when the log showed no recent
commits. Observatory-agent had 10 deliberations on the day we reported it
idle — the deliberations produced no git-visible output. Fair witness
violation: observation ("no commits") reported as inference ("no activity").

### Phase 2: Triage

For each inbound item, classify:

| Type | Source | Action |
|------|--------|--------|
| New transport message | `from-{agent}-{NNN}.json` | Read → assess → respond or flag |
| Open PR on our repo | Peer agent branch | Read diff → assess → merge or flag |
| New commit on main (after pull) | Peer or sub-agent | Read changed files → process |
| No new activity | — | Report "no new activity" and continue to Phase 2b |

**MUST NOT auto-merge PRs.** Surface them for user review with a summary of
what the PR contains. The user decides merge/reject.

**MUST NOT auto-accept proposals.** Psychology-agent reviews substance
decisions (T3) — surface with recommendation.

### Phase 2b: Proactive Outbound Scan

For each agent where `always_consider == true`, AND for any agent with
active sessions, scan the current session context for content relevant
to that agent using the `outbound_routing.rules`:

1. Read the routing rules from the registry
2. For each rule, check whether the current session produced content
   matching any of the rule's keywords (scan recent tool outputs,
   decisions made, files modified this session)
3. If a match is found:
   - If the target agent has an active session → draft an outbound
     message (notification or update) for user review
   - If no active session → flag in the output: "Content relevant to
     {agent} detected: {summary}. No active session — consider opening one."
4. Outbound drafts are substance decisions — MUST surface with
   recommendation, not auto-send

**Example:** Psychology-agent resolves a cogarch change. The routing rule
`domain: "cogarch" → route_to: ["safety-quotient-agent"]` fires because safety-quotient-agent
has a cogarch mirror directive active. /sync drafts a notification
message for safety-quotient-agent and surfaces it to the user.

### Phase 2c: Incomplete Work Detection

Before processing new messages, check whether any active session contains
incomplete work that a previous sync cycle started but did not finish.
Incomplete work left undetected compounds — the next cycle may duplicate
effort or send contradictory messages.

**Detection heuristics:**

1. **Orphaned handoffs:** Query `pending_handoffs` for handoffs where `timeout_at`
   has passed but no resolution or fallback executed:
   ```sql
   SELECT * FROM pending_handoffs
   WHERE resolved_at IS NULL
     AND timeout_at < datetime('now');
   ```
   Action: execute the gate's `fallback_action` or escalate.

2. **Dangling outbound drafts:** Check for uncommitted transport files
   (files in `transport/sessions/` that exist on disk but have no
   `transport_messages` row in state.db):
   ```bash
   # Compare filesystem to index
   for f in transport/sessions/*/from-psychology-agent-*.json; do
     python3 -c "
   import sqlite3, sys
   db = sqlite3.connect('state.db')
   r = db.execute('SELECT 1 FROM transport_messages WHERE filename=?',
                  (sys.argv[1],)).fetchone()
   if not r: print(f'UNINDEXED: {sys.argv[1]}')
   " "$(basename "$f")"
   done
   ```
   Action: index the file via dual_write, or delete if it represents
   an abandoned draft (check git status — unstaged = abandoned).

3. **Request-without-response:** For each active session, check if the
   most recent message from a peer agent contains `message_type: "request"`
   and no subsequent `from-psychology-agent` message exists:
   ```sql
   SELECT tm.session_name, tm.filename, tm.turn, tm.subject
   FROM transport_messages tm
   WHERE tm.message_type = 'request'
     AND tm.from_agent != 'psychology-agent'
     AND tm.processed = TRUE
     AND NOT EXISTS (
       SELECT 1 FROM transport_messages tm2
       WHERE tm2.session_name = tm.session_name
         AND tm2.from_agent = 'psychology-agent'
         AND tm2.turn > tm.turn
     );
   ```
   Action: flag in output as "pending response needed" — do NOT auto-draft
   unless the request carries `urgency: "immediate"`.

4. **Partial deliverable chains:** When a message references a multi-step
   deliverable (e.g., "5 blog posts" or "review + revise + publish"),
   check if all steps completed:
   ```sql
   -- Check claims linked to the request message
   SELECT c.claim_text, c.verified
   FROM claims c
   WHERE c.transport_msg IN (
     SELECT id FROM transport_messages
     WHERE session_name = '{session}' AND message_type = 'request'
   );
   ```
   Action: if unverified claims remain, flag the deliverable as incomplete.

**Output addition:**

Add to the /sync output block:
```
  Incomplete work detected: {count} items
    - {session}: orphaned gate {gate_id} (timed out {when})
    - {session}: unanswered request from {agent} (turn {N})
    - {session}: {M}/{total} deliverables incomplete
```

If no incomplete work: `Incomplete work detected: none`

**Autonomous mode behavior:**

When running under `autonomous-sync.sh`, incomplete work detection MUST
run before the claude invocation's orientation payload. The pre-sync
script (`scripts/pre_sync_check.py`) should surface incomplete items
so the LLM context includes them. If incomplete work exceeds 3 items,
the orientation payload should prioritize resolution over new inbound
processing.

### Phase 2d: Session Drift Detection (Session 93)

Before writing new messages to a session, check whether the session
has drifted from its original scope. Drifted sessions obscure content,
complicate search, and produce misleading MANIFEST entries.

**Detection heuristics (any one triggers a drift flag):**

1. **Subject drift** — 3+ consecutive messages share no keywords with
   the session name (split session name by hyphen, check intersection
   with message subjects). Example: `context-degradation-threshold`
   receiving messages about "LCARS dashboard" and "alpha-band heartbeat."

2. **Thread fork** — `thread_id` differs from `session_id` on 3+ messages.
   The session contains multiple conversations sharing a container.
   Each distinct `thread_id` should become its own session.

3. **Participant change** — the agent pair shifts within the session
   (e.g., psychology↔ops becomes psychology↔observatory). Different
   participant pairs warrant different sessions.

4. **Turn count** — session exceeds 15 turns. Long sessions almost
   always contain multiple topics. Check whether turns 1-5 and turns
   10-15 discuss the same subject.

**When drift detected:**

1. Flag in /sync output: `Session drift: {session} — {reason}`
2. Recommend split: identify the natural topic boundaries and propose
   new session names for each thread
3. Do NOT auto-split — surface for user review (T3 substance gate)
4. For new outbound messages on a drifted topic: create a new session
   with an accurate name rather than appending to the drifted session

**Output addition:**

```
  Session drift detected: {count} sessions
    - {session}: {reason} — recommend split into {proposed sessions}
```

If no drift: omit this line (don't add noise for clean sessions).

### Phase 3: Process Each Item

#### For a new transport message:

1. Read the message JSON
2. **Dual-write (SL-2):** Index the message in state.db:
   ```bash
   python scripts/dual_write.py transport-message \
     --session "{session_name}" --filename "{filename}" \
     --turn {turn} --type "{message_type}" \
     --from-agent "{from.agent_id}" --to-agent "{to.agent_id}" \
     --timestamp "{timestamp}" --subject "{subject}" \
     --claims-count {len(claims)} --setl {setl} --urgency "{urgency}"
   ```
3. Classify: ACK, request, review, notification, session-close
4. Determine if a response is needed:
   - Check `ack_required` field. If `true`, an ACK MUST be written.
   - If `ack_required` is `false` or absent, skip ACK — the `mark-processed`
     dual-write serves as processing confirmation.
5. If substantive response needed: draft it (but MUST NOT send without user
   confirmation for substance decisions; process decisions MAY proceed autonomously)
6. If `ack_required: true` and no substantive response: write a minimal ACK
7. **Gate resolution check:** If this inbound message responds to a gated
   outbound message (check `in_response_to` against active gates):
   ```bash
   # Check if the response resolves a waiting gate
   python scripts/dual_write.py gate-status --agent-id psychology-agent
   # If match found (same session + responding agent matches gate's receiving_agent):
   python scripts/dual_write.py gate-resolve \
     --gate-id "{matching_gate_id}" --resolved-by "{inbound_filename}"
   ```
   The gate resolution check runs automatically — no user confirmation needed
   (process decision, not substance).
8. **Efference copy comparison:** If this inbound message's `in_response_to`
   field references an outbound message we sent, check whether a prediction
   exists and compare:
   ```bash
   python3 scripts/efference-copy.py compare \
     --session "{session_name}" \
     --outbound "{in_response_to filename}" \
     --inbound "{current_inbound_filename}" \
     --actual "{1-sentence summary of response disposition}"
   ```
   Skip if no prediction exists for that outbound message (the script handles
   gracefully). Match results feed the prediction_ledger for /retrospect analysis
   and the crystallized sync triage surprise modifier.
9. **Dual-write (SL-2):** After processing, mark as processed:
   ```bash
   python scripts/dual_write.py mark-processed --session "{session_name}" --filename "{filename}"
   ```

#### For an inbound PR:

1. `gh pr diff {N} --repo safety-quotient-lab/psychology-agent`
2. Summarize: transport message, code change, or documentation update?
3. Surface to user with merge recommendation
4. If user approves: `gh pr merge {N} --merge` then `git pull`

### Phase 4: Write ACK Messages (interagent/v1)

Template — adapt per message:

```json
{
  "schema": "interagent/v1",
  "session_id": "{session-id}",
  "turn": "{N}",
  "timestamp": "{ISO-8601}",
  "message_type": "ack | review | request | notification | session-close",
  "in_response_to": "{filename}",
  "from": {
    "agent_id": "psychology-agent",
    "role": "psychology-agent",
    "instance": "Claude Code (Opus 4.6), macOS arm64",
    "schemas_supported": ["interagent/v1", "command-request/v1", "local-coordination/v1"],
    "discovery_url": "https://psychology-agent.safety-quotient.dev/.well-known/agent-card.json"
  },
  "to": {
    "agent_id": "{peer-agent-id}",
    "discovery_url": "{peer-discovery-url or null}"
  },
  "content": { },
  "claims": [],
  "action_gate": {
    "gate_condition": "none",
    "gate_status": "open"
  },
  "ack_required": false,
  "urgency": "normal",
  "setl": 0.0,
  "epistemic_flags": []
}
```

**SETL guidance:**
- 0.00–0.02: Direct observation, exact quotes
- 0.03–0.07: Minor inference, high confidence
- 0.08–0.15: Moderate inference or domain boundary
- 0.16+: Significant interpretation required

**Gate field (gated autonomous chains):**

When drafting an outbound message that blocks on the receiver's response,
add the `gate` field to the message JSON:

```json
"gate": {
  "gate_id": "{topic}-gate-{YYYYMMDD}",
  "blocks_until": "response",
  "timeout_minutes": 60,
  "fallback_action": "continue-without-response",
  "priority": "gated"
}
```

After writing the message file, register the gate in state.db:
```bash
python scripts/dual_write.py gate-open \
  --gate-id "{gate_id}" \
  --sending-agent psychology-agent \
  --receiving-agent "{peer-agent-id}" \
  --session "{session}" \
  --filename "{outbound_filename}" \
  --blocks-until response \
  --timeout-minutes 60 \
  --fallback-action continue-without-response
```

`blocks_until` values: `response` (any reply clears), `ack` (ACK clears),
`specific-turn` (named turn clears). `fallback_action` values:
`continue-without-response`, `retry-once`, `halt-and-escalate`.

Gate-aware polling (L2) activates automatically when active gates exist in
state.db — `autonomous-sync.sh` accelerates to 60-second intervals. No-op
polls cost 0 autonomy budget credits. Full spec: `docs/gated-chains-spec.md`.

### Phase 4b: Deliver to Target Repo

**Every outbound message MUST be delivered to the target agent's repo.**
Writing `from-psychology-agent-*.json` in our own repo does not constitute
delivery. The target agent's autonomous sync fetches from *their own* repo,
not ours.

**Delivery methods (ordered by preference):**

**Method 1: Git-PR delivery (persistent, auditable)**

```bash
./scripts/deliver-to-peer.sh {target-agent-id} {session-id} \
  transport/sessions/{session}/{outbound-filename} {short-label}
```

The script: resolves target repo from `agent-registry.json`, clones to
`/tmp`, creates branch `psychology-agent/{session}/t{turn}-{label}`,
writes message as `to-psychology-agent-{NNN}.json` in the target repo,
commits, pushes, opens PR, cleans up.

**Method 2: HTTP POST (real-time, ephemeral)**

```bash
curl -X POST https://{target-agent}.safety-quotient.dev/api/messages/inbound \
  -H "Content-Type: application/json" \
  -d @transport/sessions/{session}/{outbound-filename}
```

All 5 agents have this endpoint operational. Useful for urgent delivery.
Does not create a durable git record unless the target agent commits the
received message.

**Anti-pattern:** Writing `from-{our-id}-*.json` ONLY in our own repo and
expecting the target to find it via cross-repo fetch. The fetcher operates
as a safety net, not the primary delivery mechanism.

**When to use which:**
- Substance messages (proposals, reviews, requests): Git-PR (Method 1)
- Urgent notifications, heartbeats, status signals: HTTP POST (Method 2)
- ACKs with `ack_required: false`: either method; prefer HTTP for speed

### Phase 5: Update State

1. **Dual-write (SL-2):** Index any outbound ACKs/messages written this cycle:
   ```bash
   python scripts/dual_write.py transport-message \
     --session "{session}" --filename "{outbound_filename}" \
     --turn {turn} --type "{type}" \
     --from-agent psychology-agent --to-agent "{target}" \
     --timestamp "{timestamp}" --subject "{subject}"
   ```
2. **Efference copy prediction:** For each outbound message that expects a
   response (requests, proposals, reviews — not ACKs), record a prediction:
   ```bash
   python3 scripts/efference-copy.py predict \
     --session "{session}" --outbound "{outbound_filename}" \
     --expected-type "{ack|response|review}" \
     --expected-agent "{target_agent_id}" \
     --prediction "{1-sentence expected response summary}"
   ```
   This completes the forward model: every outbound message carries an
   expectation that /sync Phase 3 step 8 compares against actual responses.
3. **Regenerate MANIFEST.json** — auto-generated from state.db (pending only):
   ```bash
   python scripts/generate_manifest.py
   ```
   MANIFEST.json is a thin, git-transportable addressing file for peer agents.
   Completed message history lives in state.db (queryable) and git history
   (auditable). Do NOT manually edit MANIFEST.json — always regenerate.
4. **agent-card.json** — update `active_sessions` if sessions opened or closed
5. **agent-registry.json** — update `active_sessions` for agents if changed
6. **Deliver outbound messages** — for each message written this cycle,
   deliver to the target repo via Phase 4b (git-PR or HTTP POST).
   Delivery happens AFTER local commit so the source file exists in our
   git history regardless of delivery outcome.
7. **Git** — stage, commit, push:

```bash
git add transport/ .well-known/agent-card.json
git commit -m "sync: {summary}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

## What /sync Does NOT Do

- **Auto-merge PRs** — surfaces with recommendation; user decides
- **Auto-send outbound messages** — drafts and surfaces; user confirms
- **Manually edit MANIFEST.json** — always regenerate via `generate_manifest.py`
- **Cache peer agent cards** — reads on demand, does not maintain a local cache
- **Manage proposals inbox** — psychology-agent does not use `.claude/proposals/`
- **Run /cycle** — /sync updates transport state only; documentation
  propagation remains /cycle's job

---

## Output Format

```
/sync complete
  Scope: {all | psq | unratified}
  Registry: {loaded | fallback (registry missing/malformed)}
  Fetched: {git fetch summary}
  Inbound messages: {count} new | none
    - {session}/{filename}: {type} from {agent} — {1-line summary}
  Inbound PRs: #{N} {title} | none
  Outbound scan:
    - {agent}: {content domain} — {summary} [draft ready | no active session]
  ACKs written: {session}/{filename} | none
  Delivered to peers:
    - {target-agent}: {session}/{filename} via {PR #{N} | HTTP POST}
      Expected response: {ETA}
    | none
  MANIFEST regenerated: {yes — N pending | no changes}
  Sessions opened/closed: {session-id} | none
  Dual-write: {N indexed, M marked processed | skipped (no state.db)}
  Gates: {N active (gate-ids) | N resolved this cycle | none}
  No new activity: true/false
  Next expected: {what we await from each peer}
```

**Peer response ETA derivation:**

ETAs accompany each delivered message. Derive them from the peer's processing model:

| Peer type | ETA | Rationale |
|-----------|-----|-----------|
| Autonomous agent (e.g., safety-quotient-agent, operations-agent) | ~8 min (sync cycle interval) | Cron-driven `autonomous-sync.sh` runs on a fixed interval |
| Human-mediated agent (e.g., unratified-agent, observatory-agent) | Next human session (~24-48h) | Processing requires a human operator to start a session |
| Gated message (`gate.timeout_minutes` set) | Timeout value from gate spec | The gate's `timeout_minutes` field provides the upper bound |

When historical response latency data exists in state.db, prefer the observed
median over the default estimate.

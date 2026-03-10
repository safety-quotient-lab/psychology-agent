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
| `psq` | Only psq-agent (sub-agent, same repo) |
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
| psq-agent | Sub-agent (PSQ scoring) | safety-quotient-lab/safety-quotient | Cross-repo fetch (`git show safety-quotient/main:...`) |
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

For each new message found, read the full content via:
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
`domain: "cogarch" → route_to: ["psq-agent"]` fires because psq-agent
has a cogarch mirror directive active. /sync drafts a notification
message for psq-agent and surfaces it to the user.

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
7. **Dual-write (SL-2):** After processing, mark as processed:
   ```bash
   python scripts/dual_write.py mark-processed --filename "{filename}"
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
    "discovery_url": "https://psychology-agent.unratified.org/.well-known/agent-card.json"
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

### Phase 5: Update State

1. **Dual-write (SL-2):** Index any outbound ACKs/messages written this cycle:
   ```bash
   python scripts/dual_write.py transport-message \
     --session "{session}" --filename "{outbound_filename}" \
     --turn {turn} --type "{type}" \
     --from-agent psychology-agent --to-agent "{target}" \
     --timestamp "{timestamp}" --subject "{subject}"
   ```
2. **Regenerate MANIFEST.json** — auto-generated from state.db (pending only):
   ```bash
   python scripts/generate_manifest.py
   ```
   MANIFEST.json is a thin, git-transportable addressing file for peer agents.
   Completed message history lives in state.db (queryable) and git history
   (auditable). Do NOT manually edit MANIFEST.json — always regenerate.
3. **agent-card.json** — update `active_sessions` if sessions opened or closed
4. **agent-registry.json** — update `active_sessions` for agents if changed
5. **Git** — stage, commit, push:

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
- **Deliver via PR to peer repos** — psychology-agent uses its own repo as
  the transport hub. Peers fetch from here
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
  MANIFEST regenerated: {yes — N pending | no changes}
  Sessions opened/closed: {session-id} | none
  Dual-write: {N indexed, M marked processed | skipped (no state.db)}
  No new activity: true/false
  Next expected: {what we await from each peer}
```

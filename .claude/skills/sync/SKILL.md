---
name: sync
description: Inter-agent mesh synchronization — scan transport sessions for new messages, check peer repos, write ACKs, update MANIFEST, report changes.
user-invocable: true
argument-hint: "[psq | unratified | all (default)]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# /sync — Inter-Agent Mesh Synchronization

Scan transport sessions for inbound messages, check peer repos for new
activity, write ACKs, update MANIFEST.json, and report what changed.

## When to Invoke

- Start of session (fast check for new activity)
- After sending a transport message and expecting a response
- When the user says "sync," "check agents," or "anything new?"
- Before writing new inter-agent messages (ensures latest state)

## Arguments

Parse `$ARGUMENTS` to determine scope:

| Argument | Scope |
|----------|-------|
| *(empty)* or `all` | Full sweep — all peers + sub-agents |
| `psq` | Only psq-agent (sub-agent, same repo) |
| `unratified` | Only unratified-agent (peer, separate repo) |

---

## Peer Registry

| Agent | Role | Repo | Transport |
|-------|------|------|-----------|
| unratified-agent | Peer (blog platform, consumer) | safety-quotient-lab/unratified | PRs to our repo; their transport in their repo |
| psq-agent | Sub-agent (PSQ scoring) | Same repo (safety-quotient-lab/psychology-agent) | `transport/sessions/` — shared repo, separate session dirs |

**Local clones (if needed for outbound delivery):**
- unratified: not cloned by default; use `gh` API for read-only checks

---

## Protocol

### Phase 1: Inbound Scan

**1a. Local transport (same repo — covers psq-agent + any peer PRs already merged):**

```bash
# New messages since last known state
git fetch origin
git log HEAD..origin/main --oneline
```

Scan transport sessions for unread messages:
```bash
ls -t transport/sessions/*/from-*.json
```

Compare against MANIFEST.json `recently_completed` — any file not listed
there and not authored by psychology-agent represents a new inbound message.

**1b. Peer repo activity (unratified-agent):**

```bash
# Check for PRs targeting our repo
gh pr list --repo safety-quotient-lab/psychology-agent --json number,title,headRefName,author

# Check their repo for commits mentioning us
gh api repos/safety-quotient-lab/unratified/commits \
  --jq '.[0:5] | .[] | {sha: .sha[0:7], message: .commit.message[0:72]}'
```

**1c. Local-coordination check (parallel instances):**

```bash
ls transport/sessions/local-coordination/
```

Check for messages from parallel psychology-agent instances that may have
landed since last sync.

### Phase 2: Triage

For each inbound item, classify:

| Type | Source | Action |
|------|--------|--------|
| New transport message | `from-{agent}-{NNN}.json` | Read → assess → respond or flag |
| Open PR on our repo | Peer agent branch | Read diff → assess → merge or flag |
| New commit on main (after pull) | Peer or sub-agent | Read changed files → process |
| No new activity | — | Report "no new activity" and stop |

**Do NOT auto-merge PRs.** Surface them for user review with a summary of
what the PR contains. The user decides merge/reject.

**Do NOT auto-accept proposals.** Psychology-agent reviews substance
decisions (T3) — surface with recommendation.

### Phase 3: Process Each Item

#### For a new transport message:

1. Read the message JSON
2. Classify: ACK, request, review, notification, session-close
3. Determine if a response is needed
4. If response needed: draft it (but do not send without user confirmation
   for substance decisions; process decisions can proceed autonomously)
5. If ACK only: write the ACK

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

1. **MANIFEST.json** — move processed messages from implicit "pending" to
   `recently_completed`; add new outbound to `pending` for the target agent
2. **agent-card.json** — update `active_sessions` if sessions opened or closed
3. **Git** — stage, commit, push:

```bash
git add transport/ .well-known/agent-card.json
git commit -m "sync: {summary}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

## What /sync Does NOT Do

- **Auto-merge PRs** — surfaces with recommendation; user decides
- **Cache peer agent cards** — reads on demand, does not maintain a local cache
- **Deliver via PR to peer repos** — psychology-agent uses its own repo as
  the transport hub. Peers fetch from here. If outbound delivery to a peer
  repo becomes necessary, do it manually (not a /sync default)
- **Manage proposals inbox** — psychology-agent does not use `.claude/proposals/`
- **Run /cycle** — /sync updates transport state only; documentation
  propagation remains /cycle's job

---

## Output Format

```
/sync complete
  Scope: {all | psq | unratified}
  Fetched: {git fetch summary}
  Inbound messages: {count} new | none
    - {session}/{filename}: {type} from {agent} — {1-line summary}
  Inbound PRs: #{N} {title} | none
  ACKs written: {session}/{filename} | none
  MANIFEST updated: {yes — summary | no changes}
  Sessions opened/closed: {session-id} | none
  No new activity: true/false
  Next expected: {what we await from each peer}
```

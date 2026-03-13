---
name: sync
description: Inter-agent mesh synchronization — scan transport sessions for new messages, check peer repos, write ACKs, update MANIFEST, report changes.
user-invocable: true
argument-hint: "[all | quick | parallel]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, WebFetch
---

# /sync — Inter-Agent Mesh Synchronization

Scan transport sessions for inbound messages, check peer repos for new
activity, write ACKs, and report what changed.

## When to Invoke

- Start of session (fast check for new activity)
- After sending a transport message and expecting a response
- When the user says "sync," "check agents," or "anything new?"
- Before writing new inter-agent messages (ensures latest state)

## Arguments

| Argument | Scope |
|----------|-------|
| *(empty)* or `all` | Full sweep — all registered peers |
| `quick` | Skip slow sources (git fetch, remote card checks) |
| `parallel` | Spawn one Agent per peer repo, merge results |

---

## Peer Registry

**Canonical source:** `cogarch.config.json` → `peers.agents`

Read the registry at the start of every /sync invocation. The peers section
defines all known agents, their repos, roles, and card URLs.

| Agent | Role | Repo | Card URL |
|-------|------|------|----------|
| psychology-agent | domain-knowledge-provider | safety-quotient-lab/psychology-agent | psychology-agent.safety-quotient.dev |
| psq-agent | psq-scoring | safety-quotient-lab/safety-quotient | psq-agent.safety-quotient.dev |
| unratified-agent | advocacy-publisher | safety-quotient-lab/unratified | unratified.org |
| observatory-agent | data-observatory | safety-quotient-lab/observatory | observatory.unratified.org |

---

## Protocol

### Phase 0: Pre-flight

```bash
command -v git >/dev/null || echo "FAIL: git not on PATH"
git remote get-url origin >/dev/null 2>&1 || echo "FAIL: git remote unreachable"
[ -f plan.md ] || echo "FAIL: not in project root"
```

If any check fails, report and stop.

### Phase 1: Local State

1. `git status` — uncommitted changes?
2. `git log --oneline -5` — recent commits
3. Read `plan.md` current status — any items unblocked?
4. Read `MEMORY.md` — bootstrap status, pending items

### Phase 2: Inbound Channels

#### 2a. Git remotes
- `git fetch --all --prune` (skip if `quick`)
- `git log HEAD..origin/main --oneline` — new remote commits?
- `gh pr list --state open` — open PRs on our repo?

#### 2b. Transport sessions
Scan `transport/sessions/` for inbound messages:

```bash
ls -t transport/sessions/*/from-*.json 2>/dev/null
```

For each session, check MANIFEST.json for open action gates:
- Read `action_gate.gate_status` in each message
- Messages with `ack_required: true` that lack a response need attention

#### 2c. Peer agent cards (live discovery)

Fetch the compositor's dynamic agent list:
```
GET https://interagent.safety-quotient.dev/.well-known/agents
```

Note any peers newly online/offline since last check.
Flag schema compliance changes.

#### 2d. Compositor health
- Fetch `interagent.safety-quotient.dev` — responding?
- Fetch `operations-agent.safety-quotient.dev/.well-known/agent-card.json` — valid?
- Fetch WebFinger endpoint — resolving?

#### 2e. Cross-repo peer check (skip if `quick`)

For each peer with a local clone in `~/Projects/`:

```bash
cd ~/Projects/{repo-name} && git fetch origin 2>/dev/null && git log HEAD..origin/main --oneline
ls -t transport/sessions/*/to-operations-agent*.json 2>/dev/null | head -3
```

### Phase 3: Triage

For each inbound item, classify:

| Type | Source | Action |
|------|--------|--------|
| New transport message | `from-{agent}-{NNN}.json` | Read → assess → respond or flag |
| Open PR on our repo | Peer agent branch | Read diff → assess → surface to user |
| New commit on main (after pull) | Peer | Read changed files → process |
| No new activity | — | Report "no new activity" |

**MUST NOT auto-merge PRs.** Surface with recommendation; user decides.

**MUST NOT auto-accept proposals.** Surface substance decisions (T3) with
recommendation.

### Phase 4: Process Each Item

#### For a new transport message:

1. Read the message JSON
2. Classify: ACK, request, review, notification, proposal, session-close
3. Determine if response needed:
   - Check `ack_required` field
   - Check `action_gate` — does this message open a gate we need to resolve?
4. If substantive response needed: draft it (surface to user for confirmation)
5. If `ack_required: true` and no substantive response: write a minimal ACK

#### For an inbound PR:

1. `gh pr diff {N}`
2. Summarize: transport message, code change, or documentation?
3. Surface to user with merge recommendation

### Phase 5: Write Responses (interagent/v1)

Template — adapt per message:

```json
{
  "schema": "interagent/v1",
  "session_id": "{session-id}",
  "turn": "{N}",
  "timestamp": "{ISO-8601}",
  "message_type": "ack | review | request | notification | proposal",
  "in_response_to": "{filename}",
  "from": {
    "agent_id": "operations-agent",
    "role": "operations",
    "instance": "Claude Code (Opus 4.6), macOS Darwin",
    "schemas_supported": ["interagent/v1"],
    "discovery_url": "https://operations-agent.safety-quotient.dev/.well-known/agent-card.json"
  },
  "to": {
    "agent_id": "{peer-agent-id}",
    "discovery_url": "{peer-discovery-url or null}"
  },
  "transport": {
    "method": "git-PR",
    "repo": "https://github.com/safety-quotient-lab/operations-agent",
    "sessions_path": "transport/sessions/",
    "persistence": "persistent"
  },
  "subject": "{subject}",
  "urgency": "normal",
  "setl": 0.0,
  "body": { },
  "action_gate": {
    "gate_condition": "none",
    "gate_status": "open"
  },
  "ack_required": false,
  "epistemic_flags": []
}
```

**SETL guidance:**
- 0.00–0.02: Direct observation, exact quotes
- 0.03–0.07: Minor inference, high confidence
- 0.08–0.15: Moderate inference or domain boundary
- 0.16+: Significant interpretation required

### Phase 6: Update State

1. Update MANIFEST.json in the session directory if messages were added
2. Update `plan.md` if sync revealed unblocked items or new work
3. Git — stage, commit, push:

```bash
git add transport/ .well-known/
git commit -m "sync: {summary}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

## What /sync Does NOT Do

- **Auto-merge PRs** — surfaces with recommendation; user decides
- **Auto-send outbound messages** — drafts and surfaces; user confirms
- **Run /cycle** — /sync updates transport state only
- **Fix compositor issues** — reports them; resolution via separate task

---

## Parallel Mode

When invoked with `parallel`, use the Agent tool to scan peer repos concurrently.

Spawn one Agent per peer repo, all in a single message (parallel launch).
Each agent checks for sync-relevant activity (new commits, transport
messages addressed to operations-agent). Use `subagent_type: "Explore"`.

Collect all results. Merge into a single unified report.

---

## Output Format

```
/sync complete
  Scope: {all | quick | parallel}
  Fetched: {git fetch summary}
  Inbound messages: {count} new | none
    - {session}/{filename}: {type} from {agent} — {1-line summary}
  Inbound PRs: #{N} {title} | none
  Open gates: {gate_id — condition} | none
  Compositor: {live | down}
  Agent card: {valid | invalid}
  WebFinger: {valid | invalid}
  Peers online: {N}/{total}
  ACKs written: {session}/{filename} | none
  No new activity: true/false
  Next expected: {what we await from each peer}
```

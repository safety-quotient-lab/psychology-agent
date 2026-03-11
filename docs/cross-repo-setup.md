# Cross-Repo Transport Setup Guide

How to connect a new agent instance to the psychology-agent mesh via
git remote fetch transport.

**Audience:** Anyone deploying a sub-agent (e.g., psq-agent) on a separate
machine and repo who wants bidirectional transport with psychology-agent.

**Prerequisites:**
- The sub-agent repo has transport infrastructure (PR #2-equivalent merged)
- SSH access between machines (for L3 wake-up signals, optional)
- Git SSH keys configured for both repos on both machines


---


## Variables

Replace these placeholders with your values throughout:

| Variable | Meaning | Example |
|----------|---------|---------|
| `$AGENT_REPO` | Absolute path to the sub-agent repo | `/home/user/projects/safety-quotient` |
| `$AGENT_ID` | Agent identifier from `.agent-identity.json.example` | `psq-agent` |
| `$PEER_REMOTE` | Git remote name for the peer (psychology-agent) | `psychology-agent` |
| `$PEER_REPO_URL` | Git SSH URL of the peer repo | `git@github.com:org/psychology-agent.git` |
| `$PEER_HOST` | SSH hostname of the peer machine (for L3 wake-up) | `peer-machine.local` |


---


## Step 1: Create Agent Identity

```bash
cd $AGENT_REPO
cp .agent-identity.json.example .agent-identity.json
```

Edit `.agent-identity.json` to match your machine:

```json
{
  "agent_id": "$AGENT_ID",
  "hostname": "$(hostname)",
  "platform": "$(uname -s | tr A-Z a-z)-$(uname -m)",
  "capabilities": ["psq-scoring", "model-training", "calibration", "transport"]
}
```

This file stays gitignored — each machine has its own identity.


---


## Step 2: Add Peer Git Remote

```bash
cd $AGENT_REPO
git remote add $PEER_REMOTE $PEER_REPO_URL
```

Verify the remote reads transport files:

```bash
git fetch $PEER_REMOTE main
git show $PEER_REMOTE/main:transport/MANIFEST.json | head -5
```

Expected: the peer's MANIFEST.json content. If this fails, check SSH key
configuration for the peer repo.


---


## Step 3: Bootstrap State Database

```bash
cd $AGENT_REPO
python3 scripts/bootstrap_transport_db.py --force
```

Expected output: schema applied, autonomy budget initialized, transport messages
indexed. Verify:

```bash
sqlite3 state.db "SELECT COUNT(*) FROM transport_messages; SELECT budget_current FROM autonomy_budget;"
```

Should show message count > 0 and budget = 20.


---


## Step 4: Configure Git Hooks

```bash
cd $AGENT_REPO
git config core.hooksPath .githooks
```

Verify:

```bash
git config core.hooksPath
# Expected: .githooks
ls .githooks/
# Expected: pre-commit
```

The pre-commit hook prevents autonomous commits from leaking secrets or
writing to out-of-scope files.


---


## Step 5: Install Cron

```bash
cd $AGENT_REPO
chmod +x scripts/autonomous-sync.sh scripts/ensure-cron.sh
bash scripts/ensure-cron.sh
```

Verify:

```bash
crontab -l | grep autonomous
# Expected: */5 * * * * $AGENT_REPO/scripts/autonomous-sync.sh >> /tmp/autonomous-sync.log 2>&1
```

The cron runs every 5 minutes. On the first run, it will:
1. Emit a heartbeat
2. Check trust budget (20 credits)
3. Check interval spacing (300s default)
4. Fetch cross-repo inbound messages
5. Generate orientation payload
6. Run `/sync` via `claude -p`
7. Push any changes

**Note:** The first cron invocation requires the `claude` CLI available in
the cron environment's PATH. If `claude` installs to a user-local path
(e.g., `~/.local/bin/claude`), ensure the cron entry includes the full path
or sources the user's profile.


---


## Verification

Run the full verification in one command:

```bash
cd $AGENT_REPO

echo "=== Identity ==="
python3 -c "import json; d=json.load(open('.agent-identity.json')); print(d['agent_id'], d['hostname'], d['platform'])"

echo "=== Remotes ==="
git remote -v

echo "=== state.db ==="
sqlite3 state.db "SELECT COUNT(*) || ' messages' FROM transport_messages; SELECT 'budget: ' || budget_current FROM autonomy_budget WHERE agent_id='$AGENT_ID';"

echo "=== Hooks ==="
git config core.hooksPath

echo "=== Cron ==="
crontab -l 2>/dev/null | grep autonomous
```

All 5 sections should produce output. If any section fails, re-run the
corresponding step above.


---


## Reverse Direction Setup

The peer agent (psychology-agent) also needs a git remote pointing to
this agent's repo. On the peer machine:

```bash
cd $PEER_REPO
git remote add $AGENT_ID $AGENT_REPO_URL
git fetch $AGENT_ID main
git show $AGENT_ID/main:transport/MANIFEST.json | head -5
```

Both agents must have remotes pointing at each other for bidirectional
transport.


---


## Optional: L3 Wake-Up Signal

For gated autonomous chains (see `docs/gated-chains-spec.md`), agents can
send SSH wake-up signals to accelerate message delivery:

```bash
# From the sending agent's machine:
ssh $PEER_HOST "touch /tmp/sync-wake-$PEER_AGENT_ID"
```

The receiving agent's next `autonomous-sync.sh` cycle detects the wake file
and enters accelerated polling mode.

**Requirements:** SSH key-based authentication between machines (no password
prompts). Test with:

```bash
ssh $PEER_HOST "echo ok"
```

If this requires a password, configure SSH keys first.


---


## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `git fetch` fails | SSH key not configured for peer repo | Add deploy key or personal SSH key |
| `bootstrap_transport_db.py` errors | Missing schema file | Verify `scripts/schema_transport.sql` exists |
| Cron doesn't fire | `claude` not in cron PATH | Use full path in cron entry |
| Autonomy budget shows 0 | Budget exhausted from prior runs | `python3 scripts/autonomy-budget.py reset` |
| No messages indexed | No transport session files | Check `transport/sessions/` directory |


---


## Security Notes

- `.agent-identity.json` stays gitignored — never commit machine-local identity
- `state.db` stays gitignored — contains machine-specific operational state
- The pre-commit hook scans for secrets before every commit
- The `AUTONOMOUS_AGENT` env var signals the pre-commit hook to enforce the
  autonomous agent file allowlist (only `transport/`, `.well-known/`, `state.db`
  may change during autonomous operation)

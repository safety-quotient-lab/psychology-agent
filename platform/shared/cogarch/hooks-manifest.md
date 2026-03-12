# Hook Manifest — Agent Standup Reference

Which hooks every agent needs, which identity values to replace, and which
hooks to skip based on agent scope.

Source hooks live in the psychology-agent repo at `.claude/hooks/`. Copy them
to the new agent's `.claude/hooks/` directory and replace identity values.

---

## Infrastructure Hooks (every agent)

These enforce cogarch triggers mechanically. Copy all of them.

| Hook | Event | Trigger | Purpose |
|------|-------|---------|---------|
| `session-start-orient.sh` | Notification | T1 | Load orientation payload, fire T1, set statusline |
| `session-end-check.sh` | Notification | T5 | Log session summary, check uncommitted changes |
| `tool-failure-halt.sh` | PostToolUse | — | Halt after 3 consecutive tool failures |
| `tool-failure-reset.sh` | PostToolUse | — | Reset failure counter on success |
| `write-provenance.sh` | PostToolUse | T4 | Remind T4 checks after critical file writes |
| `pre-compact-persist.sh` | Notification | T2 | Persist state before context compaction |
| `context-pressure-gate.sh` | PreToolUse | T2 | Warn at 60% context, block at 90% |
| `context-pressure-statusline.sh` | PostToolUse | T2 | Update statusline with context usage |
| `instructions-health.sh` | PostToolUse | T1 | Verify CLAUDE.md + cogarch file health |
| `external-action-gate.sh` | PreToolUse | T16 | Gate GitHub and transport write operations |
| `pushback-accumulator.sh` | PostToolUse | T6 | Track pushback frequency per topic |

## Application Hooks (configure per agent)

These enforce application-layer conventions. Include based on agent scope.

| Hook | Event | Trigger | When to include |
|------|-------|---------|-----------------|
| `subagent-audit.sh` | PostToolUse | T3 | Agent runs sub-agents |
| `subproject-boundary.sh` | PostToolUse | T3 | Agent has sub-project directories |
| `stop-completion-gate.sh` | PreToolUse | T5 | Agent uses transport MANIFEST |
| `engineering-incident-detect.sh` | PostToolUse | — | Agent wants incident tracking |
| `config-drift-detector.sh` | PostToolUse | T11 | Agent uses cogarch.config.json |
| `memory-structure-validate.sh` | PostToolUse | T9 | Agent uses structured memory topic files |
| `task-completed-route.sh` | PostToolUse | T8 | Agent uses TODO.md task tracking |

## Debug Hook

| Hook | Event | Purpose |
|------|-------|---------|
| `_debug.sh` | PostToolUse | Development-only debug logging |

---

## Identity Values to Replace

After copying hooks, run this replacement in the new agent's `.claude/hooks/`:

```bash
# Replace agent ID in temp file paths and arguments
sed -i 's/psychology-agent/{AGENT_ID}/g' .claude/hooks/*.sh

# Verify no stale references remain
grep -l 'psychology-agent' .claude/hooks/*.sh
```

**Paths that change:**
- `/tmp/psychology-agent-consecutive-failures` → `/tmp/{AGENT_ID}-consecutive-failures`
- `/tmp/psychology-agent-session-log.jsonl` → `/tmp/{AGENT_ID}-session-log.jsonl`
- `/tmp/psychology-agent-config-drift.jsonl` → `/tmp/{AGENT_ID}-config-drift.jsonl`
- `/tmp/psychology-agent-subagent-audit.jsonl` → `/tmp/{AGENT_ID}-subagent-audit.jsonl`
- `/tmp/psychology-agent-completed-tasks.jsonl` → `/tmp/{AGENT_ID}-completed-tasks.jsonl`

---

## settings.json Registration

After copying hooks, register them in `.claude/settings.json` under the
`hooks` object. Each hook maps to a Claude Code event type:

- `PreToolUse` — fires before a tool executes (can block)
- `PostToolUse` — fires after a tool executes (observe + log)
- `Notification` — fires on session events (start, end, compact)

See `.claude/settings.json` in the psychology-agent repo for the full
registration format. Copy the `hooks` section and verify each script path
resolves correctly.

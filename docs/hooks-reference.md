# Platform Hooks Reference

14 hook events (17 active scripts) enforce cogarch mechanically. Scripts live
in `.claude/hooks/`. (Parry hooks removed as diagnostic — see #32596.)

| Hook | Event | Purpose |
|------|-------|---------|
| ~~parry-wrapper.sh~~ | ~~Pre/PostToolUse, UserPromptSubmit~~ | ~~Injection/credential defense~~ (removed as diagnostic — #32596) |
| T4 reminder | PostToolUse: Write/Edit | Critical file compliance |
| write-provenance.sh | PostToolUse | Provenance trail (write-log.jsonl) |
| subproject-boundary.sh | PreToolUse: Write/Edit | Cross-project write warning |
| external-action-gate.sh | PreToolUse: Bash | T16 gate for gh commands |
| context-pressure-gate.sh | PreToolUse | Context window pressure check |
| pushback-accumulator.sh | UserPromptSubmit | Structural disagreement (>=3) |
| session-start-orient.sh | SessionStart | T1 orientation context |
| pre-compact-persist.sh | PreCompact | Persist state before compaction |
| memory-structure-validate.sh | PostToolUse: Write/Edit | Memory file format enforcement |
| stop-completion-gate.sh | Stop | Uncommitted changes warning |
| tool-failure-halt.sh | PostToolUseFailure | Consecutive failure detection (>=3 halts) |
| tool-failure-reset.sh | PostToolUse | Resets failure counter on success |
| subagent-audit.sh | SubagentStart/Stop | Sub-agent audit trail + budget (15 max) |
| session-end-check.sh | SessionEnd | Uncommitted work detector + session logger |
| instructions-health.sh | InstructionsLoaded | CLAUDE.md validation + glob rule report |
| task-completed-route.sh | TaskCompleted | Routes completed tasks for /cycle pickup |
| config-drift-detector.sh | ConfigChange | Settings modification alert |
| context-pressure-statusline.sh | Notification | Status line context pressure display |

Parry provides defense-in-depth when active — currently disabled as diagnostic
(#32596). Scripts remain on disk; see BOOTSTRAP.md for re-installation.

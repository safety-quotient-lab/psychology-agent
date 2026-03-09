#!/usr/bin/env bash
# SubagentStart/SubagentStop hook — audit trail for sub-agent invocations.
# Logs to /tmp/psychology-agent-subagent-audit.jsonl.

AUDIT_FILE="/tmp/psychology-agent-subagent-audit.jsonl"
EVENT="${HOOK_EVENT:-unknown}"
TIMESTAMP=$(date -Iseconds)
DESCRIPTION="${TOOL_INPUT_description:-}"
SUBAGENT_TYPE="${TOOL_INPUT_subagent_type:-general-purpose}"

# Count active sub-agents for budget check
BUDGET_FILE="/tmp/psychology-agent-subagent-count"
if [ ! -f "$BUDGET_FILE" ]; then
  echo "0" > "$BUDGET_FILE"
fi

COUNT=$(cat "$BUDGET_FILE")
MAX_SUBAGENTS=15

if [ "$EVENT" = "SubagentStart" ]; then
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$BUDGET_FILE"
  echo "{\"event\":\"start\",\"timestamp\":\"${TIMESTAMP}\",\"type\":\"${SUBAGENT_TYPE}\",\"description\":\"${DESCRIPTION}\",\"active_count\":${COUNT}}" >> "$AUDIT_FILE"
  if [ "$COUNT" -ge "$MAX_SUBAGENTS" ]; then
    echo "[HOOK] ⚠ Sub-agent budget: ${COUNT}/${MAX_SUBAGENTS} invocations this session. Consider whether additional sub-agents add value."
  fi
elif [ "$EVENT" = "SubagentStop" ]; then
  COUNT=$((COUNT > 0 ? COUNT - 1 : 0))
  echo "$COUNT" > "$BUDGET_FILE"
  echo "{\"event\":\"stop\",\"timestamp\":\"${TIMESTAMP}\",\"type\":\"${SUBAGENT_TYPE}\",\"description\":\"${DESCRIPTION}\",\"active_count\":${COUNT}}" >> "$AUDIT_FILE"
fi

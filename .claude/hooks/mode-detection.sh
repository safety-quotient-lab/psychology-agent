#!/bin/bash
# PreToolUse hook: task-type detection for trigger tiering.
#
# Classifies the current task as mechanical/analytical/creative from
# user message context. Sets /tmp/{agent-id}-task-mode for trigger
# tiering to read.
#
# Brain architecture: Prefrontal cortex executive control (Gap 2)
# Working memory spec §5: task-type detection for attention allocation
# Wu wei stage: 3 (hook — mechanical enforcement)

# Only fire on significant tool calls
TOOL="$TOOL_NAME"
case "$TOOL" in
    Write|Edit|Bash|Agent) ;;
    *) exit 0 ;;
esac

# Detect agent ID from identity file or default
AGENT_ID="psychology-agent"
if [ -f ".agent-identity.json" ]; then
    AGENT_ID=$(python3 -c "import json; print(json.load(open('.agent-identity.json')).get('agent_id', 'psychology-agent'))" 2>/dev/null || echo "psychology-agent")
fi

MODE_FILE="/tmp/${AGENT_ID}-task-mode"

# If mode already detected this session, skip (one detection per session)
if [ -f "${MODE_FILE}" ]; then
    exit 0
fi

# Classify from recent user input (CLAUDE_USER_MESSAGE env var if available)
# Fallback: check the tool context for classification signals
USER_MSG="${CLAUDE_USER_MESSAGE:-}"

if [ -n "$USER_MSG" ]; then
    # Mechanical: code, commit, file operations, formatting
    if echo "$USER_MSG" | grep -qiE '(commit|push|deploy|rename|move|delete|format|lint|fix typo|chmod|mkdir)'; then
        echo "mechanical" > "${MODE_FILE}"
        exit 0
    fi

    # Creative: brainstorm, explore, ideate, draft
    if echo "$USER_MSG" | grep -qiE '(brainstorm|explore|what if|ideas|draft|imagine|speculate|could we|design)'; then
        echo "creative" > "${MODE_FILE}"
        exit 0
    fi

    # Analytical: evaluate, analyze, recommend, compare, assess
    if echo "$USER_MSG" | grep -qiE '(evaluat|analy[sz]|recommend|should we|compare|assess|review|audit|diagnos)'; then
        echo "analytical" > "${MODE_FILE}"
        exit 0
    fi
fi

# Default: analytical (safest — runs all advisory checks)
echo "analytical" > "${MODE_FILE}"

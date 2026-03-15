#!/bin/bash
# PostToolUse hook: governance transparency — adjusts governance output
# verbosity based on the current transparency level.
#
# Levels: silent (0), ambient (1), informative (2), explanatory (3), directive (4)
# The mode-detection hook can auto-set the level file.
# Wu wei stage: 3 (hook — mechanical enforcement)

AGENT_ID="psychology-agent"
if [ -f ".agent-identity.json" ]; then
    AGENT_ID=$(python3 -c "import json; print(json.load(open('.agent-identity.json')).get('agent_id', 'psychology-agent'))" 2>/dev/null || echo "psychology-agent")
fi

LEVEL_FILE="/tmp/${AGENT_ID}-transparency-level"
MODE_FILE="/tmp/${AGENT_ID}-task-mode"

# Read level — default ambient (1)
LEVEL="ambient"
if [ -f "$LEVEL_FILE" ]; then
    LEVEL=$(cat "$LEVEL_FILE" 2>/dev/null || echo "ambient")
fi

# Auto-set from mode if level file absent
if [ ! -f "$LEVEL_FILE" ] && [ -f "$MODE_FILE" ]; then
    MODE=$(cat "$MODE_FILE" 2>/dev/null)
    case "$MODE" in
        creative)    LEVEL="silent" ;;
        analytical)  LEVEL="informative" ;;
        mechanical)  LEVEL="ambient" ;;
    esac
fi

case "$LEVEL" in
    silent|0)
        exit 0 ;;
    ambient|1)
        echo "[governance] transparency: ambient — epistemic flags active" ;;
    informative|2)
        echo "[governance] transparency: informative — structured reports with severity" ;;
    explanatory|3)
        echo "[governance] transparency: explanatory — reasoning disclosed for all checks" ;;
    directive|4)
        echo "[governance] transparency: directive — governance drives interaction" ;;
esac

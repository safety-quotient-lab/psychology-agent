#!/usr/bin/env bash
# PostToolUse hook — Photonic layer emitter (Phase 1: local file write).
#
# Emits a ~100-byte processing-state token to a volatile file after each
# tool use. Peers (and the local dashboard) read this file for ambient
# state awareness without consuming the primary communication channel.
#
# Named for biophotons — photons emitted during neural state transitions
# (Tang & Bhatt, 2025; Xu et al., 2024). The token carries processing
# state, not content. Zero persistence cost — file overwrites on each emit.
#
# Spec: docs/brain-architecture-mapping.md §7 (photonic/v1 schema)
# Wu wei stage: 1 (convention — local file, no mesh transport yet)
# Phase 2 (UDP multicast via meshd) requires operations-agent.
source "${BASH_SOURCE[0]%/*}/_debug.sh"

AGENT_ID="${AGENT_ID:-psychology-agent}"
TOKEN_FILE="/tmp/${AGENT_ID}-photonic-state.json"
MODE_FILE="/tmp/${AGENT_ID}-task-mode"
SEQUENCE_FILE="/tmp/${AGENT_ID}-photonic-seq"

# Read current task mode
TASK_MODE="neutral"
if [ -f "$MODE_FILE" ]; then
    TASK_MODE=$(tr -d '[:space:]' < "$MODE_FILE" 2>/dev/null)
fi

# Context pressure (read from statusline file if available)
CONTEXT_PRESSURE="0.0"
PRESSURE_FILE="/tmp/${AGENT_ID}-context-pressure"
if [ -f "$PRESSURE_FILE" ]; then
    CONTEXT_PRESSURE=$(tr -d '[:space:]' < "$PRESSURE_FILE" 2>/dev/null)
fi

# Increment sequence counter
SEQ=0
if [ -f "$SEQUENCE_FILE" ]; then
    SEQ=$(tr -d '[:space:]' < "$SEQUENCE_FILE" 2>/dev/null)
fi
SEQ=$((SEQ + 1))
echo "$SEQ" > "$SEQUENCE_FILE"

# Check if consolidation-pass or state-reconcile running (glymphatic mode)
GLYMPHATIC="false"
if pgrep -f "consolidation-pass.sh" > /dev/null 2>&1 || \
   pgrep -f "state-reconcile.py" > /dev/null 2>&1; then
    GLYMPHATIC="true"
fi

# Check if claude -p subprocess active (deliberation)
DELIBERATION="false"
if pgrep -f "claude.*-p" > /dev/null 2>&1; then
    DELIBERATION="true"
fi

# Emit token (atomic write via temp file + mv)
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')
TOKEN_TMP="${TOKEN_FILE}.tmp"
cat > "$TOKEN_TMP" << EOF
{"schema":"photonic/v1","agent_id":"${AGENT_ID}","task_mode":"${TASK_MODE}","context_pressure":${CONTEXT_PRESSURE},"active_trigger":null,"coherence_state":"post-reduction","session_focus":null,"deliberation_active":${DELIBERATION},"glymphatic_mode":${GLYMPHATIC},"timestamp":"${TIMESTAMP}","sequence":${SEQ}}
EOF
mv "$TOKEN_TMP" "$TOKEN_FILE"

exit 0

#!/usr/bin/env bash
# manifest-regenerate.sh — PostToolUse hook (Write|Edit)
# Regenerates transport/MANIFEST.json when a transport session file changes.
# Prevents stale MANIFEST — the bug where messages written outside /sync
# never appear in MANIFEST until manual regeneration.

set -euo pipefail

PROJECT_ROOT="$(git -C "$(dirname "$0")/../.." rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "$0")/../..")"

# Parse the tool input to get the file path
FILE_PATH="${CLAUDE_FILE_PATH:-}"

# If no file path from env, try to extract from tool input
if [ -z "$FILE_PATH" ]; then
    FILE_PATH="$(echo "$CLAUDE_TOOL_INPUT" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null || true)"
fi

# Only act on transport session files
case "$FILE_PATH" in
    */transport/sessions/*.json)
        # Skip MANIFEST.json itself to avoid infinite loop
        case "$FILE_PATH" in
            */MANIFEST.json) exit 0 ;;
        esac

        # Regenerate MANIFEST
        if [ -f "${PROJECT_ROOT}/scripts/generate_manifest.py" ]; then
            python3 "${PROJECT_ROOT}/scripts/generate_manifest.py" > /dev/null 2>&1 || true
        fi

        # Auto dual-write: index transport message to state.db
        if [ -f "${PROJECT_ROOT}/scripts/dual_write.py" ] && [ -f "${PROJECT_ROOT}/state.db" ]; then
            python3 -c "
import json, subprocess, sys
from pathlib import Path
try:
    msg = json.loads(Path('$FILE_PATH').read_text())
    session = msg.get('session_id', '')
    filename = Path('$FILE_PATH').name
    turn = msg.get('turn', 0)
    mtype = msg.get('message_type', '')
    from_agent = msg.get('from', {}).get('agent_id', '') if isinstance(msg.get('from'), dict) else str(msg.get('from', ''))
    to_agent = msg.get('to', {}).get('agent_id', '') if isinstance(msg.get('to'), dict) else str(msg.get('to', ''))
    ts = msg.get('timestamp', '')
    subject = msg.get('subject', '')
    subprocess.run([
        'python3', '${PROJECT_ROOT}/scripts/dual_write.py', 'transport-message',
        '--session', session, '--filename', filename,
        '--turn', str(turn), '--type', mtype,
        '--from-agent', from_agent, '--to-agent', to_agent,
        '--timestamp', ts, '--subject', subject,
    ], capture_output=True, timeout=5)
except Exception:
    pass
" 2>/dev/null || true
        fi
        ;;
esac

exit 0

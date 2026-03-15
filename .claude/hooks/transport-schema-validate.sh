#!/usr/bin/env bash
# transport-schema-validate.sh — PostToolUse hook (Write)
# Validates interagent/v1 transport messages on write.
# Catches: missing required fields, bad turn numbers, schema drift.

set -euo pipefail

FILE_PATH="${CLAUDE_FILE_PATH:-}"
if [ -z "$FILE_PATH" ]; then
    FILE_PATH="$(echo "$CLAUDE_TOOL_INPUT" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null || true)"
fi

# Only validate transport session JSON files
case "$FILE_PATH" in
    */transport/sessions/*.json) ;;
    *) exit 0 ;;
esac

# Skip MANIFEST and non-message files
BASENAME="$(basename "$FILE_PATH")"
case "$BASENAME" in
    MANIFEST.json|*.bak) exit 0 ;;
esac

# Validate required interagent/v1 fields
python3 -c "
import json, sys

try:
    with open('$FILE_PATH') as f:
        msg = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    sys.exit(0)  # Not valid JSON or file gone — other hooks handle this

errors = []

# Required top-level fields
if 'schema' not in msg and 'protocol' not in msg:
    errors.append('Missing schema or protocol field')
if 'session_id' not in msg:
    errors.append('Missing session_id')
if 'turn' not in msg:
    errors.append('Missing turn')
elif not isinstance(msg['turn'], int) or msg['turn'] < 0:
    errors.append(f'Invalid turn: {msg[\"turn\"]} (expected non-negative integer)')
if 'timestamp' not in msg:
    errors.append('Missing timestamp')
if 'from' not in msg:
    errors.append('Missing from block')
elif isinstance(msg['from'], dict) and 'agent_id' not in msg['from']:
    errors.append('from block missing agent_id')

# Warn on missing recommended fields
warnings = []
if 'message_type' not in msg:
    warnings.append('No message_type — consider adding for triage')
if 'setl' not in msg:
    warnings.append('No setl — epistemic transparency score missing')
if 'epistemic_flags' not in msg:
    warnings.append('No epistemic_flags array')

if errors:
    print(f'TRANSPORT SCHEMA ERROR in {sys.argv[0] if len(sys.argv) > 0 else \"file\"}:')
    for e in errors:
        print(f'  ✗ {e}')
    sys.exit(1)

if warnings:
    for w in warnings:
        print(f'  ⚠ {w}')
" 2>/dev/null || true

exit 0

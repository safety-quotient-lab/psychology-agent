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
        ;;
esac

exit 0

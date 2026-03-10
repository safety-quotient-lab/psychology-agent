#!/usr/bin/env bash
# generate-replays.sh — Batch-generate session replay HTML from JSONL transcripts.
#
# Scans Claude Code session JSONL files, maps them to session numbers via
# lab-notebook.md headers, and generates replay HTML using claude-replay.
#
# Usage:
#     scripts/generate-replays.sh              # generate missing replays
#     scripts/generate-replays.sh --all        # regenerate all replays
#     scripts/generate-replays.sh --session 35 # generate specific session

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || dirname "$(dirname "$0")")"
REPLAYS_DIR="${PROJECT_ROOT}/docs/replays"
CLAUDE_DIR="$HOME/.claude/projects"

# Compute the Claude Code project hash for this repo
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
JSONL_DIR="${CLAUDE_DIR}/${_HASH}"

THEME="tokyo-night"
REGENERATE=false
TARGET_SESSION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all) REGENERATE=true; shift ;;
        --session) TARGET_SESSION="$2"; shift 2 ;;
        --theme) THEME="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Check prerequisites
if ! command -v claude-replay &>/dev/null; then
    echo "ERROR: claude-replay not found. Install: npm install -g claude-replay"
    exit 1
fi

mkdir -p "${REPLAYS_DIR}"

# Map JSONL files to session numbers using lab-notebook timestamps
# Each JSONL file has a sessionId in its records; we match by date
generated=0
skipped=0
errors=0

for jsonl in "${JSONL_DIR}"/*.jsonl; do
    [ -f "$jsonl" ] || continue

    # Extract session ID from first record
    session_id=$(head -1 "$jsonl" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sessionId',''))" 2>/dev/null || true)
    if [ -z "$session_id" ]; then
        continue
    fi

    # Extract timestamp from first record to help identify session number
    first_ts=$(head -1 "$jsonl" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timestamp','')[:10])" 2>/dev/null || true)

    # Try to determine session number from the filename or content
    # Use the lab-notebook session_log table if state.db exists
    session_num=""
    if [ -f "${PROJECT_ROOT}/state.db" ]; then
        session_num=$(sqlite3 "${PROJECT_ROOT}/state.db" \
            "SELECT id FROM session_log WHERE timestamp LIKE '${first_ts}%' ORDER BY id DESC LIMIT 1" 2>/dev/null || true)
    fi

    # Fallback: use file modification date to find closest session
    if [ -z "$session_num" ]; then
        # Skip files we cannot map to a session number
        continue
    fi

    if [ -n "$TARGET_SESSION" ] && [ "$session_num" != "$TARGET_SESSION" ]; then
        continue
    fi

    output_file="${REPLAYS_DIR}/session-${session_num}.html"

    if [ -f "$output_file" ] && [ "$REGENERATE" = false ]; then
        skipped=$((skipped + 1))
        continue
    fi

    echo "Generating replay: session ${session_num} (${first_ts})"
    if claude-replay "$jsonl" -o "$output_file" --theme "$THEME" \
        --title "Session ${session_num}" --no-thinking 2>/dev/null; then
        size_kb=$(( $(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null) / 1024 ))
        echo "  → ${output_file} (${size_kb} KB)"
        generated=$((generated + 1))
    else
        echo "  ERROR: failed to generate replay for session ${session_num}"
        errors=$((errors + 1))
    fi
done

echo ""
echo "Replay generation complete: ${generated} generated, ${skipped} skipped, ${errors} errors"
echo "Replays directory: ${REPLAYS_DIR}"

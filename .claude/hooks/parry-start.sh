#!/usr/bin/env bash
# Start (or restart) the parry ML daemon.
# Reads HF token from ~/.parry/.hf-token if HF_TOKEN is not already set.
# Usage: ./parry-start.sh

set -euo pipefail

PARRY_DIR="${HOME}/.parry"
TOKEN_FILE="${PARRY_DIR}/.hf-token"
LOG_FILE="${PARRY_DIR}/parry.log"

# Verify parry is installed
if ! command -v parry &>/dev/null; then
  echo "ERROR: parry not found on PATH. Install first (see BOOTSTRAP.md)."
  exit 1
fi

# Load HF token if not in environment
if [ -z "${HF_TOKEN:-}" ]; then
  if [ -f "$TOKEN_FILE" ]; then
    chmod 600 "$TOKEN_FILE" 2>/dev/null
    HF_TOKEN="$(cat "$TOKEN_FILE")"
    export HF_TOKEN
    echo "Loaded HF_TOKEN from ${TOKEN_FILE}"
  else
    echo "ERROR: HF_TOKEN not set and ${TOKEN_FILE} not found."
    echo "Create it with: echo 'your_token' > ${TOKEN_FILE} && chmod 600 ${TOKEN_FILE}"
    exit 1
  fi
fi

# Kill existing daemon if running
if pkill parry 2>/dev/null; then
  echo "Stopped existing parry daemon."
  sleep 1
fi

# Clean stale socket
if [ -S "${PARRY_DIR}/parry.sock" ]; then
  rm -f "${PARRY_DIR}/parry.sock"
  echo "Removed stale socket."
fi

# Start daemon in background
echo "Starting parry daemon..."
nohup parry serve >> "$LOG_FILE" 2>&1 &
DAEMON_PID=$!
echo "$DAEMON_PID" > "${PARRY_DIR}/daemon.pid"

# Wait for socket to appear (up to 30s for model download on first run)
TIMEOUT=30
ELAPSED=0
while [ ! -S "${PARRY_DIR}/parry.sock" ] && [ "$ELAPSED" -lt "$TIMEOUT" ]; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

if [ ! -S "${PARRY_DIR}/parry.sock" ]; then
  echo "WARNING: Socket did not appear after ${TIMEOUT}s."
  echo "Check log: tail -20 ${LOG_FILE}"
  exit 1
fi

# Verify ML loaded by checking for recent errors
RECENT_ERRORS=$(tail -5 "$LOG_FILE" 2>/dev/null | grep -c "ML.*failed\|403\|401" || true)
if [ "$RECENT_ERRORS" -gt 0 ]; then
  echo "WARNING: Daemon started but ML model may have failed to load."
  echo "Recent log:"
  tail -5 "$LOG_FILE"
  exit 1
fi

echo "Parry daemon running (PID ${DAEMON_PID}). ML scanner active."
echo "Log: ${LOG_FILE}"

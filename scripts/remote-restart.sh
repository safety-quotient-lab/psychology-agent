#!/bin/bash
#
# remote-restart.sh — Restart all meshd processes on the deployment host.
#
# Runs DETACHED from the calling SSH session to avoid pkill killing
# the SSH connection. Saves running command lines, kills old processes,
# relaunches from saved commands, reports results.
#
# Usage (called by Makefile deploy-restart):
#   nohup /tmp/remote-restart.sh > /tmp/meshd-restart.log 2>&1 &
#
set -o pipefail

MESHD_PATTERN="/home/kashif/platform/meshd --port"
CMDS_FILE="/tmp/meshd-restart-cmds.txt"
LOG="/tmp/meshd-restart.log"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) — meshd restart initiated"

# Save running command lines
rm -f "$CMDS_FILE"
for pid in $(pgrep -f "$MESHD_PATTERN"); do
    ps -p "$pid" -o args= >> "$CMDS_FILE"
done

saved=$(wc -l < "$CMDS_FILE" 2>/dev/null || echo 0)
echo "  Saved $saved process command lines"

if [ "$saved" -eq 0 ]; then
    echo "  ERROR: no meshd processes found to restart"
    exit 1
fi

# Kill all meshd processes by PID (not pkill -f, which can match this script)
for pid in $(pgrep -f "$MESHD_PATTERN"); do
    echo "  Killing pid $pid"
    kill -9 "$pid" 2>/dev/null
done

sleep 2

# Verify all killed
remaining=$(pgrep -f "$MESHD_PATTERN" -c 2>/dev/null || echo 0)
if [ "$remaining" -gt 0 ]; then
    echo "  WARNING: $remaining processes survived kill"
fi

# Relaunch from saved commands
echo "  Relaunching..."
while IFS= read -r cmd; do
    agent=$(echo "$cmd" | grep -oP '(?<=--agent-id )\S+')
    nohup $cmd > "/tmp/meshd-${agent}.log" 2>&1 &
    echo "    $agent (pid $!)"
done < "$CMDS_FILE"

rm -f "$CMDS_FILE"
sleep 3

# Report
echo ""
echo "  Running processes:"
pgrep -f "$MESHD_PATTERN" -la 2>/dev/null || echo "  NONE"
echo ""
echo "  Count: $(pgrep -f "$MESHD_PATTERN" -c 2>/dev/null || echo 0)/5"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) — restart complete"

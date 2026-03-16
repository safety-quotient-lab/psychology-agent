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

# Save running command lines (deduplicated by --port to avoid relaunching duplicates)
rm -f "$CMDS_FILE" /tmp/meshd-seen-ports.tmp
touch /tmp/meshd-seen-ports.tmp
for pid in $(pgrep -f "$MESHD_PATTERN" | sort -n); do
    cmd=$(ps -p "$pid" -o args= 2>/dev/null)
    port=$(echo "$cmd" | grep -oP '(?<=--port )\d+' 2>/dev/null || echo "")
    if [ -n "$port" ] && ! grep -q "^${port}$" /tmp/meshd-seen-ports.tmp 2>/dev/null; then
        echo "$cmd" >> "$CMDS_FILE"
        echo "$port" >> /tmp/meshd-seen-ports.tmp
    fi
done
rm -f /tmp/meshd-seen-ports.tmp

saved=$(cat "$CMDS_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "  Saved $saved unique process command lines"

if [ "$saved" -eq 0 ]; then
    echo "  ERROR: no meshd processes found to restart"
    exit 1
fi

# Kill ALL meshd processes (iterative until zero remain)
for attempt in 1 2 3; do
    pids=$(pgrep -f "$MESHD_PATTERN" 2>/dev/null || true)
    if [ -z "$pids" ]; then break; fi
    echo "  Kill attempt $attempt: $(echo "$pids" | wc -w | tr -d ' ') processes"
    echo "$pids" | xargs kill -9 2>/dev/null
    sleep 3
done

# Final verification
if pgrep -f "$MESHD_PATTERN" > /dev/null 2>&1; then
    echo "  WARNING: some processes still running — forcing final kill"
    pgrep -f "$MESHD_PATTERN" | xargs kill -9 2>/dev/null
    sleep 3
fi
echo "  Kill phase complete"

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

#!/bin/bash
#
# remote-restart.sh — Restart all meshd processes on the deployment host.
#
# Detects systemd --user units (preferred) or falls back to manual kill/relaunch.
# Runs DETACHED from calling SSH session to avoid kill propagation.
#
# Usage (called by Makefile deploy-restart):
#   nohup /tmp/remote-restart.sh > /tmp/meshd-restart.log 2>&1 &
#
set -o pipefail

MESHD_PATTERN="/home/kashif/platform/meshd --port"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) — meshd restart initiated"

# Prefer systemd --user units (auto-restart, clean process management)
SERVICES=$(systemctl --user list-units --type=service --state=running 2>/dev/null | grep meshd | awk '{print $1}')

if [ -n "$SERVICES" ]; then
    echo "  Using systemd --user restart"
    for svc in $SERVICES; do
        systemctl --user restart "$svc" 2>/dev/null
        echo "    Restarted $svc"
    done
    sleep 3
else
    echo "  No systemd units — manual restart"
    # Save unique commands, kill, relaunch
    CMDS_FILE="/tmp/meshd-restart-cmds.txt"
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

    # Kill all
    for attempt in 1 2 3; do
        pids=$(pgrep -f "$MESHD_PATTERN" 2>/dev/null || true)
        [ -z "$pids" ] && break
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 3
    done

    # Relaunch
    while IFS= read -r cmd; do
        agent=$(echo "$cmd" | grep -oP '(?<=--agent-id )\S+')
        nohup $cmd > "/tmp/meshd-${agent}.log" 2>&1 &
        echo "    $agent (pid $!)"
    done < "$CMDS_FILE"
    rm -f "$CMDS_FILE"
    sleep 3
fi

# Report
echo ""
echo "  Running processes:"
pgrep -f "$MESHD_PATTERN" -la 2>/dev/null || echo "  NONE"
count=$(pgrep -f "$MESHD_PATTERN" 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "  Count: ${count}/5"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) — restart complete"

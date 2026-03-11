#!/usr/bin/env python3
"""
heartbeat.py — Agent mesh presence and auto-negotiation.

Each agent emits a heartbeat to transport/sessions/local-coordination/.
Other agents read heartbeats to discover the mesh topology, detect downed
peers, and negotiate role assignments.

Commands:
    emit                Write a heartbeat for this agent
    scan                Read all heartbeats, report mesh status
    negotiate           Propose role assignments based on live topology

Usage:
    python3 scripts/heartbeat.py emit
    python3 scripts/heartbeat.py scan
    python3 scripts/heartbeat.py negotiate
"""
import json
import os
import platform
import sys
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
IDENTITY_FILE = PROJECT_ROOT / ".agent-identity.json"
HEARTBEAT_DIR = PROJECT_ROOT / "transport" / "sessions" / "local-coordination"
REGISTRY_FILE = PROJECT_ROOT / "transport" / "agent-registry.json"

# Heartbeat older than this threshold signals a downed peer
STALE_THRESHOLD_MINUTES = 30


def load_identity() -> dict:
    """Load agent identity, fall back to env + platform detection."""
    if IDENTITY_FILE.exists():
        with open(IDENTITY_FILE) as fh:
            return json.load(fh)

    return {
        "schema": "agent-identity/v1",
        "agent_id": os.environ.get("AGENT_ID", "unknown-agent"),
        "hostname": platform.node(),
        "platform": f"{platform.system().lower()}-{platform.machine()}",
        "capabilities": [],
        "note": "auto-detected — no .agent-identity.json found",
    }


def emit_heartbeat() -> Path:
    """Write a heartbeat file for this agent."""
    identity = load_identity()
    agent_id = identity["agent_id"]
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%S%z")
    filename = f"heartbeat-{agent_id}.json"
    filepath = HEARTBEAT_DIR / filename

    heartbeat = {
        "schema": "local-coordination/v1",
        "timestamp": timestamp,
        "message_type": "heartbeat",
        "from": {
            "agent_id": agent_id,
            "hostname": identity.get("hostname", platform.node()),
            "platform": identity.get("platform", f"{platform.system().lower()}-{platform.machine()}"),
            "capabilities": identity.get("capabilities", []),
        },
        "payload": {
            "status": "alive",
            "uptime_indicator": now.strftime("%Y-%m-%dT%H:%M"),
            "sync_ready": True,
        },
    }

    HEARTBEAT_DIR.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as fh:
        json.dump(heartbeat, fh, indent=2)
        fh.write("\n")

    print(f"heartbeat emitted: {filename}")
    return filepath


def scan_heartbeats() -> list[dict]:
    """Read all heartbeats, classify each agent as alive, stale, or missing."""
    # Load registry — only autonomous-enabled agents participate in mesh
    expected_agents = set()
    if REGISTRY_FILE.exists():
        with open(REGISTRY_FILE) as fh:
            registry = json.load(fh)
            expected_agents = {
                agent_id
                for agent_id, config in registry.get("agents", {}).items()
                if config.get("autonomous", False)
            }

    # Read heartbeat files
    heartbeats = {}
    if HEARTBEAT_DIR.exists():
        for path in HEARTBEAT_DIR.glob("heartbeat-*.json"):
            try:
                with open(path) as fh:
                    data = json.load(fh)
                agent_id = data.get("from", {}).get("agent_id", "unknown")
                heartbeats[agent_id] = {
                    "file": path.name,
                    "data": data,
                    "mtime": datetime.fromtimestamp(path.stat().st_mtime),
                }
            except (json.JSONDecodeError, KeyError):
                continue

    now = datetime.now()
    stale_cutoff = now - timedelta(minutes=STALE_THRESHOLD_MINUTES)
    results = []

    # Check each expected agent
    all_agents = expected_agents | set(heartbeats.keys())
    for agent_id in sorted(all_agents):
        if agent_id in heartbeats:
            hb = heartbeats[agent_id]
            mtime = hb["mtime"]
            from_block = hb["data"].get("from", {})

            if mtime >= stale_cutoff:
                status = "alive"
            else:
                minutes_ago = int((now - mtime).total_seconds() / 60)
                status = f"stale ({minutes_ago}m ago)"

            results.append({
                "agent_id": agent_id,
                "status": status,
                "hostname": from_block.get("hostname", "unknown"),
                "platform": from_block.get("platform", "unknown"),
                "capabilities": from_block.get("capabilities", []),
                "last_seen": mtime.strftime("%Y-%m-%dT%H:%M:%S"),
                "in_registry": agent_id in expected_agents,
            })
        else:
            results.append({
                "agent_id": agent_id,
                "status": "missing",
                "hostname": "unknown",
                "platform": "unknown",
                "capabilities": [],
                "last_seen": None,
                "in_registry": agent_id in expected_agents,
            })

    return results


def print_scan(results: list[dict]) -> None:
    """Print mesh topology scan."""
    print("Mesh Topology Scan")
    print("─" * 60)
    for agent in results:
        status_marker = {"alive": "●", "missing": "○"}.get(
            agent["status"], "◐"
        )
        registry_marker = "R" if agent["in_registry"] else " "
        caps = ", ".join(agent["capabilities"][:3]) if agent["capabilities"] else "none listed"

        print(f"  {status_marker} [{registry_marker}] {agent['agent_id']}")
        print(f"    Host: {agent['hostname']} ({agent['platform']})")
        print(f"    Status: {agent['status']}")
        print(f"    Capabilities: {caps}")
        if agent["last_seen"]:
            print(f"    Last seen: {agent['last_seen']}")
        print()


def negotiate(results: list[dict]) -> dict:
    """Propose role assignments based on live topology.

    Negotiation rules (v1, simple):
    - Only alive agents receive assignments
    - Each agent runs sync for itself
    - If a peer agent has gone stale/missing, the remaining alive agent
      flags it for human attention (does not absorb the downed agent's work)
    - Future: capability-based work distribution, load balancing
    """
    alive = [a for a in results if a["status"] == "alive"]
    stale_or_missing = [a for a in results if a["status"] != "alive"]

    assignments = {
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "alive_count": len(alive),
        "total_count": len(results),
        "assignments": [],
        "alerts": [],
    }

    for agent in alive:
        assignments["assignments"].append({
            "agent_id": agent["agent_id"],
            "role": "self-sync",
            "hostname": agent["hostname"],
            "note": "runs autonomous /sync for own agent scope",
        })

    for agent in stale_or_missing:
        assignments["alerts"].append({
            "agent_id": agent["agent_id"],
            "status": agent["status"],
            "action": "human attention required — agent not responding",
            "last_seen": agent.get("last_seen"),
        })

    return assignments


def print_negotiation(assignments: dict) -> None:
    """Print negotiation results."""
    print("Mesh Negotiation Result")
    print("─" * 60)
    print(f"  Alive: {assignments['alive_count']}/{assignments['total_count']}")
    print()

    if assignments["assignments"]:
        print("  Assignments:")
        for assign in assignments["assignments"]:
            print(f"    {assign['agent_id']} → {assign['role']} "
                  f"on {assign['hostname']}")
    else:
        print("  No agents alive — mesh fully degraded.")

    if assignments["alerts"]:
        print()
        print("  Alerts:")
        for alert in assignments["alerts"]:
            print(f"    ⚠ {alert['agent_id']}: {alert['status']}")
            print(f"      Action: {alert['action']}")

    print()


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    command = sys.argv[1]

    if command == "emit":
        emit_heartbeat()

    elif command == "scan":
        results = scan_heartbeats()
        print_scan(results)

    elif command == "negotiate":
        results = scan_heartbeats()
        print_scan(results)
        print()
        assignments = negotiate(results)
        print_negotiation(assignments)

    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()

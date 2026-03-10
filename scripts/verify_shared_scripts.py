#!/usr/bin/env python3
"""Verify shared script checksums across agent repos.

Compares local scripts against their copies in peer repos (via git show)
to detect silent divergence. Runs at autonomous-sync startup (optional)
or on demand.

Usage:
    python3 scripts/verify_shared_scripts.py                  # check all peers
    python3 scripts/verify_shared_scripts.py --peer psq-agent # check one peer
    python3 scripts/verify_shared_scripts.py --fix psq-agent  # show scp commands to fix
    python3 scripts/verify_shared_scripts.py --update-manifest # recompute checksums
"""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_ROOT / "scripts" / "shared-scripts.json"
REGISTRY_PATH = PROJECT_ROOT / "transport" / "agent-registry.json"


def sha256_file(path: Path) -> str:
    """Compute SHA256 of a local file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_remote(remote_name: str, file_path: str) -> str | None:
    """Compute SHA256 of a file in a remote repo via git show."""
    try:
        result = subprocess.run(
            ["git", "show", f"{remote_name}/main:{file_path}"],
            capture_output=True, cwd=PROJECT_ROOT,
        )
        if result.returncode != 0:
            return None
        return hashlib.sha256(result.stdout).hexdigest()
    except Exception:
        return None


def load_manifest() -> dict:
    """Load the shared-scripts manifest."""
    if not MANIFEST_PATH.exists():
        print(f"ERROR: {MANIFEST_PATH} not found", file=sys.stderr)
        sys.exit(1)
    return json.loads(MANIFEST_PATH.read_text())


def load_registry() -> dict:
    """Load agent registry to map agent IDs to git remote names."""
    if not REGISTRY_PATH.exists():
        return {}
    return json.loads(REGISTRY_PATH.read_text())


def get_remote_name(agent_id: str, registry: dict) -> str | None:
    """Get git remote name for an agent from the registry."""
    agent_config = registry.get("agents", {}).get(agent_id, {})
    return agent_config.get("remote_name")


def verify(peer_filter: str | None = None) -> list[dict]:
    """Verify shared scripts against peer repos. Returns list of divergences."""
    manifest = load_manifest()
    registry = load_registry()
    divergences = []

    # Build peer set from manifest
    peers = set()
    for script in manifest["scripts"]:
        for peer in script.get("shared_with", []):
            peers.add(peer)

    if peer_filter:
        # Map agent-id to remote name if needed
        remote = get_remote_name(peer_filter, registry)
        if remote:
            peers = {remote}
        elif peer_filter in peers:
            peers = {peer_filter}
        else:
            print(f"Unknown peer: {peer_filter}", file=sys.stderr)
            sys.exit(1)

    # Fetch remotes first
    for peer in peers:
        subprocess.run(
            ["git", "fetch", peer, "main"],
            capture_output=True, cwd=PROJECT_ROOT,
        )

    for script in manifest["scripts"]:
        local_path = PROJECT_ROOT / script["path"]
        if not local_path.exists():
            divergences.append({
                "script": script["path"],
                "issue": "missing locally",
                "peers": script["shared_with"],
            })
            continue

        local_hash = sha256_file(local_path)

        for peer in script.get("shared_with", []):
            if peers and peer not in peers:
                continue

            remote_hash = sha256_remote(peer, script["path"])
            if remote_hash is None:
                divergences.append({
                    "script": script["path"],
                    "peer": peer,
                    "issue": "missing in peer",
                    "local_hash": local_hash[:12],
                })
            elif remote_hash != local_hash:
                divergences.append({
                    "script": script["path"],
                    "peer": peer,
                    "issue": "checksum mismatch",
                    "local_hash": local_hash[:12],
                    "remote_hash": remote_hash[:12],
                })

    return divergences


def update_manifest():
    """Recompute checksums in the manifest (for documentation, not enforcement)."""
    manifest = load_manifest()
    for script in manifest["scripts"]:
        local_path = PROJECT_ROOT / script["path"]
        if local_path.exists():
            script["sha256"] = sha256_file(local_path)
        else:
            script["sha256"] = None
    manifest["last_updated"] = subprocess.run(
        ["date", "+%Y-%m-%d"], capture_output=True, text=True
    ).stdout.strip()
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Updated {MANIFEST_PATH} with current checksums")


def print_fix_commands(peer: str, divergences: list[dict]):
    """Print scp commands to fix divergences."""
    registry = load_registry()
    agent_config = registry.get("agents", {}).get(peer, {})
    lan_host = agent_config.get("lan_host", f"{peer}.local")
    lan_user = agent_config.get("lan_user", "kashif")

    # Try to determine remote project root from registry
    # Default: assume same relative path
    remote_root = f"/home/{lan_user}/projects/psychology/safety-quotient"

    for d in divergences:
        if d.get("peer") == peer or peer in d.get("peers", []):
            local = PROJECT_ROOT / d["script"]
            remote = f"{lan_host}:{remote_root}/{d['script']}"
            print(f"scp {local} {remote}")


def main():
    parser = argparse.ArgumentParser(description="Verify shared script checksums")
    parser.add_argument("--peer", help="Check a specific peer only")
    parser.add_argument("--fix", metavar="PEER",
                        help="Print scp commands to fix divergences for a peer")
    parser.add_argument("--update-manifest", action="store_true",
                        help="Recompute checksums in shared-scripts.json")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")
    parser.add_argument("--quiet", action="store_true",
                        help="Exit code only (0=in sync, 1=diverged)")
    args = parser.parse_args()

    if args.update_manifest:
        update_manifest()
        return

    divergences = verify(peer_filter=args.fix or args.peer)

    if args.fix:
        if divergences:
            print_fix_commands(args.fix, divergences)
        else:
            print(f"All shared scripts in sync with {args.fix}")
        return

    if args.quiet:
        sys.exit(1 if divergences else 0)

    if args.json:
        print(json.dumps(divergences, indent=2))
        return

    if not divergences:
        print("All shared scripts in sync across all peers.")
        return

    print(f"DIVERGENCE: {len(divergences)} script(s) out of sync\n")
    for d in divergences:
        peer = d.get("peer", ", ".join(d.get("peers", ["?"])))
        issue = d["issue"]
        if issue == "checksum mismatch":
            print(f"  {d['script']} ← {peer}")
            print(f"    local:  {d['local_hash']}...")
            print(f"    remote: {d['remote_hash']}...")
        elif issue == "missing in peer":
            print(f"  {d['script']} ← {peer} (MISSING)")
        elif issue == "missing locally":
            print(f"  {d['script']} (MISSING LOCALLY)")
    print(f"\nRun with --fix {peer} to generate scp commands.")


if __name__ == "__main__":
    main()

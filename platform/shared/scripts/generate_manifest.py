#!/usr/bin/env python3
"""
generate_manifest.py — Generate transport/MANIFEST.json from state.db.

Produces a thin, git-transportable MANIFEST with pending messages only.
Completed messages stay in state.db (queryable) and git history (auditable).
Peer agents pull this file to discover messages addressed to them.

Usage:
    python scripts/generate_manifest.py           # write MANIFEST.json
    python scripts/generate_manifest.py --dry-run  # print to stdout, don't write

Requires: Python 3.10+ (stdlib only)
"""
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

_SCRIPTS_DIR = str(Path(__file__).parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from state.connection import PROJECT_ROOT, DB_PATH

MANIFEST_PATH = PROJECT_ROOT / "transport" / "MANIFEST.json"

# Legacy session name mappings — carried forward from manual MANIFEST.
# These rarely change; if a new rename appears, add it here.
SESSION_RENAMES = {
    "item4-derivation": "psychology-interface",
    "item2-derivation": "subagent-protocol",
}


def generate_manifest(db_path: Path) -> dict:
    """Query state.db for pending messages and build MANIFEST structure."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    # Pending messages: unprocessed, grouped by to_agent
    rows = conn.execute("""
        SELECT session_name, filename, message_type, subject,
               timestamp, ack_required, from_agent, to_agent
        FROM transport_messages
        WHERE processed = FALSE
        ORDER BY to_agent, timestamp
    """).fetchall()

    pending: dict[str, list] = {}
    for row in rows:
        agent = row["to_agent"]
        if agent not in pending:
            pending[agent] = []
        entry = {
            "session": row["session_name"],
            "file": f"transport/sessions/{row['session_name']}/{row['filename']}",
            "type": row["message_type"] or "unknown",
            "subject": row["subject"] or "",
            "timestamp": row["timestamp"],
        }
        if row["ack_required"]:
            entry["requires_response"] = True
        pending[agent].append(entry)

    conn.close()

    manifest = {
        "schema": "transport-manifest/v2",
        "description": (
            "Auto-generated from state.db. Pending messages only — "
            "completed history lives in state.db (queryable) and git history (auditable). "
            "Agents: pull this file to discover messages addressed to you."
        ),
        "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source": "scripts/generate_manifest.py",
        "pending": pending,
        "session_renames": SESSION_RENAMES,
    }

    return manifest


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    if not DB_PATH.exists():
        print(f"ERROR: state.db not found at {DB_PATH}", file=sys.stderr)
        print("Run: python scripts/bootstrap_state_db.py --force", file=sys.stderr)
        sys.exit(1)

    manifest = generate_manifest(DB_PATH)

    output = json.dumps(manifest, indent=2) + "\n"

    if dry_run:
        print(output)
    else:
        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MANIFEST_PATH, "w") as fh:
            fh.write(output)
        pending_count = sum(len(msgs) for msgs in manifest["pending"].values())
        print(f"MANIFEST.json generated: {pending_count} pending message(s)")


if __name__ == "__main__":
    main()

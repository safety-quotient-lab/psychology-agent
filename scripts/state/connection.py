"""
connection — Shared infrastructure for the state layer.

Provides DB connection, project paths, and schema bootstrap.
All domain modules import from here rather than computing paths independently.
"""

import os
import sqlite3
import sys
from pathlib import Path


def _resolve_project_root() -> Path:
    """Derive project root, honoring PROJECT_ROOT env var for symlinked scripts."""
    env_root = os.environ.get("PROJECT_ROOT")
    if env_root:
        return Path(env_root)
    return Path(__file__).parent.parent.parent


PROJECT_ROOT = _resolve_project_root()
DB_PATH = PROJECT_ROOT / "state.db"
SCHEMA_PATH = PROJECT_ROOT / "scripts" / "schema.sql"


def get_connection() -> sqlite3.Connection:
    """Connect to state.db, creating from schema if missing."""
    if not DB_PATH.exists():
        if not SCHEMA_PATH.exists():
            print("ERROR: state.db missing and schema.sql not found", file=sys.stderr)
            sys.exit(1)
        print(f"state.db not found — creating from {SCHEMA_PATH}", file=sys.stderr)
        conn = sqlite3.connect(str(DB_PATH))
        conn.executescript(SCHEMA_PATH.read_text())
        conn.commit()
        return conn
    return sqlite3.connect(str(DB_PATH))

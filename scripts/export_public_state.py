#!/usr/bin/env python3
"""
export_public_state.py — Generate a public seed DB from state.db.

Three-tier visibility model:
  public  — infrastructure that transfers to any adopter (triggers, schema, config)
  shared  — research output (decisions, sessions, flags — visible on GitHub,
            not seeded into adopter DBs)
  private — personal state (lessons, memory, trust — never exported)

Profiles control which tiers get included:
  seed    — public only (adopter starter kit: empty DB + triggers)
  release — public + shared (GitHub release: our research data included)
  full    — all tiers (debug only, includes private)

Usage:
    python scripts/export_public_state.py                         # seed (default)
    python scripts/export_public_state.py --profile release       # include shared
    python scripts/export_public_state.py --output path.db        # custom output
    python scripts/export_public_state.py --dry-run               # print plan only

Requires: Python 3.10+ (stdlib only)
"""
import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
SCHEMA_PATH = PROJECT_ROOT / "scripts" / "schema.sql"
DEFAULT_OUTPUT = PROJECT_ROOT / "state-public.db"

# Columns to null out in shared-tier exports (may contain private details)
SANITIZE_COLUMNS = {
    "transport_messages": ["subject"],
}


def get_visible_tables(conn: sqlite3.Connection, profile: str) -> list[dict]:
    """Get tables that match the requested visibility profile."""
    if profile == "full":
        where = "1=1"
    elif profile == "release":
        where = "default_visibility IN ('public', 'shared')"
    else:  # seed
        where = "default_visibility = 'public'"

    rows = conn.execute(f"""
        SELECT table_name, default_visibility, description
        FROM table_visibility
        WHERE {where}
        ORDER BY table_name
    """).fetchall()

    return [{"name": r[0], "visibility": r[1], "description": r[2]} for r in rows]


def copy_table(source: sqlite3.Connection, dest: sqlite3.Connection,
               table_name: str, visibility: str) -> int:
    """Copy a table's data from source to dest. Returns row count."""
    # Get column names
    cursor = source.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]

    if not columns:
        return 0

    # For shared tables, null out sensitive columns
    select_cols = []
    for col in columns:
        if (visibility == "shared"
                and col in SANITIZE_COLUMNS.get(table_name, [])):
            select_cols.append(f"NULL as {col}")
        else:
            select_cols.append(col)

    select_sql = f"SELECT {', '.join(select_cols)} FROM {table_name}"
    rows = source.execute(select_sql).fetchall()

    if not rows:
        return 0

    placeholders = ", ".join(["?"] * len(columns))
    insert_sql = f"INSERT OR IGNORE INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

    dest.executemany(insert_sql, rows)
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export public state seed DB")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT),
                        help="Output database path")
    parser.add_argument("--profile", default="seed",
                        choices=["seed", "release", "full"],
                        help="Visibility profile: seed (public infra only), release (+ shared research), full (debug)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print plan without writing")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"ERROR: state.db not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    source = sqlite3.connect(str(DB_PATH))

    # Check if table_visibility exists
    has_visibility = source.execute("""
        SELECT COUNT(*) FROM sqlite_master
        WHERE type='table' AND name='table_visibility'
    """).fetchone()[0]

    if not has_visibility:
        print("ERROR: table_visibility not found — run schema v8 migration first",
              file=sys.stderr)
        print("  sqlite3 state.db < scripts/schema.sql", file=sys.stderr)
        sys.exit(1)

    tables = get_visible_tables(source, args.profile)

    print(f"Export profile: {args.profile}")
    print(f"Tables included: {len(tables)}")
    print()

    for table in tables:
        row_count = source.execute(
            f"SELECT COUNT(*) FROM {table['name']}"
        ).fetchone()[0]
        marker = {"public": "●", "shared": "◐", "private": "○"}
        print(f"  {marker.get(table['visibility'], '?')} {table['name']}: "
              f"{row_count} rows ({table['visibility']})")
        if table["name"] in SANITIZE_COLUMNS:
            stripped = ", ".join(SANITIZE_COLUMNS[table["name"]])
            print(f"    ↳ sanitized: {stripped} → NULL")

    if args.dry_run:
        print(f"\nDry run — pass without --dry-run to write to {args.output}")
        source.close()
        return

    # Create fresh output DB from schema
    output_path = Path(args.output)
    if output_path.exists():
        output_path.unlink()

    dest = sqlite3.connect(str(output_path))
    dest.executescript(SCHEMA_PATH.read_text())

    total_rows = 0
    for table in tables:
        count = copy_table(source, dest, table["name"], table["visibility"])
        total_rows += count

    # Also copy table_visibility itself (so the seed DB knows its own profile)
    copy_table(source, dest, "table_visibility", "public")

    # Also copy schema_version
    copy_table(source, dest, "schema_version", "public")

    dest.commit()
    dest.close()
    source.close()

    size_kb = output_path.stat().st_size / 1024
    print(f"\nExported: {output_path} ({size_kb:.1f} KB, {total_rows} rows)")


if __name__ == "__main__":
    main()

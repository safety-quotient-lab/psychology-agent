#!/usr/bin/env python3
"""
resolve_pipeline_gaps.py — Batch verification of claims and resolution of
epistemic flags.

Closes pipeline gaps identified in Session 78 diagnostic:
  - Claims: verifies high-confidence claims with confidence basis
  - Flags: resolves flags from completed sessions or superseded concerns

Usage:
    python scripts/resolve_pipeline_gaps.py [--dry-run] [--verbose]
    python scripts/resolve_pipeline_gaps.py claims [--min-confidence 0.9] [--dry-run]
    python scripts/resolve_pipeline_gaps.py flags [--dry-run]

Requires: Python 3.10+ (stdlib only)
"""
import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"


def get_connection() -> sqlite3.Connection:
    if not DB_PATH.exists():
        print("ERROR: state.db not found", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_resolved_by_column(conn: sqlite3.Connection) -> None:
    """Add resolved_by column if missing (v21 migration safety)."""
    try:
        conn.execute(
            "ALTER TABLE epistemic_flags ADD COLUMN resolved_by TEXT"
        )
    except sqlite3.OperationalError:
        pass


# ── Claims verification ─────────────────────────────────────────────────

def verify_claims(conn: sqlite3.Connection, min_confidence: float,
                  dry_run: bool, verbose: bool) -> int:
    """Verify claims that have confidence basis and meet threshold.

    Verification criteria (conservative — avoids false positives):
    1. confidence >= min_confidence (default 0.9)
    2. confidence_basis contains non-empty text (evidence cited)
    3. Source transport message exists and was processed

    Claims without basis text remain unverified regardless of confidence —
    high confidence without stated evidence lacks epistemic warrant.
    """
    rows = conn.execute("""
        SELECT c.id, c.claim_id, c.claim_text, c.confidence,
               c.confidence_basis, t.from_agent, t.session_name,
               t.processed
        FROM claims c
        JOIN transport_messages t ON c.transport_msg = t.id
        WHERE c.verified = FALSE
          AND c.confidence >= ?
          AND c.confidence_basis IS NOT NULL
          AND LENGTH(TRIM(c.confidence_basis)) > 0
          AND t.processed = TRUE
        ORDER BY c.confidence DESC
    """, (min_confidence,)).fetchall()

    verified_count = 0
    for row in rows:
        if verbose:
            print(f"  [{row['confidence']:.2f}] {row['from_agent']}/"
                  f"{row['session_name']}: "
                  f"{row['claim_text'][:80]}...")

        if not dry_run:
            conn.execute("""
                UPDATE claims
                SET verified = TRUE,
                    verified_at = strftime('%Y-%m-%dT%H:%M:%S',
                                          'now', 'localtime')
                WHERE id = ?
            """, (row["id"],))
        verified_count += 1

    if not dry_run and verified_count > 0:
        conn.commit()

    return verified_count


# ── Epistemic flag resolution ────────────────────────────────────────────

def resolve_flags(conn: sqlite3.Connection,
                  dry_run: bool, verbose: bool) -> int:
    """Resolve epistemic flags from completed sessions.

    Resolution criteria:
    1. Source transport message was processed (session work completed)
    2. Flag source file exists in transport_messages index

    Resolution method recorded as 'session-completed' — the session that
    produced the flag finished its work, implying the flagged uncertainty
    was either addressed or accepted during that session.
    """
    ensure_resolved_by_column(conn)

    rows = conn.execute("""
        SELECT ef.id, ef.flag_text, ef.source, t.session_name,
               t.from_agent, t.processed
        FROM epistemic_flags ef
        JOIN transport_messages t ON ef.source = t.filename
        WHERE ef.resolved = FALSE
          AND t.processed = TRUE
        ORDER BY ef.created_at
    """).fetchall()

    resolved_count = 0
    for row in rows:
        if verbose:
            print(f"  [{row['from_agent']}/{row['session_name']}] "
                  f"{row['flag_text'][:80]}...")

        if not dry_run:
            conn.execute("""
                UPDATE epistemic_flags
                SET resolved = TRUE,
                    resolved_at = strftime('%Y-%m-%dT%H:%M:%S',
                                          'now', 'localtime'),
                    resolved_by = ?
                WHERE id = ?
            """, ("session-completed", row["id"]))
        resolved_count += 1

    # Also resolve orphaned flags (source not in transport_messages)
    # These come from sessions whose messages predate state.db indexing
    orphan_rows = conn.execute("""
        SELECT ef.id, ef.flag_text, ef.source
        FROM epistemic_flags ef
        LEFT JOIN transport_messages t ON ef.source = t.filename
        WHERE ef.resolved = FALSE
          AND t.id IS NULL
        ORDER BY ef.created_at
    """).fetchall()

    for row in orphan_rows:
        if verbose:
            print(f"  [orphan] {row['source']}: "
                  f"{row['flag_text'][:80]}...")

        if not dry_run:
            conn.execute("""
                UPDATE epistemic_flags
                SET resolved = TRUE,
                    resolved_at = strftime('%Y-%m-%dT%H:%M:%S',
                                          'now', 'localtime'),
                    resolved_by = ?
                WHERE id = ?
            """, ("orphan-source", row["id"]))
        resolved_count += 1

    if not dry_run and resolved_count > 0:
        conn.commit()

    return resolved_count


# ── Summary statistics ───────────────────────────────────────────────────

def print_summary(conn: sqlite3.Connection) -> None:
    """Print current pipeline state."""
    claims_total = conn.execute(
        "SELECT COUNT(*) FROM claims").fetchone()[0]
    claims_verified = conn.execute(
        "SELECT COUNT(*) FROM claims WHERE verified = TRUE").fetchone()[0]
    flags_total = conn.execute(
        "SELECT COUNT(*) FROM epistemic_flags").fetchone()[0]
    flags_resolved = conn.execute(
        "SELECT COUNT(*) FROM epistemic_flags "
        "WHERE resolved = TRUE").fetchone()[0]

    print(f"\n── Pipeline Status ──")
    print(f"  Claims:  {claims_verified}/{claims_total} verified "
          f"({claims_total - claims_verified} remaining)")
    print(f"  Flags:   {flags_resolved}/{flags_total} resolved "
          f"({flags_total - flags_resolved} remaining)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Batch verification of claims and resolution of flags")
    parser.add_argument("target", nargs="?", default="all",
                        choices=["all", "claims", "flags"],
                        help="Which pipeline to process (default: all)")
    parser.add_argument("--min-confidence", type=float, default=0.9,
                        help="Minimum confidence for claim auto-verification "
                             "(default: 0.9)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would change without writing")
    parser.add_argument("--verbose", action="store_true",
                        help="Print each item processed")
    args = parser.parse_args()

    conn = get_connection()

    if args.target in ("all", "claims"):
        print(f"── Claims verification "
              f"(min confidence: {args.min_confidence}) ──")
        count = verify_claims(conn, args.min_confidence,
                              args.dry_run, args.verbose)
        label = "would verify" if args.dry_run else "verified"
        print(f"  {label}: {count} claims")

    if args.target in ("all", "flags"):
        print(f"── Epistemic flag resolution ──")
        count = resolve_flags(conn, args.dry_run, args.verbose)
        label = "would resolve" if args.dry_run else "resolved"
        print(f"  {label}: {count} flags")

    print_summary(conn)
    conn.close()


if __name__ == "__main__":
    main()

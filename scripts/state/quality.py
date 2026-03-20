"""
quality — Claims verification, epistemic flags, engineering incidents, facets.

Four aggregate roots:
    Claim     (id from claims table)
    Flag      (id from epistemic_flags table)
    Incident  (id + incident_type from engineering_incidents table)
    Facet     (entity_type + entity_id + facet_type + facet_value)
"""

import json
import sqlite3
import sys

from .connection import get_connection


# ── Claims ──────────────────────────────────────────────────────────────

def verify_claim(*, claim_id: int, failed: bool = False) -> int:
    """Mark a claim as verified (or failed). Returns rows affected."""
    conn = get_connection()
    verified_value = 0 if failed else 1
    cursor = conn.execute("""
        UPDATE claims
        SET verified = ?,
            verified_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE id = ?
    """, (verified_value, claim_id))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        print(f"warning: no claim found for id={claim_id}", file=sys.stderr)
    else:
        status = "failed" if failed else "verified"
        print(f"claim {status}: claims/{claim_id}")
    return affected


# ── Epistemic Flags ─────────────────────────────────────────────────────

def resolve_flag(*, flag_id: int, resolved_by: str) -> int:
    """Mark an epistemic flag as resolved. Returns rows affected."""
    conn = get_connection()
    # Ensure resolved_by column exists (v21 migration safety)
    try:
        conn.execute(
            "ALTER TABLE epistemic_flags ADD COLUMN resolved_by TEXT"
        )
    except sqlite3.OperationalError:
        pass

    cursor = conn.execute("""
        UPDATE epistemic_flags
        SET resolved = TRUE,
            resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            resolved_by = ?
        WHERE id = ?
    """, (resolved_by, flag_id))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        print(f"warning: no flag found for id={flag_id}", file=sys.stderr)
    else:
        print(f"flag resolved: epistemic_flags/{flag_id} by {resolved_by}")
    return affected


# ── Engineering Incidents ───────────────────────────────────────────────

def record_incident(
    *,
    incident_type: str,
    description: str,
    session_id: int | None = None,
    severity: str = "moderate",
    tool_name: str | None = None,
    tool_context: str | None = None,
    detection_tier: int = 1,
) -> None:
    """Record an engineering incident, incrementing recurrence on duplicates."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, recurrence FROM engineering_incidents "
        "WHERE incident_type = ? AND graduated = 0 "
        "ORDER BY created_at DESC LIMIT 1",
        (incident_type,)
    ).fetchone()

    if row:
        conn.execute(
            "UPDATE engineering_incidents SET recurrence = ?, "
            "description = ?, tool_name = ?, tool_context = ?, "
            "session_id = ?, severity = ? "
            "WHERE id = ?",
            (row[1] + 1, description, tool_name,
             tool_context, session_id, severity, row[0])
        )
        print(f"incremented: engineering_incidents/{incident_type} "
              f"(recurrence={row[1] + 1})")
    else:
        conn.execute(
            "INSERT INTO engineering_incidents "
            "(session_id, incident_type, detection_tier, severity, "
            "description, tool_name, tool_context) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (session_id, incident_type, detection_tier, severity,
             description, tool_name, tool_context)
        )
        print(f"recorded: engineering_incidents/{incident_type}")

    conn.commit()
    conn.close()


# ── Universal Facets ────────────────────────────────────────────────────

def add_facet(
    *,
    entity_type: str,
    entity_id: int,
    facet_type: str,
    facet_value: str,
) -> None:
    """Add a universal facet to any entity."""
    conn = get_connection()
    conn.execute(
        "INSERT OR IGNORE INTO universal_facets "
        "(entity_type, entity_id, facet_type, facet_value) "
        "VALUES (?, ?, ?, ?)",
        (entity_type, entity_id, facet_type, facet_value),
    )
    conn.commit()
    conn.close()
    print(f"facet: {entity_type}/{entity_id} "
          f"+{facet_type}={facet_value}")


def query_facets(*, facet_type: str, facet_value: str) -> list[dict]:
    """Query entities by facet type and value."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT entity_type, entity_id, facet_type, facet_value "
        "FROM universal_facets WHERE facet_type = ? AND facet_value = ? "
        "ORDER BY entity_type, entity_id",
        (facet_type, facet_value),
    ).fetchall()
    conn.close()
    return [
        {"entity_type": r[0], "entity_id": r[1],
         "facet_type": r[2], "facet_value": r[3]}
        for r in rows
    ]

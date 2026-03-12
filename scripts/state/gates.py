"""
gates — Gated autonomous chain management.

Aggregate root: Gate (gate_id).
Operations: open, resolve, timeout, query status.
"""

import json
import sqlite3
import sys

from .connection import get_connection


def _ensure_gates_table(conn: sqlite3.Connection) -> None:
    """Create active_gates table if missing (schema v10 migration safety)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS active_gates (
            gate_id             TEXT PRIMARY KEY,
            sending_agent       TEXT NOT NULL,
            receiving_agent     TEXT NOT NULL,
            session_name        TEXT NOT NULL,
            outbound_filename   TEXT NOT NULL,
            blocks_until        TEXT NOT NULL DEFAULT 'response',
            timeout_minutes     INTEGER NOT NULL DEFAULT 60,
            fallback_action     TEXT NOT NULL DEFAULT 'continue-without-response',
            status              TEXT NOT NULL DEFAULT 'waiting',
            created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
            resolved_at         TEXT,
            resolved_by         TEXT,
            timeout_at          TEXT NOT NULL
        )
    """)


def open_gate(
    *,
    gate_id: str,
    sending_agent: str,
    receiving_agent: str,
    session: str,
    filename: str,
    blocks_until: str = "response",
    timeout_minutes: int = 60,
    fallback_action: str = "continue-without-response",
) -> None:
    """Open a gated chain — blocks until response, ACK, or timeout."""
    conn = get_connection()
    _ensure_gates_table(conn)

    capped_timeout = min(timeout_minutes, 1440)  # cap at 24h
    conn.execute("""
        INSERT OR REPLACE INTO active_gates
            (gate_id, sending_agent, receiving_agent, session_name,
             outbound_filename, blocks_until, timeout_minutes,
             fallback_action, status, timeout_at)
        VALUES (?, ?, ?, ?, ?, ?, ?,
                ?, 'waiting',
                strftime('%Y-%m-%dT%H:%M:%S',
                         datetime('now', 'localtime', '+' || ? || ' minutes')))
    """, (
        gate_id, sending_agent, receiving_agent,
        session, filename, blocks_until,
        capped_timeout, fallback_action,
        str(capped_timeout),
    ))
    conn.commit()
    conn.close()
    print(f"gate opened: {gate_id} "
          f"({sending_agent} → {receiving_agent}, "
          f"timeout {capped_timeout}min)")


def resolve_gate(*, gate_id: str, resolved_by: str) -> int:
    """Resolve a waiting gate. Returns rows affected."""
    conn = get_connection()
    cursor = conn.execute("""
        UPDATE active_gates
        SET status = 'resolved',
            resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            resolved_by = ?
        WHERE gate_id = ? AND status = 'waiting'
    """, (resolved_by, gate_id))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        print(f"warning: no waiting gate found for gate_id={gate_id}",
              file=sys.stderr)
    else:
        print(f"gate resolved: {gate_id} by {resolved_by}")
    return affected


def timeout_gate(*, gate_id: str) -> int:
    """Mark a gate as timed out. Returns rows affected."""
    conn = get_connection()
    cursor = conn.execute("""
        UPDATE active_gates
        SET status = 'timed-out',
            resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE gate_id = ? AND status = 'waiting'
    """, (gate_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        print(f"warning: no waiting gate found for gate_id={gate_id}",
              file=sys.stderr)
    else:
        print(f"gate timed out: {gate_id}")
    return affected


def query_status(*, agent_id: str | None = None) -> dict:
    """Query active (waiting) gates. Returns structured result dict."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row

    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='active_gates'"
    ).fetchall()]
    if "active_gates" not in tables:
        conn.close()
        return {"active_gates": 0, "gates": []}

    query = """
        SELECT gate_id, sending_agent, receiving_agent, session_name,
               outbound_filename, blocks_until, timeout_minutes,
               fallback_action, status, created_at, timeout_at,
               resolved_at, resolved_by
        FROM active_gates
        WHERE status = 'waiting'
    """
    params: tuple = ()
    if agent_id:
        query += " AND (sending_agent = ? OR receiving_agent = ?)"
        params = (agent_id, agent_id)
    query += " ORDER BY created_at"

    rows = conn.execute(query, params).fetchall()
    gates = [dict(r) for r in rows]
    conn.close()

    return {"active_gates": len(gates), "gates": gates}

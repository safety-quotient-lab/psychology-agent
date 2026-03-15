"""events — Episodic event store for hippocampal replay.
Aggregate root: event_log entry (event_id). Spec: docs/event-sourced-memory.md §2.1-2.2.
Categories: governance, transport, state, self_model, mesh."""

import json
from datetime import datetime, timezone
from .connection import get_connection

VALID_CATEGORIES = ("governance", "transport", "state", "self_model", "mesh")


def emit_event(*, event_type: str, category: str, payload: dict,
               session_id: int | None = None, agent_id: str = "psychology-agent",
               a2a_snapshot: dict | None = None) -> str:
    """Write an episodic event to event_log. Returns generated event_id."""
    if category not in VALID_CATEGORIES:
        raise ValueError(f"category must fall within {VALID_CATEGORIES}, got '{category}'")
    now = datetime.now(timezone.utc)
    event_id = f"evt-{now.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]}Z-{agent_id}"
    conn = get_connection()
    conn.execute(
        """INSERT OR IGNORE INTO event_log
           (event_id, timestamp, agent_id, event_type, category, payload, session_id, a2a_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (event_id, now.isoformat(), agent_id, event_type, category,
         json.dumps(payload), session_id,
         json.dumps(a2a_snapshot) if a2a_snapshot else None))
    conn.commit(); conn.close()
    print(f"emitted: event_log/{event_type} ({category})")
    return event_id


def query_events(*, category: str | None = None, event_type: str | None = None,
                 session_id: int | None = None, consolidated: bool | None = None,
                 limit: int = 100) -> list[dict]:
    """Query event_log with optional filters. Returns list of dicts."""
    clauses, params = [], []
    if category:
        clauses.append("category = ?"); params.append(category)
    if event_type:
        clauses.append("event_type = ?"); params.append(event_type)
    if session_id is not None:
        clauses.append("session_id = ?"); params.append(session_id)
    if consolidated is not None:
        clauses.append("consolidated = ?"); params.append(int(consolidated))
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    conn = get_connection()
    conn.row_factory = lambda cur, row: {col[0]: row[i] for i, col in enumerate(cur.description)}
    rows = conn.execute(f"SELECT * FROM event_log {where} ORDER BY id DESC LIMIT ?",
                        [*params, limit]).fetchall()
    conn.close()
    return rows


def mark_consolidated(*, event_ids: list[str]) -> int:
    """Mark events as consolidated (replayed). Returns count updated."""
    if not event_ids:
        return 0
    placeholders = ",".join("?" for _ in event_ids)
    conn = get_connection()
    cursor = conn.execute(
        f"UPDATE event_log SET consolidated = TRUE WHERE event_id IN ({placeholders})",
        event_ids)
    conn.commit(); count = cursor.rowcount; conn.close()
    print(f"consolidated: {count} events")
    return count


def event_summary(*, session_id: int | None = None) -> dict:
    """Return counts by category and event_type."""
    conn = get_connection()
    clause, params = "", []
    if session_id is not None:
        clause = "WHERE session_id = ?"; params = [session_id]
    rows = conn.execute(
        f"SELECT category, event_type, COUNT(*) FROM event_log {clause} GROUP BY category, event_type",
        params).fetchall()
    conn.close()
    return {cat: {et: n for c2, et, n in rows if c2 == cat} for cat, _, _ in rows}

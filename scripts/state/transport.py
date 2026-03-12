"""
transport — Transport message indexing, processing, and turn management.

Aggregate root: TransportMessage (session_name + filename).
Operations: index, mark processed, compute next turn, compute content ID.
"""

import hashlib
import json
import sqlite3
from pathlib import Path

from .connection import get_connection, PROJECT_ROOT


def compute_content_id(session_name: str, filename: str) -> str | None:
    """Compute SHA-256 content-addressable ID from a transport JSON file.

    Returns the hex digest, or None if the file cannot be read.
    Canonical form: sorted-keys JSON with no trailing whitespace.
    """
    filepath = PROJECT_ROOT / "transport" / "sessions" / session_name / filename
    if not filepath.exists():
        return None
    try:
        raw = json.loads(filepath.read_text())
        canonical = json.dumps(raw, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    except (json.JSONDecodeError, OSError):
        return None


def _ensure_transport_columns(conn: sqlite3.Connection) -> None:
    """Migration safety — add columns introduced after the base schema."""
    for col, col_type, default in [
        ("issue_url", "TEXT", "NULL"),
        ("issue_number", "INTEGER", "NULL"),
        ("issue_pending", "INTEGER", "0"),
        ("thread_id", "TEXT", "NULL"),
        ("parent_thread_id", "TEXT", "NULL"),
        ("message_cid", "TEXT", "NULL"),
        ("problem_type", "TEXT", "NULL"),
        ("task_state", "TEXT", "'pending'"),
        ("expires_at", "TEXT", "NULL"),
    ]:
        try:
            conn.execute(
                f"ALTER TABLE transport_messages ADD COLUMN {col} {col_type} DEFAULT {default}"
            )
        except sqlite3.OperationalError:
            pass


def index_message(
    *,
    session: str,
    filename: str,
    turn: int,
    message_type: str,
    from_agent: str,
    to_agent: str,
    timestamp: str,
    subject: str = "",
    claims_count: int = 0,
    setl: float = 0.0,
    urgency: str = "normal",
    issue_url: str | None = None,
    issue_number: int | None = None,
    issue_pending: bool = False,
    thread_id: str | None = None,
    parent_thread_id: str | None = None,
    message_cid: str | None = None,
    problem_type: str | None = None,
    task_state: str = "pending",
    expires_at: str | None = None,
) -> str:
    """Index a transport message in state.db.

    Returns the message_cid (computed if not provided).
    """
    conn = get_connection()
    _ensure_transport_columns(conn)

    if not message_cid:
        message_cid = compute_content_id(session, filename)

    resolved_thread_id = thread_id or session

    conn.execute("""
        INSERT OR REPLACE INTO transport_messages
            (session_name, filename, turn, message_type, from_agent, to_agent,
             timestamp, subject, claims_count, setl, urgency, processed, processed_at,
             issue_url, issue_number, issue_pending,
             thread_id, parent_thread_id, message_cid, problem_type,
             task_state, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NULL, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?)
    """, (
        session, filename, turn, message_type,
        from_agent, to_agent, timestamp,
        subject, claims_count, setl, urgency,
        issue_url, issue_number,
        1 if issue_pending else 0,
        resolved_thread_id, parent_thread_id, message_cid, problem_type,
        task_state, expires_at,
    ))
    conn.commit()
    conn.close()

    label = f"indexed: transport_messages/{filename}"
    if message_cid:
        label += f" [cid:{message_cid[:12]}]"
    print(label)
    return message_cid or ""


def mark_processed(*, filename: str, session: str | None = None) -> int:
    """Mark a transport message as processed. Returns rows affected."""
    conn = get_connection()
    if session:
        cursor = conn.execute("""
            UPDATE transport_messages
            SET processed = TRUE,
                processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
                task_state = 'completed'
            WHERE session_name = ? AND filename = ?
        """, (session, filename))
    else:
        cursor = conn.execute("""
            UPDATE transport_messages
            SET processed = TRUE,
                processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
                task_state = 'completed'
            WHERE filename = ?
        """, (filename,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        print(f"warning: no row found for filename={filename}", file=sys.stderr)
    else:
        print(f"marked processed: {filename}")
    return affected


def next_turn(*, session: str) -> int:
    """Compute the next available turn number for a session.

    Returns MAX(turn) + 1 across all agents in the session.
    """
    conn = get_connection()
    row = conn.execute(
        "SELECT MAX(turn) FROM transport_messages WHERE session_name = ?",
        (session,)
    ).fetchone()
    max_turn = row[0] if row and row[0] is not None else 0
    conn.close()
    return max_turn + 1


def get_indexed_filenames(session_name: str) -> set[str]:
    """Get filenames already indexed in state.db for a session."""
    if not (PROJECT_ROOT / "state.db").exists():
        return set()
    try:
        conn = sqlite3.connect(str(PROJECT_ROOT / "state.db"))
        cursor = conn.execute(
            "SELECT filename FROM transport_messages WHERE session_name = ?",
            (session_name,),
        )
        filenames = {row[0] for row in cursor.fetchall()}
        conn.close()
        return filenames
    except sqlite3.OperationalError:
        return set()

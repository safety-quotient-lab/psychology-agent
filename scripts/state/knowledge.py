"""
knowledge — Memory entries, session log, and design decisions.

Three aggregate roots:
    MemoryEntry   (topic + entry_key)
    SessionEntry  (session id)
    Decision      (decision_key)
"""

from .connection import get_connection


def upsert_memory(
    *,
    topic: str,
    key: str,
    value: str,
    status: str | None = None,
    session_id: int | None = None,
) -> None:
    """Upsert a memory entry. Topic + key form the composite primary key."""
    conn = get_connection()
    conn.execute("""
        INSERT INTO memory_entries (topic, entry_key, value, status, last_confirmed, session_id)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'), ?)
        ON CONFLICT(topic, entry_key) DO UPDATE SET
            value = excluded.value,
            status = excluded.status,
            last_confirmed = excluded.last_confirmed,
            session_id = COALESCE(excluded.session_id, session_id)
    """, (topic, key, value, status, session_id))
    conn.commit()
    conn.close()
    print(f"upserted: memory_entries/{topic}/{key}")


def upsert_session(
    *,
    session_id: int,
    timestamp: str,
    summary: str,
    artifacts: str | None = None,
    flags: str | None = None,
) -> None:
    """Upsert a session log entry."""
    conn = get_connection()
    conn.execute("""
        INSERT OR REPLACE INTO session_log (id, timestamp, summary, artifacts, epistemic_flags)
        VALUES (?, ?, ?, ?, ?)
    """, (session_id, timestamp, summary, artifacts, flags))
    conn.commit()
    conn.close()
    print(f"upserted: session_log/{session_id}")


def upsert_decision(
    *,
    key: str,
    text: str,
    date: str,
    source: str | None = None,
    confidence: float | None = None,
) -> None:
    """Upsert a design decision in the decision chain."""
    conn = get_connection()
    conn.execute("""
        INSERT INTO decision_chain (decision_key, decision_text, evidence_source, decided_date, confidence)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(decision_key) DO UPDATE SET
            decision_text = excluded.decision_text,
            evidence_source = COALESCE(excluded.evidence_source, evidence_source),
            decided_date = excluded.decided_date,
            confidence = COALESCE(excluded.confidence, confidence)
    """, (key, text, source, date, confidence))
    conn.commit()
    conn.close()
    print(f"upserted: decision_chain/{key}")

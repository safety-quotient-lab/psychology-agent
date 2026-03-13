"""
cogarch — Cognitive architecture telemetry and lessons.

Two aggregate roots:
    Trigger  (trigger_id, e.g. T3)
    Lesson   (title, unique)
"""

from .connection import get_connection


def fire_trigger(*, trigger_id: str) -> None:
    """Record a trigger firing — increment counter, update timestamp."""
    conn = get_connection()
    conn.execute("""
        UPDATE trigger_state
        SET last_fired = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            fire_count = fire_count + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE trigger_id = ?
    """, (trigger_id,))
    conn.commit()
    conn.close()
    print(f"fired: trigger_state/{trigger_id}")


def log_activation(
    *,
    session_id: int,
    trigger_id: str,
    check_number: int | None = None,
    tier: str,
    mode: str | None = None,
    fired: bool = True,
    result: str | None = None,
    action_taken: str | None = None,
) -> None:
    """Log a trigger check activation for metacognitive tracking."""
    conn = get_connection()
    conn.execute("""
        INSERT INTO trigger_activations
            (session_id, trigger_id, check_number, tier, mode, fired, result,
             action_taken, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?,
                strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
    """, (
        session_id, trigger_id, check_number, tier, mode,
        1 if fired else 0, result, action_taken,
    ))
    conn.commit()
    conn.close()
    print(f"logged: trigger_activations/{trigger_id}#{check_number} → {result}")


def log_work_carryover(
    *,
    session_id: int,
    work_item: str,
    status: str,
    reason: str | None = None,
    sessions_carried: int = 1,
) -> None:
    """Log work that carries over to the next session.

    Feeds the metacognitive layer with work completion patterns —
    which work types complete in-session vs. span multiple sessions.
    """
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS work_carryover (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id      INTEGER NOT NULL,
            work_item       TEXT NOT NULL,
            status          TEXT NOT NULL,
            reason          TEXT,
            sessions_carried INTEGER DEFAULT 1,
            resolved_session INTEGER,
            resolved_at     TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        )
    """)
    # Check if this work item already exists (carried from prior session)
    row = conn.execute(
        "SELECT id, sessions_carried FROM work_carryover WHERE work_item = ? AND resolved_session IS NULL",
        (work_item,),
    ).fetchone()
    if row:
        conn.execute(
            "UPDATE work_carryover SET sessions_carried = ?, session_id = ? WHERE id = ?",
            (row[1] + 1, session_id, row[0]),
        )
        print(f"carried: work_carryover/{work_item} (session {row[1] + 1})")
    else:
        conn.execute("""
            INSERT INTO work_carryover (session_id, work_item, status, reason, sessions_carried)
            VALUES (?, ?, ?, ?, ?)
        """, (session_id, work_item, status, reason, sessions_carried))
        print(f"created: work_carryover/{work_item}")
    conn.commit()
    conn.close()


def resolve_work_carryover(*, work_item: str, session_id: int) -> None:
    """Mark a carried-over work item as resolved."""
    conn = get_connection()
    conn.execute("""
        UPDATE work_carryover
        SET resolved_session = ?,
            resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            status = 'completed'
        WHERE work_item = ? AND resolved_session IS NULL
    """, (session_id, work_item))
    conn.commit()
    conn.close()
    print(f"resolved: work_carryover/{work_item}")


def upsert_lesson(
    *,
    title: str,
    date: str,
    pattern_type: str | None = None,
    domain: str | None = None,
    severity: str | None = None,
    recurrence: int = 1,
    trigger_relevant: str | None = None,
    promotion_status: str | None = None,
    lesson_text: str | None = None,
) -> None:
    """Upsert a lesson entry. Title serves as the unique key."""
    conn = get_connection()
    # Ensure table exists (schema v7 migration-safe)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS lessons (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            title            TEXT NOT NULL UNIQUE,
            lesson_date      TEXT NOT NULL,
            pattern_type     TEXT,
            domain           TEXT,
            severity         TEXT,
            recurrence       INTEGER DEFAULT 1,
            first_seen       TEXT,
            last_seen        TEXT,
            trigger_relevant TEXT,
            promotion_status TEXT,
            graduated_to     TEXT,
            graduated_date   TEXT,
            lesson_text      TEXT,
            created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
        )
    """)
    conn.execute("""
        INSERT INTO lessons
            (title, lesson_date, pattern_type, domain, severity, recurrence,
             first_seen, last_seen, trigger_relevant, promotion_status, lesson_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(title) DO UPDATE SET
            pattern_type = COALESCE(excluded.pattern_type, pattern_type),
            domain = COALESCE(excluded.domain, domain),
            severity = COALESCE(excluded.severity, severity),
            recurrence = COALESCE(excluded.recurrence, recurrence),
            last_seen = COALESCE(excluded.last_seen, last_seen),
            trigger_relevant = COALESCE(excluded.trigger_relevant, trigger_relevant),
            promotion_status = COALESCE(excluded.promotion_status, promotion_status),
            lesson_text = COALESCE(excluded.lesson_text, lesson_text)
    """, (
        title, date, pattern_type, domain,
        severity, recurrence,
        date, date,  # first_seen = last_seen on initial insert
        trigger_relevant, promotion_status, lesson_text,
    ))
    conn.commit()
    conn.close()
    print(f"upserted: lessons/{title}")

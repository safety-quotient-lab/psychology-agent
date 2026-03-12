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

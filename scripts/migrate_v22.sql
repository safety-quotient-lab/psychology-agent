-- Schema migration v22: Triage columns for crystallized sync
-- Adds deterministic message classification fields to transport_messages.
-- Design: docs/crystallized-sync-spec.md
--
-- Run: sqlite3 state.db < scripts/migrate_v22.sql

ALTER TABLE transport_messages ADD COLUMN triage_score INTEGER;
ALTER TABLE transport_messages ADD COLUMN triage_disposition TEXT;
ALTER TABLE transport_messages ADD COLUMN triage_at TEXT;

CREATE INDEX IF NOT EXISTS idx_transport_triage
    ON transport_messages (triage_disposition)
    WHERE triage_disposition IS NOT NULL;

INSERT OR REPLACE INTO schema_version (version, description, applied_at)
VALUES (22, 'Triage columns for crystallized sync',
        strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'));

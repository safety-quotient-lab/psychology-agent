-- Psychology Agent State Layer — SQLite Schema
-- Version: 1.0 (2026-03-09)
-- Purpose: Queryable structured state alongside markdown files.
--          Phase 1: markdown = source of truth, DB = queryable index.
--          Phase 2 (autonomous): DB = source of truth, markdown = derived view.
--
-- Recovery: bootstrap_state_db.py rebuilds all tables from markdown + JSON files.
-- Location: state.db in project root (gitignored).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;


-- Transport message index (metadata only — full JSON stays on disk)
CREATE TABLE IF NOT EXISTS transport_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_name    TEXT NOT NULL,
    filename        TEXT NOT NULL UNIQUE,
    turn            INTEGER NOT NULL,
    message_type    TEXT,
    from_agent      TEXT NOT NULL,
    to_agent        TEXT NOT NULL,
    timestamp       TEXT NOT NULL,
    subject         TEXT,
    claims_count    INTEGER DEFAULT 0,
    setl            REAL,
    urgency         TEXT DEFAULT 'normal',
    processed       BOOLEAN DEFAULT FALSE,
    processed_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_transport_unprocessed
    ON transport_messages (processed) WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_transport_session_turn
    ON transport_messages (session_name, turn);


-- Memory entries (structured index of topic file contents)
CREATE TABLE IF NOT EXISTS memory_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topic           TEXT NOT NULL,
    entry_key       TEXT NOT NULL,
    value           TEXT NOT NULL,
    status          TEXT,
    last_confirmed  TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    session_id      INTEGER,
    derives_from    INTEGER REFERENCES memory_entries(id),
    UNIQUE(topic, entry_key)
);

CREATE INDEX IF NOT EXISTS idx_memory_topic
    ON memory_entries (topic);

CREATE INDEX IF NOT EXISTS idx_memory_stale
    ON memory_entries (last_confirmed) WHERE status != '✓';


-- Decision chain (reasoning provenance with backreferences)
CREATE TABLE IF NOT EXISTS decision_chain (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_key    TEXT NOT NULL UNIQUE,
    decision_text   TEXT NOT NULL,
    evidence_source TEXT,
    derives_from    INTEGER REFERENCES decision_chain(id),
    decided_date    TEXT NOT NULL,
    confidence      REAL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_decision_date
    ON decision_chain (decided_date);


-- Trigger state (cogarch trigger metadata for autonomous decay tracking)
CREATE TABLE IF NOT EXISTS trigger_state (
    trigger_id      TEXT PRIMARY KEY,
    description     TEXT,
    last_fired      TEXT,
    fire_count      INTEGER DEFAULT 0,
    relevance_score REAL DEFAULT 1.0,
    decay_rate      REAL DEFAULT 0.0,
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);


-- Session log (structured index of lab-notebook session entries)
CREATE TABLE IF NOT EXISTS session_log (
    id              INTEGER PRIMARY KEY,
    timestamp       TEXT NOT NULL,
    summary         TEXT NOT NULL,
    artifacts       TEXT,
    epistemic_flags TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);


-- Claims registry (verified claims from transport messages)
CREATE TABLE IF NOT EXISTS claims (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    transport_msg   INTEGER REFERENCES transport_messages(id),
    claim_id        TEXT NOT NULL,
    claim_text      TEXT NOT NULL,
    confidence      REAL,
    confidence_basis TEXT,
    verified        BOOLEAN DEFAULT FALSE,
    verified_at     TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_claims_unverified
    ON claims (verified) WHERE verified = FALSE;


-- Epistemic flags archive (audit trail across sessions)
CREATE TABLE IF NOT EXISTS epistemic_flags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER,
    source          TEXT NOT NULL,
    flag_text       TEXT NOT NULL,
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_at     TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_flags_unresolved
    ON epistemic_flags (resolved) WHERE resolved = FALSE;


-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version         INTEGER PRIMARY KEY,
    applied_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    description     TEXT
);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Initial schema — transport, memory, decisions, triggers, sessions, claims, flags');

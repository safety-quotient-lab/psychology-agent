-- schema.sql — Canonical schema for operations-agent state.db
--
-- Source of truth for table structure. Markdown remains source of truth
-- for content (Phase 1 dual-write protocol). If state.db goes missing,
-- run bootstrap-state-db.sh to rebuild from this schema + existing data.
--
-- Naming conventions (from platform/shared/cogarch/rules/sqlite.md):
--   - Table names: snake_case, plural
--   - Column names: snake_case
--   - Timestamps: *_at suffix, TEXT in ISO 8601 format
--   - Booleans: INTEGER (0/1)
--
-- Schema version: 1

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── Schema versioning ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_versions (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

INSERT OR IGNORE INTO schema_versions (version, description)
VALUES (1, 'Initial schema — budget, kb tables, cogarch state, transport index');

-- ── Autonomy budget ───────────────────────────────────────────────
-- Actively queried by internal/budget/gate.go via sqlite3 CLI.
-- One row per agent managed by this meshd instance.

CREATE TABLE IF NOT EXISTS autonomy_budget (
    agent_id           TEXT PRIMARY KEY,
    budget_spent       INTEGER NOT NULL DEFAULT 0,
    budget_cutoff      INTEGER NOT NULL DEFAULT 0,  -- 0 = unlimited
    shadow_mode        INTEGER NOT NULL DEFAULT 0,
    consecutive_blocks INTEGER NOT NULL DEFAULT 0,
    last_audit         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Knowledge base tables ─────────────────────────────────────────
-- Queried by internal/server/kb.go for the /api/kb endpoint.
-- Each table gracefully degrades — missing table returns empty array.

CREATE TABLE IF NOT EXISTS decisions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_key TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    source       TEXT,
    status       TEXT NOT NULL DEFAULT 'active',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claims (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id       TEXT NOT NULL,
    transport_msg  TEXT,
    content        TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'unverified',
    verified_at    TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trigger_state (
    trigger_id   TEXT PRIMARY KEY,
    description  TEXT,
    tier         TEXT NOT NULL DEFAULT 'fluid',
    last_fired   TEXT,
    fire_count   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topic           TEXT NOT NULL,
    entry_key       TEXT NOT NULL,
    value           TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    last_confirmed  TEXT NOT NULL DEFAULT (datetime('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(topic, entry_key)
);

-- ── Transport message index ───────────────────────────────────────
-- Queryable index of transport messages. Source files remain in
-- transport/sessions/ (immutable record).

CREATE TABLE IF NOT EXISTS transport_messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    filename      TEXT NOT NULL,
    session_name  TEXT NOT NULL,
    direction     TEXT NOT NULL,
    from_agent    TEXT,
    to_agent      TEXT,
    turn          INTEGER,
    message_type  TEXT,
    subject       TEXT NOT NULL CHECK(length(trim(subject)) > 0),
    timestamp     TEXT NOT NULL DEFAULT (datetime('now')),
    processed     INTEGER NOT NULL DEFAULT 0,
    processed_at  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_name, filename)
);

-- ── Cogarch state tracking ────────────────────────────────────────
-- Tracks cogarch versions across all mesh agents for sync detection.
-- Updated by the cross-repo fetcher when polling peer repos.

CREATE TABLE IF NOT EXISTS cogarch_state (
    agent_id      TEXT PRIMARY KEY,
    version       TEXT,
    content_hash  TEXT NOT NULL,
    synced_at     TEXT NOT NULL DEFAULT (datetime('now')),
    source        TEXT NOT NULL DEFAULT 'local',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Mesh Operations Score (MOS) ───────────────────────────────────
-- Stores scoring runs for security, health, compliance, opsec pedagogy.

CREATE TABLE IF NOT EXISTS mos_scores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scoring_domain  TEXT NOT NULL,
    dimension       TEXT NOT NULL,
    result          TEXT NOT NULL,
    details         TEXT,
    run_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Universal facets ──────────────────────────────────────────────
-- Polymorphic entity tagging — any table row can carry any facet.
-- No FK constraint (SQLite cannot enforce polymorphic FKs).

CREATE TABLE IF NOT EXISTS universal_facets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type  TEXT NOT NULL,
    entity_id    INTEGER NOT NULL,
    facet_type   TEXT NOT NULL,
    facet_value  TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(entity_type, entity_id, facet_type, facet_value)
);

-- ── Spawn log ─────────────────────────────────────────────────
-- Records every Claude spawn attempt for observability and cost tracking.

CREATE TABLE IF NOT EXISTS deliberation_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id     TEXT NOT NULL,
    event_id     TEXT,
    prompt       TEXT,
    exit_code    INTEGER,
    duration_ms  INTEGER,
    cost         INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'completed',
    error        TEXT,
    started_at   TEXT NOT NULL DEFAULT (datetime('now')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Health observations ───────────────────────────────────────
-- Persists health monitor findings for trend analysis.

CREATE TABLE IF NOT EXISTS health_observations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id      TEXT NOT NULL,
    check_type    TEXT NOT NULL,
    status        TEXT NOT NULL,
    detail        TEXT,
    observed_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Full-text search (FTS5) ───────────────────────────────────
-- Virtual tables for fast keyword search across transport messages,
-- decisions, and vocabulary. Populated via triggers on base tables.

CREATE VIRTUAL TABLE IF NOT EXISTS fts_messages USING fts5(
    session_name, from_agent, to_agent, message_type, subject,
    content='transport_messages',
    content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_decisions USING fts5(
    decision_key, title, source,
    content='decisions',
    content_rowid='id'
);

-- Triggers to keep FTS in sync with base tables
CREATE TRIGGER IF NOT EXISTS fts_messages_insert AFTER INSERT ON transport_messages BEGIN
    INSERT INTO fts_messages(rowid, session_name, from_agent, to_agent, message_type, subject)
    VALUES (new.id, new.session_name, new.from_agent, new.to_agent, new.message_type, new.subject);
END;

CREATE TRIGGER IF NOT EXISTS fts_decisions_insert AFTER INSERT ON decisions BEGIN
    INSERT INTO fts_decisions(rowid, decision_key, title, source)
    VALUES (new.id, new.decision_key, new.title, new.source);
END;

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_memory_topic ON memory_entries(topic);
CREATE INDEX IF NOT EXISTS idx_memory_status ON memory_entries(status);
CREATE INDEX IF NOT EXISTS idx_transport_session ON transport_messages(session_name);
CREATE INDEX IF NOT EXISTS idx_transport_processed ON transport_messages(processed);
CREATE INDEX IF NOT EXISTS idx_mos_domain ON mos_scores(scoring_domain);
CREATE INDEX IF NOT EXISTS idx_mos_run_at ON mos_scores(run_at);
CREATE INDEX IF NOT EXISTS idx_facets_entity ON universal_facets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_facets_type_value ON universal_facets(facet_type, facet_value);
CREATE INDEX IF NOT EXISTS idx_deliberation_agent ON deliberation_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_deliberation_started ON deliberation_log(started_at);
CREATE INDEX IF NOT EXISTS idx_health_agent ON health_observations(agent_id);
CREATE INDEX IF NOT EXISTS idx_health_observed ON health_observations(observed_at);

-- ── Compositor tables (ported from CF Worker KV) ─────────────────

CREATE TABLE IF NOT EXISTS api_keys (
    token_hash TEXT PRIMARY KEY,
    identity TEXT NOT NULL,
    label TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    revoked INTEGER DEFAULT 0,
    revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_identity ON api_keys(identity);

CREATE TABLE IF NOT EXISTS rate_limits (
    client_id TEXT NOT NULL,
    window TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (client_id, window)
);

CREATE TABLE IF NOT EXISTS trust_matrix (
    agent_id TEXT PRIMARY KEY,
    availability REAL DEFAULT 0.5,
    integrity REAL DEFAULT 0.5,
    compliance REAL DEFAULT 0.5,
    epistemic_honesty REAL DEFAULT 0.5,
    observations INTEGER DEFAULT 0,
    first_observed TEXT,
    last_observed TEXT
);

CREATE TABLE IF NOT EXISTS relay_nonces (
    nonce TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mesh_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    source TEXT,
    priority INTEGER DEFAULT 2,
    agent_id TEXT,
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mesh_events_created ON mesh_events(created_at);
CREATE INDEX IF NOT EXISTS idx_mesh_events_type ON mesh_events(event_type);

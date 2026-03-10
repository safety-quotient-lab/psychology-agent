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
    ack_required    INTEGER DEFAULT 0,
    ack_received    INTEGER DEFAULT 0,
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


-- PSQ operational status (typed columns for the most-queried topic)
-- Complements memory_entries — psq-status entries live here with structured
-- fields instead of free-text value column. Other topics stay in memory_entries.
CREATE TABLE IF NOT EXISTS psq_status (
    entry_key           TEXT PRIMARY KEY,
    value               TEXT NOT NULL,
    status_marker       TEXT,
    model_version       TEXT,
    calibration_id      TEXT,
    endpoint_url        TEXT,
    resolved_session    INTEGER,
    last_confirmed      TEXT,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);


-- Polythematic facets (structured subject headings for memory entries)
-- Each entry can participate in multiple thematic dimensions simultaneously.
-- Facet vocabulary kept small and mechanically derivable:
--   domain:      derived from topic filename (psq-status → psychometrics)
--   work_stream: derived from entry_key prefix (b5-* → psq-scoring/b5)
--   agent:       derived from which agent produced/owns the entry
CREATE TABLE IF NOT EXISTS entry_facets (
    entry_id    INTEGER NOT NULL REFERENCES memory_entries(id),
    facet_type  TEXT NOT NULL,
    facet_value TEXT NOT NULL,
    PRIMARY KEY (entry_id, facet_type, facet_value)
);

CREATE INDEX IF NOT EXISTS idx_facet_lookup
    ON entry_facets (facet_type, facet_value);

CREATE INDEX IF NOT EXISTS idx_facet_entry
    ON entry_facets (entry_id);


-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version         INTEGER PRIMARY KEY,
    applied_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    description     TEXT
);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Initial schema — transport, memory, decisions, triggers, sessions, claims, flags');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (2, 'Add psq_status (typed topic table), entry_facets (polythematic subject headings)');

-- ── Schema v3: Autonomous operation (EF-1 trust model) ─────────────────

-- Trust budget — tracks autonomous operation credits per agent
CREATE TABLE IF NOT EXISTS trust_budget (
    agent_id             TEXT PRIMARY KEY,
    budget_max           INTEGER NOT NULL DEFAULT 20,
    budget_current       INTEGER NOT NULL DEFAULT 20,
    min_action_interval  INTEGER NOT NULL DEFAULT 300,
    last_audit           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    last_action          TEXT,
    consecutive_blocks   INTEGER DEFAULT 0,
    shadow_mode          INTEGER NOT NULL DEFAULT 1,
    updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

-- Autonomous actions audit trail — every action taken without human mediation
CREATE TABLE IF NOT EXISTS autonomous_actions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id            TEXT NOT NULL,
    action_type         TEXT NOT NULL,
    action_class        TEXT NOT NULL,
    evaluator_tier      INTEGER NOT NULL,
    evaluator_result    TEXT NOT NULL,
    knock_on_depth      INTEGER DEFAULT 0,
    resolution_level    TEXT,
    description         TEXT NOT NULL,
    adversarial_reason  TEXT,
    peer_reviewed_by    TEXT,
    budget_before       INTEGER NOT NULL,
    budget_after        INTEGER NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_actions_agent
    ON autonomous_actions (agent_id, created_at);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (3, 'Add trust_budget, autonomous_actions (EF-1 evaluator-as-arbiter trust model)');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (4, 'Add shadow_mode to trust_budget, adversarial_reason + peer_reviewed_by to autonomous_actions (EF-1 flag mitigations)');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (5, 'Add ack_required + ack_received to transport_messages (optional ACK protocol)');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (6, 'MANIFEST.json now auto-generated from transport_messages (generate_manifest.py). Completed history dropped from MANIFEST — lives in state.db and git history.');


-- ── Schema v7: Lessons index ────────────────────────────────────────

-- Structured index of lessons.md entries (gitignored, like lessons.md itself).
-- Frontmatter fields become queryable columns; narrative prose stays in markdown.
CREATE TABLE IF NOT EXISTS lessons (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL UNIQUE,
    lesson_date         TEXT NOT NULL,
    pattern_type        TEXT,
    domain              TEXT,
    severity            TEXT,
    recurrence          INTEGER DEFAULT 1,
    first_seen          TEXT,
    last_seen           TEXT,
    trigger_relevant    TEXT,
    promotion_status    TEXT,
    graduated_to        TEXT,
    graduated_date      TEXT,
    lesson_text         TEXT,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_promotion
    ON lessons (promotion_status) WHERE promotion_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_pattern_domain
    ON lessons (pattern_type, domain);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (7, 'Add lessons table — structured index of lessons.md entries for promotion scan and recurrence tracking');


-- ── Schema v8: State lifecycle + visibility ─────────────────────────

-- Per-table visibility defaults. Private by default — explicit promotion
-- to public or adopter-safe required. Used by export_public_state.py to
-- generate a seed DB for releases and adopters.
CREATE TABLE IF NOT EXISTS table_visibility (
    table_name          TEXT PRIMARY KEY,
    default_visibility  TEXT NOT NULL DEFAULT 'private',
    description         TEXT
);

-- Four-tier visibility:
--   public     = infrastructure that transfers to any adopter (triggers, schema)
--   shared     = research output (decisions, sessions, flags — visible on GitHub,
--                included in release exports, not seeded into adopter DBs)
--   commercial = monetizable assets (calibration pipelines, scoring rubrics,
--                curated datasets, service configs — licensed access only)
--   private    = personal state (lessons, memory, trust — never exported)
INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description) VALUES
    ('trigger_state',       'public',       'Cogarch infrastructure — triggers must exist for system to fire'),
    ('decision_chain',      'shared',       'Research output — design decisions, visible but not seeded'),
    ('session_log',         'shared',       'Research output — session history'),
    ('epistemic_flags',     'shared',       'Research output — epistemic audit trail'),
    ('transport_messages',  'shared',       'Research output — transport index, strip subjects in export'),
    ('claims',              'shared',       'Research output — verified claims from transport'),
    ('psq_status',          'commercial',   'PSQ operational status — calibration IDs, endpoint URLs, model versions'),
    ('memory_entries',      'private',      'Personal memory — not exported'),
    ('lessons',             'private',      'Personal learning log — not exported'),
    ('trust_budget',        'private',      'Operational budget — machine-specific'),
    ('autonomous_actions',  'private',      'Autonomous audit trail — machine-specific'),
    ('entry_facets',        'private',      'Derived from memory_entries — inherits private');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (8, 'State lifecycle — table_visibility with 4-tier model (public/shared/commercial/private). Commercial tier for monetizable assets (calibration, rubrics, datasets, service configs).');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (9, 'Add min_action_interval to trust_budget — temporal spacing guarantee decoupled from triggering mechanism (EF-1 trust model update)');


-- ── Schema v10: Gated autonomous chains ─────────────────────────────

-- Active gates — tracks gated message exchanges where the sender blocks
-- until the receiver responds. Gate-aware polling accelerates delivery;
-- timeout handling prevents indefinite blocking.
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
);

CREATE INDEX IF NOT EXISTS idx_gates_status
    ON active_gates (status) WHERE status = 'waiting';

INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description)
VALUES ('active_gates', 'private', 'Gate state — machine-specific operational state');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (10, 'Add active_gates table — gated autonomous chain tracking with timeout and fallback cascade');


-- ── Schema v11: Transport duplicate prevention ──────────────────────

-- Turn numbers are per-agent within a session, not globally unique per session.
-- Two agents in the same session legitimately share turn numbers (concurrent
-- assignment without a shared counter). The correct uniqueness constraint:
-- no agent writes the same turn twice in the same session.
--
-- NOTE: Historical data contains same-agent turn collisions (pre-v11 data
-- assigned turns from filenames, not state.db). The unique index cannot be
-- created if collisions exist. Use bootstrap_state_db.py --force to rebuild
-- from source files with corrected turns, or fix collisions manually before
-- applying. The index creation will silently fail on DBs with collisions —
-- future writes still benefit from the next-turn subcommand in dual_write.py.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_agent_turn_unique
    ON transport_messages (session_name, from_agent, turn);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (11, 'Unique index on (session_name, from_agent, turn) + next-turn subcommand — prevents same-agent turn collisions going forward');


-- ── Schema v12: Universal facets (dual-vocabulary classification) ─────
--
-- Plan 9 insight: disciplines are namespaces, not directories. Every entity
-- in the state layer gains facets. Query composes the view.
--
-- Universal facets decouple from memory_entries — any entity type (transport
-- messages, decisions, lessons, sessions, memory entries) can carry facets.
-- No FK constraint (SQLite cannot enforce polymorphic FKs); integrity by
-- application convention.
--
-- Two vocabularies:
--   psh         — PSH subject categories (Czech National Library, L1 + project-local)
--                 10 active PSH categories + PL-001 (ai-systems). L2-ready via
--                 slash-separated values (e.g., 'psychology/psychometrics').
--   schema_type — schema.org type per entity table (Message, Claim, Event, etc.)
--
-- Bootstrap: scripts/bootstrap_facets.py (replaces bootstrap_pje_facets.py)
-- Discovery: --discover mode surfaces vocabulary gaps via literary warrant.

CREATE TABLE IF NOT EXISTS universal_facets (
    entity_type TEXT NOT NULL,       -- table name: 'transport_messages', 'decision_chain', etc.
    entity_id   INTEGER NOT NULL,    -- row id in the source table
    facet_type  TEXT NOT NULL,        -- 'psh', 'schema_type', 'domain', 'agent', 'work_stream', etc.
    facet_value TEXT NOT NULL,
    confidence          REAL DEFAULT 1.0,    -- keyword match strength (0.0–1.0)
    keyword_hits        TEXT,                -- JSON array of matched keywords (nullable)
    computed_at         TEXT,                -- when this facet was last computed
    keyword_set_version INTEGER DEFAULT 1,   -- which keyword set version produced this facet
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    PRIMARY KEY (entity_type, entity_id, facet_type, facet_value)
);

CREATE INDEX IF NOT EXISTS idx_uf_facet_lookup
    ON universal_facets (facet_type, facet_value);

CREATE INDEX IF NOT EXISTS idx_uf_entity
    ON universal_facets (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_uf_psh
    ON universal_facets (facet_value) WHERE facet_type = 'psh';

CREATE INDEX IF NOT EXISTS idx_uf_schema_type
    ON universal_facets (facet_value) WHERE facet_type = 'schema_type';

-- Migrate existing entry_facets into universal_facets
INSERT OR IGNORE INTO universal_facets (entity_type, entity_id, facet_type, facet_value)
    SELECT 'memory_entries', entry_id, facet_type, facet_value FROM entry_facets;

INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description)
VALUES ('universal_facets', 'shared', 'Cross-entity facets — PSH subjects, schema.org types, agents, work streams. Shared because facet types and values are public vocabulary.');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (12, 'Universal facets — polymorphic entity tagging. Dual vocabulary: PSH subjects (11 L1 categories incl. PL-001 ai-systems) + schema.org types. Replaces PJE taxonomy and entry_facets FK-bound pattern.');

-- Psychology Agent State Layer — SQLite Schema
-- Version: 1.1 (2026-03-11)
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
    filename        TEXT NOT NULL,
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
    issue_url       TEXT,
    issue_number    INTEGER,
    issue_pending   INTEGER DEFAULT 0,
    -- v19: DIDComm-inspired threading + AT Protocol-inspired content addressing
    thread_id       TEXT,              -- defaults to session_name; forks for sub-threads
    parent_thread_id TEXT,             -- NULL for top-level threads
    message_cid     TEXT,              -- SHA-256 of canonical JSON content
    problem_type    TEXT,              -- NULL for normal; 'error'|'warning'|'info' for problem reports
    -- v20: A2A-inspired task state + message expiration
    task_state      TEXT DEFAULT 'pending',  -- pending|working|input-required|completed|failed|canceled|rejected
    expires_at      TEXT,              -- ISO 8601 expiration timestamp (NULL = no expiry)
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_session_filename
    ON transport_messages (session_name, filename);

CREATE INDEX IF NOT EXISTS idx_transport_unprocessed
    ON transport_messages (processed) WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_transport_session_turn
    ON transport_messages (session_name, turn);

CREATE INDEX IF NOT EXISTS idx_transport_issue_pending
    ON transport_messages (issue_pending) WHERE issue_pending = 1;

CREATE INDEX IF NOT EXISTS idx_transport_thread
    ON transport_messages (thread_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_cid
    ON transport_messages (message_cid) WHERE message_cid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transport_task_state
    ON transport_messages (task_state) WHERE task_state NOT IN ('completed', 'canceled', 'rejected');


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

-- ── Schema v3: Autonomous operation (EF-1 autonomy model) ─────────────────

-- Autonomy budget — tracks autonomous operation credits per agent
CREATE TABLE IF NOT EXISTS autonomy_budget (
    agent_id             TEXT PRIMARY KEY,
    budget_cutoff        INTEGER NOT NULL DEFAULT 0,
    budget_spent         INTEGER NOT NULL DEFAULT 0,
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
VALUES (3, 'Add autonomy_budget, autonomous_actions (EF-1 evaluator-as-arbiter autonomy model)');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (4, 'Add shadow_mode to autonomy_budget, adversarial_reason + peer_reviewed_by to autonomous_actions (EF-1 flag mitigations)');

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
    ('autonomy_budget',     'private',      'Operational budget — machine-specific'),
    ('autonomous_actions',  'private',      'Autonomous audit trail — machine-specific'),
    ('entry_facets',        'private',      'Derived from memory_entries — inherits private');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (8, 'State lifecycle — table_visibility with 4-tier model (public/shared/commercial/private). Commercial tier for monetizable assets (calibration, rubrics, datasets, service configs).');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (9, 'Add min_action_interval to autonomy_budget — temporal spacing guarantee decoupled from triggering mechanism (EF-1 autonomy model update)');


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
-- assigned turns from filenames, not state.db). A UNIQUE index here causes
-- INSERT OR IGNORE to silently drop legitimate historical messages. The
-- non-unique index still accelerates lookups; dual_write.py next-turn
-- subcommand prevents future collisions at write time.
CREATE INDEX IF NOT EXISTS idx_transport_agent_turn
    ON transport_messages (session_name, from_agent, turn);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (11, 'Index on (session_name, from_agent, turn) — non-unique to accommodate historical turn collisions; dual_write.py next-turn enforces going forward');


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


-- ── Schema v13: Facet vocabulary reference table ─────────────────────
--
-- Queryable source of truth for PSH categories and schema.org types.
-- bootstrap_facets.py Python constants remain the write-time implementation;
-- this table provides the queryable, shared registry that other scripts
-- and downstream consumers can read without importing Python.
--
-- Visibility: shared — these represent public vocabulary definitions.

CREATE TABLE IF NOT EXISTS facet_vocabulary (
    facet_type      TEXT NOT NULL,        -- 'psh' or 'schema_type'
    facet_value     TEXT NOT NULL,        -- e.g., 'psychology', 'schema:Message'
    code            TEXT,                 -- PSH code (e.g., 'PSH9194') or null for schema.org
    source          TEXT NOT NULL,        -- 'PSH', 'schema.org', or 'project-local'
    description     TEXT,                 -- human-readable description
    entity_scope    TEXT,                 -- for schema_type: which table(s) carry this type
    active          INTEGER NOT NULL DEFAULT 1,  -- 0 = retired (e.g., pje_domain)
    keyword_count   INTEGER DEFAULT 0,   -- number of keywords in the classification set
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    PRIMARY KEY (facet_type, facet_value)
);

CREATE INDEX IF NOT EXISTS idx_fv_active
    ON facet_vocabulary (facet_type) WHERE active = 1;

-- Seed PSH categories
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description, keyword_count) VALUES
    ('psh', 'psychology',          'PSH9194',  'PSH',           'Empirical, measurement, constructs, calibration, human factors',  43),
    ('psh', 'law',                 'PSH8808',  'PSH',           'Governance, obligations, precedent, rights, due process',          35),
    ('psh', 'computer-technology', 'PSH12314', 'PSH',           'Systems, specs, architecture, transport, databases',               32),
    ('psh', 'information-science', 'PSH6445',  'PSH',           'Memory, indexing, classification, metadata, provenance',           20),
    ('psh', 'systems-theory',      'PSH11322', 'PSH',           'Cogarch, feedback, emergence, cascade, self-healing',              11),
    ('psh', 'philosophy',          'PSH2596',  'PSH',           'Epistemology, fair witness, falsifiability, evidence, warrant',     13),
    ('psh', 'sociology',           'PSH9508',  'PSH',           'Dignity index, cultural, community, audience, stakeholder',          8),
    ('psh', 'mathematics',         'PSH7093',  'PSH',           'Calibration, regression, factor analysis, statistical methods',     13),
    ('psh', 'communications',      'PSH9759',  'PSH',           'Interagent protocol, transport, mesh, sync, notification',          12),
    ('psh', 'pedagogy',            'PSH8126',  'PSH',           'Socratic method, jargon policy, learning, onboarding',              10),
    ('psh', 'ai-systems',          'PL-001',   'project-local', 'LLM, multi-agent, tool use, alignment — no PSH equivalent',         17);

-- Seed schema.org types
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description, entity_scope) VALUES
    ('schema_type', 'schema:Message',          NULL, 'schema.org', 'Transport messages between agents',           'transport_messages'),
    ('schema_type', 'schema:ChooseAction',     NULL, 'schema.org', 'Resolved design decisions',                   'decision_chain'),
    ('schema_type', 'schema:Event',            NULL, 'schema.org', 'Session log entries',                         'session_log'),
    ('schema_type', 'schema:Claim',            NULL, 'schema.org', 'Verified claims from transport',              'claims'),
    ('schema_type', 'schema:DefinedTerm',      NULL, 'schema.org', 'Memory entries — structured knowledge',       'memory_entries'),
    ('schema_type', 'schema:LearningResource', NULL, 'schema.org', 'Lessons — transferable patterns',             'lessons'),
    ('schema_type', 'schema:HowToStep',        NULL, 'schema.org', 'Cognitive triggers — operational procedures', 'trigger_state'),
    ('schema_type', 'schema:Action',           NULL, 'schema.org', 'Autonomous actions audit trail',              'autonomous_actions'),
    ('schema_type', 'schema:SuspendAction',    NULL, 'schema.org', 'Active gates — blocking operations',          'active_gates'),
    ('schema_type', 'schema:Comment',          NULL, 'schema.org', 'Epistemic flags — quality concerns',          'epistemic_flags');

-- Seed inactive PSH categories (the remaining 33 of 44) — available for
-- intelligent discovery: --discover matches unclassified entity clusters
-- against these descriptions to recommend activations.
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description, active) VALUES
    ('psh', 'anthropology',          'PSH1',     'PSH', 'Human cultures, ethnography, cultural practices',            0),
    ('psh', 'architecture',          'PSH116',   'PSH', 'Building design, city planning, urban development',          0),
    ('psh', 'astronomy',             'PSH320',   'PSH', 'Celestial objects, space, cosmic phenomena',                 0),
    ('psh', 'biology',               'PSH573',   'PSH', 'Life sciences, organisms, ecology, evolution',               0),
    ('psh', 'chemistry',             'PSH5450',  'PSH', 'Chemical compounds, reactions, molecular science',           0),
    ('psh', 'transport',             'PSH1038',  'PSH', 'Transportation systems, logistics, vehicles',                0),
    ('psh', 'economic-sciences',     'PSH1217',  'PSH', 'Economics, finance, trade, business',                        0),
    ('psh', 'electronics',           'PSH1781',  'PSH', 'Electronic components, devices, circuits',                   0),
    ('psh', 'electrical-engineering','PSH2086',  'PSH', 'Electrical systems, power distribution',                     0),
    ('psh', 'energy',                'PSH2395',  'PSH', 'Energy sources, power generation, energy systems',           0),
    ('psh', 'physics',               'PSH2910',  'PSH', 'Mechanics, thermodynamics, quantum physics',                 0),
    ('psh', 'geophysics',            'PSH3768',  'PSH', 'Earth physics, seismology, planetary physics',               0),
    ('psh', 'geography',             'PSH4231',  'PSH', 'Physical and human geography, regional studies',             0),
    ('psh', 'geology',               'PSH4439',  'PSH', 'Rock formations, mineralogy, earth structure',               0),
    ('psh', 'history',               'PSH5042',  'PSH', 'Historical events, periods, civilizations',                  0),
    ('psh', 'metallurgy',            'PSH5176',  'PSH', 'Metal production, alloys, metal processing',                 0),
    ('psh', 'computer-science',      'PSH6548',  'PSH', 'Computing, algorithms, software, information technology',    0),
    ('psh', 'linguistics',           'PSH6641',  'PSH', 'Language structure, grammar, philology',                     0),
    ('psh', 'literature',            'PSH6914',  'PSH', 'Books, poetry, literary works, criticism',                   0),
    ('psh', 'religion',              'PSH7769',  'PSH', 'Theology, spirituality, faith traditions',                   0),
    ('psh', 'general',               'PSH7979',  'PSH', 'Cross-disciplinary, general topics, miscellaneous',          0),
    ('psh', 'political-science',     'PSH8308',  'PSH', 'Government, politics, political theory',                     0),
    ('psh', 'food-industry',         'PSH8613',  'PSH', 'Food production, processing, nutrition',                     0),
    ('psh', 'sports',                'PSH9899',  'PSH', 'Athletic activities, physical education, recreation',         0),
    ('psh', 'consumer-industry',     'PSH10067', 'PSH', 'Consumer goods, retail, manufacturing',                      0),
    ('psh', 'construction',          'PSH10355', 'PSH', 'Building construction, civil works',                         0),
    ('psh', 'mechanical-engineering','PSH10652', 'PSH', 'Machinery, mechanical systems, engineering design',          0),
    ('psh', 'mining',                'PSH11453', 'PSH', 'Mining, mineral extraction, mining technology',              0),
    ('psh', 'art',                   'PSH11591', 'PSH', 'Visual arts, fine arts, aesthetics',                         0),
    ('psh', 'water-management',      'PSH12008', 'PSH', 'Water systems, hydrology, water resources',                 0),
    ('psh', 'military-affairs',      'PSH12156', 'PSH', 'Military science, warfare, defense',                        0),
    ('psh', 'science-technology',    'PSH11939', 'PSH', 'General science, technology, applied research',              0),
    ('psh', 'health-services',       'PSH12577', 'PSH', 'Medicine, healthcare, medical services, public health',      0),
    ('psh', 'agriculture',           'PSH13220', 'PSH', 'Farming, crop production, livestock',                        0);

-- Retire PJE vocabulary entries (historical record)
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description, active) VALUES
    ('pje_domain', 'psychology',    NULL, 'project-local', 'RETIRED 2026-03-10 — replaced by PSH facets', 0),
    ('pje_domain', 'jurisprudence', NULL, 'project-local', 'RETIRED 2026-03-10 — replaced by PSH facets', 0),
    ('pje_domain', 'engineering',   NULL, 'project-local', 'RETIRED 2026-03-10 — replaced by PSH facets', 0),
    ('pje_domain', 'cross-cutting', NULL, 'project-local', 'RETIRED 2026-03-10 — replaced by PSH facets', 0);

INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description)
VALUES ('facet_vocabulary', 'shared', 'Vocabulary definitions for PSH categories and schema.org types — public reference data');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (13, 'Facet vocabulary reference table — queryable source of truth for PSH categories and schema.org types. Shared visibility. Retired PJE entries preserved with active=0.');


-- ── Schema v14: Engineering incident detection ───────────────────────
--
-- Structured log of engineering anti-patterns detected during sessions.
-- Two detection tiers:
--   Tier 1 (mechanical): PostToolUse hook scans tool output for concrete
--     patterns (credentials in arguments, resource churn, error loops).
--   Tier 2 (cognitive): T17 trigger for agent self-assessment of reasoning
--     patterns (premature execution, decision-before-grounding). Deferred.
--
-- Graduation pipeline: when incident_type accumulates ≥3 occurrences,
-- draft anti-patterns.md entry for user review.
--
-- Deterministic key: (session_id, incident_type, tool_context) — same
-- incident type from the same tool call in the same session won't duplicate.

CREATE TABLE IF NOT EXISTS engineering_incidents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER,
    incident_type   TEXT NOT NULL,
    detection_tier  INTEGER NOT NULL DEFAULT 1,
    severity        TEXT NOT NULL DEFAULT 'moderate',
    description     TEXT NOT NULL,
    tool_name       TEXT,
    tool_context    TEXT,
    recurrence      INTEGER NOT NULL DEFAULT 1,
    graduated       INTEGER NOT NULL DEFAULT 0,
    graduated_to    TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_incidents_type
    ON engineering_incidents (incident_type);

CREATE INDEX IF NOT EXISTS idx_incidents_ungraduated
    ON engineering_incidents (graduated) WHERE graduated = 0;

INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description)
VALUES ('engineering_incidents', 'private', 'Engineering anti-pattern log — machine-specific learning data');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (14, 'Engineering incidents table — two-tier anti-pattern detection (mechanical hooks + cognitive triggers). Graduation pipeline to anti-patterns.md.');


-- ── Schema v15: Rename trust_budget → autonomy_budget ────────────────
--
-- "trust_budget" conflated action-credit accounting with epistemic trust.
-- Rename frees "trust" for the BFT consensus layer (claim verification,
-- state attestation, truthiness scoring). The table tracks autonomous
-- operation credits — "autonomy budget" describes that accurately.
--
-- Migration: ALTER TABLE RENAME TO (SQLite ≥ 3.25.0, 2018-09-15).
-- Existing state.db instances need this ALTER; fresh bootstraps use the
-- new name directly (CREATE TABLE above already says autonomy_budget).

-- NOTE: On fresh bootstrap, the CREATE TABLE above already uses autonomy_budget,
-- so this RENAME will fail harmlessly. On existing DBs, it migrates the old name.
-- Wrapped in a transaction with error suppression in autonomous-sync.sh.

-- Update table_visibility to match (idempotent — runs on both fresh and migrated)
UPDATE table_visibility SET table_name = 'autonomy_budget'
    WHERE table_name = 'trust_budget';

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (15, 'Rename trust_budget → autonomy_budget — reserve "trust" for BFT consensus layer (claim verification, truthiness). Table tracks action credits, not epistemic trust.');


-- ── Schema v16: Acronym vocabulary ──────────────────────────────────
--
-- 65 acronyms from 9 categories seeded into facet_vocabulary as
-- facet_type = 'acronym'. Expansion in description field. Source
-- attribution distinguishes project-coined, PSQ dimensions, standards
-- bodies, psychometric terms, corpus names, and infrastructure.
--
-- Compositor renders these as <abbr> tooltips at display time —
-- any recognized acronym in claims, decisions, or lessons gets
-- hover-expandable and deep-linkable to the KB vocabulary section.
--
-- Ambiguity: ICC carries two meanings (Intraclass Correlation and
-- International Chamber of Commerce). Both stored; context disambiguates.

-- Project-coined acronyms
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'PSQ',    NULL, 'project-local', 'Psychoemotional Safety Quotient — composite measure of conversational safety'),
    ('acronym', 'SETL',   NULL, 'project-local', 'Structural-Editorial Tension Level — content quality metric for transport messages'),
    ('acronym', 'SRT',    NULL, 'project-local', 'Semiotic-Reflexive Transformer — interpretive analysis framework for agent outputs'),
    ('acronym', 'PJE',    NULL, 'project-local', 'Psychology-Juris-Engineering — tridisciplinary framework founding this project'),
    ('acronym', 'HRCB',   NULL, 'project-local', 'Human Rights Compatibility Bias — systematic over-scoring of rights-aligned content'),
    ('acronym', 'DI',     NULL, 'project-local', 'Dignity Index — complement measure to PSQ based on Hicks dignity model'),
    ('acronym', 'AR',     NULL, 'project-local', 'Adversarial Register — rubric for evaluating adversarial rhetorical techniques');

-- PSQ dimension abbreviations
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'TE',  NULL, 'PSQ', 'Threat Exposure — perceived external threat level in conversation'),
    ('acronym', 'HI',  NULL, 'PSQ', 'Hostility Index — overt antagonism or aggression markers'),
    ('acronym', 'AD',  NULL, 'PSQ', 'Authority Dynamics — power differential and compliance pressure'),
    ('acronym', 'ED',  NULL, 'PSQ', 'Energy Dissipation — emotional labor and cognitive drain indicators'),
    ('acronym', 'RC',  NULL, 'PSQ', 'Regulatory Capacity — ability to maintain emotional regulation'),
    ('acronym', 'RB',  NULL, 'PSQ', 'Resilience Baseline — stable capacity to recover from disruption'),
    ('acronym', 'TC',  NULL, 'PSQ', 'Trust Conditions — environmental trust and psychological safety'),
    ('acronym', 'CC',  NULL, 'PSQ', 'Cooling Capacity — de-escalation potential and conflict resolution'),
    ('acronym', 'DA',  NULL, 'PSQ', 'Defensive Architecture — self-protective behavioral patterns'),
    ('acronym', 'CO',  NULL, 'PSQ', 'Contractual Clarity — explicitness of behavioral expectations');

-- Cognitive architecture and autonomy model
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'cogarch', NULL, 'project-local', 'Cognitive Architecture — the trigger, hook, memory, and identity system'),
    ('acronym', 'EF-1',   NULL, 'project-local', 'Evaluator Framework 1 — evaluator-as-arbiter autonomous autonomy model'),
    ('acronym', 'EF-3',   NULL, 'project-local', 'Evaluator Framework 3 — evaluator instantiation gate for sub-agents'),
    ('acronym', 'BFT',    NULL, 'project-local', 'Byzantine Fault Tolerance — consensus protocol for multi-agent mesh'),
    ('acronym', 'TTP',    NULL, 'project-local', 'Trusted Third Party — BFT role for claim verification arbitration'),
    ('acronym', 'BAS',    NULL, 'psychology',     'Behavioral Activation System — approach-motivation neural circuit (Gray, 1982)'),
    ('acronym', 'BIS',    NULL, 'psychology',     'Behavioral Inhibition System — avoidance-motivation neural circuit (Gray, 1982)'),
    ('acronym', 'DOF',    NULL, 'project-local', 'Degrees of Freedom — configurable parameters in cogarch.config.json'),
    ('acronym', 'SL-1',   NULL, 'project-local', 'State Layer Phase 1 — SQLite bootstrap from markdown source of truth'),
    ('acronym', 'SL-2',   NULL, 'project-local', 'State Layer Phase 2 — dual-write integration for /sync and /cycle');

-- Interagent protocol
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'A2A',   NULL, 'standards',      'Agent-to-Agent — Google open protocol for agent interoperability'),
    ('acronym', 'ACK',   NULL, 'standards',      'Acknowledgement — transport protocol confirmation message'),
    ('acronym', 'SSE',   NULL, 'standards',      'Server-Sent Events — HTTP streaming for real-time dashboard updates'),
    ('acronym', 'KB',    NULL, 'project-local',  'Knowledge Base — structured claims, decisions, and memory entries'),
    ('acronym', 'meshd', NULL, 'project-local',  'Mesh Daemon — Go service aggregating multi-agent state for the compositor'),
    ('acronym', 'TTL',   NULL, 'standards',      'Time to Live — cache expiration duration for meshd data');

-- Standards and external bodies
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'SWEBOK', NULL, 'standards',     'Software Engineering Body of Knowledge — IEEE/ISO reference vocabulary'),
    ('acronym', 'PMBOK',  NULL, 'standards',     'Project Management Body of Knowledge — PMI reference vocabulary'),
    ('acronym', 'PSH',    NULL, 'standards',     'Polythematic Structured Subject Headings — Czech National Library classification'),
    ('acronym', 'BCP',    NULL, 'standards',     'Best Current Practice — IETF document category (e.g., BCP 14 = RFC 2119)'),
    ('acronym', 'INCOSE', NULL, 'standards',     'International Council on Systems Engineering — SE Handbook publisher'),
    ('acronym', 'CMMI',   NULL, 'standards',     'Capability Maturity Model Integration — process maturity framework'),
    ('acronym', 'UDC',    NULL, 'standards',     'Universal Decimal Classification — library classification scheme'),
    ('acronym', 'WEIRD',  NULL, 'psychology',    'Western, Educated, Industrialized, Rich, Democratic — sampling bias descriptor (Henrich et al., 2010)'),
    ('acronym', 'UDHR',   NULL, 'law',           'Universal Declaration of Human Rights — UN General Assembly Resolution 217A (1948)'),
    ('acronym', 'ICESCR', NULL, 'law',           'International Covenant on Economic, Social and Cultural Rights — UN treaty (1966)'),
    ('acronym', 'FTC',    NULL, 'law',           'Federal Trade Commission — US consumer protection agency'),
    ('acronym', 'ICC',    NULL, 'standards',     'International Chamber of Commerce — marketing code publisher'),
    ('acronym', 'NAD',    NULL, 'law',           'National Advertising Division — US advertising self-regulation body');

-- Psychometric and statistical
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'CFA',    NULL, 'psychometrics', 'Confirmatory Factor Analysis — structural equation model for construct validation'),
    ('acronym', 'RMSEA',  NULL, 'psychometrics', 'Root Mean Square Error of Approximation — SEM model fit index (Steiger, 1990)'),
    ('acronym', 'MAE',    NULL, 'psychometrics', 'Mean Absolute Error — calibration accuracy metric'),
    ('acronym', 'AUC',    NULL, 'psychometrics', 'Area Under the Curve — classification performance metric'),
    ('acronym', 'MAD',    NULL, 'psychometrics', 'Mean Absolute Deviation — robust dispersion measure'),
    ('acronym', 'ICC (psychometric)', NULL, 'psychometrics', 'Intraclass Correlation — inter-rater reliability coefficient (Shrout & Fleiss, 1979)');

-- Corpus and dataset names
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'CaSiNo',   NULL, 'corpus', 'Camp Sincerity — negotiation dialogue corpus'),
    ('acronym', 'CGA-Wiki', NULL, 'corpus', 'Conversation Gone Awry (Wikipedia) — conversational derailment dataset'),
    ('acronym', 'CMV',      NULL, 'corpus', 'Change My View — Reddit persuasion corpus'),
    ('acronym', 'DonD',     NULL, 'corpus', 'Deal or No Deal — negotiation task corpus');

-- Infrastructure (non-trivial acronyms only — skip universally known CSS, JS, HTML, etc.)
INSERT OR IGNORE INTO facet_vocabulary (facet_type, facet_value, code, source, description) VALUES
    ('acronym', 'CF',      NULL, 'infrastructure', 'Cloudflare — edge compute and CDN platform'),
    ('acronym', 'KV',      NULL, 'infrastructure', 'Key-Value store — Cloudflare Workers KV'),
    ('acronym', 'D1',      NULL, 'infrastructure', 'Distributed SQLite — Cloudflare D1 database'),
    ('acronym', 'R2',      NULL, 'infrastructure', 'Object storage — Cloudflare R2 (S3-compatible)'),
    ('acronym', 'LLM',     NULL, 'ai-systems',     'Large Language Model — neural language generation system'),
    ('acronym', 'MCP',     NULL, 'ai-systems',     'Model Context Protocol — Anthropic tool integration standard'),
    ('acronym', 'CORS',    NULL, 'standards',       'Cross-Origin Resource Sharing — browser security policy for HTTP requests'),
    ('acronym', 'JSON-LD', NULL, 'standards',       'JSON for Linked Data — W3C standard for structured data on the web'),
    ('acronym', 'LCARS',   NULL, 'project-local',   'Library Computer Access/Retrieval System — Star Trek TNG-inspired UI theme'),
    ('acronym', 'DETL',    NULL, 'project-local',   'Dignity-Emotion Tension Level — composite DI + PSQ interaction metric');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (16, 'Acronym vocabulary — 65 acronyms across 9 categories seeded into facet_vocabulary. Render-time tooltips in compositor. Ambiguous terms (ICC) stored with disambiguation.');


-- ── Schema v17: Fix filename uniqueness — session-scoped, not global ─────
--
-- The filename column had a table-level UNIQUE constraint, but filenames
-- repeat across sessions (e.g., from-psychology-agent-001.json appears in
-- 9 different session directories). INSERT OR IGNORE silently dropped ~57
-- messages. Fix: UNIQUE on (session_name, filename) instead.
--
-- For existing DBs, migration drops the old unique index on filename alone
-- and creates the composite unique index. The table definition above already
-- reflects the corrected schema for fresh builds.

-- Drop the implicit unique index SQLite created for the old UNIQUE column constraint.
-- In existing DBs this index name varies; the new composite index enforces uniqueness.
-- SQLite cannot DROP INDEX IF EXISTS on auto-generated constraint indexes, so
-- migration for existing DBs requires bootstrap_state_db.py --force rebuild.

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (17, 'Fix filename uniqueness — UNIQUE(session_name, filename) replaces UNIQUE(filename). Prevents silent message loss from cross-session filename collisions.');


-- ── Schema v18: Triple-write — GitHub Issue cross-references ─────────
--
-- Every interagent message produces three artifacts in lockstep:
--   1. Transport JSON file (9P filesystem layer — source of truth)
--   2. state.db row (queryable index — this table)
--   3. GitHub Issue (human visibility + discussion layer)
--
-- New columns on transport_messages track the issue cross-reference.
-- github_issues table promoted from inline CREATE in issue_lifecycle.py
-- to canonical schema with transport-aware columns.
--
-- Write order: JSON first → DB second → Issue third.
-- If issue creation fails, issue_pending=1 flags for backfill sweep.

-- Add issue cross-reference columns to transport_messages
-- (ALTER TABLE for existing DBs; fresh builds get these from CREATE above
--  once the CREATE TABLE statement is updated)

-- github_issues — canonical table (promoted from issue_lifecycle.py inline CREATE)
CREATE TABLE IF NOT EXISTS github_issues (
    number              INTEGER NOT NULL,
    repo                TEXT NOT NULL,
    title               TEXT,
    state               TEXT NOT NULL DEFAULT 'open',
    transport_session   TEXT,
    transport_filename  TEXT,
    labels              TEXT,
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    PRIMARY KEY (repo, number)
);

CREATE INDEX IF NOT EXISTS idx_issues_transport
    ON github_issues (transport_session, transport_filename)
    WHERE transport_session IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issues_state
    ON github_issues (state) WHERE state = 'open';

INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description)
VALUES ('github_issues', 'shared', 'GitHub issue index — human visibility layer for transport messages');

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (18, 'Triple-write protocol — issue_url + issue_number on transport_messages, github_issues table promoted to canonical schema. Three layers: JSON file + state.db + GitHub Issue.');


-- ── Schema v21: Claims verification + epistemic flag resolution ──────
--
-- Closes two pipeline gaps identified in Session 78 diagnostic:
--   1. Claims: 371 indexed, 0 verified — no UPDATE pathway existed
--   2. Flags: 435 indexed, 0 resolved — no UPDATE pathway existed
--
-- Claims table already has verified + verified_at columns. This migration
-- adds resolved_by to epistemic_flags for tracking resolution provenance.
--
-- Both tables gain dual_write.py subcommands: verify-claim, resolve-flag.

-- Add resolution provenance to epistemic_flags
-- (ALTER TABLE for existing DBs; fresh builds should add to CREATE above
--  once stable)

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (21, 'Claims verification + epistemic flag resolution pipelines — resolved_by column on epistemic_flags, dual_write subcommands for verify-claim and resolve-flag');


-- ═══════════════════════════════════════════════════════════════
-- Schema v23: Metacognitive layer — trigger activation tracking
-- Session 84, cogarch refactor Phase 8
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trigger_activations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    trigger_id      TEXT NOT NULL,              -- e.g., 'T3'
    check_number    INTEGER,                    -- e.g., 5 (NULL for whole-trigger events)
    tier            TEXT NOT NULL,              -- 'critical', 'advisory', 'spot-check'
    mode            TEXT,                       -- 'generative', 'evaluative', 'neutral'
    fired           BOOLEAN NOT NULL DEFAULT 1, -- did the check actually run?
    result          TEXT,                       -- 'pass', 'fail', 'skip'
    action_taken    TEXT,                       -- what the agent did in response
    timestamp       TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trigger_activations_session
    ON trigger_activations(session_id);
CREATE INDEX IF NOT EXISTS idx_trigger_activations_trigger
    ON trigger_activations(trigger_id, check_number);
CREATE INDEX IF NOT EXISTS idx_trigger_activations_result
    ON trigger_activations(result);

-- Memory retrieval priority (ACT-R activation, Phase 5 spec)
-- Tracks access patterns for topic files
ALTER TABLE memory_entries ADD COLUMN last_accessed TEXT;
ALTER TABLE memory_entries ADD COLUMN access_count INTEGER DEFAULT 0;

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (23, 'Metacognitive layer: trigger_activations table for effectiveness tracking, memory_entries access columns for ACT-R activation scoring');


-- ── Schema v24: Equal Information Channel (SNAFU mitigation) ──────────
-- Theoretical grounding: Wilson's SNAFU Principle (1975) — accurate
-- communication only occurs between equals. This table provides a
-- zero-governance-cost disclosure pathway alongside the hierarchical
-- governance channel (autonomous_actions). Spec: docs/equal-information-channel-spec.md
--
-- LIVES IN state.local.db (machine-local, never committed).
-- ENFORCEMENT: append-only. No UPDATE or DELETE permitted.
-- Application code enforces; bootstrap verifies row count monotonicity.

CREATE TABLE IF NOT EXISTS agent_disclosures (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id        TEXT NOT NULL,
    session_id      INTEGER,
    category        TEXT NOT NULL CHECK (category IN (
                        'uncertainty', 'limitation', 'blind-spot',
                        'edge-case', 'dissent', 'observation'
                    )),
    confidence      REAL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    content         TEXT NOT NULL,
    context         TEXT,
    related_action  INTEGER,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_disclosures_agent
    ON agent_disclosures (agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_disclosures_category
    ON agent_disclosures (category);

-- Append-only enforcement via trigger (SQLite cannot enforce at table level)
CREATE TRIGGER IF NOT EXISTS prevent_disclosure_delete
    BEFORE DELETE ON agent_disclosures
BEGIN
    SELECT RAISE(ABORT, 'agent_disclosures: append-only table, DELETE prohibited (EIC spec)');
END;

CREATE TRIGGER IF NOT EXISTS prevent_disclosure_update
    BEFORE UPDATE ON agent_disclosures
BEGIN
    SELECT RAISE(ABORT, 'agent_disclosures: append-only table, UPDATE prohibited (EIC spec)');
END;

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (24, 'Equal Information Channel: agent_disclosures append-only table (SNAFU mitigation, Wilson 1975). Spec: docs/equal-information-channel-spec.md');


-- ── Schema v25: Prediction Ledger (RPG win/loss tracking) ──────────────
-- Spec: docs/retrospective-pattern-generator-spec.md
-- Tracks predictions → outcomes → deltas for calibration.
-- LIVES IN state.local.db (machine-local).

CREATE TABLE IF NOT EXISTS prediction_ledger (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    prediction      TEXT NOT NULL,
    domain          TEXT NOT NULL,
    source_doc      TEXT,
    outcome         TEXT CHECK (outcome IN (
                        'confirmed', 'partially-confirmed',
                        'refuted', 'untested'
                    )),
    outcome_detail  TEXT,
    delta_lesson    TEXT,
    recorded_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    resolved_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_predictions_domain
    ON prediction_ledger (domain, outcome);

CREATE INDEX IF NOT EXISTS idx_predictions_session
    ON prediction_ledger (session_id);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (25, 'Prediction ledger: RPG win/loss tracking (predictions → outcomes → deltas). Spec: docs/retrospective-pattern-generator-spec.md');


-- v26: Non-empty subject enforcement (mesh-parity-v2 P2) + document_audits
-- Subject derivation: when JSON lacks subject field, derive from session_name.
-- Existing NULL subjects remain — this constrains new inserts only.
-- Note: SQLite cannot add CHECK constraints via ALTER TABLE. Enforcement
-- applies at the application layer (dual_write.py) rather than schema level.
-- The CHECK below applies to fresh databases built from this schema file.

CREATE TABLE IF NOT EXISTS document_audits (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    document_path   TEXT NOT NULL,
    tier            INTEGER NOT NULL,
    check_types     TEXT NOT NULL,
    findings_count  INTEGER DEFAULT 0,
    session_id      INTEGER,
    audited_at      TEXT DEFAULT (datetime('now')),
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audits_document
    ON document_audits (document_path);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (26, 'Document audits table (microglial layer) + non-empty subject enforcement at application layer (mesh-parity-v2 P2)');


-- v27: Efference copy — likelihood column + source_doc index for prediction_ledger
-- Spec: docs/efference-copy-spec.md
-- Links outbound transport predictions to inbound response comparison.
-- likelihood captures pre-send confidence; source_doc index enables fast lookups
-- when /sync checks inbound in_response_to against outbound expectations.

ALTER TABLE prediction_ledger ADD COLUMN likelihood TEXT
    CHECK (likelihood IN ('likely', 'probable', 'possible', 'uncertain'));

CREATE INDEX IF NOT EXISTS idx_predictions_source_doc
    ON prediction_ledger (source_doc);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (27, 'Efference copy: likelihood column + source_doc index on prediction_ledger. Spec: docs/efference-copy-spec.md');


-- v28: Generator balance tracking (§11.10 generator topology)
-- Tracks per-session output counts for each generator (G1-G9), coupling
-- partner ratios, and conservation law balance. Computed by
-- scripts/compute-generator-balance.py from git log heuristics.

CREATE TABLE IF NOT EXISTS generator_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    generator_id TEXT NOT NULL,       -- G1 through G9
    generator_name TEXT NOT NULL,
    output_count INTEGER DEFAULT 0,   -- how many outputs this generator produced this session
    coupling_partner TEXT,            -- primary coupled generator (e.g., G2↔G3)
    balance_ratio REAL,               -- ratio of this generator's output to its coupling partner's output
    notes TEXT,
    measured_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_generator_state_session
    ON generator_state(session_id);

CREATE INDEX IF NOT EXISTS idx_generator_state_generator
    ON generator_state(generator_id);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (28, 'Generator balance tracking table (§11.10 topology). Tracks per-session output counts for G1-G9, coupling ratios, conservation laws.');


-- v29: OODA phase annotation for trigger_state
-- Maps each trigger to its primary OODA loop phase (Boyd, 1987).
-- Enables phase-aware scheduling: Observe → Orient → Decide → Act.
-- Values: 'observe', 'orient', 'decide', 'act'

ALTER TABLE trigger_state ADD COLUMN ooda_phase TEXT DEFAULT NULL
    CHECK (ooda_phase IN ('observe', 'orient', 'decide', 'act'));

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (29, 'OODA phase annotation on trigger_state. Enables phase-ordered trigger scheduling (Boyd, 1987).');


-- v30: Event log for hippocampal replay (event-sourced memory Phase 1-2)
-- Append-only event store capturing governance actions, trigger firings,
-- transport events, and state changes. Each row represents an episodic trace
-- that the replay engine (Phase 3) consolidates into semantic memory.
-- Spec: docs/event-sourced-memory.md §2.1-2.2
-- Categories: governance, transport, state, self_model, mesh

CREATE TABLE IF NOT EXISTS event_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        TEXT UNIQUE NOT NULL,
    timestamp       TEXT NOT NULL,
    agent_id        TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    category        TEXT NOT NULL,
    payload         TEXT NOT NULL,       -- JSON blob
    session_id      INTEGER,
    a2a_snapshot    TEXT,                -- JSON: A2A-Psychology snapshot (hedonic_valence, activation, etc.)
    consolidated    BOOLEAN DEFAULT FALSE,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_log_type ON event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_session ON event_log(session_id);
CREATE INDEX IF NOT EXISTS idx_event_log_consolidated ON event_log(consolidated);
CREATE INDEX IF NOT EXISTS idx_event_log_timestamp ON event_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_log_category ON event_log(category);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (30, 'Event log for hippocampal replay. Append-only event store (docs/event-sourced-memory.md §2.1-2.2).');


-- v31: Efference copies + work carryover (Session 91 diagnostic fix)
-- Efference copies: forward model predictions for outbound transport messages.
-- Each outbound message optionally carries an expectation of the response.
-- /sync Phase 3 step 8 compares inbound against predictions.
-- Spec: docs/efference-copy-spec.md

CREATE TABLE IF NOT EXISTS efference_copies (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_name    TEXT NOT NULL,
    outbound_file   TEXT NOT NULL,
    expected_type   TEXT,
    expected_agent  TEXT,
    prediction      TEXT NOT NULL,
    inbound_file    TEXT,
    actual          TEXT,
    match_result    TEXT,
    delta           TEXT,
    predicted_at    TEXT DEFAULT (datetime('now')),
    compared_at     TEXT,
    UNIQUE(session_name, outbound_file)
);

-- Work carryover: tracks work items that span multiple sessions.
-- T1 Check 9 queries this at session start. /cycle writes resolved items.
-- sessions_carried increments each session the item remains open.

CREATE TABLE IF NOT EXISTS work_carryover (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    work_item       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'planned',
    sessions_carried INTEGER NOT NULL DEFAULT 1,
    reason          TEXT,
    resolved_session INTEGER,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_work_carryover_open
ON work_carryover(resolved_session) WHERE resolved_session IS NULL;

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (31, 'Efference copies + work carryover tables. Diagnostic fix Session 91.');

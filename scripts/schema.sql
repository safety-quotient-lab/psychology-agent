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

-- Autonomy budget — tracks autonomous operation credits per agent
CREATE TABLE IF NOT EXISTS autonomy_budget (
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
VALUES (3, 'Add autonomy_budget, autonomous_actions (EF-1 evaluator-as-arbiter trust model)');

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
VALUES (9, 'Add min_action_interval to autonomy_budget — temporal spacing guarantee decoupled from triggering mechanism (EF-1 trust model update)');


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

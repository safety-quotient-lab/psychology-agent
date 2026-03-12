-- agentdb: state.db schema (project knowledge — exportable)
-- Generated from scripts/schema.sql table reassignment.
-- Tables: transport_messages, decision_chain, trigger_state, session_log,
--   claims, epistemic_flags, psq_status, universal_facets, facet_vocabulary,
--   github_issues, lessons, engineering_incidents, schema_version, table_visibility

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
    thread_id       TEXT,
    parent_thread_id TEXT,
    message_cid     TEXT,
    problem_type    TEXT,
    task_state      TEXT DEFAULT 'pending',
    expires_at      TEXT,
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
CREATE INDEX IF NOT EXISTS idx_transport_agent_turn
    ON transport_messages (session_name, from_agent, turn);


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
    resolved_by     TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_flags_unresolved
    ON epistemic_flags (resolved) WHERE resolved = FALSE;


-- PSQ operational status
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


-- Universal facets (polymorphic entity tagging)
CREATE TABLE IF NOT EXISTS universal_facets (
    entity_type TEXT NOT NULL,
    entity_id   INTEGER NOT NULL,
    facet_type  TEXT NOT NULL,
    facet_value TEXT NOT NULL,
    confidence          REAL DEFAULT 1.0,
    keyword_hits        TEXT,
    computed_at         TEXT,
    keyword_set_version INTEGER DEFAULT 1,
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


-- Facet vocabulary reference table
CREATE TABLE IF NOT EXISTS facet_vocabulary (
    facet_type      TEXT NOT NULL,
    facet_value     TEXT NOT NULL,
    code            TEXT,
    source          TEXT NOT NULL,
    description     TEXT,
    entity_scope    TEXT,
    active          INTEGER NOT NULL DEFAULT 1,
    keyword_count   INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    PRIMARY KEY (facet_type, facet_value)
);
CREATE INDEX IF NOT EXISTS idx_fv_active
    ON facet_vocabulary (facet_type) WHERE active = 1;


-- GitHub issues
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


-- Lessons (REASSIGNED from private to shared — transferable patterns)
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


-- Engineering incidents (REASSIGNED from private to shared — anti-pattern catalog)
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


-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version         INTEGER PRIMARY KEY,
    applied_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    description     TEXT
);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'agentdb v1 — dual-DB split. Shared tables in state.db, local tables in state.local.db.');


-- Table visibility (export tier definitions)
CREATE TABLE IF NOT EXISTS table_visibility (
    table_name          TEXT PRIMARY KEY,
    default_visibility  TEXT NOT NULL DEFAULT 'private',
    description         TEXT
);

INSERT OR IGNORE INTO table_visibility (table_name, default_visibility, description) VALUES
    ('trigger_state',         'public',     'Cogarch infrastructure'),
    ('decision_chain',        'shared',     'Design decisions'),
    ('session_log',           'shared',     'Session history'),
    ('epistemic_flags',       'shared',     'Epistemic audit trail'),
    ('transport_messages',    'shared',     'Transport index'),
    ('claims',                'shared',     'Verified claims'),
    ('universal_facets',      'shared',     'Cross-entity facets'),
    ('facet_vocabulary',      'shared',     'Vocabulary definitions'),
    ('github_issues',         'shared',     'GitHub issue index'),
    ('lessons',               'shared',     'Transferable patterns (reassigned from private)'),
    ('engineering_incidents', 'shared',     'Anti-pattern catalog (reassigned from private)'),
    ('psq_status',            'commercial', 'Calibration data');


-- Seed PSH vocabulary
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

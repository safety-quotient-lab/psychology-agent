-- v26 Schema Alignment Migration
-- Brings operations-agent state.db into alignment with psychology-agent v26 schema.
-- Additive only — no drops. Ops-specific tables (spawn_log, health_observations,
-- mos_scores, cogarch_state, decisions, FTS) preserved alongside shared tables.

-- ── Fix schema_version table name (ops has schema_versions, psy has schema_version)
CREATE TABLE IF NOT EXISTS schema_version (
    version         INTEGER PRIMARY KEY,
    applied_at      TEXT NOT NULL DEFAULT (datetime('now')),
    description     TEXT
);
-- Migrate existing entries if schema_versions exists
INSERT OR IGNORE INTO schema_version (version, applied_at, description)
    SELECT version, applied_at, description FROM schema_versions;

-- ── transport_messages: add missing v19/v20 columns
-- v19: threading + content addressing
ALTER TABLE transport_messages ADD COLUMN thread_id TEXT;
ALTER TABLE transport_messages ADD COLUMN parent_thread_id TEXT;
ALTER TABLE transport_messages ADD COLUMN message_cid TEXT;
ALTER TABLE transport_messages ADD COLUMN problem_type TEXT;
-- v20: task state + expiration
ALTER TABLE transport_messages ADD COLUMN task_state TEXT DEFAULT 'pending';
ALTER TABLE transport_messages ADD COLUMN expires_at TEXT;
-- v22: triage
ALTER TABLE transport_messages ADD COLUMN triage_score INTEGER;
ALTER TABLE transport_messages ADD COLUMN triage_disposition TEXT;
ALTER TABLE transport_messages ADD COLUMN triage_at TEXT;
-- Missing base columns
ALTER TABLE transport_messages ADD COLUMN claims_count INTEGER DEFAULT 0;
ALTER TABLE transport_messages ADD COLUMN setl REAL;
ALTER TABLE transport_messages ADD COLUMN urgency TEXT DEFAULT 'normal';
ALTER TABLE transport_messages ADD COLUMN ack_required INTEGER DEFAULT 0;
ALTER TABLE transport_messages ADD COLUMN ack_received INTEGER DEFAULT 0;
ALTER TABLE transport_messages ADD COLUMN issue_url TEXT;
ALTER TABLE transport_messages ADD COLUMN issue_number INTEGER;
ALTER TABLE transport_messages ADD COLUMN issue_pending INTEGER DEFAULT 0;

-- v19 indexes
CREATE INDEX IF NOT EXISTS idx_transport_thread ON transport_messages (thread_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_cid ON transport_messages (message_cid) WHERE message_cid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transport_task_state ON transport_messages (task_state) WHERE task_state NOT IN ('completed', 'canceled', 'rejected');
CREATE INDEX IF NOT EXISTS idx_transport_issue_pending ON transport_messages (issue_pending) WHERE issue_pending = 1;
CREATE INDEX IF NOT EXISTS idx_transport_triage ON transport_messages (triage_disposition) WHERE triage_disposition IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transport_agent_turn ON transport_messages (session_name, from_agent, turn);

-- ── memory_entries: add missing columns
ALTER TABLE memory_entries ADD COLUMN session_id INTEGER;
ALTER TABLE memory_entries ADD COLUMN derives_from INTEGER REFERENCES memory_entries(id);
ALTER TABLE memory_entries ADD COLUMN last_accessed TEXT;
ALTER TABLE memory_entries ADD COLUMN access_count INTEGER DEFAULT 0;

-- ── decision_chain (psy's decision table — ops has 'decisions', keep both)
CREATE TABLE IF NOT EXISTS decision_chain (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_key    TEXT NOT NULL UNIQUE,
    decision_text   TEXT NOT NULL,
    evidence_source TEXT,
    derives_from    INTEGER REFERENCES decision_chain(id),
    decided_date    TEXT NOT NULL,
    confidence      REAL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_decision_date ON decision_chain (decided_date);

-- ── session_log
CREATE TABLE IF NOT EXISTS session_log (
    id              INTEGER PRIMARY KEY,
    timestamp       TEXT NOT NULL,
    summary         TEXT NOT NULL,
    artifacts       TEXT,
    epistemic_flags TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── epistemic_flags
CREATE TABLE IF NOT EXISTS epistemic_flags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER,
    source          TEXT NOT NULL,
    flag_text       TEXT NOT NULL,
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_at     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_flags_unresolved ON epistemic_flags (resolved) WHERE resolved = FALSE;

-- ── psq_status
CREATE TABLE IF NOT EXISTS psq_status (
    entry_key           TEXT PRIMARY KEY,
    value               TEXT NOT NULL,
    status_marker       TEXT,
    model_version       TEXT,
    calibration_id      TEXT,
    endpoint_url        TEXT,
    resolved_session    INTEGER,
    last_confirmed      TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── entry_facets
CREATE TABLE IF NOT EXISTS entry_facets (
    entry_id    INTEGER NOT NULL REFERENCES memory_entries(id),
    facet_type  TEXT NOT NULL,
    facet_value TEXT NOT NULL,
    PRIMARY KEY (entry_id, facet_type, facet_value)
);
CREATE INDEX IF NOT EXISTS idx_facet_lookup ON entry_facets (facet_type, facet_value);
CREATE INDEX IF NOT EXISTS idx_facet_entry ON entry_facets (entry_id);

-- ── autonomous_actions
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
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_actions_agent ON autonomous_actions (agent_id, created_at);

-- ── lessons
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
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_promotion ON lessons (promotion_status) WHERE promotion_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_pattern_domain ON lessons (pattern_type, domain);

-- ── table_visibility
CREATE TABLE IF NOT EXISTS table_visibility (
    table_name          TEXT PRIMARY KEY,
    default_visibility  TEXT NOT NULL DEFAULT 'private',
    description         TEXT
);

-- ── active_gates
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
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at         TEXT,
    resolved_by         TEXT,
    timeout_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gates_status ON active_gates (status) WHERE status = 'waiting';

-- ── facet_vocabulary
CREATE TABLE IF NOT EXISTS facet_vocabulary (
    facet_type      TEXT NOT NULL,
    facet_value     TEXT NOT NULL,
    code            TEXT,
    source          TEXT NOT NULL,
    description     TEXT,
    entity_scope    TEXT,
    active          INTEGER NOT NULL DEFAULT 1,
    keyword_count   INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (facet_type, facet_value)
);
CREATE INDEX IF NOT EXISTS idx_fv_active ON facet_vocabulary (facet_type) WHERE active = 1;

-- ── engineering_incidents
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
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON engineering_incidents (incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_ungraduated ON engineering_incidents (graduated) WHERE graduated = 0;

-- ── github_issues
CREATE TABLE IF NOT EXISTS github_issues (
    number              INTEGER NOT NULL,
    repo                TEXT NOT NULL,
    title               TEXT,
    state               TEXT NOT NULL DEFAULT 'open',
    transport_session   TEXT,
    transport_filename  TEXT,
    labels              TEXT,
    updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (repo, number)
);
CREATE INDEX IF NOT EXISTS idx_issues_transport ON github_issues (transport_session, transport_filename) WHERE transport_session IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_state ON github_issues (state) WHERE state = 'open';

-- ── trigger_activations
CREATE TABLE IF NOT EXISTS trigger_activations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    trigger_id      TEXT NOT NULL,
    check_number    INTEGER,
    tier            TEXT NOT NULL,
    mode            TEXT,
    fired           BOOLEAN NOT NULL DEFAULT 1,
    result          TEXT,
    action_taken    TEXT,
    timestamp       TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trigger_activations_session ON trigger_activations(session_id);
CREATE INDEX IF NOT EXISTS idx_trigger_activations_trigger ON trigger_activations(trigger_id, check_number);
CREATE INDEX IF NOT EXISTS idx_trigger_activations_result ON trigger_activations(result);

-- ── agent_disclosures (Equal Information Channel — append-only)
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
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_disclosures_agent ON agent_disclosures (agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_disclosures_category ON agent_disclosures (category);

-- Append-only triggers
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

-- ── prediction_ledger
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
    recorded_at     TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_predictions_domain ON prediction_ledger (domain, outcome);
CREATE INDEX IF NOT EXISTS idx_predictions_session ON prediction_ledger (session_id);

-- ── document_audits
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
CREATE INDEX IF NOT EXISTS idx_audits_document ON document_audits (document_path);

-- ── universal_facets: add missing columns
ALTER TABLE universal_facets ADD COLUMN confidence REAL DEFAULT 1.0;
ALTER TABLE universal_facets ADD COLUMN keyword_hits TEXT;
ALTER TABLE universal_facets ADD COLUMN computed_at TEXT;
ALTER TABLE universal_facets ADD COLUMN keyword_set_version INTEGER DEFAULT 1;

-- ── Record version
INSERT INTO schema_version (version, applied_at, description)
VALUES (26, datetime('now'), 'v26 alignment with psychology-agent schema — 16 new tables, v19/v20 transport columns');

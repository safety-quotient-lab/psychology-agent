-- agentdb: state.local.db schema (machine-local — never shared)
-- Tables: autonomy_budget, autonomous_actions, active_gates,
--   memory_entries, entry_facets

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;


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


-- Autonomous actions audit trail
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


-- Active gates — gated message exchanges
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


-- Entry facets (derived from memory_entries)
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


-- Equal Information Channel (schema v24) — SNAFU mitigation
-- Append-only: no UPDATE or DELETE permitted.
-- Spec: docs/equal-information-channel-spec.md
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

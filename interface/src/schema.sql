-- Psychology Interface — D1 session storage schema
-- Run: wrangler d1 execute psychology-interface --file=src/schema.sql

CREATE TABLE IF NOT EXISTS sessions (
  session_id    TEXT PRIMARY KEY,
  created_at    INTEGER NOT NULL,
  last_turn_at  INTEGER NOT NULL,
  context_state TEXT,   -- JSON: {last_commit, last_session} for interagent sync
  metadata      TEXT    -- JSON: {model, flags, user_agent}
);

CREATE TABLE IF NOT EXISTS turns (
  turn_id       TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(session_id),
  turn_number   INTEGER NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'psq', 'system')),
  content       TEXT NOT NULL,
  psq_scores    TEXT,   -- JSON: machine-response/v3 block if present
  setl          REAL,   -- SETL value (null for user turns)
  timestamp     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, turn_number);

-- Migration v20: Task state enum + message expiration + implicit ACK
--
-- Task state enum (A2A-inspired): replaces binary processed + freeform gate
-- text with a 7-state lifecycle. Values:
--   'pending'        — received, not yet reviewed
--   'working'        — actively being processed
--   'input-required' — blocked on external input (maps to gate_status=blocked)
--   'completed'      — fully processed (maps to processed=TRUE)
--   'failed'         — processing failed (new — previously no failure state)
--   'canceled'       — abandoned by sender or receiver
--   'rejected'       — receiver declined to process
-- Default: 'pending' for inbound, 'completed' for outbound.
--
-- Message expiration: optional expires_at timestamp. Sync skips expired
-- messages instead of processing them.
--
-- Implicit ACK: no schema change needed — convention only. When a message
-- with ack_required=false receives a substantive in_response_to reference,
-- the original message's ack_received flips to TRUE automatically.
-- Documented in transport.md.

ALTER TABLE transport_messages ADD COLUMN task_state TEXT DEFAULT 'pending';
ALTER TABLE transport_messages ADD COLUMN expires_at TEXT;

-- Backfill task_state from existing processed flag
UPDATE transport_messages SET task_state = 'completed' WHERE processed = TRUE;
UPDATE transport_messages SET task_state = 'pending' WHERE processed = FALSE;

-- Index for state-based queries (find all working/blocked tasks)
CREATE INDEX IF NOT EXISTS idx_transport_task_state
    ON transport_messages (task_state) WHERE task_state NOT IN ('completed', 'canceled', 'rejected');

-- Record migration
INSERT INTO schema_version (version, description, applied_at)
VALUES (20, 'Task state enum (A2A-inspired), message expiration, implicit ACK convention', strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'));

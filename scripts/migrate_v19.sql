-- Migration v19: Threading model + content-addressable IDs
-- Adopts DIDComm-inspired threading (thread_id, parent_thread_id)
-- and AT Protocol-inspired content-addressable message IDs (message_cid).
--
-- thread_id: replaces linear turn numbers for message correlation.
--   Defaults to session_name for backward compatibility (existing sessions
--   act as their own thread). New multi-party exchanges can fork threads.
--
-- parent_thread_id: enables nested conversations within a session.
--   NULL for top-level threads.
--
-- message_cid: SHA-256 hash of the canonical JSON content, computed at
--   write time. Enables deduplication and content-integrity verification
--   without relying on filenames or turn numbers.
--
-- problem_type: DIDComm-inspired problem report classification.
--   NULL for normal messages. Values: 'error', 'warning', 'info'.
--   Enables structured error reporting between agents.

ALTER TABLE transport_messages ADD COLUMN thread_id TEXT;
ALTER TABLE transport_messages ADD COLUMN parent_thread_id TEXT;
ALTER TABLE transport_messages ADD COLUMN message_cid TEXT;
ALTER TABLE transport_messages ADD COLUMN problem_type TEXT;

-- Backfill thread_id from session_name for existing messages
UPDATE transport_messages SET thread_id = session_name WHERE thread_id IS NULL;

-- Index for thread-based queries
CREATE INDEX IF NOT EXISTS idx_transport_thread
    ON transport_messages (thread_id);

-- Index for CID lookups (dedup, integrity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_cid
    ON transport_messages (message_cid) WHERE message_cid IS NOT NULL;

-- Record migration
INSERT INTO schema_version (version, description, applied_at)
VALUES (19, 'Threading model (DIDComm-inspired) + content-addressable IDs (AT Protocol-inspired) + problem reports', strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'));

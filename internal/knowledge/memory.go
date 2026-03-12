// Package knowledge manages memory entries, session log, and design decisions.
package knowledge

import (
	"database/sql"
	"fmt"
)

// UpsertMemory upserts a memory entry in state.local.db.
// Topic + key form the composite primary key.
func UpsertMemory(db *sql.DB, topic, key, value string, status *string, sessionID *int) error {
	_, err := db.Exec(`
		INSERT INTO memory_entries (topic, entry_key, value, status, last_confirmed, session_id)
		VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'), ?)
		ON CONFLICT(topic, entry_key) DO UPDATE SET
			value = excluded.value,
			status = excluded.status,
			last_confirmed = excluded.last_confirmed,
			session_id = COALESCE(excluded.session_id, session_id)`,
		topic, key, value, status, sessionID)
	if err != nil {
		return fmt.Errorf("upsert memory: %w", err)
	}
	fmt.Printf("upserted: memory_entries/%s/%s\n", topic, key)
	return nil
}

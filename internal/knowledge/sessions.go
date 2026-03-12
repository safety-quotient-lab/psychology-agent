package knowledge

import (
	"database/sql"
	"fmt"
)

// UpsertSession upserts a session log entry in state.db.
func UpsertSession(db *sql.DB, sessionID int, timestamp, summary string, artifacts, flags *string) error {
	_, err := db.Exec(`
		INSERT OR REPLACE INTO session_log (id, timestamp, summary, artifacts, epistemic_flags)
		VALUES (?, ?, ?, ?, ?)`,
		sessionID, timestamp, summary, artifacts, flags)
	if err != nil {
		return fmt.Errorf("upsert session: %w", err)
	}
	fmt.Printf("upserted: session_log/%d\n", sessionID)
	return nil
}

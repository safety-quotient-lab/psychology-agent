// Package cogarch manages cognitive architecture telemetry.
package cogarch

import (
	"database/sql"
	"fmt"
)

// FireTrigger records a trigger firing — increment counter, update timestamp.
// Writes to state.db (shared).
func FireTrigger(db *sql.DB, triggerID string) error {
	_, err := db.Exec(`
		UPDATE trigger_state
		SET last_fired = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
			fire_count = fire_count + 1,
			updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
		WHERE trigger_id = ?`, triggerID)
	if err != nil {
		return fmt.Errorf("fire trigger: %w", err)
	}
	fmt.Printf("fired: trigger_state/%s\n", triggerID)
	return nil
}

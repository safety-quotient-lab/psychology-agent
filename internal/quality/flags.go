package quality

import (
	"database/sql"
	"fmt"
	"os"
)

// ResolveFlag marks an epistemic flag as resolved. Writes to state.db.
func ResolveFlag(db *sql.DB, flagID int, resolvedBy string) (int64, error) {
	result, err := db.Exec(`
		UPDATE epistemic_flags
		SET resolved = TRUE,
			resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
			resolved_by = ?
		WHERE id = ?`, resolvedBy, flagID)
	if err != nil {
		return 0, fmt.Errorf("resolve flag: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "warning: no flag found for id=%d\n", flagID)
	} else {
		fmt.Printf("flag resolved: epistemic_flags/%d by %s\n", flagID, resolvedBy)
	}
	return affected, nil
}

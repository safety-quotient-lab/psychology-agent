// Package quality handles claims verification, epistemic flags,
// engineering incidents, and universal facets.
package quality

import (
	"database/sql"
	"fmt"
	"os"
)

// VerifyClaim marks a claim as verified (or failed). Writes to state.db.
func VerifyClaim(db *sql.DB, claimID int, failed bool) (int64, error) {
	verified := 1
	if failed {
		verified = 0
	}
	result, err := db.Exec(`
		UPDATE claims
		SET verified = ?,
			verified_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
		WHERE id = ?`, verified, claimID)
	if err != nil {
		return 0, fmt.Errorf("verify claim: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "warning: no claim found for id=%d\n", claimID)
	} else {
		status := "verified"
		if failed {
			status = "failed"
		}
		fmt.Printf("claim %s: claims/%d\n", status, claimID)
	}
	return affected, nil
}

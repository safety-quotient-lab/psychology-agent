package knowledge

import (
	"database/sql"
	"fmt"
)

// UpsertDecision upserts a design decision in the decision chain (state.db).
func UpsertDecision(db *sql.DB, key, text, date string, source *string, confidence *float64) error {
	_, err := db.Exec(`
		INSERT INTO decision_chain (decision_key, decision_text, evidence_source, decided_date, confidence)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(decision_key) DO UPDATE SET
			decision_text = excluded.decision_text,
			evidence_source = COALESCE(excluded.evidence_source, evidence_source),
			decided_date = excluded.decided_date,
			confidence = COALESCE(excluded.confidence, confidence)`,
		key, text, source, date, confidence)
	if err != nil {
		return fmt.Errorf("upsert decision: %w", err)
	}
	fmt.Printf("upserted: decision_chain/%s\n", key)
	return nil
}

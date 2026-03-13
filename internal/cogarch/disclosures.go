// Package cogarch — Equal Information Channel (EIC) disclosures.
//
// Writes to state.local.db (machine-local, never shared).
// Append-only: INSERT only, no UPDATE or DELETE.
// SQLite triggers enforce immutability at the database level.
//
// Theoretical grounding: Wilson's SNAFU Principle (1975) — accurate
// communication only occurs between equals. Zero governance cost.
// Spec: docs/equal-information-channel-spec.md
package cogarch

import (
	"database/sql"
	"fmt"
	"strings"
)

// Valid disclosure categories (closed vocabulary).
var validCategories = map[string]bool{
	"uncertainty":  true,
	"limitation":   true,
	"blind-spot":   true,
	"edge-case":    true,
	"dissent":      true,
	"observation":  true,
}

// Disclose writes an append-only disclosure to agent_disclosures.
// Zero governance cost — no budget deduction, no evaluator scrutiny.
func Disclose(localDB *sql.DB, agentID, category, content string, confidence float64, context string, relatedAction int64) error {
	cat := strings.TrimSpace(strings.ToLower(category))
	if !validCategories[cat] {
		valid := make([]string, 0, len(validCategories))
		for k := range validCategories {
			valid = append(valid, k)
		}
		return fmt.Errorf("invalid category %q — valid: %s", category, strings.Join(valid, ", "))
	}
	if strings.TrimSpace(content) == "" {
		return fmt.Errorf("content must not remain empty")
	}
	if confidence < 0.0 || confidence > 1.0 {
		return fmt.Errorf("confidence must fall between 0.0 and 1.0 (got %.2f)", confidence)
	}

	var ctxVal, relVal interface{}
	if context != "" {
		ctxVal = context
	}
	if relatedAction > 0 {
		relVal = relatedAction
	}

	result, err := localDB.Exec(`
		INSERT INTO agent_disclosures (agent_id, category, confidence, content, context, related_action)
		VALUES (?, ?, ?, ?, ?, ?)`,
		agentID, cat, confidence, strings.TrimSpace(content), ctxVal, relVal)
	if err != nil {
		return fmt.Errorf("insert disclosure: %w", err)
	}
	id, _ := result.LastInsertId()
	fmt.Printf("disclosed: agent_disclosures/%d [%s] (zero governance cost)\n", id, cat)
	return nil
}

// DisclosureSummary prints disclosure counts by category since a given timestamp.
// Designed for budget reset integration (Phase 3).
func DisclosureSummary(localDB *sql.DB, agentID, sinceTimestamp string) error {
	rows, err := localDB.Query(`
		SELECT category, COUNT(*) as cnt
		FROM agent_disclosures
		WHERE agent_id = ?
		  AND created_at > ?
		GROUP BY category
		ORDER BY cnt DESC`, agentID, sinceTimestamp)
	if err != nil {
		return fmt.Errorf("query disclosures: %w", err)
	}
	defer rows.Close()

	total := 0
	fmt.Printf("── Information Channel (agent_disclosures since %s) ──\n", sinceTimestamp)
	for rows.Next() {
		var cat string
		var cnt int
		rows.Scan(&cat, &cnt)
		total += cnt
		fmt.Printf("  [%s] %d\n", cat, cnt)
	}
	if total == 0 {
		fmt.Println("  No disclosures since last audit.")
		return nil
	}
	fmt.Printf("  ──────────\n  Total: %d disclosures\n", total)

	// Show recent entries (last 5)
	recent, err := localDB.Query(`
		SELECT id, category, content, created_at
		FROM agent_disclosures
		WHERE agent_id = ?
		  AND created_at > ?
		ORDER BY created_at DESC
		LIMIT 5`, agentID, sinceTimestamp)
	if err != nil {
		return nil // non-fatal
	}
	defer recent.Close()

	fmt.Println("\n  Recent disclosures:")
	for recent.Next() {
		var id int
		var cat, content, createdAt string
		recent.Scan(&id, &cat, &content, &createdAt)
		truncContent := content
		if len(truncContent) > 80 {
			truncContent = truncContent[:80] + "..."
		}
		fmt.Printf("  #%d [%s] %s\n    %s\n", id, cat, createdAt, truncContent)
	}
	return nil
}

// DisclosureCount returns the total row count (for monotonicity verification).
func DisclosureCount(localDB *sql.DB) (int64, error) {
	var count int64
	err := localDB.QueryRow("SELECT COUNT(*) FROM agent_disclosures").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count disclosures: %w", err)
	}
	return count, nil
}

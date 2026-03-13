// Package cogarch — Expectation Ledger (RPG likelihood tracking).
//
// Writes to state.local.db (machine-local, never shared).
// Tracks expectations → outcomes → deltas for calibration.
// Under process monism, we hold expectations about processual likelihoods,
// not predictions about fixed outcomes.
// Spec: docs/retrospective-pattern-generator-spec.md
package cogarch

import (
	"database/sql"
	"fmt"
	"strings"
)

var validOutcomes = map[string]bool{
	"confirmed":           true,
	"partially-confirmed": true,
	"refuted":             true,
	"untested":            true,
}

// RecordExpectation writes an expectation to the ledger.
func RecordExpectation(localDB *sql.DB, sessionID int, expectation, domain, likelihood, sourceDoc, outcome, detail, delta string) error {
	if strings.TrimSpace(expectation) == "" {
		return fmt.Errorf("expectation must not remain empty")
	}
	if strings.TrimSpace(domain) == "" {
		return fmt.Errorf("domain must not remain empty")
	}

	var outcomeVal, detailVal, deltaVal, sourceVal interface{}
	if outcome != "" {
		out := strings.TrimSpace(strings.ToLower(outcome))
		if !validOutcomes[out] {
			return fmt.Errorf("invalid outcome %q — valid: confirmed, partially-confirmed, refuted, untested", outcome)
		}
		outcomeVal = out
	}
	if detail != "" {
		detailVal = detail
	}
	if delta != "" {
		deltaVal = delta
	}
	if sourceDoc != "" {
		sourceVal = sourceDoc
	}

	var resolvedAtExpr string
	if outcomeVal != nil && outcome != "untested" {
		resolvedAtExpr = "strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')"
	} else {
		resolvedAtExpr = "NULL"
	}

	query := fmt.Sprintf(`
		INSERT INTO prediction_ledger (session_id, prediction, domain, source_doc, outcome, outcome_detail, delta_lesson, resolved_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, %s)`, resolvedAtExpr)

	// Note: table column named "prediction" for backward compat; we use "expectation" in the interface
	expText := strings.TrimSpace(expectation)
	if likelihood != "" {
		expText = fmt.Sprintf("[%s] %s", likelihood, expText)
	}

	result, err := localDB.Exec(query,
		sessionID, expText, strings.TrimSpace(domain),
		sourceVal, outcomeVal, detailVal, deltaVal)
	if err != nil {
		return fmt.Errorf("insert expectation: %w", err)
	}
	id, _ := result.LastInsertId()

	status := "untested"
	if outcomeVal != nil {
		status = outcomeVal.(string)
	}
	fmt.Printf("expected: prediction_ledger/%d [%s] domain=%s\n", id, status, domain)
	return nil
}

// ExpectationSummary shows expectation track record by domain.
func ExpectationSummary(localDB *sql.DB) error {
	rows, err := localDB.Query(`
		SELECT domain,
			SUM(CASE WHEN outcome = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
			SUM(CASE WHEN outcome = 'partially-confirmed' THEN 1 ELSE 0 END) as partial,
			SUM(CASE WHEN outcome = 'refuted' THEN 1 ELSE 0 END) as refuted,
			SUM(CASE WHEN outcome = 'untested' OR outcome IS NULL THEN 1 ELSE 0 END) as untested,
			COUNT(*) as total
		FROM prediction_ledger
		GROUP BY domain
		ORDER BY total DESC`)
	if err != nil {
		return fmt.Errorf("query expectations: %w", err)
	}
	defer rows.Close()

	fmt.Println("── Expectation Track Record ──")
	totalAll := 0
	confirmedAll := 0
	refutedAll := 0

	for rows.Next() {
		var domain string
		var confirmed, partial, refuted, untested, total int
		rows.Scan(&domain, &confirmed, &partial, &refuted, &untested, &total)
		totalAll += total
		confirmedAll += confirmed
		refutedAll += refuted
		resolved := confirmed + partial + refuted
		accuracy := 0.0
		if resolved > 0 {
			accuracy = float64(confirmed+partial) / float64(resolved) * 100
		}
		fmt.Printf("  %s: %d total (%d confirmed, %d partial, %d refuted, %d untested)",
			domain, total, confirmed, partial, refuted, untested)
		if resolved > 0 {
			fmt.Printf(" — %.0f%% accuracy", accuracy)
		}
		fmt.Println()
	}

	if totalAll == 0 {
		fmt.Println("  No expectations recorded yet.")
	} else {
		resolvedAll := confirmedAll + refutedAll
		if resolvedAll > 0 {
			fmt.Printf("\n  Overall: %d expectations, %d resolved, %.0f%% confirmed\n",
				totalAll, resolvedAll, float64(confirmedAll)/float64(resolvedAll)*100)
		}
	}
	return nil
}

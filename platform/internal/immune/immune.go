// Package immune implements the innate + adaptive immune system.
// Innate: fast, non-specific checks (TLR rate anomaly, complement
// outcome divergence, apoptosis heartbeat absence, MHC state contradiction).
// Adaptive: connectome Hebbian learning (same mechanism, different name).
//
// The connectome IS the adaptive immune response: hostile agents →
// claims don't resolve → effective_weight decays (LTD) → functionally
// quarantined at exploration floor (0.1).
package immune

import (
	"fmt"
	"log"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// InnateCheck represents one innate immune check result.
type InnateCheck struct {
	Name     string // e.g., "rate-anomaly", "outcome-divergence"
	Passed   bool
	Detail   string
	Severity string // "info", "warning", "critical"
}

// RunInnateChecks executes all innate immune checks.
// Returns findings (empty = healthy).
func RunInnateChecks(database *db.DB, projectRoot string) []InnateCheck {
	var findings []InnateCheck

	// 1. TLR: Rate anomaly detection
	// Check for any agent sending >10 messages in the last hour (flood)
	findings = append(findings, checkRateAnomaly(database)...)

	// 2. Complement: Outcome divergence
	// Check for agents with many sent messages but few completions
	findings = append(findings, checkOutcomeDivergence(database)...)

	// 3. Apoptosis: Heartbeat absence
	// (Handled by oscillator activation signal — heartbeat.StaleCount)

	// 4. State contradiction
	// Check for processed=TRUE but task_state=pending (inconsistency)
	findings = append(findings, checkStateContradiction(database)...)

	if len(findings) > 0 {
		for _, f := range findings {
			log.Printf("[immune] %s: %s [%s] %s",
				f.Severity, f.Name, passedStr(f.Passed), f.Detail)
		}
	}

	return findings
}

// checkRateAnomaly detects agents sending unusually high message volumes.
func checkRateAnomaly(database *db.DB) []InnateCheck {
	rows, err := database.QueryRows(
		`SELECT from_agent, COUNT(*) as cnt
		 FROM transport_messages
		 WHERE timestamp > datetime('now', '-1 hour')
		 GROUP BY from_agent
		 HAVING cnt > 10`)
	if err != nil {
		return nil
	}

	var findings []InnateCheck
	for _, row := range rows {
		agent := toString(row["from_agent"])
		count := toInt(row["cnt"])
		findings = append(findings, InnateCheck{
			Name:     "rate-anomaly",
			Passed:   false,
			Detail:   agent + ": " + intStr(count) + " messages in last hour",
			Severity: "warning",
		})
	}
	return findings
}

// checkOutcomeDivergence detects agents whose messages rarely reach completion.
func checkOutcomeDivergence(database *db.DB) []InnateCheck {
	rows, err := database.QueryRows(
		`SELECT from_agent,
		        COUNT(*) as total,
		        SUM(CASE WHEN task_state = 'completed' THEN 1 ELSE 0 END) as completed
		 FROM transport_messages
		 WHERE timestamp > datetime('now', '-7 days')
		 GROUP BY from_agent
		 HAVING total > 5 AND (completed * 1.0 / total) < 0.2`)
	if err != nil {
		return nil
	}

	var findings []InnateCheck
	for _, row := range rows {
		agent := toString(row["from_agent"])
		total := toInt(row["total"])
		completed := toInt(row["completed"])
		findings = append(findings, InnateCheck{
			Name:     "outcome-divergence",
			Passed:   false,
			Detail:   agent + ": " + intStr(completed) + "/" + intStr(total) + " completed (< 20%)",
			Severity: "warning",
		})
	}
	return findings
}

// checkStateContradiction finds processed messages with non-terminal task_state.
func checkStateContradiction(database *db.DB) []InnateCheck {
	count := database.ScalarInt(
		`SELECT COUNT(*) FROM transport_messages
		 WHERE processed = TRUE
		 AND task_state NOT IN ('completed', 'failed', 'canceled', 'rejected')
		 AND task_state IS NOT NULL
		 AND task_state != ''`)

	if count > 0 {
		return []InnateCheck{{
			Name:     "state-contradiction",
			Passed:   false,
			Detail:   intStr(count) + " messages marked processed but task_state not terminal",
			Severity: "info",
		}}
	}
	return nil
}

func passedStr(passed bool) string {
	if passed {
		return "PASS"
	}
	return "FAIL"
}

func toString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func toInt(v any) int {
	switch val := v.(type) {
	case int64:
		return int(val)
	case float64:
		return int(val)
	default:
		return 0
	}
}

func intStr(i int) string {
	return fmt.Sprintf("%d", i)
}

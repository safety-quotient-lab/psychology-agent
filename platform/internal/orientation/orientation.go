// Package orientation generates the context payload injected into autonomous
// sync sessions. Replaces orientation-payload.py with native Go queries.
// The payload gives claude /sync a compact summary of agent state without
// reading 15+ markdown files.
package orientation

import (
	"fmt"
	"strings"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Generate builds the orientation text from state.db queries.
func Generate(database *db.DB, agentID string) string {
	var sections []string

	// Budget status
	budget := budgetSection(database, agentID)
	if budget != "" {
		sections = append(sections, budget)
	}

	// Unprocessed messages
	messages := messagesSection(database)
	if messages != "" {
		sections = append(sections, messages)
	}

	// Pending gates
	gates := gatesSection(database, agentID)
	if gates != "" {
		sections = append(sections, gates)
	}

	// Recent sessions
	sessions := sessionsSection(database)
	if sessions != "" {
		sections = append(sections, sessions)
	}

	// Unresolved epistemic flags
	flags := flagsSection(database)
	if flags != "" {
		sections = append(sections, flags)
	}

	if len(sections) == 0 {
		return ""
	}

	return fmt.Sprintf("[ORIENTATION for %s]\n\n%s", agentID, strings.Join(sections, "\n\n"))
}

func budgetSection(database *db.DB, agentID string) string {
	rows, err := database.QueryRows(
		`SELECT COALESCE(budget_spent, 0) as spent,
		        COALESCE(budget_cutoff, 0) as cutoff,
		        COALESCE(last_action, '') as last_action,
		        COALESCE(consecutive_blocks, 0) as blocks
		 FROM autonomy_budget WHERE agent_id = ?`, agentID)
	if err != nil || len(rows) == 0 {
		return ""
	}

	row := rows[0]
	spent := toInt(row["spent"])
	cutoff := toInt(row["cutoff"])
	lastAction := toString(row["last_action"])
	blocks := toInt(row["blocks"])

	cutoffStr := "unlimited"
	if cutoff > 0 {
		cutoffStr = fmt.Sprintf("%d", cutoff)
	}

	s := fmt.Sprintf("BUDGET: %d/%s spent", spent, cutoffStr)
	if lastAction != "" {
		s += fmt.Sprintf(" | last action: %s", lastAction)
	}
	if blocks > 0 {
		s += fmt.Sprintf(" | consecutive errors: %d", blocks)
	}
	return s
}

func messagesSection(database *db.DB) string {
	count := database.ScalarInt(
		"SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE")
	if count == 0 {
		return ""
	}

	// Get details of unprocessed messages
	rows, err := database.QueryRows(
		`SELECT session_name, from_agent, subject, message_type, urgency
		 FROM transport_messages
		 WHERE processed = FALSE
		 ORDER BY timestamp DESC LIMIT 10`)
	if err != nil {
		return fmt.Sprintf("UNPROCESSED: %d messages", count)
	}

	lines := []string{fmt.Sprintf("UNPROCESSED: %d messages", count)}
	for _, row := range rows {
		session := toString(row["session_name"])
		from := toString(row["from_agent"])
		subject := toString(row["subject"])
		msgType := toString(row["message_type"])
		urgency := toString(row["urgency"])

		line := fmt.Sprintf("  - [%s] %s → %s", session, from, subject)
		if msgType != "" {
			line += fmt.Sprintf(" (%s)", msgType)
		}
		if urgency != "" && urgency != "normal" {
			line += fmt.Sprintf(" [%s]", urgency)
		}
		lines = append(lines, line)
	}
	return strings.Join(lines, "\n")
}

func gatesSection(database *db.DB, agentID string) string {
	rows, err := database.QueryRows(
		`SELECT gate_id, receiving_agent, gate_condition, timeout_at
		 FROM pending_handoffs
		 WHERE status = 'waiting' AND sending_agent = ?
		 ORDER BY timeout_at ASC`, agentID)
	if err != nil || len(rows) == 0 {
		return ""
	}

	lines := []string{fmt.Sprintf("PENDING GATES: %d", len(rows))}
	for _, row := range rows {
		gateID := toString(row["gate_id"])
		receiver := toString(row["receiving_agent"])
		timeout := toString(row["timeout_at"])
		lines = append(lines, fmt.Sprintf("  - %s → %s (timeout: %s)", gateID, receiver, timeout))
	}
	return strings.Join(lines, "\n")
}

func sessionsSection(database *db.DB) string {
	rows, err := database.QueryRows(
		`SELECT id, summary FROM session_log
		 ORDER BY id DESC LIMIT 3`)
	if err != nil || len(rows) == 0 {
		return ""
	}

	lines := []string{"RECENT SESSIONS:"}
	for _, row := range rows {
		id := toInt(row["id"])
		summary := toString(row["summary"])
		if len(summary) > 80 {
			summary = summary[:80] + "..."
		}
		lines = append(lines, fmt.Sprintf("  - Session %d: %s", id, summary))
	}
	return strings.Join(lines, "\n")
}

func flagsSection(database *db.DB) string {
	count := database.ScalarInt(
		"SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE")
	if count == 0 {
		return ""
	}
	return fmt.Sprintf("EPISTEMIC FLAGS: %d unresolved", count)
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

func toString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

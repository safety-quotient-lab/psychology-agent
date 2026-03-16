// Triage — deterministic message classification for crystallized sync.
//
// Scores each unprocessed transport message on a 0-100 scale and assigns
// a disposition: auto-skip, auto-ack, auto-record, or needs-llm.
// Higher score = more likely to need LLM reasoning.
//
// Design: docs/crystallized-sync-spec.md
// Cattell (1971) crystallized vs fluid intelligence framing.
package transport

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

// TriageResult holds the output of a triage scan.
type TriageResult struct {
	Scanned      int                    `json:"scanned"`
	Dispositions map[string]int         `json:"dispositions"`
	Messages     []TriagedMessage       `json:"messages"`
}

// TriagedMessage holds triage output for a single message.
type TriagedMessage struct {
	Filename    string `json:"filename"`
	Session     string `json:"session"`
	Score       int    `json:"score"`
	Disposition string `json:"disposition"`
	Reason      string `json:"reason"`
}

// triageRow holds the DB columns needed for scoring.
type triageRow struct {
	ID          int64
	Session     string
	Filename    string
	MessageType sql.NullString
	FromAgent   string
	Urgency     sql.NullString
	AckRequired int
	ClaimsCount int
	SETL        sql.NullFloat64
	ProblemType sql.NullString
	ExpiresAt   sql.NullString
	Timestamp   string
}

// baseScores maps message_type to its base triage score.
var baseScores = map[string]int{
	"heartbeat":       0,
	"ack":             5,
	"acknowledgment":  5,
	"notification":    10,
	"state-update":    10,
	"vote":            50,
	"problem-report":  60,
	"response":        70,
	"review":          75,
	"request":         80,
	"decision":        80,
	"command-request": 85,
	"proposal":        90,
}

// substanceTypes require LLM response even when ack_required.
var substanceTypes = map[string]bool{
	"request":         true,
	"proposal":        true,
	"command-request": true,
	"review":          true,
	"decision":        true,
}

// dispositionThresholds define score-to-disposition mapping.
const (
	thresholdAutoSkip   = 15
	thresholdAutoAck    = 35
	thresholdAutoRecord = 55
)

// TriageScan scores all unprocessed messages and writes dispositions.
// When dryRun=true, scores but does not write to state.db.
func TriageScan(sharedDB *sql.DB, localDB *sql.DB, selfAgentID string, dryRun bool) (*TriageResult, error) {
	rows, err := sharedDB.Query(`
		SELECT id, session_name, filename, message_type, from_agent,
		       urgency, ack_required, claims_count, setl, problem_type,
		       expires_at, timestamp
		FROM transport_messages
		WHERE processed = FALSE
		  AND (triage_disposition IS NULL OR triage_disposition = '')
		ORDER BY timestamp ASC`)
	if err != nil {
		return nil, fmt.Errorf("triage query: %w", err)
	}
	defer rows.Close()

	// Load active gates for gate modifier
	activeGateSessionNames := loadActiveGateSessions(localDB, selfAgentID)

	result := &TriageResult{
		Dispositions: map[string]int{
			"auto-skip":   0,
			"auto-ack":    0,
			"auto-record": 0,
			"needs-llm":   0,
		},
	}

	var updates []TriagedMessage
	for rows.Next() {
		var r triageRow
		if err := rows.Scan(&r.ID, &r.Session, &r.Filename, &r.MessageType,
			&r.FromAgent, &r.Urgency, &r.AckRequired, &r.ClaimsCount,
			&r.SETL, &r.ProblemType, &r.ExpiresAt, &r.Timestamp); err != nil {
			fmt.Fprintf(os.Stderr, "triage scan: %v\n", err)
			continue
		}

		score, reason := computeTriageScore(r, selfAgentID, activeGateSessionNames)
		disposition := scoreToDisposition(score)

		msg := TriagedMessage{
			Filename:    r.Filename,
			Session:     r.Session,
			Score:       score,
			Disposition: disposition,
			Reason:      reason,
		}
		updates = append(updates, msg)
		result.Messages = append(result.Messages, msg)
		result.Dispositions[disposition]++
	}

	result.Scanned = len(updates)

	if !dryRun && len(updates) > 0 {
		if err := writeTriageResults(sharedDB, updates); err != nil {
			return result, fmt.Errorf("write triage: %w", err)
		}
	}

	return result, nil
}

// TriageStatus returns current triage state summary.
func TriageStatus(db *sql.DB) (*TriageResult, error) {
	rows, err := db.Query(`
		SELECT filename, session_name, triage_score, triage_disposition
		FROM transport_messages
		WHERE triage_disposition IS NOT NULL
		  AND processed = FALSE
		ORDER BY triage_score DESC`)
	if err != nil {
		return nil, fmt.Errorf("triage status: %w", err)
	}
	defer rows.Close()

	result := &TriageResult{
		Dispositions: map[string]int{
			"auto-skip":   0,
			"auto-ack":    0,
			"auto-record": 0,
			"needs-llm":   0,
		},
	}
	for rows.Next() {
		var m TriagedMessage
		var score sql.NullInt64
		var disp sql.NullString
		if err := rows.Scan(&m.Filename, &m.Session, &score, &disp); err != nil {
			continue
		}
		if score.Valid {
			m.Score = int(score.Int64)
		}
		if disp.Valid {
			m.Disposition = disp.String
		}
		result.Messages = append(result.Messages, m)
		result.Dispositions[m.Disposition]++
	}
	result.Scanned = len(result.Messages)
	return result, nil
}

func computeTriageScore(r triageRow, selfAgentID string, activeGateSessions map[string]bool) (int, string) {
	var parts []string

	// Edge case: self-messages score 0
	if r.FromAgent == selfAgentID {
		return 0, "self-message"
	}

	// Edge case: expired messages
	if r.ExpiresAt.Valid && r.ExpiresAt.String != "" {
		expiry, err := time.Parse("2006-01-02T15:04:05-07:00", r.ExpiresAt.String)
		if err == nil && time.Now().After(expiry) {
			return -100, "expired"
		}
		// Try alternate format
		expiry, err = time.Parse("2006-01-02T15:04:05", r.ExpiresAt.String)
		if err == nil && time.Now().After(expiry) {
			return -100, "expired"
		}
	}

	// Edge case: exempt sessions
	if r.Session == "local-coordination" {
		return 0, "exempt-session"
	}

	// Base score
	msgType := ""
	if r.MessageType.Valid {
		msgType = r.MessageType.String
	}
	base, found := baseScores[msgType]
	if !found {
		base = 50 // Unknown types route to LLM
	}
	parts = append(parts, fmt.Sprintf("%s(base:%d)", msgType, base))
	score := base

	// Urgency modifier
	urgency := "normal"
	if r.Urgency.Valid && r.Urgency.String != "" {
		urgency = r.Urgency.String
	}
	urgencyMod := urgencyModifier(urgency)
	if urgencyMod != 0 {
		score += urgencyMod
		parts = append(parts, fmt.Sprintf("urgency:%s(%+d)", urgency, urgencyMod))
	}

	// ACK modifier
	if r.AckRequired == 1 && substanceTypes[msgType] {
		score += 15
		parts = append(parts, "ack_required+substance(+15)")
	}

	// Gate modifier
	if activeGateSessions[r.Session] {
		score -= 30
		parts = append(parts, "resolves-gate(-30)")
	}

	// Age modifier
	ageMod := ageModifier(r.Timestamp)
	if ageMod != 0 {
		score += ageMod
		parts = append(parts, fmt.Sprintf("age(%+d)", ageMod))
	}

	// Content modifier
	if r.ClaimsCount > 0 {
		score += 10
		parts = append(parts, fmt.Sprintf("claims:%d(+10)", r.ClaimsCount))
	}
	if r.SETL.Valid && r.SETL.Float64 > 0.5 {
		score += 5
		parts = append(parts, "setl>0.5(+5)")
	}
	if r.ProblemType.Valid {
		switch r.ProblemType.String {
		case "error":
			score += 15
			parts = append(parts, "problem:error(+15)")
		case "warning":
			score += 5
			parts = append(parts, "problem:warning(+5)")
		}
	}

	// Clamp to 0-100
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score, strings.Join(parts, ", ")
}

func urgencyModifier(urgency string) int {
	switch urgency {
	case "immediate":
		return 20
	case "high":
		return 10
	case "normal":
		return 0
	case "low":
		return -10
	default:
		return 0
	}
}

func ageModifier(timestamp string) int {
	msgTime, err := time.Parse("2006-01-02T15:04:05-07:00", timestamp)
	if err != nil {
		msgTime, err = time.Parse("2006-01-02T15:04:05", timestamp)
		if err != nil {
			return 0
		}
	}
	hours := time.Since(msgTime).Hours()
	switch {
	case hours > 72:
		return 15
	case hours > 24:
		return 10
	case hours > 1:
		return 5
	default:
		return 0
	}
}

func scoreToDisposition(score int) string {
	switch {
	case score <= thresholdAutoSkip:
		return "auto-skip"
	case score <= thresholdAutoAck:
		return "auto-ack"
	case score <= thresholdAutoRecord:
		return "auto-record"
	default:
		return "needs-llm"
	}
}

func loadActiveGateSessions(localDB *sql.DB, selfAgentID string) map[string]bool {
	if localDB == nil {
		return nil
	}
	sessions := make(map[string]bool)
	rows, err := localDB.Query(`
		SELECT session_name FROM pending_handoffs
		WHERE status = 'waiting' AND sending_agent = ?`, selfAgentID)
	if err != nil {
		return sessions
	}
	defer rows.Close()
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err == nil {
			sessions[s] = true
		}
	}
	return sessions
}

func writeTriageResults(db *sql.DB, messages []TriagedMessage) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		UPDATE transport_messages
		SET triage_score = ?,
		    triage_disposition = ?,
		    triage_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
		WHERE session_name = ? AND filename = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, m := range messages {
		score := m.Score
		// Expired messages: transition to canceled
		if score == -100 {
			_, err := tx.Exec(`
				UPDATE transport_messages
				SET processed = TRUE,
				    processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
				    task_state = 'canceled',
				    triage_score = 0,
				    triage_disposition = 'auto-skip',
				    triage_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
				WHERE session_name = ? AND filename = ?`, m.Session, m.Filename)
			if err != nil {
				return err
			}
			continue
		}

		// Auto-skip: also mark processed
		if m.Disposition == "auto-skip" {
			_, err := tx.Exec(`
				UPDATE transport_messages
				SET processed = TRUE,
				    processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
				    task_state = 'completed',
				    triage_score = ?,
				    triage_disposition = ?,
				    triage_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
				WHERE session_name = ? AND filename = ?`,
				score, m.Disposition, m.Session, m.Filename)
			if err != nil {
				return err
			}
			continue
		}

		if _, err := stmt.Exec(score, m.Disposition, m.Session, m.Filename); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// PrintTriageJSON prints triage results as JSON.
func PrintTriageJSON(result *TriageResult) {
	data, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(data))
}


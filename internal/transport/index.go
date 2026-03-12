// Package transport handles transport message indexing, processing, and turn management.
package transport

import (
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// IndexMessageParams holds parameters for indexing a transport message.
type IndexMessageParams struct {
	Session        string
	Filename       string
	Turn           int
	MessageType    string
	FromAgent      string
	ToAgent        string
	Timestamp      string
	Subject        string
	ClaimsCount    int
	SETL           float64
	Urgency        string
	IssueURL       *string
	IssueNumber    *int
	IssuePending   bool
	ThreadID       *string
	ParentThreadID *string
	MessageCID     *string
	ProblemType    *string
	TaskState      string
	ExpiresAt      *string
}

// IndexMessage indexes a transport message in state.db.
// Returns the message CID (computed if not provided).
func IndexMessage(db *sql.DB, projectRoot string, p IndexMessageParams) (string, error) {
	cid := ""
	if p.MessageCID != nil {
		cid = *p.MessageCID
	}
	if cid == "" {
		computed := ComputeContentID(projectRoot, p.Session, p.Filename)
		if computed != "" {
			cid = computed
		}
	}

	threadID := p.Session
	if p.ThreadID != nil && *p.ThreadID != "" {
		threadID = *p.ThreadID
	}

	issuePending := 0
	if p.IssuePending {
		issuePending = 1
	}

	taskState := p.TaskState
	if taskState == "" {
		taskState = "pending"
	}

	_, err := db.Exec(`
		INSERT OR REPLACE INTO transport_messages
			(session_name, filename, turn, message_type, from_agent, to_agent,
			 timestamp, subject, claims_count, setl, urgency, processed, processed_at,
			 issue_url, issue_number, issue_pending,
			 thread_id, parent_thread_id, message_cid, problem_type,
			 task_state, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NULL, ?, ?, ?,
				?, ?, ?, ?,
				?, ?)`,
		p.Session, p.Filename, p.Turn, p.MessageType,
		p.FromAgent, p.ToAgent, p.Timestamp,
		p.Subject, p.ClaimsCount, p.SETL, p.Urgency,
		p.IssueURL, p.IssueNumber, issuePending,
		threadID, p.ParentThreadID, nilIfEmpty(cid), p.ProblemType,
		taskState, p.ExpiresAt,
	)
	if err != nil {
		return "", fmt.Errorf("index message: %w", err)
	}

	label := fmt.Sprintf("indexed: transport_messages/%s", p.Filename)
	if cid != "" && len(cid) >= 12 {
		label += fmt.Sprintf(" [cid:%s]", cid[:12])
	}
	fmt.Println(label)
	return cid, nil
}

// MarkProcessed marks a transport message as processed.
func MarkProcessed(db *sql.DB, session, filename string) (int64, error) {
	var result sql.Result
	var err error

	if session != "" {
		result, err = db.Exec(`
			UPDATE transport_messages
			SET processed = TRUE,
				processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
				task_state = 'completed'
			WHERE session_name = ? AND filename = ?`, session, filename)
	} else {
		result, err = db.Exec(`
			UPDATE transport_messages
			SET processed = TRUE,
				processed_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
				task_state = 'completed'
			WHERE filename = ?`, filename)
	}
	if err != nil {
		return 0, fmt.Errorf("mark processed: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "warning: no row found for filename=%s\n", filename)
	} else {
		fmt.Printf("marked processed: %s\n", filename)
	}
	return affected, nil
}

// NextTurn computes the next available turn number for a session.
func NextTurn(db *sql.DB, session string) (int, error) {
	var maxTurn sql.NullInt64
	err := db.QueryRow(
		"SELECT MAX(turn) FROM transport_messages WHERE session_name = ?",
		session,
	).Scan(&maxTurn)
	if err != nil {
		return 0, fmt.Errorf("next turn: %w", err)
	}
	if !maxTurn.Valid {
		return 1, nil
	}
	return int(maxTurn.Int64) + 1, nil
}

// GetIndexedFilenames returns filenames already indexed for a session.
func GetIndexedFilenames(db *sql.DB, sessionName string) (map[string]bool, error) {
	rows, err := db.Query(
		"SELECT filename FROM transport_messages WHERE session_name = ?",
		sessionName,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]bool)
	for rows.Next() {
		var fn string
		if err := rows.Scan(&fn); err != nil {
			continue
		}
		result[fn] = true
	}
	return result, nil
}

// ComputeContentID computes SHA-256 of canonical JSON for a transport file.
func ComputeContentID(projectRoot, session, filename string) string {
	fpath := filepath.Join(projectRoot, "transport", "sessions", session, filename)
	data, err := os.ReadFile(fpath)
	if err != nil {
		return ""
	}
	var parsed any
	if err := json.Unmarshal(data, &parsed); err != nil {
		return ""
	}
	canonical, err := json.Marshal(parsed)
	if err != nil {
		return ""
	}
	// json.Marshal produces sorted-keys for map[string]any
	// Re-marshal through map to ensure key sorting
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return ""
	}
	canonical, _ = json.Marshal(m)
	canonStr := strings.TrimSpace(string(canonical))
	h := sha256.Sum256([]byte(canonStr))
	return fmt.Sprintf("%x", h)
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ACK — template ACK generation for crystallized sync.
//
// Generates deterministic ACK message files for messages with auto-ack
// disposition. No LLM needed — fixed JSON template with variable substitution.
//
// Design: docs/crystallized-sync-spec.md §2
package transport

import (
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// AutoACKResult holds the output of an auto-ACK run.
type AutoACKResult struct {
	Generated int             `json:"generated"`
	ACKs      []GeneratedACK  `json:"acks"`
	Errors    []string        `json:"errors,omitempty"`
}

// GeneratedACK holds metadata for one generated ACK.
type GeneratedACK struct {
	OriginalFilename string `json:"original_filename"`
	ACKFilename      string `json:"ack_filename"`
	Session          string `json:"session"`
	Turn             int    `json:"turn"`
}

// ackCandidate holds DB columns for an auto-ack candidate.
type ackCandidate struct {
	ID          int64
	Session     string
	Filename    string
	Subject     sql.NullString
	FromAgent   string
	ThreadID    sql.NullString
	TriageScore sql.NullInt64
}

// AgentIdentity holds the from block for ACK messages.
type AgentIdentity struct {
	AgentID          string   `json:"agent_id"`
	Instance         string   `json:"instance,omitempty"`
	SchemasSupported []string `json:"schemas_supported"`
}

// AutoACK generates template ACKs for all auto-ack messages.
// When dryRun=true, computes ACKs but does not write files or update state.db.
func AutoACK(sharedDB *sql.DB, projectRoot string, selfAgentID string, dryRun bool) (*AutoACKResult, error) {
	identity := loadAgentIdentity(projectRoot, selfAgentID)

	rows, err := sharedDB.Query(`
		SELECT id, session_name, filename, subject, from_agent, thread_id, triage_score
		FROM transport_messages
		WHERE triage_disposition = 'auto-ack'
		  AND processed = FALSE
		ORDER BY timestamp ASC`)
	if err != nil {
		return nil, fmt.Errorf("auto-ack query: %w", err)
	}
	defer rows.Close()

	result := &AutoACKResult{}

	for rows.Next() {
		var c ackCandidate
		if err := rows.Scan(&c.ID, &c.Session, &c.Filename, &c.Subject,
			&c.FromAgent, &c.ThreadID, &c.TriageScore); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("scan: %v", err))
			continue
		}

		ack, err := generateACK(sharedDB, projectRoot, identity, c, dryRun)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", c.Filename, err))
			continue
		}
		result.ACKs = append(result.ACKs, *ack)
		result.Generated++
	}

	return result, nil
}

// ACKSingle generates an ACK for a specific message.
func ACKSingle(sharedDB *sql.DB, projectRoot string, selfAgentID string, session, filename string, dryRun bool) (*AutoACKResult, error) {
	identity := loadAgentIdentity(projectRoot, selfAgentID)

	var c ackCandidate
	err := sharedDB.QueryRow(`
		SELECT id, session_name, filename, subject, from_agent, thread_id, triage_score
		FROM transport_messages
		WHERE session_name = ? AND filename = ?`,
		session, filename).Scan(&c.ID, &c.Session, &c.Filename, &c.Subject,
		&c.FromAgent, &c.ThreadID, &c.TriageScore)
	if err != nil {
		return nil, fmt.Errorf("find message: %w", err)
	}

	result := &AutoACKResult{}
	ack, err := generateACK(sharedDB, projectRoot, identity, c, dryRun)
	if err != nil {
		return nil, err
	}
	result.ACKs = append(result.ACKs, *ack)
	result.Generated = 1
	return result, nil
}

func generateACK(sharedDB *sql.DB, projectRoot string, identity AgentIdentity, c ackCandidate, dryRun bool) (*GeneratedACK, error) {
	// Compute next turn for this session
	nextTurn, err := NextTurn(sharedDB, c.Session)
	if err != nil {
		return nil, fmt.Errorf("next turn: %w", err)
	}

	// Also check filesystem for turn collisions
	sessionDir := filepath.Join(projectRoot, "transport", "sessions", c.Session)
	fsTurn := scanFilesystemMaxTurn(sessionDir)
	if fsTurn >= nextTurn {
		nextTurn = fsTurn + 1
	}

	timestamp := time.Now().Format("2006-01-02T15:04:05-07:00")

	subject := "ACK"
	if c.Subject.Valid && c.Subject.String != "" {
		subject = "ACK: " + c.Subject.String
	}

	threadID := c.Session
	if c.ThreadID.Valid && c.ThreadID.String != "" {
		threadID = c.ThreadID.String
	}

	triageScore := 0
	if c.TriageScore.Valid {
		triageScore = int(c.TriageScore.Int64)
	}

	ackFilename := fmt.Sprintf("from-%s-%03d.json", identity.AgentID, nextTurn)

	// Build ACK message
	ackMsg := map[string]any{
		"schema":     "interagent/v1",
		"session_id": c.Session,
		"turn":       nextTurn,
		"timestamp":  timestamp,
		"message_type": "ack",
		"in_response_to": c.Filename,
		"thread_id":       threadID,
		"parent_thread_id": nil,
		"from": map[string]any{
			"agent_id":           identity.AgentID,
			"instance":           identity.Instance,
			"schemas_supported":  identity.SchemasSupported,
		},
		"to": map[string]any{
			"agent_id": c.FromAgent,
		},
		"transport": map[string]any{
			"method":      "git-pr",
			"persistence": "persistent",
		},
		"payload": map[string]any{
			"subject":            subject,
			"auto_generated":     true,
			"triage_score":       triageScore,
			"triage_disposition": "auto-ack",
		},
		"ack_required": false,
		"urgency":      "normal",
		"setl":         0.01,
	}

	// Compute CID
	canonical, _ := json.Marshal(ackMsg)
	h := sha256.Sum256(canonical)
	cid := fmt.Sprintf("%x", h)
	ackMsg["message_cid"] = cid

	result := &GeneratedACK{
		OriginalFilename: c.Filename,
		ACKFilename:      ackFilename,
		Session:          c.Session,
		Turn:             nextTurn,
	}

	if dryRun {
		fmt.Printf("dry-run: would write %s/%s (ACK for %s)\n", c.Session, ackFilename, c.Filename)
		return result, nil
	}

	// Ensure session directory exists
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		return nil, fmt.Errorf("create session dir: %w", err)
	}

	// Write ACK file
	ackJSON, _ := json.MarshalIndent(ackMsg, "", "  ")
	ackPath := filepath.Join(sessionDir, ackFilename)
	if err := os.WriteFile(ackPath, ackJSON, 0644); err != nil {
		return nil, fmt.Errorf("write ack: %w", err)
	}

	// Index the ACK in state.db
	_, err = IndexMessage(sharedDB, projectRoot, IndexMessageParams{
		Session:     c.Session,
		Filename:    ackFilename,
		Turn:        nextTurn,
		MessageType: "ack",
		FromAgent:   identity.AgentID,
		ToAgent:     c.FromAgent,
		Timestamp:   timestamp,
		Subject:     subject,
		Urgency:     "normal",
		SETL:        0.01,
		MessageCID:  &cid,
		ThreadID:    &threadID,
		TaskState:   "completed",
	})
	if err != nil {
		return nil, fmt.Errorf("index ack: %w", err)
	}

	// Mark the ACK itself as processed (outbound)
	_, _ = MarkProcessed(sharedDB, c.Session, ackFilename)

	// Mark the original message as processed
	_, _ = MarkProcessed(sharedDB, c.Session, c.Filename)

	// Set ack_received on original message
	_, _ = sharedDB.Exec(`
		UPDATE transport_messages
		SET ack_received = 1
		WHERE session_name = ? AND filename = ?`, c.Session, c.Filename)

	fmt.Printf("auto-ack: %s/%s → %s\n", c.Session, ackFilename, c.Filename)
	return result, nil
}

func loadAgentIdentity(projectRoot, fallbackID string) AgentIdentity {
	path := filepath.Join(projectRoot, ".agent-identity.json")
	data, err := os.ReadFile(path)
	if err != nil {
		hostname, _ := os.Hostname()
		if fallbackID == "" {
			fallbackID = hostname
		}
		return AgentIdentity{
			AgentID:          fallbackID,
			Instance:         hostname,
			SchemasSupported: []string{"interagent/v1"},
		}
	}

	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		return AgentIdentity{
			AgentID:          fallbackID,
			SchemasSupported: []string{"interagent/v1"},
		}
	}

	agentID := fallbackID
	if id, ok := raw["agent_id"].(string); ok && id != "" {
		agentID = id
	}

	hostname := ""
	if h, ok := raw["hostname"].(string); ok {
		hostname = h
	}

	return AgentIdentity{
		AgentID:          agentID,
		Instance:         hostname,
		SchemasSupported: []string{"interagent/v1"},
	}
}

func scanFilesystemMaxTurn(sessionDir string) int {
	entries, err := os.ReadDir(sessionDir)
	if err != nil {
		return 0
	}
	maxTurn := 0
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		// Extract turn number from filename like "from-agent-003.json"
		name = strings.TrimSuffix(name, ".json")
		parts := strings.Split(name, "-")
		if len(parts) < 2 {
			continue
		}
		last := parts[len(parts)-1]
		var turn int
		if _, err := fmt.Sscanf(last, "%d", &turn); err == nil {
			if turn > maxTurn {
				maxTurn = turn
			}
		}
	}
	return maxTurn
}

// PrintACKJSON prints ACK results as JSON.
func PrintACKJSON(result *AutoACKResult) {
	data, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(data))
}

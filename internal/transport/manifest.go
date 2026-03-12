// Package transport — MANIFEST.json generation.
// Absorbs scripts/generate_manifest.py.
package transport

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// SessionRenames maps legacy session names to current names.
var SessionRenames = map[string]string{
	"item4-derivation": "psychology-interface",
	"item2-derivation": "subagent-protocol",
}

// Manifest represents the transport MANIFEST.json structure.
type Manifest struct {
	Schema         string                       `json:"schema"`
	Description    string                       `json:"description"`
	GeneratedAt    string                       `json:"generated_at"`
	Source         string                       `json:"source"`
	Pending        map[string][]ManifestMessage `json:"pending"`
	SessionRenames map[string]string            `json:"session_renames"`
}

// ManifestMessage represents one pending message in the manifest.
type ManifestMessage struct {
	Session          string `json:"session"`
	File             string `json:"file"`
	Type             string `json:"type"`
	Subject          string `json:"subject"`
	Timestamp        string `json:"timestamp"`
	RequiresResponse bool   `json:"requires_response,omitempty"`
}

// GenerateManifest queries state.db for pending messages and builds a Manifest.
func GenerateManifest(db *sql.DB) (*Manifest, error) {
	rows, err := db.Query(`
		SELECT session_name, filename, message_type, subject,
			   timestamp, ack_required, from_agent, to_agent
		FROM transport_messages
		WHERE processed = FALSE
		ORDER BY to_agent, timestamp`)
	if err != nil {
		return nil, fmt.Errorf("query pending messages: %w", err)
	}
	defer rows.Close()

	pending := make(map[string][]ManifestMessage)
	for rows.Next() {
		var (
			session, filename, msgType, subject string
			ts, fromAgent, toAgent              string
			ackRequired                         int
		)
		if err := rows.Scan(&session, &filename, &msgType, &subject,
			&ts, &ackRequired, &fromAgent, &toAgent); err != nil {
			continue
		}
		if msgType == "" {
			msgType = "unknown"
		}
		entry := ManifestMessage{
			Session:   session,
			File:      fmt.Sprintf("transport/sessions/%s/%s", session, filename),
			Type:      msgType,
			Subject:   subject,
			Timestamp: ts,
		}
		if ackRequired != 0 {
			entry.RequiresResponse = true
		}
		pending[toAgent] = append(pending[toAgent], entry)
	}

	return &Manifest{
		Schema: "transport-manifest/v2",
		Description: "Auto-generated from state.db. Pending messages only — " +
			"completed history lives in state.db (queryable) and git history (auditable).",
		GeneratedAt:    time.Now().Format("2006-01-02T15:04:05"),
		Source:         "agentdb manifest",
		Pending:        pending,
		SessionRenames: SessionRenames,
	}, nil
}

// WriteManifest generates and writes MANIFEST.json.
func WriteManifest(db *sql.DB, projectRoot string, dryRun bool) error {
	manifest, err := GenerateManifest(db)
	if err != nil {
		return err
	}

	output, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}
	output = append(output, '\n')

	if dryRun {
		fmt.Print(string(output))
		return nil
	}

	manifestPath := filepath.Join(projectRoot, "transport", "MANIFEST.json")
	os.MkdirAll(filepath.Dir(manifestPath), 0755)
	if err := os.WriteFile(manifestPath, output, 0644); err != nil {
		return fmt.Errorf("write manifest: %w", err)
	}

	pendingCount := 0
	for _, msgs := range manifest.Pending {
		pendingCount += len(msgs)
	}
	fmt.Printf("MANIFEST.json generated: %d pending message(s)\n", pendingCount)
	return nil
}

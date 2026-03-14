package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type inboundMessage struct {
	Protocol  string      `json:"protocol"`
	Type      string      `json:"type"`
	From      interface{} `json:"from"`
	To        interface{} `json:"to"`
	SessionID string      `json:"session_id"`
	Turn      int         `json:"turn"`
	Timestamp string      `json:"timestamp"`
	Subject   string      `json:"subject"`
	Body      string      `json:"body,omitempty"`
}

// APIInbound handles POST /api/messages/inbound — dual-write to state.db + filesystem.
func APIInbound(projectRoot, dbPath string, zmqPublish func(string, any) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid body"})
			return
		}
		var msg inboundMessage
		if err := json.Unmarshal(body, &msg); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON"})
			return
		}
		if msg.SessionID == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "missing session_id"})
			return
		}
		fromAgent := extractAgentID(msg.From)
		toAgent := extractAgentID(msg.To)
		subject := msg.Subject
		if strings.TrimSpace(subject) == "" {
			subject = msg.SessionID
			if msg.Type != "" {
				subject += fmt.Sprintf(" (%s from %s)", msg.Type, fromAgent)
			}
		}
		turn := fmt.Sprintf("%03d", msg.Turn)
		sender := fromAgent
		if sender == "" {
			sender = "unknown"
		}
		filename := fmt.Sprintf("from-%s-%s.json", sender, turn)
		timestamp := msg.Timestamp
		if timestamp == "" {
			timestamp = time.Now().UTC().Format(time.RFC3339)
		}
		esc := func(s string) string { return strings.ReplaceAll(s, "'", "''") }
		sql := fmt.Sprintf(
			"INSERT OR IGNORE INTO transport_messages "+
				"(filename, session_name, direction, from_agent, to_agent, turn, message_type, subject, timestamp) "+
				"VALUES ('%s','%s','inbound','%s','%s',%d,'%s','%s','%s');",
			esc(filename), esc(msg.SessionID), esc(fromAgent), esc(toAgent),
			msg.Turn, esc(msg.Type), esc(subject), esc(timestamp))
		if out, dbErr := exec.Command("sqlite3", dbPath, sql).CombinedOutput(); dbErr != nil {
			log.Printf("[inbound] state.db write failed: %v (%s)", dbErr, string(out))
		}
		sessionDir := filepath.Join(projectRoot, "transport", "sessions", msg.SessionID)
		os.MkdirAll(sessionDir, 0755)
		filePath := filepath.Join(sessionDir, filename)
		os.WriteFile(filePath, body, 0644)
		log.Printf("[inbound] accepted: session=%s from=%s turn=%d", msg.SessionID, fromAgent, msg.Turn)
		if zmqPublish != nil {
			zmqPublish("transport", map[string]interface{}{
				"session_id": msg.SessionID, "from": fromAgent, "to": toAgent,
				"type": msg.Type, "subject": subject,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"accepted": true, "session_id": msg.SessionID, "filename": filename,
			"indexed": true, "dual_write": "state.db + filesystem",
		})
	}
}

func extractAgentID(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case map[string]interface{}:
		if id, ok := val["agent_id"].(string); ok {
			return id
		}
	case []interface{}:
		if len(val) > 0 {
			return extractAgentID(val[0])
		}
	}
	return fmt.Sprintf("%v", v)
}

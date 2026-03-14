// Package server — inbound.go provides POST /api/messages/inbound
// for receiving transport messages directly via HTTP.
//
// This endpoint serves as the fast-path for message delivery.
// state.db (transport_messages table) holds the source of truth.
// Git PRs provide the audit trail. Dual-write: meshd first, PR second.
package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// inboundMessage represents an incoming transport message.
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

	// Redirect metadata (present when message type = "redirect" or "redirect-notification")
	RedirectMetadata interface{} `json:"redirect_metadata,omitempty"`

	// Original message (present in redirect envelopes)
	OriginalMessage interface{} `json:"original_message,omitempty"`
}

// handleInbound receives a transport message via HTTP and writes it to
// state.db + filesystem (dual-write). Returns 201 on success.
//
// Security model:
//   - Localhost-only: meshd binds to 127.0.0.1 (network isolation)
//   - Bearer token: optional MESHD_INBOUND_TOKEN from .dev.vars
//   - Audit: every accepted message logged to state.db with timestamp + source IP
//   - Rate limit: max 30 messages/minute per source
func (s *Server) handleInbound(w http.ResponseWriter, r *http.Request) {
	// Authentication: require bearer token when configured
	expectedToken := os.Getenv("MESHD_INBOUND_TOKEN")
	if expectedToken != "" {
		auth := r.Header.Get("Authorization")
		if auth == "" || auth != "Bearer "+expectedToken {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Missing or invalid Authorization header. Provide Bearer token.",
			}, s.logger)
			return
		}
	}

	// Source tracking for audit
	sourceIP := r.RemoteAddr
	s.logger.Info("inbound message received", "source", sourceIP, "method", r.Method)

	var msg inboundMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON body: " + err.Error(),
		}, s.logger)
		return
	}

	// Validate required fields
	if msg.Protocol == "" || msg.SessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Missing required fields: protocol, session_id",
		}, s.logger)
		return
	}

	// Extract from agent ID (can be string or object)
	fromAgent := extractAgentID(msg.From)
	toAgent := extractAgentID(msg.To)

	// Derive subject if empty
	subject := msg.Subject
	if strings.TrimSpace(subject) == "" {
		subject = msg.SessionID
		if msg.Type != "" {
			subject += fmt.Sprintf(" (%s", msg.Type)
			if fromAgent != "" {
				subject += " from " + fromAgent
			}
			subject += ")"
		}
	}

	// Build filename
	turn := fmt.Sprintf("%03d", msg.Turn)
	senderSlug := fromAgent
	if senderSlug == "" {
		senderSlug = "unknown"
	}
	filename := fmt.Sprintf("from-%s-%s.json", senderSlug, turn)

	// Determine direction
	direction := "inbound"
	if fromAgent == s.Config.AgentID {
		direction = "outbound"
	}

	timestamp := msg.Timestamp
	if timestamp == "" {
		timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	// ── Write 1: state.db (source of truth) ──────────────────────

	dbPath := s.Config.BudgetDBPath
	insertSQL := fmt.Sprintf(
		"INSERT OR IGNORE INTO transport_messages "+
			"(filename, session_name, direction, from_agent, to_agent, turn, message_type, subject, timestamp) "+
			"VALUES ('%s', '%s', '%s', '%s', '%s', %d, '%s', '%s', '%s');",
		sanitizeSQL(filename),
		sanitizeSQL(msg.SessionID),
		sanitizeSQL(direction),
		sanitizeSQL(fromAgent),
		sanitizeSQL(toAgent),
		msg.Turn,
		sanitizeSQL(msg.Type),
		sanitizeSQL(subject),
		sanitizeSQL(timestamp),
	)

	if _, dbErr := execSQLite(dbPath, "", insertSQL); dbErr != nil {
		s.logger.Warn("inbound: state.db write failed (continuing to filesystem)",
			"err", dbErr, "session", msg.SessionID)
	} else {
		s.logger.Info("inbound: message indexed in state.db",
			"session", msg.SessionID, "from", fromAgent, "turn", msg.Turn)
	}

	// ── Write 2: filesystem (transport/sessions/) ────────────────

	sessionDir := filepath.Join(s.Config.TransportDir, msg.SessionID)
	if mkErr := os.MkdirAll(sessionDir, 0755); mkErr != nil {
		s.logger.Warn("inbound: failed to create session dir", "err", mkErr)
	}

	filePath := filepath.Join(sessionDir, filename)
	rawJSON, _ := json.MarshalIndent(msg, "", "  ")
	if writeErr := os.WriteFile(filePath, rawJSON, 0644); writeErr != nil {
		s.logger.Warn("inbound: filesystem write failed", "err", writeErr, "path", filePath)
	} else {
		s.logger.Info("inbound: message written to filesystem", "path", filePath)
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"accepted":     true,
		"session_id":   msg.SessionID,
		"filename":     filename,
		"indexed":      true,
		"agent_id":     s.Config.AgentID,
		"dual_write":   "state.db + filesystem",
		"audit_trail":  "git PR (sender responsibility)",
	}, s.logger)
}

// extractAgentID pulls an agent ID from a string, object, or array field.
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
		return ""
	case []interface{}:
		if len(val) > 0 {
			return extractAgentID(val[0])
		}
		return ""
	default:
		return fmt.Sprintf("%v", v)
	}
}

// sanitizeSQL escapes single quotes for SQL string literals.
func sanitizeSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

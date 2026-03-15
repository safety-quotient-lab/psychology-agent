// Package server — inbound.go provides POST /api/messages/inbound
// for receiving transport messages directly via HTTP.
//
// This endpoint serves as the fast-path for message delivery.
// state.db (transport_messages table) holds the source of truth.
// Git PRs provide the audit trail. Dual-write: meshd first, PR second.
package server

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/exosome"
)

// sessionIDRe validates session IDs against path traversal and injection.
// Allows lowercase alphanumeric, hyphens, and underscores. Max 64 chars.
var sessionIDRe = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)

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
		expected := "Bearer " + expectedToken
		// Constant-time comparison prevents timing attacks.
		if subtle.ConstantTimeCompare([]byte(auth), []byte(expected)) != 1 {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Authentication required",
			}, s.logger)
			return
		}
	}

	// Source tracking for audit
	sourceIP := r.RemoteAddr
	s.logger.Info("inbound message received", "source", sourceIP, "method", r.Method)

	var msg inboundMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		s.logger.Debug("inbound: JSON decode failed", "err", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
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

	// Validate session ID format — prevents path traversal via crafted session_id
	if !sessionIDRe.MatchString(msg.SessionID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid session_id: must match [a-zA-Z0-9_-]{1,64}",
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

	// Build filename — sanitize sender to prevent path traversal in filenames
	turn := fmt.Sprintf("%03d", msg.Turn)
	senderSlug := slugifyAgentID(fromAgent)
	if senderSlug == "" {
		senderSlug = "unknown"
	}
	filename := fmt.Sprintf("from-%s-%s.json", senderSlug, turn)

	timestamp := msg.Timestamp
	if timestamp == "" {
		timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	// ── Build exosome ────────────────────────────────────────────

	exoMsg := exosome.Message{
		Protocol:  msg.Protocol,
		Type:      msg.Type,
		From:      fromAgent,
		To:        toAgent,
		SessionID: msg.SessionID,
		Turn:      msg.Turn,
		Timestamp: timestamp,
		Subject:   subject,
		Body:      msg.Body,
	}
	exo := exosome.New(exoMsg, exosome.CellOrigin{
		AgentID: s.Config.AgentID,
		Reason:  "inbound HTTP delivery",
	})
	exo.SetTarget(s.Config.AgentID)

	// ── Write 1: state.db (source of truth) ──────────────────────

	dbPath := s.Config.BudgetDBPath
	if _, dbErr := execSQLite(dbPath, "", exo.InsertSQL()); dbErr != nil {
		s.logger.Warn("inbound: state.db write failed (continuing to filesystem)",
			"err", dbErr, "session", msg.SessionID)
		exo.MarkMeshFailed(dbErr.Error())
	} else {
		s.logger.Info("inbound: message indexed in state.db",
			"session", msg.SessionID, "from", fromAgent, "turn", msg.Turn)
		exo.MarkMeshDelivered(dbPath)
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

	// Broadcast via ZMQ — notify mesh peers about the new message
	if s.ZMQPublish != nil {
		s.ZMQPublish("transport", map[string]interface{}{
			"session_id": msg.SessionID,
			"from":       fromAgent,
			"to":         toAgent,
			"type":       msg.Type,
			"subject":    subject,
			"turn":       msg.Turn,
		})
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"accepted":     true,
		"exosome_id":   exo.ID,
		"session_id":   msg.SessionID,
		"filename":     filename,
		"indexed":      exo.Delivery.MeshD.Accepted,
		"agent_id":     s.Config.AgentID,
		"delivery":     exo.Delivery.State,
		"trajectory":   len(exo.Trajectory),
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

// slugifyAgentID reduces an agent ID to a filesystem-safe slug.
// Strips everything except lowercase alphanumeric and hyphens.
func slugifyAgentID(id string) string {
	return regexp.MustCompile(`[^a-z0-9-]`).ReplaceAllString(strings.ToLower(id), "")
}

// sanitizeSQL escapes single quotes for SQL string literals.
func sanitizeSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

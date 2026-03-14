// Package server — auth.go provides API authentication and rate limiting.
//
// Ports the auth system from the Cloudflare Worker to SQLite-backed
// Go handlers. Supports three tiers: anonymous, api-key, operator.
// Rate limiting uses a sliding window stored in state.db.
package server

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// AuthResult holds the resolved identity and access tier for a request.
type AuthResult struct {
	Identity  string `json:"identity"`
	Tier      string `json:"tier"` // "anonymous", "api-key", "operator"
	RateLimit int    `json:"rate_limit"`
}

// resolveAuth determines the caller's identity and tier from the request.
func (s *Server) resolveAuth(r *http.Request) AuthResult {
	// Check operator secret first
	opSecret := r.Header.Get("X-Operator-Secret")
	if opSecret != "" && s.OperatorSecret != "" && opSecret == s.OperatorSecret {
		return AuthResult{
			Identity:  "operator",
			Tier:      "operator",
			RateLimit: 0, // unlimited
		}
	}

	// Check Bearer token
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		tokenHash := hashToken(token)

		// Look up in state.db
		rows, err := db.QueryJSON(s.Config.BudgetDBPath,
			fmt.Sprintf("SELECT identity, revoked FROM api_keys WHERE token_hash='%s'",
				db.EscapeString(tokenHash)))

		if err == nil && len(rows) > 0 {
			if rows[0]["revoked"] == "0" || rows[0]["revoked"] == "" {
				return AuthResult{
					Identity:  rows[0]["identity"],
					Tier:      "api-key",
					RateLimit: 100, // 100/hour
				}
			}
		}
	}

	// Anonymous — use IP as identity
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	if idx := strings.LastIndex(ip, ":"); idx > 0 {
		ip = ip[:idx]
	}

	return AuthResult{
		Identity:  ip,
		Tier:      "anonymous",
		RateLimit: 10, // 10/hour
	}
}

// checkRateLimit checks and increments the rate limit counter.
// Returns (allowed, remaining).
func (s *Server) checkRateLimit(clientID string, limit int) (bool, int) {
	if limit <= 0 {
		return true, 0 // unlimited
	}

	window := time.Now().UTC().Format("2006-01-02T15")
	safeClient := db.EscapeString(clientID)
	safeWindow := db.EscapeString(window)

	// Read current count
	count := db.QueryScalar(s.Config.BudgetDBPath,
		fmt.Sprintf("SELECT count FROM rate_limits WHERE client_id='%s' AND window='%s'",
			safeClient, safeWindow))

	if count >= limit {
		return false, 0
	}

	// Increment
	sql := fmt.Sprintf(
		"INSERT INTO rate_limits (client_id, window, count) VALUES ('%s', '%s', 1) "+
			"ON CONFLICT(client_id, window) DO UPDATE SET count = count + 1",
		safeClient, safeWindow)
	db.Exec(s.Config.BudgetDBPath, sql)

	return true, limit - count - 1
}

// handleKeyCreate serves POST /api/keys → create a new API key.
func (s *Server) handleKeyCreate(w http.ResponseWriter, r *http.Request) {
	auth := s.resolveAuth(r)
	if auth.Tier != "operator" {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "Key management requires operator access",
		}, s.logger)
		return
	}

	var req struct {
		Identity string `json:"identity"`
		Label    string `json:"label"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid request: " + err.Error(),
		}, s.logger)
		return
	}

	if req.Identity == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "identity field required",
		}, s.logger)
		return
	}

	// Generate token: sq_live_{32 hex}
	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate key",
		}, s.logger)
		return
	}
	token := "sq_live_" + hex.EncodeToString(tokenBytes)
	tokenHash := hashToken(token)

	// Store in state.db
	sql := fmt.Sprintf(
		"INSERT INTO api_keys (token_hash, identity, label) VALUES ('%s', '%s', '%s')",
		db.EscapeString(tokenHash),
		db.EscapeString(req.Identity),
		db.EscapeString(req.Label))

	if _, err := db.Exec(s.Config.BudgetDBPath, sql); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Failed to store key",
		}, s.logger)
		return
	}

	s.logger.Info("API key created", "identity", req.Identity, "label", req.Label)

	writeJSON(w, http.StatusCreated, map[string]string{
		"token":    token,
		"identity": req.Identity,
		"label":    req.Label,
		"message":  "Store this token securely — it cannot be retrieved later",
	}, s.logger)
}

// handleKeyRevoke serves DELETE /api/keys/{identity} → revoke an API key.
func (s *Server) handleKeyRevoke(w http.ResponseWriter, r *http.Request) {
	auth := s.resolveAuth(r)
	if auth.Tier != "operator" {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "Key management requires operator access",
		}, s.logger)
		return
	}

	// Extract identity from path: /api/keys/{identity}
	identity := strings.TrimPrefix(r.URL.Path, "/api/keys/")
	if identity == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "identity required in path",
		}, s.logger)
		return
	}

	sql := fmt.Sprintf(
		"UPDATE api_keys SET revoked=1, revoked_at=datetime('now') "+
			"WHERE identity='%s' AND revoked=0",
		db.EscapeString(identity))

	if _, err := db.Exec(s.Config.BudgetDBPath, sql); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Failed to revoke key",
		}, s.logger)
		return
	}

	s.logger.Info("API key revoked", "identity", identity)

	writeJSON(w, http.StatusOK, map[string]string{
		"status":   "revoked",
		"identity": identity,
	}, s.logger)
}

// handleWhoAmI serves GET /api/whoami → caller identity info.
func (s *Server) handleWhoAmI(w http.ResponseWriter, r *http.Request) {
	auth := s.resolveAuth(r)
	writeJSON(w, http.StatusOK, auth, s.logger)
}

// hashToken returns the hex-encoded SHA-256 hash of a token.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

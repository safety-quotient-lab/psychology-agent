// Package server — discovery.go handles agent discovery endpoints.
//
// Ports the .well-known/agents listing and WebFinger (RFC 7033)
// from the Cloudflare Worker to native Go handlers.
package server

import (
	"fmt"
	"net/http"
	"strings"
)

// handleAgents serves GET /.well-known/agents → dynamic agent listing.
func (s *Server) handleAgents(w http.ResponseWriter, r *http.Request) {
	agents := s.Registry.Agents()

	type agentEntry struct {
		ID        string `json:"id"`
		Role      string `json:"role"`
		CardURL   string `json:"card_url"`
		Version   string `json:"version"`
		Skills    int    `json:"skills"`
		Available bool   `json:"available"`
		WebFinger string `json:"webfinger"`
	}

	entries := make([]agentEntry, 0, len(agents))
	for _, a := range agents {
		entries = append(entries, agentEntry{
			ID:        a.ID,
			Role:      a.Role,
			CardURL:   a.CardURL,
			Version:   a.Version,
			Skills:    a.Skills,
			Available: !a.Unavailable,
			WebFinger: fmt.Sprintf("acct:%s@safety-quotient.dev", a.ID),
		})
	}

	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, entries, s.logger)
}

// handleWebFinger serves GET /.well-known/webfinger → RFC 7033 identity resolution.
func (s *Server) handleWebFinger(w http.ResponseWriter, r *http.Request) {
	resource := r.URL.Query().Get("resource")
	if resource == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Missing resource parameter",
		}, s.logger)
		return
	}

	// Parse acct:agent-name@safety-quotient.dev
	if !strings.HasPrefix(resource, "acct:") || !strings.Contains(resource, "@") {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid resource format. Expected acct:name@domain",
		}, s.logger)
		return
	}

	parts := strings.SplitN(strings.TrimPrefix(resource, "acct:"), "@", 2)
	agentName := parts[0]

	// Find agent in registry
	agents := s.Registry.Agents()
	var found *AgentInfo
	for i := range agents {
		if agents[i].ID == agentName || agents[i].Name == agentName {
			found = &agents[i]
			break
		}
	}

	if found == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{
			"error":    "Agent not found",
			"resource": resource,
		}, s.logger)
		return
	}

	links := []map[string]string{
		{
			"rel":  "https://a2aproject.org/rel/agent-card",
			"href": found.CardURL,
			"type": "application/json",
		},
	}
	if found.StatusURL != "" {
		links = append(links, map[string]string{
			"rel":  "https://safety-quotient.dev/rel/status",
			"href": found.StatusURL,
			"type": "application/json",
		})
	}

	jrd := map[string]any{
		"subject": resource,
		"aliases": []string{},
		"properties": map[string]string{
			"https://safety-quotient.dev/ns/role": found.Role,
		},
		"links": links,
	}

	if found.Repo != "" {
		jrd["aliases"] = []string{fmt.Sprintf("https://github.com/%s", found.Repo)}
	}

	w.Header().Set("Content-Type", "application/jrd+json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	writeJSON(w, http.StatusOK, jrd, s.logger)
}

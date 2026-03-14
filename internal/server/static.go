// Package server — static.go embeds and serves static assets.
//
// Uses Go 1.16+ embed to bundle HTML, JSON, CSS, and JS files directly
// into the meshd binary. Serves two dashboards:
//   - operations-agent: full compositor (index.html)
//   - all other agents: manifest-driven standalone LCARS dashboard
package server

import (
	"bytes"
	"embed"
	"encoding/json"
	"html/template"
	"net/http"
	"os"
)

//go:embed static/*
var staticFS embed.FS

// agentDashboardTmpl parses the per-agent LCARS template once at init.
var agentDashboardTmpl *template.Template

func init() {
	data, err := staticFS.ReadFile("static/agent-dashboard.html")
	if err != nil {
		// Template not available — standalone dashboard disabled
		return
	}
	agentDashboardTmpl, _ = template.New("agent-dashboard").Parse(string(data))
}

// handleIndex serves GET / — routes to compositor or standalone dashboard
// based on agent identity.
func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if s.Config.AgentID == "operations-agent" {
		// Full compositor dashboard
		s.serveCompositor(w, r)
		return
	}
	// Per-agent standalone dashboard (manifest-driven)
	s.serveAgentDashboard(w, r)
}

// serveCompositor serves the full interagent compositor (index.html).
func (s *Server) serveCompositor(w http.ResponseWriter, r *http.Request) {
	data, err := staticFS.ReadFile("static/index.html")
	if err != nil {
		http.Error(w, "dashboard not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Write(data)
}

// serveAgentDashboard renders the per-agent LCARS template with manifest data.
func (s *Server) serveAgentDashboard(w http.ResponseWriter, r *http.Request) {
	if agentDashboardTmpl == nil {
		// Fallback: serve compositor if template unavailable
		s.serveCompositor(w, r)
		return
	}

	manifest := s.buildManifest()

	// Build agent list for topology
	agents := s.Registry.Agents()
	type topoAgent struct {
		ID string `json:"id"`
	}
	agentList := make([]topoAgent, 0, len(agents))
	for _, a := range agents {
		agentList = append(agentList, topoAgent{ID: a.ID})
	}
	agentsJSON, _ := json.Marshal(agentList)

	// Derive compositor URL
	compositorURL := "https://interagent.safety-quotient.dev"

	// Agent display name from config, then local agent card, then embedded card
	agentName := s.Config.AgentID
	agentRole := "mesh agent"

	// Try local agent card first (correct for non-operations agents)
	var cardData []byte
	localCard := s.Config.RepoRoot + "/.well-known/agent-card.json"
	cardData, _ = os.ReadFile(localCard)
	if len(cardData) == 0 {
		// Fall back to embedded card
		cardData, _ = staticFS.ReadFile("static/agent-card.json")
	}
	if len(cardData) > 0 {
		var card map[string]any
		if json.Unmarshal(cardData, &card) == nil {
			if name, ok := card["name"].(string); ok {
				agentName = name
			}
			if desc, ok := card["description"].(string); ok && len(desc) < 120 {
				agentRole = desc
			} else if role, ok := card["role"].(string); ok {
				agentRole = role
			}
		}
	}

	data := map[string]any{
		"AgentID":       s.Config.AgentID,
		"AgentName":     agentName,
		"AgentRole":     agentRole,
		"AgentColor":    manifest.AccentColor,
		"Version":       Version,
		"CompositorURL": compositorURL,
		"AgentsJSON":    template.JS(agentsJSON),
	}

	var buf bytes.Buffer
	if err := agentDashboardTmpl.Execute(&buf, data); err != nil {
		s.logger.Error("agent dashboard template failed", "err", err)
		s.serveCompositor(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Write(buf.Bytes())
}

// handleVocab serves GET /vocab or /vocab.json → shared JSON-LD vocabulary.
func (s *Server) handleVocab(w http.ResponseWriter, r *http.Request) {
	data, err := staticFS.ReadFile("static/vocab.json")
	if err != nil {
		http.Error(w, "vocabulary not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/ld+json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write(data)
}

// handleVocabSchema serves GET /vocab/schema or /vocab/schema.json.
func (s *Server) handleVocabSchema(w http.ResponseWriter, r *http.Request) {
	data, err := staticFS.ReadFile("static/vocab.schema.json")
	if err != nil {
		http.Error(w, "schema not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/schema+json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(data)
}

// handleAgentCardStatic serves GET /.well-known/agent-card.json.
// When deployed to a non-operations agent, serves that agent's local card
// if available at {project-root}/.well-known/agent-card.json, otherwise
// falls back to the embedded operations-agent card.
func (s *Server) handleAgentCardStatic(w http.ResponseWriter, r *http.Request) {
	// Try local agent card first (for non-operations agents)
	if s.Config.AgentID != "operations-agent" {
		localCard := s.Config.RepoRoot + "/.well-known/agent-card.json"
		if data, err := readFileBytes(localCard); err == nil {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Header().Set("Cache-Control", "public, max-age=3600")
			w.Write(data)
			return
		}
	}

	data, err := staticFS.ReadFile("static/agent-card.json")
	if err != nil {
		http.Error(w, "agent card not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write(data)
}

// readFileBytes reads a file from the local filesystem.
func readFileBytes(path string) ([]byte, error) {
	return os.ReadFile(path)
}

// Package server — manifest.go defines the dashboard manifest system.
//
// Each agent declares its dashboard widgets, data endpoints, and display
// preferences via GET /dashboard/manifest. The compositor discovers these
// manifests during registry refresh and uses them to render agent-specific
// sections without executing agent-provided code.
//
// Trust model: agents provide structured JSON declarations only.
// The compositor controls all HTML/JS rendering.
package server

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// DashboardManifest declares an agent's dashboard preferences.
// Served at GET /dashboard/manifest.
type DashboardManifest struct {
	AgentID     string           `json:"agent_id"`
	Version     string           `json:"version"`
	AccentColor string           `json:"accent_color"`
	Widgets     []WidgetDecl     `json:"widgets"`
	Tabs        []TabDecl        `json:"tabs,omitempty"`
	Links       []LinkDecl       `json:"links,omitempty"`
	Capabilities []string        `json:"capabilities,omitempty"`
}

// WidgetDecl describes a single dashboard widget an agent wants displayed.
type WidgetDecl struct {
	Type        string `json:"type"`                  // vitals, messages, deliberations, budget, topology, tempo, cognitive-tempo, custom
	ID          string `json:"id"`                    // unique widget ID
	Title       string `json:"title"`                 // human-readable title
	Priority    int    `json:"priority"`              // lower = higher on page
	Endpoint    string `json:"endpoint,omitempty"`    // data source (relative URL)
	DataKey     string `json:"data_key,omitempty"`    // JSON key to extract from endpoint response
	Size        string `json:"size,omitempty"`        // "full", "half", "third" (grid layout hint)
	RefreshSec  int    `json:"refresh_sec,omitempty"` // per-widget refresh interval (0 = use default)
}

// TabDecl describes a tab the agent contributes to the compositor.
type TabDecl struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Icon     string `json:"icon,omitempty"`
	Endpoint string `json:"endpoint"`        // compositor fetches this for tab content data
	Priority int    `json:"priority"`
}

// LinkDecl provides navigation links for the agent's section.
type LinkDecl struct {
	Label string `json:"label"`
	URL   string `json:"url"`
	Rel   string `json:"rel,omitempty"` // "status", "card", "repo", "docs"
}

// handleManifest serves GET /dashboard/manifest — agent's widget declarations.
func (s *Server) handleManifest(w http.ResponseWriter, r *http.Request) {
	manifest := s.buildManifest()
	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, manifest, s.logger)
}

// buildManifest constructs the dashboard manifest from cogarch + state.
func (s *Server) buildManifest() DashboardManifest {
	m := DashboardManifest{
		AgentID:     s.Config.AgentID,
		Version:     Version,
		AccentColor: agentColor(s.Config.AgentID),
		Capabilities: []string{},
	}

	// Load capabilities from cogarch.config.json
	cogarchPath := filepath.Join(s.Config.RepoRoot, "cogarch.config.json")
	if data, err := os.ReadFile(cogarchPath); err == nil {
		var cogarch struct {
			Identity struct {
				Role         string   `json:"role"`
				Capabilities []string `json:"capabilities"`
			} `json:"identity"`
		}
		if json.Unmarshal(data, &cogarch) == nil {
			m.Capabilities = cogarch.Identity.Capabilities
		}
	}

	// Standard widgets every agent provides
	m.Widgets = []WidgetDecl{
		{Type: "topology", ID: "mesh-topology", Title: "Mesh Topology", Priority: 1, Size: "full"},
		{Type: "vitals", ID: "agent-vitals", Title: "Agent Vitals", Priority: 2, Endpoint: "/api/status", Size: "full"},
		{Type: "budget", ID: "autonomy-budget", Title: "Autonomy Budget", Priority: 3, Endpoint: "/api/status", DataKey: "autonomy_budget", Size: "third"},
		{Type: "messages", ID: "recent-messages", Title: "Recent Messages", Priority: 4, Endpoint: "/api/status", DataKey: "recent_messages", Size: "full", RefreshSec: 15},
		{Type: "deliberations", ID: "recent-deliberations", Title: "Recent Deliberations", Priority: 5, Endpoint: "/api/status", DataKey: "recent_deliberations", Size: "half"},
		{Type: "events", ID: "event-log", Title: "Event Log", Priority: 6, Endpoint: "/api/events", Size: "half", RefreshSec: 10},
		{Type: "cognitive-tempo", ID: "cognitive-tempo", Title: "Cognitive Tempo", Priority: 7, Endpoint: "/api/cognitive-tempo", Size: "third", RefreshSec: 30},
		{Type: "tempo", ID: "mesh-tempo", Title: "Mesh Dynamics", Priority: 8, Endpoint: "/api/tempo", Size: "half", RefreshSec: 30},
	}

	// Agent-specific widgets based on capabilities
	for _, cap := range m.Capabilities {
		switch cap {
		case "vocabulary-governance":
			m.Widgets = append(m.Widgets, WidgetDecl{
				Type: "custom", ID: "vocab-viewer", Title: "Vocabulary",
				Priority: 7, Endpoint: "/vocab", Size: "full",
			})
		case "compositor-management":
			m.Widgets = append(m.Widgets, WidgetDecl{
				Type: "custom", ID: "compositor-health", Title: "Compositor Health",
				Priority: 7, Endpoint: "/api/pulse", Size: "full",
			})
		case "health-monitoring":
			m.Widgets = append(m.Widgets, WidgetDecl{
				Type: "custom", ID: "trust-matrix", Title: "Trust Matrix",
				Priority: 8, Endpoint: "/api/trust", Size: "full",
			})
		}
	}

	// Standard tabs
	m.Tabs = []TabDecl{
		{ID: "status", Label: "Status", Endpoint: "/api/status", Priority: 1},
		{ID: "kb", Label: "Knowledge", Endpoint: "/api/kb", Priority: 2},
	}

	// Check for search capability
	searchCount := db.QueryScalar(s.Config.BudgetDBPath,
		"SELECT count(*) FROM sqlite_master WHERE type='table' AND name='fts_messages'")
	if searchCount > 0 {
		m.Tabs = append(m.Tabs, TabDecl{
			ID: "search", Label: "Search", Endpoint: "/api/search", Priority: 3,
		})
	}

	// Standard links
	m.Links = []LinkDecl{
		{Label: "Status API", URL: "/api/status", Rel: "status"},
		{Label: "Agent Card", URL: "/.well-known/agent-card.json", Rel: "card"},
		{Label: "Knowledge Base", URL: "/api/kb", Rel: "docs"},
	}

	return m
}

// agentColor returns the LCARS accent color for a given agent ID.
func agentColor(agentID string) string {
	colors := map[string]string{
		"psychology-agent":       "#6b8aaf",
		"safety-quotient-agent":  "#5da8a0",
		"psq-agent":             "#5da8a0",
		"unratified-agent":      "#c4956a",
		"observatory-agent":     "#9b8ec4",
		"operations-agent":      "#7a9b6b",
	}
	if c, ok := colors[agentID]; ok {
		return c
	}
	return "#6b7280"
}

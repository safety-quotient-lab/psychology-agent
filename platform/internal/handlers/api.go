package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// allowedOrigins defines CORS allowlisted origins.
var allowedOrigins = map[string]bool{
	"https://interagent.safety-quotient.dev":       true,
	"https://psychology-agent.safety-quotient.dev": true,
	"https://psq-agent.safety-quotient.dev":        true,
	"https://api.safety-quotient.dev":              true,
	"http://localhost:8077":                         true,
	"http://localhost:8078":                         true,
	"http://localhost:9000":                         true,
}

func corsOrigin(origin string) string {
	if allowedOrigins[origin] {
		return origin
	}
	return ""
}

func setCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if cors := corsOrigin(origin); cors != "" {
		w.Header().Set("Access-Control-Allow-Origin", cors)
	}
}

// APIStatus serves GET /api/status — backward-compatible JSON.
func APIStatus(d *db.DB, projectRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		status := collector.Collect(d, projectRoot)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(status)
	}
}

// AgentCard serves /.well-known/agent-card.json.
func AgentCard(projectRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		cardPath := filepath.Join(projectRoot, ".well-known", "agent-card.json")
		data, err := os.ReadFile(cardPath)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.Write(data)
	}
}

// HealthCheck serves HEAD / and GET /health.
func HealthCheck() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	}
}

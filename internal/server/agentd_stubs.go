// Stub agentd API endpoints — mock data until Phase 4 delivers real photonic endpoints.
// Each returns plausible JSON matching the LCARS change manifest spec.

package server

import (
	"math"
	"math/rand"
	"net/http"
	"time"
)

func init() { rand.Seed(time.Now().UnixNano()) }

func mockFloat(min, max float64) float64 {
	return math.Round((min+rand.Float64()*(max-min))*100) / 100
}

// handlePhotonic serves GET /api/photonic — photonic token state.
func (s *Server) handlePhotonic(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"coherence": mockFloat(0.7, 0.99),
		"maturity":  mockFloat(0.3, 0.8),
		"state":     "resonant",
		"waveguide": "nominal",
		"spectral_profile": map[string]float64{
			"DA":  mockFloat(0.1, 0.6),
			"NE":  mockFloat(0.1, 0.5),
			"5HT": mockFloat(0.2, 0.8),
		},
		"agent_id":   s.Config.AgentID,
		"computed_at": time.Now().UTC().Format(time.RFC3339),
	}, s.logger)
}

// handleGm serves GET /api/gm — glial maintenance operations.
func (s *Server) handleGm(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"reconcile": map[string]any{"rate": "standard", "last_run": time.Now().Add(-15 * time.Minute).UTC().Format(time.RFC3339)},
		"audit":     map[string]any{"rate": "high", "last_run": time.Now().Add(-30 * time.Minute).UTC().Format(time.RFC3339)},
		"drainage":  map[string]any{"rate": "standard", "count": rand.Intn(50)},
		"prune":     map[string]any{"rate": "moderate", "last_run": time.Now().Add(-2 * time.Hour).UTC().Format(time.RFC3339)},
		"optimize":  map[string]any{"rate": "low", "last_run": time.Now().Add(-6 * time.Hour).UTC().Format(time.RFC3339)},
		"drift":     mockFloat(0.0, 0.1),
		"agent_id":  s.Config.AgentID,
	}, s.logger)
}

// handleMicrobiome serves GET /api/microbiome — symbiont health.
func (s *Server) handleMicrobiome(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"symbionts": map[string]any{
			"claude_api": map[string]any{"status": "healthy", "latency_ms": rand.Intn(200) + 50},
			"github":     map[string]any{"status": "healthy", "latency_ms": rand.Intn(300) + 100},
			"sqlite":     map[string]any{"status": "healthy", "latency_ms": rand.Intn(5) + 1},
			"runtime":    map[string]any{"status": "healthy", "uptime_s": int(time.Since(s.startTime).Seconds())},
		},
		"holobiont_coherence": mockFloat(0.8, 0.99),
		"dysbiosis_alerts":    []string{},
		"agent_id":            s.Config.AgentID,
	}, s.logger)
}

// handleConnectome serves GET /api/connectome — peer weights + spectral diversity.
func (s *Server) handleConnectome(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"spectral_diversity_index": mockFloat(0.2, 0.5),
		"mesh_coupling":           "complementary",
		"peer_weights": map[string]float64{
			"psychology-agent":  mockFloat(0.6, 0.9),
			"psq-agent":        mockFloat(0.4, 0.7),
			"observatory-agent": mockFloat(0.3, 0.6),
			"unratified-agent":  mockFloat(0.3, 0.5),
		},
		"agent_id": s.Config.AgentID,
	}, s.logger)
}

// handleTraits serves GET /api/traits — mode trait accumulation.
func (s *Server) handleTraits(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"mode_traits": map[string]any{
			"task-directed(eval)": map[string]any{
				"usage": rand.Intn(900) + 100, "stage": "associative",
				"prompt_hit_rate": mockFloat(0.6, 0.85), "transition_ms": rand.Intn(3000) + 1000,
			},
			"task-directed(creative)": map[string]any{
				"usage": rand.Intn(300) + 50, "stage": "cognitive",
				"prompt_hit_rate": mockFloat(0.5, 0.75), "transition_ms": rand.Intn(4000) + 1500,
			},
			"free-associating": map[string]any{
				"usage": rand.Intn(100) + 10, "stage": "cognitive",
				"prompt_hit_rate": mockFloat(0.4, 0.7), "transition_ms": rand.Intn(5000) + 2000,
			},
		},
		"agent_id": s.Config.AgentID,
	}, s.logger)
}

// handleVagal serves GET /api/vagal — breathing rate + cascade state.
func (s *Server) handleVagal(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"breathing_rate": mockFloat(0.3, 0.7),
		"cascade": []map[string]any{
			{"name": "oscillator", "value": mockFloat(0.3, 0.7), "mode": "coupled"},
			{"name": "Gf_freq", "value": mockFloat(0.3, 0.7), "mode": "coupled"},
			{"name": "gain_depth", "value": mockFloat(0.2, 0.6), "mode": "coupled"},
			{"name": "model_tier", "value": mockFloat(0.2, 0.6), "mode": "derived"},
			{"name": "proc_depth", "value": mockFloat(0.2, 0.6), "mode": "derived"},
			{"name": "advisory", "value": mockFloat(0.2, 0.6), "mode": "derived"},
			{"name": "coupling", "value": mockFloat(0.2, 0.6), "mode": "derived"},
		},
		"group_meditation": false,
		"overrides":        []string{},
		"agent_id":         s.Config.AgentID,
	}, s.logger)
}

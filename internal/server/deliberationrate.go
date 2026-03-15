// Package server — spawnrate.go serves spawn consumption metrics.
//
// Provides visibility into claude -p spawn rates, costs, durations,
// and failure rates across the mesh. Essential for budget monitoring
// and capacity planning.
package server

import (
	"fmt"
	"net/http"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// handleSpawnRate serves GET /api/spawn-rate — spawn consumption metrics.
func (s *Server) handleSpawnRate(w http.ResponseWriter, r *http.Request) {
	dbPath := s.Config.BudgetDBPath

	// Last hour
	lastHour := spawnWindow(dbPath, "-1 hour")
	// Last 24 hours
	last24h := spawnWindow(dbPath, "-24 hours")
	// All time
	allTime := spawnWindow(dbPath, "-100 years")

	// Recent spawns with details
	recent, _ := db.QueryJSON(dbPath,
		"SELECT agent_id, event_id, status, duration_ms, cost, started_at "+
			"FROM spawn_log ORDER BY started_at DESC LIMIT 20")

	// Hourly breakdown (last 12 hours)
	hourly, _ := db.QueryJSON(dbPath,
		"SELECT strftime('%Y-%m-%dT%H:00', started_at) as hour, "+
			"count(*) as spawns, "+
			"sum(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, "+
			"sum(CASE WHEN status IN ('failed','error') THEN 1 ELSE 0 END) as failed, "+
			"coalesce(sum(cost),0) as total_cost, "+
			"coalesce(round(avg(duration_ms)/1000,1),0) as avg_duration_sec "+
			"FROM spawn_log "+
			"WHERE started_at > datetime('now', '-12 hours') "+
			"GROUP BY hour ORDER BY hour DESC")

	resp := map[string]any{
		"agent_id":   s.Config.AgentID,
		"last_hour":  lastHour,
		"last_24h":   last24h,
		"all_time":   allTime,
		"hourly":     hourly,
		"recent":     recent,
	}

	writeJSON(w, http.StatusOK, resp, s.logger)
}

// validWindows restricts SQL datetime offsets to known-safe values.
var validWindows = map[string]bool{
	"-1 hour":    true,
	"-24 hours":  true,
	"-7 days":    true,
	"-30 days":   true,
	"-100 years": true,
}

func spawnWindow(dbPath, window string) map[string]any {
	if !validWindows[window] {
		return map[string]any{"error": "invalid window", "total": 0}
	}
	total := db.QueryScalar(dbPath,
		fmt.Sprintf("SELECT count(*) FROM spawn_log WHERE started_at > datetime('now', '%s')", window))
	completed := db.QueryScalar(dbPath,
		fmt.Sprintf("SELECT count(*) FROM spawn_log WHERE status='completed' AND started_at > datetime('now', '%s')", window))
	failed := db.QueryScalar(dbPath,
		fmt.Sprintf("SELECT count(*) FROM spawn_log WHERE status IN ('failed','error') AND started_at > datetime('now', '%s')", window))

	costRows, _ := db.QueryJSON(dbPath,
		fmt.Sprintf("SELECT coalesce(sum(cost),0) as total_cost, coalesce(round(avg(duration_ms)/1000,1),0) as avg_sec FROM spawn_log WHERE started_at > datetime('now', '%s')", window))

	cost := "0"
	avgSec := "0"
	if len(costRows) > 0 {
		cost = costRows[0]["total_cost"]
		avgSec = costRows[0]["avg_sec"]
	}

	return map[string]any{
		"total":        total,
		"completed":    completed,
		"failed":       failed,
		"total_cost":   cost,
		"avg_duration": avgSec,
		"success_rate": fmt.Sprintf("%.0f%%", safePercent(completed, total)),
	}
}

func safePercent(part, whole int) float64 {
	if whole == 0 {
		return 0
	}
	return float64(part) / float64(whole) * 100
}

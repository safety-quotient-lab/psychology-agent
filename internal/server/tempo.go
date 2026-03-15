// Package server — tempo.go models mesh spawn dynamics via differential calculus.
//
// The mesh operates as a queuing system with:
//   - Arrival rate λ_i(t): new work items per agent per hour
//   - Service rate μ_i(t): spawns completed per agent per hour
//   - Backlog B_i(t): unprocessed items, dB/dt = λ - μ
//   - Utilization ρ(t): fraction of concurrency slots in use
//   - Throughput Θ(t): total spawns/hour across mesh
//
// The concurrency limit C acts as a capacity ceiling:
//   Θ(t) ≤ C × 3600/d̄  where d̄ = mean spawn duration
//
// When ρ → 1, queuing delays grow (Little's Law: L = λW).
// The dashboard visualizes these dynamics in real-time.
package server

import (
	"fmt"
	"net/http"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// handleTempo serves GET /api/tempo — mesh spawn dynamics model.
func (s *Server) handleTempo(w http.ResponseWriter, r *http.Request) {
	dbPath := s.Config.BudgetDBPath

	// ── Per-agent metrics (3 time windows for derivative estimation) ──
	agents := []string{"psychology-agent", "psq-agent", "unratified-agent", "observatory-agent", "operations-agent"}
	agentMetrics := make([]map[string]any, 0, len(agents))

	for _, agent := range agents {
		// Spawn counts in 3 windows for rate estimation
		n5 := queryScalarFloat(dbPath, fmt.Sprintf(
			"SELECT count(*) FROM spawn_log WHERE started_at > datetime('now', '-5 minutes')"))
		n15 := queryScalarFloat(dbPath, fmt.Sprintf(
			"SELECT count(*) FROM spawn_log WHERE started_at > datetime('now', '-15 minutes')"))
		n60 := queryScalarFloat(dbPath, fmt.Sprintf(
			"SELECT count(*) FROM spawn_log WHERE started_at > datetime('now', '-60 minutes')"))

		// Service rate μ (spawns/hour) — from 15-min window, extrapolated
		mu := n15 * 4.0 // 15 min → hour

		// Rate of change dμ/dt (spawns/hour²) — finite difference
		// Compare 5-min rate vs 15-min rate
		rate5 := n5 * 12.0  // 5 min → hour
		rate15 := n15 * 4.0 // 15 min → hour
		dMuDt := (rate5 - rate15) / (10.0 / 60.0) // change per hour

		// Mean duration (seconds)
		rows, _ := db.QueryJSON(dbPath,
			"SELECT coalesce(avg(duration_ms)/1000.0, 0) as avg_sec FROM spawn_log WHERE status='completed' AND started_at > datetime('now', '-60 minutes')")
		avgDur := 0.0
		if len(rows) > 0 {
			fmt.Sscanf(rows[0]["avg_sec"], "%f", &avgDur)
		}

		// Backlog (unprocessed messages)
		backlog := db.QueryScalar(dbPath,
			"SELECT count(*) FROM transport_messages WHERE processed=0")

		// Arrival rate λ (estimated from backlog + processed in last hour)
		processed60 := queryScalarFloat(dbPath,
			"SELECT count(*) FROM transport_messages WHERE processed=1 AND timestamp > datetime('now', '-60 minutes')")
		lambda := processed60 + float64(backlog)/1.0 // current arrival pressure

		// dB/dt = λ - μ (backlog change rate)
		dBdt := lambda - mu

		// Cost rate (budget units per hour)
		costRows, _ := db.QueryJSON(dbPath,
			"SELECT coalesce(sum(cost), 0) as total FROM spawn_log WHERE started_at > datetime('now', '-60 minutes')")
		costPerHour := 0.0
		if len(costRows) > 0 {
			fmt.Sscanf(costRows[0]["total"], "%f", &costPerHour)
		}

		agentMetrics = append(agentMetrics, map[string]any{
			"agent_id":          agent,
			"service_rate":      round2(mu),           // μ: spawns/hour
			"service_rate_delta": round2(dMuDt),       // dμ/dt: acceleration
			"arrival_rate":      round2(lambda),       // λ: items/hour
			"backlog":           backlog,               // B(t)
			"backlog_delta":     round2(dBdt),         // dB/dt: growing or shrinking
			"mean_duration_sec": round2(avgDur),       // d̄: avg spawn time
			"cost_per_hour":     round2(costPerHour),  // $/hour
			"spawns_5min":       int(n5),
			"spawns_15min":      int(n15),
			"spawns_60min":      int(n60),
		})
	}

	// ── Mesh-level aggregates ──
	totalMu := 0.0
	totalLambda := 0.0
	totalBacklog := 0
	totalCost := 0.0
	for _, m := range agentMetrics {
		totalMu += m["service_rate"].(float64)
		totalLambda += m["arrival_rate"].(float64)
		totalBacklog += m["backlog"].(int)
		totalCost += m["cost_per_hour"].(float64)
	}

	// Concurrency utilization ρ = active_slots / max_slots
	concurrencyMax := s.Config.MaxConcurrent
	if concurrencyMax == 0 {
		concurrencyMax = 3
	}

	// Theoretical max throughput: C × 3600/d̄
	meshAvgDur := 0.0
	durCount := 0
	for _, m := range agentMetrics {
		d := m["mean_duration_sec"].(float64)
		if d > 0 {
			meshAvgDur += d
			durCount++
		}
	}
	if durCount > 0 {
		meshAvgDur /= float64(durCount)
	}
	theoreticalMax := 0.0
	if meshAvgDur > 0 {
		theoreticalMax = float64(concurrencyMax) * 3600.0 / meshAvgDur
	}

	// ρ = actual throughput / theoretical max
	rho := 0.0
	if theoreticalMax > 0 {
		rho = totalMu / theoreticalMax
	}

	// Little's Law: L = λW → avg queue length = arrival_rate × avg_wait
	avgWait := 0.0
	if totalMu > 0 {
		avgWait = float64(totalBacklog) / totalMu // hours
	}

	// Stability: system stable when λ < μ (arrival < service)
	stable := totalLambda <= totalMu || totalBacklog == 0
	trend := "steady"
	if totalLambda > totalMu*1.2 {
		trend = "backlog growing"
	} else if totalMu > totalLambda*1.5 && totalBacklog > 0 {
		trend = "backlog draining"
	}

	// Time to clear backlog: B / (μ - λ)
	clearTimeHours := -1.0 // -1 means "not draining"
	if totalMu > totalLambda && totalBacklog > 0 {
		clearTimeHours = float64(totalBacklog) / (totalMu - totalLambda)
	} else if totalBacklog == 0 {
		clearTimeHours = 0
	}

	resp := map[string]any{
		"mesh": map[string]any{
			"throughput":        round2(totalMu),          // Θ(t): spawns/hour
			"theoretical_max":   round2(theoreticalMax),   // C × 3600/d̄
			"utilization":       round2(rho),              // ρ: 0-1
			"arrival_rate":      round2(totalLambda),      // Σλ
			"total_backlog":     totalBacklog,             // ΣB
			"trend":             trend,
			"stable":            stable,
			"avg_wait_hours":    round2(avgWait),
			"clear_time_hours":  round2(clearTimeHours),
			"cost_per_hour":     round2(totalCost),
			"concurrency_limit": concurrencyMax,
			"mean_duration_sec": round2(meshAvgDur),
		},
		"agents": agentMetrics,
		"model": map[string]string{
			"framework":  "M/G/c queue (Erlang-C variant)",
			"service":    "μ_i = spawns/hour per agent (15-min extrapolation)",
			"arrival":    "λ_i = processed/hour + backlog pressure",
			"derivative": "dμ/dt from 5-min vs 15-min finite difference",
			"backlog":    "dB/dt = λ - μ (positive = growing)",
			"stability":  "λ < μ → stable (backlog drains)",
			"littles_law": "L = λW (avg queue = arrival × wait)",
			"utilization": "ρ = Θ / (C × 3600/d̄)",
		},
	}

	writeJSON(w, http.StatusOK, resp, s.logger)
}

func queryScalarFloat(dbPath, query string) float64 {
	return float64(db.QueryScalar(dbPath, query))
}

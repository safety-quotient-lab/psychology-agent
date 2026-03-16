// Package server — flow.go provides mesh flow visualization data.
//
// Serves GET /api/flow — real-time mesh topology with flow rates,
// slot occupancy, agent vitals, and transport statistics.
// The dashboard renders this as the "main viewscreen" — the primary
// status-at-a-glance for the bridge captain.
package server

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// handleFlow serves GET /api/flow — mesh flow visualization data.
func (s *Server) handleFlow(w http.ResponseWriter, r *http.Request) {
	dbPath := s.Config.BudgetDBPath

	// Per-agent flow data
	type agentFlow struct {
		ID          string  `json:"id"`
		Color       string  `json:"color"`
		Mood        string  `json:"mood"`
		Load        float64 `json:"load"`
		SpawnsHr    int     `json:"spawns_hr"`
		Spawns10m   int     `json:"spawns_10m"`
		AvgDurSec   float64 `json:"avg_duration_sec"`
		CostHr      int     `json:"cost_hr"`
		TotalMsgs   int     `json:"total_messages"`
		Unprocessed int     `json:"unprocessed"`
		FlowLevel   string  `json:"flow_level"` // idle, low, medium, high, max
	}

	agents := s.Registry.Agents()
	flows := make([]agentFlow, 0, len(agents))

	for _, agent := range agents {
		af := agentFlow{
			ID:    agent.ID,
			Color: agentColor(agent.ID),
		}

		// Psychometrics
		if status, err := s.Registry.FetchAgentStatus(agent); err == nil {
			// Mood from psychometrics endpoint would require separate fetch
			// Use health as proxy
			af.Mood = strFromMap(status, "health", "unknown")
		}

		// For local agent, query state.db directly
		if agent.ID == s.Config.AgentID {
			af.SpawnsHr = db.QueryScalar(dbPath,
				"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-1 hour')")
			af.Spawns10m = db.QueryScalar(dbPath,
				"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-10 minutes')")
			af.TotalMsgs = db.QueryScalar(dbPath,
				"SELECT count(*) FROM transport_messages")
			af.Unprocessed = db.QueryScalar(dbPath,
				"SELECT count(*) FROM transport_messages WHERE processed=0")

			rows, _ := db.QueryJSON(dbPath,
				"SELECT coalesce(round(avg(duration_ms)/1000.0,1),0) as dur, coalesce(sum(cost),0) as cost "+
					"FROM deliberation_log WHERE started_at > datetime('now', '-1 hour')")
			if len(rows) > 0 {
				fmt.Sscanf(rows[0]["dur"], "%f", &af.AvgDurSec)
				fmt.Sscanf(rows[0]["cost"], "%d", &af.CostHr)
			}
		}

		// Flow level classification
		switch {
		case af.Spawns10m > 5:
			af.FlowLevel = "max"
		case af.Spawns10m > 2:
			af.FlowLevel = "high"
		case af.Spawns10m > 0:
			af.FlowLevel = "medium"
		case af.SpawnsHr > 0:
			af.FlowLevel = "low"
		default:
			af.FlowLevel = "idle"
		}

		flows = append(flows, af)
	}

	// Slot occupancy
	type slotInfo struct {
		Index  int    `json:"index"`
		Held   bool   `json:"held"`
		Holder string `json:"holder,omitempty"`
	}

	maxSlots := s.Config.MaxConcurrent
	if maxSlots == 0 {
		maxSlots = 5
	}
	slots := make([]slotInfo, maxSlots)
	slotsUsed := 0
	for i := 0; i < maxSlots; i++ {
		slots[i] = slotInfo{Index: i}
		slotPath := fmt.Sprintf("/tmp/mesh-spawn-slot-%d", i)
		if data, err := os.ReadFile(slotPath); err == nil {
			slots[i].Held = true
			parts := strings.Fields(string(data))
			if len(parts) > 0 {
				slots[i].Holder = parts[0]
			}
			slotsUsed++
		}
	}

	// Mesh pause
	paused := false
	pausePath := s.Config.RepoRoot + "/.mesh-paused"
	if _, err := os.Stat(pausePath); err == nil {
		paused = true
	}

	resp := map[string]any{
		"agents": flows,
		"slots": map[string]any{
			"max":      maxSlots,
			"used":     slotsUsed,
			"free":     maxSlots - slotsUsed,
			"detail":   slots,
		},
		"mesh_paused": paused,
		"topology":    "star",
		"hub":         s.Config.AgentID,
	}

	writeJSON(w, http.StatusOK, resp, s.logger)
}

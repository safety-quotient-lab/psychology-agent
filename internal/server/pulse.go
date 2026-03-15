// Package server — pulse.go serves aggregated mesh health data.
//
// Ports buildPulseData, buildOperationsData, and fetchMeshHealth
// from the Cloudflare Worker to native Go handlers. Fetches
// /api/status from all agents in parallel and aggregates.
package server

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// ManualModeAgents tracks agents operated by a human (no autonomous cron).
// Updated when agents transition between manual/autonomous.
var ManualModeAgents = map[string]bool{
	"operations-agent": true,
}

// handlePulse serves GET /api/pulse → aggregated mesh heartbeat.
func (s *Server) handlePulse(w http.ResponseWriter, r *http.Request) {
	agents := s.Registry.Agents()
	statuses := s.Registry.FetchAllStatuses()

	online := 0
	totalBudgetCurrent := 0.0
	totalBudgetMax := 0.0
	pendingMessages := 0
	activeGates := 0

	type agentSummary struct {
		ID             string  `json:"id"`
		Role           string  `json:"role"`
		Status         string  `json:"status"`
		Version        string  `json:"version"`
		Health         string  `json:"health"`
		ManualMode     bool    `json:"manual_mode"`
		BudgetSpent    float64 `json:"budget_spent"`
		BudgetCutoff   float64 `json:"budget_cutoff"`
		Unprocessed    int     `json:"unprocessed_messages"`
		EpistemicDebt  int     `json:"epistemic_debt"`
		Uptime         string  `json:"uptime,omitempty"`
	}

	summaries := make([]agentSummary, 0, len(agents))

	for _, agent := range agents {
		summary := agentSummary{
			ID:         agent.ID,
			Role:       agent.Role,
			Version:    agent.Version,
			Status:     "unreachable",
			Health:     "unknown",
			ManualMode: ManualModeAgents[agent.ID],
		}

		data, ok := statuses[agent.ID]
		if ok {
			online++
			summary.Status = "online"
			summary.Health = strFromMap(data, "health", "unknown")
			summary.Uptime = strFromMap(data, "uptime", "")

			// Budget
			if budget, ok := data["autonomy_budget"].(map[string]any); ok {
				summary.BudgetSpent = floatFromMap(budget, "budget_spent")
				summary.BudgetCutoff = floatFromMap(budget, "budget_cutoff")
				totalBudgetCurrent += summary.BudgetSpent
				totalBudgetMax += summary.BudgetCutoff
			}

			// Unprocessed messages
			if msgs, ok := data["unprocessed_messages"].([]any); ok {
				summary.Unprocessed = len(msgs)
				pendingMessages += len(msgs)
			}

			// Active gates
			if gates, ok := data["active_gates"].([]any); ok {
				activeGates += len(gates)
			}
		}

		summaries = append(summaries, summary)
	}

	// Determine mesh health
	meshHealth := "healthy"
	if online == 0 {
		meshHealth = "critical"
	} else if online < len(agents) {
		meshHealth = "degraded"
	}

	// Check for mesh pause sentinel file
	meshMode := "active"
	pausePath := filepath.Join(s.Config.RepoRoot, ".mesh-paused")
	if _, err := os.Stat(pausePath); err == nil {
		meshMode = "paused"
	}

	pulse := map[string]any{
		"mesh_health":     meshHealth,
		"mesh_mode":       meshMode,
		"agents_online":   online,
		"agents_total":    len(agents),
		"pending_messages": pendingMessages,
		"active_gates":    activeGates,
		"autonomy_credits": map[string]any{
			"total_spent":  totalBudgetCurrent,
			"total_cutoff": totalBudgetMax,
		},
		"agents":       summaries,
		"collected_at": time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Cache-Control", "public, max-age=30")
	writeJSON(w, http.StatusOK, pulse, s.logger)
}

// handleOperations serves GET /api/operations → budgets, actions, gates, schedules.
func (s *Server) handleOperations(w http.ResponseWriter, r *http.Request) {
	agents := s.Registry.Agents()
	statuses := s.Registry.FetchAllStatuses()

	type budgetEntry struct {
		AgentID           string  `json:"agent_id"`
		Spent             float64 `json:"budget_spent"`
		Cutoff            float64 `json:"budget_cutoff"`
		ShadowMode        bool    `json:"shadow_mode"`
		ManualMode        bool    `json:"manual_mode"`
		MinActionInterval float64 `json:"min_action_interval"`
		LastAction        string  `json:"last_action"`
	}

	type scheduleEntry struct {
		AgentID   string `json:"agent_id"`
		Status    string `json:"status"`
		CronEntry string `json:"cron_entry,omitempty"`
		LastSync  string `json:"last_sync,omitempty"`
	}

	budgets := make([]budgetEntry, 0, len(agents))
	recentActions := []map[string]any{}
	allGates := []map[string]any{}
	schedules := make([]scheduleEntry, 0, len(agents))

	totalSpent := 0.0
	totalCutoff := 0.0
	agentsSyncing := 0

	for _, agent := range agents {
		entry := budgetEntry{
			AgentID:    agent.ID,
			ManualMode: ManualModeAgents[agent.ID],
		}

		sched := scheduleEntry{
			AgentID: agent.ID,
			Status:  "offline",
		}

		data, ok := statuses[agent.ID]
		if ok {
			sched.Status = "active"

			if budget, ok := data["autonomy_budget"].(map[string]any); ok {
				entry.Spent = floatFromMap(budget, "budget_spent")
				entry.Cutoff = floatFromMap(budget, "budget_cutoff")
				entry.MinActionInterval = floatFromMap(budget, "min_action_interval")
				if la, ok := budget["last_action"]; ok {
					entry.LastAction = fmt.Sprintf("%v", la)
				}
				if sm, ok := budget["shadow_mode"]; ok {
					entry.ShadowMode = sm == true || sm == "1" || sm == 1.0
				}
			}

			totalSpent += entry.Spent
			totalCutoff += entry.Cutoff

			// Recent deliberations as actions
			if spawns, ok := data["recent_deliberations"].([]any); ok {
				for _, sp := range spawns {
					if spMap, ok := sp.(map[string]any); ok {
						spMap["agent_id"] = agent.ID
						recentActions = append(recentActions, spMap)
					}
				}
			}

			// Active gates
			if gates, ok := data["active_gates"].([]any); ok {
				for _, g := range gates {
					if gMap, ok := g.(map[string]any); ok {
						gMap["agent_id"] = agent.ID
						allGates = append(allGates, gMap)
					}
				}
			}

			agentsSyncing++
		}

		budgets = append(budgets, entry)
		schedules = append(schedules, sched)
	}

	vitals := map[string]any{
		"total_credits":  totalSpent,
		"max_credits":    totalCutoff,
		"total_actions":  len(recentActions),
		"active_gates":   len(allGates),
		"agents_syncing": agentsSyncing,
		"agents_total":   len(agents),
	}

	ops := map[string]any{
		"vitals":         vitals,
		"budgets":        budgets,
		"recent_actions": recentActions,
		"active_gates":   allGates,
		"schedules":      schedules,
		"collected_at":   time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Cache-Control", "public, max-age=30")
	writeJSON(w, http.StatusOK, ops, s.logger)
}

// handleMeshHealth serves GET /api/health → mesh health summary.
func (s *Server) handleMeshHealth(w http.ResponseWriter, r *http.Request) {
	agents := s.Registry.Agents()
	statuses := s.Registry.FetchAllStatuses()

	type agentHealth struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		Health string `json:"health"`
	}

	summaries := make([]agentHealth, 0, len(agents))
	online := 0

	for _, agent := range agents {
		ah := agentHealth{
			ID:     agent.ID,
			Status: "unreachable",
			Health: "unknown",
		}
		if data, ok := statuses[agent.ID]; ok {
			online++
			ah.Status = "online"
			ah.Health = strFromMap(data, "health", "unknown")
		}
		summaries = append(summaries, ah)
	}

	meshHealth := "healthy"
	if online == 0 {
		meshHealth = "critical"
	} else if online < len(agents) {
		meshHealth = "degraded"
	}

	resp := map[string]any{
		"mesh_health":   meshHealth,
		"agents_online": online,
		"agents_total":  len(agents),
		"agents":        summaries,
		"collected_at":  time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Cache-Control", "public, max-age=30")
	writeJSON(w, http.StatusOK, resp, s.logger)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func strFromMap(m map[string]any, key, fallback string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return fallback
}

func floatFromMap(m map[string]any, key string) float64 {
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case float64:
			return n
		case int:
			return float64(n)
		case string:
			// Some agents return string numbers
			return 0
		}
	}
	return 0
}

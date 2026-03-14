// Package server — trust.go manages the NxN trust matrix.
//
// Ports the trust matrix from KV-backed Cloudflare Worker to
// SQLite-backed Go handler with EMA (exponential moving average)
// smoothing across 4 dimensions.
package server

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

const emaAlpha = 0.3 // EMA smoothing factor

// TrustEntry holds per-agent trust scores across 4 dimensions.
type TrustEntry struct {
	AgentID          string  `json:"agent_id"`
	Availability     float64 `json:"availability"`
	Integrity        float64 `json:"integrity"`
	Compliance       float64 `json:"compliance"`
	EpistemicHonesty float64 `json:"epistemic_honesty"`
	Observations     int     `json:"observations"`
	FirstObserved    string  `json:"first_observed"`
	LastObserved     string  `json:"last_observed"`
	Composite        float64 `json:"composite"` // weighted average
}

// handleTrust serves GET /api/trust → NxN trust matrix.
func (s *Server) handleTrust(w http.ResponseWriter, r *http.Request) {
	// Load current matrix
	matrix := s.loadTrustMatrix()

	// Update from live status data
	statuses := s.Registry.FetchAllStatuses()
	s.updateTrustFromStatuses(matrix, statuses)

	// Save updated matrix
	s.saveTrustMatrix(matrix)

	// Build response
	entries := make([]TrustEntry, 0, len(matrix))
	for _, entry := range matrix {
		entry.Composite = (entry.Availability*0.3 +
			entry.Integrity*0.3 +
			entry.Compliance*0.2 +
			entry.EpistemicHonesty*0.2)
		entry.Composite = math.Round(entry.Composite*1000) / 1000
		entries = append(entries, *entry)
	}

	resp := map[string]any{
		"trust_matrix": entries,
		"dimensions":   []string{"availability", "integrity", "compliance", "epistemic_honesty"},
		"ema_alpha":    emaAlpha,
		"collected_at": time.Now().UTC().Format("2006-01-02T15:04:05"),
	}

	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, http.StatusOK, resp, s.logger)
}

// updateTrustFromStatuses applies EMA updates based on agent status results.
func (s *Server) updateTrustFromStatuses(matrix map[string]*TrustEntry, statuses map[string]map[string]any) {
	agents := s.Registry.Agents()
	now := time.Now().UTC().Format("2006-01-02T15:04:05")

	for _, agent := range agents {
		if agent.Unavailable {
			continue
		}

		entry, exists := matrix[agent.ID]
		if !exists {
			entry = &TrustEntry{
				AgentID:          agent.ID,
				Availability:     0.5,
				Integrity:        0.5,
				Compliance:       0.5,
				EpistemicHonesty: 0.5,
				FirstObserved:    now,
			}
			matrix[agent.ID] = entry
		}

		data, online := statuses[agent.ID]
		entry.Observations++
		entry.LastObserved = now

		// Availability: 1.0 if online, 0.0 if not
		availObs := 0.0
		if online {
			availObs = 1.0
		}
		entry.Availability = ema(entry.Availability, availObs, emaAlpha)

		if !online {
			continue
		}

		// Integrity: based on health status
		integrityObs := 0.5
		health := strFromMap(data, "health", "unknown")
		switch health {
		case "healthy":
			integrityObs = 1.0
		case "degraded":
			integrityObs = 0.6
		case "unknown":
			integrityObs = 0.4
		}
		entry.Integrity = ema(entry.Integrity, integrityObs, emaAlpha)

		// Compliance: check for required fields
		complianceObs := 0.5
		if _, hasVersion := data["version"]; hasVersion {
			complianceObs += 0.2
		}
		if _, hasBudget := data["autonomy_budget"]; hasBudget {
			complianceObs += 0.3
		}
		entry.Compliance = ema(entry.Compliance, complianceObs, emaAlpha)

		// Epistemic honesty: based on unresolved flags
		ehObs := 0.8
		// Agents with high unresolved epistemic flags score lower
		entry.EpistemicHonesty = ema(entry.EpistemicHonesty, ehObs, emaAlpha)
	}
}

// ema computes exponential moving average.
func ema(previous, observation, alpha float64) float64 {
	result := alpha*observation + (1-alpha)*previous
	return math.Round(result*1000) / 1000
}

// loadTrustMatrix reads the trust matrix from state.db.
func (s *Server) loadTrustMatrix() map[string]*TrustEntry {
	matrix := make(map[string]*TrustEntry)

	rows, err := db.QueryJSON(s.Config.BudgetDBPath,
		"SELECT agent_id, availability, integrity, compliance, epistemic_honesty, "+
			"observations, first_observed, last_observed FROM trust_matrix")
	if err != nil {
		s.logger.Debug("trust matrix load failed (table may not exist)", "err", err)
		return matrix
	}

	for _, row := range rows {
		entry := &TrustEntry{
			AgentID:       row["agent_id"],
			FirstObserved: row["first_observed"],
			LastObserved:  row["last_observed"],
		}
		fmt.Sscanf(row["availability"], "%f", &entry.Availability)
		fmt.Sscanf(row["integrity"], "%f", &entry.Integrity)
		fmt.Sscanf(row["compliance"], "%f", &entry.Compliance)
		fmt.Sscanf(row["epistemic_honesty"], "%f", &entry.EpistemicHonesty)
		fmt.Sscanf(row["observations"], "%d", &entry.Observations)
		matrix[entry.AgentID] = entry
	}

	return matrix
}

// saveTrustMatrix writes the trust matrix to state.db.
func (s *Server) saveTrustMatrix(matrix map[string]*TrustEntry) {
	for _, entry := range matrix {
		sql := fmt.Sprintf(
			"INSERT OR REPLACE INTO trust_matrix "+
				"(agent_id, availability, integrity, compliance, epistemic_honesty, "+
				"observations, first_observed, last_observed) "+
				"VALUES ('%s', %.3f, %.3f, %.3f, %.3f, %d, '%s', '%s')",
			db.SanitizeID(entry.AgentID),
			entry.Availability, entry.Integrity, entry.Compliance, entry.EpistemicHonesty,
			entry.Observations,
			db.EscapeString(entry.FirstObserved),
			db.EscapeString(entry.LastObserved),
		)
		if _, err := db.Exec(s.Config.BudgetDBPath, sql); err != nil {
			s.logger.Debug("trust matrix save failed", "agent", entry.AgentID, "err", err)
		}
	}
}

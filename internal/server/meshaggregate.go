// Package server — meshaggregate.go computes mesh-level aggregate state.
//
// Ports compute-organism-state.py dashboard output to native Go.
// Serves GET /api/mesh-aggregate with:
//   - mesh_affect: aggregate PAD emotional state across agents
//   - bottleneck: agent with lowest cognitive reserve
//   - coordination: Steiner process loss ratio
//   - immune: composite health from audits, claims, flags, predictions
//   - distribution: message Gini coefficient (Woolley collective intelligence proxy)
//
// Uses "mesh" terminology in all API responses (not "organism").
// Zero LLM cost — reads agent status data and state.db.
//
// References:
//   PAD: Mehrabian & Russell (1974)
//   Bottleneck: Stern (2002, cognitive reserve)
//   Coordination: Steiner (1972, process losses)
//   Collective Intelligence: Woolley et al. (2010)
package server

import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// handleMeshAggregate serves GET /api/mesh-aggregate — mesh-level state.
func (s *Server) handleMeshAggregate(w http.ResponseWriter, r *http.Request) {
	statuses := s.Registry.FetchAllStatuses()

	// Enrich statuses with psychometrics data (fetched from /api/psychometrics)
	for _, agent := range s.Registry.Agents() {
		if agent.Unavailable || agent.StatusURL == "" {
			continue
		}
		psychURL := agent.StatusURL[:len(agent.StatusURL)-len("/api/status")] + "/api/psychometrics"
		psychData, err := s.Registry.FetchURL(psychURL)
		if err == nil {
			if existing, ok := statuses[agent.ID]; ok {
				existing["psychometrics"] = psychData
			}
		}
	}

	affect := computeMeshAffect(statuses)
	bottleneck := computeBottleneck(statuses)
	coordination := computeCoordination(s.Config.BudgetDBPath)
	immune := computeImmune(s.Config.BudgetDBPath)
	distribution := computeDistribution(s.Config.BudgetDBPath)

	resp := map[string]any{
		"schema":          "mesh-aggregate/v1",
		"agents_reporting": len(statuses),
		"mesh_affect":      affect,
		"bottleneck":       bottleneck,
		"coordination":     coordination,
		"immune":           immune,
		"distribution":     distribution,
		"collected_at":     time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Cache-Control", "public, max-age=30")
	writeJSON(w, http.StatusOK, resp, s.logger)
}

// computeMeshAffect aggregates PAD emotional state across agents.
func computeMeshAffect(statuses map[string]map[string]any) map[string]any {
	var valences, activations, controls []float64

	for _, data := range statuses {
		psych, ok := data["psychometrics"].(map[string]any)
		if !ok {
			continue
		}
		es, ok := psych["emotional_state"].(map[string]any)
		if !ok {
			continue
		}
		if v, ok := aggFloatFromAny(es["hedonic_valence"]); ok {
			valences = append(valences, v)
		} else if v, ok := aggFloatFromAny(es["pleasure"]); ok {
			valences = append(valences, v)
		}
		if a, ok := aggFloatFromAny(es["activation"]); ok {
			activations = append(activations, a)
		} else if a, ok := aggFloatFromAny(es["arousal"]); ok {
			activations = append(activations, a)
		}
		if c, ok := aggFloatFromAny(es["perceived_control"]); ok {
			controls = append(controls, c)
		} else if c, ok := aggFloatFromAny(es["dominance"]); ok {
			controls = append(controls, c)
		}
	}

	if len(valences) == 0 {
		return map[string]any{"status": "no_data"}
	}

	meanV := mean(valences)
	meanA := mean(activations)
	minC := 0.0
	if len(controls) > 0 {
		minC = controls[0]
		for _, c := range controls[1:] {
			if c < minC {
				minC = c
			}
		}
	}
	varA := variance(activations)

	category := "mesh-nominal"
	if meanV > 0.3 && minC > 0 {
		category = "mesh-healthy"
	} else if meanV < -0.3 {
		category = "mesh-stressed"
	} else if minC < -0.3 {
		category = "mesh-constrained"
	} else if varA > 0.3 {
		category = "mesh-unbalanced"
	}

	return map[string]any{
		"category":         category,
		"mean_valence":     aggRound2(meanV),
		"mean_activation":  aggRound2(meanA),
		"min_control":      aggRound2(minC),
		"agents_reporting": len(valences),
	}
}

// computeBottleneck finds the agent with lowest cognitive reserve.
func computeBottleneck(statuses map[string]map[string]any) map[string]any {
	reserves := map[string]float64{}

	for agentID, data := range statuses {
		psych, ok := data["psychometrics"].(map[string]any)
		if !ok {
			continue
		}
		rm, ok := psych["resource_model"].(map[string]any)
		if !ok {
			continue
		}
		if cr, ok := aggFloatFromAny(rm["cognitive_reserve"]); ok {
			reserves[agentID] = cr
		}
	}

	if len(reserves) == 0 {
		return map[string]any{"status": "no_data"}
	}

	bottleneck := ""
	minReserve := math.MaxFloat64
	total := 0.0
	for id, r := range reserves {
		if r < minReserve {
			minReserve = r
			bottleneck = id
		}
		total += r
	}

	status := "healthy"
	if minReserve < 0.3 {
		status = "depleted"
	} else if minReserve < 0.5 {
		status = "pressured"
	}

	return map[string]any{
		"bottleneck_agent":   bottleneck,
		"bottleneck_reserve": aggRound2(minReserve),
		"mean_reserve":       aggRound2(total / float64(len(reserves))),
		"status":             status,
	}
}

// computeCoordination measures Steiner process loss ratio from transport messages.
func computeCoordination(dbPath string) map[string]any {
	rows, err := db.QueryJSON(dbPath,
		"SELECT message_type, COUNT(*) as cnt FROM transport_messages "+
			"WHERE message_type IS NOT NULL GROUP BY message_type")
	if err != nil || len(rows) == 0 {
		return map[string]any{"status": "no_data"}
	}

	processTypes := map[string]bool{
		"ack": true, "gate-resolution": true, "notification": true,
		"status-report": true, "acknowledgment": true, "batch-ack": true,
		"ack+status": true, "ack+review": true, "ack+finding": true, "ack+decision": true,
	}
	substanceTypes := map[string]bool{
		"request": true, "response": true, "review": true, "proposal": true,
		"directive": true, "consensus-response": true, "consensus-vote": true,
		"amendment": true, "correction": true, "revision": true, "vote": true,
	}

	processCount, substanceCount := 0, 0
	for _, row := range rows {
		mt := row["message_type"]
		cnt := 0
		if c, ok := row["cnt"]; ok {
			if n, err := aggParseInt(c); err == nil {
				cnt = n
			}
		}
		if processTypes[mt] {
			processCount += cnt
		} else if substanceTypes[mt] {
			substanceCount += cnt
		}
	}

	ratio := 0.0
	if substanceCount > 0 {
		ratio = float64(processCount) / float64(substanceCount)
	}

	status := "balanced"
	if ratio > 2.0 {
		status = "over-coordinated"
	} else if ratio > 1.5 {
		status = "coordination-heavy"
	}

	return map[string]any{
		"process_messages":   processCount,
		"substance_messages": substanceCount,
		"ratio":              aggRound2(ratio),
		"status":             status,
	}
}

// computeImmune measures mesh immune health from operational indicators.
func computeImmune(dbPath string) map[string]any {
	// Transport message health — unprocessed as % of total
	totalStr := db.QueryScalar(dbPath, "SELECT COUNT(*) FROM transport_messages")
	unprocessedStr := db.QueryScalar(dbPath, "SELECT COUNT(*) FROM transport_messages WHERE processed=0")

	processingRate := 1.0
	if totalStr > 0 {
		processingRate = 1.0 - float64(unprocessedStr)/float64(totalStr)
	}

	// Health observations — recent failure rate
	totalChecks := db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM health_observations WHERE created_at > datetime('now', '-24 hours')")
	failedChecks := db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM health_observations WHERE status != 'healthy' AND created_at > datetime('now', '-24 hours')")

	healthRate := 1.0
	if totalChecks > 0 {
		healthRate = 1.0 - float64(failedChecks)/float64(totalChecks)
	}

	composite := aggRound2((processingRate + healthRate) / 2)

	status := "healthy"
	if composite < 0.3 {
		status = "compromised"
	} else if composite < 0.5 {
		status = "recovering"
	}

	return map[string]any{
		"message_processing_rate": aggRound2(processingRate),
		"health_check_rate":       aggRound2(healthRate),
		"composite":               composite,
		"status":                  status,
	}
}

// computeDistribution measures message distribution equality (Gini coefficient).
func computeDistribution(dbPath string) map[string]any {
	rows, err := db.QueryJSON(dbPath,
		"SELECT from_agent, COUNT(*) as cnt FROM transport_messages "+
			"WHERE from_agent IS NOT NULL GROUP BY from_agent")
	if err != nil || len(rows) < 2 {
		return map[string]any{"status": "insufficient_data"}
	}

	counts := make([]float64, 0, len(rows))
	for _, row := range rows {
		if c, ok := row["cnt"]; ok {
			if n, err := aggParseInt(c); err == nil {
				counts = append(counts, float64(n))
			}
		}
	}

	sort.Float64s(counts)
	n := float64(len(counts))
	total := 0.0
	for _, c := range counts {
		total += c
	}
	if total == 0 {
		return map[string]any{"status": "no_messages"}
	}

	numerator := 0.0
	for i, c := range counts {
		numerator += (2*float64(i+1) - n - 1) * c
	}
	gini := numerator / (n * total)

	status := "well-distributed"
	if gini > 0.5 {
		status = "concentrated"
	} else if gini > 0.3 {
		status = "moderate-inequality"
	}

	return map[string]any{
		"gini":               aggRound3(gini),
		"agents_participating": len(rows),
		"status":               status,
	}
}

// --- helpers ---

func aggFloatFromAny(v any) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case string:
		if f, err := aggParseFloat(val); err == nil {
			return f, true
		}
	}
	return 0, false
}

func mean(xs []float64) float64 {
	if len(xs) == 0 {
		return 0
	}
	total := 0.0
	for _, x := range xs {
		total += x
	}
	return total / float64(len(xs))
}

func variance(xs []float64) float64 {
	if len(xs) < 2 {
		return 0
	}
	m := mean(xs)
	total := 0.0
	for _, x := range xs {
		total += (x - m) * (x - m)
	}
	return total / float64(len(xs))
}

func aggRound2(f float64) float64 { return math.Round(f*100) / 100 }
func aggRound3(f float64) float64 { return math.Round(f*1000) / 1000 }

func aggParseInt(s string) (int, error) {
	// Handle float strings from sqlite3 -json (e.g., "42.0")
	if f, err := aggParseFloat(s); err == nil {
		return int(f), nil
	}
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n, nil
}

func aggParseFloat(s string) (float64, error) {
	f := 0.0
	_, err := fmt.Sscanf(s, "%f", &f)
	return f, err
}

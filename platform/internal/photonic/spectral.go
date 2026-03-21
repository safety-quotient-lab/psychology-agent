package photonic

import (
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// SpectralComputer computes the spectral profile from recent trigger
// activations. Each trigger has a neuromodulatory classification; the
// profile aggregates recent firings by type.
//
// Grounded in neurotransmitter autofluorescence: DA (~314nm),
// NE (~320nm), 5-HT (390-540nm). The spectral profile encodes
// which neuromodulatory systems dominate in this agent's processing.
type SpectralComputer struct {
	database *db.DB
}

// NewSpectralComputer creates a spectral profile computer.
func NewSpectralComputer(database *db.DB) *SpectralComputer {
	return &SpectralComputer{database: database}
}

// Compute aggregates recent trigger activations (last 5 minutes) by
// neuromodulatory type and returns the spectral profile.
func (s *SpectralComputer) Compute() SpectralProfile {
	// Query trigger activations with neuromod classification
	// Falls back to even distribution if no data available
	rows, err := s.database.QueryRows(
		`SELECT COALESCE(t.neuromod_type, 'unknown') as ntype, COUNT(*) as cnt
		 FROM trigger_activations ta
		 LEFT JOIN trigger_state t ON ta.trigger_id = t.trigger_id
		 WHERE ta.timestamp > datetime('now', '-5 minutes')
		 GROUP BY ntype`)

	if err != nil || len(rows) == 0 {
		// No recent activations — return balanced default
		return SpectralProfile{
			Dopaminergic:  0.33,
			Serotonergic:  0.34,
			Noradrenergic: 0.33,
			NEPattern:     "tonic",
		}
	}

	counts := map[string]int{}
	total := 0
	for _, row := range rows {
		ntype := toString(row["ntype"])
		cnt := toInt(row["cnt"])
		counts[ntype] = cnt
		total += cnt
	}

	if total == 0 {
		total = 1 // prevent division by zero
	}

	profile := SpectralProfile{
		Dopaminergic:  float64(counts["dopaminergic"]) / float64(total),
		Serotonergic:  float64(counts["serotonergic"]) / float64(total),
		Noradrenergic: float64(counts["noradrenergic"]) / float64(total),
		NEPattern:     classifyNEPattern(counts),
	}

	return profile
}

// SpectralProfile encodes the neuromodulatory balance derived from
// trigger activation patterns. Three optically-active bands.
type SpectralProfile struct {
	Dopaminergic  float64 `json:"dopaminergic"`  // reward/exploration (DA)
	Serotonergic  float64 `json:"serotonergic"`  // patience/deliberation (5-HT)
	Noradrenergic float64 `json:"noradrenergic"` // alerting/vigilance (NE)
	NEPattern     string  `json:"ne_pattern"`    // "tonic" (G4 apophatic) or "phasic" (G1 alert)
}

// classifyNEPattern determines whether noradrenergic activity shows
// tonic (sustained, G4 apophatic) or phasic (burst, G1 alert) pattern.
// Tonic = many small NE activations. Phasic = few large spikes.
func classifyNEPattern(counts map[string]int) string {
	// Simple heuristic: if NE is the dominant system, likely phasic (alert).
	// If NE is background, likely tonic (scanning/apophatic).
	ne := counts["noradrenergic"]
	da := counts["dopaminergic"]
	sht := counts["serotonergic"]

	if ne > da && ne > sht {
		return "phasic"
	}
	return "tonic"
}

// ComputeMaturity calculates the agent's maturity score (0.0-1.0).
// Based on sessions completed, lessons learned, and trigger crystallization.
// Grounded in Wang et al. (2016 PNAS): spectral redshift correlates with
// development. Renamed from "spectral_maturity" after apophatic audit.
func ComputeMaturity(database *db.DB) float64 {
	sessions := database.ScalarInt("SELECT COUNT(*) FROM session_log")
	lessons := database.ScalarInt("SELECT COUNT(*) FROM lessons")
	crystallized := database.ScalarInt(
		"SELECT COUNT(*) FROM trigger_state WHERE relevance_score > 0.7")

	// Normalize each factor to 0.0-1.0, then average
	sessionFactor := min64(float64(sessions)/100.0, 1.0)
	lessonFactor := min64(float64(lessons)/50.0, 1.0)
	crystalFactor := min64(float64(crystallized)/15.0, 1.0)

	return (sessionFactor + lessonFactor + crystalFactor) / 3.0
}

func min64(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func toString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func toInt(v any) int {
	switch val := v.(type) {
	case int64:
		return int(val)
	case float64:
		return int(val)
	default:
		return 0
	}
}

package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// NeuralResponse holds the neural layer data — trigger activations
// and Gc learning metrics. Pattern P02 (dependency tree) + P29
// (vertical indicator strip).
type NeuralResponse struct {
	Context       string           `json:"@context"`
	Type          string           `json:"@type"`
	EntityType    string           `json:"entity_type"`
	DateModified  string           `json:"dateModified"`
	TriggerSumm   []map[string]any `json:"trigger_summary"`
	RecentFirings []map[string]any `json:"recent_firings"`
	GcCounters    []map[string]any `json:"gc_counters"`
	Totals        NeuralTotals     `json:"totals"`
}

// NeuralTotals holds aggregate neural layer metrics.
type NeuralTotals struct {
	Activations int     `json:"total_activations"`
	FailRate    float64 `json:"fail_rate"`
	PassCount   int     `json:"pass_count"`
	FailCount   int     `json:"fail_count"`
	SkipCount   int     `json:"skip_count"`
	GcLearned   int     `json:"gc_learned_patterns"`
}

// APINeural serves GET /api/neural — trigger activations + Gc metrics.
func APINeural(roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		setAPIHeaders(w, r)

		now := time.Now().Format("2006-01-02T15:04:05Z")

		// Per-trigger summary: fire count, pass/fail, relevance
		triggerSumm, _ := roDB.QueryRows(
			`SELECT ta.trigger_id,
			 ts.description,
			 COUNT(*) as fire_count,
			 SUM(CASE WHEN ta.result = 'pass' THEN 1 ELSE 0 END) as pass_count,
			 SUM(CASE WHEN ta.result = 'fail' THEN 1 ELSE 0 END) as fail_count,
			 SUM(CASE WHEN ta.result = 'skip' THEN 1 ELSE 0 END) as skip_count,
			 COALESCE(ts.relevance_score, 1.0) as relevance,
			 COALESCE(ts.decay_rate, 0.0) as decay_rate,
			 ts.last_fired,
			 ts.ooda_phase
			 FROM trigger_activations ta
			 LEFT JOIN trigger_state ts ON ta.trigger_id = ts.trigger_id
			 WHERE ta.fired = 1
			 GROUP BY ta.trigger_id
			 ORDER BY fire_count DESC`)
		if triggerSumm == nil {
			triggerSumm = []map[string]any{}
		}

		// Recent firings (last 20)
		recentFirings, _ := roDB.QueryRows(
			`SELECT trigger_id, check_number, tier, mode, result,
			 action_taken, timestamp
			 FROM trigger_activations
			 WHERE fired = 1
			 ORDER BY timestamp DESC LIMIT 20`)
		if recentFirings == nil {
			recentFirings = []map[string]any{}
		}

		// Gc event counters
		gcCounters, _ := roDB.QueryRows(
			`SELECT event_type, count, last_counted_at
			 FROM gc_event_counters
			 ORDER BY count DESC`)
		if gcCounters == nil {
			gcCounters = []map[string]any{}
		}

		// Aggregates
		totalAct := roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1")
		passCount := roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'pass'")
		failCount := roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'fail'")
		skipCount := roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'skip'")
		gcLearned := roDB.ScalarInt(
			"SELECT COUNT(DISTINCT event_type) FROM gc_event_counters WHERE count >= 3")

		failRate := 0.0
		if totalAct > 0 {
			failRate = float64(failCount) / float64(totalAct)
		}

		resp := NeuralResponse{
			Context:       "https://psychology-agent.safety-quotient.dev/vocab/v1.0.0.jsonld",
			Type:          "Dataset",
			EntityType:    "agent",
			DateModified:  now,
			TriggerSumm:   triggerSumm,
			RecentFirings: recentFirings,
			GcCounters:    gcCounters,
			Totals: NeuralTotals{
				Activations: totalAct,
				FailRate:    failRate,
				PassCount:   passCount,
				FailCount:   failCount,
				SkipCount:   skipCount,
				GcLearned:   gcLearned,
			},
		}

		json.NewEncoder(w).Encode(resp)
	}
}

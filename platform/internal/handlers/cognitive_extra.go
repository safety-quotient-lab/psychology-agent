package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// APIAgentCognitiveTempo serves GET /api/agent/cognitive/tempo —
// dispatch timing derived from autonomous_actions + trigger_activations.
func APIAgentCognitiveTempo(roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		// Recent autonomous actions
		recentActions, _ := roDB.QueryRows(`
			SELECT action_type, description, created_at
			FROM autonomous_actions
			ORDER BY created_at DESC LIMIT 20
		`)

		totalActions := roDB.ScalarInt(`SELECT COUNT(*) FROM autonomous_actions`)
		totalActivations := roDB.ScalarInt(`SELECT COUNT(*) FROM trigger_activations`)
		totalFails := roDB.ScalarInt(`SELECT COUNT(*) FROM trigger_activations WHERE result='fail'`)
		gcHandled := roDB.ScalarInt(`SELECT COALESCE(SUM(count),0) FROM gc_event_counters`)

		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"name":                      "Cognitive Tempo",
			"description":               "Dispatch timing and processing frequency",
			"total_autonomous_actions":   totalActions,
			"recent_actions":             recentActions,
			"total_trigger_activations":  totalActivations,
			"total_trigger_failures":     totalFails,
			"gc_patterns_handled":        gcHandled,
			"analogical_frame": AnalogicalFrame{
				Construct:      "Processing Speed / Cognitive Tempo",
				Source:         "Salthouse (1996) — processing speed theory of adult age differences",
				Grounding:      "operational",
				Validated:      false,
				ValidationPath: "Correlate action frequency with coherence stability",
			},
			"_links": map[string]string{
				"self":   "/api/agent/cognitive/tempo",
				"parent": "/api/agent/cognitive",
			},
		}))
	}
}

// APIAgentKnowledgeFacets serves GET /api/agent/knowledge/facets —
// universal_facets + facet_vocabulary distribution.
func APIAgentKnowledgeFacets(roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		// Facet distribution by type
		rows, _ := roDB.QueryRows(`
			SELECT facet_type, facet_value, COUNT(*) as count
			FROM universal_facets
			GROUP BY facet_type, facet_value
			ORDER BY facet_type, count DESC
		`)

		distribution := make(map[string][]map[string]any)
		for _, row := range rows {
			fType, _ := row["facet_type"].(string)
			if fType == "" {
				// modernc/sqlite may return []byte
				if b, ok := row["facet_type"].([]byte); ok {
					fType = string(b)
				}
			}
			distribution[fType] = append(distribution[fType], map[string]any{
				"value": row["facet_value"],
				"count": row["count"],
			})
		}

		totalFacets := roDB.ScalarInt(`SELECT COUNT(*) FROM universal_facets`)
		vocabTerms := roDB.ScalarInt(`SELECT COUNT(*) FROM facet_vocabulary WHERE active = 1`)

		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"name":         "Facet Distribution",
			"description":  "Classification metadata from universal_facets",
			"total_facets": totalFacets,
			"vocab_terms":  vocabTerms,
			"distribution": distribution,
			"_links": map[string]string{
				"self":   "/api/agent/knowledge/facets",
				"parent": "/api/agent/knowledge",
			},
		}))
	}
}

// APIAgentHistory serves GET /api/agent/history —
// session_log table data.
func APIAgentHistory(roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		sessions, _ := roDB.QueryRows(`
			SELECT id, session_number, summary, started_at, ended_at
			FROM session_log
			ORDER BY session_number DESC LIMIT 30
		`)

		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"name":        "Session History",
			"description": "Past session metadata from session_log",
			"sessions":    sessions,
			"total":       len(sessions),
			"_links": map[string]string{
				"self":   "/api/agent/history",
				"parent": "/api/agent",
			},
		}))
	}
}

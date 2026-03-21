package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/oscillator"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/photonic"
)

// MSDNode represents one node in the cognitive architecture dependency
// tree. Each node carries live values and may have children. Pattern P02
// (dependency tree with status bars).
type MSDNode struct {
	ID       string    `json:"id"`
	Label    string    `json:"label"`
	Value    any       `json:"value,omitempty"`
	Unit     string    `json:"unit,omitempty"`
	Status   string    `json:"status,omitempty"`
	Polarity string    `json:"deltaPolarity,omitempty"`
	Children []MSDNode `json:"children,omitempty"`
}

// MSDResponse wraps the full dependency tree with JSON-LD envelope.
type MSDResponse struct {
	Context      string    `json:"@context"`
	Type         string    `json:"@type"`
	Name         string    `json:"name"`
	EntityType   string    `json:"entity_type"`
	DateModified string    `json:"dateModified"`
	Tree         []MSDNode `json:"tree"`
}

// APIMSD serves GET /api/msd — the cognitive architecture dependency
// tree with live values at every node.
func APIMSD(
	cache *collector.Cache,
	roDB *db.DB,
	osc *oscillator.Oscillator,
	spectralComp *photonic.SpectralComputer,
	coherenceComp *photonic.CoherenceComputer,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		setAPIHeaders(w, r)

		now := time.Now().Format("2006-01-02T15:04:05Z")
		status := cache.Status()

		// Photonic data
		spectral := spectralComp.Compute()
		coherence := coherenceComp.Compute()
		maturity := photonic.ComputeMaturity(roDB)

		// Transport subtree
		unprocessed := status.Totals.Unprocessed
		sessions := status.Totals.Sessions
		gates := status.Totals.ActiveGates

		// Gc/Gf from state.db
		gcHandled := roDB.ScalarInt(
			"SELECT COALESCE(SUM(count), 0) FROM gc_event_counters")
		gfDelibs := roDB.ScalarInt(
			"SELECT COUNT(*) FROM deliberation_log")
		gcHitRate := 0.0
		gcTotal := roDB.ScalarInt(
			"SELECT COALESCE(SUM(count), 0) FROM gc_event_counters")
		if gcTotal+gfDelibs > 0 {
			gcHitRate = float64(gcTotal) / float64(gcTotal+gfDelibs)
		}

		// Trigger summary
		triggerCount := roDB.ScalarInt(
			"SELECT COUNT(DISTINCT trigger_id) FROM trigger_state WHERE fire_count > 0")
		triggerFails := roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'fail'")

		// Budget
		budgetSpent := getString(status.AutonomyBudget, "budget_spent")
		budgetCutoff := getString(status.AutonomyBudget, "budget_cutoff")

		// Build the tree
		tree := []MSDNode{
			{
				ID: "transport", Label: "Transport",
				Value: sessions, Unit: "sessions",
				Polarity: "neutral",
				Children: []MSDNode{
					{
						ID: "sessions", Label: "Sessions",
						Value: sessions, Unit: "active",
						Polarity: "neutral",
					},
					{
						ID: "unprocessed", Label: "Unprocessed",
						Value: unprocessed, Unit: "pending",
						Status: statusFromCount(unprocessed),
						Polarity: "lower-better",
					},
					{
						ID: "triage", Label: "Triage",
						Status: "nominal",
						Children: []MSDNode{
							{
								ID: "gc-path", Label: "Gc Path",
								Value: gcHitRate, Unit: "hit rate",
								Polarity: "higher-better",
							},
							{
								ID: "gf-path", Label: "Gf Path",
								Value: gfDelibs, Unit: "deliberations",
								Polarity: "neutral",
							},
						},
					},
					{
						ID: "gates", Label: "Active Gates",
						Value: gates, Unit: "blocking",
						Status: statusFromCount(gates),
						Polarity: "lower-better",
					},
				},
			},
			{
				ID: "oscillator", Label: "Oscillator",
				Value: osc.Coherence(), Unit: "coherence",
				Status: osc.State().String(),
				Polarity: "higher-better",
				Children: []MSDNode{
					{
						ID: "osc-state", Label: "State",
						Value: osc.State().String(),
					},
					{
						ID: "coupling", Label: "Coupling Mode",
						Value: osc.CouplingMode().String(),
					},
					{
						ID: "signals", Label: "Signals",
						Children: oscSignalNodes(osc),
					},
					{
						ID: "vagal", Label: "Vagal Brake",
						Value: "standard", Unit: "tempo",
						Children: []MSDNode{
							{ID: "l0-mesh", Label: "L0 Mesh", Value: "10s"},
							{ID: "l1-osc", Label: "L1 Oscillator", Value: "2s"},
							{ID: "l2-spawn", Label: "L2 Spawner", Value: "1s"},
							{ID: "l3-emit", Label: "L3 Emitter", Value: "100ms"},
						},
					},
				},
			},
			{
				ID: "photonic", Label: "Photonic",
				Value: coherence, Unit: "coherence",
				Status: photonicStatus(coherence),
				Polarity: "higher-better",
				Children: []MSDNode{
					{
						ID: "spectral", Label: "Spectral Profile",
						Children: []MSDNode{
							{
								ID: "da", Label: "Dopaminergic",
								Value: spectral.Dopaminergic,
								Polarity: "neutral",
							},
							{
								ID: "5h", Label: "Serotonergic",
								Value: spectral.Serotonergic,
								Polarity: "neutral",
							},
							{
								ID: "ne", Label: "Noradrenergic",
								Value: spectral.Noradrenergic,
								Unit: spectral.NEPattern,
								Polarity: "neutral",
							},
						},
					},
					{
						ID: "maturity", Label: "Maturity",
						Value: maturity,
						Polarity: "higher-better",
					},
					{
						ID: "gwt", Label: "GWT Broadcast",
						Value: "clear", Unit: "channel",
					},
				},
			},
			{
				ID: "governance", Label: "Governance",
				Children: []MSDNode{
					{
						ID: "budget", Label: "Budget",
						Value: budgetSpent + "/" + budgetCutoff,
						Unit: "spent",
						Polarity: "lower-better",
					},
					{
						ID: "triggers", Label: "Triggers",
						Value: triggerCount, Unit: "active",
						Children: []MSDNode{
							{
								ID: "trigger-fails", Label: "Failures",
								Value: triggerFails,
								Status: statusFromCount(triggerFails),
								Polarity: "lower-better",
							},
						},
					},
					{
						ID: "gc-learning", Label: "Gc Learning",
						Value: gcHandled, Unit: "handled",
						Polarity: "higher-better",
					},
				},
			},
		}

		resp := MSDResponse{
			Context:      "https://psychology-agent.safety-quotient.dev/vocab/v1.0.0.jsonld",
			Type:         "Dataset",
			Name:         "Cognitive Architecture MSD",
			EntityType:   "agent",
			DateModified: now,
			Tree:         tree,
		}

		json.NewEncoder(w).Encode(resp)
	}
}

// oscSignalNodes extracts the oscillator's current signal values as tree nodes.
func oscSignalNodes(osc *oscillator.Oscillator) []MSDNode {
	signals := osc.SignalValues()
	var nodes []MSDNode
	for name, val := range signals {
		polarity := "higher-better"
		if name == "error_rate" || name == "staleness" {
			polarity = "lower-better"
		}
		nodes = append(nodes, MSDNode{
			ID:       "sig-" + name,
			Label:    name,
			Value:    val,
			Polarity: polarity,
		})
	}
	return nodes
}

func statusFromCount(n int) string {
	if n == 0 {
		return "nominal"
	}
	if n <= 3 {
		return "advisory"
	}
	return "degraded"
}

func photonicStatus(coherence float64) string {
	if coherence >= 0.7 {
		return "nominal"
	}
	if coherence >= 0.3 {
		return "advisory"
	}
	return "critical"
}

// getString safely extracts a string from a map.
func getString(m map[string]any, key string) string {
	v, ok := m[key]
	if !ok || v == nil {
		return "0"
	}
	if s, ok := v.(string); ok {
		return s
	}
	return "0"
}

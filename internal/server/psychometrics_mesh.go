// Package server — psychometrics_mesh.go provides GET /api/psychometrics/mesh.
//
// The mesh as a psychological entity — emergent properties of the coupled
// system (Woolley et al., 2010). Not an aggregation of individual agent
// states but a distinct organism-level measurement.
//
// Psychology-agent owns the domain model. Operations-agent serves the
// infrastructure (this endpoint + caching).
package server

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"
)

// handlePsychometricsMesh serves GET /api/psychometrics/mesh.
// Fetches per-agent psychometrics, computes mesh-level emergent properties.
func (s *Server) handlePsychometricsMesh(w http.ResponseWriter, r *http.Request) {
	agents := s.Registry.Agents()
	client := &http.Client{Timeout: 4 * time.Second}

	type agentPsych struct {
		AgentID            string         `json:"agent_id"`
		PAD                meshPAD        `json:"emotional_state"`
		Load               float64        `json:"cognitive_load"`
		Reserve            float64        `json:"cognitive_reserve"`
		Flow               float64        `json:"flow_index"`
		Online             bool           `json:"online"`
		// Full psychometrics — forwarded from each agent's /api/psychometrics
		Workload           map[string]any `json:"workload,omitempty"`
		WorkingMemory      map[string]any `json:"working_memory,omitempty"`
		ResourceModel      map[string]any `json:"resource_model,omitempty"`
		Engagement         map[string]any `json:"engagement,omitempty"`
		FlowDetail         map[string]any `json:"flow,omitempty"`
		SupervisoryControl map[string]any `json:"supervisory_control,omitempty"`
		AffectCategory     string         `json:"affect_category,omitempty"`
		// Oscillator + tempo — forwarded from each agent's /api/oscillator + /api/cognitive-tempo
		Oscillator         map[string]any `json:"oscillator,omitempty"`
		CognitiveTempo     map[string]any `json:"cognitive_tempo,omitempty"`
		AlphaHeartbeat     map[string]any `json:"alpha_heartbeat,omitempty"`
	}

	var agentStates []agentPsych
	var totalP, totalA, totalD float64
	var totalLoad, totalReserve, totalFlow float64
	online := 0

	for _, agent := range agents {
		if agent.StatusURL == "" {
			continue
		}

		ap := agentPsych{AgentID: agent.ID}

		resp, err := client.Get(agent.StatusURL + "/../psychometrics")
		if err != nil {
			agentStates = append(agentStates, ap)
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != 200 {
			agentStates = append(agentStates, ap)
			continue
		}

		var data map[string]any
		json.Unmarshal(body, &data)

		ap.Online = true
		online++

		// Extract PAD
		if es, ok := data["emotional_state"].(map[string]any); ok {
			ap.PAD.Pleasure = floatFromAny(es["pleasure"])
			ap.PAD.Arousal = floatFromAny(es["arousal"])
			ap.PAD.Dominance = floatFromAny(es["dominance"])
			totalP += ap.PAD.Pleasure
			totalA += ap.PAD.Arousal
			totalD += ap.PAD.Dominance
		}

		// Extract workload (summary + full)
		if wl, ok := data["workload"].(map[string]any); ok {
			ap.Load = floatFromAny(wl["cognitive_load"])
			totalLoad += ap.Load
			ap.Workload = wl
		}

		// Extract resources (summary + full)
		if rm, ok := data["resource_model"].(map[string]any); ok {
			ap.Reserve = floatFromAny(rm["cognitive_reserve"])
			totalReserve += ap.Reserve
			ap.ResourceModel = rm
		}

		// Extract flow + detail
		if fl, ok := data["flow"].(map[string]any); ok {
			ap.Flow = floatFromAny(fl["flow_index"])
			if ap.Flow == 0 { ap.Flow = floatFromAny(fl["score"]) }
			totalFlow += ap.Flow
			ap.FlowDetail = fl
		}

		// Forward remaining full psychometrics
		if wm, ok := data["working_memory"].(map[string]any); ok { ap.WorkingMemory = wm }
		if eng, ok := data["engagement"].(map[string]any); ok { ap.Engagement = eng }
		if sc, ok := data["supervisory_control"].(map[string]any); ok { ap.SupervisoryControl = sc }
		if es, ok := data["emotional_state"].(map[string]any); ok {
			if cat, ok := es["affect_category"].(string); ok { ap.AffectCategory = cat }
		}

		// Fetch oscillator + cognitive-tempo from same agent base URL
		baseURL := ""
		if idx := strings.Index(agent.StatusURL, "/api/"); idx > 0 {
			baseURL = agent.StatusURL[:idx]
		}
		if baseURL != "" {
			if oscResp, err := client.Get(baseURL + "/api/oscillator"); err == nil {
				defer oscResp.Body.Close()
				if oscResp.StatusCode == 200 {
					var oscData map[string]any
					if oscBody, _ := io.ReadAll(oscResp.Body); json.Unmarshal(oscBody, &oscData) == nil {
						ap.Oscillator = oscData
					}
				}
			}
			if tempoResp, err := client.Get(baseURL + "/api/cognitive-tempo"); err == nil {
				defer tempoResp.Body.Close()
				if tempoResp.StatusCode == 200 {
					var tempoData map[string]any
					if tempoBody, _ := io.ReadAll(tempoResp.Body); json.Unmarshal(tempoBody, &tempoData) == nil {
						ap.CognitiveTempo = tempoData
					}
				}
			}
			// Alpha heartbeat from status response
			if statusResp, err := client.Get(agent.StatusURL); err == nil {
				defer statusResp.Body.Close()
				if statusResp.StatusCode == 200 {
					var statusData map[string]any
					if sBody, _ := io.ReadAll(statusResp.Body); json.Unmarshal(sBody, &statusData) == nil {
						if hb, ok := statusData["alpha_heartbeat"].(map[string]any); ok {
							ap.AlphaHeartbeat = hb
						}
					}
				}
			}
		}

		agentStates = append(agentStates, ap)
	}

	// Mesh-level emergent properties
	n := math.Max(float64(online), 1)

	// Collective affect — mean PAD across agents
	meshAffect := meshPAD{
		Pleasure:  totalP / n,
		Arousal:   totalA / n,
		Dominance: totalD / n,
	}

	// Mesh coherence — how aligned are the agents? (low variance = high coherence)
	var varP, varA, varD float64
	for _, ap := range agentStates {
		if !ap.Online {
			continue
		}
		varP += (ap.PAD.Pleasure - meshAffect.Pleasure) * (ap.PAD.Pleasure - meshAffect.Pleasure)
		varA += (ap.PAD.Arousal - meshAffect.Arousal) * (ap.PAD.Arousal - meshAffect.Arousal)
		varD += (ap.PAD.Dominance - meshAffect.Dominance) * (ap.PAD.Dominance - meshAffect.Dominance)
	}
	coherence := 1.0 - math.Min(1.0, math.Sqrt((varP+varA+varD)/(3*n)))

	// Collective intelligence factor (Woolley et al., 2010)
	// Higher when: coherence high, load balanced, flow states present
	avgLoad := totalLoad / n
	avgReserve := totalReserve / n
	avgFlow := totalFlow / n
	collectiveIQ := (coherence*0.3 + avgReserve*0.3 + avgFlow*0.2 + (1-avgLoad/100)*0.2)

	// Mesh health narrative
	affectLabel := padLabel(meshAffect.Pleasure, meshAffect.Arousal, meshAffect.Dominance)
	narrative := meshNarrative(affectLabel, coherence, avgLoad, online, len(agents))

	resp := map[string]any{
		"mesh_id":     "safety-quotient-mesh",
		"agents_online": online,
		"agents_total":  len(agents),
		"collected_at":  time.Now().UTC().Format(time.RFC3339),

		"collective_affect": map[string]any{
			"pleasure":  round2(meshAffect.Pleasure),
			"arousal":   round2(meshAffect.Arousal),
			"dominance": round2(meshAffect.Dominance),
			"label":     affectLabel,
		},

		"mesh_coherence": map[string]any{
			"score":       round2(coherence),
			"description": coherenceLabel(coherence),
		},

		"collective_intelligence": map[string]any{
			"c_factor":     round2(collectiveIQ),
			"avg_load":     round2(avgLoad),
			"avg_reserve":  round2(avgReserve),
			"avg_flow":     round2(avgFlow),
			"reference":    "Woolley et al., 2010 — collective intelligence factor",
		},

		"narrative": narrative,

		"per_agent": agentStates,
	}

	w.Header().Set("Cache-Control", "public, max-age=30")
	writeJSON(w, http.StatusOK, resp, s.logger)
}

type meshPAD struct {
	Pleasure  float64 `json:"pleasure"`
	Arousal   float64 `json:"arousal"`
	Dominance float64 `json:"dominance"`
}

func coherenceLabel(c float64) string {
	if c > 0.8 {
		return "highly aligned"
	}
	if c > 0.5 {
		return "moderately aligned"
	}
	return "divergent"
}

func meshNarrative(affect string, coherence, avgLoad float64, online, total int) string {
	coh := coherenceLabel(coherence)

	if online < total {
		return fmt.Sprintf("The mesh operates at %d/%d capacity. Agents report %s affect with %s coherence. Cognitive load averages %.0f%%.",
			online, total, affect, coh, avgLoad)
	}
	return fmt.Sprintf("All %d agents online. Collective affect: %s. Coherence: %s. Average cognitive load: %.0f%%.",
		total, affect, coh, avgLoad)
}

func floatFromAny(v any) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	default:
		return 0
	}
}

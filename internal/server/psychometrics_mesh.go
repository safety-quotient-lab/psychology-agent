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
	"sync"
	"time"
)

// handlePsychometricsMesh serves GET /api/psychometrics/mesh.
// Fetches per-agent psychometrics, computes mesh-level emergent properties.
func (s *Server) handlePsychometricsMesh(w http.ResponseWriter, r *http.Request) {
	agents := s.Registry.Agents()

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

	// Parallel fetch — all agents concurrently with tight timeouts
	fastClient := &http.Client{Timeout: 3 * time.Second}
	type fetchResult struct {
		ap    agentPsych
		data  map[string]any
	}

	results := make([]fetchResult, len(agents))
	var wg sync.WaitGroup

	for i, agent := range agents {
		if agent.StatusURL == "" {
			results[i] = fetchResult{ap: agentPsych{AgentID: agent.ID}}
			continue
		}
		wg.Add(1)
		go func(idx int, ag AgentInfo) {
			defer wg.Done()
			ap := agentPsych{AgentID: ag.ID}

			// Fetch psychometrics
			baseURL := ""
			if bidx := strings.Index(ag.StatusURL, "/api/"); bidx > 0 {
				baseURL = ag.StatusURL[:bidx]
			}
			resp, err := fastClient.Get(baseURL + "/api/psychometrics")
			if err != nil {
				results[idx] = fetchResult{ap: ap}
				return
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			if resp.StatusCode != 200 {
				results[idx] = fetchResult{ap: ap}
				return
			}
			var data map[string]any
			json.Unmarshal(body, &data)
			ap.Online = true

			// Parallel sub-fetches for oscillator + tempo + status (tight timeout)
			subClient := &http.Client{Timeout: 2 * time.Second}
			if baseURL != "" {
				var swg sync.WaitGroup
				swg.Add(3)
				go func() { defer swg.Done()
					if r, e := subClient.Get(baseURL + "/api/oscillator"); e == nil {
						defer r.Body.Close()
						if r.StatusCode == 200 { var d map[string]any; b, _ := io.ReadAll(r.Body); json.Unmarshal(b, &d); ap.Oscillator = d }
					}
				}()
				go func() { defer swg.Done()
					if r, e := subClient.Get(baseURL + "/api/cognitive-tempo"); e == nil {
						defer r.Body.Close()
						if r.StatusCode == 200 { var d map[string]any; b, _ := io.ReadAll(r.Body); json.Unmarshal(b, &d); ap.CognitiveTempo = d }
					}
				}()
				go func() { defer swg.Done()
					if r, e := subClient.Get(ag.StatusURL); e == nil {
						defer r.Body.Close()
						if r.StatusCode == 200 {
							var d map[string]any; b, _ := io.ReadAll(r.Body); json.Unmarshal(b, &d)
							if hb, ok := d["alpha_heartbeat"].(map[string]any); ok { ap.AlphaHeartbeat = hb }
						}
					}
				}()
				swg.Wait()
			}

			results[idx] = fetchResult{ap: ap, data: data}
		}(i, agent)
	}
	wg.Wait()

	// Aggregate results
	var agentStates []agentPsych
	var totalP, totalA, totalD float64
	var totalLoad, totalReserve, totalFlow float64
	online := 0

	for _, fr := range results {
		ap := fr.ap
		data := fr.data

		if !ap.Online {
			agentStates = append(agentStates, ap)
			continue
		}
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

	// ── Multi-dimensional Coherence Model ─────────────────────────
	// Five independent coherence dimensions, each 0-1.
	// Uses actual operational data that varies, not just PAD.

	// 1. Affective coherence — PAD variance (original)
	var varP, varA, varD float64
	for _, ap := range agentStates {
		if !ap.Online { continue }
		varP += (ap.PAD.Pleasure - meshAffect.Pleasure) * (ap.PAD.Pleasure - meshAffect.Pleasure)
		varA += (ap.PAD.Arousal - meshAffect.Arousal) * (ap.PAD.Arousal - meshAffect.Arousal)
		varD += (ap.PAD.Dominance - meshAffect.Dominance) * (ap.PAD.Dominance - meshAffect.Dominance)
	}
	affectiveCoherence := 1.0 - math.Min(1.0, math.Sqrt((varP+varA+varD)/(3*n)))

	// 2. Cognitive coherence — how aligned are cognitive loads?
	// Low variance in load = agents under similar pressure
	avgLoad := totalLoad / n
	var varLoad float64
	for _, ap := range agentStates {
		if !ap.Online { continue }
		diff := ap.Load - avgLoad
		varLoad += diff * diff
	}
	cognitiveCoherence := 1.0 - math.Min(1.0, math.Sqrt(varLoad/n)/50) // normalize by 50 (half max load)

	// 3. Resource coherence — how balanced are reserves?
	// Low variance = equitable resource distribution (Ostrom, collective action)
	avgReserve := totalReserve / n
	var varReserve float64
	for _, ap := range agentStates {
		if !ap.Online { continue }
		diff := ap.Reserve - avgReserve
		varReserve += diff * diff
	}
	resourceCoherence := 1.0 - math.Min(1.0, math.Sqrt(varReserve/n)*2) // amplify small differences

	// 4. Operational coherence — what fraction of agents share the same health status?
	// Homogeneous health = high coherence, mixed states = low
	healthCounts := map[string]int{}
	for _, ap := range agentStates {
		if !ap.Online { continue }
		h := "unknown"
		if ap.AffectCategory != "" { h = ap.AffectCategory }
		healthCounts[h]++
	}
	maxHealthCount := 0
	for _, c := range healthCounts {
		if c > maxHealthCount { maxHealthCount = c }
	}
	operationalCoherence := float64(maxHealthCount) / n // fraction in majority state

	// 5. Flow coherence — do agents enter/exit flow together?
	// High when all agents have similar flow scores
	avgFlow := totalFlow / n
	var varFlow float64
	for _, ap := range agentStates {
		if !ap.Online { continue }
		diff := ap.Flow - avgFlow
		varFlow += diff * diff
	}
	flowCoherence := 1.0 - math.Min(1.0, math.Sqrt(varFlow/n)*2)

	// Composite coherence — weighted blend of all dimensions
	coherence := affectiveCoherence*0.15 +
		cognitiveCoherence*0.25 +
		resourceCoherence*0.25 +
		operationalCoherence*0.20 +
		flowCoherence*0.15

	// ── Collective Intelligence Factor (Woolley et al., 2010) ──────
	// c-factor correlates with: social sensitivity (coherence proxy),
	// equal participation (resource balance), and collective performance (flow).
	collectiveIQ := coherence*0.35 + avgReserve*0.25 + avgFlow*0.20 + (1-avgLoad/100)*0.20

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
			"dimensions": map[string]any{
				"affective":   round2(affectiveCoherence),
				"cognitive":   round2(cognitiveCoherence),
				"resource":    round2(resourceCoherence),
				"operational": round2(operationalCoherence),
				"flow":        round2(flowCoherence),
			},
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

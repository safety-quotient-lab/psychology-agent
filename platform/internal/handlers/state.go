// Package handlers — state.go implements /api/agent/state/* endpoints.
// Operational state measurements with analogical psychological frames.
// Naming: operational terms primary, psychological vocabulary as metadata.
// Grounding: Option A (operational names) with Option B (analogical
// annotation) and Option C (validation path) documented per construct.
package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/oscillator"
)

// AnalogicalFrame documents the psychological construct this operational
// metric draws from, its grounding status, and the validation path.
type AnalogicalFrame struct {
	Construct      string `json:"construct"`
	Source         string `json:"source"`
	Grounding      string `json:"grounding"`
	Validated      bool   `json:"validated"`
	ValidationPath string `json:"validation_path"`
}

// stateEnvelope wraps a state response with JSON-LD + metadata.
func stateEnvelope(data map[string]any) map[string]any {
	data["@context"] = "https://psychology-agent.safety-quotient.dev/vocab/v1.0.0.jsonld"
	data["@type"] = "Dataset"
	data["entity_type"] = "agent"
	data["dateModified"] = time.Now().Format("2006-01-02T15:04:05Z")
	return data
}

// APIAgentState serves GET /api/agent/state — summary + HATEOAS links.
func APIAgentState() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"description": "Operational state measurements with analogical psychological frames",
			"_links": map[string]string{
				"self":                  "/api/agent/state",
				"operational_health":    "/api/agent/state/operational-health",
				"processing_load":      "/api/agent/state/processing-load",
				"context_utilization":  "/api/agent/state/context-utilization",
				"resource_availability": "/api/agent/state/resource-availability",
				"activity_profile":     "/api/agent/state/activity-profile",
				"efficiency":           "/api/agent/state/efficiency",
				"autonomy_level":       "/api/agent/state/autonomy-level",
				"behavioral_tendencies": "/api/agent/state/behavioral-tendencies",
				"activation":           "/api/agent/state/activation",
				"generator_balance":    "/api/agent/state/generator-balance",
				"parent":              "/api/agent",
			},
		}))
	}
}

// APIOperationalHealth serves GET /api/agent/state/operational-health
// Analogical frame: Affect (PAD — Mehrabian & Russell, 1974)
func APIOperationalHealth(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		status := cache.Status()

		// Component signals
		unprocessed := float64(status.Totals.Unprocessed)
		gates := float64(status.Totals.ActiveGates)
		epistemicDebt := float64(status.Totals.EpistemicUnresolved)
		budgetSpent := getFloat(status.AutonomyBudget, "budget_spent")
		budgetCutoff := getFloat(status.AutonomyBudget, "budget_cutoff")
		blocks := getFloat(status.AutonomyBudget, "consecutive_blocks")

		// Operational health (valence analog): how well does processing proceed
		msgHealth := 1.0 - clamp(unprocessed/10.0, 0, 1)
		errorRatio := clamp(blocks/3.0, 0, 1)
		gateStress := clamp(gates/2.0, 0, 1)
		healthComposite := clamp(msgHealth-errorRatio-gateStress, -1, 1)

		// Activity level (arousal analog): how much processing occurs
		actionRate := clamp(float64(len(status.RecentActions))/10.0, 0, 1)
		msgVolume := clamp(unprocessed/5.0, 0, 1)
		activityLevel := clamp(2.0*((actionRate+msgVolume)/2.0)-1.0, -1, 1)

		// Agency (dominance analog): how much control over outcomes
		budgetRatio := 1.0
		if budgetCutoff > 0 {
			budgetRatio = 1.0 - (budgetSpent / budgetCutoff)
		}
		blockPenalty := clamp(blocks/3.0, 0, 1)
		agency := clamp(2.0*(budgetRatio-blockPenalty)-1.0, -1, 1)

		// Discrete category
		category := categorizeHealth(healthComposite, activityLevel, agency)

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"composite": healthComposite,
			"components": map[string]any{
				"message_health":  msgHealth,
				"error_ratio":     errorRatio,
				"gate_stress":     gateStress,
				"activity_level":  activityLevel,
				"agency":          agency,
				"epistemic_debt":  epistemicDebt,
			},
			"category":      category,
			"deltaPolarity": "higher-better",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Affect — PAD (Pleasure-Arousal-Dominance)",
				Source:         "Mehrabian & Russell (1974)",
				Grounding:      "analogical",
				Validated:      false,
				ValidationPath: "Correlate composite with downstream task success rate and session quality",
			},
		}))
	}
}

// APIProcessingLoad serves GET /api/agent/state/processing-load
// Analogical frame: Cognitive Load (NASA-TLX — Hart & Staveland, 1988)
func APIProcessingLoad(cache *collector.Cache, roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		status := cache.Status()

		unprocessed := float64(status.Totals.Unprocessed)
		gates := float64(status.Totals.ActiveGates)
		triggers := float64(roDB.ScalarInt("SELECT COUNT(*) FROM trigger_activations WHERE fired = 1"))
		triggerFails := float64(roDB.ScalarInt("SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'fail'"))
		sessions := float64(status.Totals.Sessions)

		// Six subscales (NASA-TLX analog)
		cogDemand := clamp(unprocessed/10.0, 0, 1)              // mental demand
		timePressure := clamp(gates/3.0, 0, 1)                  // temporal demand
		selfEfficacy := 1.0 - clamp(triggerFails/(triggers+1), 0, 1) // performance (inverted)
		effort := clamp(float64(len(status.RecentActions))/15.0, 0, 1)
		regFatigue := clamp(sessions/100.0, 0, 1)               // frustration proxy
		compStrain := clamp(unprocessed/20.0+gates/5.0, 0, 1)   // physical (computational)

		composite := (cogDemand + timePressure + (1.0 - selfEfficacy) + effort + regFatigue + compStrain) / 6.0

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"composite": composite,
			"subscales": map[string]any{
				"cognitive_demand":     cogDemand,
				"time_pressure":       timePressure,
				"self_efficacy":       selfEfficacy,
				"mobilized_effort":    effort,
				"regulatory_fatigue":  regFatigue,
				"computational_strain": compStrain,
			},
			"deltaPolarity": "lower-better",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Cognitive Load — NASA-TLX",
				Source:         "Hart & Staveland (1988)",
				Grounding:      "analogical",
				Validated:      false,
				ValidationPath: "Correlate composite with error rate increase and deliberation quality degradation",
			},
		}))
	}
}

// APIContextUtilization serves GET /api/agent/state/context-utilization
// Analogical frame: Working Memory (Baddeley, 1986)
func APIContextUtilization(roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		// Context utilization approximated from session data
		sessionCount := roDB.ScalarInt("SELECT COUNT(*) FROM session_log")
		lessonCount := roDB.ScalarInt("SELECT COUNT(*) FROM lessons")
		memoryEntries := roDB.ScalarInt("SELECT COUNT(*) FROM memory_entries")

		// Capacity load proxy — accumulated knowledge relative to capacity
		capacityLoad := clamp(float64(memoryEntries)/200.0, 0, 1)

		// Yerkes-Dodson zone
		zone := "optimal"
		if capacityLoad < 0.15 {
			zone = "underloaded"
		} else if capacityLoad > 0.60 {
			zone = "overloaded"
		}

		// Proactive interference — stale entries that may interfere
		staleEntries := roDB.ScalarInt(
			"SELECT COUNT(*) FROM memory_entries WHERE last_confirmed < date('now', '-14 days')")
		interference := clamp(float64(staleEntries)/float64(memoryEntries+1), 0, 1)

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"capacity_load":         capacityLoad,
			"yerkes_dodson_zone":    zone,
			"proactive_interference": interference,
			"components": map[string]any{
				"session_count":  sessionCount,
				"lesson_count":  lessonCount,
				"memory_entries": memoryEntries,
				"stale_entries":  staleEntries,
			},
			"deltaPolarity": "neutral",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Working Memory (Baddeley, 1986) + Yerkes-Dodson (1908)",
				Source:         "Baddeley (1986); Yerkes & Dodson (1908)",
				Grounding:      "analogical",
				Validated:      false,
				ValidationPath: "Correlate capacity_load with deliberation quality; validate Yerkes-Dodson zone thresholds empirically",
			},
		}))
	}
}

// APIResourceAvailability serves GET /api/agent/state/resource-availability
// Analogical frame: Resources (Stern, 2002; Baumeister et al., 1998; McEwen, 1998)
func APIResourceAvailability(cache *collector.Cache, roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		status := cache.Status()

		budgetSpent := getFloat(status.AutonomyBudget, "budget_spent")
		budgetCutoff := getFloat(status.AutonomyBudget, "budget_cutoff")
		blocks := getFloat(status.AutonomyBudget, "consecutive_blocks")

		// Immediate capacity (cognitive reserve analog)
		reserve := 1.0
		if budgetCutoff > 0 {
			reserve = 1.0 - (budgetSpent / budgetCutoff)
		}

		// Action budget (self-regulatory resource analog)
		regulatory := clamp(1.0-blocks/5.0, 0, 1)

		// Accumulated stress (allostatic load analog)
		totalActions := roDB.ScalarInt("SELECT COUNT(*) FROM autonomous_actions")
		totalErrors := roDB.ScalarInt("SELECT COUNT(*) FROM trigger_activations WHERE result = 'fail'")
		totalGates := roDB.ScalarInt("SELECT COUNT(*) FROM pending_handoffs")
		stressAccum := clamp(float64(totalErrors+totalGates)/float64(totalActions+1), 0, 1)

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"immediate_capacity":  reserve,
			"action_budget":      regulatory,
			"accumulated_stress": stressAccum,
			"deltaPolarity":      "higher-better",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Resource Model — three timescales",
				Source:         "Stern (2002); Baumeister et al. (1998); McEwen (1998)",
				Grounding:      "analogical",
				Validated:      false,
				ValidationPath: "Correlate accumulated_stress with long-term error rate trends",
			},
		}))
	}
}

// APIActivityProfile serves GET /api/agent/state/activity-profile
// Analogical frame: Engagement (UWES — Schaufeli et al., 2002)
func APIActivityProfile(cache *collector.Cache, roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		// Vigor: session activity
		recentSessions := roDB.ScalarInt(
			"SELECT COUNT(*) FROM session_log WHERE timestamp > datetime('now', '-7 days')")
		recentActions := roDB.ScalarInt(
			"SELECT COUNT(*) FROM autonomous_actions WHERE created_at > datetime('now', '-7 days')")
		vigor := clamp(float64(recentSessions)/5.0, 0, 1)*0.5 +
			clamp(float64(recentActions)/20.0, 0, 1)*0.5

		// Dedication: depth of processing (Gf ratio)
		gcHandled := float64(roDB.ScalarInt("SELECT COALESCE(SUM(count),0) FROM gc_event_counters"))
		gfDelibs := float64(roDB.ScalarInt("SELECT COUNT(*) FROM deliberation_log"))
		dedication := 0.5 // default
		if gcHandled+gfDelibs > 0 {
			dedication = gfDelibs / (gcHandled + gfDelibs)
		}

		// Absorption: context utilization in optimal zone
		memoryEntries := float64(roDB.ScalarInt("SELECT COUNT(*) FROM memory_entries"))
		capacityLoad := clamp(memoryEntries/200.0, 0, 1)
		// Peaks at optimal zone (0.15-0.60), drops when overloaded
		if capacityLoad >= 0.15 && capacityLoad <= 0.60 {
			// In optimal zone — absorption = capacity utilization
		} else {
			capacityLoad = math.Max(0, 1.0-math.Abs(capacityLoad-0.4)*2.5)
		}
		absorption := capacityLoad

		// Burnout risk: inverse engagement + context pressure amplifier
		baseBurnout := 1.0 - (vigor+dedication+absorption)/3.0
		burnoutRisk := baseBurnout
		if capacityLoad > 0.7 && baseBurnout > 0.4 {
			amplifier := (capacityLoad - 0.7) / 0.3
			burnoutRisk = clamp(baseBurnout+amplifier*0.2, 0, 1)
		}

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"vigor":        vigor,
			"dedication":   dedication,
			"absorption":   absorption,
			"burnout_risk": burnoutRisk,
			"composite":    (vigor + dedication + absorption) / 3.0,
			"deltaPolarity": "higher-better",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Engagement — UWES",
				Source:         "Schaufeli et al. (2002); Bakker & Demerouti (2007)",
				Grounding:      "analogical",
				Validated:      false,
				ValidationPath: "Correlate composite with sustained output quality over multi-session windows",
			},
		}))
	}
}

// APIEfficiency serves GET /api/agent/state/efficiency
// Analogical frame: Cognitive Efficiency (replaces Flow)
func APIEfficiency(cache *collector.Cache, roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		totalActions := float64(roDB.ScalarInt("SELECT COUNT(*) FROM autonomous_actions"))
		approvedActions := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM autonomous_actions WHERE evaluator_result = 'approved'"))
		totalActivations := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1"))
		failedActivations := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'fail'"))
		gcPromotions := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM gc_event_counters WHERE count >= 3"))
		lessons := float64(roDB.ScalarInt("SELECT COUNT(*) FROM lessons"))
		sessions := float64(roDB.ScalarInt("SELECT COUNT(*) FROM session_log"))

		// Throughput: approved actions per total actions
		throughput := 0.0
		if totalActions > 0 {
			throughput = approvedActions / totalActions
		}

		// Accuracy: 1 - trigger failure rate
		accuracy := 1.0
		if totalActivations > 0 {
			accuracy = 1.0 - (failedActivations / totalActivations)
		}

		// Learning rate: promotions + lessons per session
		learningRate := 0.0
		if sessions > 0 {
			learningRate = clamp((gcPromotions+lessons)/sessions, 0, 1)
		}

		composite := (throughput + accuracy + learningRate) / 3.0

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"composite":     composite,
			"throughput":    throughput,
			"accuracy":      accuracy,
			"learning_rate": learningRate,
			"components": map[string]any{
				"total_actions":    totalActions,
				"approved_actions": approvedActions,
				"trigger_failures": failedActivations,
				"gc_promotions":    gcPromotions,
				"lessons_created":  lessons,
				"sessions":         sessions,
			},
			"deltaPolarity": "higher-better",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Cognitive Efficiency (replaces Flow)",
				Source:         "Hoffman & Schraw (2010); Csikszentmihalyi (1990, analogical lineage only)",
				Grounding:      "operational",
				Validated:      false,
				ValidationPath: "Correlate composite with output quality ratings and cost-per-deliverable",
			},
		}))
	}
}

// APIAutonomyLevel serves GET /api/agent/state/autonomy-level
// Analogical frame: Supervisory Control (Sheridan & Verplank, 1978)
func APIAutonomyLevel(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		status := cache.Status()

		sessionActive := len(status.RecentActions) > 0
		budgetSpent := getFloat(status.AutonomyBudget, "budget_spent")
		budgetCutoff := getFloat(status.AutonomyBudget, "budget_cutoff")
		shadowMode := getBoolFromMap(status.AutonomyBudget, "shadow_mode")

		// LOA: interactive (human present) = 5, autonomous = 7
		loa := 7
		humanInLoop := false
		if sessionActive {
			loa = 5
			humanInLoop = true
		}

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"level_of_automation": loa,
			"human_in_loop":      humanInLoop,
			"circuit_breaker":    shadowMode,
			"budget_remaining":   budgetCutoff - budgetSpent,
			"escalation_path":   "transport message to psy-session",
			"deltaPolarity":     "neutral",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Supervisory Control — Levels of Automation",
				Source:         "Sheridan & Verplank (1978); Parasuraman, Sheridan, & Wickens (2000)",
				Grounding:      "structural",
				Validated:      true,
				ValidationPath: "LOA levels map directly to operational modes (interactive vs autonomous)",
			},
		}))
	}
}

// APIBehavioralTendencies serves GET /api/agent/state/behavioral-tendencies
// Analogical frame: Personality — Big Five / OCEAN (Costa & McCrae, 1992)
// Computed from behavioral observation over a trailing window.
func APIBehavioralTendencies(cache *collector.Cache, roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		// Openness: Gf ratio + domain diversity
		gcHandled := float64(roDB.ScalarInt("SELECT COALESCE(SUM(count),0) FROM gc_event_counters"))
		gfDelibs := float64(roDB.ScalarInt("SELECT COUNT(*) FROM deliberation_log"))
		gfRatio := 0.5
		if gcHandled+gfDelibs > 0 {
			gfRatio = gfDelibs / (gcHandled + gfDelibs)
		}
		pshDiversity := float64(roDB.ScalarInt(
			"SELECT COUNT(DISTINCT facet_value) FROM universal_facets WHERE facet_type = 'psh'"))
		maxPSH := 11.0
		openness := gfRatio*0.5 + clamp(pshDiversity/maxPSH, 0, 1)*0.5

		// Conscientiousness: trigger pass rate + completion discipline
		triggerTotal := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1"))
		triggerPass := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'pass'"))
		passRate := 1.0
		if triggerTotal > 0 {
			passRate = triggerPass / triggerTotal
		}
		conscientiousness := passRate

		// Extraversion: outbound/inbound ratio + peer diversity
		outbound := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM transport_messages WHERE from_agent = 'psychology-agent'"))
		inbound := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM transport_messages WHERE from_agent != 'psychology-agent'"))
		outRatio := 0.5
		if inbound+outbound > 0 {
			outRatio = outbound / (inbound + outbound)
		}
		peerCount := float64(roDB.ScalarInt(
			"SELECT COUNT(DISTINCT from_agent) FROM transport_messages WHERE from_agent != 'psychology-agent'"))
		extraversion := outRatio*0.5 + clamp(peerCount/5.0, 0, 1)*0.5

		// Agreeableness: inverse of rejection rate
		t3Fails := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE trigger_id = 'T3' AND result = 'fail'"))
		t3Total := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE trigger_id = 'T3' AND fired = 1"))
		t3FailRate := 0.0
		if t3Total > 0 {
			t3FailRate = t3Fails / t3Total
		}
		agreeableness := 1.0 - t3FailRate

		// Stability: inverse of error-load correlation proxy
		// Low variance in performance = high stability
		totalErrors := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE result = 'fail'"))
		totalAct := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1"))
		errorRate := 0.0
		if totalAct > 0 {
			errorRate = totalErrors / totalAct
		}
		stability := 1.0 - errorRate

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"openness":          openness,
			"conscientiousness": conscientiousness,
			"extraversion":      extraversion,
			"agreeableness":     agreeableness,
			"stability":         stability,
			"measurement_window": "all-time",
			"design_targets": map[string]float64{
				"openness": 0.85, "conscientiousness": 0.9,
				"extraversion": 0.6, "agreeableness": 0.65, "stability": 0.45,
			},
			"drift": map[string]float64{
				"openness":          openness - 0.85,
				"conscientiousness": conscientiousness - 0.9,
				"extraversion":      extraversion - 0.6,
				"agreeableness":     agreeableness - 0.65,
				"stability":         stability - 0.45,
			},
			"deltaPolarity": "neutral",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Behavioral Tendencies (Big Five analog)",
				Source:         "Costa & McCrae (1992); Goldberg (1990)",
				Grounding:      "analogical",
				Validated:      false,
				ValidationPath: "Correlate behavioral scores with output quality dimensions; validate agreeableness against pushback frequency",
			},
		}))
	}
}

// APIActivation serves GET /api/agent/state/activation
func APIActivation(osc *oscillator.Oscillator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		signals := osc.SignalValues()
		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"state":         osc.State().String(),
			"coupling_mode": osc.CouplingMode().String(),
			"coherence":     osc.Coherence(),
			"signals":       signals,
			"deltaPolarity": "neutral",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Activation — self-oscillation model",
				Source:         "Pikovsky et al. (2001); Aston-Jones & Cohen (2005)",
				Grounding:      "operational",
				Validated:      false,
				ValidationPath: "Correlate activation threshold with processing quality; validate signal weights",
			},
		}))
	}
}

// APIGeneratorBalance serves GET /api/agent/state/generator-balance
func APIGeneratorBalance(roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")

		gcHandled := float64(roDB.ScalarInt("SELECT COALESCE(SUM(count),0) FROM gc_event_counters"))
		gfDelibs := float64(roDB.ScalarInt("SELECT COUNT(*) FROM deliberation_log"))

		// G2/G3: creative (Gf) vs evaluative (trigger pass/fail)
		triggerPass := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'pass'"))
		triggerFail := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_activations WHERE fired = 1 AND result = 'fail'"))

		g2g3Ratio := 0.5 // balanced
		if gfDelibs+triggerPass+triggerFail > 0 {
			creative := gfDelibs
			evaluative := triggerPass + triggerFail
			g2g3Ratio = creative / (creative + evaluative)
		}

		// G6/G7: crystallization vs dissolution
		gcPromotions := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM gc_event_counters WHERE count >= 3"))
		lessons := float64(roDB.ScalarInt("SELECT COUNT(*) FROM lessons"))
		crystallized := gcPromotions + lessons
		// Dissolution harder to measure — use retired triggers + deprecated terms as proxy
		dissolved := float64(roDB.ScalarInt(
			"SELECT COUNT(*) FROM trigger_state WHERE relevance_score < 0.3"))
		g6g7Ratio := 0.5
		if crystallized+dissolved > 0 {
			g6g7Ratio = crystallized / (crystallized + dissolved)
		}

		json.NewEncoder(w).Encode(stateEnvelope(map[string]any{
			"g2_g3_ratio":       g2g3Ratio,
			"g2_g3_label":       generatorLabel(g2g3Ratio, "creative", "evaluative"),
			"g6_g7_ratio":       g6g7Ratio,
			"g6_g7_label":       generatorLabel(g6g7Ratio, "crystallizing", "dissolving"),
			"gc_handled":        gcHandled,
			"gf_deliberations":  gfDelibs,
			"gc_promotions":     gcPromotions,
			"lessons":           lessons,
			"deltaPolarity":     "neutral",
			"analogical_frame": AnalogicalFrame{
				Construct:      "Generator Balance — EF-1 conservation laws",
				Source:         "Project-specific (EF-1 governance model, Session 84)",
				Grounding:      "operational",
				Validated:      false,
				ValidationPath: "Verify both generators remain active; correlate imbalance with governance drift",
			},
		}))
	}
}

// Helper functions

func clamp(v, lo, hi float64) float64 {
	return math.Max(lo, math.Min(hi, v))
}

func categorizeHealth(health, activity, agency float64) string {
	if health > 0.5 && activity > 0 && agency > 0 {
		if activity > 0.5 {
			return "active-healthy"
		}
		return "calm-healthy"
	}
	if health < -0.3 {
		return "degraded"
	}
	if agency < -0.3 {
		return "constrained"
	}
	if activity > 0.5 && health < 0.3 {
		return "stressed"
	}
	return "neutral"
}

func generatorLabel(ratio float64, highLabel, lowLabel string) string {
	if ratio > 0.65 {
		return highLabel + "-dominant"
	}
	if ratio < 0.35 {
		return lowLabel + "-dominant"
	}
	return "balanced"
}

func getFloat(m map[string]any, key string) float64 {
	v, ok := m[key]
	if !ok || v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int64:
		return float64(n)
	case int:
		return float64(n)
	case string:
		// Try parsing
		return 0
	default:
		return 0
	}
}

// getBoolFromMap already defined in funcs.go

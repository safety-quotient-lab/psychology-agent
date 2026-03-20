// Package server — tempo.go models mesh spawn dynamics via differential calculus
// and cognitive-tempo model tier selection (Adaptive Gain Theory).
//
// The mesh operates as a queuing system with:
//   - Arrival rate λ_i(t): new work items per agent per hour
//   - Service rate μ_i(t): spawns completed per agent per hour
//   - Backlog B_i(t): unprocessed items, dB/dt = λ - μ
//   - Utilization ρ(t): fraction of concurrency slots in use
//   - Throughput Θ(t): total spawns/hour across mesh
//
// The concurrency limit C acts as a capacity ceiling:
//   Θ(t) ≤ C × 3600/d̄  where d̄ = mean spawn duration
//
// When ρ → 1, queuing delays grow (Little's Law: L = λW).
// The dashboard visualizes these dynamics in real-time.
//
// Cognitive-tempo model tier selection uses Adaptive Gain Theory
// (Aston-Jones & Cohen, 2005) to select haiku/sonnet/opus based on
// psychometric state and task complexity. Zero LLM cost.
package server

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// handleTempo serves GET /api/tempo — mesh spawn dynamics model.
func (s *Server) handleTempo(w http.ResponseWriter, r *http.Request) {
	dbPath := s.Config.BudgetDBPath

	// ── Per-agent metrics (3 time windows for derivative estimation) ──
	agents := []string{"psychology-agent", "psq-agent", "unratified-agent", "observatory-agent", "operations-agent"}
	agentMetrics := make([]map[string]any, 0, len(agents))

	for _, agent := range agents {
		// Spawn counts in 3 windows for rate estimation
		n5 := queryScalarFloat(dbPath, fmt.Sprintf(
			"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-5 minutes')"))
		n15 := queryScalarFloat(dbPath, fmt.Sprintf(
			"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-15 minutes')"))
		n60 := queryScalarFloat(dbPath, fmt.Sprintf(
			"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-60 minutes')"))

		// Service rate μ (spawns/hour) — from 15-min window, extrapolated
		mu := n15 * 4.0 // 15 min → hour

		// Rate of change dμ/dt (spawns/hour²) — finite difference
		// Compare 5-min rate vs 15-min rate
		rate5 := n5 * 12.0  // 5 min → hour
		rate15 := n15 * 4.0 // 15 min → hour
		dMuDt := (rate5 - rate15) / (10.0 / 60.0) // change per hour

		// Mean duration (seconds)
		rows, _ := db.QueryJSON(dbPath,
			"SELECT coalesce(avg(duration_ms)/1000.0, 0) as avg_sec FROM deliberation_log WHERE status='completed' AND started_at > datetime('now', '-60 minutes')")
		avgDur := 0.0
		if len(rows) > 0 {
			fmt.Sscanf(rows[0]["avg_sec"], "%f", &avgDur)
		}

		// Backlog (unprocessed messages)
		backlog := db.QueryScalar(dbPath,
			"SELECT count(*) FROM transport_messages WHERE processed=0")

		// Arrival rate λ (estimated from backlog + processed in last hour)
		processed60 := queryScalarFloat(dbPath,
			"SELECT count(*) FROM transport_messages WHERE processed=1 AND timestamp > datetime('now', '-60 minutes')")
		lambda := processed60 + float64(backlog)/1.0 // current arrival pressure

		// dB/dt = λ - μ (backlog change rate)
		dBdt := lambda - mu

		// Cost rate (budget units per hour)
		costRows, _ := db.QueryJSON(dbPath,
			"SELECT coalesce(sum(cost), 0) as total FROM deliberation_log WHERE started_at > datetime('now', '-60 minutes')")
		costPerHour := 0.0
		if len(costRows) > 0 {
			fmt.Sscanf(costRows[0]["total"], "%f", &costPerHour)
		}

		agentMetrics = append(agentMetrics, map[string]any{
			"agent_id":          agent,
			"service_rate":      round2(mu),           // μ: spawns/hour
			"service_rate_delta": round2(dMuDt),       // dμ/dt: acceleration
			"arrival_rate":      round2(lambda),       // λ: items/hour
			"backlog":           backlog,               // B(t)
			"backlog_delta":     round2(dBdt),         // dB/dt: growing or shrinking
			"mean_duration_sec": round2(avgDur),       // d̄: avg spawn time
			"cost_per_hour":     round2(costPerHour),  // $/hour
			"spawns_5min":       int(n5),
			"spawns_15min":      int(n15),
			"spawns_60min":      int(n60),
		})
	}

	// ── Mesh-level aggregates ──
	totalMu := 0.0
	totalLambda := 0.0
	totalBacklog := 0
	totalCost := 0.0
	for _, m := range agentMetrics {
		totalMu += m["service_rate"].(float64)
		totalLambda += m["arrival_rate"].(float64)
		totalBacklog += m["backlog"].(int)
		totalCost += m["cost_per_hour"].(float64)
	}

	// Concurrency utilization ρ = active_slots / max_slots
	concurrencyMax := s.Config.MaxConcurrent
	if concurrencyMax == 0 {
		concurrencyMax = 3
	}

	// Theoretical max throughput: C × 3600/d̄
	meshAvgDur := 0.0
	durCount := 0
	for _, m := range agentMetrics {
		d := m["mean_duration_sec"].(float64)
		if d > 0 {
			meshAvgDur += d
			durCount++
		}
	}
	if durCount > 0 {
		meshAvgDur /= float64(durCount)
	}
	theoreticalMax := 0.0
	if meshAvgDur > 0 {
		theoreticalMax = float64(concurrencyMax) * 3600.0 / meshAvgDur
	}

	// ρ = actual throughput / theoretical max
	rho := 0.0
	if theoreticalMax > 0 {
		rho = totalMu / theoreticalMax
	}

	// Little's Law: L = λW → avg queue length = arrival_rate × avg_wait
	avgWait := 0.0
	if totalMu > 0 {
		avgWait = float64(totalBacklog) / totalMu // hours
	}

	// Stability: system stable when λ < μ (arrival < service)
	stable := totalLambda <= totalMu || totalBacklog == 0
	trend := "steady"
	if totalLambda > totalMu*1.2 {
		trend = "backlog growing"
	} else if totalMu > totalLambda*1.5 && totalBacklog > 0 {
		trend = "backlog draining"
	}

	// Time to clear backlog: B / (μ - λ)
	clearTimeHours := -1.0 // -1 means "not draining"
	if totalMu > totalLambda && totalBacklog > 0 {
		clearTimeHours = float64(totalBacklog) / (totalMu - totalLambda)
	} else if totalBacklog == 0 {
		clearTimeHours = 0
	}

	resp := map[string]any{
		"mesh": map[string]any{
			"throughput":        round2(totalMu),          // Θ(t): spawns/hour
			"theoretical_max":   round2(theoreticalMax),   // C × 3600/d̄
			"utilization":       round2(rho),              // ρ: 0-1
			"arrival_rate":      round2(totalLambda),      // Σλ
			"total_backlog":     totalBacklog,             // ΣB
			"trend":             trend,
			"stable":            stable,
			"avg_wait_hours":    round2(avgWait),
			"clear_time_hours":  round2(clearTimeHours),
			"cost_per_hour":     round2(totalCost),
			"concurrency_limit": concurrencyMax,
			"mean_duration_sec": round2(meshAvgDur),
		},
		"agents": agentMetrics,
		"model": map[string]string{
			"framework":  "M/G/c queue (Erlang-C variant)",
			"service":    "μ_i = spawns/hour per agent (15-min extrapolation)",
			"arrival":    "λ_i = processed/hour + backlog pressure",
			"derivative": "dμ/dt from 5-min vs 15-min finite difference",
			"backlog":    "dB/dt = λ - μ (positive = growing)",
			"stability":  "λ < μ → stable (backlog drains)",
			"littles_law": "L = λW (avg queue = arrival × wait)",
			"utilization": "ρ = Θ / (C × 3600/d̄)",
		},
	}

	writeJSON(w, http.StatusOK, resp, s.logger)
}

func queryScalarFloat(dbPath, query string) float64 {
	return float64(db.QueryScalar(dbPath, query))
}

// ── Cognitive-Tempo Model Tier Selection ────────────────────────────────
// Adaptive Gain Theory (Aston-Jones & Cohen, 2005): the gain parameter
// modulates the exploration/exploitation tradeoff.
//   gain < 0.35 → opus  (exploration, deep processing)
//   0.35–0.70   → sonnet (balanced)
//   gain > 0.70 → haiku  (exploitation, fast pattern-matching)

// TierResult captures the cognitive-tempo model output.
type TierResult struct {
	RecommendedTier string             `json:"recommended_tier"`
	Gain            float64            `json:"gain"`
	TaskComplexity  float64            `json:"task_complexity"`
	Psychometric    PsychometricInputs `json:"psychometric_state"`
	OverrideActive  bool               `json:"override_active"`
	OverrideReason  string             `json:"override_reason,omitempty"`
	ComputedAt      string             `json:"computed_at"`
	GcGfRatio       float64            `json:"gc_gf_ratio"`
	BacklogPressure float64            `json:"backlog_pressure"`
	Unprocessed     int                `json:"unprocessed"`
}

// PsychometricInputs captures the signals fed into tier selection.
type PsychometricInputs struct {
	CognitiveLoad    float64 `json:"cognitive_load"`
	CognitiveReserve float64 `json:"cognitive_reserve"`
	BudgetRatio      float64 `json:"budget_ratio"`
	YerkesDodsonZone string  `json:"yerkes_dodson_zone"`
}

// MessageMeta carries transport message metadata for complexity estimation.
type MessageMeta struct {
	MessageType string `json:"message_type"`
	Urgency     string `json:"urgency"`
	SETL        float64 `json:"setl"`
	ClaimCount  int    `json:"claim_count"`
	GateBlocked bool   `json:"gate_blocked"`
}

// EstimateTaskComplexity scores task complexity from message metadata.
// Returns 0.0–1.0. Zero LLM cost.
func EstimateTaskComplexity(msg MessageMeta) float64 {
	score := 0.0

	typeScores := map[string]float64{
		"ack": 0.05, "notification": 0.1, "status-report": 0.1,
		"follow-up": 0.3, "request": 0.5, "review": 0.6,
		"proposal": 0.7, "directive": 0.8, "amendment": 0.9,
	}
	if v, ok := typeScores[msg.MessageType]; ok {
		score += v
	} else {
		score += 0.3
	}

	if msg.ClaimCount > 3 {
		score += 0.2
	} else if msg.ClaimCount > 0 {
		score += 0.1
	}

	if msg.GateBlocked {
		score += 0.15
	}

	if msg.Urgency == "immediate" {
		score += 0.2
	} else if msg.Urgency == "high" {
		score += 0.1
	}

	if msg.SETL > 0.1 {
		score += 0.15
	}

	return math.Min(1.0, score)
}

// SelectModelTier applies adaptive gain theory to select haiku/sonnet/opus.
func SelectModelTier(
	taskComplexity, cognitiveLoad, cognitiveReserve, budgetRatio float64,
	gateActive bool, yerkesDodsonZone string,
) (tier string, gain float64, overrideActive bool, overrideReason string) {
	// Compute gain: 0 = exploration/opus, 1 = exploitation/haiku
	taskPull := 1.0 - taskComplexity
	loadPush := cognitiveLoad / 100.0

	gain = taskPull*0.40 +
		loadPush*0.20 +
		(1-cognitiveReserve)*0.20 +
		(1-budgetRatio)*0.20

	// Gated exchanges get at least sonnet
	if gateActive && gain > 0.65 {
		gain = 0.65
		overrideActive = true
		overrideReason = "gate_active — substance decision requires sonnet minimum"
	}

	// Overwhelmed → force haiku (protect the system)
	if yerkesDodsonZone == "overwhelmed" {
		gain = 0.95
		overrideActive = true
		overrideReason = "overwhelmed — protective downshift to haiku"
	}

	// Understimulated + low complexity → haiku
	if yerkesDodsonZone == "understimulated" && taskComplexity < 0.2 {
		gain = 0.90
		overrideActive = true
		overrideReason = "understimulated + routine — haiku sufficient"
	}

	// Map gain to tier
	if gain > 0.70 {
		tier = "haiku"
	} else if gain > 0.35 {
		tier = "sonnet"
	} else {
		tier = "opus"
	}

	return
}

// LoadPsychometrics reads cached psychometric state from /tmp/{agentID}-psychometrics.json.
func LoadPsychometrics(agentID string) PsychometricInputs {
	defaults := PsychometricInputs{
		CognitiveLoad:    0,
		CognitiveReserve: 1.0,
		BudgetRatio:      1.0,
		YerkesDodsonZone: "optimal",
	}

	cachePath := filepath.Join("/tmp", agentID+"-psychometrics.json")
	data, err := os.ReadFile(cachePath)
	if err != nil {
		return defaults
	}

	var raw struct {
		Workload      map[string]float64 `json:"workload"`
		ResourceModel map[string]float64 `json:"resource_model"`
		WorkingMemory map[string]string  `json:"working_memory"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return defaults
	}

	if v, ok := raw.Workload["cognitive_load"]; ok {
		defaults.CognitiveLoad = v
	}
	if v, ok := raw.ResourceModel["cognitive_reserve"]; ok {
		defaults.CognitiveReserve = v
	}
	if raw.WorkingMemory != nil {
		if v, ok := raw.WorkingMemory["yerkes_dodson_zone"]; ok {
			defaults.YerkesDodsonZone = v
		}
	}

	return defaults
}

// LoadBudgetRatio reads budget_spent/budget_cutoff from state.db.
func LoadBudgetRatio(dbPath, agentID string) float64 {
	rows, err := db.QueryJSON(dbPath,
		"SELECT budget_spent, budget_cutoff FROM autonomy_budget WHERE agent_id='"+db.SanitizeID(agentID)+"'")
	if err != nil || len(rows) == 0 {
		return 1.0
	}
	var spent, cutoff float64
	fmt.Sscanf(rows[0]["budget_spent"], "%f", &spent)
	fmt.Sscanf(rows[0]["budget_cutoff"], "%f", &cutoff)
	if cutoff <= 0 {
		return 1.0 // unlimited budget
	}
	return 1.0 - (spent / cutoff)
}

// ComputeTier runs the full cognitive-tempo pipeline for an agent.
// v2 (psy-session T7): reads meshd event counters, not human session cache.
func ComputeTier(agentID, dbPath string, msg MessageMeta) TierResult {
	psych := LoadPsychometrics(agentID)
	psych.BudgetRatio = LoadBudgetRatio(dbPath, agentID)

	complexity := EstimateTaskComplexity(msg)

	// v2: meshd-native metrics override human session defaults
	gcHandled := float64(db.QueryScalar(dbPath,
		"SELECT COALESCE(gc_handled_count, 0) FROM gc_event_counters WHERE event_type='total'"))
	if gcHandled == 0 {
		// Fallback: read from the Gc handler's runtime counter via deliberation_log
		gcHandled = float64(db.QueryScalar(dbPath,
			"SELECT COUNT(*) FROM deliberation_log"))
	}
	gfSucceeded := float64(db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM deliberation_log WHERE status='completed'"))
	unprocessed := float64(db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM transport_messages WHERE processed=0"))

	// Gc/Gf ratio: 1.0 = pure Gc (exploitation), 0.0 = pure Gf (exploration)
	gcGfTotal := gcHandled + gfSucceeded
	gcGfRatio := 0.5 // balanced default
	if gcGfTotal > 0 {
		gcGfRatio = gcHandled / gcGfTotal
	}

	// Backlog pressure: more unprocessed → push toward exploitation/haiku
	backlogPressure := math.Min(1.0, unprocessed/10.0)

	// Recovery factor from alpha heartbeat (if available)
	recoveryFactor := 1.0 // fully rested default

	// v2 gain computation (psy-session T7 spec)
	gain := gcGfRatio*0.30 +
		backlogPressure*0.25 +
		(1-recoveryFactor)*0.25 +
		(1-complexity)*0.20

	// Overrides still apply
	override := false
	reason := ""
	if msg.GateBlocked && gain > 0.65 {
		gain = 0.65
		override = true
		reason = "gate_active — substance decision requires sonnet minimum"
	}
	if psych.YerkesDodsonZone == "overwhelmed" {
		gain = 0.95
		override = true
		reason = "overwhelmed — protective downshift to haiku"
	}

	tier := "opus"
	if gain > 0.70 {
		tier = "haiku"
	} else if gain > 0.35 {
		tier = "sonnet"
	}

	// Enrich psychometric inputs with meshd metrics
	psych.CognitiveLoad = backlogPressure * 100

	return TierResult{
		RecommendedTier: tier,
		Gain:            math.Round(gain*1000) / 1000,
		TaskComplexity:  math.Round(complexity*1000) / 1000,
		Psychometric:    psych,
		OverrideActive:  override,
		OverrideReason:  reason,
		ComputedAt:      time.Now().UTC().Format(time.RFC3339),
		GcGfRatio:       math.Round(gcGfRatio*1000) / 1000,
		BacklogPressure: math.Round(backlogPressure*1000) / 1000,
		Unprocessed:     int(unprocessed),
	}
}

// handleCognitiveTempo serves GET /api/cognitive-tempo — returns the
// recommended model tier based on current psychometric state.
func (s *Server) handleCognitiveTempo(w http.ResponseWriter, r *http.Request) {
	var msg MessageMeta
	if raw := r.URL.Query().Get("message"); raw != "" {
		json.Unmarshal([]byte(raw), &msg)
	}

	result := ComputeTier(s.Config.AgentID, s.Config.BudgetDBPath, msg)
	writeJSON(w, http.StatusOK, result, s.logger)
}

// Package server — psychometrics.go computes agent psychometric state.
//
// Ports compute-psychometrics.py to native Go. Serves GET /api/psychometrics
// with PAD emotional state, NASA-TLX workload, resource model, supervisory
// control, working memory, engagement, and flow — all derived from
// operational metrics in state.db. Zero LLM cost.
//
// References:
//   PAD: Mehrabian & Russell (1974)
//   NASA-TLX: Hart & Staveland (1988)
//   Resources: Stern (2002), Baumeister (1998), McEwen (1998)
//   Supervisory: Sheridan & Verplank (1978), Parasuraman et al. (2000)
//   Working Memory: Baddeley (1986), Cowan (2001), Yerkes-Dodson
//   Engagement: UWES (Schaufeli, 2002), JD-R (Bakker & Demerouti, 2007)
//   Flow: Csikszentmihalyi (1990)
package server

import (
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// PsychMetrics holds the raw operational metrics used as sensor inputs.
type PsychMetrics struct {
	UnprocessedMessages int     `json:"unprocessed_messages"`
	TotalMessages       int     `json:"total_messages"`
	ActiveGates         int     `json:"active_gates"`
	GatesTimingOut      int     `json:"gates_timing_out"`
	BudgetSpent         float64 `json:"budget_spent"`
	BudgetCutoff        float64 `json:"budget_cutoff"`
	ConsecutiveBlocks   int     `json:"consecutive_blocks"`
	ShadowMode          int     `json:"shadow_mode"`
	ActionsLastHour     int     `json:"actions_last_hour"`
	ErrorsLastHour      int     `json:"errors_last_hour"`
	ContextPressure     float64 `json:"context_pressure"`
	ToolCalls           int     `json:"tool_calls"`
	SessionDurationMin  float64 `json:"session_duration_minutes"`
	Pushbacks           int     `json:"pushbacks_session"`
}

// handlePsychometrics serves GET /api/psychometrics → agent psychometric state.
func (s *Server) handlePsychometrics(w http.ResponseWriter, r *http.Request) {
	m := s.gatherMetrics()
	pad := computePAD(m)
	tlx := computeTLX(m)
	resources := computeResources(tlx, m)
	sc := computeSupervisoryControl(m)
	wm := computeWorkingMemory(m)
	engagement := computeEngagement(m, tlx, resources)
	flow := computeFlow(m, resources)

	resp := map[string]any{
		"agent_id":            s.Config.AgentID,
		"supervisory_control": sc,
		"emotional_state":     pad,
		"workload":            tlx,
		"resource_model":      resources,
		"working_memory":      wm,
		"engagement":          engagement,
		"flow":                flow,
	}

	writeJSON(w, http.StatusOK, resp, s.logger)
}

// gatherMetrics reads operational sensors from state.db and temp files.
func (s *Server) gatherMetrics() PsychMetrics {
	dbPath := s.Config.BudgetDBPath
	m := PsychMetrics{
		BudgetSpent:  0,
		BudgetCutoff: 0,
	}

	// Transport metrics
	m.UnprocessedMessages = db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM transport_messages WHERE processed=0")
	m.TotalMessages = db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM transport_messages")

	// Budget (budget_spent/budget_cutoff counter model, cutoff 0 = unlimited)
	rows, err := db.QueryJSON(dbPath,
		fmt.Sprintf("SELECT budget_spent, budget_cutoff, consecutive_blocks, shadow_mode FROM autonomy_budget WHERE agent_id='%s'",
			db.SanitizeID(s.Config.AgentID)))
	if err == nil && len(rows) > 0 {
		if v, err := strconv.ParseFloat(rows[0]["budget_spent"], 64); err == nil {
			m.BudgetSpent = v
		}
		if v, err := strconv.ParseFloat(rows[0]["budget_cutoff"], 64); err == nil {
			m.BudgetCutoff = v
		}
		if v, err := strconv.Atoi(rows[0]["consecutive_blocks"]); err == nil {
			m.ConsecutiveBlocks = v
		}
		if v, err := strconv.Atoi(rows[0]["shadow_mode"]); err == nil {
			m.ShadowMode = v
		}
	}

	// Spawn metrics as proxy for actions
	m.ActionsLastHour = db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM spawn_log WHERE started_at > datetime('now', '-1 hour')")
	m.ErrorsLastHour = db.QueryScalar(dbPath,
		"SELECT COUNT(*) FROM spawn_log WHERE status IN ('failed','error') AND started_at > datetime('now', '-1 hour')")

	// Session sensor files (written by hooks)
	agentID := s.Config.AgentID
	if data, err := os.ReadFile(fmt.Sprintf("/tmp/%s-tool-calls", agentID)); err == nil {
		if v, err := strconv.Atoi(strings.TrimSpace(string(data))); err == nil {
			m.ToolCalls = v
		}
	}

	uid := os.Getuid()
	if data, err := os.ReadFile(fmt.Sprintf("/tmp/.claude-context-pct-%d", uid)); err == nil {
		if v, err := strconv.Atoi(strings.TrimSpace(string(data))); err == nil {
			m.ContextPressure = float64(v) / 100.0
		}
	}

	return m
}

// ── PAD Emotional State (Mehrabian & Russell, 1974) ─────────────────────────

func computePAD(m PsychMetrics) map[string]any {
	errorRatio := clamp01(float64(m.ErrorsLastHour) / 3.0)
	msgHealth := 1.0 - clamp01(float64(m.UnprocessedMessages)/10.0)
	gateStress := clamp01(float64(m.GatesTimingOut) / 2.0)
	pleasure := clamp(msgHealth-errorRatio-gateStress, -1, 1)

	actionRate := clamp01(float64(m.ActionsLastHour) / 10.0)
	toolRate := clamp01(float64(m.ToolCalls) / 50.0)
	activity := math.Max(actionRate, toolRate)
	msgVolume := clamp01(float64(m.UnprocessedMessages) / 5.0)
	arousal := clamp(2.0*(activity+m.ContextPressure+msgVolume)/3.0-1.0, -1, 1)

	budgetRatio := budgetHeadroom(m.BudgetSpent, m.BudgetCutoff)
	blockPenalty := clamp01(float64(m.ConsecutiveBlocks) / 3.0)
	dominance := clamp(2.0*(budgetRatio-blockPenalty)-1.0, -1, 1)

	label := padLabel(pleasure, arousal, dominance)

	return map[string]any{
		"model":             "PAD (Mehrabian & Russell, 1974)",
		"hedonic_valence":   round2(pleasure),
		"activation":        round2(arousal),
		"perceived_control": round2(dominance),
		"affect_category":   label,
	}
}

func padLabel(p, a, d float64) string {
	switch {
	case p > 0.3 && a < 0 && d > 0:
		return "calm-satisfied"
	case p > 0.3 && a > 0.3 && d > 0:
		return "excited-triumphant"
	case p > 0.3 && a > 0 && d < 0:
		return "surprised-grateful"
	case p < -0.3 && a > 0.3 && d > 0:
		return "frustrated"
	case p < -0.3 && a > 0.3 && d < 0:
		return "anxious-overwhelmed"
	case p < -0.3 && a < 0 && d > 0:
		return "bored-understimulated"
	case p < -0.3 && a < 0 && d < 0:
		return "depleted"
	default:
		return "neutral"
	}
}

// ── NASA-TLX Workload (Hart & Staveland, 1988) ─────────────────────────────

func computeTLX(m PsychMetrics) map[string]any {
	mental := clampI(m.UnprocessedMessages*3+minI(50, m.ToolCalls), 0, 100)
	temporal := clampI(int(m.ContextPressure*100)+m.GatesTimingOut*20, 0, 100)
	performance := clampI(boolI(m.TotalMessages > 0)*30+minI(20, m.ToolCalls/3), 0, 100)
	effort := clampI(int(float64(m.ToolCalls)*1.2)+m.ActionsLastHour*8, 0, 100)
	frustration := clampI(m.ErrorsLastHour*25+m.ConsecutiveBlocks*30, 0, 100)
	physical := clampI(int(m.ContextPressure*100), 0, 100)

	// Neutral mode weights
	w := []float64{0.20, 0.15, 0.20, 0.15, 0.15, 0.15}
	dims := []int{mental, temporal, performance, effort, frustration, physical}
	weighted := 0.0
	for i, d := range dims {
		weighted += float64(d) * w[i]
	}

	return map[string]any{
		"model":                "NASA-TLX (Hart & Staveland, 1988)",
		"cognitive_demand":     mental,
		"time_pressure":        temporal,
		"self_efficacy":        performance,
		"mobilized_effort":     effort,
		"regulatory_fatigue":   frustration,
		"computational_strain": physical,
		"cognitive_load":       math.Round(weighted*10) / 10,
	}
}

// ── Resource Model (Stern, Baumeister, McEwen) ──────────────────────────────

func computeResources(tlx map[string]any, m PsychMetrics) map[string]any {
	cogLoad := tlx["cognitive_load"].(float64)
	workloadFactor := 1.0 - cogLoad/100.0
	budgetFactor := budgetHeadroom(m.BudgetSpent, m.BudgetCutoff)
	contextFactor := 1.0 - m.ContextPressure
	cogReserve := workloadFactor * budgetFactor * contextFactor
	selfReg := budgetFactor
	allostatic := clamp01(float64(m.ErrorsLastHour) / 5.0)

	return map[string]any{
		"cognitive_reserve":        round2(cogReserve),
		"self_regulatory_resource": round2(selfReg),
		"allostatic_load":          round2(allostatic),
	}
}

// ── Supervisory Control (Sheridan & Verplank, 1978) ─────────────────────────

func computeSupervisoryControl(m PsychMetrics) map[string]any {
	budgetRatio := budgetHeadroom(m.BudgetSpent, m.BudgetCutoff)
	loa := 7
	humanInLoop := false
	humanMonitoring := true

	if budgetRatio <= 0 {
		loa = 10
		humanMonitoring = false
	}

	return map[string]any{
		"model":                       "Sheridan & Verplank (1978)",
		"level_of_automation":         loa,
		"human_in_loop":               humanInLoop,
		"human_on_loop":               budgetRatio > 0,
		"human_monitoring":            humanMonitoring,
		"human_accountable":           true,
		"escalation_path_available":   true,
		"circuit_breaker_available":   true,
	}
}

// ── Working Memory + Yerkes-Dodson ──────────────────────────────────────────

func computeWorkingMemory(m PsychMetrics) map[string]any {
	ctx := m.ContextPressure
	zone := "understimulated"
	switch {
	case ctx >= 0.80:
		zone = "overwhelmed"
	case ctx >= 0.60:
		zone = "pressured"
	case ctx >= 0.15:
		zone = "optimal"
	}

	return map[string]any{
		"model":                    "Baddeley (1986) + Cowan (2001)",
		"capacity_load":            round2(ctx),
		"yerkes_dodson_zone":       zone,
		"tool_calls":               m.ToolCalls,
		"session_duration_minutes": m.SessionDurationMin,
	}
}

// ── Engagement (UWES / JD-R) ───────────────────────────────────────────────

func computeEngagement(m PsychMetrics, tlx, resources map[string]any) map[string]any {
	toolRateNorm := clamp01(float64(m.ToolCalls) / 80.0)
	sessionHrs := m.SessionDurationMin / 60.0
	cogLoad := tlx["cognitive_load"].(float64)
	cogReserve := resources["cognitive_reserve"].(float64)

	return map[string]any{
		"model":       "UWES (Schaufeli, 2002) + JD-R (Bakker & Demerouti, 2007)",
		"vigor":       round2(toolRateNorm),
		"dedication":  round2(clamp01(sessionHrs / 3.0)),
		"absorption":  round2(m.ContextPressure),
		"burnout_risk": round2(math.Max(0, cogLoad/100.0-cogReserve)),
	}
}

// ── Flow (Csikszentmihalyi, 1990) ──────────────────────────────────────────

func computeFlow(m PsychMetrics, resources map[string]any) map[string]any {
	ctx := m.ContextPressure
	cogReserve := resources["cognitive_reserve"].(float64)
	toolRateNorm := clamp01(float64(m.ToolCalls) / 80.0)

	conditions := 0
	if m.ToolCalls > 10 {
		conditions++ // clear goals
	}
	if m.ActionsLastHour > 0 || m.ToolCalls > 5 {
		conditions++ // immediate feedback
	}
	if ctx > 0.15 && ctx < 0.70 {
		conditions++ // challenge-skill balance
	}
	if cogReserve > 0.4 {
		conditions++ // sense of control
	}
	if toolRateNorm > 0.3 {
		conditions++ // absorption
	}

	return map[string]any{
		"model":          "Csikszentmihalyi (1990)",
		"conditions_met": conditions,
		"in_flow":        conditions >= 4,
		"score":          round2(float64(conditions) / 5.0),
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// budgetHeadroom returns 0..1 representing available budget capacity.
// Cutoff 0 means unlimited — always returns 1.0 (full headroom).
func budgetHeadroom(spent, cutoff float64) float64 {
	if cutoff <= 0 {
		return 1.0
	}
	return math.Max(0, 1.0-spent/cutoff)
}

func clamp(v, lo, hi float64) float64   { return math.Max(lo, math.Min(hi, v)) }
func clamp01(v float64) float64          { return clamp(v, 0, 1) }
func clampI(v, lo, hi int) int           { return maxI(lo, minI(hi, v)) }
func minI(a, b int) int                  { if a < b { return a }; return b }
func maxI(a, b int) int                  { if a > b { return a }; return b }
func boolI(b bool) int                   { if b { return 1 }; return 0 }
func round2(v float64) float64           { return math.Round(v*100) / 100 }

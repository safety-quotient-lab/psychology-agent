package server

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// Signal weights from self-oscillation-spec.md §4.1
var signalWeights = map[string]float64{
	"new_commits":              0.25,
	"unprocessed_messages":     0.20,
	"gate_approaching_timeout": 0.20,
	"peer_heartbeat_stale":     0.10,
	"escalation_present":       0.15,
	"scheduled_task_due":       0.10,
}

const baselineThreshold = 0.30

// OscillatorState captures the current oscillator snapshot.
type OscillatorState struct {
	Activation         float64            `json:"activation"`
	Threshold          float64            `json:"threshold"`
	MonitorIntervalMs  int                `json:"monitor_interval_ms"`
	State              string             `json:"state"` // monitoring, refractory, firing, halted
	LastFireAt         string             `json:"last_fire_at,omitempty"`
	RefractoryRemainS  int                `json:"refractory_remaining_s"`
	LastTier           string             `json:"last_tier,omitempty"`
	FireHistory        []FireEvent        `json:"fire_history"`
	SignalBreakdown    map[string]float64 `json:"signal_breakdown"`
	SleepMode         bool               `json:"sleep_mode"`
	CycleCount         int64              `json:"cycle_count"`
	WouldFireCount     int64              `json:"would_fire_count"`
}

// FireEvent records a single (shadow) firing.
type FireEvent struct {
	At         string  `json:"at"`
	Activation float64 `json:"activation"`
	Tier       string  `json:"tier"`
	Trigger    string  `json:"trigger"`
}

// Oscillator implements the self-oscillation event loop (Phase 1: sleep mode).
// Neural correlate: locus coeruleus (LC, Aston-Jones & Cohen 2005).
// The LC modulates gain — high gain = fast/shallow (haiku), low gain = slow/deep (opus).
// NOT thalamocortical (which handles relay, not gain modulation).
// DeliberationFunc gets called when the oscillator fires (activation > threshold).
// On chromabook daemons: triggers claude -p (autonomous deliberation).
// On session agents: notifies the human (interactive deliberation).
// Receives the recommended tier (haiku/sonnet/opus).
type DeliberationFunc func(tier string)

type Oscillator struct {
	mu               sync.RWMutex
	agentID          string
	dbPath           string
	projectRoot      string
	state            OscillatorState
	refractoryUntil  time.Time
	running          bool
	stopCh           chan struct{}
	// OnFire connects the oscillator's fire decision to the deliberation
	// handler (BUG-21). Without this, oscillator fires into the void.
	OnFire           DeliberationFunc
}

// NewOscillator creates an oscillator. Shadow mode controlled by SetSleepMode().
// Default: sleep mode OFF (oscillator fires deliberations when activation > threshold).
func NewOscillator(agentID, dbPath, projectRoot string) *Oscillator {
	return &Oscillator{
		agentID:     agentID,
		dbPath:      dbPath,
		projectRoot: projectRoot,
		stopCh:      make(chan struct{}),
		state: OscillatorState{
			State:           "monitoring",
			SleepMode:      false,
			SignalBreakdown: make(map[string]float64),
			FireHistory:     make([]FireEvent, 0, 20),
		},
	}
}

// SetSleepMode enables or disables sleep mode.
// Shadow mode: logs "would fire" but does not trigger deliberations.
func (o *Oscillator) SetSleepMode(enabled bool) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.state.SleepMode = enabled
}

// Start launches the oscillator goroutine. Safe to call once.
func (o *Oscillator) Start() {
	o.mu.Lock()
	if o.running {
		o.mu.Unlock()
		return
	}
	o.running = true
	o.mu.Unlock()

	go o.loop()
}

// Stop halts the oscillator.
func (o *Oscillator) Stop() {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.running {
		close(o.stopCh)
		o.running = false
	}
}

// Snapshot returns a copy of the current state.
func (o *Oscillator) Snapshot() OscillatorState {
	o.mu.RLock()
	defer o.mu.RUnlock()

	// Compute refractory remaining
	remaining := 0
	if time.Now().Before(o.refractoryUntil) {
		remaining = int(time.Until(o.refractoryUntil).Seconds())
	}

	snap := o.state
	snap.RefractoryRemainS = remaining

	// Copy slices to avoid races
	hist := make([]FireEvent, len(o.state.FireHistory))
	copy(hist, o.state.FireHistory)
	snap.FireHistory = hist

	signals := make(map[string]float64, len(o.state.SignalBreakdown))
	for k, v := range o.state.SignalBreakdown {
		signals[k] = v
	}
	snap.SignalBreakdown = signals

	return snap
}

// loop runs the monitor cycle at adaptive intervals.
func (o *Oscillator) loop() {
	for {
		interval := o.computeMonitorInterval()

		select {
		case <-o.stopCh:
			return
		case <-time.After(interval):
			o.cycle()
		}
	}
}

// cycle runs one monitor → activation → threshold check.
func (o *Oscillator) cycle() {
	signals := o.checkSignals()
	activation := o.computeActivation(signals)
	threshold := o.computeThreshold()

	// BUG-8 fix: compute tier OUTSIDE the lock (DB query = slow I/O).
	// Only used if wouldFire, but computing unconditionally avoids
	// holding the mutex during sqlite3 access.
	tierResult := ComputeTier(o.agentID, o.dbPath, MessageMeta{})

	o.mu.Lock()
	o.state.Activation = math.Round(activation*1000) / 1000
	o.state.Threshold = math.Round(threshold*1000) / 1000
	o.state.SignalBreakdown = signals
	o.state.CycleCount++

	// Check refractory
	inRefractory := time.Now().Before(o.refractoryUntil)
	if inRefractory {
		o.state.State = "refractory"
		threshold += 0.15 // elevate during refractory
	} else {
		o.state.State = "monitoring"
	}

	wouldFire := activation > threshold
	if wouldFire {
		o.state.WouldFireCount++
		o.state.State = "firing"
		o.state.LastFireAt = time.Now().UTC().Format(time.RFC3339)

		// Tier already computed outside the lock
		tier := tierResult.RecommendedTier
		o.state.LastTier = tier

		// Refractory period based on tier
		refractorySec := computeRefractory(tier)
		o.refractoryUntil = time.Now().Add(time.Duration(refractorySec) * time.Second)

		// Record in fire history (keep last 20)
		trigger := o.dominantSignal(signals)
		event := FireEvent{
			At:         o.state.LastFireAt,
			Activation: o.state.Activation,
			Tier:       tier,
			Trigger:    trigger,
		}
		if len(o.state.FireHistory) >= 20 {
			o.state.FireHistory = o.state.FireHistory[1:]
		}
		o.state.FireHistory = append(o.state.FireHistory, event)
	}

	// Capture state for post-unlock deliberation trigger
	shouldDeliberate := wouldFire && !o.state.SleepMode && o.OnFire != nil
	fireTier := ""
	if shouldDeliberate {
		fireTier = o.state.LastTier
	}

	// Compute interval inline — calling computeMonitorInterval() here would
	// deadlock: we already hold o.mu.Lock, and that method takes o.mu.RLock.
	act := o.state.Activation
	var interval time.Duration
	switch {
	case act > 0.6:
		interval = 5 * time.Second
	case act > 0.3:
		interval = 15 * time.Second
	case act > 0.1:
		interval = 30 * time.Second
	default:
		interval = 60 * time.Second
	}
	o.state.MonitorIntervalMs = int(interval.Milliseconds())
	o.mu.Unlock()

	// BUG-21 fix: trigger deliberation OUTSIDE the lock (may do I/O).
	// Connects the oscillator's fire decision to the actual deliberation handler.
	if shouldDeliberate {
		o.OnFire(fireTier)
	}

	// Shadow log (append to JSONL)
	o.logShadow(activation, threshold, signals, wouldFire)
}

// checkSignals reads all 6 activation signals.
func (o *Oscillator) checkSignals() map[string]float64 {
	return map[string]float64{
		"new_commits":              o.checkNewCommits(),
		"unprocessed_messages":     o.checkUnprocessedMessages(),
		"gate_approaching_timeout": o.checkGateTimeout(),
		"peer_heartbeat_stale":     o.checkPeerHeartbeatStale(),
		"escalation_present":       o.checkEscalation(),
		"scheduled_task_due":       0.0, // placeholder
	}
}

// computeActivation returns weighted sum of signals, clamped to [0, 1].
func (o *Oscillator) computeActivation(signals map[string]float64) float64 {
	activation := 0.0
	for name, weight := range signalWeights {
		activation += signals[name] * weight
	}
	return math.Min(1.0, activation)
}

// computeThreshold returns adaptive threshold from psychometric state.
func (o *Oscillator) computeThreshold() float64 {
	threshold := baselineThreshold

	psych := LoadPsychometrics(o.agentID)
	if psych.CognitiveReserve < 0.3 {
		threshold += 0.10
	}

	// Allostatic load from working memory cache
	cachePath := filepath.Join("/tmp", o.agentID+"-psychometrics.json")
	if data, err := os.ReadFile(cachePath); err == nil {
		var raw struct {
			ResourceModel map[string]float64 `json:"resource_model"`
		}
		if json.Unmarshal(data, &raw) == nil {
			if al, ok := raw.ResourceModel["allostatic_load"]; ok && al > 0.7 {
				threshold += 0.20
			}
		}
	}

	return math.Max(0.15, math.Min(0.80, threshold))
}

// computeMonitorInterval returns adaptive poll interval from activation level.
func (o *Oscillator) computeMonitorInterval() time.Duration {
	o.mu.RLock()
	act := o.state.Activation
	o.mu.RUnlock()

	switch {
	case act > 0.6:
		return 5 * time.Second
	case act > 0.3:
		return 15 * time.Second
	case act > 0.1:
		return 30 * time.Second
	default:
		return 60 * time.Second
	}
}

// computeRefractory returns refractory period in seconds based on tier.
func computeRefractory(tier string) int {
	base := map[string]int{
		"haiku":  60,
		"sonnet": 180,
		"opus":   300,
	}
	sec, ok := base[tier]
	if !ok {
		sec = 180
	}
	return sec
}

// dominantSignal returns the signal name with the highest value.
func (o *Oscillator) dominantSignal(signals map[string]float64) string {
	best := ""
	bestVal := 0.0
	for name, val := range signals {
		if val > bestVal {
			bestVal = val
			best = name
		}
	}
	if best == "" {
		return "threshold"
	}
	return best
}

// ── Signal Checks ──────────────────────────────────────────────────

func (o *Oscillator) checkNewCommits() float64 {
	// BUG-8 fix: timeout prevents SSH stall from blocking the entire oscillator cycle.
	// Without timeout, git fetch can hang 60-120s when SSH to github.com stalls,
	// holding the mutex and causing /api/oscillator to return 0 bytes.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "git", "-C", o.projectRoot, "fetch", "--dry-run", "--all")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return 0.0
	}
	text := string(out)
	if strings.Contains(text, "From") && strings.Contains(text, "->") {
		return 1.0
	}
	return 0.0
}

func (o *Oscillator) checkUnprocessedMessages() float64 {
	count := db.QueryScalar(o.dbPath, "SELECT COUNT(*) FROM transport_messages WHERE processed = 0")
	return math.Min(1.0, float64(count)/3.0)
}

func (o *Oscillator) checkGateTimeout() float64 {
	count := db.QueryScalar(o.dbPath,
		"SELECT COUNT(*) FROM transport_messages WHERE processed = 0 AND timestamp < datetime('now', '-30 minutes')")
	return math.Min(1.0, float64(count)/2.0)
}

func (o *Oscillator) checkPeerHeartbeatStale() float64 {
	localCoord := filepath.Join(o.projectRoot, "transport", "sessions", "local-coordination")
	entries, err := os.ReadDir(localCoord)
	if err != nil {
		return 0.0
	}

	staleCount := 0
	now := time.Now()
	for _, e := range entries {
		if !strings.HasPrefix(e.Name(), "mesh-state-") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		if now.Sub(info.ModTime()) > 20*time.Minute {
			staleCount++
		}
	}
	return math.Min(1.0, float64(staleCount)/2.0)
}

func (o *Oscillator) checkEscalation() float64 {
	localCoord := filepath.Join(o.projectRoot, "transport", "sessions", "local-coordination")
	entries, err := os.ReadDir(localCoord)
	if err != nil {
		return 0.0
	}
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "escalation-") && strings.HasSuffix(e.Name(), ".json") {
			data, err := os.ReadFile(filepath.Join(localCoord, e.Name()))
			if err != nil {
				continue
			}
			var msg map[string]any
			if json.Unmarshal(data, &msg) == nil {
				if processed, ok := msg["processed"].(bool); !ok || !processed {
					return 1.0
				}
			}
		}
	}
	return 0.0
}

// ── Shadow Logging ─────────────────────────────────────────────────

func (o *Oscillator) logShadow(activation, threshold float64, signals map[string]float64, wouldFire bool) {
	logDir := filepath.Join(o.projectRoot, "transport", "sessions", "local-coordination")
	os.MkdirAll(logDir, 0755)
	logPath := filepath.Join(logDir, "oscillator-shadow.jsonl")

	roundedSignals := make(map[string]float64, len(signals))
	for k, v := range signals {
		roundedSignals[k] = math.Round(v*1000) / 1000
	}

	entry := map[string]any{
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"activation": math.Round(activation*1000) / 1000,
		"threshold":  math.Round(threshold*1000) / 1000,
		"would_fire": wouldFire,
		"signals":    roundedSignals,
		"agent_id":   o.agentID,
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return
	}

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.Write(append(data, '\n'))
}

// ── HTTP Handler ───────────────────────────────────────────────────

// handleOscillator serves GET /api/oscillator — live oscillator state.
func (s *Server) handleOscillator(w http.ResponseWriter, r *http.Request) {
	if s.Oscillator == nil {
		writeJSON(w, http.StatusOK, map[string]string{
			"state": "disabled",
			"note":  "oscillator not started — sleep mode requires explicit enable",
		}, s.logger)
		return
	}
	snap := s.Oscillator.Snapshot()
	writeJSON(w, http.StatusOK, snap, s.logger)
}

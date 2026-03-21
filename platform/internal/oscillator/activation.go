package oscillator

import (
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/heartbeat"
)

// ActivationSignals holds the raw sensor readings that feed the activation
// computer. Each signal contributes to the composite activation level.
// Derived from self-oscillation-spec.md §4.1.
type ActivationSignals struct {
	NewCommits           int  // peer remotes have new commits
	UnprocessedMessages  int  // transport messages awaiting review
	GateApproachTimeout  int  // handoffs expiring within 5 minutes
	PeerHeartbeatStale   int  // peer heartbeats older than 2x expected interval
	EscalationPresent    bool // unprocessed escalation files exist
	ScheduledTaskDue     bool // pre-planned work reached its time
}

// ActivationWeights defines how much each signal contributes.
// Sum = 1.0. From self-oscillation-spec.md §4.1.
var ActivationWeights = map[string]float64{
	"new_commits":          0.25,
	"unprocessed_messages": 0.20,
	"gate_timeout":         0.20,
	"peer_stale":           0.10,
	"escalation":           0.15,
	"scheduled_task":       0.10,
}

// ComputeActivation produces a composite activation level (0.0-1.0)
// from the raw signals. Counts normalize: 3+ items = full activation
// for that signal.
func ComputeActivation(signals ActivationSignals) float64 {
	activation := 0.0

	activation += normalizeCount(signals.NewCommits) * ActivationWeights["new_commits"]
	activation += normalizeCount(signals.UnprocessedMessages) * ActivationWeights["unprocessed_messages"]
	activation += normalizeCount(signals.GateApproachTimeout) * ActivationWeights["gate_timeout"]
	activation += normalizeCount(signals.PeerHeartbeatStale) * ActivationWeights["peer_stale"]

	if signals.EscalationPresent {
		activation += ActivationWeights["escalation"]
	}
	if signals.ScheduledTaskDue {
		activation += ActivationWeights["scheduled_task"]
	}

	if activation > 1.0 {
		return 1.0
	}
	return activation
}

// normalizeCount converts a count to 0.0-1.0 range.
// 0 = 0.0, 3+ = 1.0, linear in between.
func normalizeCount(count int) float64 {
	if count <= 0 {
		return 0.0
	}
	if count >= 3 {
		return 1.0
	}
	return float64(count) / 3.0
}

// ReadSignals queries state.db for the current activation signals.
func ReadSignals(database *db.DB, projectRoot string) ActivationSignals {
	var signals ActivationSignals

	// Unprocessed transport messages
	signals.UnprocessedMessages = database.ScalarInt(
		"SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE")

	// Gates approaching timeout (within 5 minutes)
	signals.GateApproachTimeout = database.ScalarInt(
		`SELECT COUNT(*) FROM pending_handoffs
		 WHERE status = 'waiting'
		 AND datetime(timeout_at) < datetime('now', '+5 minutes', 'localtime')`)

	// Peer heartbeat staleness
	signals.PeerHeartbeatStale = heartbeatStaleCount(projectRoot)

	// Escalation check
	signals.EscalationPresent = escalationExists(projectRoot)

	// TODO: new_commits (requires git fetch --dry-run, expensive — Phase 3 ZMQ handles this)
	// TODO: scheduled_task_due (requires task scheduler — defer to Phase 5)

	return signals
}

// CoherenceInputs holds the 7 inputs to the coherence computation.
// Coherence represents substrate integration — "how well does this agent
// function as a unified processing system?"
type CoherenceInputs struct {
	DBAccessible       bool    // state.db readable and writable
	GWTHealthy         bool    // inter-trigger broadcast functional
	OscillatorOnTime   bool    // core loop ticking on schedule
	ErrorRate5Min      float64 // 0.0-1.0 accumulated failures
	SedationActive     bool    // explicit disruption signal
	SedationResidual   float64 // 0.05 minimum during sedation (pilot light)
	PeerFieldCoherence float64 // weighted mean of connected peers' coherence
	MicrobiomeHealthy  bool    // external symbionts responsive
}

// CoherenceWeights defines the contribution of each input.
var CoherenceWeights = struct {
	DB          float64
	GWT         float64
	Oscillator  float64
	ErrorRate   float64
	Sedation    float64
	PeerField   float64
	Microbiome  float64
}{
	DB:         0.20,
	GWT:        0.15,
	Oscillator: 0.10,
	ErrorRate:  0.10,
	Sedation:   0.15,
	PeerField:  0.15,
	Microbiome: 0.15,
}

// CoherenceThreshold below which higher layers fail (oscillator suppresses
// firing, GWT stops broadcasting). Matches the sedation cascade design.
const CoherenceThreshold = 0.3

// ComputeCoherence produces a substrate coherence level (0.0-1.0).
func ComputeCoherence(inputs CoherenceInputs) float64 {
	if inputs.SedationActive {
		return inputs.SedationResidual // 0.05 minimum (pilot light)
	}

	c := 1.0
	if !inputs.DBAccessible {
		c -= CoherenceWeights.DB
	}
	if !inputs.GWTHealthy {
		c -= CoherenceWeights.GWT
	}
	if !inputs.OscillatorOnTime {
		c -= CoherenceWeights.Oscillator
	}
	c -= inputs.ErrorRate5Min * CoherenceWeights.ErrorRate
	c -= (1.0 - inputs.PeerFieldCoherence) * CoherenceWeights.PeerField
	if !inputs.MicrobiomeHealthy {
		c -= CoherenceWeights.Microbiome
	}

	if c < 0.0 {
		return 0.0
	}
	return c
}

// heartbeatStaleCount returns how many peers have stale heartbeats.
func heartbeatStaleCount(projectRoot string) int {
	return heartbeat.StaleCount(projectRoot)
}

// escalationExists checks for unprocessed escalation files.
func escalationExists(projectRoot string) bool {
	dir := filepath.Join(projectRoot, "transport", "sessions", "local-coordination")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "escalation-") && strings.HasSuffix(entry.Name(), ".json") {
			return true
		}
	}
	return false
}

// EmissionInterval returns the tonic photonic emission interval for the
// current agent state. Grounded in EEG dominant frequency bands.
func EmissionInterval(state AgentState) time.Duration {
	switch state {
	case StateActive:
		return 2 * time.Second // alpha-theta ~0.5Hz
	case StateDMN:
		return 3 * time.Second // theta ~0.33Hz
	case StateSleep:
		return 5 * time.Second // delta ~0.2Hz (NREM); 3s during REM
	case StateSedated:
		return 30 * time.Second // sub-delta ~0.03Hz (pilot light)
	default:
		return 5 * time.Second
	}
}

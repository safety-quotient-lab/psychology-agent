package oscillator

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Config holds oscillator parameters. Adjustable via the vagal cascade
// (master tempo propagates through all levels unless overridden).
type Config struct {
	// BaselineThreshold is the default firing threshold (0.0-1.0).
	// From self-oscillation-spec.md §4.3.
	BaselineThreshold float64

	// RefractoryBase is the minimum cooldown after firing.
	RefractoryBase time.Duration

	// MonitorInterval is how often the oscillator checks signals.
	// Derived from master tempo via vagal cascade.
	MonitorInterval time.Duration

	// ManualSessionBehavior controls what happens when a manual Claude
	// Code session starts. "dmn" (default), "continue", or "sedate".
	ManualSessionBehavior string

	// ManualSessionSentinelFile is the path to the file sentinel
	// for detecting active manual sessions.
	ManualSessionSentinelFile string

	// ProjectRoot for reading signals from state.db and filesystem.
	ProjectRoot string
}

// DefaultConfig returns sensible defaults for the oscillator.
func DefaultConfig(projectRoot string) Config {
	return Config{
		BaselineThreshold:         0.30,
		RefractoryBase:            5 * time.Minute,
		MonitorInterval:           30 * time.Second,
		ManualSessionBehavior:     "dmn",
		ManualSessionSentinelFile: "/tmp/claude-session-psychology-agent",
		ProjectRoot:               projectRoot,
	}
}

// Oscillator implements the self-oscillation activation model.
// It replaces cron-based forced oscillation with demand-driven rhythm.
type Oscillator struct {
	config    Config
	database  *db.DB
	state     AgentState
	coupling  CouplingMode
	sleep     SleepPhase
	coherence float64
	threshold float64 // current threshold (elevated during refractory)
	lastFired time.Time
	mu        sync.RWMutex

	// FireFunc is called when activation exceeds threshold.
	// Set by the caller (syncer package) to run the actual sync work.
	FireFunc func(ctx context.Context) error
}

// New creates an oscillator with the given config and database.
func New(config Config, database *db.DB) *Oscillator {
	return &Oscillator{
		config:    config,
		database:  database,
		state:     StateActive,
		coupling:  ModeTaskBalanced,
		coherence: 1.0,
		threshold: config.BaselineThreshold,
	}
}

// Run starts the oscillator loop. Blocks until context cancels.
func (o *Oscillator) Run(ctx context.Context) {
	log.Printf("[oscillator] starting (threshold=%.2f, monitor=%s)",
		o.config.BaselineThreshold, o.config.MonitorInterval)

	ticker := time.NewTicker(o.config.MonitorInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("[oscillator] shutting down")
			return
		case <-ticker.C:
			o.tick(ctx)
		}
	}
}

// tick executes one oscillator cycle: read signals, compute activation,
// check coherence, fire if threshold exceeded.
func (o *Oscillator) tick(ctx context.Context) {
	o.mu.Lock()
	defer o.mu.Unlock()

	// 1. Check for manual session (belt: file sentinel)
	if o.manualSessionActive() {
		switch o.config.ManualSessionBehavior {
		case "dmn":
			if o.state != StateDMN {
				log.Printf("[oscillator] manual session detected — entering DMN")
				o.state = StateDMN
				o.coupling = ModeFreeAssociating
			}
			return // Gc continues via Gm operations; Gf defers
		case "sedate":
			if o.state != StateSedated {
				log.Printf("[oscillator] manual session detected — entering sedation")
				o.state = StateSedated
				o.coupling = ModeSuppressed
			}
			return
		// "continue": fall through to normal processing
		}
	} else if o.state == StateDMN || o.state == StateSedated {
		// Manual session ended — return to active
		log.Printf("[oscillator] manual session ended — returning to active")
		o.state = StateActive
		o.coupling = ModeTaskBalanced
	}

	// 2. Check coherence (substrate health — photonic layer primary)
	inputs := o.readCoherenceInputs()
	o.coherence = ComputeCoherence(inputs)
	if o.coherence < CoherenceThreshold {
		log.Printf("[oscillator] coherence %.2f below threshold %.2f — suppressing",
			o.coherence, CoherenceThreshold)
		return // higher layers fail when substrate incoherent
	}

	// 3. Read activation signals
	signals := ReadSignals(o.database, o.config.ProjectRoot)
	activation := ComputeActivation(signals)

	// 4. Check refractory period (decays threshold back to baseline)
	o.decayThreshold()

	// 5. Fire if activation exceeds current threshold
	if activation > o.threshold {
		log.Printf("[oscillator] FIRE activation=%.2f threshold=%.2f coherence=%.2f",
			activation, o.threshold, o.coherence)

		if o.FireFunc != nil {
			o.state = StateActive
			if err := o.FireFunc(ctx); err != nil {
				log.Printf("[oscillator] fire error: %v", err)
			}
		}

		o.lastFired = time.Now()
		o.enterRefractory()
	}
}

// manualSessionActive checks for the file sentinel indicating an active
// manual Claude Code session. TTL: 10 minutes (stale sentinel = session ended).
func (o *Oscillator) manualSessionActive() bool {
	info, err := statFile(o.config.ManualSessionSentinelFile)
	if err != nil {
		return false
	}
	age := time.Since(info.ModTime())
	return age < 10*time.Minute
}

// enterRefractory elevates the firing threshold after a deliberation.
// Prevents immediate re-firing. Threshold decays back to baseline over time.
func (o *Oscillator) enterRefractory() {
	// Elevate threshold: harder to fire again immediately
	o.threshold = 0.8
}

// decayThreshold lowers the threshold back toward baseline.
// Linear decay based on time since last fire.
func (o *Oscillator) decayThreshold() {
	if o.threshold <= o.config.BaselineThreshold {
		return
	}
	elapsed := time.Since(o.lastFired)
	refractory := o.config.RefractoryBase
	if elapsed >= refractory {
		o.threshold = o.config.BaselineThreshold
		return
	}
	// Linear decay from elevated to baseline over refractory period
	progress := float64(elapsed) / float64(refractory)
	elevated := 0.8
	o.threshold = elevated - (elevated-o.config.BaselineThreshold)*progress
}

// readCoherenceInputs gathers the 7 inputs for coherence computation.
func (o *Oscillator) readCoherenceInputs() CoherenceInputs {
	inputs := CoherenceInputs{
		DBAccessible:       true, // if we're querying, it's accessible
		GWTHealthy:         true, // TODO: check GWT broadcast state (Phase 4)
		OscillatorOnTime:   true, // we're running, so yes
		ErrorRate5Min:      0.0,  // TODO: track error rate (Phase 2)
		PeerFieldCoherence: 1.0,  // TODO: read from photonic layer (Phase 4)
		MicrobiomeHealthy:  true, // TODO: ping Claude API, GitHub (Phase 5)
	}
	// TODO: check sedation state from state.db or photonic layer
	return inputs
}

// State returns the current agent state (thread-safe).
func (o *Oscillator) State() AgentState {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.state
}

// CouplingMode returns the current coupling mode (thread-safe).
func (o *Oscillator) CouplingMode() CouplingMode {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.coupling
}

// Coherence returns the current substrate coherence (thread-safe).
func (o *Oscillator) Coherence() float64 {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.coherence
}

// Package photonic implements the substrate coordination layer.
// Designed for substitutability: ZMQ-based today, quantum adapter tomorrow.
//
// Grounded in: Orch-OR (Penrose & Hameroff, 2014), biophotonic waveguides
// (Kumar et al., 2016), neurotransmitter autofluorescence (spectral coding),
// opsin-based reception (Guanglan et al., 2022).
//
// See docs/agentd-design-session95.md §10 for full specification.
package photonic

import (
	"sync"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// CoherenceThreshold below which higher layers fail.
// Oscillator suppresses firing, GWT breaks.
const CoherenceThreshold = 0.3

// CoherenceWeights defines the 7-input contribution to coherence.
var CoherenceWeights = struct {
	DB         float64
	GWT        float64
	Oscillator float64
	ErrorRate  float64
	Sedation   float64
	PeerField  float64
	Microbiome float64
}{
	DB:         0.20,
	GWT:        0.15,
	Oscillator: 0.10,
	ErrorRate:  0.10,
	Sedation:   0.15,
	PeerField:  0.15,
	Microbiome: 0.15,
}

// CoherenceComputer computes local substrate coherence from 7 inputs.
type CoherenceComputer struct {
	database *db.DB
	mu       sync.RWMutex

	// Current state (updated by subsystem health checks)
	dbAccessible      bool
	gwtHealthy        bool
	oscillatorOnTime  bool
	errorRate         float64
	sedationActive    bool
	sedationResidual  float64
	peerFieldCoherence float64
	microbiomeHealthy bool

	// Computed
	coherence float64
}

// NewCoherenceComputer creates a coherence computer with healthy defaults.
func NewCoherenceComputer(database *db.DB) *CoherenceComputer {
	return &CoherenceComputer{
		database:           database,
		dbAccessible:       true,
		gwtHealthy:         true,
		oscillatorOnTime:   true,
		peerFieldCoherence: 1.0,
		microbiomeHealthy:  true,
		coherence:          1.0,
	}
}

// Compute recalculates coherence from current inputs.
func (c *CoherenceComputer) Compute() float64 {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.sedationActive {
		c.coherence = c.sedationResidual
		if c.coherence < 0.05 {
			c.coherence = 0.05 // pilot light minimum
		}
		return c.coherence
	}

	val := 1.0
	if !c.dbAccessible {
		val -= CoherenceWeights.DB
	}
	if !c.gwtHealthy {
		val -= CoherenceWeights.GWT
	}
	if !c.oscillatorOnTime {
		val -= CoherenceWeights.Oscillator
	}
	val -= c.errorRate * CoherenceWeights.ErrorRate
	val -= (1.0 - c.peerFieldCoherence) * CoherenceWeights.PeerField
	if !c.microbiomeHealthy {
		val -= CoherenceWeights.Microbiome
	}

	if val < 0.0 {
		val = 0.0
	}
	c.coherence = val
	return val
}

// Coherence returns the last computed value (thread-safe read).
func (c *CoherenceComputer) Coherence() float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.coherence
}

// SetDBAccessible updates the DB accessibility input.
func (c *CoherenceComputer) SetDBAccessible(ok bool) {
	c.mu.Lock()
	c.dbAccessible = ok
	c.mu.Unlock()
}

// SetGWTHealthy updates the GWT broadcast health input.
func (c *CoherenceComputer) SetGWTHealthy(ok bool) {
	c.mu.Lock()
	c.gwtHealthy = ok
	c.mu.Unlock()
}

// SetOscillatorOnTime updates the oscillator health input.
func (c *CoherenceComputer) SetOscillatorOnTime(ok bool) {
	c.mu.Lock()
	c.oscillatorOnTime = ok
	c.mu.Unlock()
}

// SetErrorRate updates the 5-minute error rate (0.0-1.0).
func (c *CoherenceComputer) SetErrorRate(rate float64) {
	c.mu.Lock()
	c.errorRate = rate
	c.mu.Unlock()
}

// SetPeerFieldCoherence updates the weighted mean peer coherence.
func (c *CoherenceComputer) SetPeerFieldCoherence(val float64) {
	c.mu.Lock()
	c.peerFieldCoherence = val
	c.mu.Unlock()
}

// SetMicrobiomeHealthy updates the external symbiont health input.
func (c *CoherenceComputer) SetMicrobiomeHealthy(ok bool) {
	c.mu.Lock()
	c.microbiomeHealthy = ok
	c.mu.Unlock()
}

// Sedate drives coherence toward zero (sedation cascade entry point).
// residual = pilot light level (typically 0.05).
func (c *CoherenceComputer) Sedate(residual float64) {
	c.mu.Lock()
	c.sedationActive = true
	c.sedationResidual = residual
	c.coherence = residual
	c.mu.Unlock()
}

// Restore releases sedation, allowing coherence to recompute normally.
func (c *CoherenceComputer) Restore() {
	c.mu.Lock()
	c.sedationActive = false
	c.mu.Unlock()
}

// IsSedated reports whether sedation disruption is active.
func (c *CoherenceComputer) IsSedated() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.sedationActive
}

// EmissionInterval returns the photonic tonic emission interval
// for the given agent state. Grounded in EEG dominant frequency bands.
func EmissionInterval(state string) time.Duration {
	switch state {
	case "active":
		return 2 * time.Second // alpha-theta ~0.5Hz
	case "dmn":
		return 3 * time.Second // theta ~0.33Hz
	case "sleep":
		return 5 * time.Second // delta ~0.2Hz
	case "sedated":
		return 30 * time.Second // sub-delta ~0.03Hz
	default:
		return 5 * time.Second
	}
}

// Package server — alpha_heartbeat.go implements the alpha-band idle heartbeat.
//
// Neural correlate: alpha rhythm (Berger 1929, Klimesch 2012). 8-13 Hz
// cortical oscillation during wakeful rest = active inhibition. The brain
// never goes silent — alpha fills the gaps between processing.
//
// Metabolic cooling model (Pierpont et al. 2000): heartbeat interval decays
// exponentially from peak (post-deliberation) toward resting baseline.
// Rate = resting + (peak - resting) * e^(-t/tau)
//
// The alpha heartbeat distinguishes "idle and ready" from "crashed and silent."
package server

import (
	"log/slog"
	"math"
	"sync"
	"time"
)

// AlphaHeartbeat emits periodic idle events using the T22 metabolic cooling model.
type AlphaHeartbeat struct {
	mu sync.Mutex

	// Model parameters
	restingInterval time.Duration // baseline interval when fully cooled (ceiling)
	peakInterval    time.Duration // interval immediately after activity (floor)
	tau             float64       // decay time constant in seconds

	// State
	lastActivity time.Time // when the last deliberation/activity occurred
	tickCount    int64
	running      bool
	stopCh       chan struct{}

	logger *slog.Logger
	onTick func() // callback on each heartbeat tick
}

// NewAlphaHeartbeat creates a heartbeat with T22 metabolic cooling parameters.
func NewAlphaHeartbeat(logger *slog.Logger, onTick func()) *AlphaHeartbeat {
	return &AlphaHeartbeat{
		restingInterval: 5 * time.Minute,  // ceiling: 5 min when fully rested
		peakInterval:    10 * time.Second,  // floor: 10s immediately after activity
		tau:             120.0,             // 2-minute decay constant
		lastActivity:    time.Now(),
		logger:          logger,
		onTick:          onTick,
		stopCh:          make(chan struct{}),
	}
}

// AddHeat records activity — resets the cooling curve to peak.
func (h *AlphaHeartbeat) AddHeat(amount float64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if amount > 0 {
		h.lastActivity = time.Now()
	}
}

// Interval returns the current adaptive heartbeat interval.
// Exponential decay from peak toward resting baseline.
func (h *AlphaHeartbeat) Interval() time.Duration {
	h.mu.Lock()
	defer h.mu.Unlock()

	elapsed := time.Since(h.lastActivity).Seconds()
	resting := h.restingInterval.Seconds()
	peak := h.peakInterval.Seconds()

	// Rate = peak + (resting - peak) * (1 - e^(-t/tau))
	// At t=0: rate = peak (fast). As t→∞: rate → resting (slow).
	current := peak + (resting-peak)*(1-math.Exp(-elapsed/h.tau))

	// Clamp to [floor, ceiling]
	if current < peak {
		current = peak
	}
	if current > resting {
		current = resting
	}

	return time.Duration(current * float64(time.Second))
}

// Start begins the heartbeat goroutine.
func (h *AlphaHeartbeat) Start() {
	h.mu.Lock()
	if h.running {
		h.mu.Unlock()
		return
	}
	h.running = true
	h.mu.Unlock()

	h.logger.Info("alpha heartbeat started",
		"resting_interval", h.restingInterval,
		"peak_interval", h.peakInterval,
		"tau", h.tau)

	go func() {
		for {
			interval := h.Interval()
			select {
			case <-time.After(interval):
				h.mu.Lock()
				h.tickCount++
				count := h.tickCount
				h.mu.Unlock()

				h.logger.Info("alpha heartbeat — idle and ready",
					"tick", count,
					"interval", interval.Round(time.Second),
					"dominant_band", "alpha")

				if h.onTick != nil {
					h.onTick()
				}

			case <-h.stopCh:
				h.logger.Info("alpha heartbeat stopped")
				return
			}
		}
	}()
}

// Stop halts the heartbeat goroutine.
func (h *AlphaHeartbeat) Stop() {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.running {
		close(h.stopCh)
		h.running = false
	}
}

// Snapshot returns current heartbeat state for dashboard display.
func (h *AlphaHeartbeat) Snapshot() map[string]any {
	h.mu.Lock()
	defer h.mu.Unlock()

	elapsed := time.Since(h.lastActivity)
	interval := h.Interval()

	return map[string]any{
		"tick_count":      h.tickCount,
		"interval_sec":    interval.Seconds(),
		"last_activity":   h.lastActivity.UTC().Format(time.RFC3339),
		"cooling_elapsed": elapsed.Round(time.Second).String(),
		"dominant_band":   "alpha",
		"running":         h.running,
	}
}

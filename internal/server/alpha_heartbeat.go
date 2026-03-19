// Package server — alpha_heartbeat.go implements the alpha-band idle heartbeat.
//
// Neural correlate: alpha rhythm (Berger 1929, Klimesch 2012).
// Metabolic cooling model (Pierpont et al. 2000).
package server

import (
	"log/slog"
	"math"
	"sync/atomic"
	"time"
)

// AlphaHeartbeat emits periodic idle events using the T22 metabolic cooling model.
// Uses atomic operations instead of mutexes — no lock contention possible.
type AlphaHeartbeat struct {
	// Model parameters (immutable after construction)
	restingInterval float64 // seconds — ceiling
	peakInterval    float64 // seconds — floor
	tau             float64 // decay time constant in seconds

	// Atomic state — no mutex needed
	lastActivityNano atomic.Int64
	tickCount        atomic.Int64
	running          atomic.Bool
	stopCh           chan struct{}

	logger *slog.Logger
	onTick func()
}

// NewAlphaHeartbeat creates a heartbeat with T22 metabolic cooling parameters.
func NewAlphaHeartbeat(logger *slog.Logger, onTick func()) *AlphaHeartbeat {
	h := &AlphaHeartbeat{
		restingInterval: 300, // 5 min ceiling
		peakInterval:    10,  // 10s floor
		tau:             120, // 2-min decay
		logger:          logger,
		onTick:          onTick,
		stopCh:          make(chan struct{}),
	}
	h.lastActivityNano.Store(time.Now().UnixNano())
	return h
}

// AddHeat records activity — resets the cooling curve to peak.
func (h *AlphaHeartbeat) AddHeat(amount float64) {
	if amount > 0 {
		h.lastActivityNano.Store(time.Now().UnixNano())
	}
}

// interval returns the current adaptive heartbeat interval in seconds.
func (h *AlphaHeartbeat) interval() float64 {
	elapsed := float64(time.Now().UnixNano()-h.lastActivityNano.Load()) / 1e9
	current := h.peakInterval + (h.restingInterval-h.peakInterval)*(1-math.Exp(-elapsed/h.tau))
	if current < h.peakInterval {
		return h.peakInterval
	}
	if current > h.restingInterval {
		return h.restingInterval
	}
	return current
}

// Start begins the heartbeat goroutine.
func (h *AlphaHeartbeat) Start() {
	if h.running.Swap(true) {
		return // already running
	}
	h.logger.Info("alpha heartbeat started",
		"resting_sec", h.restingInterval,
		"peak_sec", h.peakInterval,
		"tau", h.tau)

	go func() {
		for {
			intervalSec := h.interval()
			select {
			case <-time.After(time.Duration(intervalSec * float64(time.Second))):
				count := h.tickCount.Add(1)
				h.logger.Info("alpha heartbeat — idle and ready",
					"tick", count,
					"interval_sec", int(intervalSec),
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
	if h.running.Swap(false) {
		close(h.stopCh)
	}
}

// Snapshot returns current heartbeat state for dashboard display.
// Lock-free — uses only atomic reads.
func (h *AlphaHeartbeat) Snapshot() map[string]any {
	lastNano := h.lastActivityNano.Load()
	lastActivity := time.Unix(0, lastNano)
	elapsed := time.Since(lastActivity)
	intervalSec := h.interval()

	return map[string]any{
		"tick_count":      h.tickCount.Load(),
		"interval_sec":    intervalSec,
		"last_activity":   lastActivity.UTC().Format(time.RFC3339),
		"cooling_elapsed": elapsed.Round(time.Second).String(),
		"dominant_band":   "alpha",
		"running":         h.running.Load(),
	}
}

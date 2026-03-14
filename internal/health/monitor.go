// Package health provides self-healing health monitoring for meshd subsystems.
// The Monitor tracks subsystem health, triggers corrective actions on failure,
// and exposes a summary suitable for load-balancer probes and dashboard display.
package health

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

// checkInterval controls how often the Monitor polls all registered subsystems.
const checkInterval = 15 * time.Second

// Status represents the health state of a subsystem.
type Status int

const (
	// Healthy — the subsystem operates within normal parameters.
	Healthy Status = iota
	// Degraded — the subsystem functions but exhibits reduced capacity or
	// elevated error rates.
	Degraded
	// Failed — the subsystem stopped functioning and requires intervention
	// (automatic or manual).
	Failed
)

// String returns a human-readable label for the status.
func (s Status) String() string {
	switch s {
	case Healthy:
		return "healthy"
	case Degraded:
		return "degraded"
	case Failed:
		return "failed"
	default:
		return "unknown"
	}
}

// MarshalJSON encodes Status as a JSON string.
func (s Status) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

// Subsystem holds the current health snapshot for one monitored component.
type Subsystem struct {
	Name      string    `json:"name"`
	Status    Status    `json:"status"`
	Message   string    `json:"message"`
	LastCheck time.Time `json:"last_check"`
	FailCount int       `json:"fail_count"`
}

// Checkable defines the interface that every monitored subsystem must satisfy.
// HealthCheck returns the current status and a descriptive message.
type Checkable interface {
	HealthCheck() (Status, string)
}

// ObservationFunc receives health check results for persistence (dual-write).
type ObservationFunc func(agentID, checkType, status, detail string)

// Monitor coordinates periodic health checks across all registered subsystems
// and invokes self-healing functions when a subsystem enters a non-healthy state.
type Monitor struct {
	subsystems map[string]*Subsystem
	checkers   map[string]Checkable
	healFuncs  map[string]func() error
	OnObserve  ObservationFunc // called after each health check for persistence
	mu         sync.RWMutex
	logger     *slog.Logger
}

// NewMonitor constructs a Monitor with the given logger.
func NewMonitor(logger *slog.Logger) *Monitor {
	return &Monitor{
		subsystems: make(map[string]*Subsystem),
		checkers:   make(map[string]Checkable),
		healFuncs:  make(map[string]func() error),
		logger:     logger,
	}
}

// Register adds a subsystem to the monitor. The checker provides health status;
// the healer (may equal nil) attempts corrective action when the subsystem
// reports Degraded or Failed.
func (m *Monitor) Register(name string, checker Checkable, healer func() error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.subsystems[name] = &Subsystem{
		Name:   name,
		Status: Healthy,
	}
	m.checkers[name] = checker
	if healer != nil {
		m.healFuncs[name] = healer
	}

	m.logger.Info("registered subsystem for health monitoring",
		"subsystem", name,
		"has_healer", healer != nil,
	)
}

// Check runs health checks on every registered subsystem, triggers healing
// for any that report Degraded or Failed, and logs all state transitions.
func (m *Monitor) Check() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for name, checker := range m.checkers {
		status, msg := checker.HealthCheck()
		sub := m.subsystems[name]
		prev := sub.Status

		sub.Status = status
		sub.Message = msg
		sub.LastCheck = time.Now()

		// Track consecutive failures.
		if status == Failed {
			sub.FailCount++
		} else if status == Healthy {
			sub.FailCount = 0
		}

		// Log state transitions.
		if status != prev {
			m.logger.Warn("subsystem health changed",
				"subsystem", name,
				"previous", prev.String(),
				"current", status.String(),
				"message", msg,
				"fail_count", sub.FailCount,
			)
		}

		// Dual-write: persist observation to state.db
		if m.OnObserve != nil && (status != prev || status != Healthy) {
			m.OnObserve("", name, status.String(), msg)
		}

		// Attempt self-healing when the subsystem deviates from Healthy.
		if status != Healthy {
			m.attemptHeal(name)
		}
	}
}

// attemptHeal invokes the registered healing function for the named subsystem.
// Caller must hold m.mu.
func (m *Monitor) attemptHeal(name string) {
	healer, ok := m.healFuncs[name]
	if !ok {
		m.logger.Debug("no healer registered; skipping self-heal",
			"subsystem", name,
		)
		return
	}

	m.logger.Info("attempting self-heal",
		"subsystem", name,
		"status", m.subsystems[name].Status.String(),
		"fail_count", m.subsystems[name].FailCount,
	)

	if err := healer(); err != nil {
		m.logger.Error("self-heal attempt failed",
			"subsystem", name,
			"error", err,
		)
		return
	}

	m.logger.Info("self-heal attempt completed successfully",
		"subsystem", name,
	)
}

// Summary returns a snapshot of every registered subsystem's health.
// The returned map copies each Subsystem value to avoid data races.
func (m *Monitor) Summary() map[string]*Subsystem {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := make(map[string]*Subsystem, len(m.subsystems))
	for k, v := range m.subsystems {
		cp := *v
		out[k] = &cp
	}
	return out
}

// OverallStatus returns the worst status across all registered subsystems.
// An empty monitor returns Healthy.
func (m *Monitor) OverallStatus() Status {
	m.mu.RLock()
	defer m.mu.RUnlock()

	worst := Healthy
	for _, sub := range m.subsystems {
		if sub.Status > worst {
			worst = sub.Status
		}
	}
	return worst
}

// Run starts the periodic health-check loop. It blocks until ctx cancels.
func (m *Monitor) Run(ctx context.Context) {
	m.logger.Info("health monitor started", "interval", checkInterval.String())
	ticker := time.NewTicker(checkInterval)
	defer ticker.Stop()

	// Run an initial check immediately.
	m.Check()

	for {
		select {
		case <-ctx.Done():
			m.logger.Info("health monitor stopped")
			return
		case <-ticker.C:
			m.Check()
		}
	}
}

// HTTPHandler returns an http.HandlerFunc that renders the health summary
// as JSON. Load balancers and systemd probes can poll this endpoint.
//
// Response codes:
//   - 200 when all subsystems report Healthy
//   - 503 when any subsystem reports Degraded or Failed
func (m *Monitor) HTTPHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		overall := m.OverallStatus()
		summary := m.Summary()

		resp := struct {
			Status     string                `json:"status"`
			Subsystems map[string]*Subsystem `json:"subsystems"`
		}{
			Status:     overall.String(),
			Subsystems: summary,
		}

		w.Header().Set("Content-Type", "application/json")

		if overall != Healthy {
			w.WriteHeader(http.StatusServiceUnavailable)
		}

		if err := json.NewEncoder(w).Encode(resp); err != nil {
			m.logger.Error("failed to encode health response", "error", err)
		}
	}
}

// --- Built-in self-healing strategies ---

// DrainLowPriorityHealer returns a healer that calls the provided drain
// function to shed low-priority events from a full queue.
func DrainLowPriorityHealer(drain func() error) func() error {
	return func() error {
		return drain()
	}
}

// CooldownHealer returns a healer that logs a warning and waits for the
// specified cooldown duration before returning. Suitable for circuit-breaker
// recovery (e.g., spawner circuit open).
func CooldownHealer(logger *slog.Logger, name string, cooldown time.Duration) func() error {
	return func() error {
		logger.Warn("entering cooldown period",
			"subsystem", name,
			"cooldown", cooldown.String(),
		)
		time.Sleep(cooldown)
		return nil
	}
}

// RestartHealer returns a healer that invokes the provided restart function.
// Suitable for subsystems that support stop-then-start recovery (e.g.,
// transport watcher).
func RestartHealer(restart func() error) func() error {
	return func() error {
		return restart()
	}
}

// ExponentialBackoffHealer returns a healer that retries the provided probe
// function with exponential backoff (1s, 2s, 4s, …) up to maxDelay per
// attempt and maxAttempts total tries. Suitable for transient connectivity
// failures (e.g., budget DB unreachable).
func ExponentialBackoffHealer(probe func() error, maxDelay time.Duration, maxAttempts int) func() error {
	return func() error {
		delay := time.Second
		for attempt := 1; attempt <= maxAttempts; attempt++ {
			if err := probe(); err == nil {
				return nil
			}
			if attempt == maxAttempts {
				return fmt.Errorf("exhausted %d backoff attempts", maxAttempts)
			}
			time.Sleep(delay)
			delay *= 2
			if delay > maxDelay {
				delay = maxDelay
			}
		}
		return nil
	}
}

// RateLimitWindowHealer returns a healer that temporarily increases the
// rate-limit window by calling the provided adjuster. Suitable for webhook
// handlers experiencing upstream rate limiting.
func RateLimitWindowHealer(adjust func() error) func() error {
	return func() error {
		return adjust()
	}
}

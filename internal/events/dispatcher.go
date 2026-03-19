// Package events — Dispatcher routes individual events through budget gating
// and triggers Claude deliberations. The main loop calls HandleEvent for each
// event popped from the PriorityQueue.
//
// Neural correlate: Thalamic Reticular Nucleus (TRN, Crick 1984; Pinault 2004).
// The TRN selectively gates which sensory signals reach cortex based on
// attentional focus. The dispatcher gates which events reach the spawner
// based on Gc classification + budget state.
package events

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
)

// DeliberationRequest describes what the dispatcher wants the deliberator to execute.
type DeliberationRequest struct {
	Prompt   string
	Flags    []string
	Cost     int
	Event    Event
	Priority Priority
}

// DeliberateFunc accepts a deliberation request and returns an error.
type DeliberateFunc func(ctx context.Context, req DeliberationRequest) error

// BudgetCheckFunc returns (canDeliberate, reason) for a given cost.
type BudgetCheckFunc func(cost int) (bool, string)

// BudgetDeductFunc debits the budget after a successful deliberation decision.
type BudgetDeductFunc func(cost int) error

// NotifyFunc sends a notification when the budget gate blocks a deliberation.
// The dispatcher calls this so human operators learn about pending work.
type NotifyFunc func(ctx context.Context, agentID, eventType, priority, reason, session string) error

// GcHandlerFunc handles an event using crystallized intelligence (Go code,
// no LLM deliberation). Returns true if handled — dispatcher skips the deliberation.
// Returns false if the event requires fluid intelligence (Claude deliberation).
type GcHandlerFunc func(ctx context.Context, evt Event) bool

// TypeMetrics tracks per-event-type counters for observability.
type TypeMetrics struct {
	Total                int `json:"total"`
	GcHandled            int `json:"gc_handled"`
	DeliberationBlocked  int `json:"deliberation_blocked"`
	DeliberationSucceeded int `json:"deliberation_succeeded"`
}

// Dispatcher evaluates individual events, applies budget gating,
// and dispatches deliberation requests.
type Dispatcher struct {
	deliberate   DeliberateFunc
	gcHandler    GcHandlerFunc // optional — Gc layer intercepts routine events
	budgetCheck  BudgetCheckFunc
	budgetDeduct BudgetDeductFunc
	notify       NotifyFunc
	agentID      string
	queue        *Queue
	logger       *slog.Logger

	// Metrics
	dispatched  int64
	dropped     int64
	notified    int64
	batched     int64
	typeMetrics map[EventType]*TypeMetrics
	mu          sync.RWMutex
}

// NewDispatcher creates a dispatcher wired to the given queue and deliberation function.
func NewDispatcher(
	queue *Queue,
	deliberateFn DeliberateFunc,
	budgetCheck BudgetCheckFunc,
	budgetDeduct BudgetDeductFunc,
	logger *slog.Logger,
) *Dispatcher {
	return &Dispatcher{
		queue:        queue,
		deliberate:   deliberateFn,
		budgetCheck:  budgetCheck,
		budgetDeduct: budgetDeduct,
		notify:       func(_ context.Context, _, _, _, _, _ string) error { return nil },
		logger:       logger,
		typeMetrics:  make(map[EventType]*TypeMetrics),
	}
}

// SetNotifier configures the notification callback for blocked deliberations.
func (d *Dispatcher) SetNotifier(agentID string, fn NotifyFunc) {
	d.agentID = agentID
	d.notify = fn
}

// SetGcHandler configures the crystallized intelligence handler.
// Events handled by Gc skip the Claude deliberation entirely.
func (d *Dispatcher) SetGcHandler(fn GcHandlerFunc) {
	d.gcHandler = fn
}

// getTypeMetrics returns the TypeMetrics for the given event type,
// creating it on first access. Caller must hold d.mu (write lock).
func (d *Dispatcher) getTypeMetrics(t EventType) *TypeMetrics {
	m, ok := d.typeMetrics[t]
	if !ok {
		m = &TypeMetrics{}
		d.typeMetrics[t] = m
	}
	return m
}

// HandleEvent processes a single event — tries Gc first, then budget gate + deliberation.
func (d *Dispatcher) HandleEvent(ctx context.Context, evt Event) {
	d.logger.Info("dispatching event",
		"type", evt.Type,
		"priority", evt.Priority.String(),
		"source", evt.Source,
		"id", evt.ID,
	)

	// Gc layer — try crystallized intelligence first (no LLM cost)
	if d.gcHandler != nil && d.gcHandler(ctx, evt) {
		d.logger.Info("event handled by Gc layer (no deliberation)",
			"type", evt.Type,
			"id", evt.ID,
		)
		d.mu.Lock()
		d.batched++ // reuse batched counter for Gc-handled events
		tm := d.getTypeMetrics(evt.Type)
		tm.Total++
		tm.GcHandled++
		d.mu.Unlock()
		return
	}

	cost := estimateCost(evt.Priority)
	allowed, reason := d.budgetCheck(cost)

	if !allowed {
		d.logger.Warn("deliberation blocked by budget gate",
			"event_id", evt.ID,
			"type", evt.Type,
			"cost", cost,
			"reason", reason,
		)
		d.mu.Lock()
		d.dropped++
		tm := d.getTypeMetrics(evt.Type)
		tm.Total++
		tm.DeliberationBlocked++
		d.mu.Unlock()

		// Notify the operator about the blocked event
		session := evt.Payload["session"]
		if session == "" {
			session = evt.Payload["path"]
		}
		if err := d.notify(ctx, d.agentID, string(evt.Type), evt.Priority.String(), reason, session); err != nil {
			d.logger.Warn("notification delivery failed", "error", err)
		} else {
			d.mu.Lock()
			d.notified++
			d.mu.Unlock()
		}
		return
	}

	// Event requires fluid intelligence (Gf) — queue for oscillator.
	// The oscillator monitors unprocessed events as an activation signal.
	// When activation exceeds threshold, it fires a single deliberation
	// that processes all pending work. This prevents duplicate invocations.
	d.logger.Info("event queued for oscillator (Gf required)",
		"event_id", evt.ID,
		"type", evt.Type,
		"cost", cost,
	)
	d.mu.Lock()
	d.dispatched++
	tm := d.getTypeMetrics(evt.Type)
	tm.Total++
	d.mu.Unlock()

	// Event stays unprocessed in state.db. The oscillator monitors
	// unprocessed_messages as an activation signal and fires a single
	// deliberation when threshold exceeded. This eliminates duplicate
	// claude invocations from parallel event processing.
}

// Stats returns dispatcher metrics.
func (d *Dispatcher) Stats() (dispatched, dropped, batched int64) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.dispatched, d.dropped, d.batched
}

// TypeStats returns a snapshot of per-event-type metrics.
func (d *Dispatcher) TypeStats() map[EventType]TypeMetrics {
	d.mu.RLock()
	defer d.mu.RUnlock()
	out := make(map[EventType]TypeMetrics, len(d.typeMetrics))
	for k, v := range d.typeMetrics {
		out[k] = *v
	}
	return out
}

// NotifiedCount returns how many notifications the dispatcher sent.
func (d *Dispatcher) NotifiedCount() int64 {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.notified
}

// estimateCost maps event priority to budget units.
func estimateCost(p Priority) int {
	switch p {
	case PriorityCritical:
		return 5
	case PriorityHigh:
		return 3
	case PriorityNormal:
		return 2
	case PriorityLow:
		return 1
	default:
		return 2
	}
}

// buildPrompt constructs the Claude prompt for a single event.
func buildPrompt(evt Event) string {
	switch evt.Type {
	case EventDirective:
		return fmt.Sprintf("/sync --directive --session %s --enforcement %s",
			evt.Payload["session"],
			evt.Payload["enforcement"],
		)
	case EventContextRotate:
		return "/cycle --context-rotate"
	case EventTransportMessage:
		session := evt.Payload["session"]
		if session != "" {
			return fmt.Sprintf("/sync --session %s", session)
		}
		return "/sync"
	case EventPollTick:
		return "/sync --quick"
	case EventHealthCheck:
		return "/sync --health-only"
	case EventTransportACK:
		// Should not reach here — Gc handles ACKs. Fallback to sync.
		return "/sync --quick"
	case EventCIFailure:
		return fmt.Sprintf("/sync --ci-failure --repo %s", evt.Payload["repo"])
	default:
		return "/sync"
	}
}

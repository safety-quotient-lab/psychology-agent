// Package events defines the event model for the meshd daemon's
// priority-based dispatch system. Each event carries a type, priority,
// source attribution, and an arbitrary string payload map.
package events

import (
	"crypto/rand"
	"encoding/hex"
	"time"
)

// Priority determines dispatch ordering. Lower numeric values
// receive processing before higher ones.
type Priority int

const (
	// PriorityCritical — hard-mandatory directives that demand immediate action.
	PriorityCritical Priority = iota
	// PriorityHigh — context rotations and high-priority transport messages.
	PriorityHigh
	// PriorityNormal — routine transport messages and standard work items.
	PriorityNormal
	// PriorityLow — peer status changes, informational updates; may accumulate.
	PriorityLow
)

// String returns a human-readable label for the priority level.
func (p Priority) String() string {
	switch p {
	case PriorityCritical:
		return "critical"
	case PriorityHigh:
		return "high"
	case PriorityNormal:
		return "normal"
	case PriorityLow:
		return "low"
	default:
		return "unknown"
	}
}

// EventType classifies the nature of an event for routing and handling.
type EventType string

const (
	// EventTransportMessage — an inbound message from a peer via transport.
	EventTransportMessage EventType = "transport-message"
	// EventDirective — a hard-mandatory directive requiring immediate action.
	EventDirective EventType = "directive"
	// EventContextRotate — a signal to rotate the agent's context window.
	EventContextRotate EventType = "context-rotate"
	// EventPeerStatusChange — a peer's availability or health changed.
	EventPeerStatusChange EventType = "peer-status-change"
	// EventBudgetDepleted — the token/cost budget reached its limit.
	EventBudgetDepleted EventType = "budget-depleted"
	// EventHealthCheck — a health-check request or heartbeat.
	EventHealthCheck EventType = "health-check"
	// EventPollTick — a periodic poll-cycle trigger from the safety-net timer.
	EventPollTick EventType = "poll-tick"
	// EventWebhookPR — a GitHub pull-request webhook payload.
	EventWebhookPR EventType = "webhook-pr"
	// EventWebhookPush — a GitHub push webhook payload.
	EventWebhookPush EventType = "webhook-push"
	// EventPush — a generic push event received via webhook.
	EventPush EventType = "push"
	// EventFilesystemNew — a new transport file detected by the watcher.
	EventFilesystemNew EventType = "fs-new"
	// EventCIFailure — a CI workflow run failed on any mesh repo.
	EventCIFailure EventType = "ci-failure"
	// EventTransportACK — a transport ACK PR (Gc-handled, no spawn needed).
	EventTransportACK EventType = "transport-ack"
)

// Event represents a single unit of work entering the daemon's dispatch queue.
type Event struct {
	ID         string            // unique identifier (hex-encoded random bytes)
	Type       EventType         // classifies the event for routing
	Priority   Priority          // determines processing order
	Source     string            // origin: "github", "filesystem", "zmq", "poll", "manual"
	Payload    map[string]string // arbitrary key-value data
	CreatedAt  time.Time         // when the event entered the system
	Attempts   int               // number of processing attempts so far
	MaxRetries int               // maximum retry attempts before permanent failure
}

// NewEvent constructs an Event with a generated ID and current timestamp.
// Caller supplies type, priority, source, and payload. MaxRetries defaults
// to 3; callers may override after construction.
func NewEvent(eventType EventType, priority Priority, source string, payload map[string]string) Event {
	return Event{
		ID:         generateID(),
		Type:       eventType,
		Priority:   priority,
		Source:     source,
		Payload:    payload,
		CreatedAt:  time.Now(),
		Attempts:   0,
		MaxRetries: 3,
	}
}

// DeduplicationKey returns a string that identifies logically duplicate events.
// Events sharing the same type and source key get treated as duplicates
// by the priority queue's deduplication filter.
func (e *Event) DeduplicationKey() string {
	sourceKey := e.Payload["source_key"]
	return string(e.Type) + ":" + e.Source + ":" + sourceKey
}

// generateID produces a 16-character hex string from 8 random bytes.
func generateID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		// Fallback: use timestamp nanoseconds (less unique, still functional)
		return hex.EncodeToString([]byte(time.Now().String()[:16]))
	}
	return hex.EncodeToString(b)
}

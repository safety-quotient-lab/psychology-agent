// Package server — sse.go provides Server-Sent Events (SSE) fan-out.
//
// The SSE broker maintains a set of connected clients and broadcasts
// events to all of them. Clients that disconnect get cleaned up
// automatically. The broker runs as a goroutine and communicates
// via channels — no locks needed.
package server

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// SSEEvent represents a single event to broadcast to connected clients.
type SSEEvent struct {
	Type string `json:"type"` // SSE event type (e.g., "event", "health", "transport")
	Data any    `json:"data"` // JSON-serializable payload
}

// SSEBroker manages SSE client connections and event fan-out.
type SSEBroker struct {
	clients    map[chan SSEEvent]struct{}
	register   chan chan SSEEvent
	unregister chan chan SSEEvent
	broadcast  chan SSEEvent
	logger     *slog.Logger
}

// NewSSEBroker creates and starts a broker goroutine.
func NewSSEBroker(logger *slog.Logger) *SSEBroker {
	b := &SSEBroker{
		clients:    make(map[chan SSEEvent]struct{}),
		register:   make(chan chan SSEEvent),
		unregister: make(chan chan SSEEvent),
		broadcast:  make(chan SSEEvent, 64),
		logger:     logger,
	}
	go b.run()
	return b
}

// run processes register/unregister/broadcast in a single goroutine.
func (b *SSEBroker) run() {
	for {
		select {
		case ch := <-b.register:
			b.clients[ch] = struct{}{}
			b.logger.Debug("SSE client connected", "clients", len(b.clients))

		case ch := <-b.unregister:
			if _, ok := b.clients[ch]; ok {
				delete(b.clients, ch)
				close(ch)
				b.logger.Debug("SSE client disconnected", "clients", len(b.clients))
			}

		case evt := <-b.broadcast:
			for ch := range b.clients {
				select {
				case ch <- evt:
				default:
					// Client too slow — drop and disconnect
					delete(b.clients, ch)
					close(ch)
					b.logger.Debug("SSE client dropped (slow)", "clients", len(b.clients))
				}
			}
		}
	}
}

// Broadcast sends an event to all connected SSE clients.
func (b *SSEBroker) Broadcast(evt SSEEvent) {
	select {
	case b.broadcast <- evt:
	default:
		b.logger.Warn("SSE broadcast channel full — event dropped")
	}
}

// ClientCount returns the number of connected SSE clients.
func (b *SSEBroker) ClientCount() int {
	return len(b.clients)
}

// handleSSEStream serves GET /api/events/stream — long-lived SSE connection.
func (s *Server) handleSSEStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // nginx/proxy hint

	// Register this client
	ch := make(chan SSEEvent, 16)
	s.sseBroker.register <- ch

	// Clean up on disconnect
	ctx := r.Context()
	go func() {
		<-ctx.Done()
		s.sseBroker.unregister <- ch
	}()

	// Send initial heartbeat so client knows connection succeeded
	fmt.Fprintf(w, ": connected to %s meshd SSE\n\n", s.Config.AgentID)
	flusher.Flush()

	// Heartbeat ticker — keeps connection alive through proxies
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case evt, open := <-ch:
			if !open {
				return
			}
			data, err := json.Marshal(evt.Data)
			if err != nil {
				s.logger.Error("SSE marshal failed", "err", err)
				continue
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", evt.Type, data)
			flusher.Flush()

		case <-ticker.C:
			fmt.Fprintf(w, ": heartbeat %s\n\n", time.Now().UTC().Format(time.RFC3339))
			flusher.Flush()

		case <-ctx.Done():
			return
		}
	}
}

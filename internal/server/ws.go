// Package server — ws.go provides WebSocket support for real-time dashboard updates.
//
// Uses golang.org/x/net/websocket (Go project package) for the WebSocket
// upgrade handshake. Each connected client receives broadcast events from
// the same SSEBroker used by Server-Sent Events.
//
// Endpoint: GET /ws — upgrades to WebSocket, streams JSON events.
package server

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/net/websocket"
)

// WSBroker manages WebSocket client connections and broadcasts events
// to all connected clients. Shares event types with SSEBroker.
type WSBroker struct {
	clients map[*wsClient]struct{}
	mu      sync.RWMutex
	logger  *slog.Logger
}

type wsClient struct {
	conn *websocket.Conn
	send chan []byte
}

// NewWSBroker creates a WebSocket broker.
func NewWSBroker(logger *slog.Logger) *WSBroker {
	return &WSBroker{
		clients: make(map[*wsClient]struct{}),
		logger:  logger,
	}
}

// Handler returns the websocket.Handler for use with http.Handle.
func (b *WSBroker) Handler() websocket.Handler {
	return func(ws *websocket.Conn) {
		client := &wsClient{
			conn: ws,
			send: make(chan []byte, 64),
		}

		b.mu.Lock()
		b.clients[client] = struct{}{}
		count := len(b.clients)
		b.mu.Unlock()

		b.logger.Info("WebSocket client connected", "clients", count)

		// Send initial connection confirmation
		welcome := map[string]any{
			"type":      "connected",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"clients":   count,
		}
		if data, err := json.Marshal(welcome); err == nil {
			websocket.Message.Send(ws, string(data))
		}

		// Send stand-down to this client — clears any stale alert from
		// before WS reconnected (deploy black alert → restart → reconnect)
		standDown := map[string]any{
			"type": "alert",
			"Type": "alert",
			"data": map[string]string{"level": "5", "reason": "WebSocket reconnected"},
			"Data": map[string]string{"level": "5", "reason": "WebSocket reconnected"},
		}
		if data, err := json.Marshal(standDown); err == nil {
			websocket.Message.Send(ws, string(data))
		}

		// Writer goroutine — drains send channel to WebSocket
		done := make(chan struct{})
		go func() {
			defer close(done)
			for msg := range client.send {
				if err := websocket.Message.Send(ws, string(msg)); err != nil {
					return
				}
			}
		}()

		// Reader loop — keep connection alive, handle pings
		for {
			var msg string
			if err := websocket.Message.Receive(ws, &msg); err != nil {
				break // client disconnected
			}
			// Respond to ping with pong
			if msg == "ping" {
				pong := map[string]string{"type": "pong", "timestamp": time.Now().UTC().Format(time.RFC3339)}
				if data, err := json.Marshal(pong); err == nil {
					websocket.Message.Send(ws, string(data))
				}
			}
		}

		// Cleanup
		b.mu.Lock()
		delete(b.clients, client)
		b.mu.Unlock()
		close(client.send)
		<-done

		b.logger.Info("WebSocket client disconnected", "clients", len(b.clients))
	}
}

// Broadcast sends an event to all connected WebSocket clients.
// Non-blocking — drops messages for slow clients.
func (b *WSBroker) Broadcast(event SSEEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}

	b.mu.RLock()
	defer b.mu.RUnlock()

	for client := range b.clients {
		select {
		case client.send <- data:
		default:
			// Client too slow — drop message
			b.logger.Debug("WebSocket message dropped for slow client")
		}
	}
}

// ClientCount returns the number of connected WebSocket clients.
func (b *WSBroker) ClientCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.clients)
}

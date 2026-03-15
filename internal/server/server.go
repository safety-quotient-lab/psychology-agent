// Package server provides the meshd HTTP server that exposes operational
// endpoints for health probes, event inspection, webhook reception, and
// manual triggering.
//
// The server uses only stdlib net/http — no third-party routers.
// Graceful shutdown drains active requests on SIGTERM/SIGINT.
package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"sync"
	"syscall"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
	"github.com/safety-quotient-lab/operations-agent/internal/db"
	"github.com/safety-quotient-lab/operations-agent/internal/events"
	"github.com/safety-quotient-lab/operations-agent/internal/health"
)

// Version gets embedded at build time via -ldflags.
// Falls back to "dev" when unset.
var Version = "dev"

// maxEventLog caps the in-memory event ring buffer.
const maxEventLog = 100

// maxSpawnLog caps the in-memory spawn log.
const maxSpawnLog = 50

// SpawnRecord captures a single spawn invocation for the /api/spawns log.
type SpawnRecord struct {
	ID        string    `json:"id"`
	Trigger   string    `json:"trigger"`
	StartedAt time.Time `json:"started_at"`
	Duration  string    `json:"duration,omitempty"`
	Status    string    `json:"status"`
	Error     string    `json:"error,omitempty"`
}

// Server holds references to all meshd subsystems and manages the HTTP
// lifecycle including graceful shutdown.
type Server struct {
	Config     *config.Config
	Health     *health.Monitor
	httpServer *http.Server
	startTime  time.Time
	logger     *slog.Logger
	eventLog   []events.Event
	spawnLog   []SpawnRecord
	mu         sync.RWMutex

	// webhookHandler processes inbound GitHub webhook payloads.
	// Injected by the caller so the server avoids direct coupling to the
	// webhook package's concrete type.
	webhookHandler http.Handler

	// Registry manages dynamic agent card discovery and caching.
	Registry *AgentRegistry

	// GitHubToken for creating PRs via GitHub API (relay/redirect).
	GitHubToken string

	// OperatorSecret for API key management endpoints.
	OperatorSecret string

	// ZMQPublish broadcasts messages to the mesh via ZMQ PUB.
	// Nil when ZMQ not configured.
	ZMQPublish func(topic string, data any) error

	// ZMQRegister handles inbound peer registration from ZMQ reverse-register.
	// Nil when ZMQ not configured.
	ZMQRegister func(info json.RawMessage) bool

	// triggerFunc handles manual event triggers from operators.
	// Accepts event type and payload; returns an error on failure.
	triggerFunc func(eventType string, payload map[string]string) error

	// sseBroker fans out events to connected SSE clients.
	sseBroker *SSEBroker

	// SSEBroadcast exposes the broker's Broadcast for external callers (ZMQ handler).
	SSEBroadcast func(SSEEvent)
}

// New constructs a Server with the provided dependencies.
// webhookHandler and triggerFunc may equal nil; the corresponding endpoints
// will return 501 Not Implemented.
func New(
	cfg *config.Config,
	healthMon *health.Monitor,
	webhookHandler http.Handler,
	triggerFunc func(string, map[string]string) error,
	logger *slog.Logger,
) *Server {
	broker := NewSSEBroker(logger)
	return &Server{
		Config:         cfg,
		Health:         healthMon,
		webhookHandler: webhookHandler,
		triggerFunc:    triggerFunc,
		startTime:      time.Now(),
		logger:         logger,
		eventLog:       make([]events.Event, 0, maxEventLog),
		spawnLog:       make([]SpawnRecord, 0, maxSpawnLog),
		sseBroker:      broker,
		SSEBroadcast:   broker.Broadcast,
	}
}

// RecordEvent appends an event to the ring buffer, evicting the oldest
// entry when the buffer reaches capacity.
func (s *Server) RecordEvent(ev events.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.eventLog) >= maxEventLog {
		// Shift left by one to make room.
		copy(s.eventLog, s.eventLog[1:])
		s.eventLog = s.eventLog[:maxEventLog-1]
	}
	s.eventLog = append(s.eventLog, ev)

	// Persist to state.db (non-blocking)
	go func() {
		payloadJSON := "{}"
		if ev.Payload != nil {
			if b, err := json.Marshal(ev.Payload); err == nil {
				payloadJSON = string(b)
			}
		}
		sql := fmt.Sprintf(
			"INSERT OR IGNORE INTO mesh_events (id, event_type, source, priority, agent_id, payload) "+
				"VALUES ('%s', '%s', '%s', %d, '%s', '%s')",
			db.EscapeString(ev.ID),
			db.EscapeString(string(ev.Type)),
			db.EscapeString(ev.Source),
			ev.Priority,
			db.SanitizeID(s.Config.AgentID),
			db.EscapeString(payloadJSON),
		)
		db.Exec(s.Config.BudgetDBPath, sql)
	}()

	// Broadcast to SSE clients
	if s.sseBroker != nil {
		s.sseBroker.Broadcast(SSEEvent{
			Type: string(ev.Type),
			Data: ev,
		})
	}
}

// RecordSpawn appends a spawn record to the spawn log, evicting the oldest
// entry when the buffer reaches capacity.
func (s *Server) RecordSpawn(rec SpawnRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.spawnLog) >= maxSpawnLog {
		copy(s.spawnLog, s.spawnLog[1:])
		s.spawnLog = s.spawnLog[:maxSpawnLog-1]
	}
	s.spawnLog = append(s.spawnLog, rec)

	// Broadcast to SSE clients
	if s.sseBroker != nil {
		s.sseBroker.Broadcast(SSEEvent{
			Type: "spawn",
			Data: rec,
		})
	}
}

// ListenAndServe starts the HTTP server and blocks until a shutdown signal
// arrives (SIGTERM or SIGINT). Active requests get up to 10 seconds to
// drain before forced termination.
func (s *Server) ListenAndServe() error {
	mux := http.NewServeMux()
	s.registerRoutes(mux)

	addr := fmt.Sprintf("127.0.0.1:%d", s.Config.Port)
	s.httpServer = &http.Server{
		Addr:              addr,
		Handler:           s.middleware(mux),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Listen for shutdown signals.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

	errCh := make(chan error, 1)
	go func() {
		s.logger.Info("meshd server starting", "addr", addr, "version", Version)
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case sig := <-sigCh:
		s.logger.Info("received shutdown signal", "signal", sig.String())
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("server listen failed: %w", err)
		}
	}

	return s.shutdown()
}

// shutdown gracefully stops the HTTP server, allowing active requests up to
// 10 seconds to complete.
func (s *Server) shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	s.logger.Info("draining active requests", "timeout", "10s")
	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}
	s.logger.Info("server stopped gracefully")
	return nil
}

// registerRoutes wires all endpoints onto the provided mux.
func (s *Server) registerRoutes(mux *http.ServeMux) {
	// ── Existing meshd routes ───────────────────────────────────────
	mux.HandleFunc("GET /api/status", s.handleStatus)
	mux.HandleFunc("GET /health", s.Health.HTTPHandler())
	mux.HandleFunc("GET /api/events", s.handleEvents)
	mux.HandleFunc("GET /api/events/stream", s.handleSSEStream)
	mux.HandleFunc("POST /hooks/github", s.handleWebhook)
	mux.HandleFunc("POST /api/trigger", s.handleTrigger)
	mux.HandleFunc("GET /api/spawns", s.handleSpawns)
	mux.HandleFunc("GET /api/kb", s.handleKB)
	mux.HandleFunc("POST /api/messages/inbound", s.handleInbound)
	mux.HandleFunc("GET /api/routing", s.handleRouting)
	mux.HandleFunc("GET /api/search", s.handleSearch)
	mux.HandleFunc("POST /api/zmq/register", s.handleZMQRegister)

	// ── Compositor routes (ported from CF Worker) ───────────────────
	// Static assets
	mux.HandleFunc("GET /{$}", s.handleIndex)
	mux.HandleFunc("GET /vocab", s.handleVocab)
	mux.HandleFunc("GET /vocab.json", s.handleVocab)
	mux.HandleFunc("GET /vocab/schema", s.handleVocabSchema)
	mux.HandleFunc("GET /vocab/schema.json", s.handleVocabSchema)
	mux.HandleFunc("GET /.well-known/agent-card.json", s.handleAgentCardStatic)
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticFS))))

	// Discovery
	mux.HandleFunc("GET /.well-known/agents", s.handleAgents)
	mux.HandleFunc("GET /.well-known/webfinger", s.handleWebFinger)

	// Aggregation
	mux.HandleFunc("GET /api/pulse", s.handlePulse)
	mux.HandleFunc("GET /api/operations", s.handleOperations)
	mux.HandleFunc("GET /api/health", s.handleMeshHealth)
	mux.HandleFunc("GET /api/trust", s.handleTrust)

	// Auth + keys
	mux.HandleFunc("GET /api/whoami", s.handleWhoAmI)
	mux.HandleFunc("POST /api/keys", s.handleKeyCreate)
	mux.HandleFunc("DELETE /api/keys/", s.handleKeyRevoke)

	// Dashboard manifest (per-agent widget declarations)
	mux.HandleFunc("GET /dashboard/manifest", s.handleManifest)

	// Psychometrics (A2A-Psychology — Go fast path)
	mux.HandleFunc("GET /api/psychometrics", s.handlePsychometrics)
	mux.HandleFunc("GET /api/psychometrics/mesh", s.handlePsychometricsMesh)

	// Spawn rate (claude -p consumption metrics)
	mux.HandleFunc("GET /api/spawn-rate", s.handleSpawnRate)

	// Tempo (mesh dynamics — differential calculus model)
	mux.HandleFunc("GET /api/tempo", s.handleTempo)

	// Consensus (quorum gate resolution — R1 governance)
	mux.HandleFunc("GET /api/consensus", s.handleConsensus)

	// Flow (mesh visualization — topology + rates + slots)
	mux.HandleFunc("GET /api/flow", s.handleFlow)

	// Transport relay + redirect
	mux.HandleFunc("POST /api/relay", s.handleRelay)
	mux.HandleFunc("POST /api/redirect", s.handleRedirect)

	// CI visibility — aggregated workflow run status across all mesh repos
	mux.HandleFunc("GET /api/ci", s.handleCI)
}

// middleware chains recovery, CORS, request logging, and version header
// around every request.
func (s *Server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Recovery: catch panics, log them, return 500.
		defer func() {
			if rec := recover(); rec != nil {
				stack := debug.Stack()
				s.logger.Error("panic recovered in HTTP handler",
					"error", rec,
					"path", r.URL.Path,
					"stack", string(stack),
				)
				http.Error(w, "internal server error", http.StatusInternalServerError)
			}
		}()

		// CORS headers for dashboard access.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Version header.
		w.Header().Set("X-Meshd-Version", Version)

		// Handle preflight.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Wrap the ResponseWriter to capture the status code.
		sw := &statusWriter{ResponseWriter: w, code: http.StatusOK}
		next.ServeHTTP(sw, r)

		// Structured request log.
		s.logger.Info("http request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.code,
			"duration", time.Since(start).String(),
			"remote", r.RemoteAddr,
		)
	})
}

// statusWriter wraps http.ResponseWriter to capture the written status code.
// Preserves http.Flusher interface for SSE streaming support.
type statusWriter struct {
	http.ResponseWriter
	code int
}

// WriteHeader captures the status code before delegating.
func (sw *statusWriter) WriteHeader(code int) {
	sw.code = code
	sw.ResponseWriter.WriteHeader(code)
}

// Flush delegates to the underlying ResponseWriter if it supports flushing.
func (sw *statusWriter) Flush() {
	if f, ok := sw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// --- Route handlers ---

// handleStatus serves GET /api/status — agent self-report matching the
// schema the compositor dashboard expects: agent_id, autonomy_budget,
// recent_messages, unprocessed_messages, active_gates, health, version.
func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	uptime := time.Since(s.startTime)
	dbPath := s.Config.BudgetDBPath

	// Budget from state.db
	budgetRows, _ := db.QueryJSON(dbPath,
		"SELECT agent_id, budget_spent, budget_cutoff, shadow_mode, consecutive_blocks, last_audit, updated_at FROM autonomy_budget WHERE agent_id='"+db.SanitizeID(s.Config.AgentID)+"'")
	var budget interface{}
	if len(budgetRows) > 0 {
		budget = budgetRows[0]
	} else {
		budget = map[string]interface{}{}
	}

	// Recent messages (last 20)
	recentMsgs, _ := db.QueryJSON(dbPath,
		"SELECT filename, session_name, from_agent, to_agent, message_type, subject, timestamp, turn FROM transport_messages ORDER BY timestamp DESC LIMIT 20")

	// Unprocessed messages
	unprocessedMsgs, _ := db.QueryJSON(dbPath,
		"SELECT filename, session_name, from_agent, message_type, subject, timestamp, turn FROM transport_messages WHERE processed=0 ORDER BY timestamp DESC")

	// Active gates — messages with ack_required that lack responses
	activeGates, _ := db.QueryJSON(dbPath,
		"SELECT session_name, from_agent, subject, timestamp FROM transport_messages "+
			"WHERE processed=0 AND message_type IN ('directive','proposal','request') "+
			"ORDER BY timestamp DESC LIMIT 10")

	// Deliberation history (Gf episodes — queries spawn_log table, renamed in API)
	deliberationHistory, _ := db.QueryJSON(dbPath,
		"SELECT agent_id, event_id, status, exit_code, duration_ms, cost, started_at FROM spawn_log ORDER BY started_at DESC LIMIT 10")

	// Gc metrics — crystallized intelligence activity counters
	gcEvents := db.QueryScalar(dbPath,
		"SELECT count(*) FROM spawn_log WHERE started_at > datetime('now', '-1 hour')")
	totalEvents := s.eventCount()

	resp := map[string]interface{}{
		"agent_id":              s.Config.AgentID,
		"version":               Version,
		"uptime":                uptime.Truncate(time.Second).String(),
		"uptime_seconds":        int64(uptime.Seconds()),
		"collected_at":          time.Now().UTC().Format(time.RFC3339),
		"db_path":               dbPath,
		"db_exists":             true,
		"health":                s.Health.OverallStatus().String(),
		"autonomy_budget":       budget,
		"recent_messages":       recentMsgs,
		"unprocessed_messages":  unprocessedMsgs,
		"active_gates":          activeGates,
		"event_count":           totalEvents,
		"deliberation_count":    s.spawnCount(),
		"recent_deliberations":  deliberationHistory,
		"gc_metrics": map[string]any{
			"deliberations_last_hour": gcEvents,
			"events_processed":       totalEvents,
			"gc_ratio":               "poll ticks handled without spawn",
			"deliberation_model":     s.Config.DeliberationModel,
		},
	}

	writeJSON(w, http.StatusOK, resp, s.logger)
}

// handleEvents serves GET /api/events — returns the most recent events
// from the ring buffer, newest first.
func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	snapshot := make([]events.Event, len(s.eventLog))
	copy(snapshot, s.eventLog)
	s.mu.RUnlock()

	// Reverse so the newest event appears first.
	for i, j := 0, len(snapshot)-1; i < j; i, j = i+1, j-1 {
		snapshot[i], snapshot[j] = snapshot[j], snapshot[i]
	}

	writeJSON(w, http.StatusOK, snapshot, s.logger)
}

// handleWebhook serves POST /hooks/github — delegates to the injected
// webhook handler.
func (s *Server) handleWebhook(w http.ResponseWriter, r *http.Request) {
	if s.webhookHandler == nil {
		http.Error(w, "webhook handler not configured", http.StatusNotImplemented)
		return
	}
	s.webhookHandler.ServeHTTP(w, r)
}

// handleTrigger serves POST /api/trigger — accepts a JSON body with
// "type" and optional "payload" fields, forwarding them to the trigger
// function.
func (s *Server) handleTrigger(w http.ResponseWriter, r *http.Request) {
	if s.triggerFunc == nil {
		http.Error(w, "trigger function not configured", http.StatusNotImplemented)
		return
	}

	var req struct {
		Type    string            `json:"type"`
		Payload map[string]string `json:"payload"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.Type == "" {
		http.Error(w, "\"type\" field required", http.StatusBadRequest)
		return
	}

	if err := s.triggerFunc(req.Type, req.Payload); err != nil {
		s.logger.Error("manual trigger failed", "type", req.Type, "error", err)
		http.Error(w, "trigger failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]string{
		"status":  "accepted",
		"type":    req.Type,
	}, s.logger)
}

// handleSpawns serves GET /api/spawns — returns the most recent spawn
// records, newest first.
func (s *Server) handleSpawns(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	snapshot := make([]SpawnRecord, len(s.spawnLog))
	copy(snapshot, s.spawnLog)
	s.mu.RUnlock()

	// Reverse so the newest spawn appears first.
	for i, j := 0, len(snapshot)-1; i < j; i, j = i+1, j-1 {
		snapshot[i], snapshot[j] = snapshot[j], snapshot[i]
	}

	writeJSON(w, http.StatusOK, snapshot, s.logger)
}

// --- Helpers ---

func (s *Server) eventCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.eventLog)
}

func (s *Server) spawnCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.spawnLog)
}

// decodeJSON reads and parses a JSON request body into dst.
func decodeJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

// writeJSON marshals v as JSON and writes it to w with the given status code.
func writeJSON(w http.ResponseWriter, code int, v any, logger *slog.Logger) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		logger.Error("failed to encode JSON response", "error", err)
	}
}

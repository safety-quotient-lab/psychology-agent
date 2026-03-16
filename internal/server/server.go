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
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"strings"
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

// maxDeliberationLog caps the in-memory deliberation log.
const maxDeliberationLog = 50

// DeliberationRecord captures a single deliberation invocation for the /api/deliberations log.
type DeliberationRecord struct {
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
	spawnLog   []DeliberationRecord
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

	// Oscillator runs the self-oscillation shadow mode goroutine.
	// Nil when not enabled.
	Oscillator *Oscillator

	// KVClient writes self-observation to Cloudflare KV.
	// Nil when CF credentials not configured.
	KVClient interface {
		Put(ctx context.Context, key string, value []byte, ttlSeconds int) error
	}

	// sseBroker fans out events to connected SSE clients.
	sseBroker *SSEBroker

	// SSEBroadcast exposes the broker's Broadcast for external callers (ZMQ handler).
	SSEBroadcast func(SSEEvent)

	// rpcMethods maps JSON-RPC method names to HTTP handlers.
	// Built once during route registration via buildMethodTable().
	rpcMethods map[string]methodRoute
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
		spawnLog:       make([]DeliberationRecord, 0, maxDeliberationLog),
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

// RecordDeliberation appends a deliberation record to the log, evicting the
// oldest entry when the buffer reaches capacity.
func (s *Server) RecordDeliberation(rec DeliberationRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.spawnLog) >= maxDeliberationLog {
		copy(s.spawnLog, s.spawnLog[1:])
		s.spawnLog = s.spawnLog[:maxDeliberationLog-1]
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
		Handler:           s.middleware(mux),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Use SO_REUSEADDR to prevent "address already in use" on restart.
	// Allows binding even when the old socket lingers in TIME_WAIT.
	lc := net.ListenConfig{
		Control: func(network, address string, c syscall.RawConn) error {
			return c.Control(func(fd uintptr) {
				syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, syscall.SO_REUSEADDR, 1)
			})
		},
	}
	ln, err := lc.Listen(context.Background(), "tcp", addr)
	if err != nil {
		return fmt.Errorf("listen %s failed: %w", addr, err)
	}

	// Listen for shutdown signals.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

	errCh := make(chan error, 1)
	go func() {
		s.logger.Info("meshd server starting", "addr", addr, "version", Version)
		if err := s.httpServer.Serve(ln); err != nil && err != http.ErrServerClosed {
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
	mux.HandleFunc("GET /events", s.handleSSEStream) // Alias — dashboard connectSSE() expects /events
	mux.HandleFunc("POST /hooks/github", s.handleWebhook)
	mux.HandleFunc("POST /api/trigger", s.handleTrigger)
	mux.HandleFunc("GET /api/deliberations", s.handleDeliberations)
	mux.HandleFunc("GET /api/cognitive-tempo", s.handleCognitiveTempo)
	mux.HandleFunc("GET /api/oscillator", s.handleOscillator)
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

	// Mesh aggregate — organism-level state (affect, bottleneck, coordination, immune, distribution)
	mux.HandleFunc("GET /api/mesh-aggregate", s.handleMeshAggregate)

	// JSON-RPC 2.0 multiplexer (A2A-compatible programmatic access)
	s.rpcMethods = s.buildMethodTable()
	mux.HandleFunc("POST /api/rpc", s.handleRPC)
	mux.HandleFunc("GET /api/rpc", s.handleRPCInfo)
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

		// CORS headers — restricted to known mesh origins.
		origin := r.Header.Get("Origin")
		if isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Operator-Secret")
		w.Header().Set("Vary", "Origin")

		// Version header.
		w.Header().Set("X-Meshd-Version", Version)

		// Handle preflight.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// CSP for HTML responses (prevents XSS via injected scripts).
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Wrap the ResponseWriter to capture the status code.
		sw := &statusWriter{ResponseWriter: w, code: http.StatusOK}
		next.ServeHTTP(sw, r)

		// Structured request log — Authorization header redacted.
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
	writeJSON(w, http.StatusOK, s.buildStatusPayload(), s.logger)
}

// buildStatusPayload constructs the status response map. Used by both
// handleStatus (HTTP) and KV self-observation (background writer).
func (s *Server) buildStatusPayload() map[string]interface{} {
	uptime := time.Since(s.startTime)
	dbPath := s.Config.BudgetDBPath

	// Budget from state.db (budget_spent/budget_cutoff counter model, cutoff 0 = unlimited)
	budgetRows, _ := db.QueryJSON(dbPath,
		"SELECT agent_id, budget_spent, budget_cutoff, shadow_mode, consecutive_blocks, last_audit, updated_at, min_action_interval, last_action FROM autonomy_budget WHERE agent_id='"+db.SanitizeID(s.Config.AgentID)+"'")
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

	// Deliberation history (Gf episodes — queries deliberation_log table, renamed in API)
	deliberationHistory, _ := db.QueryJSON(dbPath,
		"SELECT agent_id, event_id, status, exit_code, duration_ms, cost, started_at FROM deliberation_log ORDER BY started_at DESC LIMIT 10")

	// Gc metrics — crystallized intelligence activity counters
	gcEvents := db.QueryScalar(dbPath,
		"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-1 hour')")
	totalEvents := s.eventCount()

	return map[string]interface{}{
		"agent_id":              s.Config.AgentID,
		"version":               Version,
		"uptime":                uptime.Truncate(time.Second).String(),
		"uptime_seconds":        int64(uptime.Seconds()),
		"collected_at":          time.Now().UTC().Format(time.RFC3339),
		"db_available":          true,
		"health":                s.Health.OverallStatus().String(),
		"autonomy_budget":       budget,
		"recent_messages":       recentMsgs,
		"unprocessed_messages":  unprocessedMsgs,
		"active_gates":          activeGates,
		"event_count":           totalEvents,
		"deliberation_count":    s.deliberationCount(),
		"recent_deliberations":  deliberationHistory,
		"gc_metrics": map[string]any{
			"deliberations_last_hour": gcEvents,
			"events_processed":       totalEvents,
			"gc_ratio":               "poll ticks handled without spawn",
			"deliberation_model":     s.Config.DeliberationModel,
		},
	}
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

// handleDeliberations serves GET /api/deliberations — returns the most recent
// deliberation records, newest first.
func (s *Server) handleDeliberations(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	snapshot := make([]DeliberationRecord, len(s.spawnLog))
	copy(snapshot, s.spawnLog)
	s.mu.RUnlock()

	// Reverse so the newest deliberation appears first.
	for i, j := 0, len(snapshot)-1; i < j; i, j = i+1, j-1 {
		snapshot[i], snapshot[j] = snapshot[j], snapshot[i]
	}

	writeJSON(w, http.StatusOK, snapshot, s.logger)
}

// allowedOrigins lists domains permitted for CORS access.
// Localhost origins allowed for development.
var allowedOrigins = []string{
	"https://interagent.safety-quotient.dev",
	"https://operations-agent.safety-quotient.dev",
	"https://psychology-agent.safety-quotient.dev",
	"https://psq-agent.safety-quotient.dev",
	"https://observatory.unratified.org",
	"https://unratified.org",
	"http://localhost",
	"http://127.0.0.1",
}

// isAllowedOrigin checks whether origin matches an allowed prefix.
func isAllowedOrigin(origin string) bool {
	if origin == "" {
		return false
	}
	for _, allowed := range allowedOrigins {
		if origin == allowed || strings.HasPrefix(origin, allowed+":") {
			return true
		}
	}
	return false
}

// --- Helpers ---

func (s *Server) eventCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.eventLog)
}

func (s *Server) deliberationCount() int {
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

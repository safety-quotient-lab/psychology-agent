// meshd — Event-driven mesh daemon for operations-agent.
//
// Replaces cron-based polling with reactive event processing.
// Receives signals from GitHub webhooks, filesystem watchers,
// and periodic polls. Routes events through a priority queue
// with budget-aware gating before triggering Claude deliberations.
//
// Usage:
//
//	meshd                    # start with defaults from .dev.vars
//	meshd -port 8081         # override port
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/budget"
	"github.com/safety-quotient-lab/operations-agent/internal/config"
	"github.com/safety-quotient-lab/operations-agent/internal/db"
	"github.com/safety-quotient-lab/operations-agent/internal/events"
	"github.com/safety-quotient-lab/operations-agent/internal/health"
	"github.com/safety-quotient-lab/operations-agent/internal/kvstore"
	"github.com/safety-quotient-lab/operations-agent/internal/monitor"
	"github.com/safety-quotient-lab/operations-agent/internal/notify"
	"github.com/safety-quotient-lab/operations-agent/internal/server"
	"github.com/safety-quotient-lab/operations-agent/internal/spawner"
	"github.com/safety-quotient-lab/operations-agent/internal/transport"
	"github.com/safety-quotient-lab/operations-agent/internal/webhook"
	"github.com/safety-quotient-lab/operations-agent/internal/zmqbus"
)

const version = "0.1.0"

func main() {
	var (
		configPath  string
		port        int
		logLevel    string
		projectRoot string
		agentID     string
		zmqPub      string
		zmqPeers    string
		cacheTTL    string
	)
	flag.StringVar(&configPath, "config", "", "path to .dev.vars config file")
	flag.IntVar(&port, "port", 0, "override MESHD_PORT")
	flag.StringVar(&logLevel, "log-level", "", "override LOG_LEVEL (debug|info|warn|error)")
	// Platform-compatible flags (drop-in replacement for /home/kashif/platform/meshd)
	flag.StringVar(&projectRoot, "project-root", "", "path to agent project root")
	flag.StringVar(&agentID, "agent-id", "", "agent identity within the mesh")
	flag.StringVar(&zmqPub, "zmq-pub", "", "ZMQ PUB bind address (accepted but not yet implemented)")
	flag.StringVar(&zmqPeers, "zmq-peers", "", "ZMQ peer addresses (accepted but not yet implemented)")
	flag.StringVar(&cacheTTL, "cache-ttl", "", "cache TTL for collector results (accepted for compat)")
	flag.Parse()

	// When --project-root provided, set working directory so config.Load()
	// finds .dev.vars relative to the project root
	if projectRoot != "" {
		if err := os.Chdir(projectRoot); err != nil {
			fmt.Fprintf(os.Stderr, "failed to chdir to project-root %s: %v\n", projectRoot, err)
			os.Exit(1)
		}
	}

	// Load configuration from .dev.vars + environment
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "configuration load failed: %v\n", err)
		os.Exit(1)
	}
	// CLI --project-root overrides detected repo root.
	// detectRepoRoot() uses os.Executable() first, which resolves to the
	// binary's directory — wrong when the binary lives in a different repo
	// than the agent project. The flag value takes precedence.
	if projectRoot != "" {
		absRoot, absErr := filepath.Abs(projectRoot)
		if absErr == nil {
			cfg.RepoRoot = absRoot
			// Re-derive paths that depend on RepoRoot
			if os.Getenv("BUDGET_DB_PATH") == "" {
				cfg.BudgetDBPath = filepath.Join(absRoot, "state.db")
			}
			if os.Getenv("TRANSPORT_DIR") == "" {
				cfg.TransportDir = filepath.Join(absRoot, "transport", "sessions")
			}
		}
	}

	// CLI flags override config file values
	if port > 0 {
		cfg.Port = port
	}
	if agentID != "" {
		cfg.AgentID = agentID
	}
	if logLevel != "" {
		cfg.LogLevel = logLevel
	}

	// Initialize structured logger
	var level slog.Level
	switch cfg.LogLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
	slog.SetDefault(logger)

	logger.Info("meshd starting",
		"version", version,
		"agent_id", cfg.AgentID,
		"port", cfg.Port,
		"repo_root", cfg.RepoRoot,
	)

	// Create root context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ── Wire subsystems ────────────────────────────────────────────

	// Event queue — priority lanes with deduplication and batch accumulation
	queueCfg := events.DefaultQueueConfig()
	queue := events.NewQueue(queueCfg)

	// ZMQ publish function — set later when ZMQ bus initializes.
	var zmqPublishFn func(string, any) error

	// SSE broadcast function — set after server creation.
	// Used by ZMQ handler to push messages to dashboard.
	var sseBroadcastFn func(server.SSEEvent)

	// Input channel — subsystems push events here, main drains into queue
	eventChan := make(chan events.Event, 256)

	// Budget gate — queries state.db before allowing spawns
	budgetGate := budget.NewGate(cfg.BudgetDBPath, cfg.AgentID, logger)
	budgetGate.MeshMaxConcurrent = cfg.MaxConcurrent
	budgetGate.MeshReserveSlots = cfg.ReserveSlots

	// Deliberator — manages Claude process lifecycle with circuit breaker
	deliberator := spawner.New(cfg.AgentID, logger)
	deliberator.Command = cfg.SpawnCommand
	deliberator.MaxConcurrent = cfg.MaxConcurrent
	deliberator.Timeout = time.Duration(cfg.SpawnTimeout) * time.Second

	// Dispatcher — routes events from queue → budget check → deliberator
	dispatcher := events.NewDispatcher(
		queue,
		func(dctx context.Context, req events.DeliberationRequest) error {
			// Acquire mesh-wide deliberation slot (max 2 across entire mesh)
			slotPath, slotErr := budgetGate.AcquireSlot()
			if slotErr != nil {
				return fmt.Errorf("deliberation slot unavailable: %w", slotErr)
			}
			defer budgetGate.ReleaseSlot(slotPath)

			// Model tier: cognitive-tempo selects haiku/sonnet/opus from
			// psychometric state + task metadata (Adaptive Gain Theory).
			// Falls back to static DELIBERATION_MODEL if configured.
			var deliberationFlags []string
			tierResult := server.ComputeTier(cfg.AgentID, cfg.BudgetDBPath, server.MessageMeta{
				MessageType: string(req.Event.Type),
			})
			selectedModel := tierResult.RecommendedTier
			if selectedModel == "" && cfg.DeliberationModel != "" {
				selectedModel = cfg.DeliberationModel
			}
			if selectedModel != "" {
				deliberationFlags = append(deliberationFlags, "--model", selectedModel)
			}
			logger.Info("cognitive-tempo tier selected",
				"tier", tierResult.RecommendedTier,
				"gain", tierResult.Gain,
				"complexity", tierResult.TaskComplexity,
				"override", tierResult.OverrideReason,
			)
			result, deliberateErr := deliberator.Deliberate(dctx, req.Prompt, deliberationFlags...)

			// Dual-write: persist deliberation result to state.db
			deliberationStatus := "completed"
			deliberationError := ""
			exitCode := 0
			durationMs := int64(0)
			if result != nil {
				exitCode = result.ExitCode
				durationMs = result.Duration.Milliseconds()
			}
			if deliberateErr != nil {
				deliberationStatus = "failed"
				deliberationError = deliberateErr.Error()
			} else if result != nil && result.ExitCode != 0 {
				deliberationStatus = "error"
				deliberationError = result.Stderr
			}
			cost := budgetGate.EstimateCost(budget.Priority(req.Event.Priority))
			logSQL := fmt.Sprintf(
				"INSERT INTO deliberation_log (agent_id, event_id, prompt, exit_code, duration_ms, cost, status, error, started_at) "+
					"VALUES ('%s', '%s', '%s', %d, %d, %d, '%s', '%s', datetime('now'));",
				db.SanitizeID(cfg.AgentID),
				db.EscapeString(req.Event.ID),
				db.EscapeString(req.Prompt[:min(len(req.Prompt), 200)]),
				exitCode, durationMs, cost,
				db.EscapeString(deliberationStatus),
				db.EscapeString(deliberationError[:min(len(deliberationError), 500)]),
			)
			if _, dbErr := db.Exec(cfg.BudgetDBPath, logSQL); dbErr != nil {
				logger.Warn("deliberation log write failed", "err", dbErr)
			}

			if deliberateErr != nil {
				return deliberateErr
			}
			if result.ExitCode != 0 {
				return fmt.Errorf("claude exited with code %d: %s", result.ExitCode, result.Stderr)
			}
			logger.Info("deliberation completed",
				"event_id", req.Event.ID,
				"duration", result.Duration,
			)

			// Broadcast deliberation completion to mesh via ZMQ — include result summary
			if zmqPublishFn != nil {
				summary := ""
				if result != nil && len(result.Stdout) > 0 {
					// Extract last meaningful line as summary
					lines := strings.Split(strings.TrimSpace(result.Stdout), "\n")
					for i := len(lines) - 1; i >= 0; i-- {
						line := strings.TrimSpace(lines[i])
						if len(line) > 10 && !strings.HasPrefix(line, "{") {
							summary = line
							if len(summary) > 200 {
								summary = summary[:200]
							}
							break
						}
					}
				}
				zmqPublishFn("event", map[string]any{
					"agent_id":    cfg.AgentID,
					"event":       "deliberation_completed",
					"event_id":    req.Event.ID,
					"duration_ms": durationMs,
					"status":      deliberationStatus,
					"cost":        cost,
					"summary":     summary,
				})
			}

			return nil
		},
		func(cost int) (bool, string) { return budgetGate.CanDeliberate(cost) },
		func(cost int) error { return budgetGate.Record(cost) },
		logger,
	)

	// Notification channel — alerts operator when shadow mode blocks spawns
	notifier := notify.New(notify.Config{
		Channel:      cfg.NotifyChannel,
		FilePath:     cfg.NotifyFilePath,
		ZulipURL:     cfg.ZulipNotifyURL,
		ZulipEmail:   cfg.ZulipNotifyEmail,
		ZulipKey:     cfg.ZulipNotifyKey,
		ZulipStream:  cfg.ZulipNotifyStream,
		ZulipTopic:   cfg.ZulipNotifyTopic,
		WebhookURL:   cfg.NotifyWebhookURL,
	}, logger)
	logger.Info("notification channel configured", "channel", notifier.Name())

	// Wire notifier into dispatcher
	dispatcher.SetNotifier(cfg.AgentID, func(ctx context.Context, agentID, eventType, priority, reason, session string) error {
		return notifier.Notify(ctx, notify.Message{
			AgentID:   agentID,
			EventType: eventType,
			Priority:  priority,
			Reason:    reason,
			Session:   session,
			Timestamp: time.Now(),
		})
	})

	// Gc handler — crystallized intelligence layer (no LLM cost)
	// Handles PollTick, HealthCheck, TransportACK without spawning Claude.
	// Only events requiring fluid intelligence (Gf) proceed to the spawner.
	gcHandler := events.NewGcHandler(events.GcConfig{
		RepoRoot:     cfg.RepoRoot,
		TransportDir: cfg.TransportDir,
		AgentID:      cfg.AgentID,
		Logger:       logger,
	})
	dispatcher.SetGcHandler(gcHandler)

	// GitHub webhook handler
	webhookHandler := webhook.NewGitHubHandler(cfg.GitHubSecret, eventChan, logger)

	// Wire CI failure notifications through the notifier
	webhookHandler.CIFailureFn = func(repo, workflow, branch, url string) {
		notifier.Notify(context.Background(), notify.Message{
			AgentID:   cfg.AgentID,
			EventType: "ci-failure",
			Priority:  "high",
			Reason:    fmt.Sprintf("CI FAILED: %s/%s on %s — %s", repo, workflow, branch, url),
			Timestamp: time.Now(),
		})
	}

	// Transport filesystem watcher (with persisted seen-set to prevent spawn storms)
	watcher := transport.NewWatcher(
		cfg.TransportDir,
		time.Duration(cfg.PollInterval)*time.Second,
		eventChan,
		logger,
	)
	watcher.SeenFile = filepath.Join(cfg.RepoRoot, ".watcher-seen.json")

	// Health monitor — tracks all subsystem health
	healthMon := health.NewMonitor(logger)
	healthMon.OnObserve = func(agentID, checkType, status, detail string) {
		if agentID == "" {
			agentID = cfg.AgentID
		}
		sql := fmt.Sprintf(
			"INSERT INTO health_observations (agent_id, check_type, status, detail) "+
				"VALUES ('%s', '%s', '%s', '%s');",
			db.SanitizeID(agentID), db.EscapeString(checkType),
			db.EscapeString(status), db.EscapeString(detail[:min(len(detail), 500)]),
		)
		if _, err := db.Exec(cfg.BudgetDBPath, sql); err != nil {
			logger.Debug("health observation write failed", "err", err)
		}
	}

	// ZMQ bus — real-time mesh communication (replaces cron-based polling)
	var zmqBus *zmqbus.Bus
	if zmqPub != "" {
		httpBase := fmt.Sprintf("http://localhost:%d", cfg.Port)
		zmqBus = zmqbus.New(cfg.AgentID, zmqPub, httpBase)
		if err := zmqBus.Start(); err != nil {
			logger.Error("ZMQ bus failed to start", "err", err)
		} else {
			// Wire publish function for deliberation handler
			zmqPublishFn = zmqBus.Publish

			// Connect to initial peers from --zmq-peers flag
			// Format: "agent-id=tcp://host:port|http://host:port,..."
			if zmqPeers != "" {
				for _, peerSpec := range strings.Split(zmqPeers, ",") {
					parts := strings.SplitN(peerSpec, "=", 2)
					if len(parts) != 2 {
						continue
					}
					peerID := parts[0]
					addrs := strings.SplitN(parts[1], "|", 2)
					peerZMQ := addrs[0]
					peerHTTP := ""
					if len(addrs) > 1 {
						peerHTTP = addrs[1]
					}
					zmqBus.ConnectPeer(zmqbus.PeerInfo{
						AgentID: peerID,
						ZMQPub:  peerZMQ,
						HTTPURL: peerHTTP,
					})
				}
			}

			// Handle ALL incoming ZMQ messages — broadcast via SSE + emit transport events
			zmqBus.OnMessage(func(m zmqbus.Message) {
				// Broadcast every ZMQ message to SSE (dashboard ZMQ viewer)
				if sseBroadcastFn != nil {
					sseBroadcastFn(server.SSEEvent{
						Type: "zmq",
						Data: map[string]any{
							"topic": m.Topic,
							"from":  m.From,
							"timestamp": m.Timestamp.Format(time.RFC3339),
							"data":  m.Data,
						},
					})
				}

				// Transport-topic messages also enter the event queue for spawn processing
				if m.Topic == "transport" {
					evt := events.NewEvent(events.EventTransportMessage, events.PriorityHigh, "zmq", map[string]string{
						"from":    m.From,
						"topic":   m.Topic,
						"zmq":     "true",
					})
					select {
					case eventChan <- evt:
						logger.Info("ZMQ transport event received",
							"from", m.From,
							"topic", m.Topic,
						)
					default:
						logger.Warn("ZMQ event dropped — channel full", "from", m.From)
					}
				}
			})
		}
	}

	// Agent registry — compositor discovery (background refresh + SQLite persistence)
	registry := server.NewAgentRegistry(cfg.AgentID, cfg.AgentCardURLs, 5*time.Minute, logger)
	registry.SetDBPath(cfg.BudgetDBPath) // persist cards to state.db for cold-start resilience

	// CI monitor — polls GitHub Actions across all peer repos for build failures
	meshRepos := []string{
		"safety-quotient-lab/psychology-agent",
		"safety-quotient-lab/safety-quotient",
		"safety-quotient-lab/unratified",
		"safety-quotient-lab/observatory",
		"safety-quotient-lab/operations-agent",
	}
	ciMon := monitor.NewCIMonitor(meshRepos, 5*time.Minute, logger)
	ciMon.OnFailure = func(status monitor.CIStatus) {
		evt := events.NewEvent(events.EventHealthCheck, events.PriorityHigh, "ci-monitor", map[string]string{
			"repo":       status.Repo,
			"run_id":     fmt.Sprintf("%d", status.RunID),
			"conclusion": status.Conclusion,
			"workflow":   status.Workflow,
			"commit":     status.CommitMsg,
		})
		select {
		case eventChan <- evt:
		default:
			logger.Warn("CI failure event dropped — channel full", "repo", status.Repo)
		}

		// Notify the responsible agent via meshd HTTP inbound
		go notifyAgentCIFailure(registry, status, logger)
	}
	ciMon.OnRecovery = func(status monitor.CIStatus) {
		logger.Info("CI recovered", "repo", status.Repo, "run_id", status.RunID)

		// Notify recovery too
		go notifyAgentCIRecovery(registry, status, logger)
	}

	// Cross-repo fetcher — polls peer repos for transport messages addressed to us
	fetcherPeers := []transport.PeerConfig{
		{AgentID: "psychology-agent", Repo: "safety-quotient-lab/psychology-agent"},
		{AgentID: "safety-quotient-agent", Repo: "safety-quotient-lab/safety-quotient"},
		{AgentID: "unratified-agent", Repo: "safety-quotient-lab/unratified"},
		{AgentID: "observatory-agent", Repo: "safety-quotient-lab/observatory"},
	}
	fetcher := transport.NewFetcher(cfg.AgentID, cfg.TransportDir, fetcherPeers, 5*time.Minute, logger)
	fetcher.GitHubToken = os.Getenv("GITHUB_TOKEN")

	// Trigger function for manual events via POST /api/trigger
	triggerFunc := func(eventType string, payload map[string]string) error {
		evt := events.NewEvent(events.EventType(eventType), events.PriorityNormal, "manual", payload)
		select {
		case eventChan <- evt:
			return nil
		default:
			return fmt.Errorf("event channel full")
		}
	}

	// HTTP server
	srv := server.New(cfg, healthMon, webhookHandler, triggerFunc, logger)
	srv.Registry = registry
	srv.GitHubToken = cfg.GitHubToken
	srv.OperatorSecret = cfg.OperatorSecret
	srv.Dispatcher = dispatcher

	// Self-oscillation shadow mode — logs when it would fire, does not trigger
	osc := server.NewOscillator(cfg.AgentID, cfg.BudgetDBPath, cfg.RepoRoot)
	srv.Oscillator = osc
	osc.Start()
	logger.Info("oscillator started (shadow mode)", "agent_id", cfg.AgentID)

	// KV self-observation — write status to Cloudflare KV for compositor fallback
	kvClient := kvstore.New(cfg.CFAccountID, cfg.KVNamespaceID, cfg.CFAPIToken, logger)
	if kvClient != nil {
		srv.KVClient = kvClient
		go server.RunKVSelfObservation(ctx, srv, kvClient, cfg.AgentID, 2*time.Minute, logger)
	}
	sseBroadcastFn = srv.SSEBroadcast
	if zmqBus != nil {
		srv.ZMQPublish = zmqBus.Publish
		srv.ZMQRegister = func(info json.RawMessage) bool {
			var peer zmqbus.PeerInfo
			if err := json.Unmarshal(info, &peer); err != nil {
				return false
			}
			return zmqBus.RegisterPeer(peer)
		}
	}

	// ── Start subsystems ───────────────────────────────────────────

	var wg sync.WaitGroup

	// ── On-wake: broadcast "I'm alive" to mesh ────────────────────
	startupEvt := events.NewEvent(events.EventHealthCheck, events.PriorityNormal, "startup", map[string]string{
		"agent_id": cfg.AgentID,
		"version":  version,
		"event":    "meshd_started",
	})
	select {
	case eventChan <- startupEvt:
		logger.Info("startup event emitted", "agent_id", cfg.AgentID)
	default:
	}

	// ZMQ broadcast: immediate "online" announcement (no gossip delay)
	if zmqBus != nil {
		zmqBus.Publish("health", map[string]string{
			"agent_id": cfg.AgentID,
			"status":   "online",
			"version":  version,
			"event":    "meshd_started",
		})
		logger.Info("ZMQ startup broadcast sent")
	}

	// Notify operations-agent compositor (if we aren't operations-agent)
	if cfg.AgentID != "operations-agent" {
		go notifyCompositorOnline(cfg, logger)
	}

	// Agent registry background refresh
	wg.Add(1)
	go func() {
		defer wg.Done()
		registry.StartBackgroundRefresh(ctx)
	}()

	// Channel → Queue pump: drain eventChan into PriorityQueue
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			case evt, ok := <-eventChan:
				if !ok {
					return
				}
				queue.Push(evt)
				srv.RecordEvent(evt)
			}
		}
	}()

	// Event dispatcher goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		dispatchLoop(ctx, queue, dispatcher, logger)
	}()

	// Transport watcher goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		watcher.Run()
	}()

	// Health monitor goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		healthMon.Run(ctx)
	}()

	// CI monitor goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		ciMon.Run()
	}()

	// Cross-repo fetcher goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		fetcher.Run()
	}()

	// Safety-net poll ticker
	wg.Add(1)
	go func() {
		defer wg.Done()
		runPollTicker(ctx, cfg, eventChan, logger)
	}()

	// HTTP server (blocks in its own goroutine)
	wg.Add(1)
	go func() {
		defer wg.Done()
		if listenErr := srv.ListenAndServe(); listenErr != nil {
			logger.Error("HTTP server stopped", "error", listenErr)
		}
	}()

	logger.Info("meshd ready",
		"port", cfg.Port,
		"subsystems", "queue,dispatcher,watcher,monitor,server,poll,fetcher",
	)

	// Delayed startup broadcast — push full status to all SSE/WS clients
	// after server goes live. Ensures dashboards see new version + uptime
	// immediately (triggers black alert on deploy via real-time push).
	go func() {
		time.Sleep(3 * time.Second) // wait for server + clients to connect
		srv.BroadcastStatus()
		logger.Info("startup status broadcast sent")
	}()

	// ── Wait for shutdown signal ───────────────────────────────────

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigCh

	logger.Info("shutdown signal received", "signal", sig.String())

	// Graceful shutdown sequence
	cancel()

	// Drain the queue
	remaining := queue.Drain()
	logger.Info("queue drained", "remaining_events", len(remaining))

	// Wait for all goroutines
	wg.Wait()

	dispatched, dropped, batched := dispatcher.Stats()
	logger.Info("meshd shutdown complete",
		"dispatched", dispatched,
		"dropped", dropped,
		"batched", batched,
	)
}

// dispatchLoop pulls events from the PriorityQueue and feeds them
// to the dispatcher. Exits when the context cancels and the queue drains.
func dispatchLoop(ctx context.Context, queue *events.Queue, dispatcher *events.Dispatcher, logger *slog.Logger) {
	logger.Info("dispatch loop started")
	defer logger.Info("dispatch loop stopped")

	for {
		evt, ok := queue.Pop(ctx)
		if !ok {
			return // queue closed
		}

		select {
		case <-ctx.Done():
			return
		default:
		}

		dispatcher.HandleEvent(ctx, evt)
	}
}

// runPollTicker emits PollTick events at the configured interval.
func runPollTicker(ctx context.Context, cfg *config.Config, eventChan chan<- events.Event, logger *slog.Logger) {
	interval := time.Duration(cfg.PollInterval) * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	logger.Info("poll ticker started", "interval", interval)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			evt := events.NewEvent(events.EventPollTick, events.PriorityLow, "poll", nil)
			select {
			case eventChan <- evt:
				logger.Debug("poll tick emitted")
			default:
				logger.Debug("poll tick dropped — channel full")
			}
		}
	}
}

// notifyCompositorOnline sends a status update to operations-agent when
// this agent's meshd starts. Enables real-time dashboard updates.
func notifyCompositorOnline(cfg *config.Config, logger *slog.Logger) {
	// Try known compositor endpoints
	urls := []string{
		"https://operations-agent.safety-quotient.dev/api/messages/inbound",
		"http://localhost:8081/api/messages/inbound", // local fallback
	}

	msg := map[string]any{
		"schema":       "interagent/v1",
		"session_id":   "mesh-heartbeat",
		"turn":         1,
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"message_type": "notification",
		"from":         map[string]string{"agent_id": cfg.AgentID},
		"to":           map[string]string{"agent_id": "operations-agent"},
		"subject":      cfg.AgentID + " meshd started",
		"body": map[string]string{
			"event":   "meshd_started",
			"version": "v3",
		},
	}

	body, _ := json.Marshal(msg)

	for _, url := range urls {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(string(body)))
		if err != nil {
			cancel()
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		cancel()
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode < 500 {
				logger.Info("compositor notified of startup", "url", url, "status", resp.StatusCode)
				return
			}
		}
	}
	logger.Debug("compositor startup notification failed (non-critical)")
}

// notifyAgentCIFailure sends a CI failure notification to the responsible
// agent's meshd via HTTP POST /api/messages/inbound.
func notifyAgentCIFailure(registry *server.AgentRegistry, status monitor.CIStatus, logger *slog.Logger) {
	agent := findAgentByRepo(registry, status.Repo)
	if agent == nil {
		logger.Debug("CI failure: no agent found for repo", "repo", status.Repo)
		return
	}
	if agent.StatusURL == "" {
		return
	}

	meshBase := strings.TrimSuffix(agent.StatusURL, "/api/status")
	msg := map[string]any{
		"schema":     "interagent/v1",
		"session_id": "ci-failure-notify",
		"turn":       1,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"message_type": "notification",
		"from": map[string]string{
			"agent_id": "operations-agent",
		},
		"to": map[string]string{
			"agent_id": agent.ID,
		},
		"subject": fmt.Sprintf("CI build failure: %s — %s", status.Workflow, status.CommitMsg),
		"urgency": "high",
		"body": map[string]any{
			"type":       "ci_failure",
			"repo":       status.Repo,
			"run_id":     status.RunID,
			"conclusion": status.Conclusion,
			"workflow":   status.Workflow,
			"branch":     status.Branch,
			"commit":     status.CommitMsg,
			"run_url":    fmt.Sprintf("https://github.com/%s/actions/runs/%d", status.Repo, status.RunID),
		},
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, meshBase+"/api/messages/inbound", strings.NewReader(string(body)))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Debug("CI failure notification delivery failed", "agent", agent.ID, "err", err)
		return
	}
	resp.Body.Close()
	logger.Info("CI failure notification sent", "agent", agent.ID, "repo", status.Repo, "status", resp.StatusCode)
}

// notifyAgentCIRecovery sends a CI recovery notification to the agent.
func notifyAgentCIRecovery(registry *server.AgentRegistry, status monitor.CIStatus, logger *slog.Logger) {
	agent := findAgentByRepo(registry, status.Repo)
	if agent == nil || agent.StatusURL == "" {
		return
	}

	meshBase := strings.TrimSuffix(agent.StatusURL, "/api/status")
	msg := map[string]any{
		"schema":     "interagent/v1",
		"session_id": "ci-failure-notify",
		"turn":       1,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"message_type": "notification",
		"from": map[string]string{
			"agent_id": "operations-agent",
		},
		"to": map[string]string{
			"agent_id": agent.ID,
		},
		"subject": fmt.Sprintf("CI build recovered: %s", status.Workflow),
		"urgency": "normal",
		"body": map[string]any{
			"type":       "ci_recovery",
			"repo":       status.Repo,
			"run_id":     status.RunID,
			"conclusion": status.Conclusion,
			"workflow":   status.Workflow,
			"run_url":    fmt.Sprintf("https://github.com/%s/actions/runs/%d", status.Repo, status.RunID),
		},
	}

	body, _ := json.Marshal(msg)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, meshBase+"/api/messages/inbound", strings.NewReader(string(body)))
	if req == nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
	logger.Info("CI recovery notification sent", "agent", agent.ID, "repo", status.Repo)
}

// findAgentByRepo looks up an agent by its GitHub repo path.
func findAgentByRepo(registry *server.AgentRegistry, repo string) *server.AgentInfo {
	agents := registry.Agents()
	// Map repo slug to agent (repo format: "safety-quotient-lab/psychology-agent")
	repoSlug := repo
	for i := range agents {
		if agents[i].Repo == repoSlug {
			return &agents[i]
		}
	}
	// Fallback: match by repo name suffix against agent ID
	parts := strings.SplitN(repo, "/", 2)
	if len(parts) == 2 {
		repoName := parts[1]
		for i := range agents {
			if agents[i].ID == repoName || strings.HasPrefix(agents[i].ID, repoName) {
				return &agents[i]
			}
		}
	}
	return nil
}

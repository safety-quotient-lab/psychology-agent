// meshd — Event-driven mesh daemon for operations-agent.
//
// Replaces cron-based polling with reactive event processing.
// Receives signals from GitHub webhooks, filesystem watchers,
// and periodic polls. Routes events through a priority queue
// with budget-aware gating before spawning Claude contexts.
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
	"strings"
	"log/slog"
	"os"
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

	// Input channel — subsystems push events here, main drains into queue
	eventChan := make(chan events.Event, 256)

	// Budget gate — queries state.db before allowing spawns
	budgetGate := budget.NewGate(cfg.BudgetDBPath, cfg.AgentID, logger)

	// Spawner — manages Claude process lifecycle with circuit breaker
	spawnr := spawner.New(cfg.AgentID, logger)
	spawnr.Command = cfg.SpawnCommand
	spawnr.MaxConcurrent = cfg.MaxConcurrent
	spawnr.Timeout = time.Duration(cfg.SpawnTimeout) * time.Second

	// Dispatcher — routes events from queue → budget check → spawner
	dispatcher := events.NewDispatcher(
		queue,
		func(dctx context.Context, req events.SpawnRequest) error {
			// Acquire mesh-wide spawn slot (max 2 across entire mesh)
			slotPath, slotErr := budgetGate.AcquireSlot()
			if slotErr != nil {
				return fmt.Errorf("spawn slot unavailable: %w", slotErr)
			}
			defer budgetGate.ReleaseSlot(slotPath)

			result, spawnErr := spawnr.Spawn(dctx, req.Prompt)

			// Dual-write: persist spawn result to state.db
			spawnStatus := "completed"
			spawnError := ""
			exitCode := 0
			durationMs := int64(0)
			if result != nil {
				exitCode = result.ExitCode
				durationMs = result.Duration.Milliseconds()
			}
			if spawnErr != nil {
				spawnStatus = "failed"
				spawnError = spawnErr.Error()
			} else if result != nil && result.ExitCode != 0 {
				spawnStatus = "error"
				spawnError = result.Stderr
			}
			cost := budgetGate.EstimateCost(budget.Priority(req.Event.Priority))
			logSQL := fmt.Sprintf(
				"INSERT INTO spawn_log (agent_id, event_id, prompt, exit_code, duration_ms, cost, status, error, started_at) "+
					"VALUES ('%s', '%s', '%s', %d, %d, %d, '%s', '%s', datetime('now'));",
				db.SanitizeID(cfg.AgentID),
				db.EscapeString(req.Event.ID),
				db.EscapeString(req.Prompt[:min(len(req.Prompt), 200)]),
				exitCode, durationMs, cost,
				db.EscapeString(spawnStatus),
				db.EscapeString(spawnError[:min(len(spawnError), 500)]),
			)
			if _, dbErr := db.Exec(cfg.BudgetDBPath, logSQL); dbErr != nil {
				logger.Warn("spawn log write failed", "err", dbErr)
			}

			if spawnErr != nil {
				return spawnErr
			}
			if result.ExitCode != 0 {
				return fmt.Errorf("claude exited with code %d: %s", result.ExitCode, result.Stderr)
			}
			logger.Info("spawn completed",
				"event_id", req.Event.ID,
				"duration", result.Duration,
			)
			return nil
		},
		func(cost int) (bool, string) { return budgetGate.CanSpawn(cost) },
		func(cost int) error { return budgetGate.Deduct(cost) },
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

	// GitHub webhook handler
	webhookHandler := webhook.NewGitHubHandler(cfg.GitHubSecret, eventChan, logger)

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

			// Handle incoming ZMQ messages — emit transport events
			zmqBus.OnMessage(func(m zmqbus.Message) {
				if m.Topic == "transport" {
					// A peer delivered a transport message — emit event
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
	}
	ciMon.OnRecovery = func(status monitor.CIStatus) {
		logger.Info("CI recovered", "repo", status.Repo, "run_id", status.RunID)
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

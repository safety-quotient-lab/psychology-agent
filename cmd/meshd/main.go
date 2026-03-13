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
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/budget"
	"github.com/safety-quotient-lab/operations-agent/internal/config"
	"github.com/safety-quotient-lab/operations-agent/internal/events"
	"github.com/safety-quotient-lab/operations-agent/internal/health"
	"github.com/safety-quotient-lab/operations-agent/internal/monitor"
	"github.com/safety-quotient-lab/operations-agent/internal/notify"
	"github.com/safety-quotient-lab/operations-agent/internal/server"
	"github.com/safety-quotient-lab/operations-agent/internal/spawner"
	"github.com/safety-quotient-lab/operations-agent/internal/transport"
	"github.com/safety-quotient-lab/operations-agent/internal/webhook"
)

const version = "0.1.0"

func main() {
	var (
		configPath string
		port       int
		logLevel   string
	)
	flag.StringVar(&configPath, "config", "", "path to .dev.vars config file")
	flag.IntVar(&port, "port", 0, "override MESHD_PORT")
	flag.StringVar(&logLevel, "log-level", "", "override LOG_LEVEL (debug|info|warn|error)")
	flag.Parse()

	// Load configuration from .dev.vars + environment
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "configuration load failed: %v\n", err)
		os.Exit(1)
	}
	if port > 0 {
		cfg.Port = port
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

	// Transport filesystem watcher
	watcher := transport.NewWatcher(
		cfg.TransportDir,
		time.Duration(cfg.PollInterval)*time.Second,
		eventChan,
		logger,
	)

	// Health monitor — tracks all subsystem health
	healthMon := health.NewMonitor(logger)

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
		"subsystems", "queue,dispatcher,watcher,monitor,server,poll",
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

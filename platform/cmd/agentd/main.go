// agentd — the agent runtime daemon.
//
// One instance per agent. Owns the agent's bounded context:
// state management, sync loop, transport, photonic layer,
// per-agent LCARS dashboard, and HTTP/ZMQ communication.
//
// Usage:
//
//	agentd bootstrap [--project-root .]   Create state.db + state.local.db + keypair
//	agentd serve [--project-root .]       Start the agent daemon
//	agentd --sync-once                    One-shot sync (debug/manual)
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	platform "github.com/safety-quotient-lab/psychology-agent/platform"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/handlers"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/migrate"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/oscillator"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "bootstrap":
		bootstrapCmd(os.Args[2:])
	case "serve":
		serveCmd(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", os.Args[1])
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  agentd bootstrap [--project-root .]\n")
	fmt.Fprintf(os.Stderr, "  agentd serve [--project-root .]\n")
}

// bootstrapCmd creates state.db, state.local.db, and keypair.
// Fails if state.db already exists (use --force to overwrite).
func bootstrapCmd(args []string) {
	fs := flag.NewFlagSet("bootstrap", flag.ExitOnError)
	projectRoot := fs.String("project-root", ".", "Path to the agent project root")
	force := fs.Bool("force", false, "Overwrite existing state.db")
	fs.Parse(args)

	root, err := filepath.Abs(*projectRoot)
	if err != nil {
		log.Fatalf("resolve project root: %v", err)
	}

	dbPath := filepath.Join(root, "state.db")
	localDBPath := filepath.Join(root, "state.local.db")

	// Guard: don't overwrite unless --force
	if !*force {
		if _, err := os.Stat(dbPath); err == nil {
			log.Fatalf("state.db already exists at %s (use --force to overwrite)", dbPath)
		}
	}

	// Create state.db (shared, git-tracked for some tables)
	log.Printf("[bootstrap] creating state.db at %s", dbPath)
	database, err := db.OpenReadWrite(dbPath)
	if err != nil {
		log.Fatalf("create state.db: %v", err)
	}
	defer database.Close()

	if err := migrate.Run(database, root); err != nil {
		log.Fatalf("apply schema to state.db: %v", err)
	}

	// Create state.local.db (machine-local, never git-tracked)
	log.Printf("[bootstrap] creating state.local.db at %s", localDBPath)
	localDB, err := db.OpenReadWrite(localDBPath)
	if err != nil {
		log.Fatalf("create state.local.db: %v", err)
	}
	defer localDB.Close()

	if err := migrate.Run(localDB, root); err != nil {
		log.Fatalf("apply schema to state.local.db: %v", err)
	}

	// TODO: generate CurveZMQ keypair → ~/.agentd/{agent-id}/
	// TODO: seed state.db from transport files + markdown (bootstrap_state_db.py equivalent)

	log.Printf("[bootstrap] complete. Run 'agentd serve --project-root %s' to start.", root)
}

// serveCmd starts the agent daemon.
// Requires state.db to exist (run bootstrap first).
func serveCmd(args []string) {
	flagSet := flag.NewFlagSet("serve", flag.ExitOnError)
	projectRoot := flagSet.String("project-root", ".", "Path to the agent project root")
	port := flagSet.Int("port", 8076, "HTTP port for per-agent dashboard")
	flagSet.Parse(args)

	root, err := filepath.Abs(*projectRoot)
	if err != nil {
		log.Fatalf("resolve project root: %v", err)
	}

	// Fail fast if state.db missing
	dbPath := filepath.Join(root, "state.db")
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Fatalf("state.db not found at %s. Run 'agentd bootstrap' first.", dbPath)
	}

	// Open read-write (agentd owns all writes)
	database, err := db.OpenReadWrite(dbPath)
	if err != nil {
		log.Fatalf("open state.db: %v", err)
	}
	defer database.Close()

	// Apply schema migrations idempotently at startup
	if err := migrate.Run(database, root); err != nil {
		log.Fatalf("schema migration: %v", err)
	}

	// Also open read-only handle for collector (dashboard queries)
	roDB, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("open state.db (ro): %v", err)
	}
	defer roDB.Close()

	// Parse templates (inherited from meshd)
	tmpl, err := parseTemplates()
	if err != nil {
		log.Fatalf("parse templates: %v", err)
	}

	// Collector cache — single source of truth for dashboard data
	cacheTTL := 10 * time.Second
	cache := collector.NewCache(roDB, root, cacheTTL)

	// HTTP routes
	mux := http.NewServeMux()

	// Static assets
	staticSub, err := fs.Sub(platform.StaticFS, "static")
	if err != nil {
		log.Fatalf("static fs: %v", err)
	}
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticSub))))

	// API endpoints (inherited from meshd handlers)
	mux.HandleFunc("/api/status", handlers.APIStatus(cache))
	mux.HandleFunc("/api/kb", handlers.APIKB(cache))
	mux.HandleFunc("/.well-known/agent-card.json", handlers.AgentCard(root))
	mux.HandleFunc("/health", handlers.HealthCheck())

	// Knowledge base routes
	mux.HandleFunc("/kb/decisions", handlers.APIKBDecisions(cache))
	mux.HandleFunc("/kb/triggers", handlers.APIKBTriggers(cache))
	mux.HandleFunc("/kb/claims", handlers.APIKBClaims(cache))
	mux.HandleFunc("/kb/messages", handlers.APIKBMessages(cache))
	mux.HandleFunc("/kb/lessons", handlers.APIKBLessons(cache))
	mux.HandleFunc("/kb/epistemic", handlers.APIKBEpistemic(cache))
	mux.HandleFunc("/kb/catalog", handlers.APIKBCatalog(cache))
	mux.HandleFunc("/kb/memory", handlers.APIKBMemory(cache))
	mux.HandleFunc("/kb/dictionary", handlers.APIKBDictionary(cache))

	// SSE stream
	mux.HandleFunc("/events", handlers.Events(cache))

	// Replay serving
	mux.HandleFunc("/replays/remote/", handlers.RemoteReplay(root))
	mux.HandleFunc("/replays/", handlers.LocalReplay(root))

	// Dashboard (root + /obs)
	dashboard := handlers.ObsDashboard(cache, tmpl)
	mux.HandleFunc("/obs", dashboard)
	mux.HandleFunc("/obs/", dashboard)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodHead {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			return
		}
		dashboard(w, r)
	})

	// Oscillator (self-oscillation activation model)
	oscConfig := oscillator.DefaultConfig(root)
	osc := oscillator.New(oscConfig, database)

	// FireFunc: what happens when the oscillator fires.
	// Phase 2: this invokes the full sync cycle (claude -p /sync).
	// For now: log the fire event.
	osc.FireFunc = func(ctx context.Context) error {
		log.Printf("[agentd] oscillator fired — sync cycle would run here (Phase 2)")
		// TODO Phase 2: syncer.RunSync(ctx, database, root)
		return nil
	}

	// Start oscillator in background
	oscCtx, oscCancel := context.WithCancel(context.Background())
	defer oscCancel()
	go osc.Run(oscCtx)

	// agentd-specific API endpoints (new — stubs for Phase 4+)
	mux.HandleFunc("/api/photonic", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"coherence": 1.0, "state": "active", "maturity": 0.0,
			"spectral_profile": map[string]float64{
				"dopaminergic": 0.33, "serotonergic": 0.34, "noradrenergic": 0.33,
			},
			"note": "stub — real data arrives in Phase 4",
		})
	})

	mux.HandleFunc("/api/oscillator", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"state":         osc.State().String(),
			"coupling_mode": osc.CouplingMode().String(),
			"coherence":     osc.Coherence(),
		})
	})

	// HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf("0.0.0.0:%d", *port),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // SSE requires long-lived connections
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("agentd serving on http://localhost:%d", *port)
		log.Printf("  dashboard: http://localhost:%d/obs", *port)
		log.Printf("  API:       http://localhost:%d/api/status", *port)
		log.Printf("  project:   %s", root)
		// TODO Phase 2: start oscillator loop (self-oscillation)
		// TODO Phase 3: start ZMQ-A (neuromodulatory) + connection manager
		// TODO Phase 4: start ZMQ-B (photonic)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-stop
	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

func parseTemplates() (*template.Template, error) {
	tmpl := template.New("").Funcs(handlers.TemplateFuncs())
	err := fs.WalkDir(platform.TemplatesFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".html") {
			return err
		}
		data, err := platform.TemplatesFS.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read template %s: %w", path, err)
		}
		name := filepath.Base(path)
		_, err = tmpl.New(name).Parse(string(data))
		if err != nil {
			return fmt.Errorf("parse template %s: %w", path, err)
		}
		return nil
	})
	return tmpl, err
}

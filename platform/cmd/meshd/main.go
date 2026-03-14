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
	"os/exec"
	"sync"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	platform "github.com/safety-quotient-lab/psychology-agent/platform"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/handlers"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/zmqbus"
)

func main() {
	port := flag.Int("port", 8077, "HTTP port")
	projectRoot := flag.String("project-root", ".", "Path to the agent project root")
	cacheTTL := flag.Duration("cache-ttl", 10*time.Second, "Cache TTL for collector results")
	agentID := flag.String("agent-id", "", "Agent ID for ZMQ mesh (default: directory name from project-root)")
	zmqPub := flag.String("zmq-pub", "", "ZMQ PUB bind address (e.g. tcp://*:9001). Empty disables ZMQ.")
	zmqPeers := flag.String("zmq-peers", "", "Comma-separated peers: agent-id=zmq-addr[|http-url] (e.g. agent-a=tcp://host:9001|http://host:8076)")
	flag.Parse()

	// Resolve project root to absolute path
	absRoot, err := filepath.Abs(*projectRoot)
	if err != nil {
		log.Fatalf("resolve project root: %v", err)
	}

	// Open state.db
	dbPath := filepath.Join(absRoot, "state.db")
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Fatalf("state.db not found at %s", dbPath)
	}
	database, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer database.Close()

	// Parse templates
	tmpl, err := parseTemplates()
	if err != nil {
		log.Fatalf("parse templates: %v", err)
	}

	// Cache — single source of truth for all handler data
	cache := collector.NewCache(database, absRoot, *cacheTTL)

	// Routes
	mux := http.NewServeMux()

	// Static assets
	staticSub, err := fs.Sub(platform.StaticFS, "static")
	if err != nil {
		log.Fatalf("static fs: %v", err)
	}
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticSub))))

	// API endpoints
	mux.HandleFunc("/api/status", handlers.APIStatus(cache))
	mux.HandleFunc("/api/kb", handlers.APIKB(cache))
	mux.HandleFunc("/.well-known/agent-card.json", handlers.AgentCard(absRoot))
	mux.HandleFunc("/health", handlers.HealthCheck())

	// Knowledge Base routes
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

	// Inbound message delivery (dual-write: state.db + filesystem + ZMQ broadcast)
	_ = dbPath // used by inbound handler
	// zmqPublish wraps bus.Publish — set after bus initialization (below).
	// Uses a closure so the handler registered now picks up the bus later.
	var zmqPublishFn func(string, any) error
	mux.HandleFunc("/api/messages/inbound", handlers.APIInbound(absRoot, dbPath, func(topic string, data any) error {
		if zmqPublishFn != nil {
			return zmqPublishFn(topic, data)
		}
		return nil
	}))

	// Replay serving
	mux.HandleFunc("/replays/remote/", handlers.RemoteReplay(absRoot))
	mux.HandleFunc("/replays/", handlers.LocalReplay(absRoot))

	// Dashboard (root + /obs)
	dashboard := handlers.ObsDashboard(cache, tmpl)
	mux.HandleFunc("/obs", dashboard)
	mux.HandleFunc("/obs/", dashboard)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// HEAD requests for health checks
		if r.Method == http.MethodHead {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			return
		}
		dashboard(w, r)
	})

	// Server
	srv := &http.Server{
		Addr:         fmt.Sprintf("0.0.0.0:%d", *port),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // disabled — SSE requires long-lived connections
		IdleTimeout:  120 * time.Second,
	}

	// ZMQ transport (optional)
	var bus *zmqbus.Bus
	if *zmqPub != "" {
		id := *agentID
		if id == "" {
			id = filepath.Base(absRoot)
		}
		httpURL := fmt.Sprintf("http://localhost:%d", *port)
		bus = zmqbus.New(id, *zmqPub, httpURL)
		if err := bus.Start(); err != nil {
			log.Fatalf("zmq start: %v", err)
		}

		// Connect to initial peers (format: agent-id=zmq-addr[|http-url])
		if *zmqPeers != "" {
			for _, entry := range strings.Split(*zmqPeers, ",") {
				parts := strings.SplitN(strings.TrimSpace(entry), "=", 2)
				if len(parts) != 2 {
					log.Printf("[zmq] skipping malformed peer entry: %s", entry)
					continue
				}
				info := zmqbus.PeerInfo{AgentID: parts[0]}
				addrs := strings.SplitN(parts[1], "|", 2)
				info.ZMQPub = addrs[0]
				if len(addrs) == 2 {
					info.HTTPURL = addrs[1]
				}
				bus.ConnectPeer(info)
			}
		}

		// Track last event-triggered spawn to debounce
		var lastEventSpawn time.Time
		var eventSpawnMu sync.Mutex

		// Wire ZMQ publish into inbound handler
		zmqPublishFn = bus.Publish

		// Log incoming messages + invalidate cache + event-triggered sync
		bus.OnMessage(func(m zmqbus.Message) {
			log.Printf("[zmq] %s/%s from %s", m.Topic, m.From, m.Timestamp.Format(time.RFC3339))
			// Invalidate cache so SSE clients pick up any state.db changes
			if m.Topic == "health" || m.Topic == "event" {
				cache.Invalidate()
			}
			// Transport event: trigger fast autonomous sync (debounced)
			if m.Topic == "transport" && m.From != id {
				eventSpawnMu.Lock()
				since := time.Since(lastEventSpawn)
				eventSpawnMu.Unlock()
				if since > 30*time.Second {
					eventSpawnMu.Lock()
					lastEventSpawn = time.Now()
					eventSpawnMu.Unlock()
					log.Printf("[zmq] transport event from %s — triggering event-sync", m.From)
					go func() {
						syncScript := filepath.Join(absRoot, "scripts", "autonomous-sync.sh")
						// Use login shell to get NVM/claude on PATH
					cmd := exec.Command("bash", "-l", syncScript, "--event-triggered")
						cmd.Dir = absRoot
						cmd.Stdout = os.Stdout
						cmd.Stderr = os.Stderr
						if err := cmd.Run(); err != nil {
							log.Printf("[zmq] event-sync failed: %v", err)
						}
					}()
				} else {
					log.Printf("[zmq] transport event debounced (%.0fs since last)", since.Seconds())
				}
			}
		})

		// Expose ZMQ peers via API
		mux.HandleFunc("/api/zmq/peers", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(bus.KnownPeers())
		})

		// Accept peer registration (reverse-registration for bidirectional discovery)
		mux.HandleFunc("/api/zmq/register", func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				http.Error(w, "POST required", http.StatusMethodNotAllowed)
				return
			}
			var info zmqbus.PeerInfo
			if err := json.NewDecoder(r.Body).Decode(&info); err != nil {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			added := bus.RegisterPeer(info)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]bool{"added": added})
		})

		fmt.Printf("  ZMQ PUB:    %s\n", *zmqPub)
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		fmt.Printf("meshd serving on http://localhost:%d\n", *port)
		fmt.Printf("  API:        http://localhost:%d/api/status\n", *port)
		fmt.Printf("  KB:         http://localhost:%d/api/kb\n", *port)
		fmt.Printf("  Claims:     http://localhost:%d/kb/claims\n", *port)
		fmt.Printf("  Dictionary: http://localhost:%d/kb/dictionary\n", *port)
		fmt.Printf("  Dashboard:  http://localhost:%d/\n", *port)
		fmt.Printf("  Cache TTL:  %s\n", *cacheTTL)
		fmt.Printf("  Project:    %s\n", absRoot)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-stop
	fmt.Println("\nshutting down...")

	if bus != nil {
		bus.Stop()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

func parseTemplates() (*template.Template, error) {
	tmpl := template.New("").Funcs(handlers.TemplateFuncs())

	// Walk embedded FS and parse all .html files
	err := fs.WalkDir(platform.TemplatesFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".html") {
			return err
		}
		data, err := platform.TemplatesFS.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read template %s: %w", path, err)
		}
		// Use the filename (without directory) as template name
		name := filepath.Base(path)
		_, err = tmpl.New(name).Parse(string(data))
		if err != nil {
			return fmt.Errorf("parse template %s: %w", path, err)
		}
		return nil
	})
	return tmpl, err
}

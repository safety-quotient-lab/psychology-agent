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
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/migrate"
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
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	projectRoot := fs.String("project-root", ".", "Path to the agent project root")
	port := fs.Int("port", 8076, "HTTP port for per-agent dashboard")
	fs.Parse(args)

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

	log.Printf("agentd serving on http://localhost:%d", *port)
	log.Printf("  project: %s", root)
	log.Printf("  state.db: %s", dbPath)

	// TODO Phase 1: start HTTP server (inherit meshd templates + handlers)
	// TODO Phase 2: start oscillator loop (self-oscillation)
	// TODO Phase 3: start ZMQ-A (neuromodulatory) + connection manager
	// TODO Phase 4: start ZMQ-B (photonic)

	// For now: block forever (placeholder for event loop)
	select {}
}

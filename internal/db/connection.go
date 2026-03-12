// Package db manages dual-DB connections (state.db + state.local.db).
//
// state.db holds project knowledge (exportable, gitignored).
// state.local.db holds machine-local state (never shared, gitignored).
// Schema source of truth: internal/db/schema_shared.sql + schema_local.sql
// (embedded at compile time).
package db

import (
	"database/sql"
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

//go:embed schema_shared.sql
var sharedSchemaSQL string

//go:embed schema_local.sql
var localSchemaSQL string

// Manager holds connections to both databases.
type Manager struct {
	shared *sql.DB
	local  *sql.DB
	root   string
}

// ProjectRoot returns the resolved project root directory.
// Honors PROJECT_ROOT env var for symlinked scripts.
func ProjectRoot() string {
	if env := os.Getenv("PROJECT_ROOT"); env != "" {
		return env
	}
	dir, err := os.Getwd()
	if err != nil {
		return "."
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "scripts", "schema.sql")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	cwd, _ := os.Getwd()
	return cwd
}

// NewManager creates a dual-DB manager, bootstrapping databases from
// embedded schema if they do not exist.
func NewManager() (*Manager, error) {
	root := ProjectRoot()
	m := &Manager{root: root}
	if err := m.openShared(); err != nil {
		return nil, fmt.Errorf("shared db: %w", err)
	}
	if err := m.openLocal(); err != nil {
		return nil, fmt.Errorf("local db: %w", err)
	}
	return m, nil
}

// Bootstrap recreates both databases from embedded schema.
// When force=true, deletes existing databases first.
// Returns a ready Manager.
func Bootstrap(force bool) (*Manager, error) {
	root := ProjectRoot()

	if force {
		for _, name := range []string{"state.db", "state.db-wal", "state.db-shm",
			"state.local.db", "state.local.db-wal", "state.local.db-shm"} {
			os.Remove(filepath.Join(root, name))
		}
	}

	m := &Manager{root: root}
	if err := m.openShared(); err != nil {
		return nil, fmt.Errorf("bootstrap shared: %w", err)
	}
	if err := m.openLocal(); err != nil {
		return nil, fmt.Errorf("bootstrap local: %w", err)
	}

	// Apply schema to ensure tables exist (idempotent CREATE IF NOT EXISTS)
	if _, err := m.shared.Exec(sharedSchemaSQL); err != nil {
		return nil, fmt.Errorf("apply shared schema: %w", err)
	}
	if _, err := m.local.Exec(localSchemaSQL); err != nil {
		return nil, fmt.Errorf("apply local schema: %w", err)
	}

	return m, nil
}

func (m *Manager) openShared() error {
	path := filepath.Join(m.root, "state.db")
	needsBootstrap := !fileExists(path)
	conn, err := sql.Open("sqlite", path+"?_pragma=journal_mode(wal)&_pragma=foreign_keys(on)")
	if err != nil {
		return err
	}
	if needsBootstrap {
		if _, err := conn.Exec(sharedSchemaSQL); err != nil {
			return fmt.Errorf("bootstrap shared schema: %w", err)
		}
		fmt.Fprintf(os.Stderr, "state.db created from embedded schema\n")
	}
	m.shared = conn
	return nil
}

func (m *Manager) openLocal() error {
	path := filepath.Join(m.root, "state.local.db")
	needsBootstrap := !fileExists(path)
	conn, err := sql.Open("sqlite", path+"?_pragma=journal_mode(wal)&_pragma=foreign_keys(on)")
	if err != nil {
		return err
	}
	if needsBootstrap {
		if _, err := conn.Exec(localSchemaSQL); err != nil {
			return fmt.Errorf("bootstrap local schema: %w", err)
		}
		fmt.Fprintf(os.Stderr, "state.local.db created from embedded schema\n")
	}
	m.local = conn
	return nil
}

// Shared returns the state.db connection (project knowledge).
func (m *Manager) Shared() *sql.DB { return m.shared }

// Local returns the state.local.db connection (machine-local state).
func (m *Manager) Local() *sql.DB { return m.local }

// Root returns the project root path.
func (m *Manager) Root() string { return m.root }

// Close closes both database connections.
func (m *Manager) Close() error {
	var errs []string
	if m.shared != nil {
		if err := m.shared.Close(); err != nil {
			errs = append(errs, err.Error())
		}
	}
	if m.local != nil {
		if err := m.local.Close(); err != nil {
			errs = append(errs, err.Error())
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("close errors: %s", strings.Join(errs, "; "))
	}
	return nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

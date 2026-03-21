package db

import (
	"database/sql"
	"fmt"
	"sync"

	_ "modernc.org/sqlite"
)

// DB wraps a SQLite connection for state queries and writes.
type DB struct {
	conn     *sql.DB
	mu       sync.RWMutex
	readOnly bool
}

// Open creates a read-only connection to the state database.
// Used by meshd (fleet aggregator) which should never write.
func Open(path string) (*DB, error) {
	dsn := fmt.Sprintf("file:%s?mode=ro&_journal_mode=WAL&_busy_timeout=5000", path)
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open state.db: %w", err)
	}
	conn.SetMaxOpenConns(4)
	if err := conn.Ping(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("ping state.db: %w", err)
	}
	return &DB{conn: conn, readOnly: true}, nil
}

// OpenReadWrite creates a read-write connection to the state database.
// Used by agentd which owns all state writes.
func OpenReadWrite(path string) (*DB, error) {
	dsn := fmt.Sprintf("file:%s?_journal_mode=WAL&_busy_timeout=5000&_txlock=immediate", path)
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open state.db (rw): %w", err)
	}
	conn.SetMaxOpenConns(1) // single writer — WAL mode
	if err := conn.Ping(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("ping state.db (rw): %w", err)
	}
	// Enable foreign keys for write connections
	if _, err := conn.Exec("PRAGMA foreign_keys = ON"); err != nil {
		conn.Close()
		return nil, fmt.Errorf("enable foreign keys: %w", err)
	}
	return &DB{conn: conn, readOnly: false}, nil
}

// Close releases the database connection.
func (d *DB) Close() error {
	return d.conn.Close()
}

// QueryRows runs a query and returns a slice of maps (column name → value).
func (d *DB) QueryRows(query string, args ...any) ([]map[string]any, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.conn.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var result []map[string]any
	for rows.Next() {
		values := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range values {
			ptrs[i] = &values[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = values[i]
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

// Scalar runs a query and returns a single value.
func (d *DB) Scalar(query string, args ...any) (any, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var val any
	err := d.conn.QueryRow(query, args...).Scan(&val)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return val, err
}

// ScalarInt runs a query and returns a single integer, defaulting to 0.
func (d *DB) ScalarInt(query string, args ...any) int {
	val, err := d.Scalar(query, args...)
	if err != nil || val == nil {
		return 0
	}
	switch v := val.(type) {
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return 0
	}
}

// Exec runs a write query (INSERT, UPDATE, DELETE, CREATE TABLE, etc.).
// Returns the number of rows affected.
func (d *DB) Exec(query string, args ...any) (int64, error) {
	if d.readOnly {
		return 0, fmt.Errorf("cannot write to read-only database")
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	result, err := d.conn.Exec(query, args...)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// ExecTx runs a function within a transaction. If the function returns
// an error, the transaction rolls back. Otherwise it commits.
func (d *DB) ExecTx(fn func(tx *sql.Tx) error) error {
	if d.readOnly {
		return fmt.Errorf("cannot write to read-only database")
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	tx, err := d.conn.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

// ExecScript runs a multi-statement SQL script (e.g., schema.sql).
// Wraps the entire script in a transaction.
func (d *DB) ExecScript(script string) error {
	if d.readOnly {
		return fmt.Errorf("cannot write to read-only database")
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.conn.Exec(script)
	return err
}

// ReadOnly reports whether this connection allows writes.
func (d *DB) ReadOnly() bool {
	return d.readOnly
}

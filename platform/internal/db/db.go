package db

import (
	"database/sql"
	"fmt"
	"sync"

	_ "modernc.org/sqlite"
)

// DB wraps a read-only SQLite connection for mesh state queries.
type DB struct {
	conn *sql.DB
	mu   sync.RWMutex
}

// Open creates a read-only connection to the state database.
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
	return &DB{conn: conn}, nil
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

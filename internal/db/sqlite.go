// Package db provides shared SQLite access via the sqlite3 CLI.
// Zero CGO dependency — all queries execute through the sqlite3
// command-line tool for maximum portability.
//
// This package centralizes database access patterns that previously
// lived in kb.go, gate.go, and inbound.go.
package db

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

// Exec runs a SQL statement against the database at dbPath.
// Returns the raw output and any error.
func Exec(dbPath, query string) (string, error) {
	cmd := exec.Command("sqlite3", dbPath, query)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// QueryJSON runs a SELECT query with sqlite3's -json output mode.
// Returns a slice of maps with all values as strings.
// Missing tables or empty results return an empty slice (never error).
func QueryJSON(dbPath, query string) ([]map[string]string, error) {
	cmd := exec.Command("sqlite3", "-json", dbPath, query)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return []map[string]string{}, err
	}

	trimmed := strings.TrimSpace(string(out))
	if trimmed == "" || trimmed == "[]" {
		return []map[string]string{}, nil
	}

	// sqlite3 -json returns INTEGER columns as JSON numbers.
	// Unmarshal into interface{} first, then convert to strings.
	var rawRows []map[string]interface{}
	if jErr := json.Unmarshal([]byte(trimmed), &rawRows); jErr != nil {
		return []map[string]string{}, fmt.Errorf("parse sqlite3 JSON: %w", jErr)
	}

	rows := make([]map[string]string, len(rawRows))
	for i, raw := range rawRows {
		row := make(map[string]string, len(raw))
		for k, v := range raw {
			if v == nil {
				row[k] = ""
			} else {
				row[k] = fmt.Sprintf("%v", v)
			}
		}
		rows[i] = row
	}
	return rows, nil
}

// QueryScalar runs a query that returns a single value (e.g., COUNT(*)).
// Returns 0 on any failure.
func QueryScalar(dbPath, query string) int {
	output, err := Exec(dbPath, query)
	if err != nil {
		return 0
	}
	trimmed := strings.TrimSpace(output)
	if trimmed == "" {
		return 0
	}
	var count int
	if _, scanErr := fmt.Sscanf(trimmed, "%d", &count); scanErr != nil {
		return 0
	}
	return count
}

// EscapeString escapes single quotes for safe SQL string interpolation.
// For agent IDs and controlled strings only — not for arbitrary user input.
func EscapeString(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

// SanitizeID strips characters that could cause SQL injection from an
// identifier. Only alphanumeric, hyphen, and underscore pass through.
func SanitizeID(id string) string {
	var b strings.Builder
	b.Grow(len(id))
	for _, r := range id {
		switch {
		case r >= 'a' && r <= 'z',
			r >= 'A' && r <= 'Z',
			r >= '0' && r <= '9',
			r == '-', r == '_':
			b.WriteRune(r)
		}
	}
	return b.String()
}

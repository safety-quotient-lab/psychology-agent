// Package migrate applies the canonical schema to state.db at startup.
// The schema file (schema.sql) lives in platform/shared/scripts/ and
// uses CREATE TABLE IF NOT EXISTS + INSERT OR IGNORE for idempotency.
// agentd runs this at serve startup; bootstrap runs it at first creation.
package migrate

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Run applies schema.sql to the database idempotently.
// The schema uses CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE,
// so running it multiple times produces no harm.
func Run(database *db.DB, projectRoot string) error {
	schemaPath := findSchema(projectRoot)
	if schemaPath == "" {
		return fmt.Errorf("schema.sql not found in %s", projectRoot)
	}

	script, err := os.ReadFile(schemaPath)
	if err != nil {
		return fmt.Errorf("read schema.sql: %w", err)
	}

	log.Printf("[migrate] applying schema from %s (%d bytes)", schemaPath, len(script))

	// Schema.sql contains both CREATE TABLE IF NOT EXISTS (idempotent) and
	// ALTER TABLE ADD COLUMN (fails if column already exists). Split the
	// script into individual statements and execute each, ignoring
	// "duplicate column" errors from ALTER TABLE on subsequent runs.
	if err := applyStatements(database, string(script)); err != nil {
		return fmt.Errorf("apply schema.sql: %w", err)
	}

	log.Printf("[migrate] schema applied successfully")
	return nil
}

// applyStatements splits a SQL script into individual statements and
// executes each one. ALTER TABLE errors for duplicate columns get
// logged as warnings rather than treated as fatal — these occur
// normally on subsequent runs when migrations have already applied.
func applyStatements(database *db.DB, script string) error {
	statements := splitStatements(script)
	applied, skipped := 0, 0
	for _, stmt := range statements {
		if stmt == "" {
			continue
		}
		_, err := database.Exec(stmt)
		if err != nil {
			errMsg := err.Error()
			// Duplicate column from ALTER TABLE = already migrated, skip
			if contains(errMsg, "duplicate column") {
				skipped++
				continue
			}
			// Table already exists from CREATE TABLE (without IF NOT EXISTS) = skip
			if contains(errMsg, "already exists") {
				skipped++
				continue
			}
			return fmt.Errorf("statement failed: %w\n  SQL: %.100s", err, stmt)
		}
		applied++
	}
	log.Printf("[migrate] %d statements applied, %d skipped (already migrated)", applied, skipped)
	return nil
}

// splitStatements splits a SQL script on semicolons, handling:
// - Single-line comments (-- to end of line)
// - String literals ('...' containing semicolons)
// - CREATE TRIGGER blocks (semicolons inside BEGIN...END)
func splitStatements(script string) []string {
	var statements []string
	var current []byte
	inString := false
	inTrigger := false

	for i := 0; i < len(script); i++ {
		ch := script[i]

		// Skip single-line comments (-- to end of line)
		if !inString && ch == '-' && i+1 < len(script) && script[i+1] == '-' {
			for i < len(script) && script[i] != '\n' {
				i++
			}
			current = append(current, '\n')
			continue
		}

		// Track string literals
		if ch == '\'' {
			inString = !inString
		}

		// Track BEGIN...END blocks (triggers)
		if !inString {
			rest := strings.ToUpper(strings.TrimSpace(string(current)))
			if strings.HasSuffix(rest, "BEGIN") {
				inTrigger = true
			}
			// END followed by semicolon closes the trigger
			if inTrigger && ch == ';' {
				trimmed := strings.TrimSpace(string(current))
				if strings.HasSuffix(strings.ToUpper(trimmed), "END") {
					current = append(current, ch)
					stmt := strings.TrimSpace(string(current))
					if stmt != "" {
						statements = append(statements, stmt)
					}
					current = current[:0]
					inTrigger = false
					continue
				}
			}
		}

		// Split on semicolons outside strings and outside triggers
		if ch == ';' && !inString && !inTrigger {
			stmt := strings.TrimSpace(string(current))
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current = current[:0]
			continue
		}

		current = append(current, ch)
	}
	if stmt := strings.TrimSpace(string(current)); stmt != "" {
		statements = append(statements, stmt)
	}
	return statements
}

func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// findSchema locates schema.sql in the project directory tree.
// Checks (in order): scripts/schema.sql, platform/shared/scripts/schema.sql
func findSchema(projectRoot string) string {
	candidates := []string{
		filepath.Join(projectRoot, "scripts", "schema.sql"),
		filepath.Join(projectRoot, "platform", "shared", "scripts", "schema.sql"),
	}
	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return ""
}

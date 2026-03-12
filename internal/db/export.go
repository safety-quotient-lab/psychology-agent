package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
)

// SanitizeColumns lists columns to null out in shared-tier exports.
var SanitizeColumns = map[string][]string{
	"transport_messages": {"subject"},
}

// ExportProfile determines which visibility tiers get included.
type ExportProfile string

const (
	ProfileSeed     ExportProfile = "seed"     // public only
	ProfileRelease  ExportProfile = "release"  // public + shared
	ProfileLicensed ExportProfile = "licensed" // public + shared + commercial
	ProfileFull     ExportProfile = "full"     // all tiers
)

// TableInfo holds export metadata for a table.
type TableInfo struct {
	Name        string
	Visibility  string
	Description string
}

// GetVisibleTables returns tables matching the requested profile.
func GetVisibleTables(db *sql.DB, profile ExportProfile) ([]TableInfo, error) {
	var where string
	switch profile {
	case ProfileFull:
		where = "1=1"
	case ProfileLicensed:
		where = "default_visibility IN ('public', 'shared', 'commercial')"
	case ProfileRelease:
		where = "default_visibility IN ('public', 'shared')"
	default:
		where = "default_visibility = 'public'"
	}

	rows, err := db.Query(fmt.Sprintf(`
		SELECT table_name, default_visibility, description
		FROM table_visibility WHERE %s ORDER BY table_name`, where))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		var t TableInfo
		if err := rows.Scan(&t.Name, &t.Visibility, &t.Description); err != nil {
			continue
		}
		tables = append(tables, t)
	}
	return tables, nil
}

func getColumns(db *sql.DB, tableName string) ([]string, error) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []string
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull int
		var dfltValue sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltValue, &pk); err != nil {
			continue
		}
		cols = append(cols, name)
	}
	return cols, nil
}

func copyTable(source, dest *sql.DB, tableName, visibility string) (int, error) {
	cols, err := getColumns(source, tableName)
	if err != nil || len(cols) == 0 {
		return 0, err
	}

	// Build SELECT with sanitization
	selectCols := ""
	for i, col := range cols {
		if i > 0 {
			selectCols += ", "
		}
		sanitize := false
		if visibility == "shared" {
			for _, sc := range SanitizeColumns[tableName] {
				if col == sc {
					sanitize = true
					break
				}
			}
		}
		if sanitize {
			selectCols += fmt.Sprintf("NULL as %s", col)
		} else {
			selectCols += col
		}
	}

	rows, err := source.Query(fmt.Sprintf("SELECT %s FROM %s", selectCols, tableName))
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	placeholders := ""
	colList := ""
	for i, c := range cols {
		if i > 0 {
			placeholders += ", "
			colList += ", "
		}
		placeholders += "?"
		colList += c
	}
	insertSQL := fmt.Sprintf("INSERT OR IGNORE INTO %s (%s) VALUES (%s)", tableName, colList, placeholders)

	count := 0
	for rows.Next() {
		values := make([]any, len(cols))
		valuePtrs := make([]any, len(cols))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		if _, err := dest.Exec(insertSQL, values...); err != nil {
			continue
		}
		count++
	}
	return count, nil
}

// Export generates an export database from state.db.
func Export(sourceDB *sql.DB, projectRoot string, profile ExportProfile, outputPath string, dryRun bool) error {
	if outputPath == "" {
		outputPath = filepath.Join(projectRoot, "state-public.db")
	}

	tables, err := GetVisibleTables(sourceDB, profile)
	if err != nil {
		return fmt.Errorf("get visible tables: %w", err)
	}

	fmt.Printf("Export profile: %s\n", profile)
	fmt.Printf("Tables included: %d\n\n", len(tables))

	markers := map[string]string{
		"public": "●", "shared": "◐", "commercial": "◆", "private": "○",
	}
	for _, t := range tables {
		var rowCount int
		sourceDB.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", t.Name)).Scan(&rowCount)
		marker := markers[t.Visibility]
		if marker == "" {
			marker = "?"
		}
		fmt.Printf("  %s %s: %d rows (%s)\n", marker, t.Name, rowCount, t.Visibility)
		if sanitized, ok := SanitizeColumns[t.Name]; ok {
			fmt.Printf("    ↳ sanitized: %v → NULL\n", sanitized)
		}
	}

	if dryRun {
		fmt.Printf("\nDry run — pass without --dry-run to write to %s\n", outputPath)
		return nil
	}

	// Remove existing output
	os.Remove(outputPath)

	dest, err := sql.Open("sqlite", outputPath+"?_pragma=journal_mode(wal)&_pragma=foreign_keys(on)")
	if err != nil {
		return fmt.Errorf("create output db: %w", err)
	}
	defer dest.Close()

	// Apply shared schema to create tables
	if _, err := dest.Exec(sharedSchemaSQL); err != nil {
		return fmt.Errorf("apply schema to export: %w", err)
	}

	totalRows := 0
	for _, t := range tables {
		count, err := copyTable(sourceDB, dest, t.Name, t.Visibility)
		if err != nil {
			fmt.Fprintf(os.Stderr, "warning: copy %s failed: %v\n", t.Name, err)
			continue
		}
		totalRows += count
	}

	// Always include table_visibility and schema_version
	copyTable(sourceDB, dest, "table_visibility", "public")
	copyTable(sourceDB, dest, "schema_version", "public")

	fi, _ := os.Stat(outputPath)
	sizeKB := float64(0)
	if fi != nil {
		sizeKB = float64(fi.Size()) / 1024
	}
	fmt.Printf("\nExported: %s (%.1f KB, %d rows)\n", outputPath, sizeKB, totalRows)
	return nil
}

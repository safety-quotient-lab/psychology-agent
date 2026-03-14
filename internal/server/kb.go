// Package server — kb.go provides the GET /api/kb handler that serves
// knowledge-base data from state.db via the sqlite3 CLI (zero CGO).
//
// Tables queried: decisions, claims, trigger_state, memory_entries,
// transport_messages. Missing tables produce empty arrays — never errors.
package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
)

// kbResponse defines the JSON envelope returned by GET /api/kb.
type kbResponse struct {
	Status string `json:"status"`
	Data   kbData `json:"data"`
}

// kbData holds every knowledge-base section the compositor dashboard consumes.
type kbData struct {
	Decisions []map[string]string `json:"decisions"`
	Claims    []map[string]string `json:"claims"`
	Triggers  []map[string]string `json:"triggers"`
	Messages  []map[string]string `json:"messages"`
	Memory    kbMemory            `json:"memory"`
	Catalog   kbCatalog           `json:"catalog"`
	Totals    kbTotals            `json:"totals"`
}

// kbMemory groups memory entries and topic aggregation.
type kbMemory struct {
	Entries []map[string]string `json:"entries"`
	ByTopic []map[string]string `json:"by_topic"`
}

// kbCatalog holds active catalog items.
type kbCatalog struct {
	Active []map[string]string `json:"active"`
}

// kbTotals provides dashboard-friendly counts.
type kbTotals struct {
	Decisions      int `json:"decisions"`
	Claims         int `json:"claims"`
	ClaimsVerified int `json:"claims_verified"`
	ClaimsStale    int `json:"claims_stale"`
	Triggers       int `json:"triggers"`
	MemoryEntries  int `json:"memory_entries"`
	StaleEntries   int `json:"stale_entries"`
	Lessons        int `json:"lessons"`
	LessonsStale   int `json:"lessons_stale"`
}

// handleKB serves GET /api/kb — queries state.db and returns knowledge-base
// data for the compositor dashboard.
func (s *Server) handleKB(w http.ResponseWriter, r *http.Request) {
	dbPath := s.Config.BudgetDBPath

	// When state.db does not exist, return an empty-but-valid response.
	if _, err := os.Stat(dbPath); err != nil {
		s.logger.Info("state.db not found, returning empty KB response", "path", dbPath)
		writeJSON(w, http.StatusOK, kbResponse{
			Status: "ok",
			Data:   emptyKBData(),
		}, s.logger)
		return
	}

	data := emptyKBData()

	// Query each table independently; missing tables produce empty results.
	data.Decisions = s.kbQuery(dbPath, "SELECT * FROM decisions ORDER BY created_at DESC")
	data.Claims = s.kbQuery(dbPath, "SELECT * FROM claims ORDER BY created_at DESC")
	data.Triggers = s.kbQuery(dbPath, "SELECT * FROM trigger_state ORDER BY last_fired DESC")
	data.Memory.Entries = s.kbQuery(dbPath, "SELECT * FROM memory_entries ORDER BY last_confirmed DESC")
	data.Messages = s.kbQuery(dbPath, "SELECT filename, session_name, direction, from_agent, to_agent, turn, message_type, subject, timestamp, processed FROM transport_messages ORDER BY timestamp DESC")

	// Totals — each count query runs independently and defaults to zero.
	data.Totals.Decisions = s.kbCount(dbPath, "SELECT count(*) FROM decisions")
	data.Totals.Claims = s.kbCount(dbPath, "SELECT count(*) FROM claims")
	data.Totals.ClaimsVerified = s.kbCount(dbPath, "SELECT count(*) FROM claims WHERE status = 'verified'")
	data.Totals.ClaimsStale = s.kbCount(dbPath, "SELECT count(*) FROM claims WHERE status = 'stale'")
	data.Totals.Triggers = s.kbCount(dbPath, "SELECT count(*) FROM trigger_state")
	data.Totals.MemoryEntries = s.kbCount(dbPath, "SELECT count(*) FROM memory_entries")
	data.Totals.StaleEntries = s.kbCount(dbPath, "SELECT count(*) FROM memory_entries WHERE status = 'stale'")
	data.Totals.Lessons = s.kbCount(dbPath, "SELECT count(*) FROM memory_entries WHERE topic = 'lesson'")
	data.Totals.LessonsStale = s.kbCount(dbPath, "SELECT count(*) FROM memory_entries WHERE topic = 'lesson' AND status = 'stale'")

	writeJSON(w, http.StatusOK, kbResponse{
		Status: "ok",
		Data:   data,
	}, s.logger)
}

// kbQuery runs a SELECT query against dbPath using sqlite3 in JSON mode.
// Returns a slice of maps on success, or an empty slice when the table
// does not exist or the query fails for any reason.
func (s *Server) kbQuery(dbPath, query string) []map[string]string {
	output, err := execSQLite(dbPath, "-json", query)
	if err != nil {
		// Missing table or other failure — log at debug level and move on.
		s.logger.Debug("kb query returned no results", "query", query, "err", err)
		return []map[string]string{}
	}

	trimmed := strings.TrimSpace(output)
	if trimmed == "" || trimmed == "[]" {
		return []map[string]string{}
	}

	var rows []map[string]string
	if jErr := json.Unmarshal([]byte(trimmed), &rows); jErr != nil {
		s.logger.Warn("failed to parse sqlite3 JSON output", "query", query, "err", jErr)
		return []map[string]string{}
	}
	return rows
}

// kbCount runs a scalar count query and returns the integer result.
// Returns 0 when the table does not exist or the query fails.
func (s *Server) kbCount(dbPath, query string) int {
	output, err := execSQLite(dbPath, "", query)
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

// execSQLite shells out to the sqlite3 CLI. When mode contains a non-empty
// value (e.g. "-json"), that flag gets passed before the query.
func execSQLite(dbPath, mode, query string) (string, error) {
	var args []string
	if mode != "" {
		args = []string{mode, dbPath, query}
	} else {
		args = []string{dbPath, query}
	}
	cmd := exec.Command("sqlite3", args...)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// emptyKBData constructs a kbData with all slices initialized to empty
// (never nil) so JSON serialization produces [] rather than null.
func emptyKBData() kbData {
	return kbData{
		Decisions: []map[string]string{},
		Claims:    []map[string]string{},
		Triggers:  []map[string]string{},
		Messages:  []map[string]string{},
		Memory: kbMemory{
			Entries: []map[string]string{},
			ByTopic: []map[string]string{},
		},
		Catalog: kbCatalog{
			Active: []map[string]string{},
		},
		Totals: kbTotals{},
	}
}

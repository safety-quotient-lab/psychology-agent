// Package server — kb.go provides the GET /api/kb handler that serves
// knowledge-base data from state.db via the sqlite3 CLI (zero CGO).
//
// Tables queried: decisions, claims, trigger_state, memory_entries,
// transport_messages. Missing tables produce empty arrays — never errors.
package server

import (
	"net/http"
	"os"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
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
	query := func(q string) []map[string]string {
		rows, err := db.QueryJSON(dbPath, q)
		if err != nil {
			s.logger.Debug("kb query failed", "query", q, "err", err)
		}
		return rows
	}

	data.Decisions = query("SELECT * FROM decisions ORDER BY created_at DESC")
	data.Claims = query("SELECT * FROM claims ORDER BY created_at DESC")
	data.Triggers = query("SELECT * FROM trigger_state ORDER BY last_fired DESC")
	data.Memory.Entries = query("SELECT * FROM memory_entries ORDER BY last_confirmed DESC")
	data.Messages = query("SELECT filename, session_name, direction, from_agent, to_agent, turn, message_type, subject, timestamp, processed FROM transport_messages ORDER BY timestamp DESC")

	// Totals — each count query runs independently and defaults to zero.
	data.Totals.Decisions = db.QueryScalar(dbPath, "SELECT count(*) FROM decisions")
	data.Totals.Claims = db.QueryScalar(dbPath, "SELECT count(*) FROM claims")
	data.Totals.ClaimsVerified = db.QueryScalar(dbPath, "SELECT count(*) FROM claims WHERE status = 'verified'")
	data.Totals.ClaimsStale = db.QueryScalar(dbPath, "SELECT count(*) FROM claims WHERE status = 'stale'")
	data.Totals.Triggers = db.QueryScalar(dbPath, "SELECT count(*) FROM trigger_state")
	data.Totals.MemoryEntries = db.QueryScalar(dbPath, "SELECT count(*) FROM memory_entries")
	data.Totals.StaleEntries = db.QueryScalar(dbPath, "SELECT count(*) FROM memory_entries WHERE status = 'stale'")
	data.Totals.Lessons = db.QueryScalar(dbPath, "SELECT count(*) FROM memory_entries WHERE topic = 'lesson'")
	data.Totals.LessonsStale = db.QueryScalar(dbPath, "SELECT count(*) FROM memory_entries WHERE topic = 'lesson' AND status = 'stale'")

	writeJSON(w, http.StatusOK, kbResponse{
		Status: "ok",
		Data:   data,
	}, s.logger)
}

// execSQLite shells out to the sqlite3 CLI. Kept as a thin wrapper
// around db.Exec for backward compatibility with inbound.go.
func execSQLite(dbPath, mode, query string) (string, error) {
	if mode != "" {
		// -json mode: use db.QueryJSON indirectly — but callers
		// that need -json now use db.QueryJSON directly.
		return db.Exec(dbPath, query)
	}
	return db.Exec(dbPath, query)
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

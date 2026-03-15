// Package server — search.go provides GET /api/search for full-text
// search across transport messages, decisions, and vocabulary.
//
// Uses SQLite FTS5 virtual tables for fast keyword matching.
// Falls back to LIKE queries when FTS tables don't exist.
package server

import (
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// ftsSpecialRe matches FTS5 special characters that need escaping.
var ftsSpecialRe = regexp.MustCompile(`[*"():^{}~]`)

// escapeFTS5 wraps the query in double quotes to prevent FTS5 operator injection.
func escapeFTS5(q string) string {
	// Remove any existing double quotes, then wrap in quotes for exact phrase match.
	safe := strings.ReplaceAll(q, `"`, ``)
	return `"` + safe + `"`
}

// handleSearch serves GET /api/search?q={query}&scope={messages|decisions|vocab|all}
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Missing required parameter: q",
		}, s.logger)
		return
	}

	scope := r.URL.Query().Get("scope")
	if scope == "" {
		scope = "all"
	}

	limitStr := r.URL.Query().Get("limit")
	limitVal := 50
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 200 {
			limitVal = v
		}
	}
	limit := strconv.Itoa(limitVal)

	dbPath := s.Config.BudgetDBPath
	escapedQuery := db.EscapeString(query)
	ftsQuery := escapeFTS5(query)

	results := make(map[string]interface{})

	// Search transport messages
	if scope == "all" || scope == "messages" {
		// Try FTS5 first, fall back to LIKE
		msgs, err := db.QueryJSON(dbPath,
			"SELECT session_name, filename, from_agent, to_agent, message_type, subject, timestamp "+
				"FROM fts_messages WHERE fts_messages MATCH "+ftsQuery+" "+
				"ORDER BY rank LIMIT "+limit)
		if err != nil || len(msgs) == 0 {
			msgs, _ = db.QueryJSON(dbPath,
				"SELECT session_name, filename, from_agent, to_agent, message_type, subject, timestamp "+
					"FROM transport_messages WHERE "+
					"subject LIKE '%"+escapedQuery+"%' OR "+
					"session_name LIKE '%"+escapedQuery+"%' OR "+
					"from_agent LIKE '%"+escapedQuery+"%' OR "+
					"message_type LIKE '%"+escapedQuery+"%' "+
					"ORDER BY timestamp DESC LIMIT "+limit)
		}
		results["messages"] = msgs
	}

	// Search decisions
	if scope == "all" || scope == "decisions" {
		decs, err := db.QueryJSON(dbPath,
			"SELECT decision_key, title, source, status, created_at "+
				"FROM fts_decisions WHERE fts_decisions MATCH "+ftsQuery+" "+
				"ORDER BY rank LIMIT "+limit)
		if err != nil || len(decs) == 0 {
			decs, _ = db.QueryJSON(dbPath,
				"SELECT decision_key, title, source, status, created_at "+
					"FROM decisions WHERE "+
					"title LIKE '%"+escapedQuery+"%' OR "+
					"decision_key LIKE '%"+escapedQuery+"%' OR "+
					"source LIKE '%"+escapedQuery+"%' "+
					"ORDER BY created_at DESC LIMIT "+limit)
		}
		results["decisions"] = decs
	}

	// Search vocabulary (from vocab.json on filesystem)
	if scope == "all" || scope == "vocab" {
		results["vocab"] = s.searchVocab(query)
	}

	// Totals
	totals := make(map[string]int)
	for k, v := range results {
		if items, ok := v.([]map[string]string); ok {
			totals[k] = len(items)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"query":   query,
		"scope":   scope,
		"results": results,
		"totals":  totals,
	}, s.logger)
}

// searchVocab searches the interagent vocabulary JSON file for matching terms.
func (s *Server) searchVocab(query string) []map[string]string {
	vocabPath := s.Config.RepoRoot + "/interagent/vocab.json"

	data, err := os.ReadFile(vocabPath)
	if err != nil {
		s.logger.Debug("vocab.json not readable", "path", vocabPath, "err", err)
		return []map[string]string{}
	}

	var doc map[string]interface{}
	if err := json.Unmarshal(data, &doc); err != nil {
		return []map[string]string{}
	}

	// Extract terms from @graph or terms array
	var rawTerms []interface{}
	if graph, ok := doc["@graph"].([]interface{}); ok {
		rawTerms = graph
	} else if terms, ok := doc["terms"].([]interface{}); ok {
		rawTerms = terms
	}

	lowerQuery := strings.ToLower(query)
	var matches []map[string]string
	for _, t := range rawTerms {
		obj, ok := t.(map[string]interface{})
		if !ok {
			continue
		}
		// Build searchable text from all string values
		var searchable string
		row := make(map[string]string)
		for k, v := range obj {
			if s, ok := v.(string); ok {
				row[k] = s
				searchable += " " + s
			}
		}
		if strings.Contains(strings.ToLower(searchable), lowerQuery) {
			matches = append(matches, row)
		}
	}
	return matches
}

package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
)

// APIKB serves GET /api/kb — full knowledge base JSON.
func APIKB(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase())
	}
}

// APIKBDecisions serves GET /kb/decisions — architecture decisions JSON.
func APIKBDecisions(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().Decisions)
	}
}

// APIKBTriggers serves GET /kb/triggers — cognitive trigger state JSON.
func APIKBTriggers(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().Triggers)
	}
}

// APIKBClaims serves GET /kb/claims — structured claims with provenance JSON.
func APIKBClaims(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().Claims)
	}
}

// APIKBMessages serves GET /kb/messages — transport messages audit trail JSON.
func APIKBMessages(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().Messages)
	}
}

// APIKBLessons serves GET /kb/lessons — transferable patterns and wisdom JSON.
func APIKBLessons(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().Lessons)
	}
}

// APIKBEpistemic serves GET /kb/epistemic — unresolved epistemic flags JSON.
func APIKBEpistemic(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().EpistemicFlags)
	}
}

// APIKBCatalog serves GET /kb/catalog — classification catalog JSON.
func APIKBCatalog(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().Catalog)
	}
}

// APIKBMemory serves GET /kb/memory — memory entries JSON.
func APIKBMemory(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		json.NewEncoder(w).Encode(cache.KnowledgeBase().Memory)
	}
}

// APIKBDictionary serves GET /kb/dictionary — JSON-LD vocabulary as
// schema:DefinedTerm entries within a schema:DefinedTermSet.
func APIKBDictionary(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(cache.Dict())
	}
}

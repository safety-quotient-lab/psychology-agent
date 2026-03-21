package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
)

// VocabScheme serves GET /vocab/v1.0.0.jsonld — the SKOS ConceptScheme.
// Returns application/ld+json with the full vocabulary including
// audience-scoped definitions.
func VocabScheme(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		w.Header().Set("Cache-Control", "public, max-age=60")
		vocab := cache.Vocab()
		json.NewEncoder(w).Encode(vocab)
	}
}

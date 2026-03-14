// Package server — static.go embeds and serves static assets for the
// interagent compositor dashboard.
//
// Uses Go 1.16+ embed to bundle HTML, JSON, CSS, and JS files directly
// into the meshd binary, eliminating the need for a separate CF Worker
// to serve the dashboard.
package server

import (
	"embed"
	"net/http"
)

//go:embed static/*
var staticFS embed.FS

// handleIndex serves GET / → the compositor dashboard (index.html).
func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	data, err := staticFS.ReadFile("static/index.html")
	if err != nil {
		http.Error(w, "dashboard not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Write(data)
}

// handleVocab serves GET /vocab or /vocab.json → shared JSON-LD vocabulary.
func (s *Server) handleVocab(w http.ResponseWriter, r *http.Request) {
	data, err := staticFS.ReadFile("static/vocab.json")
	if err != nil {
		http.Error(w, "vocabulary not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/ld+json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write(data)
}

// handleVocabSchema serves GET /vocab/schema or /vocab/schema.json.
func (s *Server) handleVocabSchema(w http.ResponseWriter, r *http.Request) {
	data, err := staticFS.ReadFile("static/vocab.schema.json")
	if err != nil {
		http.Error(w, "schema not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/schema+json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(data)
}

// handleAgentCardStatic serves GET /.well-known/agent-card.json.
func (s *Server) handleAgentCardStatic(w http.ResponseWriter, r *http.Request) {
	data, err := staticFS.ReadFile("static/agent-card.json")
	if err != nil {
		http.Error(w, "agent card not available", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write(data)
}

// handleStaticAsset serves files from the static/ embed directory.
// Used for CSS, JS, and other frontend assets.
func (s *Server) handleStaticAsset(w http.ResponseWriter, r *http.Request) {
	http.StripPrefix("/static/", http.FileServer(http.FS(staticFS))).ServeHTTP(w, r)
}

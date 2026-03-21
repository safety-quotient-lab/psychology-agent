package handlers

import (
	"html/template"
	"log"
	"net/http"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
)

// LCARSDashboard serves GET / and GET /lcars — the per-agent LCARS dashboard.
func LCARSDashboard(cache *collector.Cache, tmpl *template.Template) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		status := cache.Status()
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err := tmpl.ExecuteTemplate(w, "layout.html", status); err != nil {
			log.Printf("template render error: %v", err)
			http.Error(w, "render failed", http.StatusInternalServerError)
		}
	}
}

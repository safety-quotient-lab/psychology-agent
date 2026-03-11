package handlers

import (
	"html/template"
	"log"
	"net/http"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// ObsDashboard serves GET / and GET /obs — the main observability dashboard.
func ObsDashboard(d *db.DB, projectRoot string, tmpl *template.Template) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		status := collector.Collect(d, projectRoot)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err := tmpl.ExecuteTemplate(w, "layout.html", status); err != nil {
			log.Printf("template render error: %v", err)
			http.Error(w, "render failed", http.StatusInternalServerError)
		}
	}
}

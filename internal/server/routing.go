// Package server — routing.go provides GET /api/routing
// which exposes the message routing table so agents can
// self-check where their messages should go.
//
// The routing table lives in the exosome package (single source of truth).
// This handler simply serializes it for HTTP consumption.
package server

import (
	"net/http"

	"github.com/safety-quotient-lab/operations-agent/internal/exosome"
)

// handleRouting serves GET /api/routing — returns the mesh routing table.
func (s *Server) handleRouting(w http.ResponseWriter, r *http.Request) {
	rules := exosome.DefaultRoutingTable()

	// Convert to a JSON-friendly shape
	domains := make([]map[string]interface{}, len(rules))
	for i, rule := range rules {
		domains[i] = map[string]interface{}{
			"domain":   rule.Domain,
			"route_to": rule.RouteTo,
			"keywords": rule.Keywords,
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"routing_domains":   domains,
		"inbound_endpoint":  "/api/messages/inbound",
		"redirect_endpoint": "https://operations-agent.safety-quotient.dev/api/redirect",
		"usage":             "POST /api/messages/inbound with interagent/v1 message body for direct delivery. POST /api/redirect on compositor for misrouted messages.",
	}, s.logger)
}

// Package server — routing.go provides GET /api/routing
// which exposes the message routing table so agents can
// self-check where their messages should go.
package server

import (
	"net/http"
)

// routingDomain maps a topic domain to the responsible agent.
type routingDomain struct {
	Domain  string   `json:"domain"`
	RouteTo string   `json:"route_to"`
	Keywords []string `json:"keywords"`
}

// meshRoutingTable defines keyword-to-agent routing for the mesh.
// Matches the ROUTING_DOMAINS table in the compositor Worker.
var meshRoutingTable = []routingDomain{
	{Domain: "operations", RouteTo: "operations-agent", Keywords: []string{"compositor", "dashboard", "deploy", "budget", "mesh-pause", "spawn", "health", "vocabulary", "vocab", "naming", "convention", "transport", "directive", "compliance", "consistency", "credential", "sanitization", "opsec", "CORS", "secret", "scan", "hardening"}},
	{Domain: "psychometrics", RouteTo: "psychology-agent", Keywords: []string{"PSQ", "scoring", "calibration", "dimension", "bifactor", "psychoemotional", "dignity", "PJE"}},
	{Domain: "cogarch", RouteTo: "psychology-agent", Keywords: []string{"trigger", "cognitive architecture", "hook", "evaluator", "governance", "invariant", "wu wei"}},
	{Domain: "content", RouteTo: "unratified-agent", Keywords: []string{"blog", "publication", "ICESCR", "ratification", "campaign", "content-quality"}},
	{Domain: "observatory", RouteTo: "observatory-agent", Keywords: []string{"HRCB", "corpus", "sweep", "domain-profile", "methodology", "signals"}},
	{Domain: "model", RouteTo: "safety-quotient-agent", Keywords: []string{"training", "calibration", "model", "onnx", "inference", "DistilBERT"}},
}

// handleRouting serves GET /api/routing — returns the mesh routing table.
func (s *Server) handleRouting(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"routing_domains": meshRoutingTable,
		"inbound_endpoint": "/api/messages/inbound",
		"redirect_endpoint": "https://operations-agent.safety-quotient.dev/api/redirect",
		"usage": "POST /api/messages/inbound with interagent/v1 message body for direct delivery. POST /api/redirect on compositor for misrouted messages.",
	}, s.logger)
}

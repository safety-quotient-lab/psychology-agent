package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// agentEnvelope wraps a response with JSON-LD + entity_type fields.
func agentEnvelope(data map[string]any) map[string]any {
	data["@context"] = "https://psychology-agent.safety-quotient.dev/vocab/v1.0.0.jsonld"
	data["@type"] = "Dataset"
	data["entity_type"] = "agent"
	data["dateModified"] = time.Now().Format("2006-01-02T15:04:05Z")
	return data
}

// APIAgentRoot serves GET /api/agent — identity + health + HATEOAS links.
func APIAgentRoot(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		status := cache.Status()
		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"agent_id":       status.AgentID,
			"version":        status.Version,
			"schema_version": status.SchemaVersion,
			"collected_at":   status.CollectedAt,
			"health":         statusHealth(status),
			"_links": map[string]string{
				"self":       "/api/agent",
				"agent_card": "/.well-known/agent-card.json",
				"transport":  "/api/agent/transport",
				"governance": "/api/agent/governance",
				"cognitive":  "/api/agent/cognitive",
				"knowledge":  "/api/agent/knowledge",
				"state":      "/api/agent/state",
				"catalog":    "/api/catalog",
				"msd":        "/api/msd",
				"vocab":      "/vocab/v1.0.0.jsonld",
				"health":     "/health",
			},
		}))
	}
}

func statusHealth(s *collector.Status) map[string]any {
	return map[string]any{
		"db_exists":              s.DBExists,
		"total_messages":         s.Totals.Messages,
		"total_sessions":         s.Totals.Sessions,
		"unprocessed":            s.Totals.Unprocessed,
		"active_gates":           s.Totals.ActiveGates,
		"epistemic_unresolved":   s.Totals.EpistemicUnresolved,
	}
}

// APIAgentTransport serves GET /api/agent/transport — sessions, messages,
// peers, gates, peer sync.
func APIAgentTransport(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		status := cache.Status()
		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"sessions":         status.SessionSumms,
			"recent_messages":  status.RecentMessages,
			"unprocessed":      status.Unprocessed,
			"peers":            status.Peers,
			"message_counts":   status.MessageCounts,
			"active_gates":     status.ActiveGates,
			"remote_states":    status.RemoteStates,
			"heartbeat":        status.Heartbeat,
			"schedule":         status.Schedule,
			"totals": map[string]any{
				"messages":    status.Totals.Messages,
				"sessions":   status.Totals.Sessions,
				"unprocessed": status.Totals.Unprocessed,
				"active_gates": status.Totals.ActiveGates,
			},
			"_links": map[string]string{
				"self":     "/api/agent/transport",
				"messages": "/api/agent/transport/messages",
				"parent":   "/api/agent",
			},
		}))
	}
}

// APIAgentTransportMessages serves GET /api/agent/transport/messages —
// replaces /kb/messages with REST-correct path.
func APIAgentTransportMessages(cache *collector.Cache) http.HandlerFunc {
	return APIKBMessages(cache) // same handler, new route
}

// APIAgentGovernance serves GET /api/agent/governance — budget, actions,
// decisions, triggers.
func APIAgentGovernance(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		status := cache.Status()
		kb := cache.KnowledgeBase()
		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"autonomy_budget": status.AutonomyBudget,
			"recent_actions":  status.RecentActions,
			"registry_agents": status.RegistryAgents,
			"_links": map[string]string{
				"self":      "/api/agent/governance",
				"decisions": "/api/agent/governance/decisions",
				"triggers":  "/api/agent/governance/triggers",
				"parent":    "/api/agent",
			},
			"decisions_count": len(kb.Decisions),
			"triggers_count":  len(kb.Triggers),
		}))
	}
}

// APIAgentGovernanceDecisions serves GET /api/agent/governance/decisions.
func APIAgentGovernanceDecisions(cache *collector.Cache) http.HandlerFunc {
	return APIKBDecisions(cache)
}

// APIAgentGovernanceTriggers serves GET /api/agent/governance/triggers.
func APIAgentGovernanceTriggers(cache *collector.Cache) http.HandlerFunc {
	return APIKBTriggers(cache)
}

// APIAgentCognitive serves GET /api/agent/cognitive — summary of oscillator,
// photonic, neural subsystems.
func APIAgentCognitive(cache *collector.Cache, roDB *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"_links": map[string]string{
				"self":       "/api/agent/cognitive",
				"oscillator": "/api/agent/cognitive/oscillator",
				"photonic":   "/api/agent/cognitive/photonic",
				"neural":     "/api/agent/cognitive/neural",
				"msd":        "/api/msd",
				"parent":     "/api/agent",
			},
		}))
	}
}

// APIAgentCognitiveNeural serves GET /api/agent/cognitive/neural.
func APIAgentCognitiveNeural(roDB *db.DB) http.HandlerFunc {
	return APINeural(roDB)
}

// APIAgentKnowledge serves GET /api/agent/knowledge — summary + links.
func APIAgentKnowledge(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setAPIHeaders(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		kb := cache.KnowledgeBase()
		json.NewEncoder(w).Encode(agentEnvelope(map[string]any{
			"totals": kb.Totals,
			"_links": map[string]string{
				"self":       "/api/agent/knowledge",
				"claims":     "/api/agent/knowledge/claims",
				"lessons":    "/api/agent/knowledge/lessons",
				"epistemic":  "/api/agent/knowledge/epistemic",
				"memory":     "/api/agent/knowledge/memory",
				"vocabulary": "/vocab/v1.0.0.jsonld",
				"parent":     "/api/agent",
			},
		}))
	}
}

// APIAgentKnowledgeClaims serves GET /api/agent/knowledge/claims.
func APIAgentKnowledgeClaims(cache *collector.Cache) http.HandlerFunc {
	return APIKBClaims(cache)
}

// APIAgentKnowledgeLessons serves GET /api/agent/knowledge/lessons.
func APIAgentKnowledgeLessons(cache *collector.Cache) http.HandlerFunc {
	return APIKBLessons(cache)
}

// APIAgentKnowledgeEpistemic serves GET /api/agent/knowledge/epistemic.
func APIAgentKnowledgeEpistemic(cache *collector.Cache) http.HandlerFunc {
	return APIKBEpistemic(cache)
}

// APIAgentKnowledgeMemory serves GET /api/agent/knowledge/memory.
func APIAgentKnowledgeMemory(cache *collector.Cache) http.HandlerFunc {
	return APIKBMemory(cache)
}

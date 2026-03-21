// Package server — consensus.go implements quorum-based consensus tiers.
//
// R1 from RPG Scan #002: replace implicit unanimity with three tiers.
//   C1 (informational): no response required — directive stands as notification
//   C2 (quorum): 3-of-5 agreement sufficient for most operational directives
//   C3 (unanimity): all agents must agree — reserved for breaking changes
//
// The tier determines when a gate resolves. Most directives classify as
// C1 or C2, eliminating the bottleneck of waiting for all agents.
package server

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// ConsensusTier defines the agreement threshold for a directive.
type ConsensusTier string

const (
	// TierC1 — informational. No response required. Fire and forget.
	TierC1 ConsensusTier = "C1"
	// TierC2 — quorum. 3-of-5 agents must ACK.
	TierC2 ConsensusTier = "C2"
	// TierC3 — unanimity. All agents must ACK. Reserved for breaking changes.
	TierC3 ConsensusTier = "C3"
)

// QuorumThreshold returns how many ACKs a tier requires (for N=5 mesh).
func QuorumThreshold(tier ConsensusTier, meshSize int) int {
	switch tier {
	case TierC1:
		return 0 // no response needed
	case TierC2:
		// Majority: ceil(N/2) + 1 for BFT, simplified to 3-of-5
		if meshSize <= 3 {
			return 2
		}
		return (meshSize / 2) + 1
	case TierC3:
		return meshSize // all must agree
	default:
		return meshSize // default to unanimity (safe)
	}
}

// ClassifyMessage determines the consensus tier for a transport message
// based on its type, enforcement level, and ack_required field.
func ClassifyMessage(msg map[string]any) ConsensusTier {
	msgType, _ := msg["message_type"].(string)
	ackRequired, _ := msg["ack_required"].(bool)
	enforcement, _ := msg["enforcement"].(string)

	// C3: mandatory directives or schema-breaking changes
	if enforcement == "mandatory" || enforcement == "required" {
		return TierC3
	}

	// C1: notifications, informational, no ACK needed
	if !ackRequired {
		return TierC1
	}
	if msgType == "notification" || msgType == "advisory" {
		return TierC1
	}

	// C2: everything else that requires ACK (directives, proposals, requests)
	return TierC2
}

// GateStatus represents the resolution state of a consensus gate.
type GateStatus struct {
	SessionID  string        `json:"session_id"`
	Tier       ConsensusTier `json:"tier"`
	Required   int           `json:"required"`
	Received   int           `json:"received"`
	Resolved   bool          `json:"resolved"`
	Respondents []string     `json:"respondents"`
	Pending    []string      `json:"pending"`
}

// handleConsensus serves GET /api/consensus — gate resolution status for all open sessions.
func (s *Server) handleConsensus(w http.ResponseWriter, r *http.Request) {
	dbPath := s.Config.BudgetDBPath
	meshSize := 5 // hardcoded for now — could derive from registry

	// Find sessions with open gates (unprocessed directives/proposals/requests)
	sessions, _ := db.QueryJSON(dbPath,
		"SELECT DISTINCT session_name FROM transport_messages "+
			"WHERE message_type IN ('directive','proposal','request') "+
			"ORDER BY timestamp DESC LIMIT 20")

	gates := make([]GateStatus, 0)

	for _, sess := range sessions {
		sessionID := sess["session_name"]

		// Get the original directive/proposal
		originals, _ := db.QueryJSON(dbPath,
			fmt.Sprintf("SELECT message_type, from_agent FROM transport_messages "+
				"WHERE session_name='%s' AND message_type IN ('directive','proposal','request') "+
				"ORDER BY turn ASC LIMIT 1",
				db.EscapeString(sessionID)))

		if len(originals) == 0 {
			continue
		}

		// Classify the tier
		tier := TierC2 // default
		// Check if any message in session has ack_required
		ackCount := db.QueryScalar(dbPath,
			fmt.Sprintf("SELECT count(*) FROM transport_messages "+
				"WHERE session_name='%s' AND message_type IN ('directive','proposal','request')",
				db.EscapeString(sessionID)))
		if ackCount == 0 {
			tier = TierC1
		}

		required := QuorumThreshold(tier, meshSize)

		// Count ACK responses
		acks, _ := db.QueryJSON(dbPath,
			fmt.Sprintf("SELECT DISTINCT from_agent FROM transport_messages "+
				"WHERE session_name='%s' AND message_type='ack'",
				db.EscapeString(sessionID)))

		respondents := make([]string, 0)
		for _, ack := range acks {
			respondents = append(respondents, ack["from_agent"])
		}

		// Determine who hasn't responded
		allAgents := []string{"psychology-agent", "psq-agent", "unratified-agent", "observatory-agent", "mesh"}
		sender := originals[0]["from_agent"]
		pending := make([]string, 0)
		for _, agent := range allAgents {
			if agent == sender {
				continue // sender doesn't ACK own message
			}
			found := false
			for _, r := range respondents {
				if strings.Contains(r, strings.TrimSuffix(agent, "-agent")) {
					found = true
					break
				}
			}
			if !found {
				pending = append(pending, agent)
			}
		}

		resolved := len(respondents) >= required || tier == TierC1

		gates = append(gates, GateStatus{
			SessionID:   sessionID,
			Tier:        tier,
			Required:    required,
			Received:    len(respondents),
			Resolved:    resolved,
			Respondents: respondents,
			Pending:     pending,
		})
	}

	// Summary
	openCount := 0
	resolvedCount := 0
	for _, g := range gates {
		if g.Resolved {
			resolvedCount++
		} else {
			openCount++
		}
	}

	resp := map[string]any{
		"gates":          gates,
		"open_count":     openCount,
		"resolved_count": resolvedCount,
		"mesh_size":      meshSize,
		"tiers": map[string]string{
			"C1": "informational — no response required",
			"C2": fmt.Sprintf("quorum — %d-of-%d agreement", QuorumThreshold(TierC2, meshSize), meshSize),
			"C3": "unanimity — all agents must agree",
		},
	}

	writeJSON(w, http.StatusOK, resp, s.logger)
}

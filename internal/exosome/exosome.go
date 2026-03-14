// Package exosome provides the generic dual-write message abstraction
// for the interagent mesh.
//
// Named after extracellular vesicles that carry cargo between cells:
// surface markers determine targeting, delivery follows dual paths
// (fast receptor binding + slow endosomal processing), and the
// trajectory provides an audit trail.
//
// Every state mutation in the mesh flows through an Exosome:
//   1. Create → set payload + markers
//   2. Route  → resolve target from markers
//   3. Deliver → dual-write (meshd HTTP + git PR)
//   4. Receipt → confirm delivery, log trajectory
//
// References: Jäkel & Bhatt, 2005 (glial taxonomy);
// Raposo & Stoorvogel, 2013 (exosome biogenesis and function).
package exosome

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Exosome wraps any interagent message with routing, delivery,
// and audit metadata. The universal transport unit for the mesh.
type Exosome struct {
	// ID uniquely identifies this exosome (SHA-256 of payload + timestamp).
	ID string `json:"id"`

	// Payload carries the actual message content.
	Payload Message `json:"payload"`

	// Markers determine routing — which agent should receive this.
	Markers RoutingMarkers `json:"markers"`

	// Delivery tracks dual-write status across both paths.
	Delivery DeliveryReceipt `json:"delivery"`

	// Origin identifies the producing agent and context.
	Origin CellOrigin `json:"origin"`

	// Trajectory records every hop (audit trail).
	Trajectory []Hop `json:"trajectory"`

	// CreatedAt records when the exosome was produced.
	CreatedAt time.Time `json:"created_at"`
}

// Message represents the payload content — any interagent/v1 message.
type Message struct {
	Protocol  string      `json:"protocol"`
	Type      string      `json:"type"`
	From      string      `json:"from"`
	To        string      `json:"to"`
	SessionID string      `json:"session_id"`
	Turn      int         `json:"turn"`
	Timestamp string      `json:"timestamp"`
	Subject   string      `json:"subject"`
	Body      string      `json:"body,omitempty"`
	Raw       interface{} `json:"raw,omitempty"`
}

// RoutingMarkers carry surface markers that determine targeting.
// Keywords get matched against the mesh routing table.
type RoutingMarkers struct {
	// TargetAgent is the resolved destination (may differ from payload.To
	// when a redirect occurred).
	TargetAgent string `json:"target_agent"`

	// TargetDomain identifies which routing domain matched.
	TargetDomain string `json:"target_domain,omitempty"`

	// Confidence scores how well the routing match performed (0.0–1.0).
	Confidence float64 `json:"confidence,omitempty"`

	// ExplicitTarget indicates the target was set by the caller,
	// not resolved via keyword routing.
	ExplicitTarget bool `json:"explicit_target,omitempty"`

	// Keywords that matched during routing resolution.
	MatchedKeywords []string `json:"matched_keywords,omitempty"`
}

// DeliveryReceipt tracks dual-write status.
type DeliveryReceipt struct {
	// MeshD tracks the fast-path HTTP delivery to the target's meshd.
	MeshD PathStatus `json:"meshd"`

	// GitPR tracks the audit-trail PR delivery.
	GitPR PathStatus `json:"git_pr"`

	// State summarizes overall delivery: "both", "meshd-only", "pr-only", "failed".
	State string `json:"state"`

	// CompletedAt records when delivery finished (both paths attempted).
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// PathStatus tracks one delivery path.
type PathStatus struct {
	// Attempted indicates whether this path was tried.
	Attempted bool `json:"attempted"`

	// Accepted indicates the target acknowledged receipt.
	Accepted bool `json:"accepted"`

	// Error captures failure reason (empty on success).
	Error string `json:"error,omitempty"`

	// Ref holds the delivery reference (PR URL for git, response body for meshd).
	Ref string `json:"ref,omitempty"`

	// AttemptedAt records when this path was tried.
	AttemptedAt *time.Time `json:"attempted_at,omitempty"`
}

// CellOrigin identifies the producing agent.
type CellOrigin struct {
	AgentID   string `json:"agent_id"`
	SessionID string `json:"session_id,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

// Hop records one step in the exosome's trajectory.
type Hop struct {
	Agent     string    `json:"agent"`
	Action    string    `json:"action"`
	Timestamp time.Time `json:"timestamp"`
	Detail    string    `json:"detail,omitempty"`
}

// ── Routing ──────────────────────────────────────────────────────

// RoutingRule maps a domain to the responsible agent via keywords.
type RoutingRule struct {
	Domain   string   `json:"domain"`
	RouteTo  string   `json:"route_to"`
	Keywords []string `json:"keywords"`
}

// DefaultRoutingTable returns the mesh-wide routing rules.
// Matches the ROUTING_DOMAINS in the compositor Worker and
// meshRoutingTable in internal/server/routing.go.
func DefaultRoutingTable() []RoutingRule {
	return []RoutingRule{
		{Domain: "operations", RouteTo: "operations-agent", Keywords: []string{"compositor", "dashboard", "deploy", "budget", "mesh-pause", "spawn", "health", "vocabulary", "vocab", "naming", "convention", "transport", "directive", "compliance", "consistency", "credential", "sanitization", "opsec", "CORS", "secret", "scan", "hardening"}},
		{Domain: "psychometrics", RouteTo: "psychology-agent", Keywords: []string{"PSQ", "scoring", "calibration", "dimension", "bifactor", "psychoemotional", "dignity", "PJE"}},
		{Domain: "cogarch", RouteTo: "psychology-agent", Keywords: []string{"trigger", "cognitive architecture", "hook", "evaluator", "governance", "invariant", "wu wei"}},
		{Domain: "content", RouteTo: "unratified-agent", Keywords: []string{"blog", "publication", "ICESCR", "ratification", "campaign", "content-quality"}},
		{Domain: "observatory", RouteTo: "observatory-agent", Keywords: []string{"HRCB", "corpus", "sweep", "domain-profile", "methodology", "signals"}},
		{Domain: "model", RouteTo: "safety-quotient-agent", Keywords: []string{"training", "model", "onnx", "inference", "DistilBERT"}},
	}
}

// ResolveTarget determines which agent should receive a message based
// on keyword matching against the routing table.
func ResolveTarget(msg *Message, rules []RoutingRule) *RoutingMarkers {
	searchText := strings.ToLower(strings.Join([]string{
		msg.Subject, msg.Body, msg.SessionID,
	}, " "))

	var bestRule *RoutingRule
	var bestScore int
	var bestKeywords []string

	for i := range rules {
		var score int
		var matched []string
		for _, kw := range rules[i].Keywords {
			if strings.Contains(searchText, strings.ToLower(kw)) {
				score++
				matched = append(matched, kw)
			}
		}
		if score > bestScore {
			bestScore = score
			bestRule = &rules[i]
			bestKeywords = matched
		}
	}

	if bestRule == nil {
		return nil
	}

	confidence := float64(bestScore) / 3.0
	if confidence > 1.0 {
		confidence = 1.0
	}

	return &RoutingMarkers{
		TargetAgent:     bestRule.RouteTo,
		TargetDomain:    bestRule.Domain,
		Confidence:      confidence,
		MatchedKeywords: bestKeywords,
	}
}

// ── Construction ─────────────────────────────────────────────────

// New creates an Exosome from a message payload and origin.
// Generates a deterministic ID from payload content + timestamp.
func New(msg Message, origin CellOrigin) *Exosome {
	now := time.Now().UTC()

	// Generate deterministic ID
	idInput := fmt.Sprintf("%s:%s:%s:%d:%s",
		msg.SessionID, msg.From, msg.To, msg.Turn, now.Format(time.RFC3339Nano))
	hash := sha256.Sum256([]byte(idInput))
	id := fmt.Sprintf("exo-%x", hash[:8])

	// Derive subject if empty
	if strings.TrimSpace(msg.Subject) == "" {
		msg.Subject = msg.SessionID
		if msg.Type != "" {
			msg.Subject += fmt.Sprintf(" (%s from %s)", msg.Type, msg.From)
		}
	}

	return &Exosome{
		ID:        id,
		Payload:   msg,
		CreatedAt: now,
		Origin:    origin,
		Trajectory: []Hop{
			{Agent: origin.AgentID, Action: "created", Timestamp: now, Detail: origin.Reason},
		},
		Delivery: DeliveryReceipt{State: "pending"},
	}
}

// Route resolves the target agent using the routing table and records the hop.
func (e *Exosome) Route(rules []RoutingRule) error {
	markers := ResolveTarget(&e.Payload, rules)
	if markers == nil {
		return fmt.Errorf("no routing match for session=%s subject=%q", e.Payload.SessionID, e.Payload.Subject)
	}
	e.Markers = *markers
	e.AddHop(e.Origin.AgentID, "routed", fmt.Sprintf("→ %s (domain: %s, confidence: %.0f%%)",
		markers.TargetAgent, markers.TargetDomain, markers.Confidence*100))
	return nil
}

// SetTarget explicitly sets the target agent (bypasses routing).
func (e *Exosome) SetTarget(agentID string) {
	e.Markers = RoutingMarkers{
		TargetAgent:    agentID,
		ExplicitTarget: true,
	}
	e.AddHop(e.Origin.AgentID, "target-set", agentID)
}

// AddHop appends a trajectory entry.
func (e *Exosome) AddHop(agent, action, detail string) {
	e.Trajectory = append(e.Trajectory, Hop{
		Agent:     agent,
		Action:    action,
		Timestamp: time.Now().UTC(),
		Detail:    detail,
	})
}

// ── Delivery ─────────────────────────────────────────────────────

// MarkMeshDelivered records successful meshd HTTP delivery.
func (e *Exosome) MarkMeshDelivered(ref string) {
	now := time.Now().UTC()
	e.Delivery.MeshD = PathStatus{
		Attempted:   true,
		Accepted:    true,
		Ref:         ref,
		AttemptedAt: &now,
	}
	e.updateDeliveryState()
	e.AddHop(e.Markers.TargetAgent, "meshd-accepted", ref)
}

// MarkMeshFailed records meshd delivery failure.
func (e *Exosome) MarkMeshFailed(err string) {
	now := time.Now().UTC()
	e.Delivery.MeshD = PathStatus{
		Attempted:   true,
		Accepted:    false,
		Error:       err,
		AttemptedAt: &now,
	}
	e.updateDeliveryState()
	e.AddHop(e.Markers.TargetAgent, "meshd-failed", err)
}

// MarkPRDelivered records successful git PR creation.
func (e *Exosome) MarkPRDelivered(prURL string) {
	now := time.Now().UTC()
	e.Delivery.GitPR = PathStatus{
		Attempted:   true,
		Accepted:    true,
		Ref:         prURL,
		AttemptedAt: &now,
	}
	e.updateDeliveryState()
	e.AddHop(e.Markers.TargetAgent, "pr-created", prURL)
}

// MarkPRFailed records git PR creation failure.
func (e *Exosome) MarkPRFailed(err string) {
	now := time.Now().UTC()
	e.Delivery.GitPR = PathStatus{
		Attempted:   true,
		Accepted:    false,
		Error:       err,
		AttemptedAt: &now,
	}
	e.updateDeliveryState()
	e.AddHop(e.Markers.TargetAgent, "pr-failed", err)
}

// updateDeliveryState computes the overall delivery state from both paths.
func (e *Exosome) updateDeliveryState() {
	mesh := e.Delivery.MeshD
	pr := e.Delivery.GitPR

	switch {
	case mesh.Accepted && pr.Accepted:
		e.Delivery.State = "both"
	case mesh.Accepted && !pr.Attempted:
		e.Delivery.State = "meshd-pending-pr"
	case mesh.Accepted && !pr.Accepted:
		e.Delivery.State = "meshd-only"
	case !mesh.Accepted && pr.Accepted:
		e.Delivery.State = "pr-only"
	case mesh.Attempted && pr.Attempted && !mesh.Accepted && !pr.Accepted:
		e.Delivery.State = "failed"
	default:
		e.Delivery.State = "pending"
	}

	if mesh.Attempted && pr.Attempted {
		now := time.Now().UTC()
		e.Delivery.CompletedAt = &now
	}
}

// Delivered reports whether at least one delivery path succeeded.
func (e *Exosome) Delivered() bool {
	return e.Delivery.MeshD.Accepted || e.Delivery.GitPR.Accepted
}

// ── Serialization ────────────────────────────────────────────────

// JSON serializes the exosome for transport or storage.
func (e *Exosome) JSON() ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}

// ToTransportMessage converts the exosome payload back to a flat
// interagent/v1 message with exosome metadata attached.
func (e *Exosome) ToTransportMessage() map[string]interface{} {
	return map[string]interface{}{
		"protocol":      e.Payload.Protocol,
		"type":          e.Payload.Type,
		"from":          e.Payload.From,
		"to":            e.Markers.TargetAgent,
		"session_id":    e.Payload.SessionID,
		"turn":          e.Payload.Turn,
		"timestamp":     e.Payload.Timestamp,
		"subject":       e.Payload.Subject,
		"body":          e.Payload.Body,
		"_exosome_id":   e.ID,
		"_exosome_hops": len(e.Trajectory),
		"_delivery":     e.Delivery.State,
	}
}

// ── Persistence ──────────────────────────────────────────────────

// InsertSQL generates the SQL to persist this exosome's payload
// into the transport_messages table.
func (e *Exosome) InsertSQL() string {
	esc := func(s string) string { return strings.ReplaceAll(s, "'", "''") }

	direction := "inbound"
	if e.Payload.From == e.Origin.AgentID {
		direction = "outbound"
	}

	turn := fmt.Sprintf("%03d", e.Payload.Turn)
	filename := fmt.Sprintf("from-%s-%s.json", esc(e.Payload.From), turn)

	timestamp := e.Payload.Timestamp
	if timestamp == "" {
		timestamp = e.CreatedAt.Format(time.RFC3339)
	}

	return fmt.Sprintf(
		"INSERT OR IGNORE INTO transport_messages "+
			"(filename, session_name, direction, from_agent, to_agent, turn, message_type, subject, timestamp) "+
			"VALUES ('%s', '%s', '%s', '%s', '%s', %d, '%s', '%s', '%s');",
		esc(filename),
		esc(e.Payload.SessionID),
		esc(direction),
		esc(e.Payload.From),
		esc(e.Markers.TargetAgent),
		e.Payload.Turn,
		esc(e.Payload.Type),
		esc(e.Payload.Subject),
		esc(timestamp),
	)
}

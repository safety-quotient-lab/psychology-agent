package exosome

import (
	"strings"
	"testing"
)

func TestNew(t *testing.T) {
	msg := Message{
		Protocol:  "interagent/v1",
		Type:      "directive",
		From:      "operations-agent",
		To:        "psychology-agent",
		SessionID: "mesh-parity-v2",
		Turn:      1,
		Subject:   "Test directive",
	}
	origin := CellOrigin{AgentID: "operations-agent", Reason: "test"}

	exo := New(msg, origin)

	if !strings.HasPrefix(exo.ID, "exo-") {
		t.Errorf("expected ID to start with exo-, got %s", exo.ID)
	}
	if exo.Payload.Subject != "Test directive" {
		t.Errorf("payload subject mismatch: %s", exo.Payload.Subject)
	}
	if len(exo.Trajectory) != 1 {
		t.Errorf("expected 1 trajectory hop, got %d", len(exo.Trajectory))
	}
	if exo.Trajectory[0].Action != "created" {
		t.Errorf("first hop should record 'created', got %s", exo.Trajectory[0].Action)
	}
	if exo.Delivery.State != "pending" {
		t.Errorf("initial delivery state should be pending, got %s", exo.Delivery.State)
	}
}

func TestNewDeriveSubject(t *testing.T) {
	msg := Message{
		Protocol:  "interagent/v1",
		Type:      "ack",
		From:      "psq-agent",
		SessionID: "peer-registry-update",
		Turn:      2,
		Subject:   "", // empty — should derive
	}
	exo := New(msg, CellOrigin{AgentID: "psq-agent"})

	if exo.Payload.Subject == "" {
		t.Error("subject should have been derived, got empty")
	}
	if !strings.Contains(exo.Payload.Subject, "peer-registry-update") {
		t.Errorf("derived subject should contain session_id, got: %s", exo.Payload.Subject)
	}
}

func TestResolveTarget(t *testing.T) {
	rules := DefaultRoutingTable()

	tests := []struct {
		name     string
		subject  string
		wantAgent string
		wantDomain string
	}{
		{"PSQ scoring", "PSQ scoring calibration results", "psychology-agent", "psychometrics"},
		{"dashboard deploy", "compositor dashboard deploy failed", "operations-agent", "operations"},
		{"blog content", "blog publication ICESCR ratification", "unratified-agent", "content"},
		{"HRCB sweep", "HRCB corpus sweep results", "observatory-agent", "observatory"},
		{"model training", "DistilBERT model training complete", "safety-quotient-agent", "model"},
		{"vocabulary governance", "vocab naming convention update", "operations-agent", "operations"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msg := &Message{Subject: tt.subject}
			markers := ResolveTarget(msg, rules)
			if markers == nil {
				t.Fatalf("expected routing match, got nil")
			}
			if markers.TargetAgent != tt.wantAgent {
				t.Errorf("target agent: want %s, got %s", tt.wantAgent, markers.TargetAgent)
			}
			if markers.TargetDomain != tt.wantDomain {
				t.Errorf("target domain: want %s, got %s", tt.wantDomain, markers.TargetDomain)
			}
		})
	}
}

func TestResolveTargetNoMatch(t *testing.T) {
	rules := DefaultRoutingTable()
	msg := &Message{Subject: "completely unrelated topic about gardening"}
	markers := ResolveTarget(msg, rules)
	if markers != nil {
		t.Errorf("expected no routing match, got %+v", markers)
	}
}

func TestRoute(t *testing.T) {
	msg := Message{
		Protocol:  "interagent/v1",
		Type:      "proposal",
		From:      "unratified-agent",
		Subject:   "PSQ scoring dimension adjustment",
		SessionID: "scoring-review",
		Turn:      1,
	}
	exo := New(msg, CellOrigin{AgentID: "unratified-agent"})

	err := exo.Route(DefaultRoutingTable())
	if err != nil {
		t.Fatalf("routing failed: %v", err)
	}
	if exo.Markers.TargetAgent != "psychology-agent" {
		t.Errorf("expected psychology-agent, got %s", exo.Markers.TargetAgent)
	}
	if len(exo.Trajectory) != 2 {
		t.Errorf("expected 2 hops (created + routed), got %d", len(exo.Trajectory))
	}
}

func TestSetTarget(t *testing.T) {
	exo := New(Message{SessionID: "test"}, CellOrigin{AgentID: "ops"})
	exo.SetTarget("observatory-agent")

	if exo.Markers.TargetAgent != "observatory-agent" {
		t.Errorf("expected observatory-agent, got %s", exo.Markers.TargetAgent)
	}
	if !exo.Markers.ExplicitTarget {
		t.Error("explicit target flag should be true")
	}
}

func TestDeliveryStates(t *testing.T) {
	exo := New(Message{SessionID: "test"}, CellOrigin{AgentID: "ops"})
	exo.SetTarget("psychology-agent")

	// Initially pending
	if exo.Delivery.State != "pending" {
		t.Errorf("initial state should be pending, got %s", exo.Delivery.State)
	}

	// meshd delivered
	exo.MarkMeshDelivered("http://localhost:8076/api/messages/inbound")
	if exo.Delivery.State != "meshd-pending-pr" {
		t.Errorf("after meshd, state should be meshd-pending-pr, got %s", exo.Delivery.State)
	}

	// PR delivered
	exo.MarkPRDelivered("https://github.com/safety-quotient-lab/psychology-agent/pull/99")
	if exo.Delivery.State != "both" {
		t.Errorf("after both, state should be both, got %s", exo.Delivery.State)
	}
	if !exo.Delivered() {
		t.Error("Delivered() should return true")
	}
	if exo.Delivery.CompletedAt == nil {
		t.Error("CompletedAt should be set when both paths attempted")
	}
}

func TestDeliveryMeshOnlyOnPRFailure(t *testing.T) {
	exo := New(Message{SessionID: "test"}, CellOrigin{AgentID: "ops"})
	exo.SetTarget("unratified-agent")

	exo.MarkMeshDelivered("http://localhost:8078")
	exo.MarkPRFailed("GitHub API rate limit")

	if exo.Delivery.State != "meshd-only" {
		t.Errorf("expected meshd-only, got %s", exo.Delivery.State)
	}
	if !exo.Delivered() {
		t.Error("should still count as delivered (meshd succeeded)")
	}
}

func TestInsertSQL(t *testing.T) {
	msg := Message{
		Protocol:  "interagent/v1",
		Type:      "directive",
		From:      "operations-agent",
		SessionID: "test-session",
		Turn:      1,
		Subject:   "Test subject with 'quotes'",
		Timestamp: "2026-03-14T01:00:00Z",
	}
	exo := New(msg, CellOrigin{AgentID: "operations-agent"})
	exo.SetTarget("psychology-agent")

	sql := exo.InsertSQL()

	if !strings.Contains(sql, "INSERT OR IGNORE INTO transport_messages") {
		t.Error("SQL should target transport_messages table")
	}
	if !strings.Contains(sql, "test-session") {
		t.Error("SQL should contain session name")
	}
	if !strings.Contains(sql, "''quotes''") {
		t.Errorf("SQL should escape single quotes, got: %s", sql)
	}
}

func TestTrajectoryAudit(t *testing.T) {
	exo := New(Message{SessionID: "audit-test", From: "a"}, CellOrigin{AgentID: "a"})
	exo.SetTarget("b")
	exo.AddHop("compositor", "relayed", "via /api/relay")
	exo.MarkMeshDelivered("http://b:8081")
	exo.MarkPRDelivered("https://github.com/org/b/pull/1")

	// Should have: created, target-set, relayed, meshd-accepted, pr-created
	if len(exo.Trajectory) != 5 {
		t.Errorf("expected 5 trajectory hops, got %d", len(exo.Trajectory))
		for i, h := range exo.Trajectory {
			t.Logf("  hop %d: %s/%s", i, h.Agent, h.Action)
		}
	}
}

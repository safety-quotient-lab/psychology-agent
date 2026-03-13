package zmqbus

import (
	"encoding/json"
	"fmt"
	"net"
	"sync"
	"testing"
	"time"
)

func freePort(t *testing.T) int {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("free port: %v", err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()
	return port
}

func TestNewBus(t *testing.T) {
	b := New("test-agent", "tcp://127.0.0.1:9999", "http://localhost:8077")
	if b.agentID != "test-agent" {
		t.Errorf("agentID = %q, want %q", b.agentID, "test-agent")
	}
	if b.pubAddr != "tcp://127.0.0.1:9999" {
		t.Errorf("pubAddr = %q, want tcp://127.0.0.1:9999", b.pubAddr)
	}
	if len(b.peers) != 0 {
		t.Errorf("peers = %d, want 0", len(b.peers))
	}
}

func TestSelfInfo(t *testing.T) {
	b := New("agent-a", "tcp://127.0.0.1:9001", "http://localhost:8076")
	info := b.SelfInfo()
	if info.AgentID != "agent-a" {
		t.Errorf("AgentID = %q, want %q", info.AgentID, "agent-a")
	}
	if info.ZMQPub != "tcp://127.0.0.1:9001" {
		t.Errorf("ZMQPub = %q", info.ZMQPub)
	}
	if info.HTTPURL != "http://localhost:8076" {
		t.Errorf("HTTPURL = %q", info.HTTPURL)
	}
	if info.SeenAt == "" {
		t.Error("SeenAt should not be empty")
	}
}

func TestStartStop(t *testing.T) {
	port := freePort(t)
	addr := fmt.Sprintf("tcp://127.0.0.1:%d", port)
	b := New("test-agent", addr, "")

	if err := b.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}

	// Should be able to publish without error
	if err := b.Publish("health", map[string]string{"status": "ok"}); err != nil {
		t.Errorf("Publish: %v", err)
	}

	b.Stop()
}

func TestPubSub(t *testing.T) {
	portA := freePort(t)
	portB := freePort(t)
	addrA := fmt.Sprintf("tcp://127.0.0.1:%d", portA)
	addrB := fmt.Sprintf("tcp://127.0.0.1:%d", portB)

	busA := New("agent-a", addrA, "")
	busB := New("agent-b", addrB, "")

	if err := busA.Start(); err != nil {
		t.Fatalf("busA.Start: %v", err)
	}
	defer busA.Stop()
	if err := busB.Start(); err != nil {
		t.Fatalf("busB.Start: %v", err)
	}
	defer busB.Stop()

	// Track received messages
	var mu sync.Mutex
	var received []Message
	busB.OnMessage(func(m Message) {
		mu.Lock()
		received = append(received, m)
		mu.Unlock()
	})

	// B subscribes to A
	if err := busB.ConnectPeer(PeerInfo{AgentID: "agent-a", ZMQPub: addrA}); err != nil {
		t.Fatalf("ConnectPeer: %v", err)
	}

	// Wait for ZMQ slow joiner
	time.Sleep(700 * time.Millisecond)

	// A publishes
	busA.Publish("health", map[string]string{"status": "ok"})

	// Wait for delivery
	time.Sleep(500 * time.Millisecond)

	mu.Lock()
	count := len(received)
	mu.Unlock()

	// Should have received at least 1 health message (may also get gossip)
	if count == 0 {
		t.Error("busB received no messages from busA")
	}

	// Check that at least one health message exists
	mu.Lock()
	foundHealth := false
	for _, m := range received {
		if m.Topic == "health" && m.From == "agent-a" {
			foundHealth = true
		}
	}
	mu.Unlock()
	if !foundHealth {
		t.Error("no health message found from agent-a")
	}
}

func TestRegisterPeerSkipsSelf(t *testing.T) {
	b := New("agent-a", "tcp://127.0.0.1:9999", "")
	added := b.RegisterPeer(PeerInfo{AgentID: "agent-a", ZMQPub: "tcp://127.0.0.1:9999"})
	if added {
		t.Error("RegisterPeer should skip self")
	}
}

func TestRegisterPeerSkipsEmpty(t *testing.T) {
	b := New("agent-a", "tcp://127.0.0.1:9999", "")
	added := b.RegisterPeer(PeerInfo{AgentID: "agent-b", ZMQPub: ""})
	if added {
		t.Error("RegisterPeer should skip empty ZMQPub")
	}
}

func TestKnownPeersEmpty(t *testing.T) {
	b := New("test", "tcp://127.0.0.1:9999", "")
	peers := b.KnownPeers()
	if len(peers) != 0 {
		t.Errorf("KnownPeers = %d, want 0", len(peers))
	}
}

func TestGossipDiscovery(t *testing.T) {
	portA := freePort(t)
	portB := freePort(t)
	portC := freePort(t)
	addrA := fmt.Sprintf("tcp://127.0.0.1:%d", portA)
	addrB := fmt.Sprintf("tcp://127.0.0.1:%d", portB)
	addrC := fmt.Sprintf("tcp://127.0.0.1:%d", portC)

	busA := New("agent-a", addrA, "")
	busB := New("agent-b", addrB, "")
	busC := New("agent-c", addrC, "")

	if err := busA.Start(); err != nil {
		t.Fatalf("busA.Start: %v", err)
	}
	defer busA.Stop()
	if err := busB.Start(); err != nil {
		t.Fatalf("busB.Start: %v", err)
	}
	defer busB.Stop()
	if err := busC.Start(); err != nil {
		t.Fatalf("busC.Start: %v", err)
	}
	defer busC.Stop()

	// A knows B, B knows C. A should discover C through gossip.
	busA.ConnectPeer(PeerInfo{AgentID: "agent-b", ZMQPub: addrB})
	busB.ConnectPeer(PeerInfo{AgentID: "agent-c", ZMQPub: addrC})

	// Wait for gossip propagation (gossip happens on connect + 30s ticker)
	time.Sleep(2 * time.Second)

	// Trigger gossip manually
	busB.gossipAnnounce()
	time.Sleep(time.Second)

	// A should now know about C via gossip
	peersA := busA.KnownPeers()
	foundC := false
	for _, p := range peersA {
		if p.AgentID == "agent-c" {
			foundC = true
		}
	}
	if !foundC {
		names := make([]string, len(peersA))
		for i, p := range peersA {
			names[i] = p.AgentID
		}
		t.Errorf("agent-a should discover agent-c via gossip; peers: %v", names)
	}
}

func TestMessageJSON(t *testing.T) {
	msg := Message{
		Topic:     "health",
		From:      "agent-a",
		Timestamp: time.Now().UTC(),
		Data:      map[string]string{"status": "ok"},
	}
	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded Message
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.Topic != "health" || decoded.From != "agent-a" {
		t.Errorf("decoded = %+v", decoded)
	}
}

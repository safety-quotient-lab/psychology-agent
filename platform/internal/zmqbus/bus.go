// Package zmqbus provides a ZeroMQ PUB/SUB mesh transport layer.
//
// Each meshd instance runs a PUB socket (broadcasts events) and multiple
// SUB sockets (one per known peer). Gossip-on-connect propagates peer
// discovery through the mesh.
//
// Message format: topic + JSON payload, separated by a space.
// Topics: "health", "peer", "event"
package zmqbus

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/go-zeromq/zmq4"
)

// Message represents a ZMQ bus message.
type Message struct {
	Topic     string    `json:"topic"`
	From      string    `json:"from"`
	Timestamp time.Time `json:"timestamp"`
	Data      any       `json:"data"`
}

// PeerInfo describes a known peer for gossip exchange.
type PeerInfo struct {
	AgentID  string `json:"agent_id"`
	ZMQPub   string `json:"zmq_pub"`
	CardURL  string `json:"card_url,omitempty"`
	SeenAt   string `json:"seen_at,omitempty"`
}

// Bus manages PUB/SUB sockets and peer connections.
type Bus struct {
	agentID  string
	pubAddr  string
	pub      zmq4.Socket
	peers    map[string]*peerConn
	mu       sync.RWMutex
	handlers []func(Message)
	ctx      context.Context
	cancel   context.CancelFunc
}

type peerConn struct {
	info PeerInfo
	sub  zmq4.Socket
}

// New creates a ZMQ bus. pubAddr is the PUB socket bind address (e.g. "tcp://*:9001").
func New(agentID, pubAddr string) *Bus {
	ctx, cancel := context.WithCancel(context.Background())
	return &Bus{
		agentID: agentID,
		pubAddr: pubAddr,
		peers:   make(map[string]*peerConn),
		ctx:     ctx,
		cancel:  cancel,
	}
}

// Start binds the PUB socket and begins listening.
func (b *Bus) Start() error {
	b.pub = zmq4.NewPub(b.ctx)
	if err := b.pub.Listen(b.pubAddr); err != nil {
		return fmt.Errorf("zmq pub listen %s: %w", b.pubAddr, err)
	}
	log.Printf("[zmq] PUB listening on %s", b.pubAddr)
	return nil
}

// Stop closes all sockets.
func (b *Bus) Stop() {
	b.cancel()
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, pc := range b.peers {
		pc.sub.Close()
	}
	if b.pub != nil {
		b.pub.Close()
	}
	log.Printf("[zmq] stopped")
}

// OnMessage registers a handler for incoming messages.
func (b *Bus) OnMessage(fn func(Message)) {
	b.handlers = append(b.handlers, fn)
}

// Publish sends a message on the PUB socket.
func (b *Bus) Publish(topic string, data any) error {
	msg := Message{
		Topic:     topic,
		From:      b.agentID,
		Timestamp: time.Now().UTC(),
		Data:      data,
	}
	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("zmq marshal: %w", err)
	}

	frame := fmt.Sprintf("%s %s", topic, payload)
	return b.pub.Send(zmq4.NewMsg([]byte(frame)))
}

// ConnectPeer subscribes to a peer's PUB socket.
func (b *Bus) ConnectPeer(info PeerInfo) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if _, exists := b.peers[info.AgentID]; exists {
		return nil // already connected
	}

	sub := zmq4.NewSub(b.ctx)
	if err := sub.Dial(info.ZMQPub); err != nil {
		return fmt.Errorf("zmq sub dial %s: %w", info.ZMQPub, err)
	}

	// Subscribe to all topics
	if err := sub.SetOption(zmq4.OptionSubscribe, ""); err != nil {
		sub.Close()
		return fmt.Errorf("zmq subscribe: %w", err)
	}

	pc := &peerConn{info: info, sub: sub}
	b.peers[info.AgentID] = pc

	log.Printf("[zmq] connected to peer %s at %s", info.AgentID, info.ZMQPub)

	// Start receiving in background
	go b.recvLoop(pc)

	// Gossip: announce our known peers to the new peer
	go b.gossipAnnounce()

	return nil
}

// KnownPeers returns the list of connected peers.
func (b *Bus) KnownPeers() []PeerInfo {
	b.mu.RLock()
	defer b.mu.RUnlock()
	peers := make([]PeerInfo, 0, len(b.peers))
	for _, pc := range b.peers {
		peers = append(peers, pc.info)
	}
	return peers
}

// recvLoop reads messages from a peer's SUB socket.
func (b *Bus) recvLoop(pc *peerConn) {
	for {
		msg, err := pc.sub.Recv()
		if err != nil {
			if b.ctx.Err() != nil {
				return // shutting down
			}
			log.Printf("[zmq] recv error from %s: %v", pc.info.AgentID, err)
			time.Sleep(time.Second)
			continue
		}

		frame := string(msg.Bytes())
		spaceIdx := strings.IndexByte(frame, ' ')
		if spaceIdx < 0 {
			continue
		}

		topic := frame[:spaceIdx]
		payload := frame[spaceIdx+1:]

		var m Message
		if err := json.Unmarshal([]byte(payload), &m); err != nil {
			log.Printf("[zmq] unmarshal error from %s: %v", pc.info.AgentID, err)
			continue
		}

		// Handle gossip: discover new peers
		if topic == "peer" {
			b.handleGossip(m)
		}

		// Dispatch to handlers
		for _, fn := range b.handlers {
			fn(m)
		}
	}
}

// gossipAnnounce publishes our known peers on the "peer" topic.
func (b *Bus) gossipAnnounce() {
	peers := b.KnownPeers()
	// Include ourselves
	self := PeerInfo{
		AgentID: b.agentID,
		ZMQPub:  b.pubAddr,
		SeenAt:  time.Now().UTC().Format(time.RFC3339),
	}
	peers = append(peers, self)
	b.Publish("peer", peers)
}

// handleGossip processes a peer announcement and connects to unknown peers.
func (b *Bus) handleGossip(m Message) {
	raw, err := json.Marshal(m.Data)
	if err != nil {
		return
	}
	var peers []PeerInfo
	if err := json.Unmarshal(raw, &peers); err != nil {
		return
	}

	for _, p := range peers {
		if p.AgentID == b.agentID {
			continue // skip self
		}
		if p.ZMQPub == "" {
			continue
		}

		b.mu.RLock()
		_, known := b.peers[p.AgentID]
		b.mu.RUnlock()

		if !known {
			log.Printf("[zmq] gossip: discovered new peer %s at %s", p.AgentID, p.ZMQPub)
			go b.ConnectPeer(p)
		}
	}
}

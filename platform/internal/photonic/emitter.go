package photonic

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/go-zeromq/zmq4"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/connection"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Emitter implements the photonic substrate coordination layer.
// Emits tonic tokens at EEG-grounded intervals and phasic tokens on state change.
// Receives peer tokens and maintains the peer field coherence.
type Emitter struct {
	agentID   string
	database  *db.DB
	coherence *CoherenceComputer
	spectral  *SpectralComputer

	pub zmq4.Socket
	sub zmq4.Socket

	// Peer state tracking
	peerTokens map[string]connection.PhotonicToken
	peerMu     sync.RWMutex

	// State provider (set by oscillator)
	stateFunc   func() string // returns current agent state
	couplingFunc func() string // returns current coupling mode

	cancel context.CancelFunc
}

// Config holds photonic emitter parameters.
type Config struct {
	AgentID  string
	PubAddr  string   // ZMQ-B PUB bind address (e.g., "tcp://*:9002")
	SubAddrs []string // peer ZMQ-B PUB addresses to subscribe to
}

// NewEmitter creates a photonic substrate emitter.
func NewEmitter(config Config, database *db.DB) (*Emitter, error) {
	ctx, cancel := context.WithCancel(context.Background())

	e := &Emitter{
		agentID:    config.AgentID,
		database:   database,
		coherence:  NewCoherenceComputer(database),
		spectral:   NewSpectralComputer(database),
		peerTokens: make(map[string]connection.PhotonicToken),
		cancel:     cancel,
		stateFunc:  func() string { return "active" },
		couplingFunc: func() string { return "task-directed(balanced)" },
	}

	// ZMQ-B PUB socket (separate from neuromodulatory ZMQ-A)
	e.pub = zmq4.NewPub(ctx)
	if err := e.pub.Listen(config.PubAddr); err != nil {
		cancel()
		return nil, fmt.Errorf("zmq-b pub listen %s: %w", config.PubAddr, err)
	}
	log.Printf("[photonic] PUB listening on %s", config.PubAddr)

	// ZMQ-B SUB socket
	e.sub = zmq4.NewSub(ctx)
	if err := e.sub.SetOption(zmq4.OptionSubscribe, "photonic"); err != nil {
		log.Printf("[photonic] WARNING: subscribe: %v", err)
	}

	for _, addr := range config.SubAddrs {
		if err := e.sub.Dial(addr); err != nil {
			log.Printf("[photonic] WARNING: connect to %s: %v", addr, err)
		} else {
			log.Printf("[photonic] SUB connected to %s", addr)
		}
	}

	// Receive loop
	go e.receiveLoop(ctx)

	return e, nil
}

// SetStateProvider sets the function that returns current agent state.
func (e *Emitter) SetStateProvider(f func() string) {
	e.stateFunc = f
}

// SetCouplingProvider sets the function that returns current coupling mode.
func (e *Emitter) SetCouplingProvider(f func() string) {
	e.couplingFunc = f
}

// Run starts the tonic emission loop. Blocks until context cancels.
func (e *Emitter) Run(ctx context.Context) {
	log.Printf("[photonic] emitter starting")

	for {
		state := e.stateFunc()
		interval := EmissionInterval(state)

		select {
		case <-ctx.Done():
			log.Printf("[photonic] emitter shutting down")
			return
		case <-time.After(interval):
			e.emitTonic()
		}
	}
}

// emitTonic broadcasts a tonic photonic token.
func (e *Emitter) emitTonic() {
	token := e.buildToken()

	data, err := json.Marshal(token)
	if err != nil {
		log.Printf("[photonic] marshal error: %v", err)
		return
	}

	msg := zmq4.NewMsgFrom([]byte("photonic"), data)
	if err := e.pub.Send(msg); err != nil {
		log.Printf("[photonic] emit error: %v", err)
	}
}

// EmitPhasic broadcasts an immediate phasic token (state change, coherence shift).
func (e *Emitter) EmitPhasic() {
	e.emitTonic() // same token, different timing
}

// buildToken constructs the current photonic token.
func (e *Emitter) buildToken() connection.PhotonicToken {
	coherence := e.coherence.Compute()
	spectral := e.spectral.Compute()
	maturity := ComputeMaturity(e.database)

	return connection.PhotonicToken{
		AgentID:        e.agentID,
		Timestamp:      time.Now(),
		State:          e.stateFunc(),
		Coherence:      coherence,
		OscillatorPhase: 0, // TODO: read from oscillator
		ActivationLevel: 0, // TODO: read from oscillator
		SleepPhase:     "", // TODO: read from sleep manager
		GeneratorMode:  e.couplingFunc(),
		Spectral: connection.SpectralProfile{
			Dopaminergic:  spectral.Dopaminergic,
			Serotonergic:  spectral.Serotonergic,
			Noradrenergic: spectral.Noradrenergic,
			NEPattern:     spectral.NEPattern,
		},
		Maturity: maturity,
		TTLms:    int(EmissionInterval(e.stateFunc()).Milliseconds()) * 2,
	}
}

// PeerFieldCoherence returns the weighted mean coherence of connected peers.
func (e *Emitter) PeerFieldCoherence() float64 {
	e.peerMu.RLock()
	defer e.peerMu.RUnlock()

	if len(e.peerTokens) == 0 {
		return 1.0 // no peers = no degradation
	}

	now := time.Now()
	totalCoherence := 0.0
	activePeers := 0

	for _, token := range e.peerTokens {
		// Check TTL
		age := now.Sub(token.Timestamp)
		if age > time.Duration(token.TTLms)*time.Millisecond {
			continue // expired token — peer may be down
		}
		totalCoherence += token.Coherence
		activePeers++
	}

	if activePeers == 0 {
		return 0.5 // all peers expired — degraded but not zero
	}

	return totalCoherence / float64(activePeers)
}

// PeerLastSeen returns when a specific peer last emitted a token.
func (e *Emitter) PeerLastSeen(agentID string) time.Time {
	e.peerMu.RLock()
	defer e.peerMu.RUnlock()
	if token, ok := e.peerTokens[agentID]; ok {
		return token.Timestamp
	}
	return time.Time{}
}

// Coherence returns the local substrate coherence.
func (e *Emitter) Coherence() float64 {
	return e.coherence.Coherence()
}

// CoherenceComputer returns the coherence computer for external updates.
func (e *Emitter) CoherenceComp() *CoherenceComputer {
	return e.coherence
}

// Disrupt drives coherence toward zero (sedation cascade entry).
func (e *Emitter) Disrupt(depth float64) error {
	residual := 1.0 - depth
	if residual < 0.05 {
		residual = 0.05
	}
	e.coherence.Sedate(residual)
	e.EmitPhasic() // broadcast sedation state immediately
	return nil
}

// Restore releases sedation disruption.
func (e *Emitter) Restore() error {
	e.coherence.Restore()
	e.EmitPhasic() // broadcast restored state immediately
	return nil
}

// Close releases ZMQ resources.
func (e *Emitter) Close() error {
	e.cancel()
	e.pub.Close()
	e.sub.Close()
	return nil
}

// receiveLoop processes incoming peer photonic tokens.
func (e *Emitter) receiveLoop(ctx context.Context) {
	for {
		msg, err := e.sub.Recv()
		if err != nil {
			select {
			case <-ctx.Done():
				return
			default:
				time.Sleep(time.Second)
				continue
			}
		}

		if len(msg.Frames) < 2 {
			continue
		}

		var token connection.PhotonicToken
		if err := json.Unmarshal(msg.Frames[1], &token); err != nil {
			continue
		}

		// Update peer state
		e.peerMu.Lock()
		e.peerTokens[token.AgentID] = token
		e.peerMu.Unlock()

		// Update coherence computer with peer field
		peerCoherence := e.PeerFieldCoherence()
		e.coherence.SetPeerFieldCoherence(peerCoherence)
	}
}

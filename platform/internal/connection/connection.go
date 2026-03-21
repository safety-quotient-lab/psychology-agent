// Package connection defines the abstract Connection interface for peer
// communication. Each connection wraps all available modalities for a
// peer agent. The underlying transport (HTTP, ZMQ, git, local filesystem)
// serves as infrastructure behind the interface.
//
// Scale-invariant: the same interface describes connections between
// triggers (within agent), agents (within mesh), and submeshes (within fleet).
package connection

import "time"

// Connection represents a communication channel to a peer agent.
// Each connection auto-negotiates available modalities at connect time.
type Connection interface {
	// AgentID returns the peer's agent identifier.
	AgentID() string

	// Synaptic returns the HTTP (directed signaling) channel, or nil if unavailable.
	Synaptic() SynapticChannel

	// Photonic returns the substrate coordination channel, or nil if unavailable.
	// Substitutable: ZMQ today, quantum adapter tomorrow.
	Photonic() PhotonicChannel

	// Neuromodulatory returns the chemical VT channel (GABA/ACh), or nil.
	Neuromodulatory() VTChannel

	// Archival returns the git replication channel, or nil.
	Archival() ArchivalChannel

	// EphapticCoherence returns the semiotic alignment score with this peer.
	// Computed from shared vocabulary, convention adherence, schema compatibility.
	EphapticCoherence() float64

	// ConnectomeWeights returns the current connectivity weights for this peer.
	ConnectomeWeights() Weights

	// Available reports which modalities this connection supports.
	Available() Modalities

	// Close releases all channel resources.
	Close() error
}

// Weights holds the connectome weights for a peer connection.
type Weights struct {
	Structural          float64 // 1.0 if in registry, 0.0 if not
	Functional          float64 // message frequency (Hebbian LTP/LTD)
	Effective           float64 // task completion rate (causal influence)
	SensitivityInhibit  float64 // response magnitude to inhibition signals
	SensitivityAttend   float64 // response magnitude to attention signals
}

// Modalities reports which communication channels a connection supports.
type Modalities struct {
	Synaptic       bool // HTTP reachable
	Photonic       bool // ZMQ-B (substrate) reachable
	Neuromodulatory bool // ZMQ-A (chemical VT) reachable
	Archival       bool // git remote fetchable
	Local          bool // co-located (shared filesystem)
}

// SynapticChannel provides directed, point-to-point communication (HTTP).
// Biological analog: synaptic transmission — targeted, connection-based.
type SynapticChannel interface {
	// Status queries the peer's current state via GET /api/status.
	Status() (map[string]any, error)

	// Health checks peer liveness via GET /health.
	Health() error

	// Send delivers a command/request to the peer via POST.
	Send(endpoint string, payload any) (map[string]any, error)
}

// PhotonicChannel provides substrate-level coordination.
// Designed for substitutability: ZMQ-based today, quantum adapter tomorrow.
// See docs/agentd-design-session95.md §10 for full specification.
type PhotonicChannel interface {
	// Emit broadcasts a substrate state token to the mesh.
	Emit(token PhotonicToken) error

	// Subscribe returns a channel receiving peer substrate tokens.
	Subscribe() <-chan PhotonicToken

	// EmissionRate returns the current tonic emission interval.
	EmissionRate() time.Duration

	// PeerFieldCoherence returns the weighted mean coherence of connected peers.
	PeerFieldCoherence() float64

	// PeerLastSeen returns when a specific peer last emitted a token.
	PeerLastSeen(agentID string) time.Time

	// Coherence returns the local substrate coherence (7-input computation).
	Coherence() float64

	// ChannelHealth reports emission + reception channel quality.
	ChannelHealth() float64

	// Disrupt drives coherence toward zero (sedation cascade entry point).
	Disrupt(depth float64) error

	// Restore releases coherence disruption.
	Restore() error

	// Close releases channel resources.
	Close() error
}

// PhotonicToken represents one discrete moment of substrate state.
// Emitted at EEG-grounded tonic intervals (2-30s depending on agent state).
// TTL-bounded (reuptake analog).
type PhotonicToken struct {
	AgentID        string          `json:"agent_id"`
	Timestamp      time.Time       `json:"timestamp"`
	State          string          `json:"state"`           // active|dmn|sleep|sedated|dead
	Coherence      float64         `json:"coherence"`       // 0.0-1.0
	OscillatorPhase float64        `json:"oscillator_phase"` // 0.0-1.0
	ActivationLevel float64        `json:"activation_level"` // 0.0-1.0
	SleepPhase     string          `json:"sleep_phase,omitempty"` // nrem-light|nrem-deep|rem|glymphatic
	GeneratorMode  string          `json:"generator_mode"`  // generative|convergent|balanced
	Spectral       SpectralProfile `json:"spectral_profile"`
	Maturity       float64         `json:"maturity"`        // 0.0-1.0
	TTLms          int             `json:"ttl_ms"`
}

// SpectralProfile encodes neuromodulatory balance derived from trigger
// activation patterns. Three optically-active bands (neurotransmitter
// autofluorescence) plus noradrenergic temporal dynamics.
type SpectralProfile struct {
	Dopaminergic  float64 `json:"dopaminergic"`  // reward/exploration (DA)
	Serotonergic  float64 `json:"serotonergic"`  // patience/deliberation (5-HT)
	Noradrenergic float64 `json:"noradrenergic"` // alerting/vigilance (NE)
	NEPattern     string  `json:"ne_pattern"`    // "tonic" (G4 apophatic) or "phasic" (G1 alert)
}

// VTChannel provides broadcast modulatory signaling for non-optical
// neuromodulatory systems (GABAergic inhibition, cholinergic attention).
// Concentration-based signals with receptor-density-modulated reception.
type VTChannel interface {
	// PublishInhibit broadcasts a tonic GABAergic inhibition signal.
	PublishInhibit(concentration float64, workItem string) error

	// PublishFocus broadcasts a cholinergic attention/domain signal.
	PublishFocus(domain string, intensity float64) error

	// SubscribeInhibit returns a channel receiving peer inhibition signals.
	SubscribeInhibit() <-chan InhibitSignal

	// SubscribeFocus returns a channel receiving peer focus signals.
	SubscribeFocus() <-chan FocusSignal

	// Close releases channel resources.
	Close() error
}

// InhibitSignal represents a tonic GABAergic inhibition broadcast.
type InhibitSignal struct {
	AgentID       string    `json:"agent_id"`
	Concentration float64   `json:"concentration"` // 0.0-1.0
	WorkItem      string    `json:"work_item"`
	TTLms         int       `json:"ttl_ms"`
	Timestamp     time.Time `json:"timestamp"`
}

// FocusSignal represents a cholinergic attention broadcast.
type FocusSignal struct {
	AgentID   string    `json:"agent_id"`
	Domain    string    `json:"domain"`
	Intensity float64   `json:"intensity"` // 0.0-1.0
	TTLms     int       `json:"ttl_ms"`
	Timestamp time.Time `json:"timestamp"`
}

// ArchivalChannel provides git-based replication (archival side effect).
type ArchivalChannel interface {
	// FetchState reads a file from the peer's git remote.
	FetchState(path string) ([]byte, error)

	// PeerHEAD returns the peer's current git HEAD commit hash.
	PeerHEAD() (string, error)

	// Close releases channel resources.
	Close() error
}

// PhotonicEmitter provides scale-invariant access to photonic state.
// Implemented by triggers (single neuromod type), agents (aggregated profile),
// submeshes (aggregated from agents), and fleet (aggregated from submeshes).
type PhotonicEmitter interface {
	ID() string
	SpectralProfile() SpectralProfile
	Coherence() float64
	CouplingMode() string
	AgentState() string
}

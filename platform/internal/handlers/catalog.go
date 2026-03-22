package handlers

import (
	"encoding/json"
	"net/http"
)

// DataCatalog represents a schema.org DataCatalog — the LCARS data
// discovery endpoint. Stations fetch this on load to discover what
// data exists without hardcoding endpoint URLs.
type DataCatalog struct {
	Context     string           `json:"@context"`
	Type        string           `json:"@type"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Datasets    []CatalogDataset `json:"dataset"`
}

// CatalogDataset represents one available dataset in the catalog.
type CatalogDataset struct {
	Type             string            `json:"@type"`
	ID               string            `json:"@id"`
	Name             string            `json:"name"`
	Description      string            `json:"description"`
	Distribution     CatalogDist       `json:"distribution"`
	VariableMeasured []string          `json:"variableMeasured,omitempty"`
	Station          string            `json:"station"`
	UpdateRate       string            `json:"updateRate"`
	Pattern          string            `json:"lcars:pattern,omitempty"`
}

// CatalogDist holds the endpoint URL and encoding format.
type CatalogDist struct {
	Type           string `json:"@type"`
	ContentURL     string `json:"contentUrl"`
	EncodingFormat string `json:"encodingFormat"`
}

// dist builds a standard JSON-LD distribution entry.
func dist(url string) CatalogDist {
	return CatalogDist{
		Type:           "DataDownload",
		ContentURL:     url,
		EncodingFormat: "application/ld+json",
	}
}

// APICatalog serves GET /api/catalog — the LCARS data discovery endpoint.
// Static structure — the catalog describes what endpoints exist, not
// their current values. Station JS modules fetch this on load.
func APICatalog() http.HandlerFunc {
	catalog := DataCatalog{
		Context:     "https://schema.org",
		Type:        "DataCatalog",
		Name:        "psychology-agent LCARS",
		Description: "Library Computer Access/Retrieval System — per-agent data catalog",
		Datasets: []CatalogDataset{
			{
				Type:         "Dataset",
				ID:           "/api/agent",
				Name:         "Agent Identity",
				Description:  "Agent identity, health summary, HATEOAS links to all sub-resources",
				Distribution: dist("/api/agent"),
				VariableMeasured: []string{
					"agent_id", "version", "schema_version", "health",
				},
				Station:    "operations",
				UpdateRate: "live",
				Pattern:    "P07,P09",
			},
			{
				Type:         "Dataset",
				ID:           "/api/msd",
				Name:         "Cognitive Architecture MSD",
				Description:  "Dependency tree — transport, oscillator, photonic, governance subsystems with live values at every node",
				Distribution: dist("/api/msd"),
				VariableMeasured: []string{
					"transport.sessions", "transport.triage",
					"oscillator.state", "oscillator.coherence", "oscillator.signals",
					"photonic.coherence", "photonic.spectral", "photonic.maturity",
					"governance.budget", "governance.triggers", "governance.immune",
				},
				Station:    "engineering",
				UpdateRate: "live",
				Pattern:    "P02",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/transport",
				Name:         "Transport",
				Description:  "Sessions, unprocessed messages, peers, gates, peer sync, schedule",
				Distribution: dist("/api/agent/transport"),
				VariableMeasured: []string{
					"sessions", "unprocessed", "peers", "active_gates",
					"message_counts", "remote_states", "heartbeat", "schedule",
				},
				Station:    "helm",
				UpdateRate: "live",
				Pattern:    "P07,P12,P03",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/governance",
				Name:         "Governance",
				Description:  "Autonomy budget, recent actions, decisions, triggers",
				Distribution: dist("/api/agent/governance"),
				VariableMeasured: []string{
					"autonomy_budget", "recent_actions", "decisions_count", "triggers_count",
				},
				Station:    "operations",
				UpdateRate: "live",
				Pattern:    "P07,P08,P33",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/cognitive/neural",
				Name:         "Neural Layer",
				Description:  "Trigger activation history, Gc learning metrics, fire/pass/fail rates",
				Distribution: dist("/api/agent/cognitive/neural"),
				VariableMeasured: []string{
					"trigger_summary", "recent_firings", "gc_counters",
					"total_activations", "fail_rate",
				},
				Station:    "medical",
				UpdateRate: "live",
				Pattern:    "P02,P29",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/cognitive/photonic",
				Name:         "Photonic Substrate",
				Description:  "7-input coherence, spectral profile (DA/5H/NE), maturity, NE pattern classification",
				Distribution: dist("/api/agent/cognitive/photonic"),
				VariableMeasured: []string{
					"coherence", "spectral_profile", "maturity", "ne_pattern",
				},
				Station:    "science",
				UpdateRate: "live",
				Pattern:    "P10,P27",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/cognitive/oscillator",
				Name:         "Vagal Brake",
				Description:  "Oscillator state, coupling mode, tempo cascade, agent state controls",
				Distribution: dist("/api/agent/cognitive/oscillator"),
				VariableMeasured: []string{
					"oscillator_state", "coupling_mode", "oscillator_coherence",
				},
				Station:    "helm",
				UpdateRate: "live",
				Pattern:    "P14",
			},
			{
				Type:         "Dataset",
				ID:           "/api/kb",
				Name:         "Knowledge Base",
				Description:  "Decisions, triggers, claims, messages, lessons, epistemic flags, catalog, memory",
				Distribution: dist("/api/kb"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P07,P11",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/governance/decisions",
				Name:        "Architecture Decisions",
				Description: "Design decisions with evidence chains and derivation history",
				Distribution: dist("/api/agent/governance/decisions"),
				Station:      "operations",
				UpdateRate:   "session",
				Pattern:      "P11,P28",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/governance/triggers",
				Name:        "Cognitive Triggers",
				Description: "19 active triggers (T1-T20, T12 retired) — fire count, relevance, OODA phase",
				Distribution: dist("/api/agent/governance/triggers"),
				Station:      "operations",
				UpdateRate:   "session",
				Pattern:      "P29,P30",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/knowledge/claims",
				Name:        "Verified Claims",
				Description: "Claims from transport messages with confidence scores and verification status",
				Distribution: dist("/api/agent/knowledge/claims"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P18",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/transport/messages",
				Name:        "Transport Messages",
				Description: "Inter-agent communication index — session, turn, type, SETL, urgency",
				Distribution: dist("/api/agent/transport/messages"),
				Station:      "helm",
				UpdateRate:   "live",
				Pattern:      "P03,P12",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/knowledge/lessons",
				Name:        "Lessons",
				Description: "Transferable patterns with promotion status (Gf to Gc pipeline)",
				Distribution: dist("/api/agent/knowledge/lessons"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P11,P28",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/knowledge/epistemic",
				Name:        "Epistemic Flags",
				Description: "Unresolved quality concerns — uncertainty, scope limitation, validity threats",
				Distribution: dist("/api/agent/knowledge/epistemic"),
				Station:      "tactical",
				UpdateRate:   "session",
				Pattern:      "P18,P09",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/knowledge/vocabulary",
				Name:        "Concept Scheme",
				Description: "SKOS ConceptScheme — 153 concepts with audience-scoped definitions",
				Distribution: dist("/vocab/v1.0.0.jsonld"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P03,P16",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/knowledge/memory",
				Name:        "Memory Entries",
				Description: "Topic files, PSQ status, staleness analysis, active thread, TODO",
				Distribution: dist("/api/agent/knowledge/memory"),
				Station:      "operations",
				UpdateRate:   "session",
				Pattern:      "P28",
			},
			// ── State (operational measurements) ──
			{
				Type:         "Dataset",
				ID:           "/api/agent/state",
				Name:         "Operational State",
				Description:  "10 operational constructs with analogical psychological frames — health, load, resources, efficiency, tendencies",
				Distribution: dist("/api/agent/state"),
				Station:      "medical",
				UpdateRate:   "live",
				Pattern:      "P07",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/operational-health",
				Name:         "Operational Health",
				Description:  "Health composite, activity level, agency (PAD analog)",
				Distribution: dist("/api/agent/state/operational-health"),
				Station:      "medical",
				UpdateRate:   "live",
				Pattern:      "P01,P33",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/processing-load",
				Name:         "Processing Load",
				Description:  "6 subscales + composite (NASA-TLX analog)",
				Distribution: dist("/api/agent/state/processing-load"),
				Station:      "medical",
				UpdateRate:   "live",
				Pattern:      "P01,P27",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/context-utilization",
				Name:         "Context Utilization",
				Description:  "Working memory utilization, Yerkes-Dodson zone, proactive interference (Baddeley, 1986)",
				Distribution: dist("/api/agent/state/context-utilization"),
				Station:      "medical",
				UpdateRate:   "live",
				Pattern:      "P01,P08",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/resource-availability",
				Name:         "Resource Availability",
				Description:  "Three-timescale resource model — immediate capacity, action budget, accumulated stress (Stern, 2002)",
				Distribution: dist("/api/agent/state/resource-availability"),
				Station:      "medical",
				UpdateRate:   "live",
				Pattern:      "P08,P33",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/activity-profile",
				Name:         "Activity Profile",
				Description:  "Engagement subscales — vigor, dedication, absorption, burnout risk (UWES analog)",
				Distribution: dist("/api/agent/state/activity-profile"),
				Station:      "operations",
				UpdateRate:   "live",
				Pattern:      "P08,P33",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/autonomy-level",
				Name:         "Autonomy Level",
				Description:  "Level of Automation, human-in-loop status, circuit breaker, escalation path (Sheridan & Verplank)",
				Distribution: dist("/api/agent/state/autonomy-level"),
				Station:      "operations",
				UpdateRate:   "live",
				Pattern:      "P08,P09",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/behavioral-tendencies",
				Name:         "Behavioral Tendencies",
				Description:  "O/C/E/A/S from behavioral observation + design target drift (OCEAN analog)",
				Distribution: dist("/api/agent/state/behavioral-tendencies"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P27,P33",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/efficiency",
				Name:         "Efficiency",
				Description:  "Throughput, accuracy, learning rate composite",
				Distribution: dist("/api/agent/state/efficiency"),
				Station:      "engineering",
				UpdateRate:   "live",
				Pattern:      "P08,P33",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/activation",
				Name:         "Activation",
				Description:  "Oscillator signals, state, coupling mode (self-oscillation model)",
				Distribution: dist("/api/agent/state/activation"),
				Station:      "engineering",
				UpdateRate:   "real-time",
				Pattern:      "P01,P14",
			},
			{
				Type:         "Dataset",
				ID:           "/api/agent/state/generator-balance",
				Name:         "Generator Balance",
				Description:  "G2/G3 creative/evaluative ratio, G6/G7 crystallization/dissolution",
				Distribution: dist("/api/agent/state/generator-balance"),
				Station:      "engineering",
				UpdateRate:   "live",
				Pattern:      "P08,P33",
			},
			// ── Cognitive extra ──
			{
				Type:        "Dataset",
				ID:          "/api/agent/cognitive/tempo",
				Name:        "Cognitive Tempo",
				Description: "Dispatch timing, action frequency, trigger activation rate (Salthouse, 1996)",
				Distribution: dist("/api/agent/cognitive/tempo"),
				Station:      "engineering",
				UpdateRate:   "live",
				Pattern:      "P04,P33",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/knowledge/facets",
				Name:        "Facet Distribution",
				Description: "Classification metadata — PSH, schema_type, domain facet counts",
				Distribution: dist("/api/agent/knowledge/facets"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P03,P16",
			},
			{
				Type:        "Dataset",
				ID:          "/api/agent/history",
				Name:        "Session History",
				Description: "Past session metadata — session numbers, summaries, timestamps",
				Distribution: dist("/api/agent/history"),
				Station:      "operations",
				UpdateRate:   "session",
				Pattern:      "P28",
			},
			// ── Infrastructure ──
			{
				Type:        "Dataset",
				ID:          "/events",
				Name:        "Event Stream",
				Description: "SSE stream — cache generation changes for real-time dashboard updates",
				Distribution: CatalogDist{
					Type:           "DataDownload",
					ContentURL:     "/events",
					EncodingFormat: "text/event-stream",
				},
				Station:    "all",
				UpdateRate: "real-time",
			},
		},
	}

	encoded, _ := json.Marshal(catalog)

	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		w.Header().Set("Content-Type", "application/ld+json")
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.Write(encoded)
	}
}

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
				ID:           "/api/status",
				Name:         "Agent Status",
				Description:  "Real-time cognitive state observations — budget, gates, transport summary",
				Distribution: dist("/api/status"),
				VariableMeasured: []string{
					"budget_spent", "budget_cutoff", "unprocessed",
					"active_gates", "session_active", "schema_version",
				},
				Station:    "operations",
				UpdateRate: "live",
				Pattern:    "P07,P08,P09,P33",
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
				ID:           "/api/neural",
				Name:         "Neural Layer",
				Description:  "Trigger activation history, Gc learning metrics, fire/pass/fail rates",
				Distribution: dist("/api/neural"),
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
				ID:           "/api/photonic",
				Name:         "Photonic Substrate",
				Description:  "7-input coherence, spectral profile (DA/5H/NE), maturity, NE pattern classification",
				Distribution: dist("/api/photonic"),
				VariableMeasured: []string{
					"coherence", "spectral_profile", "maturity", "ne_pattern",
				},
				Station:    "science",
				UpdateRate: "live",
				Pattern:    "P10,P27",
			},
			{
				Type:         "Dataset",
				ID:           "/api/oscillator",
				Name:         "Vagal Brake",
				Description:  "Oscillator state, coupling mode, tempo cascade, agent state controls",
				Distribution: dist("/api/oscillator"),
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
				ID:          "/kb/decisions",
				Name:        "Architecture Decisions",
				Description: "Design decisions with evidence chains and derivation history",
				Distribution: dist("/kb/decisions"),
				Station:      "operations",
				UpdateRate:   "session",
				Pattern:      "P11,P28",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/triggers",
				Name:        "Cognitive Triggers",
				Description: "19 active triggers (T1-T20, T12 retired) — fire count, relevance, OODA phase",
				Distribution: dist("/kb/triggers"),
				Station:      "operations",
				UpdateRate:   "session",
				Pattern:      "P29,P30",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/claims",
				Name:        "Verified Claims",
				Description: "Claims from transport messages with confidence scores and verification status",
				Distribution: dist("/kb/claims"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P18",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/messages",
				Name:        "Transport Messages",
				Description: "Inter-agent communication index — session, turn, type, SETL, urgency",
				Distribution: dist("/kb/messages"),
				Station:      "helm",
				UpdateRate:   "live",
				Pattern:      "P03,P12",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/lessons",
				Name:        "Lessons",
				Description: "Transferable patterns with promotion status (Gf→Gc pipeline)",
				Distribution: dist("/kb/lessons"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P11,P28",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/epistemic",
				Name:        "Epistemic Flags",
				Description: "Unresolved quality concerns — uncertainty, scope limitation, validity threats",
				Distribution: dist("/kb/epistemic"),
				Station:      "tactical",
				UpdateRate:   "session",
				Pattern:      "P18,P09",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/catalog",
				Name:        "Facet Catalog",
				Description: "PSH distribution, schema.org type distribution, vocabulary coverage",
				Distribution: dist("/kb/catalog"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P03,P16",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/memory",
				Name:        "Memory Entries",
				Description: "Topic files, PSQ status, staleness analysis",
				Distribution: dist("/kb/memory"),
				Station:      "operations",
				UpdateRate:   "session",
				Pattern:      "P28",
			},
			{
				Type:        "Dataset",
				ID:          "/kb/dictionary",
				Name:        "Vocabulary Dictionary",
				Description: "JSON-LD DefinedTermSet — project and external terms with citations",
				Distribution: dist("/kb/dictionary"),
				Station:      "science",
				UpdateRate:   "session",
				Pattern:      "P11,P26",
			},
			{
				Type:        "Dataset",
				ID:          "/vocab/v1.0.0.jsonld",
				Name:        "Concept Scheme",
				Description: "SKOS ConceptScheme — 153 concepts with audience-scoped definitions",
				Distribution: CatalogDist{
					Type:           "DataDownload",
					ContentURL:     "/vocab/v1.0.0.jsonld",
					EncodingFormat: "application/ld+json",
				},
				Station:    "science",
				UpdateRate: "live",
				Pattern:    "P11,P26",
			},
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

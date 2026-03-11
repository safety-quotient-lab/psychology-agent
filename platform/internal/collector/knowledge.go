package collector

import (
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// KnowledgeBase holds the complete knowledge base snapshot.
type KnowledgeBase struct {
	Decisions  []map[string]any `json:"decisions"`
	Triggers   []map[string]any `json:"triggers"`
	Catalog    CatalogData      `json:"catalog"`
	Memory     MemoryData       `json:"memory"`
	Totals     KBTotals         `json:"totals"`
}

// CatalogData holds the classification catalog — PSH categories, schema.org
// types, and their distribution across entities.
type CatalogData struct {
	Active     []map[string]any `json:"active"`
	Inactive   []map[string]any `json:"inactive"`
	EntityDist []map[string]any `json:"entity_distribution"`
}

// MemoryData holds memory entries and staleness data.
type MemoryData struct {
	Entries   []map[string]any `json:"entries"`
	PSQStatus []map[string]any `json:"psq_status"`
	ByTopic   []map[string]any `json:"by_topic"`
}

// KBTotals holds aggregate counts for the knowledge base.
type KBTotals struct {
	Decisions       int `json:"decisions"`
	Triggers        int `json:"triggers"`
	CatalogEntries  int `json:"catalog_entries"`
	MemoryEntries   int `json:"memory_entries"`
	StaleEntries    int `json:"stale_entries"`
}

// DictionaryEntry represents a single term in JSON-LD format (schema:DefinedTerm).
type DictionaryEntry struct {
	Context          string `json:"@context"`
	Type             string `json:"@type"`
	Name             string `json:"name"`
	Description      string `json:"description,omitempty"`
	TermCode         string `json:"termCode,omitempty"`
	InDefinedTermSet string `json:"inDefinedTermSet,omitempty"`
	Source           string `json:"source,omitempty"`
	EntityCount      int    `json:"entityCount,omitempty"`
}

// Dictionary represents the full JSON-LD dictionary as a schema:DefinedTermSet.
type Dictionary struct {
	Context     string            `json:"@context"`
	Type        string            `json:"@type"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	HasTerm     []DictionaryEntry `json:"hasDefinedTerm"`
}

// CollectKnowledgeBase gathers all knowledge base data from state.db.
func CollectKnowledgeBase(d *db.DB) *KnowledgeBase {
	decisions := collectDecisions(d)
	triggers := collectTriggers(d)
	catalog := collectCatalog(d)
	memory := collectMemory(d)

	staleCount := d.ScalarInt(
		`SELECT COUNT(*) FROM memory_entries
		 WHERE last_confirmed < date('now', '-14 days')
		 OR last_confirmed IS NULL`)

	return &KnowledgeBase{
		Decisions: decisions,
		Triggers:  triggers,
		Catalog:   catalog,
		Memory:    memory,
		Totals: KBTotals{
			Decisions:      len(decisions),
			Triggers:       len(triggers),
			CatalogEntries: len(catalog.Active),
			MemoryEntries:  d.ScalarInt("SELECT COUNT(*) FROM memory_entries"),
			StaleEntries:   staleCount,
		},
	}
}

// CollectDecisions returns architecture decisions with evidence chains.
func CollectDecisions(d *db.DB) []map[string]any {
	return collectDecisions(d)
}

func collectDecisions(d *db.DB) []map[string]any {
	rows, _ := d.QueryRows(
		`SELECT id, decision_key, decision_text, evidence_source,
		 derives_from, decided_date, confidence, created_at
		 FROM decision_chain
		 ORDER BY decided_date DESC`)
	if rows == nil {
		return []map[string]any{}
	}
	return rows
}

// CollectTriggers returns cognitive trigger state.
func CollectTriggers(d *db.DB) []map[string]any {
	return collectTriggers(d)
}

func collectTriggers(d *db.DB) []map[string]any {
	rows, _ := d.QueryRows(
		`SELECT trigger_id, description, last_fired, fire_count,
		 relevance_score, decay_rate, updated_at
		 FROM trigger_state
		 ORDER BY trigger_id`)
	if rows == nil {
		return []map[string]any{}
	}
	return rows
}

func collectCatalog(d *db.DB) CatalogData {
	active, _ := d.QueryRows(
		`SELECT fv.facet_type, fv.facet_value, fv.code, fv.source,
		 fv.description, fv.entity_scope, fv.keyword_count,
		 COALESCE(uf.entity_count, 0) as entity_count,
		 COALESCE(uf.avg_confidence, 0) as avg_confidence
		 FROM facet_vocabulary fv
		 LEFT JOIN (
		   SELECT facet_type, facet_value,
		   COUNT(*) as entity_count,
		   ROUND(AVG(confidence), 3) as avg_confidence
		   FROM universal_facets
		   GROUP BY facet_type, facet_value
		 ) uf ON fv.facet_type = uf.facet_type AND fv.facet_value = uf.facet_value
		 WHERE fv.active = 1
		 ORDER BY fv.facet_type, COALESCE(uf.entity_count, 0) DESC`)
	if active == nil {
		active = []map[string]any{}
	}

	inactive, _ := d.QueryRows(
		`SELECT facet_type, facet_value, code, source, description
		 FROM facet_vocabulary
		 WHERE active = 0 AND facet_type = 'psh'
		 ORDER BY facet_value`)
	if inactive == nil {
		inactive = []map[string]any{}
	}

	entityDist, _ := d.QueryRows(
		`SELECT entity_type, COUNT(*) as facet_count,
		 COUNT(DISTINCT facet_value) as distinct_values
		 FROM universal_facets
		 GROUP BY entity_type
		 ORDER BY facet_count DESC`)
	if entityDist == nil {
		entityDist = []map[string]any{}
	}

	return CatalogData{
		Active:     active,
		Inactive:   inactive,
		EntityDist: entityDist,
	}
}

func collectMemory(d *db.DB) MemoryData {
	entries, _ := d.QueryRows(
		`SELECT id, topic, entry_key, value, status, last_confirmed, session_id
		 FROM memory_entries
		 ORDER BY topic, entry_key`)
	if entries == nil {
		entries = []map[string]any{}
	}

	psqStatus, _ := d.QueryRows(
		`SELECT entry_key, value, status_marker, model_version,
		 calibration_id, endpoint_url, last_confirmed
		 FROM psq_status
		 ORDER BY entry_key`)
	if psqStatus == nil {
		psqStatus = []map[string]any{}
	}

	byTopic, _ := d.QueryRows(
		`SELECT topic,
		 COUNT(*) as entry_count,
		 SUM(CASE WHEN last_confirmed < date('now', '-14 days')
		          OR last_confirmed IS NULL THEN 1 ELSE 0 END) as stale_count,
		 MAX(last_confirmed) as newest,
		 MIN(last_confirmed) as oldest
		 FROM memory_entries
		 GROUP BY topic
		 ORDER BY topic`)
	if byTopic == nil {
		byTopic = []map[string]any{}
	}

	return MemoryData{
		Entries:   entries,
		PSQStatus: psqStatus,
		ByTopic:   byTopic,
	}
}

// CollectDictionary produces a JSON-LD DefinedTermSet from the facet
// vocabulary. Each active vocabulary entry becomes a schema:DefinedTerm
// with term code, source attribution, and entity count.
func CollectDictionary(d *db.DB) *Dictionary {
	rows, _ := d.QueryRows(
		`SELECT fv.facet_type, fv.facet_value, fv.code, fv.source,
		 fv.description, fv.keyword_count,
		 COALESCE(uf.entity_count, 0) as entity_count
		 FROM facet_vocabulary fv
		 LEFT JOIN (
		   SELECT facet_type, facet_value, COUNT(*) as entity_count
		   FROM universal_facets
		   GROUP BY facet_type, facet_value
		 ) uf ON fv.facet_type = uf.facet_type AND fv.facet_value = uf.facet_value
		 WHERE fv.active = 1
		 ORDER BY fv.facet_type, fv.facet_value`)
	if rows == nil {
		rows = []map[string]any{}
	}

	terms := make([]DictionaryEntry, 0, len(rows))
	for _, row := range rows {
		facetType := getString(row, "facet_type")
		termSet := "PSH Subject Headings"
		if facetType == "schema_type" {
			termSet = "schema.org Types"
		}

		terms = append(terms, DictionaryEntry{
			Context:          "https://schema.org",
			Type:             "DefinedTerm",
			Name:             getString(row, "facet_value"),
			Description:      getString(row, "description"),
			TermCode:         getString(row, "code"),
			InDefinedTermSet: termSet,
			Source:           getString(row, "source"),
			EntityCount:      getInt(row, "entity_count"),
		})
	}

	return &Dictionary{
		Context:     "https://schema.org",
		Type:        "DefinedTermSet",
		Name:        "Psychology Agent Knowledge Base Dictionary",
		Description: "Classification vocabulary used by the psychology agent mesh — PSH subject headings and schema.org types",
		HasTerm:     terms,
	}
}

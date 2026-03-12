package quality

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

// AddFacet adds a universal facet to any entity. Writes to state.db.
func AddFacet(db *sql.DB, entityType string, entityID int, facetType, facetValue string) error {
	_, err := db.Exec(
		"INSERT OR IGNORE INTO universal_facets "+
			"(entity_type, entity_id, facet_type, facet_value) "+
			"VALUES (?, ?, ?, ?)",
		entityType, entityID, facetType, facetValue)
	if err != nil {
		return fmt.Errorf("add facet: %w", err)
	}
	fmt.Printf("facet: %s/%d +%s=%s\n", entityType, entityID, facetType, facetValue)
	return nil
}

// FacetResult represents a facet query result.
type FacetResult struct {
	EntityType string `json:"entity_type"`
	EntityID   int    `json:"entity_id"`
	FacetType  string `json:"facet_type"`
	FacetValue string `json:"facet_value"`
}

// QueryFacets queries entities by facet type and value.
func QueryFacets(db *sql.DB, facetType, facetValue string) ([]FacetResult, error) {
	rows, err := db.Query(
		"SELECT entity_type, entity_id, facet_type, facet_value "+
			"FROM universal_facets WHERE facet_type = ? AND facet_value = ? "+
			"ORDER BY entity_type, entity_id",
		facetType, facetValue)
	if err != nil {
		return nil, fmt.Errorf("query facets: %w", err)
	}
	defer rows.Close()

	var results []FacetResult
	for rows.Next() {
		var r FacetResult
		if err := rows.Scan(&r.EntityType, &r.EntityID, &r.FacetType, &r.FacetValue); err != nil {
			continue
		}
		results = append(results, r)
	}
	return results, nil
}

// PrintFacetQueryJSON prints facet query results as JSON.
func PrintFacetQueryJSON(results []FacetResult) {
	if results == nil {
		results = []FacetResult{}
	}
	data, _ := json.MarshalIndent(results, "", "  ")
	fmt.Println(string(data))
}

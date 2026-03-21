// Package collector — vocab.go builds the SKOS ConceptScheme from
// facet_vocabulary (state.db) + glossary/dictionary/canonical-glossary
// (markdown files). Served at /vocab/v1.0.0.jsonld via the cybernetic
// cache (same TTL/SSE pattern as Status and KnowledgeBase).
package collector

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/markdown"
)

// ConceptScheme represents the complete SKOS vocabulary.
type ConceptScheme struct {
	Context     map[string]string `json:"@context"`
	Type        string            `json:"@type"`
	Title       string            `json:"dcterms:title"`
	Modified    string            `json:"dcterms:modified"`
	Version     string            `json:"owl:versionInfo"`
	Concepts    []Concept         `json:"concepts"`
	TopConcepts []string          `json:"skos:hasTopConcept,omitempty"`
}

// Concept represents a single SKOS concept with audience-scoped definitions.
type Concept struct {
	ID             string       `json:"@id"`
	Type           string       `json:"@type"`
	PrefLabel      string       `json:"skos:prefLabel"`
	AltLabels      []string     `json:"skos:altLabel,omitempty"`
	Notation       string       `json:"skos:notation,omitempty"`
	InScheme       string       `json:"skos:inScheme"`
	Broader        string       `json:"skos:broader,omitempty"`
	Related        []string     `json:"skos:related,omitempty"`
	Definitions    []Definition `json:"skos:definition,omitempty"`
	ChangeNotes    []string     `json:"skos:changeNote,omitempty"`
	Source         string       `json:"dcterms:source,omitempty"`
	DeltaPolarity  string       `json:"vocab:deltaPolarity,omitempty"`
	Deprecated     bool         `json:"owl:deprecated,omitempty"`
}

// Definition represents an audience-scoped definition per the SKOS Core
// Vocabulary Specification pattern (structured note with dcterms:audience).
type Definition struct {
	Value    string `json:"rdf:value"`
	Audience string `json:"dcterms:audience"`
	Citation string `json:"dcterms:bibliographicCitation,omitempty"`
	Note     string `json:"skos:scopeNote,omitempty"`
}

// schemeID holds the stable concept scheme identifier.
const schemeID = "vocab:cognitive-architecture-v1"

// CollectVocab builds the ConceptScheme from all sources.
func CollectVocab(d *db.DB, projectRoot string) *ConceptScheme {
	now := time.Now().Format("2006-01-02T15:04:05Z")

	scheme := &ConceptScheme{
		Context: map[string]string{
			"skos":    "http://www.w3.org/2004/02/skos/core#",
			"dcterms": "http://purl.org/dc/terms/",
			"rdf":     "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
			"owl":     "http://www.w3.org/2002/07/owl#",
			"vocab":   "https://psychology-agent.safety-quotient.dev/vocab/",
		},
		Type:     "skos:ConceptScheme",
		Title:    "Psychology Agent Cognitive Architecture Vocabulary",
		Modified: now,
		Version:  "1.0.0",
	}

	seen := make(map[string]bool)

	// Source 1: facet_vocabulary from state.db
	vocabConcepts := collectFacetVocab(d, seen)
	scheme.Concepts = append(scheme.Concepts, vocabConcepts...)

	// Source 2: glossary.md
	glossaryPath := filepath.Join(projectRoot, "docs", "glossary.md")
	glossaryConcepts := collectGlossary(glossaryPath, seen)
	scheme.Concepts = append(scheme.Concepts, glossaryConcepts...)

	// Source 3: dictionary.md
	dictPath := filepath.Join(projectRoot, "docs", "dictionary.md")
	dictConcepts := collectDictionary(dictPath, seen)
	scheme.Concepts = append(scheme.Concepts, dictConcepts...)

	// Source 4: canonical-glossary.md (trigger names, agent names)
	canonPath := filepath.Join(projectRoot, "docs", "canonical-glossary.md")
	canonConcepts := collectCanonicalGlossary(canonPath, seen)
	scheme.Concepts = append(scheme.Concepts, canonConcepts...)

	// Source 5: built-in operational state constructs
	stateConcepts := collectStateConcepts(seen)
	scheme.Concepts = append(scheme.Concepts, stateConcepts...)

	// Build top concepts from PSH L1 categories
	for _, c := range scheme.Concepts {
		if c.Broader == "" && c.Source == "PSH" {
			scheme.TopConcepts = append(scheme.TopConcepts, c.ID)
		}
	}

	return scheme
}

// collectFacetVocab reads PSH categories, schema types, and acronyms
// from the facet_vocabulary table.
func collectFacetVocab(d *db.DB, seen map[string]bool) []Concept {
	rows, err := d.QueryRows(
		`SELECT facet_type, facet_value, code, source, description,
		 entity_scope, active, keyword_count
		 FROM facet_vocabulary
		 WHERE active = 1
		 ORDER BY facet_type, facet_value`)
	if err != nil {
		return nil
	}

	var concepts []Concept
	for _, row := range rows {
		facetType := getString(row, "facet_type")
		facetValue := getString(row, "facet_value")
		code := getString(row, "code")
		source := getString(row, "source")
		desc := getString(row, "description")

		id := toConceptID(facetValue)
		if seen[id] {
			continue
		}
		seen[id] = true

		c := Concept{
			ID:        id,
			Type:      "skos:Concept",
			PrefLabel: facetValue,
			InScheme:  schemeID,
			Source:    source,
		}

		if code != "" {
			c.Notation = code
		}

		if desc != "" {
			c.Definitions = append(c.Definitions, Definition{
				Value:    desc,
				Audience: "developer",
			})
		}

		// Classify by facet type
		switch facetType {
		case "psh":
			c.Broader = ""  // PSH L1 categories sit at top
		case "schema_type":
			c.Broader = "vocab:schema-org-types"
		case "acronym":
			// Acronyms: the facet_value IS the acronym, use as notation
			c.Notation = facetValue
			c.PrefLabel = strings.ToLower(facetValue)
			if desc != "" {
				// Description often contains the expansion
				c.PrefLabel = acronymExpansion(desc, facetValue)
			}
			c.AltLabels = []string{facetValue}
		}

		concepts = append(concepts, c)
	}

	return concepts
}

// boldTermRe matches **Term Name** at the start of a line in glossary.md.
var boldTermRe = regexp.MustCompile(`^\*\*([^*]+)\*\*`)

// collectGlossary parses docs/glossary.md for project-coined terms.
func collectGlossary(path string, seen map[string]bool) []Concept {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	var concepts []Concept
	lines := strings.Split(string(data), "\n")

	for i := 0; i < len(lines); i++ {
		m := boldTermRe.FindStringSubmatch(strings.TrimSpace(lines[i]))
		if m == nil {
			continue
		}

		term := m[1]
		id := toConceptID(term)
		if seen[id] {
			continue
		}
		seen[id] = true

		// Collect definition paragraphs until next bold term or heading
		var defLines []string
		for j := i + 1; j < len(lines); j++ {
			line := strings.TrimSpace(lines[j])
			if line == "" && len(defLines) > 0 {
				// Check if next non-empty line starts a new term
				for k := j + 1; k < len(lines); k++ {
					nextLine := strings.TrimSpace(lines[k])
					if nextLine == "" {
						continue
					}
					if boldTermRe.MatchString(nextLine) || strings.HasPrefix(nextLine, "## ") || strings.HasPrefix(nextLine, "---") {
						goto done
					}
					break
				}
			}
			if boldTermRe.MatchString(line) || strings.HasPrefix(line, "## ") || strings.HasPrefix(line, "---") {
				break
			}
			if line != "" {
				defLines = append(defLines, line)
			}
		}
	done:
		definition := strings.Join(defLines, " ")

		c := Concept{
			ID:        id,
			Type:      "skos:Concept",
			PrefLabel: strings.ToLower(term),
			InScheme:  schemeID,
			Source:    "project-glossary",
		}

		if definition != "" {
			c.Definitions = append(c.Definitions, Definition{
				Value:    definition,
				Audience: "developer",
			})
		}

		concepts = append(concepts, c)
	}

	return concepts
}

// dictEntryRe matches **Term** (Author, Year) patterns in dictionary.md.
var dictEntryRe = regexp.MustCompile(`^\*\*([^*]+)\*\*\s*\(([^)]+)\)`)
var dictFieldRe = regexp.MustCompile(`^-\s+\*\*(\w[\w\s]*):\*\*\s*(.*)`)

// collectDictionary parses docs/dictionary.md for external framework terms.
func collectDictionary(path string, seen map[string]bool) []Concept {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	var concepts []Concept
	lines := strings.Split(string(data), "\n")

	for i := 0; i < len(lines); i++ {
		m := dictEntryRe.FindStringSubmatch(strings.TrimSpace(lines[i]))
		if m == nil {
			// Also match **Term** without parenthetical (project-coined in dictionary)
			m2 := boldTermRe.FindStringSubmatch(strings.TrimSpace(lines[i]))
			if m2 == nil {
				continue
			}
			m = []string{m2[0], m2[1], ""}
		}

		term := m[1]
		citation := m[2]
		id := toConceptID(term)
		if seen[id] {
			continue
		}
		seen[id] = true

		// Parse sub-fields (Source, Definition, Project usage)
		var sourceCite, definition, projectUsage string
		for j := i + 1; j < len(lines); j++ {
			line := strings.TrimSpace(lines[j])
			if line == "" || strings.HasPrefix(line, "---") {
				continue
			}
			if boldTermRe.MatchString(line) || dictEntryRe.MatchString(line) || strings.HasPrefix(line, "## ") {
				break
			}
			fm := dictFieldRe.FindStringSubmatch(line)
			if fm != nil {
				switch strings.TrimSpace(fm[1]) {
				case "Source":
					sourceCite = fm[2]
				case "Definition":
					definition = fm[2]
				case "Project usage":
					projectUsage = fm[2]
				}
			}
		}

		c := Concept{
			ID:        id,
			Type:      "skos:Concept",
			PrefLabel: strings.ToLower(term),
			InScheme:  schemeID,
			Source:    "external-dictionary",
		}

		if definition != "" {
			c.Definitions = append(c.Definitions, Definition{
				Value:    definition,
				Audience: "researcher",
				Citation: joinNonEmpty(citation, sourceCite),
			})
		}

		if projectUsage != "" {
			c.Definitions = append(c.Definitions, Definition{
				Value:    projectUsage,
				Audience: "developer",
			})
		}

		concepts = append(concepts, c)
	}

	return concepts
}

// collectCanonicalGlossary parses docs/canonical-glossary.md tables.
func collectCanonicalGlossary(path string, seen map[string]bool) []Concept {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	var concepts []Concept

	// Extract trigger names section
	sec := markdown.ExtractSection(data, "Trigger Names")
	if sec != nil {
		concepts = append(concepts, parseCanonicalTable(sec.Content, "trigger", seen)...)
	}

	// Extract agent names section
	sec = markdown.ExtractSection(data, "Agent Names")
	if sec != nil {
		concepts = append(concepts, parseCanonicalTable(sec.Content, "agent", seen)...)
	}

	return concepts
}

// parseCanonicalTable parses a markdown table with Alias | Canonical | ...
func parseCanonicalTable(content []byte, category string, seen map[string]bool) []Concept {
	var concepts []Concept
	lines := strings.Split(string(content), "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "|") || strings.Contains(line, "---") || strings.Contains(line, "Alias") {
			continue
		}

		cols := strings.Split(line, "|")
		if len(cols) < 4 {
			continue
		}

		alias := strings.TrimSpace(cols[1])
		canonical := strings.TrimSpace(cols[2])
		desc := ""
		if len(cols) >= 5 {
			desc = strings.TrimSpace(cols[3])
		}

		if alias == "" || canonical == "" {
			continue
		}

		id := toConceptID(canonical)
		if seen[id] {
			continue
		}
		seen[id] = true

		c := Concept{
			ID:        id,
			Type:      "skos:Concept",
			PrefLabel: canonical,
			InScheme:  schemeID,
			Source:    "canonical-glossary",
		}

		if alias != canonical {
			c.AltLabels = []string{alias}
			c.Notation = alias
		}

		if desc != "" {
			c.Definitions = append(c.Definitions, Definition{
				Value:    desc,
				Audience: "developer",
			})
		}

		c.Broader = "vocab:" + category + "s"
		concepts = append(concepts, c)
	}

	return concepts
}

// collectStateConcepts returns built-in concepts for the 10 operational
// state constructs served at /api/agent/state/*.
func collectStateConcepts(seen map[string]bool) []Concept {
	constructs := []struct {
		id, label, devDef, resDef, resSource, polarity string
	}{
		{"operational-health", "operational health",
			"Composite of message health, error ratio, gate stress, activity level, and agency. Three dimensions: health [-1,1], activity [-1,1], agency [-1,1].",
			"Operational analog of Mehrabian & Russell (1974) PAD model. Measures processing health, not affective experience.",
			"Mehrabian & Russell (1974)", "higher-better"},
		{"processing-load", "processing load",
			"6-subscale workload index: cognitive demand, time pressure, self-efficacy, mobilized effort, regulatory fatigue, computational strain. Composite weighted equally.",
			"Operational analog of NASA-TLX (Hart & Staveland, 1988). Measures processing burden, not subjective workload perception.",
			"Hart & Staveland (1988)", "lower-better"},
		{"context-utilization", "context utilization",
			"Context window usage: capacity load [0,1], Yerkes-Dodson zone (underloaded/optimal/overloaded), proactive interference from stale entries.",
			"Operational analog of Baddeley (1986) working memory model + Yerkes-Dodson (1908) inverted-U. Measures context pressure, not memory capacity.",
			"Baddeley (1986); Yerkes & Dodson (1908)", "neutral"},
		{"resource-availability", "resource availability",
			"Three timescales: immediate capacity (budget headroom), action budget (consecutive block penalty), accumulated stress (error + gate history).",
			"Operational analog drawing from Stern (2002) cognitive reserve, Baumeister et al. (1998) ego depletion, McEwen (1998) allostatic load.",
			"Stern (2002); Baumeister et al. (1998); McEwen (1998)", "higher-better"},
		{"activity-profile", "activity profile",
			"Vigor (session frequency + action rate), dedication (Gf/Gc ratio — depth of processing), absorption (capacity in optimal zone), burnout risk (inverse composite + context amplifier).",
			"Operational analog of UWES engagement scale (Schaufeli et al., 2002). Measures operational activity patterns, not subjective engagement.",
			"Schaufeli et al. (2002); Bakker & Demerouti (2007)", "higher-better"},
		{"efficiency", "efficiency",
			"Throughput (approved/total actions), accuracy (1 - trigger fail rate), learning rate (promotions + lessons per session). Composite weighted equally.",
			"Operational measure inspired by Hoffman & Schraw (2010) cognitive efficiency. Replaces Flow (Csikszentmihalyi, 1990) — measures output quality per resource, not subjective optimal experience.",
			"Hoffman & Schraw (2010)", "higher-better"},
		{"autonomy-level", "autonomy level",
			"Level of automation (Sheridan scale): LOA 5 (interactive, human present) or LOA 7 (autonomous). Circuit breaker state. Budget remaining.",
			"Direct application of Sheridan & Verplank (1978) LOA taxonomy. Structural, not analogical — LOA levels map directly to operational modes.",
			"Sheridan & Verplank (1978); Parasuraman, Sheridan, & Wickens (2000)", "neutral"},
		{"behavioral-tendencies", "behavioral tendencies",
			"O/C/E/A/S computed from trailing behavioral window: openness (Gf ratio + domain diversity), conscientiousness (trigger pass rate), extraversion (outbound ratio + peer count), agreeableness (inverse T3 rejection), stability (inverse error rate). Design targets + drift.",
			"Operational analog of Big Five (Costa & McCrae, 1992). Derived from behavioral observation, not self-report. Agreeableness miscalibration (Session 92) validated this approach.",
			"Costa & McCrae (1992); Goldberg (1990)", "neutral"},
		{"activation", "activation",
			"Self-oscillation model: 7 weighted signals (new_commits, unprocessed, gate_timeout, peer_stale, escalation, scheduled, budget_spend) → composite activation vs threshold → fire/inhibit.",
			"Operational model inspired by locus coeruleus tonic/phasic firing modes (Aston-Jones & Cohen, 2005) and self-oscillation theory (Pikovsky et al., 2001).",
			"Pikovsky et al. (2001); Aston-Jones & Cohen (2005)", "neutral"},
		{"generator-balance", "generator balance",
			"G2/G3 ratio: creative (Gf deliberations) vs evaluative (trigger activations). G6/G7 ratio: crystallization (Gc promotions + lessons) vs dissolution (relevance decay). Both should remain balanced per EF-1 conservation laws.",
			"Project-specific construct from EF-1 governance model (Session 84). Two coupled generators must both persist — never crystallize everything (Laozi, ch. 76).",
			"Project-specific (EF-1, Session 84)", "neutral"},
	}

	var concepts []Concept
	for _, c := range constructs {
		id := "vocab:" + c.id
		if seen[id] {
			continue
		}
		seen[id] = true

		concept := Concept{
			ID:        id,
			Type:      "skos:Concept",
			PrefLabel: c.label,
			InScheme:  schemeID,
			Source:     "operational-state",
			Broader:   "vocab:operational-state-constructs",
			DeltaPolarity: c.polarity,
			Definitions: []Definition{
				{Value: c.devDef, Audience: "developer"},
				{Value: c.resDef, Audience: "researcher", Citation: c.resSource},
			},
		}
		concepts = append(concepts, concept)
	}

	return concepts
}

// toConceptID converts a term to a kebab-case vocab: URI.
func toConceptID(term string) string {
	t := strings.ToLower(strings.TrimSpace(term))
	t = strings.ReplaceAll(t, " ", "-")
	t = strings.ReplaceAll(t, "_", "-")
	t = strings.ReplaceAll(t, "/", "-")
	t = strings.ReplaceAll(t, "(", "")
	t = strings.ReplaceAll(t, ")", "")
	t = strings.ReplaceAll(t, ",", "")
	t = strings.ReplaceAll(t, ".", "")
	t = strings.ReplaceAll(t, "'", "")
	t = strings.ReplaceAll(t, "\"", "")
	// Collapse multiple hyphens
	for strings.Contains(t, "--") {
		t = strings.ReplaceAll(t, "--", "-")
	}
	t = strings.Trim(t, "-")
	return "vocab:" + t
}

// acronymExpansion attempts to extract the expansion from a description.
// Falls back to the acronym itself if no expansion found.
func acronymExpansion(desc, acronym string) string {
	// Many descriptions start with the expansion
	desc = strings.TrimSpace(desc)
	if len(desc) > 0 {
		// Take first sentence or up to 80 chars
		end := strings.IndexAny(desc, ".;—")
		if end > 0 && end < 80 {
			return strings.TrimSpace(desc[:end])
		}
		if len(desc) <= 80 {
			return desc
		}
		return desc[:80]
	}
	return strings.ToLower(acronym)
}

// joinNonEmpty joins non-empty strings with "; ".
func joinNonEmpty(parts ...string) string {
	var nonEmpty []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			nonEmpty = append(nonEmpty, p)
		}
	}
	return strings.Join(nonEmpty, "; ")
}

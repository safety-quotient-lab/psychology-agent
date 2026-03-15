package handlers

import (
	"encoding/json"
	"fmt"
	"html/template"
	"math"
	"strings"
	"time"
)

// TemplateFuncs returns the template function map used across all templates.
func TemplateFuncs() template.FuncMap {
	return template.FuncMap{
		// Map access
		"get":      getAny,
		"getMap":   getMap,
		"getStr":   getStr,
		"getInt":   getIntFromMap,
		"getFloat": getFloatFromMap,
		"getBool":  getBoolFromMap,

		// Math/formatting
		"budgetPct":   budgetPct,
		"budgetColor": budgetColor,
		"confClass":   confClass,
		"barPct":      barPct,
		"sub":         func(a, b int) int { return a - b },
		"add":         func(a, b int) int { return a + b },
		"floatFmt":    func(f float64, prec int) string { return fmt.Sprintf("%.*f", prec, f) },
		"jsonMarshal": jsonMarshal,

		// String
		"truncate":  truncate,
		"contains":  strings.Contains,
		"hasPrefix": strings.HasPrefix,
		"lower":     strings.ToLower,
		"split":     strings.Split,
		"join":      strings.Join,
		"trimSpace": strings.TrimSpace,

		// Status logic
		"dotClass":     dotClass,
		"tierClass":    tierClass,
		"tierLabel":    tierLabel,
		"peerAge":      peerAge,
		"sessionClass": sessionClass,
		"sessionIcon":  sessionIcon,
		"sessionLabel": sessionLabel,
		"typeClass":    typeClass,
		"procClass":    procClass,
		"timeLeft":     timeLeft,
		"sourceClass":  sourceClass,

		// Filters
		"activeVocab":   activeVocab,
		"inactiveVocab": inactiveVocab,
		"maxCount":      maxCount,
		"vocabCode":     vocabCode,

		// Safe HTML
		"safeHTML": func(s string) template.HTML { return template.HTML(s) },
	}
}

func getAny(m map[string]any, key string) any {
	if m == nil {
		return nil
	}
	return m[key]
}

// getMap extracts a nested map from a parent map. Returns nil if missing or wrong type.
func getMap(m map[string]any, key string) map[string]any {
	if m == nil {
		return nil
	}
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}
	if sub, ok := v.(map[string]any); ok {
		return sub
	}
	return nil
}

func getStr(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	s, ok := v.(string)
	if ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

func getIntFromMap(m map[string]any, key string) int {
	if m == nil {
		return 0
	}
	v := m[key]
	if v == nil {
		return 0
	}
	switch n := v.(type) {
	case int64:
		return int(n)
	case float64:
		return int(n)
	case int:
		return n
	default:
		return 0
	}
}

func getFloatFromMap(m map[string]any, key string) float64 {
	if m == nil {
		return 0
	}
	v := m[key]
	if v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int64:
		return float64(n)
	default:
		return 0
	}
}

func getBoolFromMap(m map[string]any, key string) bool {
	if m == nil {
		return false
	}
	v := m[key]
	if v == nil {
		return false
	}
	switch b := v.(type) {
	case bool:
		return b
	case int64:
		return b != 0
	case float64:
		return b != 0
	default:
		return false
	}
}

func budgetPct(m map[string]any) int {
	spent := getFloatFromMap(m, "budget_spent")
	cutoff := getFloatFromMap(m, "budget_cutoff")
	if cutoff <= 0 {
		return 100 // unlimited
	}
	ratio := 1.0 - (spent / cutoff)
	if ratio < 0 {
		return 0
	}
	return int(ratio * 100)
}

func budgetColor(m map[string]any) string {
	pct := budgetPct(m)
	if pct > 60 {
		return "#4caf50"
	}
	if pct > 30 {
		return "#ff9800"
	}
	return "#f44336"
}

func confClass(avg float64) string {
	if avg < 0.05 {
		return "conf-low"
	}
	if avg < 0.12 {
		return "conf-mid"
	}
	return "conf-high"
}

func barPct(count, maxVal int) int {
	if maxVal <= 0 {
		return 0
	}
	return int(float64(count) / float64(maxVal) * 100)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

func dotClass(line string) string {
	prefix := line
	if len(prefix) > 30 {
		prefix = prefix[:30]
	}
	if strings.HasPrefix(strings.TrimSpace(prefix), "✓") || strings.Contains(prefix, "✓") {
		return "dot-green"
	}
	if strings.Contains(prefix, "⚑") {
		return "dot-yellow"
	}
	return "dot-gray"
}

func tierClass(lastSeen string) string {
	hours := hoursAgo(lastSeen)
	if hours < 0 {
		return "tier-cold"
	}
	if hours < 1 {
		return "tier-active"
	}
	if hours < 24 {
		return "tier-warm"
	}
	return "tier-cold"
}

func tierLabel(lastSeen string) string {
	hours := hoursAgo(lastSeen)
	if hours < 0 {
		return "?"
	}
	if hours < 1 {
		return "ACTIVE"
	}
	if hours < 24 {
		return "warm"
	}
	return "cold"
}

func peerAge(lastSeen string) string {
	hours := hoursAgo(lastSeen)
	if hours < 0 {
		return lastSeen
	}
	return fmt.Sprintf("%.1fh ago", hours)
}

func hoursAgo(isoTime string) float64 {
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, isoTime); err == nil {
			return time.Since(t).Hours()
		}
	}
	return -1
}

func sessionClass(unprocessed int, hasGate bool) string {
	if unprocessed > 0 {
		return "session-active"
	}
	if hasGate {
		return "session-gated"
	}
	return "session-complete"
}

func sessionIcon(unprocessed int, hasGate bool) template.HTML {
	if unprocessed > 0 {
		return "&#x25CF;" // filled circle
	}
	if hasGate {
		return "&#x29D6;" // hourglass
	}
	return "&#x2713;" // checkmark
}

func sessionLabel(unprocessed int, hasGate bool) string {
	if unprocessed > 0 {
		return fmt.Sprintf("%d unprocessed", unprocessed)
	}
	if hasGate {
		return "gated"
	}
	return "complete"
}

func typeClass(msgType string) string {
	known := map[string]bool{
		"request": true, "response": true, "review": true, "ack": true,
		"notification": true, "consensus-proposal": true, "session-close": true,
		"advisory": true, "gate-resolution": true,
	}
	if known[msgType] {
		return "type-" + msgType
	}
	return "type-default"
}

func procClass(processed any) string {
	switch v := processed.(type) {
	case bool:
		if v {
			return "msg-processed"
		}
	case int64:
		if v != 0 {
			return "msg-processed"
		}
	case float64:
		if v != 0 {
			return "msg-processed"
		}
	}
	return "msg-pending"
}

func timeLeft(timeoutAt string) string {
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
	}
	for _, layout := range layouts {
		t, err := time.Parse(layout, timeoutAt)
		if err != nil {
			continue
		}
		remaining := time.Until(t)
		hours := remaining.Hours()
		if hours <= 0 {
			return "EXPIRED"
		}
		if hours >= 1 {
			return fmt.Sprintf("%.1fh left", hours)
		}
		return fmt.Sprintf("%dm left", int(math.Ceil(remaining.Minutes())))
	}
	return "?"
}

func sourceClass(source string) string {
	switch source {
	case "PSH":
		return "source-psh"
	case "project-local":
		return "source-local"
	default:
		return "source-schema"
	}
}

func activeVocab(vocab []map[string]any) []map[string]any {
	var result []map[string]any
	for _, v := range vocab {
		if getBoolFromMap(v, "active") {
			result = append(result, v)
		}
	}
	return result
}

func inactiveVocab(vocab []map[string]any) []map[string]any {
	var result []map[string]any
	for _, v := range vocab {
		if !getBoolFromMap(v, "active") && getStr(v, "facet_type") == "psh" {
			result = append(result, v)
		}
	}
	return result
}

func maxCount(dist []map[string]any) int {
	max := 1
	for _, d := range dist {
		if c := getIntFromMap(d, "entity_count"); c > max {
			max = c
		}
	}
	return max
}

func vocabCode(vocab []map[string]any, category, facetType string) string {
	for _, v := range vocab {
		if getStr(v, "facet_value") == category && getStr(v, "facet_type") == facetType {
			return getStr(v, "code")
		}
	}
	return ""
}

func jsonMarshal(v any) template.JS {
	data, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return template.JS(data)
}

// Package transport — cross-repo fetch functionality.
// Absorbs scripts/cross_repo_fetch.py.
package transport

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	coldThresholdHours = 24
)

// AgentConfig represents a cross-repo-fetch agent from agent-registry.json.
type AgentConfig struct {
	Transport      string   `json:"transport"`
	RemoteName     string   `json:"remote_name"`
	MessagePrefix  string   `json:"message_prefix"`
	ManifestPath   string   `json:"manifest_path"`
	SessionsPath   string   `json:"sessions_path"`
	ActiveSessions []string `json:"active_sessions"`
}

// Registry represents the agent registry.
type Registry struct {
	Agents map[string]AgentConfig `json:"agents"`
}

// FetchResult holds scan results for one agent.
type FetchResult struct {
	AgentID          string           `json:"agent_id"`
	RemoteName       string           `json:"remote_name,omitempty"`
	ActivityTier     string           `json:"activity_tier"`
	FetchOK          bool             `json:"fetch_ok"`
	ManifestFound    bool             `json:"manifest_found"`
	SessionsScanned  []SessionResult  `json:"sessions_scanned"`
	NewMessages      []MessageSummary `json:"new_messages"`
	Errors           []string         `json:"errors"`
	Skipped          bool             `json:"skipped,omitempty"`
	SkipReason       string           `json:"skip_reason,omitempty"`
	PromotedFromCold bool             `json:"promoted_from_cold,omitempty"`
}

// SessionResult holds scan results for one session.
type SessionResult struct {
	SessionName  string   `json:"session_name"`
	TotalFiles   int      `json:"total_files"`
	InboundFiles int      `json:"inbound_files"`
	NewFiles     int      `json:"new_files"`
	NewFilenames []string `json:"new_filenames"`
}

// MessageSummary holds a summary of a new message.
type MessageSummary struct {
	Filename       string `json:"filename"`
	Session        string `json:"session"`
	Turn           int    `json:"turn"`
	MessageType    string `json:"message_type"`
	Timestamp      string `json:"timestamp"`
	Subject        string `json:"subject"`
	MaterializedAs string `json:"materialized_as,omitempty"`
}

// LoadRegistry loads agent-registry.json with optional local overrides.
func LoadRegistry(projectRoot string) (*Registry, error) {
	regPath := filepath.Join(projectRoot, "transport", "agent-registry.json")
	data, err := os.ReadFile(regPath)
	if err != nil {
		return nil, fmt.Errorf("read registry: %w", err)
	}
	var reg Registry
	if err := json.Unmarshal(data, &reg); err != nil {
		return nil, fmt.Errorf("parse registry: %w", err)
	}

	// Merge local overrides
	localPath := filepath.Join(projectRoot, "transport", "agent-registry.local.json")
	if localData, err := os.ReadFile(localPath); err == nil {
		var localReg Registry
		if json.Unmarshal(localData, &localReg) == nil {
			for k, v := range localReg.Agents {
				if existing, ok := reg.Agents[k]; ok {
					if v.RemoteName != "" {
						existing.RemoteName = v.RemoteName
					}
					if v.MessagePrefix != "" {
						existing.MessagePrefix = v.MessagePrefix
					}
					if v.ManifestPath != "" {
						existing.ManifestPath = v.ManifestPath
					}
					if v.SessionsPath != "" {
						existing.SessionsPath = v.SessionsPath
					}
					if len(v.ActiveSessions) > 0 {
						existing.ActiveSessions = v.ActiveSessions
					}
					reg.Agents[k] = existing
				} else {
					reg.Agents[k] = v
				}
			}
		}
	}

	return &reg, nil
}

// GetMyAgentID reads this agent's ID from .agent-identity.json.
func GetMyAgentID(projectRoot string) string {
	identityFile := filepath.Join(projectRoot, ".agent-identity.json")
	data, err := os.ReadFile(identityFile)
	if err != nil {
		return "psychology-agent"
	}
	var identity struct {
		AgentID string `json:"agent_id"`
	}
	if json.Unmarshal(data, &identity) == nil && identity.AgentID != "" {
		return identity.AgentID
	}
	return "psychology-agent"
}

// GetRepoAgentID derives the canonical agent ID from agent-card.
func GetRepoAgentID(projectRoot string) string {
	cardPath := filepath.Join(projectRoot, ".well-known", "agent-card.json")
	data, err := os.ReadFile(cardPath)
	if err != nil {
		return filepath.Base(projectRoot)
	}
	var card struct {
		AgentID string `json:"agent_id"`
	}
	if json.Unmarshal(data, &card) == nil && card.AgentID != "" {
		return card.AgentID
	}
	return filepath.Base(projectRoot)
}

func runGit(projectRoot string, args ...string) (int, string) {
	cmd := exec.Command("git", args...)
	cmd.Dir = projectRoot
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return exitErr.ExitCode(), string(out)
		}
		return 1, ""
	}
	return 0, strings.TrimSpace(string(out))
}

func fetchRemote(projectRoot, remoteName string) bool {
	code, _ := runGit(projectRoot, "fetch", remoteName, "main")
	return code == 0
}

func readRemoteFile(projectRoot, remoteName, path string) (string, bool) {
	code, content := runGit(projectRoot, "show", fmt.Sprintf("%s/main:%s", remoteName, path))
	if code != 0 {
		return "", false
	}
	return content, true
}

func listRemoteDir(projectRoot, remoteName, path string) []string {
	code, output := runGit(projectRoot, "show", fmt.Sprintf("%s/main:%s/", remoteName, path))
	if code != 0 {
		return nil
	}
	var files []string
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		line = strings.TrimSuffix(line, "/")
		if line != "" && !strings.HasPrefix(line, "tree ") {
			files = append(files, line)
		}
	}
	return files
}

// ClassifyPeerActivity classifies a peer as active, warm, or cold.
func ClassifyPeerActivity(db *sql.DB, agentID string, config AgentConfig) string {
	if db == nil {
		return "active"
	}

	patterns := []string{agentID}
	if config.MessagePrefix != "" && strings.HasPrefix(config.MessagePrefix, "from-") {
		extracted := strings.TrimPrefix(config.MessagePrefix, "from-")
		extracted = strings.TrimRight(extracted, "-")
		if extracted != "" && extracted != agentID {
			patterns = append(patterns, extracted)
		}
	}

	// Check unprocessed messages
	for _, p := range patterns {
		var count int
		err := db.QueryRow(
			"SELECT COUNT(*) FROM transport_messages WHERE from_agent = ? AND processed = FALSE", p,
		).Scan(&count)
		if err == nil && count > 0 {
			return "active"
		}
	}

	// Check pending handoffs
	for _, p := range patterns {
		var count int
		_ = db.QueryRow(
			"SELECT COUNT(*) FROM pending_handoffs WHERE status = 'waiting' AND (sending_agent = ? OR receiving_agent = ?)",
			p, p,
		).Scan(&count)
		if count > 0 {
			return "active"
		}
	}

	// Check recency
	var whereParts []string
	var params []any
	for _, p := range patterns {
		whereParts = append(whereParts, "from_agent = ? OR to_agent = ?")
		params = append(params, p, p)
	}
	var lastTS sql.NullString
	_ = db.QueryRow(
		fmt.Sprintf("SELECT MAX(timestamp) FROM transport_messages WHERE %s",
			strings.Join(whereParts, " OR ")),
		params...,
	).Scan(&lastTS)

	if !lastTS.Valid {
		return "cold"
	}

	lastDT, err := time.Parse(time.RFC3339, lastTS.String)
	if err != nil {
		// Try without timezone
		lastDT, err = time.Parse("2006-01-02T15:04:05", lastTS.String)
		if err != nil {
			return "warm"
		}
	}

	if time.Since(lastDT) < coldThresholdHours*time.Hour {
		return "warm"
	}
	return "cold"
}

// ScanAgent scans a cross-repo-fetch agent for new messages.
func ScanAgent(sharedDB *sql.DB, projectRoot string,
	agentID string, config AgentConfig,
	doIndex, doMaterialize, force bool) FetchResult {

	result := FetchResult{
		AgentID:    agentID,
		RemoteName: config.RemoteName,
	}

	if config.RemoteName == "" {
		result.Errors = append(result.Errors, "no remote_name configured")
		return result
	}

	result.ActivityTier = ClassifyPeerActivity(sharedDB, agentID, config)

	if result.ActivityTier == "cold" && !force {
		result.Skipped = true
		result.SkipReason = fmt.Sprintf("cold peer — no exchange within %dh", coldThresholdHours)
		return result
	}

	if !fetchRemote(projectRoot, config.RemoteName) {
		result.Errors = append(result.Errors, fmt.Sprintf("git fetch %s failed", config.RemoteName))
		return result
	}
	result.FetchOK = true

	// Read MANIFEST
	manifestPath := config.ManifestPath
	if manifestPath == "" {
		manifestPath = "transport/MANIFEST.json"
	}
	if _, ok := readRemoteFile(projectRoot, config.RemoteName, manifestPath); ok {
		result.ManifestFound = true
	}

	// Scan sessions
	sessionsPath := config.SessionsPath
	if sessionsPath == "" {
		sessionsPath = "transport/sessions/"
	}
	remoteSessions := listRemoteDir(projectRoot, config.RemoteName, strings.TrimSuffix(sessionsPath, "/"))
	allSessions := make(map[string]bool)
	for _, s := range config.ActiveSessions {
		allSessions[s] = true
	}
	for _, s := range remoteSessions {
		allSessions[s] = true
	}

	sortedSessions := make([]string, 0, len(allSessions))
	for s := range allSessions {
		sortedSessions = append(sortedSessions, s)
	}
	sort.Strings(sortedSessions)

	myID := GetMyAgentID(projectRoot)
	repoID := GetRepoAgentID(projectRoot)

	convBPattern := regexp.MustCompile(`^(to|from)-[\w-]+-\d+\.json$`)

	for _, sessionName := range sortedSessions {
		sessionPath := strings.TrimSuffix(sessionsPath, "/") + "/" + sessionName
		files := listRemoteDir(projectRoot, config.RemoteName, sessionPath)
		if len(files) == 0 {
			continue
		}

		// Filter to inbound messages
		inboundPrefixes := map[string]bool{
			fmt.Sprintf("to-%s-", myID):      true,
			fmt.Sprintf("from-%s-", agentID): true,
		}
		if repoID != myID {
			inboundPrefixes[fmt.Sprintf("to-%s-", repoID)] = true
		}

		var inboundFiles []string
		for _, f := range files {
			if config.MessagePrefix != "" && strings.HasPrefix(f, config.MessagePrefix) {
				inboundFiles = append(inboundFiles, f)
				continue
			}
			for prefix := range inboundPrefixes {
				if strings.HasPrefix(f, prefix) {
					inboundFiles = append(inboundFiles, f)
					break
				}
			}
		}

		// Compare against indexed filenames
		indexed, _ := GetIndexedFilenames(sharedDB, sessionName)
		var newFiles []string
		for _, f := range inboundFiles {
			if !indexed[f] {
				newFiles = append(newFiles, f)
			}
		}

		sr := SessionResult{
			SessionName:  sessionName,
			TotalFiles:   len(files),
			InboundFiles: len(inboundFiles),
			NewFiles:     len(newFiles),
			NewFilenames: newFiles,
		}
		result.SessionsScanned = append(result.SessionsScanned, sr)

		for _, filename := range newFiles {
			filePath := sessionPath + "/" + filename
			content, ok := readRemoteFile(projectRoot, config.RemoteName, filePath)
			if !ok {
				continue
			}

			var msg map[string]any
			if err := json.Unmarshal([]byte(content), &msg); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("parse error: %s", filename))
				continue
			}

			summary := MessageSummary{
				Filename:    filename,
				Session:     sessionName,
				Turn:        intFromAny(msg["turn"]),
				MessageType: strFromAny(msg["message_type"]),
				Timestamp:   strFromAny(msg["timestamp"]),
				Subject:     extractSubject(msg),
			}

			if doMaterialize || doIndex {
				localName := materializeMessage(projectRoot, msg, content, filename, sessionName, convBPattern)
				if localName != "" {
					summary.MaterializedAs = localName
				}
			}

			result.NewMessages = append(result.NewMessages, summary)

			if doIndex && sharedDB != nil {
				idxFilename := summary.MaterializedAs
				if idxFilename == "" {
					idxFilename = filename
				}
				indexFetchedMessage(sharedDB, projectRoot, msg, idxFilename, sessionName)
			}
		}
	}

	return result
}

// Inbox runs the full inbox scan across all cross-repo-fetch agents.
func Inbox(sharedDB *sql.DB, projectRoot string,
	targetAgent string, doIndex, doMaterialize, force bool) ([]FetchResult, error) {

	reg, err := LoadRegistry(projectRoot)
	if err != nil {
		return nil, err
	}

	var results []FetchResult
	for agentID, config := range reg.Agents {
		if config.Transport != "cross-repo-fetch" {
			continue
		}
		if targetAgent != "" && agentID != targetAgent {
			continue
		}
		result := ScanAgent(sharedDB, projectRoot, agentID, config, doIndex, doMaterialize, force)
		results = append(results, result)
	}

	return results, nil
}

func materializeMessage(projectRoot string, msg map[string]any, rawContent, remoteFilename, sessionName string, convB *regexp.Regexp) string {
	sessionDir := filepath.Join(projectRoot, "transport", "sessions", sessionName)
	os.MkdirAll(sessionDir, 0755)

	localPath := filepath.Join(sessionDir, remoteFilename)
	if fileExists(localPath) {
		return ""
	}

	// Check for content duplicates
	sender := extractSender(msg)
	turn := intFromAny(msg["turn"])
	entries, _ := os.ReadDir(sessionDir)
	for _, e := range entries {
		if e.Name() == "MANIFEST.json" || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(sessionDir, e.Name()))
		if err != nil {
			continue
		}
		var existing map[string]any
		if json.Unmarshal(data, &existing) != nil {
			continue
		}
		if intFromAny(existing["turn"]) == turn && extractSender(existing) == sender {
			return "" // Already materialized under different name
		}
	}

	// Determine local filename
	localFilename := remoteFilename
	if !convB.MatchString(remoteFilename) {
		prefix := fmt.Sprintf("from-%s-", sender)
		maxSeq := 0
		for _, e := range entries {
			if strings.HasPrefix(e.Name(), prefix) {
				stem := strings.TrimSuffix(e.Name(), ".json")
				seqPart := stem[len(prefix):]
				var seq int
				fmt.Sscanf(seqPart, "%d", &seq)
				if seq > maxSeq {
					maxSeq = seq
				}
			}
		}
		localFilename = fmt.Sprintf("%s%03d.json", prefix, maxSeq+1)
	}

	if err := os.WriteFile(filepath.Join(sessionDir, localFilename), []byte(rawContent), 0644); err != nil {
		return ""
	}

	return localFilename
}

func indexFetchedMessage(db *sql.DB, projectRoot string, msg map[string]any, filename, sessionName string) {
	fromAgent := extractSender(msg)
	toAgent := "unknown"
	if to, ok := msg["to"]; ok {
		switch v := to.(type) {
		case map[string]any:
			toAgent = strFromAny(v["agent_id"])
		case []any:
			if len(v) > 0 {
				if m, ok := v[0].(map[string]any); ok {
					toAgent = strFromAny(m["agent_id"])
				}
			}
		}
	}

	claims := 0
	if c, ok := msg["claims"].([]any); ok {
		claims = len(c)
	}

	IndexMessage(db, projectRoot, IndexMessageParams{
		Session:     sessionName,
		Filename:    filename,
		Turn:        intFromAny(msg["turn"]),
		MessageType: strFromAny(msg["message_type"]),
		FromAgent:   fromAgent,
		ToAgent:     toAgent,
		Timestamp:   strFromAny(msg["timestamp"]),
		Subject:     extractSubject(msg),
		ClaimsCount: claims,
		SETL:        floatFromAny(msg["setl"]),
		Urgency:     strFromAny(msg["urgency"]),
		TaskState:   "pending",
	})
}

func extractSender(msg map[string]any) string {
	from, ok := msg["from"]
	if !ok {
		return "unknown"
	}
	switch v := from.(type) {
	case map[string]any:
		return strFromAny(v["agent_id"])
	case string:
		return v
	}
	return "unknown"
}

func extractSubject(msg map[string]any) string {
	for _, key := range []string{"payload", "content"} {
		if p, ok := msg[key].(map[string]any); ok {
			if s, ok := p["subject"].(string); ok {
				return s
			}
		}
	}
	return ""
}

func strFromAny(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func intFromAny(v any) int {
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	}
	return 0
}

func floatFromAny(v any) float64 {
	if f, ok := v.(float64); ok {
		return f
	}
	return 0
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

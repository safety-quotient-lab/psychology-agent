// Package crossrepo fetches transport messages from peer agent repositories
// via git. Replaces cross_repo_fetch.py with native Go using the git adapter.
//
// Flow: load registry → classify peers (active/warm/cold) → fetch per-peer
// → discover sessions → find inbound messages → materialize + index.
package crossrepo

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Config holds crossrepo fetch parameters.
type Config struct {
	ProjectRoot string
	AgentID     string
}

// PeerClassification describes how active a peer relationship runs.
type PeerClassification string

const (
	PeerActive PeerClassification = "active" // unprocessed messages or recent exchange
	PeerWarm   PeerClassification = "warm"   // exchange within 24h
	PeerCold   PeerClassification = "cold"   // no recent exchange
)

// PeerConfig holds registry data for one peer agent.
type PeerConfig struct {
	AgentID    string
	RemoteName string
	RepoURL    string
	Transport  string // "cross-repo-fetch" or "zmq"
	Autonomous bool
}

// FetchResult reports what the fetch found.
type FetchResult struct {
	Peer           string
	Classification PeerClassification
	NewMessages    int
	Materialized   int
	Indexed        int
	Error          error
}

// Fetch runs cross-repo fetch for all peers in the registry.
func Fetch(config Config, database *db.DB) []FetchResult {
	peers := loadPeers(config)
	if len(peers) == 0 {
		log.Printf("[crossrepo] no cross-repo-fetch peers in registry")
		return nil
	}

	var results []FetchResult
	for _, peer := range peers {
		classification := classifyPeer(database, peer.AgentID)

		// Skip cold peers unless they have unprocessed messages
		if classification == PeerCold {
			log.Printf("[crossrepo] skip cold peer %s", peer.AgentID)
			results = append(results, FetchResult{
				Peer: peer.AgentID, Classification: PeerCold,
			})
			continue
		}

		result := fetchPeer(config, database, peer)
		result.Classification = classification
		results = append(results, result)
	}

	return results
}

// loadPeers reads the agent registry for cross-repo-fetch peers.
func loadPeers(config Config) []PeerConfig {
	registryPath := filepath.Join(config.ProjectRoot, "transport", "agent-registry.json")
	data, err := os.ReadFile(registryPath)
	if err != nil {
		log.Printf("[crossrepo] registry not found: %v", err)
		return nil
	}

	var registry map[string]any
	if err := json.Unmarshal(data, &registry); err != nil {
		log.Printf("[crossrepo] registry parse error: %v", err)
		return nil
	}

	agents, ok := registry["agents"].(map[string]any)
	if !ok {
		return nil
	}

	var peers []PeerConfig
	for agentID, info := range agents {
		if agentID == config.AgentID {
			continue // skip self
		}
		agentInfo, ok := info.(map[string]any)
		if !ok {
			continue
		}
		transport, _ := agentInfo["transport"].(string)
		if transport != "cross-repo-fetch" {
			continue
		}
		remoteName, _ := agentInfo["remote_name"].(string)
		if remoteName == "" {
			remoteName = agentID
		}

		peers = append(peers, PeerConfig{
			AgentID:    agentID,
			RemoteName: remoteName,
			Transport:  transport,
		})
	}

	return peers
}

// classifyPeer determines whether a peer relationship runs active/warm/cold.
func classifyPeer(database *db.DB, peerAgentID string) PeerClassification {
	// Check for unprocessed messages from this peer
	unprocessed := database.ScalarInt(
		`SELECT COUNT(*) FROM transport_messages
		 WHERE from_agent = ? AND processed = FALSE`, peerAgentID)
	if unprocessed > 0 {
		return PeerActive
	}

	// Check recency of last exchange
	rows, err := database.QueryRows(
		`SELECT MAX(timestamp) as latest FROM transport_messages
		 WHERE from_agent = ? OR to_agent = ?`, peerAgentID, peerAgentID)
	if err != nil || len(rows) == 0 {
		return PeerCold
	}

	latest := toString(rows[0]["latest"])
	if latest == "" {
		return PeerCold
	}

	t, err := time.Parse("2006-01-02T15:04:05-07:00", latest)
	if err != nil {
		t, err = time.Parse("2006-01-02T15:04:05", latest)
		if err != nil {
			return PeerCold
		}
	}

	age := time.Since(t)
	if age < time.Hour {
		return PeerActive
	}
	if age < 24*time.Hour {
		return PeerWarm
	}
	return PeerCold
}

// fetchPeer fetches new messages from a single peer.
func fetchPeer(config Config, database *db.DB, peer PeerConfig) FetchResult {
	result := FetchResult{Peer: peer.AgentID}

	// Git fetch (lightweight)
	cmd := exec.Command("git", "fetch", peer.RemoteName, "main", "--quiet")
	cmd.Dir = config.ProjectRoot
	if err := cmd.Run(); err != nil {
		result.Error = fmt.Errorf("git fetch %s: %w", peer.RemoteName, err)
		log.Printf("[crossrepo] %v", result.Error)
		return result
	}

	// List transport sessions on the remote
	sessions := listRemoteSessions(config.ProjectRoot, peer.RemoteName)

	for _, session := range sessions {
		// List files in this session
		files := listRemoteSessionFiles(config.ProjectRoot, peer.RemoteName, session)

		for _, file := range files {
			// Only fetch messages addressed to us or from the peer
			if !isRelevantFile(file, config.AgentID, peer.AgentID) {
				continue
			}

			// Check if already indexed
			indexed := database.ScalarInt(
				`SELECT COUNT(*) FROM transport_messages
				 WHERE session_name = ? AND filename = ?`, session, file)
			if indexed > 0 {
				continue // already have it
			}

			result.NewMessages++

			// Materialize: copy from remote to local
			content, err := gitShow(config.ProjectRoot, peer.RemoteName, session, file)
			if err != nil {
				log.Printf("[crossrepo] git show failed for %s/%s: %v", session, file, err)
				continue
			}

			localDir := filepath.Join(config.ProjectRoot, "transport", "sessions", session)
			os.MkdirAll(localDir, 0755)
			localPath := filepath.Join(localDir, file)

			if err := os.WriteFile(localPath, content, 0644); err != nil {
				log.Printf("[crossrepo] write failed %s: %v", localPath, err)
				continue
			}
			result.Materialized++

			// Index in state.db
			if err := indexMessage(database, session, file, content); err != nil {
				log.Printf("[crossrepo] index failed %s/%s: %v", session, file, err)
				continue
			}
			result.Indexed++
		}
	}

	if result.NewMessages > 0 {
		log.Printf("[crossrepo] %s: %d new, %d materialized, %d indexed",
			peer.AgentID, result.NewMessages, result.Materialized, result.Indexed)
	}

	return result
}

// listRemoteSessions returns transport session directory names on the remote.
func listRemoteSessions(projectRoot, remote string) []string {
	cmd := exec.Command("git", "ls-tree", "--name-only",
		remote+"/main", "transport/sessions/")
	cmd.Dir = projectRoot
	output, err := cmd.Output()
	if err != nil {
		return nil
	}

	var sessions []string
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		name := filepath.Base(line)
		if name != "" && name != "local-coordination" {
			sessions = append(sessions, name)
		}
	}
	return sessions
}

// listRemoteSessionFiles returns files within a remote session directory.
func listRemoteSessionFiles(projectRoot, remote, session string) []string {
	path := fmt.Sprintf("transport/sessions/%s/", session)
	cmd := exec.Command("git", "ls-tree", "--name-only",
		remote+"/main", path)
	cmd.Dir = projectRoot
	output, err := cmd.Output()
	if err != nil {
		return nil
	}

	var files []string
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		name := filepath.Base(line)
		if strings.HasSuffix(name, ".json") && name != "MANIFEST.json" {
			files = append(files, name)
		}
	}
	return files
}

// isRelevantFile checks whether a transport file is relevant to us.
func isRelevantFile(filename, myAgentID, peerAgentID string) bool {
	// Messages FROM the peer (from-{peer}-NNN.json)
	if strings.HasPrefix(filename, "from-"+peerAgentID) {
		return true
	}
	// Messages addressed TO us (to-{us}-NNN.json)
	if strings.HasPrefix(filename, "to-"+myAgentID) {
		return true
	}
	return false
}

// gitShow reads a file from the remote via git show.
func gitShow(projectRoot, remote, session, file string) ([]byte, error) {
	ref := fmt.Sprintf("%s/main:transport/sessions/%s/%s", remote, session, file)
	cmd := exec.Command("git", "show", ref)
	cmd.Dir = projectRoot
	return cmd.Output()
}

// indexMessage parses a transport JSON file and inserts into state.db.
func indexMessage(database *db.DB, session, filename string, content []byte) error {
	var msg map[string]any
	if err := json.Unmarshal(content, &msg); err != nil {
		return fmt.Errorf("parse message: %w", err)
	}

	fromAgent := ""
	if from, ok := msg["from"].(map[string]any); ok {
		fromAgent, _ = from["agent_id"].(string)
	}
	toAgent := ""
	if to, ok := msg["to"].(map[string]any); ok {
		toAgent, _ = to["agent_id"].(string)
	}

	turn := 0
	if t, ok := msg["turn"].(float64); ok {
		turn = int(t)
	}

	timestamp, _ := msg["timestamp"].(string)
	msgType, _ := msg["message_type"].(string)
	subject := ""
	if content, ok := msg["content"].(map[string]any); ok {
		subject, _ = content["subject"].(string)
	}
	urgency, _ := msg["urgency"].(string)
	if urgency == "" {
		urgency = "normal"
	}

	_, err := database.Exec(
		`INSERT OR IGNORE INTO transport_messages
		 (session_name, filename, turn, message_type, from_agent, to_agent,
		  timestamp, subject, urgency, processed)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
		session, filename, turn, msgType, fromAgent, toAgent,
		timestamp, subject, urgency)
	return err
}

func toString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

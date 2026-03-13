// Package transport — fetcher.go provides cross-repo message discovery.
// It polls peer agent repos via the GitHub API for transport messages
// addressed to this agent, and pulls them into the local transport directory.
//
// This solves the "stuck messages" problem: when a peer commits a message
// to their own repo but lacks the mechanism to create a PR on ours,
// the fetcher discovers and retrieves it.
package transport

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// PeerConfig describes a peer agent's repo for cross-repo fetching.
type PeerConfig struct {
	AgentID string // e.g., "psychology-agent"
	Repo    string // e.g., "safety-quotient-lab/psychology-agent"
}

// Fetcher polls peer repos for transport messages addressed to this agent.
type Fetcher struct {
	AgentID      string        // this agent's ID (messages addressed "to" this)
	TransportDir string        // local transport/sessions/ path
	Peers        []PeerConfig  // peer repos to poll
	PollInterval time.Duration // how often to check
	GitHubToken  string        // optional — for private repos (empty = public only)

	seen   map[string]time.Time // "repo:path" → last fetched
	mu     sync.Mutex
	logger *slog.Logger
	stopCh chan struct{}
}

// NewFetcher constructs a cross-repo fetcher.
func NewFetcher(agentID, transportDir string, peers []PeerConfig, interval time.Duration, logger *slog.Logger) *Fetcher {
	return &Fetcher{
		AgentID:      agentID,
		TransportDir: transportDir,
		Peers:        peers,
		PollInterval: interval,
		seen:         make(map[string]time.Time),
		logger:       logger,
		stopCh:       make(chan struct{}),
	}
}

// Run starts the polling loop. Blocks until Stop gets called.
func (f *Fetcher) Run() {
	ticker := time.NewTicker(f.PollInterval)
	defer ticker.Stop()

	f.logger.Info("cross-repo fetcher started",
		"agent_id", f.AgentID,
		"peers", len(f.Peers),
		"interval", f.PollInterval,
	)

	// Initial scan
	f.pollAll()

	for {
		select {
		case <-ticker.C:
			f.pollAll()
		case <-f.stopCh:
			f.logger.Info("cross-repo fetcher stopped")
			return
		}
	}
}

// Stop signals the fetcher to exit.
func (f *Fetcher) Stop() {
	close(f.stopCh)
}

// pollAll checks every peer repo for messages addressed to this agent.
func (f *Fetcher) pollAll() {
	for _, peer := range f.Peers {
		f.pollPeer(peer)
	}
}

// pollPeer uses the GitHub API to list transport session directories in a
// peer's repo, then checks each session for files matching
// "to-{agentID}*.json" or "from-{peerID}*.json" that reference this agent.
func (f *Fetcher) pollPeer(peer PeerConfig) {
	// List transport/sessions/ directory
	sessions, err := f.listGitHubDir(peer.Repo, "transport/sessions")
	if err != nil {
		f.logger.Debug("failed to list peer transport sessions",
			"peer", peer.AgentID,
			"repo", peer.Repo,
			"err", err,
		)
		return
	}

	for _, session := range sessions {
		if session.Type != "dir" {
			continue
		}
		f.checkSession(peer, session.Name)
	}
}

// checkSession looks for messages in a peer's session directory that
// target this agent (by filename pattern "to-{agentID}*" or by checking
// the "to" field in the JSON).
func (f *Fetcher) checkSession(peer PeerConfig, sessionName string) {
	dirPath := fmt.Sprintf("transport/sessions/%s", sessionName)
	files, err := f.listGitHubDir(peer.Repo, dirPath)
	if err != nil {
		return
	}

	for _, file := range files {
		if file.Type != "file" || !strings.HasSuffix(file.Name, ".json") {
			continue
		}

		// Match files addressed to us or from the peer
		toUs := strings.HasPrefix(file.Name, fmt.Sprintf("to-%s", f.AgentID))
		fromPeer := strings.HasPrefix(file.Name, fmt.Sprintf("from-%s", peer.AgentID))

		if !toUs && !fromPeer {
			continue
		}

		// Dedup check
		seenKey := fmt.Sprintf("%s:%s/%s", peer.Repo, sessionName, file.Name)
		f.mu.Lock()
		if _, found := f.seen[seenKey]; found {
			f.mu.Unlock()
			continue
		}
		f.mu.Unlock()

		// Check if we already have this file locally
		localPath := filepath.Join(f.TransportDir, sessionName, file.Name)
		if fileExistsLocal(localPath) {
			f.mu.Lock()
			f.seen[seenKey] = time.Now()
			f.mu.Unlock()
			continue
		}

		// Fetch and save
		if err := f.fetchAndSave(peer.Repo, dirPath, file.Name, sessionName); err != nil {
			f.logger.Warn("failed to fetch cross-repo message",
				"peer", peer.AgentID,
				"session", sessionName,
				"file", file.Name,
				"err", err,
			)
			continue
		}

		f.mu.Lock()
		f.seen[seenKey] = time.Now()
		f.mu.Unlock()

		f.logger.Info("cross-repo message fetched",
			"peer", peer.AgentID,
			"session", sessionName,
			"file", file.Name,
		)
	}
}

// fetchAndSave downloads a file from GitHub and writes it to the local
// transport directory.
func (f *Fetcher) fetchAndSave(repo, dirPath, fileName, sessionName string) error {
	// Path traversal guard — reject names containing path separators or ..
	if strings.Contains(sessionName, "..") || strings.Contains(fileName, "..") ||
		strings.ContainsAny(sessionName, "/\\") || strings.ContainsAny(fileName, "/\\") {
		return fmt.Errorf("rejected suspicious path component: session=%q file=%q", sessionName, fileName)
	}

	filePath := fmt.Sprintf("%s/%s", dirPath, fileName)
	content, err := f.fetchGitHubFile(repo, filePath)
	if err != nil {
		return err
	}

	// Ensure local session directory exists
	localDir := filepath.Join(f.TransportDir, sessionName)
	if err := os.MkdirAll(localDir, 0755); err != nil {
		return fmt.Errorf("failed to create session dir %s: %w", localDir, err)
	}

	localPath := filepath.Join(localDir, fileName)
	if err := os.WriteFile(localPath, content, 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w", localPath, err)
	}

	return nil
}

// ── GitHub API helpers ──────────────────────────────────────────────

type ghEntry struct {
	Name string `json:"name"`
	Type string `json:"type"` // "file" or "dir"
}

func (f *Fetcher) listGitHubDir(repo, path string) ([]ghEntry, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s", repo, path)
	body, err := f.ghGet(url)
	if err != nil {
		return nil, err
	}

	var entries []ghEntry
	if err := json.Unmarshal(body, &entries); err != nil {
		return nil, fmt.Errorf("failed to parse GitHub directory listing: %w", err)
	}
	return entries, nil
}

func (f *Fetcher) fetchGitHubFile(repo, path string) ([]byte, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s", repo, path)
	body, err := f.ghGet(url)
	if err != nil {
		return nil, err
	}

	var file struct {
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
	}
	if err := json.Unmarshal(body, &file); err != nil {
		return nil, fmt.Errorf("failed to parse GitHub file response: %w", err)
	}

	if file.Encoding != "base64" {
		return nil, fmt.Errorf("unexpected encoding: %s", file.Encoding)
	}

	// Decode base64 (GitHub wraps lines, so strip newlines first)
	cleaned := strings.ReplaceAll(file.Content, "\n", "")
	return base64Decode(cleaned)
}

func (f *Fetcher) ghGet(url string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "meshd-fetcher/1.0")
	if f.GitHubToken != "" {
		req.Header.Set("Authorization", "Bearer "+f.GitHubToken)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API returned %d for %s", resp.StatusCode, url)
	}

	return io.ReadAll(resp.Body)
}

// base64Decode handles standard base64 decoding (stdlib).
func base64Decode(s string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(s)
}

// fileExistsLocal reports whether a path refers to an existing file.
func fileExistsLocal(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

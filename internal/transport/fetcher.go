// Package transport — fetcher.go provides cross-repo message discovery.
// Uses git fetch + git show to read peer transport directories without
// GitHub API calls (eliminates rate limiting, BUG-3/BUG-20).
//
// Only fetches "from-{peerID}*.json" files (Convention A originals).
// Convention B copies ("to-{agentID}*.json") are routing artifacts and
// get skipped to prevent duplicate events (BUG-20).
package transport

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
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
// Uses git fetch + git ls-tree + git show instead of GitHub API.
type Fetcher struct {
	AgentID      string        // this agent's ID (messages addressed "to" this)
	TransportDir string        // local transport/sessions/ path
	ProjectRoot  string        // repo root (for git operations)
	Peers        []PeerConfig  // peer repos to poll
	PollInterval time.Duration // how often to check
	GitHubToken  string        // unused after migration — kept for interface compat

	seen   map[string]time.Time // "remote:path" → last fetched
	mu     sync.Mutex
	logger *slog.Logger
	stopCh chan struct{}
}

// NewFetcher constructs a cross-repo fetcher.
func NewFetcher(agentID, transportDir, projectRoot string, peers []PeerConfig, interval time.Duration, logger *slog.Logger) *Fetcher {
	return &Fetcher{
		AgentID:      agentID,
		TransportDir: transportDir,
		ProjectRoot:  projectRoot,
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

	// Ensure git remotes exist for all peers
	f.ensureRemotes()

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

// ensureRemotes adds git remotes for each peer if not already present.
func (f *Fetcher) ensureRemotes() {
	for _, peer := range f.Peers {
		remoteName := "peer-" + peer.AgentID
		// Check if remote exists
		cmd := exec.Command("git", "-C", f.ProjectRoot, "remote", "get-url", remoteName)
		if err := cmd.Run(); err != nil {
			// Add remote
			repoURL := fmt.Sprintf("https://github.com/%s.git", peer.Repo)
			exec.Command("git", "-C", f.ProjectRoot, "remote", "add", remoteName, repoURL).Run()
			f.logger.Info("added git remote for peer", "remote", remoteName, "url", repoURL)
		}
	}
}

// pollAll fetches all peer remotes then checks for new messages.
func (f *Fetcher) pollAll() {
	// Batch fetch all peer remotes (single network round)
	for _, peer := range f.Peers {
		remoteName := "peer-" + peer.AgentID
		cmd := exec.Command("git", "-C", f.ProjectRoot, "fetch", remoteName, "main", "--quiet")
		cmd.Run() // ignore errors — network may fail
	}

	for _, peer := range f.Peers {
		f.pollPeer(peer)
	}
}

// pollPeer uses git ls-tree to list transport session files on the peer's
// remote branch, then fetches new messages via git show.
func (f *Fetcher) pollPeer(peer PeerConfig) {
	remoteName := "peer-" + peer.AgentID
	remoteRef := remoteName + "/main"

	// List all files under transport/sessions/ on the peer's main branch
	cmd := exec.Command("git", "-C", f.ProjectRoot, "ls-tree", "-r", "--name-only", remoteRef, "--", "transport/sessions/")
	out, err := cmd.Output()
	if err != nil {
		f.logger.Debug("failed to ls-tree peer transport",
			"peer", peer.AgentID, "err", err)
		return
	}

	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		fileName := filepath.Base(line)

		// BUG-20 fix: only fetch "from-{peerID}*.json" (Convention A originals).
		// Skip "to-{agentID}*.json" (Convention B copies = routing artifacts).
		// This eliminates duplicate events from the same message.
		if !strings.HasPrefix(fileName, "from-"+peer.AgentID) {
			continue
		}
		if !strings.HasSuffix(fileName, ".json") || fileName == "MANIFEST.json" {
			continue
		}

		// Dedup check
		seenKey := remoteName + ":" + line
		f.mu.Lock()
		if _, found := f.seen[seenKey]; found {
			f.mu.Unlock()
			continue
		}
		f.mu.Unlock()

		// Extract session name from path: transport/sessions/{session}/{file}
		parts := strings.Split(line, "/")
		if len(parts) < 3 {
			continue
		}
		sessionName := parts[2]

		// Check if we already have this file locally
		localPath := filepath.Join(f.TransportDir, sessionName, fileName)
		if fileExistsLocal(localPath) {
			f.mu.Lock()
			f.seen[seenKey] = time.Now()
			f.mu.Unlock()
			continue
		}

		// Fetch via git show (no API call, no rate limit)
		content, err := f.gitShow(remoteRef, line)
		if err != nil {
			f.logger.Warn("failed to git show peer message",
				"peer", peer.AgentID, "path", line, "err", err)
			continue
		}

		// Write to local transport directory
		localDir := filepath.Join(f.TransportDir, sessionName)
		os.MkdirAll(localDir, 0755)
		if err := os.WriteFile(localPath, content, 0644); err != nil {
			f.logger.Warn("failed to write fetched message",
				"path", localPath, "err", err)
			continue
		}

		f.mu.Lock()
		f.seen[seenKey] = time.Now()
		f.mu.Unlock()

		f.logger.Info("cross-repo message fetched",
			"peer", peer.AgentID,
			"session", sessionName,
			"file", fileName,
		)
	}
}

// gitShow reads a file from a remote ref via git show.
func (f *Fetcher) gitShow(ref, path string) ([]byte, error) {
	cmd := exec.Command("git", "-C", f.ProjectRoot, "show", ref+":"+path)
	return cmd.Output()
}

// fileExistsLocal reports whether a path refers to an existing file.
func fileExistsLocal(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

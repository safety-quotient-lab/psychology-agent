package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

// AgentEntry holds the identity and path info for a mesh agent.
type AgentEntry struct {
	ID         string `json:"id"`
	ProjectDir string `json:"project_dir"` // relative to AGENT_BASE_DIR
	DBPath     string `json:"db_path"`     // derived: AGENT_BASE_DIR/ProjectDir/state.db
	Role       string `json:"role"`
}

// dirMap overrides for agent repos whose directory names differ from the
// last segment of the GitHub repo path.
var dirMap = map[string]string{
	"safety-quotient-lab/psychology-agent": "psychology",
	"safety-quotient-lab/safety-quotient":  "psychology/safety-quotient",
	"safety-quotient-lab/unratified":       "unratified",
	"safety-quotient-lab/observatory":      "observatory",
	"safety-quotient-lab/operations-agent": "operations-agent",
}

// LoadAgentEntries reads cogarch.config.json peers and builds AgentEntry
// list with resolved paths.
func LoadAgentEntries(cfg *config.Config) ([]AgentEntry, error) {
	cogPath := filepath.Join(cfg.RepoRoot, "cogarch.config.json")
	data, err := os.ReadFile(cogPath)
	if err != nil {
		return nil, fmt.Errorf("read cogarch.config.json: %w", err)
	}

	var cogarch struct {
		Peers struct {
			Agents map[string]struct {
				Repo string `json:"repo"`
				Role string `json:"role"`
			} `json:"agents"`
		} `json:"peers"`
	}
	if err := json.Unmarshal(data, &cogarch); err != nil {
		return nil, fmt.Errorf("parse cogarch.config.json: %w", err)
	}

	base := cfg.AgentBaseDir
	entries := make([]AgentEntry, 0, len(cogarch.Peers.Agents))

	for id, peer := range cogarch.Peers.Agents {
		// Skip non-daemon agents (compositor runs as CF Worker, no state.db)
		if peer.Role == "mesh" {
			continue
		}

		dir := resolveDir(peer.Repo)
		dbPath := filepath.Join(base, dir, "state.db")

		entries = append(entries, AgentEntry{
			ID:         id,
			ProjectDir: dir,
			DBPath:     dbPath,
			Role:       peer.Role,
		})
	}

	// Add self (operations-agent)
	selfDir := resolveDir("safety-quotient-lab/operations-agent")
	entries = append(entries, AgentEntry{
		ID:         cfg.AgentID,
		ProjectDir: selfDir,
		DBPath:     filepath.Join(base, selfDir, "state.db"),
		Role:       "operations",
	})

	return entries, nil
}

// resolveDir maps a GitHub repo path to a local directory name.
func resolveDir(repo string) string {
	if d, ok := dirMap[repo]; ok {
		return d
	}
	// Fallback: last segment of repo path
	parts := strings.Split(repo, "/")
	return parts[len(parts)-1]
}

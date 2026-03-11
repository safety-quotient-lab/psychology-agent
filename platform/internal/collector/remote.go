package collector

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/registry"
)

// CollectRemoteStates reads mesh-state JSON snapshots from local files and git show.
func CollectRemoteStates(reg *registry.Registry, projectRoot string) []map[string]any {
	var results []map[string]any

	// Local coordination files
	localDir := filepath.Join(projectRoot, "transport", "sessions", "local-coordination")
	entries, err := os.ReadDir(localDir)
	if err == nil {
		for _, e := range entries {
			if !strings.HasPrefix(e.Name(), "mesh-state-") || !strings.HasSuffix(e.Name(), ".json") {
				continue
			}
			data, err := os.ReadFile(filepath.Join(localDir, e.Name()))
			if err != nil {
				continue
			}
			var state map[string]any
			if json.Unmarshal(data, &state) == nil {
				state["_source"] = "local (" + e.Name() + ")"
				results = append(results, state)
			}
		}
	}

	if reg == nil {
		return results
	}

	// Remote repos via git show
	for agentID, cfg := range reg.Agents {
		if cfg.Transport != "cross-repo-fetch" || cfg.RemoteName == "" {
			continue
		}
		meshPath := "transport/sessions/local-coordination/mesh-state-" + agentID + ".json"
		out, err := exec.Command(
			"git", "-C", projectRoot, "show",
			cfg.RemoteName+"/main:"+meshPath,
		).Output()
		if err != nil || len(out) == 0 {
			continue
		}
		var state map[string]any
		if json.Unmarshal(out, &state) == nil {
			state["_source"] = "git show " + cfg.RemoteName + "/main"
			results = append(results, state)
		}
	}

	return results
}

// RemoteReplayInfo holds metadata about a peer replay file.
type RemoteReplayInfo struct {
	AgentID  string `json:"agent_id"`
	Filename string `json:"filename"`
	Remote   string `json:"remote"`
}

// CollectRemoteReplays lists replay files on remote peers via git ls-tree.
func CollectRemoteReplays(reg *registry.Registry, projectRoot string) []RemoteReplayInfo {
	results := make([]RemoteReplayInfo, 0)
	if reg == nil {
		return results
	}

	for agentID, cfg := range reg.Agents {
		if cfg.Transport != "cross-repo-fetch" || cfg.RemoteName == "" {
			continue
		}
		out, err := exec.Command(
			"git", "-C", projectRoot, "ls-tree",
			"--name-only", cfg.RemoteName+"/main", "docs/replays/",
		).Output()
		if err != nil || len(out) == 0 {
			continue
		}
		for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			fname := filepath.Base(line)
			if strings.HasSuffix(fname, ".html") {
				results = append(results, RemoteReplayInfo{
					AgentID:  agentID,
					Filename: fname,
					Remote:   cfg.RemoteName,
				})
			}
		}
	}
	return results
}

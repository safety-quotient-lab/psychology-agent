package registry

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// AgentConfig holds per-agent configuration from the registry.
type AgentConfig struct {
	Role           string   `json:"role"`
	Description    string   `json:"description"`
	Transport      string   `json:"transport"`
	Repo           string   `json:"repo"`
	RemoteName     string   `json:"remote_name"`
	SessionsPath   string   `json:"sessions_path"`
	MessagePrefix  string   `json:"message_prefix"`
	ActiveSessions []string `json:"active_sessions"`
	AlwaysConsider bool     `json:"always_consider"`
	Autonomous     bool     `json:"autonomous"`
	DiscoveryURL   string   `json:"discovery_url"`
}

// Registry holds the full agent registry (base merged with local overrides).
type Registry struct {
	Schema  string                 `json:"schema"`
	Agents  map[string]AgentConfig `json:"agents"`
	raw     map[string]any
}

// Load reads agent-registry.json and merges agent-registry.local.json if present.
func Load(projectRoot string) (*Registry, error) {
	basePath := filepath.Join(projectRoot, "transport", "agent-registry.json")
	localPath := filepath.Join(projectRoot, "transport", "agent-registry.local.json")

	base, err := readJSON(basePath)
	if err != nil {
		return &Registry{Agents: map[string]AgentConfig{}}, nil
	}

	localData, err := readJSON(localPath)
	if err == nil {
		base = deepMerge(base, localData)
	}

	reg := &Registry{
		Agents: make(map[string]AgentConfig),
		raw:    base,
	}

	agentsRaw, ok := base["agents"].(map[string]any)
	if !ok {
		return reg, nil
	}

	for id, v := range agentsRaw {
		cfgData, err := json.Marshal(v)
		if err != nil {
			continue
		}
		var cfg AgentConfig
		if err := json.Unmarshal(cfgData, &cfg); err != nil {
			continue
		}
		reg.Agents[id] = cfg
	}
	return reg, nil
}

func readJSON(path string) (map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	return result, json.Unmarshal(data, &result)
}

func deepMerge(base, override map[string]any) map[string]any {
	merged := make(map[string]any, len(base))
	for k, v := range base {
		merged[k] = v
	}
	for k, v := range override {
		if baseMap, ok := merged[k].(map[string]any); ok {
			if overMap, ok := v.(map[string]any); ok {
				merged[k] = deepMerge(baseMap, overMap)
				continue
			}
		}
		merged[k] = v
	}
	return merged
}

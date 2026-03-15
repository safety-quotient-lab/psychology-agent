// Package config provides configuration loading for the meshd daemon.
// It reads from .dev.vars files (KEY=VALUE format) and allows
// environment variable overrides. Environment variables take precedence
// over .dev.vars values, which take precedence over defaults.
package config

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Config holds all runtime configuration for the meshd daemon.
type Config struct {
	Port           int    // HTTP listen port
	AgentID        string // agent identity within the mesh
	RepoRoot       string // absolute path to the repository root
	SSHHost        string // remote host for agent deployment
	SSHPort        int    // SSH port on the remote host
	AgentBaseDir   string // base directory for agent projects on remote host
	GitHubSecret   string // webhook HMAC secret for signature verification
	SpawnCommand   string // path to claude or claude-instrumented.sh
	SpawnTimeout   int    // maximum seconds per claude spawn
	PollInterval   int    // seconds between safety-net poll sweeps
	BudgetDBPath   string // path to the budget state database
	TransportDir   string // path to transport/sessions/ directory
	LogLevel       string // logging verbosity: debug, info, warn, error
	MaxConcurrent  int    // max concurrent claude spawns (normal capacity)
	ReserveSlots   int    // extra slots unlocked via /tmp/mesh-reserve-unlock
	DeliberationModel     string // model override for spawns (e.g. "sonnet", "opus", "" = CLI default)

	// Compositor (ported from CF Worker)
	AgentCardURLs  []string // bootstrap agent card URLs for discovery
	GitHubToken    string   // PAT for PR creation (relay/redirect)
	OperatorSecret string   // secret for API key management

	// Cloudflare KV self-observation (same-zone SPOF elimination)
	CFAccountID    string // Cloudflare account ID
	CFAPIToken     string // Cloudflare API token
	KVNamespaceID  string // AUTH_KV namespace ID

	// Notification channel
	NotifyChannel       string // "null", "file", "zulip", "webhook"
	NotifyFilePath      string // file channel output path
	ZulipNotifyURL      string // Zulip API messages endpoint
	ZulipNotifyEmail    string // Zulip bot email
	ZulipNotifyKey      string // Zulip bot API key
	ZulipNotifyStream   string // Zulip target stream
	ZulipNotifyTopic    string // Zulip target topic
	NotifyWebhookURL    string // generic webhook URL
}

// Load reads configuration from a .dev.vars file, applies environment
// variable overrides, and fills remaining gaps with sensible defaults.
//
// When MESHD_CONFIG_PATH holds a value, Load reads from that path.
// Otherwise it looks for {repoRoot}/.dev.vars.
//
// The lookup order for each value:
//  1. Environment variable (highest precedence)
//  2. .dev.vars file entry
//  3. Compiled default (lowest precedence)
func Load() (*Config, error) {
	repoRoot, err := detectRepoRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to detect repo root: %w", err)
	}

	// Determine which .dev.vars file to read
	varsPath := os.Getenv("MESHD_CONFIG_PATH")
	if varsPath == "" {
		varsPath = filepath.Join(repoRoot, ".dev.vars")
	}

	// Parse the .dev.vars file; missing file does not constitute an error
	devVars, err := parseDevVars(varsPath)
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed to parse .dev.vars: %w", err)
	}

	// resolve merges env → devVars → default in priority order
	resolve := func(envKey, defaultVal string) string {
		if v := os.Getenv(envKey); v != "" {
			return v
		}
		if v, ok := devVars[envKey]; ok && v != "" {
			return v
		}
		return defaultVal
	}

	resolveInt := func(envKey string, defaultVal int) (int, error) {
		raw := resolve(envKey, strconv.Itoa(defaultVal))
		n, err := strconv.Atoi(raw)
		if err != nil {
			return 0, fmt.Errorf("invalid integer for %s=%q: %w", envKey, raw, err)
		}
		return n, nil
	}

	cfg := &Config{
		AgentID:      resolve("AGENT_ID", "operations-agent"),
		RepoRoot:     repoRoot,
		SSHHost:      resolve("AGENT_SSH_HOST", "localhost"),
		GitHubSecret: resolve("GITHUB_WEBHOOK_SECRET", ""),
		SpawnCommand: resolve("SPAWN_COMMAND", "claude"),
		LogLevel:     resolve("LOG_LEVEL", "info"),
		AgentBaseDir: resolve("AGENT_BASE_DIR", ""),
	}

	if cfg.Port, err = resolveInt("MESHD_PORT", 8081); err != nil {
		return nil, err
	}
	if cfg.SSHPort, err = resolveInt("AGENT_SSH_PORT", 22); err != nil {
		return nil, err
	}
	if cfg.SpawnTimeout, err = resolveInt("SPAWN_TIMEOUT", 300); err != nil {
		return nil, err
	}
	if cfg.PollInterval, err = resolveInt("POLL_INTERVAL", 1800); err != nil {
		return nil, err
	}
	if cfg.MaxConcurrent, err = resolveInt("MAX_CONCURRENT_SPAWNS", 1); err != nil {
		return nil, err
	}
	if cfg.ReserveSlots, err = resolveInt("MESH_RESERVE_SLOTS", 2); err != nil {
		return nil, err
	}
	cfg.DeliberationModel = resolve("DELIBERATION_MODEL", "")

	// Paths that derive from RepoRoot when no explicit value appears
	cfg.BudgetDBPath = resolve("BUDGET_DB_PATH", filepath.Join(repoRoot, "state.db"))
	cfg.TransportDir = resolve("TRANSPORT_DIR", filepath.Join(repoRoot, "transport", "sessions"))

	// Notification channel
	cfg.NotifyChannel = resolve("NOTIFY_CHANNEL", "null")
	cfg.NotifyFilePath = resolve("NOTIFY_FILE", "/tmp/meshd-notifications.jsonl")
	cfg.ZulipNotifyURL = resolve("ZULIP_NOTIFY_URL", "")
	cfg.ZulipNotifyEmail = resolve("ZULIP_NOTIFY_EMAIL", "")
	cfg.ZulipNotifyKey = resolve("ZULIP_NOTIFY_KEY", "")
	cfg.ZulipNotifyStream = resolve("ZULIP_NOTIFY_STREAM", "mesh-ops")
	cfg.ZulipNotifyTopic = resolve("ZULIP_NOTIFY_TOPIC", "meshd")
	cfg.NotifyWebhookURL = resolve("NOTIFY_WEBHOOK_URL", "")

	// Cloudflare KV (self-observation)
	cfg.CFAccountID = resolve("CF_ACCOUNT_ID", "")
	cfg.CFAPIToken = resolve("CF_API_TOKEN", "")
	cfg.KVNamespaceID = resolve("KV_NAMESPACE_ID", "")

	// Compositor config
	cfg.GitHubToken = resolve("GITHUB_TOKEN", "")
	cfg.OperatorSecret = resolve("OPERATOR_SECRET", "")

	// Load agent card URLs from cogarch.config.json
	cfg.AgentCardURLs = loadAgentCardURLs(repoRoot)

	return cfg, nil
}

// loadAgentCardURLs reads card URLs from cogarch.config.json peers.
func loadAgentCardURLs(repoRoot string) []string {
	path := filepath.Join(repoRoot, "cogarch.config.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return defaultCardURLs()
	}

	var cogarch struct {
		Peers struct {
			Agents []struct {
				CardURL string `json:"card_url"`
			} `json:"agents"`
		} `json:"peers"`
	}

	// Use encoding/json import
	if err := parseJSON(data, &cogarch); err != nil {
		return defaultCardURLs()
	}

	urls := make([]string, 0, len(cogarch.Peers.Agents))
	for _, a := range cogarch.Peers.Agents {
		if a.CardURL != "" {
			// Ensure URL points to agent-card.json
			url := a.CardURL
			if !strings.HasSuffix(url, "/.well-known/agent-card.json") {
				url = strings.TrimSuffix(url, "/") + "/.well-known/agent-card.json"
			}
			urls = append(urls, url)
		}
	}

	// Add self
	urls = append(urls, "https://operations-agent.safety-quotient.dev/.well-known/agent-card.json")

	if len(urls) == 0 {
		return defaultCardURLs()
	}
	return urls
}

func defaultCardURLs() []string {
	return []string{
		"https://psychology-agent.safety-quotient.dev/.well-known/agent-card.json",
		"https://psq-agent.safety-quotient.dev/.well-known/agent-card.json",
		"https://operations-agent.safety-quotient.dev/.well-known/agent-card.json",
		"https://unratified.org/.well-known/agent-card.json",
		"https://observatory.unratified.org/.well-known/agent-card.json",
	}
}

// parseJSON decodes JSON data into dst.
func parseJSON(data []byte, dst any) error {
	return json.Unmarshal(data, dst)
}

// detectRepoRoot walks up from the executable's directory until it finds
// a go.mod file, which marks the repository root. If the executable
// location proves unreadable, it falls back to the working directory.
func detectRepoRoot() (string, error) {
	// Start from executable location
	exe, err := os.Executable()
	if err == nil {
		dir := filepath.Dir(exe)
		if root, found := findGoModRoot(dir); found {
			return root, nil
		}
	}

	// Fall back to working directory
	wd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("unable to determine working directory: %w", err)
	}
	if root, found := findGoModRoot(wd); found {
		return root, nil
	}

	// Last resort: use working directory itself
	return wd, nil
}

// findGoModRoot walks upward from dir looking for go.mod. It returns
// the directory containing go.mod and true, or ("", false) when
// reaching the filesystem root without finding one.
func findGoModRoot(dir string) (string, bool) {
	dir, _ = filepath.Abs(dir)
	for {
		candidate := filepath.Join(dir, "go.mod")
		if _, err := os.Stat(candidate); err == nil {
			return dir, true
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached filesystem root without finding go.mod
			return "", false
		}
		dir = parent
	}
}

// parseDevVars reads a .dev.vars file and returns a map of key-value pairs.
// Lines starting with # (optionally preceded by whitespace) count as comments.
// Empty lines and malformed lines get skipped silently.
func parseDevVars(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	vars := make(map[string]string)
	scanner := bufio.NewScanner(f)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)

		// Strip surrounding quotes if present
		value = stripQuotes(value)

		vars[key] = value
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading %s: %w", path, err)
	}

	return vars, nil
}

// stripQuotes removes matching single or double quotes wrapping a value.
func stripQuotes(s string) string {
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') ||
			(s[0] == '\'' && s[len(s)-1] == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}

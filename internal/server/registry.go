// Package server — registry.go manages dynamic agent card discovery.
//
// Replaces the Cloudflare KV cache used by the compositor Worker.
// Fetches agent cards from bootstrap URLs, caches in memory with TTL,
// and provides thread-safe access for all compositor handlers.
package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// validateFetchURL rejects URLs that could enable SSRF attacks.
// Requires HTTPS (or localhost HTTP for development).
// Rejects private/loopback IPs in non-localhost hostnames.
func validateFetchURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("malformed URL: %w", err)
	}

	// Allow HTTP only for localhost development.
	host := parsed.Hostname()
	if parsed.Scheme == "http" {
		if host != "localhost" && host != "127.0.0.1" {
			return fmt.Errorf("HTTPS required for non-localhost URLs")
		}
		return nil
	}

	if parsed.Scheme != "https" {
		return fmt.Errorf("scheme %q not allowed (use https)", parsed.Scheme)
	}

	// Reject private IP ranges in HTTPS URLs (SSRF protection).
	ips, err := net.LookupIP(host)
	if err != nil {
		// DNS resolution failure — allow (may resolve later via different DNS).
		return nil
	}
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return fmt.Errorf("URL resolves to private/loopback address %s", ip)
		}
	}

	return nil
}

// AgentInfo holds parsed agent card data for compositor use.
type AgentInfo struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Role        string              `json:"role"`
	Version     string              `json:"version"`
	CardURL     string              `json:"card_url"`
	StatusURL   string              `json:"status_url,omitempty"`
	ManifestURL string              `json:"manifest_url,omitempty"`
	Repo        string              `json:"repo,omitempty"`
	Skills      int                 `json:"skills"`
	Unavailable bool                `json:"unavailable,omitempty"`
	Manifest    *DashboardManifest  `json:"manifest,omitempty"`
	RawCard     map[string]any      `json:"-"`
}

// AgentRegistry fetches and caches agent cards from bootstrap URLs.
// Persists discovered cards to SQLite (state.db) for cold-start resilience.
type AgentRegistry struct {
	agents      []AgentInfo
	mu          sync.RWMutex
	logger      *slog.Logger
	cardURLs    []string
	selfID      string
	selfCardURL string
	cacheTTL    time.Duration
	lastRefresh time.Time
	httpClient  *http.Client
	dbPath      string // state.db path for persistence
}

// NewAgentRegistry creates a registry with bootstrap card URLs.
func NewAgentRegistry(selfID string, cardURLs []string, ttl time.Duration, logger *slog.Logger) *AgentRegistry {
	return &AgentRegistry{
		selfID:   selfID,
		cardURLs: cardURLs,
		cacheTTL: ttl,
		logger:   logger,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// SetDBPath configures SQLite persistence for the registry.
// Call before StartBackgroundRefresh.
func (r *AgentRegistry) SetDBPath(path string) {
	r.dbPath = path
	// Ensure agent_cards table exists
	if path != "" {
		db.Exec(path, `CREATE TABLE IF NOT EXISTS agent_cards (
			card_url TEXT PRIMARY KEY,
			agent_id TEXT,
			card_json TEXT,
			updated_at TEXT DEFAULT (datetime('now'))
		)`)
	}
}

// Agents returns the current cached agent list (thread-safe).
func (r *AgentRegistry) Agents() []AgentInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Return a copy to prevent mutation
	out := make([]AgentInfo, len(r.agents))
	copy(out, r.agents)
	return out
}

// Refresh fetches all agent cards and updates the cache.
func (r *AgentRegistry) Refresh() {
	agents := make([]AgentInfo, 0, len(r.cardURLs))

	for _, cardURL := range r.cardURLs {
		info, err := r.fetchCard(cardURL)
		if err != nil {
			r.logger.Debug("agent card fetch failed",
				"url", cardURL,
				"err", err,
			)
			// Add unavailable placeholder
			agents = append(agents, AgentInfo{
				CardURL:     cardURL,
				Unavailable: true,
			})
			continue
		}
		agents = append(agents, info)
	}

	// Fetch dashboard manifests for available agents (non-blocking)
	var wg sync.WaitGroup
	for i := range agents {
		if agents[i].Unavailable || agents[i].ManifestURL == "" {
			continue
		}
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			manifest, err := r.fetchManifest(agents[idx].ManifestURL)
			if err == nil {
				agents[idx].Manifest = manifest
			}
		}(i)
	}
	wg.Wait()

	// Persist successfully fetched cards to SQLite
	if r.dbPath != "" {
		for _, a := range agents {
			if a.Unavailable || a.RawCard == nil {
				continue
			}
			cardJSON, _ := json.Marshal(a.RawCard)
			db.Exec(r.dbPath, fmt.Sprintf(
				"INSERT OR REPLACE INTO agent_cards (card_url, agent_id, card_json, updated_at) VALUES ('%s', '%s', '%s', datetime('now'))",
				db.EscapeString(a.CardURL), db.EscapeString(a.ID), db.EscapeString(string(cardJSON)),
			))
		}

		// For unavailable agents, try loading from DB cache
		for i := range agents {
			if !agents[i].Unavailable {
				continue
			}
			rows, _ := db.QueryJSON(r.dbPath, fmt.Sprintf(
				"SELECT card_json FROM agent_cards WHERE card_url = '%s'",
				db.EscapeString(agents[i].CardURL),
			))
			if len(rows) > 0 {
				cardStr := rows[0]["card_json"]
				if cardStr != "" {
					var card map[string]any
					if json.Unmarshal([]byte(cardStr), &card) == nil {
						cached := parseAgentCard(card, agents[i].CardURL)
						cached.Unavailable = false
						agents[i] = cached
						r.logger.Info("agent card recovered from SQLite cache",
							"agent", cached.ID, "url", agents[i].CardURL)
					}
				}
			}
		}
	}

	r.mu.Lock()
	r.agents = agents
	r.lastRefresh = time.Now()
	r.mu.Unlock()

	r.logger.Info("agent registry refreshed",
		"agents", len(agents),
		"available", countAvailable(agents),
	)
}

// StartBackgroundRefresh runs Refresh on an interval until ctx cancels.
// On cold start, seeds the in-memory cache from SQLite before first network fetch.
func (r *AgentRegistry) StartBackgroundRefresh(ctx context.Context) {
	// Cold-start: load cached cards from SQLite before first network fetch
	if r.dbPath != "" {
		rows, _ := db.QueryJSON(r.dbPath, "SELECT card_url, agent_id, card_json FROM agent_cards")
		if len(rows) > 0 {
			seed := make([]AgentInfo, 0, len(rows))
			for _, row := range rows {
				cardStr := row["card_json"]
				cardURL := row["card_url"]
				if cardStr == "" || cardURL == "" {
					continue
				}
				var card map[string]any
				if json.Unmarshal([]byte(cardStr), &card) == nil {
					info := parseAgentCard(card, cardURL)
					seed = append(seed, info)
				}
			}
			if len(seed) > 0 {
				r.mu.Lock()
				r.agents = seed
				r.mu.Unlock()
				r.logger.Info("agent registry seeded from SQLite", "agents", len(seed))
			}
		}
	}

	// Initial refresh (network fetch, overwrites seed with fresh data)
	r.Refresh()

	ticker := time.NewTicker(r.cacheTTL)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.Refresh()
		case <-ctx.Done():
			return
		}
	}
}

// FetchAgentStatus calls GET /api/status on an agent and returns parsed JSON.
func (r *AgentRegistry) FetchAgentStatus(agent AgentInfo) (map[string]any, error) {
	if agent.StatusURL == "" {
		return nil, fmt.Errorf("no status URL for %s", agent.ID)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, agent.StatusURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status %d from %s", resp.StatusCode, agent.StatusURL)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20)) // 2MB limit
	if err != nil {
		return nil, err
	}

	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("invalid JSON from %s: %w", agent.StatusURL, err)
	}

	return data, nil
}

// FetchAllStatuses fetches /api/status from all agents in parallel.
func (r *AgentRegistry) FetchAllStatuses() map[string]map[string]any {
	agents := r.Agents()
	results := make(map[string]map[string]any)
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, agent := range agents {
		if agent.Unavailable || agent.StatusURL == "" {
			continue
		}
		wg.Add(1)
		go func(a AgentInfo) {
			defer wg.Done()
			data, err := r.FetchAgentStatus(a)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				r.logger.Debug("status fetch failed", "agent", a.ID, "err", err)
				return
			}
			results[a.ID] = data
		}(agent)
	}

	wg.Wait()
	return results
}

// FetchURL fetches a JSON endpoint and returns parsed data.
func (r *AgentRegistry) FetchURL(rawURL string) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d from %s", resp.StatusCode, rawURL)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}

	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}
	return data, nil
}

// fetchCard retrieves and parses a single agent card.
// Validates URL scheme (HTTPS required in production) to prevent SSRF.
func (r *AgentRegistry) fetchCard(cardURL string) (AgentInfo, error) {
	if err := validateFetchURL(cardURL); err != nil {
		return AgentInfo{}, fmt.Errorf("URL validation failed: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cardURL, nil)
	if err != nil {
		return AgentInfo{}, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return AgentInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return AgentInfo{}, fmt.Errorf("HTTP %d from %s", resp.StatusCode, cardURL)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // 1MB limit
	if err != nil {
		return AgentInfo{}, err
	}

	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return AgentInfo{}, fmt.Errorf("invalid JSON: %w", err)
	}

	return parseAgentCard(raw, cardURL), nil
}

// parseAgentCard builds an AgentInfo from a raw card map and URL.
// Shared by fetchCard (network) and cold-start (SQLite).
func parseAgentCard(raw map[string]any, cardURL string) AgentInfo {
	info := AgentInfo{
		CardURL: cardURL,
		RawCard: raw,
	}
	info.ID = jsonStr(raw, "id")
	if info.ID == "" {
		info.ID = jsonStr(raw, "name")
	}
	info.Name = jsonStr(raw, "name")
	info.Role = jsonStr(raw, "role")
	if info.Role == "" {
		info.Role = jsonStr(raw, "description")
	}
	info.Version = jsonStr(raw, "version")
	if idx := strings.Index(cardURL, "/.well-known/"); idx > 0 {
		base := cardURL[:idx]
		info.StatusURL = base + "/api/status"
		info.ManifestURL = base + "/dashboard/manifest"
	}
	if skills, ok := raw["skills"].([]any); ok {
		info.Skills = len(skills)
	}
	if repo, ok := raw["repo"].(string); ok {
		info.Repo = repo
	}
	return info
}

// jsonStr extracts a string from a map, returning "" if missing or wrong type.
func jsonStr(m map[string]any, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// fetchManifest retrieves a peer agent's dashboard manifest.
func (r *AgentRegistry) fetchManifest(manifestURL string) (*DashboardManifest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, manifestURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d from %s", resp.StatusCode, manifestURL)
	}

	var m DashboardManifest
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		return nil, err
	}
	return &m, nil
}

func countAvailable(agents []AgentInfo) int {
	n := 0
	for _, a := range agents {
		if !a.Unavailable {
			n++
		}
	}
	return n
}

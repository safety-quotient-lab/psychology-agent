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
	"net/http"
	"strings"
	"sync"
	"time"
)

// AgentInfo holds parsed agent card data for compositor use.
type AgentInfo struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Role        string         `json:"role"`
	Version     string         `json:"version"`
	CardURL     string         `json:"card_url"`
	StatusURL   string         `json:"status_url,omitempty"`
	Repo        string         `json:"repo,omitempty"`
	Skills      int            `json:"skills"`
	Unavailable bool           `json:"unavailable,omitempty"`
	RawCard     map[string]any `json:"-"`
}

// AgentRegistry fetches and caches agent cards from bootstrap URLs.
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
func (r *AgentRegistry) StartBackgroundRefresh(ctx context.Context) {
	// Initial refresh
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

// fetchCard retrieves and parses a single agent card.
func (r *AgentRegistry) fetchCard(cardURL string) (AgentInfo, error) {
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

	info := AgentInfo{
		CardURL: cardURL,
		RawCard: raw,
	}

	// Extract standard fields
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

	// Derive status URL from card URL hostname
	if idx := strings.Index(cardURL, "/.well-known/"); idx > 0 {
		info.StatusURL = cardURL[:idx] + "/api/status"
	}

	// Count skills
	if skills, ok := raw["skills"].([]any); ok {
		info.Skills = len(skills)
	}

	// Check for repo in raw card
	if repo, ok := raw["repo"].(string); ok {
		info.Repo = repo
	}

	return info, nil
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

func countAvailable(agents []AgentInfo) int {
	n := 0
	for _, a := range agents {
		if !a.Unavailable {
			n++
		}
	}
	return n
}

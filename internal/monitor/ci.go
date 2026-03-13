// Package monitor provides observability sensors for mesh infrastructure.
// The CI monitor polls GitHub Actions across all peer repos and emits
// events when builds fail.
package monitor

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

// CIStatus tracks the last known state of a repo's CI.
type CIStatus struct {
	Repo       string    `json:"repo"`
	RunID      int64     `json:"run_id"`
	Conclusion string    `json:"conclusion"` // success, failure, cancelled, skipped
	Workflow   string    `json:"workflow"`
	Branch     string    `json:"branch"`
	CommitMsg  string    `json:"commit_msg"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CIMonitor polls GitHub Actions for build failures across mesh repos.
type CIMonitor struct {
	Repos        []string      // repos to monitor (e.g., "safety-quotient-lab/unratified")
	PollInterval time.Duration // how often to check
	GitHubToken  string        // optional — for higher rate limits
	OnFailure    func(status CIStatus) // callback when a build fails
	OnRecovery   func(status CIStatus) // callback when a previously failed repo recovers

	lastState map[string]string // repo → last known conclusion
	mu        sync.Mutex
	logger    *slog.Logger
	stopCh    chan struct{}
}

// NewCIMonitor constructs a monitor for the given repos.
func NewCIMonitor(repos []string, interval time.Duration, logger *slog.Logger) *CIMonitor {
	return &CIMonitor{
		Repos:        repos,
		PollInterval: interval,
		lastState:    make(map[string]string),
		logger:       logger,
		stopCh:       make(chan struct{}),
	}
}

// Run starts the polling loop. Blocks until Stop gets called.
func (m *CIMonitor) Run() {
	ticker := time.NewTicker(m.PollInterval)
	defer ticker.Stop()

	m.logger.Info("CI monitor started",
		"repos", len(m.Repos),
		"interval", m.PollInterval,
	)

	// Initial scan
	m.pollAll()

	for {
		select {
		case <-ticker.C:
			m.pollAll()
		case <-m.stopCh:
			m.logger.Info("CI monitor stopped")
			return
		}
	}
}

// Stop signals the monitor to exit.
func (m *CIMonitor) Stop() {
	close(m.stopCh)
}

// Summary returns the last known CI status for all monitored repos.
func (m *CIMonitor) Summary() map[string]string {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make(map[string]string, len(m.lastState))
	for k, v := range m.lastState {
		out[k] = v
	}
	return out
}

// HealthCheck satisfies the health.Checkable interface.
func (m *CIMonitor) HealthCheck() (int, string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	failures := 0
	for repo, conclusion := range m.lastState {
		if conclusion == "failure" {
			failures++
			_ = repo
		}
	}
	if failures > 0 {
		return 1, fmt.Sprintf("%d repo(s) with failing CI", failures) // Degraded
	}
	return 0, fmt.Sprintf("all %d repos passing", len(m.lastState)) // Healthy
}

// pollAll checks every repo for recent CI status.
func (m *CIMonitor) pollAll() {
	for _, repo := range m.Repos {
		m.pollRepo(repo)
	}
}

// pollRepo fetches the most recent workflow run for a repo and
// detects state transitions (success→failure, failure→success).
func (m *CIMonitor) pollRepo(repo string) {
	runs, err := m.fetchRuns(repo)
	if err != nil {
		m.logger.Debug("CI poll failed for repo",
			"repo", repo,
			"err", err,
		)
		return
	}

	if len(runs) == 0 {
		return
	}

	// Find the most recent completed run
	var latest *ghRun
	for i := range runs {
		if runs[i].Status == "completed" {
			latest = &runs[i]
			break
		}
	}
	if latest == nil {
		return
	}

	m.mu.Lock()
	prev := m.lastState[repo]
	m.lastState[repo] = latest.Conclusion
	m.mu.Unlock()

	status := CIStatus{
		Repo:       repo,
		RunID:      latest.ID,
		Conclusion: latest.Conclusion,
		Workflow:    latest.Name,
		Branch:     latest.HeadBranch,
		CommitMsg:  truncate(latest.HeadCommit.Message, 100),
		UpdatedAt:  latest.UpdatedAt,
	}

	// Detect transitions
	if latest.Conclusion == "failure" && prev != "failure" {
		m.logger.Warn("CI build failed",
			"repo", repo,
			"run_id", latest.ID,
			"workflow", latest.Name,
			"commit", truncate(latest.HeadCommit.Message, 60),
		)
		if m.OnFailure != nil {
			m.OnFailure(status)
		}
	} else if latest.Conclusion == "success" && prev == "failure" {
		m.logger.Info("CI build recovered",
			"repo", repo,
			"run_id", latest.ID,
		)
		if m.OnRecovery != nil {
			m.OnRecovery(status)
		}
	}
}

// ── GitHub API ──────────────────────────────────────────────────────

type ghRun struct {
	ID         int64     `json:"id"`
	Name       string    `json:"name"`
	Status     string    `json:"status"`     // queued, in_progress, completed
	Conclusion string    `json:"conclusion"` // success, failure, cancelled, skipped
	HeadBranch string    `json:"head_branch"`
	UpdatedAt  time.Time `json:"updated_at"`
	HeadCommit struct {
		Message string `json:"message"`
	} `json:"head_commit"`
}

type ghRunsResponse struct {
	TotalCount int     `json:"total_count"`
	Runs       []ghRun `json:"workflow_runs"`
}

func (m *CIMonitor) fetchRuns(repo string) ([]ghRun, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/actions/runs?per_page=3&status=completed", repo)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "meshd-ci-monitor/1.0")
	if m.GitHubToken != "" {
		req.Header.Set("Authorization", "Bearer "+m.GitHubToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API returned %d: %s", resp.StatusCode, truncate(string(body), 200))
	}

	var result ghRunsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse GitHub Actions response: %w", err)
	}

	return result.Runs, nil
}

// ── Helpers ─────────────────────────────────────────────────────────

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

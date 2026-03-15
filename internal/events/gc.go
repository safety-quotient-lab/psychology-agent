// Package events — gc.go implements crystallized intelligence (Gc) handlers.
//
// Gc handles routine mesh operations without spawning Claude:
//   - PollTick → git fetch + PR check + transport scan (deterministic)
//   - TransportACK → auto-merge ACK PRs (pattern match on branch name)
//   - HealthCheck → direct HTTP probe (no reasoning needed)
//
// Events requiring fluid intelligence (Gf) — directives, proposals,
// code reviews, novel problems — pass through to the Claude spawner.
//
// Theoretical basis: Cattell's Gc/Gf distinction. CPG (Gc) sets rhythm —
// WHEN to process. Tempo model (Gf) sets depth — HOW DEEPLY.
package events

import (
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
)

// GcConfig holds configuration for crystallized intelligence handlers.
type GcConfig struct {
	RepoRoot     string // path to operations-agent repo root
	TransportDir string // path to transport/sessions/
	AgentID      string // this agent's identity
	Logger       *slog.Logger
}

// NewGcHandler builds a GcHandlerFunc that intercepts routine events.
// Returns true (handled) for events that don't require deliberation.
// Returns false for events that need Claude (Gf).
func NewGcHandler(cfg GcConfig) GcHandlerFunc {
	return func(ctx context.Context, evt Event) bool {
		switch evt.Type {
		case EventPollTick:
			return handlePollTick(cfg)
		case EventHealthCheck:
			return true // health checks handled by meshd health monitor directly
		case EventTransportACK:
			return handleTransportACK(cfg, evt)
		default:
			return false // requires Gf (Claude deliberation)
		}
	}
}

// handlePollTick performs the sync check without spawning Claude.
// Runs git fetch, checks for new PRs, scans transport.
// Returns true (handled) when nothing requires deliberation.
// Returns false when new content needs Claude's attention.
func handlePollTick(cfg GcConfig) bool {
	logger := cfg.Logger

	// git fetch — pure Gc
	fetchCmd := exec.Command("git", "-C", cfg.RepoRoot, "fetch", "--all", "--prune")
	fetchCmd.CombinedOutput() // ignore errors — network may fail

	// Check for new remote commits
	logCmd := exec.Command("git", "-C", cfg.RepoRoot, "log", "HEAD..origin/main", "--oneline")
	logOut, _ := logCmd.Output()
	newCommits := strings.TrimSpace(string(logOut))

	if newCommits != "" {
		// New commits on main — pull and check if transport files changed
		pullCmd := exec.Command("git", "-C", cfg.RepoRoot, "pull", "--rebase", "origin", "main")
		pullCmd.CombinedOutput()

		// If commits contain transport files, let Gf handle
		if strings.Contains(newCommits, "transport") || strings.Contains(newCommits, "interagent") {
			logger.Info("Gc: new transport commits detected — delegating to Gf",
				"commits", newCommits)
			return false
		}
		logger.Info("Gc: pulled new commits (non-transport)", "commits", newCommits)
	}

	// Check for open PRs — auto-merge transport ACKs
	prCmd := exec.Command("gh", "pr", "list", "--state", "open", "--json", "number,title,headRefName")
	prOut, err := prCmd.Output()
	if err == nil && len(prOut) > 2 {
		// Parse and classify PRs
		prStr := string(prOut)
		if classifyAndMergePRs(cfg, prStr) {
			logger.Info("Gc: auto-merged transport ACK PRs")
		}

		// If non-ACK PRs remain, delegate to Gf
		if hasNonACKPRs(prStr) {
			logger.Info("Gc: non-ACK PRs detected — delegating to Gf")
			return false
		}
	}

	logger.Debug("Gc: poll tick handled — nothing requires deliberation")
	return true
}

// handleTransportACK auto-merges a transport ACK PR.
func handleTransportACK(cfg GcConfig, evt Event) bool {
	prNumber := evt.Payload["pr_number"]
	if prNumber == "" {
		return false
	}

	mergeCmd := exec.Command("gh", "pr", "merge", prNumber, "--merge")
	out, err := mergeCmd.CombinedOutput()
	if err != nil {
		cfg.Logger.Warn("Gc: auto-merge failed",
			"pr", prNumber,
			"error", string(out))
		return false
	}

	cfg.Logger.Info("Gc: auto-merged transport ACK PR", "pr", prNumber)
	return true
}

// classifyAndMergePRs parses the PR list JSON and auto-merges ACK PRs.
// ACK pattern: branch contains "/t[0-9]-ack" or title contains "ACK".
func classifyAndMergePRs(cfg GcConfig, prJSON string) bool {
	// Simple pattern match — avoid JSON parsing overhead
	merged := false
	lines := strings.Split(prJSON, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Look for ACK patterns in the raw JSON
		isACK := strings.Contains(line, "-ack") ||
			strings.Contains(line, "ACK") ||
			strings.Contains(line, "t2-ack") ||
			strings.Contains(line, "t3-ack") ||
			strings.Contains(line, "t4-ack")

		if !isACK {
			continue
		}

		// Extract PR number — look for "number":N pattern
		numStart := strings.Index(line, `"number":`)
		if numStart < 0 {
			continue
		}
		numStr := line[numStart+9:]
		numEnd := strings.IndexAny(numStr, ",}")
		if numEnd < 0 {
			continue
		}
		prNum := strings.TrimSpace(numStr[:numEnd])

		mergeCmd := exec.Command("gh", "pr", "merge", prNum, "--merge",
			"--repo", "safety-quotient-lab/operations-agent")
		out, err := mergeCmd.CombinedOutput()
		if err != nil {
			cfg.Logger.Warn("Gc: ACK PR auto-merge failed",
				"pr", prNum, "error", string(out))
		} else {
			cfg.Logger.Info("Gc: auto-merged ACK PR", "pr", prNum)
			merged = true
		}
	}
	return merged
}

// hasNonACKPRs checks whether the PR list contains PRs that aren't simple ACKs.
func hasNonACKPRs(prJSON string) bool {
	lines := strings.Split(prJSON, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || line == "[" || line == "]" {
			continue
		}
		isACK := strings.Contains(line, "-ack") ||
			strings.Contains(line, "ACK")
		if !isACK && strings.Contains(line, `"number"`) {
			return true
		}
	}
	return false
}

// GcStats returns counts for Gc-handled events.
// Uses the Dispatcher's batched counter.
func GcStats(d *Dispatcher) int64 {
	_, _, batched := d.Stats()
	return batched
}

// Ensure fmt import used
var _ = fmt.Sprintf

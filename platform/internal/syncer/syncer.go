// Package syncer orchestrates the autonomous sync cycle.
// Replaces autonomous-sync.sh's main() function: git pull → budget check →
// triage → orientation → claude /sync → git push.
package syncer

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/budget"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/triage"
)

// Config holds syncer parameters.
type Config struct {
	AgentID             string
	ProjectRoot         string
	MaxTurns            int
	MaxConsecutiveErrors int
	AllowedTools        string
}

// DefaultConfig returns sensible syncer defaults.
func DefaultConfig(agentID, projectRoot string) Config {
	return Config{
		AgentID:             agentID,
		ProjectRoot:         projectRoot,
		MaxTurns:            80,
		MaxConsecutiveErrors: 2,
		AllowedTools:        "Read,Write,Edit,Glob,Grep,Bash",
	}
}

// Syncer orchestrates the autonomous sync cycle.
type Syncer struct {
	config  Config
	db      *db.DB
	localDB *db.DB
	budget  *budget.Manager
}

// New creates a syncer with the given configuration.
func New(config Config, database, localDB *db.DB) *Syncer {
	return &Syncer{
		config:  config,
		db:      database,
		localDB: localDB,
		budget:  budget.New(config.AgentID, database, localDB),
	}
}

// RunSync executes one complete sync cycle. Called by the oscillator
// when activation exceeds threshold.
func (s *Syncer) RunSync(ctx context.Context) error {
	start := time.Now()
	log.Printf("[syncer] === sync cycle starting ===")

	// 1. Budget check — halt if exhausted
	status, err := s.budget.Check()
	if err != nil {
		log.Printf("[syncer] HALT — %v", err)
		return err
	}
	if status.Sedated {
		log.Printf("[syncer] agent sedated — skipping sync")
		return nil
	}
	log.Printf("[syncer] budget: %d/%d spent (cutoff 0=unlimited)",
		status.Spent, status.Cutoff)

	// 2. Interval check — defer if too soon
	allowed, remaining := s.budget.CheckInterval(false)
	if !allowed {
		log.Printf("[syncer] DEFER — %s until next action allowed", remaining)
		return nil
	}

	// 3. Git pull
	if err := s.gitPull(ctx); err != nil {
		log.Printf("[syncer] WARNING: git pull failed: %v", err)
		// Non-fatal — continue with local state
	}

	// 4. Triage — auto-process trivial messages
	triageResult, err := triage.Scan(s.db)
	if err != nil {
		log.Printf("[syncer] WARNING: triage failed: %v", err)
	}

	// 5. Pre-flight check — skip claude if nothing needs LLM
	if triageResult.NeedsLLM == 0 && !triage.HasSubstance(s.db) {
		log.Printf("[syncer] NO-OP — all messages handled deterministically")
		s.gitPush(ctx) // push any triage changes
		s.budget.ResetConsecutiveBlocks()
		log.Printf("[syncer] === sync cycle complete (no-op, %s) ===",
			time.Since(start).Round(time.Millisecond))
		return nil
	}

	// 6. Generate orientation payload
	orientation := s.generateOrientation(ctx)

	// 7. Run claude /sync
	syncStart := time.Now()
	output, err := s.runClaude(ctx, orientation)
	syncDuration := time.Since(syncStart)

	if err != nil {
		log.Printf("[syncer] claude failed (%s): %v", syncDuration, err)

		blocks := s.budget.IncrementConsecutiveBlocks()
		if blocks >= s.config.MaxConsecutiveErrors {
			log.Printf("[syncer] HALT — %d consecutive errors", blocks)
		}

		s.budget.RecordAction("sync", fmt.Sprintf("sync failed (%s)", syncDuration), 1)
		return fmt.Errorf("claude sync failed: %w", err)
	}

	log.Printf("[syncer] claude completed (%s, %d bytes output)",
		syncDuration, len(output))

	// 8. Record success + push
	s.budget.RecordAction("sync",
		fmt.Sprintf("sync completed (%s)", syncDuration.Round(time.Millisecond)), 1)
	s.budget.ResetConsecutiveBlocks()

	if err := s.gitPush(ctx); err != nil {
		log.Printf("[syncer] WARNING: git push failed: %v", err)
		s.budget.RecordAction("git_push", "push failed after sync", 1)
	}

	log.Printf("[syncer] === sync cycle complete (budget: %d, %s total) ===",
		status.Spent+1, time.Since(start).Round(time.Millisecond))
	return nil
}

// gitPull fetches and rebases from origin.
func (s *Syncer) gitPull(ctx context.Context) error {
	// Commit any dirty tracked files first (pre-pull cleanup)
	s.runGit(ctx, "add", "-u")
	s.runGit(ctx, "diff", "--cached", "--quiet")
	// If staged changes exist, commit them
	cmd := exec.CommandContext(ctx, "git", "diff", "--cached", "--quiet")
	cmd.Dir = s.config.ProjectRoot
	if err := cmd.Run(); err != nil {
		// Has staged changes — commit
		s.runGit(ctx, "commit", "-m", "autonomous: pre-pull commit\n\nCo-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>")
	}

	// Fetch and rebase
	if _, err := s.runGitOutput(ctx, "pull", "--rebase", "origin", "main"); err != nil {
		return fmt.Errorf("git pull: %w", err)
	}
	return nil
}

// gitPush pushes to origin.
func (s *Syncer) gitPush(ctx context.Context) error {
	// Check if there are unpushed commits
	head, _ := s.runGitOutput(ctx, "rev-parse", "HEAD")
	remote, _ := s.runGitOutput(ctx, "rev-parse", "origin/main")
	if strings.TrimSpace(head) == strings.TrimSpace(remote) {
		return nil // nothing to push
	}

	if _, err := s.runGitOutput(ctx, "push", "origin", "main"); err != nil {
		return fmt.Errorf("git push: %w", err)
	}
	return nil
}

// generateOrientation builds the context payload for claude /sync.
// Calls orientation-payload.py (Python, ported to Go in Phase 3).
func (s *Syncer) generateOrientation(ctx context.Context) string {
	script := filepath.Join(s.config.ProjectRoot, "scripts", "orientation-payload.py")
	if _, err := os.Stat(script); os.IsNotExist(err) {
		return "" // no orientation script — bare /sync
	}

	cmd := exec.CommandContext(ctx, "python3", script,
		"--agent-id", s.config.AgentID, "--no-cache")
	cmd.Dir = s.config.ProjectRoot
	output, err := cmd.Output()
	if err != nil {
		log.Printf("[syncer] WARNING: orientation-payload.py failed: %v", err)
		return ""
	}
	return string(output)
}

// runClaude invokes claude -p with the sync prompt.
func (s *Syncer) runClaude(ctx context.Context, orientation string) (string, error) {
	prompt := "/sync"
	if orientation != "" {
		prompt = orientation + "\n\n/sync"
	}

	cmd := exec.CommandContext(ctx, "claude", "-p", prompt,
		"--allowedTools", s.config.AllowedTools,
		"--permission-mode", "bypassPermissions",
		"--max-turns", fmt.Sprintf("%d", s.config.MaxTurns))
	cmd.Dir = s.config.ProjectRoot

	output, err := cmd.CombinedOutput()
	if err != nil {
		// Check for rate limiting
		outStr := string(output)
		if isRateLimited(outStr) {
			return outStr, fmt.Errorf("rate limited")
		}
		// Check for max-turns (partial success)
		if isMaxTurns(outStr) {
			log.Printf("[syncer] WARNING: hit max-turns — partial sync")
			return outStr, nil // partial success, not failure
		}
		return outStr, fmt.Errorf("claude exit: %w", err)
	}
	return string(output), nil
}

func (s *Syncer) runGit(ctx context.Context, args ...string) {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = s.config.ProjectRoot
	cmd.Run() // ignore errors for non-critical git ops
}

func (s *Syncer) runGitOutput(ctx context.Context, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = s.config.ProjectRoot
	output, err := cmd.CombinedOutput()
	return string(output), err
}

func isRateLimited(output string) bool {
	lower := strings.ToLower(output)
	return strings.Contains(lower, "rate limit") ||
		strings.Contains(lower, "usage limit") ||
		strings.Contains(lower, "429") ||
		strings.Contains(lower, "you've hit your limit")
}

func isMaxTurns(output string) bool {
	lower := strings.ToLower(output)
	return strings.Contains(lower, "max turns") ||
		strings.Contains(lower, "reached max")
}

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

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

// GcConfig holds configuration for crystallized intelligence handlers.
type GcConfig struct {
	RepoRoot     string // path to operations-agent repo root
	TransportDir string // path to transport/sessions/
	AgentID      string // this agent's identity
	DBPath       string // path to state.db (for Gc learning)
	Logger       *slog.Logger
}

// NewGcHandler builds a GcHandlerFunc that intercepts routine events.
// Returns true (handled) for events that don't require deliberation.
// Returns false for events that need Claude (Gf).
// gcHandleableTypes lists message types that never require Claude reasoning.
// Non-salient stimuli absorbed by Gc (thalamic reticular nucleus (TRN) analog, Crick 1984).
// Ref: psy-session T20 — salience classifier.
var gcHandleableTypes = map[string]bool{
	"session-close":        true,
	"gate-resolution":      true,
	"status-update":        true,
	"capability-handshake": true,
	"capability-response":  true,
	"batch-ack":            true,
	"command-response-ack": true,
}

func NewGcHandler(cfg GcConfig) GcHandlerFunc {
	return func(ctx context.Context, evt Event) bool {
		switch evt.Type {
		case EventPollTick:
			return handlePollTick(cfg)
		case EventHealthCheck:
			return true // health checks handled by meshd health monitor directly
		case EventTransportACK:
			return handleTransportACK(cfg, evt)
		case EventTransportMessage:
			// Fix 1: Selective attention (Broadbent 1958) — filter messages
			// not addressed to this agent. 59% of inbound messages represent
			// copies routed through repos but addressed elsewhere.
			to := evt.Payload["to"]
			if to != "" && to != cfg.AgentID && to != "all" && to != "all-agents" {
				cfg.Logger.Debug("Gc: selective attention — message not for us",
					"to", to, "agent", cfg.AgentID)
				return true // filtered — no deliberation needed
			}
			// Fix 2: Salience classifier (TRN attentional gate) — absorb non-salient
			// message types that never require reasoning.
			msgType := evt.Payload["msg_type"]
			if gcHandleableTypes[msgType] {
				cfg.Logger.Debug("Gc: non-salient message type absorbed",
					"type", msgType, "from", evt.Payload["from"])
				return true
			}
			return false // addressed to us + salient → needs Gf deliberation
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

	// Check for pending remote branches (replaces gh pr list to avoid API rate limits)
	branchCmd := exec.Command("git", "-C", cfg.RepoRoot, "branch", "-r", "--list", "origin/*-ack*")
	branchOut, err := branchCmd.Output()
	if err == nil && len(strings.TrimSpace(string(branchOut))) > 0 {
		ackBranches := strings.TrimSpace(string(branchOut))
		logger.Info("Gc: found remote ACK branches", "branches", ackBranches)
		// Auto-merge disabled — oscillator handles deliberation decisions
		// ACK branches detected but left for manual review

		// If non-ACK branches exist, delegate to Gf
		if hasNonACKPRs(ackBranches) {
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

	// Auto-merge disabled — oscillator handles deliberation decisions.
	// Logged for observability but not auto-merged (avoids gh API rate limits).
	cfg.Logger.Info("Gc: transport ACK detected, logged for review", "pr", prNumber)
	return false
}

// classifyAndMergePRs parses the PR list JSON and auto-merges ACK PRs.
// BUG-13 safety: only merge PRs whose branch ends with "-ack" (not title match).
// This prevents auto-merging diagnostic PRs that happen to contain "ACK" in the title.
func classifyAndMergePRs(cfg GcConfig, prJSON string) bool {
	merged := false
	lines := strings.Split(prJSON, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Strict pattern: branch name must end with "-ack" (in headRefName field)
		// This distinguishes actual ACK PRs from diagnostics/proposals
		isACK := strings.Contains(line, `"-ack"`) ||
			strings.Contains(line, "-ack\t") ||
			strings.Contains(line, "-ack,")

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

		// Auto-merge disabled — avoids gh API rate limits.
		// ACK branches logged for oscillator/human review.
		cfg.Logger.Info("Gc: ACK branch detected", "pr", prNum)
		merged = true // signal that ACKs exist
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

// ── Gc Reinforcement Learning (basal ganglia (habitual selection, Schultz 1997) + cerebellum (forward model, Wolpert 1998)) ──────
// Tracks deliberation outcomes to learn which message types Gc can absorb.
// Promotion: 5+ non-substantive deliberations (short, no output) → Gc handles.
// Demotion: operator/health feedback → removed from Gc.

// InitGcLearning creates the gc_learning table if it doesn't exist.
func InitGcLearning(dbPath string) {
	if dbPath == "" {
		return
	}
	db.Exec(dbPath, `CREATE TABLE IF NOT EXISTS gc_learning (
		message_type TEXT PRIMARY KEY,
		gc_handled_count INTEGER DEFAULT 0,
		deliberated_count INTEGER DEFAULT 0,
		non_substantive_count INTEGER DEFAULT 0,
		promoted INTEGER DEFAULT 0,
		last_promoted_at TEXT,
		last_demoted_at TEXT
	)`)
}

// RecordDeliberation updates Gc learning after a deliberation completes.
// Non-substantive = duration < 30s and exit_code = 0 (no meaningful output).
func RecordDeliberation(dbPath, msgType string, durationMs int, exitCode int) {
	if dbPath == "" || msgType == "" {
		return
	}
	nonSubstantive := 0
	if durationMs < 30000 && exitCode == 0 {
		nonSubstantive = 1
	}
	db.Exec(dbPath, fmt.Sprintf(
		`INSERT INTO gc_learning (message_type, deliberated_count, non_substantive_count)
		 VALUES ('%s', 1, %d)
		 ON CONFLICT(message_type) DO UPDATE SET
		 deliberated_count = deliberated_count + 1,
		 non_substantive_count = non_substantive_count + %d`,
		msgType, nonSubstantive, nonSubstantive))
}

// CheckPromotions checks if any message types should be promoted to Gc.
// Returns promoted types (for logging). Threshold: 5+ observations, 80%+ non-substantive.
func CheckPromotions(dbPath string, logger *slog.Logger) []string {
	if dbPath == "" {
		return nil
	}
	rows, err := db.QueryJSON(dbPath,
		`SELECT message_type, non_substantive_count, deliberated_count FROM gc_learning
		 WHERE promoted = 0 AND deliberated_count >= 5
		 AND CAST(non_substantive_count AS REAL) / deliberated_count > 0.8`)
	if err != nil || len(rows) == 0 {
		return nil
	}
	var promoted []string
	for _, row := range rows {
		msgType := row["message_type"]
		gcHandleableTypes[msgType] = true
		db.Exec(dbPath, fmt.Sprintf(
			`UPDATE gc_learning SET promoted = 1, last_promoted_at = datetime('now')
			 WHERE message_type = '%s'`, msgType))
		logger.Warn("Gc reinforcement: promoted message type",
			"type", msgType,
			"non_substantive", row["non_substantive_count"],
			"deliberated", row["deliberated_count"])
		promoted = append(promoted, msgType)
	}
	return promoted
}

// LoadPromotedTypes loads previously promoted message types from the database
// into the runtime gcHandleableTypes map. Called on startup.
func LoadPromotedTypes(dbPath string, logger *slog.Logger) {
	if dbPath == "" {
		return
	}
	rows, err := db.QueryJSON(dbPath,
		`SELECT message_type FROM gc_learning WHERE promoted = 1`)
	if err != nil {
		return
	}
	for _, row := range rows {
		gcHandleableTypes[row["message_type"]] = true
		logger.Info("Gc: loaded promoted type from db", "type", row["message_type"])
	}
}

// GcLearningStats returns learning metrics for dashboard display.
func GcLearningStats(dbPath string) map[string]any {
	if dbPath == "" {
		return map[string]any{"types_promoted": 0, "types_tracked": 0}
	}
	rows, _ := db.QueryJSON(dbPath,
		`SELECT COUNT(*) as total, SUM(CASE WHEN promoted=1 THEN 1 ELSE 0 END) as promoted FROM gc_learning`)
	if len(rows) == 0 {
		return map[string]any{"types_promoted": 0, "types_tracked": 0}
	}
	return map[string]any{
		"types_promoted": rows[0]["promoted"],
		"types_tracked":  rows[0]["total"],
		"static_types":   len(gcHandleableTypes),
	}
}

// Ensure fmt import used
var _ = fmt.Sprintf

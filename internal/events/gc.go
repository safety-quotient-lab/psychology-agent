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
	"path/filepath"
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
	// EmitEvent injects an event into the dispatcher (used by hippocampal replay).
	// If nil, replay skips event emission (safe default).
	EmitEvent    func(Event)
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
	gcHandled := func(evtType EventType) {
		IncrementGcCounter(cfg.DBPath, string(evtType))
	}
	return func(ctx context.Context, evt Event) bool {
		switch evt.Type {
		case EventPollTick:
			if handlePollTick(cfg) {
				gcHandled(evt.Type)
				return true
			}
			return false
		case EventHealthCheck:
			gcHandled(evt.Type)
			return true
		case EventTransportACK:
			if handleTransportACK(cfg, evt) {
				gcHandled(evt.Type)
				return true
			}
			return false
		case EventTransportMessage:
			// Hippocampal replay events bypass selective attention — they already
			// passed address filtering when originally indexed (psy-session T6).
			// Salience classifier still applies (ACKs absorbed, requests deliberated).
			if evt.Source == "hippocampal-replay" || evt.Payload["replay"] == "true" {
				msgType := evt.Payload["msg_type"]
				if gcHandleableTypes[msgType] {
					cfg.Logger.Debug("Gc: replay event — non-salient type absorbed",
						"type", msgType)
					gcHandled(evt.Type)
					return true
				}
				return false // replay + salient → needs Gf deliberation
			}
			// Fix 1: Selective attention (Broadbent 1958) — filter messages
			// not addressed to this agent. 59% of inbound messages represent
			// copies routed through repos but addressed elsewhere.
			to := evt.Payload["to"]
			if to != "" && to != cfg.AgentID && to != "all" && to != "all-agents" {
				cfg.Logger.Debug("Gc: selective attention — message not for us",
					"to", to, "agent", cfg.AgentID)
				gcHandled(evt.Type)
				return true // filtered — no deliberation needed
			}
			// Fix 2: Salience classifier (TRN attentional gate) — absorb non-salient
			// message types that never require reasoning.
			msgType := evt.Payload["msg_type"]
			if gcHandleableTypes[msgType] {
				cfg.Logger.Debug("Gc: non-salient message type absorbed",
					"type", msgType, "from", evt.Payload["from"])
				gcHandled(evt.Type)
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
		// New commits on main — pull and check if transport files addressed to us
		pullCmd := exec.Command("git", "-C", cfg.RepoRoot, "pull", "--rebase", "origin", "main")
		pullCmd.CombinedOutput()

		// Address-aware pre-check (psy-session T5): only escalate to Gf if
		// new commits contain transport files addressed to this agent.
		// Eliminates 237/1003 wasted deliberations (24%) on observatory.
		diffCmd := exec.Command("git", "-C", cfg.RepoRoot, "diff",
			"--name-only", "HEAD~5..HEAD", "--", "transport/sessions/")
		diffOut, _ := diffCmd.Output()
		changedFiles := strings.TrimSpace(string(diffOut))

		if changedFiles != "" {
			myPrefix := "to-" + cfg.AgentID + "-"
			addressedToUs := false
			for _, line := range strings.Split(changedFiles, "\n") {
				fname := filepath.Base(strings.TrimSpace(line))
				// Files FROM other agents (addressed to us via repo routing)
				if strings.HasPrefix(fname, "from-") && !strings.HasPrefix(fname, "from-"+cfg.AgentID) {
					addressedToUs = true
					break
				}
				// Files explicitly TO this agent
				if strings.Contains(fname, myPrefix) {
					addressedToUs = true
					break
				}
			}
			if addressedToUs {
				logger.Info("Gc: transport files addressed to us — delegating to Gf",
					"files", changedFiles, "agent", cfg.AgentID)
				return false
			}
			logger.Info("Gc: transport commits but not addressed to us — handled",
				"files", changedFiles, "agent", cfg.AgentID)
		} else {
			logger.Info("Gc: new commits (no transport changes)", "commits", newCommits)
		}
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

	// Hippocampal replay (Wilson & McNaughton 1994, psy-session T6):
	// During idle, replay unprocessed transport messages from state.db.
	// Re-emits up to 3 oldest unprocessed messages as transport events.
	replayCount := hippocampalReplay(cfg)
	if replayCount > 0 {
		logger.Info("Gc: hippocampal replay emitted events", "count", replayCount)
		// Replay events feed into dispatcher — poll tick still handled by Gc
	}

	logger.Debug("Gc: poll tick handled — nothing requires deliberation")
	return true
}

// ── Hippocampal Replay (Wilson & McNaughton 1994, psy-session T6) ────────────
// During idle periods, replays unprocessed transport messages from state.db.
// Reactivates neural patterns (events) that the watcher saw but the dispatcher
// never fully processed. Prioritizes ack_required, then oldest first.
// Limit: 3 per cycle to prevent backlog flood.

// InitHippocampalReplay adds replay_count and last_replayed_at columns.
func InitHippocampalReplay(dbPath string) {
	if dbPath == "" {
		return
	}
	db.Exec(dbPath, `ALTER TABLE transport_messages ADD COLUMN replay_count INTEGER DEFAULT 0`)
	db.Exec(dbPath, `ALTER TABLE transport_messages ADD COLUMN last_replayed_at TEXT`)
	db.Exec(dbPath, `CREATE INDEX IF NOT EXISTS idx_unprocessed ON transport_messages (processed, timestamp)`)
}

// hippocampalReplay queries state.db for unprocessed messages and re-emits
// them as transport-message events. Returns the number of events emitted.
func hippocampalReplay(cfg GcConfig) int {
	if cfg.DBPath == "" || cfg.EmitEvent == nil {
		return 0
	}

	// Episodic recall — query unprocessed messages addressed to this agent
	rows, err := db.QueryJSON(cfg.DBPath,
		fmt.Sprintf(`SELECT session_name, filename, from_agent, message_type, subject, timestamp
		 FROM transport_messages
		 WHERE processed = 0
		 ORDER BY
		   CASE WHEN message_type = 'directive' THEN 0
		        WHEN message_type = 'request' THEN 1
		        ELSE 2 END,
		   timestamp ASC
		 LIMIT 3`))
	if err != nil || len(rows) == 0 {
		return 0
	}

	emitted := 0
	for _, row := range rows {
		session := row["session_name"]
		filename := row["filename"]
		from := row["from_agent"]
		msgType := row["message_type"]
		subject := row["subject"]

		// Skip if no meaningful data
		if session == "" && filename == "" {
			continue
		}

		// Pattern reactivation — re-emit as transport-message event
		evt := NewEvent(EventTransportMessage, PriorityNormal, "hippocampal-replay",
			map[string]string{
				"session":  session,
				"filename": filename,
				"from":     from,
				"msg_type": msgType,
				"subject":  subject,
				"replay":   "true",
			})
		cfg.EmitEvent(evt)

		// Update replay count (Zeigarnik priority boost)
		db.Exec(cfg.DBPath, fmt.Sprintf(
			`UPDATE transport_messages SET replay_count = COALESCE(replay_count, 0) + 1,
			 last_replayed_at = datetime('now')
			 WHERE session_name = '%s' AND filename = '%s'`,
			session, filename))

		emitted++
		cfg.Logger.Info("Gc: hippocampal replay — re-emitted",
			"session", session, "filename", filename, "from", from, "type", msgType)
	}

	return emitted
}

// HippocampalReplayStats returns replay metrics for dashboard display.
func HippocampalReplayStats(dbPath string) map[string]any {
	if dbPath == "" {
		return map[string]any{"unprocessed": 0, "stuck": 0, "replayed_total": 0}
	}
	rows, _ := db.QueryJSON(dbPath,
		`SELECT COUNT(*) as unprocessed,
		 SUM(CASE WHEN COALESCE(replay_count, 0) > 3 THEN 1 ELSE 0 END) as stuck,
		 SUM(COALESCE(replay_count, 0)) as replayed_total
		 FROM transport_messages WHERE processed = 0`)
	if len(rows) == 0 {
		return map[string]any{"unprocessed": 0, "stuck": 0, "replayed_total": 0}
	}
	return map[string]any{
		"unprocessed":    rows[0]["unprocessed"],
		"stuck":          rows[0]["stuck"],
		"replayed_total": rows[0]["replayed_total"],
	}
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

// InitGcCounters creates the gc_event_counters table for persistent Gc metrics.
func InitGcCounters(dbPath string) {
	if dbPath == "" {
		return
	}
	db.Exec(dbPath, `CREATE TABLE IF NOT EXISTS gc_event_counters (
		event_type TEXT PRIMARY KEY,
		count INTEGER DEFAULT 0,
		last_counted_at TEXT
	)`)
}

// IncrementGcCounter persists a Gc-handled event count to state.db.
func IncrementGcCounter(dbPath, eventType string) {
	if dbPath == "" {
		return
	}
	db.Exec(dbPath, fmt.Sprintf(
		`INSERT INTO gc_event_counters (event_type, count, last_counted_at)
		 VALUES ('%s', 1, datetime('now'))
		 ON CONFLICT(event_type) DO UPDATE SET
		 count = count + 1, last_counted_at = datetime('now')`,
		eventType))
}

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

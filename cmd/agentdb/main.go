// agentdb — unified state management binary for the psychology agent mesh.
//
// Replaces: dual_write.py, cross_repo_fetch.py, generate_manifest.py,
// bootstrap_state_db.py, export_public_state.py.
//
// Two databases: state.db (project knowledge) + state.local.db (machine-local).
// Schema embedded at compile time from internal/db/schema_*.sql.
package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/safety-quotient-lab/agentdb/internal/cogarch"
	"github.com/safety-quotient-lab/agentdb/internal/db"
	"github.com/safety-quotient-lab/agentdb/internal/gates"
	"github.com/safety-quotient-lab/agentdb/internal/knowledge"
	"github.com/safety-quotient-lab/agentdb/internal/quality"
	"github.com/safety-quotient-lab/agentdb/internal/transport"
	"github.com/spf13/cobra"
)

var mgr *db.Manager

func main() {
	root := &cobra.Command{
		Use:   "agentdb",
		Short: "Psychology agent state management",
		Long:  "Unified state management for the psychology agent mesh. Dual-DB: state.db (shared) + state.local.db (local).",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			// Skip DB init for bootstrap command
			if cmd.Name() == "bootstrap" {
				return nil
			}
			var err error
			mgr, err = db.NewManager()
			if err != nil {
				return fmt.Errorf("init db: %w", err)
			}
			return nil
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			if mgr != nil {
				mgr.Close()
			}
		},
	}

	root.AddCommand(
		bootstrapCmd(),
		// Transport
		indexMessageCmd(),
		markProcessedCmd(),
		nextTurnCmd(),
		inboxCmd(),
		manifestCmd(),
		// Gates
		gateCmd(),
		// Knowledge
		memoryCmd(),
		sessionCmd(),
		decisionCmd(),
		// Cogarch
		triggerFiredCmd(),
		lessonCmd(),
		// Quality
		verifyClaimCmd(),
		resolveFlagCmd(),
		incidentCmd(),
		facetCmd(),
		facetQueryCmd(),
		// Export + Budget
		exportCmd(),
		budgetCmd(),
	)

	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

// ── Bootstrap ─────────────────────────────────────────────────────────

func bootstrapCmd() *cobra.Command {
	var force bool
	cmd := &cobra.Command{
		Use:   "bootstrap",
		Short: "Create or rebuild both databases from embedded schema",
		RunE: func(cmd *cobra.Command, args []string) error {
			m, err := db.Bootstrap(force)
			if err != nil {
				return err
			}
			mgr = m
			fmt.Println("bootstrap complete: state.db + state.local.db")
			return nil
		},
	}
	cmd.Flags().BoolVar(&force, "force", false, "Delete and recreate databases")
	return cmd
}

// ── Transport ─────────────────────────────────────────────────────────

func indexMessageCmd() *cobra.Command {
	var p transport.IndexMessageParams
	var issueURL, threadID, parentThreadID, messageCID, problemType, expiresAt string
	var issueNumber int
	cmd := &cobra.Command{
		Use:   "index-message",
		Short: "Index a transport message in state.db",
		RunE: func(cmd *cobra.Command, args []string) error {
			if issueURL != "" {
				p.IssueURL = &issueURL
			}
			if cmd.Flags().Changed("issue-number") {
				p.IssueNumber = &issueNumber
			}
			if threadID != "" {
				p.ThreadID = &threadID
			}
			if parentThreadID != "" {
				p.ParentThreadID = &parentThreadID
			}
			if messageCID != "" {
				p.MessageCID = &messageCID
			}
			if problemType != "" {
				p.ProblemType = &problemType
			}
			if expiresAt != "" {
				p.ExpiresAt = &expiresAt
			}
			_, err := transport.IndexMessage(mgr.Shared(), mgr.Root(), p)
			return err
		},
	}
	cmd.Flags().StringVar(&p.Session, "session", "", "Session name (required)")
	cmd.Flags().StringVar(&p.Filename, "filename", "", "Filename (required)")
	cmd.Flags().IntVar(&p.Turn, "turn", 0, "Turn number (required)")
	cmd.Flags().StringVar(&p.MessageType, "type", "", "Message type (required)")
	cmd.Flags().StringVar(&p.FromAgent, "from-agent", "", "Sender agent ID (required)")
	cmd.Flags().StringVar(&p.ToAgent, "to-agent", "", "Recipient agent ID (required)")
	cmd.Flags().StringVar(&p.Timestamp, "timestamp", "", "ISO 8601 timestamp (required)")
	cmd.Flags().StringVar(&p.Subject, "subject", "", "Message subject")
	cmd.Flags().IntVar(&p.ClaimsCount, "claims-count", 0, "Number of claims")
	cmd.Flags().Float64Var(&p.SETL, "setl", 0, "SETL score")
	cmd.Flags().StringVar(&p.Urgency, "urgency", "normal", "Urgency level")
	cmd.Flags().StringVar(&issueURL, "issue-url", "", "GitHub issue URL")
	cmd.Flags().IntVar(&issueNumber, "issue-number", 0, "GitHub issue number")
	cmd.Flags().BoolVar(&p.IssuePending, "issue-pending", false, "Issue creation pending")
	cmd.Flags().StringVar(&threadID, "thread-id", "", "Thread ID")
	cmd.Flags().StringVar(&parentThreadID, "parent-thread-id", "", "Parent thread ID")
	cmd.Flags().StringVar(&messageCID, "message-cid", "", "Content-addressable ID")
	cmd.Flags().StringVar(&problemType, "problem-type", "", "Problem report type")
	cmd.Flags().StringVar(&p.TaskState, "task-state", "pending", "Task lifecycle state")
	cmd.Flags().StringVar(&expiresAt, "expires-at", "", "Expiration timestamp")
	cmd.MarkFlagRequired("session")
	cmd.MarkFlagRequired("filename")
	cmd.MarkFlagRequired("turn")
	cmd.MarkFlagRequired("type")
	cmd.MarkFlagRequired("from-agent")
	cmd.MarkFlagRequired("to-agent")
	cmd.MarkFlagRequired("timestamp")
	return cmd
}

func markProcessedCmd() *cobra.Command {
	var session, filename string
	cmd := &cobra.Command{
		Use:   "mark-processed",
		Short: "Mark a transport message as processed",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := transport.MarkProcessed(mgr.Shared(), session, filename)
			return err
		},
	}
	cmd.Flags().StringVar(&session, "session", "", "Session name")
	cmd.Flags().StringVar(&filename, "filename", "", "Filename (required)")
	cmd.MarkFlagRequired("filename")
	return cmd
}

func nextTurnCmd() *cobra.Command {
	var session string
	cmd := &cobra.Command{
		Use:   "next-turn",
		Short: "Print the next available turn number for a session",
		RunE: func(cmd *cobra.Command, args []string) error {
			turn, err := transport.NextTurn(mgr.Shared(), session)
			if err != nil {
				return err
			}
			fmt.Println(turn)
			return nil
		},
	}
	cmd.Flags().StringVar(&session, "session", "", "Session name (required)")
	cmd.MarkFlagRequired("session")
	return cmd
}

func inboxCmd() *cobra.Command {
	var agent string
	var doIndex, doMaterialize, force, jsonOutput bool
	cmd := &cobra.Command{
		Use:   "inbox",
		Short: "Scan peer repos for new inbound messages",
		RunE: func(cmd *cobra.Command, args []string) error {
			results, err := transport.Inbox(mgr.Shared(), mgr.Root(),
				agent, doIndex, doMaterialize, force)
			if err != nil {
				return err
			}
			if jsonOutput {
				data, _ := json.MarshalIndent(results, "", "  ")
				fmt.Println(string(data))
				return nil
			}
			// Human-readable output
			for _, r := range results {
				fmt.Printf("\n%s\n", "────────────────────────────────────────────────────────────")
				fmt.Printf("Agent: %s (remote: %s) [%s]\n", r.AgentID, r.RemoteName, r.ActivityTier)
				if r.Skipped {
					fmt.Printf("  SKIPPED: %s\n", r.SkipReason)
					continue
				}
				fetchMark := "✗"
				if r.FetchOK {
					fetchMark = "✓"
				}
				manifestMark := "✗ not found"
				if r.ManifestFound {
					manifestMark = "✓ found"
				}
				fmt.Printf("  Fetch: %s\n", fetchMark)
				fmt.Printf("  MANIFEST: %s\n", manifestMark)
				for _, s := range r.SessionsScanned {
					marker := ""
					if s.NewFiles > 0 {
						marker = fmt.Sprintf(" ← %d NEW", s.NewFiles)
					}
					fmt.Printf("  Session %s: %d files, %d inbound%s\n",
						s.SessionName, s.TotalFiles, s.InboundFiles, marker)
				}
				for _, msg := range r.NewMessages {
					matLabel := ""
					if msg.MaterializedAs != "" {
						matLabel = fmt.Sprintf(" → %s", msg.MaterializedAs)
					}
					fmt.Printf("    NEW: %s (turn %d, %s) — %s%s\n",
						msg.Filename, msg.Turn, msg.MessageType, msg.Subject, matLabel)
				}
				for _, e := range r.Errors {
					fmt.Printf("  ERROR: %s\n", e)
				}
			}
			if len(results) == 0 {
				fmt.Println("No cross-repo-fetch agents found in registry.")
			}
			return nil
		},
	}
	cmd.Flags().StringVar(&agent, "agent", "", "Scan a specific agent only")
	cmd.Flags().BoolVar(&doIndex, "index", false, "Index new messages (implies --materialize)")
	cmd.Flags().BoolVar(&doMaterialize, "materialize", false, "Copy inbound messages locally")
	cmd.Flags().BoolVar(&force, "force", false, "Fetch all peers regardless of activity tier")
	cmd.Flags().BoolVar(&jsonOutput, "json", false, "Output as JSON")
	return cmd
}

func manifestCmd() *cobra.Command {
	var dryRun bool
	cmd := &cobra.Command{
		Use:   "manifest",
		Short: "Generate transport/MANIFEST.json from state.db",
		RunE: func(cmd *cobra.Command, args []string) error {
			return transport.WriteManifest(mgr.Shared(), mgr.Root(), dryRun)
		},
	}
	cmd.Flags().BoolVar(&dryRun, "dry-run", false, "Print to stdout without writing")
	return cmd
}

// ── Gates ─────────────────────────────────────────────────────────────

func gateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "gate",
		Short: "Manage gated autonomous chains",
	}
	cmd.AddCommand(gateOpenCmd(), gateResolveCmd(), gateTimeoutCmd(), gateStatusCmd())
	return cmd
}

func gateOpenCmd() *cobra.Command {
	var p gates.OpenGateParams
	cmd := &cobra.Command{
		Use:   "open",
		Short: "Open a gated chain",
		RunE: func(cmd *cobra.Command, args []string) error {
			return gates.Open(mgr.Local(), p)
		},
	}
	cmd.Flags().StringVar(&p.GateID, "gate-id", "", "Gate identifier (required)")
	cmd.Flags().StringVar(&p.SendingAgent, "sending-agent", "", "Sending agent (required)")
	cmd.Flags().StringVar(&p.ReceivingAgent, "receiving-agent", "", "Receiving agent (required)")
	cmd.Flags().StringVar(&p.Session, "session", "", "Session name (required)")
	cmd.Flags().StringVar(&p.Filename, "filename", "", "Outbound filename (required)")
	cmd.Flags().StringVar(&p.BlocksUntil, "blocks-until", "response", "Block condition")
	cmd.Flags().IntVar(&p.TimeoutMinutes, "timeout-minutes", 60, "Timeout in minutes")
	cmd.Flags().StringVar(&p.FallbackAction, "fallback-action", "continue-without-response", "Fallback action")
	cmd.MarkFlagRequired("gate-id")
	cmd.MarkFlagRequired("sending-agent")
	cmd.MarkFlagRequired("receiving-agent")
	cmd.MarkFlagRequired("session")
	cmd.MarkFlagRequired("filename")
	return cmd
}

func gateResolveCmd() *cobra.Command {
	var gateID, resolvedBy string
	cmd := &cobra.Command{
		Use:   "resolve",
		Short: "Resolve a waiting gate",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := gates.Resolve(mgr.Local(), gateID, resolvedBy)
			return err
		},
	}
	cmd.Flags().StringVar(&gateID, "gate-id", "", "Gate identifier (required)")
	cmd.Flags().StringVar(&resolvedBy, "resolved-by", "", "Resolution source (required)")
	cmd.MarkFlagRequired("gate-id")
	cmd.MarkFlagRequired("resolved-by")
	return cmd
}

func gateTimeoutCmd() *cobra.Command {
	var gateID string
	cmd := &cobra.Command{
		Use:   "timeout",
		Short: "Mark a gate as timed out",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := gates.Timeout(mgr.Local(), gateID)
			return err
		},
	}
	cmd.Flags().StringVar(&gateID, "gate-id", "", "Gate identifier (required)")
	cmd.MarkFlagRequired("gate-id")
	return cmd
}

func gateStatusCmd() *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "status",
		Short: "Show active gates (JSON)",
		RunE: func(cmd *cobra.Command, args []string) error {
			status, err := gates.QueryStatus(mgr.Local(), agentID)
			if err != nil {
				return err
			}
			gates.PrintStatusJSON(status)
			return nil
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Filter by agent")
	return cmd
}

// ── Knowledge ─────────────────────────────────────────────────────────

func memoryCmd() *cobra.Command {
	var topic, key, value string
	var status string
	var sessionID int
	cmd := &cobra.Command{
		Use:   "memory",
		Short: "Upsert a memory entry (state.local.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			var statusPtr *string
			if cmd.Flags().Changed("status") {
				statusPtr = &status
			}
			var sessionPtr *int
			if cmd.Flags().Changed("session-id") {
				sessionPtr = &sessionID
			}
			return knowledge.UpsertMemory(mgr.Local(), topic, key, value, statusPtr, sessionPtr)
		},
	}
	cmd.Flags().StringVar(&topic, "topic", "", "Topic name (required)")
	cmd.Flags().StringVar(&key, "key", "", "Entry key (required)")
	cmd.Flags().StringVar(&value, "value", "", "Entry value (required)")
	cmd.Flags().StringVar(&status, "status", "", "Status marker")
	cmd.Flags().IntVar(&sessionID, "session-id", 0, "Associated session ID")
	cmd.MarkFlagRequired("topic")
	cmd.MarkFlagRequired("key")
	cmd.MarkFlagRequired("value")
	return cmd
}

func sessionCmd() *cobra.Command {
	var id int
	var timestamp, summary string
	var artifacts, flags string
	cmd := &cobra.Command{
		Use:   "session",
		Short: "Upsert a session log entry (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			var artPtr, flagsPtr *string
			if cmd.Flags().Changed("artifacts") {
				artPtr = &artifacts
			}
			if cmd.Flags().Changed("flags") {
				flagsPtr = &flags
			}
			return knowledge.UpsertSession(mgr.Shared(), id, timestamp, summary, artPtr, flagsPtr)
		},
	}
	cmd.Flags().IntVar(&id, "id", 0, "Session ID (required)")
	cmd.Flags().StringVar(&timestamp, "timestamp", "", "ISO 8601 timestamp (required)")
	cmd.Flags().StringVar(&summary, "summary", "", "Session summary (required)")
	cmd.Flags().StringVar(&artifacts, "artifacts", "", "Session artifacts")
	cmd.Flags().StringVar(&flags, "flags", "", "Epistemic flags")
	cmd.MarkFlagRequired("id")
	cmd.MarkFlagRequired("timestamp")
	cmd.MarkFlagRequired("summary")
	return cmd
}

func decisionCmd() *cobra.Command {
	var key, text, date string
	var source string
	var confidence float64
	cmd := &cobra.Command{
		Use:   "decision",
		Short: "Upsert a design decision (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			var srcPtr *string
			if cmd.Flags().Changed("source") {
				srcPtr = &source
			}
			var confPtr *float64
			if cmd.Flags().Changed("confidence") {
				confPtr = &confidence
			}
			return knowledge.UpsertDecision(mgr.Shared(), key, text, date, srcPtr, confPtr)
		},
	}
	cmd.Flags().StringVar(&key, "key", "", "Decision key (required)")
	cmd.Flags().StringVar(&text, "text", "", "Decision text (required)")
	cmd.Flags().StringVar(&date, "date", "", "Decision date (required)")
	cmd.Flags().StringVar(&source, "source", "", "Evidence source")
	cmd.Flags().Float64Var(&confidence, "confidence", 0, "Confidence score")
	cmd.MarkFlagRequired("key")
	cmd.MarkFlagRequired("text")
	cmd.MarkFlagRequired("date")
	return cmd
}

// ── Cogarch ───────────────────────────────────────────────────────────

func triggerFiredCmd() *cobra.Command {
	var triggerID string
	cmd := &cobra.Command{
		Use:   "trigger-fired",
		Short: "Record a trigger firing (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			return cogarch.FireTrigger(mgr.Shared(), triggerID)
		},
	}
	cmd.Flags().StringVar(&triggerID, "trigger-id", "", "Trigger ID, e.g. T1 (required)")
	cmd.MarkFlagRequired("trigger-id")
	return cmd
}

func lessonCmd() *cobra.Command {
	var p cogarch.UpsertLessonParams
	var patternType, domain, severity, triggerRelevant, promotionStatus, lessonText string
	cmd := &cobra.Command{
		Use:   "lesson",
		Short: "Upsert a lesson entry (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			if cmd.Flags().Changed("pattern-type") {
				p.PatternType = &patternType
			}
			if cmd.Flags().Changed("domain") {
				p.Domain = &domain
			}
			if cmd.Flags().Changed("severity") {
				p.Severity = &severity
			}
			if cmd.Flags().Changed("trigger-relevant") {
				p.TriggerRelevant = &triggerRelevant
			}
			if cmd.Flags().Changed("promotion-status") {
				p.PromotionStatus = &promotionStatus
			}
			if cmd.Flags().Changed("lesson-text") {
				p.LessonText = &lessonText
			}
			return cogarch.UpsertLesson(mgr.Shared(), p)
		},
	}
	cmd.Flags().StringVar(&p.Title, "title", "", "Lesson title (required)")
	cmd.Flags().StringVar(&p.Date, "date", "", "Lesson date (required)")
	cmd.Flags().StringVar(&patternType, "pattern-type", "", "Pattern type")
	cmd.Flags().StringVar(&domain, "domain", "", "Domain")
	cmd.Flags().StringVar(&severity, "severity", "", "Severity")
	cmd.Flags().IntVar(&p.Recurrence, "recurrence", 1, "Recurrence count")
	cmd.Flags().StringVar(&triggerRelevant, "trigger-relevant", "", "Relevant trigger")
	cmd.Flags().StringVar(&promotionStatus, "promotion-status", "", "Promotion status")
	cmd.Flags().StringVar(&lessonText, "lesson-text", "", "Lesson narrative")
	cmd.MarkFlagRequired("title")
	cmd.MarkFlagRequired("date")
	return cmd
}

// ── Quality ───────────────────────────────────────────────────────────

func verifyClaimCmd() *cobra.Command {
	var claimID int
	var failed bool
	cmd := &cobra.Command{
		Use:   "verify-claim",
		Short: "Mark a claim as verified (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := quality.VerifyClaim(mgr.Shared(), claimID, failed)
			return err
		},
	}
	cmd.Flags().IntVar(&claimID, "claim-id", 0, "Claim ID (required)")
	cmd.Flags().BoolVar(&failed, "failed", false, "Mark as failed instead of verified")
	cmd.MarkFlagRequired("claim-id")
	return cmd
}

func resolveFlagCmd() *cobra.Command {
	var flagID int
	var resolvedBy string
	cmd := &cobra.Command{
		Use:   "resolve-flag",
		Short: "Mark an epistemic flag as resolved (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := quality.ResolveFlag(mgr.Shared(), flagID, resolvedBy)
			return err
		},
	}
	cmd.Flags().IntVar(&flagID, "flag-id", 0, "Flag ID (required)")
	cmd.Flags().StringVar(&resolvedBy, "resolved-by", "", "Resolution source (required)")
	cmd.MarkFlagRequired("flag-id")
	cmd.MarkFlagRequired("resolved-by")
	return cmd
}

func incidentCmd() *cobra.Command {
	var p quality.RecordIncidentParams
	var toolName, toolContext string
	var sessionID int
	cmd := &cobra.Command{
		Use:   "incident",
		Short: "Record an engineering incident (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			if cmd.Flags().Changed("tool-name") {
				p.ToolName = &toolName
			}
			if cmd.Flags().Changed("tool-context") {
				p.ToolContext = &toolContext
			}
			if cmd.Flags().Changed("session-id") {
				p.SessionID = &sessionID
			}
			return quality.RecordIncident(mgr.Shared(), p)
		},
	}
	cmd.Flags().StringVar(&p.IncidentType, "incident-type", "", "Incident category (required)")
	cmd.Flags().StringVar(&p.Description, "description", "", "Description (required)")
	cmd.Flags().IntVar(&sessionID, "session-id", 0, "Session ID")
	cmd.Flags().StringVar(&p.Severity, "severity", "moderate", "Severity level")
	cmd.Flags().StringVar(&toolName, "tool-name", "", "Tool that triggered detection")
	cmd.Flags().StringVar(&toolContext, "tool-context", "", "Context that triggered detection")
	cmd.Flags().IntVar(&p.DetectionTier, "detection-tier", 1, "Detection tier (1=hook, 2=cognitive)")
	cmd.MarkFlagRequired("incident-type")
	cmd.MarkFlagRequired("description")
	return cmd
}

func facetCmd() *cobra.Command {
	var entityType string
	var entityID int
	var facetType, facetValue string
	cmd := &cobra.Command{
		Use:   "facet",
		Short: "Add a universal facet (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			return quality.AddFacet(mgr.Shared(), entityType, entityID, facetType, facetValue)
		},
	}
	cmd.Flags().StringVar(&entityType, "entity-type", "", "Table name (required)")
	cmd.Flags().IntVar(&entityID, "entity-id", 0, "Row ID (required)")
	cmd.Flags().StringVar(&facetType, "facet-type", "", "Facet type (required)")
	cmd.Flags().StringVar(&facetValue, "facet-value", "", "Facet value (required)")
	cmd.MarkFlagRequired("entity-type")
	cmd.MarkFlagRequired("entity-id")
	cmd.MarkFlagRequired("facet-type")
	cmd.MarkFlagRequired("facet-value")
	return cmd
}

func facetQueryCmd() *cobra.Command {
	var facetType, facetValue string
	cmd := &cobra.Command{
		Use:   "facet-query",
		Short: "Query entities by facet (state.db)",
		RunE: func(cmd *cobra.Command, args []string) error {
			results, err := quality.QueryFacets(mgr.Shared(), facetType, facetValue)
			if err != nil {
				return err
			}
			quality.PrintFacetQueryJSON(results)
			return nil
		},
	}
	cmd.Flags().StringVar(&facetType, "facet-type", "", "Facet type (required)")
	cmd.Flags().StringVar(&facetValue, "facet-value", "", "Facet value (required)")
	cmd.MarkFlagRequired("facet-type")
	cmd.MarkFlagRequired("facet-value")
	return cmd
}

// ── Export ─────────────────────────────────────────────────────────────

func exportCmd() *cobra.Command {
	var profile, output string
	var dryRun bool
	cmd := &cobra.Command{
		Use:   "export",
		Short: "Export state.db to a profile-filtered database",
		RunE: func(cmd *cobra.Command, args []string) error {
			return db.Export(mgr.Shared(), mgr.Root(), db.ExportProfile(profile), output, dryRun)
		},
	}
	cmd.Flags().StringVar(&profile, "profile", "seed", "Export profile: seed|release|licensed|full")
	cmd.Flags().StringVar(&output, "output", "", "Output path (default: state-public.db)")
	cmd.Flags().BoolVar(&dryRun, "dry-run", false, "Print plan without writing")
	return cmd
}

// ── Budget ────────────────────────────────────────────────────────────

func budgetCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "budget",
		Short: "Manage autonomy budget (state.local.db)",
	}
	cmd.AddCommand(
		budgetStatusCmd(),
		budgetHistoryCmd(),
		budgetResetCmd(),
		budgetPauseAllCmd(),
		budgetResumeAllCmd(),
	)
	return cmd
}

func budgetStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Show current budget for all agents",
		RunE: func(cmd *cobra.Command, args []string) error {
			return db.BudgetStatus(mgr.Local())
		},
	}
}

func budgetHistoryCmd() *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "history",
		Short: "Show recent autonomous actions",
		RunE: func(cmd *cobra.Command, args []string) error {
			return db.BudgetHistory(mgr.Local(), agentID)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent", "", "Agent ID (required)")
	cmd.MarkFlagRequired("agent")
	return cmd
}

func budgetResetCmd() *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "reset",
		Short: "Reset an agent's budget to maximum",
		RunE: func(cmd *cobra.Command, args []string) error {
			return db.BudgetReset(mgr.Local(), agentID)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent", "", "Agent ID (required)")
	cmd.MarkFlagRequired("agent")
	return cmd
}

func budgetPauseAllCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "pause-all",
		Short: "Zero all agent budgets (soft circuit breaker)",
		RunE: func(cmd *cobra.Command, args []string) error {
			return db.BudgetPauseAll(mgr.Local())
		},
	}
}

func budgetResumeAllCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "resume-all",
		Short: "Restore all agent budgets to maximum",
		RunE: func(cmd *cobra.Command, args []string) error {
			return db.BudgetResumeAll(mgr.Local())
		},
	}
}

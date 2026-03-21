// Package budget implements the autonomy budget management system.
// Spend-counter model: budget_spent increments, budget_cutoff sets limit.
// Ported from autonomous-sync.sh check_budget() + record_action() + check_interval().
package budget

import (
	"fmt"
	"log"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Manager handles autonomy budget checks, interval enforcement,
// and action recording for an agent.
type Manager struct {
	agentID  string
	database *db.DB // state.db (shared, meshd reads budget from here)
	localDB  *db.DB // state.local.db (machine-local, action audit trail)
}

// New creates a budget manager for the given agent.
func New(agentID string, database, localDB *db.DB) *Manager {
	return &Manager{
		agentID:  agentID,
		database: database,
		localDB:  localDB,
	}
}

// EnsureRow creates the autonomy_budget row if missing.
func (m *Manager) EnsureRow() error {
	_, err := m.database.Exec(
		"INSERT OR IGNORE INTO autonomy_budget (agent_id) VALUES (?)",
		m.agentID)
	if err != nil {
		return fmt.Errorf("ensure budget row in state.db: %w", err)
	}
	if m.localDB != nil {
		_, err = m.localDB.Exec(
			"INSERT OR IGNORE INTO autonomy_budget (agent_id) VALUES (?)",
			m.agentID)
		if err != nil {
			return fmt.Errorf("ensure budget row in state.local.db: %w", err)
		}
	}
	return nil
}

// Status holds the current budget state.
type Status struct {
	Spent             int
	Cutoff            int    // 0 = unlimited
	LastAction        string // ISO 8601 timestamp or empty
	ConsecutiveBlocks int
	Sedated           bool
	MinActionInterval int // seconds
}

// Check reads the current budget status. Returns an error if budget exhausted.
func (m *Manager) Check() (Status, error) {
	rows, err := m.database.QueryRows(
		`SELECT COALESCE(budget_spent, 0),
		        COALESCE(budget_cutoff, 0),
		        COALESCE(last_action, ''),
		        COALESCE(consecutive_blocks, 0),
		        COALESCE(sleep_mode, 0),
		        COALESCE(min_action_interval, 300)
		 FROM autonomy_budget WHERE agent_id = ?`, m.agentID)
	if err != nil {
		return Status{}, fmt.Errorf("query budget: %w", err)
	}
	if len(rows) == 0 {
		return Status{MinActionInterval: 300}, nil
	}

	row := rows[0]
	status := Status{
		Spent:             toInt(row["COALESCE(budget_spent, 0)"]),
		Cutoff:            toInt(row["COALESCE(budget_cutoff, 0)"]),
		LastAction:        toString(row["COALESCE(last_action, '')"]),
		ConsecutiveBlocks: toInt(row["COALESCE(consecutive_blocks, 0)"]),
		Sedated:           toInt(row["COALESCE(sleep_mode, 0)"]) == 1,
		MinActionInterval: toInt(row["COALESCE(min_action_interval, 300)"]),
	}

	// Check exhaustion (cutoff 0 = unlimited)
	if status.Cutoff > 0 && status.Spent >= status.Cutoff {
		return status, fmt.Errorf("budget exhausted (%d/%d spent)", status.Spent, status.Cutoff)
	}

	return status, nil
}

// CheckInterval returns true if enough time has elapsed since last action.
// Returns false (defer) if too soon. Accelerated interval used when
// gateAccelerated is true (pending handoffs awaiting response).
func (m *Manager) CheckInterval(gateAccelerated bool) (bool, time.Duration) {
	status, err := m.Check()
	if err != nil {
		return false, 0 // budget exhausted — don't allow
	}

	if status.LastAction == "" {
		return true, 0 // never acted — allow
	}

	lastAction, err := time.Parse("2006-01-02T15:04:05", status.LastAction)
	if err != nil {
		// Try alternate format
		lastAction, err = time.Parse(time.RFC3339, status.LastAction)
		if err != nil {
			return true, 0 // can't parse — allow
		}
	}

	elapsed := time.Since(lastAction)
	interval := time.Duration(status.MinActionInterval) * time.Second

	if gateAccelerated {
		interval = 60 * time.Second // gate-aware fast lane
	}

	if elapsed < interval {
		remaining := interval - elapsed
		return false, remaining
	}

	return true, 0
}

// RecordAction logs an action to the audit trail and updates budget.
func (m *Manager) RecordAction(actionType, description string, tier int) error {
	status, _ := m.Check()

	cost := 0
	if tier == 1 {
		cost = 1
	} else if tier == 2 {
		cost = 3
	}

	newSpent := status.Spent + cost

	// Record in state.db (shared, visible to meshd)
	_, err := m.database.Exec(
		`UPDATE autonomy_budget
		 SET budget_spent = ?,
		     last_action = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
		 WHERE agent_id = ?`,
		newSpent, m.agentID)
	if err != nil {
		return fmt.Errorf("update budget: %w", err)
	}

	// Record action in audit trail
	db := m.localDB
	if db == nil {
		db = m.database
	}
	_, err = db.Exec(
		`INSERT INTO autonomous_actions
		 (agent_id, action_type, description, budget_before, budget_after, timestamp)
		 VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))`,
		m.agentID, actionType, description, status.Spent, newSpent)
	if err != nil {
		log.Printf("[budget] warning: failed to record action: %v", err)
	}

	return nil
}

// ResetConsecutiveBlocks clears the consecutive error counter.
func (m *Manager) ResetConsecutiveBlocks() {
	m.database.Exec(
		"UPDATE autonomy_budget SET consecutive_blocks = 0 WHERE agent_id = ?",
		m.agentID)
}

// IncrementConsecutiveBlocks increments the consecutive error counter.
// Returns the new count.
func (m *Manager) IncrementConsecutiveBlocks() int {
	m.database.Exec(
		"UPDATE autonomy_budget SET consecutive_blocks = consecutive_blocks + 1 WHERE agent_id = ?",
		m.agentID)
	return m.database.ScalarInt(
		"SELECT consecutive_blocks FROM autonomy_budget WHERE agent_id = ?",
		m.agentID)
}

func toInt(v any) int {
	switch val := v.(type) {
	case int64:
		return int(val)
	case float64:
		return int(val)
	default:
		return 0
	}
}

func toString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

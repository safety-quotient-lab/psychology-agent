// Package db — autonomy budget management.
// Budget lives in state.local.db (machine-local, never shared).
// This module absorbs scripts/autonomy-budget.py.
package db

import (
	"database/sql"
	"fmt"
	"os"
)

// BudgetStatus prints the current autonomy budget for all agents.
func BudgetStatus(localDB *sql.DB) error {
	rows, err := localDB.Query("SELECT agent_id, budget_max, budget_current, last_audit, last_action, consecutive_blocks FROM autonomy_budget ORDER BY agent_id")
	if err != nil {
		return fmt.Errorf("query budget: %w", err)
	}
	defer rows.Close()

	found := false
	fmt.Println("Autonomy Budget Status")
	fmt.Println("────────────────────────────────────────────────────────────")
	for rows.Next() {
		found = true
		var agentID string
		var budgetMax, budgetCurrent, consecutiveBlocks int
		var lastAudit string
		var lastAction sql.NullString
		if err := rows.Scan(&agentID, &budgetMax, &budgetCurrent, &lastAudit, &lastAction, &consecutiveBlocks); err != nil {
			continue
		}
		status := "ACTIVE"
		if budgetCurrent <= 0 {
			status = "HALTED"
		}
		la := "none"
		if lastAction.Valid {
			la = lastAction.String
		}
		fmt.Printf("  Agent:       %s\n", agentID)
		fmt.Printf("  Budget:      %d / %d  [%s]\n", budgetCurrent, budgetMax, status)
		fmt.Printf("  Last audit:  %s\n", lastAudit)
		fmt.Printf("  Last action: %s\n", la)
		fmt.Printf("  Consec. blocks: %d\n\n", consecutiveBlocks)
	}
	if !found {
		fmt.Println("No autonomy budget entries found.")
		fmt.Println("Budget entries get created on first autonomous sync run.")
	}
	return nil
}

// BudgetHistory shows recent autonomous actions for an agent.
func BudgetHistory(localDB *sql.DB, agentID string) error {
	rows, err := localDB.Query(`
		SELECT created_at, evaluator_tier, action_class, action_type,
			   evaluator_result, description, budget_before, budget_after
		FROM autonomous_actions
		WHERE agent_id = ?
		ORDER BY created_at DESC
		LIMIT 20`, agentID)
	if err != nil {
		return fmt.Errorf("query history: %w", err)
	}
	defer rows.Close()

	found := false
	fmt.Printf("Recent actions for %s (last 20):\n", agentID)
	fmt.Println("────────────────────────────────────────────────────────────")
	for rows.Next() {
		found = true
		var createdAt, actionClass, actionType, evalResult, description string
		var evalTier, budgetBefore, budgetAfter int
		if err := rows.Scan(&createdAt, &evalTier, &actionClass, &actionType,
			&evalResult, &description, &budgetBefore, &budgetAfter); err != nil {
			continue
		}
		marker := "✓"
		if evalResult != "approved" {
			marker = "✗"
		}
		descTrunc := description
		if len(descTrunc) > 70 {
			descTrunc = descTrunc[:70]
		}
		fmt.Printf("  %s [%s] T%d %s/%s\n", marker, createdAt, evalTier, actionClass, actionType)
		fmt.Printf("    %s\n", descTrunc)
		fmt.Printf("    Budget: %d → %d\n", budgetBefore, budgetAfter)
	}
	if !found {
		fmt.Printf("No autonomous actions recorded for '%s'.\n", agentID)
	}
	return nil
}

// BudgetPauseAll zeros all agent budgets (soft circuit breaker).
func BudgetPauseAll(localDB *sql.DB) error {
	rows, err := localDB.Query("SELECT agent_id, budget_current FROM autonomy_budget ORDER BY agent_id")
	if err != nil {
		return fmt.Errorf("query budget: %w", err)
	}
	defer rows.Close()

	type agent struct {
		id      string
		current int
	}
	var agents []agent
	for rows.Next() {
		var a agent
		rows.Scan(&a.id, &a.current)
		agents = append(agents, a)
	}
	rows.Close()

	if len(agents) == 0 {
		fmt.Println("No autonomy budget entries found — nothing to pause.")
		return nil
	}

	updated := 0
	for _, a := range agents {
		if a.current > 0 {
			localDB.Exec(`
				UPDATE autonomy_budget
				SET budget_current = 0,
					updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
				WHERE agent_id = ?`, a.id)
			fmt.Printf("  %s: budget %d → 0\n", a.id, a.current)
			updated++
		} else {
			fmt.Printf("  %s: already at 0\n", a.id)
		}
	}
	fmt.Printf("\nPaused %d agent(s). All autonomous actions will halt at next sync cycle.\n", updated)
	return nil
}

// BudgetResumeAll restores all agent budgets to maximum.
func BudgetResumeAll(localDB *sql.DB) error {
	rows, err := localDB.Query("SELECT agent_id, budget_max, budget_current FROM autonomy_budget ORDER BY agent_id")
	if err != nil {
		return fmt.Errorf("query budget: %w", err)
	}
	defer rows.Close()

	type agent struct {
		id      string
		max     int
		current int
	}
	var agents []agent
	for rows.Next() {
		var a agent
		rows.Scan(&a.id, &a.max, &a.current)
		agents = append(agents, a)
	}
	rows.Close()

	if len(agents) == 0 {
		fmt.Println("No autonomy budget entries found — nothing to resume.")
		return nil
	}

	updated := 0
	for _, a := range agents {
		if a.current < a.max {
			localDB.Exec(`
				UPDATE autonomy_budget
				SET budget_current = budget_max,
					consecutive_blocks = 0,
					last_audit = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
					updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
				WHERE agent_id = ?`, a.id)
			fmt.Printf("  %s: budget %d → %d\n", a.id, a.current, a.max)
			updated++
		} else {
			fmt.Printf("  %s: already at maximum (%d)\n", a.id, a.max)
		}
	}
	fmt.Printf("\nResumed %d agent(s). Autonomous actions will proceed at next sync cycle.\n", updated)
	return nil
}

// BudgetReset resets a single agent's budget to maximum (non-interactive).
func BudgetReset(localDB *sql.DB, agentID string) error {
	result, err := localDB.Exec(`
		UPDATE autonomy_budget
		SET budget_current = budget_max,
			consecutive_blocks = 0,
			last_audit = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
			updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
		WHERE agent_id = ?`, agentID)
	if err != nil {
		return fmt.Errorf("reset budget: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "No budget entry for '%s'.\n", agentID)
		return fmt.Errorf("no budget entry for %s", agentID)
	}

	var budgetCurrent, budgetMax int
	localDB.QueryRow("SELECT budget_current, budget_max FROM autonomy_budget WHERE agent_id = ?", agentID).Scan(&budgetCurrent, &budgetMax)
	fmt.Printf("Budget reset: %d / %d for %s\n", budgetCurrent, budgetMax, agentID)
	return nil
}

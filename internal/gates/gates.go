// Package gates manages gated autonomous chain operations.
// Gates live in state.local.db (machine-local state).
package gates

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
)

// OpenGateParams holds parameters for opening a gate.
type OpenGateParams struct {
	GateID         string
	SendingAgent   string
	ReceivingAgent string
	Session        string
	Filename       string
	BlocksUntil    string
	TimeoutMinutes int
	FallbackAction string
}

// Open opens a gated chain — blocks until response, ACK, or timeout.
func Open(db *sql.DB, p OpenGateParams) error {
	if p.BlocksUntil == "" {
		p.BlocksUntil = "response"
	}
	if p.TimeoutMinutes <= 0 {
		p.TimeoutMinutes = 60
	}
	if p.FallbackAction == "" {
		p.FallbackAction = "continue-without-response"
	}
	// Cap at 24 hours
	if p.TimeoutMinutes > 1440 {
		p.TimeoutMinutes = 1440
	}

	_, err := db.Exec(`
		INSERT OR REPLACE INTO active_gates
			(gate_id, sending_agent, receiving_agent, session_name,
			 outbound_filename, blocks_until, timeout_minutes,
			 fallback_action, status, timeout_at)
		VALUES (?, ?, ?, ?, ?, ?, ?,
				?, 'waiting',
				strftime('%Y-%m-%dT%H:%M:%S',
						 datetime('now', 'localtime', '+' || ? || ' minutes')))`,
		p.GateID, p.SendingAgent, p.ReceivingAgent,
		p.Session, p.Filename, p.BlocksUntil,
		p.TimeoutMinutes, p.FallbackAction,
		fmt.Sprintf("%d", p.TimeoutMinutes),
	)
	if err != nil {
		return fmt.Errorf("open gate: %w", err)
	}

	fmt.Printf("gate opened: %s (%s → %s, timeout %dmin)\n",
		p.GateID, p.SendingAgent, p.ReceivingAgent, p.TimeoutMinutes)
	return nil
}

// Resolve resolves a waiting gate.
func Resolve(db *sql.DB, gateID, resolvedBy string) (int64, error) {
	result, err := db.Exec(`
		UPDATE active_gates
		SET status = 'resolved',
			resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
			resolved_by = ?
		WHERE gate_id = ? AND status = 'waiting'`, resolvedBy, gateID)
	if err != nil {
		return 0, fmt.Errorf("resolve gate: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "warning: no waiting gate found for gate_id=%s\n", gateID)
	} else {
		fmt.Printf("gate resolved: %s by %s\n", gateID, resolvedBy)
	}
	return affected, nil
}

// Timeout marks a gate as timed out.
func Timeout(db *sql.DB, gateID string) (int64, error) {
	result, err := db.Exec(`
		UPDATE active_gates
		SET status = 'timed-out',
			resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
		WHERE gate_id = ? AND status = 'waiting'`, gateID)
	if err != nil {
		return 0, fmt.Errorf("timeout gate: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "warning: no waiting gate found for gate_id=%s\n", gateID)
	} else {
		fmt.Printf("gate timed out: %s\n", gateID)
	}
	return affected, nil
}

// GateStatus holds query results for active gates.
type GateStatus struct {
	ActiveGates int              `json:"active_gates"`
	Gates       []map[string]any `json:"gates"`
}

// QueryStatus queries active (waiting) gates.
func QueryStatus(db *sql.DB, agentID string) (*GateStatus, error) {
	query := `
		SELECT gate_id, sending_agent, receiving_agent, session_name,
			   outbound_filename, blocks_until, timeout_minutes,
			   fallback_action, status, created_at, timeout_at,
			   resolved_at, resolved_by
		FROM active_gates
		WHERE status = 'waiting'`
	var args []any
	if agentID != "" {
		query += " AND (sending_agent = ? OR receiving_agent = ?)"
		args = append(args, agentID, agentID)
	}
	query += " ORDER BY created_at"

	rows, err := db.Query(query, args...)
	if err != nil {
		// Table may not exist — return empty
		return &GateStatus{ActiveGates: 0}, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var gates []map[string]any
	for rows.Next() {
		values := make([]any, len(cols))
		valuePtrs := make([]any, len(cols))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		gate := make(map[string]any)
		for i, col := range cols {
			gate[col] = values[i]
		}
		gates = append(gates, gate)
	}

	return &GateStatus{ActiveGates: len(gates), Gates: gates}, nil
}

// PrintStatusJSON prints gate status as JSON.
func PrintStatusJSON(status *GateStatus) {
	data, _ := json.MarshalIndent(status, "", "  ")
	fmt.Println(string(data))
}

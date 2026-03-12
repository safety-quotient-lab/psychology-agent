// Package gates manages gated autonomous chain operations.
// Gates live in state.local.db (machine-local state).
package gates

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"
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

// ScanResolveResult holds output of a scan-and-resolve operation.
type ScanResolveResult struct {
	Resolved  int              `json:"resolved"`
	Remaining int              `json:"remaining"`
	Details   []ResolvedGate   `json:"details,omitempty"`
}

// ResolvedGate describes one gate that was resolved by scan.
type ResolvedGate struct {
	GateID     string `json:"gate_id"`
	ResolvedBy string `json:"resolved_by"`
	Session    string `json:"session"`
}

// ScanAndResolve checks all unprocessed inbound messages against active gates
// and resolves matching gates deterministically.
// sharedDB = state.db (transport_messages), localDB = state.local.db (active_gates).
func ScanAndResolve(sharedDB, localDB *sql.DB, selfAgentID string, dryRun bool) (*ScanResolveResult, error) {
	// Get all waiting gates where we are the sender
	gateRows, err := localDB.Query(`
		SELECT gate_id, receiving_agent, session_name, timeout_at
		FROM active_gates
		WHERE status = 'waiting' AND sending_agent = ?`, selfAgentID)
	if err != nil {
		return &ScanResolveResult{}, nil
	}
	defer gateRows.Close()

	type gateInfo struct {
		gateID         string
		receivingAgent string
		session        string
		timeoutAt      string
	}
	var gates []gateInfo
	for gateRows.Next() {
		var g gateInfo
		if err := gateRows.Scan(&g.gateID, &g.receivingAgent, &g.session, &g.timeoutAt); err != nil {
			continue
		}
		gates = append(gates, g)
	}

	result := &ScanResolveResult{}

	for _, g := range gates {
		// Skip timed-out gates
		if isTimedOut(g.timeoutAt) {
			continue
		}

		// Find unprocessed messages from the expected receiving agent in the gate's session
		var resolverFilename string
		err := sharedDB.QueryRow(`
			SELECT filename FROM transport_messages
			WHERE session_name = ?
			  AND from_agent = ?
			  AND processed = FALSE
			ORDER BY turn ASC
			LIMIT 1`, g.session, g.receivingAgent).Scan(&resolverFilename)
		if err != nil {
			continue // No matching message found
		}

		detail := ResolvedGate{
			GateID:     g.gateID,
			ResolvedBy: resolverFilename,
			Session:    g.session,
		}

		if dryRun {
			fmt.Printf("dry-run: would resolve gate %s with %s\n", g.gateID, resolverFilename)
		} else {
			// Look up outbound filename before resolving (local DB)
			var outboundFilename string
			localDB.QueryRow(`SELECT outbound_filename FROM active_gates WHERE gate_id = ?`,
				g.gateID).Scan(&outboundFilename)

			affected, err := Resolve(localDB, g.gateID, resolverFilename)
			if err != nil || affected == 0 {
				continue
			}
			// Set ack_received on the gated outbound message (shared DB)
			if outboundFilename != "" {
				_, _ = sharedDB.Exec(`
					UPDATE transport_messages
					SET ack_received = 1
					WHERE session_name = ? AND filename = ?`,
					g.session, outboundFilename)
			}
		}

		result.Details = append(result.Details, detail)
		result.Resolved++
	}

	// Count remaining gates
	var remaining int
	localDB.QueryRow(`SELECT COUNT(*) FROM active_gates WHERE status = 'waiting' AND sending_agent = ?`,
		selfAgentID).Scan(&remaining)
	result.Remaining = remaining

	return result, nil
}

func isTimedOut(timeoutAt string) bool {
	t, err := parseTimestamp(timeoutAt)
	if err != nil {
		return false
	}
	return time.Now().After(t)
}

func parseTimestamp(ts string) (time.Time, error) {
	formats := []string{
		"2006-01-02T15:04:05-07:00",
		"2006-01-02T15:04:05",
		time.RFC3339,
	}
	for _, f := range formats {
		if t, err := time.Parse(f, ts); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unparseable timestamp: %s", ts)
}

// PrintScanResolveJSON prints scan-resolve results as JSON.
func PrintScanResolveJSON(result *ScanResolveResult) {
	data, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(data))
}

// PrintStatusJSON prints gate status as JSON.
func PrintStatusJSON(status *GateStatus) {
	data, _ := json.MarshalIndent(status, "", "  ")
	fmt.Println(string(data))
}

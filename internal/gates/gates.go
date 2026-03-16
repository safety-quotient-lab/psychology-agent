// Package gates manages gated autonomous chain operations (pending handoffs).
// Handoffs live in state.local.db (machine-local state).
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
		INSERT OR REPLACE INTO pending_handoffs
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

	fmt.Printf("handoff opened: %s (%s → %s, timeout %dmin)\n",
		p.GateID, p.SendingAgent, p.ReceivingAgent, p.TimeoutMinutes)
	return nil
}

// Resolve resolves a waiting gate.
func Resolve(db *sql.DB, gateID, resolvedBy string) (int64, error) {
	result, err := db.Exec(`
		UPDATE pending_handoffs
		SET status = 'resolved',
			resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
			resolved_by = ?
		WHERE gate_id = ? AND status = 'waiting'`, resolvedBy, gateID)
	if err != nil {
		return 0, fmt.Errorf("resolve gate: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "warning: no waiting handoff found for gate_id=%s\n", gateID)
	} else {
		fmt.Printf("handoff resolved: %s by %s\n", gateID, resolvedBy)
	}
	return affected, nil
}

// Timeout marks a gate as timed out.
func Timeout(db *sql.DB, gateID string) (int64, error) {
	result, err := db.Exec(`
		UPDATE pending_handoffs
		SET status = 'timed-out',
			resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
		WHERE gate_id = ? AND status = 'waiting'`, gateID)
	if err != nil {
		return 0, fmt.Errorf("timeout gate: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "warning: no waiting handoff found for gate_id=%s\n", gateID)
	} else {
		fmt.Printf("handoff timed out: %s\n", gateID)
	}
	return affected, nil
}

// HandoffStatus holds query results for pending handoffs.
type HandoffStatus struct {
	PendingHandoffs int              `json:"pending_handoffs"`
	Handoffs        []map[string]any `json:"handoffs"`
}

// QueryStatus queries pending (waiting) handoffs.
func QueryStatus(db *sql.DB, agentID string) (*HandoffStatus, error) {
	query := `
		SELECT gate_id, sending_agent, receiving_agent, session_name,
			   outbound_filename, blocks_until, timeout_minutes,
			   fallback_action, status, created_at, timeout_at,
			   resolved_at, resolved_by
		FROM pending_handoffs
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
		return &HandoffStatus{PendingHandoffs: 0}, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var handoffs []map[string]any
	for rows.Next() {
		values := make([]any, len(cols))
		valuePtrs := make([]any, len(cols))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		handoff := make(map[string]any)
		for i, col := range cols {
			handoff[col] = values[i]
		}
		handoffs = append(handoffs, handoff)
	}

	return &HandoffStatus{PendingHandoffs: len(handoffs), Handoffs: handoffs}, nil
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

// ScanAndResolve checks all unprocessed inbound messages against pending handoffs
// and resolves matching handoffs deterministically.
// sharedDB = state.db (transport_messages), localDB = state.local.db (pending_handoffs).
func ScanAndResolve(sharedDB, localDB *sql.DB, selfAgentID string, dryRun bool) (*ScanResolveResult, error) {
	// Get all waiting gates where we are the sender
	gateRows, err := localDB.Query(`
		SELECT gate_id, receiving_agent, session_name, timeout_at
		FROM pending_handoffs
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
			localDB.QueryRow(`SELECT outbound_filename FROM pending_handoffs WHERE gate_id = ?`,
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
	localDB.QueryRow(`SELECT COUNT(*) FROM pending_handoffs WHERE status = 'waiting' AND sending_agent = ?`,
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

// PrintStatusJSON prints handoff status as JSON.
func PrintStatusJSON(status *HandoffStatus) {
	data, _ := json.MarshalIndent(status, "", "  ")
	fmt.Println(string(data))
}

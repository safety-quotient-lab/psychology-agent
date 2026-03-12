package quality

import (
	"database/sql"
	"fmt"
)

// RecordIncidentParams holds parameters for recording an engineering incident.
type RecordIncidentParams struct {
	IncidentType  string
	Description   string
	SessionID     *int
	Severity      string
	ToolName      *string
	ToolContext    *string
	DetectionTier int
}

// RecordIncident records an engineering incident, incrementing recurrence on duplicates.
// Writes to state.db (REASSIGNED from private to shared).
func RecordIncident(db *sql.DB, p RecordIncidentParams) error {
	if p.Severity == "" {
		p.Severity = "moderate"
	}
	if p.DetectionTier <= 0 {
		p.DetectionTier = 1
	}

	// Check for existing ungraduated incident of same type
	var existingID int
	var existingRecurrence int
	err := db.QueryRow(
		"SELECT id, recurrence FROM engineering_incidents "+
			"WHERE incident_type = ? AND graduated = 0 "+
			"ORDER BY created_at DESC LIMIT 1",
		p.IncidentType,
	).Scan(&existingID, &existingRecurrence)

	if err == nil {
		// Update existing
		_, err = db.Exec(
			"UPDATE engineering_incidents SET recurrence = ?, "+
				"description = ?, tool_name = ?, tool_context = ?, "+
				"session_id = ?, severity = ? "+
				"WHERE id = ?",
			existingRecurrence+1, p.Description, p.ToolName,
			p.ToolContext, p.SessionID, p.Severity, existingID)
		if err != nil {
			return fmt.Errorf("update incident: %w", err)
		}
		fmt.Printf("incremented: engineering_incidents/%s (recurrence=%d)\n",
			p.IncidentType, existingRecurrence+1)
	} else {
		// Insert new
		_, err = db.Exec(
			"INSERT INTO engineering_incidents "+
				"(session_id, incident_type, detection_tier, severity, "+
				"description, tool_name, tool_context) "+
				"VALUES (?, ?, ?, ?, ?, ?, ?)",
			p.SessionID, p.IncidentType, p.DetectionTier, p.Severity,
			p.Description, p.ToolName, p.ToolContext)
		if err != nil {
			return fmt.Errorf("insert incident: %w", err)
		}
		fmt.Printf("recorded: engineering_incidents/%s\n", p.IncidentType)
	}

	return nil
}

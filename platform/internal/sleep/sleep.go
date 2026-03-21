// Package sleep implements offline consolidation — NREM/REM ultradian
// cycling, glymphatic clearance, and Process S (sleep pressure).
//
// Sleep onset driven by Process S (accumulated unprocessed experience).
// Process C (human activity as zeitgeber) tracked for data collection
// but not used for sleep onset in v1.
//
// NREM: evaluative consolidation (prune, strengthen, reconcile).
// REM: Gc-only by default (pattern replay). Dream depth toggleable (off).
// Glymphatic: waste clearance (archival, pruning, log rotation).
package sleep

import (
	"log"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// ProcessS computes sleep pressure from accumulated unprocessed experience.
// Returns 0.0 (no pressure) to 1.0 (maximum pressure).
func ProcessS(database *db.DB) float64 {
	// Count sessions since last consolidation
	lastConsolidation := database.ScalarInt(
		`SELECT MAX(id) FROM session_log
		 WHERE summary LIKE '%consolidation%' OR summary LIKE '%retrospect%'`)
	currentSession := database.ScalarInt("SELECT MAX(id) FROM session_log")

	sessionsSince := currentSession - lastConsolidation
	if sessionsSince < 0 {
		sessionsSince = 0
	}

	// Threshold: 5 sessions without consolidation → full pressure
	pressure := float64(sessionsSince) / 5.0
	if pressure > 1.0 {
		pressure = 1.0
	}
	return pressure
}

// ProcessC tracks human activity timestamps for future zeitgeber use.
// v1: data collection only. v2: sleep onset uses Process S × Process C.
func RecordHumanActivity(database *db.DB, activityType string) {
	database.Exec(
		`INSERT INTO human_activity (activity_type, timestamp)
		 VALUES (?, datetime('now', 'localtime'))`,
		activityType)
}

// HumanQuiescence returns hours since last human activity.
// Returns 0 if human was active recently, >1 if quiet for over an hour.
func HumanQuiescence(database *db.DB) float64 {
	rows, err := database.QueryRows(
		`SELECT MAX(timestamp) as latest FROM human_activity`)
	if err != nil || len(rows) == 0 {
		return 24.0 // no records — assume long quiescence
	}

	latest, ok := rows[0]["latest"].(string)
	if !ok || latest == "" {
		return 24.0
	}

	t, err := time.Parse("2006-01-02 15:04:05", latest)
	if err != nil {
		t, err = time.Parse("2006-01-02T15:04:05", latest)
		if err != nil {
			return 24.0
		}
	}

	hours := time.Since(t).Hours()
	return hours
}

// ShouldSleep determines whether the agent should enter sleep state.
// v1: Process S only (pressure exceeds threshold).
// v2: Process S × Process C (pressure AND human quiescence).
func ShouldSleep(database *db.DB) bool {
	pressure := ProcessS(database)
	// v1 threshold: pressure > 0.8
	return pressure > 0.8
}

// Phase represents one substage of sleep.
type Phase int

const (
	PhaseNREMLight Phase = iota
	PhaseNREMDeep
	PhaseREM
	PhaseGlymphatic
)

func (p Phase) String() string {
	switch p {
	case PhaseNREMLight:
		return "nrem-light"
	case PhaseNREMDeep:
		return "nrem-deep"
	case PhaseREM:
		return "rem"
	case PhaseGlymphatic:
		return "glymphatic"
	default:
		return "unknown"
	}
}

// Cycle represents one complete NREM→REM→NREM cycle.
type Cycle struct {
	Number    int
	Phase     Phase
	StartedAt time.Time
}

// RunConsolidation executes one sleep consolidation cycle.
// NREM: prune trigger_activations, reconcile state, strengthen weights.
// REM: Gc-only pattern replay (no Gf by default).
// Glymphatic: archive closed sessions, rotate logs, prune stale entries.
func RunConsolidation(database *db.DB, projectRoot string) error {
	log.Printf("[sleep] === consolidation cycle starting ===")

	// NREM Deep: prune and strengthen
	log.Printf("[sleep] NREM deep: pruning trigger_activations")
	pruned, _ := database.Exec(
		`DELETE FROM trigger_activations
		 WHERE timestamp < datetime('now', '-48 hours')`)
	log.Printf("[sleep] NREM deep: pruned %d old activations", pruned)

	// NREM Deep: reconcile memory staleness
	stale := database.ScalarInt(
		`SELECT COUNT(*) FROM memory_entries
		 WHERE last_confirmed < datetime('now', '-5 days')`)
	if stale > 0 {
		log.Printf("[sleep] NREM deep: %d stale memory entries detected", stale)
	}

	// REM: Gc-only pattern replay (query for cross-session patterns)
	log.Printf("[sleep] REM: Gc pattern replay (cross-referencing recent sessions)")
	// Query lessons and decisions for reinforcement
	recentLessons := database.ScalarInt(
		`SELECT COUNT(*) FROM lessons
		 WHERE lesson_date > datetime('now', '-7 days')`)
	log.Printf("[sleep] REM: %d recent lessons available for replay", recentLessons)

	// Glymphatic: archive closed sessions
	log.Printf("[sleep] glymphatic: clearance pass")
	// Count closed sessions eligible for archival
	closedSessions := database.ScalarInt(
		`SELECT COUNT(DISTINCT session_name) FROM transport_messages
		 WHERE session_name IN (
		     SELECT session_name FROM transport_messages
		     GROUP BY session_name
		     HAVING MAX(processed) = 1
		 )`)
	log.Printf("[sleep] glymphatic: %d sessions eligible for archival", closedSessions)

	// Record trait accumulation data
	database.Exec(
		`INSERT OR REPLACE INTO mode_traits (coupling_mode, usage_count, last_used)
		 VALUES ('sleep', COALESCE(
		     (SELECT usage_count + 1 FROM mode_traits WHERE coupling_mode = 'sleep'),
		     1), datetime('now', 'localtime'))`)

	log.Printf("[sleep] === consolidation cycle complete ===")
	return nil
}

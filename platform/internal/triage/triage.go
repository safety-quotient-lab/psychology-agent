// Package triage classifies unprocessed transport messages into dispositions.
// Trivial messages (acks, notifications, state-updates) get auto-processed
// without LLM invocation. Substance messages survive for claude /sync.
// Ported from auto_process_trivial.py + agentdb triage --scan.
package triage

import (
	"fmt"
	"log"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Disposition classifies how a message should be handled.
type Disposition string

const (
	DispositionNeedsLLM   Disposition = "needs-llm"   // requires fluid reasoning
	DispositionAutoACK    Disposition = "auto-ack"     // trivial, auto-acknowledge
	DispositionAutoSkip   Disposition = "auto-skip"    // expired or irrelevant
	DispositionAutoRecord Disposition = "auto-record"  // record without processing
)

// Result holds the outcome of a triage scan.
type Result struct {
	NeedsLLM   int
	AutoACK    int
	AutoSkip   int
	AutoRecord int
	Processed  int // messages auto-processed this scan
}

// TrivialTypes are message types that can be auto-processed without LLM.
// Hardcoded baseline — supplemented by gc_learning (adaptive triage).
var TrivialTypes = map[string]bool{
	"ack":          true,
	"notification": true,
	"state-update": true,
}

// LoadLearnedTrivialTypes extends TrivialTypes with patterns promoted
// from Gf to Gc via gc_learning. When the LLM handles a message type
// the same way 3+ times, the triage layer learns to handle it automatically.
// ops-session's gc_learning insight (exit interview, Session 95).
func LoadLearnedTrivialTypes(database *db.DB) {
	rows, err := database.QueryRows(
		`SELECT message_type, COUNT(*) as cnt
		 FROM transport_messages
		 WHERE processed = TRUE
		 AND message_type IS NOT NULL
		 AND message_type != ''
		 GROUP BY message_type
		 HAVING cnt >= 3
		 AND message_type NOT IN ('request', 'proposal', 'review', 'command-request', 'session-close')`)
	if err != nil {
		return
	}
	for _, row := range rows {
		msgType := toString(row["message_type"])
		if msgType != "" && !TrivialTypes[msgType] {
			TrivialTypes[msgType] = true
			log.Printf("[triage] gc_learning: promoted '%s' to auto-process (3+ consistent handlings)", msgType)
		}
	}
}

// Scan classifies all unprocessed messages and auto-processes trivial ones.
// Loads gc_learning patterns before classification (adaptive triage).
func Scan(database *db.DB) (Result, error) {
	var result Result

	// gc_learning: extend TrivialTypes with learned patterns
	LoadLearnedTrivialTypes(database)

	// Find all unprocessed messages
	rows, err := database.QueryRows(
		`SELECT id, message_type, ack_required, expires_at
		 FROM transport_messages
		 WHERE processed = FALSE
		 ORDER BY timestamp ASC`)
	if err != nil {
		return result, fmt.Errorf("query unprocessed: %w", err)
	}

	now := time.Now()
	var autoProcessIDs []int64

	for _, row := range rows {
		id := toInt64(row["id"])
		msgType := toString(row["message_type"])
		ackRequired := toInt64(row["ack_required"])
		expiresAt := toString(row["expires_at"])

		// Check expiration
		if expiresAt != "" {
			if expired, _ := isExpired(expiresAt, now); expired {
				result.AutoSkip++
				autoProcessIDs = append(autoProcessIDs, id)
				continue
			}
		}

		// Classify by message type
		if TrivialTypes[msgType] && ackRequired == 0 {
			result.AutoACK++
			autoProcessIDs = append(autoProcessIDs, id)
			continue
		}

		// Everything else needs LLM
		result.NeedsLLM++
	}

	// Auto-process trivial + expired messages
	for _, id := range autoProcessIDs {
		_, err := database.Exec(
			`UPDATE transport_messages
			 SET processed = TRUE,
			     processed_at = ?
			 WHERE id = ?`,
			now.Format("2006-01-02T15:04:05"), id)
		if err != nil {
			log.Printf("[triage] warning: failed to auto-process message %d: %v", id, err)
			continue
		}
		result.Processed++
	}

	if result.Processed > 0 {
		log.Printf("[triage] auto-processed %d messages (%d ack, %d skip). %d need LLM.",
			result.Processed, result.AutoACK, result.AutoSkip, result.NeedsLLM)
	}

	return result, nil
}

// HasSubstance returns true if any messages require LLM processing.
func HasSubstance(database *db.DB) bool {
	count := database.ScalarInt(
		`SELECT COUNT(*) FROM transport_messages
		 WHERE processed = FALSE
		 AND (message_type NOT IN ('ack', 'notification', 'state-update')
		      OR ack_required = 1)`)
	return count > 0
}

// UnprocessedCount returns the total number of unprocessed messages.
func UnprocessedCount(database *db.DB) int {
	return database.ScalarInt(
		"SELECT COUNT(*) FROM transport_messages WHERE processed = FALSE")
}

func isExpired(expiresAt string, now time.Time) (bool, error) {
	t, err := time.Parse("2006-01-02T15:04:05-07:00", expiresAt)
	if err != nil {
		t, err = time.Parse("2006-01-02T15:04:05", expiresAt)
		if err != nil {
			return false, err
		}
	}
	return now.After(t), nil
}

func toInt64(v any) int64 {
	switch val := v.(type) {
	case int64:
		return val
	case float64:
		return int64(val)
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

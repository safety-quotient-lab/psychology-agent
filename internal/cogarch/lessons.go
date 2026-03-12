package cogarch

import (
	"database/sql"
	"fmt"
)

// UpsertLessonParams holds parameters for upserting a lesson.
type UpsertLessonParams struct {
	Title           string
	Date            string
	PatternType     *string
	Domain          *string
	Severity        *string
	Recurrence      int
	TriggerRelevant *string
	PromotionStatus *string
	LessonText      *string
}

// UpsertLesson upserts a lesson entry in state.db (REASSIGNED from private to shared).
func UpsertLesson(db *sql.DB, p UpsertLessonParams) error {
	if p.Recurrence <= 0 {
		p.Recurrence = 1
	}

	_, err := db.Exec(`
		INSERT INTO lessons
			(title, lesson_date, pattern_type, domain, severity, recurrence,
			 first_seen, last_seen, trigger_relevant, promotion_status, lesson_text)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(title) DO UPDATE SET
			pattern_type = COALESCE(excluded.pattern_type, pattern_type),
			domain = COALESCE(excluded.domain, domain),
			severity = COALESCE(excluded.severity, severity),
			recurrence = COALESCE(excluded.recurrence, recurrence),
			last_seen = COALESCE(excluded.last_seen, last_seen),
			trigger_relevant = COALESCE(excluded.trigger_relevant, trigger_relevant),
			promotion_status = COALESCE(excluded.promotion_status, promotion_status),
			lesson_text = COALESCE(excluded.lesson_text, lesson_text)`,
		p.Title, p.Date, p.PatternType, p.Domain,
		p.Severity, p.Recurrence,
		p.Date, p.Date, // first_seen = last_seen on initial insert
		p.TriggerRelevant, p.PromotionStatus, p.LessonText,
	)
	if err != nil {
		return fmt.Errorf("upsert lesson: %w", err)
	}
	fmt.Printf("upserted: lessons/%s\n", p.Title)
	return nil
}

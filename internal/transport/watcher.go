// Package transport provides a polling-based filesystem watcher for the
// transport/sessions/ directory. It detects new interagent messages, classifies
// them by enforcement level, and forwards Event values into the meshd queue.
//
// Every comment in this file follows E-Prime: no forms of "to be" appear.
package transport

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/events"
)

const (
	// seenTTL controls how long the watcher remembers a processed file before
	// pruning it from the seen-set.
	seenTTL = 24 * time.Hour
)

// Watcher polls transport/sessions/ for new .json files and emits classified
// events. It requires zero external dependencies — only stdlib.
type Watcher struct {
	Dir          string
	PollInterval time.Duration
	EventChan    chan<- events.Event
	SeenFile     string // path to persist seen-set (prevents spawn storms on restart)
	seen         map[string]time.Time
	mu           sync.Mutex
	logger       *slog.Logger
	stopCh       chan struct{}
}

// NewWatcher constructs a Watcher. The caller must invoke Run to start polling.
func NewWatcher(dir string, interval time.Duration, ch chan<- events.Event, logger *slog.Logger) *Watcher {
	return &Watcher{
		Dir:          dir,
		PollInterval: interval,
		EventChan:    ch,
		seen:         make(map[string]time.Time),
		logger:       logger,
		stopCh:       make(chan struct{}),
	}
}

// Run starts the polling loop. It blocks until Stop gets called or the
// stopCh channel closes. Run the method in a dedicated goroutine.
func (w *Watcher) Run() {
	// Load persisted seen-set before first scan (prevents spawn storms)
	w.loadSeenSet()

	ticker := time.NewTicker(w.PollInterval)
	defer ticker.Stop()

	// Perform an initial scan immediately rather than waiting for the first tick.
	w.scan()
	w.saveSeenSet()

	for {
		select {
		case <-ticker.C:
			w.scan()
			w.pruneSeenSet()
			w.saveSeenSet()
		case <-w.stopCh:
			w.logger.Info("watcher stopping")
			return
		}
	}
}

// Stop signals the polling loop to exit.
func (w *Watcher) Stop() {
	close(w.stopCh)
}

// --------------------------------------------------------------------------
// Scanning
// --------------------------------------------------------------------------

// scan walks every subdirectory under Dir, looking for .json files that the
// watcher has not yet processed.
func (w *Watcher) scan() {
	subdirs, err := os.ReadDir(w.Dir)
	if err != nil {
		// The directory may not yet exist during early bootstrap — that
		// qualifies as normal, not an error.
		if os.IsNotExist(err) {
			return
		}
		w.logger.Error("failed to read transport sessions directory", "dir", w.Dir, "err", err)
		return
	}

	for _, sub := range subdirs {
		if !sub.IsDir() {
			continue
		}
		sessionDir := filepath.Join(w.Dir, sub.Name())
		w.scanSessionDir(sessionDir)
	}
}

// scanSessionDir reads a single session subdirectory and processes any unseen
// .json files it contains.
func (w *Watcher) scanSessionDir(dir string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		w.logger.Error("failed to read session subdirectory", "dir", dir, "err", err)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		path := filepath.Join(dir, entry.Name())

		if w.alreadySeen(path) {
			continue
		}

		w.processFile(path)
	}
}

// --------------------------------------------------------------------------
// File processing and classification
// --------------------------------------------------------------------------

// transportMessage captures the subset of fields the classifier needs from an
// interagent message file. The From and To fields accept both string and
// []string because the interagent/v1 protocol uses arrays for multi-recipient
// messages while some manifests use plain strings.
type transportMessage struct {
	Type        string          `json:"type"`
	Priority    string          `json:"priority"`
	Enforcement string          `json:"enforcement"`
	From        json.RawMessage `json:"from"`
	To          json.RawMessage `json:"to"`
	Subject     string          `json:"subject"`
}

// fromString extracts the sender as a string, handling both "agent-id"
// and ["agent-id", ...] JSON shapes.
func (m *transportMessage) fromString() string {
	return flexString(m.From)
}

// toString extracts the first recipient as a string, handling both shapes.
func (m *transportMessage) toString() string {
	return flexString(m.To)
}

// flexString parses a JSON value that may hold a string, []string,
// or { "agent_id": "..." } object, returning the first ID found.
func flexString(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	// Try string first
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}
	// Try array of strings
	var arr []string
	if json.Unmarshal(raw, &arr) == nil && len(arr) > 0 {
		return arr[0]
	}
	// Try object with agent_id field (interagent/v1 format)
	var obj struct {
		AgentID string `json:"agent_id"`
	}
	if json.Unmarshal(raw, &obj) == nil && obj.AgentID != "" {
		return obj.AgentID
	}
	return ""
}

// processFile reads, parses, classifies, and emits an event for a single
// transport message file.
func (w *Watcher) processFile(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		w.logger.Error("failed to read transport file", "path", path, "err", err)
		return
	}

	var msg transportMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		w.logger.Warn("failed to parse transport file — skipping",
			"path", path, "err", err)
		w.markSeen(path)
		return
	}

	priority := classifyPriority(msg)

	w.logger.Info("new transport message detected",
		"path", path,
		"type", msg.Type,
		"enforcement", msg.Enforcement,
		"priority", priority,
		"from", msg.fromString(),
	)

	evt := events.NewEvent(events.EventTransportMessage, priority, "filesystem", map[string]string{
		"path":        path,
		"msg_type":    msg.Type,
		"enforcement": msg.Enforcement,
		"from":        msg.fromString(),
		"to":          msg.toString(),
		"subject":     msg.Subject,
	})

	w.emit(evt)
	w.markSeen(path)
}

// classifyPriority maps enforcement and priority fields to an events.Priority
// value.
func classifyPriority(msg transportMessage) events.Priority {
	switch msg.Enforcement {
	case "hard-mandatory":
		return events.PriorityCritical
	case "soft-mandatory":
		return events.PriorityHigh
	}
	if msg.Priority == "high" {
		return events.PriorityHigh
	}
	return events.PriorityNormal
}

// --------------------------------------------------------------------------
// Seen-set management (deduplication)
// --------------------------------------------------------------------------

// alreadySeen reports whether the watcher has previously processed the file at
// the given path.
func (w *Watcher) alreadySeen(path string) bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	_, found := w.seen[path]
	return found
}

// markSeen records that the watcher has processed the file at the given path.
func (w *Watcher) markSeen(path string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.seen[path] = time.Now()
}

// pruneSeenSet removes entries older than seenTTL to prevent unbounded memory
// growth during long-running operation.
func (w *Watcher) pruneSeenSet() {
	w.mu.Lock()
	defer w.mu.Unlock()

	cutoff := time.Now().Add(-seenTTL)
	pruned := 0
	for path, ts := range w.seen {
		if ts.Before(cutoff) {
			delete(w.seen, path)
			pruned++
		}
	}

	if pruned > 0 {
		w.logger.Debug("pruned stale seen-set entries",
			"pruned", pruned,
			"remaining", len(w.seen),
		)
	}
}

// --------------------------------------------------------------------------
// Seen-set persistence (prevents spawn storms on restart)
// --------------------------------------------------------------------------

// seenEntry holds one entry for JSON serialization.
type seenEntry struct {
	Path string    `json:"path"`
	At   time.Time `json:"at"`
}

// loadSeenSet reads the persisted seen-set from disk. If the file
// does not exist or fails to parse, the watcher starts with an empty
// set — this means the first scan after a fresh install will process
// all existing files (acceptable for bootstrap).
func (w *Watcher) loadSeenSet() {
	if w.SeenFile == "" {
		return
	}
	data, err := os.ReadFile(w.SeenFile)
	if err != nil {
		if !os.IsNotExist(err) {
			w.logger.Warn("failed to load seen-set file", "path", w.SeenFile, "err", err)
		}
		return
	}

	var entries []seenEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		w.logger.Warn("failed to parse seen-set file — starting fresh", "err", err)
		return
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	cutoff := time.Now().Add(-seenTTL)
	loaded := 0
	for _, e := range entries {
		if e.At.After(cutoff) {
			w.seen[e.Path] = e.At
			loaded++
		}
	}

	w.logger.Info("loaded persisted seen-set",
		"file", w.SeenFile,
		"loaded", loaded,
		"expired", len(entries)-loaded,
	)
}

// saveSeenSet writes the current seen-set to disk for persistence
// across restarts. Called after each scan cycle.
func (w *Watcher) saveSeenSet() {
	if w.SeenFile == "" {
		return
	}

	w.mu.Lock()
	entries := make([]seenEntry, 0, len(w.seen))
	for path, at := range w.seen {
		entries = append(entries, seenEntry{Path: path, At: at})
	}
	w.mu.Unlock()

	data, err := json.Marshal(entries)
	if err != nil {
		w.logger.Warn("failed to serialize seen-set", "err", err)
		return
	}

	if err := os.WriteFile(w.SeenFile, data, 0644); err != nil {
		w.logger.Warn("failed to write seen-set file", "path", w.SeenFile, "err", err)
	}
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// emit sends an event into the queue. If the channel buffer fills, it logs a
// warning and drops the event to avoid stalling the watcher loop.
func (w *Watcher) emit(evt events.Event) {
	select {
	case w.EventChan <- evt:
	default:
		w.logger.Warn("event channel full — dropped event",
			"type", evt.Type,
			"path", evt.Payload["path"],
		)
	}
}

// SeenCount returns the current size of the deduplication set. Useful for
// health checks and diagnostics.
func (w *Watcher) SeenCount() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return len(w.seen)
}

// String satisfies fmt.Stringer for diagnostic output.
func (w *Watcher) String() string {
	return fmt.Sprintf("transport.Watcher{dir=%s, poll=%s, seen=%d}",
		w.Dir, w.PollInterval, w.SeenCount())
}

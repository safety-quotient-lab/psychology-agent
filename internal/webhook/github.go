// Package webhook provides HTTP handlers that receive GitHub webhook
// deliveries and translate them into meshd Event values.
//
// Every comment in this file follows E-Prime: no forms of "to be" appear.
package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/events"
)

// --------------------------------------------------------------------------
// Rate limiter — sliding-window counter keyed by repository full name
// --------------------------------------------------------------------------

const (
	rateLimitWindow = time.Minute
	rateLimitMax    = 10
)

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string][]time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{buckets: make(map[string][]time.Time)}
}

// allow returns true when the repo has not exceeded rateLimitMax events inside
// the current sliding window. It records the attempt when allowed.
func (rl *rateLimiter) allow(repo string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rateLimitWindow)

	// Prune timestamps that fell outside the window.
	recent := rl.buckets[repo][:0]
	for _, t := range rl.buckets[repo] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}

	if len(recent) >= rateLimitMax {
		rl.buckets[repo] = recent
		return false
	}

	rl.buckets[repo] = append(recent, now)
	return true
}

// --------------------------------------------------------------------------
// GitHubHandler
// --------------------------------------------------------------------------

// GitHubHandler receives POST /hooks/github deliveries, verifies the
// HMAC-SHA256 signature, classifies the event, and forwards an Event into
// the meshd queue.
type GitHubHandler struct {
	Secret      string
	EventChan   chan<- events.Event
	rateLimiter *rateLimiter
	logger      *slog.Logger
}

// NewGitHubHandler constructs a ready-to-use handler. The caller supplies the
// HMAC secret (from config / .dev.vars) and the destination event channel.
func NewGitHubHandler(secret string, ch chan<- events.Event, logger *slog.Logger) *GitHubHandler {
	return &GitHubHandler{
		Secret:      secret,
		EventChan:   ch,
		rateLimiter: newRateLimiter(),
		logger:      logger,
	}
}

// ServeHTTP satisfies http.Handler.
func (h *GitHubHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("failed to read request body", "err", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// --- Signature verification -------------------------------------------
	if !h.verifySignature(body, r.Header.Get("X-Hub-Signature-256")) {
		h.logger.Warn("signature verification failed")
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// --- Parse envelope ---------------------------------------------------
	eventType := r.Header.Get("X-GitHub-Event")

	var envelope struct {
		Action     string `json:"action"`
		Repository struct {
			FullName string `json:"full_name"`
		} `json:"repository"`
		Sender struct {
			Login string `json:"login"`
		} `json:"sender"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		h.logger.Error("failed to parse webhook envelope", "err", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	repo := envelope.Repository.FullName

	h.logger.Info("webhook received",
		"timestamp", time.Now().UTC().Format(time.RFC3339),
		"event_type", eventType,
		"action", envelope.Action,
		"sender", envelope.Sender.Login,
		"repo", repo,
	)

	// --- Rate limiting ----------------------------------------------------
	if !h.rateLimiter.allow(repo) {
		h.logger.Warn("rate limit exceeded for repo", "repo", repo)
		http.Error(w, "too many requests", http.StatusTooManyRequests)
		return
	}

	// --- Dispatch by event type ------------------------------------------
	switch eventType {
	case "pull_request":
		h.handlePullRequest(body)
	case "push":
		h.handlePush(body)
	default:
		h.logger.Debug("ignoring unhandled event type", "event_type", eventType)
	}

	w.WriteHeader(http.StatusNoContent)
}

// --------------------------------------------------------------------------
// Pull-request handling
// --------------------------------------------------------------------------

// prPayload captures the subset of the GitHub pull_request webhook body that
// the classifier needs.
type prPayload struct {
	Action      string `json:"action"`
	PullRequest struct {
		Title  string `json:"title"`
		Body   string `json:"body"`
		Head   struct {
			Ref string `json:"ref"`
		} `json:"head"`
		ChangedFiles int `json:"changed_files"`
	} `json:"pull_request"`
}

func (h *GitHubHandler) handlePullRequest(body []byte) {
	var pr prPayload
	if err := json.Unmarshal(body, &pr); err != nil {
		h.logger.Error("failed to parse pull_request payload", "err", err)
		return
	}

	evtType, priority := classifyPR(pr)

	h.emit(events.NewEvent(evtType, priority, "github", map[string]string{
		"action":        pr.Action,
		"title":         pr.PullRequest.Title,
		"branch":        pr.PullRequest.Head.Ref,
		"changed_files": fmt.Sprintf("%d", pr.PullRequest.ChangedFiles),
	}))
}

// classifyPR examines branch name, title, and body to determine the event
// type and priority.
func classifyPR(pr prPayload) (events.EventType, events.Priority) {
	branch := pr.PullRequest.Head.Ref
	title := strings.ToLower(pr.PullRequest.Title)
	body := strings.ToLower(pr.PullRequest.Body)

	// Transport-message branch pattern or transport session files.
	if strings.Contains(branch, "/transport-message/") ||
		strings.Contains(title, "transport/sessions/") {
		return events.EventTransportMessage, events.PriorityHigh
	}

	// Directive — check enforcement level in body.
	if strings.Contains(title, "directive") {
		pri := events.PriorityHigh
		if strings.Contains(body, "hard-mandatory") {
			pri = events.PriorityCritical
		}
		return events.EventDirective, pri
	}

	// Context rotation request.
	if strings.Contains(title, "context-rotate") {
		return events.EventContextRotate, events.PriorityHigh
	}

	// Generic PR — low priority.
	return events.EventWebhookPR, events.PriorityLow
}

// --------------------------------------------------------------------------
// Push handling
// --------------------------------------------------------------------------

type pushPayload struct {
	Commits []struct {
		Added    []string `json:"added"`
		Modified []string `json:"modified"`
	} `json:"commits"`
	Ref string `json:"ref"`
}

func (h *GitHubHandler) handlePush(body []byte) {
	var push pushPayload
	if err := json.Unmarshal(body, &push); err != nil {
		h.logger.Error("failed to parse push payload", "err", err)
		return
	}

	// Check whether any commit touched transport/sessions/.
	if !pushTouchesTransport(push) {
		return
	}

	h.emit(events.NewEvent(events.EventWebhookPush, events.PriorityNormal, "github", map[string]string{
		"ref":     push.Ref,
		"trigger": "transport-sessions-change",
	}))
}

// pushTouchesTransport scans every commit in the push for files under
// transport/sessions/.
func pushTouchesTransport(p pushPayload) bool {
	for _, c := range p.Commits {
		for _, f := range c.Added {
			if strings.HasPrefix(f, "transport/sessions/") {
				return true
			}
		}
		for _, f := range c.Modified {
			if strings.HasPrefix(f, "transport/sessions/") {
				return true
			}
		}
	}
	return false
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// verifySignature computes HMAC-SHA256 over body using h.Secret and compares
// the result to the value supplied in the X-Hub-Signature-256 header.
func (h *GitHubHandler) verifySignature(body []byte, header string) bool {
	if h.Secret == "" {
		// No secret configured — skip verification (development only).
		return true
	}

	const prefix = "sha256="
	if !strings.HasPrefix(header, prefix) {
		return false
	}

	expected, err := hex.DecodeString(strings.TrimPrefix(header, prefix))
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, []byte(h.Secret))
	mac.Write(body)
	computed := mac.Sum(nil)

	return hmac.Equal(computed, expected)
}

// emit sends an event into the queue without blocking the HTTP handler. If the
// channel buffer fills, it logs a warning and drops the event rather than
// stalling the webhook response.
func (h *GitHubHandler) emit(evt events.Event) {
	select {
	case h.EventChan <- evt:
	default:
		h.logger.Warn("event channel full — dropped event",
			"type", evt.Type,
			"priority", evt.Priority,
		)
	}
}

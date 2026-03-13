// Package notify provides pluggable notification channels for meshd.
// When the budget gate blocks a spawn (shadow mode, mesh paused, etc.),
// the notifier alerts the human operator through the configured channel.
//
// Channels: null (silent), file (JSONL append), zulip (HTTP API), webhook (generic POST).
package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"
)

// Notifier delivers a notification about a blocked or noteworthy event.
type Notifier interface {
	Notify(ctx context.Context, msg Message) error
	Name() string
}

// Message carries the notification payload.
type Message struct {
	AgentID   string    `json:"agent_id"`
	EventType string    `json:"event_type"`
	Priority  string    `json:"priority"`
	Reason    string    `json:"reason"`
	Session   string    `json:"session,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Config holds notification channel configuration loaded from .dev.vars.
type Config struct {
	Channel          string // "null", "file", "zulip", "webhook"
	FilePath         string // for file channel
	ZulipURL         string // Zulip API endpoint
	ZulipEmail       string // bot email
	ZulipKey         string // bot API key
	ZulipStream      string // target stream
	ZulipTopic       string // target topic
	WebhookURL       string // generic webhook URL
}

// New constructs the appropriate Notifier based on config.
func New(cfg Config, logger *slog.Logger) Notifier {
	switch cfg.Channel {
	case "file":
		return &FileNotifier{Path: cfg.FilePath, logger: logger}
	case "zulip":
		return &ZulipNotifier{
			URL:    cfg.ZulipURL,
			Email:  cfg.ZulipEmail,
			Key:    cfg.ZulipKey,
			Stream: cfg.ZulipStream,
			Topic:  cfg.ZulipTopic,
			logger: logger,
		}
	case "webhook":
		return &WebhookNotifier{URL: cfg.WebhookURL, logger: logger}
	default:
		return &NullNotifier{}
	}
}

// ── NullNotifier — silent, default ──────────────────────────────────

// NullNotifier discards all notifications. Serves as the default when
// no channel gets configured.
type NullNotifier struct{}

func (n *NullNotifier) Notify(_ context.Context, _ Message) error { return nil }
func (n *NullNotifier) Name() string                              { return "null" }

// ── FileNotifier — append JSONL to a file ───────────────────────────

// FileNotifier writes notifications as JSON lines to a local file.
// The simplest channel — always available, no network dependency.
type FileNotifier struct {
	Path   string
	mu     sync.Mutex
	logger *slog.Logger
}

func (n *FileNotifier) Name() string { return "file" }

func (n *FileNotifier) Notify(_ context.Context, msg Message) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	f, err := os.OpenFile(n.Path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open notification file %s: %w", n.Path, err)
	}
	defer f.Close()

	line, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}
	line = append(line, '\n')

	if _, err := f.Write(line); err != nil {
		return fmt.Errorf("failed to write notification: %w", err)
	}

	n.logger.Info("notification written to file",
		"path", n.Path,
		"agent", msg.AgentID,
		"event", msg.EventType,
	)
	return nil
}

// ── ZulipNotifier — post to a Zulip stream ──────────────────────────

// ZulipNotifier sends notifications to a Zulip stream via the
// POST /api/v1/messages endpoint with HTTP Basic auth.
type ZulipNotifier struct {
	URL    string // e.g., https://zulip.example.com/api/v1/messages
	Email  string // bot email
	Key    string // bot API key
	Stream string // target stream name
	Topic  string // target topic
	logger *slog.Logger
}

func (n *ZulipNotifier) Name() string { return "zulip" }

func (n *ZulipNotifier) Notify(ctx context.Context, msg Message) error {
	content := fmt.Sprintf("**[meshd]** %s event on **%s** blocked: %s",
		msg.EventType, msg.AgentID, msg.Reason)
	if msg.Session != "" {
		content += fmt.Sprintf("\nSession: `%s`", msg.Session)
	}
	content += fmt.Sprintf("\nPriority: %s | %s", msg.Priority, msg.Timestamp.Format(time.RFC3339))

	payload := fmt.Sprintf("type=stream&to=%s&topic=%s&content=%s",
		urlEncode(n.Stream),
		urlEncode(n.Topic),
		urlEncode(content),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.URL,
		bytes.NewBufferString(payload))
	if err != nil {
		return fmt.Errorf("failed to create Zulip request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(n.Email, n.Key)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Zulip request failed: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Zulip returned HTTP %d", resp.StatusCode)
	}

	n.logger.Info("notification sent to Zulip",
		"stream", n.Stream,
		"topic", n.Topic,
		"agent", msg.AgentID,
	)
	return nil
}

// ── WebhookNotifier — generic HTTP POST ─────────────────────────────

// WebhookNotifier sends the notification as a JSON POST to any URL.
// Useful for Slack incoming webhooks, Discord webhooks, ntfy.sh, etc.
type WebhookNotifier struct {
	URL    string
	logger *slog.Logger
}

func (n *WebhookNotifier) Name() string { return "webhook" }

func (n *WebhookNotifier) Notify(ctx context.Context, msg Message) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.URL,
		bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create webhook request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned HTTP %d", resp.StatusCode)
	}

	n.logger.Info("notification sent via webhook",
		"url", n.URL,
		"agent", msg.AgentID,
	)
	return nil
}

// ── Helpers ─────────────────────────────────────────────────────────

// urlEncode performs percent-encoding for form values.
func urlEncode(s string) string {
	var buf bytes.Buffer
	for _, b := range []byte(s) {
		switch {
		case b >= 'a' && b <= 'z', b >= 'A' && b <= 'Z', b >= '0' && b <= '9',
			b == '-', b == '_', b == '.', b == '~':
			buf.WriteByte(b)
		case b == ' ':
			buf.WriteByte('+')
		default:
			fmt.Fprintf(&buf, "%%%02X", b)
		}
	}
	return buf.String()
}

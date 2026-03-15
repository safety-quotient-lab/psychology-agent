// Package kvstore writes agent self-observation data to Cloudflare KV.
// Eliminates the same-zone SPOF: when the compositor cannot HTTP-fetch
// operations-agent (both on the same Cloudflare zone), it reads from KV
// instead. Zero network hop from the Worker's perspective.
//
// Uses the Cloudflare KV REST API:
//   PUT /accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key}
package kvstore

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// Client writes key-value pairs to a Cloudflare KV namespace.
type Client struct {
	accountID   string
	namespaceID string
	apiToken    string
	httpClient  *http.Client
	logger      *slog.Logger
}

// New creates a KV client. Returns nil if any required field is empty
// (self-observation gracefully disabled).
func New(accountID, namespaceID, apiToken string, logger *slog.Logger) *Client {
	if accountID == "" || namespaceID == "" || apiToken == "" {
		if logger != nil {
			logger.Info("KV self-observation disabled — missing CF credentials")
		}
		return nil
	}
	return &Client{
		accountID:   accountID,
		namespaceID: namespaceID,
		apiToken:    apiToken,
		httpClient:  &http.Client{Timeout: 5 * time.Second},
		logger:      logger,
	}
}

// Put writes a value to the KV namespace. TTL in seconds (0 = no expiry).
func (c *Client) Put(ctx context.Context, key string, value []byte, ttlSeconds int) error {
	url := fmt.Sprintf(
		"https://api.cloudflare.com/client/v4/accounts/%s/storage/kv/namespaces/%s/values/%s",
		c.accountID, c.namespaceID, key,
	)
	if ttlSeconds > 0 {
		url += fmt.Sprintf("?expiration_ttl=%d", ttlSeconds)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(value))
	if err != nil {
		return fmt.Errorf("kv put: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("kv put: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("kv put: HTTP %d", resp.StatusCode)
	}

	return nil
}

// SelfObservationKey returns the KV key for an agent's self-reported status.
func SelfObservationKey(agentID string) string {
	return "self-status:" + agentID
}

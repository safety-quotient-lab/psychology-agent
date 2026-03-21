package connection

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// HTTPSynaptic implements SynapticChannel over HTTP.
// Biological analog: synaptic transmission — targeted, connection-based,
// request-response. Used for directed signaling and neuroendocrine commands.
type HTTPSynaptic struct {
	baseURL string
	client  *http.Client
}

// NewHTTPSynaptic creates a synaptic channel to a peer agent's HTTP API.
// Probes /health to verify reachability.
func NewHTTPSynaptic(baseURL string) (*HTTPSynaptic, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	h := &HTTPSynaptic{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
	// Probe: verify the peer responds
	if err := h.Health(); err != nil {
		return nil, fmt.Errorf("peer %s unreachable: %w", baseURL, err)
	}
	return h, nil
}

// Health checks peer liveness via GET /health.
func (h *HTTPSynaptic) Health() error {
	resp, err := h.client.Get(h.baseURL + "/health")
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check returned %d", resp.StatusCode)
	}
	return nil
}

// Status queries the peer's current state via GET /api/status.
func (h *HTTPSynaptic) Status() (map[string]any, error) {
	resp, err := h.client.Get(h.baseURL + "/api/status")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status returned %d", resp.StatusCode)
	}
	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode status: %w", err)
	}
	return result, nil
}

// Send delivers a command/request to the peer via POST.
func (h *HTTPSynaptic) Send(endpoint string, payload any) (map[string]any, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}
	resp, err := h.client.Post(
		h.baseURL+endpoint,
		"application/json",
		strings.NewReader(string(body)),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("POST %s returned %d: %s", endpoint, resp.StatusCode, string(respBody))
	}

	var result map[string]any
	if err := json.Unmarshal(respBody, &result); err != nil {
		// Non-JSON response — return raw body under "body" key
		return map[string]any{"body": string(respBody)}, nil
	}
	return result, nil
}

// ProbeHTTP attempts to connect to a peer's HTTP endpoint.
// Returns the SynapticChannel if reachable, nil if not.
func ProbeHTTP(baseURL string) SynapticChannel {
	h, err := NewHTTPSynaptic(baseURL)
	if err != nil {
		return nil
	}
	return h
}

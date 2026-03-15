package server

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
	"github.com/safety-quotient-lab/operations-agent/internal/health"
)

// newTestServer creates a minimal Server for RPC testing.
func newTestServer(t *testing.T) *Server {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	cfg := &config.Config{AgentID: "test-agent", Port: 0}
	mon := health.NewMonitor(logger)
	srv := New(cfg, mon, nil, nil, logger)
	srv.rpcMethods = srv.buildMethodTable()
	return srv
}

func TestRPCSingleMethodFound(t *testing.T) {
	srv := newTestServer(t)

	body := `{"jsonrpc":"2.0","method":"agent.status","id":1}`
	req := httptest.NewRequest("POST", "/api/rpc", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleRPC(rec, req)

	var resp rpcResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.JSONRPC != "2.0" {
		t.Errorf("expected jsonrpc 2.0, got %s", resp.JSONRPC)
	}
	if resp.Error != nil {
		t.Errorf("unexpected error: %v", resp.Error)
	}
	if resp.Result == nil {
		t.Error("expected non-nil result for agent.status")
	}
}

func TestRPCMethodNotFound(t *testing.T) {
	srv := newTestServer(t)

	body := `{"jsonrpc":"2.0","method":"nonexistent.method","id":2}`
	req := httptest.NewRequest("POST", "/api/rpc", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleRPC(rec, req)

	var resp rpcResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Error == nil {
		t.Fatal("expected error for nonexistent method")
	}
	if resp.Error.Code != rpcMethodNotFound {
		t.Errorf("expected error code %d, got %d", rpcMethodNotFound, resp.Error.Code)
	}
}

func TestRPCInvalidJSON(t *testing.T) {
	srv := newTestServer(t)

	body := `{not valid json}`
	req := httptest.NewRequest("POST", "/api/rpc", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()

	srv.handleRPC(rec, req)

	var resp rpcResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Error == nil {
		t.Fatal("expected parse error")
	}
	if resp.Error.Code != rpcParseError {
		t.Errorf("expected error code %d, got %d", rpcParseError, resp.Error.Code)
	}
}

func TestRPCWrongVersion(t *testing.T) {
	srv := newTestServer(t)

	body := `{"jsonrpc":"1.0","method":"agent.status","id":3}`
	req := httptest.NewRequest("POST", "/api/rpc", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()

	srv.handleRPC(rec, req)

	var resp rpcResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Error == nil {
		t.Fatal("expected invalid request error")
	}
	if resp.Error.Code != rpcInvalidRequest {
		t.Errorf("expected error code %d, got %d", rpcInvalidRequest, resp.Error.Code)
	}
}

func TestRPCBatch(t *testing.T) {
	srv := newTestServer(t)

	body := `[
		{"jsonrpc":"2.0","method":"agent.status","id":1},
		{"jsonrpc":"2.0","method":"event.list","id":2}
	]`
	req := httptest.NewRequest("POST", "/api/rpc", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()

	srv.handleRPC(rec, req)

	var responses []rpcResponse
	if err := json.NewDecoder(rec.Body).Decode(&responses); err != nil {
		t.Fatalf("failed to decode batch response: %v", err)
	}

	if len(responses) != 2 {
		t.Fatalf("expected 2 responses, got %d", len(responses))
	}
	for i, resp := range responses {
		if resp.Error != nil {
			t.Errorf("batch response %d had unexpected error: %v", i, resp.Error)
		}
	}
}

func TestRPCEmptyBody(t *testing.T) {
	srv := newTestServer(t)

	req := httptest.NewRequest("POST", "/api/rpc", bytes.NewBufferString(""))
	rec := httptest.NewRecorder()

	srv.handleRPC(rec, req)

	var resp rpcResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Error == nil {
		t.Fatal("expected error for empty body")
	}
}

func TestRPCInfoEndpoint(t *testing.T) {
	srv := newTestServer(t)

	req := httptest.NewRequest("GET", "/api/rpc", nil)
	rec := httptest.NewRecorder()

	srv.handleRPCInfo(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var info map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&info); err != nil {
		t.Fatalf("failed to decode info: %v", err)
	}

	methods, ok := info["methods"].([]any)
	if !ok {
		t.Fatal("expected methods array in info response")
	}
	if len(methods) < 30 {
		t.Errorf("expected at least 30 methods, got %d", len(methods))
	}
}

func TestRPCWithParams(t *testing.T) {
	srv := newTestServer(t)

	// Test GET handler with params translated to query string.
	body := `{"jsonrpc":"2.0","method":"knowledge.search","params":{"q":"test","limit":"5"},"id":4}`
	req := httptest.NewRequest("POST", "/api/rpc", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()

	srv.handleRPC(rec, req)

	var resp rpcResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// search handler may error without state.db, but should not be method-not-found
	if resp.Error != nil && resp.Error.Code == rpcMethodNotFound {
		t.Error("method knowledge.search should exist in dispatch table")
	}
}

func TestRPCMethodList(t *testing.T) {
	srv := newTestServer(t)
	methods := srv.RPCMethodList()

	if len(methods) == 0 {
		t.Fatal("expected non-empty method list")
	}

	// Verify sorted order.
	for i := 1; i < len(methods); i++ {
		if methods[i-1] > methods[i] {
			t.Errorf("methods not sorted: %s > %s", methods[i-1], methods[i])
		}
	}

	// Check a few expected methods exist.
	expected := []string{"agent.status", "relay.send", "monitor.pulse", "knowledge.query"}
	methodSet := make(map[string]bool, len(methods))
	for _, m := range methods {
		methodSet[m] = true
	}
	for _, e := range expected {
		if !methodSet[e] {
			t.Errorf("expected method %q in list", e)
		}
	}
}

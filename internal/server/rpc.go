// Package server — JSON-RPC 2.0 multiplexer for meshd.
//
// Dispatches JSON-RPC method calls to existing HTTP handlers via a
// response-capture pattern. Dual-protocol: REST routes remain unchanged,
// /api/rpc adds A2A-compatible programmatic access.
//
// Method namespace convention: {domain}.{action} (e.g., "agent.status",
// "relay.send"). Mapped from psychology-agent's 36-route vocabulary
// (json-rpc-vocabulary session T1).
package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
)

// rpcRequest represents a JSON-RPC 2.0 request envelope.
type rpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
	ID      any             `json:"id"`
}

// rpcResponse represents a JSON-RPC 2.0 response envelope.
type rpcResponse struct {
	JSONRPC string   `json:"jsonrpc"`
	Result  any      `json:"result,omitempty"`
	Error   *rpcErr  `json:"error,omitempty"`
	ID      any      `json:"id"`
}

// rpcErr represents a JSON-RPC 2.0 error object.
type rpcErr struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// Standard JSON-RPC 2.0 error codes.
const (
	rpcParseError     = -32700
	rpcInvalidRequest = -32600
	rpcMethodNotFound = -32601
	rpcInternalError  = -32603
)

// methodRoute maps a JSON-RPC method name to an HTTP handler + HTTP method.
type methodRoute struct {
	handler    http.HandlerFunc
	httpMethod string // "GET" or "POST"
}

// buildMethodTable constructs the method→handler dispatch table.
// Called once during route registration.
func (s *Server) buildMethodTable() map[string]methodRoute {
	return map[string]methodRoute{
		// ── A2A Core ──────────────────────────────────────────────
		"relay.send":              {s.handleRelay, "POST"},
		"agent.status":            {s.handleStatus, "GET"},
		"event.list":              {s.handleEvents, "GET"},
		"governance.trigger":      {s.handleTrigger, "POST"},

		// ── Transport ────────────────────────────────────────────
		"transport.inbound":       {s.handleInbound, "POST"},
		"transport.search":        {s.handleSearch, "GET"},
		"transport.redirect":      {s.handleRedirect, "POST"},

		// ── Agent ────────────────────────────────────────────────
		"agent.whoami":            {s.handleWhoAmI, "GET"},
		"agent.keys.create":       {s.handleKeyCreate, "POST"},
		"agent.keys.revoke":       {s.handleKeyRevoke, "DELETE"},

		// ── Event ────────────────────────────────────────────────
		"event.deliberations":     {s.handleDeliberations, "GET"},

		// ── Psychometric ─────────────────────────────────────────
		"psychometric.state":      {s.handlePsychometrics, "GET"},
		"psychometric.mesh":       {s.handlePsychometricsMesh, "GET"},
		"psychometric.spawnrate":  {s.handleSpawnRate, "GET"},

		// ── Tempo ────────────────────────────────────────────────
		"tempo.cognitive":         {s.handleCognitiveTempo, "GET"},
		"tempo.dynamics":          {s.handleTempo, "GET"},
		"tempo.oscillator":        {s.handleOscillator, "GET"},

		// ── Governance ───────────────────────────────────────────
		"governance.consensus":    {s.handleConsensus, "GET"},
		"governance.routing":      {s.handleRouting, "GET"},

		// ── Knowledge ────────────────────────────────────────────
		"knowledge.query":         {s.handleKB, "GET"},
		"knowledge.search":        {s.handleSearch, "GET"},

		// ── Monitor ──────────────────────────────────────────────
		"monitor.pulse":           {s.handlePulse, "GET"},
		"monitor.health":          {s.handleMeshHealth, "GET"},
		"monitor.operations":      {s.handleOperations, "GET"},
		"monitor.trust":           {s.handleTrust, "GET"},
		"monitor.ci":              {s.handleCI, "GET"},
		"monitor.flow":            {s.handleFlow, "GET"},

		// ── Discovery ────────────────────────────────────────────
		"discovery.agents":        {s.handleAgents, "GET"},
		"discovery.webfinger":     {s.handleWebFinger, "GET"},
		"discovery.agentcard":     {s.handleAgentCardStatic, "GET"},
		"discovery.manifest":      {s.handleManifest, "GET"},

		// ── Vocabulary ───────────────────────────────────────────
		"vocab.list":              {s.handleVocab, "GET"},
		"vocab.schema":            {s.handleVocabSchema, "GET"},

		// ── Mesh ─────────────────────────────────────────────────
		"mesh.zmq.register":       {s.handleZMQRegister, "POST"},
		"mesh.aggregate":          {s.handleMeshAggregate, "GET"},
	}
}

// handleRPC serves POST /api/rpc — the JSON-RPC 2.0 multiplexer.
// Supports single requests and batch arrays per the JSON-RPC 2.0 spec.
func (s *Server) handleRPC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed,
			rpcResponse{JSONRPC: "2.0", Error: &rpcErr{Code: rpcInvalidRequest, Message: "POST required"}, ID: nil},
			s.logger)
		return
	}

	// Peek at the first byte to detect batch vs single request.
	var rawBody bytes.Buffer
	if _, err := rawBody.ReadFrom(r.Body); err != nil {
		writeJSON(w, http.StatusOK,
			rpcResponse{JSONRPC: "2.0", Error: &rpcErr{Code: rpcParseError, Message: "failed to read body"}, ID: nil},
			s.logger)
		return
	}
	body := bytes.TrimSpace(rawBody.Bytes())

	if len(body) == 0 {
		writeJSON(w, http.StatusOK,
			rpcResponse{JSONRPC: "2.0", Error: &rpcErr{Code: rpcInvalidRequest, Message: "empty body"}, ID: nil},
			s.logger)
		return
	}

	// Batch request: body starts with '['.
	if body[0] == '[' {
		var batch []rpcRequest
		if err := json.Unmarshal(body, &batch); err != nil {
			writeJSON(w, http.StatusOK,
				rpcResponse{JSONRPC: "2.0", Error: &rpcErr{Code: rpcParseError, Message: "invalid JSON: " + err.Error()}, ID: nil},
				s.logger)
			return
		}
		if len(batch) == 0 {
			writeJSON(w, http.StatusOK,
				rpcResponse{JSONRPC: "2.0", Error: &rpcErr{Code: rpcInvalidRequest, Message: "empty batch"}, ID: nil},
				s.logger)
			return
		}
		responses := make([]rpcResponse, 0, len(batch))
		for _, req := range batch {
			resp := s.dispatchRPC(req, r)
			// Notifications (id == nil) get no response per spec.
			if req.ID != nil {
				responses = append(responses, resp)
			}
		}
		if len(responses) == 0 {
			// All notifications — no response body.
			w.WriteHeader(http.StatusNoContent)
			return
		}
		writeJSON(w, http.StatusOK, responses, s.logger)
		return
	}

	// Single request.
	var req rpcRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeJSON(w, http.StatusOK,
			rpcResponse{JSONRPC: "2.0", Error: &rpcErr{Code: rpcParseError, Message: "invalid JSON: " + err.Error()}, ID: nil},
			s.logger)
		return
	}

	resp := s.dispatchRPC(req, r)
	writeJSON(w, http.StatusOK, resp, s.logger)
}

// dispatchRPC processes a single JSON-RPC request and returns a response.
func (s *Server) dispatchRPC(req rpcRequest, originalReq *http.Request) rpcResponse {
	if req.JSONRPC != "2.0" {
		return rpcResponse{
			JSONRPC: "2.0",
			Error:   &rpcErr{Code: rpcInvalidRequest, Message: "jsonrpc must equal \"2.0\""},
			ID:      req.ID,
		}
	}

	route, found := s.rpcMethods[req.Method]
	if !found {
		return rpcResponse{
			JSONRPC: "2.0",
			Error:   &rpcErr{Code: rpcMethodNotFound, Message: fmt.Sprintf("method %q not found", req.Method)},
			ID:      req.ID,
		}
	}

	// Build a synthetic HTTP request for the handler.
	var syntheticReq *http.Request
	var err error

	switch route.httpMethod {
	case "GET", "DELETE":
		// For GET handlers, translate params object to query string.
		syntheticReq, err = http.NewRequestWithContext(originalReq.Context(), route.httpMethod, "/rpc-dispatch", nil)
		if err != nil {
			return rpcInternalErrorResponse(req.ID, err)
		}
		if len(req.Params) > 0 {
			var params map[string]any
			if err := json.Unmarshal(req.Params, &params); err == nil {
				q := url.Values{}
				for k, v := range params {
					q.Set(k, fmt.Sprintf("%v", v))
				}
				syntheticReq.URL.RawQuery = q.Encode()
			}
		}
	case "POST":
		// For POST handlers, pass params as request body.
		var bodyBytes []byte
		if len(req.Params) > 0 {
			bodyBytes = []byte(req.Params)
		} else {
			bodyBytes = []byte("{}")
		}
		syntheticReq, err = http.NewRequestWithContext(originalReq.Context(), "POST", "/rpc-dispatch", bytes.NewReader(bodyBytes))
		if err != nil {
			return rpcInternalErrorResponse(req.ID, err)
		}
		syntheticReq.Header.Set("Content-Type", "application/json")
	default:
		return rpcResponse{
			JSONRPC: "2.0",
			Error:   &rpcErr{Code: rpcInternalError, Message: "unsupported HTTP method for RPC dispatch"},
			ID:      req.ID,
		}
	}

	// Carry forward auth headers from the original request.
	if auth := originalReq.Header.Get("Authorization"); auth != "" {
		syntheticReq.Header.Set("Authorization", auth)
	}
	syntheticReq.RemoteAddr = originalReq.RemoteAddr

	// Capture the handler's response via httptest.ResponseRecorder.
	rec := httptest.NewRecorder()
	route.handler(rec, syntheticReq)

	result := rec.Result()
	defer result.Body.Close()

	// Parse the captured response body.
	var responseBody any
	if err := json.NewDecoder(result.Body).Decode(&responseBody); err != nil {
		// Handler returned non-JSON — wrap as string.
		responseBody = rec.Body.String()
	}

	// Non-2xx status indicates handler-level error.
	if result.StatusCode >= 400 {
		return rpcResponse{
			JSONRPC: "2.0",
			Error: &rpcErr{
				Code:    -32000 - (result.StatusCode - 400), // Application error range
				Message: fmt.Sprintf("handler returned %d", result.StatusCode),
				Data:    responseBody,
			},
			ID: req.ID,
		}
	}

	return rpcResponse{
		JSONRPC: "2.0",
		Result:  responseBody,
		ID:      req.ID,
	}
}

// rpcInternalErrorResponse builds an internal error response.
func rpcInternalErrorResponse(id any, err error) rpcResponse {
	return rpcResponse{
		JSONRPC: "2.0",
		Error:   &rpcErr{Code: rpcInternalError, Message: err.Error()},
		ID:      id,
	}
}

// RPCMethodList returns the list of registered JSON-RPC methods.
// Used by /api/rpc with GET to expose available methods.
func (s *Server) RPCMethodList() []string {
	methods := make([]string, 0, len(s.rpcMethods))
	for m := range s.rpcMethods {
		methods = append(methods, m)
	}
	// Sort for deterministic output.
	sortStrings(methods)
	return methods
}

// sortStrings sorts a string slice in place (avoids importing sort).
func sortStrings(ss []string) {
	for i := 1; i < len(ss); i++ {
		for j := i; j > 0 && strings.Compare(ss[j-1], ss[j]) > 0; j-- {
			ss[j-1], ss[j] = ss[j], ss[j-1]
		}
	}
}

// handleRPCInfo serves GET /api/rpc — lists available JSON-RPC methods.
func (s *Server) handleRPCInfo(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"jsonrpc":  "2.0",
		"methods":  s.RPCMethodList(),
		"total":    len(s.rpcMethods),
		"endpoint": "/api/rpc",
		"spec":     "https://www.jsonrpc.org/specification",
	}, s.logger)
}

// Package server — zmq.go handles POST /api/zmq/register
// for ZMQ peer reverse-registration (bidirectional handshake).
package server

import (
	"encoding/json"
	"io"
	"net/http"
)

// handleZMQRegister accepts peer registration from ZMQ reverse-register.
func (s *Server) handleZMQRegister(w http.ResponseWriter, r *http.Request) {
	if s.ZMQRegister == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "ZMQ not configured on this meshd instance",
		}, s.logger)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Failed to read request body",
		}, s.logger)
		return
	}

	registered := s.ZMQRegister(json.RawMessage(body))

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"registered":    registered,
		"agent_id":      s.Config.AgentID,
	}, s.logger)
}

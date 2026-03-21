// Package heartbeat implements agent mesh presence detection.
// Each agent emits a heartbeat JSON file to transport/sessions/local-coordination/.
// Peers read heartbeats to discover topology and detect downed agents.
// Ported from scripts/heartbeat.py.
package heartbeat

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// HeartbeatDir is the directory for heartbeat files.
const HeartbeatDir = "transport/sessions/local-coordination"

// StaleThreshold defines when a heartbeat is considered stale.
const StaleThreshold = 30 * time.Minute

// Heartbeat represents the JSON structure emitted by each agent.
type Heartbeat struct {
	Schema      string `json:"schema"`
	Timestamp   string `json:"timestamp"`
	MessageType string `json:"message_type"`
	From        struct {
		AgentID      string   `json:"agent_id"`
		Hostname     string   `json:"hostname"`
		Platform     string   `json:"platform"`
		Capabilities []string `json:"capabilities"`
	} `json:"from"`
	Payload struct {
		Status          string `json:"status"`
		UptimeIndicator string `json:"uptime_indicator"`
		SyncReady       bool   `json:"sync_ready"`
	} `json:"payload"`
}

// Emit writes a heartbeat file for this agent.
func Emit(projectRoot, agentID string) error {
	dir := filepath.Join(projectRoot, HeartbeatDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create heartbeat dir: %w", err)
	}

	hostname, _ := os.Hostname()
	now := time.Now()

	hb := Heartbeat{
		Schema:      "local-coordination/v1",
		Timestamp:   now.Format("2006-01-02T15:04:05-0700"),
		MessageType: "heartbeat",
	}
	hb.From.AgentID = agentID
	hb.From.Hostname = hostname
	hb.From.Platform = fmt.Sprintf("%s-%s", runtime.GOOS, runtime.GOARCH)
	hb.From.Capabilities = []string{}
	hb.Payload.Status = "alive"
	hb.Payload.UptimeIndicator = now.Format("2006-01-02T15:04")
	hb.Payload.SyncReady = true

	data, err := json.MarshalIndent(hb, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal heartbeat: %w", err)
	}

	path := filepath.Join(dir, fmt.Sprintf("heartbeat-%s.json", agentID))
	if err := os.WriteFile(path, append(data, '\n'), 0644); err != nil {
		return fmt.Errorf("write heartbeat: %w", err)
	}

	return nil
}

// PeerStatus describes the liveness state of a peer agent.
type PeerStatus struct {
	AgentID   string
	Status    string // "alive", "stale", "missing"
	Hostname  string
	Platform  string
	Timestamp time.Time
	Age       time.Duration
}

// Scan reads all heartbeat files and classifies peers.
func Scan(projectRoot string) []PeerStatus {
	dir := filepath.Join(projectRoot, HeartbeatDir)
	entries, err := os.ReadDir(dir)
	if err != nil {
		log.Printf("[heartbeat] scan failed: %v", err)
		return nil
	}

	now := time.Now()
	var peers []PeerStatus

	for _, entry := range entries {
		if !strings.HasPrefix(entry.Name(), "heartbeat-") || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}

		var hb Heartbeat
		if err := json.Unmarshal(data, &hb); err != nil {
			continue
		}

		ts, err := time.Parse("2006-01-02T15:04:05-0700", hb.Timestamp)
		if err != nil {
			ts, err = time.Parse("2006-01-02T15:04:05", hb.Timestamp)
			if err != nil {
				continue
			}
		}

		age := now.Sub(ts)
		status := "alive"
		if age > StaleThreshold {
			status = "stale"
		}

		peers = append(peers, PeerStatus{
			AgentID:   hb.From.AgentID,
			Status:    status,
			Hostname:  hb.From.Hostname,
			Platform:  hb.From.Platform,
			Timestamp: ts,
			Age:       age,
		})
	}

	return peers
}

// StaleCount returns how many peers have stale heartbeats.
// Used as an activation signal for the oscillator.
func StaleCount(projectRoot string) int {
	peers := Scan(projectRoot)
	count := 0
	for _, p := range peers {
		if p.Status == "stale" {
			count++
		}
	}
	return count
}

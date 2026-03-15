package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/kvstore"
)

// RunKVSelfObservation periodically writes this agent's /api/status data
// to Cloudflare KV. The compositor reads from KV as a fallback when the
// same-zone HTTP fetch fails (Ashby's Law — dual-path observation).
//
// Runs as a goroutine. Stops when ctx cancels.
func RunKVSelfObservation(
	ctx context.Context,
	srv *Server,
	kv *kvstore.Client,
	agentID string,
	interval time.Duration,
	logger *slog.Logger,
) {
	logger.Info("KV self-observation started", "agent_id", agentID, "interval", interval)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Write immediately on start
	writeStatus(ctx, srv, kv, agentID, logger)

	for {
		select {
		case <-ctx.Done():
			logger.Info("KV self-observation stopped")
			return
		case <-ticker.C:
			writeStatus(ctx, srv, kv, agentID, logger)
		}
	}
}

func writeStatus(ctx context.Context, srv *Server, kv *kvstore.Client, agentID string, logger *slog.Logger) {
	// Build the same status payload that /api/status serves
	status := srv.buildStatusPayload()
	data, err := json.Marshal(status)
	if err != nil {
		logger.Warn("KV self-observation: marshal failed", "err", err)
		return
	}

	key := kvstore.SelfObservationKey(agentID)
	// TTL: 5 minutes — stale after 2.5 intervals
	if err := kv.Put(ctx, key, data, 300); err != nil {
		logger.Warn("KV self-observation: write failed", "err", err, "key", key)
		return
	}

	logger.Debug("KV self-observation: wrote status", "key", key, "bytes", len(data))
}

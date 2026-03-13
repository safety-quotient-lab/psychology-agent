package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
)

// Events serves GET /events — Server-Sent Events stream.
// Sends a "refresh" event whenever the cache generation changes,
// enabling the dashboard to update without polling or full-page reload.
//
// Two event sources trigger updates:
// 1. Cache TTL expiry — periodic DB re-read detects state.db changes
// 2. ZMQ bus messages — Invalidate() forces immediate cache refresh
func Events(cache *collector.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r)
		if r.Method == http.MethodOptions {
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no") // disable nginx/CF buffering

		// Subscribe to cache change notifications
		notify := cache.Subscribe()
		defer cache.Unsubscribe(notify)

		// Send initial connected event
		cache.Status()
		gen := cache.Generation()
		fmt.Fprintf(w, "event: connected\ndata: {\"generation\":%d}\n\n", gen)
		flusher.Flush()

		// Keepalive ticker — prevents proxy/CF from dropping idle connections
		keepalive := time.NewTicker(15 * time.Second)
		defer keepalive.Stop()

		for {
			select {
			case <-r.Context().Done():
				return

			case <-notify:
				// Cache data changed (DB refresh or ZMQ invalidation)
				newGen := cache.Generation()
				if newGen != gen {
					gen = newGen
					fmt.Fprintf(w, "event: refresh\ndata: {\"generation\":%d}\n\n", gen)
					flusher.Flush()
				}

			case <-keepalive.C:
				// Check for any missed changes + send keepalive
				cache.Status() // triggers refresh if TTL expired
				newGen := cache.Generation()
				if newGen != gen {
					gen = newGen
					fmt.Fprintf(w, "event: refresh\ndata: {\"generation\":%d}\n\n", gen)
				} else {
					fmt.Fprint(w, ": keepalive\n\n")
				}
				flusher.Flush()
			}
		}
	}
}

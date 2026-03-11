package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/collector"
)

// Events serves GET /events — Server-Sent Events stream.
// Sends a "refresh" event whenever the cache generation changes,
// enabling the compositor to update without polling.
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

		// Force a cache check to get current generation
		cache.Status()
		gen := cache.Generation()
		fmt.Fprintf(w, "event: connected\ndata: {\"generation\":%d}\n\n", gen)
		flusher.Flush()

		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-r.Context().Done():
				return
			case <-ticker.C:
				// Trigger cache refresh check (respects TTL internally)
				cache.Status()
				newGen := cache.Generation()
				if newGen != gen {
					gen = newGen
					fmt.Fprintf(w, "event: refresh\ndata: {\"generation\":%d}\n\n", gen)
				} else {
					// Keepalive comment — prevents connection timeout
					fmt.Fprint(w, ": keepalive\n\n")
				}
				flusher.Flush()
			}
		}
	}
}

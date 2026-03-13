package collector

import (
	"sync"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Cache provides TTL-based caching for collector results. The cached
// Status struct includes all data (obs + KB), so individual route
// handlers can extract their slice without re-querying.
//
// Design notes:
// - Read-only DB: no write-side invalidation needed, time-based expiry suffices
// - Single refresh: mutex prevents stampede when multiple requests arrive
//   after expiry — first caller refreshes, others wait and share the result
// - Memory cost: ~75 KB for a typical Status struct — negligible vs process footprint
type Cache struct {
	mu          sync.RWMutex
	status      *Status
	kb          *KnowledgeBase
	dictionary  *Dictionary
	lastCollect time.Time
	ttl         time.Duration
	generation  int64
	d           *db.DB
	projectRoot string

	// SSE notification: subscribers receive on their channel when data changes.
	subMu       sync.Mutex
	subscribers map[chan struct{}]struct{}
}

// NewCache creates a cache with the given TTL. A TTL of 10s pairs well
// with the dashboard's 30s auto-refresh — each page load gets a cached
// response ~2 out of 3 times.
func NewCache(d *db.DB, projectRoot string, ttl time.Duration) *Cache {
	return &Cache{
		d:           d,
		projectRoot: projectRoot,
		ttl:         ttl,
		subscribers: make(map[chan struct{}]struct{}),
	}
}

// Status returns the cached mesh status, refreshing if expired.
func (c *Cache) Status() *Status {
	c.mu.RLock()
	if c.status != nil && time.Since(c.lastCollect) < c.ttl {
		s := c.status
		c.mu.RUnlock()
		return s
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	// Double-check after acquiring write lock — another goroutine may have refreshed
	if c.status != nil && time.Since(c.lastCollect) < c.ttl {
		return c.status
	}

	c.status = Collect(c.d, c.projectRoot)
	c.kb = c.status.Knowledge
	c.dictionary = CollectDictionary(c.d)
	c.lastCollect = time.Now()
	c.generation++
	gen := c.generation

	// Notify SSE subscribers of data change
	go c.notifySubscribers(gen)

	return c.status
}

// KnowledgeBase returns the cached KB data.
func (c *Cache) KnowledgeBase() *KnowledgeBase {
	c.Status() // ensure cache populated
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.kb
}

// Generation returns the cache generation counter. Increments on each
// cache refresh, enabling SSE clients to detect data changes.
func (c *Cache) Generation() int64 {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.generation
}

// Dict returns the cached JSON-LD dictionary.
func (c *Cache) Dict() *Dictionary {
	c.Status() // ensure cache populated
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.dictionary
}

// Subscribe returns a channel that receives a signal when data changes.
// Call Unsubscribe to clean up when the SSE client disconnects.
func (c *Cache) Subscribe() chan struct{} {
	ch := make(chan struct{}, 1)
	c.subMu.Lock()
	c.subscribers[ch] = struct{}{}
	c.subMu.Unlock()
	return ch
}

// Unsubscribe removes a subscriber channel and closes it.
func (c *Cache) Unsubscribe(ch chan struct{}) {
	c.subMu.Lock()
	delete(c.subscribers, ch)
	c.subMu.Unlock()
	close(ch)
}

// Invalidate forces a cache refresh on the next access and notifies
// SSE subscribers. Use when external events (ZMQ messages, file changes)
// indicate state.db has been modified.
func (c *Cache) Invalidate() {
	c.mu.Lock()
	c.lastCollect = time.Time{} // zero time forces refresh on next Status()
	c.mu.Unlock()
}

func (c *Cache) notifySubscribers(_ int64) {
	c.subMu.Lock()
	defer c.subMu.Unlock()
	for ch := range c.subscribers {
		select {
		case ch <- struct{}{}:
		default: // non-blocking — subscriber will catch up on next event
		}
	}
}

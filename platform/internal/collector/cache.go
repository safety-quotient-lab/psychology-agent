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
}

// NewCache creates a cache with the given TTL. A TTL of 10s pairs well
// with the dashboard's 30s auto-refresh — each page load gets a cached
// response ~2 out of 3 times.
func NewCache(d *db.DB, projectRoot string, ttl time.Duration) *Cache {
	return &Cache{
		d:           d,
		projectRoot: projectRoot,
		ttl:         ttl,
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

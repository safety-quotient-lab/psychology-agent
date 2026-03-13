package events

import (
	"container/heap"
	"context"
	"sync"
	"time"
)

// QueueConfig holds tuning parameters for the Queue.
type QueueConfig struct {
	MaxSize     int           // maximum events the queue holds before backpressure
	BatchWindow time.Duration // low-priority events accumulate for this duration
}

// DefaultQueueConfig returns a QueueConfig with production-ready defaults.
func DefaultQueueConfig() QueueConfig {
	return QueueConfig{
		MaxSize:     1024,
		BatchWindow: 30 * time.Second,
	}
}

// Queue provides a thread-safe, priority-ordered event queue
// with deduplication and batch accumulation for low-priority events.
//
// Critical and high-priority events dispatch immediately.
// Normal-priority events dispatch immediately.
// Low-priority events accumulate until the batch window elapses
// or a higher-priority event triggers a flush.
//
// When the queue reaches MaxSize, it drops the lowest-priority event
// to make room for the incoming one (backpressure).
type Queue struct {
	mu       sync.Mutex
	cond     *sync.Cond
	pq       eventHeap
	seen     map[string]time.Time // dedup key → insertion time
	config   QueueConfig
	closed   bool

	// batchBuf holds low-priority events waiting for batch dispatch
	batchBuf []Event
	batchMu  sync.Mutex
	flushCh  chan struct{} // signals the batch flusher goroutine
	doneCh   chan struct{} // closed when the queue shuts down
}

// NewQueue creates a queue with the given configuration and starts
// the background batch-flusher goroutine.
func NewQueue(cfg QueueConfig) *Queue {
	q := &Queue{
		pq:       make(eventHeap, 0, cfg.MaxSize),
		seen:     make(map[string]time.Time),
		config:   cfg,
		batchBuf: make([]Event, 0, 32),
		flushCh:  make(chan struct{}, 1),
		doneCh:   make(chan struct{}),
	}
	q.cond = sync.NewCond(&q.mu)
	heap.Init(&q.pq)

	go q.batchFlusher()

	return q
}

// Push adds an event to the queue. It deduplicates by the event's
// DeduplicationKey — if a matching key already exists within the queue,
// Push silently discards the duplicate. Low-priority events route
// through the batch buffer; all others enter the heap directly.
//
// When the queue reaches MaxSize, Push drops the lowest-priority
// (highest numeric value) event to make room.
func (q *Queue) Push(e Event) {
	dedupKey := e.DeduplicationKey()

	if e.Priority == PriorityLow {
		q.batchMu.Lock()
		// Check dedup under batch lock
		q.mu.Lock()
		if _, duplicate := q.seen[dedupKey]; duplicate {
			q.mu.Unlock()
			q.batchMu.Unlock()
			return
		}
		q.seen[dedupKey] = time.Now()
		q.mu.Unlock()

		q.batchBuf = append(q.batchBuf, e)
		q.batchMu.Unlock()

		// Signal the flusher that new low-priority work arrived
		select {
		case q.flushCh <- struct{}{}:
		default:
		}
		return
	}

	q.mu.Lock()
	defer q.mu.Unlock()

	if q.closed {
		return
	}

	// Deduplication check
	if _, duplicate := q.seen[dedupKey]; duplicate {
		return
	}
	q.seen[dedupKey] = time.Now()

	// Backpressure: drop lowest-priority item when full
	if q.pq.Len() >= q.config.MaxSize {
		q.dropLowest()
	}

	heap.Push(&q.pq, e)
	q.cond.Signal()
}

// Pop removes and returns the highest-priority event from the queue.
// It blocks until an event becomes available, the context cancels,
// or the queue closes. Returns a zero Event and false when the queue
// has drained or the context expired.
func (q *Queue) Pop(ctx context.Context) (Event, bool) {
	// Monitor context cancellation in a separate goroutine
	// to unblock the condition variable wait
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			q.mu.Lock()
			q.cond.Broadcast()
			q.mu.Unlock()
		case <-done:
		}
	}()

	q.mu.Lock()
	defer q.mu.Unlock()

	for q.pq.Len() == 0 && !q.closed && ctx.Err() == nil {
		q.cond.Wait()
	}

	if q.pq.Len() == 0 {
		return Event{}, false
	}

	e := heap.Pop(&q.pq).(Event)
	// Allow this dedup key to appear again after processing
	delete(q.seen, e.DeduplicationKey())
	return e, true
}

// Len returns the number of events currently in the dispatch heap
// (excludes low-priority events still in the batch buffer).
func (q *Queue) Len() int {
	q.mu.Lock()
	n := q.pq.Len()
	q.mu.Unlock()
	return n
}

// BatchBufferLen returns the number of low-priority events
// waiting in the batch accumulation buffer.
func (q *Queue) BatchBufferLen() int {
	q.batchMu.Lock()
	n := len(q.batchBuf)
	q.batchMu.Unlock()
	return n
}

// InputChan returns a send-only channel that feeds events into the queue.
// Events received on this channel get forwarded to Push in a background
// goroutine. The returned channel has a buffer of 64 to absorb bursts.
func (q *Queue) InputChan() chan<- Event {
	ch := make(chan Event, 64)
	go func() {
		for {
			select {
			case e, ok := <-ch:
				if !ok {
					return
				}
				q.Push(e)
			case <-q.doneCh:
				return
			}
		}
	}()
	return ch
}

// DrainPriority removes all events at the specified priority level
// from the heap. Useful for self-healing when the queue overflows
// with low-priority work.
func (q *Queue) DrainPriority(p Priority) {
	q.mu.Lock()
	defer q.mu.Unlock()

	// Rebuild the heap without events at priority p
	kept := make(eventHeap, 0, q.pq.Len())
	for _, e := range q.pq {
		if e.Priority != p {
			kept = append(kept, e)
		} else {
			delete(q.seen, e.DeduplicationKey())
		}
	}
	q.pq = kept
	heap.Init(&q.pq)
}

// Drain closes the queue, flushes the batch buffer, and returns
// all remaining events in priority order. After Drain, Push calls
// become no-ops and Pop returns false once the heap empties.
func (q *Queue) Drain() []Event {
	q.mu.Lock()
	q.closed = true
	q.mu.Unlock()

	close(q.doneCh)

	// Flush any remaining batch buffer entries into the heap
	q.flushBatchBuffer()

	q.mu.Lock()
	defer q.mu.Unlock()

	result := make([]Event, 0, q.pq.Len())
	for q.pq.Len() > 0 {
		e := heap.Pop(&q.pq).(Event)
		result = append(result, e)
	}

	q.cond.Broadcast()
	return result
}

// flushBatchBuffer moves all accumulated low-priority events from
// the batch buffer into the main priority heap.
func (q *Queue) flushBatchBuffer() {
	q.batchMu.Lock()
	buf := q.batchBuf
	q.batchBuf = make([]Event, 0, 32)
	q.batchMu.Unlock()

	if len(buf) == 0 {
		return
	}

	q.mu.Lock()
	for _, e := range buf {
		if q.pq.Len() >= q.config.MaxSize {
			q.dropLowest()
		}
		heap.Push(&q.pq, e)
	}
	q.cond.Signal()
	q.mu.Unlock()
}

// batchFlusher runs as a background goroutine. It waits for either
// the batch window to elapse after receiving low-priority events,
// or for the queue to shut down.
func (q *Queue) batchFlusher() {
	var timer *time.Timer

	for {
		select {
		case <-q.doneCh:
			if timer != nil {
				timer.Stop()
			}
			return

		case <-q.flushCh:
			// A low-priority event arrived; start the batch window
			// if no timer already runs
			if timer == nil {
				timer = time.NewTimer(q.config.BatchWindow)
			}
		}

		// Wait for the batch window to expire
		if timer != nil {
			select {
			case <-timer.C:
				q.flushBatchBuffer()
				timer = nil
			case <-q.doneCh:
				timer.Stop()
				return
			}
		}
	}
}

// dropLowest removes the lowest-priority (highest numeric Priority value)
// event from the heap. The caller must hold q.mu.
func (q *Queue) dropLowest() {
	if q.pq.Len() == 0 {
		return
	}

	// Find the index of the lowest-priority event
	worstIdx := 0
	worstPri := q.pq[0].Priority
	for i := 1; i < q.pq.Len(); i++ {
		if q.pq[i].Priority > worstPri ||
			(q.pq[i].Priority == worstPri && q.pq[i].CreatedAt.Before(q.pq[worstIdx].CreatedAt)) {
			worstIdx = i
			worstPri = q.pq[i].Priority
		}
	}

	removed := heap.Remove(&q.pq, worstIdx).(Event)
	delete(q.seen, removed.DeduplicationKey())
}

// eventHeap implements heap.Interface, ordering events by priority
// (lower numeric value = higher dispatch priority) with creation time
// as a tiebreaker (older events dispatch first).
type eventHeap []Event

func (h eventHeap) Len() int { return len(h) }

func (h eventHeap) Less(i, j int) bool {
	if h[i].Priority != h[j].Priority {
		return h[i].Priority < h[j].Priority
	}
	// Same priority: older events get dispatched first
	return h[i].CreatedAt.Before(h[j].CreatedAt)
}

func (h eventHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }

func (h *eventHeap) Push(x any) {
	*h = append(*h, x.(Event))
}

func (h *eventHeap) Pop() any {
	old := *h
	n := len(old)
	e := old[n-1]
	*h = old[:n-1]
	return e
}

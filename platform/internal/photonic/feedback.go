package photonic

import (
	"log"
	"math"
	"sync"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// FeedbackLoop implements the backpropagation analog: observe peer
// coherence change after sending a message → adjust connectome weight.
//
// Grounded in Guanglan et al. (2022): biophotons carry backward error
// signals from post-synaptic to pre-synaptic neuron.
//
// Mechanism:
//   Agent A sends message to Agent B
//   → B processes message
//   → B's coherence CHANGES (measurable via photonic token)
//   → A observes B's coherence change via photonic channel
//   → A's connectome adjusts:
//       if B's coherence rose → LTP (message helped)
//       if B's coherence dropped → LTD (message disrupted)
//       if B's coherence unchanged → no adjustment
type FeedbackLoop struct {
	database *db.DB
	emitter  *Emitter
	mu       sync.Mutex

	// Track pre-message coherence for each peer
	preCoherence map[string]float64 // agentID → coherence before message sent
	preTimestamp map[string]time.Time
}

// NewFeedbackLoop creates a photonic feedback loop.
func NewFeedbackLoop(database *db.DB, emitter *Emitter) *FeedbackLoop {
	return &FeedbackLoop{
		database:     database,
		emitter:      emitter,
		preCoherence: make(map[string]float64),
		preTimestamp: make(map[string]time.Time),
	}
}

// RecordPreMessage records a peer's coherence BEFORE sending them a message.
// Called by the syncer/transport when about to send outbound.
func (f *FeedbackLoop) RecordPreMessage(peerAgentID string) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.emitter.peerMu.RLock()
	token, exists := f.emitter.peerTokens[peerAgentID]
	f.emitter.peerMu.RUnlock()

	if !exists {
		return // no baseline — can't measure change
	}

	f.preCoherence[peerAgentID] = token.Coherence
	f.preTimestamp[peerAgentID] = time.Now()
}

// CheckPostMessage compares current peer coherence against pre-message
// baseline and adjusts connectome weight accordingly.
// Call periodically (e.g., during oscillator tick) for all tracked peers.
func (f *FeedbackLoop) CheckPostMessage() {
	f.mu.Lock()
	defer f.mu.Unlock()

	now := time.Now()
	ltpDelta := 0.05  // weight increase on positive coherence change
	ltdDelta := -0.03 // weight decrease on negative coherence change

	for peerID, preCoh := range f.preCoherence {
		recordTime := f.preTimestamp[peerID]

		// Only check if enough time has passed (allow processing)
		if now.Sub(recordTime) < 30*time.Second {
			continue
		}

		// Expire old records (>10 min = too old for meaningful feedback)
		if now.Sub(recordTime) > 10*time.Minute {
			delete(f.preCoherence, peerID)
			delete(f.preTimestamp, peerID)
			continue
		}

		// Read current peer coherence
		f.emitter.peerMu.RLock()
		token, exists := f.emitter.peerTokens[peerID]
		f.emitter.peerMu.RUnlock()

		if !exists {
			continue
		}

		postCoh := token.Coherence
		delta := postCoh - preCoh

		// Only adjust on meaningful change (> 0.05 difference)
		if math.Abs(delta) < 0.05 {
			delete(f.preCoherence, peerID)
			delete(f.preTimestamp, peerID)
			continue
		}

		// Adjust connectome weight
		var adjustment float64
		if delta > 0 {
			adjustment = ltpDelta // message helped — strengthen
		} else {
			adjustment = ltdDelta // message disrupted — weaken
		}

		_, err := f.database.Exec(
			`UPDATE connectome
			 SET functional_weight = MAX(0.1, MIN(1.0, functional_weight + ?)),
			     last_exchange = datetime('now')
			 WHERE peer_agent = ?`,
			adjustment, peerID)

		if err != nil {
			log.Printf("[photonic-feedback] connectome update failed for %s: %v", peerID, err)
		} else {
			direction := "LTP"
			if adjustment < 0 {
				direction = "LTD"
			}
			log.Printf("[photonic-feedback] %s %s: coherence %.2f→%.2f, weight %+.2f",
				peerID, direction, preCoh, postCoh, adjustment)
		}

		// Clean up — feedback delivered
		delete(f.preCoherence, peerID)
		delete(f.preTimestamp, peerID)
	}
}

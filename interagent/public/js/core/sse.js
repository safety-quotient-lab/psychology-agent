/**
 * sse.js — Server-Sent Events (SSE) live update management.
 *
 * Implements a progressive connectivity strategy: attempt SSE connections
 * to all agent endpoints; fall back to polling (30s interval) if SSE
 * fails or times out. A single successful SSE connection switches the
 * dashboard from polling to event-driven refresh.
 *
 * Event deduplication happens at the activity-stream level (see rendering
 * code), not here — SSE events trigger full refreshes rather than
 * incremental patches.
 *
 * DOM dependencies: #footer-status element for mode indicator.
 * Global state dependencies: AGENTS array, refreshAll function,
 *                            sseConnections array, sseActive flag,
 *                            refreshTimer interval handle.
 */

// Module-level state
// NOTE: these mirror globals in index.html. During integration, the
// caller should pass or share these references.
let sseConnections = [];
let sseActive = false;
let refreshTimer = null;

// Injected dependencies — set via configureSse before calling connectSSE.
let _agents = [];
let _refreshAll = null;

/**
 * Inject runtime dependencies that the SSE module cannot import directly
 * (they live in the inline script or other modules).
 * @param {Object} deps
 * @param {Array} deps.agents — AGENTS array
 * @param {Function} deps.refreshAll — full dashboard refresh function
 * @param {number|null} deps.refreshTimer — current polling interval handle
 */
export function configureSse({ agents, refreshAll, refreshTimer: timer }) {
    _agents = agents;
    _refreshAll = refreshAll;
    refreshTimer = timer;
}

/**
 * Update the SSE/polling mode indicator in the footer.
 * @param {boolean} live — true for SSE mode, false for polling
 *
 * DOM WRITE: sets dataset.sseMode on #footer-status.
 */
function updateSSEIndicator(live) {
    const el = document.getElementById("footer-status");
    if (!el) return;
    el.dataset.sseMode = live ? "live" : "poll";
    // Actual text update happens on next refresh cycle
}

/**
 * Establish SSE connections to all agent /events endpoints.
 * On first successful connection, cancels polling and switches to
 * event-driven updates. On total SSE failure, falls back to 30s polling.
 *
 * DOM READ: none directly (delegates to updateSSEIndicator and _refreshAll).
 * GLOBAL STATE WRITE: sseConnections, sseActive, refreshTimer.
 */
export function connectSSE() {
    sseConnections.forEach(es => es.close());
    sseConnections = [];
    let connectedCount = 0;

    for (const agent of _agents) {
        const es = new EventSource(`${agent.url}/events`);

        es.addEventListener("connected", () => {
            connectedCount++;
            if (connectedCount >= 1 && !sseActive) {
                sseActive = true;
                // SSE working — switch from polling to event-driven
                if (refreshTimer) {
                    clearInterval(refreshTimer);
                    refreshTimer = null;
                }
                updateSSEIndicator(true);
            }
        });

        es.addEventListener("refresh", () => {
            // Agent data changed — trigger full refresh
            if (_refreshAll) _refreshAll();
        });

        es.onerror = () => {
            // SSE failed for this agent — fall back to polling if no SSE remains active
            es.close();
            sseConnections = sseConnections.filter(c => c !== es);
            if (sseConnections.every(c => c.readyState === EventSource.CLOSED)) {
                sseActive = false;
                updateSSEIndicator(false);
                if (!refreshTimer && _refreshAll) {
                    refreshTimer = setInterval(_refreshAll, 30000);
                }
            }
        };

        sseConnections.push(es);
    }

    // Timeout — if no SSE connects within 10s, fall back to polling
    setTimeout(() => {
        if (!sseActive && !refreshTimer && _refreshAll) {
            refreshTimer = setInterval(_refreshAll, 30000);
            updateSSEIndicator(false);
        }
    }, 10000);
}

/**
 * Close all active SSE connections and stop polling.
 * Call during teardown or when the page unloads.
 */
export function disconnectSSE() {
    sseConnections.forEach(es => es.close());
    sseConnections = [];
    sseActive = false;
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

/**
 * Query current SSE connection state.
 * @returns {{ active: boolean, connectionCount: number, polling: boolean }}
 */
export function getSseStatus() {
    return {
        active: sseActive,
        connectionCount: sseConnections.filter(c => c.readyState === EventSource.OPEN).length,
        polling: refreshTimer !== null,
    };
}

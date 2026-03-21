// ── Real-Time Updates (WebSocket primary, SSE fallback) ─────
let wsConnection = null;
let wsReconnectTimer = null;
let _wsBackoff = 2000;
const WS_BACKOFF_MAX = 10000;
let _sseConnection = null;

// Shared event handler — processes events from both WS and SSE
function handleRealtimeEvent(evt) {
    if (evt.type === "pong") return;

    // Alert broadcast — server-pushed alert level change
    if (evt.type === "alert" || evt.Type === "alert") {
        const alertData = evt.Data || evt.data || {};
        const level = parseInt(alertData.level) || 1;
        if (typeof setManualAlert === "function") {
            setManualAlert(level >= 5 ? null : level);
        }
        if (typeof addNarrativeEntry === "function") {
            const names = { 5: "GREEN", 4: "BLUE", 3: "YELLOW", 2: "RED", 1: "BLACK" };
            const label = level >= 5 ? "STAND DOWN" : names[level] || level;
            addNarrativeEntry(`Alert broadcast: ${label} — ${alertData.reason || "unknown"}`);
        }
        return;
    }

    // Status update from a peer agent
    if (evt.type === "status" || evt.Type === "status") {
        const data = evt.Data || evt.data || {};
        const aid = data.agent_id;
        if (aid) {
            agentData[aid] = { status: "online", data: data, id: aid };
            renderAll();
            return;
        }
    }

    // ZMQ relay: peer status via topic="status"
    if (evt.type === "zmq" || evt.Type === "zmq") {
        const zmqData = evt.Data || evt.data || {};
        if (zmqData.topic === "status" && zmqData.data?.agent_id) {
            const aid = zmqData.data.agent_id;
            agentData[aid] = { status: "online", data: zmqData.data, id: aid };
            renderAll();
            return;
        }
    }

    // Deliberation event — trigger re-render
    if (evt.type === "deliberation" || evt.Type === "deliberation") {
        renderAll();
        return;
    }

    // Fallback: refresh on unknown event types
    if (evt.type === "refresh" || evt.Type === "refresh") {
        refreshAll();
    }
}

function connectWebSocket() {
    const wsUrl = location.origin.replace(/^http/, "ws") + "/ws";
    try {
        const ws = new WebSocket(wsUrl);
        const wsTimeout = setTimeout(() => { ws.close(); }, 5000);
        ws.onopen = () => {
            clearTimeout(wsTimeout);
            wsConnection = ws;
            sseActive = true;
            _wsBackoff = 2000;
            updateSSEIndicator(true);
            // Keep polling — WS supplements but doesn't replace periodic refresh
            // WS connected — close SSE if open (avoid duplicate events)
            if (_sseConnection) { _sseConnection.close(); _sseConnection = null; }
        };
        ws.onmessage = (e) => {
            try { handleRealtimeEvent(JSON.parse(e.data)); } catch { /* ignore */ }
        };
        ws.onclose = () => {
            clearTimeout(wsTimeout);
            if (wsConnection === ws) {
                wsConnection = null;
                sseActive = false;
                updateSSEIndicator(false);
                if (!wsReconnectTimer) {
                    wsReconnectTimer = setTimeout(() => {
                        wsReconnectTimer = null;
                        connectWebSocket();
                    }, _wsBackoff);
                    _wsBackoff = Math.min(_wsBackoff * 2, WS_BACKOFF_MAX);
                }
                if (!refreshTimer) refreshTimer = setInterval(refreshAll, _pollInterval);
                // Try SSE fallback while WS reconnects
                if (!_sseConnection) connectSSE();
            }
        };
        ws.onerror = () => { ws.close(); };

        const heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("ping");
            else clearInterval(heartbeat);
        }, 30000);
    } catch {
        _wsBackoff = Math.min(_wsBackoff * 2, WS_BACKOFF_MAX);
        if (!wsReconnectTimer) {
            wsReconnectTimer = setTimeout(() => {
                wsReconnectTimer = null;
                connectWebSocket();
            }, _wsBackoff);
        }
        // Try SSE as fallback
        if (!_sseConnection) connectSSE();
    }
}

// ── SSE Fallback ────────────────────────────────────────────
// Used when WS unavailable (e.g., Cloudflare tunnel doesn't proxy WS)
function connectSSE() {
    // SSE connects same-origin — whichever meshd serves this dashboard relays events
    if (!AGENTS.length) return;

    const es = new EventSource("/events"); // same-origin — no CORS
    _sseConnection = es;

    const timeout = setTimeout(() => {
        es.close();
        _sseConnection = null;
    }, 8000);

    es.onopen = () => {
        clearTimeout(timeout);
        if (!wsConnection) {
            sseActive = true;
            updateSSEIndicator(true);
            // Keep polling — WS supplements but doesn't replace periodic refresh
        }
    };

    // SSE sends typed events — listen for each type
    for (const evtType of ["alert", "status", "zmq", "deliberation", "refresh", "health-check"]) {
        es.addEventListener(evtType, (e) => {
            try {
                const data = JSON.parse(e.data);
                handleRealtimeEvent({ type: evtType, data: data, Data: data });
            } catch { /* ignore */ }
        });
    }

    es.onerror = () => {
        clearTimeout(timeout);
        es.close();
        _sseConnection = null;
        if (!wsConnection) {
            sseActive = false;
            updateSSEIndicator(false);
            if (!refreshTimer) refreshTimer = setInterval(refreshAll, _pollInterval);
        }
        // Retry SSE in 5s if WS still not connected
        if (!wsConnection) {
            setTimeout(() => {
                if (!wsConnection && !_sseConnection) connectSSE();
            }, 5000);
        }
    };
}

function updateSSEIndicator(live) {
    const el = document.getElementById("footer-status");
    if (!el) return;
    el.dataset.sseMode = live ? "live" : "poll";
}

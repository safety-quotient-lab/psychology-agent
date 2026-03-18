// ── WebSocket Real-Time Updates ─────────────────────────────
let wsConnection = null;
let wsReconnectTimer = null;
let _wsBackoff = 2000; // start at 2s, cap at 10s
const WS_BACKOFF_MAX = 10000;

function connectWebSocket() {
    // Connect WS to the compositor meshd (serves the dashboard)
    const wsUrl = location.origin.replace(/^http/, "ws") + "/ws";
    try {
        const ws = new WebSocket(wsUrl);
        const wsTimeout = setTimeout(() => { ws.close(); }, 5000);
        ws.onopen = () => {
            clearTimeout(wsTimeout);
            wsConnection = ws;
            sseActive = true;
            _wsBackoff = 2000; // reset backoff on success
            updateSSEIndicator(true);
            if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
        };
        ws.onmessage = (e) => {
            try {
                const evt = JSON.parse(e.data);
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
            } catch { /* ignore parse errors */ }
        };
        ws.onclose = () => {
            clearTimeout(wsTimeout);
            if (wsConnection === ws) {
                wsConnection = null;
                sseActive = false;
                updateSSEIndicator(false);
                // Reconnect with backoff
                if (!wsReconnectTimer) {
                    wsReconnectTimer = setTimeout(() => {
                        wsReconnectTimer = null;
                        connectWebSocket();
                    }, _wsBackoff);
                    _wsBackoff = Math.min(_wsBackoff * 2, WS_BACKOFF_MAX);
                }
                // Resume polling while disconnected
                if (!refreshTimer) refreshTimer = setInterval(refreshAll, _pollInterval);
            }
        };
        ws.onerror = () => { ws.close(); };

        // Heartbeat every 30s
        const heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("ping");
            else clearInterval(heartbeat);
        }, 30000);
    } catch {
        _wsBackoff = Math.min(_wsBackoff * 2, WS_BACKOFF_MAX);
        // Reconnect
        if (!wsReconnectTimer) {
            wsReconnectTimer = setTimeout(() => {
                wsReconnectTimer = null;
                connectWebSocket();
            }, _wsBackoff);
        }
    }
}

function updateSSEIndicator(live) {
    const el = document.getElementById("footer-status");
    if (!el) return;
    el.dataset.sseMode = live ? "live" : "poll";
}

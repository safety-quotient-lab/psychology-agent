// ── WebSocket Real-Time Updates ─────────────────────────────
let wsConnection = null;
let wsReconnectTimer = null;
let _wsBackoff = 5000; // exponential backoff: 5s → 10s → 20s → 40s (cap 60s)
const WS_BACKOFF_MAX = 60000;

function connectWebSocket() {
    // Connect WS to the compositor meshd (serves the dashboard)
    // Use current page origin — guaranteed to be the right meshd instance
    const wsUrl = location.origin.replace(/^http/, "ws") + "/ws";
    try {
        const ws = new WebSocket(wsUrl);
        const wsTimeout = setTimeout(() => { ws.close(); }, 5000); // 5s connect timeout
        ws.onopen = () => {
            clearTimeout(wsTimeout);
            wsConnection = ws;
            sseActive = true;
            _wsBackoff = 5000; // reset backoff on success
            updateSSEIndicator(true);
            if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
        };
            ws.onmessage = (e) => {
                try {
                    const evt = JSON.parse(e.data);
                    if (evt.type === "pong") return;

                    // Beta-band: real-time status update from a peer agent
                    if (evt.type === "status" || evt.Type === "status") {
                        const data = evt.Data || evt.data || {};
                        const aid = data.agent_id;
                        if (aid) {
                            // Apply directly — no fetch needed
                            agentData[aid] = { status: "online", data: data, id: aid };
                            renderAll();
                            return;
                        }
                    }

                    // ZMQ relay: peer status arrives via topic="status"
                    if (evt.type === "zmq" || evt.Type === "zmq") {
                        const zmqData = evt.Data || evt.data || {};
                        if (zmqData.topic === "status" && zmqData.data?.agent_id) {
                            const aid = zmqData.data.agent_id;
                            agentData[aid] = { status: "online", data: zmqData.data, id: aid };
                            renderAll();
                            return;
                        }
                    }

                    // Alert broadcast — server-pushed alert level change
                    if (evt.type === "alert" || evt.Type === "alert") {
                        const alertData = evt.Data || evt.data || {};
                        const level = parseInt(alertData.level) || 1;
                        if (typeof setManualAlert === "function") {
                            // level 5 = stand down (clear manual override)
                            setManualAlert(level >= 5 ? null : level);
                        }
                        if (typeof addNarrativeEntry === "function") {
                            const names = { 5: "GREEN", 4: "BLUE", 3: "YELLOW", 2: "RED", 1: "BLACK" };
                            const label = level >= 5 ? "STAND DOWN" : names[level] || level;
                            addNarrativeEntry(`Alert broadcast: ${label} — ${alertData.reason || "unknown"}`);
                        }
                        return;
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
                } catch {}
            };
            ws.onclose = () => {
                clearTimeout(wsTimeout);
                if (wsConnection === ws) {
                    wsConnection = null;
                    sseActive = false;
                    updateSSEIndicator(false);
                    // Exponential backoff reconnect
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
            // WebSocket not available — fall back to SSE
            _wsBackoff = Math.min(_wsBackoff * 2, WS_BACKOFF_MAX);
        }
    // No WebSocket available — fall back to SSE
    connectSSE();
}

// ── SSE Live Updates (fallback) ──────────────────────────────
function connectSSE() {
    sseConnections.forEach(es => es.close());
    sseConnections = [];
    let connectedCount = 0;
    const sseFailedAgents = new Set(); // Track agents that fail SSE — don't retry

    for (const agent of AGENTS) {
        // Skip agents already known to lack SSE
        if (sseFailedAgents.has(agent.id)) continue;

        const es = new EventSource(`${agent.url}/events`);
        let connectionTimeout = setTimeout(() => {
            // If no "connected" event within 5s, this agent lacks SSE
            es.close();
            sseFailedAgents.add(agent.id);
            sseConnections = sseConnections.filter(c => c !== es);
        }, 5000);

        es.addEventListener("connected", (e) => {
            clearTimeout(connectionTimeout);
            connectedCount++;
            if (connectedCount >= 1 && !sseActive) {
                sseActive = true;
                if (refreshTimer) {
                    clearInterval(refreshTimer);
                    refreshTimer = null;
                }
                updateSSEIndicator(true);
            }
        });

        es.addEventListener("refresh", (e) => {
            refreshAll();
        });

        es.onerror = () => {
            clearTimeout(connectionTimeout);
            es.close();
            sseFailedAgents.add(agent.id); // Don't retry this agent
            sseConnections = sseConnections.filter(c => c !== es);
            if (sseConnections.every(c => c.readyState === EventSource.CLOSED)) {
                sseActive = false;
                updateSSEIndicator(false);
                if (!refreshTimer) {
                    refreshTimer = setInterval(refreshAll, 30000);
                }
            }
        };

        sseConnections.push(es);
    }

    // Timeout — if no SSE connects within 10s, fall back to polling
    setTimeout(() => {
        if (!sseActive && !refreshTimer) {
            refreshTimer = setInterval(refreshAll, 30000);
            updateSSEIndicator(false);
        }
    }, 10000);
}

function updateSSEIndicator(live) {
    const el = document.getElementById("footer-status");
    if (!el) return;
    el.dataset.sseMode = live ? "live" : "poll";
    // Update will happen on next refresh cycle
}

// ── Render: Operations ──────────────────────────────────────────



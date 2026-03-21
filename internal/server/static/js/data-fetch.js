// ═══ DATA FETCH ═════════════════════════════════════════════

// Version check — detect when server has newer frontend
let _loadedVersion = null;
function checkVersionHeader(resp) {
    const sv = resp.headers.get("X-Meshd-Version");
    if (!sv) return;
    if (!_loadedVersion) { _loadedVersion = sv; return; }
    if (sv !== _loadedVersion) {
        // Server has new version — show UPDATE pill in stardate tray
        const pill = document.getElementById("lcars-version-pill");
        if (pill) { pill.style.display = "flex"; pill.title = `New version: ${sv}`; }
        // Flash the stardate cell to draw attention
        const sd = document.getElementById("lcars-hdr-stardate");
        if (sd) sd.classList.add("hdr-attract");
    }
}

// Adaptive polling — backs off when agents unreachable
let _failedAgents = new Set();  // agents that failed last fetch
let _pollInterval = 30000;      // starts at 30s, backs off to 120s
const POLL_MIN = 30000;
const POLL_MAX = 120000;
const FETCH_TIMEOUT = 3000;     // 3s timeout (was 8s — too slow)

// Same-origin: local agent full status + mesh pulse for all agents
async function fetchLocalStatus() {
    try {
        const resp = await fetch("/api/status", { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        checkVersionHeader(resp);
        return await resp.json();
    } catch { return null; }
}

async function fetchMeshPulse() {
    try {
        const resp = await fetch("/api/pulse", { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch { return null; }
}

let _refreshing = false;
async function refreshAll() {
    if (_refreshing) return;
    _refreshing = true;
    try {
    // Same-origin fetches only — no CORS
    const [localData, pulseData] = await Promise.allSettled([fetchLocalStatus(), fetchMeshPulse()]);
    const local = localData.status === "fulfilled" ? localData.value : null;
    const pulse = pulseData.status === "fulfilled" ? pulseData.value : null;

    // Initialize all agents with stub data
    for (const agent of AGENTS) {
        if (!agentData[agent.id]) {
            agentData[agent.id] = { id: agent.id, status: "unreachable", data: { agent_id: agent.id } };
        }
    }

    // Populate from pulse (covers all agents with core metrics)
    // Pulse may return display names instead of canonical IDs — map to AGENTS
    if (pulse?.agents) {
        for (const pa of pulse.agents) {
            // Match pulse agent to AGENTS array (exact ID → fuzzy name match)
            const match = AGENTS.find(a => a.id === pa.id) ||
                          AGENTS.find(a => pa.id.toLowerCase().includes(a.id.split("-")[0]));
            const aid = match ? match.id : pa.id;
            const existing = agentData[aid]?.data || {};
            agentData[aid] = {
                id: aid,
                status: pa.status === "online" ? "online" : "unreachable",
                data: { ...existing, agent_id: aid, health: pa.health || "unknown",
                    version: pa.version || "", mesh_mode: pulse.mesh_mode || "active",
                    autonomy_budget: { budget_spent: pa.budget_spent || 0, budget_cutoff: pa.budget_cutoff || 0, sleep_mode: pa.sleep_mode ? "1" : "0" },
                    session_active: pa.session_active || false,
                    unprocessed_messages: pa.unprocessed_messages || [],
                    gc_metrics: { gc_handled_total: pa.gc_handled || 0 },
                    event_count: pa.event_count || 0,
                    deliberation_count: pa.deliberation_count || 0,
                    psychometrics: pa.affect_category ? { emotional_state: { affect_category: pa.affect_category } } : undefined },
            };
            if (pa.status === "online") _failedAgents.delete(aid);
            else _failedAgents.add(aid);
        }
    }

    // Enrich local agent with full status (psychometrics, events, etc.)
    if (local) {
        const aid = local.agent_id || "mesh";
        agentData[aid] = { id: aid, status: "online", data: local };
        _failedAgents.delete(aid);
    }
    try { renderPulse(); } catch(e) { console.error("renderPulse failed:", e); }
    try { renderOperations(); } catch(e) { console.error("renderOperations failed:", e); }

    // Refresh active station tab — fetch + render for whichever tab the user views
    refreshActiveStation();

    // Fetch KB data (non-blocking — renders when ready)
    refreshKnowledge();

    // Adaptive backoff — slow polling when most agents unreachable
    const failRate = _failedAgents.size / AGENTS.length;
    if (failRate > 0.5) {
        _pollInterval = Math.min(_pollInterval * 1.5, POLL_MAX);
    } else if (failRate === 0) {
        _pollInterval = POLL_MIN;
    }
    // Reschedule with adapted interval
    if (refreshTimer && !sseActive) {
        clearInterval(refreshTimer);
        refreshTimer = setInterval(refreshAll, _pollInterval);
    }

    const intervalSec = Math.round(_pollInterval / 1000);
    const mode = sseActive ? "\u25CF live" : `\u25CB poll ${intervalSec}s`;
    const ftr = document.getElementById("footer-status");
    if (ftr) ftr.textContent = `Updated ${new Date().toLocaleTimeString()} · ${mode}`;

    // Update LCARS header/footer band data if in LCARS mode
    if (document.body.classList.contains("theme-lcars")) {
        updateLcarsHeaderData();
        evaluateAlertLevel();
        const ftrFeed = document.getElementById("lcars-ftr-feed");
        if (ftrFeed) ftrFeed.textContent = `Feed: ${sseActive ? "\u25CF Live" : "\u25CB Polling"}`;
        addNarrativeEntry(generateMeshNarrative());
    }
    } finally { _refreshing = false; }
}

// renderAll — re-render all tabs from cached agentData (no fetch)
function renderAll() {
    try { renderPulse(); } catch(e) {}
    try { renderOperations(); } catch(e) {}
    refreshActiveStation();
    if (document.body.classList.contains("theme-lcars")) {
        updateLcarsHeaderData();
        evaluateAlertLevel();
    }
}

// refreshActiveStation — fetch + render data for the currently visible station tab.
// Called on every poll cycle so Engineering/Science/Medical stay live.
function refreshActiveStation() {
    const activeTab = document.querySelector('.lcars-tab.active')?.dataset?.tab ||
                      document.querySelector('.lcars-sidebar-btn.active')?.dataset?.tab;
    if (!activeTab) return;
    try {
        if (activeTab === "engineering" && typeof fetchEngineeringData === "function") fetchEngineeringData();
        else if (activeTab === "science" && typeof fetchScienceData === "function") fetchScienceData();
        else if (activeTab === "medical" && typeof fetchMedicalData === "function") fetchMedicalData();
        else if (activeTab === "helm" && typeof fetchHelmData === "function") fetchHelmData();
        else if (activeTab === "tactical" && typeof fetchTacticalData === "function") fetchTacticalData();
    } catch(e) { console.error("refreshActiveStation failed:", e); }
}

// ── Render: Vitals ─────────────────────────────────────────────
function renderVitals() {
    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;

    // Autonomy: deliberations = autonomous actions taken (counter model)
    const totalDeliberations = online.reduce((sum, a) =>
        sum + getDeliberations(a.data?.autonomy_budget), 0);
    const totalCutoff = online.reduce((sum, a) =>
        sum + getCutoff(a.data?.autonomy_budget), 0);
    const pending = online.reduce((sum, a) => sum + ((a.data?.totals || {}).unprocessed || 0), 0);
    const gates = online.reduce((sum, a) => sum + (a.data?.active_gates || []).length, 0);
    const debt = online.reduce((sum, a) => sum + ((a.data?.totals || {}).epistemic_flags_unresolved || 0), 0);

    const agentsEl = document.getElementById("vital-agents");
    agentsEl.className = "vital-value " + (online.length === total ? "healthy" : online.length > 0 ? "degraded" : "critical");
    setTrackedValue("vital-agents", online.length, { suffix: `/${total}` });
    setTrackedValue("vital-budget", totalDeliberations, {
        suffix: totalCutoff > 0 ? `/${totalCutoff}` : ""
    });
    setTrackedValue("vital-pending", pending);
    setTrackedValue("vital-gates", gates);
    setTrackedValue("vital-debt", debt, { inverted: true });

    // Accumulate sparkline history
    pushSparkValue("mesh-delib", totalDeliberations);
    pushSparkValue("mesh-pending", pending);
    pushSparkValue("mesh-gates", gates);
    pushSparkValue("mesh-online", online.length);
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (d?.status === "online") {
            pushSparkValue(`delib-${agent.id}`, getDeliberations(d.data?.autonomy_budget));
        }
    }

    // Update ops badge
    if (pending > 0) {
        const badge = document.getElementById("ops-badge");
        badge.textContent = pending;
        badge.style.display = "inline";
    }
}

// ── Render: Agent Cards ────────────────────────────────────────
// W1: LCARS Numeric Data Grid — alternating color capsules with mesh metrics
function renderLcarsDataGrid() {
    const el = document.getElementById("lcars-data-grid");
    if (!el) return;

    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalDelib = online.reduce((s, a) => s + getDeliberations(a.data?.autonomy_budget), 0);
    const totalMsgs = online.reduce((s, a) => s + (a.data?.recent_messages?.length || 0), 0);
    const pending = online.reduce((s, a) => s + (a.data?.unprocessed_messages?.length || 0), 0);
    const decisions = online.reduce((s, a) => s + (a.data?.active_gates?.length || 0), 0);
    const events = online.reduce((s, a) => s + (a.data?.event_count || 0), 0);

    // LCARS capsule colors — alternating from the palette
    const colors = ["#cc99cc", "#ff9966", "#9999ff", "#cc6699", "#ff9900", "#6aab8e", "#5b9cf6"];

    const metrics = [
        { val: fmtNum(totalDelib), label: "DELIB" },
        { val: fmtNum(totalMsgs), label: "MSG" },
        { val: fmtNum(pending), label: "PEND" },
        { val: fmtNum(decisions), label: "GATE" },
        { val: fmtNum(events), label: "EVT" },
        { val: online.length + "/" + AGENTS.length, label: "AGENTS" },
    ];

    el.innerHTML = metrics.map((m, i) => {
        const bg = colors[i % colors.length];
        return `<div style="display:inline-flex; gap:2px;">
            <div style="background:${bg}; border-radius:10px 0 0 10px; padding:4px 8px; color:#000; font-weight:700; font-size:0.82em; min-width:36px; text-align:right;">${m.val}</div>
            <div style="background:color-mix(in srgb, ${bg} 40%, #111); border-radius:0 10px 10px 0; padding:4px 8px; color:${bg}; font-size:0.65em; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; display:flex; align-items:center;">${m.label}</div>
        </div>`;
    }).join("");
}

function renderAgentCards() {
    const grid = document.getElementById("agents-grid");
    grid.innerHTML = "";

    for (const agent of AGENTS) {
        const state = agentData[agent.id] || { status: "unreachable" };
        const card = document.createElement("div");
        card.className = "lcars-panel agent-card";
        card.dataset.agent = agent.id;
        card.style.cursor = "pointer";
        card.onclick = () => { switchAgent(agent.id); switchTab('meta'); };

        if (state.status !== "online") {
            card.innerHTML = `
                <div class="lcars-panel-header">${agent.id}</div>
                <div class="lcars-panel-body">
                    <div class="agent-identity">
                        <span class="agent-name agent-name-offline">${agent.id}</span>
                        <span class="agent-status-dot offline" aria-label="offline"></span>
                        <span style="font-size:0.7em;color:var(--c-alert);margin-left:4px">offline</span>
                    </div>
                    <div style="color: var(--c-alert); font-size: 0.8em; margin-top: 8px">
                        Unreachable${state.error ? ` — ${state.error}` : ""}
                    </div>
                </div>`;
            grid.appendChild(card);
            continue;
        }

        const d = state.data;
        // Autonomy: deliberations via counter helpers
        const autonomy = d.autonomy_budget || {};
        const deliberations = getDeliberations(autonomy);
        const cutoff = getCutoff(autonomy);
        const pct = cutoff > 0 ? Math.round((deliberations / cutoff) * 100) : 0;
        const counterClass = pct < 60 ? "high" : pct < 85 ? "mid" : "low";
        const counterLabel = cutoff > 0 ? `${deliberations}/${cutoff}` : `${deliberations}`;
        const unprocessed = (d.totals || {}).unprocessed || 0;
        const gateCount = (d.active_gates || []).length;
        const schema = d.schema_version || "?";
        const schedule = d.schedule || {};
        const lastSync = schedule.last_sync_time || d.collected_at || "—";
        const syncShort = lastSync !== "—" ? lastSync.split("T")[1]?.substring(0, 8) || lastSync : "—";

        card.innerHTML = `
            <div class="lcars-panel-header">${agent.id}</div>
            <div class="lcars-panel-body">
                <div class="agent-identity">
                    <span class="agent-name">${agent.id}</span>
                    <span class="agent-status-dot online" aria-label="online"></span>
                    <span style="font-size:0.7em;color:var(--c-health);margin-left:4px">online</span>
                </div>
                <div class="agent-metrics">
                    <div class="agent-metric">
                        <div class="agent-metric-value">${counterLabel}</div>
                        <div class="agent-metric-label">Autonomy</div>
                    </div>
                    <div class="agent-metric">
                        <div class="agent-metric-value">${unprocessed}</div>
                        <div class="agent-metric-label">Pending</div>
                    </div>
                    <div class="agent-metric">
                        <div class="agent-metric-value">${gateCount}</div>
                        <div class="agent-metric-label">Gates</div>
                    </div>
                </div>
                <div class="budget-bar-track">
                    <div class="budget-bar-fill ${counterClass}" style="width: ${cutoff > 0 ? pct : 0}%"></div>
                </div>
                <div class="agent-detail-row">
                    <span>Schema v${schema}</span>
                    <span>Last sync: ${syncShort}</span>
                </div>
            </div>`;

        grid.appendChild(card);
    }
    mirrorToLcars("agents-grid", "lcars-ops-pulse-agents");
}

// ── Render: Topology ───────────────────────────────────────────
function renderTopology() {
    const svg = document.getElementById("topology-svg");
    // Dynamic positions for any agent count (pentagon/circle layout)
    const n = AGENTS.length;
    const cx = 300, cy = 160, r = 130;
    const positions = [];
    for (let i = 0; i < n; i++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        positions.push({ x: Math.round(cx + r * Math.cos(angle)), y: Math.round(cy + r * Math.sin(angle)) });
    }

    let html = "";

    // Grid overlay — Ohniaka Comm Traffic pattern
    const gridColor = "rgba(153,153,255,0.08)";
    const labelColor = "rgba(153,153,255,0.25)";
    for (let x = 60; x < 580; x += 60) {
        html += `<line x1="${x}" y1="0" x2="${x}" y2="340" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="2,4"/>`;
    }
    for (let y = 40; y < 340; y += 60) {
        html += `<line x1="0" y1="${y}" x2="600" y2="${y}" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="2,4"/>`;
    }
    // Sector labels along bottom
    const sectors = ["001", "002", "003", "004", "005", "006", "007", "008", "009"];
    sectors.forEach((s, i) => {
        html += `<text x="${60 + i * 60}" y="335" fill="${labelColor}" font-size="8" text-anchor="middle" font-family="monospace">${s}</text>`;
    });

    // Draw edges — curved arcs instead of straight lines
    for (let i = 0; i < AGENTS.length; i++) {
        for (let j = i + 1; j < AGENTS.length; j++) {
            const a = positions[i], b = positions[j];
            // Quadratic bezier with control point offset from midpoint
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const dx = b.x - a.x, dy = b.y - a.y;
            const cx = mx - dy * 0.15, cy = my + dx * 0.15;
            html += `<path d="M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}"
                fill="none" stroke="var(--topo-edge)" stroke-width="2" opacity="var(--topo-edge-opacity)"/>`;
        }
    }

    // Draw nodes
    for (let i = 0; i < AGENTS.length; i++) {
        const agent = AGENTS[i];
        const pos = positions[i];
        const state = agentData[agent.id];
        const online = state?.status === "online";
        const fill = online ? agent.color : "var(--c-inactive)";
        const delib = online ? getDeliberations(state.data?.autonomy_budget) : 0;

        html += `<g style="cursor:pointer" onclick="switchAgent('${agent.id}');switchTab('meta')">
            <circle cx="${pos.x}" cy="${pos.y}" r="45"
                fill="${fill}" opacity="${online ? 0.10 : 0.04}"
                stroke="${fill}" stroke-width="2"/>
            <circle cx="${pos.x}" cy="${pos.y}" r="16" fill="${fill}"
                opacity="${online ? 1 : 0.3}">
                ${online ? `<animate attributeName="r" values="15;19;15" dur="3s" repeatCount="indefinite"/>` : ""}
            </circle>
            <text x="${pos.x}" y="${pos.y + 56}" text-anchor="middle"
                font-size="16" font-family="inherit" font-weight="bold"
                fill="currentColor">
                ${agentName(agent)}
            </text>
            ${online ? `<text x="${pos.x}" y="${pos.y + 70}" text-anchor="middle"
                font-size="9" font-family="monospace" fill="${labelColor}">
                ${delib} delib
            </text>` : ""}
        </g>`;
    }

    svg.innerHTML = html;

    // Update topology footer
    const topoFtr = document.getElementById("topo-footer-num");
    if (topoFtr) {
        const onlineCount = Object.values(agentData).filter(a => a.status === "online").length;
        topoFtr.textContent = onlineCount + "/" + AGENTS.length;
    }

    mirrorToLcars("topology-svg", "lcars-topology-svg");
}

// ── Render: Activity Stream ────────────────────────────────────
function renderActivity() {
    const container = document.getElementById("activity-stream");
    const allMessages = [];

    for (const agent of AGENTS) {
        const state = agentData[agent.id];
        if (state?.status !== "online") continue;
        const messages = state.data?.recent_messages || [];
        messages.forEach(m => {
            allMessages.push({
                timestamp: m.timestamp || "",
                from: m.from_agent || "?",
                to: m.to_agent || "?",
                type: m.message_type || "—",
                subject: m.subject || "",
                session: m.session_name || "",
            });
        });
    }

    // Deduplicate: exact match by session+from+timestamp, plus
    // near-duplicate suppression (same session+subject within 5 seconds)
    const seen = new Set();
    const recentKeys = new Map(); // contentKey -> timestamp for 5s dedup
    const unique = allMessages.filter(m => {
        const key = `${m.session}-${m.from}-${m.timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        // 5-second content dedup: same session + subject within 5s window
        const contentKey = `${m.session}-${m.subject}`;
        const ts = parseTS(m.timestamp);
        const prev = recentKeys.get(contentKey);
        if (prev != null && Math.abs(ts - prev) < 5000) return false;
        recentKeys.set(contentKey, ts);
        return true;
    });
    unique.sort((a, b) => parseTS(b.timestamp) - parseTS(a.timestamp));
    const display = unique.slice(0, 8);

    if (display.length === 0) {
        container.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85em; padding: 8px">No recent messages</div>`;
        return;
    }

    container.innerHTML = display.map(m => {
        const time = formatTS(m.timestamp);
        const sess = escapeHtml(m.session || '');
        return `<a href="#pane-meta" class="activity-item activity-link" onclick="switchTab('meta');document.getElementById('filter-messages').value='${sess}';filterTable('messages');return false;">
            <span class="activity-time">${time}</span>
            <span class="activity-route">
                <span class="from">${agentName(m.from)}</span>
                &rarr; <span class="to">${agentName(m.to)}</span>
            </span>
            <span class="activity-type">${m.type}</span>
        </a>`;
    }).join("");
    mirrorToLcars("activity-stream", "lcars-ops-activity");
}

// ── Render: Combined ───────────────────────────────────────────


/**
 * pulse.js — Pulse station (TNG: Main Bridge viewscreen status overview).
 *
 * Renders the primary dashboard: agent vitals, agent cards, mesh topology,
 * and activity stream. Fetches agent status from each agent's /api/status
 * endpoint.
 *
 * Data endpoints:
 *   GET {agent.url}/api/status — per-agent health, budget, gates, messages
 *
 * DOM dependencies: #vital-agents, #vital-budget, #vital-pending, #vital-gates,
 *   #vital-debt, #ops-badge, #agents-grid, #topology-svg, #activity-stream
 *
 * Global state accessed: AGENTS, agentData, activeAgentFilter
 * Global functions called: switchTab, switchAgent, filterTable, parseTS (via utils)
 */

import { escapeHtml, parseTS, formatTS } from '../core/utils.js';

// ── Severity Classification ────────────────────────────────────

/**
 * Map a message type to a severity CSS class.
 * @param {string} messageType — e.g. "problem-report", "ack", "directive"
 * @returns {string} — CSS class: severity-info, severity-warning, severity-error, severity-success
 */
function classifyMessageSeverity(messageType) {
    const type = (messageType || "").toLowerCase();
    if (type.includes("problem") || type.includes("error") || type.includes("fail")) return "severity-error";
    if (type.includes("warn") || type.includes("escalat")) return "severity-warning";
    if (type.includes("ack") || type.includes("complete") || type.includes("resolved")) return "severity-success";
    return "severity-info";
}

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch status from a single agent's /api/status endpoint.
 * @param {Object} agent — { id, url, color }
 * @returns {Promise<Object>} — { id, status: "online"|"unreachable", data?, error? }
 */
export async function fetchAgentStatus(agent) {
    try {
        const resp = await fetch(`${agent.url}/api/status`, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return { id: agent.id, status: "online", data: await resp.json() };
    } catch (err) {
        return { id: agent.id, status: "unreachable", error: err.message };
    }
}

/**
 * Fetch all agent statuses and store results into agentData.
 * Triggers renderPulse and renderOperations after completion.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — mutable store keyed by agent id
 * @returns {Promise<void>}
 */
export async function fetchPulseData(AGENTS, agentData) {
    const results = await Promise.allSettled(AGENTS.map(fetchAgentStatus));
    results.forEach((r, i) => {
        agentData[AGENTS[i].id] = r.status === "fulfilled" ? r.value : { id: AGENTS[i].id, status: "unreachable" };
    });
}

// ── Render: Vitals ─────────────────────────────────────────────

/**
 * Update the vitals bar at the top of the Pulse pane.
 * DOM WRITE: #vital-agents, #vital-budget, #vital-pending, #vital-gates,
 *            #vital-debt, #ops-badge
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderVitals(AGENTS, agentData) {
    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;

    const totalBudget = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_current ?? 0);
    }, 0);
    const maxBudget = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_max ?? 20);
    }, 0);
    const pending = online.reduce((sum, a) => sum + ((a.data?.totals || {}).unprocessed || 0), 0);
    const gates = online.reduce((sum, a) => sum + (a.data?.active_gates || []).length, 0);
    const debt = online.reduce((sum, a) => sum + ((a.data?.totals || {}).epistemic_flags_unresolved || 0), 0);

    const agentsEl = document.getElementById("vital-agents");
    agentsEl.textContent = `${online.length}/${total}`;
    agentsEl.className = "vital-value " + (online.length === total ? "healthy" : online.length > 0 ? "degraded" : "critical");

    document.getElementById("vital-budget").textContent = `${totalBudget}/${maxBudget}`;
    document.getElementById("vital-pending").textContent = pending;
    document.getElementById("vital-gates").textContent = gates;
    document.getElementById("vital-debt").textContent = debt;

    // Update ops badge
    if (pending > 0) {
        const badge = document.getElementById("ops-badge");
        badge.textContent = pending;
        badge.style.display = "inline";
    }
}

// ── Render: Agent Cards ────────────────────────────────────────

/**
 * Render agent status cards in the agents grid.
 * DOM WRITE: #agents-grid (innerHTML replacement)
 * NOTE: onclick handlers reference global switchAgent and switchTab.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderAgentCards(AGENTS, agentData) {
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
                        <span class="agent-name">${agent.id}</span>
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
        const budget = d.autonomy_budget || {};
        const cur = budget.budget_current ?? 0;
        const max = budget.budget_max ?? 20;
        const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
        const budgetClass = pct > 50 ? "high" : pct > 20 ? "mid" : "low";
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
                        <div class="agent-metric-value">${cur}/${max}</div>
                        <div class="agent-metric-label">Budget</div>
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
                    <div class="budget-bar-fill ${budgetClass}" style="width: ${pct}%"></div>
                </div>
                <div class="agent-detail-row">
                    <span>Schema v${schema}</span>
                    <span>Last sync: ${syncShort}</span>
                </div>
            </div>`;

        grid.appendChild(card);
    }
}

// ── Render: Topology ───────────────────────────────────────────

/**
 * Render the mesh topology SVG showing agent nodes and edges.
 * DOM WRITE: #topology-svg (innerHTML replacement)
 * NOTE: onclick handlers reference global switchAgent and switchTab.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderTopology(AGENTS, agentData) {
    const svg = document.getElementById("topology-svg");
    const positions = [
        { x: 300, y: 55 },   // top
        { x: 520, y: 160 },  // right
        { x: 300, y: 265 },  // bottom
        { x: 80, y: 160 },   // left
    ];

    let html = "";

    // Draw edges between all pairs — each edge carries a data-edge id for activity highlighting
    for (let i = 0; i < AGENTS.length; i++) {
        for (let j = i + 1; j < AGENTS.length; j++) {
            const a = positions[i], b = positions[j];
            const edgeId = `${AGENTS[i].id}--${AGENTS[j].id}`;
            html += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
                data-edge="${edgeId}"
                stroke="var(--topo-edge)" stroke-width="5" opacity="var(--topo-edge-opacity)"/>`;
        }
    }

    // Draw nodes — linked to agent dashboards, with activity indicator classes
    for (let i = 0; i < AGENTS.length; i++) {
        const agent = AGENTS[i];
        const pos = positions[i];
        const state = agentData[agent.id];
        const online = state?.status === "online";
        const fill = online ? agent.color : "var(--c-inactive)";

        html += `<g class="node-idle" data-agent-node="${agent.id}"
                style="cursor:pointer" onclick="switchAgent('${agent.id}');switchTab('meta')">
            <circle cx="${pos.x}" cy="${pos.y}" r="45"
                fill="${fill}" opacity="${online ? 0.12 : 0.05}"
                stroke="${fill}" stroke-width="5"/>
            <circle cx="${pos.x}" cy="${pos.y}" r="16" fill="${fill}"
                opacity="${online ? 1 : 0.3}">
                ${online ? `<animate attributeName="r" values="15;19;15" dur="3s" repeatCount="indefinite"/>` : ""}
            </circle>
            <text x="${pos.x}" y="${pos.y + 72}" text-anchor="middle"
                font-size="21" font-family="inherit" font-weight="bold">
                ${agent.id.replace("-agent", "")}
            </text>
        </g>`;
    }

    svg.innerHTML = html;
}

// ── Render: Activity Stream ────────────────────────────────────

/**
 * Render the recent activity stream with deduplication.
 * DOM WRITE: #activity-stream (innerHTML replacement)
 * NOTE: onclick handlers reference global switchTab and filterTable.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderActivity(AGENTS, agentData) {
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
        const severity = classifyMessageSeverity(m.type);
        return `<a href="#pane-meta" class="activity-item activity-link" onclick="switchTab('meta');document.getElementById('filter-messages').value='${sess}';filterTable('messages');return false;">
            <span class="activity-time">${time}</span>
            <span class="activity-route">
                <span class="from">${m.from.replace("-agent", "")}</span>
                &rarr; <span class="to">${m.to.replace("-agent", "")}</span>
            </span>
            <span class="activity-type ${severity}">${m.type}</span>
        </a>`;
    }).join("");
}

// ── Topology Activity Indicators ──────────────────────────────

/**
 * Pulse a topology node when SSE reports agent activity.
 * Applies .node-active for 3 seconds, then reverts to .node-idle.
 * @param {string} agentId — the agent whose node should pulse
 */
export function pulseTopologyNode(agentId) {
    const node = document.querySelector(`[data-agent-node="${agentId}"]`);
    if (!node) return;
    node.classList.replace("node-idle", "node-active");
    clearTimeout(node._pulseTimer);
    node._pulseTimer = setTimeout(() => {
        node.classList.replace("node-active", "node-idle");
    }, 3000);
}

/**
 * Flash a topology edge when SSE reports a message delivery between agents.
 * Applies .edge-active for ~500ms (CSS animation handles the timing).
 * @param {string} fromAgent — sender agent id
 * @param {string} toAgent — receiver agent id
 */
export function flashTopologyEdge(fromAgent, toAgent) {
    const svg = document.getElementById("topology-svg");
    if (!svg) return;
    // Edge data-edge uses alphabetical agent ordering
    const pair = [fromAgent, toAgent].sort();
    const edgeId = `${pair[0]}--${pair[1]}`;
    const line = svg.querySelector(`[data-edge="${edgeId}"]`);
    if (!line) return;
    line.classList.remove("edge-active");
    // Force reflow to restart animation
    void line.offsetWidth;
    line.classList.add("edge-active");
    setTimeout(() => line.classList.remove("edge-active"), 600);
}

// ── Render: Organism Affect Widget ─────────────────────────────

/**
 * Classify affect from valence/activation into a label + color tier.
 * @param {number} valence — -1..1 hedonic valence
 * @param {number} activation — 0..1 arousal level
 * @returns {{ label: string, tier: string }}
 */
function classifyAffect(valence, activation) {
    if (valence > 0.3 && activation > 0.5) return { label: "ENGAGED", tier: "positive" };
    if (valence > 0.2 && activation <= 0.5) return { label: "CALM", tier: "positive" };
    if (valence < -0.2 && activation > 0.5) return { label: "STRESSED", tier: "negative" };
    if (valence < -0.2 && activation <= 0.5) return { label: "FATIGUED", tier: "negative" };
    if (activation > 0.6) return { label: "ALERT", tier: "neutral" };
    return { label: "STEADY", tier: "neutral" };
}

/**
 * Fetch psychometrics from each agent and render the Organism Affect widget.
 * Falls back to agentData PAD scores if /api/psychometrics unavailable.
 * DOM WRITE: #affect-label, #affect-valence-bar, #affect-valence-val,
 *            #affect-activation-bar, #affect-activation-val
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
async function renderOrganismAffect(AGENTS, agentData) {
    const labelEl = document.getElementById("affect-label");
    const valBar = document.getElementById("affect-valence-bar");
    const valVal = document.getElementById("affect-valence-val");
    const actBar = document.getElementById("affect-activation-bar");
    const actVal = document.getElementById("affect-activation-val");
    if (!labelEl) return;

    let valenceSum = 0, activationSum = 0, count = 0;

    // Attempt /api/psychometrics fetch from each online agent
    const fetches = AGENTS.map(async (agent) => {
        try {
            const resp = await fetch(`${agent.url}/api/psychometrics`, { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) return null;
            return await resp.json();
        } catch { return null; }
    });
    const results = await Promise.allSettled(fetches);

    results.forEach((r) => {
        if (r.status !== "fulfilled" || !r.value) return;
        const data = r.value;
        // Extract PAD pleasure (valence) and arousal (activation)
        const pad = data.pad || data.PAD || {};
        const pleasure = pad.pleasure ?? pad.valence ?? null;
        const arousal = pad.arousal ?? pad.activation ?? null;
        if (pleasure != null && arousal != null) {
            valenceSum += pleasure;
            activationSum += arousal;
            count++;
        }
    });

    // Fallback: extract from agentData if psychometrics endpoints yielded nothing
    if (count === 0) {
        Object.values(agentData).forEach(a => {
            if (a.status !== "online") return;
            const pad = a.data?.psychometrics?.pad || {};
            const pleasure = pad.pleasure ?? pad.valence ?? null;
            const arousal = pad.arousal ?? pad.activation ?? null;
            if (pleasure != null && arousal != null) {
                valenceSum += pleasure;
                activationSum += arousal;
                count++;
            }
        });
    }

    if (count === 0) {
        labelEl.textContent = "NO DATA";
        labelEl.className = "affect-label-pill";
        valBar.style.width = "50%";
        valBar.className = "affect-bar-fill";
        actBar.style.width = "50%";
        actBar.className = "affect-bar-fill";
        valVal.textContent = "--";
        actVal.textContent = "--";
        return;
    }

    const avgValence = valenceSum / count;       // -1..1
    const avgActivation = activationSum / count; // 0..1

    const { label, tier } = classifyAffect(avgValence, avgActivation);
    labelEl.textContent = label;
    labelEl.className = `affect-label-pill affect-${tier}`;

    // Valence bar: map -1..1 to 0..100%
    const valPct = Math.round(((avgValence + 1) / 2) * 100);
    valBar.style.width = `${valPct}%`;
    valBar.className = `affect-bar-fill bar-${tier}`;
    valVal.textContent = avgValence.toFixed(2);

    // Activation bar: map 0..1 to 0..100%
    const actPct = Math.round(avgActivation * 100);
    actBar.style.width = `${actPct}%`;
    actBar.className = `affect-bar-fill bar-${tier}`;
    actVal.textContent = avgActivation.toFixed(2);
}

// ── Render: Consensus Gates Widget ────────────────────────────

/**
 * Fetch consensus data from operations-agent and render the gates widget.
 * DOM WRITE: #gates-open, #gates-resolved, #gates-tiers
 * @param {Array} AGENTS — agent config array
 */
async function renderConsensusGates(AGENTS) {
    const openEl = document.getElementById("gates-open");
    const resolvedEl = document.getElementById("gates-resolved");
    const tiersEl = document.getElementById("gates-tiers");
    if (!openEl) return;

    let consensusData = null;

    // Try ops-agent /api/consensus first, then /api/operations
    for (const agent of AGENTS) {
        for (const path of ["/api/consensus", "/api/operations"]) {
            try {
                const resp = await fetch(`${agent.url}${path}`, { signal: AbortSignal.timeout(5000) });
                if (!resp.ok) continue;
                const data = await resp.json();
                if (data.gates || data.consensus) {
                    consensusData = data.gates || data.consensus || data;
                    break;
                }
            } catch { /* continue */ }
        }
        if (consensusData) break;
    }

    if (!consensusData) {
        openEl.textContent = "0";
        resolvedEl.textContent = "0";
        tiersEl.innerHTML = `<span class="gate-tier-badge gate-tier-c1">No data</span>`;
        return;
    }

    const open = consensusData.open ?? consensusData.open_count ?? 0;
    const resolved = consensusData.resolved_today ?? consensusData.resolved ?? 0;
    openEl.textContent = open;
    resolvedEl.textContent = resolved;

    // Tier breakdown
    const tiers = consensusData.tiers || consensusData.tier_breakdown || {};
    const c1 = tiers.C1 ?? tiers.c1 ?? 0;
    const c2 = tiers.C2 ?? tiers.c2 ?? 0;
    const c3 = tiers.C3 ?? tiers.c3 ?? 0;

    tiersEl.innerHTML = [
        c1 > 0 ? `<span class="gate-tier-badge gate-tier-c1">C1: ${c1}</span>` : "",
        c2 > 0 ? `<span class="gate-tier-badge gate-tier-c2">C2: ${c2}</span>` : "",
        c3 > 0 ? `<span class="gate-tier-badge gate-tier-c3">C3: ${c3}</span>` : "",
    ].filter(Boolean).join("") || `<span class="gate-tier-badge gate-tier-c1">C1: 0</span>`;
}

// ── Render: Cost Ticker Widget ────────────────────────────────

/**
 * Fetch spawn-rate data and render the cost ticker widget.
 * DOM WRITE: #cost-today, #cost-rate
 * @param {Array} AGENTS — agent config array
 */
async function renderCostTicker(AGENTS) {
    const totalEl = document.getElementById("cost-today");
    const rateEl = document.getElementById("cost-rate");
    if (!totalEl) return;

    let spawnData = null;

    for (const agent of AGENTS) {
        try {
            const resp = await fetch(`${agent.url}/api/spawn-rate`, { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) continue;
            spawnData = await resp.json();
            if (spawnData) break;
        } catch { /* continue */ }
    }

    if (!spawnData) {
        totalEl.textContent = "$0.00";
        rateEl.textContent = "No spawn data available";
        return;
    }

    const lastHour = spawnData.last_hour || spawnData.lastHour || {};
    const totalCost = lastHour.total_cost ?? spawnData.total_cost ?? spawnData.cost_today ?? 0;
    const hourlyRate = lastHour.hourly_rate ?? spawnData.hourly_rate ?? null;
    const spawnsPerHour = lastHour.spawns ?? spawnData.spawns_per_hour ?? null;

    totalEl.textContent = `$${Number(totalCost).toFixed(2)}`;

    const parts = [];
    if (hourlyRate != null) parts.push(`$${Number(hourlyRate).toFixed(2)}/hr projected`);
    else if (spawnsPerHour != null) parts.push(`${spawnsPerHour} spawns/hr`);
    rateEl.textContent = parts.length > 0 ? parts.join(" · ") : "Accumulating data...";
}

// ── Render: Mesh Narrative ────────────────────────────────────

/**
 * Generate a template-based narrative from available agent data.
 * No LLM call — pure string interpolation.
 * DOM WRITE: #mesh-narrative
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
function renderMeshNarrative(AGENTS, agentData) {
    const el = document.getElementById("mesh-narrative");
    if (!el) return;

    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;
    const sentences = [];

    if (online.length === 0) {
        el.textContent = "All agents remain unreachable. The mesh awaits connection.";
        return;
    }

    if (online.length === total) {
        sentences.push(`All ${total} agents report online.`);
    } else {
        const offline = AGENTS.filter(a => !online.find(o => o.id === a.id)).map(a => a.id.replace("-agent", ""));
        sentences.push(`${online.length} of ${total} agents report online. ${offline.join(", ")} remain${offline.length === 1 ? "s" : ""} unreachable.`);
    }

    // Aggregate pending messages
    const pending = online.reduce((sum, a) => sum + ((a.data?.totals || {}).unprocessed || 0), 0);
    if (pending > 0) {
        sentences.push(`${pending} message${pending !== 1 ? "s" : ""} await${pending === 1 ? "s" : ""} processing.`);
    }

    // Budget summary
    const totalBudget = online.reduce((sum, a) => sum + ((a.data?.autonomy_budget || {}).budget_current ?? 0), 0);
    const maxBudget = online.reduce((sum, a) => sum + ((a.data?.autonomy_budget || {}).budget_max ?? 20), 0);
    if (maxBudget > 0) {
        const pct = Math.round((totalBudget / maxBudget) * 100);
        sentences.push(`Autonomy budget holds at ${pct}% capacity (${totalBudget}/${maxBudget} credits).`);
    }

    el.textContent = sentences.join(" ");
}

// ── Render: Combined ───────────────────────────────────────────

/**
 * Render all Pulse station sub-sections.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderPulse(AGENTS, agentData) {
    renderVitals(AGENTS, agentData);
    renderAgentCards(AGENTS, agentData);
    renderTopology(AGENTS, agentData);
    renderActivity(AGENTS, agentData);
    renderMeshNarrative(AGENTS, agentData);

    // Async widgets — fetch independently, render when data arrives
    renderOrganismAffect(AGENTS, agentData);
    renderConsensusGates(AGENTS);
    renderCostTicker(AGENTS);
}

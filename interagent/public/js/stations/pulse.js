/**
 * pulse.js — Pulse station (main bridge viewscreen status overview).
 *
 * Extracted from inline <script> in index.html.
 * Renders vitals, agent cards, mesh topology, activity stream, status dots.
 * Manages the primary data refresh cycle.
 *
 * Data endpoints:
 *   GET {agent.url}/api/status — per-agent health, budget, gates, messages
 *
 * DOM dependencies: #vital-agents, #vital-budget, #vital-pending, #vital-gates,
 *   #vital-debt, #ops-badge, #agents-grid, #topology-svg, #activity-stream,
 *   #mesh-status-dots, #pulse-status-line, #footer-status
 */

import {
    fmtNum, agentName, escapeHtml, parseTS, formatTS,
    setTrackedValue, pushSparkValue,
} from '../core/utils.js';

// ── Exported Module State ──────────────────────────────────────
// agentData holds the global state store — populated by refreshAll,
// consumed by every station.
export let agentData = {};

// ── Helper Functions ───────────────────────────────────────────

function getDeliberations(autonomyBlock) {
    const b = autonomyBlock || {};
    if (b.budget_spent !== undefined) return Math.round(parseFloat(b.budget_spent) || 0);
    if (b.budget_max !== undefined && b.budget_current !== undefined) {
        return Math.round((parseFloat(b.budget_max) || 0) - (parseFloat(b.budget_current) || 0));
    }
    return 0;
}

function getCutoff(autonomyBlock) {
    const b = autonomyBlock || {};
    if (b.budget_cutoff !== undefined) return Math.round(parseFloat(b.budget_cutoff) || 0);
    return 0;
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
 * Refresh all agent data and re-render.
 * @param {Array} AGENTS — main agent config array
 * @param {Object} opts — { sseActive, refreshKnowledge, renderOperations,
 *   updateLcarsHeaderData, evaluateAlertLevel, addNarrativeEntry,
 *   generateMeshNarrative, mirrorToLcars }
 * @returns {Promise<void>}
 */
export async function refreshAll(AGENTS, opts = {}) {
    const results = await Promise.allSettled(AGENTS.map(fetchAgentStatus));
    results.forEach((r, i) => {
        agentData[AGENTS[i].id] = r.status === "fulfilled" ? r.value : { id: AGENTS[i].id, status: "unreachable" };
    });
    try { renderPulse(AGENTS, opts); } catch(e) { console.error("renderPulse failed:", e); }
    try { if (opts.renderOperations) opts.renderOperations(); } catch(e) { console.error("renderOperations failed:", e); }

    // Fetch KB data (non-blocking — renders when ready)
    if (opts.refreshKnowledge) opts.refreshKnowledge();

    const mode = opts.sseActive ? "● SSE live" : "○ polling 30s";
    const footerEl = document.getElementById("footer-status");
    if (footerEl) {
        footerEl.textContent = `Updated ${new Date().toLocaleTimeString()} · ${mode}`;
    }

    // Update LCARS header/footer band data if in LCARS mode
    if (document.body.classList.contains("theme-lcars")) {
        if (opts.updateLcarsHeaderData) opts.updateLcarsHeaderData();
        if (opts.evaluateAlertLevel) opts.evaluateAlertLevel();
        const ftrFeed = document.getElementById("lcars-ftr-feed");
        if (ftrFeed) ftrFeed.textContent = `Feed: ${opts.sseActive ? "\u25CF Live" : "\u25CB Polling"}`;
        if (opts.addNarrativeEntry && opts.generateMeshNarrative) {
            opts.addNarrativeEntry(opts.generateMeshNarrative());
        }
    }
}

// ── Render: Vitals ─────────────────────────────────────────────

function renderVitals(AGENTS) {
    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;

    const totalDeliberations = online.reduce((sum, a) =>
        sum + getDeliberations(a.data?.autonomy_budget), 0);
    const totalCutoff = online.reduce((sum, a) =>
        sum + getCutoff(a.data?.autonomy_budget), 0);
    const pending = online.reduce((sum, a) => sum + ((a.data?.totals || {}).unprocessed || 0), 0);
    const gates = online.reduce((sum, a) => sum + (a.data?.active_gates || []).length, 0);
    const debt = online.reduce((sum, a) => sum + ((a.data?.totals || {}).epistemic_flags_unresolved || 0), 0);

    const agentsEl = document.getElementById("vital-agents");
    if (agentsEl) {
        agentsEl.className = "vital-value " + (online.length === total ? "healthy" : online.length > 0 ? "degraded" : "critical");
    }
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
        if (badge) {
            badge.textContent = pending;
            badge.style.display = "inline";
        }
    }
}

// ── Render: LCARS Data Grid ────────────────────────────────────

function renderLcarsDataGrid(AGENTS) {
    const el = document.getElementById("lcars-data-grid");
    if (!el) return;

    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalDelib = online.reduce((s, a) => s + getDeliberations(a.data?.autonomy_budget), 0);
    const totalMsgs = online.reduce((s, a) => s + (a.data?.recent_messages?.length || 0), 0);
    const pendingCount = online.reduce((s, a) => s + (a.data?.unprocessed_messages?.length || 0), 0);
    const decisions = online.reduce((s, a) => s + (a.data?.active_gates?.length || 0), 0);
    const events = online.reduce((s, a) => s + (a.data?.event_count || 0), 0);

    const colors = ["#cc99cc", "#ff9966", "#9999ff", "#cc6699", "#ff9900", "#6aab8e", "#5b9cf6"];

    const metrics = [
        { val: fmtNum(totalDelib), label: "DELIB" },
        { val: fmtNum(totalMsgs), label: "MSG" },
        { val: fmtNum(pendingCount), label: "PEND" },
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

// ── Render: Agent Cards ────────────────────────────────────────

function renderAgentCards(AGENTS, opts) {
    const grid = document.getElementById("agents-grid");
    if (!grid) return;
    grid.innerHTML = "";

    for (const agent of AGENTS) {
        const state = agentData[agent.id] || { status: "unreachable" };
        const card = document.createElement("div");
        card.className = "lcars-panel agent-card";
        card.dataset.agent = agent.id;
        card.style.cursor = "pointer";
        card.onclick = () => { window.switchAgent(agent.id); window.switchTab('meta'); };

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
    if (opts?.mirrorToLcars) opts.mirrorToLcars("agents-grid", "lcars-ops-agents-grid");
}

// ── Render: Topology ───────────────────────────────────────────

function renderTopology(AGENTS, opts) {
    const svg = document.getElementById("topology-svg");
    if (!svg) return;
    const positions = [
        { x: 300, y: 55 },
        { x: 520, y: 160 },
        { x: 300, y: 265 },
        { x: 80, y: 160 },
    ];

    let html = "";

    // Grid overlay
    const gridColor = "rgba(153,153,255,0.08)";
    const labelColor = "rgba(153,153,255,0.25)";
    for (let x = 60; x < 580; x += 60) {
        html += `<line x1="${x}" y1="0" x2="${x}" y2="340" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="2,4"/>`;
    }
    for (let y = 40; y < 340; y += 60) {
        html += `<line x1="0" y1="${y}" x2="600" y2="${y}" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="2,4"/>`;
    }
    const sectors = ["001", "002", "003", "004", "005", "006", "007", "008", "009"];
    sectors.forEach((s, i) => {
        html += `<text x="${60 + i * 60}" y="335" fill="${labelColor}" font-size="8" text-anchor="middle" font-family="monospace">${s}</text>`;
    });

    // Draw edges — curved arcs
    for (let i = 0; i < AGENTS.length; i++) {
        for (let j = i + 1; j < AGENTS.length; j++) {
            const a = positions[i], b = positions[j];
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
                ${agentName(agent, AGENTS)}
            </text>
            ${online ? `<text x="${pos.x}" y="${pos.y + 70}" text-anchor="middle"
                font-size="9" font-family="monospace" fill="${labelColor}">
                ${delib} delib
            </text>` : ""}
        </g>`;
    }

    svg.innerHTML = html;

    const topoFtr = document.getElementById("topo-footer-num");
    if (topoFtr) {
        const onlineCount = Object.values(agentData).filter(a => a.status === "online").length;
        topoFtr.textContent = onlineCount + "/" + AGENTS.length;
    }

    if (opts?.mirrorToLcars) opts.mirrorToLcars("topology-svg", "lcars-topology-svg");
}

// ── Render: Activity Stream ────────────────────────────────────

function renderActivity(AGENTS, opts) {
    const container = document.getElementById("activity-stream");
    if (!container) return;
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

    // Deduplicate
    const seen = new Set();
    const recentKeys = new Map();
    const unique = allMessages.filter(m => {
        const key = `${m.session}-${m.from}-${m.timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
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
                <span class="from">${agentName(m.from, AGENTS)}</span>
                &rarr; <span class="to">${agentName(m.to, AGENTS)}</span>
            </span>
            <span class="activity-type">${m.type}</span>
        </a>`;
    }).join("");
    if (opts?.mirrorToLcars) opts.mirrorToLcars("activity-stream", "lcars-ops-activity");
}

// ── Render: Combined ───────────────────────────────────────────

/**
 * Render all Pulse station panels.
 * @param {Array} AGENTS — main agent config array
 * @param {Object} opts — mirror/callback options
 */
export function renderPulse(AGENTS, opts = {}) {
    renderVitals(AGENTS);
    renderLcarsDataGrid(AGENTS);
    renderAgentCards(AGENTS, opts);
    renderTopology(AGENTS, opts);
    renderActivity(AGENTS, opts);
    renderMeshStatusDots(AGENTS);
    // Update Pulse status line (LCARS)
    const pulseStatus = document.getElementById("pulse-status-line");
    if (pulseStatus) {
        const agents = Object.values(agentData);
        const online = agents.filter(a => a?.status === "online").length;
        const total = AGENTS.length;
        const time = new Date().toLocaleTimeString();
        const health = online === total ? "Nominal" : "Degraded";
        pulseStatus.textContent = `Mesh Status: ${health} \u00B7 Agents: ${online}/${total} Online \u00B7 Last Sync: ${time}`;
    }
}

function renderMeshStatusDots(AGENTS) {
    const el = document.getElementById("mesh-status-dots");
    if (!el) return;
    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;
    const pending = online.reduce((s, a) => s + ((a.data?.totals || {}).unprocessed || 0), 0);
    const gates = online.reduce((s, a) => s + (a.data?.active_gates || []).length, 0);

    const subsystems = [
        { label: "TRANSPORT LINK", color: online.length === total ? "green" : online.length > 0 ? "amber" : "red" },
        { label: "AGENT DISCOVERY", color: online.length >= Math.ceil(total * 0.8) ? "green" : "amber" },
        { label: "VOCABULARY DATABASE", color: "green" },
        { label: "MESSAGE QUEUE", color: pending > 5 ? "amber" : pending > 0 ? "blue" : "green" },
        { label: "CONSENSUS GATES", color: gates > 3 ? "amber" : gates > 0 ? "blue" : "green" },
    ];

    el.innerHTML = subsystems.map(s =>
        `<div class="lcars-status-dot-row">
            <span class="lcars-status-dot-indicator ${s.color}"></span>
            <span class="lcars-status-dot-label">${s.label}</span>
        </div>`
    ).join("");
}

/**
 * Render narrative log entries.
 * @param {Array} narrativeEntries — array of { time, text }
 */
export function renderNarrativeLog(narrativeEntries) {
    const log = document.getElementById("lcars-narrative-log");
    if (!log) return;
    log.innerHTML = narrativeEntries.map(e =>
        `<div class="lcars-narrative-entry"><span class="lcars-narrative-time">${e.time}</span>${e.text}</div>`
    ).join("");
}

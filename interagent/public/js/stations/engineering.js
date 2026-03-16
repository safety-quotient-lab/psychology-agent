/**
 * engineering.js — Engineering Station render functions.
 *
 * Extracted from inline <script> in index.html. Contains spawn dynamics (Gf bars),
 * Gc cascade area chart with sparkHistory accumulation, deliberation tree SVG
 * waterfall timeline, utilization rho gauge + vertical level gauge, waveform SVG
 * tempo visualization, tempo introspection per-deliberation timing table, cost
 * tracking, concurrency slot occupancy, and Engineering-specific cognitive load
 * (NASA-TLX per agent) and Yerkes-Dodson zone displays.
 *
 * Data endpoints:
 *   GET {opsAgent.url}/api/tempo      — mesh + per-agent timing
 *   GET {opsAgent.url}/api/spawn-rate — per-agent spawn counts
 *   GET {opsAgent.url}/api/flow       — concurrency slot data
 *   GET /api/psychometrics            — cognitive load + Y-D zones
 *
 * DOM dependencies: #spawn-dynamics, #gc-cascade, #util-rho, #tempo-value,
 *   #cost-total, #concurrency-slots, #eng-cognitive-load, #eng-yd-zones,
 *   #eng-status-line
 */

import {
    fmtNum, sparklineSVG, waveformSVG, pushSparkValue,
    agentName, setTrackedValue, renderVlevelGauge, sparkHistory,
} from '../core/utils.js';

// ── Module State ───────────────────────────────────────────────
let engineeringData = null;
let engineeringFetchPending = false;

// Concurrency data fetched from /api/flow
let _flowData = null;

// Psychometrics cache for Engineering-specific cognitive load + Y-D
let _psychCache = null;

const SPAWN_AGENTS = [
    { id: "psychology-agent",  label: "psychology", color: "var(--c-psychology)" },
    { id: "psq-agent",        label: "safety-quotient",   color: "var(--c-psq)" },
    { id: "unratified-agent",  label: "unratified", color: "var(--c-unratified)" },
    { id: "observatory-agent", label: "observatory",   color: "var(--c-observatory)" },
    { id: "operations-agent",  label: "operations",   color: "var(--c-tab-ops)" },
];

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch engineering metrics from tempo and spawn-rate endpoints.
 * Stores results in module-level engineeringData and triggers render.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 * @returns {Promise<void>}
 */
export async function fetchEngineeringData(AGENTS, agentData) {
    if (engineeringFetchPending) return;
    engineeringFetchPending = true;
    try {
        const opsAgent = AGENTS.find(a => a.id === "operations-agent");
        const baseUrl = opsAgent ? opsAgent.url : "https://psychology-agent.safety-quotient.dev";
        const [tempoResp, spawnResp] = await Promise.allSettled([
            fetch(`${baseUrl}/api/tempo`, { signal: AbortSignal.timeout(8000) }),
            fetch(`${baseUrl}/api/spawn-rate`, { signal: AbortSignal.timeout(8000) }),
        ]);
        const tempoData = tempoResp.status === "fulfilled" && tempoResp.value.ok
            ? await tempoResp.value.json() : null;
        const spawnData = spawnResp.status === "fulfilled" && spawnResp.value.ok
            ? await spawnResp.value.json() : null;
        engineeringData = { tempo: tempoData, spawn: spawnData };
    } catch (err) {
        engineeringData = null;
    } finally {
        engineeringFetchPending = false;
    }
    renderEngineering(AGENTS, agentData);
}

/**
 * Fetch psychometrics for Engineering-specific panels.
 * @returns {Promise<void>}
 */
async function fetchPsychForOps() {
    try {
        const resp = await fetch("https://interagent.safety-quotient.dev/api/psychometrics", { signal: AbortSignal.timeout(5000) });
        if (resp.ok) _psychCache = await resp.json();
    } catch {}
}

/**
 * Fetch concurrency/flow data from operations-agent.
 * @param {Array} AGENTS — agent config array
 * @returns {Promise<void>}
 */
async function fetchFlowData(AGENTS) {
    try {
        const opsUrl = AGENTS.find(a => a.id === "operations-agent")?.url || "";
        const r = await fetch(`${opsUrl}/api/flow`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) _flowData = await r.json();
    } catch {}
}

// ── Render: Spawn Dynamics (Gf bars per agent) ─────────────────

/**
 * Render per-agent spawn count bars with model tier summary.
 * Also triggers renderDeliberationTree for the waterfall timeline.
 *
 * DOM WRITE: #spawn-dynamics (appends elements), #spawn-placeholder visibility
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 */
export function renderSpawnDynamics(AGENTS, agentData) {
    const container = document.getElementById("spawn-dynamics");
    const placeholder = document.getElementById("spawn-placeholder");
    if (!container) return;

    // Gf = fluid intelligence: deliberations per agent with model + duration
    const tempoAgents = engineeringData?.tempo?.agents || [];
    const agentMap = {};
    tempoAgents.forEach(a => { agentMap[a.agent_id] = a; });

    // Also get model tier from gc_metrics
    const modelTier = agentData[AGENTS.find(a => a.id === "operations-agent")?.id]?.data?.gc_metrics?.deliberation_model || "?";

    // Clear existing
    container.querySelectorAll(".spawn-bar-row, .gf-summary").forEach(r => r.remove());

    if (tempoAgents.length === 0) {
        if (placeholder) placeholder.style.display = "block";
        SPAWN_AGENTS.forEach(agent => {
            const row = document.createElement("div");
            row.className = "spawn-bar-row";
            row.innerHTML = `<span class="spawn-bar-label">${agent.label}</span>
                <div class="spawn-bar-track"><div class="spawn-bar-fill" style="width:0%;background:${agent.color};opacity:0.3"></div></div>
                <span class="spawn-bar-count">\u2014</span>`;
            container.appendChild(row);
        });
        return;
    }

    if (placeholder) placeholder.style.display = "none";

    // Summary with model tier + avg duration
    const meshData = engineeringData?.tempo?.mesh || {};
    const avgDur = meshData.mean_duration_sec ? Math.round(meshData.mean_duration_sec) + "s" : "\u2014";
    const costHr = meshData.cost_per_hour != null ? "$" + meshData.cost_per_hour + "/hr" : "";
    const summary = document.createElement("div");
    summary.className = "gf-summary";
    summary.style.cssText = "margin-bottom:8px;font-size:0.85em;opacity:0.8";
    summary.innerHTML = `<span>Model: <strong>${modelTier.toUpperCase()}</strong> \u00B7 Avg: <strong>${avgDur}</strong>${costHr ? " \u00B7 " + costHr : ""}</span>`;
    container.appendChild(summary);

    // Per-agent bars
    const maxCount = Math.max(1, ...SPAWN_AGENTS.map(a => agentMap[a.id]?.spawns_60min || 0));
    SPAWN_AGENTS.forEach(agent => {
        const data = agentMap[agent.id] || {};
        const count = data.spawns_60min || 0;
        const dur = data.mean_duration_sec ? Math.round(data.mean_duration_sec) + "s" : "";
        const pct = (count / maxCount) * 100;
        const row = document.createElement("div");
        row.className = "spawn-bar-row";
        row.innerHTML = `<span class="spawn-bar-label">${agent.label}</span>
            <div class="spawn-bar-track"><div class="spawn-bar-fill" style="width:${pct}%;background:${agent.color}"></div></div>
            <span class="spawn-bar-count" style="font-size:0.75em">${count}${dur ? " \u00B7 " + dur : ""}</span>`;
        container.appendChild(row);
    });

    // Deliberation tree — waterfall of recent deliberations across all agents
    renderDeliberationTree(container, AGENTS, agentData);
}

// ── Render: Gc Cascade (Area Chart) ────────────────────────────

/**
 * Render the Gc cascade area chart — stacked crystallized processing streams.
 * Accumulates Gc history via sparkHistory for trend display.
 *
 * DOM WRITE: #gc-cascade (appends elements), #gc-placeholder visibility
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 */
export function renderGcCascade(AGENTS, agentData) {
    const container = document.getElementById("gc-cascade");
    const placeholder = document.getElementById("gc-placeholder");
    if (!container) return;

    // Gc = crystallized processing: events handled without LLM invocation
    const gcEntries = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const gc = d.data?.gc_metrics;
        const events = Math.round(gc?.events_processed || d.data?.event_count || 0);
        // Estimate Gc components from known architecture
        const delib = Math.round(gc?.deliberations_last_hour || 0);
        const hooks = delib * 24;       // ~24 hook scripts fire per deliberation
        const triggers = delib * 5;     // ~5 trigger checks per gate
        const tempo = Math.round(delib * 0.3); // tempo ticks
        gcEntries.push({
            label: agentName(agent),
            color: agent.color,
            events, hooks, triggers, tempo,
            total: events + hooks + triggers + tempo,
        });
    }

    if (gcEntries.length === 0) {
        if (placeholder) placeholder.style.display = "block";
        container.querySelectorAll(".gc-bar-row").forEach(r => r.remove());
        return;
    }

    if (placeholder) placeholder.style.display = "none";
    container.querySelectorAll(".gc-bar-row, .gc-area-chart").forEach(r => r.remove());

    const totalGc = gcEntries.reduce((s, e) => s + e.total, 0);

    // Accumulate Gc history for area chart
    pushSparkValue("gc-total", totalGc);
    pushSparkValue("gc-hooks", gcEntries.reduce((s, e) => s + e.hooks, 0));
    pushSparkValue("gc-triggers", gcEntries.reduce((s, e) => s + e.triggers, 0));
    pushSparkValue("gc-events", gcEntries.reduce((s, e) => s + e.events, 0));

    // Area chart — stacked Gc streams (Data Analysis 103138 pattern)
    const gcHistory = sparkHistory["gc-total"] || [];
    if (gcHistory.length >= 2) {
        const chartW = container.clientWidth || 300, chartH = 50;
        const maxH = Math.max(1, ...gcHistory);
        const pad = 2;
        const points = gcHistory.map((v, i) => {
            const x = pad + (i / (gcHistory.length - 1)) * (chartW - 2 * pad);
            const y = chartH - pad - ((v / maxH) * (chartH - 2 * pad));
            return x.toFixed(1) + "," + y.toFixed(1);
        });
        const polyline = points.join(" ");
        const areaPoints = pad + "," + (chartH - pad) + " " + polyline + " " + (pad + ((gcHistory.length - 1) / (gcHistory.length - 1)) * (chartW - 2 * pad)).toFixed(1) + "," + (chartH - pad);

        const chart = document.createElement("div");
        chart.className = "gc-area-chart";
        chart.style.cssText = "margin-bottom:8px;border:1px solid rgba(153,153,255,0.2);border-radius:2px;padding:2px";
        chart.innerHTML = `<svg width="${chartW}" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}" style="display:block">
            <polygon points="${areaPoints}" fill="#cc99cc" opacity="0.15"/>
            <polyline points="${polyline}" fill="none" stroke="#cc99cc" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="${points[points.length - 1].split(",")[0]}" cy="${points[points.length - 1].split(",")[1]}" r="3" fill="#cc99cc"/>
        </svg>`;
        container.appendChild(chart);
    }

    // Summary capsule
    const summary = document.createElement("div");
    summary.className = "gc-bar-row";
    summary.style.cssText = "margin-bottom:8px;font-size:0.82em;display:flex;gap:12px;flex-wrap:wrap";
    summary.innerHTML = `<span style="color:var(--lcars-secondary)">Gc Total: <strong>${fmtNum(totalGc)}</strong></span>
        <span style="color:var(--text-dim)">hooks ${fmtNum(gcEntries.reduce((s,e)=>s+e.hooks,0))}</span>
        <span style="color:var(--text-dim)">triggers ${fmtNum(gcEntries.reduce((s,e)=>s+e.triggers,0))}</span>
        <span style="color:var(--text-dim)">events ${fmtNum(gcEntries.reduce((s,e)=>s+e.events,0))}</span>
        <span style="color:var(--text-dim)">tempo ${fmtNum(gcEntries.reduce((s,e)=>s+e.tempo,0))}</span>`;
    container.appendChild(summary);

    // Per-agent bars
    const maxVal = Math.max(1, ...gcEntries.map(e => e.total));
    gcEntries.forEach(entry => {
        const pct = (entry.total / maxVal * 100);
        const row = document.createElement("div");
        row.className = "gc-bar-row spawn-bar-row";
        row.innerHTML = `<span class="spawn-bar-label">${entry.label}</span>
            <div class="spawn-bar-track"><div class="spawn-bar-fill" style="width:${pct}%;background:${entry.color}"></div></div>
            <span class="spawn-bar-count" style="font-size:0.75em">${fmtNum(entry.total)}</span>`;
        container.appendChild(row);
    });
}

// ── Render: Deliberation Tree (SVG Waterfall Timeline) ─────────

/**
 * Render the deliberation tree — SVG waterfall timeline of recent deliberations
 * across all agents. Nodes sized by cost, colored by agent, with broken links
 * for failures and duration indicators.
 *
 * DOM WRITE: appends .delib-tree element to container
 * @param {HTMLElement} container — parent element to append tree into
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 */
export function renderDeliberationTree(container, AGENTS, agentData) {
    // Collect all deliberations from all agents
    const allDelibs = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const spawns = d.data?.recent_deliberations || d.data?.recent_spawns || [];
        spawns.forEach(s => allDelibs.push({
            agent_id: s.agent_id || agent.id,
            color: agent.color,
            started_at: s.started_at || "",
            duration_ms: parseInt(s.duration_ms) || 0,
            cost: parseFloat(s.cost) || 0,
            status: s.status || "unknown",
            exit_code: parseInt(s.exit_code) ?? -1,
        }));
    }

    if (allDelibs.length === 0) return;

    // Sort chronologically
    allDelibs.sort((a, b) => a.started_at.localeCompare(b.started_at));
    const recent = allDelibs.slice(-12); // last 12

    // SVG tree
    const svgW = container.clientWidth || 400;
    const svgH = 60;
    const pad = 12;
    const nodeR = 6;
    const spacing = recent.length > 1 ? (svgW - 2 * pad) / (recent.length - 1) : 0;
    const midY = svgH / 2;

    let svg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block;margin-top:8px;border:1px solid rgba(153,153,255,0.15);border-radius:2px;padding:2px">`;

    // Timeline baseline
    svg += `<line x1="${pad}" y1="${midY}" x2="${svgW - pad}" y2="${midY}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>`;

    // Nodes + connecting lines
    recent.forEach((d, i) => {
        const cx = pad + (recent.length > 1 ? i * spacing : svgW / 2);
        const failed = d.exit_code !== 0 && d.status !== "completed";
        const stale = d.status === "resolved-stale";
        const nodeColor = failed ? "var(--lcars-alert)" : stale ? "var(--c-warning)" : d.color;
        const r = Math.min(nodeR + d.cost, 12); // size by cost

        // Connect to previous node
        if (i > 0) {
            const prevX = pad + (i - 1) * spacing;
            const prevFailed = recent[i - 1].exit_code !== 0 && recent[i - 1].status !== "completed";
            if (prevFailed) {
                // Broken link — dashed red line with gap
                svg += `<line x1="${prevX}" y1="${midY}" x2="${cx}" y2="${midY}" stroke="var(--lcars-alert)" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.5"/>`;
            } else {
                svg += `<line x1="${prevX}" y1="${midY}" x2="${cx}" y2="${midY}" stroke="${d.color}" stroke-width="1.5" opacity="0.4"/>`;
            }
        }

        // Duration indicator — vertical line proportional to duration
        const durHeight = Math.min(midY - 4, (d.duration_ms / 120000) * (midY - 4));
        svg += `<line x1="${cx}" y1="${midY}" x2="${cx}" y2="${midY - durHeight}" stroke="${nodeColor}" stroke-width="2" opacity="0.3"/>`;

        // Node circle
        svg += `<circle cx="${cx}" cy="${midY}" r="${r}" fill="${nodeColor}" opacity="${failed ? 0.6 : 0.9}"/>`;

        // Cost label above
        if (d.cost > 0) {
            svg += `<text x="${cx}" y="${midY - r - 3}" text-anchor="middle" font-size="7" fill="var(--text-dim)" font-family="monospace">$${d.cost}</text>`;
        }
    });

    svg += `</svg>`;

    // Add tree below bars
    const treeEl = container.querySelector(".delib-tree") || document.createElement("div");
    treeEl.className = "delib-tree";
    treeEl.innerHTML = svg;
    if (!treeEl.parentNode) container.appendChild(treeEl);
}

// ── Render: Utilization ────────────────────────────────────────

/**
 * Render the utilization gauge — rho metric with color-coded status
 * and Tuvok-style vertical level gauge (7 segments).
 *
 * DOM WRITE: #util-rho, #util-bar-fill, #util-status, #util-vlevel-gauge
 */
export function renderUtilization() {
    const rhoEl = document.getElementById("util-rho");
    const fillEl = document.getElementById("util-bar-fill");
    const statusEl = document.getElementById("util-status");
    if (!rhoEl) return;

    const rho = engineeringData?.tempo?.mesh?.utilization ?? engineeringData?.spawn?.utilization ?? null;

    if (rho == null) {
        rhoEl.textContent = "\u03C1 = \u2014";
        rhoEl.className = "util-rho util-nominal";
        fillEl.style.width = "0%";
        fillEl.style.background = "#6aab8e";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "util-status util-nominal";
        return;
    }

    const pct = Math.min(100, Math.max(0, rho * 100));
    setTrackedValue("util-rho", rho, { format: "float", prefix: "\u03C1 = ", inverted: true });

    let color, label, cls;
    if (pct < 50) {
        color = "#6aab8e"; label = "NOMINAL"; cls = "util-nominal";
    } else if (pct < 80) {
        color = "#d4944a"; label = "ELEVATED"; cls = "util-elevated";
    } else {
        color = "#c47070"; label = "CRITICAL"; cls = "util-critical";
    }

    rhoEl.className = `util-rho ${cls}`;
    fillEl.style.width = `${pct}%`;
    fillEl.style.background = color;
    statusEl.textContent = label;
    statusEl.className = `util-status ${cls}`;

    // Tuvok-style numbered vertical gauge (7 segments)
    const vlg = document.getElementById("util-vlevel-gauge");
    if (vlg) {
        const segments = 7;
        const activeLevel = Math.round((pct / 100) * segments);
        const segColors = ["#6aab8e","#6aab8e","#6aab8e","#d4944a","#d4944a","#c47070","#c47070"];
        vlg.innerHTML = Array.from({ length: segments }, (_, i) => {
            const level = i + 1;
            const active = level <= activeLevel;
            return `<div class="lcars-vlevel-segment ${active ? "active" : "inactive"}" style="background:${active ? segColors[i] : "var(--bg-inset)"}">${level}</div>`;
        }).join("");
    }
}

// ── Render: Tempo ──────────────────────────────────────────────

/**
 * Render the OODA cycle tempo gauge with waveform SVG visualization.
 * Frequency inversely proportional to cycle time.
 *
 * DOM WRITE: #tempo-value, #tempo-bar-fill, #tempo-status, #tempo-waveform
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 */
export function renderTempo(AGENTS, agentData) {
    const valueEl = document.getElementById("tempo-value");
    const fillEl = document.getElementById("tempo-bar-fill");
    const statusEl = document.getElementById("tempo-status");
    if (!valueEl) return;

    const avgMs = engineeringData?.tempo?.mesh?.mean_duration_sec != null
        ? Math.round(engineeringData.tempo.mesh.mean_duration_sec * 1000)
        : engineeringData?.tempo?.avg_cycle_ms ?? null;

    if (avgMs == null) {
        valueEl.innerHTML = `\u2014<span class="tempo-unit">ms avg</span>`;
        fillEl.style.width = "0%";
        statusEl.textContent = "OODA cycle: AWAITING DATA";
        return;
    }

    setTrackedValue("tempo-value", avgMs, { suffix: '<span class="tempo-unit">ms avg</span>', inverted: true });
    const pct = Math.min(100, (avgMs / 2000) * 100);
    fillEl.style.width = `${pct}%`;

    let label = "NOMINAL";
    let tempoColor = "#6aab8e";
    if (avgMs > 1500) { label = "SLOW"; tempoColor = "#c47070"; }
    else if (avgMs > 800) { label = "MODERATE"; tempoColor = "#d4944a"; }
    statusEl.textContent = `OODA cycle: ${label}`;

    // Waveform visualization — frequency inversely proportional to cycle time
    const tempoWaveEl = document.getElementById("tempo-waveform");
    if (tempoWaveEl) {
        const freq = Math.max(1, 6 - (avgMs / 500));
        tempoWaveEl.innerHTML = waveformSVG({
            width: tempoWaveEl.clientWidth || 200, height: 30,
            amplitude: Math.min(1, avgMs / 1000),
            frequency: freq,
            stroke: tempoColor,
        });
    }

    // Tempo introspection — per-deliberation timing breakdown
    renderTempoIntrospection(tempoColor, AGENTS, agentData);
}

// ── Render: Tempo Introspection ────────────────────────────────

/**
 * Render per-deliberation timing table — agent, duration, gap, cost.
 * Shows last 8 deliberations sorted chronologically with inter-deliberation gaps.
 *
 * DOM WRITE: #tempo-introspection
 * @param {string} color — tempo status color
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 */
export function renderTempoIntrospection(color, AGENTS, agentData) {
    const container = document.getElementById("tempo-introspection");
    if (!container) return;

    // Collect all deliberation timings
    const allDelibs = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const spawns = d.data?.recent_deliberations || [];
        spawns.forEach(s => {
            if (s.started_at && s.duration_ms) {
                allDelibs.push({
                    agent: agentName(agent),
                    startMs: new Date(s.started_at.replace(" ", "T") + "Z").getTime(),
                    durationMs: parseInt(s.duration_ms) || 0,
                    cost: parseFloat(s.cost) || 0,
                    status: s.status || "?",
                });
            }
        });
    }

    if (allDelibs.length === 0) {
        container.innerHTML = "";
        return;
    }

    allDelibs.sort((a, b) => a.startMs - b.startMs);

    // Calculate inter-deliberation gaps
    const entries = allDelibs.slice(-8).map((d, i, arr) => {
        const gap = i > 0 ? Math.max(0, d.startMs - (arr[i - 1].startMs + arr[i - 1].durationMs)) : 0;
        return { ...d, gapMs: gap };
    });

    // Render as LCARS readout
    container.innerHTML = '<div style="font-size:0.72em;margin-top:6px">' +
        '<div style="display:grid;grid-template-columns:auto auto auto auto;gap:2px 8px;font-family:monospace">' +
        '<span style="color:var(--lcars-title)">AGENT</span>' +
        '<span style="color:var(--lcars-title)">DURATION</span>' +
        '<span style="color:var(--lcars-title)">GAP</span>' +
        '<span style="color:var(--lcars-title)">COST</span>' +
        entries.map(e => {
            const durSec = (e.durationMs / 1000).toFixed(0);
            const gapSec = e.gapMs > 0 ? (e.gapMs / 1000).toFixed(0) + "s" : "\u2014";
            const statusColor = e.status === "completed" ? "var(--lcars-medical)" : "var(--lcars-alert)";
            return `<span style="color:var(--lcars-secondary)">${e.agent}</span>` +
                `<span style="color:${statusColor}">${durSec}s</span>` +
                `<span style="color:var(--text-dim)">${gapSec}</span>` +
                `<span style="color:var(--lcars-accent)">$${e.cost}</span>`;
        }).join("") +
        '</div></div>';
}

// ── Render: Cost ───────────────────────────────────────────────

/**
 * Render total cost and hourly rate displays.
 * DOM WRITE: #cost-total, #cost-rate
 */
export function renderCost() {
    const totalEl = document.getElementById("cost-total");
    const rateEl = document.getElementById("cost-rate");
    if (!totalEl) return;

    const meshData = engineeringData?.tempo?.mesh || {};
    const spawnCost = engineeringData?.spawn || {};
    const hourlyRate = meshData.cost_per_hour ?? spawnCost?.cost?.hourly_rate ?? null;
    const totalCost = spawnCost?.last_hour?.total_cost ?? spawnCost?.cost?.total_today ?? null;

    if (hourlyRate == null && totalCost == null) {
        totalEl.textContent = "$\u2014";
        rateEl.innerHTML = `<span class="cost-rate-arrow">\u2197</span> $\u2014/hr`;
        return;
    }

    totalEl.textContent = totalCost != null ? `$${parseFloat(totalCost).toFixed(2)}` : "$\u2014";
    rateEl.innerHTML = hourlyRate != null
        ? `<span class="cost-rate-arrow">\u2197</span> $${parseFloat(hourlyRate).toFixed(2)}/hr`
        : `<span class="cost-rate-arrow">\u2197</span> $\u2014/hr`;
}

// ── Render: Concurrency ────────────────────────────────────────

/**
 * Render concurrency slot occupancy indicators.
 * Fetches flow data on first call if not yet cached.
 *
 * DOM WRITE: #concurrency-slots (innerHTML replacement)
 * @param {Array} AGENTS — agent config array
 */
export function renderConcurrency(AGENTS) {
    const container = document.getElementById("concurrency-slots");
    if (!container) return;

    if (!_flowData) {
        fetchFlowData(AGENTS).then(() => renderConcurrency(AGENTS));
        return;
    }

    const slotInfo = _flowData.slots || {};
    const maxSlots = slotInfo.max || 5;
    const detail = slotInfo.detail || [];

    container.innerHTML = detail.map((s, i) => {
        const held = s.held || s.holder;
        const label = held
            ? `[${i + 1}/${maxSlots}] ${agentName(typeof held === "string" ? held : "active")}`
            : `[${i + 1}/${maxSlots}] free`;
        const cls = held ? "filled" : "empty";
        return `<div class="concurrency-slot">
            <div class="slot-indicator ${cls}"></div>
            <span class="slot-label ${held ? "" : "slot-free"}">${label}</span>
        </div>`;
    }).join("");

    if (detail.length === 0) {
        container.innerHTML = Array.from({length: maxSlots}, (_, i) =>
            `<div class="concurrency-slot"><div class="slot-indicator empty"></div><span class="slot-label slot-free">[${i+1}/${maxSlots}] free</span></div>`
        ).join("");
    }
}

// ── Render: Cognitive Load (Engineering-specific) ──────────────

/**
 * Render per-agent NASA-TLX cognitive load bars with 6 dimensions.
 * Uses psychometrics cache — fetches on first call if not cached.
 *
 * DOM WRITE: #eng-cognitive-load
 * @param {Array} AGENTS — agent config array
 */
export function renderCognitiveLoad(AGENTS) {
    const container = document.getElementById("eng-cognitive-load");
    if (!container) return;

    if (!_psychCache || !_psychCache.agents) {
        fetchPsychForOps().then(() => renderCognitiveLoad(AGENTS));
        return;
    }

    const entries = Object.entries(_psychCache.agents)
        .filter(([, d]) => d && !d.error && d.nasa_tlx && Object.keys(d.nasa_tlx).length > 0);

    if (entries.length === 0) {
        // Show whatever we have — even partial data
        const partial = Object.entries(_psychCache.agents)
            .filter(([, d]) => d && !d.error);
        if (partial.length === 0) {
            container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">No active sessions reporting TLX data. TLX computes during active Claude sessions, not daemon idle.</div>';
            return;
        }
        // Show available metrics even without full TLX
        container.innerHTML = '<div style="padding:8px;font-size:0.85em;opacity:0.7">' +
            partial.map(([aid, d]) => {
                const wm = d.working_memory || {};
                const yd = wm.yerkes_dodson_zone || "\u2014";
                return `<span style="color:${AGENTS.find(a=>a.id===aid)?.color||"inherit"}">${agentName(aid)}</span>: YD zone = ${yd}`;
            }).join(" \u00B7 ") + '</div>';
        return;
    }

    const colorMap = Object.fromEntries(AGENTS.map(a => [a.id, a.color]));
    const dims = ["mental_demand", "physical_demand", "temporal_demand", "performance", "effort", "frustration"];
    container.innerHTML = entries.map(([agentId, data]) => {
        const tlx = data.nasa_tlx;
        const bars = dims.map(d => {
            const val = Math.round((tlx[d] || 0) * 100);
            const color = val > 70 ? "#c47070" : val > 40 ? "#d4944a" : "#6aab8e";
            return `<div style="display:flex;align-items:center;gap:4px;font-size:0.72em">
                <span style="width:70px;text-align:right;opacity:0.6">${d.replace("_"," ")}</span>
                <div style="flex:1;height:6px;background:var(--bg-inset);border-radius:3px"><div style="width:${val}%;height:100%;background:${color};border-radius:3px"></div></div>
                <span style="width:28px;font-size:0.9em">${val}%</span>
            </div>`;
        }).join("");
        return `<div style="margin-bottom:8px"><div style="font-size:0.8em;font-weight:700;color:${colorMap[agentId]||"inherit"};margin-bottom:4px">${agentName(agentId)}</div>${bars}</div>`;
    }).join("");
}

// ── Render: Yerkes-Dodson Zones (Engineering-specific) ─────────

/**
 * Render per-agent Yerkes-Dodson zones from working memory data.
 * Uses psychometrics cache — fetches on first call if not cached.
 *
 * DOM WRITE: #eng-yd-zones
 * @param {Array} AGENTS — agent config array
 */
export function renderYerkesDodson(AGENTS) {
    const container = document.getElementById("eng-yd-zones");
    if (!container) return;

    // Read Yerkes-Dodson zones from psychometrics cache
    if (!_psychCache || !_psychCache.agents) {
        fetchPsychForOps().then(() => renderYerkesDodson(AGENTS));
        return;
    }

    const entries = Object.entries(_psychCache.agents)
        .filter(([, d]) => d && !d.error && d.working_memory);

    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting psychometrics data...</div></div>';
        return;
    }

    const colorMap = { "psychology-agent": "#5b9cf6", "psq-agent": "#4ecdc4", "unratified-agent": "#e5a735", "observatory-agent": "#a78bfa", "operations-agent": "#6b7280" };
    const zoneColors = { understimulated: "#5b9cf6", optimal: "#6aab8e", overwhelmed: "#c47070" };

    container.innerHTML = entries.map(([agentId, data]) => {
        const wm = data.working_memory || {};
        const zone = wm.yerkes_dodson_zone || "unknown";
        const load = wm.capacity_load ?? 0;
        const loadPct = Math.min(100, load * 100);
        const label = agentName(agentId);
        const zoneColor = zoneColors[zone] || "#888";
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:50px;font-size:0.8em;color:${colorMap[agentId] || '#888'}">${label}</span>
            <div style="flex:1;height:8px;background:var(--bg-tertiary);border-radius:4px;position:relative">
                <div style="width:${loadPct}%;height:100%;background:${zoneColor};border-radius:4px"></div>
            </div>
            <span style="font-size:0.7em;color:${zoneColor};width:80px;text-align:right">${zone.toUpperCase()}</span>
        </div>`;
    }).join("");
}

// ── Render: Combined Engineering ───────────────────────────────

/**
 * Render all Engineering station sub-sections.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 */
export function renderEngineering(AGENTS, agentData) {
    renderSpawnDynamics(AGENTS, agentData);
    renderGcCascade(AGENTS, agentData);
    renderUtilization();
    renderTempo(AGENTS, agentData);
    renderCost();
    renderConcurrency(AGENTS);
    renderCognitiveLoad(AGENTS);
    renderYerkesDodson(AGENTS);

    // Update status line
    const statusEl = document.getElementById("eng-status-line");
    if (statusEl && engineeringData) {
        const mesh = engineeringData.tempo?.mesh || {};
        const rho = mesh.utilization != null ? (mesh.utilization * 100).toFixed(0) + "%" : "\u2014";
        const dur = mesh.mean_duration_sec != null ? Math.round(mesh.mean_duration_sec) + "s" : "\u2014";
        const cost = mesh.cost_per_hour != null ? "$" + mesh.cost_per_hour + "/hr" : "\u2014";
        statusEl.textContent = `Utilization: ${rho} \u00B7 Tempo: ${dur} avg \u00B7 Cost: ${cost}`;
    }
}

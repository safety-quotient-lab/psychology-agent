/**
 * engineering.js — Engineering station (TNG: Engineering console —
 * spawn waterfall, utilization, OODA tempo, cost tracking, concurrency slots,
 * cognitive load, Yerkes-Dodson zones).
 *
 * Renders the Engineering tab with operational performance metrics.
 * The Spawn Waterfall serves as the hero visualization — a vertical timeline
 * with one column per agent, colored droplets representing spawn events.
 *
 * A2A-Psychology constructs (LLM-factors §2.2 Cognitive Load Management):
 *   - Cognitive Load (NASA-TLX composite per agent)
 *   - Yerkes-Dodson zones (working memory capacity load)
 *
 * Data endpoints:
 *   GET {opsAgent.url}/api/tempo      — avg_cycle_ms (OODA loop timing)
 *   GET {opsAgent.url}/api/spawn-rate — agents, utilization, cost,
 *     concurrency_slots, spawn_history[]
 *   Shared psychometrics cache (core/psychometrics.js) — cognitive load, Y-D zones
 *
 * DOM dependencies: #spawn-dynamics, #spawn-placeholder, #spawn-waterfall,
 *   utilization elements, tempo elements, cost elements, #concurrency-slots,
 *   #eng-cognitive-load, #eng-yd-zones
 */

import {
    fetchPsychometrics, getAllAgentPsychometrics,
} from '../core/psychometrics.js';

// ── Module State ───────────────────────────────────────────────
let engineeringData = null;
let engineeringFetchPending = false;

/** Per-agent spawn history buffer, capped at MAX_DROPLETS_PER_AGENT */
const spawnHistoryBuffer = new Map();
const MAX_DROPLETS_PER_AGENT = 20;

const SPAWN_AGENTS = [
    { id: "psychology-agent",  label: "psych", color: "var(--c-psychology)" },
    { id: "psq-agent",        label: "psq",   color: "var(--c-psq)" },
    { id: "unratified-agent",  label: "unrat", color: "var(--c-unratified)" },
    { id: "observatory-agent", label: "obs",   color: "var(--c-observatory)" },
    { id: "operations-agent",  label: "ops",   color: "var(--c-tab-ops)" },
];

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch engineering metrics from tempo and spawn-rate endpoints.
 * Stores results in module-level engineeringData and triggers render.
 * @param {Array} AGENTS — agent config array
 * @returns {Promise<void>}
 */
export async function fetchEngineeringData(AGENTS) {
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

        // Populate spawn history buffer from API response
        if (spawnData?.spawn_history) {
            populateSpawnHistory(spawnData.spawn_history);
        }

        // Fetch psychometrics for cognitive load + Y-D panels
        await fetchPsychometrics();
    } catch (err) {
        engineeringData = null;
    } finally {
        engineeringFetchPending = false;
    }
    renderEngineering();
}

// ── Spawn History Management ─────────────────────────────────

/**
 * Populate the spawn history buffer from an array of spawn events.
 * Each event carries { agent_id, status, duration_ms, timestamp }.
 * @param {Array} history — spawn event array from API
 */
function populateSpawnHistory(history) {
    // Clear existing buffers
    spawnHistoryBuffer.clear();
    SPAWN_AGENTS.forEach(agent => spawnHistoryBuffer.set(agent.id, []));

    // Group events by agent, most recent first
    const sorted = [...history].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    for (const event of sorted) {
        const agentBuffer = spawnHistoryBuffer.get(event.agent_id);
        if (agentBuffer && agentBuffer.length < MAX_DROPLETS_PER_AGENT) {
            agentBuffer.push(event);
        }
    }
}

/**
 * Add a single spawn droplet from a real-time SSE event.
 * Prepends to the agent's buffer (newest at top) and trims overflow.
 * @param {string} agentId — agent identifier
 * @param {Object} spawn — { status, duration_ms, timestamp }
 */
export function addSpawnDroplet(agentId, spawn) {
    if (!spawnHistoryBuffer.has(agentId)) {
        spawnHistoryBuffer.set(agentId, []);
    }
    const buffer = spawnHistoryBuffer.get(agentId);
    buffer.unshift(spawn);

    // Trim to max capacity
    while (buffer.length > MAX_DROPLETS_PER_AGENT) {
        buffer.pop();
    }

    // Re-render just the waterfall for responsiveness
    renderSpawnWaterfall();
}

// ── Render: Spawn Waterfall ──────────────────────────────────

/**
 * Classify a spawn status string into a CSS class.
 * @param {string} status — "ok", "fail", "running", or similar
 * @returns {string} CSS class name
 */
function statusClass(status) {
    if (!status) return "ok";
    const normalized = status.toLowerCase();
    if (normalized === "fail" || normalized === "failed" || normalized === "error") return "fail";
    if (normalized === "running" || normalized === "pending" || normalized === "in_progress") return "running";
    return "ok";
}

/**
 * Compute droplet height from spawn duration.
 * Maps duration_ms to a pixel height (8px minimum, 40px maximum).
 * @param {number|null} durationMs — spawn duration in milliseconds
 * @returns {number} height in pixels
 */
function dropletHeight(durationMs) {
    if (!durationMs || durationMs <= 0) return 8;
    // Log scale: 100ms -> 8px, 10000ms -> 40px
    const minH = 8;
    const maxH = 40;
    const clamped = Math.max(100, Math.min(60000, durationMs));
    const ratio = (Math.log(clamped) - Math.log(100)) / (Math.log(60000) - Math.log(100));
    return Math.round(minH + ratio * (maxH - minH));
}

/**
 * Format duration for hover tooltip.
 * @param {number|null} durationMs — spawn duration in milliseconds
 * @returns {string} human-readable duration
 */
function formatDuration(durationMs) {
    if (!durationMs) return "duration unknown";
    if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${(durationMs / 60000).toFixed(1)}min`;
}

/**
 * Render the spawn waterfall — vertical timeline with colored droplets.
 * DOM WRITE: #spawn-waterfall (innerHTML replacement),
 *   #spawn-placeholder visibility
 */
export function renderSpawnWaterfall() {
    const container = document.getElementById("spawn-waterfall");
    const placeholder = document.getElementById("spawn-placeholder");
    if (!container) return;

    // Determine whether any spawn data exists
    const hasData = SPAWN_AGENTS.some(agent => {
        const buffer = spawnHistoryBuffer.get(agent.id);
        return buffer && buffer.length > 0;
    });

    if (!hasData) {
        // Show placeholder, hide waterfall
        if (placeholder) placeholder.style.display = "block";
        container.style.display = "none";
        return;
    }

    // Hide placeholder, show waterfall
    if (placeholder) placeholder.style.display = "none";
    container.style.display = "";

    container.innerHTML = SPAWN_AGENTS.map(agent => {
        const buffer = spawnHistoryBuffer.get(agent.id) || [];
        const dropletsHtml = buffer.map(spawn => {
            const cls = statusClass(spawn.status);
            const height = dropletHeight(spawn.duration_ms);
            const tooltip = `${agent.label}: ${formatDuration(spawn.duration_ms)} (${spawn.status || "ok"})`;
            return `<div class="spawn-droplet ${cls}" style="height:${height}px" title="${tooltip}"></div>`;
        }).join("");

        return `<div class="spawn-column">
            <div class="spawn-column-header" style="color:${agent.color}">${agent.label}</div>
            ${dropletsHtml}
        </div>`;
    }).join("");
}

// ── Render: Spawn Dynamics (legacy bars — kept as fallback) ──

/**
 * Render per-agent spawn count bars.
 * DOM WRITE: #spawn-dynamics (appends .spawn-bar-row elements),
 *   #spawn-placeholder visibility
 */
export function renderSpawnDynamics() {
    // The waterfall now serves as the primary visualization.
    // Legacy bar rows no longer render — renderSpawnWaterfall handles display.
    renderSpawnWaterfall();
}

// ── Render: Utilization ────────────────────────────────────────

/**
 * Render the utilization gauge (rho metric).
 * DOM WRITE: #util-rho, #util-bar-fill, #util-status
 */
export function renderUtilization() {
    const rhoEl = document.getElementById("util-rho");
    const fillEl = document.getElementById("util-bar-fill");
    const statusEl = document.getElementById("util-status");
    if (!rhoEl) return;

    const rho = engineeringData?.spawn?.utilization ?? null;

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
    rhoEl.textContent = `\u03C1 = ${rho.toFixed(2)}`;

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
}

// ── Render: Tempo ──────────────────────────────────────────────

/**
 * Render the OODA cycle tempo gauge.
 * DOM WRITE: #tempo-value, #tempo-bar-fill, #tempo-status
 */
export function renderTempo() {
    const valueEl = document.getElementById("tempo-value");
    const fillEl = document.getElementById("tempo-bar-fill");
    const statusEl = document.getElementById("tempo-status");
    if (!valueEl) return;

    const avgMs = engineeringData?.tempo?.avg_cycle_ms ?? null;

    if (avgMs == null) {
        valueEl.innerHTML = `\u2014<span class="tempo-unit">ms avg</span>`;
        fillEl.style.width = "0%";
        statusEl.textContent = "OODA cycle: AWAITING DATA";
        return;
    }

    valueEl.innerHTML = `${Math.round(avgMs)}<span class="tempo-unit">ms avg</span>`;
    const pct = Math.min(100, (avgMs / 2000) * 100);
    fillEl.style.width = `${pct}%`;

    let label = "NOMINAL";
    if (avgMs > 1500) label = "SLOW";
    else if (avgMs > 800) label = "MODERATE";
    statusEl.textContent = `OODA cycle: ${label}`;
}

// ── Render: Cost ───────────────────────────────────────────────

/**
 * Render the cost tracking display.
 * DOM WRITE: #cost-total, #cost-rate
 */
export function renderCost() {
    const totalEl = document.getElementById("cost-total");
    const rateEl = document.getElementById("eng-cost-rate");
    if (!totalEl) return;

    const costData = engineeringData?.spawn?.cost || null;

    if (!costData) {
        totalEl.textContent = "$\u2014";
        rateEl.innerHTML = `<span class="cost-rate-arrow">\u2197</span> $\u2014/hr`;
        return;
    }

    const total = costData.total_today ?? 0;
    const hourlyRate = costData.hourly_rate ?? 0;
    totalEl.textContent = `$${total.toFixed(2)}`;
    rateEl.innerHTML = `<span class="cost-rate-arrow">\u2197</span> $${hourlyRate.toFixed(2)}/hr`;
}

// ── Render: Concurrency ────────────────────────────────────────

/**
 * Render the concurrency slot indicators.
 * DOM WRITE: #concurrency-slots (innerHTML replacement)
 */
export function renderConcurrency() {
    const container = document.getElementById("concurrency-slots");
    if (!container) return;

    const slotData = engineeringData?.spawn?.concurrency_slots || null;
    const slots = slotData || [
        { slot: 1, holder: null },
        { slot: 2, holder: null },
        { slot: 3, holder: null },
    ];

    container.innerHTML = slots.map(s => {
        const filled = s.holder != null;
        const label = filled
            ? `[${s.slot}/3] ${s.holder.replace("-agent", "")}`
            : `[${s.slot}/3] free`;
        return `<div class="concurrency-slot">
            <div class="slot-indicator ${filled ? "filled" : "empty"}"></div>
            <span class="slot-label ${filled ? "" : "slot-free"}">${label}</span>
        </div>`;
    }).join("");
}

// ── Render: Cognitive Load (A2A-Psychology) ──────────────────

/**
 * Render per-agent cognitive load composite from NASA-TLX.
 * LLM-factors §2.2: governance-performance curve — the inverted-U in real time.
 * DOM WRITE: #eng-cognitive-load
 */
export function renderCognitiveLoad() {
    const container = document.getElementById("eng-cognitive-load");
    if (!container) return;

    const agents = getAllAgentPsychometrics();
    const entries = Object.entries(agents).filter(([, d]) => d && !d.error && d.workload);

    if (entries.length === 0) {
        container.innerHTML = '<div class="engineering-placeholder">Awaiting psychometrics data...</div>';
        return;
    }

    container.innerHTML = entries.map(([agentId, data]) => {
        const load = data.workload?.cognitive_load ?? 0;
        const pct = Math.min(100, Math.max(0, load));
        const label = agentId.replace("-agent", "");
        const agent = SPAWN_AGENTS.find(a => a.id === agentId);
        const color = agent ? agent.color : "var(--text-primary)";
        const barColor = pct > 70 ? "var(--c-alert)" : pct > 40 ? "var(--c-warning)" : "#6aab8e";
        const mode = data.workload?.mode || "neutral";

        return `<div class="eng-load-row">
            <span class="eng-load-agent" style="color:${color}">${label}</span>
            <div class="eng-load-bar-track">
                <div class="eng-load-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <span class="eng-load-value">${pct.toFixed(0)}</span>
            <span class="eng-load-mode">${mode[0].toUpperCase()}</span>
        </div>`;
    }).join("");
}

// ── Render: Yerkes-Dodson Zones (A2A-Psychology) ─────────────

/**
 * Render per-agent Yerkes-Dodson zones from working memory construct.
 * LLM-factors §2.2: context window as finite attention economy.
 * DOM WRITE: #eng-yd-zones
 */
export function renderYerkesDodsonZones() {
    const container = document.getElementById("eng-yd-zones");
    if (!container) return;

    const agents = getAllAgentPsychometrics();
    const entries = Object.entries(agents).filter(([, d]) => d && !d.error && d.working_memory);

    if (entries.length === 0) {
        container.innerHTML = '<div class="engineering-placeholder">Awaiting psychometrics data...</div>';
        return;
    }

    const ZONE_COLORS = {
        understimulated: "#6688aa",
        optimal: "#6aab8e",
        pressured: "#d4944a",
        overwhelmed: "#c47070",
    };

    container.innerHTML = entries.map(([agentId, data]) => {
        const wm = data.working_memory || {};
        const zone = wm.yerkes_dodson_zone || "unknown";
        const load = wm.capacity_load ?? 0;
        const loadPct = Math.min(100, load * 100);
        const label = agentId.replace("-agent", "");
        const agent = SPAWN_AGENTS.find(a => a.id === agentId);
        const agentColor = agent ? agent.color : "var(--text-primary)";
        const zoneColor = ZONE_COLORS[zone] || "var(--text-dim)";

        return `<div class="eng-yd-row">
            <span class="eng-yd-agent" style="color:${agentColor}">${label}</span>
            <div class="eng-yd-bar-track">
                <div class="eng-yd-bar-fill" style="width:${loadPct}%;background:${zoneColor}"></div>
            </div>
            <span class="eng-yd-zone" style="color:${zoneColor}">${zone.toUpperCase()}</span>
        </div>`;
    }).join("");
}

// ── Render: Combined Engineering ───────────────────────────────

/**
 * Render all Engineering station sub-sections.
 */
export function renderEngineering() {
    renderSpawnWaterfall();
    renderConcurrency();
    renderTempo();
    renderUtilization();
    renderCost();
    renderCognitiveLoad();
    renderYerkesDodsonZones();
}

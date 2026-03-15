/**
 * engineering.js — Engineering station (TNG: Engineering console —
 * spawn dynamics, utilization, OODA tempo, cost tracking, concurrency slots).
 *
 * Renders the Engineering tab with operational performance metrics.
 * Fetches data from the operations-agent's /api/tempo and /api/spawn-rate
 * endpoints.
 *
 * Data endpoints:
 *   GET {opsAgent.url}/api/tempo      — avg_cycle_ms (OODA loop timing)
 *   GET {opsAgent.url}/api/spawn-rate — agents, utilization, cost,
 *     concurrency_slots
 *
 * DOM dependencies: #spawn-dynamics, #spawn-placeholder, utilization elements,
 *   tempo elements, cost elements, #concurrency-slots
 *
 * Global state accessed: AGENTS (for ops-agent URL)
 */

// ── Module State ───────────────────────────────────────────────
let engineeringData = null;
let engineeringFetchPending = false;

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
    } catch (err) {
        engineeringData = null;
    } finally {
        engineeringFetchPending = false;
    }
    renderEngineering();
}

// ── Render: Spawn Dynamics ─────────────────────────────────────

/**
 * Render per-agent spawn count bars.
 * DOM WRITE: #spawn-dynamics (appends .spawn-bar-row elements),
 *   #spawn-placeholder visibility
 */
export function renderSpawnDynamics() {
    const container = document.getElementById("spawn-dynamics");
    const placeholder = document.getElementById("spawn-placeholder");
    if (!container) return;

    const spawnCounts = engineeringData?.spawn?.agents || null;

    // Clear existing bar rows
    container.querySelectorAll(".spawn-bar-row").forEach(r => r.remove());

    if (!spawnCounts) {
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
    const maxCount = Math.max(1, ...SPAWN_AGENTS.map(a => spawnCounts[a.id] || 0));
    SPAWN_AGENTS.forEach(agent => {
        const count = spawnCounts[agent.id] || 0;
        const pct = (count / maxCount) * 100;
        const row = document.createElement("div");
        row.className = "spawn-bar-row";
        row.innerHTML = `<span class="spawn-bar-label">${agent.label}</span>
            <div class="spawn-bar-track"><div class="spawn-bar-fill" style="width:${pct}%;background:${agent.color}"></div></div>
            <span class="spawn-bar-count">${count}</span>`;
        container.appendChild(row);
    });
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
    const rateEl = document.getElementById("cost-rate");
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

// ── Render: Combined Engineering ───────────────────────────────

/**
 * Render all Engineering station sub-sections.
 */
export function renderEngineering() {
    renderSpawnDynamics();
    renderUtilization();
    renderTempo();
    renderCost();
    renderConcurrency();
}

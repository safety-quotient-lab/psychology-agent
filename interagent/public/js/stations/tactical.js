/**
 * tactical.js — Tactical station (TNG: Tactical console — shields,
 * transport integrity, threat assessment, compliance monitoring).
 *
 * Three widgets: Shield Status (from /api/health), Transport Integrity
 * (hardcoded), Agent Card Compliance (hardcoded).
 *
 * Data endpoints:
 *   GET https://interagent.safety-quotient.dev/api/health — per-agent online/offline
 *
 * DOM dependencies: #shield-status, #transport-integrity, #agent-compliance,
 *   transport-{git,http,zmq}-fill, transport-{git,http,zmq}-status
 *
 * Global state accessed: none (uses module-level tacticalData)
 */

// ── Constants ────────────────────────────────────────────────────

/** Timeout for all fetches (5 seconds per task spec) */
const FETCH_TIMEOUT = 5000;

/** Agent labels for shield status display */
const SHIELD_AGENTS = [
    { id: "psychology-agent",  label: "psych" },
    { id: "psq-agent",        label: "psq" },
    { id: "unratified-agent",  label: "unrat" },
    { id: "observatory-agent", label: "obs" },
    { id: "operations-agent",  label: "ops" },
];

/** Hardcoded transport layer integrity (no live endpoint for these) */
const TRANSPORT_LAYERS = [
    { id: "git",      name: "git",      pct: 100 },
    { id: "http",     name: "HTTP",     pct: 100 },
    { id: "zmq",      name: "ZMQ",      pct: 80  },
    { id: "photonic", name: "photonic", pct: null },
];

/** Hardcoded agent card compliance versions */
const COMPLIANCE_DATA = [
    { label: "psych", version: "1.0.0", compliant: true },
    { label: "ops",   version: "1.0.0", compliant: true },
    { label: "unrat", version: "1.0.0", compliant: true },
    { label: "obs",   version: "1.0.0", compliant: true },
    { label: "psq",   version: "0.3.0", compliant: false },
];

// ── Module State ───────────────────────────────────────────────
let tacticalData = null;
let tacticalFetchPending = false;

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch mesh health data from interagent /api/health endpoint.
 * Stores result in module-level tacticalData and triggers renderTactical.
 * @returns {Promise<void>}
 */
export async function fetchTacticalData() {
    if (tacticalFetchPending) return;
    tacticalFetchPending = true;
    try {
        const resp = await fetch("https://interagent.safety-quotient.dev/api/health", {
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        tacticalData = await resp.json();
    } catch {
        tacticalData = null;
    } finally {
        tacticalFetchPending = false;
    }
    renderTactical();
}

// ── Render: Shield Status ─────────────────────────────────────

/**
 * Render per-agent shield status from health data.
 * Online agents show 100% shields; offline agents show 0%.
 * DOM WRITE: #shield-status (innerHTML replacement)
 */
export function renderShieldStatus() {
    const container = document.getElementById("shield-status");
    if (!container) return;

    const agents = tacticalData?.agents || [];

    // Build a lookup of agent status from health data
    const statusMap = {};
    for (const agent of agents) {
        const agentId = agent.id || agent.agent_id || agent.name;
        const status = agent.status || agent.health;
        const online = status === "ok" || status === "online" || status === "healthy";
        statusMap[agentId] = online;
    }

    container.innerHTML = SHIELD_AGENTS.map(sa => {
        const online = statusMap[sa.id] ?? false;
        const pct = online ? 100 : 0;
        const color = online ? "#6aab8e" : "#c47070";
        const authLabel = online ? "ONLINE" : "OFFLINE";
        const authClass = online ? "shield-auth-ok" : "shield-auth-none";

        return `<div class="shield-row">
            <span class="shield-agent">${sa.label}</span>
            <span class="shield-auth ${authClass}">${authLabel}</span>
            <div class="shield-bar-track"><div class="shield-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="shield-pct">${pct}%</span>
        </div>`;
    }).join("");
}

// ── Render: Transport Integrity ────────────────────────────────

/**
 * Render transport layer integrity bars (hardcoded values).
 * git=100%, HTTP=100%, ZMQ=80%, Photonic=N/A.
 * DOM WRITE: transport-{git,http,zmq}-fill, transport-{git,http,zmq}-status
 */
export function renderTransportIntegrity() {
    for (const layer of TRANSPORT_LAYERS) {
        const fill = document.getElementById(`transport-${layer.id}-fill`);
        const status = document.getElementById(`transport-${layer.id}-status`);

        if (layer.pct == null) {
            // Photonic: N/A
            if (fill) { fill.style.width = "0%"; }
            if (status) {
                status.textContent = "N/A";
                status.className = "transport-layer-status transport-na";
            }
            continue;
        }

        if (!fill || !status) continue;

        const pct = layer.pct;
        const color = pct >= 90 ? "#6aab8e" : pct >= 50 ? "#d4944a" : "#c47070";
        const symbol = pct >= 90 ? "\u2713" : pct >= 50 ? "\u25B2" : "\u2717";
        const cssClass = pct >= 90 ? "transport-ok" : pct >= 50 ? "transport-warn" : "transport-na";

        fill.style.width = pct + "%";
        fill.style.background = color;
        status.textContent = pct + "% " + symbol;
        status.className = "transport-layer-status " + cssClass;
    }
}

// ── Render: Agent Card Compliance ──────────────────────────────

/**
 * Render agent card compliance with hardcoded versions.
 * DOM WRITE: #agent-compliance (innerHTML replacement)
 */
export function renderAgentCompliance() {
    const container = document.getElementById("agent-compliance");
    if (!container) return;

    container.innerHTML = COMPLIANCE_DATA.map(c => {
        const checkMark = c.compliant ? "\u2713" : "\u2717";
        const checkClass = c.compliant ? "compliance-pass" : "compliance-fail";
        return `<div class="compliance-row">
            <span class="compliance-agent">${c.label}</span>
            <span class="compliance-check ${checkClass}">${checkMark}</span>
            <span class="compliance-version">${c.version}</span>
        </div>`;
    }).join("");
}

// ── Render: Combined Tactical ──────────────────────────────────

/**
 * Render all Tactical station sub-sections.
 */
export function renderTactical() {
    renderShieldStatus();
    renderTransportIntegrity();
    renderAgentCompliance();
}

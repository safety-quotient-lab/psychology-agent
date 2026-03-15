/**
 * tactical.js — Tactical station (TNG: Tactical console — shields,
 * transport integrity, threat assessment, compliance monitoring).
 *
 * Three widgets: Shield Status (from /api/health), Transport Integrity
 * (hardcoded — no live endpoint), Agent Card Compliance (live from /.well-known/agents).
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

/** Agent card compliance — fetched live from /.well-known/agents */
let COMPLIANCE_DATA = [];

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
        // Fetch health + agent cards in parallel
        const [healthResp, agentsResp] = await Promise.allSettled([
            fetch("https://interagent.safety-quotient.dev/api/health", {
                signal: AbortSignal.timeout(FETCH_TIMEOUT),
            }),
            fetch("https://interagent.safety-quotient.dev/.well-known/agents?refresh=true", {
                signal: AbortSignal.timeout(FETCH_TIMEOUT),
                cache: "no-cache",
            }),
        ]);

        if (healthResp.status === "fulfilled" && healthResp.value.ok) {
            tacticalData = await healthResp.value.json();
        }

        // Build compliance from live agent card data
        if (agentsResp.status === "fulfilled" && agentsResp.value.ok) {
            const agents = await agentsResp.value.json();
            const labelMap = { "psychology-agent": "psych", "psq-agent": "psq", "safety-quotient-agent": "psq",
                "unratified-agent": "unrat", "unratified": "unrat", "observatory-agent": "obs", "observatory": "obs",
                "operations-agent": "ops", "interagent-compositor": "mesh" };

            COMPLIANCE_DATA = agents
                .filter(a => a.id !== "interagent-compositor")
                .map(a => {
                    const pv = a.protocolVersion || "?";
                    const hasSec = a.hasSecuritySchemes || false;
                    const compliant = pv.startsWith("1.") && hasSec;
                    return { label: labelMap[a.id] || a.id, version: pv, compliant, hasSec };
                });
        }
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
 * Render agent card compliance from live /.well-known/agents data.
 * DOM WRITE: #agent-compliance (innerHTML replacement)
 */
export function renderAgentCompliance() {
    const container = document.getElementById("agent-compliance");
    if (!container) return;

    container.innerHTML = COMPLIANCE_DATA.map(c => {
        const checkMark = c.compliant ? "\u2713" : "\u2717";
        const checkClass = c.compliant ? "compliance-pass" : "compliance-fail";
        const secIcon = c.hasSec ? "\uD83D\uDD12" : "\u26A0";
        return `<div class="compliance-row">
            <span class="compliance-agent">${c.label}</span>
            <span class="compliance-check ${checkClass}">${checkMark}</span>
            <span class="compliance-version">A2A ${c.version} ${secIcon}</span>
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

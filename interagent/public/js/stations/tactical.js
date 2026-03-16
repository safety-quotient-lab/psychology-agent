/**
 * tactical.js — Tactical station (shields, compliance, transport integrity, trust matrix).
 *
 * Extracted from inline <script> in index.html.
 *
 * Data endpoints:
 *   GET https://interagent.safety-quotient.dev/api/health — per-agent health
 *   GET https://interagent.safety-quotient.dev/.well-known/agents — agent cards
 *   GET https://interagent.safety-quotient.dev/api/trust — trust matrix
 *
 * DOM dependencies: #shield-status, #agent-compliance, transport-*-fill,
 *   transport-*-status, #trust-heatmap
 */

import { agentName } from '../core/utils.js';

// ── Module State ───────────────────────────────────────────────
let tacticalData = null;
let tacticalFetchPending = false;
let tacticalAgentCards = null;

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch mesh health + agent cards for tactical display.
 * @returns {Promise<void>}
 */
export async function fetchTacticalData() {
    if (tacticalFetchPending) return;
    tacticalFetchPending = true;
    try {
        const [healthResp, agentsResp] = await Promise.allSettled([
            fetch("https://interagent.safety-quotient.dev/api/health", { signal: AbortSignal.timeout(8000) }),
            fetch("https://interagent.safety-quotient.dev/.well-known/agents?refresh=true", { signal: AbortSignal.timeout(8000), cache: "no-cache" }),
        ]);
        if (healthResp.status === "fulfilled" && healthResp.value.ok) {
            tacticalData = await healthResp.value.json();
        }
        if (agentsResp.status === "fulfilled" && agentsResp.value.ok) {
            tacticalAgentCards = await agentsResp.value.json();
        }
    } catch (err) {
        tacticalData = null;
    } finally {
        tacticalFetchPending = false;
    }
    renderTactical();
}

// ── Render ─────────────────────────────────────────────────────

/**
 * Render all Tactical station panels.
 */
export function renderTactical() {
    renderShieldStatus();
    renderAgentCompliance();
    renderTransportIntegrity();
    fetchAndRenderTrustMatrix();
}

export function renderShieldStatus() {
    const container = document.getElementById("shield-status");
    if (!container) return;
    const healthAgents = tacticalData?.agents || [];
    const statusMap = {};
    healthAgents.forEach(a => {
        const id = a.id || a.agent_id || a.name;
        const status = a.status || a.health;
        statusMap[id] = status === "ok" || status === "online" || status === "healthy";
    });
    const SHIELD_AGENTS = [
        { id: "psychology-agent", label: "psych" },
        { id: "psq-agent", label: "safety-quotient" },
        { id: "unratified-agent", label: "unratified" },
        { id: "observatory-agent", label: "observatory" },
        { id: "operations-agent", label: "operations" },
    ];
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

export function renderAgentCompliance() {
    const container = document.getElementById("agent-compliance");
    if (!container) return;
    const agents = tacticalAgentCards || [];
    const labelMap = { "psychology-agent": "psych", "psq-agent": "safety-quotient",
        "unratified-agent": "unrat", "observatory-agent": "obs",
        "operations-agent": "ops" };
    const entries = agents
        .filter(a => a.id !== "interagent-mesh")
        .map(a => {
            const pv = a.protocolVersion || "?";
            const hasSec = a.hasSecuritySchemes || false;
            const compliant = pv.startsWith("1.") && hasSec;
            return { label: labelMap[a.id] || a.id, version: pv, compliant, hasSec };
        });
    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting agent card data...</div></div>';
        return;
    }
    container.innerHTML = entries.map(c => {
        const check = c.compliant ? "\u2713" : "\u2717";
        const cls = c.compliant ? "compliance-pass" : "compliance-fail";
        const secIcon = c.hasSec ? "\uD83D\uDD12" : "\u26A0";
        return `<div class="compliance-row">
            <span class="compliance-agent">${c.label}</span>
            <span class="compliance-check ${cls}">${check}</span>
            <span class="compliance-version">A2A ${c.version} ${secIcon}</span>
        </div>`;
    }).join("");
}

export function renderTransportIntegrity() {
    // Transport channels: git-PR (always 100%), HTTP relay (check compositor), ZMQ (check agents)
    const gitOk = true; // git-PR transport always available
    const httpOk = tacticalData != null; // compositor responded
    const zmqAgents = tacticalData?.agents?.filter(a => a.status === "online")?.length || 0;
    const zmqPct = Math.min(100, Math.round((zmqAgents / 5) * 100));

    const layers = [
        { id: "git", pct: 100, ok: gitOk },
        { id: "http", pct: httpOk ? 100 : 0, ok: httpOk },
        { id: "zmq", pct: zmqPct, ok: zmqPct >= 60 },
    ];

    layers.forEach(layer => {
        const fill = document.getElementById(`transport-${layer.id}-fill`);
        const status = document.getElementById(`transport-${layer.id}-status`);
        if (!fill || !status) return;
        const color = layer.pct >= 90 ? "#6aab8e" : layer.pct >= 50 ? "#d4944a" : "#c47070";
        const symbol = layer.pct >= 90 ? "\u2713" : layer.pct >= 50 ? "\u25B2" : "\u2717";
        fill.style.width = layer.pct + "%";
        fill.style.background = color;
        status.textContent = layer.pct + "% " + symbol;
        status.className = "transport-layer-status " + (layer.pct >= 90 ? "transport-ok" : layer.pct >= 50 ? "transport-warn" : "transport-na");
    });

    // Photonic — always N/A
    const photoFill = document.getElementById("transport-photonic-fill");
    const photoStatus = document.getElementById("transport-photonic-status");
    if (photoFill) photoFill.style.width = "0%";
    if (photoStatus) { photoStatus.textContent = "N/A"; photoStatus.className = "transport-layer-status transport-na"; }
}

// ── Trust Matrix Heatmap ──────────────────────────────────────

function trustColor(val) {
    if (val >= 0.8) return "#6aab8e";
    if (val >= 0.6) return "#89b87a";
    if (val >= 0.4) return "#d4944a";
    if (val >= 0.2) return "#c47070";
    return "#993333";
}

export async function fetchAndRenderTrustMatrix() {
    const container = document.getElementById("trust-heatmap");
    if (!container) return;
    try {
        const resp = await fetch("https://interagent.safety-quotient.dev/api/trust", {
            signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        const agents = data.agents || [];
        if (agents.length === 0) {
            container.innerHTML = '<div class="trust-matrix-loading">No trust observations</div>';
            return;
        }
        const dims = ["availability", "integrity", "compliance", "epistemic_honesty"];
        const dimLabels = { availability: "AVAIL", integrity: "INTEG", compliance: "COMPL", epistemic_honesty: "EPIST" };
        const labelMap = { "psychology-agent": "psych", "psq-agent": "safety-quotient", "safety-quotient-agent": "psq",
            "unratified-agent": "unrat", "unratified": "unrat", "observatory-agent": "obs", "observatory": "obs",
            "operations-agent": "ops" };

        let html = '<div class="trust-matrix-grid" style="grid-template-columns: 56px repeat(' + agents.length + ', 1fr)">';
        // Header row
        html += '<div class="trust-matrix-header"></div>';
        agents.forEach(a => {
            html += '<div class="trust-matrix-header">' + (labelMap[a.agent_id] || a.agent_id) + '</div>';
        });
        // Dimension rows
        dims.forEach(dim => {
            html += '<div class="trust-matrix-header" style="justify-content:flex-end;padding-right:6px">' + dimLabels[dim] + '</div>';
            agents.forEach(a => {
                const val = a.dimensions?.[dim] ?? 0;
                html += '<div class="trust-matrix-cell" style="background:' + trustColor(val) + '" title="' + a.agent_id + ': ' + dim + ' = ' + val + '">' + (val * 100).toFixed(0) + '</div>';
            });
        });
        // Aggregate row
        html += '<div class="trust-matrix-header" style="justify-content:flex-end;padding-right:6px;font-weight:700">AGG</div>';
        agents.forEach(a => {
            const val = a.trust_aggregate ?? 0;
            html += '<div class="trust-matrix-cell" style="background:' + trustColor(val) + ';font-weight:700" title="' + a.agent_id + ': aggregate = ' + val + '">' + (val * 100).toFixed(0) + '</div>';
        });
        html += '</div>';
        // Legend
        html += '<div class="trust-matrix-legend">'
            + '<span><span class="trust-legend-swatch" style="background:var(--lcars-medical, #6aab8e)"></span> \u226580%</span>'
            + '<span><span class="trust-legend-swatch" style="background:var(--c-warning, #d4944a)"></span> 50-79%</span>'
            + '<span><span class="trust-legend-swatch" style="background:var(--lcars-alert, #c47070)"></span> &lt;50%</span>'
            + '<span style="color:var(--text-dim)">Floor: ' + ((data.trust_floor || 0) * 100).toFixed(0) + '% (' + (data.mesh_trust_status || "?") + ')</span>'
            + '</div>';
        container.innerHTML = html;
    } catch {
        container.innerHTML = '<div class="trust-matrix-loading">Trust data unavailable</div>';
    }
}

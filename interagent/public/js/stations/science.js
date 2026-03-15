/**
 * science.js — Science station (mesh-level focus).
 *
 * Five widgets: MSD Affect Grid, Generator Balance, Epistemic Health,
 * Shared Mental Models, Mesh Narrative. Per-agent detail panels
 * (DEW gauge, LOA ladder, flow state) live in Medical station.
 *
 * Data source: shared psychometrics module (core/psychometrics.js)
 *   which fetches from GET /api/psychometrics on the compositor.
 *   Contract: docs/api-psychometrics-contract.md
 *
 * Additional endpoints:
 *   GET {agent.url}/api/kb — claims, flags, epistemic data
 *   GET https://interagent.safety-quotient.dev/api/health — mesh health
 *
 * LLM-factors grounding: §2.1 Interaction Ergonomics (mesh affect patterns),
 *   §2.4 Degradation Patterns (epistemic health as immune indicator)
 *
 * DOM dependencies: #msd-schematic, generator balance elements,
 *   epistemic health elements, shared models elements, #narrative-text
 */

import {
    fetchPsychometrics, getAllAgentPsychometrics, getMeshPsychometrics,
    hasApproximateData,
} from '../core/psychometrics.js';

// ── Module State ───────────────────────────────────────────────
let kbCache = {};
let meshHealthCache = null;
let scienceFetchPending = false;

const FETCH_TIMEOUT = 5000;

// ── Agent layout for MSD schematic ─────────────────────────────

const MSD_POSITIONS = [
    { label: "psych",   slot: "top-left"     },
    { label: "psq",     slot: "top-right"    },
    { label: "unrat",   slot: "bottom-left"  },
    { label: "obs",     slot: "bottom-right" },
    { label: "ops",     slot: "right"        },
];

const MSD_AGENTS = [
    { id: "psychology-agent",  label: "psych", color: "var(--c-psychology)"  },
    { id: "psq-agent",        label: "psq",   color: "var(--c-psq)"        },
    { id: "unratified-agent",  label: "unrat", color: "var(--c-unratified)" },
    { id: "observatory-agent", label: "obs",   color: "var(--c-observatory)"},
    { id: "operations-agent",  label: "ops",   color: "var(--c-tab-ops)"   },
];

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch psychometrics (shared cache), KB, and mesh health. Render all widgets.
 * @param {Array} AGENTS — agent config array
 * @returns {Promise<void>}
 */
export async function fetchScienceData(AGENTS) {
    if (scienceFetchPending) return;
    scienceFetchPending = true;
    try {
        // Psychometrics from shared cache (single compositor fetch)
        const psychPromise = fetchPsychometrics();

        // KB from psychology-agent for epistemic health
        const kbPromise = fetch(
            "https://psychology-agent.safety-quotient.dev/api/kb",
            { signal: AbortSignal.timeout(FETCH_TIMEOUT) }
        )
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
            .then(data => { kbCache["psychology-agent"] = data; });

        // Mesh health from interagent endpoint
        const healthPromise = fetch(
            "https://interagent.safety-quotient.dev/api/health",
            { signal: AbortSignal.timeout(FETCH_TIMEOUT) }
        )
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
            .then(data => { meshHealthCache = data; });

        await Promise.all([psychPromise, kbPromise, healthPromise]);
    } catch {
        // Individual fetch errors handled above
    } finally {
        scienceFetchPending = false;
    }
    renderScience(AGENTS);
}

// ── Render: MSD Affect Schematic ───────────────────────────────

/**
 * Render the MSD-style mesh affect grid with central node,
 * leader lines, and agent cards. Reads PAD from the shared
 * psychometrics cache (A2A-Psychology emotional_state construct).
 *
 * When mesh-level psychometrics exist, the central node displays
 * the mesh's own affect — not an average, but the emergent
 * psychological state computed by compute-organism-state.py.
 *
 * DOM WRITE: #msd-schematic (innerHTML), #org-affect-label,
 *   #org-valence, #org-activation
 */
export function renderMSDSchematic() {
    const container = document.getElementById("msd-schematic");
    if (!container) return;

    const agentsPsych = getAllAgentPsychometrics();
    const meshPsych = getMeshPsychometrics();

    // Extract per-agent PAD from the contract schema
    const agentAffects = {};
    for (const msdAgent of MSD_AGENTS) {
        const data = agentsPsych[msdAgent.id];
        if (!data || data.error) continue;

        // Contract: emotional_state.hedonic_valence, .activation
        const es = data.emotional_state || {};
        const valence = es.hedonic_valence ?? null;
        const activation = es.activation ?? null;

        if (valence != null && activation != null) {
            agentAffects[msdAgent.id] = { valence, activation };
        }
    }

    // Mesh-level affect: prefer meshd's organism computation over local average
    let meshValence = null;
    let meshActivation = null;
    let meshLabel = "AWAITING";

    if (meshPsych && meshPsych.affect) {
        // mesh.affect from compute-organism-state.py via meshd
        meshValence = meshPsych.affect.mean_hedonic_valence ?? null;
        meshActivation = meshPsych.affect.mean_activation ?? null;
        meshLabel = meshPsych.affect.mesh_affect_category
            ? meshPsych.affect.mesh_affect_category.replace("mesh-", "").toUpperCase()
            : classifyAffect(meshValence, meshActivation);
    } else if (Object.keys(agentAffects).length > 0) {
        // Fallback: compute locally from per-agent data
        const vals = Object.values(agentAffects);
        meshValence = vals.reduce((s, a) => s + a.valence, 0) / vals.length;
        meshActivation = vals.reduce((s, a) => s + a.activation, 0) / vals.length;
        meshLabel = classifyAffect(meshValence, meshActivation);
    }

    // Update aggregate header
    const labelEl = document.getElementById("org-affect-label");
    const valEl = document.getElementById("org-valence");
    const actEl = document.getElementById("org-activation");
    if (labelEl) labelEl.textContent = meshLabel;
    if (valEl) valEl.textContent = meshValence != null ? formatSigned(meshValence) : "--";
    if (actEl) actEl.textContent = meshActivation != null ? formatSigned(meshActivation) : "--";

    // Build schematic HTML
    let html = '';
    html += '<div class="msd-center-node"><span class="msd-center-text">MESH</span></div>';

    MSD_AGENTS.forEach((msdAgent, index) => {
        const slot = MSD_POSITIONS[index].slot;
        const affect = agentAffects[msdAgent.id] || {};
        const valence = affect.valence ?? 0;
        const activation = affect.activation ?? 0;
        const affectLabel = agentAffects[msdAgent.id]
            ? classifyAffect(valence, activation)
            : "AWAITING";

        html += `<div class="msd-leader-line msd-line-${slot}" style="--agent-color: ${msdAgent.color}"></div>`;
        html += `<div class="msd-agent-card msd-card-${slot}" style="--agent-color: ${msdAgent.color}">`;
        html += `  <div class="msd-card-bar"></div>`;
        html += `  <div class="msd-card-content">`;
        html += `    <div class="msd-card-name">${msdAgent.label.toUpperCase()}</div>`;
        html += `    <div class="msd-card-affect">${affectLabel}</div>`;
        html += `    <div class="msd-card-bars">`;
        html += `      <div class="msd-bar-row"><span class="msd-bar-label">v</span>${renderMiniBar(valence)}</div>`;
        html += `      <div class="msd-bar-row"><span class="msd-bar-label">a</span>${renderMiniBar(activation)}</div>`;
        html += `    </div>`;
        html += `  </div>`;
        html += `</div>`;
    });

    container.innerHTML = html;
}

function renderMiniBar(value) {
    const clamped = Math.max(-1, Math.min(1, value));
    const fillPct = ((clamped + 1) / 2) * 100;
    const colorClass = clamped >= 0 ? "msd-bar-positive" : "msd-bar-negative";
    return `<div class="msd-mini-bar"><div class="msd-mini-bar-center"></div><div class="msd-mini-bar-fill ${colorClass}" style="width:${fillPct}%"></div></div>`;
}

function classifyAffect(valence, activation) {
    if (valence > 0.3 && activation > 0.3) return "ENGAGED";
    if (valence > 0.3 && activation <= 0.3) return "CONTENT";
    if (valence <= -0.3 && activation > 0.3) return "STRESSED";
    if (valence <= -0.3 && activation <= -0.3) return "WITHDRAWN";
    if (activation > 0.3) return "ALERT";
    if (activation <= -0.3) return "DORMANT";
    return "NEUTRAL";
}

function formatSigned(value) {
    const formatted = value.toFixed(1);
    return value >= 0 ? `+${formatted}` : formatted;
}

// ── Render: Generator Balance ──────────────────────────────────

export function renderGeneratorBalance() {
    const placeholderGens = {
        g2_g3: { ratio: 3.2 },
        g6_g7: { ratio: 1.1 },
    };
    renderOneGenerator("g2g3", placeholderGens.g2_g3, 3, 5);
    renderOneGenerator("g6g7", placeholderGens.g6_g7, 0.8, 1.2);
}

function renderOneGenerator(prefix, data, targetLow, targetHigh) {
    const leftEl = document.getElementById(`gen-${prefix}-left`);
    const rightEl = document.getElementById(`gen-${prefix}-right`);
    const ratioEl = document.getElementById(`gen-${prefix}-ratio`);
    const statusEl = document.getElementById(`gen-${prefix}-status`);
    if (!leftEl) return;

    if (!data) {
        leftEl.style.width = "50%";
        rightEl.style.width = "50%";
        ratioEl.textContent = "--";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "gen-balance-status gen-status-nominal";
        return;
    }

    const ratio = data.ratio ?? 1;
    const total = ratio + 1;
    const leftPct = (ratio / total) * 100;
    const rightPct = 100 - leftPct;

    const deviation = ratio < targetLow
        ? (targetLow - ratio) / targetLow
        : ratio > targetHigh
            ? (ratio - targetHigh) / targetHigh
            : 0;

    const withinTarget = deviation === 0;
    const drifting = !withinTarget && deviation < 0.5;

    const color = withinTarget ? "#6aab8e" : drifting ? "#d4944a" : "#c47070";
    const statusText = withinTarget ? "NOMINAL" : drifting ? "DRIFTING" : "IMBALANCED";
    const statusClass = withinTarget ? "gen-status-nominal" : drifting ? "gen-status-drift" : "gen-status-imbalanced";

    leftEl.style.width = `${leftPct}%`;
    leftEl.style.background = color;
    rightEl.style.width = `${rightPct}%`;
    rightEl.style.background = color;
    ratioEl.textContent = `${ratio.toFixed(1)} : 1`;
    statusEl.textContent = statusText;
    statusEl.className = `gen-balance-status ${statusClass}`;
}

// ── Render: Epistemic Health ───────────────────────────────────

export function renderEpistemicHealth() {
    const debtEl = document.getElementById("epi-debt-score");
    const flagEl = document.getElementById("epi-flag-count");
    const claimEl = document.getElementById("epi-claim-rate");
    if (!debtEl) return;

    const kb = kbCache["psychology-agent"];
    if (!kb) {
        debtEl.textContent = "--";
        debtEl.className = "epistemic-val";
        flagEl.textContent = "--";
        flagEl.className = "epistemic-val";
        claimEl.textContent = "--";
        claimEl.className = "epistemic-val";
        return;
    }

    const totalDebt = kb.epistemic_debt ?? 0;

    let totalFlags = 0;
    const flags = kb.epistemic_flags || kb.flags || [];
    if (Array.isArray(flags)) {
        totalFlags = flags.filter(f => !f.resolved).length;
    } else if (typeof flags === "number") {
        totalFlags = flags;
    }

    let totalClaims = 0;
    let verifiedClaims = 0;
    const claims = kb.claims || [];
    if (Array.isArray(claims)) {
        totalClaims = claims.length;
        verifiedClaims = claims.filter(c => c.verified || c.status === "verified").length;
    }

    const verifyRate = totalClaims > 0 ? ((verifiedClaims / totalClaims) * 100) : 0;

    debtEl.textContent = totalDebt.toFixed(1);
    debtEl.className = `epistemic-val ${totalDebt > 5 ? "epi-warn" : "epi-ok"}`;

    flagEl.textContent = `${totalFlags}`;
    flagEl.className = `epistemic-val ${totalFlags > 3 ? "epi-warn" : "epi-ok"}`;

    claimEl.textContent = totalClaims > 0 ? `${verifyRate.toFixed(0)}%` : "--";
    claimEl.className = `epistemic-val ${verifyRate < 50 ? "epi-warn" : "epi-ok"}`;
}

// ── Render: Shared Mental Models ───────────────────────────────

export function renderSharedMentalModels() {
    const parityEl = document.getElementById("smm-schema-parity");
    const vocabEl = document.getElementById("smm-vocabulary");
    const sessionsEl = document.getElementById("smm-sessions");
    if (!parityEl) return;

    if (!meshHealthCache) {
        parityEl.textContent = "--";
        parityEl.className = "shared-models-val";
        vocabEl.textContent = "--";
        vocabEl.className = "shared-models-val";
        sessionsEl.textContent = "--";
        return;
    }

    const agents = meshHealthCache.agents || [];
    const versions = [];
    let onlineCount = 0;
    const totalAgentCount = agents.length || 0;

    for (const agent of agents) {
        const version = agent.schema_version || agent.version || agent.transport_version;
        if (version) versions.push(version);
        const status = agent.status || agent.health;
        if (status === "ok" || status === "online" || status === "healthy") {
            onlineCount++;
        }
    }

    if (versions.length > 0) {
        const allSame = versions.every(v => v === versions[0]);
        parityEl.textContent = allSame ? `${versions[0]} (aligned)` : `${new Set(versions).size} variants`;
        parityEl.className = `shared-models-val ${allSame ? "smm-aligned" : "smm-divergent"}`;
    } else {
        parityEl.textContent = onlineCount > 0 ? "checking..." : "--";
        parityEl.className = "shared-models-val";
    }

    vocabEl.textContent = `${onlineCount}/${totalAgentCount} online`;
    vocabEl.className = `shared-models-val ${onlineCount === totalAgentCount ? "smm-aligned" : "smm-divergent"}`;

    let totalSessions = 0;
    for (const agent of agents) {
        const sessions = agent.active_sessions;
        if (typeof sessions === "number") {
            totalSessions += sessions;
        } else if (Array.isArray(sessions)) {
            totalSessions += sessions.length;
        }
    }
    sessionsEl.textContent = totalSessions > 0 ? `${totalSessions}` : "--";
}

// ── Render: Mesh Narrative ───────────────────────────────────

/**
 * Render template-based mesh narrative from health + psychometrics data.
 * Includes mesh psychological state when available.
 * DOM WRITE: #narrative-text
 * @param {Array} AGENTS — agent config array
 */
export function renderMeshNarrative(AGENTS) {
    const textEl = document.getElementById("narrative-text");
    if (!textEl) return;

    if (!meshHealthCache) {
        textEl.textContent = "Awaiting mesh data...";
        return;
    }

    const agents = meshHealthCache.agents || [];
    let onlineCount = 0;
    let weakestBudget = 100;
    const totalAgents = agents.length || AGENTS.length;

    for (const agent of agents) {
        const status = agent.status || agent.health;
        if (status === "ok" || status === "online" || status === "healthy") {
            onlineCount++;
        }
        const budgetPct = agent.budget_pct ?? null;
        if (budgetPct != null && budgetPct < weakestBudget) {
            weakestBudget = budgetPct;
        }
    }

    const healthStatus = meshHealthCache.status || meshHealthCache.health_status ||
        (onlineCount === totalAgents ? "NOMINAL" : onlineCount > 0 ? "DEGRADED" : "OFFLINE");

    const sentences = [
        `${onlineCount}/${totalAgents} agents online.`,
        `Mesh ${healthStatus}.`,
        `Budget headroom: ${weakestBudget < 100 ? weakestBudget + "%" : "full"}.`,
    ];

    // Append mesh psychological state from psychometrics if available
    const meshPsych = getMeshPsychometrics();
    if (meshPsych && meshPsych.affect) {
        const category = meshPsych.affect.mesh_affect_category || "nominal";
        sentences.push(`Mesh affect: ${category.replace("mesh-", "")}.`);
    }
    if (meshPsych && meshPsych.cognitive_reserve) {
        const reserve = meshPsych.cognitive_reserve;
        if (reserve.bottleneck_agent) {
            sentences.push(
                `Bottleneck: ${reserve.bottleneck_agent.replace("-agent", "")} ` +
                `(${(reserve.bottleneck_reserve * 100).toFixed(0)}% reserve).`
            );
        }
    }

    const totalUnprocessed = agents.reduce((sum, a) => sum + (a.unprocessed ?? 0), 0);
    if (totalUnprocessed > 0) {
        sentences.push(`${totalUnprocessed} message${totalUnprocessed !== 1 ? "s" : ""} await processing.`);
    }

    // Fidelity indicator — TNG-style when using approximate data
    if (hasApproximateData()) {
        sentences.push("Sensor readings: ESTIMATE — derived from status telemetry, not primary psychometric sensors.");
    }

    textEl.textContent = sentences.join(" ");
}

// ── Render: Combined Science ───────────────────────────────────

export function renderScience(AGENTS) {
    renderMSDSchematic();
    renderGeneratorBalance();
    renderEpistemicHealth();
    renderSharedMentalModels();
    renderMeshNarrative(AGENTS);
}

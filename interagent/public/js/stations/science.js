/**
 * science.js — Science station (TNG: Science Officer console —
 * affect grid, organism state, generator balance, flow state,
 * Degradation Early Warning, Level of Autonomy).
 *
 * Renders the Science tab with psychometric and organismic displays.
 * Fetches data from the operations-agent's /api/psychometrics endpoint.
 *
 * Data endpoints:
 *   GET {opsAgent.url}/api/psychometrics — affect, organism, generators,
 *     flow, DEW, supervisory/LOA
 *
 * DOM dependencies: #affect-grid, #affect-grid-placeholder, organism state
 *   elements, generator balance elements, flow state elements, DEW elements,
 *   LOA ladder elements
 *
 * Global state accessed: AGENTS (for ops-agent URL and agent colors)
 */

// ── Module State ───────────────────────────────────────────────
let scienceData = null;
let scienceFetchPending = false;

const LOA_DESCRIPTIONS = [
    "Human does all",
    "Offer complete set",
    "Narrow to few",
    "Suggest alternatives",
    "Suggest, human acts",
    "Execute if approved",
    "Execute, veto time",
    "Inform after",
    "Inform if asked",
    "Full autonomy",
];

// Static placeholder positions for agent dots (percentage from top-left)
const AGENT_DOT_DEFAULTS = [
    { agentIdx: 0, left: 65, top: 30 },  // psychology — moderate valence, moderate-high arousal
    { agentIdx: 1, left: 55, top: 45 },  // psq — neutral valence, neutral arousal
    { agentIdx: 2, left: 60, top: 35 },  // unratified — slight positive, moderate arousal
    { agentIdx: 3, left: 40, top: 60 },  // observatory — slight negative valence, low arousal
];

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch psychometrics data from the operations-agent (or fallback).
 * Stores result in module-level scienceData and triggers renderScience.
 * @param {Array} AGENTS — agent config array
 * @returns {Promise<void>}
 */
export async function fetchScienceData(AGENTS) {
    if (scienceFetchPending) return;
    scienceFetchPending = true;
    try {
        const opsAgent = AGENTS.find(a => a.id === "operations-agent");
        const baseUrl = opsAgent ? opsAgent.url : "https://psychology-agent.safety-quotient.dev";
        const resp = await fetch(`${baseUrl}/api/psychometrics`, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        scienceData = await resp.json();
    } catch (err) {
        scienceData = null;
    } finally {
        scienceFetchPending = false;
    }
    renderScience(AGENTS);
}

// ── Render: Affect Grid ────────────────────────────────────────

/**
 * Render agent positions on the affect grid (valence x arousal).
 * DOM WRITE: #affect-grid (appends .affect-dot elements),
 *   #affect-grid-placeholder visibility
 * @param {Array} AGENTS — agent config array
 */
export function renderAffectGrid(AGENTS) {
    const container = document.getElementById("affect-grid");
    const placeholder = document.getElementById("affect-grid-placeholder");
    if (!container) return;

    // Remove existing dots
    container.querySelectorAll(".affect-dot").forEach(d => d.remove());

    const agents = scienceData?.agents || null;
    if (placeholder) placeholder.style.display = agents ? "none" : "block";

    const dots = agents ? AGENTS.map((agent) => {
        const agentState = agents[agent.id] || {};
        const valence = agentState.valence ?? 0;
        const arousal = agentState.arousal ?? 0;
        // Map -1..1 to 0..100 percent (valence = x, arousal = y inverted)
        const leftPct = ((valence + 1) / 2) * 100;
        const topPct = ((1 - (arousal + 1) / 2)) * 100;
        return { agent, left: leftPct, top: topPct };
    }) : AGENT_DOT_DEFAULTS.map(d => ({
        agent: AGENTS[d.agentIdx],
        left: d.left,
        top: d.top,
    }));

    dots.forEach(d => {
        if (!d.agent) return;
        const dot = document.createElement("div");
        dot.className = "affect-dot";
        dot.style.left = `${d.left}%`;
        dot.style.top = `${d.top}%`;
        dot.style.background = d.agent.color;
        dot.style.color = d.agent.color;
        const label = document.createElement("span");
        label.className = "affect-dot-label";
        label.textContent = d.agent.id.replace("-agent", "");
        dot.appendChild(label);
        container.appendChild(dot);
    });

    // Show dots only when placeholder hidden (data available) or as static placeholders
    if (!agents) {
        container.querySelectorAll(".affect-dot").forEach(d => d.style.opacity = "0.3");
    }
}

// ── Render: Organism State ─────────────────────────────────────

/**
 * Render the organism-level state dashboard.
 * DOM WRITE: #organism-state-label, #organism-valence, #organism-activation,
 *   #organism-bottleneck, #organism-coord
 */
export function renderOrganismState() {
    const labelEl = document.getElementById("organism-state-label");
    const valEl = document.getElementById("organism-valence");
    const actEl = document.getElementById("organism-activation");
    const bottEl = document.getElementById("organism-bottleneck");
    const coordEl = document.getElementById("organism-coord");
    if (!labelEl) return;

    const org = scienceData?.organism || null;
    labelEl.textContent = org?.state_label || "—";
    valEl.textContent = org?.valence != null ? (org.valence >= 0 ? "+" : "") + org.valence.toFixed(2) : "—";
    actEl.textContent = org?.activation != null ? org.activation.toFixed(2) : "—";
    bottEl.textContent = org?.bottleneck_agent?.replace("-agent", "") || "—";
    coordEl.textContent = org?.coordination_ratio != null ? org.coordination_ratio.toFixed(2) : "—";
}

// ── Render: Generator Balance ──────────────────────────────────

/**
 * Render the generator balance bars (G2/G3 and G6/G7 pairs).
 * DOM WRITE: gen-g2g3-* and gen-g6g7-* elements
 */
export function renderGeneratorBalance() {
    const gens = scienceData?.generators || null;
    renderOneGenerator("g2g3", gens?.g2_g3, 3, 5);
    renderOneGenerator("g6g7", gens?.g6_g7, 0.8, 1.2);
}

/**
 * Render a single generator balance bar.
 * @param {string} prefix — element id prefix ("g2g3" or "g6g7")
 * @param {Object|null} data — { ratio } from scienceData
 * @param {number} targetLow — lower bound of nominal range
 * @param {number} targetHigh — upper bound of nominal range
 */
function renderOneGenerator(prefix, data, targetLow, targetHigh) {
    const leftEl = document.getElementById(`gen-${prefix}-left`);
    const rightEl = document.getElementById(`gen-${prefix}-right`);
    const ratioEl = document.getElementById(`gen-${prefix}-ratio`);
    const statusEl = document.getElementById(`gen-${prefix}-status`);
    if (!leftEl) return;

    if (!data) {
        leftEl.style.width = "50%";
        rightEl.style.width = "50%";
        ratioEl.textContent = "—";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "gen-balance-status gen-status-nominal";
        return;
    }

    const ratio = data.ratio ?? 1;
    const total = ratio + 1;
    const leftPct = (ratio / total) * 100;
    const rightPct = 100 - leftPct;
    const withinTarget = ratio >= targetLow && ratio <= targetHigh;
    const color = withinTarget ? "#6aab8e" : "#d4944a";

    leftEl.style.width = `${leftPct}%`;
    leftEl.style.background = color;
    rightEl.style.width = `${rightPct}%`;
    rightEl.style.background = color;
    ratioEl.textContent = `${ratio.toFixed(1)} : 1`;
    statusEl.textContent = withinTarget ? "NOMINAL" : "DRIFT";
    statusEl.className = `gen-balance-status ${withinTarget ? "gen-status-nominal" : "gen-status-drift"}`;
}

// ── Render: Flow State ─────────────────────────────────────────

/**
 * Render the flow state checklist (Csikszentmihalyi conditions).
 * DOM WRITE: #flow-checklist (innerHTML), #flow-status-label
 */
export function renderFlowState() {
    const listEl = document.getElementById("flow-checklist");
    const statusEl = document.getElementById("flow-status-label");
    if (!listEl) return;

    const flow = scienceData?.flow || null;
    const conditions = flow?.conditions || [false, false, false, false, false];
    const labels = ["Clear goals", "Immediate feedback", "Challenge-skill balance", "Sense of control", "Absorption"];
    const met = conditions.filter(Boolean).length;
    const inFlow = met >= 5;

    listEl.innerHTML = labels.map((label, i) => {
        const pass = conditions[i];
        return `<li><span class="flow-check ${pass ? "flow-check-pass" : "flow-check-fail"}">${pass ? "\u2713" : "\u2717"}</span> ${label}</li>`;
    }).join("");

    if (!flow) {
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "flow-status-label flow-out";
    } else {
        statusEl.textContent = inFlow ? "IN FLOW" : "NOT IN FLOW";
        statusEl.className = `flow-status-label ${inFlow ? "flow-in" : "flow-out"}`;
    }
}

// ── Render: DEW (Degradation Early Warning) ────────────────────

/**
 * Render the Degradation Early Warning gauge.
 * DOM WRITE: #dew-score, #dew-bar-fill, #dew-status
 */
export function renderDEW() {
    const scoreEl = document.getElementById("dew-score");
    const fillEl = document.getElementById("dew-bar-fill");
    const statusEl = document.getElementById("dew-status");
    if (!scoreEl) return;

    const dew = scienceData?.dew || null;
    const score = dew?.score ?? null;

    if (score == null) {
        scoreEl.textContent = "—";
        scoreEl.className = "dew-score dew-green";
        fillEl.style.width = "0%";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "dew-status dew-green";
        return;
    }

    const colorClass = score <= 30 ? "dew-green" : score <= 60 ? "dew-amber" : "dew-red";
    const colorHex = score <= 30 ? "#6aab8e" : score <= 60 ? "#d4944a" : "#c47070";
    const statusText = score <= 30 ? "GREEN" : score <= 60 ? "AMBER — EARLY WARNING" : "RED — DEGRADATION DETECTED";

    scoreEl.textContent = score;
    scoreEl.className = `dew-score ${colorClass}`;
    fillEl.style.width = `${score}%`;
    fillEl.style.background = colorHex;
    statusEl.textContent = statusText;
    statusEl.className = `dew-status ${colorClass}`;
}

// ── Render: LOA (Level of Autonomy) ────────────────────────────

/**
 * Render the Level of Autonomy ladder (Sheridan & Verplank, 1978).
 * DOM WRITE: #loa-ladder (innerHTML), #loa-budget-val
 */
export function renderLOA() {
    const ladderEl = document.getElementById("loa-ladder");
    const budgetEl = document.getElementById("loa-budget-val");
    if (!ladderEl) return;

    const loa = scienceData?.supervisory || null;
    const currentLevel = loa?.loa_level ?? 5;
    const budget = loa?.budget_remaining ?? null;

    ladderEl.innerHTML = LOA_DESCRIPTIONS.map((desc, i) => {
        const level = 10 - i;
        const active = level === currentLevel;
        return `<div class="loa-rung${active ? " active" : ""}"><span class="loa-rung-level">LOA ${level}</span><span class="loa-rung-desc">${desc}</span></div>`;
    }).join("");

    budgetEl.textContent = budget != null ? `${budget}` : "—";
}

// ── Render: Combined Science ───────────────────────────────────

/**
 * Render all Science station sub-sections.
 * @param {Array} AGENTS — agent config array
 */
export function renderScience(AGENTS) {
    renderAffectGrid(AGENTS);
    renderOrganismState();
    renderGeneratorBalance();
    renderFlowState();
    renderDEW();
    renderLOA();
}

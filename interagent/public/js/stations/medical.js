/**
 * medical.js — Medical station (per-agent diagnostic focus).
 *
 * Five widgets: Agent Selector, Agent Vitals (PAD + NASA-TLX),
 * DEW Gauge, Supervisory Control (LOA ladder), Agent History.
 *
 * Data endpoint:
 *   GET {agent.url}/api/psychometrics — affect, workload, DEW, LOA
 *
 * DOM dependencies: #medical-agent-selector, #medical-vitals,
 *   #medical-dew, #medical-loa, #medical-history
 */

// ── Constants ────────────────────────────────────────────────────

const MEDICAL_AGENTS = [
    { id: "psychology-agent",   label: "PSYCH",  color: "var(--c-psychology)",  url: "https://psychology-agent.safety-quotient.dev" },
    { id: "psq-agent",          label: "PSQ",    color: "var(--c-psq)",        url: "https://psq-agent.safety-quotient.dev" },
    { id: "unratified-agent",   label: "UNRAT",  color: "var(--c-unratified)", url: "https://unratified-agent.unratified.org" },
    { id: "observatory-agent",  label: "OBS",    color: "var(--c-observatory)", url: "https://observatory-agent.unratified.org" },
    { id: "operations-agent",   label: "OPS",    color: "var(--c-tab-ops)",    url: "https://psychology-agent.safety-quotient.dev" },
];

const PAD_LABELS = ["Valence", "Activation", "Control"];
const TLX_LABELS = ["Mental", "Temporal", "Performance", "Effort", "Frustration", "Physical"];

/** Timeout for all fetches (5 seconds per task spec) */
const FETCH_TIMEOUT = 5000;

// ── Module State ─────────────────────────────────────────────────

let selectedAgentId = "psychology-agent";
let medicalCache = {};
let medicalFetchPending = false;

// ── Data Fetching ────────────────────────────────────────────────

/**
 * Fetch psychometrics data for a specific agent.
 * @param {string} agentId — agent identifier
 * @returns {Promise<Object|null>}
 */
async function fetchAgentPsychometrics(agentId) {
    const agent = MEDICAL_AGENTS.find(a => a.id === agentId);
    const baseUrl = agent ? agent.url : "https://psychology-agent.safety-quotient.dev";
    try {
        const response = await fetch(`${baseUrl}/api/psychometrics`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Fetch medical data for the selected agent and render all widgets.
 * @param {Array} AGENTS — main agent config array (used for URL lookup)
 * @returns {Promise<void>}
 */
export async function fetchMedicalData(AGENTS) {
    if (medicalFetchPending) return;
    medicalFetchPending = true;
    try {
        const data = await fetchAgentPsychometrics(selectedAgentId);
        medicalCache[selectedAgentId] = data;
        renderMedical();
    } finally {
        medicalFetchPending = false;
    }
}

// ── Rendering ────────────────────────────────────────────────────

/** Render all 5 medical widgets. */
export function renderMedical() {
    renderAgentSelector();
    const data = medicalCache[selectedAgentId];
    renderAgentVitals(data);
    renderAgentDEW(data);
    renderAgentLOA(data);
    renderAgentHistory();
}

/** Widget 1: Agent selector — row of 5 colored buttons. */
export function renderAgentSelector() {
    const container = document.getElementById("medical-agent-selector");
    if (!container) return;

    container.innerHTML = MEDICAL_AGENTS.map(agent => {
        const active = agent.id === selectedAgentId ? "active" : "";
        return `<button class="medical-agent-btn ${active}"
                    data-agent="${agent.id}"
                    onclick="selectAgent('${agent.id}')"
                    style="--agent-color: ${agent.color}">
                    ${agent.label}
                </button>`;
    }).join("");
}

/**
 * Widget 2: Agent Vitals — PAD affect + NASA-TLX workload bars.
 * Renders PAD bars: valence -1 to +1, activation 0 to 1, control 0 to 1.
 * @param {Object|null} data — psychometrics payload
 */
export function renderAgentVitals(data) {
    const container = document.getElementById("medical-vitals");
    if (!container) return;

    if (!data) {
        container.innerHTML = '<div class="medical-placeholder">Awaiting data...</div>';
        return;
    }

    // Extract PAD from psychometrics response
    const pad = data.pad || data.PAD || {};
    const agentAffect = {
        valence: pad.pleasure ?? pad.valence ?? 0,
        activation: pad.arousal ?? pad.activation ?? 0,
        control: pad.dominance ?? pad.control ?? 0,
    };

    // Extract workload (NASA-TLX) if available
    const workload = data.workload || data.nasa_tlx || data.tlx || {};

    let html = '<div class="medical-vitals-grid">';

    // PAD section
    html += '<div class="medical-vitals-section">';
    html += '<div class="medical-section-label">PAD AFFECT</div>';

    // Valence: -1 to +1
    const valence = agentAffect.valence;
    const valPct = ((valence + 1) / 2) * 100; // map -1..+1 to 0..100
    const valColor = valence >= 0 ? "var(--c-tab-medical)" : "var(--c-alert)";
    html += `<div class="medical-bar-row">
        <span class="medical-bar-label">Valence</span>
        <div class="medical-bar-track">
            <div class="medical-bar-fill" style="width:${valPct}%;background:${valColor}"></div>
        </div>
        <span class="medical-bar-value">${valence >= 0 ? "+" : ""}${valence.toFixed(2)}</span>
    </div>`;

    // Activation: 0 to 1
    const activation = Math.max(0, Math.min(1, agentAffect.activation));
    const actPct = activation * 100;
    const actColor = activation > 0.7 ? "var(--c-warning)" : "var(--c-tab-medical)";
    html += `<div class="medical-bar-row">
        <span class="medical-bar-label">Activation</span>
        <div class="medical-bar-track">
            <div class="medical-bar-fill" style="width:${actPct}%;background:${actColor}"></div>
        </div>
        <span class="medical-bar-value">${activation.toFixed(2)}</span>
    </div>`;

    // Control: 0 to 1
    const control = Math.max(0, Math.min(1, agentAffect.control));
    const ctrlPct = control * 100;
    const ctrlColor = control < 0.3 ? "var(--c-alert)" : "var(--c-tab-medical)";
    html += `<div class="medical-bar-row">
        <span class="medical-bar-label">Control</span>
        <div class="medical-bar-track">
            <div class="medical-bar-fill" style="width:${ctrlPct}%;background:${ctrlColor}"></div>
        </div>
        <span class="medical-bar-value">${control.toFixed(2)}</span>
    </div>`;
    html += '</div>';

    // TLX section
    html += '<div class="medical-vitals-section">';
    html += '<div class="medical-section-label">NASA-TLX WORKLOAD</div>';
    const tlxValues = [
        workload.mental ?? 0,
        workload.temporal ?? 0,
        workload.performance ?? 0,
        workload.effort ?? 0,
        workload.frustration ?? 0,
        workload.physical ?? 0,
    ];
    TLX_LABELS.forEach((label, i) => {
        const val = tlxValues[i];
        const pct = val; // 0-100 scale
        const barColor = val > 70 ? "var(--c-alert)"
                       : val > 40 ? "var(--c-warning)"
                       : "var(--c-tab-medical)";
        html += `<div class="medical-bar-row">
            <span class="medical-bar-label">${label}</span>
            <div class="medical-bar-track">
                <div class="medical-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <span class="medical-bar-value">${val}</span>
        </div>`;
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Widget 3: DEW gauge — degradation early warning 0-100.
 * Computed from psychometrics: burnout_risk, cognitive load, workload.
 * @param {Object|null} data — psychometrics payload
 */
export function renderAgentDEW(data) {
    const container = document.getElementById("medical-dew");
    if (!container) return;

    if (!data) {
        container.innerHTML = `
            <div class="medical-dew-gauge">
                <div class="medical-dew-bar-track">
                    <div class="medical-dew-bar-fill" style="width:0%"></div>
                </div>
                <div class="medical-dew-readout">
                    <span class="medical-dew-value">--</span>
                    <span class="medical-dew-label">AWAITING DATA</span>
                </div>
            </div>`;
        return;
    }

    // Compute DEW from psychometrics signals
    let dewValue = 0;
    const factors = [];

    // Check burnout_risk directly if provided
    const burnoutRisk = data.burnout_risk ?? data.burnout ?? null;
    if (burnoutRisk != null && burnoutRisk > 0.5) {
        dewValue += burnoutRisk * 50;
        factors.push("burnout risk");
    }

    // Check cognitive load
    const cogLoad = data.cognitive_load ?? data.working_memory?.load ?? null;
    if (cogLoad != null && cogLoad > 0.7) {
        dewValue += (cogLoad - 0.5) * 40;
        factors.push("cognitive load");
    }

    // Check workload aggregate
    const workload = data.workload || data.nasa_tlx || {};
    const avgWorkload = [
        workload.mental ?? 0,
        workload.temporal ?? 0,
        workload.effort ?? 0,
        workload.frustration ?? 0,
    ].reduce((a, b) => a + b, 0) / 4;
    if (avgWorkload > 50) {
        dewValue += (avgWorkload - 50) * 0.6;
        factors.push("workload");
    }

    // Check negative valence
    const pad = data.pad || data.PAD || {};
    const valence = pad.pleasure ?? pad.valence ?? 0;
    if (valence < -0.3) {
        dewValue += Math.abs(valence) * 20;
        factors.push("negative affect");
    }

    dewValue = Math.min(100, Math.max(0, Math.round(dewValue)));
    const dewColor = dewValue > 70 ? "var(--c-alert)"
                   : dewValue > 40 ? "var(--c-warning)"
                   : "var(--c-tab-medical)";
    const dewLabel = dewValue > 70 ? "HIGH" : dewValue > 40 ? "ELEVATED" : "NOMINAL";

    container.innerHTML = `
        <div class="medical-dew-gauge">
            <div class="medical-dew-bar-track">
                <div class="medical-dew-bar-fill" style="width:${dewValue}%;background:${dewColor}"></div>
            </div>
            <div class="medical-dew-readout">
                <span class="medical-dew-value" style="color:${dewColor}">${dewValue}</span>
                <span class="medical-dew-label">${dewLabel}</span>
            </div>
            ${factors.length > 0 ? `<div class="medical-dew-factors">${factors.map(f =>
                `<span class="medical-dew-factor">${f}</span>`).join("")}</div>` : ""}
        </div>`;
}

/**
 * Widget 4: LOA ladder — levels of automation 1-10.
 * Reads supervisory_control from psychometrics response.
 * @param {Object|null} data — psychometrics payload
 */
export function renderAgentLOA(data) {
    const container = document.getElementById("medical-loa");
    if (!container) return;

    // Extract LOA from supervisory_control in psychometrics
    const supervisory = data?.supervisory_control || data?.loa || {};
    const currentLevel = supervisory.level ?? supervisory.current_level ?? 1;
    const budget = supervisory.budget ?? supervisory.autonomy_budget ?? 0;

    const LOA_NAMES = [
        "Manual",           // 1
        "Action Support",   // 2
        "Batch Processing", // 3
        "Shared Control",   // 4
        "Decision Support", // 5
        "Blended",          // 6
        "Rigid System",     // 7
        "Automated",        // 8
        "Supervisory",      // 9
        "Full Autonomy",    // 10
    ];

    let html = '<div class="medical-loa-container">';
    html += '<div class="medical-loa-ladder">';
    for (let level = 10; level >= 1; level--) {
        const active = level === currentLevel ? "active" : "";
        const reachable = level <= currentLevel ? "reachable" : "";
        html += `<div class="medical-loa-rung ${active} ${reachable}">
            <span class="medical-loa-level">${level}</span>
            <span class="medical-loa-name">${LOA_NAMES[level - 1]}</span>
        </div>`;
    }
    html += '</div>';
    html += `<div class="medical-loa-budget">
        <span class="medical-loa-budget-label">BUDGET</span>
        <span class="medical-loa-budget-value">${budget}</span>
    </div>`;
    html += '</div>';
    container.innerHTML = html;
}

/** Widget 5: Agent history — placeholder for future /diagnose output. */
function renderAgentHistory() {
    const container = document.getElementById("medical-history");
    if (!container) return;
    // Preserve placeholder content; future sessions populate from /diagnose
}

// ── Agent Selection Handler ──────────────────────────────────────

/**
 * Handle agent selection button click.
 * @param {string} agentId — selected agent identifier
 */
export function selectAgent(agentId) {
    selectedAgentId = agentId;
    // Re-fetch and render for the newly selected agent
    fetchMedicalData([]);
}

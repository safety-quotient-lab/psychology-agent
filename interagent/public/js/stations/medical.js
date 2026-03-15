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
    { id: "psychology-agent",   label: "PSYCH",  color: "var(--c-psychology)"  },
    { id: "psq-agent",          label: "PSQ",    color: "var(--c-psq)"        },
    { id: "unratified-agent",   label: "UNRAT",  color: "var(--c-unratified)" },
    { id: "observatory-agent",  label: "OBS",    color: "var(--c-observatory)"},
    { id: "operations-agent",   label: "OPS",    color: "var(--c-tab-ops)"   },
];

const PAD_LABELS = ["Valence", "Activation", "Control"];
const TLX_LABELS = ["Mental", "Temporal", "Performance", "Effort", "Frustration", "Physical"];

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
    const urlMap = {
        "psychology-agent":  "https://psychology-agent.safety-quotient.dev",
        "psq-agent":         "https://psq-agent.safety-quotient.dev",
        "unratified-agent":  "https://unratified-agent.unratified.org",
        "observatory-agent": "https://observatory-agent.unratified.org",
        "operations-agent":  "https://psychology-agent.safety-quotient.dev",
    };
    const baseUrl = urlMap[agentId] || urlMap["psychology-agent"];
    try {
        const response = await fetch(`${baseUrl}/api/psychometrics`, {
            signal: AbortSignal.timeout(8000),
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
 * @param {Object|null} data — psychometrics payload
 */
export function renderAgentVitals(data) {
    const container = document.getElementById("medical-vitals");
    if (!container) return;

    if (!data) {
        container.innerHTML = '<div class="medical-placeholder">No vitals data available for this agent</div>';
        return;
    }

    // Extract per-agent affect from organism data
    const agentAffect = extractAgentAffect(data, selectedAgentId);
    const workload = extractAgentWorkload(data, selectedAgentId);

    let html = '<div class="medical-vitals-grid">';

    // PAD section
    html += '<div class="medical-vitals-section">';
    html += '<div class="medical-section-label">PAD AFFECT</div>';
    const padValues = [
        agentAffect.valence ?? 0,
        agentAffect.activation ?? 0,
        agentAffect.control ?? 0,
    ];
    PAD_LABELS.forEach((label, i) => {
        const val = padValues[i];
        const pct = ((val + 1) / 2) * 100; // map -1..+1 to 0..100
        const barColor = val >= 0 ? "var(--c-tab-medical)" : "var(--c-alert)";
        html += `<div class="medical-bar-row">
            <span class="medical-bar-label">${label}</span>
            <div class="medical-bar-track">
                <div class="medical-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <span class="medical-bar-value">${val >= 0 ? "+" : ""}${val.toFixed(2)}</span>
        </div>`;
    });
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
 * @param {Object|null} data — psychometrics payload
 */
export function renderAgentDEW(data) {
    const container = document.getElementById("medical-dew");
    if (!container) return;

    const dew = extractAgentDEW(data, selectedAgentId);
    const dewValue = dew.score ?? 0;
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
            ${dew.factors ? `<div class="medical-dew-factors">${dew.factors.map(f =>
                `<span class="medical-dew-factor">${f}</span>`).join("")}</div>` : ""}
        </div>`;
}

/**
 * Widget 4: LOA ladder — levels of automation 1-10.
 * @param {Object|null} data — psychometrics payload
 */
export function renderAgentLOA(data) {
    const container = document.getElementById("medical-loa");
    if (!container) return;

    const loa = extractAgentLOA(data, selectedAgentId);
    const currentLevel = loa.level ?? 1;
    const budget = loa.budget ?? 0;

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

// ── Data Extraction Helpers ──────────────────────────────────────

function extractAgentAffect(data, agentId) {
    if (!data) return { valence: 0, activation: 0, control: 0 };
    // Navigate psychometrics response: agents array or organism-level
    const agents = data?.agents || data?.organism?.agents || [];
    const agentEntry = agents.find(a => a.id === agentId || a.agent_id === agentId);
    if (agentEntry?.affect) return agentEntry.affect;
    if (agentEntry?.pad) return agentEntry.pad;
    // Fallback: organism-level aggregate
    if (data?.organism?.affect) return data.organism.affect;
    return { valence: 0, activation: 0, control: 0 };
}

function extractAgentWorkload(data, agentId) {
    if (!data) return { mental: 0, temporal: 0, performance: 0, effort: 0, frustration: 0, physical: 0 };
    const agents = data?.agents || data?.organism?.agents || [];
    const agentEntry = agents.find(a => a.id === agentId || a.agent_id === agentId);
    if (agentEntry?.workload) return agentEntry.workload;
    if (agentEntry?.tlx) return agentEntry.tlx;
    return { mental: 0, temporal: 0, performance: 0, effort: 0, frustration: 0, physical: 0 };
}

function extractAgentDEW(data, agentId) {
    if (!data) return { score: 0 };
    const agents = data?.agents || data?.organism?.agents || [];
    const agentEntry = agents.find(a => a.id === agentId || a.agent_id === agentId);
    if (agentEntry?.dew) return agentEntry.dew;
    if (data?.dew) return data.dew;
    return { score: 0 };
}

function extractAgentLOA(data, agentId) {
    if (!data) return { level: 1, budget: 0 };
    const agents = data?.agents || data?.organism?.agents || [];
    const agentEntry = agents.find(a => a.id === agentId || a.agent_id === agentId);
    if (agentEntry?.loa) return agentEntry.loa;
    if (data?.loa) return data.loa;
    return { level: 1, budget: 0 };
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

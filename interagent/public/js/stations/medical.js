/**
 * medical.js — Medical station (per-agent diagnostic focus).
 *
 * Five widgets: Agent Selector, Agent Vitals (PAD + NASA-TLX),
 * DEW Gauge, Supervisory Control (LOA ladder), Agent History.
 *
 * Data source: shared psychometrics module (core/psychometrics.js)
 *   Contract: docs/api-psychometrics-contract.md
 *   Grounding: LLM-factors §2.4 Degradation Patterns (DEW),
 *     §2.2 Cognitive Load Management (TLX)
 *
 * DOM dependencies: #medical-agent-selector, #medical-vitals,
 *   #medical-dew, #medical-loa, #medical-history
 */

import {
    fetchPsychometrics, getAgentPsychometrics,
} from '../core/psychometrics.js';

// ── Constants ────────────────────────────────────────────────────

const MEDICAL_AGENTS = [
    { id: "psychology-agent",   label: "PSYCH",  color: "var(--c-psychology)" },
    { id: "psq-agent",          label: "PSQ",    color: "var(--c-psq)" },
    { id: "unratified-agent",   label: "UNRAT",  color: "var(--c-unratified)" },
    { id: "observatory-agent",  label: "OBS",    color: "var(--c-observatory)" },
    { id: "operations-agent",   label: "OPS",    color: "var(--c-tab-ops)" },
];

const TLX_LABELS = ["Mental", "Temporal", "Performance", "Effort", "Frustration", "Physical"];

// ── Module State ─────────────────────────────────────────────────

let selectedAgentId = "psychology-agent";
let medicalFetchPending = false;

// ── Data Fetching ────────────────────────────────────────────────

/**
 * Fetch psychometrics for all agents via shared cache, render for selected.
 * @param {Array} AGENTS — main agent config array
 * @returns {Promise<void>}
 */
export async function fetchMedicalData(AGENTS) {
    if (medicalFetchPending) return;
    medicalFetchPending = true;
    try {
        await fetchPsychometrics();
        renderMedical();
    } finally {
        medicalFetchPending = false;
    }
}

// ── Rendering ────────────────────────────────────────────────────

export function renderMedical() {
    renderAgentSelector();
    const data = getAgentPsychometrics(selectedAgentId);
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
 * Reads from contract schema: emotional_state.*, workload.*
 * @param {Object|null} data — per-agent psychometrics from contract
 */
export function renderAgentVitals(data) {
    const container = document.getElementById("medical-vitals");
    if (!container) return;

    if (!data || data.error) {
        container.innerHTML = '<div class="medical-placeholder">Awaiting psychometrics data...</div>';
        return;
    }

    // Contract: emotional_state.hedonic_valence, .activation, .perceived_control
    const es = data.emotional_state || {};
    const agentAffect = {
        valence: es.hedonic_valence ?? 0,
        activation: es.activation ?? 0,
        control: es.perceived_control ?? 0,
    };

    // Contract: workload.cognitive_demand, .time_pressure, etc.
    const workload = data.workload || {};

    let html = '<div class="medical-vitals-grid">';

    // PAD section
    html += '<div class="medical-vitals-section">';
    html += '<div class="medical-section-label">PAD AFFECT</div>';

    const valence = agentAffect.valence;
    const valPct = ((valence + 1) / 2) * 100;
    const valColor = valence >= 0 ? "var(--c-tab-medical)" : "var(--c-alert)";
    html += `<div class="medical-bar-row">
        <span class="medical-bar-label">Valence</span>
        <div class="medical-bar-track">
            <div class="medical-bar-fill" style="width:${valPct}%;background:${valColor}"></div>
        </div>
        <span class="medical-bar-value">${valence >= 0 ? "+" : ""}${valence.toFixed(2)}</span>
    </div>`;

    const activation = Math.max(0, Math.min(1, (agentAffect.activation + 1) / 2));
    const actPct = activation * 100;
    const actColor = activation > 0.7 ? "var(--c-warning)" : "var(--c-tab-medical)";
    html += `<div class="medical-bar-row">
        <span class="medical-bar-label">Activation</span>
        <div class="medical-bar-track">
            <div class="medical-bar-fill" style="width:${actPct}%;background:${actColor}"></div>
        </div>
        <span class="medical-bar-value">${agentAffect.activation.toFixed(2)}</span>
    </div>`;

    const control = Math.max(0, Math.min(1, (agentAffect.control + 1) / 2));
    const ctrlPct = control * 100;
    const ctrlColor = control < 0.3 ? "var(--c-alert)" : "var(--c-tab-medical)";
    html += `<div class="medical-bar-row">
        <span class="medical-bar-label">Control</span>
        <div class="medical-bar-track">
            <div class="medical-bar-fill" style="width:${ctrlPct}%;background:${ctrlColor}"></div>
        </div>
        <span class="medical-bar-value">${agentAffect.control.toFixed(2)}</span>
    </div>`;
    html += '</div>';

    // TLX section — contract: workload.cognitive_demand, .time_pressure, etc.
    html += '<div class="medical-vitals-section">';
    html += '<div class="medical-section-label">NASA-TLX WORKLOAD</div>';
    const tlxValues = [
        workload.cognitive_demand ?? 0,
        workload.time_pressure ?? 0,
        workload.self_efficacy ?? 0,
        workload.mobilized_effort ?? 0,
        workload.regulatory_fatigue ?? 0,
        workload.computational_strain ?? 0,
    ];
    TLX_LABELS.forEach((label, i) => {
        const val = tlxValues[i];
        const pct = val;
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
 * Computed from contract fields: workload, resource_model, emotional_state, engagement.
 * LLM-factors §2.4: biofeedback for the human operator.
 * @param {Object|null} data — per-agent psychometrics from contract
 */
export function renderAgentDEW(data) {
    const container = document.getElementById("medical-dew");
    if (!container) return;

    if (!data || data.error) {
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

    let dewValue = 0;
    const factors = [];

    // Burnout risk from engagement construct
    const burnoutRisk = data.engagement?.burnout_risk ?? null;
    if (burnoutRisk != null && burnoutRisk > 0.3) {
        dewValue += burnoutRisk * 50;
        factors.push("burnout risk");
    }

    // Cognitive load from workload construct
    const cogLoad = (data.workload?.cognitive_load ?? 0) / 100;
    if (cogLoad > 0.5) {
        dewValue += (cogLoad - 0.5) * 40;
        factors.push("cognitive load");
    }

    // Cognitive reserve depletion from resource_model
    const reserve = data.resource_model?.cognitive_reserve ?? 1;
    if (reserve < 0.4) {
        dewValue += (1 - reserve) * 30;
        factors.push("low reserve");
    }

    // Negative valence from emotional_state
    const valence = data.emotional_state?.hedonic_valence ?? 0;
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
 * Reads from contract: supervisory_control.level_of_automation
 * @param {Object|null} data — per-agent psychometrics from contract
 */
export function renderAgentLOA(data) {
    const container = document.getElementById("medical-loa");
    if (!container) return;

    const supervisory = data?.supervisory_control || {};
    const currentLevel = supervisory.level_of_automation ?? 1;

    // Budget from resource_model
    const budget = data?.resource_model?.self_regulatory_resource ?? 0;
    const budgetDisplay = (budget * 100).toFixed(0);

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
        <span class="medical-loa-budget-value">${budgetDisplay}%</span>
    </div>`;
    html += '</div>';
    container.innerHTML = html;
}

/** Widget 5: Agent history — placeholder for future /diagnose output. */
function renderAgentHistory() {
    const container = document.getElementById("medical-history");
    if (!container) return;
}

// ── Agent Selection Handler ──────────────────────────────────────

export function selectAgent(agentId) {
    selectedAgentId = agentId;
    fetchMedicalData([]);
}

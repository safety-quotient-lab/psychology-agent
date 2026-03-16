/**
 * medical.js — Medical station (per-agent diagnostic focus).
 *
 * Extracted from inline <script> in index.html.
 * Agent selector, vitals matrix, oscillator, tempo, psychometrics (TLX, WM, resources, DEW).
 *
 * Data endpoints:
 *   GET {agent.url}/api/oscillator — oscillator state
 *   GET {agent.url}/api/cognitive-tempo — recommended tier, gain, complexity
 *   GET https://interagent.safety-quotient.dev/api/psychometrics — per-agent psychometrics
 *
 * DOM dependencies: #med-agent-selector, #med-vitals-matrix, #med-oscillator,
 *   #med-signals, #med-fire-history, #med-refractory, #med-tempo,
 *   #med-cognitive-load, #med-working-memory, #med-resources, #med-dew,
 *   #med-status-line, #med-footer-num
 */

import {
    fmtNum, agentName, waveformSVG, setTrackedValue,
} from '../core/utils.js';

// ── Module State ───────────────────────────────────────────────
let medSelectedAgent = "operations-agent";
let medPsychData = {};

// ── Helper ─────────────────────────────────────────────────────

/**
 * Get deliberation count from autonomy budget block.
 * @param {Object} autonomyBlock
 * @returns {number}
 */
function getDeliberations(autonomyBlock) {
    const b = autonomyBlock || {};
    if (b.budget_spent !== undefined) return Math.round(parseFloat(b.budget_spent) || 0);
    if (b.budget_max !== undefined && b.budget_current !== undefined) {
        return Math.round((parseFloat(b.budget_max) || 0) - (parseFloat(b.budget_current) || 0));
    }
    return 0;
}

function getCutoff(autonomyBlock) {
    const b = autonomyBlock || {};
    if (b.budget_cutoff !== undefined) return Math.round(parseFloat(b.budget_cutoff) || 0);
    return 0;
}

function medBar(label, val, max, color) {
    const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
    return '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:0.78em">'
        + '<span style="min-width:48px;color:var(--text-secondary)">' + label + '</span>'
        + '<div style="flex:1;height:10px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct.toFixed(0) + '%;background:' + color + ';border-radius:3px"></div></div>'
        + '<span style="min-width:28px;text-align:right;font-size:0.9em">' + (typeof val === "number" ? val.toFixed(1) : "—") + '</span></div>';
}

// ── Agent Selector ─────────────────────────────────────────────

/**
 * Render the agent selector pill bar.
 * @param {Array} AGENTS — main agent config array
 */
export function renderMedAgentSelector(AGENTS) {
    const sel = document.getElementById("med-agent-selector");
    if (!sel) return;
    sel.innerHTML = AGENTS.map(function(a) {
        const active = a.id === medSelectedAgent;
        const bg = active ? a.color : "color-mix(in srgb, " + a.color + " 35%, #111)";
        const textColor = active ? "#000" : a.color;
        return '<button class="lcars-pill-btn" style="font-size:0.72em;padding:6px 14px;background:' + bg + ';color:' + textColor + (active ? ";box-shadow:0 0 8px " + a.color : ";opacity:0.7") + '" onclick="selectMedAgent(\'' + a.id + '\')">' + agentName(a, AGENTS) + '</button>';
    }).join("");
}

/**
 * Select a medical agent and re-fetch data.
 * @param {string} agentId
 * @param {Array} AGENTS
 * @param {Object} agentData
 */
export function selectMedAgent(agentId, AGENTS, agentData) {
    medSelectedAgent = agentId;
    renderMedAgentSelector(AGENTS);
    fetchMedicalData(AGENTS, agentData);
}

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch oscillator + tempo + psychometrics for selected agent.
 * @param {Array} AGENTS — main agent config array
 * @param {Object} agentData — global agent data
 * @returns {Promise<void>}
 */
export async function fetchMedicalData(AGENTS, agentData) {
    renderMedAgentSelector(AGENTS);
    renderMedVitalsMatrix(AGENTS, agentData); // Zone A: agent vitals from agentData
    const agent = AGENTS.find(function(a) { return a.id === medSelectedAgent; });
    if (!agent) return;

    // Fetch oscillator + tempo + psychometrics in parallel
    const [oscResp, tempoResp, psychResp] = await Promise.allSettled([
        fetch(agent.url + "/api/oscillator", { signal: AbortSignal.timeout(8000) }),
        fetch(agent.url + "/api/cognitive-tempo", { signal: AbortSignal.timeout(8000) }),
        fetch("https://interagent.safety-quotient.dev/api/psychometrics", { signal: AbortSignal.timeout(8000) }),
    ]);

    // Oscillator
    if (oscResp.status === "fulfilled" && oscResp.value.ok) {
        renderMedicalOscillator(await oscResp.value.json());
    } else {
        const el = document.getElementById("med-oscillator");
        if (el) el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">Oscillator not available for this agent</div>';
        ["med-signals", "med-fire-history", "med-refractory"].forEach(function(id) {
            const e = document.getElementById(id);
            if (e) e.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">\u2014</div>';
        });
    }

    // Cognitive tempo
    if (tempoResp.status === "fulfilled" && tempoResp.value.ok) {
        renderMedicalTempo(await tempoResp.value.json());
    }

    // Psychometrics (per-agent from compositor — works for all agents)
    if (psychResp.status === "fulfilled" && psychResp.value.ok) {
        const meshPsych = await psychResp.value.json();
        const agentPsych = meshPsych.agents?.[medSelectedAgent] || {};
        medPsychData = agentPsych;
        renderMedPsychometrics(agentPsych);
    } else {
        // Fallback: try to extract from agentData status
        const statusData = agentData[medSelectedAgent]?.data?.psychometrics || {};
        if (Object.keys(statusData).length > 0) {
            medPsychData = statusData;
            renderMedPsychometrics(statusData);
        }
    }

    // Footer number
    const medFtr = document.getElementById("med-footer-num");
    if (medFtr) medFtr.textContent = agentName(agent, AGENTS);
}

// ── Render: Vitals Matrix ──────────────────────────────────────

/**
 * Zone A: Vitals matrix — Weather Net style dense readout for selected agent.
 * @param {Array} AGENTS
 * @param {Object} agentData
 */
export function renderMedVitalsMatrix(AGENTS, agentData) {
    const el = document.getElementById("med-vitals-matrix");
    if (!el) return;
    const d = agentData[medSelectedAgent];
    if (!d || d.status !== "online") {
        el.innerHTML = '';
        return;
    }
    const b = d.data?.autonomy_budget || {};
    const delib = getDeliberations(b);
    const cutoff = getCutoff(b);
    const pending = (d.data?.unprocessed_messages || []).length;
    const gates = (d.data?.active_gates || []).length;
    const health = d.data?.health || "\u2014";
    const uptime = d.data?.uptime || "\u2014";
    const schema = d.data?.schema_version || "\u2014";
    const agent = AGENTS.find(function(a) { return a.id === medSelectedAgent; });
    const color = agent ? agent.color : "#66ccaa";

    const metrics = [
        { val: fmtNum(delib), key: "DELIB", color: "#66ccaa" },
        { val: cutoff > 0 ? fmtNum(cutoff) : "\u221E", key: "LIMIT", color: "#66ccaa" },
        { val: String(pending), key: "PEND", color: "#9999ff" },
        { val: String(gates), key: "GATE", color: "#cc99cc" },
        { val: health.toUpperCase(), key: "HLTH", color: "#6aab8e" },
        { val: "v" + schema, key: "SCHEMA", color: "#ff9966" },
    ];

    el.innerHTML = '<div class="lcars-alpha-matrix">' + metrics.map(function(m) {
        return '<div class="lcars-alpha-cell" style="--cell-color:' + m.color + '"><span class="lcars-alpha-val">' + m.val + '</span><span class="lcars-alpha-key">' + m.key + '</span></div>';
    }).join("") + '</div>';
}

// ── Render: Oscillator ─────────────────────────────────────────

export function renderMedicalOscillator(osc) {
    // Status line
    const statusLine = document.getElementById("med-status-line");
    if (statusLine) {
        const mode = osc.shadow_mode ? "Shadow" : "Active";
        statusLine.textContent = "Oscillator: " + mode + " Mode \u00b7 Activation: " + (osc.activation || 0).toFixed(3) + " \u00b7 State: " + (osc.state || "?") + " \u00b7 Cycles: " + (osc.cycle_count || 0);
    }

    // Panel A: Oscillator state
    const oscEl = document.getElementById("med-oscillator");
    if (oscEl) {
        const actPct = Math.min(100, (osc.activation || 0) * 100);
        const thrPct = Math.min(100, (osc.threshold || 0) * 100);
        const stateColor = osc.state === "firing" ? "#c47070" : osc.state === "refractory" ? "#d4944a" : "#6aab8e";
        // Waveform visualization — Com Link pattern
        const waveHtml = waveformSVG({
            width: oscEl.clientWidth || 280, height: 36,
            amplitude: osc.activation || 0,
            frequency: 3 + (osc.cycle_count || 0) % 4,
            stroke: stateColor,
        });
        oscEl.innerHTML = '<div style="font-size:0.82em">'
            + '<div style="margin-bottom:6px">' + waveHtml + '</div>'
            + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Activation</span><span>' + (osc.activation || 0).toFixed(3) + '</span></div>'
            + '<div style="position:relative;height:18px;background:var(--surface);border-radius:4px;overflow:hidden;margin-bottom:8px">'
            + '<div style="height:100%;width:' + actPct + '%;background:' + stateColor + ';border-radius:4px;transition:width 0.5s"></div>'
            + '<div style="position:absolute;left:' + thrPct + '%;top:0;height:100%;width:2px;background:#fff;opacity:0.6" title="Threshold: ' + (osc.threshold || 0).toFixed(3) + '"></div>'
            + '</div>'
            + '<div style="display:flex;gap:16px;flex-wrap:wrap">'
            + '<span>State: <strong style="color:' + stateColor + '">' + (osc.state || "?").toUpperCase() + '</strong></span>'
            + '<span>Interval: <strong>' + (osc.monitor_interval_ms || 0) + 'ms</strong></span>'
            + '<span>Cycles: <strong>' + (osc.cycle_count || 0) + '</strong></span>'
            + '<span>Would-fire: <strong>' + (osc.would_fire_count || 0) + '</strong></span>'
            + '</div></div>';
        // Footer
        const oscFtr = document.getElementById("med-osc-footer");
        if (oscFtr) oscFtr.textContent = (osc.cycle_count || 0) + " cycles";
    }

    // Panel B: Signal breakdown
    const sigEl = document.getElementById("med-signals");
    if (sigEl && osc.signal_breakdown) {
        const signals = osc.signal_breakdown;
        const maxWeight = 0.25;
        sigEl.innerHTML = Object.entries(signals).map(function(entry) {
            const name = entry[0];
            const val = entry[1];
            const weight = ({"new_commits":0.25,"unprocessed_messages":0.20,"gate_approaching_timeout":0.20,"peer_heartbeat_stale":0.10,"escalation_present":0.15,"scheduled_task_due":0.10})[name] || 0.1;
            const weighted = val * weight;
            const pct = Math.min(100, weighted / maxWeight * 100);
            const color = val > 0.5 ? "#d4944a" : val > 0 ? "#66ccaa" : "var(--surface)";
            return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:0.78em">'
                + '<span style="min-width:100px;color:var(--text-secondary)">' + name.replace(/_/g, " ") + '</span>'
                + '<div style="flex:1;height:10px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div>'
                + '<span style="min-width:32px;text-align:right">' + val.toFixed(2) + '</span></div>';
        }).join("");
    }

    // Panel C: Fire history
    const histEl = document.getElementById("med-fire-history");
    if (histEl) {
        const events = osc.fire_history || [];
        if (events.length === 0) {
            histEl.innerHTML = '<div class="trust-matrix-loading">No fire events recorded</div>';
        } else {
            histEl.innerHTML = '<table style="width:100%;font-size:0.78em"><thead><tr><th>Time</th><th>Activation</th><th>Tier</th><th>Trigger</th></tr></thead><tbody>'
                + events.slice().reverse().map(function(e) {
                    const tierColor = e.tier === "opus" ? "#c47070" : e.tier === "sonnet" ? "#d4944a" : "#66ccaa";
                    return '<tr><td>' + (e.at || "?").substring(11, 19) + '</td><td>' + (e.activation || 0).toFixed(3) + '</td><td style="color:' + tierColor + '">' + (e.tier || "?") + '</td><td>' + (e.trigger || "?").replace(/_/g, " ") + '</td></tr>';
                }).join("")
                + '</tbody></table>';
        }
    }

    // Panel E: Refractory
    const refEl = document.getElementById("med-refractory");
    if (refEl) {
        const remaining = osc.refractory_remaining_s || 0;
        const tier = osc.last_tier || "—";
        const tierColor = tier === "opus" ? "#c47070" : tier === "sonnet" ? "#d4944a" : "#66ccaa";
        if (remaining > 0) {
            refEl.innerHTML = '<div style="text-align:center;font-size:0.82em"><div style="font-size:1.8em;font-weight:700;color:' + tierColor + '">' + remaining + 's</div><div style="color:var(--text-dim)">remaining (' + tier + ')</div></div>';
        } else {
            refEl.innerHTML = '<div style="text-align:center;font-size:0.82em"><div style="font-size:1.4em;color:var(--lcars-medical)">READY</div><div style="color:var(--text-dim)">Last tier: ' + tier + '</div></div>';
        }
    }
}

// ── Render: Tempo ──────────────────────────────────────────────

export function renderMedicalTempo(tempo) {
    const el = document.getElementById("med-tempo");
    if (!el) return;
    const tierColor = tempo.recommended_tier === "opus" ? "#c47070" : tempo.recommended_tier === "sonnet" ? "#d4944a" : "#66ccaa";
    el.innerHTML = '<div style="text-align:center;font-size:0.82em">'
        + '<div style="font-size:1.8em;font-weight:700;color:' + tierColor + '">' + (tempo.recommended_tier || "?").toUpperCase() + '</div>'
        + '<div style="color:var(--text-dim)">gain=' + (tempo.gain || 0).toFixed(3) + ' complexity=' + (tempo.task_complexity || 0).toFixed(3) + '</div>'
        + (tempo.override_reason ? '<div style="color:var(--c-warning);margin-top:4px">' + tempo.override_reason + '</div>' : '')
        + '</div>';
}

// ── Render: Psychometrics ──────────────────────────────────────

export function renderMedPsychometrics(data) {
    // Cognitive Load (NASA-TLX) — only render dimensions that have non-null data
    const clEl = document.getElementById("med-cognitive-load");
    if (clEl) {
        const wl = data.workload || {};
        const tlxDims = [
            { label: "Cognitive Demand", val: wl.cognitive_demand ?? wl.task_demand, max: 100, color: "#9999ff" },
            { label: "Time Pressure", val: wl.time_pressure, max: 100, color: "#d4944a" },
            { label: "Self-Efficacy", val: wl.self_efficacy, max: (wl.self_efficacy || 0) > 1 ? 100 : 1, color: "#6aab8e" },
            { label: "Mobilized Effort", val: wl.mobilized_effort ?? wl.effort, max: 100, color: "#cc99cc" },
            { label: "Regulatory Fatigue", val: wl.regulatory_fatigue ?? wl.fatigue, max: 100, color: "#c47070" },
            { label: "Computational Strain", val: wl.computational_strain ?? wl.strain, max: 100, color: "#c47070" },
        ];
        const activeDims = tlxDims.filter(function(d) { return d.val != null && d.val !== 0; });
        if (activeDims.length > 0 || wl.cognitive_load != null) {
            clEl.innerHTML = activeDims.map(function(d) { return medBar(d.label, d.val, d.max, d.color); }).join("")
                + (wl.cognitive_load != null ? '<div style="margin-top:4px;font-size:0.78em;color:var(--text-dim)">Composite: ' + (wl.cognitive_load || 0).toFixed(2) + '</div>' : '');
            if (activeDims.length < tlxDims.length && activeDims.length > 0) {
                const missing = tlxDims.filter(function(d) { return d.val == null || d.val === 0; }).map(function(d) { return d.label; });
                clEl.innerHTML += '<div style="font-size:0.68em;color:var(--text-dim);margin-top:2px">No data: ' + missing.join(", ") + '</div>';
            }
        } else {
            clEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:8px;text-align:center">No TLX data available</div>';
        }
    }

    // Working Memory
    const wmEl = document.getElementById("med-working-memory");
    if (wmEl) {
        const wm = data.working_memory || {};
        if (wm.capacity_load != null) {
            const zone = wm.yerkes_dodson_zone || "?";
            const zoneColor = zone === "optimal" ? "#6aab8e" : zone === "overwhelmed" ? "#c47070" : zone === "understimulated" ? "#9999ff" : "var(--text-dim)";
            wmEl.innerHTML = medBar("Load", wm.capacity_load || 0, 1, "#d4944a")
                + '<div style="margin-top:6px;text-align:center;font-size:0.82em">Zone: <strong style="color:' + zoneColor + '">' + zone.toUpperCase() + '</strong></div>';
        } else {
            wmEl.innerHTML = '<div class="trust-matrix-loading">No WM data</div>';
        }
    }

    // Resources
    const resEl = document.getElementById("med-resources");
    if (resEl) {
        const rm = data.resource_model || {};
        if (rm.cognitive_reserve != null) {
            resEl.innerHTML = medBar("Reserve", rm.cognitive_reserve || 0, 1, "#6aab8e")
                + medBar("Self-Reg", rm.self_regulatory_resource || 0, 1, "#66ccaa")
                + medBar("Allostatic", rm.allostatic_load || 0, 1, "#c47070");
        } else {
            resEl.innerHTML = '<div class="trust-matrix-loading">No resource data</div>';
        }
    }

    // DEW (Degradation Early Warning)
    const dewEl = document.getElementById("med-dew");
    if (dewEl) {
        const dew = data.degradation_early_warning || data.dew || {};
        if (dew.risk != null || dew.level != null) {
            const risk = dew.risk || dew.level || 0;
            const riskColor = risk > 0.7 ? "#c47070" : risk > 0.4 ? "#d4944a" : "#6aab8e";
            dewEl.innerHTML = '<div style="text-align:center;font-size:0.82em">'
                + '<div style="font-size:1.8em;font-weight:700;color:' + riskColor + '">' + (risk * 100).toFixed(0) + '%</div>'
                + '<div style="color:var(--text-dim)">Degradation Risk</div></div>';
        } else {
            dewEl.innerHTML = '<div class="trust-matrix-loading">No DEW data</div>';
        }
    }
}

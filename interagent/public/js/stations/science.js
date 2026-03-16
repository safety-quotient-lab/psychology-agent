/**
 * science.js — Science Station render functions.
 *
 * Extracted from inline <script> in index.html. Contains the isometric 3D PAD
 * affect grid with ISO/PxA/PxD/AxD view switcher (session 8 feature),
 * mesh organism state, generator balance, flow state checklist, distress early
 * warning gauge, level-of-automation ladder, cognitive load (NASA-TLX),
 * working memory + Yerkes-Dodson, resource bars, and engagement (UWES).
 *
 * Data source: GET /api/psychometrics on compositor + per-agent psychometrics.
 *
 * DOM dependencies: #affect-grid, #organism-state-label, generator balance
 *   elements, #flow-checklist, DEW elements, LOA ladder, cognitive load
 *   gauges, working memory elements, resource bars, engagement gauges,
 *   #science-status-line
 */

import {
    fmtNum, sparklineSVG, waveformSVG, pushSparkValue,
    agentName, setTrackedValue, renderVlevelGauge, sparkHistory,
} from '../core/utils.js';

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

let padView = "3d"; // Current PAD projection: 3d, pa, pd, ad

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch psychometrics from compositor and per-agent sources.
 * Stores results in module-level scienceData and triggers render.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 * @returns {Promise<void>}
 */
export async function fetchScienceData(AGENTS, agentData) {
    if (scienceFetchPending) return;
    scienceFetchPending = true;
    try {
        // Fetch unified psychometrics from compositor
        const resp = await fetch("https://interagent.safety-quotient.dev/api/psychometrics", { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const meshPsych = await resp.json();

        // Also fetch per-agent data from operations-agent for self-report
        const opsAgent = AGENTS.find(a => a.id === "operations-agent");
        let opsPsych = null;
        if (opsAgent) {
            try {
                const opsResp = await fetch(`${opsAgent.url}/api/psychometrics`, { signal: AbortSignal.timeout(5000) });
                if (opsResp.ok) opsPsych = await opsResp.json();
            } catch {}
        }

        // Build scienceData: pick the agent with the richest psychometrics as primary
        // (psychology-agent typically has the most complete data)
        const agentEntries = Object.entries(meshPsych.agents || {}).filter(([, d]) => d && !d.error);
        const richest = agentEntries.sort(([, a], [, b]) => Object.keys(b).length - Object.keys(a).length)[0];
        const primary = (richest ? richest[1] : null) || opsPsych || {};
        scienceData = {
            psychometrics: {
                cognitive_load: primary.workload || null,
                working_memory: primary.working_memory || null,
                emotional_state: primary.emotional_state || null,
                engagement: primary.engagement || null,
                flow: primary.flow || null,
                resource_model: primary.resource_model || null,
                supervisory_control: primary.supervisory_control || null,
            },
            mesh: meshPsych.mesh || null,
            agents: meshPsych.agents || {},
        };
    } catch (err) {
        scienceData = null;
    } finally {
        scienceFetchPending = false;
    }
    renderScience(AGENTS, agentData);
}

// ── PAD View Switcher ──────────────────────────────────────────

/**
 * Switch the PAD affect grid projection view.
 * Exposed on window for button onclick handlers.
 * @param {string} view — "3d", "pa", "pd", or "ad"
 * @param {Array} AGENTS — agent config array
 */
export function setPadView(view, AGENTS) {
    padView = view;
    ["3d", "pa", "pd", "ad"].forEach(v => {
        const btn = document.getElementById("pad-view-" + v);
        if (btn) btn.className = "lcars-pill-btn lcars-pill-sm" + (v === view ? " lcars-pill-active" : "");
    });
    renderAffectGrid(AGENTS);
}

// ── Isometric Projection Helper ────────────────────────────────

/**
 * Map (x,y,z) in [0,1] to 2D screen coords using isometric projection.
 * x goes right-down, y goes left-down, z goes up.
 */
function isoProject(x, y, z, w, h) {
    const scale = Math.min(w, h) * 0.38;
    const cx = w / 2, cy = h * 0.55;
    const sx = (x - y) * scale * 0.866;          // cos(30°)
    const sy = (x + y) * scale * 0.5 - z * scale; // sin(30°) - z
    return { sx: cx + sx, sy: cy + sy };
}

// ── Render: Affect Grid (Isometric 3D PAD) ─────────────────────

/**
 * Render the isometric 3D PAD affect grid with ISO/PxA/PxD/AxD view switcher.
 * Key session 8 feature — maps Pleasure/Arousal/Dominance into a 3D cube
 * wireframe with agent dots projected into the space.
 *
 * DOM WRITE: #affect-grid (innerHTML manipulation), axis labels,
 *   #affect-grid-placeholder visibility
 * @param {Array} AGENTS — agent config array
 */
export function renderAffectGrid(AGENTS) {
    const container = document.getElementById("affect-grid");
    const placeholder = document.getElementById("affect-grid-placeholder");
    if (!container) return;

    // Remove existing dots and isometric SVG
    container.querySelectorAll(".affect-dot, .affect-iso-svg").forEach(d => d.remove());

    // Show/hide CSS grid elements based on mode
    const gridLines = container.querySelectorAll(".affect-grid-line, .affect-grid-axis-label");
    gridLines.forEach(el => el.style.display = padView === "3d" ? "none" : "");

    // Update axis labels for 2D projections
    const xLabel = document.getElementById("affect-x-label");
    const yLabel = document.getElementById("affect-y-label");
    if (xLabel && yLabel) {
        const labels = { pa: ["pleasure", "arousal"], pd: ["pleasure", "dominance"], ad: ["arousal", "dominance"], "3d": ["", ""] };
        xLabel.textContent = (labels[padView] || labels.pa)[0];
        yLabel.textContent = (labels[padView] || labels.pa)[1];
    }

    const agents = scienceData?.agents || null;
    if (placeholder) placeholder.style.display = agents ? "none" : "block";

    // Collect PAD values for all agents
    const padData = AGENTS.map(agent => {
        const agentState = (agents || {})[agent.id] || {};
        const es = agentState.emotional_state || {};
        return {
            agent,
            p: es.hedonic_valence ?? es.valence ?? 0,
            a: es.activation ?? es.arousal ?? 0,
            d: es.perceived_control ?? es.dominance ?? 0.5,
        };
    });

    // ── 3D Isometric View ──
    if (padView === "3d") {
        const w = container.clientWidth || 280, h = container.clientHeight || 200;
        let svg = `<svg class="affect-iso-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0">`;

        // Draw isometric cube wireframe (edges from 0,0,0 to 1,1,1)
        const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        const pts = corners.map(c => isoProject(c[0], c[1], c[2], w, h));
        edges.forEach(([a, b]) => {
            svg += `<line x1="${pts[a].sx.toFixed(1)}" y1="${pts[a].sy.toFixed(1)}" x2="${pts[b].sx.toFixed(1)}" y2="${pts[b].sy.toFixed(1)}" stroke="var(--lcars-secondary)" stroke-width="1.618" opacity="0.5"/>`;
        });

        // Axis labels (at axis endpoints, horizontal text)
        const pEnd = isoProject(1.12, 0, 0, w, h);
        const aEnd = isoProject(0, 1.12, 0, w, h);
        const dEnd = isoProject(0, 0, 1.1, w, h);
        svg += `<text x="${pEnd.sx.toFixed(0)}" y="${pEnd.sy.toFixed(0)}" fill="var(--lcars-accent)" font-size="9" font-family="inherit" text-anchor="middle">P</text>`;
        svg += `<text x="${aEnd.sx.toFixed(0)}" y="${aEnd.sy.toFixed(0)}" fill="var(--lcars-tertiary)" font-size="9" font-family="inherit" text-anchor="middle">A</text>`;
        svg += `<text x="${dEnd.sx.toFixed(0)}" y="${dEnd.sy.toFixed(0)}" fill="var(--lcars-medical)" font-size="9" font-family="inherit" text-anchor="middle">D</text>`;

        // Project agent dots into the cube
        padData.forEach(d => {
            // Map P:[-1,1]→[0,1], A:[-1,1]→[0,1], D:[0,1]→[0,1]
            const px = (d.p + 1) / 2, py = (d.a + 1) / 2, pz = d.d;
            const pt = isoProject(px, py, pz, w, h);
            const r = 5;
            svg += `<circle cx="${pt.sx.toFixed(1)}" cy="${pt.sy.toFixed(1)}" r="${r}" fill="${d.agent.color}" opacity="0.85"/>`;
            svg += `<text x="${pt.sx.toFixed(1)}" y="${(pt.sy - r - 3).toFixed(1)}" fill="${d.agent.color}" font-size="8" font-family="inherit" text-anchor="middle">${agentName(d.agent)}</text>`;
        });

        svg += `</svg>`;
        container.insertAdjacentHTML("beforeend", svg);
        return;
    }

    // ── 2D Projection Views ──
    const dots = agents ? padData.map(d => {
        let leftPct, topPct, size, sizeLabel;
        if (padView === "pa") {
            leftPct = ((d.p + 1) / 2) * 100;
            topPct = ((1 - (d.a + 1) / 2)) * 100;
            size = 8 + d.d * 10;
            sizeLabel = "D";
        } else if (padView === "pd") {
            leftPct = ((d.p + 1) / 2) * 100;
            topPct = (1 - d.d) * 100;
            size = 8 + ((d.a + 1) / 2) * 10;
            sizeLabel = "A";
        } else {
            leftPct = ((d.a + 1) / 2) * 100;
            topPct = (1 - d.d) * 100;
            size = 8 + ((d.p + 1) / 2) * 10;
            sizeLabel = "P";
        }
        return { agent: d.agent, left: leftPct, top: topPct, size, dominance: d.d, valence: d.p, arousal: d.a, sizeLabel };
    }) : AGENT_DOT_DEFAULTS.map(d => ({
        agent: AGENTS[d.agentIdx],
        left: d.left,
        top: d.top,
    }));

    // Assign label offsets to avoid overlap
    const PROXIMITY = 12;
    dots.forEach((d, i) => {
        let offset = 0;
        for (let j = 0; j < i; j++) {
            if (Math.abs(d.left - dots[j].left) < PROXIMITY && Math.abs(d.top - dots[j].top) < PROXIMITY) offset++;
        }
        d.labelOffset = offset;
    });

    dots.forEach(d => {
        if (!d.agent) return;
        const dot = document.createElement("div");
        dot.className = "affect-dot";
        dot.style.left = `${d.left}%`;
        dot.style.top = `${d.top}%`;
        dot.style.background = d.agent.color;
        dot.style.color = d.agent.color;
        if (d.size) {
            dot.style.width = `${d.size}px`;
            dot.style.height = `${d.size}px`;
            dot.title = `P:${(d.valence || 0).toFixed(2)} A:${(d.arousal || 0).toFixed(2)} D:${(d.dominance || 0).toFixed(2)} (size=${d.sizeLabel || "?"})`;
        }
        const label = document.createElement("span");
        label.className = "affect-dot-label";
        label.style.setProperty("--label-offset", d.labelOffset);
        label.textContent = agentName(d.agent);
        dot.appendChild(label);
        container.appendChild(dot);
    });

    if (!agents) {
        container.querySelectorAll(".affect-dot").forEach(d => d.style.opacity = "0.3");
    }
}

// ── Render: Organism State ─────────────────────────────────────

/**
 * Render mesh affect aggregate — organism state label, valence, activation,
 * bottleneck, and coordination. Applies affect-responsive layout mode.
 *
 * DOM WRITE: #organism-state-label, #organism-valence, #organism-activation,
 *   #organism-bottleneck, #organism-coord
 * @param {Function} applyAffectMode — callback to apply affect-responsive layout
 */
export function renderOrganismState(applyAffectMode) {
    const labelEl = document.getElementById("organism-state-label");
    const valEl = document.getElementById("organism-valence");
    const actEl = document.getElementById("organism-activation");
    const bottEl = document.getElementById("organism-bottleneck");
    const coordEl = document.getElementById("organism-coord");
    if (!labelEl) return;

    const mesh = scienceData?.mesh || null;
    const affect = mesh?.affect || {};
    const stateLabel = affect.mesh_affect_category?.replace("mesh-", "")?.toUpperCase() || "\u2014";
    labelEl.textContent = stateLabel;
    setTrackedValue("organism-valence", affect.mean_hedonic_valence ?? null, { format: "float", prefix: (affect.mean_hedonic_valence ?? 0) >= 0 ? "+" : "" });
    setTrackedValue("organism-activation", affect.mean_activation ?? null, { format: "float" });
    const reserve = mesh?.cognitive_reserve || {};
    if (bottEl) bottEl.textContent = agentName(reserve.bottleneck_agent || "") || "\u2014";
    setTrackedValue("organism-coord", reserve.mean_reserve ?? null, { format: "float" });

    // Apply affect-responsive layout mode based on organism state
    if (stateLabel !== "\u2014" && document.body.classList.contains("theme-lcars") && applyAffectMode) {
        applyAffectMode(stateLabel.toLowerCase().replace(/\s+/g, "-"));
    }
}

// ── Render: Generator Balance ──────────────────────────────────

/**
 * Render G2/G3 (creative vs evaluative) and G6/G7 (crystallize vs dissolve)
 * balance indicators from per-agent data.
 *
 * DOM WRITE: gen-g2g3-* and gen-g6g7-* elements
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 */
export function renderGeneratorBalance(agentData) {
    // G2/G3: creative (deliberations) vs evaluative (automated Gc events)
    // Source: agentData deliberation_count + event_count per agent
    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalCreative = online.reduce((s, a) => {
        return s + (a.data?.recent_deliberations?.length || 0) + (a.data?.gc_metrics?.deliberations_last_hour || 0);
    }, 0);
    const totalEvaluative = online.reduce((s, a) => s + (a.data?.event_count || 0), 0);
    const g2g3 = (totalCreative > 0 || totalEvaluative > 0)
        ? { ratio: totalEvaluative > 0 ? totalCreative / totalEvaluative : totalCreative }
        : null;

    // G6/G7: crystallize (resolved sessions) vs dissolve (open sessions)
    // Source: transport session status from agentData totals
    const resolved = online.reduce((s, a) => s + (a.data?.totals?.resolved_sessions || 0), 0);
    const openSess = online.reduce((s, a) => s + (a.data?.totals?.active_sessions || a.data?.totals?.open_sessions || 0), 0);
    const g6g7 = (resolved > 0 || openSess > 0)
        ? { ratio: openSess > 0 ? resolved / openSess : resolved }
        : null;

    renderOneGenerator("g2g3", g2g3, 0.05, 0.5);
    renderOneGenerator("g6g7", g6g7, 0.5, 5);
}

/**
 * Render a single generator balance bar.
 * @param {string} prefix — element ID prefix ("g2g3" or "g6g7")
 * @param {Object|null} data — { ratio } or null
 * @param {number} targetLow — lower bound for nominal range
 * @param {number} targetHigh — upper bound for nominal range
 */
export function renderOneGenerator(prefix, data, targetLow, targetHigh) {
    const leftEl = document.getElementById(`gen-${prefix}-left`);
    const rightEl = document.getElementById(`gen-${prefix}-right`);
    const ratioEl = document.getElementById(`gen-${prefix}-ratio`);
    const statusEl = document.getElementById(`gen-${prefix}-status`);
    if (!leftEl) return;

    if (!data) {
        leftEl.style.width = "50%";
        rightEl.style.width = "50%";
        ratioEl.textContent = "\u2014";
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
 * Render the flow state checklist — 5 conditions with pass/fail marks.
 * DOM WRITE: #flow-checklist, #flow-status-label
 */
export function renderFlowState() {
    const listEl = document.getElementById("flow-checklist");
    const statusEl = document.getElementById("flow-status-label");
    if (!listEl) return;

    const flow = scienceData?.psychometrics?.flow || {};
    const inFlow = flow.in_flow || false;
    const condsMet = flow.conditions_met ?? 0;
    // Derive condition booleans from conditions_met count
    const conditions = [condsMet >= 1, condsMet >= 2, condsMet >= 3, condsMet >= 4, condsMet >= 5];
    const labels = ["Clear goals", "Immediate feedback", "Challenge-skill balance", "Sense of control", "Absorption"];
    const met = condsMet;

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

// ── Render: Distress Early Warning (DEW) ───────────────────────

/**
 * Render the DEW gauge — composite distress score from burnout risk
 * and cognitive load. Green/Amber/Red classification.
 *
 * DOM WRITE: #dew-score, #dew-bar-fill, #dew-status
 */
export function renderDEW() {
    const scoreEl = document.getElementById("dew-score");
    const fillEl = document.getElementById("dew-bar-fill");
    const statusEl = document.getElementById("dew-status");
    if (!scoreEl) return;

    // DEW computed from engagement burnout_risk + workload composite
    const eng = scienceData?.psychometrics?.engagement || {};
    const wl = scienceData?.psychometrics?.cognitive_load || {};
    const burnout = eng.burnout_risk ?? 0;
    const load = (wl.cognitive_load ?? 0) / 100;
    const dewScore = Math.min(100, Math.round((burnout * 60 + load * 40)));
    const dew = { score: (burnout > 0 || load > 0) ? dewScore : null };
    const score = dew?.score ?? null;

    if (score == null) {
        scoreEl.textContent = "\u2014";
        scoreEl.className = "dew-score dew-green";
        fillEl.style.width = "0%";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "dew-status dew-green";
        return;
    }

    const colorClass = score <= 30 ? "dew-green" : score <= 60 ? "dew-amber" : "dew-red";
    const colorHex = score <= 30 ? "#6aab8e" : score <= 60 ? "#d4944a" : "#c47070";
    const statusText = score <= 30 ? "GREEN" : score <= 60 ? "AMBER \u2014 EARLY WARNING" : "RED \u2014 DEGRADATION DETECTED";

    setTrackedValue("dew-score", score, { inverted: true });
    scoreEl.className = `dew-score ${colorClass}`;
    fillEl.style.width = `${score}%`;
    fillEl.style.background = colorHex;
    statusEl.textContent = statusText;
    statusEl.className = `dew-status ${colorClass}`;
}

// ── Render: Level of Automation (LOA) ──────────────────────────

/**
 * Render the LOA ladder — 10-level automation scale with active highlight.
 * DOM WRITE: #loa-ladder, #loa-budget-val
 */
export function renderLOA() {
    const ladderEl = document.getElementById("loa-ladder");
    const budgetEl = document.getElementById("loa-budget-val");
    if (!ladderEl) return;

    const sc = scienceData?.psychometrics?.supervisory_control || {};
    const currentLevel = sc.level_of_automation ?? 5;
    const remaining = null; // budget_remaining not in current schema

    ladderEl.innerHTML = LOA_DESCRIPTIONS.map((desc, i) => {
        const level = 10 - i;
        const active = level === currentLevel;
        return `<div class="loa-rung${active ? " active" : ""}"><span class="loa-rung-level">LOA ${level}</span><span class="loa-rung-desc">${desc}</span></div>`;
    }).join("");

    setTrackedValue("loa-budget-val", remaining);
}

// ── Render: Cognitive Load (NASA-TLX) ──────────────────────────

/**
 * Render 6-dimension NASA-TLX cognitive load gauges with composite score
 * and status classification.
 *
 * DOM WRITE: cogload-*-gauge elements, #cogload-composite, #cogload-status
 */
export function renderCognitiveLoad() {
    const wl = scienceData?.psychometrics?.cognitive_load || null;
    const dims = [
        { id: "cogload-demand-gauge", val: wl?.cognitive_demand },
        { id: "cogload-pressure-gauge", val: wl?.time_pressure },
        { id: "cogload-efficacy-gauge", val: wl?.self_efficacy },
        { id: "cogload-effort-gauge", val: wl?.mobilized_effort },
        { id: "cogload-fatigue-gauge", val: wl?.regulatory_fatigue },
        { id: "cogload-strain-gauge", val: wl?.computational_strain },
    ];
    dims.forEach(d => {
        const el = document.getElementById(d.id);
        if (!el) return;
        if (d.val == null) { el.innerHTML = '<span style="opacity:0.3">\u2014</span>'; return; }
        el.innerHTML = renderVlevelGauge(d.val, 7);
    });
    const composite = wl?.cognitive_load ?? null;
    const statusEl = document.getElementById("cogload-status");
    setTrackedValue("cogload-composite", composite, { format: "float", inverted: true });
    if (statusEl) {
        if (composite === null) statusEl.textContent = "AWAITING DATA";
        else if (composite < 40) { statusEl.textContent = "LOW"; statusEl.style.color = "#6aab8e"; }
        else if (composite < 70) { statusEl.textContent = "MODERATE"; statusEl.style.color = "#d4944a"; }
        else { statusEl.textContent = "HIGH"; statusEl.style.color = "#c47070"; }
    }
}

// ── Render: Working Memory ─────────────────────────────────────

/**
 * Render working memory capacity load + Yerkes-Dodson zone indicator.
 * DOM WRITE: #workmem-load, #workmem-zone, #workmem-indicator
 */
export function renderWorkingMemory() {
    const wm = scienceData?.psychometrics?.working_memory || null;
    const load = wm?.capacity_load ?? null;
    const zone = wm?.yerkes_dodson_zone ?? null;

    const loadEl = document.getElementById("workmem-load");
    const zoneEl = document.getElementById("workmem-zone");
    const indicator = document.getElementById("workmem-indicator");
    setTrackedValue("workmem-load", load, { format: "pct", inverted: true });
    if (zoneEl) {
        const label = zone || (load !== null
            ? (load < 0.15 ? "understimulated" : load < 0.6 ? "optimal" : "overwhelmed")
            : null);
        if (!label) { zoneEl.textContent = "AWAITING DATA"; zoneEl.style.color = "var(--text-dim)"; }
        else if (label === "optimal") { zoneEl.textContent = "OPTIMAL \u2014 challenge matches capacity"; zoneEl.style.color = "#6aab8e"; }
        else if (label === "understimulated") { zoneEl.textContent = "UNDERSTIMULATED \u2014 insufficient context for reasoning"; zoneEl.style.color = "#66aacc"; }
        else { zoneEl.textContent = "OVERWHELMED \u2014 context interference degrades performance"; zoneEl.style.color = "#c47070"; }
    }
    if (indicator && load !== null) {
        indicator.style.left = `${Math.min(100, Math.max(0, load * 100))}%`;
    }
}

// ── Render: Resources ──────────────────────────────────────────

/**
 * Render cognitive reserve, self-regulatory, and allostatic load bars.
 * DOM WRITE: res-reserve-fill, res-regulatory-fill, res-allostatic-fill,
 *   and corresponding value elements
 */
export function renderResources() {
    const res = scienceData?.psychometrics?.resource_model || null;

    const setBar = (fillId, valId, value, inverted) => {
        const fill = document.getElementById(fillId);
        if (fill) fill.style.width = value !== null ? `${Math.round(value * 100)}%` : "0%";
        setTrackedValue(valId, value, { format: "float", inverted: !!inverted });
    };

    setBar("res-reserve-fill", "res-reserve-val", res?.cognitive_reserve ?? null);
    setBar("res-regulatory-fill", "res-regulatory-val", res?.self_regulatory_resource ?? null);
    setBar("res-allostatic-fill", "res-allostatic-val", res?.allostatic_load ?? null, true);
}

// ── Render: Engagement (UWES) ──────────────────────────────────

/**
 * Render UWES engagement dimensions (vigor, dedication, absorption)
 * and burnout risk indicator.
 *
 * DOM WRITE: engage-*-gauge elements, #burnout-indicator, #burnout-label
 */
export function renderEngagement() {
    const eng = scienceData?.psychometrics?.engagement || null;
    const dims = [
        { id: "engage-vigor-gauge", val: eng?.vigor },
        { id: "engage-dedication-gauge", val: eng?.dedication },
        { id: "engage-absorption-gauge", val: eng?.absorption },
    ];
    dims.forEach(d => {
        const el = document.getElementById(d.id);
        if (el) el.innerHTML = renderVlevelGauge(d.val ?? 0, 5);
    });

    const risk = eng?.burnout_risk ?? null;
    const indicator = document.getElementById("burnout-indicator");
    const label = document.getElementById("burnout-label");
    if (indicator && label) {
        if (risk === null) {
            label.textContent = "BURNOUT RISK: AWAITING DATA";
            indicator.style.background = "rgba(74,82,97,0.1)";
            label.style.color = "var(--text-dim)";
        } else if (risk < 0.3) {
            label.textContent = "ENGAGED \u2014 demands well within resources";
            indicator.style.background = "rgba(106,171,142,0.1)";
            label.style.color = "#6aab8e";
        } else if (risk < 0.6) {
            label.textContent = "MONITORING \u2014 demands approaching resource limits";
            indicator.style.background = "rgba(212,149,74,0.1)";
            label.style.color = "#d4944a";
        } else {
            label.textContent = "BURNOUT RISK \u2014 demands exceed available resources";
            indicator.style.background = "rgba(196,112,112,0.1)";
            label.style.color = "#c47070";
        }
    }
}

// ── Render: Combined Science ───────────────────────────────────

/**
 * Render all Science station sub-sections.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — per-agent cached data keyed by agent ID
 * @param {Function} [applyAffectMode] — optional callback for affect-responsive layout
 */
export function renderScience(AGENTS, agentData, applyAffectMode) {
    renderAffectGrid(AGENTS);
    renderOrganismState(applyAffectMode);
    renderGeneratorBalance(agentData);
    renderFlowState();
    renderDEW();
    renderLOA();
    renderCognitiveLoad();
    renderWorkingMemory();
    renderResources();
    renderEngagement();
    // Update status line
    const statusLine = document.getElementById("science-status-line");
    if (statusLine && scienceData) {
        const agentCount = Object.keys(scienceData.agents || {}).length;
        const constructs = scienceData.psychometrics ? Object.values(scienceData.psychometrics).filter(v => v != null).length : 0;
        const affect = scienceData.mesh?.affect?.mesh_affect_category || "unknown";
        statusLine.textContent = `Psychometric Sensors: ${agentCount} agents \u00B7 Constructs: ${constructs}/7 \u00B7 Mesh Affect: ${affect.replace("mesh-", "")}`;
    }
}

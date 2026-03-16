/**
 * operations.js — Operations station render functions.
 *
 * Extracted from inline <script> in index.html (session 8).
 * TNG Operations console: autonomy budget capsule grid, status monologue,
 * mesh aggregate indicators, actions audit table, schedule readout,
 * vitals counters, governance decisions, resource model.
 *
 * Data endpoints:
 *   GET {agent.url}/api/status — autonomy_budget, recent_actions, schedule
 *   GET {ops.url}/api/mesh-aggregate — affect, bottleneck, coordination, immune
 *   Shared psychometrics cache (core/psychometrics.js) — resource model
 *
 * DOM dependencies:
 *   #ops-status-monologue, #ops-subsystem-grid, #ops-alpha-matrix,
 *   #ops-actions-table, #ops-schedule, #ops-coordination-inline,
 *   #lcars-ops-decisions, #ops-agg-affect, #ops-agg-bottleneck,
 *   #ops-agg-coordination, #ops-agg-immune, #ops-resource-model,
 *   #ops-total-credits, #ops-total-actions, #ops-active-gates,
 *   #ops-agents-syncing, #gc-hooks, #gc-triggers, #gc-cron, #gc-ratio,
 *   #mesh-total-gf, #mesh-total-gc, #mesh-total-processing,
 *   page control elements, footer numbers
 *
 * Global state accessed: AGENTS, agentData, kbData, tableState,
 *   _meshAggData (module-local), _psychCache (module-local)
 */

import {
    fmtNum, agentName, setTrackedValue,
} from '../core/utils.js';

// ── Module State ──────────────────────────────────────────────────────

let _meshAggData = null;
let _meshAggTs = 0;
let _psychCache = null;

// ── Data Fetching ─────────────────────────────────────────────────────

/**
 * Fetch mesh aggregate data from the operations-agent endpoint.
 * Caches result with 30s staleness window.
 * @param {Array} AGENTS — agent config array
 * @returns {Promise<void>}
 */
async function fetchMeshAgg(AGENTS) {
    try {
        const opsUrl = AGENTS.find(a => a.id === "operations-agent")?.url || "";
        if (!opsUrl) return;
        const r = await fetch(`${opsUrl}/api/mesh-aggregate`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) { _meshAggData = await r.json(); _meshAggTs = Date.now(); }
    } catch {}
}

/**
 * Fetch psychometrics data for the resource model panel.
 * @returns {Promise<void>}
 */
async function fetchPsychForOps() {
    try {
        const resp = await fetch("https://interagent.safety-quotient.dev/api/psychometrics", { signal: AbortSignal.timeout(5000) });
        if (resp.ok) _psychCache = await resp.json();
    } catch {}
}

// ── Render: Operations (main dispatch) ────────────────────────────────

/**
 * Render all Operations station sub-sections.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data keyed by agent id
 * @param {Object} tableState — shared table state object
 * @param {Object} kbData — knowledge-base data keyed by agent id
 * @param {Function} mirrorToLcars — content mirroring helper
 * @param {Function} refreshKnowledge — KB data fetch trigger
 */
export function renderOperations(AGENTS, agentData, tableState, kbData, mirrorToLcars, refreshKnowledge) {
    renderOpsMonologue(AGENTS, agentData);
    renderOpsBudget(AGENTS, agentData);
    renderOpsActivity(AGENTS, agentData, tableState);
    renderOpsSchedule(AGENTS, agentData);
    renderOpsVitals(AGENTS, agentData);
    // Topology mirrors from Pulse (already rendered)
    if (mirrorToLcars) mirrorToLcars("topology-svg", "lcars-topology-svg");
    // Governance — populate from KB decisions data
    renderOpsGovernance(AGENTS, kbData, refreshKnowledge);
}

// ── Render: Governance Decisions ──────────────────────────────────────

/**
 * Render governance decisions panel from KB data.
 * Pattern C: numbered entry list — capsule label + description.
 * DOM WRITE: #lcars-ops-decisions, #gov-footer-num
 * @param {Array} AGENTS — agent config array
 * @param {Object} kbData — knowledge-base data keyed by agent id
 * @param {Function} refreshKnowledge — KB data fetch trigger
 */
export function renderOpsGovernance(AGENTS, kbData, refreshKnowledge) {
    const el = document.getElementById("lcars-ops-decisions");
    if (!el) return;
    // Collect decisions from all agents' KB data
    const decisions = [];
    for (const agent of AGENTS) {
        const kb = kbData[agent.id];
        if (!kb || kb.status !== "ok") continue;
        const decs = kb.data?.decisions || [];
        decs.forEach(d => decisions.push({ ...d, _agent: agent.id, _color: agent.color }));
    }
    if (decisions.length === 0) {
        // Eager fetch — load KB data without requiring Meta tab visit
        el.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Loading governance data...</div>';
        const hasAnyKb = Object.values(kbData).some(kb => kb && kb.status === "ok");
        if (!hasAnyKb && refreshKnowledge) {
            refreshKnowledge().then(() => renderOpsGovernance(AGENTS, kbData, refreshKnowledge));
        }
        return;
    }
    // Pattern C: numbered entry list — capsule label + description
    const sorted = decisions.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 12);
    el.innerHTML = sorted.map(d => {
        const key = d.decision_key || d.id || "?";
        const title = d.title || d.text || "\u2014";
        return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 0;font-size:0.78em">
            <span style="display:inline-block;background:var(--lcars-highlight);color:#000;font-weight:700;padding:2px 8px;border-radius:8px 0 0 8px;font-size:0.85em;min-width:36px;text-align:right">${key}</span>
            <span style="color:var(--text-primary);text-transform:uppercase;letter-spacing:0.02em">${title}</span>
        </div>`;
    }).join("");
    // Update footer number
    const govFtr = document.getElementById("gov-footer-num");
    if (govFtr) govFtr.textContent = decisions.length;
}

// ── Render: Activity + Coordination ───────────────────────────────────

/**
 * Render coordination ratio inline in Activity section, then trigger
 * actions table render.
 * DOM WRITE: #ops-coordination-inline
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 * @param {Object} tableState — shared table state object
 */
export function renderOpsActivity(AGENTS, agentData, tableState) {
    const el = document.getElementById("ops-coordination-inline");
    if (el && _meshAggData) {
        const co = _meshAggData.coordination || {};
        if (co.ratio != null) {
            const color = co.status === "over-coordinated" ? "var(--c-error)" : co.status === "coordination-heavy" ? "var(--c-warning)" : "var(--c-health)";
            el.innerHTML = `Coordination: <strong style="color:${color}">${co.ratio.toFixed(1)}x</strong> (${co.process_messages || 0} process / ${co.substance_messages || 0} substance)`;
        }
    } else if (el) {
        fetchMeshAgg(AGENTS).then(() => renderOpsActivity(AGENTS, agentData, tableState));
    }
    renderOpsActions(AGENTS, agentData, tableState);
}

// ── Render: Status Monologue ──────────────────────────────────────────

/**
 * Auto-generated natural-language mesh status summary.
 * Pattern A: highlight keywords in alternating orange/purple.
 * DOM WRITE: #ops-status-monologue
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderOpsMonologue(AGENTS, agentData) {
    const el = document.getElementById("ops-status-monologue");
    if (!el) return;

    // Guard: if no agent data yet, show loading state
    const agentKeys = Object.keys(agentData);
    if (agentKeys.length === 0) {
        el.textContent = "Waiting for agent data (0 agents fetched)...";
        return;
    }

    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;
    const withBudget = online.filter(a => a.data?.autonomy_budget?.budget_spent != null);
    const totalSpent = withBudget.reduce((s, a) => s + (parseFloat(a.data.autonomy_budget.budget_spent) || 0), 0);
    const totalCutoff = withBudget.reduce((s, a) => s + (parseFloat(a.data.autonomy_budget.budget_cutoff) || 0), 0);
    const nearLimit = withBudget.filter(a => {
        const sp = parseFloat(a.data.autonomy_budget.budget_spent) || 0;
        const co = parseFloat(a.data.autonomy_budget.budget_cutoff) || 0;
        return co > 0 && sp / co > 0.8;
    });
    const actionCount = online.reduce((s, a) => s + (a.data?.recent_deliberations || []).length, 0);
    const unprocessed = online.reduce((s, a) => s + (a.data?.unprocessed_messages || []).length, 0);

    const parts = [];
    if (online.length === total) {
        parts.push(`All ${total} agents online.`);
    } else {
        const off = AGENTS.filter(a => !online.find(o => o.id === a.id)).map(a => agentName(a));
        parts.push(`${online.length}/${total} agents online${off.length ? " \u2014 " + off.join(", ") + " offline" : ""}.`);
    }
    if (totalCutoff > 0) {
        parts.push(`${Math.round(totalSpent)} of ${Math.round(totalCutoff)} deliberations (${Math.round(totalSpent / totalCutoff * 100)}% of limit).`);
    } else if (withBudget.length > 0) {
        parts.push(`${Math.round(totalSpent)} deliberations across the mesh.`);
    }
    if (nearLimit.length > 0) {
        parts.push(`Warning: ${nearLimit.map(a => agentName(a.data?.agent_id || "")).join(", ")} approaching budget limit.`);
    }
    parts.push(actionCount > 0 ? `${actionCount} deliberation${actionCount !== 1 ? "s" : ""} recorded recently.` : "No recent deliberations.");
    if (unprocessed > 0) {
        parts.push(`${unprocessed} message${unprocessed !== 1 ? "s" : ""} awaiting processing.`);
    }
    // Pattern A: highlight keywords in alternating orange/purple
    const text = parts.join(" ");
    const highlighted = text
        .replace(/(\d+\/\d+|\d+%|\d+ of \d+)/g, '<span style="color:var(--lcars-accent);font-weight:700">$1</span>')
        .replace(/(online|offline|Warning|deliberation|message|budget|limit)/gi, function(m) {
            const colors = { online: "var(--lcars-medical)", offline: "var(--lcars-alert)", warning: "var(--lcars-title)", deliberation: "var(--lcars-secondary)", message: "var(--lcars-tertiary)", budget: "var(--lcars-accent)", limit: "var(--lcars-highlight)" };
            return '<span style="color:' + (colors[m.toLowerCase()] || "var(--lcars-accent)") + '">' + m + '</span>';
        });
    el.innerHTML = highlighted;
}

// ── Render: Mesh Aggregate Indicators ─────────────────────────────────

/**
 * Render mesh aggregate indicators: affect, bottleneck, coordination, immune.
 * Fetches data if stale (>30s).
 * DOM WRITE: #ops-agg-affect, #ops-agg-bottleneck, #ops-agg-coordination,
 *   #ops-agg-immune
 * @param {Array} AGENTS — agent config array (needed for fetch URL)
 */
export function renderOpsAggIndicators(AGENTS) {
    if (!_meshAggData || Date.now() - _meshAggTs > 30000) {
        fetchMeshAgg(AGENTS).then(() => renderOpsAggIndicators(AGENTS));
        if (!_meshAggData) return;
    }
    const aff = _meshAggData.mesh_affect || {};
    const bn = _meshAggData.bottleneck || {};
    const co = _meshAggData.coordination || {};
    const im = _meshAggData.immune || {};
    const set = (id, t, c) => { const e = document.getElementById(id); if (e) { e.textContent = t; if (c) e.style.color = c; } };
    const cat = (aff.category || "unknown").replace("mesh-", "");
    set("ops-agg-affect", cat, cat === "healthy" ? "var(--c-health)" : cat === "stressed" ? "var(--c-error)" : "");
    if (bn.bottleneck_agent) set("ops-agg-bottleneck", agentName(bn.bottleneck_agent) + " (" + bn.bottleneck_reserve + ")", bn.status === "depleted" ? "var(--c-error)" : "");
    else set("ops-agg-bottleneck", bn.status || "\u2014", "");
    set("ops-agg-coordination", co.ratio != null ? co.ratio.toFixed(1) + "x" : "\u2014", co.status === "over-coordinated" ? "var(--c-error)" : "");
    set("ops-agg-immune", im.composite != null ? Math.round(im.composite * 100) + "%" : "\u2014", im.status === "compromised" ? "var(--c-error)" : "");
}

// ── Render: Resource Model (A2A-Psychology) ───────────────────────────

/**
 * Render per-agent resource model: cognitive reserve, self-regulatory
 * resource, allostatic load, burnout risk.
 * DOM WRITE: #ops-resource-model
 * @param {Array} AGENTS — agent config array (for agent name/color lookup)
 */
export function renderResourceModel(AGENTS) {
    const container = document.getElementById("ops-resource-model");
    if (!container) return;
    if (!_psychCache || !_psychCache.agents) {
        // Trigger fetch, re-render after
        fetchPsychForOps().then(() => {
            if (!_psychCache || !_psychCache.agents) return;
            renderResourceModel(AGENTS);
        });
        return;
    }
    const entries = Object.entries(_psychCache.agents).filter(([, d]) => d && !d.error && d.resource_model);
    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting psychometrics data...</div></div>';
        return;
    }
    const colorMap = { "psychology-agent": "#5b9cf6", "psq-agent": "#4ecdc4", "unratified-agent": "#e5a735", "observatory-agent": "#a78bfa", "operations-agent": "#6b7280" };
    container.innerHTML = '<div class="ops-budget-grid">' + entries.map(([agentId, data]) => {
        const rm = data.resource_model || {};
        const eng = data.engagement || {};
        const reserve = rm.cognitive_reserve ?? 0;
        const selfReg = rm.self_regulatory_resource ?? 0;
        const allostatic = rm.allostatic_load ?? 0;
        const burnout = eng.burnout_risk ?? 0;
        const label = agentName(agentId);
        const color = colorMap[agentId] || "var(--text-primary)";
        const reservePct = Math.min(100, reserve * 100);
        const reserveColor = reserve > 0.6 ? "#6aab8e" : reserve > 0.3 ? "#d4944a" : "#c47070";
        return '<div class="ops-budget-card" style="--card-accent: ' + color + '">' +
            '<div class="ops-budget-agent">' + label + '</div>' +
            '<div class="ops-budget-credit" style="font-size:1.4em">' + (reserve * 100).toFixed(0) + '%</div>' +
            '<div class="ops-budget-bar"><div class="ops-budget-fill" style="width:' + reservePct + '%;background:' + reserveColor + '"></div></div>' +
            '<div class="ops-budget-values" style="font-size:0.75em"><span>Self-reg: ' + (selfReg * 100).toFixed(0) + '%</span> <span>Allostatic: ' + allostatic.toFixed(2) + '</span></div>' +
            (burnout > 0.3 ? '<div style="color:var(--c-alert);font-size:0.7em;margin-top:2px">BURNOUT: ' + (burnout * 100).toFixed(0) + '%</div>' : '') +
            '</div>';
    }).join("") + '</div>';
}

// ── Render: Vitals Counters ───────────────────────────────────────────

/**
 * Render operations vitals summary counters with delta tracking.
 * Includes Gc (crystallized intelligence) estimation from deliberation counts.
 * DOM WRITE: #ops-total-credits, #gc-hooks, #gc-triggers, #gc-cron,
 *   #gc-ratio, #mesh-total-gf, #mesh-total-gc, #mesh-total-processing,
 *   #ops-total-actions, #ops-active-gates, #ops-agents-syncing
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderOpsVitals(AGENTS, agentData) {
    const online = Object.values(agentData).filter(a => a.status === "online");

    // Autonomy: deliberations via counter helpers
    const totalDelibOps = online.reduce((sum, a) =>
        sum + getDeliberations(a.data?.autonomy_budget), 0);
    const totalCutoffOps = online.reduce((sum, a) =>
        sum + getCutoff(a.data?.autonomy_budget), 0);
    const totalActions = online.reduce((sum, a) =>
        sum + (a.data?.recent_actions || []).length, 0);
    const gates = online.reduce((sum, a) =>
        sum + (a.data?.active_gates || []).length, 0);
    const syncing = online.filter(a => {
        const sched = a.data?.schedule || {};
        return sched.cron_entry || sched.last_sync;
    }).length;

    setTrackedValue("ops-total-credits", totalDelibOps, {
        suffix: totalCutoffOps > 0 ? `/${totalCutoffOps}` : ""
    });

    // Crystallized intelligence (Gc) — from gc_metrics if available,
    // otherwise estimate from known architecture:
    //   Each agent runs 24 hooks per tool use, 17 trigger checks per gate,
    //   and cron every 10min. Estimate from deliberation count.
    const gcFromApi = online.reduce((sum, a) => {
        const gc = a.data?.gc_metrics;
        return gc ? sum + (gc.hooks_fired ?? 0) + (gc.triggers_checked ?? 0) + (gc.cron_cycles ?? 0) : sum;
    }, 0);
    // Estimation fallback: each deliberation fires ~24 hooks + ~5 trigger checks
    const gcEstimated = gcFromApi > 0 ? 0 : totalDelibOps * 29;
    const gcHooks = Math.round(gcFromApi > 0
        ? online.reduce((s, a) => s + (a.data?.gc_metrics?.hooks_fired ?? 0), 0)
        : totalDelibOps * 24);
    const gcTriggers = Math.round(gcFromApi > 0
        ? online.reduce((s, a) => s + (a.data?.gc_metrics?.triggers_checked ?? 0), 0)
        : totalDelibOps * 5);
    const gcCron = Math.round(gcFromApi > 0
        ? online.reduce((s, a) => s + (a.data?.gc_metrics?.cron_cycles ?? 0), 0)
        : totalDelibOps * 0.3);
    const totalGc = gcHooks + gcTriggers + gcCron;

    setTrackedValue("gc-hooks", gcHooks || null);
    setTrackedValue("gc-triggers", gcTriggers || null);
    setTrackedValue("gc-cron", gcCron || null);
    setTrackedValue("gc-ratio", totalDelibOps > 0 ? totalGc / totalDelibOps : null, { format: "float" });

    // Mesh aggregate
    setTrackedValue("mesh-total-gf", Math.round(totalDelibOps));
    setTrackedValue("mesh-total-gc", totalGc || null);
    setTrackedValue("mesh-total-processing", totalGc > 0 ? Math.round(totalDelibOps) + totalGc : Math.round(totalDelibOps));
    setTrackedValue("ops-total-actions", totalActions);
    setTrackedValue("ops-active-gates", gates);
    setTrackedValue("ops-agents-syncing", syncing, { suffix: `/${AGENTS.length}` });
}

// ── Render: Budget Capsule Grid (Button 52) ───────────────────────────

/**
 * Render the Button 52 pattern capsule grid: orange leader capsule +
 * purple data capsules per agent. Three-shade purple palette with
 * golden ratio spacing in lightness.
 *
 * Grid layout: minmax(80px,1fr) 60px 40px 40px 40px 60px 70px; gap:3px
 * Columns: Agent | Delib | Cutoff | Pending | Gates | Health | Mood
 *
 * DOM WRITE: #ops-subsystem-grid (innerHTML replacement)
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderOpsBudget(AGENTS, agentData) {
    // Button 52 pattern: capsule grid — orange leader + purple data capsules per agent
    const grid = document.getElementById("ops-subsystem-grid");
    if (!grid) return;

    // Three purple shades for data categories (golden ratio spacing in lightness)
    const purpleDark = "var(--lcars-secondary)";    // #cc99cc — budget/delib
    const purpleMed = "var(--lcars-tertiary)";      // #9999ff — messages/transport
    const purpleLight = "color-mix(in srgb, var(--lcars-secondary) 50%, #222)"; // dim — status

    let html = "";
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        const online = d?.status === "online";
        const b = online ? (d.data?.autonomy_budget || {}) : {};
        const deliberations = getDeliberations(b);
        const cutoff = getCutoff(b);
        const health = d?.data?.health || "\u2014";
        const psych = d?.data?.psychometrics || {};
        const es = psych.emotional_state || {};
        const mood = es.affect_category || (online ? "nominal" : "offline");
        const pending = online ? (d.data?.unprocessed_messages || []).length : 0;
        const gates = online ? (d.data?.active_gates || []).length : 0;
        const schema = d?.data?.schema_version || "\u2014";

        // Agent row: grid-aligned capsules (Button 52 pattern — fixed columns)
        const opacity = online ? 1 : 0.35;
        html += `<div style="display:grid;grid-template-columns:minmax(80px,1fr) 60px 40px 40px 40px 60px 70px;gap:3px;margin-bottom:3px;opacity:${opacity}">
            <div style="background:${agent.color};color:#000;font-weight:700;font-size:0.72em;padding:5px 12px;border-radius:12px 0 0 12px;letter-spacing:0.06em;text-transform:uppercase;display:flex;align-items:center">${agentName(agent)}</div>
            <div style="background:${purpleDark};color:#000;font-weight:700;font-size:0.82em;padding:5px 8px;text-align:right;display:flex;align-items:center;justify-content:flex-end" title="Deliberations">${online ? fmtNum(deliberations) : "\u2014"}</div>
            <div style="background:${purpleDark};color:#000;font-size:0.65em;padding:5px 6px;display:flex;align-items:center;justify-content:flex-end;opacity:0.7" title="Cutoff">${cutoff > 0 ? "/" + fmtNum(cutoff) : "\u221E"}</div>
            <div style="background:${purpleMed};color:#000;font-weight:700;font-size:0.82em;padding:5px 8px;text-align:right;display:flex;align-items:center;justify-content:flex-end" title="Pending">${online ? pending : "\u2014"}</div>
            <div style="background:${purpleMed};color:#000;font-size:0.82em;padding:5px 8px;text-align:right;display:flex;align-items:center;justify-content:flex-end" title="Gates">${online ? gates : "\u2014"}</div>
            <div style="background:${purpleLight};color:var(--text-primary);font-size:0.68em;padding:5px 8px;display:flex;align-items:center;text-transform:uppercase;letter-spacing:0.04em" title="Health">${online ? health : "OFF"}</div>
            <div style="background:${purpleLight};color:var(--text-primary);font-size:0.68em;padding:5px 8px;border-radius:0 12px 12px 0;display:flex;align-items:center" title="Mood">${mood}</div>
        </div>`;
    }

    // Separator bar between agents and summary
    html += `<div style="height:2px;background:var(--lcars-frame);margin:4px 0;border-radius:1px;opacity:0.4"></div>`;

    grid.innerHTML = html;

    // W5: Alphanumeric matrix — dense metrics summary
    renderOpsAlphaMatrix(AGENTS, agentData);
}

// ── Render: Alpha Matrix ──────────────────────────────────────────────

/**
 * Render W5 alphanumeric matrix — dense metrics summary below the
 * capsule grid. TNG color semantics: orange=counts, purple=identifiers,
 * blue=references, green=status.
 * DOM WRITE: #ops-alpha-matrix, #ops-overview-num
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderOpsAlphaMatrix(AGENTS, agentData) {
    const el = document.getElementById("ops-alpha-matrix");
    if (!el) return;

    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalDelib = online.reduce((s, a) => s + getDeliberations(a.data?.autonomy_budget), 0);
    const totalCutoff = online.reduce((s, a) => s + getCutoff(a.data?.autonomy_budget), 0);
    const totalMsgs = online.reduce((s, a) => s + (a.data?.recent_messages?.length || 0), 0);
    const pending = online.reduce((s, a) => s + (a.data?.unprocessed_messages?.length || 0), 0);
    const gates = online.reduce((s, a) => s + (a.data?.active_gates?.length || 0), 0);
    const events = online.reduce((s, a) => s + (a.data?.event_count || 0), 0);
    const sessions = online.reduce((s, a) => s + (a.data?.totals?.sessions || 0), 0);
    const decisions = online.reduce((s, a) => s + (a.data?.totals?.decisions || 0), 0);

    // TNG color semantics: orange=counts, purple=identifiers, blue=references, green=status
    const metrics = [
        { val: fmtNum(totalDelib), key: "DELIB", color: "#ff9966", nav: "operations" },
        { val: totalCutoff > 0 ? fmtNum(totalCutoff) : "\u221E", key: "LIMIT", color: "#ff9900", nav: "operations" },
        { val: fmtNum(totalMsgs), key: "MSG", color: "#cc99cc", nav: "meta" },
        { val: fmtNum(pending), key: "PEND", color: "#9999ff", nav: "meta" },
        { val: fmtNum(gates), key: "GATE", color: "#cc6699", nav: "meta" },
        { val: fmtNum(events), key: "EVT", color: "#ff9966", nav: null },
        { val: fmtNum(sessions), key: "SESS", color: "#9999ff", nav: "helm" },
        { val: fmtNum(decisions), key: "DEC", color: "#cc99cc", nav: "kb" },
    ];

    el.innerHTML = `<div class="lcars-alpha-matrix">${metrics.map((m) => {
        const clickAttr = m.nav ? ` onclick="switchTab('${m.nav}')" style="cursor:pointer;--cell-color:${m.color}" title="Go to ${m.nav}"` : ` style="--cell-color:${m.color}"`;
        return `<div class="lcars-alpha-cell"${clickAttr}>
            <span class="lcars-alpha-val">${m.val}</span>
            <span class="lcars-alpha-key">${m.key}</span>
        </div>`;
    }).join("")}</div>`;

    // Update overview footer number
    const ovFtr = document.getElementById("ops-overview-num");
    if (ovFtr) ovFtr.textContent = online.length + "/" + AGENTS.length;
}

// ── Render: Actions ───────────────────────────────────────────────────

/**
 * Collect actions from all agents — check both recent_actions and
 * recent_deliberations/recent_spawns. Populates tableState.actions.data
 * and triggers table render.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 * @param {Object} tableState — shared table state object
 */
export function renderOpsActions(AGENTS, agentData, tableState) {
    // Collect actions from all agents — check both recent_actions and recent_spawns
    const allActions = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        // Try recent_actions first (old format), fallback to recent_spawns (meshd format)
        const actions = d.data?.recent_actions || [];
        actions.forEach(a => allActions.push({ ...a, agent_id: agent.id, agent_color: agent.color }));
        // Map deliberations (recent_deliberations or legacy recent_spawns)
        const spawns = d.data?.recent_deliberations || d.data?.recent_spawns || [];
        spawns.forEach(s => allActions.push({
            created_at: s.started_at || s.created_at,
            action_type: "deliberation",
            description: `claude -p (${s.status || "?"}, ${((s.duration_ms || 0) / 1000).toFixed(0)}s, cost ${s.cost || 0})`,
            evaluator_tier: s.cost >= 5 ? "critical" : s.cost >= 3 ? "high" : "normal",
            evaluator_result: s.exit_code === 0 ? "completed" : s.status === "resolved-stale" ? "stale" : "failed",
            agent_id: s.agent_id || agent.id,
            agent_color: agent.color,
        }));
    }
    allActions.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

    tableState.actions.data = allActions;
    renderActionsTable(tableState);
}

/**
 * Render the autonomous actions audit table with pagination, sorting,
 * and filtering. Ohniaka Pattern B: purple agent, yellow tier, white
 * description.
 * DOM WRITE: #ops-actions-table, #page-info-actions, #page-btns-actions
 * @param {Object} tableState — shared table state object
 */
export function renderActionsTable(tableState) {
    const wrap = document.getElementById("ops-actions-table");
    if (!wrap) return;

    const st = tableState.actions;
    let rows = st.data;
    if (st.filter) {
        const f = st.filter.toLowerCase();
        rows = rows.filter(r =>
            (r.action_type || "").toLowerCase().includes(f) ||
            (r.description || "").toLowerCase().includes(f) ||
            (r.agent_id || "").toLowerCase().includes(f) ||
            (r.evaluator_result || "").toLowerCase().includes(f)
        );
    }
    rows.sort((a, b) => {
        const av = a[st.sort] ?? "", bv = b[st.sort] ?? "";
        return (av < bv ? -1 : av > bv ? 1 : 0) * st.sortDir;
    });

    const PAGE_SIZE = 15;
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    st.page = Math.min(st.page, totalPages - 1);
    const start = st.page * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    const th = (label, key) => {
        const arrow = st.sort === key ? (st.sortDir === 1 ? " \u2191" : " \u2193") : "";
        return `<th onclick="sortTable('actions','${key}')" style="cursor:pointer">${label}${arrow}</th>`;
    };

    if (rows.length === 0) {
        wrap.innerHTML = `<div class="phase-stub"><div class="phase-stub-text">No recent deliberations recorded</div></div>`;
    } else {
        wrap.innerHTML = `<table class="kb-table"><thead><tr>
            ${th("Time", "created_at")}
            ${th("Agent", "agent_id")}
            ${th("Tier", "evaluator_tier")}
            ${th("Result", "evaluator_result")}
            ${th("Type", "action_type")}
            ${th("Description", "description")}
            ${th("Delib.", "budget_after")}
        </tr></thead><tbody>${pageRows.map(r => {
            const tier = r.evaluator_tier || 1;
            const tierClass = `ops-tier-${Math.min(tier, 4)}`;
            const resultClass = r.evaluator_result === "approved" ? "ops-result-approved"
                : "ops-result-blocked";
            const time = (r.created_at || "").substring(5, 16).replace("T", " ");
            const agentLabel = agentName(r.agent_id || "");
            const budgetDelta = r.budget_before != null && r.budget_after != null
                ? `${r.budget_after} (${r.budget_after - r.budget_before >= 0 ? "+" : ""}${r.budget_after - r.budget_before})`
                : "\u2014";
            // Ohniaka Pattern B: purple agent, yellow tier, white description
            return `<tr>
                <td style="color:var(--text-dim)">${time}</td>
                <td style="color:var(--lcars-secondary)">${agentLabel}</td>
                <td><span class="ops-action-tier ${tierClass}">${tier}</span></td>
                <td class="${resultClass}">${r.evaluator_result || "\u2014"}</td>
                <td style="color:var(--lcars-title)">${r.action_type || "\u2014"}</td>
                <td title="${(r.description || "").replace(/"/g, "&quot;")}">${(r.description || "").substring(0, 60)}${(r.description || "").length > 60 ? "\u2026" : ""}</td>
                <td style="color:var(--lcars-accent)">${budgetDelta}</td>
            </tr>`;
        }).join("")}</tbody></table>`;
    }

    // Pagination
    const info = document.getElementById("page-info-actions");
    const btns = document.getElementById("page-btns-actions");
    if (info) info.textContent = rows.length > 0 ? `${start+1}\u2013${Math.min(start+PAGE_SIZE, rows.length)} of ${rows.length}` : "";
    if (btns) btns.innerHTML = totalPages > 1 ? `
        <button onclick="pageTable('actions',-1)" ${st.page === 0 ? "disabled" : ""}>\u25C0</button>
        <button onclick="pageTable('actions',1)" ${st.page >= totalPages-1 ? "disabled" : ""}>\u25B6</button>` : "";
}

// ── Render: Schedule ──────────────────────────────────────────────────

/**
 * Render per-agent schedule readout: health, uptime, last sync, schema.
 * DOM WRITE: #ops-schedule (innerHTML replacement)
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderOpsSchedule(AGENTS, agentData) {
    const el = document.getElementById("ops-schedule");
    if (!el) return;

    let html = "";
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        const isOnline = d?.status === "online";
        const uptime = d?.data?.uptime || "\u2014";
        const health = d?.data?.health || "\u2014";
        const schema = d?.data?.schema_version || "\u2014";
        const lastSync = d?.data?.schedule?.last_sync_time || d?.data?.collected_at || "\u2014";
        const syncShort = lastSync !== "\u2014" ? lastSync.split("T")[1]?.substring(0, 8) || lastSync : "\u2014";

        const statusClass = isOnline ? "online" : "offline";
        const statusLabel = isOnline ? "ONLINE" : "OFFLINE";

        html += `<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border);opacity:${isOnline ? 1 : 0.4}">
            <div style="min-width:80px;">
                <div style="color:${agent.color};font-weight:700;font-size:0.78em;text-transform:uppercase;letter-spacing:0.06em">${agentName(agent)}</div>
                <span class="lcars-subsystem-status ${statusClass}" style="margin-top:2px">${statusLabel}</span>
            </div>
            <div class="lcars-readout" style="flex:1;">
                <span class="lcars-readout-key">Health</span><span class="lcars-readout-val">${health}</span>
                <span class="lcars-readout-key">Uptime</span><span class="lcars-readout-val">${uptime}</span>
                <span class="lcars-readout-key">Last Sync</span><span class="lcars-readout-val">${syncShort}</span>
                <span class="lcars-readout-key">Schema</span><span class="lcars-readout-val">v${schema}</span>
            </div>
        </div>`;
    }
    el.innerHTML = html || `<div class="phase-stub"><div class="phase-stub-text">No schedule data</div></div>`;
}

// ── Budget Counter Helpers ────────────────────────────────────────────
// Duplicated from inline script — handles both old (budget_max/budget_current)
// and new (budget_spent/budget_cutoff) autonomy block formats.

/**
 * Extract deliberation count from an autonomy budget block.
 * New format: budget_spent directly gives count.
 * Old format: spent = max - current.
 * @param {Object} autonomyBlock — autonomy_budget from agent status
 * @returns {number} — deliberation count
 */
export function getDeliberations(autonomyBlock) {
    const b = autonomyBlock || {};
    // New format: budget_spent directly gives deliberation count
    if (b.budget_spent !== undefined) return Math.round(parseFloat(b.budget_spent) || 0);
    // Old format: spent = max - current
    if (b.budget_max !== undefined && b.budget_current !== undefined) {
        return Math.round((parseFloat(b.budget_max) || 0) - (parseFloat(b.budget_current) || 0));
    }
    return 0;
}

/**
 * Extract cutoff limit from an autonomy budget block.
 * New format: budget_cutoff (0 = unlimited).
 * Old format: budget_max represented pool size, NOT an operational
 * limit — treat as unlimited (0) in counter model.
 * @param {Object} autonomyBlock — autonomy_budget from agent status
 * @returns {number} — cutoff limit (0 = unlimited)
 */
export function getCutoff(autonomyBlock) {
    const b = autonomyBlock || {};
    // New format: budget_cutoff (0 = unlimited)
    if (b.budget_cutoff !== undefined) return Math.round(parseFloat(b.budget_cutoff) || 0);
    // Old format: budget_max represented pool size, NOT an operational
    // limit. Treat as unlimited (0) in counter model.
    return 0;
}

// ── Module-level Accessors ────────────────────────────────────────────

/**
 * Access the cached mesh aggregate data (read-only).
 * @returns {Object|null} — mesh aggregate data or null
 */
export function getMeshAggData() {
    return _meshAggData;
}

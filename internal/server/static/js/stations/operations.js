/**
 * operations.js — Operations station (TNG: Operations/Ops console —
 * autonomy budget, autonomous actions, sync schedule, resource model).
 *
 * Renders the Operations tab: budget cards per agent, resource model
 * (A2A-Psychology), autonomous actions audit table, sync schedule status.
 *
 * A2A-Psychology constructs (Supervisory Control domain):
 *   - Resource model: cognitive reserve, self-regulatory resource, allostatic load
 *   - Burnout risk from engagement construct
 *
 * Data endpoints:
 *   GET {agent.url}/api/status — autonomy_budget, recent_actions, schedule
 *   Shared psychometrics cache (core/psychometrics.js) — resource model
 *
 * DOM dependencies: #ops-budget-grid, #ops-resource-model, #ops-actions-table,
 *   #ops-schedule, #ops-total-credits, #ops-total-actions, #ops-active-gates,
 *   #ops-agents-syncing, page control elements
 *
 * Global state accessed: AGENTS, agentData, tableState
 */

import {
    fetchPsychometrics, getAllAgentPsychometrics,
} from '../core/psychometrics.js';

// ── Module State ──────────────────────────────────────────────
let meshHealthData = null;

/** Timeout for all fetches (5 seconds per task spec) */
const FETCH_TIMEOUT = 5000;

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch mesh health from /api/health to supplement budget data.
 * Operations primarily consumes agentData from pulse.js; this adds
 * mesh-level budget_pct and gate data from the interagent endpoint.
 * @returns {Promise<void>}
 */
export async function fetchOpsData() {
    try {
        const [healthResp] = await Promise.allSettled([
            fetch("https://interagent.safety-quotient.dev/api/health", {
                signal: AbortSignal.timeout(FETCH_TIMEOUT),
            }),
        ]);
        if (healthResp.status === "fulfilled" && healthResp.value.ok) {
            meshHealthData = await healthResp.value.json();
        }
        // Fetch psychometrics for resource model panel
        await fetchPsychometrics();
    } catch {
        meshHealthData = null;
    }
}

// ── Render: Operations Vitals ──────────────────────────────────

/**
 * Render the operations vitals summary counters.
 * DOM WRITE: #ops-total-credits, #ops-total-actions, #ops-active-gates,
 *   #ops-agents-syncing
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderOpsVitals(AGENTS, agentData) {
    const online = Object.values(agentData).filter(a => a.status === "online");

    // Spend-counter model: budget_spent increments, budget_cutoff sets limit (0=unlimited)
    let totalSpent = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_spent ?? 0);
    }, 0);
    let totalCutoff = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_cutoff ?? 0);
    }, 0);

    // Supplement from mesh health data if per-agent status lacked budget info
    if (meshHealthData && totalSpent === 0 && totalCutoff === 0) {
        const healthAgents = meshHealthData.agents || [];
        for (const agent of healthAgents) {
            totalSpent += agent.deliberations ?? 0;
            totalCutoff += agent.cutoff ?? 0;
        }
    }

    const totalActions = online.reduce((sum, a) =>
        sum + (a.data?.recent_actions || []).length, 0);

    let gates = online.reduce((sum, a) =>
        sum + (a.data?.active_gates || []).length, 0);

    // Supplement gates from mesh health
    if (meshHealthData && gates === 0) {
        const healthAgents = meshHealthData.agents || [];
        gates = healthAgents.reduce((sum, a) => {
            const agentGates = a.gates ?? a.active_gates ?? 0;
            return sum + (typeof agentGates === "number" ? agentGates : (Array.isArray(agentGates) ? agentGates.length : 0));
        }, 0);
    }

    const syncing = online.filter(a => {
        const sched = a.data?.schedule || {};
        return sched.cron_entry || sched.last_sync;
    }).length;

    document.getElementById("ops-total-credits").textContent = `${totalSpent}/${totalCutoff} spent`;
    document.getElementById("ops-agents-syncing").textContent = `${syncing}/${AGENTS.length}`;

    // Gate stack — render LCARS indicator chips
    const gateStack = document.getElementById("ops-gate-stack");
    if (gateStack) {
        // Collect gate details from agent data
        const allGates = [];
        for (const agent of AGENTS) {
            const d = agentData[agent.id];
            if (!d || d.status !== "online") continue;
            const agentGates = d.data?.active_gates || [];
            for (const g of agentGates) {
                allGates.push({ ...g, agent_id: agent.id });
            }
        }
        // Supplement from mesh health
        if (meshHealthData && allGates.length === 0) {
            for (const a of (meshHealthData.agents || [])) {
                const ag = a.active_gates ?? a.gates ?? [];
                if (typeof ag === "number") {
                    for (let i = 0; i < ag; i++) allGates.push({ agent_id: a.id });
                } else if (Array.isArray(ag)) {
                    for (const g of ag) allGates.push({ ...g, agent_id: a.id });
                }
            }
        }

        const MAX_CHIPS = 5;
        const chips = [];
        for (let i = 0; i < MAX_CHIPS; i++) {
            if (i < allGates.length) {
                const gate = allGates[i];
                const timedOut = gate.timeout_at && new Date(gate.timeout_at) < new Date();
                const cls = timedOut ? "timeout" : "active";
                const title = gate.gate_id
                    ? `${gate.gate_id} (${(gate.agent_id || "").replace("-agent", "")})`
                    : `Gate ${i + 1}`;
                chips.push(`<div class="ops-gate-chip ${cls}" title="${title}"></div>`);
            } else {
                chips.push('<div class="ops-gate-chip idle"></div>');
            }
        }
        gateStack.innerHTML = chips.join("");
    }
}

// ── Render: Budget Cards ───────────────────────────────────────

/**
 * Render per-agent autonomy budget cards.
 * DOM WRITE: #ops-budget-grid (innerHTML replacement)
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 */
export function renderOpsBudget(AGENTS, agentData) {
    const grid = document.getElementById("ops-budget-grid");
    if (!grid) return;
    grid.innerHTML = "";

    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") {
            grid.innerHTML += `
                <div class="ops-budget-card" style="--card-accent: ${agent.color}; opacity: 0.4">
                    <div class="ops-budget-agent">${agent.id.replace("-agent", "")}</div>
                    <div class="ops-budget-credit" style="font-size:1em; color:var(--text-dim)">OFFLINE</div>
                </div>`;
            continue;
        }
        const b = d.data?.autonomy_budget || {};
        const spent = b.budget_spent ?? 0;
        const cutoff = b.budget_cutoff ?? 0;
        const pct = cutoff > 0 ? Math.round((1 - spent / cutoff) * 100) : 100;
        const barColor = pct > 50 ? "#6aab8e" : pct > 20 ? "#d4944a" : "#c47070";
        const lastAction = b.last_action || "—";
        const interval = b.min_action_interval ?? 300;

        grid.innerHTML += `
            <div class="ops-budget-card" style="--card-accent: ${agent.color}">
                <div class="ops-budget-agent">${agent.id.replace("-agent", "")}</div>
                <div class="ops-budget-credit">${spent}<span style="font-size:0.4em;color:var(--text-secondary)">/${cutoff}</span></div>
                <div class="ops-budget-bar">
                    <div class="ops-budget-fill" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <div class="ops-budget-values">
                    <span>Interval: ${Math.round(interval/60)}min</span>
                    <span>${lastAction !== "—" ? lastAction.substring(11, 16) : "—"}</span>
                </div>
            </div>`;
    }
}

// ── Render: Actions Table ──────────────────────────────────────

/**
 * Collect actions from all agents and populate tableState.actions.data.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 * @param {Object} tableState — shared table state object
 */
export function renderOpsActions(AGENTS, agentData, tableState) {
    const allActions = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const actions = d.data?.recent_actions || [];
        actions.forEach(a => allActions.push({ ...a, agent_id: agent.id, agent_color: agent.color }));
    }
    allActions.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

    tableState.actions.data = allActions;
    renderActionsTable(tableState);
}

/**
 * Render the autonomous actions audit table with pagination.
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
        wrap.innerHTML = `<div class="phase-stub"><div class="phase-stub-text">No autonomous actions recorded</div></div>`;
    } else {
        wrap.innerHTML = `<table class="kb-table"><thead><tr>
            ${th("Time", "created_at")}
            ${th("Agent", "agent_id")}
            ${th("Tier", "evaluator_tier")}
            ${th("Result", "evaluator_result")}
            ${th("Type", "action_type")}
            ${th("Description", "description")}
            ${th("Budget", "budget_after")}
        </tr></thead><tbody>${pageRows.map(r => {
            const tier = r.evaluator_tier || 1;
            const tierClass = `ops-tier-${Math.min(tier, 4)}`;
            const resultClass = r.evaluator_result === "approved" ? "ops-result-approved"
                : "ops-result-blocked";
            const time = (r.created_at || "").substring(5, 16).replace("T", " ");
            const agentLabel = (r.agent_id || "").replace("-agent", "");
            const budgetDelta = r.budget_before != null && r.budget_after != null
                ? `${r.budget_after} (${r.budget_after - r.budget_before >= 0 ? "+" : ""}${r.budget_after - r.budget_before})`
                : "—";
            return `<tr>
                <td>${time}</td>
                <td>${agentLabel}</td>
                <td><span class="ops-action-tier ${tierClass}">T${tier}</span></td>
                <td class="${resultClass}">${r.evaluator_result || "—"}</td>
                <td>${r.action_type || "—"}</td>
                <td title="${(r.description || "").replace(/"/g, "&quot;")}">${(r.description || "").substring(0, 60)}${(r.description || "").length > 60 ? "…" : ""}</td>
                <td>${budgetDelta}</td>
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

// ── Render: Schedule ───────────────────────────────────────────

/**
 * Render the sync schedule status rows.
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
        const sched = d?.data?.schedule || {};
        const isOnline = d?.status === "online";

        let statusClass, statusLabel;
        if (!isOnline) {
            statusClass = "ops-schedule-offline";
            statusLabel = "OFFLINE";
        } else if (sched.cron_entry) {
            statusClass = "ops-schedule-active";
            statusLabel = "ACTIVE";
        } else {
            statusClass = "ops-schedule-stale";
            statusLabel = "NO CRON";
        }

        const cronText = sched.cron_entry || "—";
        const lastSync = sched.last_sync ? sched.last_sync.substring(5, 16).replace("T", " ") : "—";
        const agentLabel = agent.id.replace("-agent", "");

        html += `<div class="ops-schedule-row">
            <div class="ops-schedule-agent" style="color:${agent.color}">${agentLabel}</div>
            <div class="ops-schedule-detail">
                <span style="color:var(--text-dim)">cron:</span> ${cronText}
                &nbsp;&nbsp;
                <span style="color:var(--text-dim)">last:</span> ${lastSync}
            </div>
            <span class="ops-schedule-status ${statusClass}">${statusLabel}</span>
        </div>`;
    }
    el.innerHTML = html || `<div class="phase-stub"><div class="phase-stub-text">No schedule data</div></div>`;
}

// ── Render: Resource Model (A2A-Psychology) ──────────────────

const OPS_AGENTS = [
    { id: "psychology-agent",  label: "psych", color: "#5b9cf6" },
    { id: "psq-agent",        label: "psq",   color: "#4ecdc4" },
    { id: "unratified-agent",  label: "unrat", color: "#e5a735" },
    { id: "observatory-agent", label: "obs",   color: "#a78bfa" },
    { id: "operations-agent",  label: "ops",   color: "var(--c-tab-ops)" },
];

/**
 * Render per-agent resource model: cognitive reserve, self-regulatory
 * resource, allostatic load, burnout risk.
 * DOM WRITE: #ops-resource-model
 */
export function renderResourceModel() {
    const container = document.getElementById("ops-resource-model");
    if (!container) return;

    const agents = getAllAgentPsychometrics();
    const entries = Object.entries(agents).filter(([, d]) => d && !d.error && d.resource_model);

    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting psychometrics data...</div></div>';
        return;
    }

    container.innerHTML = `<div class="ops-budget-grid">${entries.map(([agentId, data]) => {
        const rm = data.resource_model || {};
        const eng = data.engagement || {};
        const reserve = rm.cognitive_reserve ?? 0;
        const selfReg = rm.self_regulatory_resource ?? 0;
        const allostatic = rm.allostatic_load ?? 0;
        const burnout = eng.burnout_risk ?? 0;
        const label = agentId.replace("-agent", "");
        const agent = OPS_AGENTS.find(a => a.id === agentId);
        const color = agent ? agent.color : "var(--text-primary)";

        const reservePct = Math.min(100, reserve * 100);
        const reserveColor = reserve > 0.6 ? "#6aab8e" : reserve > 0.3 ? "#d4944a" : "#c47070";

        return `<div class="ops-budget-card" style="--card-accent: ${color}">
            <div class="ops-budget-agent">${label}</div>
            <div class="ops-budget-credit" style="font-size:1.4em">${(reserve * 100).toFixed(0)}%</div>
            <div class="ops-budget-bar">
                <div class="ops-budget-fill" style="width:${reservePct}%;background:${reserveColor}"></div>
            </div>
            <div class="ops-budget-values" style="font-size:0.75em">
                <span>Self-reg: ${(selfReg * 100).toFixed(0)}%</span>
                <span>Allostatic: ${allostatic.toFixed(2)}</span>
            </div>
            ${burnout > 0.3 ? `<div style="color:var(--c-alert);font-size:0.7em;margin-top:2px">BURNOUT: ${(burnout * 100).toFixed(0)}%</div>` : ""}
        </div>`;
    }).join("")}</div>`;
}

// ── Render: Combined Operations ────────────────────────────────

/**
 * Render all Operations station sub-sections.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 * @param {Object} tableState — shared table state object
 */
export function renderOps(AGENTS, agentData, tableState) {
    renderStatusMonologue(AGENTS, agentData);
    renderOpsAggregateIndicators();
    renderOpsBudget(AGENTS, agentData);
    renderResourceModel();
    renderOpsActions(AGENTS, agentData, tableState);
    renderOpsSchedule(AGENTS, agentData);
    renderOpsVitals(AGENTS, agentData);
}

// ── Status Monologue ─────────────────────────────────────────

/**
 * Auto-generated natural-language mesh status summary.
 * Replaces raw counter bars with human-readable prose.
 */
function renderStatusMonologue(AGENTS, agentData) {
    const el = document.getElementById("ops-status-monologue");
    if (!el) return;

    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;

    // Budget
    const withBudget = online.filter(a => a.data?.autonomy_budget?.budget_spent != null);
    const totalSpent = withBudget.reduce((s, a) => s + (parseFloat(a.data.autonomy_budget.budget_spent) || 0), 0);
    const totalCutoff = withBudget.reduce((s, a) => s + (parseFloat(a.data.autonomy_budget.budget_cutoff) || 0), 0);
    const nearLimit = withBudget.filter(a => {
        const spent = parseFloat(a.data.autonomy_budget.budget_spent) || 0;
        const cutoff = parseFloat(a.data.autonomy_budget.budget_cutoff) || 0;
        return cutoff > 0 && spent / cutoff > 0.8;
    });

    // Activity
    const actionCount = online.reduce((s, a) => s + (a.data?.recent_deliberations || []).length, 0);
    const unprocessed = online.reduce((s, a) => s + (a.data?.unprocessed_messages || []).length, 0);

    const parts = [];

    if (online.length === total) {
        parts.push(`All ${total} agents online.`);
    } else {
        const offNames = AGENTS.filter(a => !online.find(o => o.id === a.id)).map(a => a.id.replace("-agent", ""));
        parts.push(`${online.length}/${total} agents online${offNames.length ? " — " + offNames.join(", ") + " offline" : ""}.`);
    }

    if (totalCutoff > 0) {
        parts.push(`Budget: ${Math.round(totalSpent)} of ${Math.round(totalCutoff)} credits used (${Math.round(totalSpent / totalCutoff * 100)}%).`);
    } else if (withBudget.length > 0) {
        parts.push(`Budget: ${Math.round(totalSpent)} credits spent (unlimited mode).`);
    }

    if (nearLimit.length > 0) {
        parts.push(`Warning: ${nearLimit.map(a => (a.data.agent_id || "").replace("-agent", "")).join(", ")} approaching budget limit.`);
    }

    parts.push(actionCount > 0 ? `${actionCount} deliberation${actionCount !== 1 ? "s" : ""} recorded recently.` : "No recent deliberations.");

    if (unprocessed > 0) {
        parts.push(`${unprocessed} transport message${unprocessed !== 1 ? "s" : ""} awaiting processing.`);
    }

    el.textContent = parts.join(" ");
}

// ── Mesh Aggregate Indicators ────────────────────────────────

let meshAggCache = null;
let meshAggLastFetch = 0;

async function fetchMeshAggregate() {
    try {
        const opsAgent = window.AGENTS?.find(a => a.id === "operations-agent");
        const base = opsAgent?.url || "";
        if (!base) return;
        const resp = await fetch(`${base}/api/mesh-aggregate`, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
            meshAggCache = await resp.json();
            meshAggLastFetch = Date.now();
        }
    } catch { /* silent */ }
}

function renderOpsAggregateIndicators() {
    // Fetch if stale (>30s)
    if (!meshAggCache || Date.now() - meshAggLastFetch > 30000) {
        fetchMeshAggregate().then(renderOpsAggregateIndicators);
        if (!meshAggCache) return;
    }

    const affect = meshAggCache.mesh_affect || {};
    const bn = meshAggCache.bottleneck || {};
    const coord = meshAggCache.coordination || {};
    const immune = meshAggCache.immune || {};

    const set = (id, text, color) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = text; if (color) el.style.color = color; }
    };

    const cat = (affect.category || "unknown").replace("mesh-", "");
    set("ops-agg-affect", cat, cat === "healthy" ? "var(--c-health)" : cat === "stressed" ? "var(--c-error)" : "");

    if (bn.bottleneck_agent) {
        set("ops-agg-bottleneck", bn.bottleneck_agent.replace("-agent", "") + " (" + bn.bottleneck_reserve + ")",
            bn.status === "depleted" ? "var(--c-error)" : bn.status === "pressured" ? "var(--c-warning)" : "");
    } else {
        set("ops-agg-bottleneck", bn.status || "—", "");
    }

    set("ops-agg-coordination", coord.ratio != null ? coord.ratio.toFixed(1) + "x" : "—",
        coord.status === "over-coordinated" ? "var(--c-error)" : "");

    set("ops-agg-immune", immune.composite != null ? Math.round(immune.composite * 100) + "%" : "—",
        immune.status === "compromised" ? "var(--c-error)" : "");
}

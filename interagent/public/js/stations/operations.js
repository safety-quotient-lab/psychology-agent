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

    let totalCredits = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_current ?? 0);
    }, 0);
    let maxCredits = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_max ?? 20);
    }, 0);

    // Supplement from mesh health data if per-agent status lacked budget info
    if (meshHealthData && totalCredits === 0) {
        const healthAgents = meshHealthData.agents || [];
        for (const agent of healthAgents) {
            const budgetPct = agent.budget_pct ?? null;
            if (budgetPct != null) {
                // Estimate credits from percentage (assume 20 max per agent)
                totalCredits += Math.round((budgetPct / 100) * 20);
                maxCredits += 20;
            }
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

    document.getElementById("ops-total-credits").textContent = `${totalCredits}/${maxCredits}`;
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
        const current = b.budget_current ?? 0;
        const max = b.budget_max ?? 20;
        const pct = max > 0 ? Math.round((current / max) * 100) : 0;
        const barColor = pct > 50 ? "#6aab8e" : pct > 20 ? "#d4944a" : "#c47070";
        const lastAction = b.last_action || "—";
        const interval = b.min_action_interval ?? 300;

        grid.innerHTML += `
            <div class="ops-budget-card" style="--card-accent: ${agent.color}">
                <div class="ops-budget-agent">${agent.id.replace("-agent", "")}</div>
                <div class="ops-budget-credit">${current}<span style="font-size:0.4em;color:var(--text-secondary)">/${max}</span></div>
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
    renderOpsBudget(AGENTS, agentData);
    renderResourceModel();
    renderOpsActions(AGENTS, agentData, tableState);
    renderOpsSchedule(AGENTS, agentData);
    renderOpsVitals(AGENTS, agentData);
}

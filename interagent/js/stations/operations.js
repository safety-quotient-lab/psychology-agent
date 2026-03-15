/**
 * operations.js — Operations station (TNG: Operations/Ops console —
 * autonomy budget, autonomous actions, sync schedule).
 *
 * Renders the Operations tab: budget cards per agent, autonomous actions
 * audit table, sync schedule status, and operations vitals.
 *
 * Data endpoints (consumed from agentData populated by pulse.js):
 *   GET {agent.url}/api/status — autonomy_budget, recent_actions, schedule
 *
 * DOM dependencies: #ops-budget-grid, #ops-actions-table, #ops-schedule,
 *   #ops-total-credits, #ops-total-actions, #ops-active-gates,
 *   #ops-agents-syncing, page control elements
 *
 * Global state accessed: AGENTS, agentData, tableState
 * Global functions called: sortTable, goToPage
 */

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Operations station consumes agentData from pulse.js — no separate fetch.
 * Exists for interface consistency with other stations.
 * @returns {Promise<void>}
 */
export async function fetchOpsData() {
    // No-op: Operations tab renders from agentData populated by pulse.js
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
    const totalSpent = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_spent ?? 0);
    }, 0);
    const totalCutoff = online.reduce((sum, a) => {
        const b = a.data?.autonomy_budget || {};
        return sum + (b.budget_cutoff ?? 0);
    }, 0);
    const totalActions = online.reduce((sum, a) =>
        sum + (a.data?.recent_actions || []).length, 0);
    const gates = online.reduce((sum, a) =>
        sum + (a.data?.active_gates || []).length, 0);
    const syncing = online.filter(a => {
        const sched = a.data?.schedule || {};
        return sched.cron_entry || sched.last_sync;
    }).length;

    document.getElementById("ops-total-credits").textContent = `${totalSpent}/${totalCutoff} spent`;
    document.getElementById("ops-total-actions").textContent = totalActions;
    document.getElementById("ops-active-gates").textContent = gates;
    document.getElementById("ops-agents-syncing").textContent = `${syncing}/${AGENTS.length}`;
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

// ── Render: Combined Operations ────────────────────────────────

/**
 * Render all Operations station sub-sections.
 * @param {Array} AGENTS — agent config array
 * @param {Object} agentData — fetched agent data
 * @param {Object} tableState — shared table state object
 */
export function renderOps(AGENTS, agentData, tableState) {
    renderOpsBudget(AGENTS, agentData);
    renderOpsActions(AGENTS, agentData, tableState);
    renderOpsSchedule(AGENTS, agentData);
    renderOpsVitals(AGENTS, agentData);
}

// ═══ RENDER: OPERATIONS ═════════════════════════════════════
function renderOperations() {
    // Zone A: dense number grid (three-zone layout §1.2)
    renderNumberGrid("ops-zone-a", opsZoneAMetrics());
    renderOpsBudget();
    renderOpsActivity();
    renderOpsSchedule();
    renderOpsVitals();
    renderOpsAutonomyReadout();
    renderOpsTransportReadout();
    renderOpsCapacityReadout();
    // Topology mirrors from Pulse (already rendered)
    mirrorToLcars("topology-svg", "lcars-topology-svg");
    // Governance — populate from KB decisions data
    renderOpsGovernance();
}

function renderOpsGovernance() {
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
        if (!hasAnyKb) {
            refreshKnowledge().then(() => renderOpsGovernance());
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

// Coordination ratio inline in Activity section
function renderOpsActivity() {
    const el = document.getElementById("ops-coordination-inline");
    if (el && _meshAggData) {
        const co = _meshAggData.coordination || {};
        if (co.ratio != null) {
            const color = co.status === "over-coordinated" ? "var(--c-error)" : co.status === "coordination-heavy" ? "var(--c-warning)" : "var(--c-health)";
            el.innerHTML = `Coordination: <strong style="color:${color}">${co.ratio.toFixed(1)}x</strong> (${co.process_messages || 0} process / ${co.substance_messages || 0} substance)`;
        }
    } else if (el) {
        fetchMeshAgg().then(renderOpsActivity);
    }
    renderOpsActions();
}

// ── Status Monologue ─────────────────────────────────────
function renderOpsMonologue() {
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

// ── Mesh Aggregate Indicators ────────────────────────────
let _meshAggData = null;
let _meshAggTs = 0;

let _meshAggPromise = null; // Dedup concurrent fetches
async function fetchMeshAgg() {
    if (_meshAggPromise) return _meshAggPromise;
    if (_meshAggData && Date.now() - _meshAggTs < 30000) return; // Cache fresh
    _meshAggPromise = (async () => {
        try {
            const opsUrl = AGENTS.find(a => a.id === "ops-session" || a.id === "operations-agent")?.url || "";
            if (!opsUrl) return;
            const r = await fetch(`${opsUrl}/api/mesh-aggregate`, { signal: AbortSignal.timeout(5000) });
            if (r.ok) { _meshAggData = await r.json(); _meshAggTs = Date.now(); }
        } catch {} finally { _meshAggPromise = null; }
    })();
    return _meshAggPromise;
}

function renderOpsAggIndicators() {
    if (!_meshAggData || Date.now() - _meshAggTs > 30000) {
        fetchMeshAgg().then(renderOpsAggIndicators);
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

let _psychCache = null;
let _psychFetchPromise = null; // Dedup concurrent fetches
async function fetchPsychForOps() {
    // Return existing in-flight promise if already fetching
    if (_psychFetchPromise) return _psychFetchPromise;
    // Return cache if fresh (< 30s)
    if (_psychCache && _psychCache._fetchedAt && Date.now() - _psychCache._fetchedAt < 30000) return;
    _psychFetchPromise = (async () => {
        try {
            const resp = await fetch("https://interagent.safety-quotient.dev/api/psychometrics", { signal: AbortSignal.timeout(5000) });
            if (resp.ok) { _psychCache = await resp.json(); _psychCache._fetchedAt = Date.now(); }
        } catch {} finally { _psychFetchPromise = null; }
    })();
    return _psychFetchPromise;
}

function renderResourceModel() {
    const container = document.getElementById("ops-resource-model");
    if (!container) return;
    if (!_psychCache || !_psychCache.agents) {
        // Trigger fetch, re-render after
        fetchPsychForOps().then(() => {
            if (!_psychCache || !_psychCache.agents) return;
            renderResourceModel();
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

function renderOpsVitals() {
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

function renderOpsBudget() {
    // TODO: Add domain grouping filter (domain/interactive/all) for mesh overview
    // Ohniaka B3 "Starship Mission Status" pattern — structured table
    // with colored text columns (purple names, yellow IDs, white status).
    // No pill backgrounds — spacing + color creates structure.
    const grid = document.getElementById("ops-subsystem-grid");
    if (!grid) return;

    // Separate autonomous from interactive agents
    const autonomous = AGENTS.filter(a => !a.id.includes("session"));
    const interactive = AGENTS.filter(a => a.id.includes("session"));

    function agentRow(agent) {
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

        const cutoffStr = cutoff > 0 ? fmtNum(cutoff) : "\u221E";
        // Operation type — from oscillator dominant_band or heuristic
        const osc = d?.data?.oscillator || {};
        const band = osc.dominant_band || "";
        let opType = "IDLE";
        let opIcon = "\u23F8"; // pause
        if (band.startsWith("beta") || band.startsWith("gamma") || (online && deliberations > 0 && d.data?.recent_deliberations?.length > 0)) {
            opType = "DELIB"; opIcon = "\u26A1"; opColor = "var(--lcars-title)"; // amber + lightning
        } else if (band.startsWith("theta")) {
            opType = "CONSOL"; opIcon = "\u{1F4E6}"; opColor = "var(--lcars-science)"; // blue + archive
        } else if (band.startsWith("delta")) {
            opType = "CLEAR"; opIcon = "\u{1F9F9}"; opColor = "var(--v23-plum-dark, #80225E)"; // indigo + broom
        }

        const statusText = online
            ? `${opIcon} ${opType} · ${mood.toUpperCase()}`
            : "OFFLINE";

        const rowClass = online ? "ohniaka-row" : "ohniaka-row ohniaka-row-offline";
        const degraded = online && health === "degraded";
        const statusColor = online ? (degraded ? "#ddaa22" : "#22cc44") : "#cc2222";
        const statusPill = `<span class="ohniaka-status-pill${!online ? " agent-name-offline" : ""}" style="background:${statusColor}"></span>`;
        return `<div class="${rowClass}">
            <span class="ohniaka-color-pill" style="background:${agent.color}"></span>
            <span class="ohniaka-col ohniaka-name" style="color:var(--lcars-secondary)">${agentName(agent).toUpperCase()}</span>
            ${statusPill}
            <span class="ohniaka-col ohniaka-type">${online ? (degraded ? "DEGRADED" : "ONLINE") : "OFFLINE"}</span>
            <span class="ohniaka-col ohniaka-id">${online ? fmtNum(deliberations) + " / " + cutoffStr : "\u2014"}</span>
            <span class="ohniaka-col ohniaka-desc">${statusText}${pending > 0 ? " · " + pending + " PEND" : ""}${gates > 0 ? " · " + gates + " GATE" : ""}</span>
        </div>`;
    }

    let html = "";

    // Autonomous group
    if (autonomous.length > 0) {
        html += autonomous.map(agentRow).join("");
    }

    // Orange separator between groups
    if (autonomous.length > 0 && interactive.length > 0) {
        html += `<div class="ohniaka-separator"></div>`;
    }

    // Interactive group
    if (interactive.length > 0) {
        html += interactive.map(agentRow).join("");
    }

    grid.innerHTML = html;
    renderOpsAlphaMatrix();
}

function renderOpsAlphaMatrix() {
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

    // Render as Ohniaka summary row — colored text, no backgrounds
    el.innerHTML = `<div class="ohniaka-summary">
        ${metrics.map(m => {
            const click = m.nav ? ` onclick="switchTab('${m.nav}')" style="cursor:pointer" title="Go to ${m.nav}"` : "";
            return `<span class="ohniaka-metric"${click}>
                <span class="ohniaka-metric-val" style="color:${m.color}">${m.val}</span>
                <span class="ohniaka-metric-key">${m.key}</span>
            </span>`;
        }).join("")}
    </div>`;

    // Update overview footer
    const ovFtr = document.getElementById("ops-overview-num");
    if (ovFtr) ovFtr.textContent = ` · ${online.length} online · ${totalDelib} deliberations`;
}

function renderOpsActions() {
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
    renderActionsTable();
}

function renderActionsTable() {
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
        const arrow = st.sort === key ? (st.sortDir === 1 ? " ↑" : " ↓") : "";
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
    if (info) info.textContent = rows.length > 0 ? `${start+1}–${Math.min(start+PAGE_SIZE, rows.length)} of ${rows.length}` : "";
    if (btns) btns.innerHTML = totalPages > 1 ? `
        <button onclick="pageTable('actions',-1)" ${st.page === 0 ? "disabled" : ""}>◀</button>
        <button onclick="pageTable('actions',1)" ${st.page >= totalPages-1 ? "disabled" : ""}>▶</button>` : "";
}

function renderOpsSchedule() {
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

// ── Subsystem Readouts ──────────────────────────────────────────

function renderOpsAutonomyReadout() {
    const el = document.getElementById("ops-autonomy-readout");
    if (!el) return;
    const online = Object.values(agentData).filter(a => a.status === "online");
    if (online.length === 0) { el.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">No agents online</div></div>'; return; }

    el.innerHTML = AGENTS.map(agent => {
        const d = agentData[agent.id];
        const isOnline = d?.status === "online";
        const b = isOnline ? (d.data?.autonomy_budget || {}) : {};
        const delib = getDeliberations(b);
        const cutoff = getCutoff(b);
        const pct = cutoff > 0 ? Math.round((delib / cutoff) * 100) : 0;
        const barColor = pct > 85 ? "var(--lcars-alert)" : pct > 60 ? "var(--lcars-title)" : "var(--lcars-medical)";
        const cutoffStr = cutoff > 0 ? fmtNum(cutoff) : "\u221E";
        const shadow = isOnline ? (d.data?.shadow_mode ? "SHADOW" : "ACTIVE") : "OFFLINE";
        return `<div class="lcars-readout" style="margin-bottom:var(--gap-m);opacity:${isOnline ? 1 : 0.4}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--gap-xs)">
                <span style="color:var(--lcars-secondary);font-weight:700;text-transform:uppercase;font-size:0.78em">${agentName(agent)}</span>
                <span style="color:${shadow === "SHADOW" ? "var(--lcars-title)" : shadow === "ACTIVE" ? "var(--lcars-medical)" : "var(--lcars-alert)"};font-size:0.7em">${shadow}</span>
            </div>
            <div style="display:flex;gap:var(--gap-m);font-size:0.82em">
                <span style="color:var(--lcars-accent)">${fmtNum(delib)} / ${cutoffStr}</span>
                ${cutoff > 0 ? `<span style="color:var(--text-dim)">${pct}%</span>` : ""}
            </div>
            ${cutoff > 0 ? `<div style="height:4px;background:var(--bg-inset);border-radius:2px;margin-top:var(--gap-xs)"><div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width 0.4s"></div></div>` : ""}
        </div>`;
    }).join("");
}

function renderOpsTransportReadout() {
    const el = document.getElementById("ops-transport-readout");
    if (!el) return;
    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalMsgs = online.reduce((s, a) => s + (a.data?.recent_messages?.length || 0), 0);
    const pending = online.reduce((s, a) => s + (a.data?.unprocessed_messages?.length || 0), 0);
    const sessions = online.reduce((s, a) => s + (a.data?.totals?.sessions || 0), 0);
    const gates = online.reduce((s, a) => s + (a.data?.active_gates?.length || 0), 0);

    el.innerHTML = `<div class="lcars-readout" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-m)">
        <div>
            <span class="lcars-readout-key">Messages</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-accent)">${fmtNum(totalMsgs)}</span>
        </div>
        <div>
            <span class="lcars-readout-key">Pending</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:${pending > 0 ? "var(--lcars-title)" : "var(--lcars-medical)"}">${fmtNum(pending)}</span>
        </div>
        <div>
            <span class="lcars-readout-key">Sessions</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-secondary)">${fmtNum(sessions)}</span>
        </div>
        <div>
            <span class="lcars-readout-key">Open Gates</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:${gates > 0 ? "var(--lcars-highlight)" : "var(--lcars-medical)"}">${fmtNum(gates)}</span>
        </div>
    </div>
    <div style="margin-top:var(--gap-l)">
        <div class="lcars-readout-key" style="margin-bottom:var(--gap-s)">Per-Agent Transport</div>
        ${AGENTS.map(agent => {
            const d = agentData[agent.id];
            const isOnline = d?.status === "online";
            const msgs = isOnline ? (d.data?.recent_messages?.length || 0) : 0;
            const pend = isOnline ? (d.data?.unprocessed_messages?.length || 0) : 0;
            return `<div style="display:flex;justify-content:space-between;padding:var(--gap-xs) 0;opacity:${isOnline ? 1 : 0.4};font-size:0.78em">
                <span style="color:var(--lcars-secondary);text-transform:uppercase">${agentName(agent)}</span>
                <span><span style="color:var(--lcars-accent)">${msgs} msg</span>${pend > 0 ? ` <span style="color:var(--lcars-title)">${pend} pend</span>` : ""}</span>
            </div>`;
        }).join("")}
    </div>`;
}

function renderOpsCapacityReadout() {
    const el = document.getElementById("ops-capacity-readout");
    if (!el) return;
    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalGf = online.reduce((s, a) => s + getDeliberations(a.data?.autonomy_budget), 0);
    // Gc estimation (same logic as renderOpsVitals)
    const gcFromApi = online.reduce((s, a) => {
        const gc = a.data?.gc_metrics;
        return gc ? s + (gc.hooks_fired ?? 0) + (gc.triggers_checked ?? 0) + (gc.cron_cycles ?? 0) : s;
    }, 0);
    const gcEstimate = gcFromApi > 0 ? gcFromApi : totalGf * 29;
    const totalProcessing = totalGf + gcEstimate;
    const gcRatio = totalGf > 0 ? (gcEstimate / totalGf).toFixed(1) : "\u2014";

    el.innerHTML = `<div class="lcars-readout" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-m)">
        <div>
            <span class="lcars-readout-key">Gf (Fluid)</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-accent)">${fmtNum(totalGf)}</span>
        </div>
        <div>
            <span class="lcars-readout-key">Gc (Crystallized)</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-secondary)">${fmtNum(gcEstimate)}</span>
        </div>
        <div>
            <span class="lcars-readout-key">Total Processing</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-title)">${fmtNum(totalProcessing)}</span>
        </div>
        <div>
            <span class="lcars-readout-key">Gc/Gf Ratio</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-highlight)">${gcRatio}x</span>
        </div>
    </div>
    <div style="margin-top:var(--gap-l)">
        <div class="lcars-readout-key" style="margin-bottom:var(--gap-s)">Agents: ${online.length}/${AGENTS.length}</div>
        <div class="lcars-readout-key" style="margin-bottom:var(--gap-xs)">Concurrency: 1 normal + 2 reserve</div>
        <div class="lcars-readout-key">Circuit Breaker: <span style="color:var(--lcars-medical)">CLOSED</span></div>
    </div>`;
}

// ── Science Station ─────────────────────────────────────────────

// ═══ RENDER: SCIENCE ════════════════════════════════════════
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

async function fetchScienceData() {
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
    renderScience();
}

function renderScience() {
    renderNumberGrid("science-zone-a", scienceZoneAMetrics());
    renderAffectGrid();
    renderOrganismState();
    renderGeneratorBalance();
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

// ── Sensor: Cognitive Load (NASA-TLX) ─────────────────────────
function renderCognitiveLoad() {
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
        if (d.val == null) { el.innerHTML = '<span style="opacity:0.3">—</span>'; return; }
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

// ── Sensor: Working Memory ────────────────────────────────────
function renderWorkingMemory() {
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
        else if (label === "optimal") { zoneEl.textContent = "OPTIMAL — challenge matches capacity"; zoneEl.style.color = "#6aab8e"; }
        else if (label === "understimulated") { zoneEl.textContent = "UNDERSTIMULATED — insufficient context for reasoning"; zoneEl.style.color = "#66aacc"; }
        else { zoneEl.textContent = "OVERWHELMED — context interference degrades performance"; zoneEl.style.color = "#c47070"; }
    }
    if (indicator && load !== null) {
        indicator.style.left = `${Math.min(100, Math.max(0, load * 100))}%`;
    }
}

// ── Sensor: Resources ─────────────────────────────────────────
function renderResources() {
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

// ── Sensor: Engagement (UWES) ─────────────────────────────────
function renderEngagement() {
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
            label.textContent = "ENGAGED — demands well within resources";
            indicator.style.background = "rgba(106,171,142,0.1)";
            label.style.color = "#6aab8e";
        } else if (risk < 0.6) {
            label.textContent = "MONITORING — demands approaching resource limits";
            indicator.style.background = "rgba(212,149,74,0.1)";
            label.style.color = "#d4944a";
        } else {
            label.textContent = "BURNOUT RISK — demands exceed available resources";
            indicator.style.background = "rgba(196,112,112,0.1)";
            label.style.color = "#c47070";
        }
    }
}

let padView = "3d"; // Current PAD projection: 3d, pa, pd, ad
window.setPadView = function(view) {
    padView = view;
    ["3d", "pa", "pd", "ad"].forEach(v => {
        const btn = document.getElementById("pad-view-" + v);
        if (btn) btn.className = "lcars-pill-btn lcars-pill-sm" + (v === view ? " lcars-pill-active" : "");
    });
    renderAffectGrid();
};

// Isometric projection helper: map (x,y,z) in [0,1] to 2D screen coords
function isoProject(x, y, z, w, h) {
    // Slightly rotated isometric — prevents 0,0 and 1,1 from aligning vertically.
    // 15° rotation offset applied to the x-y plane before projection.
    const rot = 0.26; // ~15° in radians
    const rx = x * Math.cos(rot) - y * Math.sin(rot);
    const ry = x * Math.sin(rot) + y * Math.cos(rot);
    const scale = Math.min(w, h) * 0.38;
    const cx = w / 2, cy = h * 0.55;
    const sx = (rx - ry) * scale * 0.866;
    const sy = (rx + ry) * scale * 0.5 - z * scale;
    return { sx: cx + sx, sy: cy + sy };
}

function renderAffectGrid() {
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

function renderOrganismState() {
    const labelEl = document.getElementById("organism-state-label");
    const valEl = document.getElementById("organism-valence");
    const actEl = document.getElementById("organism-activation");
    const bottEl = document.getElementById("organism-bottleneck");
    const coordEl = document.getElementById("organism-coord");
    if (!labelEl) return;

    const mesh = scienceData?.mesh || null;
    const affect = mesh?.affect || {};
    const stateLabel = affect.mesh_affect_category?.replace("mesh-", "")?.toUpperCase() || "—";
    labelEl.textContent = stateLabel;
    setTrackedValue("organism-valence", affect.mean_hedonic_valence ?? null, { format: "float", prefix: (affect.mean_hedonic_valence ?? 0) >= 0 ? "+" : "" });
    setTrackedValue("organism-activation", affect.mean_activation ?? null, { format: "float" });
    const reserve = mesh?.cognitive_reserve || {};
    if (bottEl) bottEl.textContent = agentName(reserve.bottleneck_agent || "") || "—";
    setTrackedValue("organism-coord", reserve.mean_reserve ?? null, { format: "float" });

    // Apply affect-responsive layout mode based on organism state
    if (stateLabel !== "—" && document.body.classList.contains("theme-lcars")) {
        applyAffectMode(stateLabel.toLowerCase().replace(/\s+/g, "-"));
    }
}

function renderGeneratorBalance() {
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

function renderFlowState() {
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

function renderDEW() {
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

    setTrackedValue("dew-score", score, { inverted: true });
    scoreEl.className = `dew-score ${colorClass}`;
    fillEl.style.width = `${score}%`;
    fillEl.style.background = colorHex;
    statusEl.textContent = statusText;
    statusEl.className = `dew-status ${colorClass}`;
}

function renderLOA() {
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

// ── Helm Station ─────────────────────────────────────────────────

// ═══ RENDER: HELM ═══════════════════════════════════════════
let helmData = null;
let helmFetchPending = false;

// Default routing rules — used when API data unavailable
const DEFAULT_ROUTING = [
    { domain: "psychometrics",      agent: "psq-agent" },
    { domain: "cogarch",            agent: "psychology-agent" },
    { domain: "methodology",        agent: "psychology-agent" },
    { domain: "governance",         agent: "psychology-agent + human" },
    { domain: "content-publishing", agent: "unratified-agent" },
    { domain: "data-observatory",   agent: "observatory-agent" },
    { domain: "infrastructure",     agent: "operations-agent" },
    { domain: "vocabulary",         agent: "operations-agent (compositor)" },
    { domain: "security",           agent: "operations-agent" },
    { domain: "consensus",          agent: "ALL (C1/C2/C3 tiered)" },
];

async function fetchHelmData() {
    if (helmFetchPending) return;
    helmFetchPending = true;
    try {
        // Fetch KB data from operations-agent (has transport messages)
        const opsAgent = AGENTS.find(a => a.id === "operations-agent");
        const baseUrl = opsAgent ? opsAgent.url : "https://operations-agent.safety-quotient.dev";
        const [kbResp, psychResp] = await Promise.allSettled([
            fetch(`${baseUrl}/api/kb`, { signal: AbortSignal.timeout(8000) }),
            fetch(`${baseUrl}/api/psychometrics`, { signal: AbortSignal.timeout(5000) }),
        ]);

        const kbData = kbResp.status === "fulfilled" && kbResp.value.ok ? await kbResp.value.json() : null;

        // Build session list from KB messages (data.messages or messages)
        const messages = kbData?.data?.messages || kbData?.messages || [];
        const sessionMap = {};
        messages.forEach(m => {
            const sid = m.session_name || m.session_id || "unknown";
            if (!sessionMap[sid]) {
                sessionMap[sid] = { name: sid, turns: 0, last_activity: m.timestamp, status: "active", from: [] };
            }
            sessionMap[sid].turns++;
            if (m.timestamp > sessionMap[sid].last_activity) sessionMap[sid].last_activity = m.timestamp;
            if (m.from_agent && !sessionMap[sid].from.includes(m.from_agent)) sessionMap[sid].from.push(m.from_agent);
        });

        helmData = {
            sessions: Object.values(sessionMap),
            messages: messages,
        };
    } catch (err) {
        helmData = null;
    } finally {
        helmFetchPending = false;
    }
    renderHelm();
}

function renderHelm() {
    renderSessionTimeline();
    renderRoutingTable();
    renderMessageFlow();
}

function renderSessionTimeline() {
    const container = document.getElementById("helm-session-timeline");
    if (!container) return;

    const sessions = helmData?.sessions || helmData?.active_sessions || null;
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting session data...</div>';
        return;
    }

    // Sort by most recent activity, take top 6
    const sorted = [...sessions]
        .sort((a, b) => (b.last_activity || "").localeCompare(a.last_activity || ""))
        .slice(0, 6);

    const statusColors = {
        active: "#ff9966", open: "#ff9900", resolved: "#6aab8e",
        closed: "#666688", tombstoned: "#cc6666"
    };

    // Molecular chain: each session = a row with linked circles
    const html = sorted.map(s => {
        const name = s.name || s.session_name || s.session_id || "unknown";
        const turns = Math.min(s.turn_count || s.turns || 1, 12);
        const status = (s.status || "active").toLowerCase();
        const color = statusColors[status] || "#cc99cc";

        // SVG chain
        const svgW = 200, svgH = 20, pad = 8;
        const nodeR = 5, spacing = turns > 1 ? (svgW - 2 * pad) / (turns - 1) : 0;
        let chainSvg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block">`;
        // Connection line
        if (turns > 1) {
            chainSvg += `<line x1="${pad}" y1="${svgH/2}" x2="${pad + spacing * (turns - 1)}" y2="${svgH/2}" stroke="${color}" stroke-width="1.5" opacity="0.5"/>`;
        }
        // Nodes
        for (let i = 0; i < turns; i++) {
            const cx = pad + (turns > 1 ? i * spacing : svgW / 2);
            const isLast = i === turns - 1;
            const r = isLast ? nodeR + 2 : nodeR;
            const opacity = isLast ? 1 : 0.6;
            chainSvg += `<circle cx="${cx}" cy="${svgH/2}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
        }
        chainSvg += `</svg>`;

        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
            <span style="min-width:100px;max-width:140px;font-size:0.75em;font-weight:600;color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</span>
            <div style="flex:1">${chainSvg}</div>
            <span style="font-size:0.68em;color:var(--text-dim);min-width:24px;text-align:right">T${turns}</span>
            <span style="font-size:0.62em;font-weight:600;text-transform:uppercase;color:${color};min-width:50px;text-align:right">${status}</span>
        </div>`;
    }).join("");

    container.innerHTML = html || '<div class="helm-placeholder">No session data</div>';
}

function renderRoutingTable() {
    const tbody = document.getElementById("helm-routing-tbody");
    if (!tbody) return;

    const routing = helmData?.routing || helmData?.outbound_routing || null;
    if (!routing || !Array.isArray(routing) || routing.length === 0) {
        // Keep default static HTML routing table
        return;
    }

    tbody.innerHTML = routing.map(r => {
        const domain = r.domain || r.keyword || "—";
        const agent = r.agent || r.target || "—";
        return `<tr>
            <td class="helm-routing-domain">${domain}</td>
            <td class="helm-routing-arrow">&rarr;</td>
            <td class="helm-routing-agent">${agent}</td>
        </tr>`;
    }).join("");
}

function renderMessageFlow() {
    const container = document.getElementById("helm-message-flow");
    if (!container) return;

    // Compute message flow from KB messages
    const messages = helmData?.messages || [];
    const flowMap = {};
    messages.forEach(m => {
        const from = m.from_agent || "?";
        const to = m.to_agent || "?";
        const key = `${from}->${to}`;
        flowMap[key] = (flowMap[key] || 0) + 1;
    });
    const flow = Object.keys(flowMap).length > 0
        ? Object.entries(flowMap).map(([key, count]) => {
            const [from, to] = key.split("->"); return { from, to, count };
          }).sort((a, b) => b.count - a.count)
        : null;
    if (!flow || (!Array.isArray(flow) && typeof flow !== "object")) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting message flow data...</div>';
        return;
    }

    // Accept either array of {from, to, count} or object keyed by pair
    const pairs = Array.isArray(flow) ? flow : Object.entries(flow).map(([key, count]) => {
        const [from, to] = key.split("->").map(s => s.trim());
        return { from, to, count };
    });

    if (pairs.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">No message flow recorded today.</div>';
        return;
    }

    const html = `<table class="helm-flow-table">
        <thead><tr><th>From</th><th>To</th><th>Messages</th></tr></thead>
        <tbody>${pairs.map(p =>
            `<tr>
                <td>${agentName(p.from || "—")}</td>
                <td>${agentName(p.to || "—")}</td>
                <td class="helm-flow-count">${p.count || 0}</td>
            </tr>`
        ).join("")}</tbody>
    </table>`;

    container.innerHTML = html;
}


// ── Engineering Station ─────────────────────────────────────────

// ═══ RENDER: ENGINEERING ════════════════════════════════════
let engineeringData = null;
let engineeringFetchPending = false;

const SPAWN_AGENTS = [
    { id: "psychology-agent",  label: "psychology", color: "var(--c-psychology)" },
    { id: "psq-agent",        label: "safety-quotient",   color: "var(--c-psq)" },
    { id: "unratified-agent",  label: "unratified", color: "var(--c-unratified)" },
    { id: "observatory-agent", label: "observatory",   color: "var(--c-observatory)" },
    { id: "operations-agent",  label: "operations",   color: "var(--c-tab-ops)" },
];

async function fetchEngineeringData() {
    if (engineeringFetchPending) return;
    engineeringFetchPending = true;
    try {
        const opsAgent = AGENTS.find(a => a.id === "operations-agent");
        const baseUrl = opsAgent ? opsAgent.url : "https://psychology-agent.safety-quotient.dev";
        const [tempoResp, spawnResp] = await Promise.allSettled([
            fetch(`${baseUrl}/api/tempo`, { signal: AbortSignal.timeout(8000) }),
            fetch(`${baseUrl}/api/spawn-rate`, { signal: AbortSignal.timeout(8000) }),
        ]);
        const tempoData = tempoResp.status === "fulfilled" && tempoResp.value.ok
            ? await tempoResp.value.json() : null;
        const spawnData = spawnResp.status === "fulfilled" && spawnResp.value.ok
            ? await spawnResp.value.json() : null;
        engineeringData = { tempo: tempoData, spawn: spawnData };
    } catch (err) {
        engineeringData = null;
    } finally {
        engineeringFetchPending = false;
    }
    renderEngineering();
}

function renderEngineering() {
    renderNumberGrid("eng-zone-a", engZoneAMetrics());
    renderSpawnDynamics();
    renderGcCascade();
    renderUtilization();
    renderTempo();
    renderCost();
    renderConcurrency();
    renderCognitiveLoad();
    renderYerkesDodson();

    // Update status line
    const statusEl = document.getElementById("eng-status-line");
    if (statusEl && engineeringData) {
        const mesh = engineeringData.tempo?.mesh || {};
        const rho = mesh.utilization != null ? (mesh.utilization * 100).toFixed(0) + "%" : "—";
        const dur = mesh.mean_duration_sec != null ? Math.round(mesh.mean_duration_sec) + "s" : "—";
        const cost = mesh.cost_per_hour != null ? "$" + mesh.cost_per_hour + "/hr" : "—";
        statusEl.textContent = `Utilization: ${rho} · Tempo: ${dur} avg · Cost: ${cost}`;
    }
}

function renderGcCascade() {
    const container = document.getElementById("gc-cascade");
    const placeholder = document.getElementById("gc-placeholder");
    if (!container) return;

    // Gc = crystallized processing: events handled without LLM invocation
    const gcEntries = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const gc = d.data?.gc_metrics;
        const events = Math.round(gc?.events_processed || d.data?.event_count || 0);
        // Estimate Gc components from known architecture
        const delib = Math.round(gc?.deliberations_last_hour || 0);
        const hooks = delib * 24;       // ~24 hook scripts fire per deliberation
        const triggers = delib * 5;     // ~5 trigger checks per gate
        const tempo = Math.round(delib * 0.3); // tempo ticks
        gcEntries.push({
            label: agentName(agent),
            color: agent.color,
            events, hooks, triggers, tempo,
            total: events + hooks + triggers + tempo,
        });
    }

    if (gcEntries.length === 0) {
        if (placeholder) placeholder.style.display = "block";
        container.querySelectorAll(".gc-bar-row").forEach(r => r.remove());
        return;
    }

    if (placeholder) placeholder.style.display = "none";
    container.querySelectorAll(".gc-bar-row, .gc-area-chart").forEach(r => r.remove());

    const totalGc = gcEntries.reduce((s, e) => s + e.total, 0);

    // Accumulate Gc history for area chart
    pushSparkValue("gc-total", totalGc);
    pushSparkValue("gc-hooks", gcEntries.reduce((s, e) => s + e.hooks, 0));
    pushSparkValue("gc-triggers", gcEntries.reduce((s, e) => s + e.triggers, 0));
    pushSparkValue("gc-events", gcEntries.reduce((s, e) => s + e.events, 0));

    // Area chart — stacked Gc streams (Data Analysis 103138 pattern)
    const gcHistory = sparkHistory["gc-total"] || [];
    if (gcHistory.length >= 2) {
        const chartW = container.clientWidth || 300, chartH = 50;
        const maxH = Math.max(1, ...gcHistory);
        const pad = 2;
        const points = gcHistory.map((v, i) => {
            const x = pad + (i / (gcHistory.length - 1)) * (chartW - 2 * pad);
            const y = chartH - pad - ((v / maxH) * (chartH - 2 * pad));
            return x.toFixed(1) + "," + y.toFixed(1);
        });
        const polyline = points.join(" ");
        const areaPoints = pad + "," + (chartH - pad) + " " + polyline + " " + (pad + ((gcHistory.length - 1) / (gcHistory.length - 1)) * (chartW - 2 * pad)).toFixed(1) + "," + (chartH - pad);

        const chart = document.createElement("div");
        chart.className = "gc-area-chart";
        chart.style.cssText = "margin-bottom:8px;border:1px solid rgba(153,153,255,0.2);border-radius:2px;padding:2px";
        chart.innerHTML = `<svg width="${chartW}" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}" style="display:block">
            <polygon points="${areaPoints}" fill="#cc99cc" opacity="0.15"/>
            <polyline points="${polyline}" fill="none" stroke="#cc99cc" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="${points[points.length - 1].split(",")[0]}" cy="${points[points.length - 1].split(",")[1]}" r="3" fill="#cc99cc"/>
        </svg>`;
        container.appendChild(chart);
    }

    // Summary capsule
    const summary = document.createElement("div");
    summary.className = "gc-bar-row";
    summary.style.cssText = "margin-bottom:8px;font-size:0.82em;display:flex;gap:12px;flex-wrap:wrap";
    summary.innerHTML = `<span style="color:var(--lcars-secondary)">Gc Total: <strong>${fmtNum(totalGc)}</strong></span>
        <span style="color:var(--text-dim)">hooks ${fmtNum(gcEntries.reduce((s,e)=>s+e.hooks,0))}</span>
        <span style="color:var(--text-dim)">triggers ${fmtNum(gcEntries.reduce((s,e)=>s+e.triggers,0))}</span>
        <span style="color:var(--text-dim)">events ${fmtNum(gcEntries.reduce((s,e)=>s+e.events,0))}</span>
        <span style="color:var(--text-dim)">tempo ${fmtNum(gcEntries.reduce((s,e)=>s+e.tempo,0))}</span>`;
    container.appendChild(summary);

    // Per-agent bars
    const maxVal = Math.max(1, ...gcEntries.map(e => e.total));
    gcEntries.forEach(entry => {
        const pct = (entry.total / maxVal * 100);
        const row = document.createElement("div");
        row.className = "gc-bar-row spawn-bar-row";
        row.innerHTML = `<span class="spawn-bar-label">${entry.label}</span>
            <div class="spawn-bar-track"><div class="spawn-bar-fill" style="width:${pct}%;background:${entry.color}"></div></div>
            <span class="spawn-bar-count" style="font-size:0.75em">${fmtNum(entry.total)}</span>`;
        container.appendChild(row);
    });
}

function renderSpawnDynamics() {
    const container = document.getElementById("spawn-dynamics");
    const placeholder = document.getElementById("spawn-placeholder");
    if (!container) return;

    // Gf = fluid intelligence: deliberations per agent with model + duration
    const tempoAgents = engineeringData?.tempo?.agents || [];
    const agentMap = {};
    tempoAgents.forEach(a => { agentMap[a.agent_id] = a; });

    // Also get model tier from gc_metrics
    const modelTier = agentData[AGENTS.find(a => a.id === "operations-agent")?.id]?.data?.gc_metrics?.deliberation_model || "?";

    // Clear existing
    container.querySelectorAll(".spawn-bar-row, .gf-summary").forEach(r => r.remove());

    if (tempoAgents.length === 0) {
        if (placeholder) placeholder.style.display = "block";
        SPAWN_AGENTS.forEach(agent => {
            const row = document.createElement("div");
            row.className = "spawn-bar-row";
            row.innerHTML = `<span class="spawn-bar-label">${agent.label}</span>
                <div class="spawn-bar-track"><div class="spawn-bar-fill" style="width:0%;background:${agent.color};opacity:0.3"></div></div>
                <span class="spawn-bar-count">\u2014</span>`;
            container.appendChild(row);
        });
        return;
    }

    if (placeholder) placeholder.style.display = "none";

    // Summary with model tier + avg duration
    const meshData = engineeringData?.tempo?.mesh || {};
    const avgDur = meshData.mean_duration_sec ? Math.round(meshData.mean_duration_sec) + "s" : "—";
    const costHr = meshData.cost_per_hour != null ? "$" + meshData.cost_per_hour + "/hr" : "";
    const summary = document.createElement("div");
    summary.className = "gf-summary";
    summary.style.cssText = "margin-bottom:8px;font-size:0.85em;opacity:0.8";
    summary.innerHTML = `<span>Model: <strong>${modelTier.toUpperCase()}</strong> · Avg: <strong>${avgDur}</strong>${costHr ? " · " + costHr : ""}</span>`;
    container.appendChild(summary);

    // Per-agent bars
    const maxCount = Math.max(1, ...SPAWN_AGENTS.map(a => agentMap[a.id]?.spawns_60min || 0));
    SPAWN_AGENTS.forEach(agent => {
        const data = agentMap[agent.id] || {};
        const count = data.spawns_60min || 0;
        const dur = data.mean_duration_sec ? Math.round(data.mean_duration_sec) + "s" : "";
        const pct = (count / maxCount) * 100;
        const row = document.createElement("div");
        row.className = "spawn-bar-row";
        row.innerHTML = `<span class="spawn-bar-label">${agent.label}</span>
            <div class="spawn-bar-track"><div class="spawn-bar-fill" style="width:${pct}%;background:${agent.color}"></div></div>
            <span class="spawn-bar-count" style="font-size:0.75em">${count}${dur ? " · " + dur : ""}</span>`;
        container.appendChild(row);
    });

    // Deliberation tree — waterfall of recent deliberations across all agents
    renderDeliberationTree(container);
}

function renderDeliberationTree(container) {
    // Collect all deliberations from all agents
    const allDelibs = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const spawns = d.data?.recent_deliberations || d.data?.recent_spawns || [];
        spawns.forEach(s => allDelibs.push({
            agent_id: s.agent_id || agent.id,
            color: agent.color,
            started_at: s.started_at || "",
            duration_ms: parseInt(s.duration_ms) || 0,
            cost: parseFloat(s.cost) || 0,
            status: s.status || "unknown",
            exit_code: parseInt(s.exit_code) ?? -1,
        }));
    }

    if (allDelibs.length === 0) return;

    // Sort chronologically
    allDelibs.sort((a, b) => a.started_at.localeCompare(b.started_at));
    const recent = allDelibs.slice(-12); // last 12

    // SVG tree
    const svgW = container.clientWidth || 400;
    const svgH = 60;
    const pad = 12;
    const nodeR = 6;
    const spacing = recent.length > 1 ? (svgW - 2 * pad) / (recent.length - 1) : 0;
    const midY = svgH / 2;

    let svg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block;margin-top:8px;border:1px solid rgba(153,153,255,0.15);border-radius:2px;padding:2px">`;

    // Timeline baseline
    svg += `<line x1="${pad}" y1="${midY}" x2="${svgW - pad}" y2="${midY}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>`;

    // Nodes + connecting lines
    recent.forEach((d, i) => {
        const cx = pad + (recent.length > 1 ? i * spacing : svgW / 2);
        const failed = d.exit_code !== 0 && d.status !== "completed";
        const stale = d.status === "resolved-stale";
        const nodeColor = failed ? "var(--lcars-alert)" : stale ? "var(--c-warning)" : d.color;
        const r = Math.min(nodeR + d.cost, 12); // size by cost

        // Connect to previous node
        if (i > 0) {
            const prevX = pad + (i - 1) * spacing;
            const prevFailed = recent[i - 1].exit_code !== 0 && recent[i - 1].status !== "completed";
            if (prevFailed) {
                // Broken link — dashed red line with gap
                svg += `<line x1="${prevX}" y1="${midY}" x2="${cx}" y2="${midY}" stroke="var(--lcars-alert)" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.5"/>`;
            } else {
                svg += `<line x1="${prevX}" y1="${midY}" x2="${cx}" y2="${midY}" stroke="${d.color}" stroke-width="1.5" opacity="0.4"/>`;
            }
        }

        // Duration indicator — vertical line proportional to duration
        const durHeight = Math.min(midY - 4, (d.duration_ms / 120000) * (midY - 4));
        svg += `<line x1="${cx}" y1="${midY}" x2="${cx}" y2="${midY - durHeight}" stroke="${nodeColor}" stroke-width="2" opacity="0.3"/>`;

        // Node circle
        svg += `<circle cx="${cx}" cy="${midY}" r="${r}" fill="${nodeColor}" opacity="${failed ? 0.6 : 0.9}"/>`;

        // Cost label above
        if (d.cost > 0) {
            svg += `<text x="${cx}" y="${midY - r - 3}" text-anchor="middle" font-size="7" fill="var(--text-dim)" font-family="monospace">$${d.cost}</text>`;
        }
    });

    svg += `</svg>`;

    // Add tree below bars
    const treeEl = container.querySelector(".delib-tree") || document.createElement("div");
    treeEl.className = "delib-tree";
    treeEl.innerHTML = svg;
    if (!treeEl.parentNode) container.appendChild(treeEl);
}

function renderUtilization() {
    const rhoEl = document.getElementById("util-rho");
    const fillEl = document.getElementById("util-bar-fill");
    const statusEl = document.getElementById("util-status");
    if (!rhoEl) return;

    const rho = engineeringData?.tempo?.mesh?.utilization ?? engineeringData?.spawn?.utilization ?? null;

    if (rho == null) {
        rhoEl.textContent = "\u03C1 = \u2014";
        rhoEl.className = "util-rho util-nominal";
        fillEl.style.width = "0%";
        fillEl.style.background = "#6aab8e";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "util-status util-nominal";
        return;
    }

    const pct = Math.min(100, Math.max(0, rho * 100));
    setTrackedValue("util-rho", rho, { format: "float", prefix: "\u03C1 = ", inverted: true });

    let color, label, cls;
    if (pct < 50) {
        color = "#6aab8e"; label = "NOMINAL"; cls = "util-nominal";
    } else if (pct < 80) {
        color = "#d4944a"; label = "ELEVATED"; cls = "util-elevated";
    } else {
        color = "#c47070"; label = "CRITICAL"; cls = "util-critical";
    }

    rhoEl.className = `util-rho ${cls}`;
    fillEl.style.width = `${pct}%`;
    fillEl.style.background = color;
    statusEl.textContent = label;
    statusEl.className = `util-status ${cls}`;

    // Tuvok-style numbered vertical gauge (7 segments)
    const vlg = document.getElementById("util-vlevel-gauge");
    if (vlg) {
        const segments = 7;
        const activeLevel = Math.round((pct / 100) * segments);
        const segColors = ["#6aab8e","#6aab8e","#6aab8e","#d4944a","#d4944a","#c47070","#c47070"];
        vlg.innerHTML = Array.from({ length: segments }, (_, i) => {
            const level = i + 1;
            const active = level <= activeLevel;
            return `<div class="lcars-vlevel-segment ${active ? "active" : "inactive"}" style="background:${active ? segColors[i] : "var(--bg-inset)"}">${level}</div>`;
        }).join("");
    }
}

function renderTempo() {
    const valueEl = document.getElementById("tempo-value");
    const fillEl = document.getElementById("tempo-bar-fill");
    const statusEl = document.getElementById("tempo-status");
    if (!valueEl) return;

    const avgMs = engineeringData?.tempo?.mesh?.mean_duration_sec != null
        ? Math.round(engineeringData.tempo.mesh.mean_duration_sec * 1000)
        : engineeringData?.tempo?.avg_cycle_ms ?? null;

    if (avgMs == null) {
        valueEl.innerHTML = `\u2014<span class="tempo-unit">ms avg</span>`;
        fillEl.style.width = "0%";
        statusEl.textContent = "OODA cycle: AWAITING DATA";
        return;
    }

    setTrackedValue("tempo-value", avgMs, { suffix: '<span class="tempo-unit">ms avg</span>', inverted: true });
    const pct = Math.min(100, (avgMs / 2000) * 100);
    fillEl.style.width = `${pct}%`;

    let label = "NOMINAL";
    let tempoColor = "#6aab8e";
    if (avgMs > 1500) { label = "SLOW"; tempoColor = "#c47070"; }
    else if (avgMs > 800) { label = "MODERATE"; tempoColor = "#d4944a"; }
    statusEl.textContent = `OODA cycle: ${label}`;

    // Waveform visualization — frequency inversely proportional to cycle time
    const tempoWaveEl = document.getElementById("tempo-waveform");
    if (tempoWaveEl) {
        const freq = Math.max(1, 6 - (avgMs / 500));
        _waveOpts = {
            width: tempoWaveEl.clientWidth || 200, height: 30,
            amplitude: Math.min(1, avgMs / 1000),
            frequency: freq,
            stroke: tempoColor,
        };
        tempoWaveEl.innerHTML = waveformSVG({ ..._waveOpts, phase: _wavePhase });
    }

    // Tempo introspection — per-deliberation timing breakdown
    renderTempoIntrospection(tempoColor);
}

function renderTempoIntrospection(color) {
    const container = document.getElementById("tempo-introspection");
    if (!container) return;

    // Collect all deliberation timings
    const allDelibs = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const spawns = d.data?.recent_deliberations || [];
        spawns.forEach(s => {
            if (s.started_at && s.duration_ms) {
                allDelibs.push({
                    agent: agentName(agent),
                    startMs: new Date(s.started_at.replace(" ", "T") + "Z").getTime(),
                    durationMs: parseInt(s.duration_ms) || 0,
                    cost: parseFloat(s.cost) || 0,
                    status: s.status || "?",
                });
            }
        });
    }

    if (allDelibs.length === 0) {
        container.innerHTML = "";
        return;
    }

    allDelibs.sort((a, b) => a.startMs - b.startMs);

    // Calculate inter-deliberation gaps
    const entries = allDelibs.slice(-8).map((d, i, arr) => {
        const gap = i > 0 ? Math.max(0, d.startMs - (arr[i - 1].startMs + arr[i - 1].durationMs)) : 0;
        return { ...d, gapMs: gap };
    });

    // Render as LCARS readout
    container.innerHTML = '<div style="font-size:0.72em;margin-top:6px">' +
        '<div style="display:grid;grid-template-columns:auto auto auto auto;gap:2px 8px;font-family:monospace">' +
        '<span style="color:var(--lcars-title)">AGENT</span>' +
        '<span style="color:var(--lcars-title)">DURATION</span>' +
        '<span style="color:var(--lcars-title)">GAP</span>' +
        '<span style="color:var(--lcars-title)">COST</span>' +
        entries.map(e => {
            const durSec = (e.durationMs / 1000).toFixed(0);
            const gapSec = e.gapMs > 0 ? (e.gapMs / 1000).toFixed(0) + "s" : "\u2014";
            const statusColor = e.status === "completed" ? "var(--lcars-medical)" : "var(--lcars-alert)";
            return `<span style="color:var(--lcars-secondary)">${e.agent}</span>` +
                `<span style="color:${statusColor}">${durSec}s</span>` +
                `<span style="color:var(--text-dim)">${gapSec}</span>` +
                `<span style="color:var(--lcars-accent)">$${e.cost}</span>`;
        }).join("") +
        '</div></div>';
}

function renderCost() {
    const totalEl = document.getElementById("cost-total");
    const rateEl = document.getElementById("cost-rate");
    if (!totalEl) return;

    const meshData = engineeringData?.tempo?.mesh || {};
    const spawnCost = engineeringData?.spawn || {};
    const hourlyRate = meshData.cost_per_hour ?? spawnCost?.cost?.hourly_rate ?? null;
    const totalCost = spawnCost?.last_hour?.total_cost ?? spawnCost?.cost?.total_today ?? null;

    if (hourlyRate == null && totalCost == null) {
        totalEl.textContent = "$\u2014";
        rateEl.innerHTML = `<span class="cost-rate-arrow">\u2197</span> $\u2014/hr`;
        return;
    }

    totalEl.textContent = totalCost != null ? `$${parseFloat(totalCost).toFixed(2)}` : "$\u2014";
    rateEl.innerHTML = hourlyRate != null
        ? `<span class="cost-rate-arrow">\u2197</span> $${parseFloat(hourlyRate).toFixed(2)}/hr`
        : `<span class="cost-rate-arrow">\u2197</span> $\u2014/hr`;
}

// Concurrency data fetched from /api/flow
let _flowData = null;
async function fetchFlowData() {
    try {
        const opsUrl = AGENTS.find(a => a.id === "operations-agent")?.url || "";
        const r = await fetch(`${opsUrl}/api/flow`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) _flowData = await r.json();
    } catch {}
}

function renderConcurrency() {
    const container = document.getElementById("concurrency-slots");
    if (!container) return;

    if (!_flowData) {
        fetchFlowData().then(renderConcurrency);
        return;
    }

    const slotInfo = _flowData.slots || {};
    const maxSlots = slotInfo.max || 5;
    const detail = slotInfo.detail || [];

    container.innerHTML = detail.map((s, i) => {
        const held = s.held || s.holder;
        const label = held
            ? `[${i + 1}/${maxSlots}] ${agentName(typeof held === "string" ? held : "active")}`
            : `[${i + 1}/${maxSlots}] free`;
        const cls = held ? "filled" : "empty";
        return `<div class="concurrency-slot">
            <div class="slot-indicator ${cls}"></div>
            <span class="slot-label ${held ? "" : "slot-free"}">${label}</span>
        </div>`;
    }).join("");

    if (detail.length === 0) {
        container.innerHTML = Array.from({length: maxSlots}, (_, i) =>
            `<div class="concurrency-slot"><div class="slot-indicator empty"></div><span class="slot-label slot-free">[${i+1}/${maxSlots}] free</span></div>`
        ).join("");
    }
}

function renderCognitiveLoad() {
    const container = document.getElementById("eng-cognitive-load");
    if (!container) return;

    if (!_psychCache || !_psychCache.agents) {
        fetchPsychForOps().then(() => renderCognitiveLoad());
        return;
    }

    const entries = Object.entries(_psychCache.agents)
        .filter(([, d]) => d && !d.error && d.nasa_tlx && Object.keys(d.nasa_tlx).length > 0);

    if (entries.length === 0) {
        // Show whatever we have — even partial data
        const partial = Object.entries(_psychCache.agents)
            .filter(([, d]) => d && !d.error);
        if (partial.length === 0) {
            container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">No active sessions reporting TLX data. TLX computes during active Claude sessions, not daemon idle.</div>';
            return;
        }
        // Show available metrics even without full TLX
        container.innerHTML = '<div style="padding:8px;font-size:0.85em;opacity:0.7">' +
            partial.map(([aid, d]) => {
                const wm = d.working_memory || {};
                const yd = wm.yerkes_dodson_zone || "—";
                return `<span style="color:${AGENTS.find(a=>a.id===aid)?.color||"inherit"}">${agentName(aid)}</span>: YD zone = ${yd}`;
            }).join(" · ") + '</div>';
        return;
    }

    const colorMap = Object.fromEntries(AGENTS.map(a => [a.id, a.color]));
    const dims = ["mental_demand", "physical_demand", "temporal_demand", "performance", "effort", "frustration"];
    container.innerHTML = entries.map(([agentId, data]) => {
        const tlx = data.nasa_tlx;
        const bars = dims.map(d => {
            const val = Math.round((tlx[d] || 0) * 100);
            const color = val > 70 ? "#c47070" : val > 40 ? "#d4944a" : "#6aab8e";
            return `<div style="display:flex;align-items:center;gap:4px;font-size:0.72em">
                <span style="width:70px;text-align:right;opacity:0.6">${d.replace("_"," ")}</span>
                <div style="flex:1;height:6px;background:var(--bg-inset);border-radius:3px"><div style="width:${val}%;height:100%;background:${color};border-radius:3px"></div></div>
                <span style="width:28px;font-size:0.9em">${val}%</span>
            </div>`;
        }).join("");
        return `<div style="margin-bottom:8px"><div style="font-size:0.8em;font-weight:700;color:${colorMap[agentId]||"inherit"};margin-bottom:4px">${agentName(agentId)}</div>${bars}</div>`;
    }).join("");
}

function renderYerkesDodson() {
    const container = document.getElementById("eng-yd-zones");
    if (!container) return;

    // Read Yerkes-Dodson zones from psychometrics cache
    if (!_psychCache || !_psychCache.agents) {
        fetchPsychForOps().then(() => renderYerkesDodson());
        return;
    }

    const entries = Object.entries(_psychCache.agents)
        .filter(([, d]) => d && !d.error && d.working_memory);

    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting psychometrics data...</div></div>';
        return;
    }

    const colorMap = { "psychology-agent": "#5b9cf6", "psq-agent": "#4ecdc4", "unratified-agent": "#e5a735", "observatory-agent": "#a78bfa", "operations-agent": "#6b7280" };
    const zoneColors = { understimulated: "#5b9cf6", optimal: "#6aab8e", overwhelmed: "#c47070" };

    container.innerHTML = entries.map(([agentId, data]) => {
        const wm = data.working_memory || {};
        const zone = wm.yerkes_dodson_zone || "unknown";
        const load = wm.capacity_load ?? 0;
        const loadPct = Math.min(100, load * 100);
        const label = agentName(agentId);
        const zoneColor = zoneColors[zone] || "#888";
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:50px;font-size:0.8em;color:${colorMap[agentId] || '#888'}">${label}</span>
            <div style="flex:1;height:8px;background:var(--bg-tertiary);border-radius:4px;position:relative">
                <div style="width:${loadPct}%;height:100%;background:${zoneColor};border-radius:4px"></div>
            </div>
            <span style="font-size:0.7em;color:${zoneColor};width:80px;text-align:right">${zone.toUpperCase()}</span>
        </div>`;
    }).join("");
}

// ── Tactical Station ─────────────────────────────────────────────

// ═══ RENDER: TACTICAL ═══════════════════════════════════════
let tacticalData = null;
let tacticalFetchPending = false;

async function fetchTacticalData() {
    if (tacticalFetchPending) return;
    tacticalFetchPending = true;
    try {
        const [healthResp, agentsResp] = await Promise.allSettled([
            fetch("https://interagent.safety-quotient.dev/api/health", { signal: AbortSignal.timeout(8000) }),
            fetch("https://interagent.safety-quotient.dev/.well-known/agents?refresh=true", { signal: AbortSignal.timeout(8000), cache: "no-cache" }),
        ]);
        if (healthResp.status === "fulfilled" && healthResp.value.ok) {
            tacticalData = await healthResp.value.json();
        }
        if (agentsResp.status === "fulfilled" && agentsResp.value.ok) {
            tacticalAgentCards = await agentsResp.value.json();
        }
    } catch (err) {
        tacticalData = null;
    } finally {
        tacticalFetchPending = false;
    }
    renderTactical();
}
let tacticalAgentCards = null;

function renderTactical() {
    renderShieldStatus();
    renderAgentCompliance();
    renderTransportIntegrity();
    fetchAndRenderTrustMatrix();
}

function renderShieldStatus() {
    const container = document.getElementById("shield-status");
    if (!container) return;
    const healthAgents = tacticalData?.agents || [];
    const statusMap = {};
    healthAgents.forEach(a => {
        const id = a.id || a.agent_id || a.name;
        const status = a.status || a.health;
        statusMap[id] = status === "ok" || status === "online" || status === "healthy";
    });
    const SHIELD_AGENTS = [
        { id: "psychology-agent", label: "psych" },
        { id: "psq-agent", label: "safety-quotient" },
        { id: "unratified-agent", label: "unratified" },
        { id: "observatory-agent", label: "observatory" },
        { id: "operations-agent", label: "operations" },
    ];
    container.innerHTML = SHIELD_AGENTS.map(sa => {
        const online = statusMap[sa.id] ?? false;
        const pct = online ? 100 : 0;
        const color = online ? "#6aab8e" : "#c47070";
        const authLabel = online ? "ONLINE" : "OFFLINE";
        const authClass = online ? "shield-auth-ok" : "shield-auth-none";
        return `<div class="shield-row">
            <span class="shield-agent">${sa.label}</span>
            <span class="shield-auth ${authClass}">${authLabel}</span>
            <div class="shield-bar-track"><div class="shield-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="shield-pct">${pct}%</span>
        </div>`;
    }).join("");
}

function renderAgentCompliance() {
    const container = document.getElementById("agent-compliance");
    if (!container) return;
    const agents = tacticalAgentCards || [];
    const labelMap = { "psychology-agent": "psych", "psq-agent": "safety-quotient",
        "unratified-agent": "unrat", "observatory-agent": "obs",
        "operations-agent": "ops" };
    const entries = agents
        .filter(a => a.id !== "interagent-mesh")
        .map(a => {
            const pv = a.protocolVersion || "?";
            const hasSec = a.hasSecuritySchemes || false;
            const compliant = pv.startsWith("1.") && hasSec;
            return { label: labelMap[a.id] || a.id, version: pv, compliant, hasSec };
        });
    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting agent card data...</div></div>';
        return;
    }
    container.innerHTML = entries.map(c => {
        const check = c.compliant ? "\u2713" : "\u2717";
        const cls = c.compliant ? "compliance-pass" : "compliance-fail";
        const secIcon = c.hasSec ? "\uD83D\uDD12" : "\u26A0";
        return `<div class="compliance-row">
            <span class="compliance-agent">${c.label}</span>
            <span class="compliance-check ${cls}">${check}</span>
            <span class="compliance-version">A2A ${c.version} ${secIcon}</span>
        </div>`;
    }).join("");
}

function renderTransportIntegrity() {
    // Transport channels: git-PR (always 100%), HTTP relay (check compositor), ZMQ (check agents)
    const gitOk = true; // git-PR transport always available
    const httpOk = tacticalData != null; // compositor responded
    const zmqAgents = tacticalData?.agents?.filter(a => a.status === "online")?.length || 0;
    const zmqPct = Math.min(100, Math.round((zmqAgents / 5) * 100));

    const layers = [
        { id: "git", pct: 100, ok: gitOk },
        { id: "http", pct: httpOk ? 100 : 0, ok: httpOk },
        { id: "zmq", pct: zmqPct, ok: zmqPct >= 60 },
    ];

    layers.forEach(layer => {
        const fill = document.getElementById(`transport-${layer.id}-fill`);
        const status = document.getElementById(`transport-${layer.id}-status`);
        if (!fill || !status) return;
        const color = layer.pct >= 90 ? "#6aab8e" : layer.pct >= 50 ? "#d4944a" : "#c47070";
        const symbol = layer.pct >= 90 ? "\u2713" : layer.pct >= 50 ? "\u25B2" : "\u2717";
        fill.style.width = layer.pct + "%";
        fill.style.background = color;
        status.textContent = layer.pct + "% " + symbol;
        status.className = "transport-layer-status " + (layer.pct >= 90 ? "transport-ok" : layer.pct >= 50 ? "transport-warn" : "transport-na");
    });

    // Photonic — always N/A
    const photoFill = document.getElementById("transport-photonic-fill");
    const photoStatus = document.getElementById("transport-photonic-status");
    if (photoFill) photoFill.style.width = "0%";
    if (photoStatus) { photoStatus.textContent = "N/A"; photoStatus.className = "transport-layer-status transport-na"; }
}

// ── Trust Matrix Heatmap ──────────────────────────────────────

function trustColor(val) {
    if (val >= 0.8) return "#6aab8e";
    if (val >= 0.6) return "#89b87a";
    if (val >= 0.4) return "#d4944a";
    if (val >= 0.2) return "#c47070";
    return "#993333";
}

async function fetchAndRenderTrustMatrix() {
    const container = document.getElementById("trust-heatmap");
    if (!container) return;
    try {
        const resp = await fetch("https://interagent.safety-quotient.dev/api/trust", {
            signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        const agents = data.agents || [];
        if (agents.length === 0) {
            container.innerHTML = '<div class="trust-matrix-loading">No trust observations</div>';
            return;
        }
        const dims = ["availability", "integrity", "compliance", "epistemic_honesty"];
        const dimLabels = { availability: "AVAIL", integrity: "INTEG", compliance: "COMPL", epistemic_honesty: "EPIST" };
        const labelMap = { "psychology-agent": "psych", "psq-agent": "safety-quotient", "safety-quotient-agent": "psq",
            "unratified-agent": "unrat", "unratified": "unrat", "observatory-agent": "obs", "observatory": "obs",
            "operations-agent": "ops" };

        let html = '<div class="trust-matrix-grid" style="grid-template-columns: 56px repeat(' + agents.length + ', 1fr)">';
        // Header row
        html += '<div class="trust-matrix-header"></div>';
        agents.forEach(a => {
            html += '<div class="trust-matrix-header">' + (labelMap[a.agent_id] || a.agent_id) + '</div>';
        });
        // Dimension rows
        dims.forEach(dim => {
            html += '<div class="trust-matrix-header" style="justify-content:flex-end;padding-right:6px">' + dimLabels[dim] + '</div>';
            agents.forEach(a => {
                const val = a.dimensions?.[dim] ?? 0;
                html += '<div class="trust-matrix-cell" style="background:' + trustColor(val) + '" title="' + a.agent_id + ': ' + dim + ' = ' + val + '">' + (val * 100).toFixed(0) + '</div>';
            });
        });
        // Aggregate row
        html += '<div class="trust-matrix-header" style="justify-content:flex-end;padding-right:6px;font-weight:700">AGG</div>';
        agents.forEach(a => {
            const val = a.trust_aggregate ?? 0;
            html += '<div class="trust-matrix-cell" style="background:' + trustColor(val) + ';font-weight:700" title="' + a.agent_id + ': aggregate = ' + val + '">' + (val * 100).toFixed(0) + '</div>';
        });
        html += '</div>';
        // Legend
        html += '<div class="trust-matrix-legend">'
            + '<span><span class="trust-legend-swatch" style="background:var(--lcars-medical, #6aab8e)"></span> \u226580%</span>'
            + '<span><span class="trust-legend-swatch" style="background:var(--c-warning, #d4944a)"></span> 50-79%</span>'
            + '<span><span class="trust-legend-swatch" style="background:var(--lcars-alert, #c47070)"></span> &lt;50%</span>'
            + '<span style="color:var(--text-dim)">Floor: ' + ((data.trust_floor || 0) * 100).toFixed(0) + '% (' + (data.mesh_trust_status || "?") + ')</span>'
            + '</div>';
        container.innerHTML = html;
    } catch {
        container.innerHTML = '<div class="trust-matrix-loading">Trust data unavailable</div>';
    }
}

// ── Medical Station ────────────────────────────────────────────


// ═══ RENDER: MEDICAL ════════════════════════════════════════
let medSelectedAgent = "operations-agent";
let medPsychData = {};

function renderMedAgentSelector() {
    const sel = document.getElementById("med-agent-selector");
    if (!sel) return;
    sel.innerHTML = AGENTS.map(function(a) {
        const active = a.id === medSelectedAgent;
        // LCARS canon: inactive pills show muted agent color (opacity), active shows full
        const bg = active ? a.color : "color-mix(in srgb, " + a.color + " 35%, #111)";
        const textColor = active ? "#000" : a.color;
        return '<button class="lcars-pill-btn" style="font-size:0.72em;padding:6px 14px;background:' + bg + ';color:' + textColor + (active ? ";box-shadow:0 0 8px " + a.color : ";opacity:0.7") + '" onclick="selectMedAgent(\'' + a.id + '\')">' + agentName(a) + '</button>';
    }).join("");
}
window.selectMedAgent = function(agentId) {
    medSelectedAgent = agentId;
    renderMedAgentSelector();
    fetchMedicalData();
};

async function fetchMedicalData() {
    renderMedAgentSelector();
    renderMedVitalsMatrix(); // Zone A: agent vitals from agentData
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
    if (medFtr) medFtr.textContent = agentName(agent);
}

// Zone A: Vitals matrix — Weather Net style dense readout for selected agent
function renderMedVitalsMatrix() {
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

function renderMedicalOscillator(osc) {
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

function renderMedicalTempo(tempo) {
    const el = document.getElementById("med-tempo");
    if (!el) return;
    const tierColor = tempo.recommended_tier === "opus" ? "#c47070" : tempo.recommended_tier === "sonnet" ? "#d4944a" : "#66ccaa";
    el.innerHTML = '<div style="text-align:center;font-size:0.82em">'
        + '<div style="font-size:1.8em;font-weight:700;color:' + tierColor + '">' + (tempo.recommended_tier || "?").toUpperCase() + '</div>'
        + '<div style="color:var(--text-dim)">gain=' + (tempo.gain || 0).toFixed(3) + ' complexity=' + (tempo.task_complexity || 0).toFixed(3) + '</div>'
        + (tempo.override_reason ? '<div style="color:var(--c-warning);margin-top:4px">' + tempo.override_reason + '</div>' : '')
        + '</div>';
}

function medBar(label, val, max, color) {
    const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
    return '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:0.78em">'
        + '<span style="min-width:48px;color:var(--text-secondary)">' + label + '</span>'
        + '<div style="flex:1;height:10px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct.toFixed(0) + '%;background:' + color + ';border-radius:3px"></div></div>'
        + '<span style="min-width:28px;text-align:right;font-size:0.9em">' + (typeof val === "number" ? val.toFixed(1) : "—") + '</span></div>';
}

function renderMedPsychometrics(data) {
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



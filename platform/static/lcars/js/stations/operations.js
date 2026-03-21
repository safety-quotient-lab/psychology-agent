// ═══ RENDER: OPERATIONS ═════════════════════════════════════
function renderOperations() {
    // Symmetric capsule bars (Ohniaka A1 §5.4)
    renderOpsCapsuleBars();
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
    const el = document.getElementById("ops-governance-decisions");
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
        el.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">No governance data</div>';
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
    const govFtr = document.getElementById("ops-governance-footer-num");
    if (govFtr) govFtr.textContent = decisions.length;
}

// Coordination ratio inline in Activity section
function renderOpsActivity() {
    const el = document.getElementById("ops-deliberations-coordination");
    if (el && _meshAggData) {
        const co = _meshAggData.coordination || {};
        if (co.ratio != null) {
            const color = co.status === "over-coordinated" ? "var(--c-error)" : co.status === "coordination-heavy" ? "var(--c-warning)" : "var(--c-health)";
            el.innerHTML = `Coordination: <strong style="color:${color}">${co.ratio.toFixed(1)}x</strong> (${co.process_messages || 0} process / ${co.substance_messages || 0} substance)`;
        }
    } else if (el) {
        fetchMeshAgg(); // fire once — no recursive retry
    }
    renderOpsActions();
}

// ── Status Monologue ─────────────────────────────────────
function renderOpsMonologue() {
    const el = document.getElementById("ops-pulse-monologue");
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
        .replace(/(\d+\/\d+|\d+%|\d+ of \d+)/g, '<span style="color:var(--lcars-readout);font-weight:700">$1</span>')
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
            // mesh-aggregate served same-origin
            const r = await fetch("/api/mesh-aggregate", { signal: AbortSignal.timeout(5000) });
            if (r.ok) { _meshAggData = await r.json(); _meshAggTs = Date.now(); }
        } catch {} finally { _meshAggPromise = null; }
    })();
    return _meshAggPromise;
}

function renderOpsAggIndicators() {
    if (!_meshAggData || Date.now() - _meshAggTs > 30000) {
        fetchMeshAgg(); // fire once — no recursive retry
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
            const resp = await fetch("/api/psychometrics", { signal: AbortSignal.timeout(5000) });
            if (resp.ok) { _psychCache = await resp.json(); _psychCache._fetchedAt = Date.now(); }
        } catch {} finally { _psychFetchPromise = null; }
    })();
    return _psychFetchPromise;
}

function renderResourceModel() {
    const container = document.getElementById("ops-resources-psychometric");
    if (!container) return;
    if (!_psychCache) {
        fetchPsychForOps(); // fire once — no recursive retry
        container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Loading...</div>';
        return;
    }
    if (!_psychCache.agents) {
        container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Resource data available via compositor</div>';
        return;
    }
    const entries = Object.entries(_psychCache.agents).filter(([, d]) => d && !d.error && d.resource_model);
    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting psychometrics data...</div></div>';
        return;
    }
    const colorMap = { "psychology-agent": "#5b9cf6", "psq-agent": "#4ecdc4", "unratified-agent": "#e5a735", "observatory-agent": "#a78bfa", "mesh": "#6b7280" };
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
    const grid = document.getElementById("ops-pulse-agents");
    if (!grid) return;


    function agentRow(agent) {
        const d = agentData[agent.id];
        const online = d?.status === "online";
        const b = online ? (d.data?.autonomy_budget || {}) : {};
        const deliberations = getDeliberations(b);
        const health = d?.data?.health || "\u2014";
        const psych = d?.data?.psychometrics || {};
        const es = psych.emotional_state || {};
        const mood = es.affect_category || "";
        const pending = online ? (d.data?.unprocessed_messages || []).length : 0;
        const gc = online ? (d.data?.gc_metrics?.gc_handled_total || 0) : 0;
        // Operation type — from oscillator dominant_band or heuristic
        const osc = d?.data?.oscillator || {};
        const band = osc.dominant_band || "";
        // Sleep/awake state from budget data
        const sleepMode = d.data?.autonomy_budget?.sleep_mode;
        const isSleeping = sleepMode === true || sleepMode === 1 || sleepMode === "1";
        const sessionActive = d.data?.session_active;
        let opType = isSleeping ? "SLEEP" : sessionActive ? "ACTIVE" : "AWAKE";
        // Mode label — text only, no icons (session 13 feedback)
        // Check recency — only show DELIB if deliberated within last 5 minutes
        const recentDelibs = d.data?.recent_deliberations || [];
        const latestTs = recentDelibs[0]?.started_at || "";
        const delibRecent = latestTs && (Date.now() - new Date(latestTs.replace(" ", "T") + "Z").getTime()) < 300000;
        if (band.startsWith("beta") || band.startsWith("gamma") || (online && delibRecent)) {
            opType = "DELIB"; opColor = "var(--lcars-title)";
        } else if (band.startsWith("theta")) {
            opType = "CONSOL"; opColor = "var(--lcars-science)";
        } else if (band.startsWith("delta")) {
            opType = "CLEAR"; opColor = "var(--v23-plum-dark, #80225E)";
        }

        const rowClass = online ? "ohniaka-row" : "ohniaka-row ohniaka-row-offline";
        // Connectivity pip (green/red)
        const connPill = `<span class="ohniaka-status-pill${!online ? " agent-name-offline" : ""}" style="background:${pipColor(online ? "online" : "offline")}"></span>`;
        const rawHealth = (health || "unknown").toLowerCase();
        const healthStr = rawHealth === "healthy" ? "NOMINAL" : rawHealth.toUpperCase();
        const hColor = online ? healthColor(rawHealth) : "var(--text-dim)";
        const moodStr = mood ? mood.toUpperCase() : "\u2014";
        const flash = online ? "" : " ohniaka-cell-offline";
        return `<div class="${rowClass}">
            <span class="ohniaka-col ohniaka-name${flash}" style="color:var(--lcars-secondary)"><span class="ohniaka-color-pill" style="background:${agent.color}"></span> ${agentName(agent).toUpperCase()}</span>
            <span class="ohniaka-col ohniaka-conn${flash}">${connPill} ${online ? "ONLINE" : "OFFLINE"}</span>
            <span class="ohniaka-col ohniaka-health${flash}" style="color:${hColor}">${online ? healthStr : "\u2014"}</span>
            <span class="ohniaka-col ohniaka-gc${flash}">${online ? delta(agent.id+"-gc", gc) + fmtNum(gc) : "\u2014"}</span>
            <span class="ohniaka-col ohniaka-gf${flash}">${online ? delta(agent.id+"-gf", deliberations) + fmtNum(deliberations) : "\u2014"}</span>
            <span class="ohniaka-col ohniaka-op${flash}">${online ? opType : "\u2014"}</span>
            <span class="ohniaka-col ohniaka-mood${flash}">${online ? moodStr : "\u2014"}</span>
            <span class="ohniaka-col ohniaka-pend${flash}">${online && pending > 0 ? pending + delta(agent.id+"-pend", pending) : "\u2014"}</span>
        </div>`;
    }

    // Header row
    let html = `<div class="ohniaka-row ohniaka-header">
        <span class="ohniaka-col">AGENT</span>
        <span class="ohniaka-col">STATUS</span>
        <span class="ohniaka-col">HEALTH</span>
        <span class="ohniaka-col ohniaka-gc">Gc</span>
        <span class="ohniaka-col ohniaka-gf">Gf</span>
        <span class="ohniaka-col">MODE</span>
        <span class="ohniaka-col">AFFECT</span>
        <span class="ohniaka-col ohniaka-pend">PEND</span>
    </div>`;

    // Group agents by domain
    const domains = {};
    for (const agent of AGENTS) {
        try {
            const domain = new URL(agent.url).hostname.split(".").slice(-2).join(".");
            if (!domains[domain]) domains[domain] = [];
            domains[domain].push(agent);
        } catch { /* skip invalid URLs */ }
    }

    const domainKeys = Object.keys(domains);
    domainKeys.forEach((domain, i) => {
        // Domain separator (full width) — except before first group
        if (i > 0) {
            html += `<div class="ohniaka-separator" style="grid-column: 1 / -1"></div>`;
        }
        // Domain label
        html += `<div class="ohniaka-domain-label" style="grid-column: 1 / -1">${domain.toUpperCase()}</div>`;
        // Agent rows in this domain
        html += domains[domain].map(agentRow).join("");
    });

    grid.innerHTML = html;

    // Mobile pill strip — rendered in parallel, shown via CSS media query
    renderMobilePills();
}

function renderMobilePills() {
    const container = document.getElementById("ops-pulse-agents-mobile");
    if (!container) return;

    // Group by domain
    const domains = {};
    for (const agent of AGENTS) {
        try {
            const domain = new URL(agent.url).hostname.split(".").slice(-2).join(".");
            if (!domains[domain]) domains[domain] = [];
            domains[domain].push(agent);
        } catch {}
    }

    // Horizontally scrollable table — same pattern as Linguistics Mesh Vocabulary
    let rows = "";
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        const online = d?.status === "online";
        const b = online ? (d.data?.autonomy_budget || {}) : {};
        const gf = getDeliberations(b);
        const gc = online ? (d.data?.gc_metrics?.gc_handled_total || 0) : 0;
        const rawHealth = (d?.data?.health || "unknown").toLowerCase();
        const healthStr = rawHealth === "healthy" ? "NOMINAL" : rawHealth.toUpperCase();
        const hColor = online ? healthColor(rawHealth) : "var(--text-dim)";
        const pending = online ? (d.data?.unprocessed_messages || []).length : 0;
        const mood = d?.data?.psychometrics?.emotional_state?.affect_category || "";
        const mSleepMode = d.data?.autonomy_budget?.sleep_mode;
        const mIsSleeping = mSleepMode === true || mSleepMode === 1 || mSleepMode === "1";
        const mSessionActive = d.data?.session_active;
        const osc = d?.data?.oscillator || {};
        const band = osc.dominant_band || "";
        const recentDelibs = d.data?.recent_deliberations || [];
        const latestTs = recentDelibs[0]?.started_at || "";
        const delibRecent = latestTs && (Date.now() - new Date(latestTs.replace(" ", "T") + "Z").getTime()) < 300000;
        let opLabel = mIsSleeping ? "SLEEP" : mSessionActive ? "ACTIVE" : "AWAKE";
        if (band.startsWith("beta") || band.startsWith("gamma") || (online && delibRecent)) { opLabel = "DELIB"; }
        else if (band.startsWith("theta")) { opLabel = "CONSOL"; }
        else if (band.startsWith("delta")) { opLabel = "CLEAR"; }
        const opacity = online ? "1" : "0.4";

        rows += `<tr style="opacity:${opacity}">
            <td><span class="chip" style="background:${agent.color}"></span>${agentName(agent).toUpperCase()}</td>
            <td style="color:${hColor}"><span class="dot" style="background:${online ? "#22cc44" : "#cc2222"}"></span>${online ? healthStr : "OFF"}</td>
            <td class="num" style="color:var(--lcars-secondary)">${delta(agent.id+"-m-gc", gc)}${fmtNum(gc)}</td>
            <td class="num" style="color:var(--lcars-readout)">${delta(agent.id+"-m-gf", gf)}${fmtNum(gf)}</td>
            <td style="color:var(--text-dim)">${online ? opLabel : "\u2014"}</td>
            <td style="color:var(--text-dim)">${online && mood ? mood.toUpperCase().replace("CALM-SATISFIED","CALM") : "\u2014"}</td>
            <td class="num" style="color:var(--lcars-title)">${pending > 0 ? pending : ""}</td>
        </tr>`;
    }

    let html = `<div class="lcars-data-table-wrap" style="--panel-accent:var(--c-tab-ops)">
        <table class="lcars-data-table">
            <thead><tr>
                <th>AGENT</th><th>HEALTH</th><th class="num">Gc</th><th class="num">Gf</th>
                <th>MODE</th><th>AFFECT</th><th class="num">PEND</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;

    container.innerHTML = html;
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
    const ovFtr = document.getElementById("ops-record-num");
    if (ovFtr) ovFtr.textContent = ` · ${online.length} online · ${totalDelib} deliberations`;
}

function renderOpsActions() {
    // Collect actions from all agents — check both recent_actions and recent_deliberations
    const allActions = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        // Try recent_actions first (old format), fallback to recent_deliberations (meshd format)
        const actions = d.data?.recent_actions || [];
        actions.forEach(a => allActions.push({ ...a, agent_id: agent.id, agent_color: agent.color }));
        // Map deliberations (recent_deliberations or legacy recent_spawns)
        const deliberations = d.data?.recent_deliberations || d.data?.recent_deliberations_legacy || [];
        deliberations.forEach(s => allActions.push({
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
    const wrap = document.getElementById("ops-deliberations-table");
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
                <td style="color:var(--lcars-readout)">${budgetDelta}</td>
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
    const el = document.getElementById("ops-resources-budget");
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
        const shadow = isOnline ? (d.data?.sleep_mode ? "SLEEP" : "ACTIVE") : "OFFLINE";
        return `<div class="lcars-readout" style="margin-bottom:var(--gap-m);opacity:${isOnline ? 1 : 0.4}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--gap-xs)">
                <span style="color:var(--lcars-secondary);font-weight:700;text-transform:uppercase;font-size:0.78em">${agentName(agent)}</span>
                <span style="color:${shadow === "SLEEP" ? "var(--lcars-title)" : shadow === "ACTIVE" ? "var(--lcars-medical)" : "var(--lcars-alert)"};font-size:0.7em">${shadow}</span>
            </div>
            <div style="display:flex;gap:var(--gap-m);font-size:0.82em">
                <span style="color:var(--lcars-readout)">${fmtNum(delib)} / ${cutoffStr}</span>
                ${cutoff > 0 ? `<span style="color:var(--text-dim)">${pct}%</span>` : ""}
            </div>
            ${cutoff > 0 ? `<div style="height:4px;background:var(--bg-inset);border-radius:2px;margin-top:var(--gap-xs)"><div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width 0.4s"></div></div>` : ""}
        </div>`;
    }).join("");
}

function renderOpsTransportReadout() {
    const el = document.getElementById("ops-transport-sessions");
    if (!el) return;
    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalMsgs = online.reduce((s, a) => s + (a.data?.recent_messages?.length || 0), 0);
    const pending = online.reduce((s, a) => s + (a.data?.unprocessed_messages?.length || 0), 0);
    const sessions = online.reduce((s, a) => s + (a.data?.totals?.sessions || 0), 0);
    const gates = online.reduce((s, a) => s + (a.data?.active_gates?.length || 0), 0);

    el.innerHTML = `<div class="lcars-readout" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-m)">
        <div>
            <span class="lcars-readout-key">Messages</span>
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-readout)">${fmtNum(totalMsgs)}</span>
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
                <span><span style="color:var(--lcars-readout)">${msgs} msg</span>${pend > 0 ? ` <span style="color:var(--lcars-title)">${pend} pend</span>` : ""}</span>
            </div>`;
        }).join("")}
    </div>`;
}

function renderOpsCapacityReadout() {
    const el = document.getElementById("ops-resources-operations");
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
            <span class="lcars-readout-val" style="font-size:1.2em;color:var(--lcars-readout)">${fmtNum(totalGf)}</span>
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

// ── Operations Record Data Grid (Button 52 pattern) ─────────────
function renderOpsCapsuleBars() {
    const grid = document.getElementById("ops-data-grid");
    if (!grid) return;

    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;
    const totalGf = online.reduce((s, a) => s + getDeliberations(a.data?.autonomy_budget), 0);
    const totalGc = online.reduce((s, a) => s + (a.data?.gc_metrics?.gc_handled_total || 0), 0);
    const pending = online.reduce((s, a) => s + (a.data?.unprocessed_messages || []).length, 0);
    const gates = online.reduce((s, a) => s + (a.data?.active_gates || []).length, 0);
    const events = online.reduce((s, a) => s + (a.data?.event_count || 0), 0);
    // Show local agent's git hash — find the first agent with a version string
    const localAgent = agentData["mesh"] || Object.values(agentData).find(a => a?.data?.version);
    const opsVersion = localAgent?.data?.version || "";
    const hashMatch = opsVersion.match(/-g([0-9a-f]{7})/);
    const vStr = hashMatch ? hashMatch[1] : opsVersion.slice(0, 7) || "—";
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const mode = (typeof sseActive !== "undefined" && sseActive) ? "LIVE" : "POLL";
    const status = online.length === total ? "NOMINAL" : "DEGRADED";

    const cell = (val, label, tier) =>
        `<div class="dg-cell${tier ? " dg-" + tier : ""}" title="${label}" onclick="this.classList.toggle('dg-show-label')"><span class="dg-val">${val}</span><span class="dg-label">${label}</span></div>`;

    const gap = '<div class="dg-gap"></div>';

    grid.innerHTML = [
        // Group 1: System identity
        cell(vStr, "BUILD", "t2"),
        cell(mode, "LINK", ""),
        cell(now, "TIME", "t2"),
        cell(`${online.length}/${total}`, "AGENTS", "accent"),
        gap,
        // Group 2: Gc/Gf metrics
        cell(fmtNum(totalGc), "Gc", "t2"),
        cell(fmtNum(totalGf), "Gf", ""),
        cell(fmtNum(events), "EVENTS", "t3"),
        gap,
        // Group 3: Status + throttle
        cell(status, "STATUS", "frame"),
        (() => {
            const ss = (agentData["mesh"])?.data?.deliberation_status;
            if (!ss) return "";
            const slotStr = `${ss.active}/${ss.max}`;
            const tier = ss.active > 0 ? "accent" : (ss.reserve_unlocked ? "t3" : "");
            return cell(slotStr + (ss.holder ? " " + ss.holder.split("-")[0].toUpperCase() : ""), "DELIB", tier);
        })(),
        pending > 0 ? cell(pending, "PENDING", "accent") : "",
        gates > 0 ? cell(gates, "GATES", "accent") : "",
    ].join("");
}

// ── Science Station ─────────────────────────────────────────────


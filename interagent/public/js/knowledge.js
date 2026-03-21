// ═══ RENDER: KNOWLEDGE ══════════════════════════════════════
// KB fetch — same-origin from whichever meshd serves this dashboard
async function fetchLocalKB() {
    try {
        const resp = await fetch("/api/kb", { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return { status: "ok", data: await resp.json() };
    } catch (err) {
        return { status: "error", error: err.message };
    }
}

async function fetchLocalDict() {
    try {
        const resp = await fetch("/api/kb?section=dictionary", { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return { status: "ok", data: await resp.json() };
    } catch (err) {
        return { status: "error", error: err.message };
    }
}

async function refreshKnowledge() {
    const [kbResult, dictResult] = await Promise.allSettled([fetchLocalKB(), fetchLocalDict()]);

    // Share local KB result across all agents
    const kbVal = kbResult.status === "fulfilled" ? kbResult.value : { status: "error" };
    const dictVal = dictResult.status === "fulfilled" ? dictResult.value : { status: "error" };
    for (const agent of AGENTS) {
        kbData[agent.id] = { id: agent.id, ...kbVal };
        dictData[agent.id] = { id: agent.id, ...dictVal };
    }

    buildAcronymMap();
    renderKnowledge();
}

function renderKnowledge() {
    // Clear cached data so re-fetches pick up fresh data
    tableState.decisions.data = [];
    tableState.triggers.data = [];
    tableState.catalog.data = [];
    tableState.schema.data = [];
    tableState.messages.data = [];
    tableState.claims.data = [];
    tableState.chains.data = [];
    tableState.facts.data = [];
    tableState.lessons.data = [];
    tableState.flags.data = [];
    // Meta tab
    renderKBVitals();
    renderMessages();
    renderMemoryTopics();
    renderEpistemicDebt();
    renderEpistemicFlags();
    renderDecisions();
    renderTriggers();
    // Knowledge tab
    renderKBTabVitals();
    renderClaims();
    renderChains();
    renderFacts();
    renderDictionary();
    renderCatalog();
    renderSchema();
    // Wisdom tab
    renderLessons();

    // Mirror to LCARS-only panels
    mirrorToLcars("ops-decisions-table", "ops-governance-decisions");
    mirrorToLcars("ops-triggers-table", "lcars-ops-triggers");
    mirrorToLcars("kb-claims", "lcars-sci-claims");
    mirrorToLcars("epistemic-debt-panel", "lcars-sci-debt");
    // lcars-sci-vocab now rendered directly by Linguistics subsystem (science.js)
    mirrorToLcars("kb-lessons", "lcars-sci-lessons");
    // lcars-sci-catalog now rendered directly by Ontology subsystem (science.js)
    mirrorToLcars("messages-table", "lcars-helm-messages");
}

// ── KB Vitals ────────────────────────────────────────────────
function renderKBVitals() {
    let decisions = 0, triggers = 0, catalog = 0, memory = 0, stale = 0;
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);
    for (const agent of agents) {
        const kb = kbData[agent.id];
        if (kb?.status !== "ok") continue;
        const t = kb.data?.totals || {};
        decisions += t.decisions || 0;
        triggers += t.triggers || 0;
        catalog += t.catalog_entries || 0;
        memory += t.memory_entries || 0;
        stale += t.stale_entries || 0;
    }
    document.getElementById("kb-decisions-count").textContent = decisions;
    document.getElementById("kb-triggers-count").textContent = triggers;
    document.getElementById("kb-catalog-count").textContent = catalog;
    document.getElementById("kb-memory-count").textContent = memory;
    const staleEl = document.getElementById("kb-stale-count");
    staleEl.textContent = stale;
    staleEl.style.color = stale > 10 ? "var(--c-alert)" : stale > 0 ? "var(--c-knowledge)" : "";
}

// ── Decisions Table ──────────────────────────────────────────
function renderDecisions() {
    const container = document.getElementById("kb-decisions");

    // Collect data (only on first render or refresh)
    if (tableState.decisions.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.decisions || []).forEach(d => {
                tableState.decisions.data.push({ ...d, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.decisions.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No decisions available. Decisions populate when agents resolve architecture questions via their decision chain.</div>`;
        renderPageControls("decisions", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("decisions", allRows, {
        decided_date: r => parseTS(r.created_at || r.decided_date),
        confidence: r => r.confidence != null ? parseFloat(r.confidence) : -1,
        decision_key: r => r.decision_key || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("decisions", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("decisions", "_agent", "Agent")}
                ${sortHeader("decisions", "decision_key", "Key")}
                <th>Decision</th>
                ${sortHeader("decisions", "decided_date", "Date")}
                ${sortHeader("decisions", "confidence", "Conf")}
            </tr></thead>
            <tbody>${display.map(d => {
                const conf = d.confidence != null ? parseFloat(d.confidence) : null;
                const confClass = conf != null ? (conf >= 0.8 ? "confidence-high" : conf >= 0.5 ? "confidence-mid" : "confidence-low") : "";
                const confText = conf != null ? conf.toFixed(2) : "—";
                const dateShort = formatTS(d.created_at || d.decided_date);
                const fullText = d.decision_text || "—";
                const truncated = fullText.length > 120;
                const text = truncated ? fullText.substring(0, 120) + "…" : fullText;
                const rowId = "dec-" + (d.decision_key || "").replace(/[^a-z0-9-]/gi, "") + "-" + d._agent;
                return `<tr class="${truncated ? "expandable-row" : ""}" ${truncated ? `onclick="toggleDecisionRow('${rowId}')"` : ""}>
                    <td><span class="agent-dot" data-agent="${d._agent}"></span>${agentName(d._agent)}</td>
                    <td style="color:var(--c-knowledge);white-space:nowrap">${d.decision_key || "—"}</td>
                    <td>${annotateAcronyms(escapeHtml(text))}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                    <td><span class="confidence-badge ${confClass}">${confText}</span></td>
                </tr>${truncated ? `<tr id="${rowId}" class="expanded-detail-row" style="display:none"><td colspan="5"><div class="expanded-detail">${annotateAcronyms(escapeHtml(fullText))}</div></td></tr>` : ""}`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Triggers Table ───────────────────────────────────────────
function renderTriggers() {
    const container = document.getElementById("kb-triggers");

    if (tableState.triggers.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.triggers || []).forEach(t => {
                tableState.triggers.data.push({ ...t, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.triggers.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No triggers available. Each agent's cognitive triggers appear after bootstrap_state_db.py populates the trigger_state table.</div>`;
        renderPageControls("triggers", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("triggers", allRows, {
        fire_count: r => r.fire_count || 0,
        relevance_score: r => r.relevance_score != null ? parseFloat(r.relevance_score) : -1,
        trigger_id: r => r.trigger_id || "",
        last_fired: r => parseTS(r.last_fired),
        _agent: r => r._agent || "",
    });

    renderPageControls("triggers", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("triggers", "_agent", "Agent")}
                ${sortHeader("triggers", "trigger_id", "Trigger")}
                <th>Description</th>
                ${sortHeader("triggers", "fire_count", "Fires")}
                ${sortHeader("triggers", "last_fired", "Last Fired")}
                ${sortHeader("triggers", "relevance_score", "Relevance")}
            </tr></thead>
            <tbody>${display.map(t => {
                const lastFired = t.last_fired ? formatTS(t.last_fired) : "never";
                const rel = t.relevance_score != null ? parseFloat(t.relevance_score).toFixed(2) : "—";
                const desc = (t.description || "").length > 80
                    ? t.description.substring(0, 80) + "…"
                    : (t.description || "—");
                return `<tr>
                    <td><span class="agent-dot" data-agent="${t._agent}"></span>${agentName(t._agent)}</td>
                    <td style="color:var(--c-epistemic);white-space:nowrap">${t.trigger_id || "—"}</td>
                    <td>${annotateAcronyms(escapeHtml(desc))}</td>
                    <td style="text-align:center">${t.fire_count || 0}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${lastFired}</td>
                    <td style="text-align:center">${rel}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Dictionary Cards ─────────────────────────────────────────
function renderDictionary() {
    allDictTerms = [];

    for (const agent of AGENTS) {
        const dd = dictData[agent.id];
        if (dd?.status !== "ok") continue;
        const vocab = dd.data || {};
        const terms = vocab["@graph"] || vocab.hasDefinedTerm || [];
        terms.forEach(term => {
            const existing = allDictTerms.find(t => t.name === term.name);
            if (existing) {
                if (!existing._agents.includes(agent.id)) existing._agents.push(agent.id);
                return;
            }
            allDictTerms.push({
                name: term.name || term.termCode || "—",
                description: term.description || "",
                termCode: term.termCode || "",
                inDefinedTermSet: term.inDefinedTermSet || "",
                _agents: [agent.id],
            });
        });
    }

    allDictTerms.sort((a, b) => a.name.localeCompare(b.name));
    renderDictionaryFiltered("");
}

function renderDictionaryFiltered(filter) {
    const container = document.getElementById("kb-dictionary");
    const infoEl = document.getElementById("page-info-dictionary");

    if (allDictTerms.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No vocabulary terms available. Dictionary terms come from each agent's defined_terms table.</div>`;
        if (infoEl) infoEl.textContent = "";
        return;
    }

    let pool = allDictTerms;
    if (activeAgentFilter !== "all") {
        pool = pool.filter(t => t._agents.includes(activeAgentFilter));
    }
    const filtered = filter
        ? pool.filter(t =>
            t.name.toLowerCase().includes(filter) ||
            t.description.toLowerCase().includes(filter) ||
            t.termCode.toLowerCase().includes(filter))
        : pool;

    if (infoEl) {
        infoEl.textContent = filter || activeAgentFilter !== "all"
            ? `${filtered.length} of ${allDictTerms.length} terms`
            : `${allDictTerms.length} terms`;
    }

    container.innerHTML = filtered.map(t => {
        const desc = t.description.length > 140
            ? t.description.substring(0, 140) + "…"
            : t.description;
        const source = t.inDefinedTermSet || "project";
        const agentDots = t._agents.map(a =>
            `<span class="agent-dot" data-agent="${a}" title="${a}"></span>`
        ).join("");
        return `<div class="dict-card">
            <div class="dict-term">${escapeHtml(t.name)}</div>
            <div class="dict-desc">${escapeHtml(desc)}</div>
            <div class="dict-meta">
                ${t.termCode ? `<span class="dict-source">${escapeHtml(t.termCode)}</span>` : ""}
                <span class="dict-source">${escapeHtml(source)}</span>
                <span>${agentDots}</span>
            </div>
        </div>`;
    }).join("") || `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No matches</div>`;
}

// ── Discipline Catalog (PSH) ──────────────────────────────────
function renderCatalog() {
    const container = document.getElementById("kb-catalog");

    if (tableState.catalog.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.catalog?.active || []).forEach(entry => {
                if (entry.facet_type === "psh") {
                    tableState.catalog.data.push({ ...entry, _agent: agent.id });
                }
            });
        }
    }

    const allRows = tableState.catalog.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No catalog data available. Run bootstrap_facets.py to classify entities by PSH discipline.</div>`;
        renderPageControls("catalog", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("catalog", allRows, {
        keyword_count: r => r.keyword_count || 0,
        entity_count: r => r.entity_count || 0,
        facet_value: r => r.facet_value || "",
        code: r => r.code || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("catalog", page, totalPages, filtered.length, total);

    const maxKeywords = Math.max(...allRows.map(r => r.keyword_count || 0), 1);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("catalog", "_agent", "Agent")}
                ${sortHeader("catalog", "facet_value", "Discipline")}
                ${sortHeader("catalog", "code", "Code")}
                <th>Description</th>
                ${sortHeader("catalog", "keyword_count", "Keywords")}
                <th style="min-width:100px">Distribution</th>
            </tr></thead>
            <tbody>${display.map(entry => {
                const pct = maxKeywords > 0 ? Math.round(((entry.keyword_count || 0) / maxKeywords) * 100) : 0;
                const desc = (entry.description || "").length > 60
                    ? entry.description.substring(0, 60) + "…"
                    : (entry.description || "—");
                return `<tr>
                    <td><span class="agent-dot" data-agent="${entry._agent}"></span>${agentName(entry._agent)}</td>
                    <td style="color:var(--c-transport);white-space:nowrap">${escapeHtml(entry.facet_value || "—")}</td>
                    <td style="color:var(--text-dim);font-size:0.85em">${escapeHtml(entry.code || "—")}</td>
                    <td style="font-size:0.85em">${escapeHtml(desc)}</td>
                    <td style="text-align:center">${entry.keyword_count || 0}</td>
                    <td><div class="catalog-bar-track"><div class="catalog-bar-fill" style="width:${pct}%"></div></div></td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Entity Schema (schema.org) ─────────────────────────────────
function renderSchema() {
    const container = document.getElementById("kb-schema");

    if (tableState.schema.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.catalog?.active || []).forEach(entry => {
                if (entry.facet_type === "schema_type") {
                    tableState.schema.data.push({ ...entry, _agent: agent.id });
                }
            });
        }
    }

    const allRows = tableState.schema.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No schema data available. Run bootstrap_facets.py to classify entities by schema.org type.</div>`;
        renderPageControls("schema", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("schema", allRows, {
        entity_count: r => r.entity_count || 0,
        facet_value: r => r.facet_value || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("schema", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("schema", "_agent", "Agent")}
                ${sortHeader("schema", "facet_value", "Type")}
                <th>Reference</th>
                ${sortHeader("schema", "entity_count", "Entities")}
            </tr></thead>
            <tbody>${display.map(entry => {
                const typeName = (entry.facet_value || "").replace("schema:", "");
                const schemaUrl = "https://schema.org/" + typeName;
                return `<tr>
                    <td><span class="agent-dot" data-agent="${entry._agent}"></span>${agentName(entry._agent)}</td>
                    <td style="color:var(--c-catalog);white-space:nowrap">${escapeHtml(entry.facet_value || "—")}</td>
                    <td><a href="${schemaUrl}" target="_blank" rel="noopener" style="color:var(--text-dim);font-size:0.85em">${typeName} &#x2192;</a></td>
                    <td style="text-align:center">${entry.entity_count || 0}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Memory by Topic ──────────────────────────────────────────
function renderMemoryTopics() {
    const container = document.getElementById("kb-memory");
    const allTopics = [];
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);

    for (const agent of agents) {
        const kb = kbData[agent.id];
        if (kb?.status !== "ok") continue;
        (kb.data?.memory?.by_topic || []).forEach(t => {
            allTopics.push({ ...t, _agent: agent.id });
        });
    }

    if (allTopics.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No memory data available. Memory topics populate from each agent's memory_entries table.</div>`;
        return;
    }

    // Sort by stale_count desc, then entry_count desc
    allTopics.sort((a, b) => (b.stale_count || 0) - (a.stale_count || 0) || (b.entry_count || 0) - (a.entry_count || 0));

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                <th>Agent</th>
                <th>Topic</th>
                <th>Entries</th>
                <th>Stale</th>
                <th>Freshness</th>
                <th>Newest</th>
            </tr></thead>
            <tbody>${allTopics.map(t => {
                const stale = t.stale_count || 0;
                const total = t.entry_count || 0;
                const staleRatio = total > 0 ? stale / total : 0;
                const freshClass = staleRatio > 0.5 ? "freshness-stale" : staleRatio > 0 ? "freshness-aging" : "freshness-fresh";
                const freshLabel = staleRatio > 0.5 ? "stale" : staleRatio > 0 ? "aging" : "fresh";
                const newest = t.newest ? formatTS(t.newest) : "—";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${t._agent}"></span>${agentName(t._agent)}</td>
                    <td>${escapeHtml(t.topic || "—")}</td>
                    <td style="text-align:center">${total}</td>
                    <td style="text-align:center;${stale > 0 ? "color:var(--c-alert)" : ""}">${stale}</td>
                    <td style="text-align:center"><span class="freshness-indicator"><span class="freshness-dot ${freshClass}"></span><span class="freshness-label">${freshLabel}</span></span></td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${newest}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Meta Tab: Epistemic Debt ─────────────────────────────────
function renderEpistemicDebt() {
    const container = document.getElementById("epistemic-debt-panel");
    if (!container) return;
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);

    let totalClaims = 0, unverified = 0, staleClaims = 0;
    let totalMemory = 0, staleMemory = 0;
    let totalLessons = 0, staleLessons = 0;
    let transportFlags = 0;
    const confBuckets = { "< 0.7": 0, "0.7–0.8": 0, "0.8–0.9": 0, "0.9–1.0": 0 };
    const agentDebt = [];

    for (const agent of agents) {
        const kb = kbData[agent.id];
        if (kb?.status !== "ok") continue;
        const t = kb.data?.totals || {};
        const ac = t.claims || 0;
        const av = t.claims_verified || 0;
        const as = t.claims_stale || 0;
        const am = t.memory_entries || 0;
        const asm = t.stale_entries || 0;
        const al = t.lessons || 0;
        const asl = t.lessons_stale || 0;
        const aef = t.epistemic_unresolved || 0;
        totalClaims += ac; unverified += (ac - av); staleClaims += as;
        totalMemory += am; staleMemory += asm;
        totalLessons += al; staleLessons += asl;
        transportFlags += aef;

        // Confidence distribution from claims data
        (kb.data?.claims || []).forEach(c => {
            const conf = parseFloat(c.confidence);
            if (isNaN(conf)) return;
            if (conf < 0.7) confBuckets["< 0.7"]++;
            else if (conf < 0.8) confBuckets["0.7–0.8"]++;
            else if (conf < 0.9) confBuckets["0.8–0.9"]++;
            else confBuckets["0.9–1.0"]++;
        });

        // Per-agent debt score (higher = more debt)
        const debtScore = (ac - av) + asm + asl + aef;
        if (debtScore > 0) {
            agentDebt.push({ agent: agent.id, claims: ac - av, memory: asm, lessons: asl, flags: aef, total: debtScore });
        }
    }

    const totalDebt = unverified + staleMemory + staleLessons + transportFlags;
    const debtLevel = totalDebt > 100 ? "high" : totalDebt > 30 ? "moderate" : totalDebt > 0 ? "low" : "none";
    const debtColor = debtLevel === "high" ? "var(--c-alert)" : debtLevel === "moderate" ? "var(--c-warning, #d4944a)" : debtLevel === "low" ? "var(--c-tab-kb)" : "var(--c-tab-pulse)";

    // Confidence histogram bars
    const maxBucket = Math.max(...Object.values(confBuckets), 1);
    const histBars = Object.entries(confBuckets).map(([label, count]) => {
        const pct = Math.round((count / maxBucket) * 100);
        const barColor = label === "< 0.7" ? "var(--c-alert)" : label === "0.7–0.8" ? "var(--c-warning, #d4944a)" : "var(--c-tab-kb)";
        return `<div class="debt-hist-row">
            <span class="debt-hist-label">${label}</span>
            <div class="debt-hist-bar-bg"><div class="debt-hist-bar" style="width:${pct}%;background:${barColor}"></div></div>
            <span class="debt-hist-count">${count}</span>
        </div>`;
    }).join("");

    // Per-agent breakdown
    agentDebt.sort((a, b) => b.total - a.total);
    const agentRows = agentDebt.map(a =>
        `<tr>
            <td><span class="agent-dot" data-agent="${a.agent}"></span>${agentName(a.agent)}</td>
            <td style="text-align:center;${a.claims > 0 ? "color:var(--c-alert)" : ""}">${a.claims}</td>
            <td style="text-align:center;${a.memory > 0 ? "color:var(--c-warning,#d4944a)" : ""}">${a.memory}</td>
            <td style="text-align:center;${a.lessons > 0 ? "color:var(--c-warning,#d4944a)" : ""}">${a.lessons}</td>
            <td style="text-align:center;${a.flags > 0 ? "color:var(--c-epistemic)" : ""}">${a.flags}</td>
            <td style="text-align:center;font-weight:bold">${a.total}</td>
        </tr>`
    ).join("");

    container.innerHTML = `
        <div class="debt-summary">
            <div class="debt-headline" style="color:${debtColor}">
                <span class="debt-headline-number">${totalDebt}</span>
                <span class="debt-headline-label">total epistemic debt items</span>
            </div>
            <div class="debt-breakdown">
                <div class="debt-item">
                    <span class="debt-item-count" style="color:var(--c-alert)">${unverified}</span>
                    <span class="debt-item-label">unverified claims</span>
                </div>
                <div class="debt-item">
                    <span class="debt-item-count">${staleMemory}</span>
                    <span class="debt-item-label">stale memory</span>
                </div>
                <div class="debt-item">
                    <span class="debt-item-count">${staleLessons}</span>
                    <span class="debt-item-label">stale lessons</span>
                </div>
                <div class="debt-item">
                    <span class="debt-item-count" style="color:var(--c-epistemic)">${transportFlags}</span>
                    <span class="debt-item-label">transport flags</span>
                </div>
            </div>
        </div>
        <div class="debt-sections">
            <div class="debt-section">
                <div class="debt-section-title">Confidence Distribution</div>
                <div class="debt-histogram">${histBars}</div>
            </div>
            ${agentRows.length > 0 ? `<div class="debt-section">
                <div class="debt-section-title">Debt by Agent</div>
                <table class="kb-table">
                    <thead><tr><th>Agent</th><th>Claims</th><th>Memory</th><th>Lessons</th><th>Flags</th><th>Total</th></tr></thead>
                    <tbody>${agentRows}</tbody>
                </table>
            </div>` : ""}
        </div>
    `;
}

// ── Meta Tab: Epistemic Flags Detail ─────────────────────────
function renderEpistemicFlags() {
    const container = document.getElementById("kb-flags-detail");
    if (!container) return;

    if (tableState.flags.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.epistemic_flags || []).forEach(f => {
                tableState.flags.data.push({ ...f, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.flags.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No unresolved epistemic flags — epistemic debt at zero.</div>`;
        renderPageControls("flags", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("flags", allRows, {
        created_at: r => r.created_at || "",
        age_days: r => parseFloat(r.age_days) || 0,
        from_agent: r => (r.from_agent || r._agent || ""),
        source: r => (r.source || ""),
        flag_text: r => (r.flag_text || ""),
        session_name: r => (r.session_name || ""),
    });

    renderPageControls("flags", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("flags", "from_agent", "Agent")}
                <th>Flag</th>
                ${sortHeader("flags", "age_days", "Age")}
                ${sortHeader("flags", "source", "Source")}
                ${sortHeader("flags", "session_name", "Session")}
                ${sortHeader("flags", "created_at", "Date")}
            </tr></thead>
            <tbody>${display.map(f => {
                const agentShort = agentName(f.from_agent || f._agent || "unknown");
                const flagText = escapeHtml(f.flag_text || "—");
                const truncated = flagText.length > 120;
                const displayText = truncated
                    ? `<span class="expandable-text" title="${flagText}">${flagText.slice(0, 120)}…</span>`
                    : flagText;
                const age = parseInt(f.age_days) || 0;
                const ageColor = age > 30 ? "var(--c-alert)" : age > 7 ? "var(--c-warning, #d4944a)" : "";
                const dateStr = (f.created_at || "").slice(0, 10);
                const session = f.session_name ? escapeHtml(f.session_name) : "—";
                const source = f.source ? escapeHtml(f.source).replace(/^from-/, "").replace(/\.json$/, "") : "—";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${f._agent}"></span>${agentShort}</td>
                    <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis">${displayText}</td>
                    <td style="text-align:center;color:${ageColor};font-weight:bold">${age}d</td>
                    <td style="font-size:0.85em">${source}</td>
                    <td style="font-size:0.85em">${session}</td>
                    <td style="font-size:0.85em">${dateStr}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Meta Tab: Messages (audit trail) ────────────────────────
function renderMessages() {
    const container = document.getElementById("kb-messages");
    if (!container) return;

    if (tableState.messages.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.messages || []).forEach(m => {
                tableState.messages.data.push({ ...m, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.messages.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No messages indexed. Messages populate when bootstrap_state_db.py processes transport JSON files.</div>`;
        renderPageControls("messages", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("messages", allRows, {
        timestamp: r => parseTS(r.timestamp),
        from_agent: r => r.from_agent || "",
        to_agent: r => r.to_agent || "",
        session_name: r => r.session_name || "",
        message_type: r => r.message_type || "",
        turn: r => r.turn || 0,
        claims_count: r => r.claims_count || 0,
        _agent: r => r._agent || "",
    });

    renderPageControls("messages", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("messages", "from_agent", "From")}
                ${sortHeader("messages", "to_agent", "To")}
                ${sortHeader("messages", "session_name", "Session")}
                ${sortHeader("messages", "turn", "Turn")}
                ${sortHeader("messages", "message_type", "Type")}
                <th>Subject</th>
                ${sortHeader("messages", "claims_count", "Claims")}
                <th style="width:2em">GH</th>
                ${sortHeader("messages", "timestamp", "Date")}
            </tr></thead>
            <tbody>${display.map(m => {
                const dateShort = formatTS(m.timestamp);
                const subject = (m.subject || "").length > 60
                    ? m.subject.substring(0, 60) + "…"
                    : (m.subject || "—");
                const claimsCount = m.claims_count || 0;
                const claimsLink = claimsCount > 0
                    ? `<a href="#pane-kb" onclick="switchTab('kb');document.getElementById('filter-claims').value='${escapeHtml(m.session_name || "")}';filterTable('claims');return false;" style="color:var(--c-knowledge)">${claimsCount}</a>`
                    : `<span style="color:var(--text-dim)">0</span>`;
                return `<tr>
                    <td><span class="agent-dot" data-agent="${m._agent}"></span>${escapeHtml(m.from_agent || "—")}</td>
                    <td style="font-size:0.85em">${escapeHtml(m.to_agent || "—")}</td>
                    <td style="color:var(--c-transport);font-size:0.85em;white-space:nowrap">${escapeHtml(m.session_name || "—")}</td>
                    <td style="text-align:center">${m.turn || "—"}</td>
                    <td style="font-size:0.85em">${escapeHtml(m.message_type || "—")}</td>
                    <td style="font-size:0.85em">${escapeHtml(subject)}</td>
                    <td style="text-align:center">${claimsLink}</td>
                    <td style="text-align:center">${m.issue_url ? `<a href="${escapeHtml(m.issue_url)}" target="_blank" rel="noopener" title="GitHub Issue #${m.issue_number || ''}" style="color:var(--text-secondary);text-decoration:none">&#x1F517;</a>` : ''}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── KB Tab: Claims ──────────────────────────────────────────
function renderClaims() {
    const container = document.getElementById("kb-claims");

    if (tableState.claims.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.claims || []).forEach(c => {
                tableState.claims.data.push({ ...c, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.claims.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No claims available. Claims populate from transport message exchanges between agents.</div>`;
        renderPageControls("claims", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("claims", allRows, {
        created_at: r => parseTS(r.created_at),
        confidence: r => r.confidence != null ? parseFloat(r.confidence) : -1,
        claim_text: r => r.claim_text || "",
        verified: r => r.verified || 0,
        session_name: r => r.session_name || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("claims", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("claims", "_agent", "Source")}
                <th>Claim</th>
                ${sortHeader("claims", "confidence", "Conf")}
                <th>Basis</th>
                ${sortHeader("claims", "verified", "Verified")}
                ${sortHeader("claims", "session_name", "Session")}
                ${sortHeader("claims", "created_at", "Date")}
            </tr></thead>
            <tbody>${display.map(c => {
                const conf = c.confidence != null ? parseFloat(c.confidence) : null;
                const confClass = conf != null ? (conf >= 0.8 ? "confidence-high" : conf >= 0.5 ? "confidence-mid" : "confidence-low") : "";
                const confText = conf != null ? conf.toFixed(2) : "—";
                const verified = c.verified ? "yes" : "no";
                const verClass = c.verified ? "verified-yes" : "verified-no";
                const fullText = c.claim_text || "—";
                const truncated = fullText.length > 100;
                const text = truncated ? fullText.substring(0, 100) + "…" : fullText;
                const rowId = "claim-" + (c.id || Math.random().toString(36).substr(2, 6));
                const basis = (c.confidence_basis || "—").length > 60
                    ? c.confidence_basis.substring(0, 60) + "…"
                    : (c.confidence_basis || "—");
                const dateShort = formatTS(c.created_at);
                const fromAgent = agentName(c.from_agent || c._agent);
                return `<tr class="${truncated ? "expandable-row" : ""}" ${truncated ? `onclick="toggleDecisionRow('${rowId}')"` : ""}>
                    <td><span class="agent-dot" data-agent="${c._agent}"></span>${escapeHtml(fromAgent)}</td>
                    <td>${annotateAcronyms(escapeHtml(text))}</td>
                    <td><span class="confidence-badge ${confClass}">${confText}</span></td>
                    <td style="font-size:0.85em;color:var(--text-secondary)">${annotateAcronyms(escapeHtml(basis))}</td>
                    <td><span class="verified-badge ${verClass}">${verified}</span></td>
                    <td style="font-size:0.85em;white-space:nowrap"><a href="#pane-meta" onclick="switchTab('meta');document.getElementById('filter-messages').value='${escapeHtml(c.session_name || "")}';filterTable('messages');return false;" style="color:var(--c-transport)">${escapeHtml(c.session_name || "—")}</a></td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                </tr>${truncated ? `<tr id="${rowId}" class="expanded-detail-row" style="display:none"><td colspan="7"><div class="expanded-detail">${annotateAcronyms(escapeHtml(fullText))}</div></td></tr>` : ""}`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── KB Tab: Decision Chains ──────────────────────────────────
function renderChains() {
    const container = document.getElementById("kb-chains");

    if (tableState.chains.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.decisions || []).forEach(d => {
                tableState.chains.data.push({ ...d, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.chains.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No decision chains available.</div>`;
        renderPageControls("chains", 0, 1, 0, 0);
        return;
    }

    // Build a lookup for derives_from display
    const keyById = {};
    allRows.forEach(d => { if (d.id) keyById[d.id] = d.decision_key; });

    const { display, page, totalPages, filtered, total } = getFilteredSorted("chains", allRows, {
        decided_date: r => parseTS(r.created_at || r.decided_date),
        confidence: r => r.confidence != null ? parseFloat(r.confidence) : -1,
        decision_key: r => r.decision_key || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("chains", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("chains", "_agent", "Agent")}
                ${sortHeader("chains", "decision_key", "Key")}
                <th>Decision</th>
                <th>Derives From</th>
                ${sortHeader("chains", "decided_date", "Date")}
                ${sortHeader("chains", "confidence", "Conf")}
            </tr></thead>
            <tbody>${display.map(d => {
                const conf = d.confidence != null ? parseFloat(d.confidence) : null;
                const confClass = conf != null ? (conf >= 0.8 ? "confidence-high" : conf >= 0.5 ? "confidence-mid" : "confidence-low") : "";
                const confText = conf != null ? conf.toFixed(2) : "—";
                const dateShort = formatTS(d.created_at || d.decided_date);
                const text = (d.decision_text || "").length > 80
                    ? d.decision_text.substring(0, 80) + "…"
                    : (d.decision_text || "—");
                const parentKey = d.derives_from ? (keyById[d.derives_from] || "#" + d.derives_from) : "—";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${d._agent}"></span>${agentName(d._agent)}</td>
                    <td style="color:var(--c-knowledge);white-space:nowrap">${d.decision_key || "—"}</td>
                    <td>${annotateAcronyms(escapeHtml(text))}</td>
                    <td>${d.derives_from ? `<span class="derivation-ref">${escapeHtml(parentKey)}</span>` : `<span style="color:var(--text-dim)">—</span>`}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                    <td><span class="confidence-badge ${confClass}">${confText}</span></td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── KB Tab: Memory Facts ─────────────────────────────────────
function renderFacts() {
    const container = document.getElementById("kb-facts");

    if (tableState.facts.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.memory?.entries || []).forEach(e => {
                tableState.facts.data.push({ ...e, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.facts.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No memory facts available. Facts populate from each agent's memory_entries table.</div>`;
        renderPageControls("facts", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("facts", allRows, {
        last_confirmed: r => parseTS(r.last_confirmed),
        topic: r => r.topic || "",
        entry_key: r => r.entry_key || "",
        status: r => r.status || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("facts", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("facts", "_agent", "Agent")}
                ${sortHeader("facts", "topic", "Topic")}
                ${sortHeader("facts", "entry_key", "Key")}
                <th>Value</th>
                ${sortHeader("facts", "status", "Status")}
                ${sortHeader("facts", "last_confirmed", "Confirmed")}
            </tr></thead>
            <tbody>${display.map(e => {
                const val = (e.value || "").length > 80
                    ? e.value.substring(0, 80) + "…"
                    : (e.value || "—");
                const confirmed = formatTS(e.last_confirmed);
                const statusIcon = e.status === "✓" ? "✓" : "—";
                const statusColor = e.status === "✓" ? "var(--c-health)" : "var(--text-dim)";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${e._agent}"></span>${agentName(e._agent)}</td>
                    <td style="color:var(--c-epistemic);white-space:nowrap">${escapeHtml(e.topic || "—")}</td>
                    <td style="color:var(--c-knowledge);font-size:0.85em">${escapeHtml(e.entry_key || "—")}</td>
                    <td style="font-size:0.85em">${escapeHtml(val)}</td>
                    <td style="text-align:center;color:${statusColor}">${statusIcon}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${confirmed}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Wisdom Tab: Lessons ──────────────────────────────────────
function renderLessons() {
    const container = document.getElementById("kb-lessons");

    if (tableState.lessons.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.lessons || []).forEach(l => {
                tableState.lessons.data.push({ ...l, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.lessons.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No lessons recorded yet. Lessons capture transferable patterns — recurring errors, diagnostic tells, and graduated insights that earn trigger coverage.</div>`;
        renderPageControls("lessons", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("lessons", allRows, {
        lesson_date: r => parseTS(r.lesson_date || r.created_at),
        title: r => r.title || "",
        domain: r => r.domain || "",
        severity: r => r.severity || "",
        recurrence: r => r.recurrence || 0,
        promotion_status: r => r.promotion_status || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("lessons", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("lessons", "_agent", "Agent")}
                ${sortHeader("lessons", "title", "Lesson")}
                ${sortHeader("lessons", "domain", "Domain")}
                ${sortHeader("lessons", "severity", "Severity")}
                ${sortHeader("lessons", "recurrence", "Seen")}
                ${sortHeader("lessons", "promotion_status", "Status")}
                ${sortHeader("lessons", "lesson_date", "Date")}
            </tr></thead>
            <tbody>${display.map(l => {
                const title = (l.title || "").length > 80
                    ? l.title.substring(0, 80) + "…"
                    : (l.title || "—");
                const dateShort = formatTS(l.lesson_date || l.created_at);
                const graduated = l.promotion_status === "graduated";
                const statusColor = graduated ? "var(--c-health)" : "var(--text-dim)";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${l._agent}"></span>${agentName(l._agent)}</td>
                    <td>${annotateAcronyms(escapeHtml(title))}</td>
                    <td style="color:var(--c-epistemic);font-size:0.85em">${escapeHtml(l.domain || "—")}</td>
                    <td style="font-size:0.85em">${escapeHtml(l.severity || "—")}</td>
                    <td style="text-align:center">${l.recurrence || 0}</td>
                    <td style="color:${statusColor};font-size:0.85em">${escapeHtml(l.promotion_status || "pending")}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── KB + Wisdom Vitals ────────────────────────────────────────
function renderKBTabVitals() {
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);
    let claims = 0, verified = 0, staleClaims = 0, decisions = 0, facts = 0;
    let lessons = 0, staleLessons = 0, graduated = 0, domains = new Set();

    for (const agent of agents) {
        const kb = kbData[agent.id];
        if (kb?.status !== "ok") continue;
        const t = kb.data?.totals || {};
        claims += t.claims || 0;
        verified += t.claims_verified || 0;
        staleClaims += t.claims_stale || 0;
        decisions += t.decisions || 0;
        facts += t.memory_entries || 0;
        lessons += t.lessons || 0;
        staleLessons += t.lessons_stale || 0;
        (kb.data?.lessons || []).forEach(l => {
            if (l.promotion_status === "graduated") graduated++;
            if (l.domain) domains.add(l.domain);
        });
    }

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el("kb-claims-count", claims);
    el("kb-verified-count", verified);
    el("kb-stale-count", staleClaims);
    el("kb-chains-count", decisions);
    el("kb-facts-count", facts);
    el("wisdom-lessons-count", lessons);
    el("wisdom-graduated-count", graduated);
    el("wisdom-stale-count", staleLessons);
    el("wisdom-domains-count", domains.size);
}

// ── Table State (sort, filter, pagination) ─────────────────

const PAGE_SIZE = 15;
const tableState = {
    decisions: { sort: "decided_date", sortDir: -1, filter: "", page: 0, data: [] },
    triggers: { sort: "last_fired", sortDir: -1, filter: "", page: 0, data: [] },
    catalog: { sort: "keyword_count", sortDir: -1, filter: "", page: 0, data: [] },
    schema: { sort: "entity_count", sortDir: -1, filter: "", page: 0, data: [] },
    messages: { sort: "timestamp", sortDir: -1, filter: "", page: 0, data: [] },
    claims: { sort: "created_at", sortDir: -1, filter: "", page: 0, data: [] },
    chains: { sort: "decided_date", sortDir: -1, filter: "", page: 0, data: [] },
    facts: { sort: "last_confirmed", sortDir: -1, filter: "", page: 0, data: [] },
    lessons: { sort: "lesson_date", sortDir: -1, filter: "", page: 0, data: [] },
    flags: { sort: "created_at", sortDir: -1, filter: "", page: 0, data: [] },
    actions: { sort: "created_at", sortDir: -1, filter: "", page: 0, data: [] },
};
let allDictTerms = [];
let acronymMap = {};   // { "PSQ": "Psychoemotional Safety Quotient — ...", ... }
let acronymRegex = null;

// Build acronym lookup from dictionary data after fetch
function buildAcronymMap() {
    acronymMap = {};
    for (const agent of AGENTS) {
        const dd = dictData[agent.id];
        if (dd?.status !== "ok") continue;
        const vocab = dd.data || {};
        const terms = vocab["@graph"] || vocab.hasDefinedTerm || [];
        terms.forEach(term => {
            if (term.inDefinedTermSet !== "Project Acronyms") return;
            const name = term.name || "";
            if (!name || acronymMap[name]) return;
            acronymMap[name] = term.description || name;
        });
    }
    // Build regex from acronym keys, longest first to avoid partial matches
    const keys = Object.keys(acronymMap).sort((a, b) => b.length - a.length);
    if (keys.length === 0) { acronymRegex = null; return; }
    // Escape regex special chars in keys (for JSON-LD, EF-1, etc.)
    const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    acronymRegex = new RegExp("\\b(" + escaped.join("|") + ")\\b", "g");
}

// Annotate escaped HTML text with acronym tooltips
// Returns HTML string with <abbr> wrappers — safe because input was already escaped
function annotateAcronyms(escapedText) {
    if (!acronymRegex || !escapedText) return escapedText;
    return escapedText.replace(acronymRegex, (match) => {
        const desc = acronymMap[match];
        if (!desc) return match;
        const safeDesc = desc.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        return `<abbr class="acronym-tip" title="${safeDesc}" onclick="event.stopPropagation();switchTab('kb');setTimeout(()=>{const f=document.getElementById('filter-dictionary');if(f){f.value='${match}';filterDictionary();}},100)">${match}</abbr>`;
    });
}

function sortTable(tableId, column) {
    const state = tableState[tableId];
    if (state.sort === column) {
        state.sortDir *= -1;
    } else {
        state.sort = column;
        state.sortDir = -1;
    }
    state.page = 0;
    if (tableId === "decisions") renderDecisions();
    if (tableId === "triggers") renderTriggers();
    if (tableId === "catalog") renderCatalog();
    if (tableId === "schema") renderSchema();
    if (tableId === "messages") renderMessages();
    if (tableId === "claims") renderClaims();
    if (tableId === "chains") renderChains();
    if (tableId === "facts") renderFacts();
    if (tableId === "lessons") renderLessons();
    if (tableId === "flags") renderEpistemicFlags();
    if (tableId === "actions") renderActionsTable();
}

function filterTable(tableId) {
    const input = document.getElementById(`filter-${tableId}`);
    tableState[tableId].filter = (input?.value || "").toLowerCase();
    tableState[tableId].page = 0;
    if (tableId === "decisions") renderDecisions();
    if (tableId === "triggers") renderTriggers();
    if (tableId === "catalog") renderCatalog();
    if (tableId === "schema") renderSchema();
    if (tableId === "messages") renderMessages();
    if (tableId === "claims") renderClaims();
    if (tableId === "chains") renderChains();
    if (tableId === "facts") renderFacts();
    if (tableId === "lessons") renderLessons();
    if (tableId === "flags") renderEpistemicFlags();
    if (tableId === "actions") renderActionsTable();
}

function goToPage(tableId, page) {
    tableState[tableId].page = page;
    if (tableId === "decisions") renderDecisions();
    if (tableId === "triggers") renderTriggers();
    if (tableId === "catalog") renderCatalog();
    if (tableId === "schema") renderSchema();
    if (tableId === "messages") renderMessages();
    if (tableId === "claims") renderClaims();
    if (tableId === "chains") renderChains();
    if (tableId === "facts") renderFacts();
    if (tableId === "lessons") renderLessons();
    if (tableId === "flags") renderEpistemicFlags();
    if (tableId === "actions") renderActionsTable();
}

function filterDictionary() {
    const input = document.getElementById("filter-dictionary");
    const filter = (input?.value || "").toLowerCase();
    renderDictionaryFiltered(filter);
}

function getFilteredSorted(tableId, allRows, sortAccessors) {
    const state = tableState[tableId];

    // Agent filter
    let filtered = allRows;
    if (activeAgentFilter !== "all") {
        filtered = filtered.filter(row => row._agent === activeAgentFilter);
    }

    // Text filter
    if (state.filter) {
        filtered = filtered.filter(row =>
            Object.values(row).some(v =>
                String(v || "").toLowerCase().includes(state.filter)
            )
        );
    }

    // Sort
    const accessor = sortAccessors[state.sort] || (r => r[state.sort]);
    filtered.sort((a, b) => {
        const va = accessor(a), vb = accessor(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number") return (va - vb) * state.sortDir;
        return String(va).localeCompare(String(vb)) * state.sortDir;
    });

    // Paginate
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(state.page, totalPages - 1);
    const display = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return { filtered, display, page, totalPages, total: allRows.length };
}

function renderPageControls(tableId, page, totalPages, filteredCount, totalCount) {
    const info = document.getElementById(`page-info-${tableId}`);
    const btns = document.getElementById(`page-btns-${tableId}`);
    if (info) {
        info.textContent = filteredCount < totalCount
            ? `${filteredCount} of ${totalCount} (filtered) · Page ${page + 1}/${totalPages}`
            : `${totalCount} total · Page ${page + 1}/${totalPages}`;
    }
    if (btns && totalPages > 1) {
        btns.innerHTML = `
            <button class="table-page-btn" aria-label="Previous page" ${page === 0 ? "disabled" : ""} onclick="goToPage('${tableId}',${page - 1})">&#x25C0;</button>
            <button class="table-page-btn" aria-label="Next page" ${page >= totalPages - 1 ? "disabled" : ""} onclick="goToPage('${tableId}',${page + 1})">&#x25B6;</button>
        `;
    } else if (btns) {
        btns.innerHTML = "";
    }
}

function sortHeader(tableId, column, label) {
    const state = tableState[tableId];
    const active = state.sort === column;
    const arrow = active ? (state.sortDir > 0 ? "&#x25B2;" : "&#x25BC;") : "&#x25B4;";
    const ariaSort = active ? (state.sortDir > 0 ? "ascending" : "descending") : "none";
    return `<th class="${active ? "sort-active" : ""}" role="columnheader" aria-sort="${ariaSort}" onclick="sortTable('${tableId}','${column}')" style="cursor:pointer" tabindex="0" onkeydown="if(event.key==='Enter')sortTable('${tableId}','${column}')">${label}<span class="sort-arrow">${arrow}</span></th>`;
}

// ── Row Expansion ─────────────────────────────────────────────
function toggleDecisionRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.style.display = row.style.display === "none" ? "table-row" : "none";
}

// ── Utility ──────────────────────────────────────────────────
// ── Timestamp Helpers ──────────────────────────────────────────
function parseTS(ts) {
    // Normalize ISO timestamps (with or without timezone) to epoch ms.
    // Handles "2026-03-10T10:57:33-05:00", "2026-03-10T00:01:41", "2026-03-10"
    if (!ts) return 0;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatTS(ts) {
    // Show compact timestamp: "Mar 10, 14:57" or "2026-03-10" for date-only
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts.substring(0, 10) || "—";
    // If date-only (no T), show date
    if (typeof ts === "string" && !ts.includes("T")) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    const now = new Date();
    const diffMs = now - d;
    const diffH = diffMs / 3600000;
    if (diffH < 1) return Math.max(1, Math.floor(diffMs / 60000)) + "m ago";
    if (diffH < 24) return Math.floor(diffH) + "h ago";
    if (diffH < 48) return "yesterday " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}


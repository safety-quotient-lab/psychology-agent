/**
 * knowledge.js — Knowledge station (KB tab: claims, chains, facts, dictionary,
 * catalog, schema, KB vitals).
 *
 * Extracted from inline <script> in index.html.
 * Fetches data from each agent's /api/kb and /kb/dictionary endpoints.
 *
 * DOM dependencies: #kb-claims, #kb-chains, #kb-facts, #kb-dictionary,
 *   #kb-catalog, #kb-schema, KB vitals elements, page control elements
 */

import {
    escapeHtml, parseTS, formatTS, agentName, annotateAcronyms, buildAcronymMap,
} from '../core/utils.js';

// ── Module State ───────────────────────────────────────────────
let allDictTerms = [];

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch KB data from a single agent.
 * @param {Object} agent — { id, url, color }
 * @returns {Promise<Object>} — { id, status, data? }
 */
export async function fetchAgentKB(agent) {
    try {
        const resp = await fetch(`${agent.url}/api/kb`, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return { id: agent.id, status: "ok", data: await resp.json() };
    } catch (err) {
        return { id: agent.id, status: "error", error: err.message };
    }
}

/**
 * Fetch dictionary data from a single agent.
 * @param {Object} agent — { id, url, color }
 * @returns {Promise<Object>} — { id, status, data? }
 */
export async function fetchAgentDict(agent) {
    try {
        const resp = await fetch(`${agent.url}/kb/dictionary`, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return { id: agent.id, status: "ok", data: await resp.json() };
    } catch (err) {
        return { id: agent.id, status: "error", error: err.message };
    }
}

/**
 * Refresh all knowledge data (KB + dictionary) from all agents.
 * @param {Array} AGENTS
 * @param {Object} kbData — mutable object to populate
 * @param {Object} dictData — mutable object to populate
 * @param {Object} tableState
 * @param {string} activeAgentFilter
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControlsFn
 * @param {Function} sortHeaderFn
 * @param {Function} mirrorToLcars
 * @returns {Promise<void>}
 */
export async function refreshKnowledge(AGENTS, kbData, dictData, tableState, activeAgentFilter, getFilteredSorted, renderPageControlsFn, sortHeaderFn, mirrorToLcars) {
    const [kbResults, dictResults] = await Promise.all([
        Promise.allSettled(AGENTS.map(fetchAgentKB)),
        Promise.allSettled(AGENTS.map(fetchAgentDict)),
    ]);

    kbResults.forEach((r, i) => {
        kbData[AGENTS[i].id] = r.status === "fulfilled" ? r.value : { id: AGENTS[i].id, status: "error" };
    });
    dictResults.forEach((r, i) => {
        dictData[AGENTS[i].id] = r.status === "fulfilled" ? r.value : { id: AGENTS[i].id, status: "error" };
    });

    buildAcronymMap(AGENTS, dictData);
    renderKnowledge(AGENTS, kbData, dictData, tableState, activeAgentFilter, getFilteredSorted, renderPageControlsFn, sortHeaderFn, mirrorToLcars);
}

/**
 * Render all knowledge panels.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} dictData
 * @param {Object} tableState
 * @param {string} activeAgentFilter
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControlsFn
 * @param {Function} sortHeaderFn
 * @param {Function} mirrorToLcars
 */
export function renderKnowledge(AGENTS, kbData, dictData, tableState, activeAgentFilter, getFilteredSorted, renderPageControlsFn, sortHeaderFn, mirrorToLcars) {
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

    // Knowledge tab
    renderKBTabVitals(AGENTS, kbData, activeAgentFilter);
    renderClaims(AGENTS, kbData, tableState, getFilteredSorted, renderPageControlsFn, sortHeaderFn);
    renderChains(AGENTS, kbData, tableState, getFilteredSorted, renderPageControlsFn, sortHeaderFn);
    renderFacts(AGENTS, kbData, tableState, getFilteredSorted, renderPageControlsFn, sortHeaderFn);
    renderDictionary(AGENTS, dictData, activeAgentFilter);
    renderCatalog(AGENTS, kbData, tableState, getFilteredSorted, renderPageControlsFn, sortHeaderFn);
    renderSchema(AGENTS, kbData, tableState, getFilteredSorted, renderPageControlsFn, sortHeaderFn);

    // Mirror to LCARS-only panels
    if (mirrorToLcars) {
        mirrorToLcars("kb-claims", "lcars-sci-claims");
        mirrorToLcars("epistemic-debt-panel", "lcars-sci-debt");
        mirrorToLcars("kb-dictionary", "lcars-sci-vocab");
        mirrorToLcars("kb-lessons", "lcars-sci-lessons");
        mirrorToLcars("kb-catalog", "lcars-sci-catalog");
        mirrorToLcars("messages-table", "lcars-helm-messages");
        mirrorToLcars("ops-decisions-table", "lcars-ops-decisions");
        mirrorToLcars("ops-triggers-table", "lcars-ops-triggers");
    }
}

// ── KB + Wisdom Vitals ────────────────────────────────────────

/**
 * Render KB tab vitals.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {string} activeAgentFilter
 */
export function renderKBTabVitals(AGENTS, kbData, activeAgentFilter) {
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

// ── Claims ─────────────────────────────────────────────────────

export function renderClaims(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-claims");
    if (!container) return;

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
                const verifiedLabel = c.verified ? "yes" : "no";
                const verClass = c.verified ? "verified-yes" : "verified-no";
                const fullText = c.claim_text || "—";
                const truncated = fullText.length > 100;
                const text = truncated ? fullText.substring(0, 100) + "…" : fullText;
                const rowId = "claim-" + (c.id || Math.random().toString(36).substr(2, 6));
                const basis = (c.confidence_basis || "—").length > 60
                    ? c.confidence_basis.substring(0, 60) + "…"
                    : (c.confidence_basis || "—");
                const dateShort = formatTS(c.created_at);
                const fromAgent = agentName(c.from_agent || c._agent, AGENTS);
                return `<tr class="${truncated ? "expandable-row" : ""}" ${truncated ? `onclick="toggleDecisionRow('${rowId}')"` : ""}>
                    <td><span class="agent-dot" data-agent="${c._agent}"></span>${escapeHtml(fromAgent)}</td>
                    <td>${annotateAcronyms(escapeHtml(text))}</td>
                    <td><span class="confidence-badge ${confClass}">${confText}</span></td>
                    <td style="font-size:0.85em;color:var(--text-secondary)">${annotateAcronyms(escapeHtml(basis))}</td>
                    <td><span class="verified-badge ${verClass}">${verifiedLabel}</span></td>
                    <td style="font-size:0.85em;white-space:nowrap"><a href="#pane-meta" onclick="switchTab('meta');document.getElementById('filter-messages').value='${escapeHtml(c.session_name || "")}';filterTable('messages');return false;" style="color:var(--c-transport)">${escapeHtml(c.session_name || "—")}</a></td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                </tr>${truncated ? `<tr id="${rowId}" class="expanded-detail-row" style="display:none"><td colspan="7"><div class="expanded-detail">${annotateAcronyms(escapeHtml(fullText))}</div></td></tr>` : ""}`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Decision Chains ────────────────────────────────────────────

export function renderChains(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-chains");
    if (!container) return;

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
                    <td><span class="agent-dot" data-agent="${d._agent}"></span>${agentName(d._agent, AGENTS)}</td>
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

// ── Memory Facts ───────────────────────────────────────────────

export function renderFacts(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-facts");
    if (!container) return;

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
                    <td><span class="agent-dot" data-agent="${e._agent}"></span>${agentName(e._agent, AGENTS)}</td>
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

// ── Dictionary Cards ───────────────────────────────────────────

/**
 * Render dictionary terms (collects from all agents, deduplicates).
 * @param {Array} AGENTS
 * @param {Object} dictData
 * @param {string} activeAgentFilter
 */
export function renderDictionary(AGENTS, dictData, activeAgentFilter) {
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
    renderDictionaryFiltered("", activeAgentFilter);
}

/**
 * Render filtered dictionary view.
 * @param {string} filter — text filter
 * @param {string} activeAgentFilter
 */
export function renderDictionaryFiltered(filter, activeAgentFilter) {
    const container = document.getElementById("kb-dictionary");
    const infoEl = document.getElementById("page-info-dictionary");

    if (allDictTerms.length === 0) {
        if (container) container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No vocabulary terms available. Dictionary terms come from each agent's defined_terms table.</div>`;
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

    if (container) {
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
}

// ── Discipline Catalog (PSH) ──────────────────────────────────

export function renderCatalog(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-catalog");
    if (!container) return;

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
                    <td><span class="agent-dot" data-agent="${entry._agent}"></span>${agentName(entry._agent, AGENTS)}</td>
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

export function renderSchema(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-schema");
    if (!container) return;

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
                    <td><span class="agent-dot" data-agent="${entry._agent}"></span>${agentName(entry._agent, AGENTS)}</td>
                    <td style="color:var(--c-catalog);white-space:nowrap">${escapeHtml(entry.facet_value || "—")}</td>
                    <td><a href="${schemaUrl}" target="_blank" rel="noopener" style="color:var(--text-dim);font-size:0.85em">${typeName} &#x2192;</a></td>
                    <td style="text-align:center">${entry.entity_count || 0}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

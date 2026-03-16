/**
 * wisdom.js — Wisdom station (lessons learned, graduated insights, pattern recognition).
 *
 * Extracted from inline <script> in index.html.
 * Renders the Wisdom tab: lessons table, catalog, schema, memory topics,
 * epistemic debt, and KB+Wisdom vitals.
 *
 * Data endpoints (consumed indirectly via kbData):
 *   GET {agent.url}/api/kb — lessons array, catalog, schema, memory, totals
 *
 * DOM dependencies: #kb-lessons, #kb-catalog, #kb-schema, #kb-memory,
 *   #epistemic-debt-panel, wisdom vitals elements, page control elements
 */

import {
    escapeHtml, formatTS, parseTS, agentName, annotateAcronyms,
} from '../core/utils.js';

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Wisdom station consumes KB data — no separate fetch needed.
 * Exists for interface consistency with other stations.
 * @returns {Promise<void>}
 */
export async function fetchWisdomData() {
    // No-op: Wisdom tab renders from kbData populated by knowledge.js
}

// ── Render: Lessons ──────────────────────────────────────────

/**
 * Render the lessons table.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} tableState
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControls
 * @param {Function} sortHeader
 */
export function renderLessons(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-lessons");
    if (!container) return;

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
                    <td><span class="agent-dot" data-agent="${l._agent}"></span>${agentName(l._agent, AGENTS)}</td>
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

// ── Render: Catalog (re-exported for Wisdom tab context) ──────

/**
 * Render the discipline catalog (PSH facets).
 * Note: This delegates to the same implementation as knowledge.js renderCatalog.
 * The wisdom tab re-renders catalog + schema in its own panel context.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} tableState
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControls
 * @param {Function} sortHeader
 */
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

// ── Render: Schema ─────────────────────────────────────────────

/**
 * Render the entity schema table (schema.org types).
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} tableState
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControls
 * @param {Function} sortHeader
 */
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

// ── Render: Memory Topics ──────────────────────────────────────

/**
 * Render memory topics table.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {string} activeAgentFilter
 */
export function renderMemoryTopics(AGENTS, kbData, activeAgentFilter) {
    const container = document.getElementById("kb-memory");
    if (!container) return;
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
                const staleCount = t.stale_count || 0;
                const totalCount = t.entry_count || 0;
                const staleRatio = totalCount > 0 ? staleCount / totalCount : 0;
                const freshClass = staleRatio > 0.5 ? "freshness-stale" : staleRatio > 0 ? "freshness-aging" : "freshness-fresh";
                const freshLabel = staleRatio > 0.5 ? "stale" : staleRatio > 0 ? "aging" : "fresh";
                const newest = t.newest ? formatTS(t.newest) : "—";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${t._agent}"></span>${agentName(t._agent, AGENTS)}</td>
                    <td>${escapeHtml(t.topic || "—")}</td>
                    <td style="text-align:center">${totalCount}</td>
                    <td style="text-align:center;${staleCount > 0 ? "color:var(--c-alert)" : ""}">${staleCount}</td>
                    <td style="text-align:center"><span class="freshness-indicator"><span class="freshness-dot ${freshClass}"></span><span class="freshness-label">${freshLabel}</span></span></td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${newest}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Render: Epistemic Debt ─────────────────────────────────────

/**
 * Render the epistemic debt dashboard.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {string} activeAgentFilter
 */
export function renderEpistemicDebt(AGENTS, kbData, activeAgentFilter) {
    const container = document.getElementById("epistemic-debt-panel");
    if (!container) return;
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);

    let totalClaims = 0, unverified = 0, staleClaims = 0;
    let totalMemory = 0, staleMemory = 0;
    let totalLessons = 0, staleLessons = 0;
    let transportFlags = 0;
    const confBuckets = { "< 0.7": 0, "0.7\u20130.8": 0, "0.8\u20130.9": 0, "0.9\u20131.0": 0 };
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

        (kb.data?.claims || []).forEach(c => {
            const conf = parseFloat(c.confidence);
            if (isNaN(conf)) return;
            if (conf < 0.7) confBuckets["< 0.7"]++;
            else if (conf < 0.8) confBuckets["0.7\u20130.8"]++;
            else if (conf < 0.9) confBuckets["0.8\u20130.9"]++;
            else confBuckets["0.9\u20131.0"]++;
        });

        const debtScore = (ac - av) + asm + asl + aef;
        if (debtScore > 0) {
            agentDebt.push({ agent: agent.id, claims: ac - av, memory: asm, lessons: asl, flags: aef, total: debtScore });
        }
    }

    const totalDebt = unverified + staleMemory + staleLessons + transportFlags;
    const debtLevel = totalDebt > 100 ? "high" : totalDebt > 30 ? "moderate" : totalDebt > 0 ? "low" : "none";
    const debtColor = debtLevel === "high" ? "var(--c-alert)" : debtLevel === "moderate" ? "var(--c-warning, #d4944a)" : debtLevel === "low" ? "var(--c-tab-kb)" : "var(--c-tab-pulse)";

    const maxBucket = Math.max(...Object.values(confBuckets), 1);
    const histBars = Object.entries(confBuckets).map(([label, count]) => {
        const pct = Math.round((count / maxBucket) * 100);
        const barColor = label === "< 0.7" ? "var(--c-alert)" : label.startsWith("0.7") ? "var(--c-warning, #d4944a)" : "var(--c-tab-kb)";
        return `<div class="debt-hist-row">
            <span class="debt-hist-label">${label}</span>
            <div class="debt-hist-bar-bg"><div class="debt-hist-bar" style="width:${pct}%;background:${barColor}"></div></div>
            <span class="debt-hist-count">${count}</span>
        </div>`;
    }).join("");

    agentDebt.sort((a, b) => b.total - a.total);
    const agentRows = agentDebt.map(a =>
        `<tr>
            <td><span class="agent-dot" data-agent="${a.agent}"></span>${agentName(a.agent, AGENTS)}</td>
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

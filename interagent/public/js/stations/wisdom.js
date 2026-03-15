/**
 * wisdom.js — Wisdom station (TNG: Counselor Troi's empathic domain —
 * lessons learned, graduated insights, pattern recognition).
 *
 * Renders the Wisdom tab: lessons table and KB+Wisdom vitals.
 * Consumes kbData populated by the knowledge module.
 *
 * Data endpoints (consumed indirectly via kbData):
 *   GET {agent.url}/api/kb — lessons array, totals
 *
 * DOM dependencies: #kb-lessons, wisdom vitals elements, page control elements
 *
 * Global state accessed: AGENTS, kbData, activeAgentFilter, tableState
 * Global functions called: sortTable, goToPage, getFilteredSorted,
 *   renderPageControls, sortHeader, annotateAcronyms
 */

import { escapeHtml, formatTS, parseTS, annotateAcronyms } from '../core/utils.js';

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
 * DOM WRITE: #kb-lessons (innerHTML replacement)
 * @param {Array} AGENTS — agent config array
 * @param {Object} kbData — per-agent KB data
 * @param {Object} tableState — shared table state object
 * @param {Function} getFilteredSorted — table filtering/sorting helper
 * @param {Function} renderPageControls — pagination control renderer
 * @param {Function} sortHeader — sortable header generator
 */
export function renderLessons(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
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
                    <td><span class="agent-dot" data-agent="${l._agent}"></span>${l._agent.replace("-agent","")}</td>
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

// ── Render: Combined Wisdom ────────────────────────────────────

/**
 * Render all Wisdom station sub-sections.
 * @param {Array} AGENTS — agent config array
 * @param {Object} kbData — per-agent KB data
 * @param {Object} tableState — shared table state object
 * @param {Function} getFilteredSorted — table filtering/sorting helper
 * @param {Function} renderPageControls — pagination control renderer
 * @param {Function} sortHeader — sortable header generator
 */
export function renderWisdom(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    renderLessons(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
}

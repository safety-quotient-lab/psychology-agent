/**
 * tables.js — Table state management for sortable, filterable, paginated tables.
 *
 * All data tables in the dashboard share a common interaction pattern:
 * sort by column, filter by text, paginate at a fixed page size. This module
 * centralizes that state and the operations that transform it, keeping
 * rendering dispatch as the only part that varies per table.
 *
 * Design note: rendering functions (renderDecisions, renderClaims, etc.)
 * live outside this module because they contain station-specific DOM
 * manipulation. This module handles the data pipeline; renderers consume
 * its output.
 *
 * DOM dependencies: filter inputs (#filter-{tableId}), page info elements
 *                   (#page-info-{tableId}), page button containers
 *                   (#page-btns-{tableId}).
 * Global state dependency: activeAgentFilter (agent filter selection).
 */

/** Rows per page for all paginated tables. */
export const PAGE_SIZE = 15;

/**
 * Per-table state: sort column, sort direction, text filter, current page,
 * and cached data rows. Each key corresponds to a table identifier used
 * throughout the rendering code.
 */
export const tableState = {
    decisions: { sort: "decided_date", sortDir: -1, filter: "", page: 0, data: [] },
    triggers:  { sort: "last_fired",   sortDir: -1, filter: "", page: 0, data: [] },
    catalog:   { sort: "keyword_count", sortDir: -1, filter: "", page: 0, data: [] },
    schema:    { sort: "entity_count", sortDir: -1, filter: "", page: 0, data: [] },
    messages:  { sort: "timestamp",    sortDir: -1, filter: "", page: 0, data: [] },
    claims:    { sort: "created_at",   sortDir: -1, filter: "", page: 0, data: [] },
    chains:    { sort: "decided_date", sortDir: -1, filter: "", page: 0, data: [] },
    facts:     { sort: "last_confirmed", sortDir: -1, filter: "", page: 0, data: [] },
    lessons:   { sort: "lesson_date",  sortDir: -1, filter: "", page: 0, data: [] },
    flags:     { sort: "created_at",   sortDir: -1, filter: "", page: 0, data: [] },
    actions:   { sort: "created_at",   sortDir: -1, filter: "", page: 0, data: [] },
};

// Render dispatch registry — populated by registerTableRenderer.
const renderers = {};

/**
 * Register a rendering function for a table identifier.
 * Decouples table state operations from station-specific DOM rendering.
 * @param {string} tableId — table identifier matching a key in tableState
 * @param {Function} renderFn — function to call when this table needs re-rendering
 */
export function registerTableRenderer(tableId, renderFn) {
    renderers[tableId] = renderFn;
}

/**
 * Dispatch rendering for a specific table.
 * @param {string} tableId
 */
function dispatchRender(tableId) {
    const fn = renderers[tableId];
    if (typeof fn === "function") fn();
}

/**
 * Toggle sort direction on a column, or switch to a new sort column.
 * Resets page to 0 and triggers re-render.
 * @param {string} tableId — table identifier
 * @param {string} column — column key to sort by
 *
 * DOM WRITE: triggers dispatchRender (indirect DOM mutation via renderer).
 */
export function sortTable(tableId, column) {
    const state = tableState[tableId];
    if (!state) return;
    if (state.sort === column) {
        state.sortDir *= -1;
    } else {
        state.sort = column;
        state.sortDir = -1;
    }
    state.page = 0;
    dispatchRender(tableId);
}

/**
 * Update the text filter for a table from its filter input element.
 * Resets page to 0 and triggers re-render.
 * @param {string} tableId — table identifier
 *
 * DOM READ: reads value from #filter-{tableId} input.
 * DOM WRITE: triggers dispatchRender.
 */
export function filterTable(tableId) {
    const input = document.getElementById(`filter-${tableId}`);
    const state = tableState[tableId];
    if (!state) return;
    state.filter = (input?.value || "").toLowerCase();
    state.page = 0;
    dispatchRender(tableId);
}

/**
 * Navigate to a specific page in a table.
 * @param {string} tableId — table identifier
 * @param {number} page — zero-based page index
 *
 * DOM WRITE: triggers dispatchRender.
 */
export function paginateTable(tableId, page) {
    const state = tableState[tableId];
    if (!state) return;
    state.page = page;
    dispatchRender(tableId);
}

/**
 * Apply agent filter, text filter, sort, and pagination to a row set.
 * Returns the display slice plus metadata for rendering page controls.
 *
 * @param {string} tableId — table identifier (for reading sort/filter/page state)
 * @param {Array<Object>} allRows — complete unfiltered row data
 * @param {Object} sortAccessors — map of column key to accessor function;
 *        falls back to row[column] for unmapped columns
 * @param {string} activeAgentFilter — current agent filter value ("all" or agent id)
 * @returns {{ filtered: Array, display: Array, page: number, totalPages: number, total: number }}
 */
export function getFilteredSorted(tableId, allRows, sortAccessors, activeAgentFilter) {
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

/**
 * Render pagination controls (prev/next buttons + page info text).
 * @param {string} tableId — table identifier
 * @param {number} page — current zero-based page
 * @param {number} totalPages — total page count
 * @param {number} filteredCount — rows after filtering
 * @param {number} totalCount — rows before filtering
 *
 * DOM WRITE: updates #page-info-{tableId} text and #page-btns-{tableId} innerHTML.
 */
export function renderPageControls(tableId, page, totalPages, filteredCount, totalCount) {
    const info = document.getElementById(`page-info-${tableId}`);
    const btns = document.getElementById(`page-btns-${tableId}`);
    if (info) {
        info.textContent = filteredCount < totalCount
            ? `${filteredCount} of ${totalCount} (filtered) \u00B7 Page ${page + 1}/${totalPages}`
            : `${totalCount} total \u00B7 Page ${page + 1}/${totalPages}`;
    }
    if (btns && totalPages > 1) {
        btns.innerHTML = `
            <button class="table-page-btn" aria-label="Previous page" ${page === 0 ? "disabled" : ""} onclick="goToPage('${tableId}',${page - 1})">\u25C0</button>
            <button class="table-page-btn" aria-label="Next page" ${page >= totalPages - 1 ? "disabled" : ""} onclick="goToPage('${tableId}',${page + 1})">\u25B6</button>
        `;
    } else if (btns) {
        btns.innerHTML = "";
    }
}

/**
 * Generate a sortable table header cell.
 * @param {string} tableId — table identifier
 * @param {string} column — column key
 * @param {string} label — display label
 * @returns {string} — HTML string for a <th> element
 *
 * DOM WRITE: returned HTML contains onclick handlers referencing global sortTable.
 */
export function sortHeader(tableId, column, label) {
    const state = tableState[tableId];
    const active = state.sort === column;
    const arrow = active ? (state.sortDir > 0 ? "\u25B2" : "\u25BC") : "\u25B4";
    const ariaSort = active ? (state.sortDir > 0 ? "ascending" : "descending") : "none";
    return `<th class="${active ? "sort-active" : ""}" role="columnheader" aria-sort="${ariaSort}" onclick="sortTable('${tableId}','${column}')" style="cursor:pointer" tabindex="0" onkeydown="if(event.key==='Enter')sortTable('${tableId}','${column}')">${label}<span class="sort-arrow">${arrow}</span></th>`;
}

/**
 * Toggle visibility of an expandable detail row.
 * @param {string} rowId — DOM id of the detail <tr> element
 *
 * DOM WRITE: toggles display style on the target row.
 */
export function toggleRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.style.display = row.style.display === "none" ? "table-row" : "none";
}

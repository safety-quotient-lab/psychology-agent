/**
 * utils.js — Shared utility functions for the Interagent Mesh dashboard.
 *
 * Pure functions (no DOM side effects) unless noted. These provide
 * timestamp parsing/formatting, HTML escaping, and acronym annotation
 * used across multiple stations and renderers.
 *
 * DOM dependencies marked per function.
 */

/**
 * Parse an ISO 8601 timestamp string to epoch milliseconds.
 * Handles full datetime with timezone ("2026-03-10T10:57:33-05:00"),
 * datetime without timezone ("2026-03-10T00:01:41"), and date-only
 * ("2026-03-10").
 *
 * @param {string} ts — ISO timestamp string
 * @returns {number} — epoch milliseconds, or 0 for invalid/missing input
 */
export function parseTS(ts) {
    if (!ts) return 0;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Format a timestamp for compact display.
 * Produces relative strings for recent times ("5m ago", "3h ago",
 * "yesterday 14:30") and absolute strings for older dates
 * ("Mar 10, 14:57"). Date-only inputs render as full dates.
 *
 * @param {string} ts — ISO timestamp string
 * @returns {string} — formatted display string, or "\u2014" for missing input
 */
export function formatTS(ts) {
    if (!ts) return "\u2014";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts.substring(0, 10) || "\u2014";
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

/**
 * Escape a string for safe insertion into HTML.
 * Uses a temporary DOM element to leverage the browser's built-in escaping.
 *
 * @param {string} str — raw string to escape
 * @returns {string} — HTML-safe string
 *
 * DOM WRITE: creates and discards a temporary <div> element (no document mutation).
 */
export function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ── Acronym Annotation ─────────────────────────────────────────────
// Builds a lookup from dictionary data so that acronyms in table cells
// and activity streams can display tooltip definitions. The acronym map
// rebuilds after each knowledge-base fetch cycle.

let acronymMap = {};
let acronymRegex = null;

/**
 * Build the acronym lookup table from fetched dictionary data.
 * Extracts terms from the "Project Acronyms" defined-term-set across
 * all agents, then compiles a regex for efficient annotation.
 *
 * @param {Array} agents — AGENTS array (each with .id property)
 * @param {Object} dictData — dictionary data keyed by agent id
 */
export function buildAcronymMap(agents, dictData) {
    acronymMap = {};
    for (const agent of agents) {
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

/**
 * Annotate pre-escaped HTML text with acronym tooltip wrappers.
 * Returns HTML with <abbr> tags — safe because input was already escaped.
 *
 * @param {string} escapedText — HTML-escaped text to annotate
 * @returns {string} — annotated HTML string
 *
 * DOM WRITE: returned HTML contains onclick handlers referencing global
 *            switchTab and filterDictionary. Mark for attention during
 *            module integration.
 */
export function annotateAcronyms(escapedText) {
    if (!acronymRegex || !escapedText) return escapedText;
    return escapedText.replace(acronymRegex, (match) => {
        const desc = acronymMap[match];
        if (!desc) return match;
        const safeDesc = desc.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        return `<abbr class="acronym-tip" title="${safeDesc}" onclick="event.stopPropagation();switchTab('kb');setTimeout(()=>{const f=document.getElementById('filter-dictionary');if(f){f.value='${match}';filterDictionary();}},100)">${match}</abbr>`;
    });
}

/**
 * Retrieve the current acronym map (read-only access for external consumers).
 * @returns {Object} — map of acronym name to description
 */
export function getAcronymMap() {
    return { ...acronymMap };
}

/**
 * main.js — Orchestrator module for the Interagent Mesh Compositor.
 *
 * Imports all core and station modules, wires globals for onclick handlers,
 * initializes theme/SSE/tab navigation, and triggers initial data fetch.
 *
 * This file serves as the single <script type="module"> entry point.
 */

// ── Core module imports ───────────────────────────────────────────
import { setTheme, initTheme } from './core/theme.js';
import { switchTab, initHashNavigation, VALID_TABS } from './core/tabs.js';
import { configureSse, connectSSE } from './core/sse.js';
import {
    tableState, sortTable, filterTable, paginateTable,
    getFilteredSorted, renderPageControls, sortHeader, toggleRow,
    registerTableRenderer,
} from './core/tables.js';
import {
    parseTS, formatTS, escapeHtml, annotateAcronyms,
    buildAcronymMap, initClock, updateMeshStatus,
} from './core/utils.js';

// ── Station module imports ────────────────────────────────────────
import {
    fetchAgentStatus, fetchPulseData,
    renderVitals, renderAgentCards, renderTopology, renderActivity,
    renderPulse,
} from './stations/pulse.js';
import {
    renderEpistemicDebt, renderEpistemicFlags, renderMessages,
    renderMeta,
} from './stations/meta.js';
import {
    fetchAgentKB, fetchAgentDict, fetchKBData,
    renderKBVitals, renderKBTabVitals,
    renderDecisions, renderTriggers, renderDictionary, renderDictionaryFiltered,
    renderCatalog, renderSchema, renderMemoryTopics,
    renderClaims, renderChains, renderFacts, clearKnowledgeCache,
    renderKB,
} from './stations/knowledge.js';
import { renderLessons, renderWisdom } from './stations/wisdom.js';
import {
    fetchOpsData, renderOpsVitals, renderOpsBudget, renderOpsActions,
    renderActionsTable, renderOpsSchedule, renderOps,
} from './stations/operations.js';
import { fetchScienceData, renderScience } from './stations/science.js';
import { fetchEngineeringData, renderEngineering } from './stations/engineering.js';
import { fetchHelmData, renderHelm } from './stations/helm.js';
import { fetchTacticalData, renderTactical } from './stations/tactical.js';
import { fetchMedicalData, selectAgent, renderMedical } from './stations/medical.js';

// ── Shared state ──────────────────────────────────────────────────
const AGENTS = [
    { id: "psychology-agent", url: "https://psychology-agent.safety-quotient.dev", color: "#5b9cf6" },
    { id: "psq-agent", url: "https://psq-agent.safety-quotient.dev", color: "#4ecdc4" },
    { id: "unratified-agent", url: "https://unratified-agent.unratified.org", color: "#e5a735" },
    { id: "observatory-agent", url: "https://observatory-agent.unratified.org", color: "#a78bfa" },
];

let agentData = {};
let kbData = {};
let dictData = {};
let activeAgentFilter = "all";
let allDictTerms = [];
let sseActive = false;
let refreshTimer = null;

// ── Agent switcher ────────────────────────────────────────────────

function buildAgentSwitcher() {
    let html = '<button class="agent-switch-btn active" data-agent="all" onclick="switchAgent(\'all\')">All</button>';
    for (const agent of AGENTS) {
        const label = agent.id.replace("-agent", "");
        html += `<button class="agent-switch-btn" data-agent="${agent.id}" onclick="switchAgent('${agent.id}')" style="--dot-color:${agent.color}">${label}</button>`;
    }
    for (const id of ["agent-switcher", "kb-agent-switcher", "wisdom-agent-switcher"]) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }
}

function switchAgent(agentId) {
    activeAgentFilter = agentId;
    document.querySelectorAll(".agent-switch-btn").forEach(btn =>
        btn.classList.toggle("active", btn.dataset.agent === agentId)
    );
    // Reset all table pages and re-render
    for (const key of Object.keys(tableState)) {
        tableState[key].page = 0;
    }
    renderKBVitals(AGENTS, kbData, activeAgentFilter);
    renderDecisions(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderTriggers(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderCatalog(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderSchema(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderMemoryTopics(AGENTS, kbData, activeAgentFilter);
    renderEpistemicDebt(AGENTS, kbData, activeAgentFilter);
    renderDictionaryFiltered(document.getElementById("filter-dictionary")?.value || "", allDictTerms, activeAgentFilter);
    renderMessages(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderKBTabVitals(AGENTS, kbData, activeAgentFilter);
    renderClaims(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderChains(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderFacts(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderDictionary(AGENTS, dictData, allDictTerms);
    renderCatalog(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderSchema(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderLessons(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderOps(AGENTS, agentData, tableState);
}

// ── Table renderer dispatch registration ──────────────────────────
// Register renderers so that sortTable/filterTable/paginateTable
// from tables.js can dispatch re-renders without knowing station code.

registerTableRenderer("decisions", () =>
    renderDecisions(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("triggers", () =>
    renderTriggers(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("catalog", () =>
    renderCatalog(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("schema", () =>
    renderSchema(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("messages", () =>
    renderMessages(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("claims", () =>
    renderClaims(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("chains", () =>
    renderChains(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("facts", () =>
    renderFacts(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("lessons", () =>
    renderLessons(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("flags", () =>
    renderEpistemicFlags(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader));
registerTableRenderer("actions", () =>
    renderActionsTable(tableState));

// ── Data fetching ─────────────────────────────────────────────────

async function refreshAll() {
    const results = await Promise.allSettled(AGENTS.map(fetchAgentStatus));
    results.forEach((r, i) => {
        agentData[AGENTS[i].id] = r.status === "fulfilled" ? r.value : { id: AGENTS[i].id, status: "unreachable" };
    });
    // Only render standard tabs if NOT in LCARS mode
    const isLcars = document.body.classList.contains("theme-lcars") ||
                    document.documentElement.classList.contains("theme-lcars");
    if (!isLcars) {
        renderPulse(AGENTS, agentData);
        renderOps(AGENTS, agentData, tableState);
    }

    // Update mobile status bar with online/total counts
    const onlineCount = Object.values(agentData).filter(
        a => a.status === "ok" || a.status === "online" || a.status === "healthy"
    ).length;
    updateMeshStatus(onlineCount, AGENTS.length);

    // Fetch KB data (non-blocking — renders when ready)
    refreshKnowledge();

    const mode = sseActive ? "\u25CF SSE live" : "\u25CB polling 30s";
    document.getElementById("footer-status").textContent =
        `Updated ${new Date().toLocaleTimeString()} \u00B7 ${mode}`;
}

async function refreshKnowledge() {
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
    renderKnowledge();
}

function renderKnowledge() {
    clearKnowledgeCache(tableState);
    // Meta tab
    renderKBVitals(AGENTS, kbData, activeAgentFilter);
    renderMessages(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderMemoryTopics(AGENTS, kbData, activeAgentFilter);
    renderEpistemicDebt(AGENTS, kbData, activeAgentFilter);
    renderEpistemicFlags(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderDecisions(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderTriggers(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    // Knowledge tab
    renderKBTabVitals(AGENTS, kbData, activeAgentFilter);
    renderClaims(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderChains(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderFacts(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderDictionary(AGENTS, dictData, allDictTerms);
    renderCatalog(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    renderSchema(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
    // Wisdom tab
    renderLessons(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader);
}

// ── Dictionary filter (global for oninput handler) ────────────────

function filterDictionary() {
    const input = document.getElementById("filter-dictionary");
    const filter = (input?.value || "").toLowerCase();
    renderDictionaryFiltered(filter, allDictTerms, activeAgentFilter);
}

// ── Page navigation (global for onclick handlers) ─────────────────

function goToPage(tableId, page) {
    paginateTable(tableId, page);
}

function pageTable(tableId, delta) {
    const state = tableState[tableId];
    if (!state) return;
    paginateTable(tableId, state.page + delta);
}

// ── Row expansion (global for onclick handlers) ───────────────────

function toggleDecisionRow(rowId) {
    toggleRow(rowId);
}

// ── Expose globals for inline onclick handlers ────────────────────
// HTML onclick attributes reference these functions globally.

window.setTheme = setTheme;
window.switchTab = (tabId, updateHash) => {
    switchTab(tabId, updateHash);
    // Wire station-specific fetches that switchTab references via typeof checks
    if (tabId === "science") fetchScienceData(AGENTS);
    if (tabId === "medical") fetchMedicalData(AGENTS);
    if (tabId === "engineering") fetchEngineeringData(AGENTS);
    if (tabId === "helm") fetchHelmData();
    if (tabId === "tactical") fetchTacticalData();
    if (tabId === "operations") fetchOpsData();
};
window.refreshAll = refreshAll;
window.switchAgent = switchAgent;
window.sortTable = sortTable;
window.filterTable = filterTable;
window.goToPage = goToPage;
window.filterDictionary = filterDictionary;
window.selectAgent = selectAgent;
window.toggleDecisionRow = toggleDecisionRow;
window.pageTable = pageTable;

// ── Initialization ────────────────────────────────────────────────

(async function init() {
    // Restore saved theme
    initTheme();

    // Start mobile status bar clock
    initClock();

    // Restore tab from URL fragment
    const hashTab = location.hash.replace("#", "");
    if (hashTab && VALID_TABS.includes(hashTab)) switchTab(hashTab, false);

    // Set up hash-based navigation
    initHashNavigation();

    // Build agent switcher buttons
    buildAgentSwitcher();

    // Initial data fetch
    await refreshAll();

    // Configure SSE with dependencies
    configureSse({
        agents: AGENTS,
        refreshAll,
        refreshTimer,
    });

    // Try SSE first, fall back to polling
    connectSSE();

    // Safety net — always have polling as backup until SSE connects
    refreshTimer = setInterval(refreshAll, 30000);
})();

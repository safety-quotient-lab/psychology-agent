// ═══ WINDOW GLOBALS ══════════════════════════════════════════
// ES modules scope all declarations. onclick handlers in HTML
// need these functions on window.
window.setTheme = setTheme;
window.switchTab = switchTab;
window.refreshAll = refreshAll;
window.switchAgent = switchAgent;
window.sortTable = sortTable;
window.filterTable = filterTable;
window.goToPage = goToPage;
window.filterDictionary = filterDictionary;
window.toggleDecisionRow = toggleDecisionRow;
window.setManualAlert = setManualAlert;
window.meshControl = meshControl;
window.openLcarsDetail = openLcarsDetail;
window.closeLcarsDetail = closeLcarsDetail;
window.toggleNarrativeDrawer = toggleNarrativeDrawer;
window.runDiagnostic = runDiagnostic;
window.switchOpsSubsystem = switchOpsSubsystem;

// ── Init ───────────────────────────────────────────────────────
(async function init() {
    // Default to LCARS — the canonical mesh interface
    const savedTheme = localStorage.getItem("theme") || "lcars";
    setTheme(savedTheme);

    // Restore tab from URL hash — AFTER theme, so it overrides any default
    const hashTab = location.hash.replace("#", "");
    if (hashTab && VALID_TABS.includes(hashTab)) switchTab(hashTab, false);

    // Restore subsystem from URL ?sub= parameter
    // Restore subsystem from URL ?sub= parameter
    const urlSub = new URLSearchParams(location.search).get("sub");
    if (urlSub) {
        setTimeout(() => {
            const sciSubs = ["psychometrics", "linguistics", "ontology"];
            const opsSubs = ["pulse-status", "resources-autonomy", "transport-overview", "resources-capacity", "deliberations-log", "governance-record"];
            if (sciSubs.includes(urlSub) && typeof switchSciSubsystem === "function") {
                switchSciSubsystem(urlSub, false);
            } else if (opsSubs.includes(urlSub) && typeof switchOpsSubsystem === "function") {
                switchOpsSubsystem(urlSub);
            }
        }, 100);
    }

    buildAgentSwitcher();
    await refreshAll();

    // Check auth for control surfaces (non-blocking)
    checkAuth();

    // Fetch agent cards for structural schema (non-blocking)
    fetchAgentCards();

    // Try WebSocket — real-time event-driven updates (beta-band relay)
    connectWebSocket();
    // Safety net — polling only until WS connects (WS handler clears timer)
    refreshTimer = setInterval(refreshAll, _pollInterval);
})();

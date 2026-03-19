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
(function init() {
    // Restore theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme && savedTheme !== "dark") setTheme(savedTheme);

    // Restore tab from URL hash
    const hashTab = location.hash.replace("#", "");
    if (hashTab && VALID_TABS.includes(hashTab)) switchTab(hashTab, false);

    // Delay all fetches 2s — let page render first
    setTimeout(function() {
        buildAgentSwitcher();
        refreshAll();
        checkAuth();
        fetchAgentCards();
        // Single conservative poll
        refreshTimer = setInterval(refreshAll, 60000);
    }, 2000);
})();

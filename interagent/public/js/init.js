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
    // Restore theme first (setTheme may switch to default bridge station)
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme && savedTheme !== "dark") setTheme(savedTheme);

    // Restore tab from URL hash — AFTER theme, so it overrides any default
    const hashTab = location.hash.replace("#", "");
    if (hashTab && VALID_TABS.includes(hashTab)) switchTab(hashTab, false);

    buildAgentSwitcher();
    refreshAll(); // non-blocking — don't await, let UI remain interactive

    // Check auth for control surfaces (non-blocking)
    checkAuth();

    // Fetch agent cards for structural schema (non-blocking)
    fetchAgentCards();

    // Poll only — WS disabled temporarily to diagnose freeze
    refreshTimer = setInterval(refreshAll, 60000); // 60s conservative poll
})();

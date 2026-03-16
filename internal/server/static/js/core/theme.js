/**
 * theme.js — Theme management for the Interagent Mesh dashboard.
 *
 * Provides three visual modes: dark (default), light, and LCARS (Star Trek
 * inspired high-saturation palette). Theme choice persists via localStorage.
 *
 * DOM dependencies: elements #btn-dark, #btn-light, #btn-lcars; body classList.
 * Cross-module dependencies:
 *   - switchTab (from tabs.js) — invoked when entering/leaving LCARS mode
 *   - startLcarsStardate, stopLcarsStardate — LCARS clock control (inline)
 *   - updateLcarsHeaderData — refreshes LCARS header metrics (inline)
 *
 * Functions that remain in the inline script (startLcarsStardate,
 * stopLcarsStardate, updateLcarsHeaderData) get called via window globals.
 * TODO: wire these through a callback registry when fully modularized.
 */

/**
 * Apply a visual theme to the document.
 * @param {"dark"|"light"|"lcars"} mode — target theme identifier
 *
 * DOM WRITE: modifies body.classList, button active states,
 *            localStorage("theme"). Calls switchTab, startLcarsStardate,
 *            stopLcarsStardate, updateLcarsHeaderData as needed.
 */
export function setTheme(mode) {
    document.body.classList.remove("theme-light", "theme-lcars");
    if (mode === "light") document.body.classList.add("theme-light");
    if (mode === "lcars") document.body.classList.add("theme-lcars");
    document.getElementById("btn-dark").classList.toggle("active", mode === "dark");
    document.getElementById("btn-light").classList.toggle("active", mode === "light");
    document.getElementById("btn-lcars").classList.toggle("active", mode === "lcars");
    localStorage.setItem("theme", mode);

    // LCARS mode: start stardate clock, switch to bridge station, update header data
    if (mode === "lcars") {
        // TODO: wire to module — startLcarsStardate remains in inline script
        if (typeof window.startLcarsStardate === "function") window.startLcarsStardate();
        // Switch to bridge station: prefer URL hash, then current tab, then Operations
        const bridgeTabs = ["operations", "science", "engineering", "helm", "tactical", "medical"];
        const hashTab = location.hash.replace("#", "");
        const currentTab = document.querySelector('.lcars-tab.active')?.dataset?.tab;
        if (hashTab && bridgeTabs.includes(hashTab)) {
            if (typeof window.switchTab === "function") window.switchTab(hashTab, false);
        } else if (!bridgeTabs.includes(currentTab)) {
            if (typeof window.switchTab === "function") window.switchTab("operations");
        }
        // TODO: wire to module — updateLcarsHeaderData remains in inline script
        if (typeof window.updateLcarsHeaderData === "function") window.updateLcarsHeaderData();
        // Sync sidebar active state
        const activeTab = document.querySelector('.lcars-tab.active');
        if (activeTab) {
            document.querySelectorAll(".lcars-sidebar-btn").forEach(b =>
                b.classList.toggle("active", b.dataset.tab === activeTab.dataset.tab)
            );
        }
    } else {
        // TODO: wire to module — stopLcarsStardate remains in inline script
        if (typeof window.stopLcarsStardate === "function") window.stopLcarsStardate();
        // If leaving LCARS mode while on a LCARS-only tab, switch to Pulse
        const activeTab = document.querySelector('.lcars-tab.active');
        if (activeTab && activeTab.classList.contains('lcars-only')) {
            if (typeof window.switchTab === "function") window.switchTab('pulse');
        }
    }
}

/**
 * Restore saved theme from localStorage on page load.
 * Applies the saved theme if different from default (dark).
 *
 * DOM READ: localStorage("theme").
 */
export function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme && savedTheme !== "dark") {
        setTheme(savedTheme);
    }
}

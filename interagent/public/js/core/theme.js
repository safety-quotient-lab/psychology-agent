/**
 * theme.js — Theme management for the Interagent Mesh dashboard.
 *
 * Provides three visual modes: dark (default), light, and LCARS (Star Trek
 * inspired high-saturation palette). Theme choice persists via localStorage.
 *
 * DOM dependencies: elements #btn-dark, #btn-light, #btn-lcars; body classList.
 * Cross-module dependency: switchTab (from tabs.js) — invoked when leaving
 * LCARS mode while an LCARS-only tab remains active.
 */

/**
 * Apply a visual theme to the document.
 * @param {"dark"|"light"|"lcars"} mode — target theme identifier
 *
 * DOM WRITE: modifies body.classList, #btn-dark, #btn-light, #btn-lcars,
 *            localStorage("theme"). Calls window.switchTab() if leaving LCARS
 *            while on a LCARS-only tab.
 */
export function setTheme(mode) {
    document.body.classList.remove("theme-light", "theme-lcars");
    if (mode === "light") document.body.classList.add("theme-light");
    if (mode === "lcars") document.body.classList.add("theme-lcars");
    document.getElementById("btn-dark").classList.toggle("active", mode === "dark");
    document.getElementById("btn-light").classList.toggle("active", mode === "light");
    document.getElementById("btn-lcars").classList.toggle("active", mode === "lcars");
    // Sync duplicate LCARS-mode header toggle buttons (may not exist in all views)
    const darkLcars = document.getElementById("btn-dark-lcars");
    if (darkLcars) {
        darkLcars.classList.toggle("active", mode === "dark");
        document.getElementById("btn-light-lcars").classList.toggle("active", mode === "light");
        document.getElementById("btn-lcars-lcars").classList.toggle("active", mode === "lcars");
    }
    localStorage.setItem("theme", mode);
    if (mode === "lcars") {
        // Entering LCARS: switch to Engineering (first bridge station)
        // Standard tabs (pulse, meta, kb, wisdom) are hidden in LCARS
        const activeTab = document.querySelector('.lcars-tab.active');
        if (activeTab && !activeTab.classList.contains('lcars-only')) {
            if (typeof window.switchTab === "function") window.switchTab('engineering');
        }
    } else {
        // Leaving LCARS: if on a LCARS-only tab, switch to Pulse
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
    } else {
        // Default dark mode — activate Pulse
        if (typeof window.switchTab === "function") window.switchTab('pulse');
    }
}

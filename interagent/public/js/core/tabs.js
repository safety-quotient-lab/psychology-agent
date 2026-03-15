/**
 * tabs.js — Tab navigation and LCARS spine rendering for the Interagent Mesh.
 *
 * The dashboard organizes content into stations (tabs). Five appear in all
 * themes; four additional stations (science, engineering, helm, tactical)
 * appear only in LCARS mode — modeled after Trek bridge stations.
 *
 * The LCARS spine (left-side vertical bar) reflects the active tab's content
 * sections through colored segments with proportional flex values, providing
 * a structural map of what each station contains.
 *
 * DOM dependencies: .lcars-tab elements, .tab-pane elements, #lcars-spine,
 *                   document.documentElement style properties.
 */

/** All recognized tab identifiers, ordered by navigation sequence. */
export const VALID_TABS = [
    "pulse", "meta", "kb", "wisdom", "operations",
    "science", "medical", "engineering", "helm", "tactical"
];

/**
 * Maps each tab to its CSS custom property for accent color.
 * Used to tint the header band and title when switching tabs.
 */
export const TAB_COLORS = {
    pulse: "--c-tab-pulse",
    meta: "--c-tab-meta",
    kb: "--c-tab-kb",
    wisdom: "--c-tab-wisdom",
    operations: "--c-tab-ops",
    science: "--c-tab-science",
    tactical: "--c-tab-tactical",
    medical: "--c-tab-medical",
    engineering: "--c-tab-engineering",
    helm: "--c-tab-helm",
};

/**
 * LCARS spine segment definitions per tab.
 * Each entry specifies { label, color (CSS var), flex (proportional height) }.
 * Segments render top-to-bottom in the left spine, reflecting the tab's
 * content sections — a structural affordance inherited from LCARS design
 * language (Okuda & Okuda, 1991).
 */
export const SPINE_CONFIG = {
    pulse: [
        { label: "Transport", color: "var(--c-transport)", flex: 2 },
        { label: "Health",    color: "var(--c-tab-pulse)", flex: 3 },
        { label: "Topology",  color: "var(--c-epistemic)", flex: 1 },
    ],
    meta: [
        { label: "Messages",  color: "var(--c-transport)", flex: 3 },
        { label: "Memory",    color: "var(--c-tab-pulse)", flex: 2 },
        { label: "Debt",      color: "var(--c-alert)",     flex: 1 },
        { label: "Decisions", color: "var(--c-tab-meta)",  flex: 3 },
        { label: "Triggers",  color: "var(--c-epistemic)", flex: 2 },
    ],
    kb: [
        { label: "Claims",     color: "var(--c-tab-kb)",    flex: 4 },
        { label: "Chains",     color: "var(--c-epistemic)", flex: 2 },
        { label: "Facts",      color: "var(--c-tab-pulse)", flex: 2 },
        { label: "Vocabulary", color: "var(--c-catalog)",   flex: 1 },
        { label: "Catalog",    color: "var(--c-transport)", flex: 1 },
    ],
    wisdom: [
        { label: "Lessons",    color: "var(--c-tab-wisdom)", flex: 4 },
        { label: "Graduated",  color: "var(--c-tab-pulse)", flex: 2 },
    ],
    operations: [
        { label: "Budget",    color: "var(--c-tab-ops)",   flex: 2 },
        { label: "Actions",   color: "var(--c-health)",    flex: 3 },
        { label: "Schedule",  color: "var(--c-epistemic)", flex: 1 },
    ],
    science: [
        { label: "Affect",     color: "var(--c-tab-science)", flex: 2 },
        { label: "Organism",   color: "var(--c-epistemic)",   flex: 2 },
        { label: "Generators", color: "var(--c-health)",      flex: 2 },
        { label: "Flow",       color: "var(--c-tab-science)", flex: 1 },
        { label: "DEW",        color: "var(--c-alert)",       flex: 1 },
        { label: "Control",    color: "var(--c-transport)",   flex: 1 },
    ],
    medical: [
        { label: "Selector", color: "var(--c-tab-medical)", flex: 1 },
        { label: "Vitals",   color: "var(--c-tab-medical)", flex: 3 },
        { label: "DEW",      color: "var(--c-alert)",       flex: 2 },
        { label: "Control",  color: "var(--c-transport)",   flex: 2 },
        { label: "History",  color: "var(--c-tab-medical)", flex: 1 },
    ],
    engineering: [
        { label: "Spawn",       color: "var(--c-tab-engineering)", flex: 2 },
        { label: "Utilization", color: "var(--c-health)",          flex: 2 },
        { label: "Tempo",       color: "var(--c-tab-engineering)", flex: 2 },
        { label: "Cost",        color: "var(--c-warning)",         flex: 1 },
        { label: "Concurrency", color: "var(--c-transport)",       flex: 1 },
    ],
    helm: [
        { label: "Sessions", color: "var(--c-tab-helm)",    flex: 3 },
        { label: "Routing",  color: "var(--c-tab-helm)",    flex: 2 },
        { label: "Flow",     color: "var(--c-transport)",   flex: 2 },
    ],
    tactical: [
        { label: "Shields",    color: "var(--c-tab-tactical)", flex: 2 },
        { label: "Compliance", color: "var(--c-warning)",      flex: 2 },
        { label: "Transport",  color: "var(--c-transport)",    flex: 2 },
        { label: "Threats",    color: "var(--c-alert)",        flex: 2 },
    ],
};

/**
 * Render LCARS spine segments for the given tab.
 * @param {string} tabId — active tab identifier
 *
 * DOM WRITE: replaces innerHTML of #lcars-spine.
 */
export function updateSpine(tabId) {
    const spine = document.getElementById("lcars-spine");
    if (!spine) return;
    const segments = SPINE_CONFIG[tabId] || SPINE_CONFIG.pulse;
    spine.innerHTML = segments.map((seg, i) => {
        const radius = i === 0 ? "border-radius: var(--elbow-radius) 0 0 0;"
                     : i === segments.length - 1 ? "border-radius: 0 0 0 var(--elbow-radius);"
                     : "";
        return `<div class="lcars-spine-segment" title="${seg.label}" style="background:${seg.color};flex:${seg.flex};${radius}"></div>`;
    }).join("");
}

/**
 * Switch the active tab, update visual state, and trigger data fetches
 * for station-specific tabs.
 * @param {string} tabId — target tab identifier (accepts "knowledge" as legacy alias for "meta")
 * @param {boolean} [updateHash=true] — whether to update the URL fragment
 *
 * DOM WRITE: toggles .active on .lcars-tab and .tab-pane elements,
 *            sets --active-tab-color CSS property, updates browser history.
 * GLOBAL STATE: calls station-specific fetch functions (fetchScienceData, etc.)
 *               which must exist in global scope or get injected during integration.
 */
export function switchTab(tabId, updateHash = true) {
    if (tabId === "knowledge") tabId = "meta"; // backward compat
    if (!VALID_TABS.includes(tabId)) tabId = "pulse";
    document.querySelectorAll(".lcars-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
    document.querySelectorAll(".lcars-sidebar-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.toggle("active", p.id === `pane-${tabId}`));
    // Update header band + title color to match active tab
    const colorVar = TAB_COLORS[tabId] || "--c-tab-pulse";
    document.documentElement.style.setProperty("--active-tab-color", `var(${colorVar})`);
    updateSpine(tabId);
    // Station-specific fetch calls handled by main.js window.switchTab wrapper
    if (updateHash) history.replaceState(null, "", `#${tabId}`);
}

/**
 * Bind hashchange listener for browser back/forward navigation.
 * Call once during initialization.
 *
 * DOM READ: location.hash.
 */
export function initHashNavigation() {
    window.addEventListener("hashchange", () => {
        const tab = location.hash.replace("#", "") || "pulse";
        // Use window.switchTab if available (wired by main.js with station fetch logic)
        const fn = typeof window.switchTab === "function" ? window.switchTab : switchTab;
        fn(tab, false);
    });
}

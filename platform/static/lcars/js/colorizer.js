/**
 * colorizer.js — Centralized color decision engine for the LCARS dashboard.
 *
 * All color choices route through this module. Semiotic rules, alert
 * overrides, delta indicators, health levels, status pips, and
 * operation modes each have a single function that returns the color.
 *
 * Sources: V23.01 Okuda palette, TNG Technical Manual,
 * leonawicz/trekcolors (MIT), docs/lcars-design-reference.md §2.0.
 */

// ── Status pip colors (connectivity) ─────────────────────────
// Exception to semiotic palette: binary system state uses RGB traffic lights.
function pipColor(status) {
    if (status === "online") return "#22cc44";
    if (status === "degraded") return "#ddaa22";
    return "#cc2222"; // offline, unreachable
}

// ── Health level colors (5-level TNG scale) ──────────────────
function healthColor(level) {
    const colors = {
        nominal:  "var(--lcars-readout)",
        advisory: "var(--lcars-title)",
        degraded: "#ddaa22",
        critical: "var(--lcars-alert)",
        failed:   "#cc2222",
        healthy:  "var(--lcars-readout)", // backward compat
    };
    return colors[(level || "").toLowerCase()] || "var(--text-dim)";
}

// ── Delta indicator colors ───────────────────────────────────
// Green for increase, red for decrease. Neutral for zero.
function deltaColor(diff) {
    if (diff > 0) return "#22cc44";
    if (diff < 0) return "#cc2222";
    return "var(--text-dim)";
}

// ── Operation mode colors ────────────────────────────────────
// Neural processing mode → color + icon
function modeStyle(mode) {
    const styles = {
        delib:  { color: "var(--lcars-title)",   icon: "\u26A1" },  // amber + lightning
        consol: { color: "var(--lcars-science)",  icon: "\uD83D\uDCE6" }, // blue + archive
        clear:  { color: "var(--v23-plum-dark, #3D232E)", icon: "\uD83E\uDDF9" }, // indigo + broom
        idle:   { color: "var(--lcars-readout)",  icon: "\u23F8" },  // gold + pause
    };
    return styles[(mode || "idle").toLowerCase()] || styles.idle;
}

// ── Alert level colors (trekcolors canon) ────────────────────
// Structural chrome override colors per alert level.
// Uses official trekcolors palette values (leonawicz/trekcolors, MIT).
function alertColor(level) {
    if (level === 3) return "#CD870E";      // yellow alert (trekcolors --alert-yellow-med)
    if (level === 2) return "#990000";      // red alert (trekcolors --alert-red-dark)
    if (level === 1) return "#0E3A9B";      // black alert (trekcolors --alert-black-med)
    return null;                             // no alert — use normal colors
}

// ── Semiotic palette roles ───────────────────────────────────
// Canonical color assignments per data category (§2.0).
// Color = CATEGORY, never status. Status uses brightness.
const SEMIOTIC = {
    structural: "var(--lcars-frame)",       // frame bars, elbows
    primary:    "var(--lcars-readout)", // data emphasis, row leaders (not interactive)
    data1:      "var(--lcars-secondary)",    // entity names, tier 1
    data2:      "var(--lcars-tertiary)",     // identifiers, tier 2
    title:      "var(--lcars-title)",        // section headers
    science:    "var(--lcars-science)",      // science/medical
    alert:      "var(--lcars-alert)",        // emergency (sparse)
    highlight:  "var(--lcars-highlight)",    // attention, epistemic
};

// ── Agent brand color ────────────────────────────────────────
// Falls back to data1 purple if agent not found.
function agentColor(agentId) {
    const agent = typeof AGENTS !== "undefined" ? AGENTS.find(a => a.id === agentId) : null;
    return agent?.color || "var(--lcars-secondary)";
}

// ── trekcolors palettes (MIT, leonawicz/trekcolors) ─────────
// All 33 named LCARS colors across 4 era palettes.
// Usage: TREK.lcars2369[2] or TREK.byName["hopbush"]
const TREK = (() => {
    const lcars2357 = {
        "pale-canary": "#FFFF99", tanoi: "#FFCC99", "golden-tanoi": "#FFCC66",
        "neon-carrot": "#FF9933", eggplant: "#664466", lilac: "#CC99CC",
        anakiwa: "#99CCFF", mariner: "#3366CC", "bahama-blue": "#006699"
    };
    const lcars2369 = {
        "blue-bell": "#9999CC", melrose: "#9999FF", lilac: "#CC99CC",
        hopbush: "#CC6699", "chestnut-rose": "#CC6666", "orange-peel": "#FF9966",
        "atomic-tangerine": "#FF9900", "golden-tanoi": "#FFCC66"
    };
    const lcars2375 = {
        danub: "#6688CC", indigo: "#4455BB", "lavender-purple": "#9977AA",
        cosmic: "#774466", "red-damask": "#DD6644", "medium-carmine": "#AA5533",
        bourbon: "#BB6622", "sandy-brown": "#EE9955"
    };
    const lcars2379 = {
        periwinkle: "#CCDDFF", "dodger-pale": "#5599FF", "dodger-soft": "#3366FF",
        "near-blue": "#0011EE", "navy-blue": "#000088", husk: "#BBAA55",
        rust: "#BB4411", tamarillo: "#882211"
    };
    // Merge all named colors (deduped)
    const byName = Object.assign({}, lcars2357, lcars2369, lcars2375, lcars2379);
    return {
        lcars2357: Object.values(lcars2357),
        lcars2369: Object.values(lcars2369),
        lcars2375: Object.values(lcars2375),
        lcars2379: Object.values(lcars2379),
        byName,
        // Qualitative scale — 8 maximally distinct LCARS colors for charts
        qualitative: ["#FF9900", "#9999CC", "#CC6699", "#FFCC66", "#6688CC", "#CC6666", "#FF9966", "#CC99CC"],
        // Sequential ramps for heatmaps/gauges
        warm: ["#FFFF99", "#FFCC66", "#FF9933", "#FF9900", "#DD6644", "#BB4411", "#882211"],
        cool: ["#CCDDFF", "#99CCFF", "#5599FF", "#3366CC", "#4455BB", "#0011EE", "#000088"],
        // Alert palettes
        redAlert:    ["#670000", "#990000", "#CD0000", "#FE0000", "#FF9190"],
        yellowAlert: ["#674305", "#986509", "#CD870E", "#FFA90E", "#FFDA67"],
        blackAlert:  ["#050B64", "#0E3A9B", "#307CE4", "#64FFFF", "#000000"],
        // Starfleet divisions
        starfleet: { command: "#5B1414", operations: "#AD722C", science: "#1A6384", medical: "#2C6B70", intelligence: "#483A4A" },
    };
})();

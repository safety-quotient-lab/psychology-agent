/**
 * colorizer.js — Centralized color decision engine for the LCARS dashboard.
 *
 * All color choices route through this module. Semiotic rules, alert
 * overrides, delta indicators, health levels, status pips, and
 * operation modes each have a single function that returns the color.
 *
 * Sources: V23.01 Okuda palette, TNG Technical Manual, trekcolors,
 * docs/lcars-design-reference.md §2.0 color semiotics.
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
        nominal:  "var(--lcars-accent)",
        advisory: "var(--lcars-title)",
        degraded: "#ddaa22",
        critical: "var(--lcars-alert)",
        failed:   "#cc2222",
        healthy:  "var(--lcars-accent)", // backward compat
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
        idle:   { color: "var(--lcars-accent)",  icon: "\u23F8" },  // gold + pause
    };
    return styles[(mode || "idle").toLowerCase()] || styles.idle;
}

// ── Alert level colors ───────────────────────────────────────
// Structural chrome override colors per alert level.
function alertColor(level) {
    if (level === 3) return "#ffcc00";      // yellow alert
    if (level === 2) return "#882222";      // red alert (dark maroon)
    if (level === 1) return "#111111";      // black alert
    return null;                             // no alert — use normal colors
}

// ── Semiotic palette roles ───────────────────────────────────
// Canonical color assignments per data category (§2.0).
// Color = CATEGORY, never status. Status uses brightness.
const SEMIOTIC = {
    structural: "var(--lcars-frame)",       // frame bars, elbows
    primary:    "var(--lcars-accent)",       // active, row leaders
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

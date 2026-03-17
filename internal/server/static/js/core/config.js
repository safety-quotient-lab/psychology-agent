/**
 * config.js — Agent registry and mesh configuration constants.
 *
 * Single source of truth for the AGENTS array. All modules import from here
 * rather than maintaining local copies.
 *
 * Source: app.js lines 34-43
 */

// ── Agent Registry ──────────────────────────────────────────────────
export const AGENTS = [
    // Autonomous agents (Chromabook meshd instances)
    { id: "psychology-agent", name: "psychology", url: "https://psychology-agent.safety-quotient.dev", color: "#5b9cf6" },
    { id: "psq-agent", name: "safety-quotient", url: "https://psq-agent.safety-quotient.dev", color: "#4ecdc4" },
    { id: "unratified-agent", name: "unratified", url: "https://unratified.org", color: "#e5a735" },
    { id: "observatory-agent", name: "observatory", url: "https://observatory.unratified.org", color: "#a78bfa" },
    // Interactive sessions (Mac/gray-box meshd instances)
    { id: "ops-session", name: "ops-session", url: "https://ops-session.safety-quotient.dev", color: "#6b7280" },
    { id: "psy-session", name: "psy-session", url: "https://psy-session.safety-quotient.dev", color: "#7ba4d4" },
];

/**
 * tactical.js — Tactical station (TNG: Tactical console — shields,
 * transport integrity, threat assessment, compliance monitoring).
 *
 * Renders the Tactical tab: transport layer integrity bars.
 * Fetches data from the local /api/health endpoint.
 *
 * Data endpoints:
 *   GET /api/health — git_transport, http_transport, zmq_transport health
 *
 * DOM dependencies: transport-git-fill, transport-git-status,
 *   transport-http-fill, transport-http-status,
 *   transport-zmq-fill, transport-zmq-status
 *
 * Global state accessed: none (uses module-level tacticalData)
 */

// ── Module State ───────────────────────────────────────────────
let tacticalData = null;
let tacticalFetchPending = false;

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch tactical health data from /api/health.
 * Stores result in module-level tacticalData and triggers renderTactical.
 * @returns {Promise<void>}
 */
export async function fetchTacticalData() {
    if (tacticalFetchPending) return;
    tacticalFetchPending = true;
    try {
        const resp = await fetch("/api/health", { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        tacticalData = await resp.json();
    } catch (err) {
        tacticalData = null;
    } finally {
        tacticalFetchPending = false;
    }
    renderTactical();
}

// ── Render: Transport Integrity ────────────────────────────────

/**
 * Update transport layer integrity bars from health data.
 * DOM WRITE: transport-{git,http,zmq}-fill (width, background),
 *   transport-{git,http,zmq}-status (textContent, className)
 */
export function renderTransportIntegrity() {
    if (!tacticalData) return;

    const layers = [
        { id: "git",  field: "git_transport" },
        { id: "http", field: "http_transport" },
        { id: "zmq",  field: "zmq_transport" },
    ];

    layers.forEach(layer => {
        const fill = document.getElementById(`transport-${layer.id}-fill`);
        const status = document.getElementById(`transport-${layer.id}-status`);
        if (!fill || !status) return;

        const health = tacticalData[layer.field] ?? tacticalData[`${layer.id}_status`];
        if (health == null) return;

        const pct = typeof health === "number" ? health : (health.healthy ? 100 : 0);
        const color = pct >= 90 ? "#6aab8e" : pct >= 50 ? "#d4944a" : "#c47070";
        const symbol = pct >= 90 ? "\u2713" : pct >= 50 ? "\u25B2" : "\u2717";
        const cssClass = pct >= 90 ? "transport-ok" : pct >= 50 ? "transport-warn" : "transport-na";

        fill.style.width = pct + "%";
        fill.style.background = color;
        status.textContent = pct + "% " + symbol;
        status.className = "transport-layer-status " + cssClass;
    });
}

// ── Render: Combined Tactical ──────────────────────────────────

/**
 * Render all Tactical station sub-sections.
 */
export function renderTactical() {
    renderTransportIntegrity();
}

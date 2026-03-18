/**
 * app.js — Interagent Mesh LCARS Dashboard
 *
 * Extracted from inline <script> in index.html (session 10).
 * Single-file application — future work splits into ES modules.
 *
 * Table of Contents (grep for ═══ to navigate sections):
 *
 *   ═══ CONFIGURATION        — AGENTS array, constants
 *   ═══ UTILITIES             — fmtNum, sparkline, waveform, agentName
 *   ═══ THREE-ZONE            — Zone A number grid generators
 *   ═══ STATE                 — agentData, kbData, dictData, timers
 *   ═══ TRACKING              — setTrackedValue, mirrorToLcars
 *   ═══ AFFECT + ALERT        — affect modes, alert system, escalation
 *   ═══ BUDGET HELPERS        — getDeliberations, getCutoff
 *   ═══ AUTH + CARDS           — fetchAgentCards, checkAuth
 *   ═══ LCARS CHROME           — subsystem switcher, narrative, stardate, theme
 *   ═══ TABS + NAV             — switchTab, spine, agent switcher
 *   ═══ DATA FETCH             — refreshAll, fetchAgentStatus
 *   ═══ RENDER: PULSE          — renderPulse, renderAgentCards, topology
 *   ═══ RENDER: KNOWLEDGE      — KB tables, dictionary
 *   ═══ RENDER: OPERATIONS     — monologue, budget, actions, schedule, subsystems
 *   ═══ RENDER: SCIENCE        — affect grid, PAD, flow, DEW, LOA, generators
 *   ═══ RENDER: HELM           — session timeline, routing, message flow
 *   ═══ RENDER: ENGINEERING    — deliberation cascade, Gc, tempo, utilization
 *   ═══ RENDER: TACTICAL       — shield status, compliance, trust matrix
 *   ═══ RENDER: MEDICAL        — oscillator, psychometrics, agent selector
 *   ═══ WEBSOCKET + SSE        — connectWebSocket, connectSSE
 *   ═══ INIT                   — DOMContentLoaded bootstrap
 */

// ═══ CONFIGURATION ══════════════════════════════════════════
// Agent registry — daemon processes serving /api/status
const AGENTS = [
    // Autonomous agents (Chromabook meshd via tunnel)
    { id: "psychology-agent", name: "psychology", url: "https://psychology-agent.safety-quotient.dev", color: "#5b9cf6" },
    { id: "psq-agent", name: "safety-quotient", url: "https://psq-agent.safety-quotient.dev", color: "#4ecdc4" },
    { id: "unratified-agent", name: "unratified", url: "https://unratified-agent.unratified.org", color: "#e5a735" },
    { id: "observatory-agent", name: "observatory", url: "https://observatory-agent.unratified.org", color: "#a78bfa" },
    // Interactive sessions (Mac meshd via tunnel)
    { id: "ops-session", name: "ops-session", url: "https://ops-session.safety-quotient.dev", color: "#6b7280" },
    { id: "psy-session", name: "psy-session", url: "https://psy-session.safety-quotient.dev", color: "#7ba4d4" },
];

// Number formatting — thin space thousands separator for readability

// ═══ UTILITIES ═══════════════════════════════════════════════
function fmtNum(n) {
    if (n == null || isNaN(n)) return "\u2014";
    const num = typeof n === "string" ? parseFloat(n) : n;
    if (isNaN(num)) return "\u2014";
    const rounded = Math.round(num);
    // Non-breaking narrow space thousands (LCARS convention: "10 000" not "10,000")
    if (Math.abs(rounded) >= 1000) {
        return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
    }
    return rounded.toString();
}

// Sparkline SVG generator — inline copy from utils.js
function sparklineSVG(values, opts = {}) {
    const w = opts.width || 60, h = opts.height || 16;
    const stroke = opts.stroke || "#9999ff", fill = opts.fill || "none";
    if (!values || values.length < 2) return `<svg class="sparkline-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
    const min = Math.min(...values), max = Math.max(...values), range = max - min || 1, pad = 1;
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * (w - 2 * pad) + pad;
        const y = h - pad - ((v - min) / range) * (h - 2 * pad);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const polyline = points.join(" ");
    let fillPath = fill !== "none" ? `<polygon points="${pad},${h - pad} ${polyline} ${w - pad},${h - pad}" fill="${fill}" opacity="0.2"/>` : "";
    return `<svg class="sparkline-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${fillPath}<polyline points="${polyline}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${points[points.length - 1].split(",")[0]}" cy="${points[points.length - 1].split(",")[1]}" r="2" fill="${stroke}"/></svg>`;
}

// Waveform SVG generator — Com Link (J/K) pattern
// Renders oscillating signal between horizontal framing bars
function waveformSVG(opts = {}) {
    const w = opts.width || 200, h = opts.height || 40;
    const amplitude = opts.amplitude || 0.5; // 0-1 signal strength
    const frequency = opts.frequency || 3;   // wave cycles
    const phase = opts.phase || 0;           // phase offset for animation
    const stroke = opts.stroke || "#ff9966";
    const barColor = opts.barColor || "rgba(153,153,255,0.3)";
    const points = [];
    const pad = 2;
    const midY = h / 2;
    const maxAmp = (h / 2 - pad) * Math.min(1, amplitude);
    const steps = Math.max(40, w);
    for (let i = 0; i <= steps; i++) {
        const x = pad + (i / steps) * (w - 2 * pad);
        // Composite wave: primary + harmonic + noise, phase-shifted
        const t = (i / steps) * Math.PI * 2 * frequency + phase;
        const wave = Math.sin(t) * 0.7 + Math.sin(t * 2.3 + phase * 0.7) * 0.2 + Math.sin(t * 5.1 + phase * 1.3) * 0.1;
        const y = midY - wave * maxAmp;
        points.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
        <line x1="${pad}" y1="${pad}" x2="${w - pad}" y2="${pad}" stroke="${barColor}" stroke-width="2"/>
        <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="${barColor}" stroke-width="2"/>
        <polyline points="${points.join(" ")}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" opacity="${Math.max(0.3, amplitude)}"/>
    </svg>`;
}

// ── Waveform Animation Controller ─────────────────────────────
let _waveAnimFrame = null;
let _wavePhase = 0;
let _waveOpts = null; // cached opts from last render

function startWaveformAnimation() {
    if (_waveAnimFrame) return; // already running
    function tick() {
        _wavePhase += 0.05; // phase increment per frame
        const tempoWaveEl = document.getElementById("tempo-waveform");
        if (tempoWaveEl && _waveOpts) {
            tempoWaveEl.innerHTML = waveformSVG({ ..._waveOpts, phase: _wavePhase });
        }
        const medOscEl = document.getElementById("med-oscillator-wave");
        if (medOscEl && medOscEl._waveOpts) {
            medOscEl.innerHTML = waveformSVG({ ...medOscEl._waveOpts, phase: _wavePhase });
        }
        _waveAnimFrame = requestAnimationFrame(tick);
    }
    _waveAnimFrame = requestAnimationFrame(tick);
}

function stopWaveformAnimation() {
    if (_waveAnimFrame) {
        cancelAnimationFrame(_waveAnimFrame);
        _waveAnimFrame = null;
    }
}

// ── SVG L-Shape Frame ─────────────────────────────────────
// One continuous path for the entire LCARS frame — sidebar + header +
// elbow. Eliminates seams between stacked CSS elements.
// Redraws on resize. Positioned behind all interactive elements.
function renderLcarsFrameSVG() {
    const svg = document.getElementById("lcars-frame-svg");
    if (!svg || !document.body.classList.contains("theme-lcars")) return;

    const frame = document.querySelector(".lcars-frame");
    if (!frame) return;

    const W = frame.clientWidth;
    const H = frame.clientHeight;
    const style = getComputedStyle(document.documentElement);
    const sw = parseInt(style.getPropertyValue("--sidebar-width")) || 160;
    const bandH = parseInt(style.getPropertyValue("--band-size")) || 52;
    const ro = parseInt(style.getPropertyValue("--elbow-outer")) || 48;
    const ri = parseInt(style.getPropertyValue("--elbow-inner")) || 24;

    // L-shape path: clockwise from top-left outer corner
    //
    //  ╭ro─────────────────────────╮ro
    //  │                            │
    //  │   header band (bandH)      │
    //  │                            │
    //  │        ╭ri (concave)───────╯
    //  │        │
    //  │sidebar │  content area
    //  │  (sw)  │
    //  │        │
    //  ╰ro──────╯

    const path = [
        // Start: top-left, just below the outer radius
        `M 0 ${ro}`,
        // Outer top-left corner (arc curving from left edge to top edge)
        `A ${ro} ${ro} 0 0 1 ${ro} 0`,
        // Top edge → top-right corner
        `L ${W - ro} 0`,
        // Outer top-right corner
        `A ${ro} ${ro} 0 0 1 ${W} ${ro}`,
        // Right edge down to header bottom
        `L ${W} ${bandH}`,
        // Header bottom edge back to inner elbow
        `L ${sw + ri} ${bandH}`,
        // Inner concave curve (quarter circle — content side)
        `A ${ri} ${ri} 0 0 0 ${sw} ${bandH + ri}`,
        // Sidebar right edge down to bottom
        `L ${sw} ${H - ro}`,
        // Outer bottom-left corner
        `A ${ro} ${ro} 0 0 1 ${sw - ro} ${H}`,
        // Bottom edge to left
        `L ${ro} ${H}`,
        // Actually, just go straight to left edge bottom
        `L 0 ${H}`,
        // Left edge back up to start
        `Z`,
    ].join(" ");

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    // Compute actual frame color for SVG gradient stops
    const frameColor = style.getPropertyValue("--lcars-frame").trim();
    // Resolve CSS var to actual hex via temp element
    const tmp = document.createElement("div");
    tmp.style.color = frameColor;
    document.body.appendChild(tmp);
    const resolved = getComputedStyle(tmp).color;
    tmp.remove();

    // Parse rgb(r,g,b) → components
    const rgb = resolved.match(/\d+/g)?.map(Number) || [238, 143, 72];
    const [r, g, b] = rgb;
    const hex = (r, g, b) => "#" + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
    const mix = (pct, tr, tg, tb) => hex(r * pct + tr * (1 - pct), g * pct + tg * (1 - pct), b * pct + tb * (1 - pct));

    // Non-uniform internal glow: darker edges, brighter center, off-center highlight
    const dark = mix(0.78, 26, 16, 0);   // edge: 78% frame + 22% dark warm
    const mid = hex(r, g, b);              // pure frame
    const bright = mix(0.92, 255, 232, 204); // highlight: 92% frame + 8% warm white
    const peak = mix(0.95, 255, 244, 224);   // peak: 95% frame + 5% cream

    svg.innerHTML = `
        <defs>
            <linearGradient id="lcars-frame-grad-h" x1="0" y1="0" x2="${sw}" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="${dark}"/>
                <stop offset="8%" stop-color="${mix(0.88, 42, 24, 0)}"/>
                <stop offset="25%" stop-color="${mid}"/>
                <stop offset="38%" stop-color="${bright}"/>
                <stop offset="55%" stop-color="${peak}"/>
                <stop offset="72%" stop-color="${mid}"/>
                <stop offset="100%" stop-color="${dark}"/>
            </linearGradient>
        </defs>
        <path d="${path}" fill="url(#lcars-frame-grad-h)" />
    `;
}

// Debounced resize handler
let _frameSvgTimer = null;
function scheduleFrameSVG() {
    clearTimeout(_frameSvgTimer);
    _frameSvgTimer = setTimeout(renderLcarsFrameSVG, 100);
}

// Sparkline history — accumulates values across refreshes for trend display
const sparkHistory = {};
function pushSparkValue(key, value) {
    if (value == null || isNaN(value)) return;
    if (!sparkHistory[key]) sparkHistory[key] = [];
    sparkHistory[key].push(value);
    if (sparkHistory[key].length > 20) sparkHistory[key].shift();
}

// Display name helper — use agent.name if available, otherwise strip "-agent"
function agentName(agentOrId) {
    if (typeof agentOrId === "object" && agentOrId.name) return agentOrId.name;
    const id = typeof agentOrId === "string" ? agentOrId : agentOrId?.id || "";
    const found = AGENTS.find(a => a.id === id);
    return found?.name || id.replace("-agent", "").replace("psq", "safety-quotient");
}

// ── Three-Zone Number Grid Generator (§4.1) ────────────────
// Fills Zone A with labeled key-value metrics from real agent data.
// Color encodes data type: orange=counts, purple=IDs, white=measured, gold=alert
// Each metric has a label so the operator knows what they're reading.

// ═══ THREE-ZONE ═════════════════════════════════════════════
function renderNumberGrid(containerId, metrics) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!metrics || metrics.length === 0) { el.innerHTML = ""; return; }

    el.innerHTML = metrics.map(m => {
        const cls = m.alert ? "zn zn-alert" : m.type === "count" ? "zn zn-count"
            : m.type === "id" ? "zn zn-id" : "zn zn-val";
        return `<span class="zn-pair"><span class="zn-label">${m.label}</span><span class="${cls}">${m.value}</span></span>`;
    }).join("");
}

// Operations Zone A — mesh-wide summary metrics
function opsZoneAMetrics() {
    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalDelib = online.reduce((s, a) => s + getDeliberations(a.data?.autonomy_budget), 0);
    const totalCutoff = online.reduce((s, a) => s + getCutoff(a.data?.autonomy_budget), 0);
    const totalMsgs = online.reduce((s, a) => s + (a.data?.recent_messages?.length || 0), 0);
    const pending = online.reduce((s, a) => s + (a.data?.unprocessed_messages?.length || 0), 0);
    const gates = online.reduce((s, a) => s + (a.data?.active_gates?.length || 0), 0);
    const events = online.reduce((s, a) => s + (a.data?.event_count || 0), 0);
    const sessions = online.reduce((s, a) => s + (a.data?.totals?.sessions || 0), 0);
    const decisions = online.reduce((s, a) => s + (a.data?.totals?.decisions || 0), 0);

    // Gc (crystallized intelligence) — events handled without LLM invocation
    const gcEvents = online.reduce((s, a) => s + (a.data?.gc_metrics?.events_processed || 0), 0);
    const gcLastHr = online.reduce((s, a) => s + (a.data?.gc_metrics?.deliberations_last_hour || 0), 0);
    const uptimeHrs = Math.round(online.reduce((s, a) => s + (a.data?.uptime_seconds || 0), 0) / 3600);

    return [
        { label: "ONLINE", value: `${online.length}/${AGENTS.length}`, type: "count" },
        { label: "Gc", value: fmtNum(gcEvents) + delta("za-gc", gcEvents), type: "id" },
        { label: "Gf", value: fmtNum(totalDelib) + delta("za-gf", totalDelib), type: "count" },
        { label: "LIMIT", value: totalCutoff > 0 ? fmtNum(totalCutoff) : "\u221E", type: "id" },
        { label: "Gf/HR", value: fmtNum(gcLastHr) + delta("za-gfhr", gcLastHr), type: "count" },
        { label: "MSG", value: fmtNum(totalMsgs) + delta("za-msg", totalMsgs), type: "val" },
        { label: "PEND", value: fmtNum(pending) + delta("za-pend", pending), type: "count", alert: pending > 5 },
        { label: "GATE", value: fmtNum(gates) + delta("za-gate", gates), type: "id" },
        { label: "EVT", value: fmtNum(events) + delta("za-evt", events), type: "val" },
        { label: "UPTIME", value: uptimeHrs + "h", type: "val" },
        { label: "SESS", value: fmtNum(sessions), type: "id" },
        { label: "DEC", value: fmtNum(decisions), type: "count" },
    ];
}

// Science Zone A — psychometric construct readings across mesh
function scienceZoneAMetrics() {
    const online = Object.values(agentData).filter(a => a.status === "online");
    // Mesh-wide averages
    let vSum = 0, aSum = 0, dSum = 0, clSum = 0, fSum = 0, n = 0;
    for (const a of online) {
        const p = a.data?.psychometrics || {};
        const es = p.emotional_state || {};
        if (es.valence != null) { vSum += es.valence; aSum += (es.arousal ?? 0); dSum += (es.dominance ?? 0); n++; }
        clSum += (p.cognitive_load ?? 0);
        fSum += (p.flow_state ?? 0);
    }
    const avg = (v, c) => c > 0 ? (v / c).toFixed(2) : "\u2014";
    const pct = (v, c) => c > 0 ? Math.round((v / c) * 100) + "%" : "\u2014";
    return [
        { label: "VALENCE", value: avg(vSum, n), type: "val" },
        { label: "AROUSAL", value: avg(aSum, n), type: "count" },
        { label: "DOMINANCE", value: avg(dSum, n), type: "id" },
        { label: "COG LOAD", value: pct(clSum, online.length), type: "count", alert: online.length > 0 && clSum / online.length > 0.8 },
        { label: "FLOW", value: pct(fSum, online.length), type: "val" },
        { label: "AGENTS", value: `${n}/${online.length}`, type: "id" },
    ];
}

// Engineering Zone A — deliberation performance metrics
function engZoneAMetrics() {
    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalDelib = online.reduce((s, a) => s + getDeliberations(a.data?.autonomy_budget), 0);
    let totalCost = 0, totalDur = 0, totalDelibs = 0;
    for (const a of online) {
        const deliberations = a.data?.recent_deliberations || [];
        totalDelibs += deliberations.length;
        totalCost += deliberations.reduce((s, d) => s + (parseFloat(d.cost) || 0), 0);
        totalDur += deliberations.reduce((s, d) => s + (parseInt(d.duration_ms) || 0), 0);
    }
    const avgDur = totalDelibs > 0 ? Math.round(totalDur / totalDelibs / 1000) : 0;
    const rho = engineeringData?.tempo?.mesh?.utilization;
    return [
        { label: "Gf TOTAL", value: fmtNum(totalDelib), type: "count" },
        { label: "RECENT", value: fmtNum(totalDelibs), type: "count" },
        { label: "COST", value: "$" + totalCost.toFixed(1), type: "val" },
        { label: "AVG DUR", value: avgDur + "s", type: "id" },
        { label: "\u03C1", value: rho != null ? (rho * 100).toFixed(0) + "%" : "\u2014", type: "count", alert: rho > 0.8 },
        { label: "AGENTS", value: `${online.length}/${AGENTS.length}`, type: "id" },
    ];
}


// ═══ STATE ═══════════════════════════════════════════════════
let agentData = {};
let kbData = {};
let dictData = {};
let refreshTimer = null;
let activeAgentFilter = "all";
let sseConnections = [];
let sseActive = false;

// ── Delta Tracker ─────────────────────────────────────────────
// Tracks previous values and renders directional change indicators
// next to every numeric display.

// ═══ TRACKING ════════════════════════════════════════════════
const _prevValues = {};

// Inline delta tracker — returns "↑N" or "↓N" or "" for use in template strings.
// First call for a key seeds the value (returns ""), subsequent calls show delta.
const _deltaTracker = {};
function delta(key, value) {
    if (value == null || isNaN(value)) return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    if (!(key in _deltaTracker)) {
        _deltaTracker[key] = num;
        return ""; // first reading — seed, no delta
    }
    const prev = _deltaTracker[key];
    _deltaTracker[key] = num;
    const diff = num - prev;
    if (diff === 0) return "";
    const arrow = diff > 0 ? "\u2191" : "\u2193";
    const abs = Math.abs(diff);
    return ` <span style="font-size:0.8em;color:${deltaColor(diff)}">${arrow}${abs > 999 ? fmtNum(abs) : abs}</span>`;
}

/**
 * Update a numeric element with delta tracking.
 * @param {string} elementId - DOM element ID
 * @param {number|null} value - current numeric value
 * @param {object} opts
 * @param {string} opts.format - "int", "float", "pct", "ratio" (default: "int")
 * @param {boolean} opts.inverted - true if lower values represent improvement (default: false)
 * @param {string} opts.suffix - text appended after value (default: "")
 * @param {string} opts.prefix - text prepended before value (default: "")
 * @param {boolean} opts.showDelta - whether to show delta (default: true)
 */
function setTrackedValue(elementId, value, opts = {}) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const { format = "int", inverted = false, suffix = "", prefix = "", showDelta = true } = opts;

    if (value === null || value === undefined) {
        el.textContent = "—";
        return;
    }

    // Format the value
    let displayVal;
    switch (format) {
        case "float": displayVal = value.toFixed(2); break;
        case "pct": displayVal = Math.round(value * 100) + "%"; break;
        case "ratio": displayVal = value.toFixed(1); break;
        default: displayVal = Math.round(value).toString(); break;
    }

    // Compute delta from previous value
    const prev = _prevValues[elementId];
    _prevValues[elementId] = value;

    let deltaHtml = "";
    if (showDelta && prev !== undefined && prev !== null) {
        const diff = value - prev;
        if (Math.abs(diff) > 0.001) {
            const isGood = inverted ? diff < 0 : diff > 0;
            const isBad = inverted ? diff > 0 : diff < 0;
            const arrow = diff > 0 ? "\u2191" : "\u2193";
            const color = isGood ? "#6aab8e" : isBad ? "#c47070" : "var(--text-dim)";
            let diffStr;
            switch (format) {
                case "float": diffStr = Math.abs(diff).toFixed(2); break;
                case "pct": diffStr = Math.abs(Math.round(diff * 100)) + "%"; break;
                case "ratio": diffStr = Math.abs(diff).toFixed(1); break;
                default: diffStr = Math.abs(Math.round(diff)).toString(); break;
            }
            deltaHtml = ` <span style="font-size:0.6em;color:${color};font-weight:400">${arrow}${diffStr}</span>`;
        }
    }

    el.innerHTML = `${prefix}${displayVal}${suffix}${deltaHtml}`;
}

// ── LCARS Content Mirroring ────────────────────────────────────
// Copies rendered content from standard tabs to LCARS-only panels
function mirrorToLcars(sourceId, lcarsId) {
    if (!document.body.classList.contains("theme-lcars")) return;
    const source = document.getElementById(sourceId);
    const target = document.getElementById(lcarsId);
    if (source && target) {
        target.innerHTML = source.innerHTML;
        reattachMirrorHandlers(sourceId, target);
    }
}

/**
 * Reattach event handlers to mirrored content.
 * innerHTML copies HTML attributes (inline onclick) but not
 * .onclick property assignments. This restores interactivity
 * for elements that use property-based handler attachment.
 */
function reattachMirrorHandlers(sourceId, target) {
    // Agent cards use .onclick = () => { ... } — need reattachment
    if (sourceId === "agents-grid") {
        target.querySelectorAll(".agent-card").forEach(card => {
            const agentId = card.dataset?.agent;
            if (agentId) {
                card.style.cursor = "pointer";
                card.onclick = () => { window.switchAgent(agentId); window.switchTab("meta"); };
            }
        });
    }

    // Activity items with inline onclick that depend on #filter-messages:
    // ensure the filter input exists before the handler fires
    if (sourceId === "activity-stream") {
        target.querySelectorAll(".activity-link").forEach(link => {
            const originalOnclick = link.getAttribute("onclick");
            if (originalOnclick && originalOnclick.includes("filter-messages")) {
                link.onclick = (e) => {
                    e.preventDefault();
                    const filterEl = document.getElementById("filter-messages");
                    if (filterEl) {
                        // Extract session name from the onclick string
                        const match = originalOnclick.match(/value='([^']+)'/);
                        if (match) filterEl.value = match[1];
                        window.filterTable("messages");
                    }
                    window.switchTab("meta");
                };
            }
        });
    }
}

// ── Affect-Responsive Layout ──────────────────────────────────


// ═══ AFFECT + ALERT ══════════════════════════════════════════
const AFFECT_MODES = {
    "calm-satisfied": "rich",
    "alert-engaged": "focused",
    "frustrated": "streamlined",
    "overwhelmed": "triage",
    "bored": "rich",           // stimulating → show more detail
    "withdrawn": "rich",
    "anxious": "rich",         // reassuring → keep full view, highlight healthy
    "distressed": "streamlined",
};

function applyAffectMode(affectCategory) {
    const mode = AFFECT_MODES[affectCategory] || "rich";
    document.body.dataset.affectMode = mode;
}

// ── Alert Condition System ─────────────────────────────────────

let currentAlertLevel = 5; // GREEN
let manualAlertOverride = null;

// Track when agents first went offline (for timed escalation)
const agentOfflineSince = {}; // agentId → Date timestamp
const ALERT_ESCALATION_MS = 60_000; // 60s: yellow → red

// Update offline timestamps on each evaluation cycle
function updateOfflineTimestamps() {
    for (const [agentId, info] of Object.entries(agentData)) {
        if (info?.status === "unreachable") {
            if (!agentOfflineSince[agentId]) {
                agentOfflineSince[agentId] = Date.now();
            }
        } else {
            delete agentOfflineSince[agentId];
        }
    }
}

function offlineAgentCount() {
    return Object.values(agentData).filter(a => a?.status === "unreachable").length;
}

function anyAgentOfflineLong() {
    const now = Date.now();
    return Object.values(agentOfflineSince).some(ts => (now - ts) >= ALERT_ESCALATION_MS);
}

const ALERT_TRIGGERS = [
    // YELLOW (level 3) triggers
    { level: 3, name: "autonomy-high",
      test: () => Object.values(agentData).some(a => {
          if (a?.status !== "online") return false;
          const b = a.data?.autonomy_budget || {};
          const cutoff = getCutoff(b);
          return cutoff > 0 && getDeliberations(b) / cutoff > 0.75;
      }),
      description: "Agent autonomy counter exceeded 75% of limit" },
    { level: 3, name: "agent-degraded",
      test: () => Object.values(agentData).some(a => a?.data?.health === "degraded"),
      description: "Agent health degraded" },
    // Context degradation cliff (psy-session Turn 1: empirical threshold 80%)
    { level: 3, name: "context-degradation",
      test: () => Object.values(agentData).some(a => {
          if (a?.status !== "online") return false;
          const ctx = a.data?.context_usage || a.data?.psychometrics?.context_consumption;
          return ctx != null && ctx > 0.80;
      }),
      description: "Agent context >80% — degradation cliff" },
    // YELLOW for brief offline (1-2 agents, <60s)
    { level: 3, name: "agent-offline-brief",
      test: () => {
          const count = offlineAgentCount();
          return count > 0 && count <= 2 && !anyAgentOfflineLong();
      },
      description: "Agent briefly offline (<60s)" },
    // RED (level 2) triggers — sustained offline (>60s) or 3+ agents down
    { level: 2, name: "agent-offline-sustained",
      test: () => {
          const count = offlineAgentCount();
          return (count > 0 && anyAgentOfflineLong()) || count > 2;
      },
      description: "Agent offline >60s or multiple agents down" },
    { level: 2, name: "autonomy-exhausted",
      test: () => Object.values(agentData).some(a => {
          if (a?.status !== "online") return false;
          const b = a.data?.autonomy_budget || {};
          const cutoff = getCutoff(b);
          return cutoff > 0 && getDeliberations(b) >= cutoff;
      }),
      description: "Agent autonomy limit reached" },
    // BLACK (level 1) triggers — Ita intervention (neuroglial infrastructure)
    // 1. Deploys: version mismatch across agents
    { level: 1, name: "rolling-deploy",
      test: () => {
          const versions = Object.values(agentData)
              .filter(a => a?.status === "online" && a.data?.version)
              .map(a => a.data.version);
          return versions.length > 1 && new Set(versions).size > 1;
      },
      description: "Rolling deployment — version mismatch across agents" },
    // 2. Neuroglial activity: mesh paused or operations-agent actively deliberating
    { level: 1, name: "mesh-paused",
      test: () => Object.values(agentData).some(a =>
          a?.status === "online" && a.data?.mesh_mode === "paused"),
      description: "Mesh paused — neuroglial maintenance" },
    { level: 1, name: "ita-deliberation",
      test: () => {
          const ops = agentData["operations-agent"];
          if (ops?.status !== "online") return false;
          const recent = ops.data?.recent_deliberations || [];
          const latest = recent[0]?.started_at || "";
          return latest && (Date.now() - new Date(latest.replace(" ", "T") + "Z").getTime()) < 120000;
      },
      description: "Ita deliberation — operations-agent actively processing" },
    // 3. Manual: setManualAlert(1) — handled by evaluateAlertLevel()
    // 4. Section 42: all agents simultaneously critical
    { level: 1, name: "section-42",
      test: () => {
          const online = Object.values(agentData).filter(a => a?.status === "online");
          return online.length > 0 && online.every(a =>
              a.data?.health === "critical" || a.data?.health === "failed");
      },
      description: "Section 42 — mesh-wide critical failure" },
];

function evaluateAlertLevel() {
    updateOfflineTimestamps();
    let autoLevel = 5; // GREEN default
    const activeReasons = [];
    for (const trigger of ALERT_TRIGGERS) {
        try {
            if (trigger.test()) {
                if (trigger.level < autoLevel) autoLevel = trigger.level;
                activeReasons.push(trigger.description);
            }
        } catch (e) { /* skip failing trigger */ }
    }
    // Manual override can raise but not lower below auto
    const effectiveLevel = manualAlertOverride !== null
        ? Math.min(manualAlertOverride, autoLevel)
        : autoLevel;

    if (effectiveLevel !== currentAlertLevel) {
        currentAlertLevel = effectiveLevel;
        document.body.dataset.alertLevel = effectiveLevel;
        const names = { 5: "GREEN", 4: "BLUE", 3: "YELLOW", 2: "RED", 1: "BLACK" };
        addNarrativeEntry(`Alert condition changed to ${names[effectiveLevel]}${activeReasons.length ? ": " + activeReasons.join("; ") : ""}`);
    }
    // Start escalation timer when any agents offline
    if (offlineAgentCount() > 0) startAlertEscalation();
}

function setManualAlert(level) {
    manualAlertOverride = level;
    evaluateAlertLevel();
}

// Re-evaluate alert every 10s so yellow→red escalation triggers
// even between data refreshes (escalation threshold = 60s)
let _alertEscalationTimer = null;
function startAlertEscalation() {
    if (_alertEscalationTimer) return;
    _alertEscalationTimer = setInterval(() => {
        if (offlineAgentCount() > 0) {
            evaluateAlertLevel();
        } else {
            clearInterval(_alertEscalationTimer);
            _alertEscalationTimer = null;
        }
    }, 10_000);
}

// ── Autonomy Counter Helpers ────────────────────────────────────
// Backward-compat: old format reports budget_current (remaining) and
// budget_max. New format reports budget_spent (counter) and budget_cutoff.
// Deliberations = number of autonomous actions taken.

// ═══ BUDGET HELPERS ═════════════════════════════════════════
function getDeliberations(autonomyBlock) {
    const b = autonomyBlock || {};
    // New format: budget_spent directly gives deliberation count
    if (b.budget_spent !== undefined) return Math.round(parseFloat(b.budget_spent) || 0);
    // Old format: spent = max - current
    if (b.budget_max !== undefined && b.budget_current !== undefined) {
        return Math.round((parseFloat(b.budget_max) || 0) - (parseFloat(b.budget_current) || 0));
    }
    return 0;
}

function getCutoff(autonomyBlock) {
    const b = autonomyBlock || {};
    // New format: budget_cutoff (0 = unlimited)
    if (b.budget_cutoff !== undefined) return Math.round(parseFloat(b.budget_cutoff) || 0);
    // Old format: budget_max represented pool size, NOT an operational
    // limit. Treat as unlimited (0) in counter model.
    return 0;
}

// ── Diagnostic Levels (TNG Technical Manual) ──────────────────

async function runDiagnostic(level) {
    if (!authUser) {
        addNarrativeEntry(`Diagnostic Level ${level} requested — authentication required`);
        return;
    }
    const statusEl = document.getElementById(`diag-${level}-status`);
    if (statusEl) { statusEl.textContent = "RUNNING"; statusEl.style.color = "var(--c-warning, #d4944a)"; }
    addNarrativeEntry(`Diagnostic Level ${level} initiated by operator`);

    try {
        // Level 3 can run client-side — just refresh all data
        if (level === 3) {
            await refreshAll();
            if (statusEl) { statusEl.textContent = "COMPLETE"; statusEl.style.color = "#6aab8e"; }
            addNarrativeEntry(`Diagnostic Level 3 complete — quick sweep finished`);
            setTimeout(() => { if (statusEl) { statusEl.textContent = "READY"; statusEl.style.color = "var(--text-dim)"; } }, 5000);
            return;
        }
        // Other levels: POST to diagnostic API
        const resp = await fetch("/api/diagnostic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level }),
        });
        if (resp.ok) {
            const result = await resp.json();
            if (statusEl) { statusEl.textContent = "COMPLETE"; statusEl.style.color = "#6aab8e"; }
            addNarrativeEntry(`Diagnostic Level ${level} complete — ${result.summary || "results available"}`);
            openLcarsDetail(`Diagnostic Level ${level} Results`, "#ff9944",
                `<pre style="white-space:pre-wrap;font-size:0.82em">${JSON.stringify(result, null, 2)}</pre>`);
        } else {
            if (statusEl) { statusEl.textContent = "FAILED"; statusEl.style.color = "#c47070"; }
            addNarrativeEntry(`Diagnostic Level ${level} failed — ${resp.status}`);
        }
    } catch (e) {
        if (statusEl) { statusEl.textContent = "ERROR"; statusEl.style.color = "#c47070"; }
        addNarrativeEntry(`Diagnostic Level ${level} error — ${e.message}`);
    }
    setTimeout(() => { if (statusEl) { statusEl.textContent = "READY"; statusEl.style.color = "var(--text-dim)"; } }, 10000);
}

// ── Agent Card Fetching (Layer 5) ──────────────────────────────



/**
 * utils.js — Shared utility functions for the Interagent Mesh dashboard.
 *
 * Extracted from app.js. Contains formatting helpers, SVG generators,
 * delta tracking, acronym annotation, and timestamp utilities.
 * Pure functions (no DOM side effects) unless noted.
 *
 * DOM dependencies marked per function.
 *
 * Source: app.js lines 48-273, 370-446, 787-903
 */

import { AGENTS } from "./config.js";

// ── Module-Level State ───────────────────────────────────────────────
// Sparkline history — accumulates values across refreshes for trend display
export const sparkHistory = {};

// Delta tracker — stores previous numeric values for change indicators
const _prevValues = {};

// Waveform animation state
let _waveAnimFrame = null;
let _wavePhase = 0;
export let _waveOpts = null; // cached opts from last render — assigned externally

// LCARS frame SVG resize debounce
let _frameSvgTimer = null;

// Header flash-change tracker
const _hdrPrev = {};
let _hdrFirstRender = true;

// Acronym annotation state (rebuilt after each knowledge-base fetch)
let acronymMap = {};
let acronymRegex = null;

// ── Number Formatting ────────────────────────────────────────────────

/**
 * Format a number with thin-space thousands separator for readability.
 * LCARS convention: "10 000" not "10,000".
 *
 * @param {number|string|null} n — value to format
 * @returns {string} — formatted number, or em-dash for invalid input
 */
export function fmtNum(n) {
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

// ── Sparkline SVG Generator ──────────────────────────────────────────

/**
 * Generate an inline SVG sparkline from an array of numeric values.
 *
 * @param {number[]} values — data points (oldest first)
 * @param {Object} opts — options
 * @param {number} opts.width — SVG width in px (default 60)
 * @param {number} opts.height — SVG height in px (default 16)
 * @param {string} opts.stroke — line color (default "#9999ff")
 * @param {string} opts.fill — area fill (default "none")
 * @returns {string} — SVG element HTML string
 */
export function sparklineSVG(values, opts = {}) {
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

// ── Waveform SVG Generator ───────────────────────────────────────────

/**
 * Generate a waveform SVG — Com Link (J/K) pattern.
 * Renders oscillating signal between horizontal framing bars.
 *
 * @param {Object} opts — options
 * @param {number} opts.width — SVG width in px (default 200)
 * @param {number} opts.height — SVG height in px (default 40)
 * @param {number} opts.amplitude — 0-1 signal strength (default 0.5)
 * @param {number} opts.frequency — wave cycles (default 3)
 * @param {number} opts.phase — phase offset for animation (default 0)
 * @param {string} opts.stroke — wave color (default "#ff9966")
 * @param {string} opts.barColor — framing bar color (default "rgba(153,153,255,0.3)")
 * @returns {string} — SVG element HTML string
 */
export function waveformSVG(opts = {}) {
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

// ── Waveform Animation Controller ─────────────────────────────────

/**
 * Start the waveform animation loop. Ticks phase and re-renders
 * tempo-waveform and med-oscillator-wave elements each frame.
 *
 * DOM WRITE: sets innerHTML on #tempo-waveform and #med-oscillator-wave.
 */
export function startWaveformAnimation() {
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

/**
 * Stop the waveform animation loop.
 */
export function stopWaveformAnimation() {
    if (_waveAnimFrame) {
        cancelAnimationFrame(_waveAnimFrame);
        _waveAnimFrame = null;
    }
}

/**
 * Set cached waveform options for the tempo waveform element.
 * @param {Object} opts — waveformSVG options
 */
export function setWaveOpts(opts) {
    _waveOpts = opts;
}

// ── SVG L-Shape Frame ─────────────────────────────────────────────

/**
 * Render the LCARS L-shape frame as a single SVG path.
 * Draws sidebar + header + elbow with radial gradient fill.
 * Positioned behind all interactive elements.
 *
 * DOM WRITE: sets innerHTML/attributes on #lcars-frame-svg.
 */
export function renderLcarsFrameSVG() {
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
    const path = [
        `M 0 ${ro}`,
        `A ${ro} ${ro} 0 0 1 ${ro} 0`,
        `L ${W - ro} 0`,
        `A ${ro} ${ro} 0 0 1 ${W} ${ro}`,
        `L ${W} ${bandH}`,
        `L ${sw + ri} ${bandH}`,
        `A ${ri} ${ri} 0 0 0 ${sw} ${bandH + ri}`,
        `L ${sw} ${H - ro}`,
        `A ${ro} ${ro} 0 0 1 ${sw - ro} ${H}`,
        `L ${ro} ${H}`,
        `L 0 ${H}`,
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

    // Parse rgb(r,g,b) components
    const rgb = resolved.match(/\d+/g)?.map(Number) || [238, 143, 72];
    const [r, g, b] = rgb;
    const hex = (r, g, b) => "#" + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
    const mix = (pct, tr, tg, tb) => hex(r * pct + tr * (1 - pct), g * pct + tg * (1 - pct), b * pct + tb * (1 - pct));

    // Non-uniform internal glow: darker edges, brighter center, off-center highlight
    const dark = mix(0.78, 26, 16, 0);
    const mid = hex(r, g, b);
    const bright = mix(0.92, 255, 232, 204);
    const peak = mix(0.95, 255, 244, 224);

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

/**
 * Debounced resize handler for the LCARS frame SVG.
 * Schedules a re-render 100ms after the last call.
 */
export function scheduleFrameSVG() {
    clearTimeout(_frameSvgTimer);
    _frameSvgTimer = setTimeout(renderLcarsFrameSVG, 100);
}

// ── Sparkline History ────────────────────────────────────────────────

/**
 * Push a value into the sparkline history buffer for a given key.
 * Maintains a rolling window of 20 values per key.
 *
 * @param {string} key — identifier for the sparkline series
 * @param {number} value — numeric value to append
 */
export function pushSparkValue(key, value) {
    if (value == null || isNaN(value)) return;
    if (!sparkHistory[key]) sparkHistory[key] = [];
    sparkHistory[key].push(value);
    if (sparkHistory[key].length > 20) sparkHistory[key].shift();
}

// ── Agent Name Helper ────────────────────────────────────────────────

/**
 * Display name helper — use agent.name if available, otherwise strip "-agent".
 *
 * @param {Object|string} agentOrId — agent object (with .name) or agent ID string
 * @returns {string} — display name
 */
export function agentName(agentOrId) {
    if (typeof agentOrId === "object" && agentOrId.name) return agentOrId.name;
    const id = typeof agentOrId === "string" ? agentOrId : agentOrId?.id || "";
    const found = AGENTS.find(a => a.id === id);
    return found?.name || id.replace("-agent", "").replace("psq", "safety-quotient");
}

// ── Three-Zone Number Grid Generator ─────────────────────────────────

/**
 * Render a number grid into a container element.
 * Color encodes data type: orange=counts, purple=IDs, white=measured, gold=alert.
 *
 * @param {string} containerId — DOM element ID for the grid container
 * @param {Array} metrics — array of { label, value, type, alert } objects
 *
 * DOM WRITE: sets innerHTML on the target container.
 */
export function renderNumberGrid(containerId, metrics) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!metrics || metrics.length === 0) { el.innerHTML = ""; return; }

    el.innerHTML = metrics.map(m => {
        const cls = m.alert ? "zn zn-alert" : m.type === "count" ? "zn zn-count"
            : m.type === "id" ? "zn zn-id" : "zn zn-val";
        return `<span class="zn-pair"><span class="zn-label">${m.label}</span><span class="${cls}">${m.value}</span></span>`;
    }).join("");
}

// ── Delta Tracker ────────────────────────────────────────────────────

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
 *
 * DOM WRITE: sets innerHTML on the target element.
 */
export function setTrackedValue(elementId, value, opts = {}) {
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

// ── LCARS Vertical Gauge Helper ──────────────────────────────────────

/**
 * Render a vertical-level gauge as HTML blocks.
 *
 * @param {number} value — 0-1 normalized value
 * @param {number} maxBlocks — total gauge blocks
 * @param {Object} options
 * @param {boolean} options.inverted — invert zone thresholds (default: false)
 * @param {Array|null} options.labels — custom block labels (default: null, uses index)
 * @returns {string} — HTML string for the gauge
 */
export function renderVlevelGauge(value, maxBlocks, options = {}) {
    const { inverted = false, labels = null } = options;
    const level = Math.max(0, Math.min(maxBlocks, Math.round(value * maxBlocks)));
    let html = '<div class="lcars-vlevel-gauge">';
    for (let i = 1; i <= maxBlocks; i++) {
        const isLit = i <= level;
        const isCurrent = i === level;
        let zone;
        const pct = i / maxBlocks;
        if (inverted) {
            zone = pct <= 0.4 ? "zone-low" : pct <= 0.7 ? "zone-mid" : "zone-high";
        } else {
            zone = pct <= 0.3 ? "zone-low" : pct <= 0.7 ? "zone-mid" : "zone-high";
        }
        const classes = ["vlevel-block"];
        if (isLit) classes.push("lit", zone);
        if (isCurrent) classes.push("current", zone);
        const label = labels ? labels[i - 1] : i;
        html += `<div class="${classes.join(" ")}">${label}</div>`;
    }
    html += '</div>';
    return html;
}

// ── Flash-If-Changed Helper ──────────────────────────────────────────

/**
 * Set element text and flash if the value changed since last call.
 * Used for LCARS header data that should visually indicate updates.
 *
 * @param {HTMLElement} el — target element
 * @param {string} newText — text to display
 *
 * DOM WRITE: sets textContent, toggles .hdr-changed class.
 */
export function flashIfChanged(el, newText) {
    if (!el) return;
    const prev = _hdrPrev[el.id];
    el.textContent = newText;
    if (_hdrFirstRender || (prev !== undefined && prev !== newText)) {
        el.classList.remove("hdr-changed");
        void el.offsetWidth; // Force reflow to restart animation
        el.classList.add("hdr-changed");
    }
    _hdrPrev[el.id] = newText;
}

/**
 * Mark first render complete — subsequent calls to flashIfChanged
 * only flash on actual value changes, not initial population.
 */
export function markFirstRenderDone() {
    _hdrFirstRender = false;
}

// ── Timestamp Helpers ────────────────────────────────────────────────

/**
 * Parse an ISO 8601 timestamp string to epoch milliseconds.
 *
 * @param {string} ts — ISO timestamp string
 * @returns {number} — epoch milliseconds, or 0 for invalid/missing input
 */
export function parseTS(ts) {
    if (!ts) return 0;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Format a timestamp for compact display.
 * Produces relative strings for recent times ("5m ago", "3h ago")
 * and absolute strings for older dates ("Mar 10, 14:57").
 *
 * @param {string} ts — ISO timestamp string
 * @returns {string} — formatted display string
 */
export function formatTS(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts.substring(0, 10) || "—";
    // If date-only (no T), show date
    if (typeof ts === "string" && !ts.includes("T")) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    const now = new Date();
    const diffMs = now - d;
    const diffH = diffMs / 3600000;
    if (diffH < 1) return Math.max(1, Math.floor(diffMs / 60000)) + "m ago";
    if (diffH < 24) return Math.floor(diffH) + "h ago";
    if (diffH < 48) return "yesterday " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Escape a string for safe insertion into HTML.
 *
 * @param {string} str — raw string to escape
 * @returns {string} — HTML-safe string
 *
 * DOM WRITE: creates and discards a temporary div (no document mutation).
 */
export function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ── Acronym Annotation ───────────────────────────────────────────────

/**
 * Build the acronym lookup table from fetched dictionary data.
 *
 * @param {Array} agents — AGENTS array (each with .id property)
 * @param {Object} dictEntries — dictionary data keyed by agent id
 */
export function buildAcronymMap(agents, dictEntries) {
    acronymMap = {};
    for (const agent of agents) {
        const dd = dictEntries[agent.id];
        if (dd?.status !== "ok") continue;
        const vocab = dd.data || {};
        const terms = vocab["@graph"] || vocab.hasDefinedTerm || [];
        terms.forEach(term => {
            if (term.inDefinedTermSet !== "Project Acronyms") return;
            const name = term.name || "";
            if (!name || acronymMap[name]) return;
            acronymMap[name] = term.description || name;
        });
    }
    // Build regex from acronym keys, longest first to avoid partial matches
    const keys = Object.keys(acronymMap).sort((a, b) => b.length - a.length);
    if (keys.length === 0) { acronymRegex = null; return; }
    const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    acronymRegex = new RegExp("\\b(" + escaped.join("|") + ")\\b", "g");
}

/**
 * Annotate pre-escaped HTML text with acronym tooltip wrappers.
 *
 * @param {string} escapedText — HTML-escaped text to annotate
 * @returns {string} — annotated HTML string
 *
 * NOTE: returned HTML contains onclick handlers referencing global
 * switchTab and filterDictionary. Mark for attention during module integration.
 */
export function annotateAcronyms(escapedText) {
    if (!acronymRegex || !escapedText) return escapedText;
    return escapedText.replace(acronymRegex, (match) => {
        const desc = acronymMap[match];
        if (!desc) return match;
        const safeDesc = desc.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        return `<abbr class="acronym-tip" title="${safeDesc}" onclick="event.stopPropagation();switchTab('kb');setTimeout(()=>{const f=document.getElementById('filter-dictionary');if(f){f.value='${match}';filterDictionary();}},100)">${match}</abbr>`;
    });
}

/**
 * Retrieve the current acronym map (read-only access for external consumers).
 * @returns {Object} — map of acronym name to description
 */
export function getAcronymMap() {
    return { ...acronymMap };
}

// ── Mobile Status Bar ────────────────────────────────────────────────

let clockTimer = null;

function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const time = `${hh}:${mm}`;
    const lcarsEl = document.getElementById("lcars-header-time");
    if (lcarsEl) lcarsEl.textContent = time;
}

/**
 * Start the mobile status bar clock. Safe to call multiple times.
 *
 * DOM WRITE: sets textContent on #lcars-header-time every 60s.
 */
export function initClock() {
    if (clockTimer) return;
    updateClock();
    const msToNextMinute = (60 - new Date().getSeconds()) * 1000;
    setTimeout(() => {
        updateClock();
        clockTimer = setInterval(updateClock, 60000);
    }, msToNextMinute);
}

/**
 * Update the mobile status dot color and agent count.
 *
 * @param {number} onlineCount — agents currently online
 * @param {number} totalCount — total expected agents
 *
 * DOM WRITE: sets style.color on #mobile-mesh-status,
 *            textContent on #mobile-agent-count.
 */
export function updateMeshStatus(onlineCount, totalCount) {
    const dot = document.getElementById("mobile-mesh-status");
    const count = document.getElementById("mobile-agent-count");
    if (dot) {
        if (onlineCount === totalCount) {
            dot.style.color = "var(--status-online)";
        } else if (onlineCount === 0) {
            dot.style.color = "var(--status-offline)";
        } else {
            dot.style.color = "var(--status-degraded)";
        }
    }
    if (count) count.textContent = String(onlineCount);
}

/**
 * helm.js — Helm station (TNG: Conn/Helm — navigation, course plotting,
 * session timeline, routing table, message flow, engagement, flow state).
 *
 * Five widgets: Session Timeline, Routing Table, Message Flow,
 * Engagement (UWES), Flow State (Csikszentmihalyi).
 *
 * A2A-Psychology constructs (LLM-factors §2.3 Reciprocal Dynamics, §2.5 Session Design):
 *   - Engagement: vigor, dedication, absorption, burnout risk
 *   - Flow: conditions met, in_flow state
 *
 * Data endpoints:
 *   GET https://psychology-agent.safety-quotient.dev/api/kb — messages, sessions
 *   Shared psychometrics cache (core/psychometrics.js) — engagement, flow
 *
 * DOM dependencies: #helm-session-timeline, #helm-routing-tbody,
 *   #helm-message-flow, #helm-engagement, #helm-flow
 */

import {
    fetchPsychometrics, getAllAgentPsychometrics,
} from '../core/psychometrics.js';

// ── Constants ────────────────────────────────────────────────────

const FETCH_TIMEOUT = 5000;

/** Hardcoded routing table from agent-registry.json outbound_routing rules */
const ROUTING_TABLE = [
    { domain: "psychometrics",    agent: "psq-agent" },
    { domain: "content-quality",  agent: "unratified-agent" },
    { domain: "cogarch",          agent: "psq-agent (mirror)" },
    { domain: "methodology",      agent: "observatory-agent" },
    { domain: "infrastructure",   agent: "operations-agent" },
    { domain: "consensus",        agent: "ALL" },
];

// ── Module State ───────────────────────────────────────────────
let helmData = null;
let helmFetchPending = false;

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch KB data from psychology-agent for session timeline and message flow.
 * Stores result in module-level helmData and triggers renderHelm.
 * @returns {Promise<void>}
 */
export async function fetchHelmData() {
    if (helmFetchPending) return;
    helmFetchPending = true;
    try {
        const [kbResp] = await Promise.allSettled([
            fetch("https://psychology-agent.safety-quotient.dev/api/kb", {
                signal: AbortSignal.timeout(FETCH_TIMEOUT),
            }),
        ]);
        helmData = kbResp.status === "fulfilled" && kbResp.value.ok
            ? await kbResp.value.json() : null;

        // Fetch psychometrics for engagement + flow panels
        await fetchPsychometrics();
    } catch {
        helmData = null;
    } finally {
        helmFetchPending = false;
    }
    renderHelm();
}

// ── Render: Session Timeline ───────────────────────────────────

/**
 * Render the session timeline from transport messages in KB data.
 * Groups messages by session and shows as timeline bars.
 * DOM WRITE: #helm-session-timeline (innerHTML replacement)
 */
export function renderSessionTimeline() {
    const container = document.getElementById("helm-session-timeline");
    if (!container) return;

    if (!helmData) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting data...</div>';
        return;
    }

    // Extract transport messages from KB data
    const messages = helmData.messages || helmData.recent_messages ||
                     helmData.transport_messages || [];

    if (!Array.isArray(messages) || messages.length === 0) {
        // Check for sessions array directly
        const sessions = helmData.sessions || helmData.active_sessions || [];
        if (Array.isArray(sessions) && sessions.length > 0) {
            renderSessionsFromArray(container, sessions);
            return;
        }
        container.innerHTML = '<div class="helm-placeholder">Awaiting data...</div>';
        return;
    }

    // Group messages by session
    const sessionMap = new Map();
    for (const msg of messages) {
        const sessionName = msg.session_name || msg.session || msg.session_id || "unknown";
        if (!sessionMap.has(sessionName)) {
            sessionMap.set(sessionName, {
                name: sessionName,
                count: 0,
                status: "active",
                lastActivity: "",
            });
        }
        const session = sessionMap.get(sessionName);
        session.count++;
        const ts = msg.timestamp || msg.created_at || "";
        if (ts > session.lastActivity) session.lastActivity = ts;
        if (msg.status) session.status = msg.status;
    }

    const sessions = [...sessionMap.values()]
        .sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""))
        .slice(0, 8);

    renderSessionsFromArray(container, sessions);
}

/**
 * Render session timeline from a sessions array.
 * @param {HTMLElement} container — target element
 * @param {Array} sessions — array of session objects
 */
function renderSessionsFromArray(container, sessions) {
    const sorted = [...sessions]
        .sort((a, b) => {
            const aTime = a.lastActivity || a.last_activity || "";
            const bTime = b.lastActivity || b.last_activity || "";
            return bTime.localeCompare(aTime);
        })
        .slice(0, 8);

    const maxTurns = Math.max(...sorted.map(s =>
        s.count || s.turn_count || s.turns || 1
    ), 1);

    const html = '<ul class="session-timeline-list">' + sorted.map(s => {
        const name = s.name || s.session_name || s.session_id || "unknown";
        const turns = s.count || s.turn_count || s.turns || 0;
        const status = (s.status || "active").toLowerCase();
        const widthPct = Math.max((turns / maxTurns) * 100, 5);
        return `<li class="session-timeline-item">
            <span class="session-timeline-name" title="${name}">${name}</span>
            <div class="session-timeline-bar-track">
                <div class="session-timeline-bar-fill status-${status}" style="width:${widthPct}%"></div>
            </div>
            <span class="session-timeline-meta">T${turns}</span>
            <span class="session-timeline-status status-${status}">${status}</span>
        </li>`;
    }).join("") + '</ul>';

    container.innerHTML = html;
}

// ── Render: Routing Table ──────────────────────────────────────

/**
 * Render the outbound routing table (hardcoded from agent-registry.json).
 * DOM WRITE: #helm-routing-tbody (innerHTML replacement)
 */
export function renderRoutingTable() {
    const tbody = document.getElementById("helm-routing-tbody");
    if (!tbody) return;

    tbody.innerHTML = ROUTING_TABLE.map(r =>
        `<tr>
            <td class="helm-routing-domain">${r.domain}</td>
            <td class="helm-routing-arrow">&rarr;</td>
            <td class="helm-routing-agent">${r.agent}</td>
        </tr>`
    ).join("");
}

// ── Render: Message Flow ───────────────────────────────────────

/**
 * Render the message flow matrix from KB transport messages.
 * Counts messages per agent pair.
 * DOM WRITE: #helm-message-flow (innerHTML replacement)
 */
export function renderMessageFlow() {
    const container = document.getElementById("helm-message-flow");
    if (!container) return;

    if (!helmData) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting data...</div>';
        return;
    }

    // Check for pre-computed flow data
    const flow = helmData.message_flow || helmData.flow_summary || null;
    if (flow && (Array.isArray(flow) || typeof flow === "object")) {
        renderFlowFromData(container, flow);
        return;
    }

    // Compute flow from transport messages
    const messages = helmData.messages || helmData.recent_messages ||
                     helmData.transport_messages || [];

    if (!Array.isArray(messages) || messages.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting data...</div>';
        return;
    }

    // Count messages per from->to pair
    const pairCounts = new Map();
    for (const msg of messages) {
        const from = msg.from_agent || msg.from || "unknown";
        const to = msg.to_agent || msg.to || "unknown";
        const key = `${from}->${to}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    }

    const pairs = [...pairCounts.entries()].map(([key, count]) => {
        const [from, to] = key.split("->").map(s => s.trim());
        return { from, to, count };
    }).sort((a, b) => b.count - a.count);

    if (pairs.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">No message flow recorded.</div>';
        return;
    }

    renderFlowTable(container, pairs);
}

/**
 * Render flow data from pre-computed structure.
 * @param {HTMLElement} container — target element
 * @param {Array|Object} flow — flow data
 */
function renderFlowFromData(container, flow) {
    const pairs = Array.isArray(flow) ? flow : Object.entries(flow).map(([key, count]) => {
        const [from, to] = key.split("->").map(s => s.trim());
        return { from, to, count };
    });

    if (pairs.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">No message flow recorded.</div>';
        return;
    }

    renderFlowTable(container, pairs);
}

/**
 * Render flow pairs as a table.
 * @param {HTMLElement} container — target element
 * @param {Array} pairs — { from, to, count } array
 */
function renderFlowTable(container, pairs) {
    container.innerHTML = `<table class="helm-flow-table">
        <thead><tr><th>From</th><th>To</th><th>Messages</th></tr></thead>
        <tbody>${pairs.map(p =>
            `<tr>
                <td>${(p.from || "\u2014").replace("-agent", "")}</td>
                <td>${(p.to || "\u2014").replace("-agent", "")}</td>
                <td class="helm-flow-count">${p.count || 0}</td>
            </tr>`
        ).join("")}</tbody>
    </table>`;
}

// ── Render: Engagement (A2A-Psychology) ──────────────────────

const HELM_AGENTS = [
    { id: "psychology-agent",  label: "psych", color: "var(--c-psychology)" },
    { id: "psq-agent",        label: "psq",   color: "var(--c-psq)" },
    { id: "unratified-agent",  label: "unrat", color: "var(--c-unratified)" },
    { id: "observatory-agent", label: "obs",   color: "var(--c-observatory)" },
    { id: "operations-agent",  label: "ops",   color: "var(--c-tab-ops)" },
];

/**
 * Render per-agent engagement (UWES: vigor, dedication, absorption, burnout risk).
 * LLM-factors §2.3: interaction quality affects engagement trajectory.
 * DOM WRITE: #helm-engagement
 */
export function renderEngagement() {
    const container = document.getElementById("helm-engagement");
    if (!container) return;

    const agents = getAllAgentPsychometrics();
    const entries = Object.entries(agents).filter(([, d]) => d && !d.error && d.engagement);

    if (entries.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting psychometrics data...</div>';
        return;
    }

    const dims = ["vigor", "dedication", "absorption", "burnout_risk"];
    const dimLabels = ["VIG", "DED", "ABS", "BRN"];

    container.innerHTML = entries.map(([agentId, data]) => {
        const eng = data.engagement || {};
        const label = agentId.replace("-agent", "");
        const agent = HELM_AGENTS.find(a => a.id === agentId);
        const color = agent ? agent.color : "var(--text-primary)";

        const bars = dims.map((dim, i) => {
            const val = eng[dim] ?? 0;
            const pct = Math.min(100, val * 100);
            const barColor = dim === "burnout_risk"
                ? (val > 0.5 ? "var(--c-alert)" : val > 0.3 ? "var(--c-warning)" : "var(--c-tab-helm)")
                : "var(--c-tab-helm)";
            return `<div class="helm-eng-bar">
                <span class="helm-eng-dim">${dimLabels[i]}</span>
                <div class="helm-eng-track"><div class="helm-eng-fill" style="width:${pct}%;background:${barColor}"></div></div>
                <span class="helm-eng-val">${val.toFixed(2)}</span>
            </div>`;
        }).join("");

        return `<div class="helm-agent-engagement">
            <div class="helm-eng-label" style="color:${color}">${label}</div>
            <div class="helm-eng-bars">${bars}</div>
        </div>`;
    }).join("");
}

// ── Render: Flow State (A2A-Psychology) ──────────────────────

/**
 * Render per-agent flow state (Csikszentmihalyi, 1990).
 * LLM-factors §2.5: session design — optimal conditions for combined performance.
 * DOM WRITE: #helm-flow
 */
export function renderFlowState() {
    const container = document.getElementById("helm-flow");
    if (!container) return;

    const agents = getAllAgentPsychometrics();
    const entries = Object.entries(agents).filter(([, d]) => d && !d.error && d.flow);

    if (entries.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting psychometrics data...</div>';
        return;
    }

    container.innerHTML = entries.map(([agentId, data]) => {
        const flow = data.flow || {};
        const label = agentId.replace("-agent", "");
        const agent = HELM_AGENTS.find(a => a.id === agentId);
        const color = agent ? agent.color : "var(--text-primary)";
        const inFlow = flow.in_flow ?? false;
        const conditions = flow.conditions_met ?? 0;
        const score = flow.score ?? 0;

        // Visual: 5 condition dots, filled based on conditions_met
        const dots = Array.from({ length: 5 }, (_, i) =>
            `<span class="helm-flow-dot ${i < conditions ? 'filled' : ''}" style="--dot-color: ${color}"></span>`
        ).join("");

        const stateLabel = inFlow ? "IN FLOW" : conditions >= 3 ? "NEAR FLOW" : "NOT IN FLOW";
        const stateColor = inFlow ? "#6aab8e" : conditions >= 3 ? "#d4944a" : "var(--text-dim)";

        return `<div class="helm-flow-agent">
            <span class="helm-flow-label" style="color:${color}">${label}</span>
            <div class="helm-flow-dots">${dots}</div>
            <span class="helm-flow-score">${(score * 100).toFixed(0)}%</span>
            <span class="helm-flow-state" style="color:${stateColor}">${stateLabel}</span>
        </div>`;
    }).join("");
}

// ── Render: Combined Helm ──────────────────────────────────────

/**
 * Render all Helm station sub-sections.
 */
export function renderHelm() {
    renderSessionTimeline();
    renderRoutingTable();
    renderMessageFlow();
    renderEngagement();
    renderFlowState();
}

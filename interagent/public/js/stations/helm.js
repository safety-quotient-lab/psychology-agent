/**
 * helm.js — Helm station (TNG: Conn/Helm — navigation, course plotting,
 * session timeline, routing table, message flow visualization).
 *
 * Three widgets: Session Timeline (from /api/kb), Routing Table (hardcoded),
 * Message Flow (from /api/kb transport messages).
 *
 * Data endpoints:
 *   GET https://psychology-agent.safety-quotient.dev/api/kb — messages, sessions
 *
 * DOM dependencies: #helm-session-timeline, #helm-routing-tbody,
 *   #helm-message-flow
 *
 * Global state accessed: none (uses module-level helmData)
 */

// ── Constants ────────────────────────────────────────────────────

/** Timeout for all fetches (5 seconds per task spec) */
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
        const resp = await fetch("https://psychology-agent.safety-quotient.dev/api/kb", {
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        helmData = await resp.json();
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

// ── Render: Combined Helm ──────────────────────────────────────

/**
 * Render all Helm station sub-sections.
 */
export function renderHelm() {
    renderSessionTimeline();
    renderRoutingTable();
    renderMessageFlow();
}

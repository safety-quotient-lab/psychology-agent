/**
 * helm.js — Helm station (TNG: Conn/Helm — navigation, course plotting,
 * session timeline, routing table, message flow visualization).
 *
 * Renders the Helm tab: session timeline bars, outbound routing table,
 * and message flow matrix.
 * Fetches data from the local /api/health endpoint.
 *
 * Data endpoints:
 *   GET /api/health — sessions, routing, message_flow
 *
 * DOM dependencies: #helm-session-timeline, #helm-routing-tbody,
 *   #helm-message-flow
 *
 * Global state accessed: none (uses module-level helmData)
 */

// ── Module State ───────────────────────────────────────────────
let helmData = null;
let helmFetchPending = false;

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch helm/navigation data from /api/health.
 * Stores result in module-level helmData and triggers renderHelm.
 * @returns {Promise<void>}
 */
export async function fetchHelmData() {
    if (helmFetchPending) return;
    helmFetchPending = true;
    try {
        const resp = await fetch("/api/health", { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        helmData = await resp.json();
    } catch (err) {
        helmData = null;
    } finally {
        helmFetchPending = false;
    }
    renderHelm();
}

// ── Render: Session Timeline ───────────────────────────────────

/**
 * Render the session timeline showing active transport sessions.
 * DOM WRITE: #helm-session-timeline (innerHTML replacement)
 */
export function renderSessionTimeline() {
    const container = document.getElementById("helm-session-timeline");
    if (!container) return;

    const sessions = helmData?.sessions || helmData?.active_sessions || null;
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting session data...</div>';
        return;
    }

    // Sort by most recent activity, take top 8
    const sorted = [...sessions]
        .sort((a, b) => (b.last_activity || "").localeCompare(a.last_activity || ""))
        .slice(0, 8);

    const maxTurns = Math.max(...sorted.map(s => s.turn_count || s.turns || 1), 1);

    const html = '<ul class="session-timeline-list">' + sorted.map(s => {
        const name = s.name || s.session_name || s.session_id || "unknown";
        const turns = s.turn_count || s.turns || 0;
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
 * Render the outbound routing table.
 * DOM WRITE: #helm-routing-tbody (innerHTML replacement, only if API data available)
 */
export function renderRoutingTable() {
    const tbody = document.getElementById("helm-routing-tbody");
    if (!tbody) return;

    const routing = helmData?.routing || helmData?.outbound_routing || null;
    if (!routing || !Array.isArray(routing) || routing.length === 0) {
        // Keep default static HTML routing table
        return;
    }

    tbody.innerHTML = routing.map(r => {
        const domain = r.domain || r.keyword || "—";
        const agent = r.agent || r.target || "—";
        return `<tr>
            <td class="helm-routing-domain">${domain}</td>
            <td class="helm-routing-arrow">&rarr;</td>
            <td class="helm-routing-agent">${agent}</td>
        </tr>`;
    }).join("");
}

// ── Render: Message Flow ───────────────────────────────────────

/**
 * Render the message flow matrix showing inter-agent communication volume.
 * DOM WRITE: #helm-message-flow (innerHTML replacement)
 */
export function renderMessageFlow() {
    const container = document.getElementById("helm-message-flow");
    if (!container) return;

    const flow = helmData?.message_flow || helmData?.flow_summary || null;
    if (!flow || (!Array.isArray(flow) && typeof flow !== "object")) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting message flow data...</div>';
        return;
    }

    // Accept either array of {from, to, count} or object keyed by pair
    const pairs = Array.isArray(flow) ? flow : Object.entries(flow).map(([key, count]) => {
        const [from, to] = key.split("->").map(s => s.trim());
        return { from, to, count };
    });

    if (pairs.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">No message flow recorded today.</div>';
        return;
    }

    const html = `<table class="helm-flow-table">
        <thead><tr><th>From</th><th>To</th><th>Messages</th></tr></thead>
        <tbody>${pairs.map(p =>
            `<tr>
                <td>${(p.from || "—").replace("-agent", "")}</td>
                <td>${(p.to || "—").replace("-agent", "")}</td>
                <td class="helm-flow-count">${p.count || 0}</td>
            </tr>`
        ).join("")}</tbody>
    </table>`;

    container.innerHTML = html;
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

/**
 * helm.js — Helm station (session timeline, routing table, message flow).
 *
 * Extracted from inline <script> in index.html.
 * Molecular chain / session timeline, routing table, message flow matrix.
 *
 * Data endpoints:
 *   GET {ops-agent}/api/kb — messages, sessions
 *   GET {ops-agent}/api/psychometrics — (optional)
 *
 * DOM dependencies: #helm-session-timeline, #helm-routing-tbody,
 *   #helm-message-flow, #helm-status-line
 */

import { agentName } from '../core/utils.js';

// ── Module State ───────────────────────────────────────────────
let helmData = null;
let helmFetchPending = false;

// Default routing rules — used when API data unavailable
const DEFAULT_ROUTING = [
    { domain: "psychometrics",      agent: "psq-agent" },
    { domain: "cogarch",            agent: "psychology-agent" },
    { domain: "methodology",        agent: "psychology-agent" },
    { domain: "governance",         agent: "psychology-agent + human" },
    { domain: "content-publishing", agent: "unratified-agent" },
    { domain: "data-observatory",   agent: "observatory-agent" },
    { domain: "infrastructure",     agent: "operations-agent" },
    { domain: "vocabulary",         agent: "operations-agent (compositor)" },
    { domain: "security",           agent: "operations-agent" },
    { domain: "consensus",          agent: "ALL (C1/C2/C3 tiered)" },
];

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch KB data from operations-agent for session timeline and message flow.
 * @param {Array} AGENTS — main agent config array
 * @returns {Promise<void>}
 */
export async function fetchHelmData(AGENTS) {
    if (helmFetchPending) return;
    helmFetchPending = true;
    try {
        // Fetch KB data from operations-agent (has transport messages)
        const opsAgent = AGENTS.find(a => a.id === "operations-agent");
        const baseUrl = opsAgent ? opsAgent.url : "https://operations-agent.safety-quotient.dev";
        const [kbResp, psychResp] = await Promise.allSettled([
            fetch(`${baseUrl}/api/kb`, { signal: AbortSignal.timeout(8000) }),
            fetch(`${baseUrl}/api/psychometrics`, { signal: AbortSignal.timeout(5000) }),
        ]);

        const kbResult = kbResp.status === "fulfilled" && kbResp.value.ok ? await kbResp.value.json() : null;

        // Build session list from KB messages (data.messages or messages)
        const messages = kbResult?.data?.messages || kbResult?.messages || [];
        const sessionMap = {};
        messages.forEach(m => {
            const sid = m.session_name || m.session_id || "unknown";
            if (!sessionMap[sid]) {
                sessionMap[sid] = { name: sid, turns: 0, last_activity: m.timestamp, status: "active", from: [] };
            }
            sessionMap[sid].turns++;
            if (m.timestamp > sessionMap[sid].last_activity) sessionMap[sid].last_activity = m.timestamp;
            if (m.from_agent && !sessionMap[sid].from.includes(m.from_agent)) sessionMap[sid].from.push(m.from_agent);
        });

        helmData = {
            sessions: Object.values(sessionMap),
            messages: messages,
        };
    } catch (err) {
        helmData = null;
    } finally {
        helmFetchPending = false;
    }
    renderHelm(AGENTS);
}

// ── Render ─────────────────────────────────────────────────────

/**
 * Render all Helm station panels.
 * @param {Array} AGENTS — main agent config array
 */
export function renderHelm(AGENTS) {
    renderSessionTimeline();
    renderRoutingTable();
    renderMessageFlow(AGENTS);
}

function renderSessionTimeline() {
    const container = document.getElementById("helm-session-timeline");
    if (!container) return;

    const sessions = helmData?.sessions || helmData?.active_sessions || null;
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting session data...</div>';
        return;
    }

    // Sort by most recent activity, take top 6
    const sorted = [...sessions]
        .sort((a, b) => (b.last_activity || "").localeCompare(a.last_activity || ""))
        .slice(0, 6);

    const statusColors = {
        active: "#ff9966", open: "#ff9900", resolved: "#6aab8e",
        closed: "#666688", tombstoned: "#cc6666"
    };

    // Molecular chain: each session = a row with linked circles
    const html = sorted.map(s => {
        const name = s.name || s.session_name || s.session_id || "unknown";
        const turns = Math.min(s.turn_count || s.turns || 1, 12);
        const status = (s.status || "active").toLowerCase();
        const color = statusColors[status] || "#cc99cc";

        // SVG chain
        const svgW = 200, svgH = 20, pad = 8;
        const nodeR = 5, spacing = turns > 1 ? (svgW - 2 * pad) / (turns - 1) : 0;
        let chainSvg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block">`;
        // Connection line
        if (turns > 1) {
            chainSvg += `<line x1="${pad}" y1="${svgH/2}" x2="${pad + spacing * (turns - 1)}" y2="${svgH/2}" stroke="${color}" stroke-width="1.5" opacity="0.5"/>`;
        }
        // Nodes
        for (let i = 0; i < turns; i++) {
            const cx = pad + (turns > 1 ? i * spacing : svgW / 2);
            const isLast = i === turns - 1;
            const r = isLast ? nodeR + 2 : nodeR;
            const opacity = isLast ? 1 : 0.6;
            chainSvg += `<circle cx="${cx}" cy="${svgH/2}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
        }
        chainSvg += `</svg>`;

        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
            <span style="min-width:100px;max-width:140px;font-size:0.75em;font-weight:600;color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</span>
            <div style="flex:1">${chainSvg}</div>
            <span style="font-size:0.68em;color:var(--text-dim);min-width:24px;text-align:right">T${turns}</span>
            <span style="font-size:0.62em;font-weight:600;text-transform:uppercase;color:${color};min-width:50px;text-align:right">${status}</span>
        </div>`;
    }).join("");

    container.innerHTML = html || '<div class="helm-placeholder">No session data</div>';
}

function renderRoutingTable() {
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

function renderMessageFlow(AGENTS) {
    const container = document.getElementById("helm-message-flow");
    if (!container) return;

    // Compute message flow from KB messages
    const messages = helmData?.messages || [];
    const flowMap = {};
    messages.forEach(m => {
        const from = m.from_agent || "?";
        const to = m.to_agent || "?";
        const key = `${from}->${to}`;
        flowMap[key] = (flowMap[key] || 0) + 1;
    });
    const flow = Object.keys(flowMap).length > 0
        ? Object.entries(flowMap).map(([key, count]) => {
            const [from, to] = key.split("->"); return { from, to, count };
          }).sort((a, b) => b.count - a.count)
        : null;
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
                <td>${agentName(p.from || "—", AGENTS)}</td>
                <td>${agentName(p.to || "—", AGENTS)}</td>
                <td class="helm-flow-count">${p.count || 0}</td>
            </tr>`
        ).join("")}</tbody>
    </table>`;

    container.innerHTML = html;
}

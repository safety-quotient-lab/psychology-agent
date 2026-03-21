// ═══ RENDER: HELM ═══════════════════════════════════════════
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
    { domain: "infrastructure",     agent: "mesh" },
    { domain: "vocabulary",         agent: "mesh (compositor)" },
    { domain: "security",           agent: "mesh" },
    { domain: "consensus",          agent: "ALL (C1/C2/C3 tiered)" },
];

async function fetchHelmData() {
    if (helmFetchPending) return;
    helmFetchPending = true;
    try {
        // Fetch KB + local psychometrics (same-origin)
        const kbUrl = "/api/kb";
        const [kbResp, psychResp] = await Promise.allSettled([
            fetch(kbUrl, { signal: AbortSignal.timeout(8000) }),
            fetch("/api/psychometrics", { signal: AbortSignal.timeout(5000) }),
        ]);

        const kbData = kbResp.status === "fulfilled" && kbResp.value.ok ? await kbResp.value.json() : null;

        // Build session list from KB messages (data.messages or messages)
        const messages = kbData?.data?.messages || kbData?.messages || [];
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
    renderHelm();
}

function renderHelm() {
    renderNumberGrid("helm-zone-a", helmZoneAMetrics());
    renderSessionTimeline();
    renderRoutingTable();
    renderMessageFlow();
    fetchMeshBreathing();
}

function helmZoneAMetrics() {
    const sessions = helmData?.sessions || [];
    const messages = helmData?.messages || [];
    const active = sessions.filter(s => (s.status || "active") === "active").length;
    const flowPairs = {};
    messages.forEach(m => {
        const key = (m.from_agent || "?") + "->" + (m.to_agent || "?");
        flowPairs[key] = (flowPairs[key] || 0) + 1;
    });
    return [
        { value: sessions.length, label: "SESSIONS", type: "count" },
        { value: active, label: "ACTIVE", type: "count" },
        { value: messages.length, label: "MESSAGES", type: "id" },
        { value: Object.keys(flowPairs).length, label: "ROUTES", type: "val" },
        { value: DEFAULT_ROUTING.length, label: "DOMAINS", type: "id" },
    ];
}

function renderSessionTimeline() {
    const container = document.getElementById("helm-session-timeline");
    if (!container) return;

    const sessions = helmData?.sessions || helmData?.active_sessions || null;
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        container.innerHTML = '<div class="helm-placeholder">Awaiting session data...</div>';
        return;
    }

    // Sort by most recent activity, take top 10
    const sorted = [...sessions]
        .sort((a, b) => (b.last_activity || "").localeCompare(a.last_activity || ""))
        .slice(0, 10);

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

        // Participants
        const participants = (s.from || []).map(f => agentName(f)).join(", ") || "—";
        // Relative time
        const lastTs = s.last_activity || "";
        let ago = "";
        if (lastTs) {
            const ms = Date.now() - new Date(lastTs).getTime();
            if (ms < 3600000) ago = Math.round(ms / 60000) + "m";
            else if (ms < 86400000) ago = Math.round(ms / 3600000) + "h";
            else ago = Math.round(ms / 86400000) + "d";
        }

        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
            <span style="min-width:120px;max-width:160px;font-size:0.75em;font-weight:600;color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</span>
            <div style="flex:1">${chainSvg}</div>
            <span style="font-size:0.65em;color:var(--text-dim);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${participants}">${participants}</span>
            <span style="font-size:0.68em;color:var(--text-dim);min-width:24px;text-align:right">T${turns}</span>
            <span style="font-size:0.62em;color:var(--text-dim);min-width:24px;text-align:right">${ago}</span>
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

function renderMessageFlow() {
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
                <td>${agentName(p.from || "—")}</td>
                <td>${agentName(p.to || "—")}</td>
                <td class="helm-flow-count">${p.count || 0}</td>
            </tr>`
        ).join("")}</tbody>
    </table>`;

    container.innerHTML = html;
}


// ── agentd Session 95: Mesh Breathing ────────────────────────────
async function fetchMeshBreathing() {
    const fetches = AGENTS.filter(a => a.url).map(a =>
        fetch(a.url + "/api/vagal", { signal: AbortSignal.timeout(2000) })
            .then(r => r.ok ? r.json() : null).catch(() => null)
            .then(d => ({ id: a.id, color: a.color, vagal: d }))
    );
    const results = await Promise.all(fetches);
    renderMeshBreathing(results);
}

function renderMeshBreathing(agents) {
    const el = document.getElementById("helm-breathing");
    if (!el) return;
    const withData = agents.filter(a => a.vagal);
    if (withData.length === 0) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No vagal data from agents</div>'; return; }

    const avgBreathing = withData.reduce((s, a) => s + (a.vagal.breathing_rate || 0), 0) / withData.length;
    const anyMeditation = withData.some(a => a.vagal.group_meditation);

    el.innerHTML = '<div style="font-size:0.78em">'
        + '<div style="margin-bottom:var(--gap-m)">'
        + '<span style="color:var(--lcars-title)">mesh.global.tempo:</span> '
        + '<div style="display:inline-block;width:60%;height:8px;background:var(--bg-inset);border-radius:var(--gap-xs);vertical-align:middle;margin:0 8px">'
        + '<div style="width:' + (avgBreathing * 100) + '%;height:100%;background:var(--c-tab-helm);border-radius:var(--gap-xs)"></div></div>'
        + '<span style="color:var(--lcars-readout)">' + avgBreathing.toFixed(2) + '</span>'
        + '</div>'
        + '<div style="margin-bottom:var(--gap-s);color:var(--lcars-title)">Group meditation: <strong style="color:' + (anyMeditation ? "var(--lcars-medical)" : "var(--text-dim)") + '">' + (anyMeditation ? "ON" : "OFF") + '</strong></div>'
        + withData.map(a => {
            const rate = a.vagal.breathing_rate || 0;
            const diff = Math.abs(rate - avgBreathing);
            const status = diff < 0.05 ? "entrained" : diff < 0.15 ? "drifting" : "independent";
            const statusColor = status === "entrained" ? "var(--lcars-medical)" : status === "drifting" ? "var(--lcars-accent)" : "var(--text-dim)";
            return '<div style="display:flex;align-items:center;gap:var(--gap-s);margin-bottom:2px">'
                + '<span style="width:70px;color:' + a.color + '">' + agentName(a.id) + '</span>'
                + '<div style="flex:1;height:6px;background:var(--bg-inset);border-radius:var(--gap-xs)"><div style="width:' + (rate * 100) + '%;height:100%;background:' + a.color + ';border-radius:var(--gap-xs)"></div></div>'
                + '<span style="color:' + statusColor + ';font-size:0.85em;width:70px;text-align:right">' + status + '</span></div>';
        }).join("")
        + '<div style="margin-top:var(--gap-s);color:var(--text-dim)">Mesh RSA: ' + (avgBreathing * 1.3).toFixed(2) + ' (adaptive)</div>'
        + '</div>';
}

// Wire into Helm render
const _origRenderHelm = typeof renderHelm === "function" ? renderHelm : null;

// ── Engineering Station ─────────────────────────────────────────


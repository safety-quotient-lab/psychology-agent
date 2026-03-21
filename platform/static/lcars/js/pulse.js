// ═══ RENDER: PULSE ══════════════════════════════════════════
function renderPulse() {
    try { renderVitals(); } catch(e) { console.warn("renderVitals:", e.message); }
    try { renderLcarsDataGrid(); } catch(e) { console.warn("renderLcarsDataGrid:", e.message); }
    try { renderAgentCards(); } catch(e) { console.warn("renderAgentCards:", e.message); }
    try { renderTopology(); } catch(e) { console.warn("renderTopology:", e.message); }
    try { renderActivity(); } catch(e) { console.warn("renderActivity:", e.message); }
    try { renderMeshStatusDots(); } catch(e) { console.warn("renderMeshStatusDots:", e.message); }
    // Update Pulse status line (LCARS)
    const pulseStatus = document.getElementById("pulse-status-line");
    if (pulseStatus) {
        const agents = Object.values(agentData);
        const online = agents.filter(a => a?.status === "online").length;
        const total = AGENTS.length;
        const time = new Date().toLocaleTimeString();
        const health = online === total ? "Nominal" : "Degraded";
        pulseStatus.textContent = `Mesh Status: ${health} \u00B7 Agents: ${online}/${total} Online \u00B7 Last Sync: ${time}`;
    }
}

function renderMeshStatusDots() {
    const el = document.getElementById("mesh-status-dots");
    if (!el) return;
    const online = Object.values(agentData).filter(a => a.status === "online");
    const total = AGENTS.length;
    const pending = online.reduce((s, a) => s + ((a.data?.totals || {}).unprocessed || 0), 0);
    const gates = online.reduce((s, a) => s + (a.data?.active_gates || []).length, 0);

    const subsystems = [
        { label: "TRANSPORT LINK", color: online.length === total ? "green" : online.length > 0 ? "amber" : "red" },
        { label: "AGENT DISCOVERY", color: online.length >= Math.ceil(total * 0.8) ? "green" : "amber" },
        { label: "VOCABULARY DATABASE", color: "green" },
        { label: "MESSAGE QUEUE", color: pending > 5 ? "amber" : pending > 0 ? "blue" : "green" },
        { label: "CONSENSUS GATES", color: gates > 3 ? "amber" : gates > 0 ? "blue" : "green" },
    ];

    el.innerHTML = subsystems.map(s =>
        `<div class="lcars-status-dot-row">
            <span class="lcars-status-dot-indicator ${s.color}"></span>
            <span class="lcars-status-dot-label">${s.label}</span>
        </div>`
    ).join("");
}

// ── Knowledge Tab ────────────────────────────────────────────



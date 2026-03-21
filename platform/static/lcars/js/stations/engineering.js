// ═══ RENDER: ENGINEERING ════════════════════════════════════
let engineeringData = null;
let engineeringFetchPending = false;

let engSelectedAgent = "mesh"; // default to mesh aggregate

function _opsAgent() {
    if (engSelectedAgent !== "mesh") {
        return agentData[engSelectedAgent] || {};
    }
    return agentData["mesh"] || {};
}

function renderEngAgentSelector() {
    renderAgentSelector("eng-agent-selector", engSelectedAgent, "selectEngAgent");
}
window.selectEngAgent = function(agentId) {
    engSelectedAgent = agentId;
    renderEngAgentSelector();
    fetchEngineeringData();
};

const DELIBERATION_AGENTS = [
    { id: "psychology-agent",  label: "psychology", color: "var(--c-psychology)" },
    { id: "psq-agent",        label: "safety-quotient",   color: "var(--c-psq)" },
    { id: "unratified-agent",  label: "unratified", color: "var(--c-unratified)" },
    { id: "observatory-agent", label: "observatory",   color: "var(--c-observatory)" },
    { id: "mesh",              label: "mesh",          color: "var(--c-tab-ops)" },
];

async function fetchEngineeringData() {
    if (engineeringFetchPending) return;
    engineeringFetchPending = true;
    try {
        // Fetch full status for selected agent (cross-origin for remote agents)
        const targetId = engSelectedAgent;
        const targetAgent = AGENTS.find(a => a.id === targetId);
        const statusUrl = targetAgent?.url ? targetAgent.url + "/api/status" : "/api/status";
        const [tempoResp, deliberationResp, cogTempoResp, agentStatusResp] = await Promise.allSettled([
            fetch("/api/tempo", { signal: AbortSignal.timeout(8000) }),
            fetch("/api/spawn-rate", { signal: AbortSignal.timeout(8000) }),
            fetch("/api/cognitive-tempo", { signal: AbortSignal.timeout(3000) }),
            fetch(statusUrl, { signal: AbortSignal.timeout(3000) }),
        ]);
        const tempoData = tempoResp.status === "fulfilled" && tempoResp.value.ok
            ? await tempoResp.value.json() : null;
        const deliberationData = deliberationResp.status === "fulfilled" && deliberationResp.value.ok
            ? await deliberationResp.value.json() : null;
        const cogTempo = cogTempoResp.status === "fulfilled" && cogTempoResp.value.ok
            ? await cogTempoResp.value.json() : null;
        // Enrich selected agent with full status (oscillator, heartbeat, gc_metrics)
        if (agentStatusResp.status === "fulfilled" && agentStatusResp.value.ok) {
            const fullStatus = await agentStatusResp.value.json();
            const aid = fullStatus.agent_id || targetId;
            agentData[aid] = { id: aid, status: "online", data: fullStatus };
        }
        engineeringData = { tempo: tempoData, deliberation: deliberationData, cogTempo: cogTempo };
    } catch (err) {
        engineeringData = null;
    } finally {
        engineeringFetchPending = false;
    }
    renderEngineering();
}

function renderEngineering() {
    renderEngAgentSelector();
    renderNumberGrid("eng-zone-a", engZoneAMetrics());
    renderTimingHierarchy();
    renderDeliberationCascade();
    renderGcCascade();
    renderUtilization();
    renderTempo();
    renderCost();
    renderConcurrency();
    renderCognitiveLoad();
    renderYerkesDodson();
    renderAlphaHeartbeat();
    renderGcLearning();
    renderModeTransitions();

    // Update status line (removed — replaced by zone-c title)
    const statusEl = document.getElementById("eng-status-line");
    if (statusEl && engineeringData) {
        const mesh = engineeringData.tempo?.mesh || {};
        const rho = mesh.utilization != null ? (mesh.utilization * 100).toFixed(0) + "%" : "—";
        const dur = mesh.mean_duration_sec != null ? Math.round(mesh.mean_duration_sec) + "s" : "—";
        const cost = mesh.cost_per_hour != null ? "$" + mesh.cost_per_hour + "/hr" : "—";
        statusEl.textContent = `Utilization: ${rho} · Tempo: ${dur} avg · Cost: ${cost}`;
    }
}

function renderGcCascade() {
    const container = document.getElementById("gc-cascade");
    const placeholder = document.getElementById("gc-placeholder");
    if (!container) return;

    // Gc = crystallized processing: events handled without LLM invocation
    const gcEntries = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const gc = d.data?.gc_metrics;
        const events = Math.round(gc?.events_processed || d.data?.event_count || 0);
        // Estimate Gc components from known architecture
        const delib = Math.round(gc?.deliberations_last_hour || 0);
        const hooks = delib * 24;       // ~24 hook scripts fire per deliberation
        const triggers = delib * 5;     // ~5 trigger checks per gate
        const tempo = Math.round(delib * 0.3); // tempo ticks
        gcEntries.push({
            label: agentName(agent),
            color: agent.color,
            events, hooks, triggers, tempo,
            total: events + hooks + triggers + tempo,
        });
    }

    if (gcEntries.length === 0) {
        if (placeholder) placeholder.style.display = "block";
        container.querySelectorAll(".gc-bar-row").forEach(r => r.remove());
        return;
    }

    if (placeholder) placeholder.style.display = "none";
    container.querySelectorAll(".gc-bar-row, .gc-area-chart").forEach(r => r.remove());

    const totalGc = gcEntries.reduce((s, e) => s + e.total, 0);

    // Accumulate Gc history for area chart
    pushSparkValue("gc-total", totalGc);
    pushSparkValue("gc-hooks", gcEntries.reduce((s, e) => s + e.hooks, 0));
    pushSparkValue("gc-triggers", gcEntries.reduce((s, e) => s + e.triggers, 0));
    pushSparkValue("gc-events", gcEntries.reduce((s, e) => s + e.events, 0));

    // Area chart — stacked Gc streams (Data Analysis 103138 pattern)
    const gcHistory = sparkHistory["gc-total"] || [];
    if (gcHistory.length >= 2) {
        const chartW = container.clientWidth || 300, chartH = 50;
        const maxH = Math.max(1, ...gcHistory);
        const pad = 2;
        const points = gcHistory.map((v, i) => {
            const x = pad + (i / (gcHistory.length - 1)) * (chartW - 2 * pad);
            const y = chartH - pad - ((v / maxH) * (chartH - 2 * pad));
            return x.toFixed(1) + "," + y.toFixed(1);
        });
        const polyline = points.join(" ");
        const areaPoints = pad + "," + (chartH - pad) + " " + polyline + " " + (pad + ((gcHistory.length - 1) / (gcHistory.length - 1)) * (chartW - 2 * pad)).toFixed(1) + "," + (chartH - pad);

        const chart = document.createElement("div");
        chart.className = "gc-area-chart";
        chart.style.cssText = "margin-bottom:8px;border:1px solid rgba(153,153,255,0.2);border-radius:2px;padding:2px";
        chart.innerHTML = `<svg width="${chartW}" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}" style="display:block">
            <polygon points="${areaPoints}" fill="#cc99cc" opacity="0.15"/>
            <polyline points="${polyline}" fill="none" stroke="#cc99cc" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="${points[points.length - 1].split(",")[0]}" cy="${points[points.length - 1].split(",")[1]}" r="3" fill="#cc99cc"/>
        </svg>`;
        container.appendChild(chart);
    }

    // Summary capsule
    const summary = document.createElement("div");
    summary.className = "gc-bar-row";
    summary.style.cssText = "margin-bottom:8px;font-size:0.82em;display:flex;gap:12px;flex-wrap:wrap";
    summary.innerHTML = `<span style="color:var(--lcars-secondary)">Gc Total: <strong>${fmtNum(totalGc)}</strong></span>
        <span style="color:var(--text-dim)">hooks ${fmtNum(gcEntries.reduce((s,e)=>s+e.hooks,0))}</span>
        <span style="color:var(--text-dim)">triggers ${fmtNum(gcEntries.reduce((s,e)=>s+e.triggers,0))}</span>
        <span style="color:var(--text-dim)">events ${fmtNum(gcEntries.reduce((s,e)=>s+e.events,0))}</span>
        <span style="color:var(--text-dim)">tempo ${fmtNum(gcEntries.reduce((s,e)=>s+e.tempo,0))}</span>`;
    container.appendChild(summary);

    // Per-agent bars
    const maxVal = Math.max(1, ...gcEntries.map(e => e.total));
    gcEntries.forEach(entry => {
        const pct = (entry.total / maxVal * 100);
        const row = document.createElement("div");
        row.className = "gc-bar-row delib-bar-row";
        row.innerHTML = `<span class="delib-bar-label">${entry.label}</span>
            <div class="delib-bar-track"><div class="delib-bar-fill" style="width:${pct}%;background:${entry.color}"></div></div>
            <span class="delib-bar-count" style="font-size:0.75em">${fmtNum(entry.total)}</span>`;
        container.appendChild(row);
    });
}

function renderDeliberationCascade() {
    const container = document.getElementById("deliberation-cascade");
    const placeholder = document.getElementById("deliberation-placeholder");
    if (!container) return;

    // Gf = fluid intelligence: deliberations per agent with model + duration
    const tempoAgents = engineeringData?.tempo?.agents || [];
    const agentMap = {};
    tempoAgents.forEach(a => { agentMap[a.agent_id] = a; });

    // Also get model tier from gc_metrics
    const modelTier = agentData["mesh"]?.data?.gc_metrics?.deliberation_model || "?";

    // Clear existing
    container.querySelectorAll(".delib-bar-row, .gf-summary").forEach(r => r.remove());

    if (tempoAgents.length === 0) {
        if (placeholder) placeholder.style.display = "block";
        DELIBERATION_AGENTS.forEach(agent => {
            const row = document.createElement("div");
            row.className = "delib-bar-row";
            row.innerHTML = `<span class="delib-bar-label">${agent.label}</span>
                <div class="delib-bar-track"><div class="delib-bar-fill" style="width:0%;background:${agent.color};opacity:0.3"></div></div>
                <span class="delib-bar-count">\u2014</span>`;
            container.appendChild(row);
        });
        return;
    }

    if (placeholder) placeholder.style.display = "none";

    // Summary with model tier + avg duration
    const meshData = engineeringData?.tempo?.mesh || {};
    const avgDur = meshData.mean_duration_sec ? Math.round(meshData.mean_duration_sec) + "s" : "—";
    const costHr = meshData.cost_per_hour != null ? "$" + meshData.cost_per_hour + "/hr" : "";
    const summary = document.createElement("div");
    summary.className = "gf-summary";
    summary.style.cssText = "margin-bottom:8px;font-size:0.85em;opacity:0.8";
    summary.innerHTML = `<span>Model: <strong>${modelTier.toUpperCase()}</strong> · Avg: <strong>${avgDur}</strong>${costHr ? " · " + costHr : ""}</span>`;
    container.appendChild(summary);

    // Per-agent bars
    const maxCount = Math.max(1, ...DELIBERATION_AGENTS.map(a => agentMap[a.id]?.deliberations_60min || 0));
    DELIBERATION_AGENTS.forEach(agent => {
        const data = agentMap[agent.id] || {};
        const count = data.deliberations_60min || 0;
        const dur = data.mean_duration_sec ? Math.round(data.mean_duration_sec) + "s" : "";
        const pct = (count / maxCount) * 100;
        const row = document.createElement("div");
        row.className = "delib-bar-row";
        row.innerHTML = `<span class="delib-bar-label">${agent.label}</span>
            <div class="delib-bar-track"><div class="delib-bar-fill" style="width:${pct}%;background:${agent.color}"></div></div>
            <span class="delib-bar-count" style="font-size:0.75em">${count}${dur ? " · " + dur : ""}</span>`;
        container.appendChild(row);
    });

    // Deliberation tree — waterfall of recent deliberations across all agents
    renderDeliberationTree(container);
}

function renderDeliberationTree(container) {
    // Collect all deliberations from all agents
    const allDelibs = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const deliberations = d.data?.recent_deliberations || d.data?.recent_deliberations_legacy || [];
        deliberations.forEach(s => allDelibs.push({
            agent_id: s.agent_id || agent.id,
            color: agent.color,
            started_at: s.started_at || "",
            duration_ms: parseInt(s.duration_ms) || 0,
            cost: parseFloat(s.cost) || 0,
            status: s.status || "unknown",
            exit_code: parseInt(s.exit_code) ?? -1,
        }));
    }

    if (allDelibs.length === 0) return;

    // Sort chronologically
    allDelibs.sort((a, b) => a.started_at.localeCompare(b.started_at));
    const recent = allDelibs.slice(-12); // last 12

    // SVG tree
    const svgW = container.clientWidth || 400;
    const svgH = 60;
    const pad = 12;
    const nodeR = 6;
    const spacing = recent.length > 1 ? (svgW - 2 * pad) / (recent.length - 1) : 0;
    const midY = svgH / 2;

    let svg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block;margin-top:8px;border:1px solid rgba(153,153,255,0.15);border-radius:2px;padding:2px">`;

    // Timeline baseline
    svg += `<line x1="${pad}" y1="${midY}" x2="${svgW - pad}" y2="${midY}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>`;

    // Nodes + connecting lines
    recent.forEach((d, i) => {
        const cx = pad + (recent.length > 1 ? i * spacing : svgW / 2);
        const failed = d.exit_code !== 0 && d.status !== "completed";
        const stale = d.status === "resolved-stale";
        const nodeColor = failed ? "var(--lcars-alert)" : stale ? "var(--c-warning)" : d.color;
        const r = Math.min(nodeR + d.cost, 12); // size by cost

        // Connect to previous node
        if (i > 0) {
            const prevX = pad + (i - 1) * spacing;
            const prevFailed = recent[i - 1].exit_code !== 0 && recent[i - 1].status !== "completed";
            if (prevFailed) {
                // Broken link — dashed red line with gap
                svg += `<line x1="${prevX}" y1="${midY}" x2="${cx}" y2="${midY}" stroke="var(--lcars-alert)" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.5"/>`;
            } else {
                svg += `<line x1="${prevX}" y1="${midY}" x2="${cx}" y2="${midY}" stroke="${d.color}" stroke-width="1.5" opacity="0.4"/>`;
            }
        }

        // Duration indicator — vertical line proportional to duration
        const durHeight = Math.min(midY - 4, (d.duration_ms / 120000) * (midY - 4));
        svg += `<line x1="${cx}" y1="${midY}" x2="${cx}" y2="${midY - durHeight}" stroke="${nodeColor}" stroke-width="2" opacity="0.3"/>`;

        // Node circle
        svg += `<circle cx="${cx}" cy="${midY}" r="${r}" fill="${nodeColor}" opacity="${failed ? 0.6 : 0.9}"/>`;

        // Cost label above
        if (d.cost > 0) {
            svg += `<text x="${cx}" y="${midY - r - 3}" text-anchor="middle" font-size="7" fill="var(--text-dim)" font-family="monospace">$${d.cost}</text>`;
        }
    });

    svg += `</svg>`;

    // Add tree below bars
    const treeEl = container.querySelector(".delib-tree") || document.createElement("div");
    treeEl.className = "delib-tree";
    treeEl.innerHTML = svg;
    if (!treeEl.parentNode) container.appendChild(treeEl);
}

function renderUtilization() {
    const rhoEl = document.getElementById("util-rho");
    const fillEl = document.getElementById("util-bar-fill");
    const statusEl = document.getElementById("util-status");
    if (!rhoEl) return;

    const rho = engineeringData?.tempo?.mesh?.utilization ?? engineeringData?.deliberation?.utilization ?? null;

    if (rho == null) {
        rhoEl.textContent = "\u03C1 = \u2014";
        rhoEl.className = "util-rho util-nominal";
        fillEl.style.width = "0%";
        fillEl.style.background = "#6aab8e";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "util-status util-nominal";
        return;
    }

    const pct = Math.min(100, Math.max(0, rho * 100));
    setTrackedValue("util-rho", rho, { format: "float", prefix: "\u03C1 = ", inverted: true });

    let color, label, cls;
    if (pct < 50) {
        color = "#6aab8e"; label = "NOMINAL"; cls = "util-nominal";
    } else if (pct < 80) {
        color = "#d4944a"; label = "ELEVATED"; cls = "util-elevated";
    } else {
        color = "#c47070"; label = "CRITICAL"; cls = "util-critical";
    }

    rhoEl.className = `util-rho ${cls}`;
    fillEl.style.width = `${pct}%`;
    fillEl.style.background = color;
    statusEl.textContent = label;
    statusEl.className = `util-status ${cls}`;

    // Tuvok-style numbered vertical gauge (7 segments)
    const vlg = document.getElementById("util-vlevel-gauge");
    if (vlg) {
        const segments = 7;
        const activeLevel = Math.round((pct / 100) * segments);
        const segColors = ["#6aab8e","#6aab8e","#6aab8e","#d4944a","#d4944a","#c47070","#c47070"];
        vlg.innerHTML = Array.from({ length: segments }, (_, i) => {
            const level = i + 1;
            const active = level <= activeLevel;
            return `<div class="lcars-vlevel-segment ${active ? "active" : "inactive"}" style="background:${active ? segColors[i] : "var(--bg-inset)"}">${level}</div>`;
        }).join("");
    }
}

function renderTempo() {
    // ── Gf Tempo: cognitive tempo (gain, tier, Yerkes-Dodson) ──
    const gfVal = document.getElementById("tempo-gf-value");
    const gfFill = document.getElementById("tempo-gf-fill");
    const gfStatus = document.getElementById("tempo-gf-status");
    const ct = engineeringData?.cogTempo;
    const gain = ct?.gain ?? null;
    const tier = ct?.recommended_tier || "?";
    const tierColor = tier === "opus" ? "#c47070" : tier === "sonnet" ? "#d4944a" : "#66ccaa";

    if (gfVal) {
        const opsData = _opsAgent()?.data || {};
        const delibCount = opsData.deliberation_count || 0;
        const delibLastHr = opsData.gc_metrics?.deliberations_last_hour || 0;
        const complexity = ct?.task_complexity || 0;

        if (gain != null) {
            const gcGf = ct?.gc_gf_ratio ?? null;
            const backlog = ct?.backlog_pressure ?? 0;
            const unproc = ct?.unprocessed ?? 0;
            gfVal.innerHTML = `${tier.toUpperCase()}<span class="tempo-unit"> g=${gain.toFixed(2)}</span>`;
            gfFill.style.width = `${Math.min(100, gain * 100)}%`;
            gfFill.style.background = tierColor;
            const gcPct = gcGf != null ? Math.round(gcGf * 100) : "?";
            const gfPct = gcGf != null ? Math.round((1 - gcGf) * 100) : "?";
            gfStatus.textContent = `Gc/Gf: ${gcPct}/${gfPct} · backlog: ${unproc} (p=${backlog.toFixed(2)}) · c=${complexity.toFixed(2)}`;
        } else {
            gfVal.innerHTML = `${delibCount}<span class="tempo-unit"> deliberations</span>`;
            gfFill.style.width = "0%";
            gfStatus.textContent = `${delibLastHr}/hr · no cognitive tempo data`;
        }
    }

    // Gf waveform — real gain data over time (animation tick reads from pushWaveData)
    const gfWave = document.getElementById("tempo-gf-waveform");
    if (gfWave) {
        gfWave._opts = { stroke: tierColor };
    }

    // ── Gc Tempo: crystallized throughput (OODA cycle, events/hr) ──
    const gcVal = document.getElementById("tempo-gc-value");
    const gcFill = document.getElementById("tempo-gc-fill");
    const gcStatus = document.getElementById("tempo-gc-status");
    const mesh = engineeringData?.tempo?.mesh || {};
    const avgMs = mesh.mean_duration_sec != null ? Math.round(mesh.mean_duration_sec * 1000) : null;
    const rho = mesh.utilization ?? null;

    if (gcVal) {
        const opsData = _opsAgent()?.data || {};
        const gcHandled = opsData.gc_metrics?.gc_handled_total || 0;
        const eventCount = opsData.event_count || 0;
        const blocked = opsData.gc_metrics?.deliberation_blocked_total || 0;

        if (eventCount > 0 || gcHandled > 0) {
            gcVal.innerHTML = `${eventCount}<span class="tempo-unit"> events</span>`;
            const pct = rho != null ? Math.min(100, rho * 100) : Math.min(100, Math.min(gcHandled, 100));
            gcFill.style.width = `${pct}%`;
            gcFill.style.background = rho > 0.8 ? "#c47070" : rho > 0.5 ? "#d4944a" : "#6aab8e";
            gcStatus.textContent = `Gc: ${gcHandled} handled · ${blocked} blocked${rho != null ? " · \u03C1=" + (rho * 100).toFixed(0) + "%" : ""}`;
        } else {
            gcVal.innerHTML = `0<span class="tempo-unit"> events</span>`;
            gcFill.style.width = "0%";
            gcStatus.textContent = "Gc: no activity";
        }
    }

    // Gc waveform — real Gc event count over time (animation tick reads from pushWaveData)
    const gcWave = document.getElementById("tempo-gc-waveform");
    if (gcWave) {
        const gcColor = rho != null ? (rho > 0.8 ? "#c47070" : rho > 0.5 ? "#d4944a" : "#6aab8e") : "#6aab8e";
        gcWave._opts = { stroke: gcColor };
    }

    renderTempoIntrospection(tierColor);
}

function renderTempoIntrospection(color) {
    const container = document.getElementById("tempo-introspection");
    if (!container) return;

    // Collect all deliberation timings
    const allDelibs = [];
    for (const agent of AGENTS) {
        const d = agentData[agent.id];
        if (!d || d.status !== "online") continue;
        const deliberations = d.data?.recent_deliberations || [];
        deliberations.forEach(s => {
            if (s.started_at && s.duration_ms) {
                allDelibs.push({
                    agent: agentName(agent),
                    startMs: new Date(s.started_at.replace(" ", "T") + "Z").getTime(),
                    durationMs: parseInt(s.duration_ms) || 0,
                    cost: parseFloat(s.cost) || 0,
                    status: s.status || "?",
                });
            }
        });
    }

    if (allDelibs.length === 0) {
        container.innerHTML = "";
        return;
    }

    allDelibs.sort((a, b) => a.startMs - b.startMs);

    // Calculate inter-deliberation gaps
    const entries = allDelibs.slice(-8).map((d, i, arr) => {
        const gap = i > 0 ? Math.max(0, d.startMs - (arr[i - 1].startMs + arr[i - 1].durationMs)) : 0;
        return { ...d, gapMs: gap };
    });

    // Render as LCARS readout
    container.innerHTML = '<div style="font-size:0.72em;margin-top:6px">' +
        '<div style="display:grid;grid-template-columns:auto auto auto auto;gap:2px 8px;font-family:monospace">' +
        '<span style="color:var(--lcars-title)">AGENT</span>' +
        '<span style="color:var(--lcars-title)">DURATION</span>' +
        '<span style="color:var(--lcars-title)">GAP</span>' +
        '<span style="color:var(--lcars-title)">COST</span>' +
        entries.map(e => {
            const durSec = (e.durationMs / 1000).toFixed(0);
            const gapSec = e.gapMs > 0 ? (e.gapMs / 1000).toFixed(0) + "s" : "\u2014";
            const statusColor = e.status === "completed" ? "var(--lcars-medical)" : "var(--lcars-alert)";
            return `<span style="color:var(--lcars-secondary)">${e.agent}</span>` +
                `<span style="color:${statusColor}">${durSec}s</span>` +
                `<span style="color:var(--text-dim)">${gapSec}</span>` +
                `<span style="color:var(--lcars-accent)">$${e.cost}</span>`;
        }).join("") +
        '</div></div>';
}

function renderCost() {
    const totalEl = document.getElementById("cost-total");
    const rateEl = document.getElementById("cost-rate");
    if (!totalEl) return;

    const meshData = engineeringData?.tempo?.mesh || {};
    const deliberationCost = engineeringData?.deliberation || {};
    const hourlyRate = meshData.cost_per_hour ?? deliberationCost?.cost?.hourly_rate ?? null;
    const totalCost = deliberationCost?.last_hour?.total_cost ?? deliberationCost?.cost?.total_today ?? null;

    if (hourlyRate == null && totalCost == null) {
        totalEl.textContent = "$\u2014";
        rateEl.innerHTML = `<span class="cost-rate-arrow">\u2197</span> $\u2014/hr`;
        return;
    }

    totalEl.textContent = totalCost != null ? `$${parseFloat(totalCost).toFixed(2)}` : "$\u2014";
    rateEl.innerHTML = hourlyRate != null
        ? `<span class="cost-rate-arrow">\u2197</span> $${parseFloat(hourlyRate).toFixed(2)}/hr`
        : `<span class="cost-rate-arrow">\u2197</span> $\u2014/hr`;
}

// Concurrency data fetched from /api/flow
let _flowData = null;
async function fetchFlowData() {
    try {
        const r = await fetch("/api/flow", { signal: AbortSignal.timeout(5000) });
        if (r.ok) _flowData = await r.json();
    } catch {}
}

function renderConcurrency() {
    const container = document.getElementById("concurrency-slots");
    if (!container) return;

    if (!_flowData) {
        fetchFlowData(); // fire once — no recursive retry
        container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Loading flow data...</div>';
        return;
    }

    const slotInfo = _flowData.slots || {};
    const maxSlots = slotInfo.max || 5;
    const detail = slotInfo.detail || [];

    container.innerHTML = detail.map((s, i) => {
        const held = s.held || s.holder;
        const label = held
            ? `[${i + 1}/${maxSlots}] ${agentName(typeof held === "string" ? held : "active")}`
            : `[${i + 1}/${maxSlots}] free`;
        const cls = held ? "filled" : "empty";
        return `<div class="concurrency-slot">
            <div class="slot-indicator ${cls}"></div>
            <span class="slot-label ${held ? "" : "slot-free"}">${label}</span>
        </div>`;
    }).join("");

    if (detail.length === 0) {
        container.innerHTML = Array.from({length: maxSlots}, (_, i) =>
            `<div class="concurrency-slot"><div class="slot-indicator empty"></div><span class="slot-label slot-free">[${i+1}/${maxSlots}] free</span></div>`
        ).join("");
    }
}

function renderCognitiveLoad() {
    const container = document.getElementById("eng-cognitive-load");
    if (!container) return;

    if (!_psychCache) {
        fetchPsychForOps(); // fire once — no recursive retry
        container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Loading psychometrics...</div>';
        return;
    }
    if (!_psychCache.agents) {
        container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Psychometrics loaded — per-agent view requires compositor</div>';
        return;
    }

    const entries = Object.entries(_psychCache.agents)
        .filter(([, d]) => d && !d.error && d.nasa_tlx && Object.keys(d.nasa_tlx).length > 0);

    if (entries.length === 0) {
        // Show whatever we have — even partial data
        const partial = Object.entries(_psychCache.agents)
            .filter(([, d]) => d && !d.error);
        if (partial.length === 0) {
            container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">No active sessions reporting TLX data. TLX computes during active Claude sessions, not daemon idle.</div>';
            return;
        }
        // Show available metrics even without full TLX
        container.innerHTML = '<div style="padding:8px;font-size:0.85em;opacity:0.7">' +
            partial.map(([aid, d]) => {
                const wm = d.working_memory || {};
                const yd = wm.yerkes_dodson_zone || "—";
                return `<span style="color:${AGENTS.find(a=>a.id===aid)?.color||"inherit"}">${agentName(aid)}</span>: YD zone = ${yd}`;
            }).join(" · ") + '</div>';
        return;
    }

    const colorMap = Object.fromEntries(AGENTS.map(a => [a.id, a.color]));
    const dims = ["mental_demand", "physical_demand", "temporal_demand", "performance", "effort", "frustration"];
    container.innerHTML = entries.map(([agentId, data]) => {
        const tlx = data.nasa_tlx;
        const bars = dims.map(d => {
            const val = Math.round((tlx[d] || 0) * 100);
            const color = val > 70 ? "#c47070" : val > 40 ? "#d4944a" : "#6aab8e";
            return `<div style="display:flex;align-items:center;gap:4px;font-size:0.72em">
                <span style="width:70px;text-align:right;opacity:0.6">${d.replace("_"," ")}</span>
                <div style="flex:1;height:6px;background:var(--bg-inset);border-radius:3px"><div style="width:${val}%;height:100%;background:${color};border-radius:3px"></div></div>
                <span style="width:28px;font-size:0.9em">${val}%</span>
            </div>`;
        }).join("");
        return `<div style="margin-bottom:8px"><div style="font-size:0.8em;font-weight:700;color:${colorMap[agentId]||"inherit"};margin-bottom:4px">${agentName(agentId)}</div>${bars}</div>`;
    }).join("");
}

function renderYerkesDodson() {
    const container = document.getElementById("eng-yd-zones");
    if (!container) return;

    // Read Yerkes-Dodson zones from psychometrics cache
    if (!_psychCache) {
        fetchPsychForOps(); // fire once — no recursive retry
        container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Loading...</div>';
        return;
    }
    if (!_psychCache.agents) {
        container.innerHTML = '<div style="opacity:0.5;padding:8px;font-size:0.85em">Per-agent view requires compositor</div>';
        return;
    }

    const entries = Object.entries(_psychCache.agents)
        .filter(([, d]) => d && !d.error && d.working_memory);

    if (entries.length === 0) {
        container.innerHTML = '<div class="phase-stub"><div class="phase-stub-text">Awaiting psychometrics data...</div></div>';
        return;
    }

    const colorMap = { "psychology-agent": "#5b9cf6", "psq-agent": "#4ecdc4", "unratified-agent": "#e5a735", "observatory-agent": "#a78bfa", "mesh": "#6b7280" };
    const zoneColors = { understimulated: "#5b9cf6", optimal: "#6aab8e", overwhelmed: "#c47070" };

    container.innerHTML = entries.map(([agentId, data]) => {
        const wm = data.working_memory || {};
        const zone = wm.yerkes_dodson_zone || "unknown";
        const load = wm.capacity_load ?? 0;
        const loadPct = Math.min(100, load * 100);
        const label = agentName(agentId);
        const zoneColor = zoneColors[zone] || "#888";
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:50px;font-size:0.8em;color:${colorMap[agentId] || '#888'}">${label}</span>
            <div style="flex:1;height:8px;background:var(--bg-tertiary);border-radius:4px;position:relative">
                <div style="width:${loadPct}%;height:100%;background:${zoneColor};border-radius:4px"></div>
            </div>
            <span style="font-size:0.7em;color:${zoneColor};width:80px;text-align:right">${zone.toUpperCase()}</span>
        </div>`;
    }).join("");
}

// ── Timing Hierarchy (psy-session arch synthesis) ───────────────
// 5-layer timing status derived from live system state.
function renderTimingHierarchy() {
    const ops = _opsAgent();
    const osc = ops?.data?.oscillator || {};
    const health = ops?.data?.health;

    // Layer 1: Circadian — not implemented
    // Layer 2: Ultradian — deliberation cycle (sleep mode = shadow, active if deliberations recent)
    const recentDelibs = ops?.data?.recent_deliberations || [];
    const hasRecentDelib = recentDelibs.length > 0 && recentDelibs[0]?.started_at;
    const el2 = document.getElementById("eng-timing-ultradian");
    if (el2) {
        if (hasRecentDelib) { el2.textContent = "ACTIVE"; el2.style.color = "var(--lcars-medical)"; }
        else { el2.textContent = "SLEEP"; el2.style.color = "var(--text-dim)"; }
    }

    // Layer 3: Cardiac — oscillator state (from /api/status → oscillator snapshot)
    const el3 = document.getElementById("eng-timing-cardiac");
    if (el3) {
        const oscState = osc.state || ops?.data?.oscillator?.state;
        const act = osc.activation || ops?.data?.oscillator?.activation || 0;
        if (oscState === "firing") { el3.textContent = "FIRING " + act.toFixed(2); el3.style.color = "var(--lcars-alert)"; }
        else if (oscState === "refractory") { el3.textContent = "REFRACT"; el3.style.color = "var(--lcars-accent)"; }
        else if (oscState === "monitoring") { el3.textContent = "ACTIVE " + act.toFixed(2); el3.style.color = "var(--lcars-medical)"; }
        else if (oscState) { el3.textContent = oscState.toUpperCase(); el3.style.color = "var(--lcars-accent)"; }
        else { el3.textContent = "OFFLINE"; el3.style.color = "var(--text-dim)"; }
    }

    // Layer 4: Respiratory — health monitor
    const el4 = document.getElementById("eng-timing-respiratory");
    if (el4) {
        if (health === "nominal") { el4.textContent = "ACTIVE"; el4.style.color = "var(--lcars-medical)"; }
        else if (health) { el4.textContent = health.toUpperCase(); el4.style.color = "var(--lcars-accent)"; }
    }

    // Layer 5: Neural — alpha heartbeat (T22 metabolic cooling)
    const el5 = document.getElementById("eng-timing-neural");
    if (el5) {
        const hb = ops?.data?.alpha_heartbeat;
        const band = hb?.dominant_band || osc.dominant_band || "";
        if (hb?.running) {
            el5.textContent = band.toUpperCase() + " " + Math.round(hb.interval_sec || 0) + "s";
            el5.style.color = "var(--lcars-medical)";
        } else if (band) {
            el5.textContent = band.toUpperCase();
            el5.style.color = "var(--lcars-tertiary)";
        } else {
            el5.textContent = "IDLE";
            el5.style.color = "var(--text-dim)";
        }
    }
}

// ── Alpha Heartbeat Panel ────────────────────────────────────────
function renderAlphaHeartbeat() {
    const container = document.getElementById("eng-alpha-heartbeat");
    if (!container) return;

    const ops = _opsAgent();
    const hb = ops?.data?.alpha_heartbeat;
    if (!hb || !hb.running) {
        container.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">Heartbeat not running</div>';
        return;
    }

    const interval = hb.interval_sec != null ? Math.round(hb.interval_sec) : "—";
    const band = (hb.dominant_band || "unknown").toUpperCase();
    const ticks = hb.tick_count || 0;
    const cooling = hb.cooling_elapsed || "—";
    const lastAct = hb.last_activity ? new Date(hb.last_activity).toLocaleTimeString() : "—";

    // Band color mapping (EEG convention)
    const bandColors = { DELTA: "#9999ff", THETA: "#cc99cc", ALPHA: "#66ccaa", BETA: "#ff9966", GAMMA: "#ff6666" };
    const bandColor = bandColors[band] || "var(--lcars-readout)";

    // Cooling curve visualization — show where on the exponential decay we sit
    const maxInterval = 300; // 5min resting
    const minInterval = 10;  // peak
    const pct = hb.interval_sec != null
        ? Math.max(0, Math.min(100, ((hb.interval_sec - minInterval) / (maxInterval - minInterval)) * 100))
        : 0;

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-s);font-size:0.82em">
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">BAND</div>
                <div style="color:${bandColor};font-weight:700;font-size:1.2em">${band}</div>
            </div>
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">INTERVAL</div>
                <div style="color:var(--lcars-readout);font-weight:700;font-size:1.2em">${interval}s</div>
            </div>
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">TICKS</div>
                <div style="color:var(--lcars-secondary)">${ticks}</div>
            </div>
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">COOLING</div>
                <div style="color:var(--text-dim)">${cooling}</div>
            </div>
        </div>
        <div style="margin-top:var(--gap-s)">
            <div style="display:flex;justify-content:space-between;font-size:0.7em;color:var(--text-dim);margin-bottom:2px">
                <span>PEAK 10s</span><span>RESTING 300s</span>
            </div>
            <div style="height:8px;background:var(--bg-inset);border-radius:var(--gap-xs)">
                <div style="width:${pct}%;height:100%;background:${bandColor};border-radius:var(--gap-xs);transition:width 1s"></div>
            </div>
            <div style="font-size:0.7em;color:var(--text-dim);margin-top:2px">Last activity: ${lastAct}</div>
        </div>`;
}

// ── Gc Learning Panel ───────────────────────────────────────────
function renderGcLearning() {
    const container = document.getElementById("eng-gc-learning");
    if (!container) return;

    const ops = _opsAgent();
    const gcl = ops?.data?.gc_learning;
    const gcm = ops?.data?.gc_metrics;

    if (!gcl && !gcm) {
        container.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">No Gc learning data</div>';
        return;
    }

    const staticTypes = gcl?.static_types || 7;
    const promoted = gcl?.types_promoted || 0;
    const tracked = gcl?.types_tracked || 0;
    const gcHandled = gcm?.gc_handled_total || 0;
    const blocked = gcm?.deliberation_blocked_total || 0;
    const ratio = gcm?.gc_ratio || "—";
    const model = (gcm?.deliberation_model || "unknown").toUpperCase();

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--gap-s);font-size:0.82em">
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">STATIC TYPES</div>
                <div style="color:var(--lcars-secondary);font-weight:700;font-size:1.2em">${staticTypes}</div>
            </div>
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">PROMOTED</div>
                <div style="color:${promoted > 0 ? "var(--lcars-medical)" : "var(--text-dim)"};font-weight:700;font-size:1.2em">${promoted}</div>
            </div>
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">TRACKED</div>
                <div style="color:var(--lcars-readout);font-weight:700;font-size:1.2em">${tracked}</div>
            </div>
        </div>
        <div style="margin-top:var(--gap-s);display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-s);font-size:0.82em">
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">GC HANDLED</div>
                <div style="color:var(--lcars-secondary)">${fmtNum(gcHandled)}</div>
            </div>
            <div>
                <div style="color:var(--lcars-title);font-size:0.75em;margin-bottom:2px">BLOCKED</div>
                <div style="color:${blocked > 0 ? "var(--lcars-alert)" : "var(--text-dim)"}">${blocked}</div>
            </div>
        </div>
        <div style="margin-top:var(--gap-s);font-size:0.75em;color:var(--text-dim)">
            Model: <span style="color:var(--lcars-readout)">${model}</span> · ${ratio}
        </div>`;
}

// ── agentd Session 95: Mode Transition Speed ────────────────────
function renderModeTransitions() {
    const el = document.getElementById("eng-mode-transitions");
    if (!el) return;
    // Mock transition data — real data arrives with agentd Phase 4+
    const transitions = [
        { from: "active", to: "DMN", ms: 1200 + Math.round(Math.random() * 400) },
        { from: "DMN", to: "active", ms: 800 + Math.round(Math.random() * 300) },
        { from: "active", to: "sleep", ms: 4500 + Math.round(Math.random() * 1000) },
        { from: "task(creative)", to: "task(evaluative)", ms: 2100 + Math.round(Math.random() * 500) },
    ];
    const maxMs = Math.max(...transitions.map(t => t.ms));
    el.innerHTML = '<div style="font-size:0.78em">'
        + transitions.map(t => {
            const pct = (t.ms / maxMs) * 100;
            return '<div style="display:flex;align-items:center;gap:var(--gap-s);margin-bottom:4px">'
                + '<span style="width:120px;color:var(--lcars-secondary);white-space:nowrap">' + t.from + ' → ' + t.to + '</span>'
                + '<div style="flex:1;height:8px;background:var(--bg-inset);border-radius:var(--gap-xs)"><div style="width:' + pct + '%;height:100%;background:var(--c-tab-engineering);border-radius:var(--gap-xs)"></div></div>'
                + '<span style="width:50px;text-align:right;color:var(--lcars-readout)">' + t.ms + 'ms</span>'
                + '</div>';
        }).join("")
        + '<div style="margin-top:var(--gap-s);color:var(--text-dim)">Trend: improving (mock data — real metrics from agentd Phase 4+)</div>'
        + '</div>';
}

// ── Tactical Station ─────────────────────────────────────────────


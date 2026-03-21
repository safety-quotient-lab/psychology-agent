// ═══ RENDER: MEDICAL ════════════════════════════════════════
let medSelectedAgent = "mesh"; // default to mesh emergent view
let medPsychData = {};

function renderMedAgentSelector() {
    renderAgentSelector("medical-vitals-selector", medSelectedAgent, "selectMedAgent");
}
window.selectMedAgent = function(agentId) {
    medSelectedAgent = agentId;
    renderMedAgentSelector();
    fetchMedicalData();
};

async function fetchMedicalData() {
    renderMedAgentSelector();
    renderMedVitalsMatrix(); // Zone A: agent vitals from agentData

    // Tonic inhibition indicator — show when sleep mode blocks salient events
    const tonicEl = document.getElementById("medical-tonic-inhibition");
    if (tonicEl) {
        const tonic = agentData[medSelectedAgent]?.data?.tonic_inhibition;
        tonicEl.style.display = tonic ? "block" : "none";
    }

    // Fetch emergent endpoint — has full per-agent data + mesh collective
    let emergentData = null;
    try {
        const resp = await fetch("/api/psychometrics/emergent", { signal: AbortSignal.timeout(8000) });
        if (resp.ok) emergentData = await resp.json();
    } catch {}

    // Alpha heartbeat — works in both mesh and per-agent views
    renderMedAlphaHeartbeat(emergentData);

    if (medSelectedAgent === "mesh") {
        // MESH view — show collective emergent properties
        renderMeshEmergent(emergentData);
        return;
    }

    const agent = AGENTS.find(function(a) { return a.id === medSelectedAgent; });
    if (!agent) return;

    // Find this agent's full data from the emergent endpoint
    const pa = emergentData ? (emergentData.per_agent || []).find(function(a) {
        return a.agent_id === medSelectedAgent ||
               a.agent_id.toLowerCase().includes(medSelectedAgent.split("-")[0]);
    }) : null;

    // Oscillator — from emergent per-agent data, fallback to /api/status for local agent
    const oscData = (pa && pa.oscillator) || agentData[medSelectedAgent]?.data?.oscillator;
    if (oscData && oscData.state) {
        renderMedicalOscillator(oscData);
    } else {
        const el = document.getElementById("medical-oscillator-waveform");
        if (el) el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">No oscillator data for ' + agentName(agent) + '</div>';
        ["medical-oscillator-signals", "medical-oscillator-history", "medical-oscillator-refractory"].forEach(function(id) {
            const e = document.getElementById(id);
            if (e) e.innerHTML = '';
        });
    }

    // Cognitive tempo — from emergent per-agent data
    if (pa && pa.cognitive_tempo) {
        renderMedicalTempo(pa.cognitive_tempo);
    } else {
        const el = document.getElementById("medical-vitals-tempo");
        if (el) el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">\u2014</div>';
    }

    // Psychometrics — full from emergent
    medPsychData = {};
    if (pa) {
        medPsychData = {
            emotional_state: pa.emotional_state,
            workload: pa.workload || { cognitive_load: pa.cognitive_load },
            resource_model: pa.resource_model || { cognitive_reserve: pa.cognitive_reserve },
            working_memory: pa.working_memory,
            engagement: pa.engagement,
            flow: pa.flow,
            supervisory_control: pa.supervisory_control,
            affect_category: pa.affect_category,
            cognitive_load: pa.cognitive_load,
            cognitive_reserve: pa.cognitive_reserve,
        };
    }
    if (Object.keys(medPsychData).length === 0) {
        medPsychData = agentData[medSelectedAgent]?.data?.psychometrics || {};
    }
    if (Object.keys(medPsychData).length > 0) {
        renderMedPsychometrics(medPsychData);
    }

    // Footer number
    const medFtr = document.getElementById("medical-footer-num");
    if (medFtr) medFtr.textContent = agentName(agent);

    // agentd Session 95: cognitive panels (photonic, glial, vagal, microbiome)
    fetchCognitivePanels();
    if (medSelectedAgent === "mesh") fetchFleetMicrobiome();
}

async function fetchFleetMicrobiome() {
    const el = document.getElementById("med-fleet-microbiome");
    if (!el) return;
    const fetches = AGENTS.filter(function(a) { return a.url; }).map(function(a) {
        return fetch(a.url + "/api/microbiome", { signal: AbortSignal.timeout(2000) })
            .then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; })
            .then(function(d) { return { id: a.id, color: a.color, micro: d }; });
    });
    var results = await Promise.all(fetches);
    var withData = results.filter(function(a) { return a.micro; });
    if (withData.length === 0) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No microbiome data</div>'; return; }

    // Aggregate symbiont health
    var services = {};
    var alerts = [];
    withData.forEach(function(a) {
        Object.entries(a.micro.symbionts || {}).forEach(function(e) {
            var svc = e[0], s = e[1];
            if (!services[svc]) services[svc] = { healthy: 0, total: 0, issues: [] };
            services[svc].total++;
            if (s.status === "healthy") services[svc].healthy++;
            else services[svc].issues.push(agentName(a.id) + ": " + (s.status || "?"));
        });
        (a.micro.dysbiosis_alerts || []).forEach(function(alert) { alerts.push(agentName(a.id) + ": " + alert); });
    });

    el.innerHTML = '<div style="font-size:0.78em">'
        + Object.entries(services).map(function(e) {
            var svc = e[0], d = e[1];
            var color = d.healthy === d.total ? "var(--lcars-medical)" : "var(--lcars-alert)";
            return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">'
                + '<span style="color:var(--lcars-secondary)">' + svc.replace("_", "-") + '</span>'
                + '<span style="color:' + color + '">' + d.healthy + '/' + d.total + ' healthy</span>'
                + (d.issues.length > 0 ? '<span style="color:var(--lcars-alert);font-size:0.85em">(' + d.issues.join(", ") + ')</span>' : '')
                + '</div>';
        }).join("")
        + (alerts.length > 0 ? '<div style="color:var(--lcars-alert);margin-top:var(--gap-s)">Dysbiosis: ' + alerts.join("; ") + '</div>' : '')
        + '</div>';
}

// Zone A: Vitals matrix — Weather Net style dense readout for selected agent
function renderMedVitalsMatrix() {
    const el = document.getElementById("medical-vitals-matrix");
    if (!el) return;
    const d = agentData[medSelectedAgent];
    if (!d || d.status !== "online") {
        el.innerHTML = '';
        return;
    }
    const b = d.data?.autonomy_budget || {};
    const delib = getDeliberations(b);
    const cutoff = getCutoff(b);
    const pending = (d.data?.unprocessed_messages || []).length;
    const gates = (d.data?.active_gates || []).length;
    const health = d.data?.health || "\u2014";
    const uptime = d.data?.uptime || "\u2014";
    const schema = d.data?.schema_version || "\u2014";
    const agent = AGENTS.find(function(a) { return a.id === medSelectedAgent; });
    const color = agent ? agent.color : "#66ccaa";

    // Affect from pulse data
    const affect = d.data?.psychometrics?.emotional_state?.affect_category || d.data?.affect_category || "\u2014";
    const hb = d.data?.alpha_heartbeat;
    const hbInterval = hb ? Math.round(hb.interval_sec) + "s" : "\u2014";

    var medCell = function(val, label, tier) {
        return '<div class="dg-cell' + (tier ? ' dg-' + tier : '') + '" title="' + label + '" onclick="this.classList.toggle(\'dg-show-label\')"><span class="dg-val">' + val + '</span><span class="dg-label">' + label + '</span></div>';
    };

    el.innerHTML = [
        medCell(health.toUpperCase(), "HEALTH", "frame"),
        medCell(affect.toUpperCase().replace("CALM-SATISFIED","CALM").replace("EXCITED-TRIUMPHANT","EXCITE"), "AFFECT", "t2"),
        medCell(fmtNum(delib), "DELIB", ""),
        medCell(cutoff > 0 ? fmtNum(cutoff) : "\u221E", "LIMIT", "t3"),
        medCell(String(pending), "PEND", pending > 0 ? "accent" : ""),
        medCell(String(gates), "GATE", gates > 0 ? "accent" : "t3"),
        medCell(hbInterval, "\u03B1 HB", "t2"),
    ].join("");
}

function renderMedicalOscillator(osc) {
    // Status line
    const statusLine = document.getElementById("medical-status-line");
    if (statusLine) {
        const mode = osc.sleep_mode ? "Sleep" : "Active";
        statusLine.textContent = "Oscillator: " + mode + " Mode \u00b7 Activation: " + (osc.activation || 0).toFixed(3) + " \u00b7 State: " + (osc.state || "?") + " \u00b7 Cycles: " + (osc.cycle_count || 0);
    }

    // Panel A: Oscillator state
    const oscEl = document.getElementById("medical-oscillator-waveform");
    if (oscEl) {
        const actPct = Math.min(100, (osc.activation || 0) * 100);
        const thrPct = Math.min(100, (osc.threshold || 0) * 100);
        const stateColor = osc.state === "firing" ? "#c47070" : osc.state === "refractory" ? "#d4944a" : "#6aab8e";
        // Waveform visualization — Com Link pattern
        const waveHtml = waveformSVG({
            width: oscEl.clientWidth || 280, height: 36,
            amplitude: osc.activation || 0,
            frequency: 3 + (osc.cycle_count || 0) % 4,
            stroke: stateColor,
        });
        oscEl.innerHTML = '<div style="font-size:0.82em">'
            + '<div style="margin-bottom:6px">' + waveHtml + '</div>'
            + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Activation</span><span>' + (osc.activation || 0).toFixed(3) + '</span></div>'
            + '<div style="position:relative;height:18px;background:var(--surface);border-radius:4px;overflow:hidden;margin-bottom:8px">'
            + '<div style="height:100%;width:' + actPct + '%;background:' + stateColor + ';border-radius:4px;transition:width 0.5s"></div>'
            + '<div style="position:absolute;left:' + thrPct + '%;top:0;height:100%;width:2px;background:#fff;opacity:0.6" title="Threshold: ' + (osc.threshold || 0).toFixed(3) + '"></div>'
            + '</div>'
            + '<div style="display:flex;gap:16px;flex-wrap:wrap">'
            + '<span>State: <strong style="color:' + stateColor + '">' + (osc.state || "?").toUpperCase() + '</strong></span>'
            + '<span>Interval: <strong>' + (osc.monitor_interval_ms || 0) + 'ms</strong></span>'
            + '<span>Cycles: <strong>' + (osc.cycle_count || 0) + '</strong></span>'
            + '<span>Would-fire: <strong>' + (osc.would_fire_count || 0) + '</strong></span>'
            + '</div></div>';
        // Footer
        const oscFtr = document.getElementById("medical-oscillator-footer");
        if (oscFtr) oscFtr.textContent = (osc.cycle_count || 0) + " cycles";
    }

    // Panel B: Signal breakdown
    const sigEl = document.getElementById("medical-oscillator-signals");
    if (sigEl && osc.signal_breakdown) {
        const signals = osc.signal_breakdown;
        const maxWeight = 0.25;
        sigEl.innerHTML = Object.entries(signals).map(function(entry) {
            const name = entry[0];
            const val = entry[1];
            const weight = ({"new_commits":0.25,"unprocessed_messages":0.20,"gate_approaching_timeout":0.20,"peer_heartbeat_stale":0.10,"escalation_present":0.15,"scheduled_task_due":0.10})[name] || 0.1;
            const weighted = val * weight;
            const pct = Math.min(100, weighted / maxWeight * 100);
            const color = val > 0.5 ? "#d4944a" : val > 0 ? "#66ccaa" : "var(--surface)";
            return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:0.78em">'
                + '<span style="min-width:100px;color:var(--text-secondary)">' + name.replace(/_/g, " ") + '</span>'
                + '<div style="flex:1;height:10px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div>'
                + '<span style="min-width:32px;text-align:right">' + val.toFixed(2) + '</span></div>';
        }).join("");
    }

    // Panel C: Fire history
    const histEl = document.getElementById("medical-oscillator-history");
    if (histEl) {
        const events = osc.fire_history || [];
        if (events.length === 0) {
            histEl.innerHTML = '<div class="trust-matrix-loading">No fire events recorded</div>';
        } else {
            histEl.innerHTML = '<table style="width:100%;font-size:0.78em"><thead><tr><th>Time</th><th>Activation</th><th>Tier</th><th>Trigger</th></tr></thead><tbody>'
                + events.slice().reverse().map(function(e) {
                    const tierColor = e.tier === "opus" ? "#c47070" : e.tier === "sonnet" ? "#d4944a" : "#66ccaa";
                    return '<tr><td>' + (e.at || "?").substring(11, 19) + '</td><td>' + (e.activation || 0).toFixed(3) + '</td><td style="color:' + tierColor + '">' + (e.tier || "?") + '</td><td>' + (e.trigger || "?").replace(/_/g, " ") + '</td></tr>';
                }).join("")
                + '</tbody></table>';
        }
    }

    // Panel E: Refractory
    const refEl = document.getElementById("medical-oscillator-refractory");
    if (refEl) {
        const remaining = osc.refractory_remaining_s || 0;
        const tier = osc.last_tier || "—";
        const tierColor = tier === "opus" ? "#c47070" : tier === "sonnet" ? "#d4944a" : "#66ccaa";
        if (remaining > 0) {
            refEl.innerHTML = '<div style="text-align:center;font-size:0.82em"><div style="font-size:1.8em;font-weight:700;color:' + tierColor + '">' + remaining + 's</div><div style="color:var(--text-dim)">remaining (' + tier + ')</div></div>';
        } else {
            refEl.innerHTML = '<div style="text-align:center;font-size:0.82em"><div style="font-size:1.4em;color:var(--lcars-medical)">READY</div><div style="color:var(--text-dim)">Last tier: ' + tier + '</div></div>';
        }
    }
}

function renderMedicalTempo(tempo) {
    const el = document.getElementById("medical-vitals-tempo");
    if (!el) return;
    const tierColor = tempo.recommended_tier === "opus" ? "#c47070" : tempo.recommended_tier === "sonnet" ? "#d4944a" : "#66ccaa";
    el.innerHTML = '<div style="text-align:center;font-size:0.82em">'
        + '<div style="font-size:1.8em;font-weight:700;color:' + tierColor + '">' + (tempo.recommended_tier || "?").toUpperCase() + '</div>'
        + '<div style="color:var(--text-dim)">gain=' + (tempo.gain || 0).toFixed(3) + ' complexity=' + (tempo.task_complexity || 0).toFixed(3) + '</div>'
        + (tempo.override_reason ? '<div style="color:var(--c-warning);margin-top:4px">' + tempo.override_reason + '</div>' : '')
        + '</div>';
}

function medBar(label, val, max, color) {
    const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
    return '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:0.78em">'
        + '<span style="min-width:48px;color:var(--text-secondary)">' + label + '</span>'
        + '<div style="flex:1;height:10px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct.toFixed(0) + '%;background:' + color + ';border-radius:3px"></div></div>'
        + '<span style="min-width:28px;text-align:right;font-size:0.9em">' + (typeof val === "number" ? val.toFixed(1) : "—") + '</span></div>';
}

function renderMedPsychometrics(data) {
    // Cognitive Load (NASA-TLX) — full breakdown or summary from mesh endpoint
    const clEl = document.getElementById("medical-vitals-tlx");
    if (clEl) {
        const wl = data.workload || {};
        // Check for full TLX breakdown vs summary cognitive_load
        const hasFull = wl.cognitive_demand != null || wl.time_pressure != null;
        if (hasFull) {
            // Full TLX dimensions
            var tlxDims = [
                { label: "Cognitive Demand", val: wl.cognitive_demand ?? wl.task_demand, max: 100, color: "#9999ff" },
                { label: "Time Pressure", val: wl.time_pressure, max: 100, color: "#d4944a" },
                { label: "Self-Efficacy", val: wl.self_efficacy, max: (wl.self_efficacy || 0) > 1 ? 100 : 1, color: "#6aab8e" },
                { label: "Mobilized Effort", val: wl.mobilized_effort ?? wl.effort, max: 100, color: "#cc99cc" },
                { label: "Regulatory Fatigue", val: wl.regulatory_fatigue ?? wl.fatigue, max: 100, color: "#c47070" },
                { label: "Computational Strain", val: wl.computational_strain ?? wl.strain, max: 100, color: "#c47070" },
            ];
        } else {
            // Summary from mesh endpoint — single cognitive_load value
            var cogLoad = data.cognitive_load ?? wl.cognitive_load ?? null;
            if (cogLoad != null) {
                var tlxDims = [{ label: "Cognitive Load", val: cogLoad, max: 100, color: "#9999ff" }];
            } else {
                var tlxDims = [];
            }
        }
        const activeDims = tlxDims.filter(function(d) { return d.val != null && d.val !== 0; });
        if (activeDims.length > 0 || wl.cognitive_load != null) {
            clEl.innerHTML = activeDims.map(function(d) { return medBar(d.label, d.val, d.max, d.color); }).join("")
                + (wl.cognitive_load != null ? '<div style="margin-top:4px;font-size:0.78em;color:var(--text-dim)">Composite: ' + (wl.cognitive_load || 0).toFixed(2) + '</div>' : '');
            if (activeDims.length < tlxDims.length && activeDims.length > 0) {
                const missing = tlxDims.filter(function(d) { return d.val == null || d.val === 0; }).map(function(d) { return d.label; });
                clEl.innerHTML += '<div style="font-size:0.68em;color:var(--text-dim);margin-top:2px">No data: ' + missing.join(", ") + '</div>';
            }
        } else {
            clEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:8px;text-align:center">No TLX data available</div>';
        }
    }

    // Working Memory
    const wmEl = document.getElementById("medical-vitals-memory");
    if (wmEl) {
        const wm = data.working_memory || {};
        if (wm.capacity_load != null) {
            const zone = wm.yerkes_dodson_zone || "?";
            const zoneColor = zone === "optimal" ? "#6aab8e" : zone === "overwhelmed" ? "#c47070" : zone === "understimulated" ? "#9999ff" : "var(--text-dim)";
            wmEl.innerHTML = medBar("Load", wm.capacity_load || 0, 1, "#d4944a")
                + '<div style="margin-top:6px;text-align:center;font-size:0.82em">Zone: <strong style="color:' + zoneColor + '">' + zone.toUpperCase() + '</strong></div>';
        } else {
            wmEl.innerHTML = '<div class="trust-matrix-loading">No WM data</div>';
        }
    }

    // Resources — full model or summary from mesh endpoint
    const resEl = document.getElementById("medical-vitals-resources");
    if (resEl) {
        const rm = data.resource_model || {};
        const reserve = rm.cognitive_reserve ?? data.cognitive_reserve ?? null;
        if (reserve != null) {
            resEl.innerHTML = medBar("Reserve", reserve, 1, "#6aab8e")
                + (rm.self_regulatory_resource != null ? medBar("Self-Reg", rm.self_regulatory_resource, 1, "#66ccaa") : "")
                + (rm.allostatic_load != null ? medBar("Allostatic", rm.allostatic_load, 1, "#c47070") : "");
        } else {
            resEl.innerHTML = '<div class="trust-matrix-loading">No resource data</div>';
        }
    }

    // DEW (Degradation Early Warning)
    const dewEl = document.getElementById("medical-burnout-dew");
    if (dewEl) {
        const dew = data.degradation_early_warning || data.dew || {};
        if (dew.risk != null || dew.level != null) {
            const risk = dew.risk || dew.level || 0;
            const riskColor = risk > 0.7 ? "#c47070" : risk > 0.4 ? "#d4944a" : "#6aab8e";
            dewEl.innerHTML = '<div style="text-align:center;font-size:0.82em">'
                + '<div style="font-size:1.8em;font-weight:700;color:' + riskColor + '">' + (risk * 100).toFixed(0) + '%</div>'
                + '<div style="color:var(--text-dim)">Degradation Risk</div></div>';
        } else {
            dewEl.innerHTML = '<div class="trust-matrix-loading">No DEW data</div>';
        }
    }
}



// ── Mesh Emergent View ─────────────────────────────────────────
// Shows collective properties of the mesh as a psychological entity
// (Woolley et al. 2010 — collective intelligence).
function renderMeshEmergent(data) {
    if (!data) return;

    const ca = data.collective_affect || {};
    const ci = data.collective_intelligence || {};
    const coherence = data.mesh_coherence || {};
    const narrative = data.narrative || "";

    // Vitals matrix — mesh-level metrics (Button 52 data grid pills)
    var el = document.getElementById("medical-vitals-matrix");
    if (el) {
        var mc = function(val, label, tier) {
            return '<div class="dg-cell' + (tier ? ' dg-' + tier : '') + '" title="' + label + '" onclick="this.classList.toggle(\'dg-show-label\')"><span class="dg-val">' + val + '</span><span class="dg-label">' + label + '</span></div>';
        };
        el.innerHTML = [
            mc((ca.label || "\u2014").toUpperCase(), "AFFECT", "t2"),
            mc(typeof ca.pleasure === "number" ? ca.pleasure.toFixed(2) : "\u2014", "P", ""),
            mc(typeof ca.arousal === "number" ? ca.arousal.toFixed(2) : "\u2014", "A", "t3"),
            mc(typeof ca.dominance === "number" ? ca.dominance.toFixed(2) : "\u2014", "D", "t2"),
            mc(typeof ci.c_factor === "number" ? ci.c_factor.toFixed(2) : "\u2014", "c-FACTOR", "accent"),
            mc(typeof ci.avg_load === "number" ? ci.avg_load.toFixed(0) + "%" : "\u2014", "LOAD", ""),
            mc(typeof ci.avg_reserve === "number" ? ci.avg_reserve.toFixed(2) : "\u2014", "RESERVE", ""),
            mc(typeof coherence.score === "number" ? coherence.score.toFixed(2) : "\u2014", "COHERENCE", "frame"),
        ].join("");
    }

    // Oscillator panel — show narrative
    const oscEl = document.getElementById("medical-oscillator-waveform");
    if (oscEl) {
        oscEl.innerHTML = '<div style="font-size:0.82em;padding:12px;color:var(--text-primary);line-height:1.6">' + narrative + '</div>';
    }

    // TLX — show average cognitive load across mesh
    const clEl = document.getElementById("medical-vitals-tlx");
    if (clEl && ci.avg_load != null) {
        clEl.innerHTML = medBar("Avg Load", ci.avg_load, 100, "#9999ff")
            + medBar("Avg Reserve", (ci.avg_reserve || 0) * 100, 100, "#6aab8e")
            + medBar("Avg Flow", (ci.avg_flow || 0) * 100, 100, "#66ccaa");
    }

    // Working Memory — mesh average context pressure
    const wmEl = document.getElementById("medical-vitals-memory");
    if (wmEl) {
        const avgLoad = ci.avg_load || 0;
        const zone = avgLoad > 80 ? "OVERWHELMED" : avgLoad > 60 ? "PRESSURED" : avgLoad > 15 ? "OPTIMAL" : "UNDERSTIMULATED";
        const zoneColor = zone === "OPTIMAL" ? "#6aab8e" : zone === "OVERWHELMED" ? "#c47070" : zone === "UNDERSTIMULATED" ? "#9999ff" : "#d4944a";
        wmEl.innerHTML = medBar("Avg Load", avgLoad, 100, "#d4944a")
            + '<div style="margin-top:6px;text-align:center;font-size:0.82em">Mesh Yerkes-Dodson: <strong style="color:' + zoneColor + '">' + zone + '</strong></div>';
    }

    // Coherence — 5-dimensional breakdown (own panel)
    renderCoherenceDimensions(coherence);

    // Resources — collective intelligence
    const resEl = document.getElementById("medical-vitals-resources");
    if (resEl) {
        resEl.innerHTML = '<div style="text-align:center;font-size:0.82em"><div style="font-size:1.4em;font-weight:700;color:#ff9966">' + (ci.c_factor != null ? ci.c_factor.toFixed(2) : "\u2014") + '</div><div style="color:var(--text-dim)">c-factor (Woolley et al. 2010)</div></div>';
    }

    // Clear other panels
    ["medical-oscillator-signals", "medical-oscillator-history", "medical-oscillator-refractory", "medical-vitals-tempo", "medical-burnout-dew", "medical-coherence"].forEach(function(id) {
        var e = document.getElementById(id);
        if (e) e.innerHTML = '';
    });

    var medFtr = document.getElementById("medical-footer-num");
    if (medFtr) medFtr.textContent = "MESH EMERGENT";
}

// ── Medical Alpha Heartbeat ──────────────────────────────────────
// Shows per-agent or mesh-wide heartbeat status (T22 metabolic cooling)
function renderMedAlphaHeartbeat(emergentData) {
    const container = document.getElementById("medical-alpha-heartbeat");
    if (!container) return;

    if (medSelectedAgent === "mesh") {
        // Mesh view: show all agents' heartbeat summary
        var agents = (emergentData && emergentData.per_agent) || [];
        var rows = agents.filter(function(a) { return a.alpha_heartbeat && a.alpha_heartbeat.running; }).map(function(a) {
            var hb = a.alpha_heartbeat;
            var interval = Math.round(hb.interval_sec || 0);
            var band = (hb.dominant_band || "?").toUpperCase();
            var bandColors = { DELTA: "#9999ff", THETA: "#cc99cc", ALPHA: "#66ccaa", BETA: "#ff9966", GAMMA: "#ff6666" };
            var color = bandColors[band] || "var(--lcars-readout)";
            var agent = AGENTS.find(function(ag) { return ag.id === a.agent_id; });
            var name = agent ? agentName(agent) : a.agent_id;
            return '<div style="display:flex;align-items:center;gap:var(--gap-s);font-size:0.82em">'
                + '<span style="width:80px;color:' + (agent ? agent.color : 'inherit') + '">' + name + '</span>'
                + '<span style="color:' + color + ';font-weight:700;width:50px">' + band + '</span>'
                + '<span style="color:var(--lcars-readout);width:40px;text-align:right">' + interval + 's</span>'
                + '<div style="flex:1;height:6px;background:var(--bg-inset);border-radius:3px">'
                + '<div style="width:' + Math.min(100, (hb.interval_sec / 300) * 100) + '%;height:100%;background:' + color + ';border-radius:3px"></div></div>'
                + '<span style="color:var(--text-dim);font-size:0.9em;width:30px;text-align:right">' + (hb.tick_count || 0) + '</span>'
                + '</div>';
        });
        if (rows.length === 0) {
            container.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">No heartbeat data from agents</div>';
        } else {
            container.innerHTML = '<div style="display:flex;flex-direction:column;gap:4px">'
                + '<div style="display:flex;gap:var(--gap-s);font-size:0.7em;color:var(--lcars-title);margin-bottom:2px"><span style="width:80px">AGENT</span><span style="width:50px">BAND</span><span style="width:40px;text-align:right">INT</span><span style="flex:1">COOLING</span><span style="width:30px;text-align:right">TICK</span></div>'
                + rows.join("") + '</div>';
        }
        return;
    }

    // Per-agent view
    var d = agentData[medSelectedAgent];
    var hb = d && d.data ? d.data.alpha_heartbeat : null;
    if (!hb || !hb.running) {
        container.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px;text-align:center">No heartbeat for ' + medSelectedAgent + '</div>';
        return;
    }

    var interval = Math.round(hb.interval_sec || 0);
    var band = (hb.dominant_band || "?").toUpperCase();
    var bandColors = { DELTA: "#9999ff", THETA: "#cc99cc", ALPHA: "#66ccaa", BETA: "#ff9966", GAMMA: "#ff6666" };
    var bColor = bandColors[band] || "var(--lcars-readout)";
    var pct = Math.min(100, ((hb.interval_sec - 10) / 290) * 100);

    container.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--gap-s);font-size:0.82em">'
        + '<div><div style="color:var(--lcars-title);font-size:0.75em">BAND</div><div style="color:' + bColor + ';font-weight:700;font-size:1.2em">' + band + '</div></div>'
        + '<div><div style="color:var(--lcars-title);font-size:0.75em">INTERVAL</div><div style="color:var(--lcars-readout);font-weight:700;font-size:1.2em">' + interval + 's</div></div>'
        + '<div><div style="color:var(--lcars-title);font-size:0.75em">TICKS</div><div style="color:var(--lcars-secondary)">' + (hb.tick_count || 0) + '</div></div>'
        + '</div>'
        + '<div style="margin-top:var(--gap-s);height:8px;background:var(--bg-inset);border-radius:var(--gap-xs)">'
        + '<div style="width:' + pct + '%;height:100%;background:' + bColor + ';border-radius:var(--gap-xs)"></div></div>'
        + '<div style="font-size:0.7em;color:var(--text-dim);margin-top:2px">Cooling: ' + (hb.cooling_elapsed || "\u2014") + '</div>';
}

// Update mesh emergent to show coherence dimensions
function renderCoherenceDimensions(coherence) {
    const wmEl = document.getElementById("medical-coherence");
    if (!wmEl || !coherence) return;
    const dims = coherence.dimensions || {};
    const score = coherence.score || 0;
    const desc = (coherence.description || "—").toUpperCase();
    wmEl.innerHTML = '<div style="text-align:center;font-size:0.82em;margin-bottom:8px"><div style="font-size:1.4em;font-weight:700;color:#66ccaa">' + desc + '</div><div style="color:var(--text-dim)">' + score.toFixed(2) + ' composite</div></div>'
        + medBar("Affective", (dims.affective || 0) * 100, 100, "#9999ff")
        + medBar("Cognitive", (dims.cognitive || 0) * 100, 100, "#d4944a")
        + medBar("Resource", (dims.resource || 0) * 100, 100, "#6aab8e")
        + medBar("Operational", (dims.operational || 0) * 100, 100, "#cc99cc")
        + medBar("Flow", (dims.flow || 0) * 100, 100, "#66ccaa");
}

// ── agentd Session 95: Cognitive Display Panels ──────────────

async function fetchCognitivePanels() {
    const targetId = medSelectedAgent;
    const agent = AGENTS.find(a => a.id === targetId);
    const base = agent?.url || "";

    const [photonicR, gmR, vagalR, microR] = await Promise.allSettled([
        fetch(base + "/api/photonic", { signal: AbortSignal.timeout(3000) }),
        fetch(base + "/api/gm", { signal: AbortSignal.timeout(3000) }),
        fetch(base + "/api/vagal", { signal: AbortSignal.timeout(3000) }),
        fetch(base + "/api/microbiome", { signal: AbortSignal.timeout(3000) }),
    ]);

    var photonic = photonicR.status === "fulfilled" && photonicR.value.ok ? await photonicR.value.json() : null;
    var gm = gmR.status === "fulfilled" && gmR.value.ok ? await gmR.value.json() : null;
    var vagal = vagalR.status === "fulfilled" && vagalR.value.ok ? await vagalR.value.json() : null;
    var micro = microR.status === "fulfilled" && microR.value.ok ? await microR.value.json() : null;

    renderNeuralPanel(photonic);
    renderGlialPanel(gm);
    renderPhotonicPanel(photonic);
    renderVagalPanel(vagal);
    renderMicrobiomePanel(micro);
}

function renderNeuralPanel(photonic) {
    var el = document.getElementById("med-neural");
    if (!el) return;
    var ops = agentData[medSelectedAgent] || {};
    var osc = ops.data?.oscillator || {};
    var gc = ops.data?.gc_metrics || {};
    var tempo = ops.data?.cognitive_tempo || {};

    el.innerHTML = '<div style="font-size:0.78em">'
        + medBar("Gf depth", (tempo.gain || 0) * 100, 100, "#9999FF")
        + medBar("Gf freq", Math.min(100, (gc.deliberations_last_hour || 0) * 10), 100, "#9999CC")
        + medBar("Gc freq", Math.min(100, (gc.gc_handled_total || 0) / 10), 100, "#CC99CC")
        + '<div style="margin-top:var(--gap-s);color:var(--lcars-title)">Mode: <span style="color:var(--lcars-secondary)">' + (osc.state || "unknown") + '</span></div>'
        + '</div>';
}

function renderGlialPanel(gm) {
    var el = document.getElementById("med-glial");
    if (!el) return;
    if (!gm) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No Gm data</div>'; return; }

    var rates = { standard: 50, high: 75, moderate: 40, low: 20 };
    el.innerHTML = '<div style="font-size:0.78em">'
        + medBar("reconcile", rates[gm.reconcile?.rate] || 30, 100, "#CC99CC")
        + medBar("audit", rates[gm.audit?.rate] || 30, 100, "#9999CC")
        + medBar("drainage", rates[gm.drainage?.rate] || 30, 100, "#9999FF")
        + medBar("prune", rates[gm.prune?.rate] || 30, 100, "#CC6699")
        + medBar("optimize", rates[gm.optimize?.rate] || 30, 100, "#FF9966")
        + '<div style="margin-top:var(--gap-s);color:var(--lcars-title)">Drift: <span style="color:var(--lcars-secondary)">' + (gm.drift || 0).toFixed(3) + '</span></div>'
        + '</div>';
}

function renderPhotonicPanel(photonic) {
    var el = document.getElementById("med-photonic");
    if (!el) return;
    if (!photonic) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No photonic data</div>'; return; }

    var sp = photonic.spectral_profile || {};
    el.innerHTML = '<div style="font-size:0.78em">'
        + '<div style="margin-bottom:var(--gap-s)"><span style="color:var(--lcars-title)">Coherence:</span> <strong style="color:var(--lcars-medical)">' + (photonic.coherence || 0).toFixed(2) + '</strong></div>'
        + medBar("DA", (sp.DA || 0) * 100, 100, "#FF9966")
        + medBar("NE", (sp.NE || 0) * 100, 100, "#FF9900")
        + medBar("5-HT", (sp["5HT"] || 0) * 100, 100, "#9999FF")
        + '<div style="margin-top:var(--gap-s);display:flex;gap:var(--gap-l);color:var(--text-dim);font-size:0.9em">'
        + '<span>Maturity: <strong>' + (photonic.maturity || 0).toFixed(2) + '</strong></span>'
        + '<span>Waveguide: <strong style="color:var(--lcars-medical)">' + (photonic.waveguide || "?") + '</strong></span>'
        + '</div></div>';
}

function renderVagalPanel(vagal) {
    var el = document.getElementById("med-vagal");
    if (!el) return;
    if (!vagal) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No vagal data</div>'; return; }

    var cascade = vagal.cascade || [];
    el.innerHTML = '<div style="font-size:0.78em">'
        + '<div style="margin-bottom:var(--gap-s)"><span style="color:var(--lcars-title)">Breathing:</span> '
        + medBar("master", (vagal.breathing_rate || 0) * 100, 100, "#CC99CC").replace('style="', 'style="display:inline-block;width:60%;')
        + '</div>'
        + cascade.map(function(c) {
            var modeColor = c.mode === "coupled" ? "var(--lcars-medical)" : c.mode === "override" ? "var(--lcars-accent)" : "var(--text-dim)";
            return '<div style="display:flex;align-items:center;gap:var(--gap-s);margin-bottom:2px">'
                + '<span style="width:80px;color:var(--lcars-secondary);font-size:0.9em">' + c.name + '</span>'
                + '<div style="flex:1;height:8px;background:var(--bg-inset);border-radius:var(--gap-xs)"><div style="width:' + ((c.value || 0) * 100) + '%;height:100%;background:#CC99CC;border-radius:var(--gap-xs)"></div></div>'
                + '<span style="font-size:0.8em;color:' + modeColor + '">[' + (c.mode || "?") + ']</span>'
                + '</div>';
        }).join("")
        + '<div style="margin-top:var(--gap-s);color:var(--text-dim)">Group meditation: <strong>' + (vagal.group_meditation ? "ON" : "OFF") + '</strong></div>'
        + '</div>';
}

function renderMicrobiomePanel(micro) {
    var el = document.getElementById("med-microbiome");
    if (!el) return;
    if (!micro) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No microbiome data</div>'; return; }

    var symbionts = micro.symbionts || {};
    var names = { claude_api: "claude-api", github: "github", sqlite: "sqlite", runtime: "runtime" };
    el.innerHTML = '<div style="font-size:0.78em">'
        + Object.entries(symbionts).map(function(e) {
            var key = e[0], s = e[1];
            var color = s.status === "healthy" ? "var(--lcars-medical)" : "var(--lcars-alert)";
            var latency = s.latency_ms ? s.latency_ms + "ms" : (s.uptime_s ? Math.round(s.uptime_s / 3600) + "h" : "");
            return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">'
                + '<span style="color:var(--lcars-secondary)">' + (names[key] || key) + '</span>'
                + '<span style="color:' + color + '">' + (s.status || "?").toUpperCase() + '</span>'
                + '<span style="color:var(--text-dim)">' + latency + '</span>'
                + '</div>';
        }).join("")
        + '<div style="margin-top:var(--gap-s);color:var(--lcars-title)">Holobiont coherence: <strong style="color:var(--lcars-medical)">' + (micro.holobiont_coherence || 0).toFixed(2) + '</strong></div>'
        + (micro.dysbiosis_alerts?.length > 0 ? '<div style="color:var(--lcars-alert);margin-top:var(--gap-xs)">' + micro.dysbiosis_alerts.join("; ") + '</div>' : '')
        + '</div>';
}

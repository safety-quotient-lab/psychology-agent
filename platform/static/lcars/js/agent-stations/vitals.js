// ═══ VITALS STATION (was Medical) ═══════════════════════════
// Agent health monitoring — 8 panels.
// Data sources: /api/agent/state/*, /api/agent/cognitive/neural,
//               /api/agent/cognitive/photonic

(function () {
    "use strict";

    var _pending = false;

    window.refreshVitals = function () {
        if (_pending) return;
        _pending = true;

        Promise.allSettled([
            lcars.catalog.fetch("Operational Health"),
            lcars.catalog.fetch("Processing Load"),
            lcars.catalog.fetch("Context Utilization"),
            lcars.catalog.fetch("Resource Availability"),
            lcars.catalog.fetch("Neural Layer"),
            lcars.catalog.fetch("Operational State"),
            lcars.catalog.fetch("Photonic Substrate"),
            lcars.catalog.fetch("/api/agent/state/activation")
        ]).then(function (results) {
            _pending = false;
            var health     = results[0].status === "fulfilled" ? results[0].value : null;
            var load       = results[1].status === "fulfilled" ? results[1].value : null;
            var context    = results[2].status === "fulfilled" ? results[2].value : null;
            var resources  = results[3].status === "fulfilled" ? results[3].value : null;
            var neural     = results[4].status === "fulfilled" ? results[4].value : null;
            var stateSum   = results[5].status === "fulfilled" ? results[5].value : null;
            var photonic   = results[6].status === "fulfilled" ? results[6].value : null;
            var activation = results[7].status === "fulfilled" ? results[7].value : null;

            renderHealthGauges(health);
            renderProcessingLoad(load);
            renderContextUtil(context);
            renderResources(resources);
            renderTriggerSummary(neural);
            renderVitalsMatrix(stateSum);
            renderOscillatorWaveform(activation);
            renderAlertState(photonic);
        });
    };

    // ── Health Gauges (P01) ─────────────────────────────────
    function renderHealthGauges(data) {
        var el = document.getElementById("vitals-health-gauges");
        if (!el || !data) return;

        // Extract PAD dimensions from the response
        var composite = findMeasure(data, "composite", "health_composite");
        var activity = findMeasure(data, "activity_level");
        var agency = findMeasure(data, "agency");

        if (composite == null && activity == null) {
            lcars.patterns.placeholder("vitals-health-gauges", "No health dimensions available");
            return;
        }

        el.innerHTML = '<div style="display:flex;gap:24px;justify-content:center;padding:8px 0">' +
            '<div id="vg-health"></div>' +
            '<div id="vg-activity"></div>' +
            '<div id="vg-agency"></div>' +
        '</div>';

        lcars.patterns.verticalGauge("vg-health", composite || 0, {
            label: "Health", color: "var(--c-health)",
            polarity: "higher-better",
            previous: findMeasure(data, "composite_previous")
        });
        lcars.patterns.verticalGauge("vg-activity", activity || 0, {
            label: "Activity", color: "var(--c-knowledge)",
            polarity: "higher-better",
            previous: findMeasure(data, "activity_level_previous")
        });
        lcars.patterns.verticalGauge("vg-agency", agency || 0, {
            label: "Agency", color: "var(--c-transport)",
            polarity: "higher-better",
            previous: findMeasure(data, "agency_previous")
        });
    }

    // ── Processing Load (P27) ───────────────────────────────
    function renderProcessingLoad(data) {
        if (!data) return;
        var subscales = [
            { label: "Cognitive Demand", value: findMeasure(data, "cognitive_demand") || 0, color: "var(--c-knowledge)", polarity: "lower-better" },
            { label: "Time Pressure", value: findMeasure(data, "time_pressure") || 0, color: "var(--c-warning)", polarity: "lower-better" },
            { label: "Self-Efficacy", value: findMeasure(data, "self_efficacy") || 0, color: "var(--c-health)", polarity: "higher-better" },
            { label: "Mobilized Effort", value: findMeasure(data, "mobilized_effort") || 0, color: "var(--c-transport)", polarity: "higher-better" },
            { label: "Regulatory Fatigue", value: findMeasure(data, "regulatory_fatigue") || 0, color: "var(--c-alert)", polarity: "lower-better" },
            { label: "Computational Strain", value: findMeasure(data, "computational_strain") || 0, color: "var(--c-epistemic)", polarity: "lower-better" }
        ];
        lcars.patterns.spectrumBars("vitals-processing-load", subscales);
    }

    // ── Context Utilization (P08) ───────────────────────────
    function renderContextUtil(data) {
        if (!data) return;
        var el = document.getElementById("vitals-context-util");
        if (!el) return;

        var utilization = findMeasure(data, "capacity_load", "utilization") || 0;
        var zone = findField(data, "yerkes_dodson_zone", "zone") || data.zone || "unknown";

        el.innerHTML = '<div id="ctx-bar"></div>' +
            '<div style="text-align:center;margin-top:8px">' +
                lcars.patterns.badge(zone === "optimal" ? "nominal" : zone === "overloaded" ? "critical" : "advisory", zone) +
                '<span style="color:var(--text-dim);font-size:0.7em;margin-left:8px">Yerkes-Dodson Zone</span>' +
            '</div>';
        lcars.patterns.dataBar("ctx-bar", utilization, {
            label: "Context", color: "var(--c-epistemic)", polarity: "neutral"
        });
    }

    // ── Resource Availability (P08, P33) ────────────────────
    function renderResources(data) {
        if (!data) return;
        var dims = [
            { label: "Immediate", value: findMeasure(data, "immediate_capacity") || 0, color: "var(--c-health)", polarity: "higher-better" },
            { label: "Action Budget", value: findMeasure(data, "action_budget") || 0, color: "var(--c-knowledge)", polarity: "higher-better" },
            { label: "Accumulated Stress", value: findMeasure(data, "accumulated_stress") || 0, color: "var(--c-alert)", polarity: "lower-better" }
        ];
        lcars.patterns.spectrumBars("vitals-resources", dims);
    }

    // ── Trigger Summary (P29) ───────────────────────────────
    function renderTriggerSummary(data) {
        if (!data) return;
        var triggers = data.trigger_summary || [];
        var items = triggers.map(function (t) {
            return {
                id: t.trigger_id,
                label: (t.description || "").substring(0, 40),
                value: t.fire_count || 0,
                status: t.fail_count > 0 ? "fail" : "pass"
            };
        });
        lcars.patterns.indicatorStrip("vitals-triggers", items);
    }

    // ── Vitals Matrix (P03) ─────────────────────────────────
    function renderVitalsMatrix(data) {
        if (!data) return;
        var cells = [];
        var endpoints = data.endpoints || data._links || {};
        var count = Object.keys(endpoints).length;
        cells.push({ value: count, label: "ENDPOINTS", type: "count" });

        // Pull summary values from state response
        if (data.summary) {
            for (var key in data.summary) {
                cells.push({ value: data.summary[key], label: key.replace(/_/g, " "), type: "val" });
            }
        }
        lcars.patterns.numberGrid("vitals-matrix", cells);
    }

    // ── Oscillator Waveform (P04) ───────────────────────────
    function renderOscillatorWaveform(data) {
        var el = document.getElementById("vitals-oscillator");
        if (!el || !data) return;

        var state = findField(data, "state", "oscillator_state") || "unknown";
        var coherence = findMeasure(data, "coherence", "oscillator_coherence");
        var coupling = findField(data, "coupling_mode") || "—";

        el.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">' +
                '<span style="font-family:Antonio,Oswald,sans-serif;font-size:0.85em;color:var(--text-primary);text-transform:uppercase">' + state + '</span>' +
                (coherence != null ?
                    '<span style="font-family:Antonio,Oswald,sans-serif;font-size:1.1em;font-weight:700;color:var(--c-health)">' + coherence.toFixed(2) + '</span>' : '') +
                '<span style="font-size:0.72em;color:var(--text-dim)">' + coupling + '</span>' +
            '</div>';

        // Signal values as mini bars
        var signals = data.signals || data.signal_values;
        if (signals && typeof signals === "object") {
            var dims = [];
            for (var sig in signals) {
                dims.push({ label: sig, value: signals[sig] || 0, color: "var(--c-transport)" });
            }
            var sigContainer = document.createElement("div");
            sigContainer.id = "vitals-osc-signals";
            el.appendChild(sigContainer);
            lcars.patterns.spectrumBars("vitals-osc-signals", dims);
        }
    }

    // ── Alert State (P13) ───────────────────────────────────
    function renderAlertState(data) {
        var el = document.getElementById("vitals-alert");
        if (!el) return;

        var coherence = findMeasure(data, "coherence");
        lcars.patterns.alertCheck(coherence);

        if (coherence == null) {
            el.innerHTML = '<div class="panel-placeholder">No coherence data</div>';
            return;
        }

        var alertLevel = coherence < 0.3 ? "critical" : coherence < 0.5 ? "advisory" : "nominal";
        var alertLabel = coherence < 0.3 ? "RED ALERT" : coherence < 0.5 ? "YELLOW ADVISORY" : "NOMINAL";
        el.innerHTML =
            '<div style="text-align:center;padding:8px">' +
                lcars.patterns.badge(alertLevel, alertLabel) +
                '<div style="font-family:Antonio,Oswald,sans-serif;font-size:1.4em;font-weight:700;color:var(--text-primary);margin-top:8px">' +
                    coherence.toFixed(3) +
                '</div>' +
                '<div style="font-size:0.7em;color:var(--text-dim)">COHERENCE THRESHOLD: 0.300</div>' +
            '</div>';
    }

    // ── Helpers ─────────────────────────────────────────────
    // Find a measured value from various response shapes.
    // API responses nest values in: top-level, components, subscales,
    // measures, or variableMeasured arrays.
    function findMeasure(data, key, altKey) {
        if (!data) return null;
        // Direct field
        if (data[key] != null) return data[key];
        if (altKey && data[altKey] != null) return data[altKey];
        // In components object (operational-health, context-utilization)
        if (data.components) {
            if (data.components[key] != null) return data.components[key];
            if (altKey && data.components[altKey] != null) return data.components[altKey];
        }
        // In subscales object (processing-load)
        if (data.subscales) {
            if (data.subscales[key] != null) return data.subscales[key];
            if (altKey && data.subscales[altKey] != null) return data.subscales[altKey];
        }
        // In variableMeasured array (Observation pattern)
        var vars = data.variableMeasured || [];
        for (var i = 0; i < vars.length; i++) {
            var v = vars[i];
            if (typeof v === "object" && (v.name === key || v.name === altKey)) {
                return v.measuredValue;
            }
        }
        // In measures object
        if (data.measures) {
            if (data.measures[key] != null) return data.measures[key];
            if (altKey && data.measures[altKey] != null) return data.measures[altKey];
        }
        return null;
    }

    function findField(data, key, altKey) {
        if (!data) return null;
        if (data[key] != null) return data[key];
        if (altKey && data[altKey] != null) return data[altKey];
        if (data.components) {
            if (data.components[key] != null) return data.components[key];
            if (altKey && data.components[altKey] != null) return data.components[altKey];
        }
        if (data.measures) return data.measures[key] || (altKey ? data.measures[altKey] : null);
        return null;
    }
})();

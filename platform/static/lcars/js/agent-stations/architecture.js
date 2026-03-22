// ═══ ARCHITECTURE STATION (was Engineering) ═════════════════
// Cognitive structure + efficiency — 7 panels.
// Data sources: /api/msd, /api/agent/state/efficiency,
//               /api/agent/state/generator-balance,
//               /api/agent/state/activation, /api/agent/cognitive/neural

(function () {
    "use strict";

    var _pending = false;

    window.refreshArchitecture = function () {
        if (_pending) return;
        _pending = true;

        Promise.allSettled([
            lcars.catalog.fetch("Cognitive Architecture MSD"),
            lcars.catalog.fetch("Efficiency"),
            lcars.catalog.fetch("Generator Balance"),
            lcars.catalog.fetch("Activation"),
            lcars.catalog.fetch("Neural Layer")
        ]).then(function (results) {
            _pending = false;
            var msd        = results[0].status === "fulfilled" ? results[0].value : null;
            var efficiency = results[1].status === "fulfilled" ? results[1].value : null;
            var generators = results[2].status === "fulfilled" ? results[2].value : null;
            var activation = results[3].status === "fulfilled" ? results[3].value : null;
            var neural     = results[4].status === "fulfilled" ? results[4].value : null;

            renderMSD(msd);
            renderEfficiency(efficiency);
            renderGenerators(generators);
            renderActivation(activation);
            renderGcLearning(neural);
        });
    };

    // ── Cognitive MSD (P02) ─────────────────────────────────
    function renderMSD(data) {
        if (!data || !data.tree) {
            lcars.patterns.placeholder("arch-msd", "No MSD data available");
            return;
        }
        lcars.patterns.dependencyTree("arch-msd", data.tree);
    }

    // ── Efficiency (P08, P33) ───────────────────────────────
    function renderEfficiency(data) {
        if (!data) return;
        var dims = [
            { label: "Throughput", value: data.throughput || 0, color: "var(--c-health)", polarity: "higher-better" },
            { label: "Accuracy", value: data.accuracy || 0, color: "var(--c-knowledge)", polarity: "higher-better" },
            { label: "Learning Rate", value: data.learning_rate || 0, color: "var(--c-transport)", polarity: "higher-better" }
        ];
        lcars.patterns.spectrumBars("arch-efficiency", dims);
    }

    // ── Generator Balance (P08, P33) ────────────────────────
    function renderGenerators(data) {
        if (!data) return;
        var el = document.getElementById("arch-generators");
        if (!el) return;

        var g2 = data.g2_creative || data.creative || 0;
        var g3 = data.g3_evaluative || data.evaluative || 0;
        var g6 = data.g6_crystallizing || data.crystallizing || 0;
        var g7 = data.g7_dissolving || data.dissolving || 0;
        var ratio23 = g3 > 0 ? (g2 / g3).toFixed(2) : "—";
        var ratio67 = g7 > 0 ? (g6 / g7).toFixed(2) : "—";

        el.innerHTML =
            '<div style="display:flex;flex-direction:column;gap:8px">' +
                '<div style="font-size:0.75em;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.04em">G2/G3 Creative-Evaluative: ' + ratio23 + '</div>' +
                '<div id="gen-23"></div>' +
                '<div style="font-size:0.75em;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.04em;margin-top:8px">G6/G7 Crystallize-Dissolve: ' + ratio67 + '</div>' +
                '<div id="gen-67"></div>' +
            '</div>';

        lcars.patterns.spectrumBars("gen-23", [
            { label: "Creative (G2)", value: g2, max: Math.max(g2, g3, 1), color: "var(--c-knowledge)" },
            { label: "Evaluative (G3)", value: g3, max: Math.max(g2, g3, 1), color: "var(--c-epistemic)" }
        ]);
        lcars.patterns.spectrumBars("gen-67", [
            { label: "Crystallize (G6)", value: g6, max: Math.max(g6, g7, 1), color: "var(--c-warning)" },
            { label: "Dissolve (G7)", value: g7, max: Math.max(g6, g7, 1), color: "var(--c-transport)" }
        ]);
    }

    // ── Activation (P01, P14) ───────────────────────────────
    function renderActivation(data) {
        if (!data) return;
        var el = document.getElementById("arch-activation");
        if (!el) return;

        var signals = data.signals || data.signal_values || {};
        var sigNames = Object.keys(signals);

        if (sigNames.length === 0) {
            lcars.patterns.placeholder("arch-activation", "No activation signals");
            return;
        }

        el.innerHTML = '<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap" id="arch-act-gauges"></div>';
        var container = document.getElementById("arch-act-gauges");

        sigNames.forEach(function (name) {
            var gaugeDiv = document.createElement("div");
            gaugeDiv.id = "arch-sig-" + name;
            container.appendChild(gaugeDiv);
            lcars.patterns.verticalGauge("arch-sig-" + name, signals[name] || 0, {
                label: name.replace(/_/g, " "),
                color: "var(--c-transport)",
                polarity: "higher-better"
            });
        });
    }

    // ── Gc Learning (P29) ───────────────────────────────────
    function renderGcLearning(data) {
        if (!data) return;
        var counters = data.gc_counters || [];
        var items = counters.map(function (c) {
            return {
                id: "",
                label: c.event_type || c.pattern || "",
                value: c.count || 0,
                status: c.count > 0 ? "pass" : "inactive"
            };
        });
        if (items.length === 0) {
            lcars.patterns.placeholder("arch-gc-learning", "No Gc patterns crystallized");
            return;
        }
        lcars.patterns.indicatorStrip("arch-gc-learning", items);
    }
})();

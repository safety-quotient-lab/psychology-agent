// ═══ INTEGRITY STATION (was Tactical) ════════════════════════
// Defense, trust, quality assurance — 5 panels.
// Data sources: /api/agent/transport, /api/agent/knowledge/epistemic,
//               meshd endpoints (trust, agents) — degrade gracefully

(function () {
    "use strict";

    var _pending = false;

    window.refreshIntegrity = function () {
        if (_pending) return;
        _pending = true;

        Promise.allSettled([
            lcars.catalog.fetch("Transport"),
            lcars.catalog.fetch("Epistemic Flags"),
            lcars.catalog.fetch("Agent Identity")
        ]).then(function (results) {
            _pending = false;
            var transport = results[0].status === "fulfilled" ? results[0].value : null;
            var epistemic = results[1].status === "fulfilled" ? results[1].value : null;
            var identity  = results[2].status === "fulfilled" ? results[2].value : null;

            renderAgentHealth(identity);
            renderCompliance(transport);
            renderTransportIntegrity(transport);
            renderEpistemicScan(epistemic);
            renderTrustMatrix();
        });
    };

    // ── Agent Health Grid (P30) ─────────────────────────────
    function renderAgentHealth(data) {
        var el = document.getElementById("integrity-health");
        if (!el) return;

        if (!data) {
            lcars.patterns.placeholder("integrity-health", "No agent data available");
            return;
        }

        // Single agent view — show own health metrics
        var health = data.health || "unknown";
        var id = data.agent_id || "unknown";
        var dims = [
            { label: id, value: health === "nominal" || health === "ok" ? 1 : 0, max: 1, color: health === "nominal" || health === "ok" ? "var(--c-health)" : "var(--c-alert)" }
        ];
        lcars.patterns.spectrumBars("integrity-health", dims);
    }

    // ── Protocol Compliance (P09, P03) ──────────────────────
    function renderCompliance(data) {
        var el = document.getElementById("integrity-compliance");
        if (!el) return;

        if (!data) {
            lcars.patterns.placeholder("integrity-compliance", "No transport data for compliance check");
            return;
        }

        // Derive compliance from transport session data
        var sessions = data.sessions || data.session_summaries || [];
        var total = sessions.length;
        var healthy = sessions.filter(function (s) {
            return s.status !== "failed" && s.status !== "rejected";
        }).length;

        el.innerHTML =
            '<div style="text-align:center;padding:8px">' +
                lcars.patterns.badge(healthy === total ? "nominal" : "warning",
                    healthy + "/" + total + " compliant") +
            '</div>';
    }

    // ── Transport Integrity (P03) ───────────────────────────
    function renderTransportIntegrity(data) {
        if (!data) return;
        var unprocessed = data.unprocessed || 0;
        var peers = data.peers || [];
        var gates = data.active_gates || [];

        var cells = [
            { value: unprocessed, label: "UNPROCESSED", type: unprocessed > 0 ? "count" : "val" },
            { value: peers.length, label: "PEERS", type: "id" },
            { value: gates.length, label: "ACTIVE GATES", type: gates.length > 0 ? "count" : "val" }
        ];
        lcars.patterns.numberGrid("integrity-transport", cells);
    }

    // ── Epistemic Scan (P18) ────────────────────────────────
    function renderEpistemicScan(data) {
        if (!data) return;
        var flags = data.flags || data.data || [];
        var unresolved = flags.filter(function (f) { return !f.resolved; });

        var records = unresolved.slice(0, 8).map(function (f) {
            return {
                reference: f.id || "⚑",
                status: "warning",
                title: f.flag || f.text || "",
                fields: [
                    { label: "Session", value: f.session || "—" },
                    { label: "Severity", value: f.severity || "—" }
                ]
            };
        });
        lcars.patterns.filingRecord("integrity-epistemic", records);
    }

    // ── Trust Matrix (P03) — meshd dependency ───────────────
    function renderTrustMatrix() {
        // Trust matrix requires meshd /api/mesh/trust endpoint
        // (not yet implemented). Show placeholder with explanation.
        lcars.patterns.placeholder("integrity-trust",
            "Trust matrix requires meshd — endpoint planned");
    }
})();

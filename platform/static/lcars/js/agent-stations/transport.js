// ═══ TRANSPORT STATION (was Helm) ════════════════════════════
// Inter-agent communication — 5 panels.
// Data sources: /api/agent/transport, /api/agent/transport/messages,
//               /api/agent/cognitive/oscillator

(function () {
    "use strict";

    var _pending = false;

    window.refreshTransport = function () {
        if (_pending) return;
        _pending = true;

        Promise.allSettled([
            lcars.catalog.fetch("Transport"),
            lcars.catalog.fetch("Transport Messages"),
            lcars.catalog.fetch("Vagal Brake")
        ]).then(function (results) {
            _pending = false;
            var transport = results[0].status === "fulfilled" ? results[0].value : null;
            var messages  = results[1].status === "fulfilled" ? results[1].value : null;
            var oscillator = results[2].status === "fulfilled" ? results[2].value : null;

            renderSessionRegistry(transport);
            renderMessageFlow(transport, messages);
            renderVagalBrake(oscillator);
            renderMessageGrid(messages);
        });
    };

    // ── Session Registry (P07, P03) ─────────────────────────
    function renderSessionRegistry(data) {
        if (!data) return;
        var sessions = data.sessions || data.session_summaries || [];
        var items = sessions.map(function (s) {
            return {
                code: s.name || s.session_name || "—",
                title: (s.turns || 0) + " turns",
                description: s.status || "active",
                status: s.status === "closed" ? "inactive" : "nominal"
            };
        });
        lcars.patterns.taskListing("transport-sessions", items);

        // Update footer count
        var footer = document.querySelector("#pane-transport .lcars-panel-footer-num");
        if (footer) footer.textContent = " " + sessions.length;
    }

    // ── Message Flow (P12) ──────────────────────────────────
    function renderMessageFlow(transport, messages) {
        var el = document.getElementById("transport-flow");
        if (!el) return;

        var msgs = [];
        if (messages) msgs = messages.messages || messages.data || [];
        if (msgs.length === 0 && transport) msgs = transport.recent_messages || [];

        if (msgs.length === 0) {
            lcars.patterns.placeholder("transport-flow", "No message flow data");
            return;
        }

        // Build flow pairs
        var pairs = {};
        msgs.forEach(function (m) {
            var from = m.from_agent || "self";
            var to = m.to_agent || "self";
            var key = from + "→" + to;
            if (!pairs[key]) pairs[key] = { from: from, to: to, count: 0, recent: [] };
            pairs[key].count++;
            if (pairs[key].recent.length < 3) pairs[key].recent.push(m);
        });

        // Render as simplified flow list (full P12 SVG in Phase 6b-3)
        var html = '<div style="display:flex;flex-direction:column;gap:6px">';
        for (var key in pairs) {
            var p = pairs[key];
            html +=
                '<div style="display:flex;align-items:center;gap:8px;font-family:Antonio,Oswald,sans-serif;font-size:0.82em">' +
                    '<span style="color:var(--c-transport);min-width:100px;text-align:right">' + p.from + '</span>' +
                    '<span style="color:var(--text-dim)">→</span>' +
                    '<span style="color:var(--c-knowledge);min-width:100px">' + p.to + '</span>' +
                    '<span style="color:var(--text-primary);font-weight:700">' + p.count + '</span>' +
                    '<span style="color:var(--text-dim);font-size:0.85em">messages</span>' +
                '</div>';
        }
        html += '</div>';
        el.innerHTML = html;
    }

    // ── Vagal Brake Controls (P14) ──────────────────────────
    function renderVagalBrake(data) {
        if (!data) return;
        var el = document.getElementById("transport-vagal");
        if (!el) return;

        var state = data.oscillator_state || data.state || "unknown";
        var coupling = data.coupling_mode || "—";
        var coherence = data.oscillator_coherence || data.coherence;

        el.innerHTML =
            '<div style="display:flex;flex-direction:column;gap:8px">' +
                '<div style="display:flex;justify-content:space-between;font-family:Antonio,Oswald,sans-serif;font-size:0.85em">' +
                    '<span style="color:var(--text-dim)">STATE</span>' +
                    '<span style="color:var(--text-primary);text-transform:uppercase">' + state + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;font-family:Antonio,Oswald,sans-serif;font-size:0.85em">' +
                    '<span style="color:var(--text-dim)">COUPLING</span>' +
                    '<span style="color:var(--text-primary)">' + coupling + '</span>' +
                '</div>' +
                (coherence != null ?
                    '<div id="vagal-coh-bar"></div>' : '') +
            '</div>';

        if (coherence != null) {
            lcars.patterns.dataBar("vagal-coh-bar", coherence, {
                label: "Coherence", color: "var(--c-health)", polarity: "higher-better"
            });
        }
    }

    // ── Message Grid (P03) ──────────────────────────────────
    function renderMessageGrid(data) {
        if (!data) return;
        var msgs = data.messages || data.data || [];
        var cells = msgs.slice(0, 20).map(function (m) {
            return {
                value: m.turn || "—",
                label: m.session_name ? m.session_name.substring(0, 8) : "",
                type: m.processed ? "val" : "count"
            };
        });
        if (cells.length === 0) {
            lcars.patterns.placeholder("transport-messages", "No messages indexed");
            return;
        }
        lcars.patterns.numberGrid("transport-messages", cells);
    }
})();

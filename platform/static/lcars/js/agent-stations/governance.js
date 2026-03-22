// ═══ GOVERNANCE STATION (was Operations) ═════════════════════
// Decisions, autonomy, coordination — 8 panels.
// Data sources: /api/agent, /api/agent/governance/*,
//               /api/agent/state/activity-profile,
//               /api/agent/state/autonomy-level,
//               /api/agent/knowledge/memory

(function () {
    "use strict";

    var _pending = false;

    window.refreshGovernance = function () {
        if (_pending) return;
        _pending = true;

        Promise.allSettled([
            lcars.catalog.fetch("Agent Identity"),
            lcars.catalog.fetch("Governance"),
            lcars.catalog.fetch("Architecture Decisions"),
            lcars.catalog.fetch("Cognitive Triggers"),
            lcars.catalog.fetch("Activity Profile"),
            lcars.catalog.fetch("Autonomy Level"),
            lcars.catalog.fetch("Memory Entries")
        ]).then(function (results) {
            _pending = false;
            var identity   = results[0].status === "fulfilled" ? results[0].value : null;
            var governance = results[1].status === "fulfilled" ? results[1].value : null;
            var decisions  = results[2].status === "fulfilled" ? results[2].value : null;
            var triggers   = results[3].status === "fulfilled" ? results[3].value : null;
            var activity   = results[4].status === "fulfilled" ? results[4].value : null;
            var autonomy   = results[5].status === "fulfilled" ? results[5].value : null;
            var memory     = results[6].status === "fulfilled" ? results[6].value : null;

            renderIdentity(identity);
            renderBudget(governance);
            renderDecisions(decisions);
            renderTriggers(triggers);
            renderActivity(activity);
            renderAutonomy(autonomy);
            renderMemory(memory);
        });
    };

    // ── Agent Identity (P07, P09) ───────────────────────────
    function renderIdentity(data) {
        var el = document.getElementById("gov-identity");
        if (!el || !data) return;

        var id = data.agent_id || "unknown";
        var version = data.version || "—";
        var rawHealth = data.health;
        var health = typeof rawHealth === "object"
            ? (rawHealth.unprocessed === 0 && rawHealth.active_gates === 0 ? "nominal" : "advisory")
            : String(rawHealth || "unknown");
        var schema = data.schema_version || "—";

        el.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
                '<div>' +
                    '<div style="font-family:Antonio,Oswald,sans-serif;font-size:1.2em;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.06em">' + id + '</div>' +
                    '<div style="font-size:0.72em;color:var(--text-dim)">v' + version + ' · schema ' + schema + '</div>' +
                '</div>' +
                lcars.patterns.badge(health) +
            '</div>';
    }

    // ── Autonomy Budget (P08, P33) ──────────────────────────
    function renderBudget(data) {
        if (!data) return;
        var budget = data.autonomy_budget || {};
        var spent = budget.budget_spent || 0;
        var cutoff = budget.budget_cutoff || 20;

        lcars.patterns.dataBar("gov-budget", spent, {
            max: cutoff, label: "Spent", color: "var(--c-warning)",
            polarity: "lower-better",
            unit: "/" + cutoff
        });
    }

    // ── Architecture Decisions (P11, P28) ───────────────────
    function renderDecisions(data) {
        if (!data) return;
        var decs = data.decisions || data.data || [];
        var items = decs.slice(0, 12).map(function (d) {
            return {
                code: d.decision_key || d.id || "—",
                title: d.title || d.text || "",
                description: d.rationale || "",
                status: "nominal"
            };
        });
        lcars.patterns.taskListing("gov-decisions", items);
    }

    // ── Cognitive Triggers (P29, P30) ───────────────────────
    function renderTriggers(data) {
        if (!data) return;
        var triggers = data.triggers || data.data || [];
        var items = triggers.map(function (t) {
            return {
                id: t.trigger_id || t.id,
                label: (t.description || "").substring(0, 40),
                value: t.fire_count || 0,
                status: t.fail_count > 0 ? "fail" : "pass"
            };
        });
        lcars.patterns.indicatorStrip("gov-triggers", items);
    }

    // ── Activity Profile (P08, P33) ─────────────────────────
    function renderActivity(data) {
        if (!data) return;
        var dims = [
            { label: "Vigor", value: data.vigor || 0, color: "var(--c-health)", polarity: "higher-better" },
            { label: "Dedication", value: data.dedication || 0, color: "var(--c-knowledge)", polarity: "higher-better" },
            { label: "Absorption", value: data.absorption || 0, color: "var(--c-transport)", polarity: "higher-better" },
            { label: "Burnout Risk", value: data.burnout_risk || 0, color: "var(--c-alert)", polarity: "lower-better" }
        ];
        lcars.patterns.spectrumBars("gov-activity", dims);
    }

    // ── Autonomy Level (P08, P09) ───────────────────────────
    function renderAutonomy(data) {
        var el = document.getElementById("gov-autonomy");
        if (!el || !data) return;

        var loa = data.level_of_automation || data.loa || 5;
        var loaLabel = loa >= 7 ? "autonomous" : loa >= 5 ? "interactive" : "manual";
        var humanLoop = data.human_in_loop != null ? (data.human_in_loop ? "active" : "bypassed") : "—";
        var circuitBreaker = data.circuit_breaker || "—";

        el.innerHTML =
            '<div style="display:flex;flex-direction:column;gap:8px">' +
                '<div style="display:flex;justify-content:space-between;align-items:center">' +
                    '<span style="font-family:Antonio,Oswald,sans-serif;font-size:0.85em;color:var(--text-dim)">LOA</span>' +
                    '<span style="font-family:Antonio,Oswald,sans-serif;font-size:1.1em;font-weight:700;color:var(--text-primary)">' + loa + '</span>' +
                    lcars.patterns.badge(loaLabel === "autonomous" ? "nominal" : "advisory", loaLabel) +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;font-size:0.75em;color:var(--text-secondary)">' +
                    '<span>Human-in-loop: ' + humanLoop + '</span>' +
                    '<span>Circuit breaker: ' + circuitBreaker + '</span>' +
                '</div>' +
            '</div>';
    }

    // ── Memory Topics (P28) ─────────────────────────────────
    function renderMemory(data) {
        if (!data) return;
        var entries = data.entries || data.data || [];
        var items = entries.slice(0, 12).map(function (e) {
            return {
                code: e.topic || "—",
                title: e.entry_key || e.key || "",
                description: e.value || "",
                status: "nominal"
            };
        });
        lcars.patterns.taskListing("gov-memory", items);
    }
})();

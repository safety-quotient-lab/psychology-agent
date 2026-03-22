// ═══ LCARS Pattern Render Functions ═════════════════════════
// Shared visual building blocks mapped to the pattern catalog.
// Each function produces DOM content for a specific LCARS pattern.
// Reference: docs/lcars-pattern-catalog.md

var lcars = lcars || {};
lcars.patterns = {};

// ── P33: Delta Indicator ────────────────────────────────────
// Every mutable numeric value shows direction + magnitude of change.
// Polarity: "higher-better" | "lower-better" | "neutral"
lcars.patterns.delta = function (current, previous, polarity) {
    if (previous == null || current == null) return "";
    var diff = current - previous;
    if (Math.abs(diff) < 0.001) {
        return '<span class="delta-indicator delta-unchanged">━</span>';
    }
    var arrow = diff > 0 ? "▲" : "▼";
    var magnitude = diff > 0 ? "+" : "";
    var formatted = Math.abs(diff) < 1
        ? magnitude + diff.toFixed(2)
        : magnitude + Math.round(diff);

    var colorClass = "delta-neutral";
    if (polarity === "higher-better") {
        colorClass = diff > 0 ? "delta-good" : "delta-bad";
    } else if (polarity === "lower-better") {
        colorClass = diff < 0 ? "delta-good" : "delta-bad";
    }
    return '<span class="delta-indicator ' + colorClass + '">' +
        arrow + formatted + '</span>';
};

// ── P01: Vertical Gauge with Pointer ────────────────────────
// Bio Monitor pattern: vertical bar with ◀ pointer at current value.
// options: { min, max, label, unit, color, polarity, previous }
lcars.patterns.verticalGauge = function (containerId, value, options) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var opts = options || {};
    var min = opts.min || 0;
    var max = opts.max || 1;
    var label = opts.label || "";
    var color = opts.color || "var(--c-health)";
    var pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    var delta = lcars.patterns.delta(value, opts.previous, opts.polarity || "higher-better");
    var displayVal = value < 10 ? value.toFixed(2) : Math.round(value);

    el.innerHTML =
        '<div class="vgauge-container">' +
            '<div class="vgauge-scale">' +
                '<div class="vgauge-track">' +
                    '<div class="vgauge-fill" style="height:' + pct + '%;background:' + color + '"></div>' +
                    '<div class="vgauge-pointer" style="bottom:' + pct + '%">◀</div>' +
                '</div>' +
                '<div class="vgauge-ticks">' +
                    '<span>' + max + '</span>' +
                    '<span>' + ((max + min) / 2).toFixed(1) + '</span>' +
                    '<span>' + min + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="vgauge-readout">' +
                delta +
                '<span class="vgauge-value" style="color:' + color + '">' + displayVal + '</span>' +
                (opts.unit ? '<span class="vgauge-unit">' + opts.unit + '</span>' : '') +
            '</div>' +
            '<div class="vgauge-label">' + label + '</div>' +
        '</div>';
};

// ── P27: Spectrum Bars with Precision ───────────────────────
// DataScan 114 pattern: horizontal bars with numeric readouts.
// dimensions: [{ label, value, max, color, polarity, previous }]
lcars.patterns.spectrumBars = function (containerId, dimensions) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '<div class="spectrum-bars">';
    for (var i = 0; i < dimensions.length; i++) {
        var d = dimensions[i];
        var max = d.max || 1;
        var pct = Math.max(0, Math.min(100, (d.value / max) * 100));
        var color = d.color || "var(--c-knowledge)";
        var delta = lcars.patterns.delta(d.value, d.previous, d.polarity || "higher-better");
        var displayVal = d.value < 10 ? d.value.toFixed(2) : Math.round(d.value);
        html +=
            '<div class="spectrum-row">' +
                '<span class="spectrum-label">' + d.label + '</span>' +
                '<div class="spectrum-track">' +
                    '<div class="spectrum-fill" style="width:' + pct + '%;background:' + color + '"></div>' +
                '</div>' +
                delta +
                '<span class="spectrum-value">' + displayVal + '</span>' +
            '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
};

// ── P08: Inline Data Bar ────────────────────────────────────
// Horizontal bar showing fill percentage with value label.
// options: { max, label, color, polarity, previous, unit }
lcars.patterns.dataBar = function (containerId, value, options) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var opts = options || {};
    var max = opts.max || 1;
    var pct = Math.max(0, Math.min(100, (value / max) * 100));
    var color = opts.color || "var(--c-transport)";
    var delta = lcars.patterns.delta(value, opts.previous, opts.polarity || "higher-better");
    var displayVal = value < 10 ? value.toFixed(2) : Math.round(value);
    var label = opts.label || "";

    el.innerHTML =
        '<div class="databar-row">' +
            (label ? '<span class="databar-label">' + label + '</span>' : '') +
            '<div class="databar-track">' +
                '<div class="databar-fill" style="width:' + pct + '%;background:' + color + '"></div>' +
            '</div>' +
            delta +
            '<span class="databar-value">' + displayVal +
                (opts.unit ? ' ' + opts.unit : '') + '</span>' +
        '</div>';
};

// ── P09: Status Badge ───────────────────────────────────────
// Small pill-shaped indicator with color-coded status.
lcars.patterns.badge = function (status, label) {
    var colorMap = {
        nominal: "var(--c-health)",
        ok: "var(--c-health)",
        online: "var(--c-health)",
        degraded: "var(--c-warning)",
        warning: "var(--c-warning)",
        advisory: "var(--c-warning)",
        critical: "var(--c-alert)",
        offline: "var(--c-alert)",
        failed: "var(--c-alert)",
        inactive: "var(--c-inactive)"
    };
    var statusStr = (typeof status === "object") ? "nominal" : String(status || "unknown");
    var color = colorMap[statusStr] || "var(--c-inactive)";
    var text = label || statusStr;
    return '<span class="lcars-badge" style="background:' + color + '">' +
        String(text).toUpperCase() + '</span>';
};

// ── P29: Vertical Indicator Strip ───────────────────────────
// Compact strip: colored half-circle + number + status block.
// items: [{ id, label, value, status }]
lcars.patterns.indicatorStrip = function (containerId, items) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '<div class="indicator-strip">';
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var statusColor = item.status === "pass" ? "var(--c-health)" :
                          item.status === "fail" ? "var(--c-alert)" :
                          "var(--c-inactive)";
        html +=
            '<div class="indicator-row">' +
                '<span class="indicator-dot" style="background:' + statusColor + '"></span>' +
                '<span class="indicator-id">' + (item.id || "") + '</span>' +
                '<span class="indicator-value">' + (item.value != null ? item.value : "—") + '</span>' +
                '<span class="indicator-label">' + (item.label || "") + '</span>' +
            '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
};

// ── P03: Number Grid ────────────────────────────────────────
// Dense array of numbers in fixed-width cells, color-coded.
// cells: [{ value, label, type }] where type determines color
lcars.patterns.numberGrid = function (containerId, cells) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '<div class="number-grid">';
    for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var typeClass = c.type ? "ngrid-" + c.type : "ngrid-val";
        html +=
            '<div class="ngrid-cell ' + typeClass + '">' +
                '<span class="ngrid-value">' + c.value + '</span>' +
                (c.label ? '<span class="ngrid-label">' + c.label + '</span>' : '') +
            '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
};

// ── P02: Dependency Tree (MSD) ──────────────────────────────
// Renders a JSON tree as an indented dependency structure with
// status bars at each node. SVG rendering deferred to Phase 6b-3;
// this initial version uses styled HTML for rapid iteration.
lcars.patterns.dependencyTree = function (containerId, treeNodes, depth) {
    var el = document.getElementById(containerId);
    if (!el && depth > 0) return ""; // recursive call returns HTML
    var d = depth || 0;
    var html = "";

    for (var i = 0; i < treeNodes.length; i++) {
        var node = treeNodes[i];
        var indent = d * 24;
        var connector = d > 0 ? "├─ " : "";
        if (d > 0 && i === treeNodes.length - 1) connector = "└─ ";

        // Status color from node value
        var statusColor = "var(--c-health)";
        if (node.status === "degraded" || node.status === "advisory") statusColor = "var(--c-warning)";
        if (node.status === "failed" || node.status === "critical") statusColor = "var(--c-alert)";

        // Value display
        var valDisplay = "";
        if (node.value != null) {
            var v = typeof node.value === "number" && node.value < 10
                ? node.value.toFixed(2) : String(node.value);
            valDisplay = '<span class="msd-value">' + v +
                (node.unit ? ' <span class="msd-unit">' + node.unit + '</span>' : '') +
                '</span>';
        }

        // Status bar (percentage fill for numeric values 0-1)
        var barHtml = "";
        if (typeof node.value === "number" && node.value >= 0 && node.value <= 1) {
            var barPct = Math.round(node.value * 100);
            barHtml = '<span class="msd-bar"><span class="msd-bar-fill" style="width:' +
                barPct + '%;background:' + statusColor + '"></span></span>';
        }

        html +=
            '<div class="msd-node" style="padding-left:' + indent + 'px">' +
                '<span class="msd-connector">' + connector + '</span>' +
                '<span class="msd-dot" style="background:' + statusColor + '"></span>' +
                '<span class="msd-label">' + (node.label || node.id) + '</span>' +
                valDisplay + barHtml +
            '</div>';

        if (node.children && node.children.length > 0) {
            html += lcars.patterns.dependencyTree(null, node.children, d + 1);
        }
    }

    if (el) {
        el.innerHTML = '<div class="msd-tree">' + html + '</div>';
    }
    return html;
};

// ── P10: Radial/Polar Display ───────────────────────────────
// SVG radial chart with spokes emanating from center.
// spokes: [{ label, value, max, color }]
lcars.patterns.radialDisplay = function (containerId, spokes, options) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var opts = options || {};
    var size = opts.size || 200;
    var cx = size / 2;
    var cy = size / 2;
    var maxR = (size / 2) - 20;
    var n = spokes.length;
    if (n === 0) return;

    var svg = '<svg viewBox="0 0 ' + size + ' ' + size + '" class="radial-display">';

    // Background rings
    for (var r = 1; r <= 4; r++) {
        var ringR = (maxR / 4) * r;
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ringR +
            '" fill="none" stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>';
    }

    // Spokes + filled area
    var points = [];
    for (var i = 0; i < n; i++) {
        var spoke = spokes[i];
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var ratio = Math.min(1, (spoke.value || 0) / (spoke.max || 1));
        var spokeR = ratio * maxR;
        var x = cx + Math.cos(angle) * spokeR;
        var y = cy + Math.sin(angle) * spokeR;
        points.push(x.toFixed(1) + "," + y.toFixed(1));

        // Spoke line (full length, dimmed)
        var fullX = cx + Math.cos(angle) * maxR;
        var fullY = cy + Math.sin(angle) * maxR;
        svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + fullX.toFixed(1) +
            '" y2="' + fullY.toFixed(1) + '" stroke="var(--border)" stroke-width="0.5" opacity="0.3"/>';

        // Label at tip
        var labelX = cx + Math.cos(angle) * (maxR + 12);
        var labelY = cy + Math.sin(angle) * (maxR + 12);
        var anchor = Math.abs(Math.cos(angle)) < 0.1 ? "middle" :
            Math.cos(angle) > 0 ? "start" : "end";
        svg += '<text x="' + labelX.toFixed(1) + '" y="' + labelY.toFixed(1) +
            '" text-anchor="' + anchor + '" fill="var(--text-secondary)" font-size="9" ' +
            'font-family="Antonio,Oswald,sans-serif" letter-spacing="0.05em">' +
            spoke.label.toUpperCase() + '</text>';

        // Value at spoke end
        var valX = cx + Math.cos(angle) * (spokeR + 6);
        var valY = cy + Math.sin(angle) * (spokeR + 6);
        svg += '<text x="' + valX.toFixed(1) + '" y="' + valY.toFixed(1) +
            '" text-anchor="middle" fill="' + (spoke.color || "var(--c-health)") +
            '" font-size="8" font-family="Antonio,Oswald,sans-serif">' +
            (spoke.value != null ? spoke.value.toFixed(2) : "—") + '</text>';
    }

    // Filled polygon
    if (points.length > 0) {
        svg += '<polygon points="' + points.join(" ") +
            '" fill="var(--c-health)" fill-opacity="0.15" stroke="var(--c-health)" stroke-width="1.5"/>';
    }

    // Center dot
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="var(--c-health)"/>';

    // Center value (composite)
    if (opts.centerValue != null) {
        svg += '<text x="' + cx + '" y="' + (cy + 16) +
            '" text-anchor="middle" fill="var(--text-primary)" font-size="14" ' +
            'font-family="Antonio,Oswald,sans-serif" font-weight="700">' +
            opts.centerValue.toFixed(2) + '</text>';
        if (opts.centerLabel) {
            svg += '<text x="' + cx + '" y="' + (cy + 26) +
                '" text-anchor="middle" fill="var(--text-dim)" font-size="8" ' +
                'font-family="Antonio,Oswald,sans-serif">' + opts.centerLabel + '</text>';
        }
    }

    svg += '</svg>';
    el.innerHTML = svg;
};

// ── P18: Structured Filing Record ───────────────────────────
// Formal filing with reference number, metadata fields, prose body.
// record: { reference, type, date, status, title, body, fields: [{label, value}] }
lcars.patterns.filingRecord = function (containerId, records) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!records || records.length === 0) {
        el.innerHTML = '<div class="panel-placeholder">No records available</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        html +=
            '<div class="filing-record">' +
                '<div class="filing-header">' +
                    '<span class="filing-ref">' + (r.reference || "—") + '</span>' +
                    (r.status ? lcars.patterns.badge(r.status) : '') +
                '</div>';
        if (r.fields) {
            html += '<div class="filing-fields">';
            for (var j = 0; j < r.fields.length; j++) {
                var f = r.fields[j];
                html += '<div class="filing-field"><span class="filing-field-label">' +
                    f.label + '</span> ' + f.value + '</div>';
            }
            html += '</div>';
        }
        if (r.title) {
            html += '<div class="filing-title">' + r.title + '</div>';
        }
        if (r.body) {
            html += '<div class="filing-body">' + r.body + '</div>';
        }
        html += '</div>';
    }
    el.innerHTML = html;
};

// ── P28: Task/Program Listing ───────────────────────────────
// List with code identifier, description, status per entry.
// items: [{ code, title, description, status }]
lcars.patterns.taskListing = function (containerId, items) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!items || items.length === 0) {
        el.innerHTML = '<div class="panel-placeholder">No items available</div>';
        return;
    }

    var html = '<div class="task-listing">';
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        html +=
            '<div class="task-entry">' +
                '<span class="task-code">' + (item.code || (i + 1)) + '</span>' +
                '<div class="task-content">' +
                    '<span class="task-title">' + (item.title || "") + '</span>' +
                    (item.description ? '<span class="task-desc">' + item.description + '</span>' : '') +
                '</div>' +
                (item.status ? lcars.patterns.badge(item.status) : '') +
            '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
};

// ── P30: Departmental Status Bars ───────────────────────────
// Per-department horizontal bars with labels.
// departments: [{ label, value, max, color }]
lcars.patterns.departmentBars = function (containerId, departments) {
    // Reuse spectrumBars with department styling
    lcars.patterns.spectrumBars(containerId, departments);
};

// ── P13: Alert Palette Check ────────────────────────────────
// Toggles body CSS class based on coherence threshold.
lcars.patterns.alertCheck = function (coherence) {
    document.body.classList.remove("alert-red", "alert-yellow");
    if (coherence != null && coherence < 0.3) {
        document.body.classList.add("alert-red");
    }
};

// ── Utility: Panel Placeholder ──────────────────────────────
lcars.patterns.placeholder = function (containerId, message) {
    var el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = '<div class="panel-placeholder">' + (message || "No data") + '</div>';
    }
};

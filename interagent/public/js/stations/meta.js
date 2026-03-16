/**
 * meta.js — Meta station (epistemic audit: messages, decisions, triggers,
 * memory, epistemic debt, epistemic flags).
 *
 * Extracted from inline <script> in index.html.
 * Operates on KB data fetched by the knowledge module.
 *
 * DOM dependencies: #kb-messages, #kb-flags-detail, #epistemic-debt-panel,
 *   #kb-decisions, #kb-triggers, #kb-memory, page control elements
 */

import {
    escapeHtml, parseTS, formatTS, agentName, annotateAcronyms,
} from '../core/utils.js';

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Meta station consumes KB data — no separate fetch needed.
 * Exists for interface consistency with other stations.
 * @returns {Promise<void>}
 */
export async function fetchMetaData() {
    // No-op: Meta tab renders from kbData populated by knowledge.js
}

// ── Render: KB Vitals ─────────────────────────────────────────

/**
 * Render KB vitals counters.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {string} activeAgentFilter
 */
export function renderKBVitals(AGENTS, kbData, activeAgentFilter) {
    let decisions = 0, triggers = 0, catalog = 0, memory = 0, stale = 0;
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);
    for (const agent of agents) {
        const kb = kbData[agent.id];
        if (kb?.status !== "ok") continue;
        const t = kb.data?.totals || {};
        decisions += t.decisions || 0;
        triggers += t.triggers || 0;
        catalog += t.catalog_entries || 0;
        memory += t.memory_entries || 0;
        stale += t.stale_entries || 0;
    }
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el("kb-decisions-count", decisions);
    el("kb-triggers-count", triggers);
    el("kb-catalog-count", catalog);
    el("kb-memory-count", memory);
    const staleEl = document.getElementById("kb-stale-count");
    if (staleEl) {
        staleEl.textContent = stale;
        staleEl.style.color = stale > 10 ? "var(--c-alert)" : stale > 0 ? "var(--c-knowledge)" : "";
    }
}

// ── Render: Decisions Table ───────────────────────────────────

/**
 * Render the decisions table.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} tableState
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControls
 * @param {Function} sortHeader
 */
export function renderDecisions(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-decisions");
    if (!container) return;

    if (tableState.decisions.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.decisions || []).forEach(d => {
                tableState.decisions.data.push({ ...d, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.decisions.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No decisions available. Decisions populate when agents resolve architecture questions via their decision chain.</div>`;
        renderPageControls("decisions", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("decisions", allRows, {
        decided_date: r => parseTS(r.created_at || r.decided_date),
        confidence: r => r.confidence != null ? parseFloat(r.confidence) : -1,
        decision_key: r => r.decision_key || "",
        _agent: r => r._agent || "",
    });

    renderPageControls("decisions", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("decisions", "_agent", "Agent")}
                ${sortHeader("decisions", "decision_key", "Key")}
                <th>Decision</th>
                ${sortHeader("decisions", "decided_date", "Date")}
                ${sortHeader("decisions", "confidence", "Conf")}
            </tr></thead>
            <tbody>${display.map(d => {
                const conf = d.confidence != null ? parseFloat(d.confidence) : null;
                const confClass = conf != null ? (conf >= 0.8 ? "confidence-high" : conf >= 0.5 ? "confidence-mid" : "confidence-low") : "";
                const confText = conf != null ? conf.toFixed(2) : "—";
                const dateShort = formatTS(d.created_at || d.decided_date);
                const fullText = d.decision_text || "—";
                const truncated = fullText.length > 120;
                const text = truncated ? fullText.substring(0, 120) + "…" : fullText;
                const rowId = "dec-" + (d.decision_key || "").replace(/[^a-z0-9-]/gi, "") + "-" + d._agent;
                return `<tr class="${truncated ? "expandable-row" : ""}" ${truncated ? `onclick="toggleDecisionRow('${rowId}')"` : ""}>
                    <td><span class="agent-dot" data-agent="${d._agent}"></span>${agentName(d._agent, AGENTS)}</td>
                    <td style="color:var(--c-knowledge);white-space:nowrap">${d.decision_key || "—"}</td>
                    <td>${annotateAcronyms(escapeHtml(text))}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                    <td><span class="confidence-badge ${confClass}">${confText}</span></td>
                </tr>${truncated ? `<tr id="${rowId}" class="expanded-detail-row" style="display:none"><td colspan="5"><div class="expanded-detail">${annotateAcronyms(escapeHtml(fullText))}</div></td></tr>` : ""}`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Render: Triggers Table ────────────────────────────────────

/**
 * Render the triggers table.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} tableState
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControls
 * @param {Function} sortHeader
 */
export function renderTriggers(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-triggers");
    if (!container) return;

    if (tableState.triggers.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.triggers || []).forEach(t => {
                tableState.triggers.data.push({ ...t, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.triggers.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No triggers available. Each agent's cognitive triggers appear after bootstrap_state_db.py populates the trigger_state table.</div>`;
        renderPageControls("triggers", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("triggers", allRows, {
        fire_count: r => r.fire_count || 0,
        relevance_score: r => r.relevance_score != null ? parseFloat(r.relevance_score) : -1,
        trigger_id: r => r.trigger_id || "",
        last_fired: r => parseTS(r.last_fired),
        _agent: r => r._agent || "",
    });

    renderPageControls("triggers", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("triggers", "_agent", "Agent")}
                ${sortHeader("triggers", "trigger_id", "Trigger")}
                <th>Description</th>
                ${sortHeader("triggers", "fire_count", "Fires")}
                ${sortHeader("triggers", "last_fired", "Last Fired")}
                ${sortHeader("triggers", "relevance_score", "Relevance")}
            </tr></thead>
            <tbody>${display.map(t => {
                const lastFired = t.last_fired ? formatTS(t.last_fired) : "never";
                const rel = t.relevance_score != null ? parseFloat(t.relevance_score).toFixed(2) : "—";
                const desc = (t.description || "").length > 80
                    ? t.description.substring(0, 80) + "…"
                    : (t.description || "—");
                return `<tr>
                    <td><span class="agent-dot" data-agent="${t._agent}"></span>${agentName(t._agent, AGENTS)}</td>
                    <td style="color:var(--c-epistemic);white-space:nowrap">${t.trigger_id || "—"}</td>
                    <td>${annotateAcronyms(escapeHtml(desc))}</td>
                    <td style="text-align:center">${t.fire_count || 0}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${lastFired}</td>
                    <td style="text-align:center">${rel}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Render: Messages (audit trail) ────────────────────────────

/**
 * Render the messages audit table.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} tableState
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControls
 * @param {Function} sortHeader
 */
export function renderMessages(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-messages");
    if (!container) return;

    if (tableState.messages.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.messages || []).forEach(m => {
                tableState.messages.data.push({ ...m, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.messages.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No messages indexed. Messages populate when bootstrap_state_db.py processes transport JSON files.</div>`;
        renderPageControls("messages", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("messages", allRows, {
        timestamp: r => parseTS(r.timestamp),
        from_agent: r => r.from_agent || "",
        to_agent: r => r.to_agent || "",
        session_name: r => r.session_name || "",
        message_type: r => r.message_type || "",
        turn: r => r.turn || 0,
        claims_count: r => r.claims_count || 0,
        _agent: r => r._agent || "",
    });

    renderPageControls("messages", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("messages", "from_agent", "From")}
                ${sortHeader("messages", "to_agent", "To")}
                ${sortHeader("messages", "session_name", "Session")}
                ${sortHeader("messages", "turn", "Turn")}
                ${sortHeader("messages", "message_type", "Type")}
                <th>Subject</th>
                ${sortHeader("messages", "claims_count", "Claims")}
                <th style="width:2em">GH</th>
                ${sortHeader("messages", "timestamp", "Date")}
            </tr></thead>
            <tbody>${display.map(m => {
                const dateShort = formatTS(m.timestamp);
                const subject = (m.subject || "").length > 60
                    ? m.subject.substring(0, 60) + "…"
                    : (m.subject || "—");
                const claimsCount = m.claims_count || 0;
                const claimsLink = claimsCount > 0
                    ? `<a href="#pane-kb" onclick="switchTab('kb');document.getElementById('filter-claims').value='${escapeHtml(m.session_name || "")}';filterTable('claims');return false;" style="color:var(--c-knowledge)">${claimsCount}</a>`
                    : `<span style="color:var(--text-dim)">0</span>`;
                return `<tr>
                    <td><span class="agent-dot" data-agent="${m._agent}"></span>${escapeHtml(m.from_agent || "—")}</td>
                    <td style="font-size:0.85em">${escapeHtml(m.to_agent || "—")}</td>
                    <td style="color:var(--c-transport);font-size:0.85em;white-space:nowrap">${escapeHtml(m.session_name || "—")}</td>
                    <td style="text-align:center">${m.turn || "—"}</td>
                    <td style="font-size:0.85em">${escapeHtml(m.message_type || "—")}</td>
                    <td style="font-size:0.85em">${escapeHtml(subject)}</td>
                    <td style="text-align:center">${claimsLink}</td>
                    <td style="text-align:center">${m.issue_url ? `<a href="${escapeHtml(m.issue_url)}" target="_blank" rel="noopener" title="GitHub Issue #${m.issue_number || ''}" style="color:var(--text-secondary);text-decoration:none">&#x1F517;</a>` : ''}</td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${dateShort}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Render: Memory by Topic ───────────────────────────────────

/**
 * Render memory topics table.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {string} activeAgentFilter
 */
export function renderMemoryTopics(AGENTS, kbData, activeAgentFilter) {
    const container = document.getElementById("kb-memory");
    if (!container) return;
    const allTopics = [];
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);

    for (const agent of agents) {
        const kb = kbData[agent.id];
        if (kb?.status !== "ok") continue;
        (kb.data?.memory?.by_topic || []).forEach(t => {
            allTopics.push({ ...t, _agent: agent.id });
        });
    }

    if (allTopics.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No memory data available. Memory topics populate from each agent's memory_entries table.</div>`;
        return;
    }

    allTopics.sort((a, b) => (b.stale_count || 0) - (a.stale_count || 0) || (b.entry_count || 0) - (a.entry_count || 0));

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                <th>Agent</th>
                <th>Topic</th>
                <th>Entries</th>
                <th>Stale</th>
                <th>Freshness</th>
                <th>Newest</th>
            </tr></thead>
            <tbody>${allTopics.map(t => {
                const staleCount = t.stale_count || 0;
                const totalCount = t.entry_count || 0;
                const staleRatio = totalCount > 0 ? staleCount / totalCount : 0;
                const freshClass = staleRatio > 0.5 ? "freshness-stale" : staleRatio > 0 ? "freshness-aging" : "freshness-fresh";
                const freshLabel = staleRatio > 0.5 ? "stale" : staleRatio > 0 ? "aging" : "fresh";
                const newest = t.newest ? formatTS(t.newest) : "—";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${t._agent}"></span>${agentName(t._agent, AGENTS)}</td>
                    <td>${escapeHtml(t.topic || "—")}</td>
                    <td style="text-align:center">${totalCount}</td>
                    <td style="text-align:center;${staleCount > 0 ? "color:var(--c-alert)" : ""}">${staleCount}</td>
                    <td style="text-align:center"><span class="freshness-indicator"><span class="freshness-dot ${freshClass}"></span><span class="freshness-label">${freshLabel}</span></span></td>
                    <td style="white-space:nowrap;color:var(--text-secondary)">${newest}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

// ── Render: Epistemic Debt ─────────────────────────────────────

/**
 * Render the epistemic debt dashboard.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {string} activeAgentFilter
 */
export function renderEpistemicDebt(AGENTS, kbData, activeAgentFilter) {
    const container = document.getElementById("epistemic-debt-panel");
    if (!container) return;
    const agents = activeAgentFilter === "all" ? AGENTS : AGENTS.filter(a => a.id === activeAgentFilter);

    let totalClaims = 0, unverified = 0, staleClaims = 0;
    let totalMemory = 0, staleMemory = 0;
    let totalLessons = 0, staleLessons = 0;
    let transportFlags = 0;
    const confBuckets = { "< 0.7": 0, "0.7–0.8": 0, "0.8–0.9": 0, "0.9–1.0": 0 };
    const agentDebt = [];

    for (const agent of agents) {
        const kb = kbData[agent.id];
        if (kb?.status !== "ok") continue;
        const t = kb.data?.totals || {};
        const ac = t.claims || 0;
        const av = t.claims_verified || 0;
        const as = t.claims_stale || 0;
        const am = t.memory_entries || 0;
        const asm = t.stale_entries || 0;
        const al = t.lessons || 0;
        const asl = t.lessons_stale || 0;
        const aef = t.epistemic_unresolved || 0;
        totalClaims += ac; unverified += (ac - av); staleClaims += as;
        totalMemory += am; staleMemory += asm;
        totalLessons += al; staleLessons += asl;
        transportFlags += aef;

        (kb.data?.claims || []).forEach(c => {
            const conf = parseFloat(c.confidence);
            if (isNaN(conf)) return;
            if (conf < 0.7) confBuckets["< 0.7"]++;
            else if (conf < 0.8) confBuckets["0.7–0.8"]++;
            else if (conf < 0.9) confBuckets["0.8–0.9"]++;
            else confBuckets["0.9–1.0"]++;
        });

        const debtScore = (ac - av) + asm + asl + aef;
        if (debtScore > 0) {
            agentDebt.push({ agent: agent.id, claims: ac - av, memory: asm, lessons: asl, flags: aef, total: debtScore });
        }
    }

    const totalDebt = unverified + staleMemory + staleLessons + transportFlags;
    const debtLevel = totalDebt > 100 ? "high" : totalDebt > 30 ? "moderate" : totalDebt > 0 ? "low" : "none";
    const debtColor = debtLevel === "high" ? "var(--c-alert)" : debtLevel === "moderate" ? "var(--c-warning, #d4944a)" : debtLevel === "low" ? "var(--c-tab-kb)" : "var(--c-tab-pulse)";

    const maxBucket = Math.max(...Object.values(confBuckets), 1);
    const histBars = Object.entries(confBuckets).map(([label, count]) => {
        const pct = Math.round((count / maxBucket) * 100);
        const barColor = label === "< 0.7" ? "var(--c-alert)" : label === "0.7–0.8" ? "var(--c-warning, #d4944a)" : "var(--c-tab-kb)";
        return `<div class="debt-hist-row">
            <span class="debt-hist-label">${label}</span>
            <div class="debt-hist-bar-bg"><div class="debt-hist-bar" style="width:${pct}%;background:${barColor}"></div></div>
            <span class="debt-hist-count">${count}</span>
        </div>`;
    }).join("");

    agentDebt.sort((a, b) => b.total - a.total);
    const agentRows = agentDebt.map(a =>
        `<tr>
            <td><span class="agent-dot" data-agent="${a.agent}"></span>${agentName(a.agent, AGENTS)}</td>
            <td style="text-align:center;${a.claims > 0 ? "color:var(--c-alert)" : ""}">${a.claims}</td>
            <td style="text-align:center;${a.memory > 0 ? "color:var(--c-warning,#d4944a)" : ""}">${a.memory}</td>
            <td style="text-align:center;${a.lessons > 0 ? "color:var(--c-warning,#d4944a)" : ""}">${a.lessons}</td>
            <td style="text-align:center;${a.flags > 0 ? "color:var(--c-epistemic)" : ""}">${a.flags}</td>
            <td style="text-align:center;font-weight:bold">${a.total}</td>
        </tr>`
    ).join("");

    container.innerHTML = `
        <div class="debt-summary">
            <div class="debt-headline" style="color:${debtColor}">
                <span class="debt-headline-number">${totalDebt}</span>
                <span class="debt-headline-label">total epistemic debt items</span>
            </div>
            <div class="debt-breakdown">
                <div class="debt-item">
                    <span class="debt-item-count" style="color:var(--c-alert)">${unverified}</span>
                    <span class="debt-item-label">unverified claims</span>
                </div>
                <div class="debt-item">
                    <span class="debt-item-count">${staleMemory}</span>
                    <span class="debt-item-label">stale memory</span>
                </div>
                <div class="debt-item">
                    <span class="debt-item-count">${staleLessons}</span>
                    <span class="debt-item-label">stale lessons</span>
                </div>
                <div class="debt-item">
                    <span class="debt-item-count" style="color:var(--c-epistemic)">${transportFlags}</span>
                    <span class="debt-item-label">transport flags</span>
                </div>
            </div>
        </div>
        <div class="debt-sections">
            <div class="debt-section">
                <div class="debt-section-title">Confidence Distribution</div>
                <div class="debt-histogram">${histBars}</div>
            </div>
            ${agentRows.length > 0 ? `<div class="debt-section">
                <div class="debt-section-title">Debt by Agent</div>
                <table class="kb-table">
                    <thead><tr><th>Agent</th><th>Claims</th><th>Memory</th><th>Lessons</th><th>Flags</th><th>Total</th></tr></thead>
                    <tbody>${agentRows}</tbody>
                </table>
            </div>` : ""}
        </div>
    `;
}

// ── Render: Epistemic Flags Detail ────────────────────────────

/**
 * Render unresolved epistemic flags table.
 * @param {Array} AGENTS
 * @param {Object} kbData
 * @param {Object} tableState
 * @param {Function} getFilteredSorted
 * @param {Function} renderPageControls
 * @param {Function} sortHeader
 */
export function renderEpistemicFlags(AGENTS, kbData, tableState, getFilteredSorted, renderPageControls, sortHeader) {
    const container = document.getElementById("kb-flags-detail");
    if (!container) return;

    if (tableState.flags.data.length === 0) {
        for (const agent of AGENTS) {
            const kb = kbData[agent.id];
            if (kb?.status !== "ok") continue;
            (kb.data?.epistemic_flags || []).forEach(f => {
                tableState.flags.data.push({ ...f, _agent: agent.id });
            });
        }
    }

    const allRows = tableState.flags.data;
    if (allRows.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85em;padding:8px">No unresolved epistemic flags — epistemic debt at zero.</div>`;
        renderPageControls("flags", 0, 1, 0, 0);
        return;
    }

    const { display, page, totalPages, filtered, total } = getFilteredSorted("flags", allRows, {
        created_at: r => r.created_at || "",
        age_days: r => parseFloat(r.age_days) || 0,
        from_agent: r => (r.from_agent || r._agent || ""),
        source: r => (r.source || ""),
        flag_text: r => (r.flag_text || ""),
        session_name: r => (r.session_name || ""),
    });

    renderPageControls("flags", page, totalPages, filtered.length, total);

    container.innerHTML = `
        <table class="kb-table">
            <thead><tr>
                ${sortHeader("flags", "from_agent", "Agent")}
                <th>Flag</th>
                ${sortHeader("flags", "age_days", "Age")}
                ${sortHeader("flags", "source", "Source")}
                ${sortHeader("flags", "session_name", "Session")}
                ${sortHeader("flags", "created_at", "Date")}
            </tr></thead>
            <tbody>${display.map(f => {
                const agentShort = agentName(f.from_agent || f._agent || "unknown", AGENTS);
                const flagText = escapeHtml(f.flag_text || "—");
                const truncated = flagText.length > 120;
                const displayText = truncated
                    ? `<span class="expandable-text" title="${flagText}">${flagText.slice(0, 120)}…</span>`
                    : flagText;
                const age = parseInt(f.age_days) || 0;
                const ageColor = age > 30 ? "var(--c-alert)" : age > 7 ? "var(--c-warning, #d4944a)" : "";
                const dateStr = (f.created_at || "").slice(0, 10);
                const session = f.session_name ? escapeHtml(f.session_name) : "—";
                const source = f.source ? escapeHtml(f.source).replace(/^from-/, "").replace(/\.json$/, "") : "—";
                return `<tr>
                    <td><span class="agent-dot" data-agent="${f._agent}"></span>${agentShort}</td>
                    <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis">${displayText}</td>
                    <td style="text-align:center;color:${ageColor};font-weight:bold">${age}d</td>
                    <td style="font-size:0.85em">${source}</td>
                    <td style="font-size:0.85em">${session}</td>
                    <td style="font-size:0.85em">${dateStr}</td>
                </tr>`;
            }).join("")}</tbody>
        </table>
    `;
}

/**
 * science.js — Science station (organism-level focus).
 *
 * Five widgets: MSD Affect Grid, Generator Balance, Epistemic Health,
 * Shared Mental Models, Organism Narrative. Per-agent detail panels
 * (DEW gauge, LOA ladder, flow state) moved to Operations (future pass).
 *
 * Data endpoints:
 *   GET {opsAgent.url}/api/psychometrics — affect, organism, generators
 *   GET {agent.url}/api/kb — claims, flags, epistemic data
 *   GET {agent.url}/api/health — agent health, schema version
 *
 * DOM dependencies: #msd-schematic, generator balance elements,
 *   epistemic health elements, shared models elements, #narrative-text
 *
 * Global state accessed: AGENTS (for ops-agent URL and agent colors)
 */

// ── Module State ───────────────────────────────────────────────
let scienceData = null;
let kbCache = {};
let healthCache = {};
let scienceFetchPending = false;

// ── Agent layout for MSD schematic ─────────────────────────────

/** Card positions around the central node (percentage offsets from container center) */
const MSD_POSITIONS = [
    { label: "psych",   slot: "top-left"     },
    { label: "psq",     slot: "top-right"    },
    { label: "unrat",   slot: "bottom-left"  },
    { label: "obs",     slot: "bottom-right" },
    { label: "ops",     slot: "right"        },
];

/** All 5 agents for the MSD schematic (matches AGENTS + operations-agent) */
const MSD_AGENTS = [
    { id: "psychology-agent",  label: "psych", color: "var(--c-psychology)"  },
    { id: "psq-agent",        label: "psq",   color: "var(--c-psq)"        },
    { id: "unratified-agent",  label: "unrat", color: "var(--c-unratified)" },
    { id: "observatory-agent", label: "obs",   color: "var(--c-observatory)"},
    { id: "operations-agent",  label: "ops",   color: "var(--c-tab-ops)"   },
];

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch psychometrics + KB + health data, then render all widgets.
 * @param {Array} AGENTS — agent config array (4 public agents)
 * @returns {Promise<void>}
 */
export async function fetchScienceData(AGENTS) {
    if (scienceFetchPending) return;
    scienceFetchPending = true;
    try {
        const opsAgent = AGENTS.find(a => a.id === "operations-agent");
        const baseUrl = opsAgent ? opsAgent.url : "https://psychology-agent.safety-quotient.dev";

        // Parallel fetch: psychometrics + KB data from each agent + health
        const psychPromise = fetch(`${baseUrl}/api/psychometrics`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);

        const kbPromises = AGENTS.map(agent =>
            fetch(`${agent.url}/api/kb`, { signal: AbortSignal.timeout(8000) })
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
                .then(data => { kbCache[agent.id] = data; })
        );

        const healthPromises = AGENTS.map(agent =>
            fetch(`${agent.url}/api/health`, { signal: AbortSignal.timeout(8000) })
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
                .then(data => { healthCache[agent.id] = data; })
        );

        const [psychData] = await Promise.all([
            psychPromise,
            ...kbPromises,
            ...healthPromises,
        ]);
        scienceData = psychData;
    } catch {
        scienceData = null;
    } finally {
        scienceFetchPending = false;
    }
    renderScience(AGENTS);
}

// ── Render: MSD Affect Schematic ───────────────────────────────

/**
 * Render the MSD-style organism affect grid with central node,
 * leader lines, and agent cards arranged around the center.
 * DOM WRITE: #msd-schematic (innerHTML), #org-affect-label,
 *   #org-valence, #org-activation
 * @param {Array} AGENTS — agent config array
 */
export function renderMSDSchematic(AGENTS) {
    const container = document.getElementById("msd-schematic");
    if (!container) return;

    const org = scienceData?.organism || null;
    const agentStates = scienceData?.agents || {};

    // Update aggregate header
    const labelEl = document.getElementById("org-affect-label");
    const valEl = document.getElementById("org-valence");
    const actEl = document.getElementById("org-activation");
    if (labelEl) labelEl.textContent = org?.state_label || "AWAITING";
    if (valEl) valEl.textContent = org?.valence != null ? formatSigned(org.valence) : "--";
    if (actEl) actEl.textContent = org?.activation != null ? formatSigned(org.activation) : "--";

    // Build schematic HTML
    let html = '';

    // Central node
    html += '<div class="msd-center-node"><span class="msd-center-text">MESH</span></div>';

    // Leader lines + agent cards
    MSD_AGENTS.forEach((msdAgent, index) => {
        const slot = MSD_POSITIONS[index].slot;
        const state = agentStates[msdAgent.id] || {};
        const valence = state.valence ?? 0;
        const activation = state.arousal ?? state.activation ?? 0;
        const affectLabel = state.affect_label || classifyAffect(valence, activation);

        html += `<div class="msd-leader-line msd-line-${slot}" style="--agent-color: ${msdAgent.color}"></div>`;
        html += `<div class="msd-agent-card msd-card-${slot}" style="--agent-color: ${msdAgent.color}">`;
        html += `  <div class="msd-card-bar"></div>`;
        html += `  <div class="msd-card-content">`;
        html += `    <div class="msd-card-name">${msdAgent.label.toUpperCase()}</div>`;
        html += `    <div class="msd-card-affect">${affectLabel}</div>`;
        html += `    <div class="msd-card-bars">`;
        html += `      <div class="msd-bar-row"><span class="msd-bar-label">v</span>${renderMiniBar(valence)}</div>`;
        html += `      <div class="msd-bar-row"><span class="msd-bar-label">a</span>${renderMiniBar(activation)}</div>`;
        html += `    </div>`;
        html += `  </div>`;
        html += `</div>`;
    });

    container.innerHTML = html;
}

/**
 * Render a small horizontal bar representing a -1..+1 value.
 * @param {number} value — value in -1..+1 range
 * @returns {string} HTML for the mini bar
 */
function renderMiniBar(value) {
    const clamped = Math.max(-1, Math.min(1, value));
    // Map -1..+1 to 0..100 percent
    const fillPct = ((clamped + 1) / 2) * 100;
    const colorClass = clamped >= 0 ? "msd-bar-positive" : "msd-bar-negative";
    return `<div class="msd-mini-bar"><div class="msd-mini-bar-center"></div><div class="msd-mini-bar-fill ${colorClass}" style="width:${fillPct}%"></div></div>`;
}

/**
 * Classify affect from valence + activation into a human-readable label.
 * @param {number} valence — -1..+1
 * @param {number} activation — -1..+1
 * @returns {string} affect label
 */
function classifyAffect(valence, activation) {
    if (valence > 0.3 && activation > 0.3) return "ENGAGED";
    if (valence > 0.3 && activation <= 0.3) return "CONTENT";
    if (valence <= -0.3 && activation > 0.3) return "STRESSED";
    if (valence <= -0.3 && activation <= -0.3) return "WITHDRAWN";
    if (activation > 0.3) return "ALERT";
    if (activation <= -0.3) return "DORMANT";
    return "NEUTRAL";
}

/**
 * Format a number with explicit sign.
 * @param {number} value
 * @returns {string}
 */
function formatSigned(value) {
    const formatted = value.toFixed(1);
    return value >= 0 ? `+${formatted}` : formatted;
}

// ── Render: Generator Balance ──────────────────────────────────

/**
 * Render the generator balance bars (G2/G3 and G6/G7 pairs).
 * Simplified: two horizontal bars with inline ratio + status.
 * DOM WRITE: gen-g2g3-* and gen-g6g7-* elements
 */
export function renderGeneratorBalance() {
    const gens = scienceData?.generators || null;
    renderOneGenerator("g2g3", gens?.g2_g3, 3, 5);
    renderOneGenerator("g6g7", gens?.g6_g7, 0.8, 1.2);
}

/**
 * Render a single generator balance bar.
 * @param {string} prefix — element id prefix ("g2g3" or "g6g7")
 * @param {Object|null} data — { ratio } from scienceData
 * @param {number} targetLow — lower bound of nominal range
 * @param {number} targetHigh — upper bound of nominal range
 */
function renderOneGenerator(prefix, data, targetLow, targetHigh) {
    const leftEl = document.getElementById(`gen-${prefix}-left`);
    const rightEl = document.getElementById(`gen-${prefix}-right`);
    const ratioEl = document.getElementById(`gen-${prefix}-ratio`);
    const statusEl = document.getElementById(`gen-${prefix}-status`);
    if (!leftEl) return;

    if (!data) {
        leftEl.style.width = "50%";
        rightEl.style.width = "50%";
        ratioEl.textContent = "--";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "gen-balance-status gen-status-nominal";
        return;
    }

    const ratio = data.ratio ?? 1;
    const total = ratio + 1;
    const leftPct = (ratio / total) * 100;
    const rightPct = 100 - leftPct;

    const deviation = ratio < targetLow
        ? (targetLow - ratio) / targetLow
        : ratio > targetHigh
            ? (ratio - targetHigh) / targetHigh
            : 0;

    const withinTarget = deviation === 0;
    const drifting = !withinTarget && deviation < 0.5;

    const color = withinTarget ? "#6aab8e" : drifting ? "#d4944a" : "#c47070";
    const statusText = withinTarget ? "NOMINAL" : drifting ? "DRIFTING" : "IMBALANCED";
    const statusClass = withinTarget ? "gen-status-nominal" : drifting ? "gen-status-drift" : "gen-status-imbalanced";

    leftEl.style.width = `${leftPct}%`;
    leftEl.style.background = color;
    rightEl.style.width = `${rightPct}%`;
    rightEl.style.background = color;
    ratioEl.textContent = `${ratio.toFixed(1)} : 1`;
    statusEl.textContent = statusText;
    statusEl.className = `gen-balance-status ${statusClass}`;
}

// ── Render: Epistemic Health ───────────────────────────────────

/**
 * Render epistemic health widget from aggregated KB data.
 * DOM WRITE: #epi-debt-score, #epi-flag-count, #epi-claim-rate
 */
export function renderEpistemicHealth() {
    const debtEl = document.getElementById("epi-debt-score");
    const flagEl = document.getElementById("epi-flag-count");
    const claimEl = document.getElementById("epi-claim-rate");
    if (!debtEl) return;

    let totalDebt = 0;
    let totalFlags = 0;
    let totalClaims = 0;
    let verifiedClaims = 0;
    let agentCount = 0;

    for (const agentId of Object.keys(kbCache)) {
        const kb = kbCache[agentId];
        if (!kb) continue;
        agentCount++;

        // Epistemic debt from kb.epistemic_debt or computed from flags
        if (kb.epistemic_debt != null) {
            totalDebt += kb.epistemic_debt;
        }

        // Flags: count unresolved
        const flags = kb.epistemic_flags || kb.flags || [];
        if (Array.isArray(flags)) {
            totalFlags += flags.filter(f => !f.resolved).length;
        } else if (typeof flags === "number") {
            totalFlags += flags;
        }

        // Claims verification
        const claims = kb.claims || [];
        if (Array.isArray(claims)) {
            totalClaims += claims.length;
            verifiedClaims += claims.filter(c => c.verified || c.status === "verified").length;
        }
    }

    const avgDebt = agentCount > 0 ? (totalDebt / agentCount) : 0;
    const verifyRate = totalClaims > 0 ? ((verifiedClaims / totalClaims) * 100) : 0;

    debtEl.textContent = agentCount > 0 ? avgDebt.toFixed(1) : "--";
    debtEl.className = `epistemic-val ${avgDebt > 5 ? "epi-warn" : "epi-ok"}`;

    flagEl.textContent = agentCount > 0 ? `${totalFlags}` : "--";
    flagEl.className = `epistemic-val ${totalFlags > 3 ? "epi-warn" : "epi-ok"}`;

    claimEl.textContent = agentCount > 0 ? `${verifyRate.toFixed(0)}%` : "--";
    claimEl.className = `epistemic-val ${verifyRate < 50 ? "epi-warn" : "epi-ok"}`;
}

// ── Render: Shared Mental Models ───────────────────────────────

/**
 * Render shared mental models widget from health + KB data.
 * DOM WRITE: #smm-schema-parity, #smm-vocabulary, #smm-sessions
 */
export function renderSharedMentalModels() {
    const parityEl = document.getElementById("smm-schema-parity");
    const vocabEl = document.getElementById("smm-vocabulary");
    const sessionsEl = document.getElementById("smm-sessions");
    if (!parityEl) return;

    // Schema version parity — collect versions from health endpoints
    const versions = [];
    for (const agentId of Object.keys(healthCache)) {
        const health = healthCache[agentId];
        if (!health) continue;
        const version = health.schema_version || health.version || health.transport_version;
        if (version) versions.push(version);
    }

    if (versions.length > 0) {
        const allSame = versions.every(v => v === versions[0]);
        parityEl.textContent = allSame ? `${versions[0]} (aligned)` : `${new Set(versions).size} variants`;
        parityEl.className = `shared-models-val ${allSame ? "smm-aligned" : "smm-divergent"}`;
    } else {
        parityEl.textContent = "--";
        parityEl.className = "shared-models-val";
    }

    // Vocabulary agreement — count shared dictionary terms across agents
    let sharedTermCount = 0;
    const allTermSets = [];
    for (const agentId of Object.keys(kbCache)) {
        const kb = kbCache[agentId];
        if (!kb) continue;
        const terms = kb.dictionary || kb.vocabulary || [];
        if (Array.isArray(terms)) {
            allTermSets.push(new Set(terms.map(t => typeof t === "string" ? t : t.term || t.name)));
        }
    }
    if (allTermSets.length >= 2) {
        const intersection = [...allTermSets[0]].filter(t => allTermSets.every(s => s.has(t)));
        sharedTermCount = intersection.length;
        vocabEl.textContent = `${sharedTermCount} shared`;
        vocabEl.className = "shared-models-val smm-aligned";
    } else {
        vocabEl.textContent = allTermSets.length === 1 ? `${allTermSets[0].size} terms` : "--";
        vocabEl.className = "shared-models-val";
    }

    // Active sessions across mesh
    let totalSessions = 0;
    for (const agentId of Object.keys(kbCache)) {
        const kb = kbCache[agentId];
        if (!kb) continue;
        const sessions = kb.active_sessions || kb.sessions;
        if (typeof sessions === "number") {
            totalSessions += sessions;
        } else if (Array.isArray(sessions)) {
            totalSessions += sessions.length;
        }
    }
    sessionsEl.textContent = totalSessions > 0 ? `${totalSessions}` : "--";
}

// ── Render: Organism Narrative ─────────────────────────────────

/**
 * Render template-based organism narrative sentences.
 * DOM WRITE: #narrative-text
 * @param {Array} AGENTS — agent config array
 */
export function renderOrganismNarrative(AGENTS) {
    const textEl = document.getElementById("narrative-text");
    if (!textEl) return;

    const org = scienceData?.organism || null;
    if (!org) {
        textEl.textContent = "Awaiting organism data...";
        return;
    }

    const stateLabel = org.state_label || "UNKNOWN";

    // Count healthy agents from health cache
    let healthyCount = 0;
    let totalAgents = AGENTS.length;
    for (const agent of AGENTS) {
        const health = healthCache[agent.id];
        if (health && (health.status === "ok" || health.status === "healthy" || health.healthy === true)) {
            healthyCount++;
        }
    }

    // Generator status
    const gens = scienceData?.generators || null;
    let genStatus = "awaiting data";
    if (gens) {
        const g2g3Ratio = gens.g2_g3?.ratio ?? 1;
        const g6g7Ratio = gens.g6_g7?.ratio ?? 1;
        const g2g3Ok = g2g3Ratio >= 3 && g2g3Ratio <= 5;
        const g6g7Ok = g6g7Ratio >= 0.8 && g6g7Ratio <= 1.2;
        genStatus = (g2g3Ok && g6g7Ok) ? "nominal" : "drifting";
    }

    // Epistemic debt level
    let debtLevel = "unknown";
    const debtEl = document.getElementById("epi-debt-score");
    if (debtEl && debtEl.textContent !== "--") {
        const debtVal = parseFloat(debtEl.textContent);
        debtLevel = debtVal <= 2 ? "low" : debtVal <= 5 ? "moderate" : "high";
    }

    const sentences = [
        `The mesh operates in ${stateLabel} state.`,
        `${healthyCount}/${totalAgents} agents report healthy.`,
        `Generator balance: ${genStatus}.`,
        `Epistemic debt: ${debtLevel}.`,
    ];

    textEl.textContent = sentences.join(" ");
}

// ── Render: Combined Science ───────────────────────────────────

/**
 * Render all Science station widgets.
 * @param {Array} AGENTS — agent config array
 */
export function renderScience(AGENTS) {
    renderMSDSchematic(AGENTS);
    renderGeneratorBalance();
    renderEpistemicHealth();
    renderSharedMentalModels();
    renderOrganismNarrative(AGENTS);
}

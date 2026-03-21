// ═══ AUTH + CARDS ════════════════════════════════════════════
let agentCards = {};

async function fetchAgentCards() {
    // Same-origin: local agent card + mesh agents list
    try {
        const resp = await fetch("/.well-known/agent-card.json", { signal: AbortSignal.timeout(5000) });
        if (resp.ok) { const card = await resp.json(); agentCards[card.name || "mesh"] = card; }
    } catch {}
    try {
        const resp = await fetch("/.well-known/agents", { signal: AbortSignal.timeout(5000) });
        if (resp.ok) { const list = await resp.json(); if (Array.isArray(list)) list.forEach(a => { if (a.name) agentCards[a.name] = a; }); }
    } catch {}
    // Update LCARS header with protocol + psychology extension versions
    const firstCard = Object.values(agentCards)[0];
    if (firstCard) {
        const hdrProto = document.getElementById("lcars-hdr-proto");
        if (hdrProto) {
            const version = firstCard.protocolVersion || firstCard.version || "1.0.0";
            hdrProto.textContent = `A2A/${version}`;
        }
        const hdrPsych = document.getElementById("lcars-hdr-psych");
        if (hdrPsych) {
            // Extensions live at card.extensions (A2A standard) or card.capabilities.extensions (ops format)
            const exts = firstCard.extensions || firstCard.capabilities?.extensions || [];
            const psychExt = exts.find(e => e.uri && e.uri.includes("psychology"));
            if (psychExt) {
                // Extract version from URI (a2a-psychology/v0.0.2) or version field
                const uriVer = psychExt.uri.match(/v?(\d+\.\d+\.\d+)/)?.[1];
                const psychVer = psychExt.version || uriVer || "0.0.2";
                hdrPsych.textContent = `A2A-PSYCH/${psychVer}`;
            }
        }
    }
}

// ── Auth & Control Surfaces ────────────────────────────────────

let authUser = null;

async function checkAuth() {
    try {
        const resp = await fetch("/api/whoami", { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
            authUser = await resp.json();
            // Show control surfaces for authenticated operators
            if (authUser?.role === "operator" || authUser?.authenticated) {
                document.querySelectorAll(".lcars-controls-strip").forEach(el => {
                    el.style.display = "flex";
                });
            }
        }
    } catch (e) {
        authUser = null;
    }
}

// ── Operations Subsystem Switcher ──────────────────────────

// ═══ LCARS CHROME ═══════════════════════════════════════════
function switchOpsSubsystem(subsys) {
    document.querySelectorAll("#pane-operations .ops-panel-btn").forEach(b =>
        b.classList.toggle("ops-panel-active", b.dataset.subsys === subsys));
    document.querySelectorAll(".ops-panel").forEach(p =>
        p.classList.toggle("ops-panel-active", p.id === `ops-${subsys}`));
    // Persist to URL
    const url = new URL(location);
    url.searchParams.set("sub", subsys);
    history.replaceState(null, "", url);
}
window.switchOpsSubsystem = switchOpsSubsystem;

async function meshControl(action) {
    // Model tier selection — client-side only (visual feedback), actual change requires meshctl
    if (action.startsWith("model-")) {
        const model = action.replace("model-", "");
        document.querySelectorAll("#btn-haiku,#btn-sonnet,#btn-opus").forEach(b => b.classList.remove("lcars-pill-active"));
        const btn = document.getElementById(`btn-${model}`);
        if (btn) btn.classList.add("lcars-pill-active");
        addNarrativeEntry(`Model tier selected: ${model.toUpperCase()} — apply via meshctl on deployment host`);
        return;
    }

    // Reserve toggle — visual feedback
    if (action === "reserve-unlock" || action === "reserve-lock") {
        addNarrativeEntry(`Reserve ${action === "reserve-unlock" ? "UNLOCKED" : "LOCKED"} — apply via: ${action === "reserve-unlock" ? "touch" : "rm"} /tmp/mesh-reserve-unlock`);
        return;
    }

    // Auth-gated controls
    const actions = {
        "pause-all": { note: "Mesh paused — deliberations blocked until resume" },
        "resume-all": { note: "Mesh resumed — deliberations unblocked" },
    };
    const cfg = actions[action];
    if (!cfg) return;

    addNarrativeEntry(`Control: ${action} — command acknowledged`);
    addNarrativeEntry(`  Apply via meshctl: meshctl ${action.replace("-all", "").replace("-", " ")}`);
    addNarrativeEntry(`  ${cfg.note}`);

    // Trigger a client-side refresh to show updated state
    refreshAll();
}

// ── LCARS Detail Panel ─────────────────────────────────────────

function openLcarsDetail(title, color, contentHtml) {
    const panel = document.getElementById("lcars-detail-panel");
    const header = document.getElementById("lcars-detail-header");
    const body = document.getElementById("lcars-detail-body");
    const footer = document.getElementById("lcars-detail-close");
    if (!panel) return;
    header.textContent = title;
    header.style.background = color;
    footer.style.background = color;
    body.innerHTML = contentHtml;
    panel.classList.add("open");
    // Close on ESC
    const handler = (e) => { if (e.key === "Escape") { closeLcarsDetail(); document.removeEventListener("keydown", handler); } };
    document.addEventListener("keydown", handler);
}

function closeLcarsDetail() {
    const panel = document.getElementById("lcars-detail-panel");
    if (panel) panel.classList.remove("open");
}

// ── LCARS Narrative Drawer ───────────────────────────────────
let narrativeEntries = [];

function toggleNarrativeDrawer() {
    const drawer = document.getElementById("lcars-narrative-drawer");
    if (drawer) drawer.classList.toggle("open");
}

function addNarrativeEntry(text) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    narrativeEntries.unshift({ time, text });
    if (narrativeEntries.length > 50) narrativeEntries.pop();
    renderNarrativeLog();
}

function renderNarrativeLog() {
    const log = document.getElementById("lcars-narrative-log");
    if (!log) return;
    log.innerHTML = narrativeEntries.map(e =>
        `<div class="lcars-narrative-entry"><span class="lcars-narrative-time">${e.time}</span>${e.text}</div>`
    ).join("");
}

function generateMeshNarrative() {
    const agents = Object.values(agentData);
    const online = agents.filter(a => a?.status === "online").length;
    const total = AGENTS.length;
    const parts = [];
    if (online === total) parts.push("The mesh operates in nominal condition");
    else if (online === 0) parts.push("No agents responding — mesh connectivity interrupted");
    else parts.push(`${online} of ${total} agents responding`);
    parts.push(`${online} agents online`);
    return parts.join(". ") + ".";
}

// ── LCARS Vertical Gauge Helper ──────────────────────────────

function renderVlevelGauge(value, maxBlocks, options = {}) {
    const { inverted = false, labels = null } = options;
    const level = Math.max(0, Math.min(maxBlocks, Math.round(value * maxBlocks)));
    let html = '<div class="lcars-vlevel-gauge">';
    for (let i = 1; i <= maxBlocks; i++) {
        const isLit = i <= level;
        const isCurrent = i === level;
        let zone;
        const pct = i / maxBlocks;
        if (inverted) {
            zone = pct <= 0.4 ? "zone-low" : pct <= 0.7 ? "zone-mid" : "zone-high";
        } else {
            zone = pct <= 0.3 ? "zone-low" : pct <= 0.7 ? "zone-mid" : "zone-high";
        }
        const classes = ["vlevel-block"];
        if (isLit) classes.push("lit", zone);
        if (isCurrent) classes.push("current", zone);
        const label = labels ? labels[i - 1] : i;
        html += `<div class="${classes.join(" ")}">${label}</div>`;
    }
    html += '</div>';
    return html;
}

// ── LCARS Chrome Data ──────────────────────────────────────────
let lcarsStardateTimer = null;

function formatStardate(date) {
    const year = date.getFullYear();
    const start = new Date(year, 0, 0);
    const dayOfYear = Math.floor((date - start) / 86400000);
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `SD ${year}.${String(dayOfYear).padStart(3, '0')}.${hours}${mins}`;
}

const _hdrPrev = {};
let _hdrFirstRender = true;
function flashIfChanged(el, newText) {
    if (!el) return;
    const prev = _hdrPrev[el.id];
    el.textContent = newText;
    if (_hdrFirstRender || (prev !== undefined && prev !== newText)) {
        el.classList.remove("hdr-changed");
        void el.offsetWidth; // Force reflow to restart animation
        el.classList.add("hdr-changed");
    }
    _hdrPrev[el.id] = newText;
}

function updateLcarsHeaderData() {
    const ftrStatus = document.getElementById("lcars-ftr-status");

    const agents = Object.values(agentData);
    const online = agents.filter(a => a && a.online !== false).length;
    const total = AGENTS.length;
    const agentsText = `${online} Agents Online`;
    const totalMsgs = agents.reduce((sum, a) => sum + (a?.messages?.total || 0), 0);
    const msgsText = `${totalMsgs} Messages`;
    const allHealthy = online === total && agents.every(a => !a || a.health !== "critical");
    const healthText = allHealthy ? "\u25CF Nominal" : "\u25CF Degraded";
    const healthBg = allHealthy ? "var(--c-knowledge, #9999ff)" : "var(--c-alert, #cc6666)";

    // Update always-visible pills
    const hdrHealth = document.getElementById("lcars-hdr-health");
    flashIfChanged(hdrHealth, healthText);
    if (hdrHealth) hdrHealth.style.background = healthBg;

    // Update accordion tray pills (agents + messages live in tray)
    const trayAgents = document.getElementById("lcars-tray-agents");
    const trayMsgs = document.getElementById("lcars-tray-msgs");
    if (trayAgents) trayAgents.textContent = agentsText;
    if (trayMsgs) trayMsgs.textContent = msgsText;

    // Flash the stardate cell when data changes (tray always has content)
    const sdCell = document.getElementById("lcars-hdr-stardate");
    if (sdCell) {
        const newHash = agentsText + msgsText + healthText;
        if (_hdrFirstRender) {
            sdCell.classList.add("hdr-attract");
            const toggle = document.getElementById("stardate-tray-toggle");
            if (toggle) {
                toggle.addEventListener("change", () => {
                    sdCell.classList.remove("hdr-attract");
                }, { once: true });
            }
        } else if (_hdrPrev["_tray_hash"] !== newHash) {
            sdCell.classList.remove("hdr-changed");
            void sdCell.offsetWidth;
            sdCell.classList.add("hdr-changed");
        }
        _hdrPrev["_tray_hash"] = newHash;
    }

    if (ftrStatus) ftrStatus.textContent = allHealthy
        ? "Mesh Status: Nominal"
        : `Mesh Status: ${online}/${total} Agents`;
    _hdrFirstRender = false;
}

function startLcarsStardate() {
    if (lcarsStardateTimer) return;
    const cell = document.getElementById("lcars-hdr-stardate");
    if (!cell) return;
    // Update the label text, not the cell — preserve checkbox + tray structure
    const label = cell.querySelector(".stardate-tray-label");
    const target = label || cell;
    function tick() { target.textContent = formatStardate(new Date()); }
    tick();
    lcarsStardateTimer = setInterval(tick, 1000);
}

function stopLcarsStardate() {
    if (lcarsStardateTimer) { clearInterval(lcarsStardateTimer); lcarsStardateTimer = null; }
}

// ── Theme ──────────────────────────────────────────────────────
function setTheme(mode) {
    // 'system' follows OS preference
    if (mode === "system") {
        mode = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
        localStorage.removeItem("theme"); // clear override, follow system
    }
    document.body.classList.remove("theme-light", "theme-lcars");
    if (mode === "light") document.body.classList.add("theme-light");
    if (mode === "lcars") document.body.classList.add("theme-lcars");
    document.getElementById("btn-dark").classList.toggle("active", mode === "dark");
    document.getElementById("btn-light").classList.toggle("active", mode === "light");
    document.getElementById("btn-lcars").classList.toggle("active", mode === "lcars");
    localStorage.setItem("theme", mode);

    // LCARS mode: start stardate clock, switch to bridge station, update header data
    if (mode === "lcars") {
        startLcarsStardate();
        // Switch to bridge station: prefer URL hash, then current tab, then Operations
        const bridgeTabs = ["operations", "science", "engineering", "helm", "tactical", "medical"];
        const hashTab = location.hash.replace("#", "");
        const currentTab = document.querySelector('.lcars-tab.active')?.dataset?.tab;
        if (hashTab && bridgeTabs.includes(hashTab)) {
            switchTab(hashTab, false);
        } else if (!bridgeTabs.includes(currentTab)) {
            switchTab("operations");
        }
        updateLcarsHeaderData();
        // Render SVG L-shape frame + listen for resize
        renderLcarsFrameSVG();
        window.addEventListener("resize", scheduleFrameSVG);
        // Sync sidebar active state
        const activeTab = document.querySelector('.lcars-tab.active');
        if (activeTab) {
            document.querySelectorAll(".lcars-sidebar-btn").forEach(b =>
                b.classList.toggle("active", b.dataset.tab === activeTab.dataset.tab)
            );
        }
    } else {
        stopLcarsStardate();
        window.removeEventListener("resize", scheduleFrameSVG);
        // If leaving LCARS mode while on a LCARS-only tab, switch to Pulse
        const activeTab = document.querySelector('.lcars-tab.active');
        if (activeTab && activeTab.classList.contains('lcars-only')) {
            switchTab('pulse');
        }
    }
}

// ── Tabs ───────────────────────────────────────────────────────

// ═══ TABS + NAV ═════════════════════════════════════════════
const VALID_TABS = ["pulse", "meta", "kb", "wisdom", "operations", "science", "engineering", "helm", "tactical", "medical"];

// ── LCARS Spine Content Tracking ─────────────────────────────
// Each tab maps to a set of spine segments reflecting its content sections.
const SPINE_CONFIG = {
    pulse: [
        { label: "Transport", color: "var(--c-transport)", flex: 2 },
        { label: "Health",    color: "var(--c-tab-pulse)", flex: 3 },
        { label: "Topology",  color: "var(--c-epistemic)", flex: 1 },
    ],
    meta: [
        { label: "Messages",  color: "var(--c-transport)", flex: 3 },
        { label: "Memory",    color: "var(--c-tab-pulse)", flex: 2 },
        { label: "Debt",      color: "var(--c-alert)",     flex: 1 },
        { label: "Decisions", color: "var(--c-tab-meta)",  flex: 3 },
        { label: "Triggers",  color: "var(--c-epistemic)", flex: 2 },
    ],
    kb: [
        { label: "Claims",     color: "var(--c-tab-kb)",    flex: 4 },
        { label: "Chains",     color: "var(--c-epistemic)", flex: 2 },
        { label: "Facts",      color: "var(--c-tab-pulse)", flex: 2 },
        { label: "Vocabulary", color: "var(--c-catalog)",   flex: 1 },
        { label: "Catalog",    color: "var(--c-transport)", flex: 1 },
    ],
    wisdom: [
        { label: "Lessons",    color: "var(--c-tab-wisdom)", flex: 4 },
        { label: "Graduated",  color: "var(--c-tab-pulse)", flex: 2 },
    ],
    operations: [
        { label: "Budget",    color: "var(--c-tab-ops)",   flex: 2 },
        { label: "Actions",   color: "var(--c-health)",    flex: 3 },
        { label: "Schedule",  color: "var(--c-epistemic)", flex: 1 },
    ],
    science: [
        { label: "Affect",     color: "var(--c-tab-science)", flex: 2 },
        { label: "Mesh",       color: "var(--c-epistemic)",   flex: 2 },
        { label: "Generators", color: "var(--c-health)",      flex: 2 },
        { label: "Flow",       color: "var(--c-tab-science)", flex: 1 },
        { label: "DEW",        color: "var(--c-alert)",       flex: 1 },
        { label: "Control",    color: "var(--c-transport)",   flex: 1 },
    ],
    engineering: [
        { label: "Deliberation", color: "var(--c-tab-engineering)", flex: 2 },
        { label: "Utilization", color: "var(--c-health)",          flex: 2 },
        { label: "Tempo",       color: "var(--c-tab-engineering)", flex: 2 },
        { label: "Cost",        color: "var(--c-warning)",         flex: 1 },
        { label: "Concurrency", color: "var(--c-transport)",       flex: 1 },
    ],
    helm: [
        { label: "Sessions", color: "var(--c-tab-helm)",    flex: 3 },
        { label: "Routing",  color: "var(--c-tab-helm)",    flex: 2 },
        { label: "Flow",     color: "var(--c-transport)",   flex: 2 },
    ],
    tactical: [
        { label: "Shields",    color: "var(--c-tab-tactical)", flex: 2 },
        { label: "Compliance", color: "var(--c-warning)",      flex: 2 },
        { label: "Transport",  color: "var(--c-transport)",    flex: 2 },
        { label: "Threats",    color: "var(--c-alert)",        flex: 2 },
    ],
};

function updateSpine(tabId) {
    const spine = document.getElementById("lcars-spine");
    if (!spine) return;
    const segments = SPINE_CONFIG[tabId] || SPINE_CONFIG.pulse;
    spine.innerHTML = segments.map((seg, i) => {
        const radius = i === 0 ? "border-radius: var(--elbow-radius) 0 0 0;"
                     : i === segments.length - 1 ? "border-radius: 0 0 0 var(--elbow-radius);"
                     : "";
        return `<div class="lcars-spine-segment" title="${seg.label}" style="background:${seg.color};flex:${seg.flex};${radius}"></div>`;
    }).join("");
}

const TAB_COLORS = { pulse: "--c-tab-pulse", meta: "--c-tab-meta", kb: "--c-tab-kb", wisdom: "--c-tab-wisdom", operations: "--c-tab-ops", science: "--c-tab-science", tactical: "--c-tab-tactical", engineering: "--c-tab-engineering", helm: "--c-tab-helm", medical: "--c-tab-medical" };

function switchTab(tabId, updateHash = true) {
    if (tabId === "knowledge") tabId = "meta"; // backward compat
    if (!VALID_TABS.includes(tabId)) tabId = "pulse";
    // Standard tabs
    document.querySelectorAll(".lcars-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
    // LCARS sidebar buttons
    document.querySelectorAll(".lcars-sidebar-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
    // Pane visibility — reset all inline display overrides, let CSS .active handle it
    document.querySelectorAll(".tab-pane").forEach(p => {
        p.classList.toggle("active", p.id === `pane-${tabId}`);
        p.style.display = "";  // clear any inline display override
    });
    // Update header band + title color to match active tab
    const colorVar = TAB_COLORS[tabId] || "--c-tab-pulse";
    // Resolve the actual computed color (theme-lcars overrides live on body, not :root)
    const computed = getComputedStyle(document.body).getPropertyValue(colorVar).trim();
    document.documentElement.style.setProperty("--active-tab-color", computed || `var(${colorVar})`);
    updateSpine(tabId);
    if (tabId === "operations") refreshAll();
    if (tabId === "science") fetchScienceData();
    if (tabId === "engineering") { fetchEngineeringData(); startWaveformAnimation(); }
    else if (tabId === "medical") { fetchMedicalData(); startWaveformAnimation(); }
    else { stopWaveformAnimation(); }
    if (tabId === "helm") fetchHelmData();
    if (tabId === "tactical") fetchTacticalData();
    if (updateHash) history.replaceState(null, "", `#${tabId}`);
}

window.addEventListener("hashchange", () => {
    const tab = location.hash.replace("#", "") || "pulse";
    switchTab(tab, false);
});

function switchAgent(agentId) {
    activeAgentFilter = agentId;
    document.querySelectorAll(".agent-switch-btn").forEach(btn =>
        btn.classList.toggle("active", btn.dataset.agent === agentId)
    );
    // Reset all table pages and re-render
    for (const key of Object.keys(tableState)) {
        tableState[key].page = 0;
    }
    renderKBVitals();
    renderDecisions();
    renderTriggers();
    renderCatalog();
    renderSchema();
    renderMemoryTopics();
    renderEpistemicDebt();
    renderDictionaryFiltered(document.getElementById("filter-dictionary")?.value || "");
    renderMessages();
    renderKBTabVitals();
    renderClaims();
    renderChains();
    renderFacts();
    renderDictionary();
    renderCatalog();
    renderSchema();
    renderLessons();
    renderOperations();
}

function buildAgentSwitcher() {
    let html = '<button class="agent-switch-btn active" data-agent="all" onclick="switchAgent(\'all\')">All</button>';
    for (const agent of AGENTS) {
        const label = agentName(agent);
        html += `<button class="agent-switch-btn" data-agent="${agent.id}" onclick="switchAgent('${agent.id}')" style="--dot-color:${agent.color}">${label}</button>`;
    }
    for (const id of ["agent-switcher", "kb-agent-switcher", "wisdom-agent-switcher"]) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }
}

// ── Data Fetching ──────────────────────────────────────────────


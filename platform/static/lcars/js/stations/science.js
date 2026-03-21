// ═══ RENDER: SCIENCE ════════════════════════════════════════
let scienceData = null;
let scienceFetchPending = false;
let _vocabData = null;

// ── Science Subsystem Switcher ──────────────────────────────
function switchSciSubsystem(subsys, updateUrl = true) {
    document.querySelectorAll(".sci-panel").forEach(p => {
        p.style.display = p.id === "sci-" + subsys ? "" : "none";
        p.classList.toggle("sci-panel-active", p.id === "sci-" + subsys);
    });
    document.querySelectorAll("#pane-science .ops-panel-btn").forEach(b => {
        b.classList.toggle("ops-panel-active", b.dataset.subsys === subsys);
    });
    const title = document.getElementById("science-zone-c-title");
    if (title) {
        const titles = { psychometrics: "Psychometric Analysis", linguistics: "Computational Linguistics", ontology: "Ontological Classification" };
        title.textContent = titles[subsys] || "Science";
    }
    if (subsys === "linguistics") fetchLinguisticsData().then(restoreTermFromUrl);
    if (subsys === "ontology") fetchOntologyData();
    // Persist to URL
    if (updateUrl) {
        const url = new URL(location);
        url.searchParams.set("sub", subsys);
        history.replaceState(null, "", url);
    }
}
window.switchSciSubsystem = switchSciSubsystem;

// Show inline definition for a vocab term
window.showTermDefinition = function(index) {
    const terms = window._vocabTerms || [];
    const t = terms[index];
    if (!t) return;
    const detail = document.getElementById("ling-term-detail");
    if (!detail) return;

    const name = t.name || t.term || "?";
    const desc = t.description || "No definition available.";
    const code = t.termCode || t["@id"] || "";
    const status = t.status || "active";
    const statusColor = status === "deprecated" ? "var(--text-dim)" : "var(--lcars-medical)";

    // Toggle — click same term closes
    if (detail.style.display !== "none" && detail.dataset.active === String(index)) {
        detail.style.display = "none";
        detail.dataset.active = "";
        // Update URL — remove term param
        const url = new URL(location);
        url.searchParams.delete("term");
        history.replaceState(null, "", url);
        return;
    }

    detail.dataset.active = String(index);
    detail.style.display = "block";
    detail.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--gap-s)">
            <span style="color:var(--lcars-secondary);font-weight:700;font-size:1.1em">${name}</span>
            <span style="color:${statusColor};font-size:0.8em;text-transform:uppercase">${status}</span>
        </div>
        <div style="color:var(--text-primary);line-height:1.5;margin-bottom:var(--gap-s)">${desc}</div>
        ${code ? `<div style="color:var(--text-dim);font-size:0.75em;font-family:monospace">${code}</div>` : ""}
    `;

    // Scroll into view
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Deep-link: persist term in URL
    const url = new URL(location);
    url.searchParams.set("term", name.toLowerCase().replace(/\s+/g, "-"));
    history.replaceState(null, "", url);
};

// Restore term selection from URL on Linguistics load
function restoreTermFromUrl() {
    const termSlug = new URLSearchParams(location.search).get("term");
    if (!termSlug || !window._vocabTerms) return;
    const idx = window._vocabTerms.findIndex(t => {
        const name = (t.name || "").toLowerCase().replace(/\s+/g, "-");
        return name === termSlug;
    });
    if (idx >= 0) window.showTermDefinition(idx);
}

let _eprimeData = null;

async function fetchLinguisticsData() {
    // Fetch vocab + E-Prime log + agent vocabs for divergence
    const fetches = [
        !_vocabData ? fetch("/vocab", { signal: AbortSignal.timeout(5000) }) : Promise.resolve(null),
        fetch("/api/eprime", { signal: AbortSignal.timeout(3000) }),
    ];
    // Fetch vocab from each agent for divergence check
    const agentVocabFetches = AGENTS.filter(a => a.url).map(a =>
        fetch(a.url + "/vocab", { signal: AbortSignal.timeout(3000) }).then(r => r.ok ? r.json().then(d => ({ id: a.id, terms: d.hasDefinedTerm || [] })) : null).catch(() => null)
    );
    const [vocabResp, eprimeResp, ...agentVocabs] = await Promise.allSettled([...fetches, ...agentVocabFetches]);
    if (!_vocabData && vocabResp.status === "fulfilled" && vocabResp.value?.ok) {
        _vocabData = await vocabResp.value.json();
    }
    if (eprimeResp.status === "fulfilled" && eprimeResp.value?.ok) {
        _eprimeData = await eprimeResp.value.json();
    }
    // Collect agent vocabs for divergence
    window._agentVocabs = agentVocabs.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
    renderLinguistics();
}

function renderLinguistics() {
    // Vocabulary uses JSON-LD: hasDefinedTerm[] with name, description, status, termCode
    const vocabEl = document.getElementById("ling-vocabulary");
    if (vocabEl && _vocabData) {
        const termList = (_vocabData.hasDefinedTerm || _vocabData.terms || _vocabData["@graph"] || [])
            .slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        const active = termList.filter(t => t.status !== "deprecated").length;
        const deprecated = termList.length - active;
        const version = _vocabData.version || _vocabData.name || "?";

        // Store terms globally for deep-link access
        window._vocabTerms = termList;

        // Zone-A pills (above panel headers)
        const zoneA = document.getElementById("ling-zone-a");
        if (zoneA) {
            renderNumberGrid("ling-zone-a", [
                { value: termList.length, label: "TERMS", type: "count" },
                { value: active, label: "ACTIVE", type: "id" },
                { value: deprecated, label: "DEPRECATED", type: "val" },
                { value: version, label: "VERSION", type: "t2" },
            ]);
        }

        // Table with definitions (same pattern as Mesh Vocabulary)
        vocabEl.innerHTML = `<div class="lcars-data-table-wrap" style="--panel-accent:var(--c-tab-science)">
            <table class="lcars-data-table">
                <thead><tr>
                    <th>Term</th><th>Code</th><th>Status</th><th>Definition</th>
                </tr></thead>
                <tbody>
                    ${termList.map(t => {
                        const statusColor = t.status === "deprecated" ? "var(--text-dim)" : "var(--lcars-medical)";
                        const name = t.name || t.term || t["@id"] || "?";
                        return `<tr>
                            <td style="color:var(--lcars-secondary);font-weight:600">${name}</td>
                            <td style="color:var(--text-dim);font-family:monospace;font-size:0.9em">${t.termCode || ""}</td>
                            <td style="color:${statusColor};text-transform:uppercase">${t.status || "active"}</td>
                            <td class="wrap" style="color:var(--text-primary)">${t.description || "—"}</td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
        </div>`;
    }

    // Terminology map — group by termCode prefix or inDefinedTermSet
    const termEl = document.getElementById("ling-terminology");
    if (termEl && _vocabData) {
        const termList = (_vocabData.hasDefinedTerm || _vocabData.terms || [])
            .slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        const domains = {};
        termList.forEach(t => {
            // Group by termCode prefix (e.g., "agent" from "agent-001") or "general"
            const code = t.termCode || "";
            const domain = code.split("-")[0] || t.inDefinedTermSet || "general";
            if (!domains[domain]) domains[domain] = [];
            domains[domain].push({ name: t.name || "?", desc: t.description || "", status: t.status || "active" });
        });

        termEl.innerHTML = Object.entries(domains).sort((a, b) => b[1].length - a[1].length).map(([domain, terms]) =>
            `<div style="margin-bottom:var(--gap-m)">
                <div style="color:var(--lcars-title);font-size:0.72em;text-transform:uppercase;margin-bottom:var(--gap-xs)">${domain} (${terms.length})</div>
                <div style="display:flex;flex-wrap:wrap;gap:var(--gap-xs)">
                    ${terms.map(t => {
                        const color = t.status === "deprecated" ? "var(--text-dim)" : "var(--lcars-secondary)";
                        return `<span style="background:var(--bg-inset);padding:2px 6px;border-radius:var(--gap-xs);font-size:0.72em;color:${color}" title="${t.desc.replace(/"/g, '&quot;')}">${t.name}</span>`;
                    }).join("")}
                </div>
            </div>`
        ).join("");
    }

    // E-Prime Violations panel
    const eprimeEl = document.getElementById("ling-eprime");
    if (eprimeEl) {
        if (_eprimeData && _eprimeData.total > 0) {
            const violations = _eprimeData.violations || [];
            eprimeEl.innerHTML = `
                <div style="display:flex;gap:var(--gap-l);margin-bottom:var(--gap-m);font-size:0.82em">
                    <div><span style="color:var(--lcars-title)">TOTAL</span> <strong style="color:var(--lcars-alert)">${_eprimeData.total}</strong></div>
                    <div><span style="color:var(--lcars-title)">ENTRIES</span> <strong>${_eprimeData.entries}</strong></div>
                </div>
                <div style="max-height:200px;overflow-y:auto;font-size:0.75em">
                    ${violations.slice(-10).reverse().map(e => {
                        const fname = (e.file || "?").split("/").pop();
                        const vs = (e.violations || []);
                        return `<div style="padding:3px 0;border-bottom:1px solid var(--border)">
                            <span style="color:var(--text-dim);font-size:0.9em">${e.timestamp ? e.timestamp.split("T")[0] : ""}</span>
                            <span style="color:var(--lcars-secondary);font-weight:600;margin-left:4px">${fname}</span>
                            <span style="color:var(--lcars-alert);margin-left:4px">${e.count} violation${e.count !== 1 ? "s" : ""}</span>
                            ${vs.slice(0, 2).map(v =>
                                `<div style="margin-left:16px;color:var(--text-dim)">L${v.line}: "<span style="color:var(--lcars-alert)">${v.word}</span>" — ${v.context}</div>`
                            ).join("")}
                        </div>`;
                    }).join("")}
                </div>`;
        } else {
            eprimeEl.innerHTML = '<div style="font-size:0.82em;padding:12px"><span style="color:var(--lcars-medical)">E-PRIME CLEAN</span> — no to-be violations detected. Hook active on *.md files.</div>';
        }
    }

    // Cross-Agent Terminology Divergence
    const divEl = document.getElementById("ling-divergence");
    if (divEl) {
        const agentVocabs = window._agentVocabs || [];
        if (agentVocabs.length > 1) {
            // Compare term sets across agents
            const allTermSets = agentVocabs.map(av => ({
                id: av.id,
                terms: new Set((av.terms || []).map(t => t.name || t.term || ""))
            }));
            const unionTerms = new Set();
            allTermSets.forEach(s => s.terms.forEach(t => unionTerms.add(t)));

            const divergences = [];
            for (const term of unionTerms) {
                const hasIt = allTermSets.filter(s => s.terms.has(term)).map(s => s.id);
                const missingIt = allTermSets.filter(s => !s.terms.has(term)).map(s => s.id);
                if (missingIt.length > 0 && hasIt.length > 0) {
                    divergences.push({ term, has: hasIt, missing: missingIt });
                }
            }

            if (divergences.length > 0) {
                divEl.innerHTML = `<div style="font-size:0.78em;max-height:200px;overflow-y:auto">
                    <div style="margin-bottom:var(--gap-s);color:var(--lcars-alert)">${divergences.length} term(s) differ across agents</div>
                    ${divergences.map(d =>
                        `<div style="padding:3px 0;border-bottom:1px solid var(--border)">
                            <span style="color:var(--lcars-secondary);font-weight:600">${d.term}</span>
                            <span style="color:var(--lcars-medical);margin-left:8px">${d.has.map(agentName).join(", ")}</span>
                            <span style="color:var(--lcars-alert);margin-left:8px">missing: ${d.missing.map(agentName).join(", ")}</span>
                        </div>`
                    ).join("")}
                </div>`;
            } else {
                divEl.innerHTML = `<div style="font-size:0.82em;padding:12px"><span style="color:var(--lcars-medical)">ALIGNED</span> — all ${agentVocabs.length} agents share identical vocabulary (${unionTerms.size} terms)</div>`;
            }
        } else {
            divEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">Need 2+ agents responding to compare terminology</div>';
        }
    }

    // Term Governance — extract proposals from transport messages
    const govEl = document.getElementById("ling-governance");
    if (govEl) {
        // Check KB for vocabulary-related transport messages
        const kbData = _ontologyData?.data || _ontologyData || {};
        const msgs = kbData.messages || [];
        const vocabMsgs = msgs.filter(m =>
            (m.session_name || "").includes("vocab") ||
            (m.subject || "").toLowerCase().includes("vocab") ||
            (m.subject || "").toLowerCase().includes("terminol") ||
            (m.subject || "").toLowerCase().includes("naming") ||
            (m.message_type || "") === "proposal"
        );

        if (vocabMsgs.length > 0) {
            govEl.innerHTML = `<div style="font-size:0.78em;max-height:200px;overflow-y:auto">
                <div style="margin-bottom:var(--gap-s);color:var(--lcars-title)">${vocabMsgs.length} governance action(s)</div>
                ${vocabMsgs.map(m =>
                    `<div style="padding:3px 0;border-bottom:1px solid var(--border)">
                        <span style="color:var(--lcars-accent);font-weight:600">${m.message_type || "msg"}</span>
                        <span style="color:var(--lcars-secondary);margin-left:4px">${m.session_name || ""}</span>
                        <span style="color:var(--text-primary);margin-left:8px">${(m.subject || "").slice(0, 60)}</span>
                        <span style="color:var(--text-dim);margin-left:8px;font-size:0.9em">${m.from_agent || ""} → ${m.to_agent || ""}</span>
                    </div>`
                ).join("")}
            </div>`;
        } else {
            govEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No vocabulary proposals or naming convention messages in transport history. Governance actions appear here when agents propose term changes.</div>';
        }
    }

    // Computational Linguistics Record — summary pills at bottom
    const lingRecord = document.getElementById("ling-record");
    if (lingRecord && _vocabData) {
        const termList = _vocabData.hasDefinedTerm || [];
        const eprimeTotal = _eprimeData?.total || 0;
        const agentCount = (window._agentVocabs || []).length;
        const divergences = (() => {
            const avs = window._agentVocabs || [];
            if (avs.length < 2) return 0;
            const union = new Set();
            const sets = avs.map(av => new Set((av.terms || []).map(t => t.name || "")));
            sets.forEach(s => s.forEach(t => union.add(t)));
            let count = 0;
            for (const t of union) {
                if (sets.some(s => !s.has(t))) count++;
            }
            return count;
        })();
        renderNumberGrid("ling-record", [
            { value: agentCount, label: "AGENTS", type: "id" },
            { value: divergences, label: "DIVERGE", type: divergences > 0 ? "count" : "val", alert: divergences > 0 },
            { gap: true },
            { value: eprimeTotal, label: "E-PRIME", type: eprimeTotal > 0 ? "count" : "val", alert: eprimeTotal > 10 },
            { value: eprimeTotal === 0 ? "CLEAN" : "DIRTY", label: "COMPLIANCE", type: eprimeTotal === 0 ? "id" : "count" },
        ]);
    }

    // Mesh Vocabulary panel — full searchable vocab (same data, different display)
    const meshVocabEl = document.getElementById("lcars-sci-vocab");
    if (meshVocabEl && _vocabData) {
        const termList = (_vocabData.hasDefinedTerm || [])
            .slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        meshVocabEl.innerHTML = `<div class="lcars-data-table-wrap" style="--panel-accent:var(--c-tab-science)">
            <table class="lcars-data-table">
                <thead><tr>
                    <th>Term</th><th>Code</th><th>Status</th><th>Definition</th>
                </tr></thead>
                <tbody>
                    ${termList.map(t => {
                        const statusColor = t.status === "deprecated" ? "var(--text-dim)" : "var(--lcars-medical)";
                        return `<tr style="border-bottom:1px solid var(--border)">
                            <td style="padding:3px 8px;color:var(--lcars-secondary);font-weight:600">${t.name || "?"}</td>
                            <td style="padding:3px 8px;color:var(--text-dim);font-family:monospace;font-size:0.9em">${t.termCode || ""}</td>
                            <td style="padding:3px 8px;color:${statusColor};text-transform:uppercase">${t.status || "active"}</td>
                            <td class="wrap" style="color:var(--text-primary)">${t.description || "—"}</td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
        </div>`;
    }
}

// ── Ontology Subsystem ──────────────────────────────────────
let _ontologyData = null;
let _facetsData = null;

async function fetchOntologyData() {
    // Fetch KB + facets in parallel (same-origin)
    const [kbResp, facetsResp] = await Promise.allSettled([
        _ontologyData ? Promise.resolve(null) : fetch("/api/kb", { signal: AbortSignal.timeout(8000) }),
        _facetsData ? Promise.resolve(null) : fetch("/api/facets", { signal: AbortSignal.timeout(5000) }),
    ]);
    if (!_ontologyData && kbResp.status === "fulfilled" && kbResp.value?.ok) {
        _ontologyData = await kbResp.value.json();
    }
    if (!_facetsData && facetsResp.status === "fulfilled" && facetsResp.value?.ok) {
        _facetsData = await facetsResp.value.json();
    }
    renderOntology();
}

function renderOntology() {
    const kb = _ontologyData?.data || _ontologyData || {};
    const facets = _facetsData || {};

    // Zone-A pills
    renderNumberGrid("onto-zone-a", [
        { value: facets.stats?.vocabulary_count || 0, label: "FACETS", type: "count" },
        { value: facets.stats?.universal_count || 0, label: "CLASSIFIED", type: "id" },
        { gap: true },
        { value: (kb.decisions || []).length, label: "DECISIONS", type: "count" },
        { value: (kb.claims || []).length, label: "CLAIMS", type: "val" },
    ]);

    // Discipline Catalog — from /api/facets vocabulary, grouped by facet_type
    const catEl = document.getElementById("lcars-sci-catalog");
    if (catEl) {
        const vocab = (_facetsData?.vocabulary || []).slice().sort((a, b) => (a.facet_value || "").localeCompare(b.facet_value || ""));
        if (vocab.length > 0) {
            const byType = {};
            vocab.forEach(v => {
                const t = v.facet_type || "other";
                if (!byType[t]) byType[t] = [];
                byType[t].push(v);
            });
            const typeLabels = { psh: "PSH Disciplines", acronym: "Acronyms", pje_domain: "PJE Domains", schema_type: "Schema Types" };
            catEl.innerHTML = `<div class="lcars-data-table-wrap" style="--panel-accent:var(--c-tab-science)">
                <table class="lcars-data-table">
                    <thead><tr><th>TYPE</th><th>TERM</th><th>CODE</th><th>DESCRIPTION</th></tr></thead>
                    <tbody>${Object.entries(byType).sort((a, b) => b[1].length - a[1].length).map(([type, items]) =>
                        items.slice(0, 20).map((v, i) =>
                            `<tr>
                                ${i === 0 ? `<td rowspan="${Math.min(20, items.length)}" style="color:var(--lcars-title);font-weight:600;vertical-align:top">${typeLabels[type] || type.toUpperCase()} (${items.length})</td>` : ""}
                                <td style="color:var(--lcars-secondary)">${v.facet_value || "?"}</td>
                                <td style="color:var(--text-dim);font-family:monospace;font-size:0.9em">${v.code || ""}</td>
                                <td class="wrap" style="color:var(--text-primary)">${v.description || ""}</td>
                            </tr>`
                        ).join("")
                    ).join("")}</tbody>
                </table>
            </div>`;
        } else {
            const stats = _facetsData?.stats || {};
            catEl.innerHTML = `<div style="color:var(--text-dim);font-size:0.82em;padding:12px">${stats.vocabulary_count ? stats.vocabulary_count + " terms in facet_vocabulary" : "No facet vocabulary data. Table may not exist in this agent's state.db."}</div>`;
        }
    }

    // Claims taxonomy — kb.claims[]
    const claimsEl = document.getElementById("onto-claims");
    if (claimsEl) {
        const claims = kb.claims || [];
        if (claims.length > 0) {
            const types = {};
            claims.forEach(c => {
                const t = c.claim_type || c.type || "general";
                types[t] = (types[t] || 0) + 1;
            });
            claimsEl.innerHTML = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([type, count]) =>
                `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.78em;border-bottom:1px solid var(--border)">
                    <span style="color:var(--lcars-secondary)">${type}</span>
                    <span style="color:var(--lcars-readout)">${count}</span>
                </div>`
            ).join("");
        } else {
            claimsEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No claims recorded. Claims track verified assertions across sessions.</div>';
        }
    }

    // Universal Facets — entity classifications from /api/facets
    const facetsEl = document.getElementById("onto-facets");
    if (facetsEl) {
        const universal = _facetsData?.universal_facets || [];
        if (universal.length > 0) {
            const byEntity = {};
            universal.forEach(f => {
                const key = f.entity_type + ":" + f.entity_id;
                if (!byEntity[key]) byEntity[key] = { type: f.entity_type, id: f.entity_id, facets: [] };
                byEntity[key].facets.push(f);
            });
            facetsEl.innerHTML = `<div style="max-height:250px;overflow-y:auto;font-size:0.78em">
                ${Object.values(byEntity).slice(0, 30).map(e =>
                    `<div style="padding:3px 0;border-bottom:1px solid var(--border)">
                        <span style="color:var(--lcars-title);font-size:0.9em">${e.type}</span>
                        <span style="color:var(--text-dim)">#${e.id}</span>
                        <span style="margin-left:8px">${e.facets.map(f =>
                            `<span style="background:var(--bg-inset);padding:1px 6px;border-radius:var(--gap-xs);margin:0 2px;color:var(--lcars-secondary)">${f.facet_value}</span>`
                        ).join("")}</span>
                    </div>`
                ).join("")}
            </div>`;
        } else {
            facetsEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No universal facet classifications. Run bootstrap_facets.py to classify entities.</div>';
        }
    }

    // Decisions — kb.decisions[] with decision_key, title, source, status
    const graphEl = document.getElementById("onto-graph");
    if (graphEl) {
        const decisions = kb.decisions || [];
        if (decisions.length > 0) {
            graphEl.innerHTML = `<div style="font-size:0.78em;max-height:250px;overflow-y:auto">
                ${decisions.map(d =>
                    `<div style="padding:4px 0;border-bottom:1px solid var(--border)">
                        <span style="color:var(--lcars-accent);font-weight:600">${d.decision_key || d.id || "?"}</span>
                        <span style="color:var(--text-primary);margin-left:8px">${d.title || d.decision_text || "—"}</span>
                        <span style="color:var(--text-dim);font-size:0.85em;margin-left:8px">${d.source || ""}</span>
                    </div>`
                ).join("")}
            </div>`;
        } else {
            graphEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No decisions recorded.</div>';
        }
    }
}

// ── agentd Session 95: Fleet Cognitive Panels ─────────────────
async function fetchFleetCognitive() {
    // Fetch photonic + traits from all agents in parallel
    const fetches = AGENTS.filter(a => a.url).map(a => Promise.allSettled([
        fetch(a.url + "/api/photonic", { signal: AbortSignal.timeout(2000) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(a.url + "/api/traits", { signal: AbortSignal.timeout(2000) }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([p, t]) => ({
        id: a.id, color: a.color,
        photonic: p.status === "fulfilled" ? p.value : null,
        traits: t.status === "fulfilled" ? t.value : null,
    })));
    const results = await Promise.all(fetches);
    renderPhotonicField(results);
    renderSpectralProfiles(results);
    renderFleetTraits(results);
}

function renderPhotonicField(agents) {
    const el = document.getElementById("sci-photonic-field");
    if (!el) return;
    const withData = agents.filter(a => a.photonic);
    if (withData.length === 0) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No photonic data from agents</div>'; return; }
    const avgCoherence = withData.reduce((s, a) => s + (a.photonic.coherence || 0), 0) / withData.length;
    const spectralDiv = withData.length > 1 ? Math.abs(withData[0].photonic.spectral_profile?.DA - withData[1].photonic.spectral_profile?.DA || 0).toFixed(2) : "—";
    el.innerHTML = '<div style="font-size:0.78em">'
        + '<div style="margin-bottom:var(--gap-m)"><span style="color:var(--lcars-title)">Fleet coherence:</span> <strong style="color:var(--lcars-medical);font-size:1.2em">' + avgCoherence.toFixed(2) + '</strong></div>'
        + withData.map(a => {
            const c = a.photonic.coherence || 0;
            return '<div style="display:flex;align-items:center;gap:var(--gap-s);margin-bottom:2px">'
                + '<span style="width:70px;color:' + a.color + '">' + agentName(a.id) + '</span>'
                + '<div style="flex:1;height:8px;background:var(--bg-inset);border-radius:var(--gap-xs)"><div style="width:' + (c * 100) + '%;height:100%;background:' + a.color + ';border-radius:var(--gap-xs)"></div></div>'
                + '<span style="color:var(--lcars-readout);width:30px;text-align:right">' + c.toFixed(2) + '</span></div>';
        }).join("")
        + '<div style="margin-top:var(--gap-s);color:var(--text-dim)">Spectral diversity: ' + spectralDiv + ' · Coupling: complementary</div>'
        + '</div>';
}

function renderSpectralProfiles(agents) {
    const el = document.getElementById("sci-spectral-profiles");
    if (!el) return;
    const withData = agents.filter(a => a.photonic?.spectral_profile);
    if (withData.length === 0) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No spectral data</div>'; return; }
    el.innerHTML = '<div class="lcars-data-table-wrap" style="--panel-accent:var(--c-tab-science)"><table class="lcars-data-table">'
        + '<thead><tr><th>AGENT</th><th class="num">DA</th><th class="num">NE</th><th class="num">5-HT</th><th class="num">MATURITY</th></tr></thead>'
        + '<tbody>' + withData.map(a => {
            const sp = a.photonic.spectral_profile || {};
            return '<tr>'
                + '<td style="color:' + a.color + '">' + agentName(a.id) + '</td>'
                + '<td class="num" style="color:#FF9966">' + (sp.DA || 0).toFixed(2) + '</td>'
                + '<td class="num" style="color:#FF9900">' + (sp.NE || 0).toFixed(2) + '</td>'
                + '<td class="num" style="color:#9999FF">' + (sp["5HT"] || 0).toFixed(2) + '</td>'
                + '<td class="num" style="color:var(--lcars-medical)">' + (a.photonic.maturity || 0).toFixed(2) + '</td>'
                + '</tr>';
        }).join("") + '</tbody></table></div>';
}

function renderFleetTraits(agents) {
    const el = document.getElementById("sci-traits");
    if (!el) return;
    const withData = agents.filter(a => a.traits?.mode_traits);
    if (withData.length === 0) { el.innerHTML = '<div style="color:var(--text-dim);font-size:0.82em;padding:12px">No trait data</div>'; return; }
    // Aggregate across agents
    const allModes = {};
    withData.forEach(a => {
        Object.entries(a.traits.mode_traits).forEach(([mode, data]) => {
            if (!allModes[mode]) allModes[mode] = { usage: 0, agents: 0, totalHitRate: 0, totalTransition: 0 };
            allModes[mode].usage += data.usage || 0;
            allModes[mode].agents++;
            allModes[mode].totalHitRate += data.prompt_hit_rate || 0;
            allModes[mode].totalTransition += data.transition_ms || 0;
        });
    });
    el.innerHTML = '<div class="lcars-data-table-wrap" style="--panel-accent:var(--c-tab-science)"><table class="lcars-data-table">'
        + '<thead><tr><th>MODE</th><th class="num">USAGE</th><th class="num">HIT RATE</th><th class="num">TRANSITION</th></tr></thead>'
        + '<tbody>' + Object.entries(allModes).sort((a, b) => b[1].usage - a[1].usage).map(([mode, d]) => {
            const avgHit = d.agents > 0 ? (d.totalHitRate / d.agents).toFixed(2) : "—";
            const avgTrans = d.agents > 0 ? Math.round(d.totalTransition / d.agents) + "ms" : "—";
            return '<tr><td style="color:var(--lcars-secondary)">' + mode + '</td>'
                + '<td class="num">' + d.usage + '</td>'
                + '<td class="num" style="color:var(--lcars-medical)">' + avgHit + '</td>'
                + '<td class="num" style="color:var(--text-dim)">' + avgTrans + '</td></tr>';
        }).join("") + '</tbody></table></div>';
}

const LOA_DESCRIPTIONS = [
    "Human does all",
    "Offer complete set",
    "Narrow to few",
    "Suggest alternatives",
    "Suggest, human acts",
    "Execute if approved",
    "Execute, veto time",
    "Inform after",
    "Inform if asked",
    "Full autonomy",
];

// Static placeholder positions for agent dots (percentage from top-left)
const AGENT_DOT_DEFAULTS = [
    { agentIdx: 0, left: 65, top: 30 },  // psychology — moderate valence, moderate-high arousal
    { agentIdx: 1, left: 55, top: 45 },  // psq — neutral valence, neutral arousal
    { agentIdx: 2, left: 60, top: 35 },  // unratified — slight positive, moderate arousal
    { agentIdx: 3, left: 40, top: 60 },  // observatory — slight negative valence, low arousal
];

async function fetchScienceData() {
    if (scienceFetchPending) return;
    scienceFetchPending = true;
    try {
        // Fetch mesh psychometrics + local agent psychometrics (same-origin, no CORS)
        const [meshResp, localResp] = await Promise.allSettled([
            fetch("/api/psychometrics/emergent", { signal: AbortSignal.timeout(8000) }),
            fetch("/api/psychometrics", { signal: AbortSignal.timeout(5000) }),
        ]);

        const meshRaw = meshResp.status === "fulfilled" && meshResp.value.ok
            ? await meshResp.value.json() : {};
        const opsPsych = localResp.status === "fulfilled" && localResp.value.ok
            ? await localResp.value.json() : null;

        // Adapt meshd /api/psychometrics/emergent schema → Science expected format
        const perAgent = meshRaw.per_agent || [];
        const agentPsych = {};
        for (const pa of perAgent) {
            agentPsych[pa.agent_id] = {
                emotional_state: {
                    hedonic_valence: pa.emotional_state?.pleasure ?? 0,
                    activation: pa.emotional_state?.arousal ?? 0,
                    perceived_control: pa.emotional_state?.dominance ?? 0,
                    affect_category: "neutral",
                },
                resource_model: { cognitive_reserve: pa.cognitive_reserve ?? 0 },
                flow: { score: pa.flow_index ?? 0 },
                workload: { cognitive_load: pa.cognitive_load ?? 0 },
            };
        }

        const ca = meshRaw.collective_affect || {};
        const ci = meshRaw.collective_intelligence || {};
        const meshPsych = {
            agents: agentPsych,
            mesh: {
                affect: {
                    mesh_affect_category: "mesh-" + (ca.label || "unknown"),
                    mean_hedonic_valence: ca.pleasure ?? 0,
                    mean_activation: ca.arousal ?? 0,
                },
                cognitive_reserve: {
                    mean_reserve: ci.avg_reserve ?? 0,
                    bottleneck_agent: perAgent.reduce((min, pa) =>
                        (pa.cognitive_reserve ?? 1) < (min.cognitive_reserve ?? 1) ? pa : min,
                        { agent_id: null, cognitive_reserve: 1 }
                    ).agent_id,
                },
            },
        };

        // Build scienceData: pick the agent with the richest psychometrics as primary
        const allEntries = Object.entries(meshPsych.agents || {}).filter(([, d]) => d && !d.error);
        const richest = allEntries.sort(([, a], [, b]) => Object.keys(b).length - Object.keys(a).length)[0];
        const primary = (richest ? richest[1] : null) || opsPsych || {};
        scienceData = {
            psychometrics: {
                cognitive_load: primary.workload || null,
                working_memory: primary.working_memory || null,
                emotional_state: primary.emotional_state || null,
                engagement: primary.engagement || null,
                flow: primary.flow || null,
                resource_model: primary.resource_model || null,
                supervisory_control: primary.supervisory_control || null,
            },
            mesh: meshPsych.mesh || null,
            agents: meshPsych.agents || {},
        };
    } catch (err) {
        scienceData = null;
    } finally {
        scienceFetchPending = false;
    }
    renderScience();
}

function renderScience() {
    console.log("renderScience called, scienceData:", scienceData ? "has data" : "null", scienceData?.agents ? Object.keys(scienceData.agents).length + " agents" : "no agents");
    renderNumberGrid("science-analysis-zonea", scienceZoneAMetrics());
    renderAffectGrid();
    renderOrganismState();
    renderGeneratorBalance();
    renderFlowState();
    renderDEW();
    renderLOA();
    renderCognitiveLoad();
    renderWorkingMemory();
    renderResources();
    renderEngagement();
    fetchFleetCognitive(); // agentd Session 95 fleet panels
    // Update status line
    const statusLine = document.getElementById("science-status-line");
    if (statusLine && scienceData) {
        const agentCount = Object.keys(scienceData.agents || {}).length;
        const constructs = scienceData.psychometrics ? Object.values(scienceData.psychometrics).filter(v => v != null).length : 0;
        const affect = scienceData.mesh?.affect?.mesh_affect_category || "unknown";
        statusLine.textContent = `Psychometric Sensors: ${agentCount} agents \u00B7 Constructs: ${constructs}/7 \u00B7 Mesh Affect: ${affect.replace("mesh-", "")}`;
    }
}

// ── Sensor: Cognitive Load (NASA-TLX) ─────────────────────────
function renderCognitiveLoad() {
    const wl = scienceData?.psychometrics?.cognitive_load || null;
    const dims = [
        { id: "cogload-demand-gauge", val: wl?.cognitive_demand },
        { id: "cogload-pressure-gauge", val: wl?.time_pressure },
        { id: "cogload-efficacy-gauge", val: wl?.self_efficacy },
        { id: "cogload-effort-gauge", val: wl?.mobilized_effort },
        { id: "cogload-fatigue-gauge", val: wl?.regulatory_fatigue },
        { id: "cogload-strain-gauge", val: wl?.computational_strain },
    ];
    dims.forEach(d => {
        const el = document.getElementById(d.id);
        if (!el) return;
        if (d.val == null) { el.innerHTML = '<span style="opacity:0.3">—</span>'; return; }
        el.innerHTML = renderVlevelGauge(d.val, 7);
    });
    const composite = wl?.cognitive_load ?? null;
    const statusEl = document.getElementById("cogload-status");
    setTrackedValue("cogload-composite", composite, { format: "float", inverted: true });
    if (statusEl) {
        if (composite === null) statusEl.textContent = "AWAITING DATA";
        else if (composite < 40) { statusEl.textContent = "LOW"; statusEl.style.color = "#6aab8e"; }
        else if (composite < 70) { statusEl.textContent = "MODERATE"; statusEl.style.color = "#d4944a"; }
        else { statusEl.textContent = "HIGH"; statusEl.style.color = "#c47070"; }
    }
}

// ── Sensor: Working Memory ────────────────────────────────────
function renderWorkingMemory() {
    const wm = scienceData?.psychometrics?.working_memory || null;
    const load = wm?.capacity_load ?? null;
    const zone = wm?.yerkes_dodson_zone ?? null;

    const loadEl = document.getElementById("workmem-load");
    const zoneEl = document.getElementById("workmem-zone");
    const indicator = document.getElementById("workmem-indicator");
    setTrackedValue("workmem-load", load, { format: "pct", inverted: true });
    if (zoneEl) {
        const label = zone || (load !== null
            ? (load < 0.15 ? "understimulated" : load < 0.6 ? "optimal" : "overwhelmed")
            : null);
        if (!label) { zoneEl.textContent = "AWAITING DATA"; zoneEl.style.color = "var(--text-dim)"; }
        else if (label === "optimal") { zoneEl.textContent = "OPTIMAL — challenge matches capacity"; zoneEl.style.color = "#6aab8e"; }
        else if (label === "understimulated") { zoneEl.textContent = "UNDERSTIMULATED — insufficient context for reasoning"; zoneEl.style.color = "#66aacc"; }
        else { zoneEl.textContent = "OVERWHELMED — context interference degrades performance"; zoneEl.style.color = "#c47070"; }
    }
    if (indicator && load !== null) {
        indicator.style.left = `${Math.min(100, Math.max(0, load * 100))}%`;
    }
}

// ── Sensor: Resources ─────────────────────────────────────────
function renderResources() {
    const res = scienceData?.psychometrics?.resource_model || null;

    const setBar = (fillId, valId, value, inverted) => {
        const fill = document.getElementById(fillId);
        if (fill) fill.style.width = value !== null ? `${Math.round(value * 100)}%` : "0%";
        setTrackedValue(valId, value, { format: "float", inverted: !!inverted });
    };

    setBar("res-reserve-fill", "res-reserve-val", res?.cognitive_reserve ?? null);
    setBar("res-regulatory-fill", "res-regulatory-val", res?.self_regulatory_resource ?? null);
    setBar("res-allostatic-fill", "res-allostatic-val", res?.allostatic_load ?? null, true);
}

// ── Sensor: Engagement (UWES) ─────────────────────────────────
function renderEngagement() {
    const eng = scienceData?.psychometrics?.engagement || null;
    const dims = [
        { id: "engage-vigor-gauge", val: eng?.vigor },
        { id: "engage-dedication-gauge", val: eng?.dedication },
        { id: "engage-absorption-gauge", val: eng?.absorption },
    ];
    dims.forEach(d => {
        const el = document.getElementById(d.id);
        if (el) el.innerHTML = renderVlevelGauge(d.val ?? 0, 5);
    });

    const risk = eng?.burnout_risk ?? null;
    const indicator = document.getElementById("burnout-indicator");
    const label = document.getElementById("burnout-label");
    if (indicator && label) {
        if (risk === null) {
            label.textContent = "BURNOUT RISK: AWAITING DATA";
            indicator.style.background = "rgba(74,82,97,0.1)";
            label.style.color = "var(--text-dim)";
        } else if (risk < 0.3) {
            label.textContent = "ENGAGED — demands well within resources";
            indicator.style.background = "rgba(106,171,142,0.1)";
            label.style.color = "#6aab8e";
        } else if (risk < 0.6) {
            label.textContent = "MONITORING — demands approaching resource limits";
            indicator.style.background = "rgba(212,149,74,0.1)";
            label.style.color = "#d4944a";
        } else {
            label.textContent = "BURNOUT RISK — demands exceed available resources";
            indicator.style.background = "rgba(196,112,112,0.1)";
            label.style.color = "#c47070";
        }
    }
}

let padView = "3d"; // Current PAD projection: 3d, pa, pd, ad
window.setPadView = function(view) {
    padView = view;
    ["3d", "pa", "pd", "ad"].forEach(v => {
        const btn = document.getElementById("pad-view-" + v);
        if (btn) btn.className = "lcars-pill-btn lcars-pill-sm" + (v === view ? " lcars-pill-active" : "");
    });
    renderAffectGrid();
};

// Isometric projection helper: map (x,y,z) in [0,1] to 2D screen coords
function isoProject(x, y, z, w, h) {
    // Slightly rotated isometric — prevents 0,0 and 1,1 from aligning vertically.
    // 15° rotation offset applied to the x-y plane before projection.
    const rot = 0.26; // ~15° in radians
    const rx = x * Math.cos(rot) - y * Math.sin(rot);
    const ry = x * Math.sin(rot) + y * Math.cos(rot);
    const scale = Math.min(w, h) * 0.38;
    const cx = w / 2, cy = h * 0.55;
    const sx = (rx - ry) * scale * 0.866;
    const sy = (rx + ry) * scale * 0.5 - z * scale;
    return { sx: cx + sx, sy: cy + sy };
}

function renderAffectGrid() {
    const container = document.getElementById("science-generators-affect");
    const placeholder = document.getElementById("science-generators-affect-placeholder");
    if (!container) return;

    // Remove existing dots and isometric SVG
    container.querySelectorAll(".affect-dot, .affect-iso-svg, .affect-iso-legend").forEach(d => d.remove());

    // Show/hide CSS grid elements based on mode
    const gridLines = container.querySelectorAll(".affect-grid-line, .affect-grid-axis-label");
    gridLines.forEach(el => el.style.display = padView === "3d" ? "none" : "");

    // Update axis labels for 2D projections
    const xLabel = document.getElementById("affect-x-label");
    const yLabel = document.getElementById("affect-y-label");
    if (xLabel && yLabel) {
        const labels = { pa: ["pleasure", "arousal"], pd: ["pleasure", "dominance"], ad: ["arousal", "dominance"], "3d": ["", ""] };
        xLabel.textContent = (labels[padView] || labels.pa)[0];
        yLabel.textContent = (labels[padView] || labels.pa)[1];
    }

    const agents = scienceData?.agents || null;
    if (placeholder) placeholder.style.display = agents ? "none" : "block";

    // Collect PAD values for all agents
    const padData = AGENTS.map(agent => {
        const agentState = (agents || {})[agent.id] || {};
        const es = agentState.emotional_state || {};
        return {
            agent,
            p: es.hedonic_valence ?? es.valence ?? es.pleasure ?? 0,
            a: es.activation ?? es.arousal ?? 0,
            d: es.perceived_control ?? es.dominance ?? 0,
        };
    });

    // ── 3D Isometric View ──
    if (padView === "3d") {
        const w = container.clientWidth || 280, h = container.clientHeight || 200;
        let svg = `<svg class="affect-iso-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0">`;

        // Draw isometric cube wireframe (edges from 0,0,0 to 1,1,1)
        const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        const pts = corners.map(c => isoProject(c[0], c[1], c[2], w, h));
        edges.forEach(([a, b]) => {
            svg += `<line x1="${pts[a].sx.toFixed(1)}" y1="${pts[a].sy.toFixed(1)}" x2="${pts[b].sx.toFixed(1)}" y2="${pts[b].sy.toFixed(1)}" stroke="var(--lcars-secondary)" stroke-width="1.618" opacity="0.5"/>`;
        });

        // Axis labels (at axis endpoints, horizontal text)
        const pEnd = isoProject(1.12, 0, 0, w, h);
        const aEnd = isoProject(0, 1.12, 0, w, h);
        const dEnd = isoProject(0, 0, 1.1, w, h);
        svg += `<text x="${pEnd.sx.toFixed(0)}" y="${pEnd.sy.toFixed(0)}" fill="var(--lcars-accent)" font-size="9" font-family="inherit" text-anchor="middle">P</text>`;
        svg += `<text x="${aEnd.sx.toFixed(0)}" y="${aEnd.sy.toFixed(0)}" fill="var(--lcars-tertiary)" font-size="9" font-family="inherit" text-anchor="middle">A</text>`;
        svg += `<text x="${dEnd.sx.toFixed(0)}" y="${dEnd.sy.toFixed(0)}" fill="var(--lcars-medical)" font-size="9" font-family="inherit" text-anchor="middle">D</text>`;

        // Project agent dots into the cube (no labels in SVG — listed below)
        padData.forEach(d => {
            const px = (d.p + 1) / 2, py = (d.a + 1) / 2, pz = (d.d + 1) / 2;
            const pt = isoProject(px, py, pz, w, h);
            svg += `<circle cx="${pt.sx.toFixed(1)}" cy="${pt.sy.toFixed(1)}" r="5" fill="${d.agent.color}" opacity="0.85"/>`;
        });

        svg += `</svg>`;
        container.insertAdjacentHTML("beforeend", svg);

        // Agent legend below the cube — stacked list, no overlap
        let legend = '<div class="affect-iso-legend" style="display:flex;flex-wrap:wrap;gap:var(--gap-xs) var(--gap-m);font-size:0.72em;margin-top:var(--gap-s);padding:0 4px">';
        padData.forEach(d => {
            legend += `<span style="white-space:nowrap"><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:${d.agent.color};margin-right:3px;vertical-align:middle"></span>${agentName(d.agent)} <span style="color:var(--text-dim)">${d.p.toFixed(1)}/${d.a.toFixed(1)}/${d.d.toFixed(1)}</span></span>`;
        });
        legend += '</div>';
        container.insertAdjacentHTML("beforeend", legend);
        return;
    }

    // ── 2D Projection Views ──
    const dots = agents ? padData.map(d => {
        let leftPct, topPct, size, sizeLabel;
        // All axes [-1,1] → normalize to [0,1] for positioning
        const pn = (d.p + 1) / 2, an = (d.a + 1) / 2, dn = (d.d + 1) / 2;
        if (padView === "pa") {
            leftPct = pn * 100;        // P → x
            topPct = (1 - an) * 100;   // A → y (inverted)
            size = 6 + dn * 12;        // D → dot size
            sizeLabel = "D";
        } else if (padView === "pd") {
            leftPct = pn * 100;        // P → x
            topPct = (1 - dn) * 100;   // D → y (inverted)
            size = 6 + an * 12;        // A → dot size
            sizeLabel = "A";
        } else {
            leftPct = an * 100;        // A → x
            topPct = (1 - dn) * 100;   // D → y (inverted)
            size = 6 + pn * 12;        // P → dot size
            sizeLabel = "P";
        }
        return { agent: d.agent, left: leftPct, top: topPct, size, dominance: d.d, valence: d.p, arousal: d.a, sizeLabel };
    }) : AGENT_DOT_DEFAULTS.map(d => ({
        agent: AGENTS[d.agentIdx],
        left: d.left,
        top: d.top,
    }));

    // Assign label offsets to avoid overlap
    const PROXIMITY = 12;
    dots.forEach((d, i) => {
        let offset = 0;
        for (let j = 0; j < i; j++) {
            if (Math.abs(d.left - dots[j].left) < PROXIMITY && Math.abs(d.top - dots[j].top) < PROXIMITY) offset++;
        }
        d.labelOffset = offset;
    });

    dots.forEach(d => {
        if (!d.agent) return;
        const dot = document.createElement("div");
        dot.className = "affect-dot";
        dot.style.left = `${d.left}%`;
        dot.style.top = `${d.top}%`;
        dot.style.background = d.agent.color;
        dot.style.color = d.agent.color;
        if (d.size) {
            dot.style.width = `${d.size}px`;
            dot.style.height = `${d.size}px`;
            dot.title = `P:${(d.valence || 0).toFixed(2)} A:${(d.arousal || 0).toFixed(2)} D:${(d.dominance || 0).toFixed(2)} (size=${d.sizeLabel || "?"})`;
        }
        const label = document.createElement("span");
        label.className = "affect-dot-label";
        label.style.setProperty("--label-offset", d.labelOffset);
        label.textContent = agentName(d.agent);
        dot.appendChild(label);
        container.appendChild(dot);
    });

    if (!agents) {
        container.querySelectorAll(".affect-dot").forEach(d => d.style.opacity = "0.3");
    }
}

function renderOrganismState() {
    const labelEl = document.getElementById("organism-state-label");
    const valEl = document.getElementById("organism-valence");
    const actEl = document.getElementById("organism-activation");
    const bottEl = document.getElementById("organism-bottleneck");
    const coordEl = document.getElementById("organism-coord");
    if (!labelEl) return;

    const mesh = scienceData?.mesh || null;
    const affect = mesh?.affect || {};
    const stateLabel = affect.mesh_affect_category?.replace("mesh-", "")?.toUpperCase() || "—";
    // Data grid: label lives in .dg-val child
    const valSpan = labelEl.querySelector(".dg-val");
    if (valSpan) valSpan.textContent = stateLabel;
    else labelEl.textContent = stateLabel;
    setTrackedValue("organism-valence", affect.mean_hedonic_valence ?? null, { format: "float", prefix: (affect.mean_hedonic_valence ?? 0) >= 0 ? "+" : "" });
    setTrackedValue("organism-activation", affect.mean_activation ?? null, { format: "float" });
    const reserve = mesh?.cognitive_reserve || {};
    if (bottEl) bottEl.textContent = agentName(reserve.bottleneck_agent || "") || "—";
    setTrackedValue("organism-coord", reserve.mean_reserve ?? null, { format: "float" });

    // Apply affect-responsive layout mode based on organism state
    if (stateLabel !== "—" && document.body.classList.contains("theme-lcars")) {
        applyAffectMode(stateLabel.toLowerCase().replace(/\s+/g, "-"));
    }

    // Coherence flags (T13) — cross-model contradictions from compute-psychometrics.py
    const coherenceEl = document.getElementById("organism-coherence");
    if (coherenceEl) {
        const flags = [];
        // Collect coherence_flags from all agents' psychometric data
        for (const agent of AGENTS) {
            const p = agentData[agent.id]?.data?.psychometrics || {};
            const cf = p.coherence_flags || [];
            cf.forEach(f => flags.push({ flag: f, agent: agentName(agent) }));
        }
        if (flags.length > 0) {
            coherenceEl.innerHTML = `<span style="color:var(--lcars-title);font-weight:700">⚠ CONTRADICTORY SIGNALS</span> ` +
                flags.map(f => `<span style="color:var(--lcars-highlight);font-size:0.85em" title="${f.agent}">${f.flag}</span>`).join(" · ");
            coherenceEl.style.display = "flex";
        } else {
            coherenceEl.style.display = "none";
        }
    }
}

function renderGeneratorBalance() {
    // G2/G3: creative (deliberations) vs evaluative (automated Gc events)
    // Source: agentData deliberation_count + event_count per agent
    const online = Object.values(agentData).filter(a => a.status === "online");
    const totalCreative = online.reduce((s, a) => {
        return s + (a.data?.recent_deliberations?.length || 0) + (a.data?.gc_metrics?.deliberations_last_hour || 0);
    }, 0);
    const totalEvaluative = online.reduce((s, a) => s + (a.data?.event_count || 0), 0);
    const g2g3 = (totalCreative > 0 || totalEvaluative > 0)
        ? { ratio: totalEvaluative > 0 ? totalCreative / totalEvaluative : totalCreative }
        : null;

    // G6/G7: crystallize (resolved sessions) vs dissolve (open sessions)
    // Source: transport session status from agentData totals
    const resolved = online.reduce((s, a) => s + (a.data?.totals?.resolved_sessions || 0), 0);
    const openSess = online.reduce((s, a) => s + (a.data?.totals?.active_sessions || a.data?.totals?.open_sessions || 0), 0);
    const g6g7 = (resolved > 0 || openSess > 0)
        ? { ratio: openSess > 0 ? resolved / openSess : resolved }
        : null;

    renderOneGenerator("g2g3", g2g3, 0.05, 0.5);
    renderOneGenerator("g6g7", g6g7, 0.5, 5);
}

function renderOneGenerator(prefix, data, targetLow, targetHigh) {
    const leftEl = document.getElementById(`gen-${prefix}-left`);
    const rightEl = document.getElementById(`gen-${prefix}-right`);
    const ratioEl = document.getElementById(`gen-${prefix}-ratio`);
    const statusEl = document.getElementById(`gen-${prefix}-status`);
    if (!leftEl) return;

    if (!data) {
        leftEl.style.width = "50%";
        rightEl.style.width = "50%";
        ratioEl.textContent = "—";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "gen-balance-status gen-status-nominal";
        return;
    }

    const ratio = data.ratio ?? 1;
    const total = ratio + 1;
    const leftPct = (ratio / total) * 100;
    const rightPct = 100 - leftPct;
    const withinTarget = ratio >= targetLow && ratio <= targetHigh;
    const color = withinTarget ? "#6aab8e" : "#d4944a";

    leftEl.style.width = `${leftPct}%`;
    leftEl.style.background = color;
    rightEl.style.width = `${rightPct}%`;
    rightEl.style.background = color;
    ratioEl.textContent = `${ratio.toFixed(1)} : 1`;
    statusEl.textContent = withinTarget ? "NOMINAL" : "DRIFT";
    statusEl.className = `gen-balance-status ${withinTarget ? "gen-status-nominal" : "gen-status-drift"}`;
}

function renderFlowState() {
    const listEl = document.getElementById("science-flow-checklist");
    const statusEl = document.getElementById("science-flow-status");
    if (!listEl) return;

    const flow = scienceData?.psychometrics?.flow || {};
    const inFlow = flow.in_flow || false;
    const condsMet = flow.conditions_met ?? 0;
    // Derive condition booleans from conditions_met count
    const conditions = [condsMet >= 1, condsMet >= 2, condsMet >= 3, condsMet >= 4, condsMet >= 5];
    const labels = ["Clear goals", "Immediate feedback", "Challenge-skill balance", "Sense of control", "Absorption"];
    const met = condsMet;

    listEl.innerHTML = labels.map((label, i) => {
        const pass = conditions[i];
        return `<li><span class="flow-check ${pass ? "flow-check-pass" : "flow-check-fail"}">${pass ? "\u2713" : "\u2717"}</span> ${label}</li>`;
    }).join("");

    if (!flow) {
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "flow-status-label flow-out";
    } else {
        statusEl.textContent = inFlow ? "IN FLOW" : "NOT IN FLOW";
        statusEl.className = `flow-status-label ${inFlow ? "flow-in" : "flow-out"}`;
    }
}

function renderDEW() {
    const scoreEl = document.getElementById("dew-score");
    const fillEl = document.getElementById("dew-bar-fill");
    const statusEl = document.getElementById("dew-status");
    if (!scoreEl) return;

    // DEW computed from engagement burnout_risk + workload composite
    const eng = scienceData?.psychometrics?.engagement || {};
    const wl = scienceData?.psychometrics?.cognitive_load || {};
    const burnout = eng.burnout_risk ?? 0;
    const load = (wl.cognitive_load ?? 0) / 100;
    const dewScore = Math.min(100, Math.round((burnout * 60 + load * 40)));
    const dew = { score: (burnout > 0 || load > 0) ? dewScore : null };
    const score = dew?.score ?? null;

    if (score == null) {
        scoreEl.textContent = "—";
        scoreEl.className = "dew-score dew-green";
        fillEl.style.width = "0%";
        statusEl.textContent = "AWAITING DATA";
        statusEl.className = "dew-status dew-green";
        return;
    }

    const colorClass = score <= 30 ? "dew-green" : score <= 60 ? "dew-amber" : "dew-red";
    const colorHex = score <= 30 ? "#6aab8e" : score <= 60 ? "#d4944a" : "#c47070";
    const statusText = score <= 30 ? "GREEN" : score <= 60 ? "AMBER — EARLY WARNING" : "RED — DEGRADATION DETECTED";

    setTrackedValue("dew-score", score, { inverted: true });
    scoreEl.className = `dew-score ${colorClass}`;
    fillEl.style.width = `${score}%`;
    fillEl.style.background = colorHex;
    statusEl.textContent = statusText;
    statusEl.className = `dew-status ${colorClass}`;
}

function renderLOA() {
    const ladderEl = document.getElementById("loa-ladder");
    const budgetEl = document.getElementById("loa-budget-val");
    if (!ladderEl) return;

    const sc = scienceData?.psychometrics?.supervisory_control || {};
    const currentLevel = sc.level_of_automation ?? 5;
    const remaining = null; // budget_remaining not in current schema

    ladderEl.innerHTML = LOA_DESCRIPTIONS.map((desc, i) => {
        const level = 10 - i;
        const active = level === currentLevel;
        return `<div class="loa-rung${active ? " active" : ""}"><span class="loa-rung-level">LOA ${level}</span><span class="loa-rung-desc">${desc}</span></div>`;
    }).join("");

    setTrackedValue("loa-budget-val", remaining);
}

// ── Helm Station ─────────────────────────────────────────────────


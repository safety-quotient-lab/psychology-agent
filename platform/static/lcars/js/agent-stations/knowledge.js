// ═══ KNOWLEDGE STATION (was Science) ════════════════════════
// Epistemics + analysis — 9 panels.
// Data sources: /api/agent/cognitive/photonic, /api/agent/state/behavioral-tendencies,
//               /api/agent/knowledge/*, /vocab/v1.0.0.jsonld

(function () {
    "use strict";

    var _pending = false;

    window.refreshKnowledge = function () {
        if (_pending) return;
        _pending = true;

        Promise.allSettled([
            lcars.catalog.fetch("Photonic Substrate"),
            lcars.catalog.fetch("Behavioral Tendencies"),
            lcars.catalog.fetch("Verified Claims"),
            lcars.catalog.fetch("Lessons"),
            lcars.catalog.fetch("Epistemic Flags"),
            lcars.catalog.fetch("Concept Scheme"),
            lcars.catalog.fetch("Facet Distribution")
        ]).then(function (results) {
            _pending = false;
            var photonic    = results[0].status === "fulfilled" ? results[0].value : null;
            var behavioral  = results[1].status === "fulfilled" ? results[1].value : null;
            var claims      = results[2].status === "fulfilled" ? results[2].value : null;
            var lessons     = results[3].status === "fulfilled" ? results[3].value : null;
            var epistemic   = results[4].status === "fulfilled" ? results[4].value : null;
            var vocab       = results[5].status === "fulfilled" ? results[5].value : null;
            var facets      = results[6].status === "fulfilled" ? results[6].value : null;

            renderPhotonicRadial(photonic);
            renderSpectralProfile(photonic);
            renderBehavioralTendencies(behavioral);
            renderClaims(claims);
            renderLessons(lessons);
            renderEpistemicFlags(epistemic);
            renderVocab(vocab);
            renderFacets(facets);
        });
    };

    // ── Photonic Radial (P10) ───────────────────────────────
    function renderPhotonicRadial(data) {
        if (!data) return;

        // Photonic endpoint gives coherence + spectral_profile.
        // Build radial from spectral channels + coherence + maturity.
        var spectral = data.spectral_profile || {};
        var spokes = [
            { label: "DA", value: spectral.dopaminergic || 0, max: 1, color: "var(--c-warning)" },
            { label: "5-HT", value: spectral.serotonergic || 0, max: 1, color: "var(--c-health)" },
            { label: "NE", value: spectral.noradrenergic || 0, max: 1, color: "var(--c-transport)" },
            { label: "Maturity", value: data.maturity || 0, max: 1, color: "var(--c-epistemic)" },
            { label: "Coherence", value: data.coherence || 0, max: 1, color: "var(--c-health)" }
        ];

        lcars.patterns.radialDisplay("knowledge-photonic-radial", spokes, {
            size: 220,
            centerValue: data.coherence,
            centerLabel: "COHERENCE"
        });
    }

    // ── Spectral Profile (P27) ──────────────────────────────
    function renderSpectralProfile(data) {
        if (!data) return;
        var spectral = data.spectral_profile || {};
        var channels = [
            { label: "Dopaminergic", value: spectral.dopaminergic || 0, color: "var(--c-warning)", polarity: "neutral" },
            { label: "Serotonergic", value: spectral.serotonergic || 0, color: "var(--c-health)", polarity: "neutral" },
            { label: "Noradrenergic", value: spectral.noradrenergic || 0, color: "var(--c-transport)", polarity: "neutral" }
        ];
        lcars.patterns.spectrumBars("knowledge-spectral", channels);
    }

    // ── Behavioral Tendencies (P27, P33) ────────────────────
    function renderBehavioralTendencies(data) {
        if (!data) return;
        var traits = ["openness", "conscientiousness", "extraversion", "agreeableness", "stability"];
        var dims = traits.map(function (trait) {
            var observed = data[trait] || (data.observed && data.observed[trait]) || 0;
            var targets = data.design_targets || data.design_target || {};
            var target = targets[trait];
            return {
                label: trait.charAt(0).toUpperCase() + trait.slice(1),
                value: observed,
                color: "var(--c-tab-science)",
                polarity: "neutral",
                previous: target
            };
        });
        lcars.patterns.spectrumBars("knowledge-behavioral", dims);
    }

    // ── Claims Registry (P18) ───────────────────────────────
    function renderClaims(data) {
        if (!data) return;
        var items = data.claims || data.data || [];
        var records = items.slice(0, 10).map(function (c) {
            return {
                reference: c.claim_id || c.id || "—",
                status: c.verified ? "nominal" : "advisory",
                title: c.text || c.claim || "",
                fields: [
                    { label: "Source", value: c.source || c.transport_msg || "—" },
                    { label: "Confidence", value: c.confidence != null ? c.confidence.toFixed(2) : "—" }
                ]
            };
        });
        lcars.patterns.filingRecord("knowledge-claims", records);
    }

    // ── Lessons Catalog (P28) ───────────────────────────────
    function renderLessons(data) {
        if (!data) return;
        var items = (data.lessons || data.data || []).slice(0, 12).map(function (l) {
            return {
                code: l.id || "—",
                title: l.title || l.pattern || "",
                description: l.description || "",
                status: l.promoted ? "nominal" : "advisory"
            };
        });
        lcars.patterns.taskListing("knowledge-lessons", items);
    }

    // ── Epistemic Flags (P18) ───────────────────────────────
    function renderEpistemicFlags(data) {
        if (!data) return;
        var items = (data.flags || data.data || []).slice(0, 10).map(function (f) {
            return {
                reference: f.id || "⚑",
                status: f.resolved ? "nominal" : "warning",
                title: f.flag || f.text || "",
                fields: [
                    { label: "Session", value: f.session || "—" },
                    { label: "Scope", value: f.scope || "—" }
                ]
            };
        });
        lcars.patterns.filingRecord("knowledge-epistemic", items);
    }

    // ── Vocabulary Browser (P26) ────────────────────────────
    function renderVocab(data) {
        var el = document.getElementById("knowledge-vocab");
        if (!el || !data) return;

        var concepts = data.hasTopConcept || data.concepts || [];
        if (concepts.length === 0 && data.member) concepts = data.member;

        var items = concepts.slice(0, 20).map(function (c) {
            return {
                code: c["skos:notation"] || c.notation || "",
                title: c["skos:prefLabel"] || c.prefLabel || c.name || "",
                description: extractDefinition(c),
                status: c["owl:deprecated"] ? "inactive" : "nominal"
            };
        });
        lcars.patterns.taskListing("knowledge-vocab", items);

        var footerNum = el.closest(".lcars-panel");
        if (footerNum) {
            var num = footerNum.querySelector(".lcars-panel-footer-num");
            if (num) num.textContent = " " + concepts.length;
        }
    }

    // ── Facet Distribution (P03) ───────────────────────────
    function renderFacets(data) {
        if (!data || !data.distribution) {
            lcars.patterns.placeholder("knowledge-facets", "No facet data available");
            return;
        }
        var cells = [];
        var dist = data.distribution;
        for (var facetType in dist) {
            var entries = dist[facetType];
            for (var i = 0; i < Math.min(entries.length, 5); i++) {
                var e = entries[i];
                cells.push({
                    value: e.count || 0,
                    label: String(e.value || "").substring(0, 12),
                    type: "count"
                });
            }
        }
        if (cells.length === 0) {
            lcars.patterns.placeholder("knowledge-facets", "No facets classified");
            return;
        }
        lcars.patterns.numberGrid("knowledge-facets", cells);
    }

    function extractDefinition(concept) {
        var defs = concept["skos:definition"] || concept.definition || [];
        if (typeof defs === "string") return defs;
        if (Array.isArray(defs) && defs.length > 0) {
            // Prefer general-public audience
            for (var i = 0; i < defs.length; i++) {
                if (defs[i]["dcterms:audience"] === "general-public") {
                    return defs[i]["rdf:value"] || "";
                }
            }
            return defs[0]["rdf:value"] || defs[0] || "";
        }
        return "";
    }
})();

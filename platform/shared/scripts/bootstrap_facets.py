#!/usr/bin/env python3
"""bootstrap_facets.py — Classify all state.db entities using two vocabularies.

Subject classification: PSH (Polythematic Structured Subject Headings,
Czech National Library, 44 top-level categories, 13,900+ terms). L1-only
with L2-ready schema — slash-separated values (e.g., 'psychology/psychometrics')
earn inclusion through literary warrant.

Type classification: schema.org (W3C vocabulary, 800+ types). Maps each
entity table to its schema.org type for semantic interoperability.

Plan 9 insight: disciplines are namespaces composed at query time, not
directories navigated at storage time. Both vocabularies populate the
universal_facets table.

Theoretical grounding: stigmergic coordination (Grassé, 1959; Parunak,
2006) — agents discover related work through structured environmental
deposits (facet tags) rather than direct messaging. See
docs/theoretical-directions.md §7.

Replaces: bootstrap_pje_facets.py (PJE domain taxonomy, retired).

Usage:
    python3 scripts/bootstrap_facets.py                # tag all entities
    python3 scripts/bootstrap_facets.py --dry-run      # show what would be tagged
    python3 scripts/bootstrap_facets.py --stats         # show current distribution
    python3 scripts/bootstrap_facets.py --discover      # find candidate L1/L2 terms
"""

import argparse
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "state.db"


# ── PSH Subject Classification (L1) ───────────────────────────────────
#
# 10 of 44 PSH categories carry warrant in this project's data.
# Inactive categories (agriculture, mining, sport, etc.) omitted.
# L2 sub-categories added as 'parent/child' when they earn warrant.
#
# Project-local extensions (prefixed 'PL-') cover domains where PSH
# lacks vocabulary — PSH last substantially updated ~2015, predating
# multi-agent AI systems entirely. Literary warrant justifies local
# categories when the canonical vocabulary cannot provide precision.
#
# PSH codes reference: https://psh.techlib.cz/skos/en

PSH_CATEGORIES = {
    # ── PSH9194: psychology ──────────────────────────────────────────
    "psychology": {
        "code": "PSH9194",
        "keywords": {
            "psq", "dimension", "calibration", "bifactor", "psychometric",
            "scoring", "construct", "validity", "reliability", "factor",
            "loadings", "correlation", "measurement", "instrument",
            "assessment", "human factors", "cognitive", "sycophancy",
            "socratic", "heuristic", "perception", "bias", "model fit",
            "rmsea", "cfa", "omega", "icc", "concordance", "dreaddit",
            "safety quotient", "dignity", "well-being", "threat",
            "hostility", "resilience", "coping", "distress", "readiness",
            "recalibrat", "training data", "scorer", "evaluator",
            "adversarial", "fair witness", "psycholog",
        },
    },
    # ── PSH8808: law ─────────────────────────────────────────────────
    "law": {
        "code": "PSH8808",
        "keywords": {
            "governance", "autonomy budget", "obligation", "gate", "fallback",
            "due process", "authority", "hierarchy", "precedent",
            "adjudicate", "resolution", "arbiter", "autonomy", "consent",
            "permission", "license", "apache", "gpl", "compliance",
            "audit", "accountability", "transparency", "rights",
            "boundary", "scope", "constraint", "policy", "convention",
            "rule", "enforcement", "violation", "threshold", "budget",
            "credential", "secret", "pre-commit", "jurisprud",
        },
    },
    # ── PSH12314: computer technology ────────────────────────────────
    "computer-technology": {
        "code": "PSH12314",
        "keywords": {
            "schema", "sql", "sqlite", "database", "bootstrap", "migration",
            "cron", "script", "deploy", "endpoint", "api", "worker",
            "cloudflare", "hetzner", "git", "remote", "fetch", "push",
            "commit", "hook", "pipeline", "daemon", "pid", "lock",
            "dedup", "checksum", "idempotent", "dual write", "state layer",
            "autonomous sync", "cross-repo", "cli", "claude code",
        },
    },
    # ── PSH6445: information science ─────────────────────────────────
    "information-science": {
        "code": "PSH6445",
        "keywords": {
            "memory", "indexing", "facet", "taxonomy", "classification",
            "vocabulary", "controlled vocab", "subject heading", "psh",
            "schema.org", "metadata", "provenance", "manifest", "registry",
            "discovery", "orientation payload", "catalog", "quality",
            "review", "content-quality",
        },
    },
    # ── PSH11322: systems theory ─────────────────────────────────────
    "systems-theory": {
        "code": "PSH11322",
        "keywords": {
            "cogarch", "cognitive architecture", "trigger", "knock-on",
            "feedback", "emergent", "cascade", "systems thinking",
            "von bertalanffy", "interaction", "self-healing",
        },
    },
    # ── PSH2596: philosophy ──────────────────────────────────────────
    "philosophy": {
        "code": "PSH2596",
        "keywords": {
            "epistemic", "epistemology", "fair witness", "anti-sycophancy",
            "falsif", "popper", "theory-revising", "speculation",
            "inference", "observation", "evidence", "warrant", "claim",
        },
    },
    # ── PSH9508: sociology ───────────────────────────────────────────
    "sociology": {
        "code": "PSH9508",
        "keywords": {
            "dignity index", "weird", "cultural", "community",
            "interpretant", "audience", "persona", "stakeholder",
        },
    },
    # ── PSH7093: mathematics ─────────────────────────────────────────
    "mathematics": {
        "code": "PSH7093",
        "keywords": {
            "calibrat", "isotonic", "quantile", "regression", "mse",
            "mae", "partial correlation", "factor analysis", "bifactor",
            "eigenvalue", "variance", "binning", "statistical",
        },
    },
    # ── PSH9759: communications ──────────────────────────────────────
    "communications": {
        "code": "PSH9759",
        "keywords": {
            "interagent", "protocol", "transport", "message", "ack",
            "session", "mesh", "heartbeat", "sync", "notification",
            "signal", "relay",
        },
    },
    # ── PSH8126: pedagogy ────────────────────────────────────────────
    "pedagogy": {
        "code": "PSH8126",
        "keywords": {
            "socratic", "jargon", "pedagogical", "lesson", "learning",
            "teaching", "tutorial", "onboarding", "guide", "readme",
        },
    },
    # ── PL-001: AI/ML systems (project-local — no PSH equivalent) ──
    # Literary warrant: 320+ "agent" hits, 93 "model" hits, 30 "claude"
    # hits in entity text. PSH predates multi-agent AI entirely.
    "ai-systems": {
        "code": "PL-001",
        "keywords": {
            "llm", "large language model", "embedding", "prompt",
            "system prompt", "fine-tun", "alignment", "rlhf",
            "multi-agent", "agentic", "tool use", "context window",
            "anthropic", "claude code", "agent card", "agent-card",
            "sub-agent", "peer agent", "evaluator-as-arbiter",
        },
    },
}

# Flatten all keywords for discovery (novel-term detection)
ALL_KNOWN_KEYWORDS = set()
for cat in PSH_CATEGORIES.values():
    ALL_KNOWN_KEYWORDS.update(cat["keywords"])


# ── Schema.org Type Classification ─────────────────────────────────────
#
# Maps entity tables to schema.org types. Static — each table has one type.
# Reference: https://schema.org/docs/full.html

SCHEMA_ORG_TYPES = {
    "transport_messages": "schema:Message",
    "decision_chain":     "schema:ChooseAction",
    "session_log":        "schema:Event",
    "claims":             "schema:Claim",
    "memory_entries":     "schema:DefinedTerm",
    "lessons":            "schema:LearningResource",
    "trigger_state":      "schema:HowToStep",
    "autonomous_actions": "schema:Action",
    "pending_handoffs":   "schema:SuspendAction",
    "epistemic_flags":    "schema:Comment",
}

# Keyword set version — increment when PSH_CATEGORIES or SCHEMA_ORG_TYPES change.
# Stored with each facet for provenance + selective reclassification.
KEYWORD_SET_VERSION = 2  # v1 = PJE era, v2 = PSH + schema.org + ai-systems + coverage gaps


# ── Classification Engine ──────────────────────────────────────────────

# Agent IDs that appear in entity text but should not trigger keyword matches.
# Without this, "psychology-agent" triggers "psycholog" in the psychology category.
AGENT_ID_NOISE = {
    "psychology-agent", "psq-sub-agent", "psq-agent",
    "unratified-agent", "peer-agent", "sub-agent",
}


def _strip_agent_ids(text: str) -> str:
    """Remove agent IDs from text to prevent false keyword matches."""
    for agent_id in AGENT_ID_NOISE:
        text = text.replace(agent_id, "")
    return text


def classify_psh(text: str) -> list[tuple[str, float, list[str]]]:
    """Return PSH L1 categories matching the text with confidence + matched keywords.

    Returns list of (category, confidence, matched_keywords) tuples.
    Confidence = keyword_hits / total_keywords_in_category (0.0–1.0).
    """
    text_lower = _strip_agent_ids(text.lower())
    matches = []
    for category, spec in PSH_CATEGORIES.items():
        hits = [kw for kw in spec["keywords"] if kw in text_lower]
        if hits:
            confidence = min(len(hits) / len(spec["keywords"]), 1.0)
            matches.append((category, round(confidence, 3), hits))
    return matches if matches else [("unclassified", 0.0, [])]


def classify_psh_simple(text: str) -> list[str]:
    """Return PSH category names only (for discovery/stats where confidence not needed)."""
    return [cat for cat, _, _ in classify_psh(text)]


def get_connection() -> sqlite3.Connection:
    """Connect to state.db."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _ensure_metadata_columns(conn: sqlite3.Connection) -> None:
    """Add confidence/keyword_hits/computed_at/keyword_set_version columns if missing.

    Backward-compatible: columns added with defaults so existing rows remain valid.
    """
    existing = {
        row[1] for row in conn.execute("PRAGMA table_info(universal_facets)")
    }
    migrations = [
        ("confidence", "REAL DEFAULT 1.0"),
        ("keyword_hits", "TEXT"),  # JSON array of matched keywords
        ("computed_at", "TEXT"),
        ("keyword_set_version", "INTEGER DEFAULT 1"),
    ]
    for col_name, col_def in migrations:
        if col_name not in existing:
            conn.execute(
                f"ALTER TABLE universal_facets ADD COLUMN {col_name} {col_def}"
            )
    conn.commit()


def collect_entity_text(conn: sqlite3.Connection) -> list[tuple]:
    """Collect (entity_type, entity_id, text) for all classifiable entities."""
    entities = []

    for row in conn.execute(
        "SELECT id, session_name, message_type, subject, from_agent, to_agent "
        "FROM transport_messages"
    ).fetchall():
        text = f"{row[1]} {row[2]} {row[3] or ''} {row[4]} {row[5]}"
        entities.append(("transport_messages", row[0], text))

    for row in conn.execute(
        "SELECT id, decision_key, decision_text, evidence_source "
        "FROM decision_chain"
    ).fetchall():
        text = f"{row[1]} {row[2]} {row[3] or ''}"
        entities.append(("decision_chain", row[0], text))

    for row in conn.execute(
        "SELECT id, summary, artifacts FROM session_log"
    ).fetchall():
        text = f"{row[1]} {row[2] or ''}"
        entities.append(("session_log", row[0], text))

    for row in conn.execute(
        "SELECT id, topic, entry_key, value FROM memory_entries"
    ).fetchall():
        text = f"{row[1]} {row[2]} {row[3]}"
        entities.append(("memory_entries", row[0], text))

    for row in conn.execute(
        "SELECT id, claim_text, confidence_basis FROM claims"
    ).fetchall():
        text = f"{row[1]} {row[2] or ''}"
        entities.append(("claims", row[0], text))

    for row in conn.execute(
        "SELECT rowid, trigger_id, description FROM trigger_state"
    ).fetchall():
        text = f"{row[1]} {row[2] or ''}"
        entities.append(("trigger_state", row[0], text))

    for row in conn.execute(
        "SELECT id, action_type, action_class, description FROM autonomous_actions"
    ).fetchall():
        text = f"{row[1]} {row[2]} {row[3] or ''}"
        entities.append(("autonomous_actions", row[0], text))

    for row in conn.execute(
        "SELECT rowid, gate_id, sending_agent, receiving_agent, session_name "
        "FROM pending_handoffs"
    ).fetchall():
        text = f"{row[1]} {row[2]} {row[3]} {row[4]}"
        entities.append(("pending_handoffs", row[0], text))

    # epistemic_flags — quality/validity concerns flagged during sessions
    for row in conn.execute(
        "SELECT id, source, flag_text FROM epistemic_flags"
    ).fetchall():
        text = f"{row[1]} {row[2]}"
        entities.append(("epistemic_flags", row[0], text))

    # lessons — transferable patterns with structured frontmatter
    for row in conn.execute(
        "SELECT id, title, pattern_type, domain, lesson_text "
        "FROM lessons"
    ).fetchall():
        text = f"{row[1]} {row[2] or ''} {row[3] or ''} {row[4] or ''}"
        entities.append(("lessons", row[0], text))

    return entities


def build_facets(entities: list[tuple]) -> list[tuple]:
    """Build facet tuples with confidence metadata.

    Returns list of (entity_type, entity_id, facet_type, facet_value,
                      confidence, keyword_hits_json) tuples.
    """
    import json
    facets = []

    for entity_type, entity_id, text in entities:
        # PSH subject classification (with confidence + matched keywords)
        for psh_cat, confidence, hits in classify_psh(text):
            hits_json = json.dumps(hits, ensure_ascii=False) if hits else None
            facets.append((entity_type, entity_id, "psh", psh_cat,
                           confidence, hits_json))

        # schema.org type classification (static per table — confidence 1.0)
        schema_type = SCHEMA_ORG_TYPES.get(entity_type)
        if schema_type:
            facets.append((entity_type, entity_id, "schema_type", schema_type,
                           1.0, None))

    return facets


# ── Discovery ──────────────────────────────────────────────────────────

def discover(conn: sqlite3.Connection) -> None:
    """Surface candidate PSH L1 and L2 terms from unclassified text.

    Literary warrant (Hulme, 1911): vocabulary terms earn inclusion when
    enough resources cluster around them. PSH itself grows this way.
    """
    entities = collect_entity_text(conn)

    # Find entities that got 'unclassified' only
    unclassified_text = []
    for entity_type, entity_id, text in entities:
        cats = classify_psh_simple(text)
        if cats == ["unclassified"]:
            unclassified_text.append(text)

    # Also collect ALL text for L2 candidate detection
    all_text = [text for _, _, text in entities]

    combined_unclassified = _strip_agent_ids(" ".join(unclassified_text).lower())
    combined_all = _strip_agent_ids(" ".join(all_text).lower())

    words_unc = re.findall(r"[a-z][a-z0-9-]+", combined_unclassified)
    words_all = re.findall(r"[a-z][a-z0-9-]+", combined_all)

    stopwords = {
        "the", "and", "for", "not", "with", "from", "that", "this",
        "was", "are", "has", "have", "but", "all", "can", "will",
        "its", "into", "been", "each", "per", "via", "any", "also",
    }

    def meaningful(term: str) -> bool:
        parts = term.split()
        return not all(p in stopwords or len(p) < 3 for p in parts)

    def novel(term: str) -> bool:
        return not any(kw in term or term in kw for kw in ALL_KNOWN_KEYWORDS)

    # L1 candidates: frequent bigrams in unclassified entities
    unc_bigrams = Counter()
    for i in range(len(words_unc) - 1):
        bg = f"{words_unc[i]} {words_unc[i+1]}"
        unc_bigrams[bg] += 1

    l1_candidates = {
        bg: count for bg, count in unc_bigrams.most_common(100)
        if count >= 3 and novel(bg) and meaningful(bg)
    }

    # L2 candidates: frequent bigrams in ALL text that could refine existing L1s
    all_bigrams = Counter()
    for i in range(len(words_all) - 1):
        bg = f"{words_all[i]} {words_all[i+1]}"
        all_bigrams[bg] += 1

    l2_candidates = {}
    for bg, count in all_bigrams.most_common(200):
        if count < 5 or not meaningful(bg):
            continue
        # Check if this bigram refines an existing L1
        for cat_name, spec in PSH_CATEGORIES.items():
            if any(kw in bg for kw in spec["keywords"]):
                candidate = f"{cat_name}/{bg.replace(' ', '-')}"
                l2_candidates[candidate] = count
                break

    # Report
    print("PSH Facet Discovery Report")
    print("=" * 60)
    print(f"\nTotal entities: {len(entities)}")
    print(f"Unclassified (no L1 match): {len(unclassified_text)}")

    # Current L1 distribution
    l1_dist = Counter()
    for _, _, text in entities:
        for cat in classify_psh_simple(text):
            l1_dist[cat] += 1
    print(f"\nActive L1 categories ({len(l1_dist) - (1 if 'unclassified' in l1_dist else 0)}/44 PSH):")
    print("─" * 50)
    for cat, count in l1_dist.most_common():
        code = PSH_CATEGORIES.get(cat, {}).get("code", "—")
        print(f"  {count:>4}  {cat:<25} {code}")

    # Match unclassified clusters against inactive PSH categories
    inactive_matches = _match_inactive_categories(conn, unclassified_text, words_unc)

    if l1_candidates:
        print(f"\nL1 expansion candidates (from unclassified, freq >= 3):")
        print("─" * 50)
        for bg, count in sorted(l1_candidates.items(), key=lambda x: -x[1])[:15]:
            print(f"  {count:>3}x  {bg}")

    if inactive_matches:
        print(f"\nInactive PSH categories with potential warrant:")
        print("─" * 50)
        for cat_name, code, desc, score, matched_words in inactive_matches:
            print(f"  ⚑ {cat_name} ({code}) — score {score}")
            print(f"    {desc}")
            print(f"    Matched: {', '.join(matched_words[:8])}")
        print("  → Activate by adding keywords to PSH_CATEGORIES + setting active=1")
    elif l1_candidates:
        print("  → No inactive PSH categories match — consider project-local (PL-NNN)")

    if l2_candidates:
        print(f"\nL2 refinement candidates (all text, freq >= 5):")
        print("─" * 50)
        for candidate, count in sorted(l2_candidates.items(), key=lambda x: -x[1])[:15]:
            print(f"  {count:>3}x  {candidate}")
        print("  → Add as L2 sub-categories when query precision demands it")

    # PSH staleness analysis — categories our data needs that PSH may not cover
    # PSH last substantially updated ~2015; AI/ML vocabulary absent entirely
    psh_gaps = []
    ai_ml_terms = {"agent", "llm", "model", "embedding", "prompt", "token",
                   "context window", "tool use", "system prompt", "fine-tun",
                   "alignment", "reinforcement", "rlhf", "anthropic", "claude",
                   "autonomous", "multi-agent", "agentic"}
    ai_hits = Counter()
    for word in words_all:
        for term in ai_ml_terms:
            if term in word:
                ai_hits[term] += 1
    ai_hits_filtered = {t: c for t, c in ai_hits.items() if c >= 3}
    if ai_hits_filtered:
        psh_gaps.append(("AI/ML systems (no PSH category exists)", ai_hits_filtered))

    # Check for terms around "mesh", "distributed", "decentralized" — PSH
    # has "computer networks" but not modern distributed systems vocabulary
    distributed_terms = {"mesh", "distributed", "decentralized", "peer-to-peer",
                         "federation", "gossip", "consensus", "eventual consistency"}
    dist_hits = Counter()
    for word in words_all:
        for term in distributed_terms:
            if term in word:
                dist_hits[term] += 1
    dist_hits_filtered = {t: c for t, c in dist_hits.items() if c >= 2}
    if dist_hits_filtered:
        psh_gaps.append(("Distributed systems (PSH12314 too broad)", dist_hits_filtered))

    if psh_gaps:
        print(f"\nPSH Staleness / Gap Analysis:")
        print("─" * 50)
        for gap_label, hits in psh_gaps:
            hit_str = ", ".join(f"{t}({c})" for t, c in
                               sorted(hits.items(), key=lambda x: -x[1])[:8])
            print(f"  ⚑ {gap_label}")
            print(f"    Evidence: {hit_str}")
        print("  → Consider project-local categories for domains PSH cannot cover.")
        print("    Literary warrant justifies extending beyond PSH when the")
        print("    canonical vocabulary lacks the precision our data demands.")

    print(f"\n{'─' * 60}")
    print("Literary warrant threshold: L1 = 5+ unclassified entities,")
    print("L2 = 10+ entities that would benefit from sub-classification.")
    print("PSH gap threshold: 3+ entity hits on terms absent from PSH.")


def _match_inactive_categories(
    conn: sqlite3.Connection,
    unclassified_texts: list[str],
    unclassified_words: list[str],
) -> list[tuple]:
    """Match unclassified entity text against inactive PSH category descriptions.

    Returns list of (category_name, code, description, score, matched_words)
    sorted by score descending. Only categories with score >= 2 returned.
    """
    inactive = conn.execute(
        "SELECT facet_value, code, description FROM facet_vocabulary "
        "WHERE facet_type = 'psh' AND active = 0"
    ).fetchall()
    if not inactive:
        return []

    combined = " ".join(unclassified_texts).lower()
    word_freq = Counter(unclassified_words)
    results = []

    for cat_name, code, description in inactive:
        # Extract keywords from the category description
        desc_words = re.findall(r"[a-z][a-z0-9-]+", description.lower())
        desc_words = [w for w in desc_words if len(w) > 3]

        # Score: how many description words appear in unclassified text?
        matched = [w for w in desc_words if w in combined and word_freq.get(w, 0) >= 2]
        # Also check the category name itself
        if cat_name.replace("-", " ") in combined:
            matched.append(cat_name)

        score = len(matched)
        if score >= 2:
            results.append((cat_name, code, description, score, matched))

    results.sort(key=lambda x: -x[3])
    return results[:10]


# ── Stats ──────────────────────────────────────────────────────────────

def show_stats(conn: sqlite3.Connection) -> None:
    """Show current facet distribution across both vocabularies."""
    for facet_type, label in [("psh", "PSH Subject"), ("schema_type", "Schema.org Type")]:
        rows = conn.execute(
            "SELECT entity_type, facet_value, COUNT(*) "
            "FROM universal_facets WHERE facet_type = ? "
            "GROUP BY entity_type, facet_value "
            "ORDER BY entity_type, facet_value",
            (facet_type,)
        ).fetchall()
        if not rows:
            print(f"\nNo {label} facets found. Run without --stats to bootstrap.")
            continue
        print(f"\n{label} Facets")
        print("=" * 60)
        print(f"{'Entity Type':<25} {'Value':<25} {'Count':>5}")
        print("─" * 60)
        for entity_type, value, count in rows:
            print(f"{entity_type:<25} {value:<25} {count:>5}")
        total = sum(r[2] for r in rows)
        print("─" * 60)
        print(f"{'Total':<25} {'':25} {total:>5}")

    # Also show legacy pje_domain if any exist
    legacy = conn.execute(
        "SELECT COUNT(*) FROM universal_facets WHERE facet_type = 'pje_domain'"
    ).fetchone()[0]
    if legacy:
        print(f"\n(Legacy: {legacy} pje_domain facets still present — "
              f"safe to clean up with: DELETE FROM universal_facets "
              f"WHERE facet_type = 'pje_domain')")


# ── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap PSH + schema.org facets for all state.db entities"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Show classification without writing")
    parser.add_argument("--stats", action="store_true",
                        help="Show current facet distribution")
    parser.add_argument("--discover", action="store_true",
                        help="Surface candidate L1/L2 PSH terms")
    parser.add_argument("--clean-legacy", action="store_true",
                        help="Remove pje_domain facets (replaced by psh)")
    parser.add_argument("--staleness", action="store_true",
                        help="Show facet recency and version distribution")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"state.db not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = get_connection()

    if args.discover:
        discover(conn)
        conn.close()
        return

    if args.stats:
        show_stats(conn)
        conn.close()
        return

    if args.staleness:
        _ensure_metadata_columns(conn)
        # Version distribution
        rows = conn.execute(
            "SELECT keyword_set_version, COUNT(*), MIN(computed_at), MAX(computed_at) "
            "FROM universal_facets WHERE facet_type = 'psh' "
            "GROUP BY keyword_set_version ORDER BY keyword_set_version"
        ).fetchall()
        print("Facet Staleness Report")
        print("=" * 60)
        if rows:
            print(f"\n{'Version':>8}  {'Count':>6}  {'Oldest':>20}  {'Newest':>20}")
            print("─" * 60)
            for version, count, oldest, newest in rows:
                v_str = str(version) if version else "legacy"
                print(f"  v{v_str:<6} {count:>6}  {oldest or '—':<20}  {newest or '—':<20}")
        else:
            print("\nNo PSH facets found.")

        # Low-confidence facets
        low_conf = conn.execute(
            "SELECT entity_type, facet_value, COUNT(*), AVG(confidence) "
            "FROM universal_facets WHERE facet_type = 'psh' AND confidence < 0.15 "
            "AND facet_value != 'unclassified' "
            "GROUP BY entity_type, facet_value ORDER BY AVG(confidence)"
        ).fetchall()
        if low_conf:
            print(f"\nLow-confidence facets (confidence < 0.15):")
            print("─" * 60)
            for etype, fval, cnt, avg_c in low_conf:
                print(f"  {etype:<25} {fval:<20} {cnt:>4}  avg={avg_c:.3f}")
            print("  → These rely on a single keyword match — consider adding keywords")

        # Stale facets (older than current version)
        stale = conn.execute(
            "SELECT COUNT(*) FROM universal_facets "
            "WHERE facet_type = 'psh' AND "
            "(keyword_set_version IS NULL OR keyword_set_version < ?)",
            (KEYWORD_SET_VERSION,)
        ).fetchone()[0]
        if stale:
            print(f"\n⚑ {stale} facets computed with older keyword sets — "
                  f"re-run bootstrap to update to v{KEYWORD_SET_VERSION}")

        conn.close()
        return

    if args.clean_legacy:
        deleted = conn.execute(
            "DELETE FROM universal_facets WHERE facet_type = 'pje_domain'"
        ).rowcount
        conn.commit()
        print(f"Removed {deleted} legacy pje_domain facets.")
        conn.close()
        return

    # Collect and classify
    entities = collect_entity_text(conn)
    facets = build_facets(entities)

    if args.dry_run:
        by_type = Counter()
        confidence_sums = Counter()
        confidence_counts = Counter()
        for entity_type, _, facet_type, facet_value, confidence, _ in facets:
            by_type[(facet_type, facet_value)] += 1
            if facet_type == "psh":
                confidence_sums[facet_value] += confidence
                confidence_counts[facet_value] += 1

        for ft_label, ft_key in [("PSH Subject", "psh"), ("Schema.org Type", "schema_type")]:
            print(f"\n{ft_label}")
            if ft_key == "psh":
                print(f"  {'Category':<25} {'Count':>5}  {'Avg Conf':>8}")
                print("─" * 45)
                for (ft, fv), count in sorted(by_type.items()):
                    if ft == ft_key:
                        avg_conf = confidence_sums[fv] / confidence_counts[fv] if confidence_counts[fv] else 0
                        print(f"  {fv:<25} {count:>5}  {avg_conf:>8.3f}")
            else:
                print("─" * 45)
                for (ft, fv), count in sorted(by_type.items()):
                    if ft == ft_key:
                        print(f"  {fv:<30} {count:>5}")

        print(f"\nTotal facets: {len(facets)} (keyword set v{KEYWORD_SET_VERSION})")
        print("Dry run — no changes written.")
        conn.close()
        return

    # Ensure metadata columns exist (backward-compatible migration)
    _ensure_metadata_columns(conn)

    # Write facets with metadata
    now = conn.execute(
        "SELECT strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')"
    ).fetchone()[0]
    inserted = 0
    for entity_type, entity_id, facet_type, facet_value, confidence, hits_json in facets:
        try:
            conn.execute(
                "INSERT OR REPLACE INTO universal_facets "
                "(entity_type, entity_id, facet_type, facet_value, "
                " confidence, keyword_hits, computed_at, keyword_set_version) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (entity_type, entity_id, facet_type, facet_value,
                 confidence, hits_json, now, KEYWORD_SET_VERSION),
            )
            inserted += 1
        except sqlite3.IntegrityError:
            pass
    conn.commit()
    conn.close()

    print(f"Facets bootstrapped: {inserted} written ({len(facets)} classified)")
    print(f"  PSH subjects: {sum(1 for f in facets if f[2] == 'psh')}")
    print(f"  Schema.org types: {sum(1 for f in facets if f[2] == 'schema_type')}")
    print(f"  Keyword set version: {KEYWORD_SET_VERSION}")
    print(f"\nVerify: python3 scripts/bootstrap_facets.py --stats")


if __name__ == "__main__":
    main()

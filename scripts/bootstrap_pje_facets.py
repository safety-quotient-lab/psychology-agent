#!/usr/bin/env python3
"""bootstrap_pje_facets.py — Tag all state.db entities with PJE domain facets.

Classifies entities into psychology/jurisprudence/engineering/cross-cutting
based on Polythematic Structured Subject Headings (PSH) — a faceted
classification system where each resource participates in multiple independent
dimensions simultaneously (Czech National Library, based on UDC principles).

Plan 9 insight: disciplines are namespaces composed at query time, not
directories navigated at storage time. This script populates the
universal_facets table so queries like:

    SELECT * FROM universal_facets WHERE facet_type = 'pje_domain'
      AND facet_value = 'jurisprudence';

...return all jurisprudence-relevant entities across all tables.

Domain vocabulary grows through literary warrant: when enough resources
cluster around terms not covered by existing domains, --discover surfaces
candidates for vocabulary expansion.

Usage:
    python3 scripts/bootstrap_pje_facets.py           # tag all entities
    python3 scripts/bootstrap_pje_facets.py --dry-run  # show what would be tagged
    python3 scripts/bootstrap_pje_facets.py --stats     # show current distribution
    python3 scripts/bootstrap_pje_facets.py --discover  # find candidate new domains
"""

import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "state.db"

# ── PJE Domain Classification Rules ────────────────────────────────────

# Keywords that signal each discipline. Matched case-insensitively against
# combined text fields for each entity. An entity can match multiple domains.
PSYCHOLOGY_KEYWORDS = {
    "psq", "dimension", "calibration", "bifactor", "psychometric", "scoring",
    "construct", "validity", "reliability", "factor", "loadings", "correlation",
    "measurement", "instrument", "assessment", "human factors", "cognitive",
    "sycophancy", "socratic", "heuristic", "perception", "bias", "model fit",
    "rmsea", "cfa", "omega", "icc", "concordance", "dreaddit", "safety quotient",
    "dignity", "well-being", "threat", "hostility", "resilience", "coping",
    "distress", "readiness", "recalibrat", "training data", "scorer", "evaluator",
    "adversarial", "fair witness",
}

JURISPRUDENCE_KEYWORDS = {
    "governance", "trust budget", "obligation", "gate", "fallback", "due process",
    "authority", "hierarchy", "precedent", "adjudicate", "resolution", "arbiter",
    "autonomy", "consent", "permission", "license", "apache", "gpl", "compliance",
    "audit", "accountability", "transparency", "rights", "boundary", "scope",
    "constraint", "policy", "convention", "rule", "enforcement", "violation",
    "threshold", "budget", "credential", "secret", "pre-commit",
}

ENGINEERING_KEYWORDS = {
    "schema", "transport", "sql", "sqlite", "bootstrap", "migration", "cron",
    "script", "deploy", "endpoint", "api", "worker", "cloudflare", "hetzner",
    "git", "remote", "fetch", "push", "commit", "hook", "ci", "pipeline",
    "architecture", "infrastructure", "mesh", "sync", "heartbeat", "manifest",
    "daemon", "pid", "lock", "filesystem", "9p", "plan 9", "namespace",
    "dual write", "state layer", "orientation payload", "autonomous sync",
    "cross-repo", "checksum", "idempotent", "dedup",
}


def classify_text(text: str) -> list[str]:
    """Return list of PJE domains that match the given text."""
    text_lower = text.lower()
    domains = []
    if any(kw in text_lower for kw in PSYCHOLOGY_KEYWORDS):
        domains.append("psychology")
    if any(kw in text_lower for kw in JURISPRUDENCE_KEYWORDS):
        domains.append("jurisprudence")
    if any(kw in text_lower for kw in ENGINEERING_KEYWORDS):
        domains.append("engineering")
    if not domains:
        domains.append("cross-cutting")
    return domains


def get_connection() -> sqlite3.Connection:
    """Connect to state.db."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def classify_transport_messages(conn: sqlite3.Connection) -> list[tuple]:
    """Classify transport messages by subject + message_type + session_name."""
    rows = conn.execute(
        "SELECT id, session_name, message_type, subject, from_agent, to_agent "
        "FROM transport_messages"
    ).fetchall()
    facets = []
    for row_id, session, msg_type, subject, from_agent, to_agent in rows:
        text = f"{session} {msg_type} {subject or ''} {from_agent} {to_agent}"
        for domain in classify_text(text):
            facets.append(("transport_messages", row_id, "pje_domain", domain))
    return facets


def classify_decisions(conn: sqlite3.Connection) -> list[tuple]:
    """Classify decisions by key + text + source."""
    rows = conn.execute(
        "SELECT id, decision_key, decision_text, evidence_source "
        "FROM decision_chain"
    ).fetchall()
    facets = []
    for row_id, key, text, source in rows:
        combined = f"{key} {text} {source or ''}"
        for domain in classify_text(combined):
            facets.append(("decision_chain", row_id, "pje_domain", domain))
    return facets


def classify_sessions(conn: sqlite3.Connection) -> list[tuple]:
    """Classify sessions by summary + artifacts."""
    rows = conn.execute(
        "SELECT id, summary, artifacts FROM session_log"
    ).fetchall()
    facets = []
    for row_id, summary, artifacts in rows:
        combined = f"{summary} {artifacts or ''}"
        for domain in classify_text(combined):
            facets.append(("session_log", row_id, "pje_domain", domain))
    return facets


def classify_memory_entries(conn: sqlite3.Connection) -> list[tuple]:
    """Classify memory entries by topic + key + value."""
    rows = conn.execute(
        "SELECT id, topic, entry_key, value FROM memory_entries"
    ).fetchall()
    facets = []
    for row_id, topic, key, value in rows:
        combined = f"{topic} {key} {value}"
        for domain in classify_text(combined):
            facets.append(("memory_entries", row_id, "pje_domain", domain))
    return facets


def classify_claims(conn: sqlite3.Connection) -> list[tuple]:
    """Classify claims by text + confidence basis."""
    rows = conn.execute(
        "SELECT id, claim_text, confidence_basis FROM claims"
    ).fetchall()
    facets = []
    for row_id, text, basis in rows:
        combined = f"{text} {basis or ''}"
        for domain in classify_text(combined):
            facets.append(("claims", row_id, "pje_domain", domain))
    return facets


def classify_triggers(conn: sqlite3.Connection) -> list[tuple]:
    """Classify triggers by id + description."""
    rows = conn.execute(
        "SELECT trigger_id, description FROM trigger_state"
    ).fetchall()
    facets = []
    for trigger_id, description in rows:
        # trigger_state uses text PK, not integer — store hash for entity_id
        # Actually, universal_facets expects integer entity_id.
        # Use ROWID instead.
        row = conn.execute(
            "SELECT rowid FROM trigger_state WHERE trigger_id = ?",
            (trigger_id,)
        ).fetchone()
        if row:
            combined = f"{trigger_id} {description or ''}"
            for domain in classify_text(combined):
                facets.append(("trigger_state", row[0], "pje_domain", domain))
    return facets


def discover_domains(conn: sqlite3.Connection) -> None:
    """Surface candidate new domains from cross-cutting entity text.

    Literary warrant principle: when enough entities cluster around terms
    not covered by existing PJE domains, those terms earn vocabulary
    expansion consideration. Surfaces candidates — does not auto-add.
    """
    import re
    from collections import Counter

    # All known keywords (flattened)
    known = PSYCHOLOGY_KEYWORDS | JURISPRUDENCE_KEYWORDS | ENGINEERING_KEYWORDS

    # Collect text from all entities (same sources as classification)
    all_text = []

    for row in conn.execute(
        "SELECT session_name, message_type, subject, from_agent "
        "FROM transport_messages"
    ).fetchall():
        all_text.append(f"{row[0]} {row[1]} {row[2] or ''} {row[3]}")

    for row in conn.execute(
        "SELECT decision_key, decision_text, evidence_source "
        "FROM decision_chain"
    ).fetchall():
        all_text.append(f"{row[0]} {row[1]} {row[2] or ''}")

    for row in conn.execute(
        "SELECT summary, artifacts FROM session_log"
    ).fetchall():
        all_text.append(f"{row[0]} {row[1] or ''}")

    for row in conn.execute(
        "SELECT topic, entry_key, value FROM memory_entries"
    ).fetchall():
        all_text.append(f"{row[0]} {row[1]} {row[2]}")

    for row in conn.execute(
        "SELECT claim_text, confidence_basis FROM claims"
    ).fetchall():
        all_text.append(f"{row[0]} {row[1] or ''}")

    # Extract bigrams and trigrams (more signal than unigrams)
    combined = " ".join(all_text).lower()
    # Clean: keep alphanumeric and hyphens
    words = re.findall(r"[a-z][a-z0-9-]+", combined)

    bigrams = Counter()
    trigrams = Counter()
    for i in range(len(words) - 1):
        bg = f"{words[i]} {words[i+1]}"
        bigrams[bg] += 1
    for i in range(len(words) - 2):
        tg = f"{words[i]} {words[i+1]} {words[i+2]}"
        trigrams[tg] += 1

    # Filter: terms that appear 3+ times but don't match any known keyword
    def is_novel(term: str) -> bool:
        return not any(kw in term or term in kw for kw in known)

    # Filter out pure stopwords and very short terms
    stopwords = {"the", "and", "for", "not", "with", "from", "that", "this",
                 "was", "are", "has", "have", "but", "all", "can", "will",
                 "its", "into", "been", "each", "per", "via", "any"}

    def is_meaningful(term: str) -> bool:
        parts = term.split()
        return not all(p in stopwords or len(p) < 3 for p in parts)

    novel_bigrams = {
        bg: count for bg, count in bigrams.most_common(200)
        if count >= 3 and is_novel(bg) and is_meaningful(bg)
    }
    novel_trigrams = {
        tg: count for tg, count in trigrams.most_common(200)
        if count >= 3 and is_novel(tg) and is_meaningful(tg)
    }

    # Also check: how many entities got ONLY cross-cutting (no specific domain)?
    cross_only = conn.execute(
        "SELECT COUNT(DISTINCT entity_type || ':' || entity_id) "
        "FROM universal_facets uf1 "
        "WHERE uf1.facet_type = 'pje_domain' AND uf1.facet_value = 'cross-cutting' "
        "AND NOT EXISTS ("
        "  SELECT 1 FROM universal_facets uf2 "
        "  WHERE uf2.entity_type = uf1.entity_type "
        "    AND uf2.entity_id = uf1.entity_id "
        "    AND uf2.facet_type = 'pje_domain' "
        "    AND uf2.facet_value != 'cross-cutting'"
        ")"
    ).fetchone()[0]

    print("PSH Domain Discovery Report")
    print("=" * 60)
    print(f"\nEntities classified as cross-cutting ONLY: {cross_only}")
    print(f"(These have no psychology/jurisprudence/engineering tag)")

    if novel_bigrams:
        print(f"\nCandidate terms (bigrams, freq >= 3, not in existing vocab):")
        print("─" * 50)
        for bg, count in sorted(novel_bigrams.items(), key=lambda x: -x[1])[:20]:
            print(f"  {count:>3}x  {bg}")

    if novel_trigrams:
        print(f"\nCandidate terms (trigrams, freq >= 3, not in existing vocab):")
        print("─" * 50)
        for tg, count in sorted(novel_trigrams.items(), key=lambda x: -x[1])[:15]:
            print(f"  {count:>3}x  {tg}")

    print(f"\n{'─' * 60}")
    print("Action: If a cluster of candidate terms suggests a coherent")
    print("domain not covered by psychology/jurisprudence/engineering,")
    print("add keywords to the relevant set in this script and re-run.")
    print("Literary warrant: a domain earns inclusion when 5+ entities")
    print("cluster around it with no existing domain match.")


def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap PJE domain facets for all state.db entities"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be tagged without writing")
    parser.add_argument("--stats", action="store_true",
                        help="Show current PJE facet distribution and exit")
    parser.add_argument("--discover", action="store_true",
                        help="Discover candidate new domains from unclassified text")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"state.db not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = get_connection()

    if args.discover:
        discover_domains(conn)
        conn.close()
        return

    if args.stats:
        rows = conn.execute(
            "SELECT entity_type, facet_value, COUNT(*) "
            "FROM universal_facets WHERE facet_type = 'pje_domain' "
            "GROUP BY entity_type, facet_value "
            "ORDER BY entity_type, facet_value"
        ).fetchall()
        if not rows:
            print("No PJE facets found. Run without --stats to bootstrap.")
        else:
            print(f"{'Entity Type':<25} {'Domain':<16} {'Count':>5}")
            print("─" * 50)
            for entity_type, domain, count in rows:
                print(f"{entity_type:<25} {domain:<16} {count:>5}")
            total = sum(r[2] for r in rows)
            print("─" * 50)
            print(f"{'Total':<25} {'':16} {total:>5}")
        conn.close()
        return

    # Collect all facets
    all_facets = []
    all_facets.extend(classify_transport_messages(conn))
    all_facets.extend(classify_decisions(conn))
    all_facets.extend(classify_sessions(conn))
    all_facets.extend(classify_memory_entries(conn))
    all_facets.extend(classify_claims(conn))
    all_facets.extend(classify_triggers(conn))

    if args.dry_run:
        # Show distribution
        from collections import Counter
        by_type_domain = Counter()
        for entity_type, _, _, domain in all_facets:
            by_type_domain[(entity_type, domain)] += 1
        print(f"{'Entity Type':<25} {'Domain':<16} {'Count':>5}")
        print("─" * 50)
        for (entity_type, domain), count in sorted(by_type_domain.items()):
            print(f"{entity_type:<25} {domain:<16} {count:>5}")
        print("─" * 50)
        print(f"{'Total':<25} {'':16} {len(all_facets):>5}")
        print(f"\nDry run — no changes written.")
        conn.close()
        return

    # Write facets
    inserted = 0
    for entity_type, entity_id, facet_type, facet_value in all_facets:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO universal_facets "
                "(entity_type, entity_id, facet_type, facet_value) "
                "VALUES (?, ?, ?, ?)",
                (entity_type, entity_id, facet_type, facet_value),
            )
            inserted += 1
        except sqlite3.IntegrityError:
            pass
    conn.commit()
    conn.close()

    print(f"PJE facets bootstrapped: {inserted} facets written "
          f"({len(all_facets)} classified)")
    print(f"\nVerify: python3 scripts/bootstrap_pje_facets.py --stats")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
document-audit-generator.py — Endless evaluative generator for document quality.

Implements the Einstein-Freud "endless generator" axiom: evaluative processing
never depletes because adversarial pressure (errors, drift, inconsistencies)
regenerates continuously. This script selects documents for audit, defines
check categories, and produces a structured audit payload for injection into
autonomous sync cycles.

The generator rotates through the document corpus so that every auditable
document receives periodic scrutiny. Documents modified more recently receive
higher selection priority (recency-weighted rotation).

Usage:
    python3 scripts/document-audit-generator.py                # select next document
    python3 scripts/document-audit-generator.py --status       # show audit rotation state
    python3 scripts/document-audit-generator.py --record       # record completed audit
        --document <path> --findings <count> --session <id>

Integration:
    autonomous-sync.sh calls this to generate an audit task when no inbound
    transport messages require processing (idle cycles → evaluative work).
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"

# ── Auditable document corpus ────────────────────────────────────────────────
# Ordered by priority tier. Tier 1 documents carry governance weight and
# receive more frequent audits. Tier 3 documents receive spot-checks.

AUDIT_CORPUS = [
    # Tier 1: governance and theory (errors here propagate to all downstream work)
    {
        "path": "docs/einstein-freud-rights-theory.md",
        "tier": 1,
        "check_types": ["logical", "factual", "consistency", "citation"],
        "description": "Theoretical foundation — 14 frameworks, 5 invariants",
    },
    {
        "path": "docs/ef1-governance.md",
        "tier": 1,
        "check_types": ["logical", "consistency", "self-reference"],
        "description": "Core governance model — 12 invariants",
    },
    {
        "path": "docs/cognitive-triggers.md",
        "tier": 1,
        "check_types": ["logical", "consistency", "completeness", "self-reference"],
        "description": "Trigger system T1-T18 — firing conditions, checks, tiers",
    },
    {
        "path": "CLAUDE.md",
        "tier": 1,
        "check_types": ["consistency", "staleness", "contradiction"],
        "description": "System prompt — stable conventions",
    },
    # Tier 2: architecture and specs (errors here affect implementation)
    {
        "path": "docs/architecture.md",
        "tier": 2,
        "check_types": ["logical", "consistency", "staleness", "factual"],
        "description": "Design decisions and system specification",
    },
    {
        "path": "docs/equal-information-channel-spec.md",
        "tier": 2,
        "check_types": ["logical", "consistency", "completeness"],
        "description": "EIC spec — schema v24",
    },
    {
        "path": "docs/subagent-layer-spec.md",
        "tier": 2,
        "check_types": ["logical", "consistency", "staleness"],
        "description": "Sub-agent protocol spec",
    },
    {
        "path": "docs/peer-layer-spec.md",
        "tier": 2,
        "check_types": ["logical", "consistency", "staleness"],
        "description": "Peer layer protocol spec",
    },
    {
        "path": "docs/constraints.md",
        "tier": 2,
        "check_types": ["consistency", "staleness", "completeness"],
        "description": "66 constraints, 5 categories",
    },
    {
        "path": "COLOPHON.md",
        "tier": 2,
        "check_types": ["factual", "staleness"],
        "description": "Production record — stats, versions, counts",
    },
    {
        "path": "README.md",
        "tier": 2,
        "check_types": ["factual", "staleness", "consistency"],
        "description": "Public-facing project description",
    },
    # Tier 3: operational documents (errors here affect session quality)
    {
        "path": "TODO.md",
        "tier": 3,
        "check_types": ["staleness", "consistency"],
        "description": "Forward-looking task backlog",
    },
    {
        "path": "journal.md",
        "tier": 3,
        "check_types": ["factual", "consistency", "citation"],
        "description": "Research narrative",
    },
    {
        "path": "docs/hooks-reference.md",
        "tier": 3,
        "check_types": ["staleness", "consistency", "completeness"],
        "description": "Hook event × script reference",
    },
    {
        "path": "docs/glossary.md",
        "tier": 3,
        "check_types": ["consistency", "completeness", "staleness"],
        "description": "Project terminology",
    },
]

# ── Check type definitions ───────────────────────────────────────────────────
# Each check type produces a specific audit instruction for the LLM.

CHECK_PROMPTS = {
    "logical": (
        "Scan for logical errors: invalid inferences, circular reasoning, "
        "conclusions that do not follow from premises, unstated assumptions "
        "that carry the argument, and contradictions between sections."
    ),
    "factual": (
        "Scan for factual errors: incorrect dates, wrong attribution of ideas "
        "to authors, mischaracterized research findings, statistics that do not "
        "match their cited sources, and claims presented as facts without sources."
    ),
    "consistency": (
        "Scan for internal inconsistencies: terms defined differently in different "
        "sections, numbers that disagree across documents (counts, versions, stats), "
        "rules stated in one place and contradicted in another, and stale references "
        "to renamed or removed components."
    ),
    "citation": (
        "Scan for citation problems: claims that need citations but lack them, "
        "citations that do not support the claim they accompany, paraphrases that "
        "misrepresent the cited source, and missing publication years or author names."
    ),
    "staleness": (
        "Scan for stale content: version numbers that no longer match current state, "
        "counts that have changed (sessions, messages, triggers, hooks), references "
        "to components that have been renamed or removed, and dates that imply "
        "currency but reflect past state."
    ),
    "completeness": (
        "Scan for completeness gaps: sections that promise content not delivered, "
        "lists that omit known items, tables with missing rows for documented "
        "components, and cross-references to documents that do not exist."
    ),
    "self-reference": (
        "Scan for self-referential problems: governance rules that exempt themselves "
        "from their own constraints, evaluation criteria that cannot evaluate "
        "themselves, and definitions that depend circularly on terms they define."
    ),
    "contradiction": (
        "Scan for contradictions with other project documents: rules in CLAUDE.md "
        "that conflict with docs/cognitive-triggers.md, conventions stated in rules/ "
        "that contradict CLAUDE.md, and memory entries that disagree with committed docs."
    ),
}

# ── Audit rotation state ────────────────────────────────────────────────────


def ensure_audit_table(conn: sqlite3.Connection) -> None:
    """Create the document_audits table if absent."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS document_audits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_path TEXT NOT NULL,
            tier INTEGER NOT NULL,
            check_types TEXT NOT NULL,
            findings_count INTEGER DEFAULT 0,
            session_id INTEGER,
            audited_at TEXT DEFAULT (datetime('now')),
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_audits_document
            ON document_audits (document_path)
    """)
    conn.commit()


def last_audit(conn: sqlite3.Connection, doc_path: str) -> dict | None:
    """Return the most recent audit record for a document, or None."""
    row = conn.execute(
        "SELECT document_path, tier, findings_count, audited_at "
        "FROM document_audits WHERE document_path = ? "
        "ORDER BY audited_at DESC LIMIT 1",
        (doc_path,),
    ).fetchone()
    if row:
        return {
            "document_path": row[0],
            "tier": row[1],
            "findings_count": row[2],
            "audited_at": row[3],
        }
    return None


def select_next_document(conn: sqlite3.Connection) -> dict:
    """
    Select the next document for audit using recency-weighted rotation.

    Priority: tier 1 before tier 2 before tier 3, then least-recently-audited
    within each tier. Documents never audited receive highest priority within
    their tier.
    """
    # Build priority list
    candidates = []
    for doc in AUDIT_CORPUS:
        path = doc["path"]
        full_path = PROJECT_ROOT / path
        if not full_path.exists():
            continue

        audit = last_audit(conn, path)
        if audit is None:
            # Never audited — highest priority within tier
            days_since = 999
        else:
            audited_dt = datetime.fromisoformat(audit["audited_at"])
            if audited_dt.tzinfo is None:
                audited_dt = audited_dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_since = (now - audited_dt).days

        candidates.append({
            **doc,
            "days_since_audit": days_since,
            "last_audit": audit,
        })

    if not candidates:
        return {"error": "No auditable documents found"}

    # Sort: tier ascending, then days_since descending (oldest first)
    candidates.sort(key=lambda c: (c["tier"], -c["days_since_audit"]))
    return candidates[0]


def generate_audit_prompt(doc: dict) -> str:
    """Generate the LLM audit prompt for a selected document."""
    checks = "\n".join(
        f"  {i+1}. **{ct.upper()}:** {CHECK_PROMPTS[ct]}"
        for i, ct in enumerate(doc["check_types"])
    )

    last = doc.get("last_audit")
    history = ""
    if last:
        history = (
            f"\nLast audited: {last['audited_at']} "
            f"({last['findings_count']} findings). "
            f"Days since: {doc['days_since_audit']}."
        )
    else:
        history = "\nNever previously audited."

    return f"""DOCUMENT AUDIT — Evaluative Generator Cycle

Document: {doc['path']}
Description: {doc['description']}
Tier: {doc['tier']} ({"governance" if doc['tier'] == 1 else "architecture" if doc['tier'] == 2 else "operational"})
{history}

Read the document and perform these checks:

{checks}

For each finding, report:
- **Location:** section heading or line range
- **Check type:** which check caught it
- **Finding:** what the problem appears to involve (fair witness — observation, not interpretation)
- **Severity:** HIGH (affects correctness of downstream work) / MEDIUM (creates confusion) / LOW (cosmetic or minor)
- **Suggested fix:** if obvious; otherwise "requires investigation"

If zero findings: report "No findings — document passes audit." This represents a valid outcome, not a failure to detect.

After completing the audit, run:
```bash
python3 scripts/document-audit-generator.py --record \\
    --document "{doc['path']}" --findings <COUNT> --session <CURRENT_SESSION>
```

This records the audit in state.db for rotation tracking.
"""


def record_audit(
    conn: sqlite3.Connection,
    document: str,
    findings: int,
    session_id: int,
) -> None:
    """Record a completed audit."""
    doc_entry = next((d for d in AUDIT_CORPUS if d["path"] == document), None)
    if not doc_entry:
        print(f"WARNING: {document} not in audit corpus — recording anyway")
        tier = 3
        check_types = "unknown"
    else:
        tier = doc_entry["tier"]
        check_types = ",".join(doc_entry["check_types"])

    conn.execute(
        "INSERT INTO document_audits (document_path, tier, check_types, "
        "findings_count, session_id) VALUES (?, ?, ?, ?, ?)",
        (document, tier, check_types, findings, session_id),
    )
    conn.commit()
    print(f"Recorded: {document} — {findings} findings (session {session_id})")


def show_status(conn: sqlite3.Connection) -> None:
    """Show audit rotation status for all corpus documents."""
    print("Document Audit Rotation Status")
    print("=" * 70)
    for doc in AUDIT_CORPUS:
        audit = last_audit(conn, doc["path"])
        exists = (PROJECT_ROOT / doc["path"]).exists()
        if audit:
            status = f"last: {audit['audited_at'][:10]}, {audit['findings_count']} findings"
        elif exists:
            status = "NEVER AUDITED"
        else:
            status = "FILE MISSING"
        print(f"  T{doc['tier']} {doc['path']:<50s} {status}")


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    conn = sqlite3.connect(str(DB_PATH))
    ensure_audit_table(conn)

    if "--status" in sys.argv:
        show_status(conn)
        return

    if "--record" in sys.argv:
        document = None
        findings = 0
        session_id = 0
        args = sys.argv[1:]
        for i, arg in enumerate(args):
            if arg == "--document" and i + 1 < len(args):
                document = args[i + 1]
            elif arg == "--findings" and i + 1 < len(args):
                findings = int(args[i + 1])
            elif arg == "--session" and i + 1 < len(args):
                session_id = int(args[i + 1])

        if not document:
            print("ERROR: --document required", file=sys.stderr)
            sys.exit(1)
        record_audit(conn, document, findings, session_id)
        return

    # Default: select next document and generate audit prompt
    doc = select_next_document(conn)
    if "error" in doc:
        print(doc["error"], file=sys.stderr)
        sys.exit(1)

    prompt = generate_audit_prompt(doc)
    print(prompt)


if __name__ == "__main__":
    main()

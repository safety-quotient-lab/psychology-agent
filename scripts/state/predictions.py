"""
predictions — Efference copy: outbound prediction and inbound comparison.

Aggregate root: prediction_ledger entry (session_id + source_doc).

Spec: docs/efference-copy-spec.md
Derives from: CPG principle 9, brain-architecture-mapping.md §4 (cerebellum)

The agent records an expected response profile when sending outbound transport
messages. When responses arrive, /sync compares actual content against the
expectation and records the outcome. Surprise signals feed the triage scoring
engine — contradictions elevate processing priority, confirmations reduce it.
"""

import json
from .connection import get_connection


# ── Surprise-Driven Triage Score Modifiers ────────────────────────────────
# Spec: docs/efference-copy-spec.md §Surprise-Driven Triage

SURPRISE_MODIFIERS = {
    "confirmed": -15,
    "partially-confirmed": +10,
    "refuted": +25,
    None: 0,  # no expectation recorded
}


def record_expectation(
    *,
    session_id: int,
    expectation: str,
    domain: str,
    likelihood: str,
    source: str,
) -> None:
    """Record an outbound prediction linked to a transport message.

    The source field links this expectation to the outbound message filename
    (e.g., 'from-psychology-agent-003.json'), enabling /sync to look up
    expectations when inbound responses arrive via in_response_to.
    """
    valid_likelihoods = ("likely", "probable", "possible", "uncertain")
    if likelihood not in valid_likelihoods:
        raise ValueError(
            f"likelihood must fall within {valid_likelihoods}, got '{likelihood}'"
        )

    conn = get_connection()
    # Ensure likelihood column exists (migration-safe for pre-v27 databases)
    _ensure_likelihood_column(conn)

    conn.execute("""
        INSERT INTO prediction_ledger
            (session_id, prediction, domain, source_doc, likelihood, outcome)
        VALUES (?, ?, ?, ?, ?, 'untested')
    """, (session_id, expectation, domain, source, likelihood))
    conn.commit()
    conn.close()
    print(f"recorded: prediction_ledger/{source} ({domain}, {likelihood})")


def resolve_expectation(
    *,
    source: str,
    outcome: str,
    detail: str | None = None,
    delta_lesson: str | None = None,
) -> None:
    """Compare an inbound response against the linked expectation.

    Looks up the prediction_ledger entry by source_doc (outbound message
    filename), then records the outcome. Called by /sync Phase 3 when
    processing an inbound message whose in_response_to references an
    outbound message with a linked expectation.
    """
    valid_outcomes = ("confirmed", "partially-confirmed", "refuted")
    if outcome not in valid_outcomes:
        raise ValueError(
            f"outcome must fall within {valid_outcomes}, got '{outcome}'"
        )

    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM prediction_ledger WHERE source_doc = ? AND outcome = 'untested'",
        (source,),
    ).fetchone()

    if not row:
        print(f"warning: no untested expectation found for source '{source}'")
        conn.close()
        return

    conn.execute("""
        UPDATE prediction_ledger
        SET outcome = ?,
            outcome_detail = ?,
            delta_lesson = ?,
            resolved_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE id = ?
    """, (outcome, detail, delta_lesson, row[0]))
    conn.commit()
    conn.close()
    print(f"resolved: prediction_ledger/{source} → {outcome}")


def compute_surprise_score(*, source: str) -> int:
    """Return the triage score modifier for a given outbound message.

    Looks up the prediction_ledger entry by source_doc. Returns:
        -15  if confirmed (expected content needs less scrutiny)
        +10  if partially-confirmed (divergence warrants attention)
        +25  if refuted (surprise signal → fluid processing)
          0  if no expectation recorded

    Called by the crystallized sync triage engine to adjust message scores.
    Output as JSON for shell integration.
    """
    conn = get_connection()
    row = conn.execute(
        "SELECT outcome FROM prediction_ledger WHERE source_doc = ? ORDER BY id DESC LIMIT 1",
        (source,),
    ).fetchone()
    conn.close()

    outcome = row[0] if row else None
    modifier = SURPRISE_MODIFIERS.get(outcome, 0)

    result = {
        "source": source,
        "outcome": outcome,
        "modifier": modifier,
    }
    return result


def _ensure_likelihood_column(conn) -> None:
    """Add likelihood column if missing (migration-safe for pre-v27 databases)."""
    cursor = conn.execute("PRAGMA table_info(prediction_ledger)")
    columns = {row[1] for row in cursor.fetchall()}
    if "likelihood" not in columns:
        conn.execute(
            "ALTER TABLE prediction_ledger ADD COLUMN likelihood TEXT"
        )
        conn.commit()

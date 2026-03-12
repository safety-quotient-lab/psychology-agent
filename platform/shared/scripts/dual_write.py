#!/usr/bin/env python3
"""
dual_write.py — CLI dispatcher for the state layer.

Thin entry point that routes subcommands to domain modules in scripts/state/.
Backward-compatible: all existing CLI invocations continue to work unchanged.

Domain modules (DDD bounded contexts):
    state.transport   — transport-message, mark-processed, next-turn
    state.gates       — gate-open, gate-resolve, gate-timeout, gate-status
    state.knowledge   — memory-entry, session-entry, decision
    state.cogarch     — trigger-fired, lesson
    state.quality     — verify-claim, resolve-flag, engineering-incident, facet, facet-query

Usage unchanged — see each subcommand's --help for details.

Requires: Python 3.10+ (stdlib only)
"""

import argparse
import json
import sys
from pathlib import Path

# Ensure the scripts/ directory sits on sys.path so `state` package resolves
# regardless of the working directory at invocation time.
_SCRIPTS_DIR = str(Path(__file__).parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from state import transport, gates, knowledge, cogarch, quality


# ── CLI → Domain Dispatch ───────────────────────────────────────────────

def cmd_transport_message(args: argparse.Namespace) -> None:
    transport.index_message(
        session=args.session,
        filename=args.filename,
        turn=args.turn,
        message_type=args.type,
        from_agent=args.from_agent,
        to_agent=args.to_agent,
        timestamp=args.timestamp,
        subject=args.subject or "",
        claims_count=args.claims_count or 0,
        setl=args.setl,
        urgency=args.urgency or "normal",
        issue_url=getattr(args, "issue_url", None),
        issue_number=getattr(args, "issue_number", None),
        issue_pending=getattr(args, "issue_pending", False),
        thread_id=getattr(args, "thread_id", None),
        parent_thread_id=getattr(args, "parent_thread_id", None),
        message_cid=getattr(args, "message_cid", None),
        problem_type=getattr(args, "problem_type", None),
        task_state=getattr(args, "task_state", None) or "pending",
        expires_at=getattr(args, "expires_at", None),
    )


def cmd_mark_processed(args: argparse.Namespace) -> None:
    transport.mark_processed(
        filename=args.filename,
        session=args.session,
    )


def cmd_next_turn(args: argparse.Namespace) -> None:
    turn = transport.next_turn(session=args.session)
    print(turn)


def cmd_memory_entry(args: argparse.Namespace) -> None:
    knowledge.upsert_memory(
        topic=args.topic,
        key=args.key,
        value=args.value,
        status=args.status,
        session_id=args.session_id,
    )


def cmd_session_entry(args: argparse.Namespace) -> None:
    knowledge.upsert_session(
        session_id=args.id,
        timestamp=args.timestamp,
        summary=args.summary,
        artifacts=args.artifacts,
        flags=args.flags,
    )


def cmd_decision(args: argparse.Namespace) -> None:
    knowledge.upsert_decision(
        key=args.key,
        text=args.text,
        date=args.date,
        source=args.source,
        confidence=args.confidence,
    )


def cmd_trigger_fired(args: argparse.Namespace) -> None:
    cogarch.fire_trigger(trigger_id=args.trigger_id)


def cmd_lesson(args: argparse.Namespace) -> None:
    cogarch.upsert_lesson(
        title=args.title,
        date=args.date,
        pattern_type=args.pattern_type,
        domain=args.domain,
        severity=args.severity,
        recurrence=args.recurrence or 1,
        trigger_relevant=args.trigger_relevant,
        promotion_status=args.promotion_status,
        lesson_text=args.lesson_text,
    )


def cmd_gate_open(args: argparse.Namespace) -> None:
    gates.open_gate(
        gate_id=args.gate_id,
        sending_agent=args.sending_agent,
        receiving_agent=args.receiving_agent,
        session=args.session,
        filename=args.filename,
        blocks_until=args.blocks_until or "response",
        timeout_minutes=args.timeout_minutes or 60,
        fallback_action=args.fallback_action or "continue-without-response",
    )


def cmd_gate_resolve(args: argparse.Namespace) -> None:
    gates.resolve_gate(gate_id=args.gate_id, resolved_by=args.resolved_by)


def cmd_gate_timeout(args: argparse.Namespace) -> None:
    gates.timeout_gate(gate_id=args.gate_id)


def cmd_gate_status(args: argparse.Namespace) -> None:
    result = gates.query_status(agent_id=args.agent_id)
    print(json.dumps(result, indent=2))


def cmd_engineering_incident(args: argparse.Namespace) -> None:
    quality.record_incident(
        incident_type=args.incident_type,
        description=args.description,
        session_id=args.session_id,
        severity=args.severity or "moderate",
        tool_name=args.tool_name,
        tool_context=args.tool_context,
        detection_tier=args.detection_tier or 1,
    )


def cmd_verify_claim(args: argparse.Namespace) -> None:
    quality.verify_claim(claim_id=args.claim_id, failed=args.failed)


def cmd_resolve_flag(args: argparse.Namespace) -> None:
    quality.resolve_flag(flag_id=args.flag_id, resolved_by=args.resolved_by)


def cmd_facet(args: argparse.Namespace) -> None:
    quality.add_facet(
        entity_type=args.entity_type,
        entity_id=args.entity_id,
        facet_type=args.facet_type,
        facet_value=args.facet_value,
    )


def cmd_facet_query(args: argparse.Namespace) -> None:
    results = quality.query_facets(
        facet_type=args.facet_type,
        facet_value=args.facet_value,
    )
    print(json.dumps(results, indent=2))


# ── Argument Parsing ────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Incremental dual-write to state.db")
    sub = parser.add_subparsers(dest="command", required=True)

    # transport-message
    tp = sub.add_parser("transport-message", help="Index a transport message")
    tp.add_argument("--session", required=True)
    tp.add_argument("--filename", required=True)
    tp.add_argument("--turn", required=True, type=int)
    tp.add_argument("--type", required=True)
    tp.add_argument("--from-agent", required=True)
    tp.add_argument("--to-agent", required=True)
    tp.add_argument("--timestamp", required=True)
    tp.add_argument("--subject")
    tp.add_argument("--claims-count", type=int)
    tp.add_argument("--setl", type=float)
    tp.add_argument("--urgency")
    tp.add_argument("--issue-url", help="GitHub issue URL (triple-write cross-ref)")
    tp.add_argument("--issue-number", type=int, help="GitHub issue number")
    tp.add_argument("--issue-pending", action="store_true",
                    help="Flag for backfill sweep if issue creation failed")
    tp.add_argument("--thread-id", help="Thread ID (defaults to session name)")
    tp.add_argument("--parent-thread-id", help="Parent thread ID for nested threads")
    tp.add_argument("--message-cid", help="Content-addressable ID (auto-computed if omitted)")
    tp.add_argument("--problem-type", choices=["error", "warning", "info"],
                    help="Problem report type (DIDComm-inspired)")
    tp.add_argument("--task-state",
                    choices=["pending", "working", "input-required",
                             "completed", "failed", "canceled", "rejected"],
                    help="Task lifecycle state (A2A-inspired)")
    tp.add_argument("--expires-at", help="ISO 8601 expiration timestamp")

    # mark-processed
    mp = sub.add_parser("mark-processed", help="Mark a transport message as processed")
    mp.add_argument("--session", help="Session name (recommended — disambiguates duplicate filenames)")
    mp.add_argument("--filename", required=True)

    # memory-entry
    me = sub.add_parser("memory-entry", help="Upsert a memory entry")
    me.add_argument("--topic", required=True)
    me.add_argument("--key", required=True)
    me.add_argument("--value", required=True)
    me.add_argument("--status")
    me.add_argument("--session-id", type=int)

    # session-entry
    se = sub.add_parser("session-entry", help="Upsert a session log entry")
    se.add_argument("--id", required=True, type=int)
    se.add_argument("--timestamp", required=True)
    se.add_argument("--summary", required=True)
    se.add_argument("--artifacts")
    se.add_argument("--flags")

    # decision
    dc = sub.add_parser("decision", help="Upsert a design decision")
    dc.add_argument("--key", required=True)
    dc.add_argument("--text", required=True)
    dc.add_argument("--date", required=True)
    dc.add_argument("--source")
    dc.add_argument("--confidence", type=float)

    # trigger-fired
    tf = sub.add_parser("trigger-fired", help="Record a trigger firing")
    tf.add_argument("--trigger-id", required=True)

    # lesson
    ls = sub.add_parser("lesson", help="Upsert a lesson entry")
    ls.add_argument("--title", required=True)
    ls.add_argument("--date", required=True)
    ls.add_argument("--pattern-type")
    ls.add_argument("--domain")
    ls.add_argument("--severity")
    ls.add_argument("--recurrence", type=int)
    ls.add_argument("--trigger-relevant")
    ls.add_argument("--promotion-status")
    ls.add_argument("--lesson-text")

    # gate-open
    go = sub.add_parser("gate-open", help="Open a gated chain")
    go.add_argument("--gate-id", required=True)
    go.add_argument("--sending-agent", required=True)
    go.add_argument("--receiving-agent", required=True)
    go.add_argument("--session", required=True)
    go.add_argument("--filename", required=True)
    go.add_argument("--blocks-until", default="response",
                    choices=["response", "ack", "specific-turn"])
    go.add_argument("--timeout-minutes", type=int, default=60)
    go.add_argument("--fallback-action", default="continue-without-response",
                    choices=["continue-without-response", "retry-once",
                             "halt-and-escalate"])

    # gate-resolve
    gr = sub.add_parser("gate-resolve", help="Resolve a waiting gate")
    gr.add_argument("--gate-id", required=True)
    gr.add_argument("--resolved-by", required=True)

    # gate-timeout
    gt = sub.add_parser("gate-timeout", help="Mark a gate as timed out")
    gt.add_argument("--gate-id", required=True)

    # gate-status
    gs = sub.add_parser("gate-status", help="Show active gates (JSON)")
    gs.add_argument("--agent-id")

    # next-turn
    nt = sub.add_parser("next-turn",
                        help="Print the next available turn number for a session")
    nt.add_argument("--session", required=True)

    # engineering-incident
    ei = sub.add_parser("engineering-incident",
                        help="Record an engineering anti-pattern incident")
    ei.add_argument("--incident-type", required=True,
                    help="Category: credential-exposure, dns-churn, error-loop, "
                         "premature-execution, stale-process")
    ei.add_argument("--description", required=True,
                    help="What happened (fair witness: facts only)")
    ei.add_argument("--session-id", type=int)
    ei.add_argument("--severity", default="moderate",
                    choices=["low", "moderate", "high", "critical"])
    ei.add_argument("--tool-name",
                    help="Tool that triggered detection (e.g., Bash)")
    ei.add_argument("--tool-context",
                    help="Command or context that triggered detection")
    ei.add_argument("--detection-tier", type=int, default=1,
                    choices=[1, 2],
                    help="1=mechanical (hook), 2=cognitive (T17)")

    # verify-claim
    vc = sub.add_parser("verify-claim", help="Mark a claim as verified")
    vc.add_argument("--claim-id", required=True, type=int,
                    help="claims.id to verify")
    vc.add_argument("--failed", action="store_true",
                    help="Mark as failed verification instead of verified")

    # resolve-flag
    rf = sub.add_parser("resolve-flag", help="Mark an epistemic flag as resolved")
    rf.add_argument("--flag-id", required=True, type=int,
                    help="epistemic_flags.id to resolve")
    rf.add_argument("--resolved-by", required=True,
                    help="Resolution source (e.g., session-79, decision-key, manual)")

    # facet
    fa = sub.add_parser("facet", help="Add a universal facet to any entity")
    fa.add_argument("--entity-type", required=True,
                    help="Table name (e.g., transport_messages, decision_chain)")
    fa.add_argument("--entity-id", required=True, type=int,
                    help="Row id in the source table")
    fa.add_argument("--facet-type", required=True,
                    help="Facet type (e.g., pje_domain, domain, agent)")
    fa.add_argument("--facet-value", required=True,
                    help="Facet value (e.g., psychology, jurisprudence)")

    # facet-query
    fq = sub.add_parser("facet-query",
                        help="Query entities by facet type and value (JSON)")
    fq.add_argument("--facet-type", required=True)
    fq.add_argument("--facet-value", required=True)

    args = parser.parse_args()

    dispatch = {
        "transport-message": cmd_transport_message,
        "mark-processed": cmd_mark_processed,
        "memory-entry": cmd_memory_entry,
        "session-entry": cmd_session_entry,
        "decision": cmd_decision,
        "trigger-fired": cmd_trigger_fired,
        "lesson": cmd_lesson,
        "gate-open": cmd_gate_open,
        "gate-resolve": cmd_gate_resolve,
        "gate-timeout": cmd_gate_timeout,
        "gate-status": cmd_gate_status,
        "next-turn": cmd_next_turn,
        "engineering-incident": cmd_engineering_incident,
        "verify-claim": cmd_verify_claim,
        "resolve-flag": cmd_resolve_flag,
        "facet": cmd_facet,
        "facet-query": cmd_facet_query,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()

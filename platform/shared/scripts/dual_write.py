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

from state import transport, gates, knowledge, cogarch, quality, predictions, events


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
        subject=args.subject.strip() if args.subject and args.subject.strip() else f"(derived: {args.session})",
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


def cmd_trigger_activation(args: argparse.Namespace) -> None:
    cogarch.log_activation(
        session_id=args.session_id,
        trigger_id=args.trigger_id,
        check_number=args.check_number,
        tier=args.tier,
        mode=args.mode,
        fired=not args.skipped,
        result=args.result,
        action_taken=args.action_taken,
    )


def cmd_work_carryover(args: argparse.Namespace) -> None:
    cogarch.log_work_carryover(
        session_id=args.session_id,
        work_item=args.work_item,
        status=args.status,
        reason=args.reason,
        sessions_carried=args.sessions_carried or 1,
    )


def cmd_work_resolved(args: argparse.Namespace) -> None:
    cogarch.resolve_work_carryover(
        work_item=args.work_item,
        session_id=args.session_id,
    )


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


def cmd_expect(args: argparse.Namespace) -> None:
    predictions.record_expectation(
        session_id=args.session_id,
        expectation=args.expectation,
        domain=args.domain,
        likelihood=args.likelihood,
        source=args.source,
    )


def cmd_compare(args: argparse.Namespace) -> None:
    predictions.resolve_expectation(
        source=args.source,
        outcome=args.outcome,
        detail=args.detail,
        delta_lesson=args.delta_lesson,
    )


def cmd_surprise_score(args: argparse.Namespace) -> None:
    result = predictions.compute_surprise_score(source=args.source)
    print(json.dumps(result, indent=2))


def cmd_emit(args: argparse.Namespace) -> None:
    payload = json.loads(args.payload)
    a2a = json.loads(args.a2a_snapshot) if args.a2a_snapshot else None
    event_id = events.emit_event(
        event_type=args.event_type,
        category=args.category,
        payload=payload,
        session_id=args.session_id,
        agent_id=args.agent_id or "psychology-agent",
        a2a_snapshot=a2a,
    )
    print(event_id)


def cmd_event_summary(args: argparse.Namespace) -> None:
    result = events.event_summary(session_id=args.session_id)
    print(json.dumps(result, indent=2))


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

    # trigger-activation (metacognitive layer, Phase 8)
    ta = sub.add_parser("trigger-activation", help="Log a trigger check activation")
    ta.add_argument("--session-id", type=int, required=True)
    ta.add_argument("--trigger-id", required=True)
    ta.add_argument("--check-number", type=int)
    ta.add_argument("--tier", required=True, choices=["critical", "advisory", "spot-check"])
    ta.add_argument("--mode", choices=["generative", "evaluative", "neutral"])
    ta.add_argument("--result", choices=["pass", "fail", "skip"])
    ta.add_argument("--action-taken")
    ta.add_argument("--skipped", action="store_true", help="Check was skipped (not fired)")

    # work-carryover (pattern generator for unfinished work)
    wc = sub.add_parser("work-carryover", help="Log work carrying to next session")
    wc.add_argument("--session-id", type=int, required=True)
    wc.add_argument("--work-item", required=True, help="Description of the unfinished work")
    wc.add_argument("--status", required=True, choices=["planned", "in-progress", "blocked", "deferred"])
    wc.add_argument("--reason", help="Why work carries over (context-pressure, session-end, blocked-on, deprioritized)")
    wc.add_argument("--sessions-carried", type=int, default=1)

    # work-resolved
    wr = sub.add_parser("work-resolved", help="Mark carried-over work as completed")
    wr.add_argument("--session-id", type=int, required=True)
    wr.add_argument("--work-item", required=True)

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

    # expect (efference copy: record outbound prediction)
    ex = sub.add_parser("expect",
                        help="Record an outbound prediction (efference copy)")
    ex.add_argument("--session-id", required=True, type=int,
                    help="Session number")
    ex.add_argument("--expectation", required=True,
                    help="Predicted response (natural language)")
    ex.add_argument("--domain", required=True,
                    help="Domain (e.g., operations, psychometrics)")
    ex.add_argument("--likelihood", required=True,
                    choices=["likely", "probable", "possible", "uncertain"],
                    help="Pre-send confidence level")
    ex.add_argument("--source", required=True,
                    help="Outbound transport message filename")

    # compare (efference copy: resolve prediction against inbound response)
    cp = sub.add_parser("compare",
                        help="Compare inbound response against expectation (efference copy)")
    cp.add_argument("--source", required=True,
                    help="Outbound message filename that carried the expectation")
    cp.add_argument("--outcome", required=True,
                    choices=["confirmed", "partially-confirmed", "refuted"],
                    help="Comparison result")
    cp.add_argument("--detail",
                    help="Response content summary for the comparison record")
    cp.add_argument("--delta-lesson",
                    help="Lesson derived from the prediction delta")

    # surprise-score (efference copy: triage modifier lookup)
    ss = sub.add_parser("surprise-score",
                        help="Compute surprise-driven triage modifier (JSON)")
    ss.add_argument("--source", required=True,
                    help="Outbound message filename to check for expectations")

    # emit (event-sourced memory: write episodic event)
    em = sub.add_parser("emit",
                        help="Emit an event to event_log (hippocampal encoding)")
    em.add_argument("--event-type", required=True,
                    help="Event type (e.g., trigger_fired, message_sent)")
    em.add_argument("--category", required=True,
                    choices=["governance", "transport", "state", "self_model", "mesh"],
                    help="Event category")
    em.add_argument("--payload", required=True,
                    help="JSON payload string")
    em.add_argument("--session-id", type=int,
                    help="Session number")
    em.add_argument("--agent-id", default="psychology-agent",
                    help="Emitting agent identifier")
    em.add_argument("--a2a-snapshot",
                    help="JSON A2A-Psychology snapshot (hedonic_valence, activation, etc.)")

    # event-summary (event-sourced memory: counts by category/type)
    es = sub.add_parser("event-summary",
                        help="Show event counts by category and type (JSON)")
    es.add_argument("--session-id", type=int,
                    help="Filter to a specific session")

    args = parser.parse_args()

    dispatch = {
        "transport-message": cmd_transport_message,
        "mark-processed": cmd_mark_processed,
        "memory-entry": cmd_memory_entry,
        "session-entry": cmd_session_entry,
        "decision": cmd_decision,
        "trigger-fired": cmd_trigger_fired,
        "trigger-activation": cmd_trigger_activation,
        "work-carryover": cmd_work_carryover,
        "work-resolved": cmd_work_resolved,
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
        "expect": cmd_expect,
        "compare": cmd_compare,
        "surprise-score": cmd_surprise_score,
        "emit": cmd_emit,
        "event-summary": cmd_event_summary,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()

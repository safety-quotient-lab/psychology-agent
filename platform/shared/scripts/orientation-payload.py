#!/usr/bin/env python3
"""
orientation-payload.py — Generate compact context from state.db for autonomous sessions.

Produces a structured text summary that replaces reading 15+ markdown files.
Designed for injection into `claude -p` prompts during autonomous sync cycles.

Usage:
    python3 scripts/orientation-payload.py
    python3 scripts/orientation-payload.py --agent-id psq-agent
    python3 scripts/orientation-payload.py --post-triage   # after crystallized sync ran
"""
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"
LOCAL_DB_PATH = PROJECT_ROOT / "state.local.db"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"


def get_conn() -> sqlite3.Connection:
    if not DB_PATH.exists():
        print("ERROR: state.db not found", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_local_conn() -> sqlite3.Connection | None:
    """Connect to state.local.db (budget, actions, disclosures). Returns None if missing."""
    if not LOCAL_DB_PATH.exists():
        return None
    conn = sqlite3.connect(str(LOCAL_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def load_identity() -> dict:
    """Load agent identity from .agent-identity.json, fall back to defaults."""
    if IDENTITY_PATH.exists():
        with open(IDENTITY_PATH) as fh:
            return json.load(fh)
    return {
        "agent_id": "psychology-agent",
        "hostname": "unknown",
        "platform": "unknown",
        "note": "no .agent-identity.json found — using defaults",
    }


def recent_sessions(conn: sqlite3.Connection, limit: int = 5) -> list[dict]:
    rows = conn.execute(
        "SELECT id, timestamp, summary, epistemic_flags "
        "FROM session_log ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def unprocessed_messages(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT session_name, filename, turn, message_type, from_agent, "
        "to_agent, subject, setl, urgency "
        "FROM transport_messages WHERE processed = FALSE "
        "ORDER BY timestamp DESC",
    ).fetchall()
    return [dict(r) for r in rows]


def triage_summary(conn: sqlite3.Connection) -> dict:
    """Return triage disposition counts and substance queue after crystallized pre-processing."""
    result = {"dispositions": {}, "substance_queue": [], "pre_processed": []}

    # Disposition counts (including already-processed auto-skip/auto-ack)
    rows = conn.execute(
        "SELECT triage_disposition, COUNT(*) as cnt "
        "FROM transport_messages "
        "WHERE triage_disposition IS NOT NULL "
        "AND triage_at IS NOT NULL "
        "GROUP BY triage_disposition"
    ).fetchall()
    for r in rows:
        result["dispositions"][r["triage_disposition"]] = r["cnt"]

    # Substance queue: needs-llm messages still unprocessed
    substance = conn.execute(
        "SELECT session_name, filename, triage_score, message_type, "
        "from_agent, subject, urgency "
        "FROM transport_messages "
        "WHERE triage_disposition = 'needs-llm' AND processed = FALSE "
        "ORDER BY triage_score DESC"
    ).fetchall()
    result["substance_queue"] = [dict(r) for r in substance]

    # Pre-processed this cycle: auto-skip + auto-ack that triage handled
    pre = conn.execute(
        "SELECT triage_disposition, COUNT(*) as cnt, "
        "GROUP_CONCAT(DISTINCT message_type) as types "
        "FROM transport_messages "
        "WHERE triage_disposition IN ('auto-skip', 'auto-ack', 'auto-record') "
        "AND triage_at IS NOT NULL "
        "AND processed = TRUE "
        "ORDER BY triage_disposition"
    ).fetchall()
    result["pre_processed"] = [dict(r) for r in pre]

    return result


def open_claims(conn: sqlite3.Connection, limit: int = 10) -> list[dict]:
    rows = conn.execute(
        "SELECT c.claim_id, c.claim_text, c.confidence, t.from_agent, "
        "t.session_name "
        "FROM claims c JOIN transport_messages t ON c.transport_msg = t.id "
        "WHERE c.verified = FALSE "
        "ORDER BY c.confidence ASC LIMIT ?",
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def unresolved_flags(conn: sqlite3.Connection, limit: int = 10) -> list[dict]:
    rows = conn.execute(
        "SELECT session_id, source, flag_text "
        "FROM epistemic_flags WHERE resolved = FALSE "
        "ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def active_decisions(conn: sqlite3.Connection, limit: int = 10) -> list[dict]:
    rows = conn.execute(
        "SELECT decision_key, decision_text, decided_date, confidence "
        "FROM decision_chain ORDER BY decided_date DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def autonomy_budget_status(conn: sqlite3.Connection, agent_id: str) -> dict | None:
    """Query autonomy budget from state.local.db (DB split, Session 80)."""
    local_conn = get_local_conn()
    if local_conn is None:
        return None
    try:
        row = local_conn.execute(
            "SELECT * FROM autonomy_budget WHERE agent_id = ?", (agent_id,)
        ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None
    finally:
        local_conn.close()


def stale_memory(conn: sqlite3.Connection, days_threshold: int = 5) -> list[dict]:
    rows = conn.execute(
        "SELECT topic, entry_key, last_confirmed, "
        "CAST(julianday('now') - julianday(last_confirmed) AS INTEGER) "
        "AS days_stale "
        "FROM memory_entries "
        "WHERE last_confirmed IS NOT NULL "
        "AND julianday('now') - julianday(last_confirmed) > ? "
        "ORDER BY days_stale DESC LIMIT 10",
        (days_threshold,),
    ).fetchall()
    return [dict(r) for r in rows]


def trigger_summary(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT trigger_id, description, fire_count, last_fired "
        "FROM trigger_state ORDER BY trigger_id",
    ).fetchall()
    return [dict(r) for r in rows]


def waiting_gates(conn: sqlite3.Connection, agent_id: str) -> list[dict]:
    try:
        rows = conn.execute(
            "SELECT gate_id, sending_agent, receiving_agent, session_name, "
            "blocks_until, timeout_minutes, fallback_action, "
            "created_at, timeout_at "
            "FROM pending_handoffs "
            "WHERE status = 'waiting' "
            "AND (sending_agent = ? OR receiving_agent = ?) "
            "ORDER BY created_at",
            (agent_id, agent_id),
        ).fetchall()
        return [dict(r) for r in rows]
    except sqlite3.OperationalError:
        return []


def format_payload(
    identity: dict,
    sessions: list,
    messages: list,
    claims: list,
    flags: list,
    decisions: list,
    budget: dict | None,
    stale: list,
    gates: list | None = None,
    triage: dict | None = None,
) -> str:
    lines = []
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    lines.append("# Autonomous Sync Orientation")
    lines.append(f"Generated: {now}")
    lines.append(f"Agent: {identity['agent_id']}")
    lines.append(f"Host: {identity.get('hostname', 'unknown')}")
    lines.append(f"Platform: {identity.get('platform', 'unknown')}")
    lines.append("")

    # Trust budget
    lines.append("## Autonomy Budget")
    if budget:
        cutoff = budget.get("budget_cutoff", 0)
        spent = budget.get("budget_spent", 0)
        if cutoff == 0:
            status = "UNLIMITED"
        elif spent >= cutoff:
            status = "HALTED"
        else:
            status = "ACTIVE"
        lines.append(
            f"  {spent}/{cutoff} spent [{status}]"
        )
        lines.append(f"  Last audit: {budget['last_audit']}")
        lines.append(
            f"  Consecutive blocks: {budget['consecutive_blocks']}"
        )
        shadow = "ON" if budget.get("shadow_mode", 1) else "OFF"
        lines.append(f"  Shadow mode: {shadow}")
    else:
        lines.append("  No budget entry — first run will initialize.")
    lines.append("")

    # Active gates (gated autonomous chains)
    if gates:
        lines.append(f"## Active Gates ({len(gates)}) — ACCELERATED POLLING")
        for gate in gates:
            role = "SENDER" if gate["sending_agent"] == identity["agent_id"] else "RECEIVER"
            peer = gate["receiving_agent"] if role == "SENDER" else gate["sending_agent"]
            lines.append(
                f"  [{role}] {gate['gate_id']} → {peer}"
            )
            lines.append(
                f"    Session: {gate['session_name']}, "
                f"blocks_until: {gate['blocks_until']}, "
                f"timeout: {gate['timeout_at']}"
            )
            lines.append(
                f"    Fallback: {gate['fallback_action']}"
            )
        lines.append("")

    # Recent sessions
    lines.append(f"## Recent Sessions (last {len(sessions)})")
    for sess in sessions:
        flag_marker = " ⚑" if sess.get("epistemic_flags") else ""
        lines.append(f"  S{sess['id']}: {sess['summary'][:80]}{flag_marker}")
    lines.append("")

    # Unprocessed messages — triage-aware when post-triage data available
    if triage and triage.get("substance_queue") is not None:
        # Crystallized sync ran: show pre-processed summary + substance queue
        disps = triage.get("dispositions", {})
        pre = triage.get("pre_processed", [])
        queue = triage.get("substance_queue", [])

        lines.append("## Pre-processed (crystallized)")
        if pre:
            for p in pre:
                lines.append(
                    f"  {p['cnt']} messages {p['triage_disposition']} "
                    f"({p.get('types', 'mixed')})"
                )
        else:
            lines.append("  None this cycle.")
        lines.append("")

        lines.append(f"## Substance Queue ({len(queue)} needs your review)")
        if queue:
            for msg in queue:
                lines.append(
                    f"  [{msg.get('urgency', 'normal')}] "
                    f"{msg['session_name']}/{msg['filename']} "
                    f"(score: {msg['triage_score']})"
                )
                lines.append(
                    f"    {msg.get('message_type', '?')} from "
                    f"{msg['from_agent']}: "
                    f"{(msg.get('subject') or 'no subject')[:70]}"
                )
        else:
            lines.append("  None — all messages handled deterministically.")
        lines.append("")
    else:
        # Legacy path: no triage data, show raw unprocessed
        lines.append(f"## Unprocessed Messages ({len(messages)})")
        if messages:
            for msg in messages:
                lines.append(
                    f"  [{msg['urgency']}] {msg['session_name']}/{msg['filename']}"
                )
                lines.append(
                    f"    {msg['message_type']} from {msg['from_agent']}: "
                    f"{(msg.get('subject') or 'no subject')[:70]}"
                )
        else:
            lines.append("  None — mesh quiescent.")
        lines.append("")

    # Unverified claims (lowest confidence first)
    if claims:
        lines.append(f"## Unverified Claims (lowest confidence, max {len(claims)})")
        for claim in claims:
            conf = claim['confidence']
            conf_str = f"{conf:.2f}" if conf is not None else "?"
            lines.append(
                f"  [{conf_str}] {claim['from_agent']}/"
                f"{claim['session_name']}: {claim['claim_text'][:70]}"
            )
        lines.append("")

    # Unresolved epistemic flags
    if flags:
        lines.append(f"## Unresolved Epistemic Flags ({len(flags)})")
        for flag in flags:
            source = flag.get("source", "unknown")
            lines.append(f"  S{flag.get('session_id', '?')} [{source}]: "
                         f"{flag['flag_text'][:70]}")
        lines.append("")

    # Recent decisions
    lines.append(f"## Recent Decisions (last {len(decisions)})")
    for dec in decisions:
        conf = f" [{dec['confidence']:.2f}]" if dec.get("confidence") else ""
        lines.append(
            f"  {dec['decided_date']} {dec['decision_key']}: "
            f"{dec['decision_text'][:60]}{conf}"
        )
    lines.append("")

    # Stale memory
    if stale:
        lines.append(f"## Stale Memory Entries ({len(stale)})")
        for entry in stale:
            lines.append(
                f"  {entry['topic']}/{entry['entry_key']}: "
                f"{entry['days_stale']}d since confirmed"
            )
        lines.append("")

    # Equal Information Channel — disclosure summary (Phase 5)
    # Shows disclosure counts since last audit. Zero governance cost.
    try:
        if LOCAL_DB_PATH.exists():
            import sqlite3 as sqlite
            local_conn = sqlite.connect(str(LOCAL_DB_PATH))
            local_conn.row_factory = sqlite.Row
            last_audit = budget["last_audit"] if budget else "1970-01-01"
            disc_rows = local_conn.execute(
                "SELECT category, COUNT(*) as cnt "
                "FROM agent_disclosures "
                "WHERE agent_id = ? AND created_at > ? "
                "GROUP BY category ORDER BY cnt DESC",
                (identity["agent_id"], last_audit),
            ).fetchall()
            disc_total = sum(r["cnt"] for r in disc_rows)
            if disc_total > 0:
                lines.append(f"## Information Channel ({disc_total} disclosures since audit)")
                for r in disc_rows:
                    lines.append(f"  [{r['category']}] {r['cnt']}")
                # Most recent disclosure
                recent = local_conn.execute(
                    "SELECT category, content, created_at "
                    "FROM agent_disclosures "
                    "WHERE agent_id = ? AND created_at > ? "
                    "ORDER BY created_at DESC LIMIT 1",
                    (identity["agent_id"], last_audit),
                ).fetchone()
                if recent:
                    trunc = recent["content"][:80]
                    lines.append(f"  Most recent [{recent['category']}]: {trunc}")
                lines.append("  Use `agentdb disclose` to add zero-cost disclosures.")
                lines.append("")
            local_conn.close()
    except Exception:
        pass  # Non-fatal — EIC summary optional in orientation

    return "\n".join(lines)


def cache_path(agent_id: str) -> Path:
    """Return the path to the cached orientation payload for this agent."""
    import tempfile
    return Path(tempfile.gettempdir()) / f"orientation-{agent_id}.cache"


def cache_valid(agent_id: str) -> bool:
    """Check if the cached payload remains fresh.

    Fresh means: cache file exists AND state.db has not changed since
    the cache was written. This avoids redundant SQL queries when
    autonomous-sync.sh calls the script on a quiescent mesh.
    """
    cached = cache_path(agent_id)
    if not cached.exists():
        return False
    try:
        cache_mtime = cached.stat().st_mtime
        db_mtime = DB_PATH.stat().st_mtime
        return db_mtime < cache_mtime
    except OSError:
        return False


def main() -> None:
    agent_id = "psychology-agent"

    # Parse --agent-id flag
    if "--agent-id" in sys.argv:
        idx = sys.argv.index("--agent-id")
        if idx + 1 < len(sys.argv):
            agent_id = sys.argv[idx + 1]

    # --no-cache flag bypasses the mtime guard
    use_cache = "--no-cache" not in sys.argv

    # Identity file overrides default, CLI flag overrides identity file
    identity = load_identity()
    if "--agent-id" in sys.argv:
        identity["agent_id"] = agent_id
    else:
        agent_id = identity.get("agent_id", agent_id)

    # Serve from cache if state.db unchanged since last generation
    if use_cache and cache_valid(agent_id):
        print(cache_path(agent_id).read_text(), end="")
        return

    # --post-triage reads triage dispositions instead of raw unprocessed list
    post_triage = "--post-triage" in sys.argv

    conn = get_conn()

    triage_data = triage_summary(conn) if post_triage else None

    payload = format_payload(
        identity=identity,
        sessions=recent_sessions(conn),
        messages=unprocessed_messages(conn),
        claims=open_claims(conn),
        flags=unresolved_flags(conn),
        decisions=active_decisions(conn),
        budget=autonomy_budget_status(conn, agent_id),
        stale=stale_memory(conn),
        gates=waiting_gates(conn, agent_id),
        triage=triage_data,
    )

    print(payload)
    conn.close()

    # Write cache for next invocation
    if use_cache:
        cache_path(agent_id).write_text(payload)


if __name__ == "__main__":
    main()

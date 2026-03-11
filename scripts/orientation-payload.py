#!/usr/bin/env python3
"""
orientation-payload.py — Generate compact context from state.db for autonomous sessions.

Produces a structured text summary that replaces reading 15+ markdown files.
Designed for injection into `claude -p` prompts during autonomous sync cycles.

Usage:
    python3 scripts/orientation-payload.py
    python3 scripts/orientation-payload.py --agent-id psq-sub-agent
"""
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
IDENTITY_PATH = PROJECT_ROOT / ".agent-identity.json"


def get_conn() -> sqlite3.Connection:
    if not DB_PATH.exists():
        print("ERROR: state.db not found", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(str(DB_PATH))
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


def trust_budget_status(conn: sqlite3.Connection, agent_id: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM trust_budget WHERE agent_id = ?", (agent_id,)
    ).fetchone()
    return dict(row) if row else None


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
            "FROM active_gates "
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
    lines.append("## Trust Budget")
    if budget:
        status = "ACTIVE" if budget["budget_current"] > 0 else "HALTED"
        lines.append(
            f"  {budget['budget_current']}/{budget['budget_max']} credits [{status}]"
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

    # Unprocessed messages
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
            lines.append(
                f"  [{claim['confidence']:.2f}] {claim['from_agent']}/"
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

    conn = get_conn()

    payload = format_payload(
        identity=identity,
        sessions=recent_sessions(conn),
        messages=unprocessed_messages(conn),
        claims=open_claims(conn),
        flags=unresolved_flags(conn),
        decisions=active_decisions(conn),
        budget=trust_budget_status(conn, agent_id),
        stale=stale_memory(conn),
        gates=waiting_gates(conn, agent_id),
    )

    print(payload)
    conn.close()

    # Write cache for next invocation
    if use_cache:
        cache_path(agent_id).write_text(payload)


if __name__ == "__main__":
    main()

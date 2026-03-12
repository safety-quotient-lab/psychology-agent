#!/usr/bin/env python3
"""triple_write.py — Coordinated three-layer write for interagent messages.

Ensures every interagent message produces all three artifacts in lockstep:
  1. Transport JSON file (9P filesystem — source of truth)
  2. state.db row via dual_write.py (queryable index)
  3. GitHub Issue via issue_lifecycle.py (human visibility layer)

Write order: JSON → DB → Issue. If issue creation fails, the message
persists in layers 1+2 with issue_pending=1 for backfill sweep.

Trivial message types (ack, notification, state-update) skip issue
creation to avoid spam — they write layers 1+2 only.

Usage:
    # Record an inbound message (JSON already materialized by cross_repo_fetch)
    python3 scripts/triple_write.py inbound \
        --session self-readiness-audit \
        --filename from-observatory-agent-001.json \
        --repo safety-quotient-lab/psychology-agent

    # Backfill missing issues for messages with issue_pending=1
    python3 scripts/triple_write.py backfill \
        --repo safety-quotient-lab/psychology-agent \
        --limit 5

    # Verify parity across all three layers for a session
    python3 scripts/triple_write.py verify \
        --session self-readiness-audit \
        --repo safety-quotient-lab/psychology-agent

    # Update issue cross-reference on an existing transport_messages row
    python3 scripts/triple_write.py link-issue \
        --session SESSION --filename FILE \
        --issue-url URL --issue-number N

Environment:
    PROJECT_ROOT — agent repo root (required for symlinked scripts)
    MESH_BOT_PEM — path to GitHub App private key
                   (default: ~/.config/safety-quotient/mesh-bot.pem)
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

# Message types that skip issue creation (from auto_process_trivial.py)
TRIVIAL_TYPES = ("ack", "notification", "state-update")


def _find_project_root() -> Path:
    """Resolve project root, safe for symlinked shared scripts."""
    env = os.environ.get("PROJECT_ROOT")
    if env:
        return Path(env)
    candidate = Path(__file__).absolute().parent
    for _ in range(5):
        if (candidate / "state.db").exists() or (candidate / ".agent-identity.json").exists():
            return candidate
        candidate = candidate.parent
    return Path(__file__).resolve().parent.parent


PROJECT_ROOT = _find_project_root()
DB_PATH = PROJECT_ROOT / "state.db"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"


def _get_connection() -> sqlite3.Connection:
    """Connect to state.db."""
    if not DB_PATH.exists():
        print(f"ERROR: state.db not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # Ensure v18 columns exist
    for col, col_type, default in [
        ("issue_url", "TEXT", "NULL"),
        ("issue_number", "INTEGER", "NULL"),
        ("issue_pending", "INTEGER", "0"),
    ]:
        try:
            conn.execute(
                f"ALTER TABLE transport_messages ADD COLUMN {col} {col_type} DEFAULT {default}"
            )
        except sqlite3.OperationalError:
            pass
    return conn


def _read_transport_json(session: str, filename: str) -> dict | None:
    """Read the transport JSON file from the 9P filesystem."""
    filepath = PROJECT_ROOT / "transport" / "sessions" / session / filename
    if not filepath.exists():
        return None
    with open(filepath) as f:
        return json.load(f)


def _create_issue(repo: str, session: str, filename: str,
                  msg_data: dict) -> tuple[str | None, int | None]:
    """Create a GitHub Issue for a transport message via issue_lifecycle.py.

    Returns (issue_url, issue_number) or (None, None) on failure.
    """
    from_agent = msg_data.get("from", {}).get("agent_id", "unknown")
    to_agent = msg_data.get("to", {}).get("agent_id", "unknown")
    payload = msg_data.get("payload", msg_data.get("content", {}))
    subject = payload.get("subject", "(no subject)")
    message_type = msg_data.get("message_type", "unknown")
    turn = msg_data.get("turn", "?")
    timestamp = msg_data.get("timestamp", "")
    setl = msg_data.get("setl", "")
    urgency = msg_data.get("urgency", "normal")

    # Build claims summary
    claims = msg_data.get("claims", [])
    claims_section = "No claims in this message"
    if claims:
        lines = [f"- **{c.get('claim_id', '?')}**: {c.get('text', c.get('claim_text', ''))}"
                 for c in claims[:10]]
        claims_section = "\n".join(lines)

    # Direction emoji
    direction = "⬅" if filename.startswith("from-") else "➡"

    title = f"[{session}] {direction} {from_agent} → {to_agent}: {subject}"
    # Truncate title to 256 chars (GitHub limit)
    if len(title) > 256:
        title = title[:253] + "..."

    body = f"""## Transport Message: {session}/turn {turn}

**From:** {from_agent}
**To:** {to_agent}
**Type:** {message_type}
**Timestamp:** {timestamp}
**SETL:** {setl}
**Urgency:** {urgency}

### Subject
{subject}

### References
- **Transport file:** `transport/sessions/{session}/{filename}`
- **In response to:** {msg_data.get('in_response_to', 'N/A')}

### Claims ({len(claims)})
{claims_section}

---
*Auto-generated by triple_write.py via safety-quotient-mesh-bot*"""

    labels = f"transport,transport:{session}"

    # Call issue_lifecycle.py create
    lifecycle_script = SCRIPTS_DIR / "issue_lifecycle.py"
    if not lifecycle_script.exists():
        # Try shared scripts path
        lifecycle_script = PROJECT_ROOT / "platform" / "shared" / "scripts" / "issue_lifecycle.py"
    if not lifecycle_script.exists():
        print(f"WARNING: issue_lifecycle.py not found, skipping issue creation",
              file=sys.stderr)
        return None, None

    result = subprocess.run(
        [sys.executable, str(lifecycle_script), "create",
         "--repo", repo,
         "--title", title,
         "--body", body,
         "--labels", labels],
        capture_output=True, text=True, timeout=30
    )

    if result.returncode != 0:
        print(f"WARNING: issue creation failed: {result.stderr[:200]}",
              file=sys.stderr)
        return None, None

    # Parse issue URL and number from output
    for line in result.stdout.strip().split("\n"):
        if line.startswith("Created:"):
            url = line.split("Created:", 1)[1].strip()
            # Extract issue number from URL
            try:
                number = int(url.rstrip("/").split("/")[-1])
                return url, number
            except (ValueError, IndexError):
                return url, None

    return None, None


def _update_issue_ref(conn: sqlite3.Connection, session: str, filename: str,
                      issue_url: str | None, issue_number: int | None) -> None:
    """Update the issue cross-reference on a transport_messages row."""
    if issue_url:
        conn.execute(
            "UPDATE transport_messages SET issue_url = ?, issue_number = ?, issue_pending = 0 "
            "WHERE session_name = ? AND filename = ?",
            (issue_url, issue_number, session, filename)
        )
    else:
        conn.execute(
            "UPDATE transport_messages SET issue_pending = 1 "
            "WHERE session_name = ? AND filename = ?",
            (session, filename)
        )
    conn.commit()


# ── Subcommands ─────────────────────────────────────────────────────────


def cmd_inbound(args: argparse.Namespace) -> None:
    """Record an inbound message: index in state.db + create GitHub Issue.

    The transport JSON file already exists (materialized by cross_repo_fetch).
    This command writes layers 2 (state.db) and 3 (GitHub Issue).
    """
    msg_data = _read_transport_json(args.session, args.filename)
    if not msg_data:
        print(f"ERROR: transport file not found: {args.session}/{args.filename}",
              file=sys.stderr)
        sys.exit(1)

    # Extract metadata from JSON
    from_block = msg_data.get("from", {})
    to_block = msg_data.get("to", {})
    payload = msg_data.get("payload", msg_data.get("content", {}))
    message_type = msg_data.get("message_type", "unknown")

    # Layer 2: state.db via dual_write
    dual_write = SCRIPTS_DIR / "dual_write.py"
    if not dual_write.exists():
        dual_write = PROJECT_ROOT / "platform" / "shared" / "scripts" / "dual_write.py"

    dw_cmd = [
        sys.executable, str(dual_write), "transport-message",
        "--session", args.session,
        "--filename", args.filename,
        "--turn", str(msg_data.get("turn", 0)),
        "--type", message_type,
        "--from-agent", from_block.get("agent_id", "unknown"),
        "--to-agent", to_block.get("agent_id", "unknown"),
        "--timestamp", msg_data.get("timestamp", ""),
        "--subject", payload.get("subject", ""),
        "--claims-count", str(len(msg_data.get("claims", []))),
    ]
    if msg_data.get("setl") is not None:
        dw_cmd.extend(["--setl", str(msg_data["setl"])])
    if msg_data.get("urgency"):
        dw_cmd.extend(["--urgency", msg_data["urgency"]])

    subprocess.run(dw_cmd, capture_output=True, text=True)

    # Layer 3: GitHub Issue (skip for trivial types)
    if message_type in TRIVIAL_TYPES:
        print(f"trivial type '{message_type}' — skipping issue creation")
        return

    issue_url, issue_number = _create_issue(
        args.repo, args.session, args.filename, msg_data
    )

    # Update cross-reference in state.db
    conn = _get_connection()
    _update_issue_ref(conn, args.session, args.filename, issue_url, issue_number)
    conn.close()

    if issue_url:
        print(f"triple-write complete: {args.filename} → {issue_url}")
    else:
        print(f"partial write (issue pending): {args.filename}")


def cmd_backfill(args: argparse.Namespace) -> None:
    """Create GitHub Issues for messages with issue_pending=1."""
    conn = _get_connection()
    rows = conn.execute(
        "SELECT session_name, filename, message_type FROM transport_messages "
        "WHERE issue_pending = 1 AND issue_url IS NULL "
        "ORDER BY created_at ASC LIMIT ?",
        (args.limit,)
    ).fetchall()

    if not rows:
        print("No pending issues to backfill")
        conn.close()
        return

    created = 0
    for row in rows:
        session = row["session_name"]
        filename = row["filename"]
        msg_type = row["message_type"]

        if msg_type in TRIVIAL_TYPES:
            # Clear pending flag — trivial types don't need issues
            conn.execute(
                "UPDATE transport_messages SET issue_pending = 0 "
                "WHERE session_name = ? AND filename = ?",
                (session, filename)
            )
            conn.commit()
            continue

        msg_data = _read_transport_json(session, filename)
        if not msg_data:
            print(f"  skip (file missing): {session}/{filename}", file=sys.stderr)
            continue

        issue_url, issue_number = _create_issue(
            args.repo, session, filename, msg_data
        )
        _update_issue_ref(conn, session, filename, issue_url, issue_number)

        if issue_url:
            print(f"  backfilled: {filename} → {issue_url}")
            created += 1
        else:
            print(f"  failed: {filename} (will retry next sweep)")

    conn.close()
    print(f"Backfill complete: {created}/{len(rows)} issues created")


def cmd_verify(args: argparse.Namespace) -> None:
    """Verify parity across all three layers for a session."""
    session = args.session

    # Layer 1: Transport JSON files on disk
    session_dir = PROJECT_ROOT / "transport" / "sessions" / session
    json_files = sorted(f.name for f in session_dir.glob("*.json")
                        if f.name != "MANIFEST.json") if session_dir.exists() else []

    # Layer 2: state.db rows
    conn = _get_connection()
    db_rows = conn.execute(
        "SELECT filename, issue_url, issue_number, issue_pending, message_type "
        "FROM transport_messages WHERE session_name = ? ORDER BY filename",
        (session,)
    ).fetchall()
    db_files = [r["filename"] for r in db_rows]

    # Layer 3: GitHub Issues (from state.db cross-ref)
    issues_linked = [r for r in db_rows if r["issue_url"]]
    issues_pending = [r for r in db_rows if r["issue_pending"] == 1]
    trivial_skip = [r for r in db_rows if r["message_type"] in TRIVIAL_TYPES]

    # Report
    print(f"\n  Parity Report: {session}")
    print(f"  {'─' * 50}")
    print(f"  Layer 1 (JSON files):   {len(json_files)}")
    print(f"  Layer 2 (state.db):     {len(db_files)}")
    print(f"  Layer 3 (GH Issues):    {len(issues_linked)}")
    print(f"  Trivial (no issue):     {len(trivial_skip)}")
    print(f"  Issue pending:          {len(issues_pending)}")

    # Discrepancies
    json_set = set(json_files)
    db_set = set(db_files)
    only_disk = json_set - db_set
    only_db = db_set - json_set

    if only_disk:
        print(f"\n  ⚠ On disk but not in DB: {', '.join(sorted(only_disk))}")
    if only_db:
        print(f"\n  ⚠ In DB but not on disk: {', '.join(sorted(only_db))}")

    substantive = len(db_rows) - len(trivial_skip)
    expected_issues = substantive
    actual_issues = len(issues_linked)
    if actual_issues < expected_issues:
        gap = expected_issues - actual_issues
        print(f"\n  ⚠ Issue gap: {gap} substantive messages lack GitHub Issues")
        if issues_pending:
            print(f"    ({len(issues_pending)} flagged for backfill)")

    if not only_disk and not only_db and actual_issues >= expected_issues:
        print(f"\n  ✓ All three layers at parity")

    conn.close()


def cmd_link_issue(args: argparse.Namespace) -> None:
    """Manually link an existing GitHub Issue to a transport message."""
    conn = _get_connection()
    _update_issue_ref(conn, args.session, args.filename,
                      args.issue_url, args.issue_number)
    conn.close()
    print(f"linked: {args.session}/{args.filename} → {args.issue_url}")


# ── Main ────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Triple-write: transport JSON + state.db + GitHub Issue"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # inbound
    p_in = sub.add_parser("inbound",
                          help="Index inbound message in DB + create Issue")
    p_in.add_argument("--session", required=True)
    p_in.add_argument("--filename", required=True)
    p_in.add_argument("--repo", required=True,
                      help="GitHub repo (e.g., safety-quotient-lab/psychology-agent)")

    # backfill
    p_bf = sub.add_parser("backfill",
                          help="Create Issues for messages with issue_pending=1")
    p_bf.add_argument("--repo", required=True)
    p_bf.add_argument("--limit", type=int, default=5,
                      help="Max issues to create per sweep (rate limit protection)")

    # verify
    p_vf = sub.add_parser("verify",
                          help="Verify parity across all three layers")
    p_vf.add_argument("--session", required=True)
    p_vf.add_argument("--repo", default="",
                      help="GitHub repo (for issue count verification)")

    # link-issue
    p_li = sub.add_parser("link-issue",
                          help="Manually link a GitHub Issue to a transport message")
    p_li.add_argument("--session", required=True)
    p_li.add_argument("--filename", required=True)
    p_li.add_argument("--issue-url", required=True)
    p_li.add_argument("--issue-number", required=True, type=int)

    args = parser.parse_args()
    dispatch = {
        "inbound": cmd_inbound,
        "backfill": cmd_backfill,
        "verify": cmd_verify,
        "link-issue": cmd_link_issue,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()

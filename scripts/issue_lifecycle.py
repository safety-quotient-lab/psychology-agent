#!/usr/bin/env python3
"""issue_lifecycle.py — Manage GitHub issue lifecycle for automated workflows.

Creates, updates, and closes GitHub issues to track automated workflow
milestones (blog pipelines, sync cycles, gate resolutions).

Uses the same mesh-bot GitHub App as escalate.py.

Usage:
    # Create a workflow tracking issue
    python3 scripts/issue_lifecycle.py create \
        --repo safety-quotient-lab/unratified \
        --title "Blog pipeline: ICESCR cost analysis" \
        --body "5 persona posts requested by psychology-agent" \
        --labels "workflow,blog-pipeline"

    # Update with progress
    python3 scripts/issue_lifecycle.py update \
        --repo safety-quotient-lab/unratified \
        --issue 42 \
        --comment "3/5 persona posts published (voter, politician, educator)"

    # Close when complete
    python3 scripts/issue_lifecycle.py close \
        --repo safety-quotient-lab/unratified \
        --issue 42 \
        --comment "All 5 persona posts published and deployed"

    # Close all resolved escalations
    python3 scripts/issue_lifecycle.py close-resolved \
        --repo safety-quotient-lab/psychology-agent

    # List open workflow issues
    python3 scripts/issue_lifecycle.py list \
        --repo safety-quotient-lab/psychology-agent

Environment:
    MESH_BOT_PEM — path to the GitHub App private key
                   (default: ~/.config/safety-quotient/mesh-bot.pem)
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

APP_ID = "3060729"
INSTALLATION_ID = "115481120"
DEFAULT_PEM = Path.home() / ".config/safety-quotient/mesh-bot.pem"
PROJECT_ROOT = Path(
    os.environ.get("PROJECT_ROOT", Path(__file__).resolve().parent.parent)
)
DB_PATH = PROJECT_ROOT / "state.db"


def _get_installation_token(pem_path: Path) -> str:
    """Generate a GitHub App installation token via JWT."""
    try:
        import jwt
    except ImportError:
        print("ERROR: PyJWT not installed. Run: pip3 install PyJWT cryptography",
              file=sys.stderr)
        sys.exit(1)

    private_key = pem_path.read_text()
    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 600, "iss": APP_ID}
    token = jwt.encode(payload, private_key, algorithm="RS256")

    result = subprocess.run([
        "curl", "-s", "-X", "POST",
        "-H", f"Authorization: Bearer {token}",
        "-H", "Accept: application/vnd.github+json",
        f"https://api.github.com/app/installations/{INSTALLATION_ID}/access_tokens"
    ], capture_output=True, text=True)

    data = json.loads(result.stdout)
    inst_token = data.get("token")
    if not inst_token:
        print(f"ERROR: Failed to get installation token: {result.stdout[:200]}",
              file=sys.stderr)
        sys.exit(1)
    return inst_token


def _gh_api(inst_token: str, method: str, url: str,
            data: dict | None = None) -> dict | list:
    """Call GitHub API with the installation token."""
    cmd = [
        "curl", "-s", "-X", method,
        "-H", f"Authorization: token {inst_token}",
        "-H", "Accept: application/vnd.github+json",
        url,
    ]
    if data:
        cmd.extend(["-d", json.dumps(data)])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if not result.stdout.strip():
        return {}
    return json.loads(result.stdout)


def _get_pem_path(args) -> Path:
    """Resolve PEM path from args or environment."""
    if args.pem:
        return Path(args.pem)
    env_pem = os.environ.get("MESH_BOT_PEM")
    if env_pem:
        return Path(env_pem)
    if DEFAULT_PEM.exists():
        return DEFAULT_PEM
    print(f"ERROR: PEM not found. Set MESH_BOT_PEM or pass --pem.", file=sys.stderr)
    sys.exit(1)


def cmd_create(args):
    """Create a workflow tracking issue."""
    pem_path = _get_pem_path(args)
    inst_token = _get_installation_token(pem_path)

    labels = [l.strip() for l in args.labels.split(",") if l.strip()] if args.labels else []
    labels.append("workflow")

    issue_data = {
        "title": args.title,
        "body": args.body + "\n\n---\n*Created by safety-quotient-mesh-bot*",
        "labels": labels,
    }

    resp = _gh_api(inst_token, "POST",
                   f"https://api.github.com/repos/{args.repo}/issues",
                   issue_data)
    url = resp.get("html_url")
    number = resp.get("number")
    if not url:
        print(f"ERROR: Issue creation failed: {json.dumps(resp)[:300]}", file=sys.stderr)
        sys.exit(1)

    print(f"Created: {url}")

    # Index in state.db if available
    _index_issue(number, args.repo, args.title, "open")

    return url


def cmd_update(args):
    """Add a progress comment to an issue."""
    pem_path = _get_pem_path(args)
    inst_token = _get_installation_token(pem_path)

    resp = _gh_api(inst_token, "POST",
                   f"https://api.github.com/repos/{args.repo}/issues/{args.issue}/comments",
                   {"body": args.comment})
    url = resp.get("html_url")
    if url:
        print(f"Comment added: {url}")
    else:
        print(f"ERROR: Comment failed: {json.dumps(resp)[:300]}", file=sys.stderr)


def cmd_close(args):
    """Close an issue with a final comment."""
    pem_path = _get_pem_path(args)
    inst_token = _get_installation_token(pem_path)

    if args.comment:
        _gh_api(inst_token, "POST",
                f"https://api.github.com/repos/{args.repo}/issues/{args.issue}/comments",
                {"body": args.comment})

    resp = _gh_api(inst_token, "PATCH",
                   f"https://api.github.com/repos/{args.repo}/issues/{args.issue}",
                   {"state": "closed", "state_reason": "completed"})
    url = resp.get("html_url")
    if url:
        print(f"Closed: {url}")
        _index_issue(args.issue, args.repo, resp.get("title", ""), "closed")
    else:
        print(f"ERROR: Close failed: {json.dumps(resp)[:300]}", file=sys.stderr)


def cmd_close_resolved(args):
    """Close escalation issues whose triggering condition resolved.

    Checks state.db for resolved gates and reset budgets, then closes
    the corresponding GitHub issues.
    """
    pem_path = _get_pem_path(args)
    inst_token = _get_installation_token(pem_path)

    # Fetch open for-human-review issues
    resp = _gh_api(inst_token, "GET",
                   f"https://api.github.com/repos/{args.repo}/issues"
                   f"?state=open&labels=for-human-review&per_page=30")
    if not isinstance(resp, list):
        print("No open escalation issues found")
        return

    closed_count = 0
    for issue in resp:
        title = issue.get("title", "")
        number = issue.get("number")

        should_close = False
        reason = ""

        # Budget-halt issues: close if budget reset
        if "budget-halt" in title.lower() or "budget exhausted" in title.lower():
            if _budget_positive():
                should_close = True
                reason = "Autonomy budget has been reset — condition resolved."

        # Gate-timeout issues: close if gate resolved
        if "gate-timeout" in title.lower():
            if _all_gates_resolved():
                should_close = True
                reason = "All gates resolved — condition cleared."

        if should_close and not args.dry_run:
            _gh_api(inst_token, "POST",
                    f"https://api.github.com/repos/{args.repo}/issues/{number}/comments",
                    {"body": f"Auto-closing: {reason}\n\n*— safety-quotient-mesh-bot*"})
            _gh_api(inst_token, "PATCH",
                    f"https://api.github.com/repos/{args.repo}/issues/{number}",
                    {"state": "closed", "state_reason": "completed"})
            print(f"Closed #{number}: {title}")
            closed_count += 1
        elif should_close:
            print(f"Would close #{number}: {title} — {reason}")
            closed_count += 1

    print(f"{'Would close' if args.dry_run else 'Closed'}: {closed_count} issues")


def cmd_list(args):
    """List open workflow and escalation issues."""
    pem_path = _get_pem_path(args)
    inst_token = _get_installation_token(pem_path)

    for label in ["workflow", "for-human-review"]:
        resp = _gh_api(inst_token, "GET",
                       f"https://api.github.com/repos/{args.repo}/issues"
                       f"?state=open&labels={label}&per_page=20")
        if isinstance(resp, list) and resp:
            print(f"\n[{label}]")
            for issue in resp:
                print(f"  #{issue['number']}: {issue['title']}")
                print(f"    {issue['html_url']}")


def _budget_positive() -> bool:
    """Check if autonomy budget has credits remaining."""
    if not DB_PATH.exists():
        return False
    conn = sqlite3.connect(str(DB_PATH))
    row = conn.execute(
        "SELECT budget_current FROM autonomy_budget LIMIT 1"
    ).fetchone()
    conn.close()
    return row is not None and row[0] > 0


def _all_gates_resolved() -> bool:
    """Check if all active gates have been resolved."""
    if not DB_PATH.exists():
        return True
    conn = sqlite3.connect(str(DB_PATH))
    row = conn.execute(
        "SELECT COUNT(*) FROM active_gates WHERE resolved_at IS NULL"
    ).fetchone()
    conn.close()
    return row[0] == 0


def _index_issue(number: int, repo: str, title: str, state: str):
    """Index issue state in state.db if available."""
    if not DB_PATH.exists():
        return
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.execute(
            "CREATE TABLE IF NOT EXISTS github_issues ("
            "  number INTEGER, repo TEXT, title TEXT, state TEXT, "
            "  updated_at TEXT, "
            "  PRIMARY KEY (repo, number))"
        )
        conn.execute(
            "INSERT OR REPLACE INTO github_issues (number, repo, title, state, updated_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (number, repo, title, state,
             datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        conn.close()
    except Exception:
        pass  # non-critical — issue tracking in DB is supplementary


def main():
    parser = argparse.ArgumentParser(description="GitHub issue lifecycle management")
    parser.add_argument("--pem", help="Path to GitHub App PEM key")
    sub = parser.add_subparsers(dest="command", required=True)

    p_create = sub.add_parser("create", help="Create a workflow issue")
    p_create.add_argument("--repo", required=True)
    p_create.add_argument("--title", required=True)
    p_create.add_argument("--body", required=True)
    p_create.add_argument("--labels", default="", help="Comma-separated labels")

    p_update = sub.add_parser("update", help="Comment on an issue")
    p_update.add_argument("--repo", required=True)
    p_update.add_argument("--issue", required=True, type=int)
    p_update.add_argument("--comment", required=True)

    p_close = sub.add_parser("close", help="Close an issue")
    p_close.add_argument("--repo", required=True)
    p_close.add_argument("--issue", required=True, type=int)
    p_close.add_argument("--comment", default="")

    p_resolved = sub.add_parser("close-resolved", help="Close resolved escalations")
    p_resolved.add_argument("--repo", required=True)
    p_resolved.add_argument("--dry-run", action="store_true")

    p_list = sub.add_parser("list", help="List open issues")
    p_list.add_argument("--repo", required=True)

    args = parser.parse_args()
    handlers = {
        "create": cmd_create,
        "update": cmd_update,
        "close": cmd_close,
        "close-resolved": cmd_close_resolved,
        "list": cmd_list,
    }
    handlers[args.command](args)


if __name__ == "__main__":
    main()

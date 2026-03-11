#!/usr/bin/env python3
"""escalate.py — File a for-human-review issue via the mesh bot.

Creates a GitHub Issue as safety-quotient-mesh-bot[bot], which triggers
push notifications to the repo owner. Also writes a transport escalation
file for audit trail and indexes in state.db.

Usage:
    python3 scripts/escalate.py \
        --agent psq-agent \
        --severity warning \
        --category consensus-deadlock \
        --summary "Plan9 vote split 2-2, C3 escalation needed" \
        --context "Session plan9-consensus, round 1" \
        --suggested-action "Review votes and break tie" \
        --repo safety-quotient-lab/safety-quotient

    python3 scripts/escalate.py \
        --agent psychology-agent \
        --severity critical \
        --category budget-halt \
        --summary "Trust budget exhausted (0/20 credits)" \
        --repo safety-quotient-lab/psychology-agent

Environment:
    MESH_BOT_PEM — path to the GitHub App private key
                   (default: ~/.config/safety-quotient/mesh-bot.pem)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

APP_ID = "3060729"
INSTALLATION_ID = "115481120"
DEFAULT_PEM = Path.home() / ".config/safety-quotient/mesh-bot.pem"
PROJECT_ROOT = Path(__file__).parent.parent

SEVERITY_LABELS = {
    "critical": "for-human-review:critical",
    "warning": "for-human-review:warning",
    "info": "for-human-review:info",
}

SEVERITY_EMOJI = {
    "critical": "🔴",
    "warning": "🟡",
    "info": "🔵",
}


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


def _check_duplicate(inst_token: str, repo: str, title_prefix: str) -> str | None:
    """Check for existing open issue with matching title. Returns URL if found."""
    result = subprocess.run([
        "curl", "-s",
        "-H", f"Authorization: token {inst_token}",
        "-H", "Accept: application/vnd.github+json",
        f"https://api.github.com/repos/{repo}/issues",
        "-G", "-d", "state=open", "-d", "labels=for-human-review",
        "-d", f"per_page=30"
    ], capture_output=True, text=True)

    issues = json.loads(result.stdout)
    if isinstance(issues, list):
        for issue in issues:
            if issue.get("title", "").startswith(title_prefix):
                return issue["html_url"]
    return None


def _create_issue(inst_token: str, repo: str, title: str, body: str,
                  severity: str, assignee: str) -> str:
    """Create a GitHub Issue as the mesh bot. Returns issue URL."""
    labels = ["for-human-review"]
    severity_label = SEVERITY_LABELS.get(severity)
    if severity_label:
        labels.append(severity_label)

    issue_data = {
        "title": title,
        "body": body,
        "labels": labels,
    }
    if assignee:
        issue_data["assignees"] = [assignee]

    result = subprocess.run([
        "curl", "-s", "-X", "POST",
        "-H", f"Authorization: token {inst_token}",
        "-H", "Accept: application/vnd.github+json",
        f"https://api.github.com/repos/{repo}/issues",
        "-d", json.dumps(issue_data)
    ], capture_output=True, text=True)

    resp = json.loads(result.stdout)
    url = resp.get("html_url")
    if not url:
        print(f"ERROR: Issue creation failed: {result.stdout[:300]}",
              file=sys.stderr)
        sys.exit(1)
    return url


def _write_transport_file(agent_id: str, severity: str, category: str,
                          summary: str, context: str, issue_url: str) -> str | None:
    """Write escalation to transport/sessions/local-coordination/."""
    session_dir = PROJECT_ROOT / "transport/sessions/local-coordination"
    if not session_dir.exists():
        return None

    timestamp = datetime.now(timezone.utc).isoformat()
    filename = f"escalation-{agent_id}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}.json"

    escalation = {
        "schema": "interagent/v1",
        "session_id": "local-coordination",
        "timestamp": timestamp,
        "message_type": "escalation",
        "from": {"agent_id": agent_id},
        "to": {"agent_id": "human"},
        "content": {
            "subject": summary,
            "severity": severity,
            "category": category,
            "context": context,
            "issue_url": issue_url,
        },
        "ack_required": True,
        "urgency": "immediate" if severity == "critical" else "normal",
        "setl": 0.02,
        "epistemic_flags": [],
    }

    filepath = session_dir / filename
    filepath.write_text(json.dumps(escalation, indent=2))
    return filename


def _index_in_statedb(filename: str, agent_id: str, summary: str,
                      severity: str) -> None:
    """Index escalation in state.db via dual_write.py."""
    dual_write = PROJECT_ROOT / "scripts" / "dual_write.py"
    if not dual_write.exists():
        return

    subprocess.run([
        sys.executable, str(dual_write), "transport-message",
        "--session", "local-coordination",
        "--filename", filename,
        "--turn", "0",
        "--type", "escalation",
        "--from-agent", agent_id,
        "--to-agent", "human",
        "--timestamp", datetime.now(timezone.utc).isoformat(),
        "--subject", summary,
        "--claims-count", "0",
        "--setl", "0.02",
        "--urgency", "immediate" if severity == "critical" else "normal",
    ], cwd=PROJECT_ROOT, capture_output=True)


def main():
    parser = argparse.ArgumentParser(
        description="File a for-human-review issue via the mesh bot")
    parser.add_argument("--agent", required=True,
                        help="Agent ID filing the escalation")
    parser.add_argument("--severity", required=True,
                        choices=["critical", "warning", "info"])
    parser.add_argument("--category", required=True,
                        help="Escalation category (budget-halt, consensus-deadlock, "
                             "transport-error, substance-gate, script-failure)")
    parser.add_argument("--summary", required=True,
                        help="One-line human-readable summary")
    parser.add_argument("--context", default="",
                        help="What the agent was doing when escalation triggered")
    parser.add_argument("--suggested-action", default="",
                        help="Recommended action for the human")
    parser.add_argument("--repo", required=True,
                        help="Target repo (e.g., safety-quotient-lab/psychology-agent)")
    parser.add_argument("--assignee", default="kashfshah",
                        help="GitHub user to assign (default: kashfshah)")
    parser.add_argument("--pem", default=None,
                        help="Path to GitHub App private key")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print issue body without creating")
    args = parser.parse_args()

    pem_path = Path(args.pem) if args.pem else DEFAULT_PEM
    if not pem_path.exists():
        # Check MESH_BOT_PEM env var
        env_pem = os.environ.get("MESH_BOT_PEM")
        if env_pem:
            pem_path = Path(env_pem)
        else:
            print(f"ERROR: PEM not found at {pem_path}. Set MESH_BOT_PEM env var.",
                  file=sys.stderr)
            sys.exit(1)

    emoji = SEVERITY_EMOJI.get(args.severity, "")
    title = f"[for-human-review] {emoji} {args.agent}: {args.summary}"

    body_parts = [
        f"## Agent Escalation: {args.category}\n",
        f"**Agent:** {args.agent}",
        f"**Severity:** {args.severity}",
        f"**Timestamp:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}\n",
        f"### Summary\n{args.summary}\n",
    ]
    if args.context:
        body_parts.append(f"### Context\n{args.context}\n")
    if args.suggested_action:
        body_parts.append(f"### Suggested Action\n{args.suggested_action}\n")
    body_parts.append(
        "### Response Options\n"
        "Reply with one of:\n"
        "- `APPROVE` — proceed with suggested action\n"
        "- `DENY` — halt and wait for manual intervention\n"
        "- `DEFER` — continue without this action, revisit later\n"
        "- Or free-text instructions\n\n"
        "---\n"
        f"*Auto-generated by {args.agent} via safety-quotient-mesh-bot*"
    )
    body = "\n".join(body_parts)

    if args.dry_run:
        print(f"Title: {title}\n\n{body}")
        return

    # Get installation token
    inst_token = _get_installation_token(pem_path)

    # Check for duplicate
    title_prefix = f"[for-human-review] {emoji} {args.agent}:"
    existing = _check_duplicate(inst_token, args.repo, title_prefix)
    if existing:
        print(f"Duplicate found: {existing} — skipping")
        return

    # Create issue
    issue_url = _create_issue(inst_token, args.repo, title, body,
                              args.severity, args.assignee)
    print(f"Issue created: {issue_url}")

    # Write transport file
    filename = _write_transport_file(
        args.agent, args.severity, args.category,
        args.summary, args.context, issue_url)
    if filename:
        print(f"Transport file: {filename}")
        _index_in_statedb(filename, args.agent, args.summary, args.severity)

    return issue_url


if __name__ == "__main__":
    main()

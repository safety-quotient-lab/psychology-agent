#!/usr/bin/env bash
# deliver-to-peer.sh — Deliver a transport message to a peer agent's repo via PR
#
# Implements the transport delivery convention (operations-agent directive):
# clone target repo → branch → write message → commit → push → PR → cleanup
#
# Usage:
#   ./scripts/deliver-to-peer.sh <target-agent-id> <session-id> <source-file> [short-label]
#
# Example:
#   ./scripts/deliver-to-peer.sh operations-agent mesh-state-parity \
#     transport/sessions/mesh-state-parity/from-psychology-agent-001.json schema-drift
#
# The script:
#   1. Resolves the target repo from agent-registry.json
#   2. Clones to /tmp/deliver-{target}-{session}
#   3. Creates branch: psychology-agent/{session}/{turn}-{label}
#   4. Copies the message as to-psychology-agent-{NNN}.json in the target repo
#   5. Commits, pushes, opens PR
#   6. Cleans up the clone

set -euo pipefail

# ── Arguments ────────────────────────────────────────────────────────────────
TARGET_AGENT="${1:?Usage: deliver-to-peer.sh <target-agent> <session> <source-file> [label]}"
SESSION_ID="${2:?Usage: deliver-to-peer.sh <target-agent> <session> <source-file> [label]}"
SOURCE_FILE="${3:?Usage: deliver-to-peer.sh <target-agent> <session> <source-file> [label]}"
SHORT_LABEL="${4:-delivery}"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Resolve target repo ─────────────────────────────────────────────────────
TARGET_REPO=$(python3 -c "
import json, sys
reg = json.load(open('${PROJECT_ROOT}/transport/agent-registry.json'))
agent = reg.get('agents', {}).get('${TARGET_AGENT}', {})
repo = agent.get('repo', '')
if not repo:
    print('ERROR: no repo for ${TARGET_AGENT}', file=sys.stderr)
    sys.exit(1)
print(repo)
") || exit 1

echo "[deliver] Target: ${TARGET_AGENT} → ${TARGET_REPO}"

# ── Extract turn from source file ───────────────────────────────────────────
TURN=$(python3 -c "
import json, sys
try:
    d = json.load(open('${SOURCE_FILE}'))
    print(d.get('turn', 1))
except:
    print(1)
")

SUBJECT=$(python3 -c "
import json, sys
try:
    d = json.load(open('${SOURCE_FILE}'))
    subj = d.get('subject', d.get('body', {}).get('summary', '${SESSION_ID}'))
    print(subj[:72])
except:
    print('${SESSION_ID}')
")

# ── Source agent identity ────────────────────────────────────────────────────
IDENTITY_FILE="${PROJECT_ROOT}/.agent-identity.json"
if [ -f "${IDENTITY_FILE}" ]; then
    SOURCE_AGENT=$(python3 -c "import json; print(json.load(open('${IDENTITY_FILE}'))['agent_id'])" 2>/dev/null || echo "psychology-agent")
else
    SOURCE_AGENT="psychology-agent"
fi

# ── Filename convention ──────────────────────────────────────────────────────
# In the target repo: to-{source-agent}-{NNN}.json
# NNN = zero-padded turn number
DEST_FILENAME="to-${SOURCE_AGENT}-$(printf '%03d' "${TURN}").json"

# ── Clone, branch, deliver ──────────────────────────────────────────────────
WORKDIR="/tmp/deliver-${TARGET_AGENT}-${SESSION_ID}"
rm -rf "${WORKDIR}"

echo "[deliver] Cloning ${TARGET_REPO}..."
git clone --depth 1 "git@github.com:${TARGET_REPO}.git" "${WORKDIR}" 2>&1 | tail -2

BRANCH="${SOURCE_AGENT}/${SESSION_ID}/t${TURN}-${SHORT_LABEL}"
cd "${WORKDIR}"
git checkout -b "${BRANCH}" 2>&1

# Create session directory if absent
mkdir -p "transport/sessions/${SESSION_ID}"

# Copy message with target-repo filename
cp "${PROJECT_ROOT}/${SOURCE_FILE}" "transport/sessions/${SESSION_ID}/${DEST_FILENAME}"

echo "[deliver] Written: transport/sessions/${SESSION_ID}/${DEST_FILENAME}"

# ── Commit and push ─────────────────────────────────────────────────────────
git add "transport/sessions/${SESSION_ID}/${DEST_FILENAME}"
git commit -m "interagent: ${SESSION_ID} T${TURN} — ${SUBJECT}

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>" 2>&1

git push -u origin "${BRANCH}" 2>&1

# ── Open PR ─────────────────────────────────────────────────────────────────
PR_TITLE="interagent: ${SESSION_ID} T${TURN} — ${SUBJECT}"
PR_BODY="Transport message from psychology-agent to ${TARGET_AGENT}.

Session: ${SESSION_ID}
Turn: ${TURN}
Source: ${SOURCE_FILE}

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

PR_URL=$(gh pr create \
    --repo "${TARGET_REPO}" \
    --head "${BRANCH}" \
    --title "${PR_TITLE}" \
    --body "${PR_BODY}" \
    2>&1) || {
    echo "[deliver] WARNING: gh pr create failed. Branch pushed — create PR manually:"
    echo "  https://github.com/${TARGET_REPO}/pull/new/${BRANCH}"
    PR_URL="(manual PR needed)"
}

echo "[deliver] PR: ${PR_URL}"

# ── Cleanup ─────────────────────────────────────────────────────────────────
cd "${PROJECT_ROOT}"
rm -rf "${WORKDIR}"

echo "[deliver] Done: ${TARGET_AGENT}/${SESSION_ID}/T${TURN}"

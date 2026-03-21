#!/usr/bin/env bash
# deliberate.sh — LLM deliberation wrapper for meshd spawner.
#
# meshd sets SPAWN_COMMAND to this script. It provides:
#   1. LLM backend resolution (claude, ollama, api-only, etc.)
#   2. PATH setup for non-login shell contexts (launchd, systemd, meshd)
#   3. Future: model routing, cost tracking, fallback chains
#
# Usage (meshd config):
#   SPAWN_COMMAND=/path/to/deliberate.sh
#
# Arguments: passed through to the resolved LLM command.

set -euo pipefail

# ── LLM backend resolution ──────────────────────────────────────────
# Priority: DELIBERATION_BACKEND env > claude (default)
# Future backends: ollama, litellm, api-only, etc.
BACKEND="${DELIBERATION_BACKEND:-claude}"

case "$BACKEND" in
    claude)
        # Resolve claude binary — shell alias not available in non-login contexts
        # Check: PATH → ~/.claude/local → nvm node_modules → /usr/local/bin
        if command -v claude >/dev/null 2>&1; then
            CLAUDE_BIN="claude"
        elif [ -x "${HOME}/.claude/local/claude" ]; then
            CLAUDE_BIN="${HOME}/.claude/local/claude"
        elif [ -d "${HOME}/.nvm" ]; then
            NVM_BIN=$(ls -d "${HOME}/.nvm/versions/node"/*/bin 2>/dev/null | tail -1)
            if [ -n "$NVM_BIN" ] && [ -x "${NVM_BIN}/claude" ]; then
                export PATH="${NVM_BIN}:${PATH}"
                CLAUDE_BIN="${NVM_BIN}/claude"
            fi
        fi
        if [ -z "${CLAUDE_BIN:-}" ] && [ -x "/usr/local/bin/claude" ]; then
            CLAUDE_BIN="/usr/local/bin/claude"
        fi
        if [ -z "${CLAUDE_BIN:-}" ]; then
            echo "ERROR: claude binary not found. Install Claude Code or set DELIBERATION_BACKEND." >&2
            exit 1
        fi
        exec "$CLAUDE_BIN" "$@"
        ;;
    *)
        echo "ERROR: unknown DELIBERATION_BACKEND: ${BACKEND}" >&2
        exit 1
        ;;
esac

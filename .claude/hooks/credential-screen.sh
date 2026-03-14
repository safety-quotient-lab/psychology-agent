#!/bin/bash
# PreToolUse hook: fast pre-screen for credentials in Write/Edit targets.
# Brain gap 2 (amygdala analogue) — fires before full trigger pipeline.
# Checks written content for common credential patterns.

# Claude Code injects TOOL_INPUT_* variables at runtime
# shellcheck disable=SC2154
CONTENT="$TOOL_INPUT_new_string$TOOL_INPUT_content"
[ -z "$CONTENT" ] && exit 0

# Pattern match for common credential formats
if echo "$CONTENT" | grep -qiE '(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9\-]{20,}|xox[bpras]-[a-zA-Z0-9\-]+|-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----)'; then
    echo "⚠ [CREDENTIAL SCREEN] Potential credential pattern detected in write content."
    echo "Review before proceeding — T4 Check 2 (public visibility) applies."
    echo "Patterns: API key, AWS access key, GitHub PAT, GitLab PAT, Slack token, or private key."
fi

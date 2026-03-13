#!/usr/bin/env bash
#
# agents.conf.sh — Shared agent path configuration for mesh scripts
#
# Part of interagent-sdk. All mesh scripts source this file instead of
# hardcoding machine-specific paths.
#
# Override via environment variables or a local .dev.vars file.
#
# Required env vars (set in .dev.vars or shell profile):
#   AGENT_SSH_HOST       — SSH hostname for the agent host
#   AGENT_BASE_DIR       — Base directory where agent projects live on the remote host
#
# Optional env vars:
#   INTERAGENT_SDK_PATH  — Explicit path to interagent-sdk (auto-detected if not set)
#
# Agent directory layout (relative to AGENT_BASE_DIR):
#   psychology-agent     → $AGENT_BASE_DIR/psychology
#   psq-agent            → $AGENT_BASE_DIR/psychology/safety-quotient
#   unratified-agent     → $AGENT_BASE_DIR/unratified
#   observatory-agent    → $AGENT_BASE_DIR/observatory

# Resolve SDK root — handles symlinks, direct sourcing, and explicit path
_CONF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "${INTERAGENT_SDK_PATH:-}" ]; then
  SDK_ROOT="${INTERAGENT_SDK_PATH}"
else
  SDK_ROOT="$(dirname "$_CONF_DIR")"
fi

# Find the consuming agent's repo root — walk up from the script that
# sourced us (not from this file). Fallback: parent of SDK_ROOT.
if [ -n "${REPO_ROOT:-}" ]; then
  : # Already set by the consuming script
elif [ -n "${BASH_SOURCE[1]:-}" ]; then
  _CALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
  REPO_ROOT="$(dirname "$_CALLER_DIR")"
else
  REPO_ROOT="$(dirname "$SDK_ROOT")"
fi

# Load .dev.vars if present (local overrides)
if [ -f "${REPO_ROOT}/.dev.vars" ]; then
  # shellcheck source=/dev/null
  set -a
  . "${REPO_ROOT}/.dev.vars"
  set +a
fi

SSH_HOST="${AGENT_SSH_HOST:?AGENT_SSH_HOST not set — configure in .dev.vars or environment}"
AGENT_BASE="${AGENT_BASE_DIR:?AGENT_BASE_DIR not set — configure in .dev.vars or environment}"

# Agent ID → project directory (relative to AGENT_BASE)
declare -A AGENT_DIRS=(
  [psychology-agent]="psychology"
  [psq-agent]="psychology/safety-quotient"
  [unratified-agent]="unratified"
  [observatory-agent]="observatory"
)

# Agent ID → state.db path (absolute, for remote SSH)
declare -A AGENT_DBS
for agent_id in "${!AGENT_DIRS[@]}"; do
  AGENT_DBS[$agent_id]="${AGENT_BASE}/${AGENT_DIRS[$agent_id]}/state.db"
done

# Agent pairs for iteration (colon-separated id:path)
AGENT_DIR_PAIRS=()
AGENT_DB_PAIRS=()
for agent_id in psychology-agent psq-agent unratified-agent observatory-agent; do
  AGENT_DIR_PAIRS+=("${agent_id}:${AGENT_BASE}/${AGENT_DIRS[$agent_id]}")
  AGENT_DB_PAIRS+=("${agent_id}:${AGENT_BASE}/${AGENT_DIRS[$agent_id]}/state.db")
done

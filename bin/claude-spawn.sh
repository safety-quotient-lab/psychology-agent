#!/usr/bin/env bash
# claude-spawn.sh — wrapper for meshd to invoke claude -p
# Ensures PATH includes NVM-managed node (needed for claude CLI)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "${NVM_DIR}/nvm.sh" ] && source "${NVM_DIR}/nvm.sh" 2>/dev/null
exec claude -p "$@"

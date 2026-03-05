#!/usr/bin/env bash
# PreCompact hook — fires before context compaction.
# stdout becomes additionalContext that survives compaction.
# Purpose: ensure critical state persists across the compaction boundary.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "[PRE-COMPACT] Context compaction imminent. Before compaction completes:"
echo "  1. Update MEMORY.md Active Thread with current work state"
echo "  2. Commit any uncommitted documentation changes"
echo "  3. Note any open decisions or bare forks that need resolution"
echo "  4. After compaction: re-read docs/cognitive-triggers.md to reload trigger system"

# Surface current Active Thread for preservation
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
MEMORY_LIVE="$HOME/.claude/projects/${_HASH}/memory/MEMORY.md"
if [ -s "$MEMORY_LIVE" ]; then
  ACTIVE_THREAD=$(sed -n '/^## Active Thread/,/^## /p' "$MEMORY_LIVE" | head -10)
  if [ -n "$ACTIVE_THREAD" ]; then
    echo ""
    echo "[PRE-COMPACT] Current Active Thread for preservation:"
    echo "$ACTIVE_THREAD"
  fi
fi

exit 0

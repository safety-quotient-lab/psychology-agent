#!/usr/bin/env bash
# Stop hook — completion gate. Fires when agent attempts to stop.
# Exit 0 = allow stop. Exit 2 + stderr = block stop with message to Claude.
# Checks for uncommitted changes and reminds of gap check obligations.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

WARNINGS=""

# Check for uncommitted changes
if ! git -C "$PROJECT_ROOT" diff --quiet 2>/dev/null || ! git -C "$PROJECT_ROOT" diff --cached --quiet 2>/dev/null; then
  WARNINGS="${WARNINGS}Uncommitted changes in working tree. "
fi

# Check for untracked files in docs/ or .claude/ (likely session artifacts)
UNTRACKED=$(git -C "$PROJECT_ROOT" ls-files --others --exclude-standard -- docs/ .claude/ 2>/dev/null | head -3)
if [ -n "$UNTRACKED" ]; then
  WARNINGS="${WARNINGS}Untracked files in docs/ or .claude/. "
fi

# Check for unresolved epistemic flags in lab-notebook Current State block
NOTEBOOK="${PROJECT_ROOT}/lab-notebook.md"
if [ -f "$NOTEBOOK" ]; then
  FLAGGED_ITEMS=$(head -120 "$NOTEBOOK" | grep -c '⚑' 2>/dev/null || true)
  if [ "$FLAGGED_ITEMS" -gt 0 ]; then
    WARNINGS="${WARNINGS}${FLAGGED_ITEMS} item(s) flagged ⚑ in lab-notebook Current State. "
  fi
fi

if [ -n "$WARNINGS" ]; then
  echo "[COMPLETION-GATE] ${WARNINGS}Consider running /cycle or committing before stopping." >&2
  # Non-blocking warning (exit 0) — surfaces the reminder but allows stop.
  # Use exit 2 to hard-block if needed in the future.
  exit 0
fi

exit 0

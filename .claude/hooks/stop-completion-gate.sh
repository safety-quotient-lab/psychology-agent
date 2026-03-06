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

# Check MANIFEST for pending messages addressed to psychology-agent
MANIFEST="${PROJECT_ROOT}/transport/MANIFEST.json"
if [ -f "$MANIFEST" ]; then
  PENDING=$(python3 -c "
import json, sys
try:
    m = json.load(open('$MANIFEST'))
    p = m.get('pending', {}).get('psychology-agent', [])
    print(len(p))
except:
    print(0)
" 2>/dev/null)
  if [ "$PENDING" -gt 0 ] 2>/dev/null; then
    WARNINGS="${WARNINGS}${PENDING} pending message(s) for psychology-agent in MANIFEST. "
  fi
fi

# Check MEMORY.md was updated this session (modified today)
MEMORY_DIR="$HOME/.claude/projects/$(echo "$PROJECT_ROOT" | tr '/' '-')/memory"
if [ -f "${MEMORY_DIR}/MEMORY.md" ]; then
  TODAY=$(date -Idate)
  LAST_MOD=$(date -r "${MEMORY_DIR}/MEMORY.md" -Idate 2>/dev/null || stat -f '%Sm' -t '%Y-%m-%d' "${MEMORY_DIR}/MEMORY.md" 2>/dev/null)
  if [ "$LAST_MOD" != "$TODAY" ]; then
    WARNINGS="${WARNINGS}MEMORY.md not updated today — Active Thread may be stale. "
  fi
fi

# Check docs/MEMORY-snapshot.md freshness (should match session work)
SNAPSHOT="${PROJECT_ROOT}/docs/MEMORY-snapshot.md"
if [ -f "$SNAPSHOT" ]; then
  SNAP_MOD=$(date -r "$SNAPSHOT" -Idate 2>/dev/null || stat -f '%Sm' -t '%Y-%m-%d' "$SNAPSHOT" 2>/dev/null)
  TODAY=$(date -Idate)
  if [ "$SNAP_MOD" != "$TODAY" ]; then
    WARNINGS="${WARNINGS}docs/MEMORY-snapshot.md not updated today — run /cycle Step 10. "
  fi
fi

if [ -n "$WARNINGS" ]; then
  echo "[COMPLETION-GATE] ${WARNINGS}Consider running /cycle or committing before stopping." >&2
  # Non-blocking warning (exit 0) — surfaces the reminder but allows stop.
  # Use exit 2 to hard-block if needed in the future.
  exit 0
fi

exit 0

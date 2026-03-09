#!/usr/bin/env bash
# InstructionsLoaded hook — validates loaded instruction files and reports
# which glob-scoped rules are active.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Check CLAUDE.md health
CLAUDE_MD="${PROJECT_ROOT}/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  LINE_COUNT=$(wc -l < "$CLAUDE_MD" | tr -d '[:space:]')
  if [ "$LINE_COUNT" -lt 20 ]; then
    echo "[HOOK] ⚠ CLAUDE.md appears truncated (${LINE_COUNT} lines). Expected ≥100."
  fi
  # Check for key sections
  for section in "Hooks" "Skills" "Communication Conventions" "Scope Boundaries"; do
    if ! grep -q "$section" "$CLAUDE_MD" 2>/dev/null; then
      echo "[HOOK] ⚠ CLAUDE.md missing section: ${section}"
    fi
  done
fi

# Report active glob-scoped rules
RULES_DIR="${PROJECT_ROOT}/.claude/rules"
if [ -d "$RULES_DIR" ]; then
  RULE_COUNT=$(find "$RULES_DIR" -name '*.md' -type f | wc -l | tr -d '[:space:]')
  RULE_NAMES=$(find "$RULES_DIR" -name '*.md' -type f -exec basename {} \; | sort | tr '\n' ', ' | sed 's/,$//')
  echo "[HOOK] Glob-scoped rules loaded: ${RULE_COUNT} (${RULE_NAMES})"
fi

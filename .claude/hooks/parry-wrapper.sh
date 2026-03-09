#!/usr/bin/env bash
# Wrapper around `parry hook` that adds configurable ML fallback behavior.
#
# Reads ~/.parry/config.toml for:
#   [hook]
#   ml_fallback = "warn_once"   # "fail_closed" | "warn_once" | "allow"
#
# Modes:
#   fail_closed — default parry behavior (prompt every tool use when ML unavailable)
#   warn_once   — prompt once per session, then allow (recommended)
#   allow       — never prompt for ML unavailability (fast-scan layers still run)
#
# When parry is not installed, passes silently (exit 0, no output).

set -euo pipefail

# Skip entirely if parry not installed
if ! command -v parry &>/dev/null; then
  exit 0
fi

# Skip if session-disabled by user toggle
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [ -f "${PROJECT_ROOT}/.parry-session-disabled" ]; then
  exit 0
fi

PARRY_DIR="${HOME}/.parry"
CONFIG_FILE="${PARRY_DIR}/config.toml"
WARNED_FILE="${PARRY_DIR}/.ml-warned"
SESSION_TTL=3600  # 1 hour — approximate session lifetime

# Read ml_fallback from config (default: warn_once)
ML_FALLBACK="warn_once"
if [ -f "$CONFIG_FILE" ]; then
  PARSED=$(grep -E '^\s*ml_fallback\s*=' "$CONFIG_FILE" 2>/dev/null \
    | head -1 | sed 's/.*=\s*"\([^"]*\)".*/\1/' || true)
  if [ -n "$PARSED" ]; then
    ML_FALLBACK="$PARSED"
  fi
fi

# Capture stdin for parry
INPUT=$(cat)

# Trusted instruction files — loaded by Claude Code's own trust chain, not
# external input. Their directive language ("You MUST...", "OVERRIDE default
# behavior") triggers ML false positives. Skip parry for tool calls that
# target these paths. Note: `parry hook` does not support --ignore-path,
# so we filter at the wrapper level before invoking parry.
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"\s*:\s*"[^"]*"' | head -1 \
  | sed 's/.*"file_path"\s*:\s*"\([^"]*\)".*/\1/' || true)

if [ -n "$FILE_PATH" ]; then
  case "$FILE_PATH" in
    "${PROJECT_ROOT}/CLAUDE.md" | \
    "${PROJECT_ROOT}"/docs/cognitive-triggers.md | \
    "${PROJECT_ROOT}"/.claude/rules/*)
      # Trusted instruction file — skip ML scan
      exit 0
      ;;
  esac
fi

# Run parry hook, capture output and exit code
PARRY_OUTPUT=$(echo "$INPUT" | parry hook 2>/dev/null) || true

# Check if output contains ML unavailable warning
if echo "$PARRY_OUTPUT" | grep -q "ML unavailable"; then
  case "$ML_FALLBACK" in
    fail_closed)
      # Pass through as-is (original behavior)
      echo "$PARRY_OUTPUT"
      ;;
    allow)
      # Suppress ML warnings entirely — fast-scan layers still ran inside parry
      ;;
    warn_once|*)
      # Check if we already warned recently
      if [ -f "$WARNED_FILE" ]; then
        FILE_AGE=$(( $(date +%s) - $(date -r "$WARNED_FILE" +%s 2>/dev/null || stat -c %Y "$WARNED_FILE" 2>/dev/null || echo 0) ))
        if [ "$FILE_AGE" -lt "$SESSION_TTL" ]; then
          # Already warned this session — suppress
          exit 0
        fi
      fi
      # First warning — pass through and mark
      echo "$PARRY_OUTPUT"
      touch "$WARNED_FILE"
      ;;
  esac
else
  # Not an ML warning — pass through (could be injection detection, etc.)
  echo "$PARRY_OUTPUT"
fi

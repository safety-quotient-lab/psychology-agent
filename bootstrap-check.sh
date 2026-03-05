#!/usr/bin/env bash
# bootstrap-check.sh — Verify and restore auto-memory for the psychology agent.
#
# Run from the project root. Reports health status of auto-memory files,
# restores from committed snapshots when missing, and verifies skills.
#
# Exit codes:
#   0 — all checks passed (healthy or restored)
#   1 — restoration failed or content guard tripped
#
# Usage:
#   ./bootstrap-check.sh              # check + restore if needed
#   ./bootstrap-check.sh --check-only # report status, do not restore

set -euo pipefail

CHECK_ONLY=false
if [[ "${1:-}" == "--check-only" ]]; then
  CHECK_ONLY=true
fi

# --- Resolve paths ---

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PATH_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
AUTO_MEMORY_DIR="$HOME/.claude/projects/${PATH_HASH}/memory"

MEMORY_LIVE="${AUTO_MEMORY_DIR}/MEMORY.md"
TRIGGERS_LIVE="${AUTO_MEMORY_DIR}/cognitive-triggers.md"

MEMORY_SNAPSHOT="${PROJECT_ROOT}/docs/MEMORY-snapshot.md"
TRIGGERS_SNAPSHOT="${PROJECT_ROOT}/docs/cognitive-triggers-snapshot.md"

# --- Content guard thresholds ---

MEMORY_MIN_LINES=50
TRIGGERS_MIN_LINES=100

# --- Helper functions ---

check_file_health() {
  local file_path="$1"
  local min_lines="$2"
  local label="$3"

  if [[ ! -f "$file_path" ]]; then
    echo "  MISSING  $label"
    return 1
  fi

  local line_count
  line_count=$(wc -l < "$file_path" | tr -d '[:space:]')

  if [[ "$line_count" -lt "$min_lines" ]]; then
    echo "  SUSPECT  $label ($line_count lines, expected >= $min_lines)"
    return 2
  fi

  echo "  OK       $label ($line_count lines)"
  return 0
}

restore_file() {
  local source="$1"
  local target="$2"
  local label="$3"
  local session_date
  session_date="$(date -Idate)"

  if [[ ! -f "$source" ]]; then
    echo "  FAILED   Cannot restore $label — snapshot missing: $source"
    return 1
  fi

  # Create directory if needed
  mkdir -p "$(dirname "$target")"

  # Add provenance header, then append snapshot content
  {
    echo "<!-- PROVENANCE: Restored ${session_date} by bootstrap-check.sh"
    echo "     Source: ${source##"$PROJECT_ROOT"/}"
    echo "     Run 'git log docs/' to find the commit that last updated this snapshot. -->"
    echo ""
    cat "$source"
  } > "$target"

  local line_count
  line_count=$(wc -l < "$target" | tr -d '[:space:]')
  echo "  RESTORED $label from snapshot ($line_count lines)"
  return 0
}

# --- Main ---

echo ""
echo "Psychology Agent — Bootstrap Health Check"
echo "=========================================="
echo ""
echo "Project root:    $PROJECT_ROOT"
echo "Auto-memory dir: $AUTO_MEMORY_DIR"
echo ""

# Check auto-memory directory
if [[ ! -d "$AUTO_MEMORY_DIR" ]]; then
  echo "Auto-memory directory does not exist."
  if $CHECK_ONLY; then
    echo "Run without --check-only to restore from snapshots."
    exit 1
  fi
  echo "Creating: $AUTO_MEMORY_DIR"
  mkdir -p "$AUTO_MEMORY_DIR"
  echo ""
fi

# Check each file
echo "File health:"
echo ""

memory_status=0
triggers_status=0

check_file_health "$MEMORY_LIVE" "$MEMORY_MIN_LINES" "MEMORY.md" || memory_status=$?
check_file_health "$TRIGGERS_LIVE" "$TRIGGERS_MIN_LINES" "cognitive-triggers.md" || triggers_status=$?

echo ""

# Restore if needed
restore_needed=false
restore_failed=false

if [[ $memory_status -ne 0 ]]; then
  restore_needed=true
  if $CHECK_ONLY; then
    echo "MEMORY.md needs restoration. Run without --check-only."
  else
    restore_file "$MEMORY_SNAPSHOT" "$MEMORY_LIVE" "MEMORY.md" || restore_failed=true
  fi
fi

if [[ $triggers_status -ne 0 ]]; then
  restore_needed=true
  if $CHECK_ONLY; then
    echo "cognitive-triggers.md needs restoration. Run without --check-only."
  else
    restore_file "$TRIGGERS_SNAPSHOT" "$TRIGGERS_LIVE" "cognitive-triggers.md" || restore_failed=true
  fi
fi

if ! $restore_needed; then
  echo "All auto-memory files healthy. No restoration needed."
fi

# Check snapshots exist (recovery sources)
echo ""
echo "Recovery sources:"
echo ""

snapshot_warning=false
if [[ -f "$MEMORY_SNAPSHOT" ]]; then
  echo "  OK       docs/MEMORY-snapshot.md"
else
  echo "  MISSING  docs/MEMORY-snapshot.md"
  snapshot_warning=true
fi

if [[ -f "$TRIGGERS_SNAPSHOT" ]]; then
  echo "  OK       docs/cognitive-triggers-snapshot.md"
else
  echo "  MISSING  docs/cognitive-triggers-snapshot.md"
  snapshot_warning=true
fi

if $snapshot_warning; then
  echo ""
  echo "WARNING: Missing snapshots mean future recovery will require"
  echo "multi-source reconstruction. Run /cycle to create them."
fi

# Check skills directory
echo ""
echo "Skills:"
echo ""

skills_found=0
skills_expected=5
for skill_name in adjudicate capacity cycle doc hunt; do
  skill_path="${PROJECT_ROOT}/.claude/skills/${skill_name}/SKILL.md"
  if [[ -f "$skill_path" ]]; then
    echo "  OK       /${skill_name}"
    ((skills_found++))
  else
    echo "  MISSING  /${skill_name}"
  fi
done

echo ""
echo "Skills: ${skills_found}/${skills_expected} found on disk."
echo "(Skills load at Claude Code session start — restart to pick up new ones.)"

# Final status
echo ""
echo "=========================================="

if $restore_failed; then
  echo "STATUS: DEGRADED — restoration failed for one or more files."
  echo "Manual intervention required."
  exit 1
elif $CHECK_ONLY && $restore_needed; then
  echo "STATUS: NEEDS RESTORATION — run without --check-only."
  exit 1
else
  echo "STATUS: HEALTHY"
  exit 0
fi

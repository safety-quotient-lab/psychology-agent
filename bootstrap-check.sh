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

MEMORY_SNAPSHOT="${PROJECT_ROOT}/docs/MEMORY-snapshot.md"

# Cognitive triggers canonical location (in-repo, not auto-memory)
TRIGGERS_CANONICAL="${PROJECT_ROOT}/docs/cognitive-triggers.md"
TRIGGERS_MIN_LINES=100

# Topic files (index + topic pattern)
TOPIC_SNAPSHOT_DIR="${PROJECT_ROOT}/docs/memory-snapshots"
TOPIC_FILES=("decisions.md" "cogarch.md" "psq-status.md")

# --- Content guard thresholds ---

MEMORY_MIN_LINES=30

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

check_file_health "$MEMORY_LIVE" "$MEMORY_MIN_LINES" "MEMORY.md (auto-memory index)" || memory_status=$?
for topic in "${TOPIC_FILES[@]}"; do
  topic_path="${AUTO_MEMORY_DIR}/${topic}"
  if [[ -f "$topic_path" ]]; then
    local_lines=$(wc -l < "$topic_path" | tr -d '[:space:]')
    echo "  OK       memory/${topic} (${local_lines} lines)"
  else
    echo "  MISSING  memory/${topic}"
  fi
done
check_file_health "$TRIGGERS_CANONICAL" "$TRIGGERS_MIN_LINES" "cognitive-triggers.md (docs/)" || triggers_status=$?

echo ""

# Restore MEMORY.md if needed (triggers lives in-repo, no restore needed)
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

# Restore topic files if missing
for topic in "${TOPIC_FILES[@]}"; do
  topic_live="${AUTO_MEMORY_DIR}/${topic}"
  topic_snapshot="${TOPIC_SNAPSHOT_DIR}/${topic}"
  if [[ ! -f "$topic_live" ]]; then
    if $CHECK_ONLY; then
      echo "memory/${topic} needs restoration. Run without --check-only."
      restore_needed=true
    else
      if [[ -f "$topic_snapshot" ]]; then
        restore_file "$topic_snapshot" "$topic_live" "memory/${topic}" || restore_failed=true
      else
        echo "  SKIPPED  memory/${topic} — no snapshot available"
      fi
    fi
  fi
done

if [[ $triggers_status -ne 0 ]]; then
  echo ""
  echo "WARNING: docs/cognitive-triggers.md missing or suspect."
  echo "This file lives in the repo — check git status or restore from git history."
fi

if ! $restore_needed && [[ $triggers_status -eq 0 ]]; then
  echo "All files healthy. No restoration needed."
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
for topic in "${TOPIC_FILES[@]}"; do
  topic_snapshot="${TOPIC_SNAPSHOT_DIR}/${topic}"
  if [[ -f "$topic_snapshot" ]]; then
    echo "  OK       docs/memory-snapshots/${topic}"
  else
    echo "  MISSING  docs/memory-snapshots/${topic}"
    snapshot_warning=true
  fi
done

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
skills_expected=4
for skill_name in cycle doc hunt knock; do
  skill_path="${PROJECT_ROOT}/.claude/skills/${skill_name}/SKILL.md"
  if [[ -f "$skill_path" ]]; then
    echo "  OK       /${skill_name} (skill)"
    ((skills_found++))
  else
    echo "  MISSING  /${skill_name} (skill)"
  fi
done

commands_found=0
commands_expected=2
for cmd_name in adjudicate capacity; do
  cmd_path="${PROJECT_ROOT}/.claude/commands/${cmd_name}.md"
  if [[ -f "$cmd_path" ]]; then
    echo "  OK       /${cmd_name} (command)"
    ((commands_found++))
  else
    echo "  MISSING  /${cmd_name} (command)"
  fi
done

echo ""
echo "Skills: ${skills_found}/${skills_expected} found. Commands: ${commands_found}/${commands_expected} found."
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

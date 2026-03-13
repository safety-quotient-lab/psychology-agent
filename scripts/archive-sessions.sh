#!/usr/bin/env bash
#
# archive-sessions.sh — Complement Cascade session archiver
#
# Implements the microglial pruning protocol:
#   C1q tag   — identify sessions with no new messages for N days
#   C3 verify — confirm no pending ACKs, no open gates, no awaiting_from
#   Phagocytose — move session to transport/archive/, leave tombstone
#
# SHIP1 brake: never archives sessions with open gates or pending ACKs.
#
# Usage:
#   ./scripts/archive-sessions.sh              # Dry run (show candidates)
#   ./scripts/archive-sessions.sh --execute    # Archive eligible sessions
#   ./scripts/archive-sessions.sh --age 7      # Override stale threshold (default: 14 days)

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SESSIONS_DIR="${REPO_ROOT}/transport/sessions"
ARCHIVE_DIR="${REPO_ROOT}/transport/archive"
TOMBSTONE_DIR="${REPO_ROOT}/transport/sessions"

EXECUTE=false
STALE_DAYS=14

while [ $# -gt 0 ]; do
  case "$1" in
    --execute) EXECUTE=true; shift ;;
    --age) STALE_DAYS="$2"; shift 2 ;;
    *) echo "Usage: archive-sessions.sh [--execute] [--age DAYS]" >&2; exit 1 ;;
  esac
done

NOW_EPOCH=$(date +%s)
STALE_SECONDS=$((STALE_DAYS * 86400))

echo "Complement Cascade Session Archiver"
echo "===================================="
echo "Stale threshold: ${STALE_DAYS} days"
echo "Mode: $([ "$EXECUTE" = true ] && echo "EXECUTE" || echo "DRY RUN")"
echo ""

printf "%-35s %6s %8s %12s %s\n" "SESSION" "TURNS" "AWAITING" "LAST_MODIFIED" "VERDICT"
printf "%-35s %6s %8s %12s %s\n" "-------" "-----" "--------" "-------------" "-------"

ARCHIVED=0
SKIPPED=0
PROTECTED=0

for session_dir in "${SESSIONS_DIR}"/*/; do
  [ -d "$session_dir" ] || continue
  session_name=$(basename "$session_dir")

  # Skip tombstones
  if [ -f "${session_dir}/.archived" ]; then
    continue
  fi

  manifest="${session_dir}/MANIFEST.json"

  # ── C1q: Check staleness ──────────────────────────────────────
  # Find the most recently modified file in the session
  last_modified_epoch=0
  last_modified_file=""
  for f in "${session_dir}"*.json; do
    [ -f "$f" ] || continue
    if [ "$(uname)" = "Darwin" ]; then
      file_epoch=$(stat -f "%m" "$f")
    else
      file_epoch=$(stat -c "%Y" "$f")
    fi
    if [ "$file_epoch" -gt "$last_modified_epoch" ]; then
      last_modified_epoch=$file_epoch
      last_modified_file=$(basename "$f")
    fi
  done

  age_seconds=$((NOW_EPOCH - last_modified_epoch))
  age_days=$((age_seconds / 86400))
  last_date=$(date -r "$last_modified_epoch" "+%Y-%m-%d" 2>/dev/null || date -d "@${last_modified_epoch}" "+%Y-%m-%d" 2>/dev/null || echo "?")

  # Count message files (exclude MANIFEST.json)
  turn_count=$(find "$session_dir" -name "from-*.json" -o -name "to-*.json" 2>/dev/null | wc -l | tr -d ' ')

  # ── C3: Verify no pending work ────────────────────────────────
  awaiting=""
  has_open_gates=false

  if [ -f "$manifest" ]; then
    # Extract awaiting_from array length
    awaiting=$(python3 -c "
import json, sys
try:
    m = json.load(open(sys.argv[1]))
    pending = m.get('pending', {})
    for session_key, session_data in pending.items():
        awaiting = session_data.get('awaiting_from', [])
        if awaiting:
            print(','.join(awaiting))
            sys.exit(0)
    print('')
except:
    print('?')
" "$manifest" 2>/dev/null)

    # Check for open gates in any message
    has_open_gates=$(python3 -c "
import json, glob, sys
for f in glob.glob(sys.argv[1] + '/from-*.json') + glob.glob(sys.argv[1] + '/to-*.json'):
    try:
        m = json.load(open(f))
        gate = m.get('action_gate', {})
        if gate.get('gate_status') == 'blocked':
            print('true')
            sys.exit(0)
    except: pass
print('false')
" "$session_dir" 2>/dev/null)
  fi

  # ── SHIP1 brake: protect active sessions ──────────────────────
  verdict="SKIP"
  reason=""

  if [ -n "$awaiting" ] && [ "$awaiting" != "" ]; then
    verdict="PROTECTED"
    reason="awaiting: ${awaiting}"
    PROTECTED=$((PROTECTED + 1))
  elif [ "$has_open_gates" = "true" ]; then
    verdict="PROTECTED"
    reason="open gate"
    PROTECTED=$((PROTECTED + 1))
  elif [ "$age_days" -lt "$STALE_DAYS" ]; then
    verdict="FRESH"
    reason="${age_days}d old"
    SKIPPED=$((SKIPPED + 1))
  else
    verdict="ARCHIVE"
    reason="${age_days}d stale, no pending"
  fi

  awaiting_display="${awaiting:-none}"
  [ -z "$awaiting" ] && awaiting_display="none"

  printf "%-35s %6s %8s %12s %s\n" \
    "$session_name" "$turn_count" "$awaiting_display" "$last_date" "$verdict"

  # ── Phagocytose: archive if eligible and executing ────────────
  if [ "$verdict" = "ARCHIVE" ] && [ "$EXECUTE" = true ]; then
    mkdir -p "${ARCHIVE_DIR}"

    # Create archive bundle with metadata
    archive_target="${ARCHIVE_DIR}/${session_name}"
    mv "$session_dir" "$archive_target"

    # Write archive metadata
    python3 -c "
import json, datetime
meta = {
    'archived_at': datetime.datetime.utcnow().isoformat() + 'Z',
    'reason': 'complement-cascade: ${reason}',
    'stale_threshold_days': ${STALE_DAYS},
    'session_name': '${session_name}',
    'last_modified': '${last_date}',
    'turn_count': ${turn_count}
}
with open('${archive_target}/.archive-meta.json', 'w') as f:
    json.dump(meta, f, indent=2)
" 2>/dev/null

    # Leave tombstone in sessions directory
    mkdir -p "${TOMBSTONE_DIR}/${session_name}"
    python3 -c "
import json, datetime
tombstone = {
    'archived': True,
    'archived_at': datetime.datetime.utcnow().isoformat() + 'Z',
    'archive_path': 'transport/archive/${session_name}',
    'reason': 'complement-cascade: ${reason}'
}
with open('${TOMBSTONE_DIR}/${session_name}/.archived', 'w') as f:
    json.dump(tombstone, f, indent=2)
" 2>/dev/null

    echo "  → Archived to transport/archive/${session_name}"
    ARCHIVED=$((ARCHIVED + 1))
  fi
done

echo ""
echo "Summary: ${ARCHIVED} archived, ${SKIPPED} fresh, ${PROTECTED} protected (SHIP1 brake)"
if [ "$EXECUTE" = false ] && [ "$ARCHIVED" = 0 ]; then
  # Count archive candidates for dry run
  candidates=$(grep -c "ARCHIVE" <<< "$(printf "%-35s %6s %8s %12s %s\n" "" "" "" "" "ARCHIVE")" 2>/dev/null || echo "0")
  echo "Run with --execute to archive eligible sessions."
fi

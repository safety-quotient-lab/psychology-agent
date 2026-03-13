#!/bin/bash
# archive_sessions.sh — move closed transport sessions to archive/
# Phase 9 of cogarch refactor. Run manually or from /cycle.
#
# Sessions in "closed" state for > $DAYS_THRESHOLD days get archived.
# MANIFEST.json retained in archive; message files compressed.

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SESSIONS_DIR="${PROJECT_ROOT}/transport/sessions"
ARCHIVE_DIR="${PROJECT_ROOT}/transport/archive"
DAYS_THRESHOLD="${1:-30}"  # default 30 days, overridable via first arg

mkdir -p "${ARCHIVE_DIR}"

archived=0
skipped=0

for manifest in "${SESSIONS_DIR}"/*/MANIFEST.json; do
    [ -f "${manifest}" ] || continue
    session_dir="$(dirname "${manifest}")"
    session_name="$(basename "${session_dir}")"

    # Skip exempt sessions
    if [ "${session_name}" = "local-coordination" ]; then
        continue
    fi

    # Check status field
    status="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('status','active'))" "${manifest}" 2>/dev/null || echo "active")"

    if [ "${status}" != "closed" ]; then
        skipped=$((skipped + 1))
        continue
    fi

    # Check age — find newest file in session directory
    newest_file="$(find "${session_dir}" -type f -name '*.json' -not -name 'MANIFEST.json' -printf '%T@\n' 2>/dev/null | sort -rn | head -1)"
    if [ -z "${newest_file}" ]; then
        # No message files — just MANIFEST. Skip.
        skipped=$((skipped + 1))
        continue
    fi

    days_old="$(python3 -c "
import time, sys
age_seconds = time.time() - float(sys.argv[1])
print(int(age_seconds / 86400))
" "${newest_file}" 2>/dev/null || echo "0")"

    if [ "${days_old}" -lt "${DAYS_THRESHOLD}" ]; then
        skipped=$((skipped + 1))
        continue
    fi

    # Archive: move session directory
    mv "${session_dir}" "${ARCHIVE_DIR}/${session_name}"
    archived=$((archived + 1))
    echo "archived: ${session_name} (${days_old} days old)"
done

echo "---"
echo "Archived: ${archived}"
echo "Skipped: ${skipped} (active/recent)"

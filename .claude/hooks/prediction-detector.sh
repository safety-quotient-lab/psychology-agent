#!/usr/bin/env bash
# prediction-detector.sh — PostToolUse hook (Write|Edit)
# Detects prediction/hypothesis language in written content and
# reminds to log to the prediction ledger.

set -euo pipefail

FILE_PATH="${CLAUDE_FILE_PATH:-}"
if [ -z "$FILE_PATH" ]; then
    FILE_PATH="$(echo "$CLAUDE_TOOL_INPUT" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null || true)"
fi

# Only check docs and specs
case "$FILE_PATH" in
    *.md) ;;
    *) exit 0 ;;
esac

# Skip transport, snapshots, changelog
case "$FILE_PATH" in
    */transport/*|*/snapshots/*|*CHANGELOG*) exit 0 ;;
esac

python3 -c "
import re, sys

try:
    with open('$FILE_PATH') as f:
        content = f.read()
except FileNotFoundError:
    sys.exit(0)

# Prediction language signals
patterns = [
    (r'\bshould produce\b', 'should produce'),
    (r'\bexpect(?:s|ed)?\b', 'expect'),
    (r'\bpredict(?:s|ed|ion)?\b', 'predict'),
    (r'\bhypothes[ie]s\b', 'hypothesis'),
    (r'\bwill result in\b', 'will result in'),
    (r'\btestable prediction\b', 'testable prediction'),
    (r'\bthe empirical question\b', 'empirical question'),
    (r'\bsuccess criterion\b', 'success criterion'),
]

lines = content.split('\n')
findings = []
in_code = False

for i, line in enumerate(lines, 1):
    if line.strip().startswith('\`\`\`'):
        in_code = not in_code
        continue
    if in_code:
        continue
    for pat, label in patterns:
        if re.search(pat, line, re.IGNORECASE):
            findings.append((i, label, line.strip()[:80]))
            break  # one finding per line

if findings and len(findings) <= 3:
    print(f'⚑ Prediction language detected in {\"$FILE_PATH\".split(\"/\")[-1]} — consider logging to prediction_ledger:')
    for lineno, label, context in findings:
        print(f'  L{lineno} [{label}]: {context}')
elif findings:
    print(f'⚑ {len(findings)} prediction(s) in {\"$FILE_PATH\".split(\"/\")[-1]} — consider logging to prediction_ledger')
" 2>/dev/null || true

exit 0

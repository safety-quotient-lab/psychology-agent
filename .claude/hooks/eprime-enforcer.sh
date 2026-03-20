#!/usr/bin/env bash
# eprime-enforcer.sh — PostToolUse hook (Write|Edit on *.md)
# Detects forms of "to be" in documentation files.
# E-Prime enforces processual ontological commitment (Korzybski, 1933).
# Reports violations as warnings — does not block.

set -euo pipefail

FILE_PATH="${CLAUDE_FILE_PATH:-}"
if [ -z "$FILE_PATH" ]; then
    FILE_PATH="$(echo "$CLAUDE_TOOL_INPUT" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null || true)"
fi

# Only check markdown files in docs/ and project root
case "$FILE_PATH" in
    *.md) ;;
    *) exit 0 ;;
esac

# Skip files where E-Prime doesn't apply
case "$FILE_PATH" in
    */transport/*|*/snapshots/*|*lessons.md*|*CHANGELOG*) exit 0 ;;
esac

# Check for to-be forms (word-boundary matching to avoid false positives)
# Only report — never block
python3 -c "
import re, sys

try:
    with open('$FILE_PATH') as f:
        content = f.read()
except FileNotFoundError:
    sys.exit(0)

# E-Prime banned forms (word boundaries prevent matching inside words)
pattern = r'\b(is|am|are|was|were|be|being|been)\b'

# Skip code blocks and inline code
lines = content.split('\n')
violations = []
in_code_block = False

for i, line in enumerate(lines, 1):
    if line.strip().startswith('\`\`\`'):
        in_code_block = not in_code_block
        continue
    if in_code_block:
        continue
    # Skip inline code
    cleaned = re.sub(r'\`[^\`]+\`', '', line)
    # Skip YAML frontmatter
    if cleaned.strip().startswith('---'):
        continue
    # Skip quoted text (citations, references)
    if cleaned.strip().startswith('>'):
        continue

    matches = list(re.finditer(pattern, cleaned, re.IGNORECASE))
    for m in matches:
        # Skip if inside a technical context (JSON keys, URLs, etc.)
        word = m.group().lower()
        violations.append((i, word, line.strip()[:80]))

if violations:
    fname = '$FILE_PATH'.split('/')[-1]
    n = len(violations)
    print(f'⚠ E-Prime: {n} to-be form(s) in {fname}:')
    for lineno, word, context in violations[:3]:
        print(f'  L{lineno}: \"{word}\" — {context}')

    # Persist to JSONL for dashboard telemetry
    import json, datetime, os
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname('$FILE_PATH' or __file__))), 'transport', 'sessions', 'local-coordination')
    # Use project root from script location
    script_dir = os.path.dirname(os.path.abspath('${BASH_SOURCE[0]}' if '${BASH_SOURCE[0]}' != '' else __file__))
    proj_root = os.path.dirname(os.path.dirname(script_dir))
    log_path = os.path.join(proj_root, 'transport', 'sessions', 'local-coordination', 'eprime-violations.jsonl')
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    entry = {
        'timestamp': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'file': '$FILE_PATH',
        'count': n,
        'violations': [{'line': v[0], 'word': v[1], 'context': v[2]} for v in violations[:10]]
    }
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps(entry) + '\n')
    except: pass
" 2>/dev/null || true

exit 0

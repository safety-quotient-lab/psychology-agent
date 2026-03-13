#!/usr/bin/env bash
#
# claude-instrumented.sh — Wrapper around `claude -p` that captures token usage
#
# Usage:
#   ./scripts/claude-instrumented.sh "/sync" [claude-flags...]
#
# Runs claude in stream-json mode, captures the result event, extracts
# cost and token usage, writes to a per-agent usage log.
#
# Output: prints the assistant's text response to stdout (same as bare claude -p)
# Side effect: appends usage record to /tmp/claude-usage-${AGENT_ID}.jsonl
#
# Env vars:
#   AGENT_ID — agent identifier (default: "unknown")
#   USAGE_LOG — path to usage log (default: /tmp/claude-usage-${AGENT_ID}.jsonl)

set -eo pipefail

PROMPT="${1:?Usage: claude-instrumented.sh PROMPT [flags...]}"
shift
AGENT_ID="${AGENT_ID:-unknown}"
USAGE_LOG="${USAGE_LOG:-/tmp/claude-usage-${AGENT_ID}.jsonl}"
TMPFILE=$(mktemp /tmp/claude-stream-XXXXXX.jsonl)
trap 'rm -f "${TMPFILE}"' EXIT

# Run claude with stream-json output to capture usage
claude -p "${PROMPT}" \
    --output-format stream-json \
    --verbose \
    "$@" > "${TMPFILE}" 2>&1

CLAUDE_EXIT=$?

# Extract the result event (last line with type=result)
RESULT_LINE=$(grep '"type":"result"' "${TMPFILE}" | tail -1)

if [ -n "${RESULT_LINE}" ]; then
    # Parse and log usage
    python3 -c "
import json, sys

r = json.loads(sys.argv[1])
record = {
    'agent_id': '${AGENT_ID}',
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'cost_usd': r.get('total_cost_usd', 0),
    'duration_ms': r.get('duration_ms', 0),
    'num_turns': r.get('num_turns', 0),
    'stop_reason': r.get('stop_reason', ''),
    'input_tokens': r.get('usage', {}).get('input_tokens', 0),
    'output_tokens': r.get('usage', {}).get('output_tokens', 0),
    'cache_read_tokens': r.get('usage', {}).get('cache_read_input_tokens', 0),
    'cache_create_tokens': r.get('usage', {}).get('cache_creation_input_tokens', 0),
}

# Per-model breakdown
for model, usage in r.get('modelUsage', {}).items():
    record['model'] = model
    record['model_cost_usd'] = usage.get('costUSD', 0)
    record['model_input'] = usage.get('inputTokens', 0)
    record['model_output'] = usage.get('outputTokens', 0)

print(json.dumps(record))
" "${RESULT_LINE}" >> "${USAGE_LOG}" 2>/dev/null || true
fi

# Extract and print the assistant text response (for backward compatibility)
python3 -c "
import json, sys
for line in open(sys.argv[1]):
    try:
        d = json.loads(line)
        if d.get('type') == 'assistant':
            for block in d.get('message', {}).get('content', []):
                if isinstance(block, dict) and block.get('type') == 'text':
                    print(block['text'])
    except: pass
" "${TMPFILE}"

exit ${CLAUDE_EXIT}

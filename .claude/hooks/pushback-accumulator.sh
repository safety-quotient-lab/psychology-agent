#!/usr/bin/env bash
# Pushback accumulator (UserPromptSubmit)
# Tracks user pushback frequency within a session. At count >= 3, surfaces a
# structural disagreement warning. Resets at session start.
#
# Heuristic: scans the user prompt for pushback signals (negation, correction,
# disagreement). Not perfect — false positives are low-cost (extra awareness),
# false negatives just mean the cognitive T6 layer handles it alone.

COUNTER_FILE="${HOME}/.claude/.pushback-count.tmp"
PROMPT="${USER_PROMPT:-}"

[ -z "$PROMPT" ] && exit 0

# Initialize counter if missing
[ ! -f "$COUNTER_FILE" ] && echo "0" > "$COUNTER_FILE"

# Pushback signal patterns (case-insensitive grep)
PUSHBACK_PATTERNS="no,|no\.|^no$|that's wrong|that is wrong|I disagree|you're wrong|incorrect|not what I|stop doing|don't do|do not do|I said|I already|I told you|wrong approach|bad idea|try again|redo|start over|that's not"

if echo "$PROMPT" | grep -qiE "$PUSHBACK_PATTERNS"; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$COUNTER_FILE"

  if [ "$COUNT" -ge 3 ]; then
    echo "[PUSHBACK] Structural disagreement pattern detected (${COUNT} pushback signals this session). T6: verify position stability — has the position shifted without new evidence?"
    # Bridge to T10 lesson pipeline: generate a lesson candidate stub
    # when structural disagreement threshold reached for the first time
    if [ "$COUNT" -eq 3 ]; then
      TOPIC_FILE="${HOME}/.claude/.pushback-topic.tmp"
      TOPIC_SNIPPET=$(echo "$PROMPT" | head -c 120 | tr '\n' ' ')
      echo "[PUSHBACK→T10] Structural disagreement reached threshold. Consider writing a lessons.md entry with pattern_type: structural-disagreement, domain: (classify from context), topic hint: \"${TOPIC_SNIPPET}\""
    fi
  fi
fi

exit 0

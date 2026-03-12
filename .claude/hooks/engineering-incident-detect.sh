#!/usr/bin/env bash
# PostToolUse hook (Bash) — Tier 1 engineering incident detection.
#
# Scans Bash tool commands and output for mechanical anti-patterns:
#   - credential-exposure: tokens/keys/secrets in command arguments
#   - error-loop: repeated identical failing commands (3+ consecutive)
#   - resource-churn: create/delete cycles on same resource type
#
# Records incidents via agentdb incident subcommand (fallback: dual_write.py).
# Does NOT block the tool — advisory only (prints warning to stdout).
source "${BASH_SOURCE[0]%/*}/_debug.sh"

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
COMMAND="${TOOL_INPUT_command:-}"
STATE_DIR="/tmp/psychology-agent-incidents"
mkdir -p "$STATE_DIR"

# Get current session number from lab-notebook
SESSION_ID=$(grep -o 'Session [0-9]*' "$PROJECT_ROOT/lab-notebook.md" 2>/dev/null | tail -1 | grep -o '[0-9]*' || echo "0")

# ── Credential exposure detection ──────────────────────────────────────
# Look for common secret patterns in the command string itself.
# Excludes: reading from files (cat/source), variable references ($VAR),
# and env var assignments without echo/curl/wget usage.

detect_credential_exposure() {
  local cmd="$1"

  # Skip if command only reads a file or sources env
  case "$cmd" in
    source*|.*) return ;;
  esac

  # Patterns that indicate credential exposure in command args
  # (token/key/secret value directly in the command, not a variable reference)
  if echo "$cmd" | grep -qiE '(bearer |authorization:.*[a-z0-9]{20,}|--token[= ][a-z0-9]{10,}|-H.*["\x27].*key["\x27].*:)' 2>/dev/null; then
    # Exclude variable references like $TOKEN or ${TOKEN}
    if ! echo "$cmd" | grep -qE '\$\{?[A-Z_]+\}?' 2>/dev/null; then
      echo "[INCIDENT] Credential exposure detected in Bash command. Use environment variables or file-sourced secrets instead of inline tokens."
      "$PROJECT_ROOT/agentdb" incident \
        --incident-type "credential-exposure" \
        --description "Token or secret value appeared directly in Bash command arguments" \
        --session-id "$SESSION_ID" \
        --severity "high" \
        --tool-name "Bash" \
        --tool-context "${cmd:0:200}" \
        --detection-tier 1 2>/dev/null
    fi
  fi
}

# ── Error loop detection ───────────────────────────────────────────────
# Tracks consecutive failures of similar commands. Fires on 3+ repeats
# of the same command pattern without a strategy change.

detect_error_loop() {
  local cmd="$1"
  local exit_code="${TOOL_EXIT_CODE:-0}"
  local tracker="$STATE_DIR/error-loop-tracker"

  # Only track failures
  if [ "$exit_code" = "0" ]; then
    # Reset on success
    echo "" > "$tracker" 2>/dev/null
    return
  fi

  # Normalize command to first 2 tokens for pattern matching
  local cmd_pattern
  cmd_pattern=$(echo "$cmd" | awk '{print $1, $2}')

  # Append to tracker
  echo "$cmd_pattern" >> "$tracker"

  # Count consecutive identical patterns (tail of file)
  local consecutive
  consecutive=$(tail -5 "$tracker" 2>/dev/null | grep -cF "$cmd_pattern" 2>/dev/null || echo 0)

  if [ "$consecutive" -ge 3 ]; then
    echo "[INCIDENT] Error loop detected: '$cmd_pattern' failed $consecutive times consecutively. Consider an alternative approach."
    "$PROJECT_ROOT/agentdb" incident \
      --incident-type "error-loop" \
      --description "Command pattern '$cmd_pattern' failed $consecutive consecutive times without strategy change" \
      --session-id "$SESSION_ID" \
      --severity "moderate" \
      --tool-name "Bash" \
      --tool-context "${cmd:0:200}" \
      --detection-tier 1 2>/dev/null
    # Reset tracker after recording
    echo "" > "$tracker"
  fi
}

# ── Resource churn detection ───────────────────────────────────────────
# Detects create/delete cycles on the same resource type within a session.
# Tracks: DNS records, tunnels, git branches, files in same directory.

detect_resource_churn() {
  local cmd="$1"
  local tracker="$STATE_DIR/resource-churn-tracker"

  # Extract resource operation patterns
  local operation=""
  case "$cmd" in
    *"dns create"*|*"dns add"*|*"route dns"*)    operation="dns:create" ;;
    *"dns delete"*|*"dns remove"*)                operation="dns:delete" ;;
    *"tunnel create"*)                            operation="tunnel:create" ;;
    *"tunnel delete"*)                            operation="tunnel:delete" ;;
    *"branch -D"*|*"branch --delete"*)            operation="branch:delete" ;;
    *"checkout -b"*)                              operation="branch:create" ;;
  esac

  [ -z "$operation" ] && return

  # Record operation
  echo "$operation" >> "$tracker"

  # Check for churn: create+delete+create of same resource type
  local resource_type="${operation%%:*}"
  local creates deletes
  creates=$(grep -c "^${resource_type}:create$" "$tracker" 2>/dev/null || echo 0)
  deletes=$(grep -c "^${resource_type}:delete$" "$tracker" 2>/dev/null || echo 0)

  if [ "$creates" -ge 2 ] && [ "$deletes" -ge 1 ]; then
    echo "[INCIDENT] Resource churn detected: $resource_type created $creates times, deleted $deletes times this session. Settle naming/config before creating resources."
    "$PROJECT_ROOT/agentdb" incident \
      --incident-type "resource-churn" \
      --description "$resource_type resource created $creates times and deleted $deletes times in session (churn pattern)" \
      --session-id "$SESSION_ID" \
      --severity "moderate" \
      --tool-name "Bash" \
      --tool-context "${cmd:0:200}" \
      --detection-tier 1 2>/dev/null
    # Reset tracker for this resource type
    grep -v "^${resource_type}:" "$tracker" > "${tracker}.tmp" 2>/dev/null
    mv "${tracker}.tmp" "$tracker" 2>/dev/null
  fi
}

# ── Run detectors ──────────────────────────────────────────────────────

[ -z "$COMMAND" ] && exit 0

detect_credential_exposure "$COMMAND"
detect_error_loop "$COMMAND"
detect_resource_churn "$COMMAND"

exit 0

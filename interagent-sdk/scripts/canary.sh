#!/usr/bin/env bash
#
# canary.sh — Independent observability canary (BFT mitigation)
#
# Purpose: Byzantine Fault Tolerance check. Bypasses the compositor entirely
# to fetch each agent's /api/status directly, then compares the raw results
# against the compositor's /api/pulse aggregation. Detects fabricated,
# stale, or missing data in the dashboard the human sees.
#
# This script operates as a trust-but-verify layer: the compositor aggregates
# agent health for the dashboard, but nothing stops a compromised compositor
# from presenting fabricated data. This canary fetches ground truth from each
# agent independently, then flags any divergence.
#
# Usage:
#   ./scripts/canary.sh
#   COMPOSITOR_URL=https://custom.example.dev ./scripts/canary.sh
#
# Environment (from .dev.vars or shell):
#   COMPOSITOR_URL — base URL for the compositor (interagent dashboard)
#   AGENT_STATUS_URLS — space-separated "id=url" pairs (overrides discovery)
#
# Exit codes:
#   0 — all checks passed
#   1 — divergence detected
#   2 — compositor unreachable (itself a finding)
#   3 — configuration error

set -eo pipefail

# ── Load .dev.vars if present ───────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEV_VARS="${PROJECT_DIR}/.dev.vars"

if [ -f "$DEV_VARS" ]; then
  # Source only variable assignments (skip comments and blank lines)
  while IFS='=' read -r key value; do
    key="$(echo "$key" | xargs)"
    [ -z "$key" ] && continue
    [[ "$key" == \#* ]] && continue
    # Only import if not already set in environment
    if [ -z "${!key+x}" ]; then
      export "$key"="$value"
    fi
  done < "$DEV_VARS"
fi

# ── Configuration ───────────────────────────────────────────────────────
COMPOSITOR_URL="${COMPOSITOR_URL:-https://interagent.safety-quotient.dev}"
CURL_TIMEOUT="${CANARY_CURL_TIMEOUT:-5}"

# Agent discovery: fetch the compositor's agent registry to learn URLs,
# or accept manual overrides via AGENT_STATUS_URLS.
# Format for manual override: "psychology-agent=https://host/api/status ..."
#
# Default: discover from .well-known/agent-card.json peers list.
# The agent-card.json contains peer discovery_urls; we derive /api/status
# from each peer's base URL.

# ── Helper functions ────────────────────────────────────────────────────

log_info()  { printf "[INFO]  %s\n" "$1"; }
log_warn()  { printf "[WARN]  %s\n" "$1" >&2; }
log_fail()  { printf "[FAIL]  %s\n" "$1" >&2; }
log_pass()  { printf "[PASS]  %s\n" "$1"; }

# Fetch JSON from a URL. Prints the response body. Returns 1 on failure.
fetch_json() {
  local url="$1"
  local body http_code
  body=$(curl -sf --connect-timeout "$CURL_TIMEOUT" --max-time "$((CURL_TIMEOUT * 3))" \
    -H "Accept: application/json" \
    -w "\n%{http_code}" \
    "$url" 2>/dev/null) || { echo ""; return 1; }

  http_code=$(echo "$body" | tail -1)
  body=$(echo "$body" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "$body"
    return 0
  else
    echo ""
    return 1
  fi
}

# Extract a JSON field using python3 (available on most systems, no jq dependency)
json_field() {
  local json="$1"
  local field="$2"
  python3 -c "
import json, sys
try:
    data = json.loads(sys.argv[1])
    keys = sys.argv[2].split('.')
    val = data
    for k in keys:
        if isinstance(val, list):
            val = val[int(k)]
        elif isinstance(val, dict):
            val = val.get(k)
        else:
            val = None
            break
    if val is None:
        print('null')
    else:
        print(val)
except Exception:
    print('null')
" "$json" "$field" 2>/dev/null
}

# Extract agent data from the pulse response by agent ID
pulse_agent_field() {
  local pulse_json="$1"
  local agent_id="$2"
  local field="$3"
  python3 -c "
import json, sys
try:
    data = json.loads(sys.argv[1])
    agents = data.get('agents', [])
    target = sys.argv[2]
    field = sys.argv[3]
    found = None
    for a in agents:
        if a.get('id') == target:
            found = a
            break
    if found is None:
        print('NOT_FOUND')
    else:
        val = found.get(field)
        if val is None:
            print('null')
        else:
            print(val)
except Exception:
    print('ERROR')
" "$pulse_json" "$agent_id" "$field" 2>/dev/null
}

# ── Discover agent URLs ────────────────────────────────────────────────

declare -A AGENT_URLS  # agent_id → status URL

if [ -n "$AGENT_STATUS_URLS" ]; then
  # Manual override: parse space-separated "id=url" pairs
  for pair in $AGENT_STATUS_URLS; do
    id="${pair%%=*}"
    url="${pair#*=}"
    if [ -z "$id" ] || [ -z "$url" ]; then
      log_fail "Invalid AGENT_STATUS_URLS entry: $pair"
      exit 3
    fi
    AGENT_URLS["$id"]="$url"
  done
  log_info "Using ${#AGENT_URLS[@]} manually configured agent URLs"
else
  # Discover from the local agent-card.json peers list
  AGENT_CARD="${PROJECT_DIR}/.well-known/agent-card.json"
  if [ ! -f "$AGENT_CARD" ]; then
    log_fail "No agent-card.json found at ${AGENT_CARD} and AGENT_STATUS_URLS not set"
    exit 3
  fi

  log_info "Discovering agent URLs from ${AGENT_CARD}"

  # Parse peers from agent-card.json, derive /api/status from discovery_url host
  while IFS='|' read -r agent_id discovery_url; do
    # Derive base URL: strip /.well-known/agent-card.json from discovery_url
    base_url="${discovery_url%%/.well-known/agent-card.json}"
    AGENT_URLS["$agent_id"]="${base_url}/api/status"
  done < <(python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    card = json.load(f)
for peer in card.get('peers', []):
    aid = peer.get('agent_id', '')
    durl = peer.get('discovery_url', '')
    if aid and durl:
        print(f'{aid}|{durl}')
" "$AGENT_CARD" 2>/dev/null)

  # Also include self (operations-agent)
  self_url=$(json_field "$(cat "$AGENT_CARD")" "url")
  if [ "$self_url" != "null" ] && [ -n "$self_url" ]; then
    AGENT_URLS["operations-agent"]="${self_url}/api/status"
  fi

  log_info "Discovered ${#AGENT_URLS[@]} agents from peer list"
fi

if [ ${#AGENT_URLS[@]} -eq 0 ]; then
  log_fail "No agent URLs configured or discovered. Cannot run canary."
  exit 3
fi

# ── Phase 1: Direct-fetch each agent's /api/status ─────────────────────

echo ""
echo "=== CANARY: Independent Observability Check ==="
echo "    Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "    Compositor: ${COMPOSITOR_URL}"
echo "    Agents: ${#AGENT_URLS[@]}"
echo ""

declare -A DIRECT_STATUS    # agent_id → "online" / "unavailable"
declare -A DIRECT_BUDGET    # agent_id → budget_spent or "null"
declare -A DIRECT_RAW       # agent_id → raw JSON response

for agent_id in "${!AGENT_URLS[@]}"; do
  url="${AGENT_URLS[$agent_id]}"
  raw=$(fetch_json "$url") && rc=0 || rc=1

  if [ $rc -ne 0 ] || [ -z "$raw" ]; then
    DIRECT_STATUS["$agent_id"]="unavailable"
    DIRECT_BUDGET["$agent_id"]="null"
    DIRECT_RAW["$agent_id"]=""
    log_warn "Direct fetch FAILED for ${agent_id} at ${url}"
  else
    status=$(json_field "$raw" "status")
    budget=$(json_field "$raw" "autonomy_budget.budget_spent")
    DIRECT_STATUS["$agent_id"]="${status:-online}"
    DIRECT_BUDGET["$agent_id"]="${budget:-null}"
    DIRECT_RAW["$agent_id"]="$raw"
    log_info "Direct fetch OK for ${agent_id}: status=${status}, budget=${budget}"
  fi
done

# ── Phase 2: Fetch compositor's /api/pulse ──────────────────────────────

echo ""
log_info "Fetching compositor pulse from ${COMPOSITOR_URL}/api/pulse"

COMPOSITOR_DOWN=0
PULSE_JSON=$(fetch_json "${COMPOSITOR_URL}/api/pulse") && rc=0 || rc=1

if [ $rc -ne 0 ] || [ -z "$PULSE_JSON" ]; then
  log_fail "COMPOSITOR UNREACHABLE at ${COMPOSITOR_URL}/api/pulse"
  log_fail "The dashboard the human sees may present stale or no data."
  COMPOSITOR_DOWN=1
fi

# ── Phase 3: Compare direct vs compositor ───────────────────────────────

echo ""
DIVERGENCES=0

# Table header
printf "%-25s %-14s %-14s %-10s %-10s %s\n" \
  "AGENT" "DIRECT_STATUS" "COMP_STATUS" "DIR_BUDGET" "CMP_BUDGET" "VERDICT"
printf "%-25s %-14s %-14s %-10s %-10s %s\n" \
  "-------------------------" "--------------" "--------------" "----------" "----------" "----------"

for agent_id in $(echo "${!AGENT_URLS[@]}" | tr ' ' '\n' | sort); do
  direct_status="${DIRECT_STATUS[$agent_id]}"
  direct_budget="${DIRECT_BUDGET[$agent_id]}"

  if [ "$COMPOSITOR_DOWN" -eq 1 ]; then
    comp_status="N/A"
    comp_budget="N/A"
    verdict="COMP_DOWN"
    DIVERGENCES=$((DIVERGENCES + 1))
  else
    comp_status=$(pulse_agent_field "$PULSE_JSON" "$agent_id" "status")
    comp_budget=$(pulse_agent_field "$PULSE_JSON" "$agent_id" "budget_spent")

    if [ "$comp_status" = "NOT_FOUND" ]; then
      # Agent exists in direct fetch but compositor does not list it
      comp_status="MISSING"
      comp_budget="MISSING"
      verdict="DIVERGENCE"
      DIVERGENCES=$((DIVERGENCES + 1))
    else
      verdict="PASS"

      # Check status match
      # Normalize: compositor may report "unreachable"/"unavailable" for agents
      # the canary also found unavailable — that matches.
      direct_down=0
      comp_down=0
      [ "$direct_status" = "unavailable" ] || [ "$direct_status" = "unreachable" ] && direct_down=1
      [ "$comp_status" = "unavailable" ] || [ "$comp_status" = "unreachable" ] && comp_down=1

      if [ "$direct_down" -ne "$comp_down" ]; then
        verdict="DIVERGENCE"
        DIVERGENCES=$((DIVERGENCES + 1))
      elif [ "$direct_down" -eq 0 ] && [ "$comp_down" -eq 0 ]; then
        # Both report agent as reachable — compare status strings
        if [ "$direct_status" != "$comp_status" ]; then
          verdict="DIVERGENCE"
          DIVERGENCES=$((DIVERGENCES + 1))
        fi

        # Compare budget values (if both present and numeric)
        if [ "$direct_budget" != "null" ] && [ "$comp_budget" != "null" ] \
           && [ "$direct_budget" != "None" ] && [ "$comp_budget" != "None" ]; then
          if [ "$direct_budget" != "$comp_budget" ]; then
            # Allow small float rounding differences
            diff_check=$(python3 -c "
import sys
try:
    a, b = float(sys.argv[1]), float(sys.argv[2])
    print('match' if abs(a - b) < 0.01 else 'mismatch')
except: print('skip')
" "$direct_budget" "$comp_budget" 2>/dev/null)
            if [ "$diff_check" = "mismatch" ]; then
              verdict="DIVERGENCE"
              DIVERGENCES=$((DIVERGENCES + 1))
            fi
          fi
        fi
      fi
    fi
  fi

  # Print table row
  printf "%-25s %-14s %-14s %-10s %-10s %s\n" \
    "$agent_id" "$direct_status" "$comp_status" "$direct_budget" "$comp_budget" "$verdict"

  # Print warning details for divergences
  if [ "$verdict" = "DIVERGENCE" ] || [ "$verdict" = "COMP_DOWN" ]; then
    log_warn "  ^ ${agent_id}: direct=${direct_status}/${direct_budget} compositor=${comp_status}/${comp_budget}"
  fi
done

# ── Phase 4: Agent count check ──────────────────────────────────────────

if [ "$COMPOSITOR_DOWN" -eq 0 ]; then
  echo ""
  comp_agent_count=$(json_field "$PULSE_JSON" "agents_total")
  direct_agent_count="${#AGENT_URLS[@]}"

  if [ "$comp_agent_count" != "null" ] && [ "$comp_agent_count" != "$direct_agent_count" ]; then
    log_warn "Agent count mismatch: direct discovered ${direct_agent_count}, compositor reports ${comp_agent_count}"
    # Not necessarily a divergence — compositor may discover agents
    # the canary does not know about (or vice versa). Flag for review.
    log_info "  (Count difference may reflect discovery lag. Review agent lists.)"
  else
    log_info "Agent count matches: ${direct_agent_count}"
  fi
fi

# ── Summary ─────────────────────────────────────────────────────────────

echo ""
echo "=== CANARY SUMMARY ==="

if [ "$COMPOSITOR_DOWN" -eq 1 ]; then
  echo "  Compositor: UNREACHABLE"
  echo "  Verdict: FAIL — compositor down, dashboard data unverifiable"
  echo ""
  exit 2
elif [ "$DIVERGENCES" -gt 0 ]; then
  echo "  Compositor: reachable"
  echo "  Divergences: ${DIVERGENCES}"
  echo "  Verdict: FAIL — compositor data does not match direct agent queries"
  echo ""
  exit 1
else
  echo "  Compositor: reachable"
  echo "  Divergences: 0"
  echo "  Verdict: PASS — compositor faithfully represents agent state"
  echo ""
  exit 0
fi
